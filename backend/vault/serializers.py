"""
DRF Serializers for TrustVault secure endpoints.
"""
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Document, AccessGrant, AuditEvent

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ('role', 'department', 'status', 'mfa_enabled', 'last_login_at')


class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True)
    department = serializers.CharField(source='profile.department', read_only=True)
    status = serializers.CharField(source='profile.status', read_only=True)
    mfaEnabled = serializers.BooleanField(source='profile.mfa_enabled', read_only=True)
    name = serializers.CharField(source='get_full_name', read_only=True)
    ownedDocumentsCount = serializers.SerializerMethodField()
    accessibleDocumentsCount = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'name', 'role', 'department', 'status',
            'mfaEnabled', 'ownedDocumentsCount', 'accessibleDocumentsCount'
        )

    def get_ownedDocumentsCount(self, obj):
        return obj.owned_documents.count()

    def get_accessibleDocumentsCount(self, obj):
        profile = getattr(obj, 'profile', None)
        if profile and profile.role == 'ADMINISTRATOR':
            return Document.objects.count()
        return obj.owned_documents.count() + obj.document_grants.count()


class AccessGrantSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    grantedBy = serializers.SerializerMethodField()
    documentId = serializers.CharField(source='document.id', read_only=True)
    grantedAt = serializers.DateTimeField(source='granted_at', read_only=True)
    expiresAt = serializers.DateTimeField(source='expires_at', required=False, allow_null=True)

    class Meta:
        model = AccessGrant
        fields = ('id', 'documentId', 'userId', 'user', 'permission', 'grantedBy', 'grantedAt', 'expiresAt')

    def get_user(self, obj):
        return {
            'id': str(obj.user.id),
            'name': obj.user.get_full_name() or obj.user.username,
            'email': obj.user.email,
            'department': getattr(obj.user.profile, 'department', ''),
            'role': getattr(obj.user.profile, 'role', 'VIEWER'),
        }

    def get_grantedBy(self, obj):
        if not obj.granted_by:
            return None
        return {
            'id': str(obj.granted_by.id),
            'name': obj.granted_by.get_full_name() or obj.granted_by.username,
        }


class DocumentSerializer(serializers.ModelSerializer):
    owner = serializers.SerializerMethodField()
    userPermission = serializers.SerializerMethodField()
    activeGrantsCount = serializers.SerializerMethodField()
    sizeBytes = serializers.IntegerField(source='size_bytes', read_only=True)
    mimeType = serializers.CharField(source='mime_type', read_only=True)
    fileExtension = serializers.CharField(source='file_extension', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Document
        fields = (
            'id', 'title', 'description', 'category', 'classification',
            'mimeType', 'fileExtension', 'sizeBytes', 'owner', 'userPermission',
            'activeGrantsCount', 'createdAt', 'updatedAt', 'version', 'checksum'
        )

    def get_owner(self, obj):
        return {
            'id': str(obj.owner.id),
            'name': obj.owner.get_full_name() or obj.owner.username,
            'email': obj.owner.email,
        }

    def get_userPermission(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return None
        profile = getattr(request.user, 'profile', None)
        if profile and profile.role == 'ADMINISTRATOR':
            return 'OWNER'
        if obj.owner == request.user:
            return 'OWNER'
        grant = obj.grants.filter(user=request.user).first()
        return grant.permission if grant else None

    def get_activeGrantsCount(self, obj):
        return obj.grants.count()


class AuditEventSerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()
    documentId = serializers.CharField(source='document.id', allow_null=True, read_only=True)
    documentTitle = serializers.CharField(source='document_title', read_only=True)
    ipAddress = serializers.CharField(source='ip_address', read_only=True)
    userAgent = serializers.CharField(source='user_agent', read_only=True)
    isSuspicious = serializers.BooleanField(source='is_suspicious', read_only=True)
    prevHash = serializers.CharField(source='prev_hash', read_only=True)
    eventHash = serializers.CharField(source='event_hash', read_only=True)

    class Meta:
        model = AuditEvent
        fields = (
            'id', 'timestamp', 'actor', 'action', 'result',
            'documentId', 'documentTitle', 'ipAddress', 'userAgent',
            'details', 'reason', 'isSuspicious', 'prevHash', 'eventHash'
        )

    def get_actor(self, obj):
        return {
            'id': str(obj.actor.id) if obj.actor else 'system',
            'name': obj.actor_name,
            'email': obj.actor_email,
            'role': obj.actor_role,
        }
