"""
Django REST Framework Views implementing TrustVault API endpoints.
"""
import os
import csv
import io
import json
import hashlib
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import HttpResponse, FileResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import UserProfile, Document, AccessGrant, AuditEvent, GENESIS_HASH
from .serializers import UserSerializer, DocumentSerializer, AccessGrantSerializer, AuditEventSerializer
from .permissions import IsActiveUser, IsAdministrator, IsDocumentOwnerOrAdmin, CanAccessDocument, CanEditDocument

def record_audit_event(request, action_name, result='ALLOWED', document=None, details='', reason=None, is_suspicious=False):
    """Helper to append an audit event maintaining canonical SHA-256 hash chaining."""
    actor = request.user if request.user and request.user.is_authenticated else None
    profile = getattr(actor, 'profile', None) if actor else None
    actor_role = profile.role if profile else 'ANONYMOUS'
    actor_name = actor.get_full_name() or actor.username if actor else 'Anonymous'
    actor_email = actor.email if actor else 'unauthenticated@system.internal'

    # Get latest event hash
    latest = AuditEvent.objects.order_by('-timestamp').first()
    prev_hash = latest.event_hash if latest else GENESIS_HASH

    event_id = f"evt-{int(datetime.now().timestamp() * 1000)}"
    timestamp_str = timezone.now().isoformat()

    payload = {
        'id': event_id,
        'timestamp': timestamp_str,
        'actorId': str(actor.id) if actor else 'anonymous',
        'actorEmail': actor_email,
        'actorRole': actor_role,
        'action': action_name,
        'result': result,
        'documentId': str(document.id) if document else None,
        'ipAddress': request.META.get('REMOTE_ADDR', '127.0.0.1'),
        'details': details,
        'reason': reason,
    }
    event_hash = AuditEvent.calculate_hash(prev_hash, payload)

    return AuditEvent.objects.create(
        id=event_id,
        actor=actor,
        actor_name=actor_name,
        actor_email=actor_email,
        actor_role=actor_role,
        action=action_name,
        result=result,
        document=document,
        document_title=document.title if document else '',
        ip_address=request.META.get('REMOTE_ADDR', '127.0.0.1'),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        details=details,
        reason=reason,
        is_suspicious=is_suspicious,
        prev_hash=prev_hash,
        event_hash=event_hash,
    )


class AuthViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')

        # Find user by email or username
        user = User.objects.filter(email__iexact=email).first() or User.objects.filter(username__iexact=email).first()
        if not user:
            return Response(
                {'error': {'code': 'INVALID_CREDENTIALS', 'message': 'Invalid credentials.'}},
                status=status.HTTP_401_UNAUTHORIZED
            )

        profile = getattr(user, 'profile', None)
        if profile and profile.status == 'SUSPENDED':
            record_audit_event(request, 'ACCESS_DENIED', result='DENIED', details='Suspended user attempted login.', reason='Account status is SUSPENDED.', is_suspicious=True)
            return Response(
                {'error': {'code': 'ACCOUNT_SUSPENDED', 'message': 'Account is suspended.'}},
                status=status.HTTP_403_FORBIDDEN
            )

        token = f"tv_tok_{user.id}_{int(datetime.now().timestamp())}"
        record_audit_event(request, 'USER_LOGIN', result='ALLOWED', details='User authenticated successfully.')
        return Response({
            'token': token,
            'user': UserSerializer(user).data,
            'expiresAt': (timezone.now() + timezone.timedelta(hours=8)).isoformat(),
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        record_audit_event(request, 'USER_LOGOUT', result='ALLOWED', details='User session terminated.')
        return Response({'message': 'Successfully logged out'})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsActiveUser]

    @action(detail=True, methods=['patch'], permission_classes=[IsAdministrator])
    def status(self, request, pk=None):
        user = self.get_object()
        new_status = request.data.get('status')
        reason = request.data.get('reason', 'Administrative action')

        if str(user.id) == str(request.user.id) and new_status == 'SUSPENDED':
            return Response({'error': {'code': 'SELF_SUSPENSION_BLOCKED', 'message': 'Cannot self-suspend'}}, status=400)

        user.profile.status = new_status
        user.profile.save()

        record_audit_event(request, 'USER_STATUS_CHANGE', details=f"Changed status to {new_status}. Reason: {reason}")
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['patch'], permission_classes=[IsAdministrator])
    def role(self, request, pk=None):
        user = self.get_object()
        new_role = request.data.get('role')
        user.profile.role = new_role
        user.profile.save()

        record_audit_event(request, 'USER_STATUS_CHANGE', details=f"Changed role to {new_role}")
        return Response(UserSerializer(user).data)


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated, IsActiveUser]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        if profile and profile.role == 'ADMINISTRATOR':
            return Document.objects.all()
        # Owner or granted
        granted_doc_ids = AccessGrant.objects.filter(user=user).values_list('document_id', flat=True)
        return Document.objects.filter(models.Q(owner=user) | models.Q(id__in=granted_doc_ids)).distinct()

    def create(self, request, *args, **kwargs):
        profile = getattr(request.user, 'profile', None)
        if not profile or profile.role not in ('ADMINISTRATOR', 'OWNER'):
            return Response({'error': {'message': 'Viewers cannot create documents'}}, status=status.HTTP_403_FORBIDDEN)

        title = request.data.get('title')
        content = request.data.get('content', '')
        ext = request.data.get('fileName', 'doc.md').split('.')[-1]

        doc_id = f"doc-{int(datetime.now().timestamp() * 1000)}"
        storage_file_name = f"{doc_id}_storage.{ext}"
        storage_path = settings.PRIVATE_STORAGE_PATH / storage_file_name

        with open(storage_path, 'w', encoding='utf-8') as f:
            f.write(content)

        checksum = f"sha256:{hashlib.sha256(content.encode('utf-8')).hexdigest()}"
        doc = Document.objects.create(
            id=doc_id,
            title=title,
            description=request.data.get('description', ''),
            category=request.data.get('category', 'Engineering'),
            classification=request.data.get('classification', 'Restricted'),
            file_extension=ext,
            storage_file_name=storage_file_name,
            size_bytes=len(content.encode('utf-8')),
            checksum=checksum,
            owner=request.user,
        )

        record_audit_event(request, 'DOCUMENT_UPLOAD', document=doc, details='Uploaded new document.')
        return Response(DocumentSerializer(doc, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], permission_classes=[CanAccessDocument])
    def content(self, request, pk=None):
        doc = self.get_object()
        storage_path = settings.PRIVATE_STORAGE_PATH / doc.storage_file_name
        content = ''
        if storage_path.exists():
            with open(storage_path, 'r', encoding='utf-8') as f:
                content = f.read()

        record_audit_event(request, 'DOCUMENT_VIEW', document=doc, details='Viewed decrypted document payload.')
        return Response({
            'id': doc.id,
            'content': content,
            'checksum': doc.checksum,
            'updatedAt': doc.updated_at.isoformat(),
        })

    @content.mapping.put
    def update_content(self, request, pk=None):
        doc = self.get_object()
        profile = getattr(request.user, 'profile', None)
        can_edit = (profile and profile.role == 'ADMINISTRATOR') or doc.owner == request.user or AccessGrant.objects.filter(document=doc, user=request.user, permission='EDIT').exists()
        if not can_edit:
            record_audit_event(request, 'ACCESS_DENIED', result='DENIED', document=doc, details='Forbidden attempt to update content with READ permissions.')
            return Response({'error': {'code': 'EDIT_PERMISSION_REQUIRED', 'message': 'Edit permission required'}}, status=status.HTTP_403_FORBIDDEN)

        new_content = request.data.get('content', '')
        storage_path = settings.PRIVATE_STORAGE_PATH / doc.storage_file_name
        with open(storage_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        parts = doc.version.split('.')
        minor = int(parts[1] if len(parts) > 1 else 0) + 1
        doc.version = f"{parts[0]}.{minor}"
        doc.checksum = f"sha256:{hashlib.sha256(new_content.encode('utf-8')).hexdigest()}"
        doc.size_bytes = len(new_content.encode('utf-8'))
        doc.save()

        record_audit_event(request, 'DOCUMENT_EDIT', document=doc, details=f"Updated document content. Bumped to v{doc.version}.")
        return Response(DocumentSerializer(doc, context={'request': request}).data)

    @action(detail=True, methods=['get'], permission_classes=[CanAccessDocument])
    def download(self, request, pk=None):
        doc = self.get_object()
        storage_path = settings.PRIVATE_STORAGE_PATH / doc.storage_file_name
        if not storage_path.exists():
            return Response({'error': {'message': 'File not found on storage disk'}}, status=status.HTTP_404_NOT_FOUND)

        record_audit_event(request, 'DOCUMENT_DOWNLOAD', document=doc, details='Downloaded verified document payload.')
        response = FileResponse(open(storage_path, 'rb'), content_type=doc.mime_type)
        response['Content-Disposition'] = f'attachment; filename="{doc.title.replace(" ", "_")}_v{doc.version}.{doc.file_extension}"'
        return response

    @action(detail=True, methods=['get'], permission_classes=[CanAccessDocument])
    def activity(self, request, pk=None):
        doc = self.get_object()
        events = AuditEvent.objects.filter(document=doc).order_by('-timestamp')
        return Response(AuditEventSerializer(events, many=True).data)


class AccessGrantViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsActiveUser]

    def list(self, request, document_pk=None):
        doc = Document.objects.filter(id=document_pk).first()
        if not doc:
            return Response({'error': {'message': 'Document not found'}}, status=404)
        if request.user.profile.role != 'ADMINISTRATOR' and doc.owner != request.user:
            return Response({'error': {'message': 'Forbidden'}}, status=403)
        grants = doc.grants.all()
        return Response(AccessGrantSerializer(grants, many=True).data)

    def create(self, request, document_pk=None):
        doc = Document.objects.filter(id=document_pk).first()
        if not doc:
            return Response({'error': {'message': 'Document not found'}}, status=404)
        if request.user.profile.role != 'ADMINISTRATOR' and doc.owner != request.user:
            return Response({'error': {'message': 'Forbidden'}}, status=403)

        target_user = User.objects.filter(id=request.data.get('userId')).first()
        if not target_user:
            return Response({'error': {'message': 'Target user not found'}}, status=404)

        grant, _ = AccessGrant.objects.update_or_create(
            document=doc,
            user=target_user,
            defaults={
                'id': f"grant-{int(datetime.now().timestamp() * 1000)}",
                'permission': request.data.get('permission', 'READ'),
                'granted_by': request.user,
                'expires_at': request.data.get('expiresAt'),
            }
        )
        record_audit_event(request, 'ACCESS_GRANTED', document=doc, details=f"Granted {grant.permission} to {target_user.email}")
        return Response(AccessGrantSerializer(grant).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, document_pk=None, pk=None):
        grant = AccessGrant.objects.filter(id=pk, document_id=document_pk).first()
        if not grant:
            return Response({'error': {'message': 'Grant not found'}}, status=404)
        if request.user.profile.role != 'ADMINISTRATOR' and grant.document.owner != request.user:
            return Response({'error': {'message': 'Forbidden'}}, status=403)

        user_name = grant.user.email
        grant.delete()
        record_audit_event(request, 'ACCESS_REVOKED', document=grant.document, details=f"Revoked access for {user_name}")
        return Response({'success': True, 'grantId': pk})


