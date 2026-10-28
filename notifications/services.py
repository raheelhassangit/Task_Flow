from .models import Notification

Kind = Notification.Kind


def _name(user):
    return user.get_full_name() or user.email


def notify_task_assigned(task, actor):
    assignee = task.assigned_to
    if assignee is None or assignee.id == actor.id:   # never notify people about their own actions
        return Notification.objects.create(
        recipient=assignee,
        actor=actor,
        kind=Kind.TASK_ASSIGNED,
        task=task,
        message=f'{_name(actor)} assigned you "{task.title}"',
    )


def notify_task_commented(comment, actor):
    task = comment.task
    people = {u.id: u for u in (task.assigned_to, task.created_by) if u}
    people.pop(actor.id, None)

    # Skip anyone who has since left the project, since they can't open the task anymore
    member_ids = set(task.project.memberships.values_list("user_id", flat=True))

    Notification.objects.bulk_create(
        [
            Notification(
                recipient=user,
                actor=actor,
                kind=Kind.TASK_COMMENTED,
                task=task,
                message=f'{_name(actor)} commented on "{task.title}"',
            )
            for user_id, user in people.items()
            if user_id in member_ids
        ]
    )