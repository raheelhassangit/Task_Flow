from django.utils import timezone
from rest_framework import serializers

from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id", "title", "description", "status",
            "priority", "due_date", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    # Field-level: runs only for the "title" field
    def validate_title(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("Title must be at least 3 characters.")
        return value

    # Field-level: runs only if due_date is sent
    def validate_due_date(self, value):
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