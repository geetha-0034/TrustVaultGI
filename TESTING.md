# TrustVault — Automated Testing Guide & Test Suite Matrix (TESTING.md)

TrustVault features a comprehensive automated test suite validating security boundaries, object-level access controls, role segregation, input validation, and cryptographic hash-chain integrity.

---

## 1. Running Automated Tests

### Node.js / Express Live API Test Runner
```bash
# Execute all 19 automated tests
npm test

# Direct runner execution
npx tsx tests/backend.test.ts
```

### Python / Django Test Suite (Reference Implementation)
```bash
cd backend
python manage.py test vault
# or with pytest:
pytest
```

---

## 2. Test Execution Results (100% Pass)

```text
======================================================
🔒 TrustVault Cryptographic Backend Test Suite
======================================================

[Test Runner] Live ephemeral test server active at http://127.0.0.1:37479

  ✓ [TEST 01] Unauthenticated requests to protected endpoints return 401
  ✓ [TEST 02] Document owner can upload and view their document
  ✓ [TEST 03] Document owner can update document content and bump version
  ✓ [TEST 04] Document owner can grant READ access to a named user
  ✓ [TEST 05] Document owner can grant EDIT access to a named user
  ✓ [TEST 06] User with READ access can view document metadata and content
  ✓ [TEST 07] User without access receives 403 on document view
  ✓ [TEST 08] User without access receives 403 on document content decryption
  ✓ [TEST 09] User without access receives 403 on document payload download
  ✓ [TEST 10] User with READ-only access receives 403 when attempting to edit content
  ✓ [TEST 11] User with EDIT access can successfully update content
  ✓ [TEST 12] Access revocation takes effect immediately (subsequent view returns 403)
  ✓ [TEST 13] Non-owner cannot grant access to another user (returns 403)
  ✓ [TEST 14] Document owner can revoke EDIT grant and update grants list
  ✓ [TEST 15] Administrator can view audit events for all platform activities
  ✓ [TEST 16] Audit log chain verification succeeds for unmodified cryptographic logs
  ✓ [TEST 17] Audit log chain verification fails if an audit event is tampered with
  ✓ [TEST 18] Suspended account is immediately rejected from accessing protected API
  ✓ [TEST 19] File upload rejects dangerous file extensions (.sh, .exe)

======================================================
📊 Test Results Summary
======================================================
Total Tests Run: 19
Passed:          19
Failed:          0
======================================================
```

---

## 3. Detailed Test Specification Matrix

| ID | Test Scenario | Threat / Requirement Addressed | Expected Result |
| :--- | :--- | :--- | :--- |
| **01** | Unauthenticated request to protected endpoints | Authentication enforcement on `/api/documents`, `/api/users`, `/api/audit` | `401 Unauthorized` |
| **02** | Owner creates and views document | Owner permission establishment upon upload | `201 Created`, `200 OK` with `userPermission: 'OWNER'` |
| **03** | Owner updates document content | Version incrementing and SHA-256 recalculation | `200 OK`, `version: '1.1'`, new checksum generated |
| **04** | Owner grants `READ` access | Delegating read-only access to a named user | `201 Created` with `permission: 'READ'` |
| **05** | Owner grants `EDIT` access | Delegating collaborative editing to an auditor | `201 Created` with `permission: 'EDIT'` |
| **06** | Read grantee views metadata & content | Authorized reader capabilities | `200 OK` on `/api/documents/{id}` and `/content` |
| **07** | Non-granted user attempts document view | Insecure Direct Object Reference (IDOR) prevention | `403 Forbidden` (`PERMISSION_DENIED`) |
| **08** | Non-granted user attempts content view | Payload decryption prevention | `403 Forbidden` (`PERMISSION_DENIED`) |
| **09** | Non-granted user attempts download | Binary exfiltration prevention | `403 Forbidden` (`PERMISSION_DENIED`) |
| **10** | Read grantee attempts edit | Enforcement of read vs. edit permission boundary | `403 Forbidden` (`EDIT_PERMISSION_REQUIRED`) |
| **11** | Edit grantee updates content | Collaborative editing under explicit grant | `200 OK`, new version and checksum stored |
| **12** | Immediate revocation verification | Zero latency in access withdrawal | Immediate `403 Forbidden` on next request |
| **13** | Non-owner attempts to grant access | Unauthorized privilege propagation prevention | `403 Forbidden` (`FORBIDDEN`) |
| **14** | Owner revokes `EDIT` grant | Complete grant lifecycle cleanup | Grant deleted; no longer listed in `/access` |
| **15** | Admin views global audit events | Platform security inspection by governance roles | `200 OK` with full events array; non-admins get `403` |
| **16** | Unmodified audit chain validation | Mathematical integrity verification of hash-chain | `200 OK` with `chainValid: true`, `brokenIndex: null` |
| **17** | Tampered audit event detection | Detection of malicious database modification | `200 OK` with `chainValid: false`, exact broken index identified |
| **18** | Suspended account access attempt | Enforcement of account lifecycle suspension | Immediate `403 Account Suspended` with audit alert |
| **19** | Prohibited file upload attempt | Prevention of executable or shell script injection | `400 Bad Request` (`prohibited extension`) |
