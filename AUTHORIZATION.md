# TrustVault — Authorization & Access Control Policy (AUTHORIZATION.md)

TrustVault implements a dual-layer access control architecture: **Role-Based Access Control (RBAC)** for global platform capabilities and **Object-Level Access Control (OLAC)** for individual document custody.

---

## 1. System Roles

| Role | Description | Global Capabilities | Document Capabilities |
| :--- | :--- | :--- | :--- |
| **`ADMINISTRATOR`** | Security Officer, Compliance Auditor | Inspect platform-wide audit log, verify hash-chain integrity, activate/suspend user accounts, modify role assignments, view system statistics. | Full custodian oversight. Can inspect metadata and view documents; all read operations generate audited records. |
| **`OWNER`** | Document Creator, Project Lead | Upload new documents, manage custody of owned documents. | Upload, edit metadata and content, grant `READ` or `EDIT` permissions to named users, revoke permissions, review document-specific audit activity, permanently delete owned documents. |
| **`VIEWER`** | Recipient, External Auditor | Authenticate, inspect accessible documents shared with them. | View metadata and decrypted content for explicitly granted documents, download authorized payloads, edit content **only** if granted `EDIT` permission. Cannot grant permissions, delete documents, or view unshared documents. |

---

## 2. Document-Level Permission Levels

| Permission Level | Description | Allowed Actions |
| :--- | :--- | :--- |
| **`READ`** | Read-Only Recipient | View document metadata, decrypt and render document preview, download authorized binary copy, review document activity history. |
| **`EDIT`** | Collaborative Editor | All `READ` capabilities, plus modify document contents (HTTP `PUT /api/documents/{id}/content`), which bumps version number and generates a new SHA-256 content checksum. |
| **`OWNER`** | Custodian / Creator | All `EDIT` capabilities, plus grant new permissions, update existing permissions, revoke permissions, and permanently delete the document. |

---

## 3. Object-Level Resolution Algorithm

When a request targeting a document arrives at the backend, permission is resolved using the authoritative `resolvePermission(doc, user)` algorithm:

```
                  +--------------------------------+
                  | Incoming Document API Request  |
                  +---------------+----------------+
                                  |
                                  v
                    [ Is user.status == 'ACTIVE'? ]
                                  |
                     No           | Yes
          +-----------------------+-----------------------+
          |                                               |
          v                                               v
    [ HTTP 403 ]                          [ Is user.role == 'ADMINISTRATOR'? ]
  Account Suspended                                       |
                                             Yes          | No
                                  +-----------------------+-----------------------+
                                  |                                               |
                                  v                                               v
                         [ Grant 'OWNER' Perm ]                      [ Is doc.owner.id == user.id? ]
                                                                                  |
                                                                     Yes          | No
                                                          +-----------------------+-----------------------+
                                                          |                                               |
                                                          v                                               v
                                                 [ Grant 'OWNER' Perm ]          [ Active Grant Exists? ]
                                                                                  - userId == user.id
                                                                                  - now() <= expiresAt
                                                                                          |
                                                                             Yes          | No
                                                                  +-----------------------+-----------------------+
                                                                  |                                               |
                                                                  v                                               v
                                                         [ Grant Perm (READ/EDIT) ]                  [ Deny Access: NULL ]
                                                                                                      HTTP 403 Forbidden
```

---

## 4. Grant Management & Revocation Semantics

1. **Who Can Grant Permissions?**:
   - Only the document owner or a platform administrator can issue grants.
   - Non-owner users attempting to grant permissions to peers receive `403 Forbidden` (`FORBIDDEN`).
2. **Immediate Revocation**:
   - Calling `DELETE /api/documents/{id}/access/{grantId}` removes the grant record immediately from authoritative storage.
   - Subsequent requests by the revoked user in the exact next millisecond fail authorization with `403 Forbidden`.
   - No token refresh or cache expiration waiting period is required.
3. **Time-Bound Grants (`expiresAt`)**:
   - Grants may specify an ISO-8601 `expiresAt` timestamp.
   - The authorization check evaluates `expiresAt < now()` dynamically; expired grants are treated as non-existent.

---

## 5. API Endpoint Authorization Matrix

| Endpoint | Method | Required Role | Required Document Permission | Audit Action Logged |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Any | None | `USER_LOGIN` |
| `/api/auth/logout` | `POST` | Any | None | `USER_LOGOUT` |
| `/api/users` | `GET` | Authenticated | None | None |
| `/api/users/{id}/status` | `PATCH` | `ADMINISTRATOR` | None | `USER_STATUS_CHANGE` |
| `/api/users/{id}/role` | `PATCH` | `ADMINISTRATOR` | None | `USER_STATUS_CHANGE` |
| `/api/documents` | `GET` | Authenticated | None (filters accessible) | None |
| `/api/documents` | `POST` | `OWNER`, `ADMINISTRATOR` | None (becomes owner) | `DOCUMENT_UPLOAD` |
| `/api/documents/{id}` | `GET` | Authenticated | `READ`, `EDIT`, or `OWNER` | None / `ACCESS_DENIED` |
| `/api/documents/{id}/content` | `GET` | Authenticated | `READ`, `EDIT`, or `OWNER` | `DOCUMENT_VIEW` |
| `/api/documents/{id}/content` | `PUT` | Authenticated | `EDIT` or `OWNER` | `DOCUMENT_EDIT` |
| `/api/documents/{id}/download`| `GET` | Authenticated | `READ`, `EDIT`, or `OWNER` | `DOCUMENT_DOWNLOAD` |
| `/api/documents/{id}/access` | `GET` | Authenticated | `OWNER` | None |
| `/api/documents/{id}/access` | `POST` | Authenticated | `OWNER` | `ACCESS_GRANTED` |
| `/api/documents/{id}/access/{id}`| `PATCH` | Authenticated | `OWNER` | `ACCESS_MODIFIED` |
| `/api/documents/{id}/access/{id}`| `DELETE`| Authenticated | `OWNER` | `ACCESS_REVOKED` |
| `/api/documents/{id}` | `DELETE`| Authenticated | `OWNER` | `DOCUMENT_DELETED` |
| `/api/documents/{id}/activity`| `GET` | Authenticated | `READ`, `EDIT`, or `OWNER` | None |
| `/api/audit` | `GET` | `ADMINISTRATOR` | None | None / `ACCESS_DENIED` |
| `/api/audit/verify-chain` | `GET` | `ADMINISTRATOR` | None | None |
| `/api/audit/export` | `GET` | `ADMINISTRATOR` | None | None |
