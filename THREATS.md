# TrustVault — Threat Model & Security Mitigations (THREATS.md)

This document formalizes the threat landscape, attack vectors, and defense-in-depth mitigations implemented in TrustVault.

---

## 1. Threat Taxonomy & Mitigation Matrix

### T1: Insecure Direct Object References (IDOR) & BOLA
- **Threat Vector**: An authenticated user changes the document ID in the URL (`GET /api/documents/{unauthorized_id}`, `GET /api/documents/{id}/content`, `GET /api/documents/{id}/download`) to view or download documents they do not own and were never granted access to.
- **Severity**: Critical.
- **Mitigation in TrustVault**:
  1. Every object-level endpoint resolves permissions through `resolvePermission(doc, user)` on the backend.
  2. If the user is neither the document owner nor an active grantee with a non-expired grant, the backend immediately halts execution, logs an `ACCESS_DENIED` security audit event with IP, timestamp, and caller details, and responds with HTTP `403 Forbidden`.
  3. The document existence or non-existence is never leaked to unauthorized callers through timing discrepancies.
- **Test Coverage**: Tests 07, 08, 09 in `tests/backend.test.ts`.

---

### T2: Privilege Escalation & Role Tampering
- **Threat Vector**: A malicious user or compromised low-privilege account attempts to change their own role to `ADMINISTRATOR` or `OWNER` by issuing HTTP `PATCH /api/users/{id}/role` or injecting arbitrary session headers.
- **Severity**: High.
- **Mitigation in TrustVault**:
  1. Administrative routes are protected by the `requireAdmin` server middleware, which verifies cryptographic token claims and cross-checks with the canonical user directory.
  2. Self-promotion or status change attempts by non-administrators trigger an `ACCESS_DENIED` audit event with `isSuspicious: true`.
  3. Administrators are prevented from self-suspension (`SELF_SUSPENSION_BLOCKED`) to eliminate denial-of-service lockout states.
- **Test Coverage**: Tested in `requireAdmin` middleware tests and user status API tests.

---

### T3: Audit Log Tampering, Deletion, & Repudiation
- **Threat Vector**: An attacker with compromised credentials performs unauthorized actions and attempts to cover their tracks by deleting or modifying audit records directly on the database.
- **Severity**: Critical.
- **Mitigation in TrustVault**:
  1. **Canonical Hash-Chaining**: Every audit entry is cryptographically bound to its predecessor via:
     $$H_n = \text{SHA-256}(H_{n-1} + \text{canonical}(E_n))$$
  2. The chain originates from a fixed 64-character `GENESIS_HASH`.
  3. Modifying any field (such as `details`, `actor`, `action`, or `timestamp`) of an existing record invalidates all subsequent block hashes.
  4. The `/api/audit/verify-chain` endpoint traverses the chronological sequence and detects any altered, omitted, or inserted records, returning the exact block index and mismatch details.
- **Test Coverage**: Tests 16 and 17 in `tests/backend.test.ts`.

---

### T4: Path Traversal & Arbitrary File Overwrite
- **Threat Vector**: An attacker crafts a filename payload such as `../../../../etc/passwd` or `../../server.ts` during document upload or content download to read or overwrite critical server files.
- **Severity**: Critical.
- **Mitigation in TrustVault**:
  1. Client-supplied filenames are never used as physical storage paths.
  2. The backend generates a deterministic, safe internal filename: `${docId}_storage.${sanitizedExt}`.
  3. Paths are resolved using `path.resolve` and strictly asserted to start with `PRIVATE_STORAGE_PATH`:
     ```typescript
     if (!filePath.startsWith(PRIVATE_STORAGE_PATH)) {
       throw new Error('Invalid storage destination path.');
     }
     ```
  4. Extensions are restricted to safe text/document formats (`.md`, `.txt`, `.pdf`, `.json`, `.csv`, `.yaml`). Executable extensions (`.sh`, `.exe`, `.bin`, `.js`) are rejected with `400 Bad Request`.
- **Test Coverage**: Test 19 in `tests/backend.test.ts`.

---

### T5: Revocation Latency & Stale Permission Caching
- **Threat Vector**: A user whose access was revoked continues to read, download, or edit documents due to cached JWT claims, distributed cache delay, or long-lived authorization sessions.
- **Severity**: High.
- **Mitigation in TrustVault**:
  1. Access grants are checked against the authoritative storage on every single document request.
  2. Revoking an `AccessGrant` deletes the record immediately and flushes the document's active grant index.
  3. A subsequent request by the revoked user in the exact next millisecond returns `403 Forbidden`.
- **Test Coverage**: Test 12 in `tests/backend.test.ts`.

---

### T6: Suspended User Account Bypass
- **Threat Vector**: An offboarded employee or contractor with active API tokens attempts to bypass account suspension to access documents or audit information.
- **Severity**: High.
- **Mitigation in TrustVault**:
  1. The authentication middleware validates the user's status on every incoming request.
  2. If `user.status === 'SUSPENDED'`, the request is immediately rejected with `403 Account Suspended`.
  3. The unauthorized access attempt is automatically recorded in the audit trail as a suspicious event (`isSuspicious: true`).
- **Test Coverage**: Test 18 in `tests/backend.test.ts`.

---

### T7: Confidentiality Leaks via Administrator Oversight
- **Threat Vector**: Platform administrators abuse their oversight privileges to read confidential document payloads or M&A financial models that were not explicitly shared with them.
- **Severity**: High.
- **Mitigation in TrustVault**:
  1. Administrative oversight is separated into governance (managing user accounts, reviewing audit logs, system statistics) versus document custody.
  2. When administrators view or download document payloads, their access is explicitly recorded in the immutable audit log with full attribution, preventing covert snooping.
- **Test Coverage**: Verified in audit event creation and user permission attribution.
