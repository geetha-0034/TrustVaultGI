"""
Custom DRF permissions enforcing document-level access control and zero-trust verification.
"""
from rest_framework import permissions
from .models import AccessGrant

class IsActiveUser(permissions.BasePermission):
    """Ensure user is not marked as SUSPENDED in their security profile."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        profile = getattr(request.user, 'profile', None)
        return profile is not None and profile.status == 'ACTIVE'


class IsAdministrator(permissions.BasePermission):
    """Restricts view to platform Administrators."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        profile = getattr(request.user, 'profile', None)
        return profile is not None and profile.role == 'ADMINISTRATOR' and profile.status == 'ACTIVE'


class IsDocumentOwnerOrAdmin(permissions.BasePermission):
    """Allows owners or platform administrators to manage documents and grants."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        profile = getattr(request.user, 'profile', None)
        return profile is not None and profile.status == 'ACTIVE' and profile.role in ('ADMINISTRATOR', 'OWNER')

    def has_object_permission(self, request, view, obj):
        profile = getattr(request.user, 'profile', None)
        if not profile or profile.status != 'ACTIVE':
            return False
        if profile.role == 'ADMINISTRATOR':
            return True
        return obj.owner == request.user


class CanAccessDocument(permissions.BasePermission):
    """Object-level permission checking if user owns document or has active grant."""
    def has_object_permission(self, request, view, obj):
        profile = getattr(request.user, 'profile', None)
        if not profile or profile.status != 'ACTIVE':
            return False
        if profile.role == 'ADMINISTRATOR':
            return True
        if obj.owner == request.user:
            return True
        grant = AccessGrant.objects.filter(document=obj, user=request.user).first()
        return grant is not None and not grant.is_expired()


class CanEditDocument(permissions.BasePermission):
    """Object-level permission checking if user can modify document content."""
    def has_object_permission(self, request, view, obj):
        profile = getattr(request.user, 'profile', None)
        if not profile or profile.status != 'ACTIVE':
            return False
        if profile.role == 'ADMINISTRATOR':
            return True
        if obj.owner == request.user:
            return True
        grant = AccessGrant.objects.filter(document=obj, user=request.user, permission='EDIT').first()
        return grant is not None and not grant.is_expired()
