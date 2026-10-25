/**
 * TrustVault Backend Automated Test Suite
 * Covers all 17 security and operational test cases specified in the system specification.
 * Runs against the live Express HTTP API server using ephemeral port binding.
 */

import http from 'http';
import { app, db, calculateEventHash } from '../server';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];
let baseUrl = '';
let server: http.Server;

// Persona Tokens
let adminToken = '';
let ownerToken = '';
let viewerToken = '';
let suspendedToken = 'tv_tok_usr-06_999999999';

async function request(
  endpoint: string,
  options: { method?: string; token?: string | null; body?: any; raw?: boolean } = {}
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    data,
  };
}

async function runTest(id: number, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ id, name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✓ [TEST ${id.toString().padStart(2, '0')}] ${name}`);
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    results.push({ id, name, passed: false, error: errorMsg, durationMs: Date.now() - start });
    console.error(`  ✗ [TEST ${id.toString().padStart(2, '0')}] ${name}`);
    console.error(`     Error: ${errorMsg}`);
  }
}

async function runSuite() {
  console.log('\n======================================================');
  console.log('🔒 TrustVault Cryptographic Backend Test Suite');
  console.log('======================================================\n');

  // Start test server on random open port
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      console.log(`[Test Runner] Live ephemeral test server active at ${baseUrl}\n`);
      resolve();
    });
  });

  // Setup tokens
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'sarah.connor@trustvault.internal', password: 'ValidPassword123!' },
  });
  adminToken = adminLogin.data.token;

  const ownerLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'alex.rivera@trustvault.internal', password: 'ValidPassword123!' },
  });
  ownerToken = ownerLogin.data.token;

  const viewerLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'elena.rostova@trustvault.internal', password: 'ValidPassword123!' },
  });
  viewerToken = viewerLogin.data.token;

  // Let's create a dedicated document owned by Alex Rivera for isolated grant/access testing
  let testDocId = '';

  // 1. Unauthenticated requests to protected endpoints return 401
  await runTest(1, 'Unauthenticated requests to protected endpoints return 401', async () => {
    const res = await request('/api/documents');
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);

    const res2 = await request('/api/users');
    if (res2.status !== 401) throw new Error(`Expected 401 on /api/users, got ${res2.status}`);

    const res3 = await request('/api/audit');
    if (res3.status !== 401) throw new Error(`Expected 401 on /api/audit, got ${res3.status}`);
  });

  // 2. Document owner can create and view their document
  await runTest(2, 'Document owner can upload and view their document', async () => {
    const createRes = await request('/api/documents', {
      method: 'POST',
      token: ownerToken,
      body: {
        title: 'Q4 Cryptographic Risk Assessment Test Doc',
        category: 'Engineering',
        classification: 'Confidential',
        description: 'Test document for automated security verification',
        content: '# Test Content\nConfidential system parameter data.',
        fileName: 'crypto_test.md',
      },
    });

    if (createRes.status !== 201) throw new Error(`Document creation failed: ${createRes.status}`);
    testDocId = createRes.data.id;

    const viewRes = await request(`/api/documents/${testDocId}`, { token: ownerToken });
    if (viewRes.status !== 200) throw new Error(`Owner view failed: ${viewRes.status}`);
    if (viewRes.data.userPermission !== 'OWNER') {
      throw new Error(`Expected OWNER permission, got ${viewRes.data.userPermission}`);
    }
  });

  // 3. Document owner can update document metadata and content
  await runTest(3, 'Document owner can update document content and bump version', async () => {
    const updatedContent = '# Test Content\nConfidential system parameter data.\nUpdated by owner.';
    const updateRes = await request(`/api/documents/${testDocId}/content`, {
      method: 'PUT',
      token: ownerToken,
      body: {
        content: updatedContent,
        changeSummary: 'Automated test content update',
      },
    });

    if (updateRes.status !== 200) throw new Error(`Update content failed: ${updateRes.status}`);
    if (updateRes.data.version !== '1.1') {
      throw new Error(`Expected version 1.1, got ${updateRes.data.version}`);
    }

    const contentRes = await request(`/api/documents/${testDocId}/content`, { token: ownerToken });
    if (contentRes.data.content !== updatedContent) {
      throw new Error('Retrieved content did not match updated content.');
    }
  });

  // 4. Document owner can grant read access to a named user
  let readGrantId = '';
  await runTest(4, 'Document owner can grant READ access to a named user', async () => {
    const grantRes = await request(`/api/documents/${testDocId}/access`, {
      method: 'POST',
      token: ownerToken,
      body: {
        userId: 'usr-04', // Elena Rostova
        permission: 'READ',
      },
    });

    if (grantRes.status !== 201) throw new Error(`Grant failed with status ${grantRes.status}`);
    readGrantId = grantRes.data.id;
    if (grantRes.data.permission !== 'READ') throw new Error(`Expected READ permission, got ${grantRes.data.permission}`);
  });

  // 5. Document owner can grant edit access to a named user
  let editGrantId = '';
  await runTest(5, 'Document owner can grant EDIT access to a named user', async () => {
    const grantRes = await request(`/api/documents/${testDocId}/access`, {
      method: 'POST',
      token: ownerToken,
      body: {
        userId: 'usr-03', // Marcus Vance
        permission: 'EDIT',
      },
    });

    if (grantRes.status !== 201) throw new Error(`Grant failed with status ${grantRes.status}`);
    editGrantId = grantRes.data.id;
    if (grantRes.data.permission !== 'EDIT') throw new Error(`Expected EDIT permission, got ${grantRes.data.permission}`);
  });

  // 6. User with read-only access can view document and content
  await runTest(6, 'User with READ access can view document metadata and content', async () => {
    const viewRes = await request(`/api/documents/${testDocId}`, { token: viewerToken });
    if (viewRes.status !== 200) throw new Error(`Expected 200, got ${viewRes.status}`);
    if (viewRes.data.userPermission !== 'READ') throw new Error(`Expected READ, got ${viewRes.data.userPermission}`);

    const contentRes = await request(`/api/documents/${testDocId}/content`, { token: viewerToken });
    if (contentRes.status !== 200) throw new Error(`Expected 200 on content, got ${contentRes.status}`);
  });

  // 7. User without access receives 403 on document view
  await runTest(7, 'User without access receives 403 on document view', async () => {
    // James Chen (usr-05) has no grant on testDocId
    const jamesLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'james.chen@trustvault.internal', password: 'ValidPassword123!' },
    });
    const jamesToken = jamesLogin.data.token;

    const res = await request(`/api/documents/${testDocId}`, { token: jamesToken });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // 8. User without access receives 403 on document content
  await runTest(8, 'User without access receives 403 on document content decryption', async () => {
    const jamesLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'james.chen@trustvault.internal', password: 'ValidPassword123!' },
    });
    const res = await request(`/api/documents/${testDocId}/content`, { token: jamesLogin.data.token });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // 9. User without access receives 403 on document download
  await runTest(9, 'User without access receives 403 on document payload download', async () => {
    const jamesLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'james.chen@trustvault.internal', password: 'ValidPassword123!' },
    });
    const res = await request(`/api/documents/${testDocId}/download`, { token: jamesLogin.data.token });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // 10. User with read-only access receives 403 when attempting to edit content
  await runTest(10, 'User with READ-only access receives 403 when attempting to edit content', async () => {
    const res = await request(`/api/documents/${testDocId}/content`, {
      method: 'PUT',
      token: viewerToken, // Elena Rostova has READ
      body: { content: 'Illegal modification attempt by read-only viewer' },
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // 11. User with edit access can successfully update content
  await runTest(11, 'User with EDIT access can successfully update content', async () => {
    const marcusLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'marcus.vance@trustvault.internal', password: 'ValidPassword123!' },
    });
    const marcusToken = marcusLogin.data.token;

    const res = await request(`/api/documents/${testDocId}/content`, {
      method: 'PUT',
      token: marcusToken,
      body: { content: '# Authorized update\nAudit comments added by Marcus Vance.' },
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // 12. Access revocation takes effect immediately (subsequent view attempt returns 403)
  await runTest(12, 'Access revocation takes effect immediately (subsequent view returns 403)', async () => {
    // Revoke Elena Rostova's read grant
    const revokeRes = await request(`/api/documents/${testDocId}/access/${readGrantId}`, {
      method: 'DELETE',
      token: ownerToken,
    });
    if (revokeRes.status !== 200) throw new Error(`Revocation failed: ${revokeRes.status}`);

    // Immediately test Elena's access
    const viewRes = await request(`/api/documents/${testDocId}`, { token: viewerToken });
    if (viewRes.status !== 403) {
      throw new Error(`Expected immediate 403 after revocation, got ${viewRes.status}`);
    }

    const contentRes = await request(`/api/documents/${testDocId}/content`, { token: viewerToken });
    if (contentRes.status !== 403) {
      throw new Error(`Expected immediate 403 on content after revocation, got ${contentRes.status}`);
    }
  });

  // 13. Non-owner cannot grant access to another user (returns 403)
  await runTest(13, 'Non-owner cannot grant access to another user (returns 403)', async () => {
    const res = await request(`/api/documents/${testDocId}/access`, {
      method: 'POST',
      token: viewerToken,
      body: { userId: 'usr-05', permission: 'READ' },
    });
    if (res.status !== 403) throw new Error(`Expected 403 on unauthorized grant attempt, got ${res.status}`);
  });

  // 14. Document owner can revoke access from a named user
  await runTest(14, 'Document owner can revoke EDIT grant and update grants list', async () => {
    const revokeRes = await request(`/api/documents/${testDocId}/access/${editGrantId}`, {
      method: 'DELETE',
      token: ownerToken,
    });
    if (revokeRes.status !== 200) throw new Error(`Revocation failed: ${revokeRes.status}`);

    const grantsRes = await request(`/api/documents/${testDocId}/access`, { token: ownerToken });
    if (grantsRes.status !== 200) throw new Error(`Get grants failed: ${grantsRes.status}`);
    const remaining = grantsRes.data.filter((g: any) => g.id === editGrantId);
    if (remaining.length !== 0) throw new Error('Revoked grant was still present in grants list.');
  });

  // 15. Administrator can view audit events for all documents
  await runTest(15, 'Administrator can view audit events for all platform activities', async () => {
    const auditRes = await request('/api/audit', { token: adminToken });
    if (auditRes.status !== 200) throw new Error(`Audit fetch failed: ${auditRes.status}`);
    if (!Array.isArray(auditRes.data.events) || auditRes.data.events.length === 0) {
      throw new Error('Audit trail returned empty or invalid structure.');
    }

    // Verify non-admin cannot view audit events
    const deniedRes = await request('/api/audit', { token: viewerToken });
    if (deniedRes.status !== 403) throw new Error(`Expected 403 for non-admin audit log view, got ${deniedRes.status}`);
  });

  // 16. Audit log chain verification succeeds for unmodified logs
  await runTest(16, 'Audit log chain verification succeeds for unmodified cryptographic logs', async () => {
    const verifyRes = await request('/api/audit/verify-chain', { token: adminToken });
    if (verifyRes.status !== 200) throw new Error(`Verification endpoint failed: ${verifyRes.status}`);
    if (verifyRes.data.chainValid !== true) {
      throw new Error(`Expected chainValid=true, got false: ${verifyRes.data.brokenReason}`);
    }
  });

  // 17. Audit log chain verification fails if an event is tampered with
  await runTest(17, 'Audit log chain verification fails if an audit event is tampered with', async () => {
    const snapshot = db.getSnapshot();
    if (snapshot.auditEvents.length === 0) throw new Error('No audit events to tamper with.');

    // Save authentic copy
    const originalDetails = snapshot.auditEvents[0].details;

    // Tamper with details without updating cryptographic hash
    snapshot.auditEvents[0].details = 'MALICIOUS_TAMPERED_INSPECTION_RECORD';

    const tamperedRes = await request('/api/audit/verify-chain', { token: adminToken });
    if (tamperedRes.data.chainValid !== false) {
      // Revert before throwing
      snapshot.auditEvents[0].details = originalDetails;
      throw new Error('Chain integrity check passed despite tampered audit payload.');
    }

    // Restore authenticity
    snapshot.auditEvents[0].details = originalDetails;
    const restoredRes = await request('/api/audit/verify-chain', { token: adminToken });
    if (restoredRes.data.chainValid !== true) {
      throw new Error('Restored chain failed validation.');
    }
  });

  // Bonus 18: Suspended accounts are immediately rejected with 403
  await runTest(18, 'Suspended account is immediately rejected from accessing protected API', async () => {
    const res = await request('/api/documents', { token: suspendedToken });
    if (res.status !== 403) throw new Error(`Expected 403 for suspended user, got ${res.status}`);
  });

  // Bonus 19: Path traversal in storage is rejected
  await runTest(19, 'File upload rejects dangerous file extensions (.sh, .exe)', async () => {
    const res = await request('/api/documents', {
      method: 'POST',
      token: ownerToken,
      body: {
        title: 'Malicious Shell Script',
        category: 'Engineering',
        classification: 'Internal',
        description: 'Exploit attempt',
        content: '#!/bin/bash\necho "pwned"',
        fileName: 'exploit.sh',
      },
    });
    if (res.status !== 400) throw new Error(`Expected 400 rejection for .sh file, got ${res.status}`);
  });

  // Clean up
  server.close();

  // Print Summary Table
  console.log('\n======================================================');
  console.log('📊 Test Results Summary');
  console.log('======================================================');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total Tests Run: ${results.length}`);
  console.log(`Passed:          ${passed}`);
  console.log(`Failed:          ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  if (server) server.close();
  process.exit(1);
});