class AuditViewSet(viewsets.ViewSet):
    permission_classes = [IsAdministrator]

    def list(self, request):
        events = AuditEvent.objects.all().order_by('-timestamp')
        return Response({'events': AuditEventSerializer(events[:100], many=True).data, 'total': events.count()})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def stats(self, request):
        docs = Document.objects.all()
        total_storage = sum(d.size_bytes for d in docs)
        return Response({
            'totalDocuments': docs.count(),
            'activeUsers': UserProfile.objects.filter(status='ACTIVE').count(),
            'totalAuditEvents': AuditEvent.objects.count(),
            'deniedAttemptsCount': AuditEvent.objects.filter(result='DENIED').count(),
            'suspiciousActivityCount': AuditEvent.objects.filter(is_suspicious=True).count(),
            'totalStorageBytes': total_storage,
        })

    @action(detail=False, methods=['get'])
    def verify_chain(self, request):
        events = list(AuditEvent.objects.all().order_by('timestamp'))
        expected_prev = GENESIS_HASH
        for i, ev in enumerate(events):
            if ev.prev_hash != expected_prev:
                return Response({'chainValid': False, 'brokenIndex': i, 'brokenReason': f"Hash mismatch at index {i}"})
            expected_prev = ev.event_hash
        return Response({
            'chainValid': True,
            'totalVerifiedBlocks': len(events),
            'genesisHash': GENESIS_HASH,
            'headHash': events[-1].event_hash if events else GENESIS_HASH,
        })
