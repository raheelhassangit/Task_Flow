from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db import transaction

from tasks.serializers import TaskSerializer

from .models import Project
from .models import Project, ProjectMember
from .serializers import ProjectSerializer
from rest_framework.permissions import IsAuthenticated
from .permissions import IsProjectAdmin, IsProjectOwner


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.filter(memberships__user=self.request.user)

    def perform_create(self, serializer):
        with transaction.atomic():
            project = serializer.save()
            ProjectMember.objects.create(
                project=project,
                user=self.request.user,
                role=ProjectMember.Role.OWNER,
            )

    def get_permissions(self):
        if self.action == "destroy":
            return [IsAdminUser()]
        return super().get_permissions()

    @action(detail=True, methods=["get"])
    def tasks(self, request, pk=None):
        project = self.get_object()
        serializer = TaskSerializer(project.tasks.all(), many=True)
        return Response(serializer.data)