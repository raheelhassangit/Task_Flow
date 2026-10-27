from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from projects.permissions import (
    IsCommentAuthor,
    IsCommentAuthorOrProjectAdmin,
    IsTaskCreatorOrProjectAdmin,
)

from .models import Comment, Task
from .serializers import (
    CommentSerializer,
    TaskListSerializer,
    TaskReadSerializer,
    TaskWriteSerializer,
)
from .filters import TaskFilter

from datetime import timedelta

from django.db.models import Case, Count, IntegerField, Q, Value, When
from django.utils import timezone
from rest_framework.views import APIView

from projects.models import Project

from .stats import OPEN_STATUSES, task_stats
from notifications.services import notify_task_assigned, notify_task_commented

class TaskViewSet(viewsets.ModelViewSet):
    filterset_class = TaskFilter
    search_fields = ["title", "description"]
    ordering_fields = ["due_date", "created_at", "title", "priority_rank"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return (
            Task.objects.filter(project__memberships__user=self.request.user)
            .select_related("project", "assigned_to", "created_by")
            .annotate(
                comment_count=Count("comments", distinct=True),
                priority_rank=Case(
                    When(priority=Task.Priority.HIGH, then=Value(3)),
                    When(priority=Task.Priority.MEDIUM, then=Value(2)),
                    default=Value(1),
                    output_field=IntegerField(),
                ),
            )
        )

    def get_serializer_class(self):
        if self.action in ("list", "my"):
            return TaskListSerializer
        if self.action in ("create", "update", "partial_update"):
            return TaskWriteSerializer
        if self.action == "comments":
            return CommentSerializer
        return TaskReadSerializer  # retrieve, complete

    def perform_create(self, serializer):
        task = serializer.save(created_by=self.request.user)
        if task.assigned_to_id:
            notify_task_assigned(task, self.request.user)
        
    def perform_update(self, serializer):
        old_assignee_id = serializer.instance.assigned_to_id   # read BEFORE saving
        task = serializer.save()
        if task.assigned_to_id and task.assigned_to_id != old_assignee_id:
            notify_task_assigned(task, self.request.user)
        
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        instance = self.get_queryset().get(pk=serializer.instance.pk)
        read = TaskReadSerializer(instance, context=self.get_serializer_context())
        return Response(read.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(
            self.get_object(), data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        instance = self.get_queryset().get(pk=serializer.instance.pk)
        read = TaskReadSerializer(instance, context=self.get_serializer_context())
        return Response(read.data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        task = self.get_object()
        task.status = Task.Status.DONE
        task.save()
        return Response(self.get_serializer(task).data)
    
    def get_permissions(self):
        if self.action == "destroy":
            return [IsAuthenticated(), IsTaskCreatorOrProjectAdmin()]
        return [IsAuthenticated()]
    
    @action(detail=True, methods=["get", "post"], url_path="comments")
    def comments(self, request, pk=None):
        task = self.get_object()

        if request.method == "GET":
            comments = task.comments.select_related("author")
            return Response(CommentSerializer(comments, many=True).data)

        serializer = CommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(task=task, author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=["get"])
    def my(self, request):
        queryset = self.filter_queryset(
            self.get_queryset().filter(assigned_to=request.user)
        )
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
    
class CommentViewSet(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = CommentSerializer
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return Comment.objects.filter(
            task__project__memberships__user=self.request.user
        ).select_related("author")

    def get_permissions(self):
        if self.action in ("update", "partial_update"):
            return [IsAuthenticated(), IsCommentAuthor()]
        if self.action == "destroy":
            return [IsAuthenticated(), IsCommentAuthorOrProjectAdmin()]
        return [IsAuthenticated()]    
    
class DashboardView(APIView):
    def get(self, request):
        user = request.user
        today = timezone.localdate()
        visible = Task.objects.filter(project__memberships__user=user)

        mine = visible.filter(assigned_to=user, status__in=OPEN_STATUSES).aggregate(
            open=Count("id"),
            overdue=Count("id", filter=Q(due_date__lt=today)),
            due_this_week=Count(
                "id",
                filter=Q(due_date__gte=today, due_date__lte=today + timedelta(days=7)),
            ),
        )

        projects = (
            Project.objects.filter(memberships__user=user)
            .annotate(
                total=Count("tasks"),
                done=Count("tasks", filter=Q(tasks__status=Task.Status.DONE)),
                overdue=Count(
                    "tasks",
                    filter=Q(tasks__due_date__lt=today, tasks__status__in=OPEN_STATUSES),
                ),
            )
            .order_by("name")
        )

        return Response(
            {
                "overall": task_stats(visible, today),
                "mine": mine,
                "projects": [
                    {
                        "id": p.id,
                        "name": p.name,
                        "total": p.total,
                        "done": p.done,
                        "overdue": p.overdue,
                        "completion_rate": round(p.done * 100 / p.total, 1) if p.total else 0.0,
                    }
                    for p in projects
                ],
            }
        )    