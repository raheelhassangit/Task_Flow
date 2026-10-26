from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CommentViewSet, DashboardView, TaskViewSet

app_name = "tasks"

router = DefaultRouter()
router.register("tasks", TaskViewSet, basename="task")
router.register("comments", CommentViewSet, basename="comment")

urlpatterns = router.urls + [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
]