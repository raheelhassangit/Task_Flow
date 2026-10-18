from rest_framework.permissions import BasePermission

from .models import ProjectMember


def get_role(user, project):
    return (
        ProjectMember.objects.filter(project=project, user=user)
        .values_list("role", flat=True)
        .first()
    )


def project_of(obj):
    # A Task has .project; a Project doesn't, so fall back to the object itself
    return getattr(obj, "project", obj)


class IsProjectAdmin(BasePermission):
    message = "Only project owners and admins can do this."

    def has_object_permission(self, request, view, obj):
        role = get_role(request.user, project_of(obj))
        return role in (ProjectMember.Role.OWNER, ProjectMember.Role.ADMIN)


class IsProjectOwner(BasePermission):
    message = "Only the project owner can do this."

    def has_object_permission(self, request, view, obj):
        role = get_role(request.user, project_of(obj))
        return role == ProjectMember.Role.OWNER


class IsTaskCreatorOrProjectAdmin(BasePermission):
    message = "Only the task creator, project admins or the owner can delete this task."

    def has_object_permission(self, request, view, obj):
        if obj.created_by_id == request.user.id:
            return True
        role = get_role(request.user, obj.project)
        return role in (ProjectMember.Role.OWNER, ProjectMember.Role.ADMIN)