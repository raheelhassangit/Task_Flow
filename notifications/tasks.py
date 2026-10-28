from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from accounts.models import User
from tasks.models import Comment, Task

from .models import Notification
from .services import notify_task_assigned, notify_task_commented


@shared_task
def create_assignment_notification(task_id, actor_id):
    task = Task.objects.select_related("assigned_to", "project").filter(pk=task_id).first()
    actor = User.objects.filter(pk=actor_id).first()
    if task is None or actor is None:       # deleted before the worker got to it
        return
    notification = notify_task_assigned(task, actor)
    if notification:
        send_assignment_email.delay(notification.id)


@shared_task
def create_comment_notifications(comment_id, actor_id):
    comment = (
        Comment.objects.select_related("task__project", "task__assigned_to", "task__created_by")
        .filter(pk=comment_id)
        .first()
    )
    actor = User.objects.filter(pk=actor_id).first()
    if comment is None or actor is None:
        return
    notify_task_commented(comment, actor)


@shared_task(
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 3},
)
def send_assignment_email(notification_id):
    n = Notification.objects.select_related("recipient").filter(pk=notification_id).first()
    if n is None:
        return
    link = f"{settings.FRONTEND_URL}/tasks/{n.task_id}"
    send_mail(
        "New task assigned to you",
        f"{n.message}\n\nOpen it: {link}",
        None,
        [n.recipient.email],
    )


@shared_task
def cleanup_old_notifications(days=30):
    cutoff = timezone.now() - timedelta(days=days)
    deleted, _ = Notification.objects.filter(is_read=True, created_at__lt=cutoff).delete()
    return deleted