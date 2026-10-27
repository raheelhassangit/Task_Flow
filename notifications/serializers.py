from rest_framework import serializers

from accounts.serializers import UserSummarySerializer
from tasks.models import Task

from .models import Notification


class NotificationTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ["id", "title", "project"]


class NotificationSerializer(serializers.ModelSerializer):
    actor = UserSummarySerializer(read_only=True)
    task = NotificationTaskSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "kind", "message", "actor", "task", "is_read", "created_at"]
        read_only_fields = fields