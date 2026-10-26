from django.db.models import Count, Q

from .models import Task

OPEN_STATUSES = [Task.Status.TODO, Task.Status.IN_PROGRESS]


def task_stats(queryset, today):
    stats = queryset.aggregate(
        total=Count("id"),
        todo=Count("id", filter=Q(status=Task.Status.TODO)),
        in_progress=Count("id", filter=Q(status=Task.Status.IN_PROGRESS)),
        done=Count("id", filter=Q(status=Task.Status.DONE)),
        overdue=Count("id", filter=Q(due_date__lt=today, status__in=OPEN_STATUSES)),
    )
    total = stats["total"]
    stats["completion_rate"] = round(stats["done"] * 100 / total, 1) if total else 0.0
    return stats