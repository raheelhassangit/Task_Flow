from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Task
from .serializers import TaskListSerializer, TaskSerializer
from rest_framework.permissions import IsAuthenticated
from projects.permissions import IsTaskCreatorOrProjectAdmin


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
        return TaskSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        task = self.get_object()
        task.status = Task.Status.DONE
        task.save()
        return Response(self.get_serializer(task).data)