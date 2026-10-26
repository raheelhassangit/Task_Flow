from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from tasks.serializers import TaskListSerializer, TaskWriteSerializer

from .models import Project, ProjectMember
from .permissions import IsProjectAdmin, IsProjectOwner, get_role
from .serializers import (
    AddMemberSerializer,
    MemberSerializer,
    ProjectSerializer,
    RoleSerializer,
)

from django.db.models import Count, Q
from django.utils import timezone
from tasks.models import Task
from tasks.stats import OPEN_STATUSES, task_stats

Role = ProjectMember.Role
class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.filter(memberships__user=self.request.user)
    
    def get_throttles(self):
        if self.action == "members" and self.request.method == "POST":
            self.throttle_scope = "member_invite"
        return super().get_throttles()

    def perform_create(self, serializer):
        with transaction.atomic():
            project = serializer.save()
            ProjectMember.objects.create(
                project=project, user=self.request.user, role=Role.OWNER
            )

    def get_permissions(self):
        method = self.request.method
        if self.action in ("update", "partial_update"):
            return [IsAuthenticated(), IsProjectAdmin()]
        if self.action == "destroy":
            return [IsAuthenticated(), IsProjectOwner()]
        if self.action == "members" and method == "POST":
            return [IsAuthenticated(), IsProjectAdmin()]
        if self.action == "member_detail" and method == "PATCH":
            return [IsAuthenticated(), IsProjectOwner()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["get"])
    def tasks(self, request, pk=None):
        project = self.get_object()
        tasks = project.tasks.select_related("project", "assigned_to").annotate(
            comment_count=Count("comments")
        )
        page = self.paginate_queryset(tasks)
        serializer = TaskListSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="members",
        serializer_class=AddMemberSerializer,
    )
    def members(self, request, pk=None):
        project = self.get_object()

        if request.method == "GET":
            memberships = project.memberships.select_related("user")
            return Response(MemberSerializer(memberships, many=True).data)

        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        role = serializer.validated_data["role"]

        if role == Role.ADMIN and get_role(request.user, project) != Role.OWNER:
            raise PermissionDenied("Only the owner can add admins.")

        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            raise ValidationError({"email": ["No user with this email."]})
        if project.memberships.filter(user=user).exists():
            raise ValidationError({"email": ["This user is already a member."]})

        membership = ProjectMember.objects.create(project=project, user=user, role=role)
        return Response(MemberSerializer(membership).data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"members/(?P<user_id>\d+)",
        serializer_class=RoleSerializer,
    )
    def member_detail(self, request, pk=None, user_id=None):
        project = self.get_object()
        membership = get_object_or_404(project.memberships.all(), user_id=user_id)

        if request.method == "PATCH":
            if membership.role == Role.OWNER:
                raise ValidationError({"role": ["The owner's role can't be changed."]})
            serializer = RoleSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            membership.role = serializer.validated_data["role"]
            membership.save()
            return Response(MemberSerializer(membership).data)

        # DELETE
        if membership.role == Role.OWNER:
            raise PermissionDenied("The project owner can't be removed.")
        my_role = get_role(request.user, project)
        is_self = membership.user_id == request.user.id
        can_remove = (
            is_self
            or my_role == Role.OWNER
            or (my_role == Role.ADMIN and membership.role == Role.MEMBER)
        )
        if not can_remove:
            raise PermissionDenied("You can't remove this member.")
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)