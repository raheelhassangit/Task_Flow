from django.utils import timezone
from rest_framework import serializers

from accounts.models import User
from accounts.serializers import UserSummarySerializer
from projects.models import Project
from projects.serializers import ProjectSummarySerializer

from .models import Comment, Task


class TaskWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id", "project", "title", "description", "status", "priority",
            "due_date", "assigned_to", "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None and request.user.is_authenticated:
            # Only offer (and accept) projects and people this user can see
            self.fields["project"].queryset = Project.objects.filter(
                memberships__user=request.user
            )
            self.fields["assigned_to"].queryset = User.objects.filter(
                project_memberships__project__memberships__user=request.user
            ).distinct()

    def validate_title(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("Title must be at least 3 characters.")
        return value

    def validate_due_date(self, value):
        if self.instance and self.instance.due_date == value:
            return value
        if value and value < timezone.localdate():
            raise serializers.ValidationError("Due date cannot be in the past.")
        return value

    def validate(self, attrs):
        priority = attrs.get("priority", getattr(self.instance, "priority", None))
        due_date = attrs.get("due_date", getattr(self.instance, "due_date", None))
        if priority == Task.Priority.HIGH and due_date is None:
            raise serializers.ValidationError(
                {"due_date": "High-priority tasks need a due date."}
            )

        project = attrs.get("project", getattr(self.instance, "project", None))
        assignee = attrs.get("assigned_to", getattr(self.instance, "assigned_to", None))
        if assignee and project and not project.memberships.filter(user=assignee).exists():
            raise serializers.ValidationError(
                {"assigned_to": "The assignee must be a member of the project."}
            )
        return attrs


class TaskReadSerializer(serializers.ModelSerializer):
    project = ProjectSummarySerializer(read_only=True)
    created_by = UserSummarySerializer(read_only=True)
    assigned_to = UserSummarySerializer(read_only=True)
    comment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id", "project", "title", "description", "status", "priority",
            "due_date", "created_by", "assigned_to", "comment_count",
            "created_at", "updated_at",
        ]


class TaskListSerializer(serializers.ModelSerializer):
    project = ProjectSummarySerializer(read_only=True)
    assigned_to = UserSummarySerializer(read_only=True)
    comment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Task
        fields = ["id", "project", "title", "status", "priority", "due_date", "assigned_to"]


class CommentSerializer(serializers.ModelSerializer):
    author = UserSummarySerializer(read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id", "project", "title", "status", "priority", "due_date",
            "assigned_to", "comment_count",
        ]
        read_only_fields = ["id", "task", "created_at", "updated_at"]