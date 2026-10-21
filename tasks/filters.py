import django_filters
from django.utils import timezone

from .models import Task


class TaskFilter(django_filters.FilterSet):
    # NumberFilter, not the automatic model filter (see note below)
    project = django_filters.NumberFilter(field_name="project_id")
    assigned_to = django_filters.NumberFilter(field_name="assigned_to_id")
    created_by = django_filters.NumberFilter(field_name="created_by_id")

    due_before = django_filters.DateFilter(field_name="due_date", lookup_expr="lte")
    due_after = django_filters.DateFilter(field_name="due_date", lookup_expr="gte")
    overdue = django_filters.BooleanFilter(method="filter_overdue")

    class Meta:
        model = Task
        fields = ["status", "priority"]

    def filter_overdue(self, queryset, name, value):
        overdue = queryset.filter(due_date__lt=timezone.localdate()).exclude(
            status=Task.Status.DONE
        )
        if value:
            return overdue
        return queryset.exclude(pk__in=overdue.values("pk"))