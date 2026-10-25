"""
Django models for TrustVault with cryptographic hash chaining and object-level access controls.
"""
import hashlib
import json
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000'

class UserProfile(models.Model):
    ROLE_CHOICES = (
        ('ADMINISTRATOR', 'Administrator'),
        ('OWNER', 'Document Owner'),
        ('VIEWER', 'Viewer / Authorized Recipient'),
    )
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('SUSPENDED', 'Suspended'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='VIEWER')
    department = models.CharField(max_length=120, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    mfa_enabled = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class Document(models.Model):
    CATEGORY_CHOICES = (
        ('Financial', 'Financial'),
        ('Legal', 'Legal'),
        ('Security Audit', 'Security Audit'),
        ('Engineering', 'Engineering'),
        ('Executive', 'Executive'),
        ('Compliance', 'Compliance'),
        ('HR Policy', 'HR Policy'),
    )
    CLASSIFICATION_CHOICES = (
        ('Confidential', 'Confidential'),
        ('Restricted', 'Restricted'),
        ('Internal', 'Internal'),
    )

    id = models.CharField(max_length=64, primary_key=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Security Audit')
    classification = models.CharField(max_length=50, choices=CLASSIFICATION_CHOICES, default='Restricted')
    mime_type = models.CharField(max_length=100, default='text/markdown')
    file_extension = models.CharField(max_length=20, default='md')
    storage_file_name = models.CharField(max_length=255)
    size_bytes = models.BigIntegerField(default=0)
    version = models.CharField(max_length=20, default='1.0')
    checksum = models.CharField(max_length=128)
    owner = models.ForeignKey(User, on_delete=models.PROTECT, related_name='owned_documents')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} [v{self.version}]"


class AccessGrant(models.Model):
    PERMISSION_CHOICES = (
        ('READ', 'Read Only'),
        ('EDIT', 'Edit / Modify'),
    )

    id = models.CharField(max_length=64, primary_key=True)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='grants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='document_grants')
    permission = models.CharField(max_length=10, choices=PERMISSION_CHOICES, default='READ')
    granted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='granted_accesses')
    granted_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('document', 'user')

    def is_expired(self):
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False


class AuditEvent(models.Model):
    ACTION_CHOICES = (
        ('DOCUMENT_UPLOAD', 'Document Upload'),
        ('DOCUMENT_VIEW', 'Document View'),
        ('DOCUMENT_DOWNLOAD', 'Document Download'),
        ('DOCUMENT_EDIT', 'Document Edit'),
        ('ACCESS_GRANTED', 'Access Granted'),
        ('ACCESS_MODIFIED', 'Access Modified'),
        ('ACCESS_REVOKED', 'Access Revoked'),
        ('DOCUMENT_DELETED', 'Document Deleted'),
        ('ACCESS_DENIED', 'Access Denied'),
        ('SUSPICIOUS_ATTEMPT', 'Suspicious Attempt'),
        ('USER_LOGIN', 'User Login'),
        ('USER_LOGOUT', 'User Logout'),
        ('USER_STATUS_CHANGE', 'User Status Change'),
    )
    RESULT_CHOICES = (
        ('ALLOWED', 'Allowed'),
        ('DENIED', 'Denied'),
    )

    id = models.CharField(max_length=64, primary_key=True)
    timestamp = models.DateTimeField(default=timezone.now)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_actions')
    actor_name = models.CharField(max_length=150)
    actor_email = models.EmailField()
    actor_role = models.CharField(max_length=30)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    result = models.CharField(max_length=20, choices=RESULT_CHOICES, default='ALLOWED')
    document = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_records')
    document_title = models.CharField(max_length=255, blank=True, default='')
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True, default='')
    details = models.TextField()
    reason = models.TextField(blank=True, null=True)
    is_suspicious = models.BooleanField(default=False)
    prev_hash = models.CharField(max_length=64)
    event_hash = models.CharField(max_length=64)

    class Meta:
        ordering = ['-timestamp']

    @staticmethod
    def calculate_hash(prev_hash, payload_dict):
        canonical_str = json.dumps(payload_dict, sort_keys=True)
        return hashlib.sha256((prev_hash + canonical_str).encode('utf-8')).hexdigest()
