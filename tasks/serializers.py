from django.utils import timezone
from rest_framework import serializers

from .models import Task, Comment


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id", "project", "title", "description", "status",
            "priority", "due_date", "created_by", "assigned_to",  "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

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

    # Field-level: runs only for the "title" field
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

    # Object-level: runs after all fields pass, sees the whole task
    def validate(self, attrs):
        priority = attrs.get("priority", getattr(self.instance, "priority", None))
        due_date = attrs.get("due_date", getattr(self.instance, "due_date", None))
        if priority == Task.Priority.HIGH and due_date is None:
            raise serializers.ValidationError(
                {"due_date": "High-priority tasks need a due date."}
            )
        return attrs
    
class TaskListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ["id", "project", "title", "status", "priority", "assigned_to", "due_date"]    
        
class CommentSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source="author.email", read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "task", "author", "author_email", "body", "created_at", "updated_at"]
        read_only_fields = ["id", "task", "author", "created_at", "updated_at"]        