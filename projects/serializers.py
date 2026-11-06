from rest_framework import serializers

from .models import Project
from .models import Project, ProjectMember

class ProjectSerializer(serializers.ModelSerializer):
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ["id", "name", "description", "my_role", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
    
    def get_my_role(self, obj) -> str | None:
        from .permissions import get_role

        request = self.context.get("request")
        return get_role(request.user, obj) if request else None    
        

class MemberSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ProjectMember
        fields = ["user", "email", "role", "joined_at"]


class AddMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=[ProjectMember.Role.ADMIN, ProjectMember.Role.MEMBER],
        default=ProjectMember.Role.MEMBER,
    )
        
class RoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=[ProjectMember.Role.ADMIN, ProjectMember.Role.MEMBER]
    )        
    
class ProjectSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "name"]    