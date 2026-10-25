# TrustVault — REST API Specification & Contract

This document specifies the exact contract between the TrustVault frontend and backend services. It outlines endpoints, authentication, permissions, request payloads, response structures, and error states.

---

## 1. Authentication & Security Architecture

### Base URL
`/api`

### Authorization Header
All requests except `/api/auth/login` and `/api/auth/refresh` require an authorization bearer token:
```http
Authorization: Bearer <jwt_or_session_token>
```

### User Roles
- `ADMINISTRATOR`: Platform oversight, user account management, platform-wide audit log inspection, security threat investigation.
- `OWNER`: Document creator/custodian. Can view, edit, download, delete, manage access permissions, and review audit trails for owned documents.
- `VIEWER`: Recipient explicitly granted access. Can view permitted documents, download (if allowed by policy), and edit only if granted `EDIT` permission on that specific document.

---

## 2. API Endpoints

### 2.1 Authentication (`/api/auth/`)

#### `POST /api/auth/login`
- **Action**: Authenticate user credentials and establish session.
- **Required Role**: None (Public)
- **Request Body**:
```json
{
  "email": "user@trustvault.internal",
  "password": "SecurePassword123!"
}
```
- **Success Response (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr-01",
    "name": "Sarah Connor",
    "email": "sarah.connor@trustvault.internal",
    "role": "ADMINISTRATOR",
    "department": "InfoSec Compliance",
    "status": "ACTIVE",
    "avatar": "https://images.unsplash.com/...",
    "mfaEnabled": true,
    "lastLogin": "2026-10-25T01:45:00Z"
  },
  "expiresAt": "2026-10-25T09:45:00Z"
}
```
- **Error Responses**:
  - `400 Bad Request`: Missing email or password.
  - `401 Unauthorized`: Invalid email or password.
  - `403 Forbidden`: Account is suspended/deactivated.
  - `429 Too Many Requests`: Rate limit exceeded / account temporarily locked.
- **UI Behavior**:
  - *Success*: Store token, set global auth state, redirect to role-specific dashboard, log `USER_LOGIN` audit event.
  - *Failure*: Display inline credential error; shake input fields; reset password field.

#### `POST /api/auth/logout`
- **Action**: Invalidate user session token and clear active session.
- **Required Role**: Any authenticated user
- **Request Body**: Empty `{}`
- **Success Response (200 OK)**:
```json
{
  "message": "Successfully logged out"
}
```
- **UI Behavior**:
  - *Success*: Clear client token and local state, redirect to login page, show confirmation banner.

#### `GET /api/auth/me`
- **Action**: Retrieve profile for the currently authenticated session.
- **Required Role**: Any authenticated user
- **Success Response (200 OK)**: User profile object.
- **Error Responses**:
  - `401 Unauthorized`: Token expired or invalid.
- **UI Behavior**:
  - *Failure*: Redirect to login with `session_expired` flag.

---

### 2.2 Users Management (`/api/users/`)

#### `GET /api/users/`
- **Action**: List and search users across the directory.
- **Required Role**: `ADMINISTRATOR` (or document owners selecting users for access grants).
- **Query Parameters**:
  - `search` (string): Search by name or email.
  - `role` (enum: `ADMINISTRATOR`, `OWNER`, `VIEWER`): Filter by role.
  - `status` (enum: `ACTIVE`, `SUSPENDED`): Filter by account status.
  - `page` (integer): Page number.
  - `limit` (integer): Page size (default: 20).
- **Success Response (200 OK)**:
```json
{
  "users": [
    {
      "id": "usr-02",
      "name": "Alex Rivera",
      "email": "alex.rivera@trustvault.internal",
      "role": "OWNER",
      "department": "Engineering Operations",
      "status": "ACTIVE",
      "ownedDocumentsCount": 8,
      "accessibleDocumentsCount": 12,
      "lastLogin": "2026-10-24T22:15:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

#### `PATCH /api/users/{id}/status`
- **Action**: Activate or suspend/deactivate a user account.
- **Required Role**: `ADMINISTRATOR`
- **Request Body**:
```json
{
  "status": "SUSPENDED", // or "ACTIVE"
  "reason": "Security review pending"
}
```
- **Success Response (200 OK)**: Updated user object.
- **UI Behavior**:
  - *Success*: Update user row in table, display success toast, log `USER_STATUS_CHANGED` audit record.

#### `PATCH /api/users/{id}/role`
- **Action**: Elevate or demote user system role.
- **Required Role**: `ADMINISTRATOR`
- **Request Body**:
```json
{
  "role": "OWNER"
}
```
- **Success Response (200 OK)**: Updated user object.

---

### 2.3 Documents (`/api/documents/`)

#### `GET /api/documents/`
- **Action**: List documents accessible to the current user (owned or shared).
- **Required Role**: Any authenticated user
- **Query Parameters**:
  - `search` (string): Text filter on document title.
  - `category` (string): Filter by category (`Financial`, `Legal`, `Security Audit`, `Engineering`, `Executive`, `Compliance`).
  - `classification` (string): Filter by classification (`Confidential`, `Restricted`, `Internal`).
  - `scope` (enum: `all`, `owned`, `shared`): Filter by relation to caller.
  - `sortBy` (enum: `updatedAt`, `title`, `size`): Sort column.
  - `order` (enum: `asc`, `desc`): Sort order.
  - `page` (integer): Page index.
  - `limit` (integer): Page size.
- **Success Response (200 OK)**:
```json
{
  "documents": [
    {
      "id": "doc-01",
      "title": "Q3 Enterprise Security Audit Report",
      "description": "Comprehensive SOC-2 Type II audit findings and mitigation roadmap.",
      "category": "Security Audit",
      "classification": "Restricted",
      "mimeType": "application/pdf",
      "sizeBytes": 4208192,
      "owner": {
        "id": "usr-02",
        "name": "Alex Rivera",
        "email": "alex.rivera@trustvault.internal"
      },
      "userPermission": "EDIT", // "OWNER" | "EDIT" | "READ"
      "activeGrantsCount": 3,
      "createdAt": "2026-10-15T14:30:00Z",
      "updatedAt": "2026-10-22T09:12:00Z",
      "version": "1.3"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```
- **UI Behavior**:
  - Display document grid/table. Render available actions (View, Download, Edit, Manage Access, Delete) based strictly on `userPermission` and role.

#### `POST /api/documents/`
- **Action**: Upload and create a new document.
- **Required Role**: `OWNER` or `ADMINISTRATOR`
- **Request Multipart Form Data**:
  - `file`: Binary file upload.
  - `title`: String (required).
  - `category`: String (required).
  - `classification`: Enum (`Confidential` | `Restricted` | `Internal`).
  - `description`: String (optional).
  - `content`: String (if text/markdown/direct content).
- **Success Response (201 Created)**: Created document object.
- **Error Responses**:
  - `400 Bad Request`: Validation failure (file size > 25MB, disallowed extension).
  - `403 Forbidden`: User role is `VIEWER` (unauthorized to upload).
- **UI Behavior**:
  - *Success*: Close upload modal, show success toast, refresh document list, log `DOCUMENT_UPLOAD` audit event.

#### `GET /api/documents/{id}`
- **Action**: Retrieve single document metadata.
- **Required Role**: Owner, Admin, or User with active Read/Edit grant.
- **Error Responses**:
  - `403 Forbidden`: Caller lacks active permission grant.
  - `404 Not Found`: Document does not exist or has been deleted.
- **UI Behavior**:
  - *403*: Display Access-Denied state with "Request Access" action and log `ACCESS_DENIED` audit record.

#### `DELETE /api/documents/{id}`
- **Action**: Delete a document.
- **Required Role**: Document Owner or Platform Administrator.
- **Success Response (200 OK)**:
```json
{
  "message": "Document permanently deleted",
  "id": "doc-01"
}
```
- **UI Behavior**:
  - *Success*: Remove from library, redirect to documents index, log `DOCUMENT_DELETED` audit event.

---

### 2.4 Document Content & Download

#### `GET /api/documents/{id}/content/`
- **Action**: Fetch safe, rendered preview content for text/markdown/JSON/tabular documents.
- **Required Role**: Owner, Admin, or User with `READ` or `EDIT` permission.
- **Success Response (200 OK)**:
```json
{
  "id": "doc-01",
  "mimeType": "text/markdown",
  "content": "# Executive Security Audit\n\nAll findings have been reviewed...",
  "updatedAt": "2026-10-22T09:12:00Z",
  "checksum": "sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```
- **UI Behavior**:
  - Render preview in Document Viewer. Log `DOCUMENT_VIEW` event.

#### `PUT /api/documents/{id}/content/`
- **Action**: Save modifications to editable documents.
- **Required Role**: Owner, Admin, or User with explicit `EDIT` permission.
- **Request Body**:
```json
{
  "content": "# Updated Audit Content\n\nNew mitigation dates added...",
  "changeSummary": "Updated mitigation milestones for Phase 2"
}
```
- **Success Response (200 OK)**: Updated document metadata and timestamp.
- **Error Responses**:
  - `403 Forbidden`: User only has `READ` permission.
- **UI Behavior**:
  - *Success*: Mark editor clean, update timestamp, show success toast, log `DOCUMENT_EDIT` audit event.

#### `GET /api/documents/{id}/download/`
- **Action**: Request authorized document binary download.
- **Required Role**: Owner, Admin, or User with active Read/Edit grant.
- **Response**: Binary stream (`application/octet-stream` or native MIME) with `Content-Disposition: attachment; filename="..."`.
- **UI Behavior**:
  - Trigger browser download; show progress toast; record `DOCUMENT_DOWNLOAD` audit trail record with actor IP and timestamp.

---

### 2.5 Access Control Management (`/api/documents/{id}/access/`)

#### `GET /api/documents/{id}/access/`
- **Action**: List all current named user access grants for this document.
- **Required Role**: Document Owner or Administrator.
- **Success Response (200 OK)**:
```json
{
  "documentId": "doc-01",
  "grants": [
    {
      "id": "grant-101",
      "userId": "usr-03",
      "user": {
        "id": "usr-03",
        "name": "Marcus Vance",
        "email": "marcus.vance@trustvault.internal",
        "department": "External Compliance Auditor",
        "avatar": "..."
      },
      "permission": "READ", // "READ" | "EDIT"
      "grantedBy": {
        "id": "usr-02",
        "name": "Alex Rivera"
      },
      "grantedAt": "2026-10-18T11:20:00Z",
      "expiresAt": null
    }
  ]
}
```

#### `POST /api/documents/{id}/access/`
- **Action**: Grant a named user `READ` or `EDIT` permission.
- **Required Role**: Document Owner or Administrator.
- **Request Body**:
```json
{
  "userId": "usr-04",
  "permission": "READ" // "READ" | "EDIT"
}
```
- **Success Response (201 Created)**: Created grant object.
- **Error Responses**:
  - `400 Bad Request`: User already has an active grant (use PATCH instead).
  - `404 Not Found`: Target user does not exist.
  - `403 Forbidden`: Caller is not document owner or admin.
- **UI Behavior**:
  - Refresh grants list, show confirmation toast, log `ACCESS_GRANTED` audit event.

#### `PATCH /api/documents/{id}/access/{grant_id}/`
- **Action**: Modify an existing grant (e.g. promote `READ` to `EDIT` or vice-versa).
- **Required Role**: Document Owner or Administrator.
- **Request Body**:
```json
{
  "permission": "EDIT"
}
```
- **Success Response (200 OK)**: Updated grant object.
- **UI Behavior**:
  - Refresh grants list, log `ACCESS_MODIFIED` audit event.

#### `DELETE /api/documents/{id}/access/{grant_id}/`
- **Action**: Immediately revoke a named user's access to the document.
- **Required Role**: Document Owner or Administrator.
- **Success Response (200 OK)**:
```json
{
  "message": "Access permission revoked immediately",
  "grantId": "grant-101"
}
```
- **UI Behavior**:
  - Immediately remove user from grants list; subsequent attempts by that user to view, edit, or download will be rejected with 403 Forbidden. Log `ACCESS_REVOKED` audit event.

---

### 2.6 Activity & Verifiable Audit Trail

#### `GET /api/documents/{id}/activity/`
- **Action**: Retrieve chronological audit events for a specific document.
- **Required Role**: Document Owner or Administrator (and authorized reviewers).
- **Query Parameters**:
  - `page` (integer), `limit` (integer).
- **Success Response (200 OK)**:
```json
{
  "documentId": "doc-01",
  "events": [
    {
      "id": "evt-901",
      "timestamp": "2026-10-24T18:32:10Z",
      "actor": {
        "id": "usr-03",
        "name": "Marcus Vance",
        "email": "marcus.vance@trustvault.internal",
        "role": "VIEWER"
      },
      "action": "DOCUMENT_DOWNLOAD",
      "result": "ALLOWED",
      "ipAddress": "192.168.10.45",
      "userAgent": "Mozilla/5.0 ... Chrome/130",
      "details": "Downloaded decrypted binary package (4.2 MB)"
    }
  ]
}
```

#### `GET /api/audit/`
- **Action**: Retrieve platform-wide audit log including all operations, security violations, and denied attempts.
- **Required Role**: `ADMINISTRATOR`
- **Query Parameters**:
  - `search` (string): Search by actor, document title, or IP.
  - `action` (string): Filter by action (`DOCUMENT_UPLOAD`, `DOCUMENT_VIEW`, `DOCUMENT_DOWNLOAD`, `DOCUMENT_EDIT`, `ACCESS_GRANTED`, `ACCESS_REVOKED`, `DOCUMENT_DELETED`, `ACCESS_DENIED`, `SUSPICIOUS_ATTEMPT`).
  - `result` (enum: `ALL`, `ALLOWED`, `DENIED`).
  - `startDate`, `endDate` (ISO timestamps).
  - `page`, `limit`.
- **Success Response (200 OK)**: List of tamper-evident audit records with pagination.
- **UI Behavior**:
  - Populate searchable, filterable security table with row inspection drawer.

#### `GET /api/audit/export`
- **Action**: Export audit records to CSV or cryptographic JSON.
- **Required Role**: `ADMINISTRATOR`
- **Query Parameters**: `format` (`csv` or `json`).
- **Response**: File download stream.

---

## 3. Standard HTTP Error Response Schema

All error responses from TrustVault endpoints conform to:
```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "User does not have EDIT rights on document doc-01",
    "details": {
      "documentId": "doc-01",
      "requiredPermission": "EDIT",
      "currentPermission": "READ"
    },
    "timestamp": "2026-10-25T01:47:00Z",
    "requestId": "req-98f24a1"
  }
}
```

---

## 4. Frontend-Backend Security Disclosure

1. **Client UI Guardrails**: The frontend enforces role-aware UI visibility (hiding/disabling unauthorized buttons).
2. **Backend Authoritative Enforcement**: The frontend treats all client state as advisory. The backend enforces authentication and document access control on every request.
3. **Download Immutability**: Revoking access prevents future requests (view, edit, download). Clients cannot remotely scrub previously downloaded local files.
