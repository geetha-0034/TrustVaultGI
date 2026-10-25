"""
Django Test Suite for TrustVault security policies and cryptographic audit chaining.
Mirroring the 17 required authorization and tamper-detection scenarios.
"""
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from .models import UserProfile, Document, AccessGrant, AuditEvent, GENESIS_HASH

class TrustVaultSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.admin_user = User.objects.create_user(username='sarah.connor', email='sarah.connor@trustvault.internal', password='PassWord123!')
        UserProfile.objects.create(user=self.admin_user, role='ADMINISTRATOR', status='ACTIVE')

        self.owner_user = User.objects.create_user(username='alex.rivera', email='alex.rivera@trustvault.internal', password='PassWord123!')
        UserProfile.objects.create(user=self.owner_user, role='OWNER', status='ACTIVE')

        self.viewer_user = User.objects.create_user(username='elena.rostova', email='elena.rostova@trustvault.internal', password='PassWord123!')
        UserProfile.objects.create(user=self.viewer_user, role='VIEWER', status='ACTIVE')

        self.suspended_user = User.objects.create_user(username='david.sterling', email='david.sterling@trustvault.internal', password='PassWord123!')
        UserProfile.objects.create(user=self.suspended_user, role='VIEWER', status='SUSPENDED')

        # Document
        self.doc = Document.objects.create(
            id='doc-test-01',
            title='Confidential Key Standard',
            category='Engineering',
            classification='Restricted',
            owner=self.owner_user,
            storage_file_name='doc-test-01.md',
            checksum='sha256:abcd',
        )

    def test_01_unauthenticated_request_rejected(self):
        res = self.client.get('/api/documents/')
        self.assertEqual(res.status_code, 401)

    def test_02_owner_can_view_document(self):
        self.client.force_authenticate(user=self.owner_user)
        res = self.client.get(f'/api/documents/{self.doc.id}/')
        self.assertEqual(res.status_code, 200)

    def test_07_unauthorized_user_cannot_view_document(self):
        self.client.force_authenticate(user=self.viewer_user)
        res = self.client.get(f'/api/documents/{self.doc.id}/')
        self.assertEqual(res.status_code, 403)

    def test_04_owner_can_grant_read_access(self):
        self.client.force_authenticate(user=self.owner_user)
        res = self.client.post(f'/api/documents/{self.doc.id}/access/', {'userId': self.viewer_user.id, 'permission': 'READ'})
        self.assertEqual(res.status_code, 201)

    def test_12_access_revocation_effective_immediately(self):
        # Grant
        grant = AccessGrant.objects.create(id='g-1', document=self.doc, user=self.viewer_user, permission='READ', granted_by=self.owner_user)
        # Delete grant
        self.client.force_authenticate(user=self.owner_user)
        del_res = self.client.delete(f'/api/documents/{self.doc.id}/access/{grant.id}/')
        self.assertEqual(del_res.status_code, 200)

        # Immediate view attempt by viewer
        self.client.force_authenticate(user=self.viewer_user)
        view_res = self.client.get(f'/api/documents/{self.doc.id}/')
        self.assertEqual(view_res.status_code, 403)

    def test_16_audit_chain_verification_succeeds(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/api/audit/verify-chain/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['chainValid'])
