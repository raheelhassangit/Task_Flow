from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from tasks.serializers import TaskSerializer

from .models import Project
from .serializers import ProjectSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

    @action(detail=True, methods=["get"])
    def tasks(self, request, pk=None):
        project = self.get_object()
        serializer = TaskSerializer(project.tasks.all(), many=True)
        return Response(serializer.data)