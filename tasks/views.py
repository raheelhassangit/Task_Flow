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
from .serializers import CommentSerializer, TaskListSerializer, TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = Task.objects.filter(project__memberships__user=self.request.user)
        project_id = self.request.query_params.get("project")
        if project_id and project_id.isdigit():
            queryset = queryset.filter(project_id=project_id)
        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return TaskListSerializer
        if self.action == "comments":
            return CommentSerializer
        return TaskSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

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