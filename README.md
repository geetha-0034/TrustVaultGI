# TrustVault — Enterprise Secure Document Sharing & Verifiable Audit Trail

TrustVault is a zero-trust document custody and sharing platform featuring fine-grained, document-level access control, role-based governance, and a cryptographically verifiable audit hash chain.

---

## Key Features

1. **Document-Level Access Control (Zero-Trust)**:
   - Explicit named grants (`READ` or `EDIT`) per document.
   - Immediate revocation without stale session caching or delayed propagation.
   - Non-owners cannot grant access, view unauthorized records, or download private payloads.
   - Strict separation between administrative oversight (metadata, audit inspection, account status) and content access.

2. **Verifiable Audit Hash-Chain ($H_n = \text{SHA256}(H_{n-1} + \text{canonical}(E_n))$)**:
   - Every security event (logins, uploads, views, downloads, edits, grants, revocations, and blocked access attempts) is cryptographically chained to its predecessor.
   - Real-time cryptographic integrity verification via `/api/audit/verify-chain`.
   - Any modification or deletion of past records breaks the hash link and is flagged immediately.

3. **Multi-Role Security Architecture**:
   - **Administrator**: Platform statistics, global audit inspection, user activation/suspension, and suspicious event triage.
   - **Document Owner**: Document upload, version control, metadata editing, access granting, modification, and instantaneous revocation.
   - **Viewer / Recipient**: Access strictly limited to explicitly shared documents, authorized preview decryption, authorized downloading, and locked edit capabilities.

4. **Private Storage & Content Integrity**:
   - Documents are stored in an isolated, private filesystem directory outside the public web root.
   - Every file write calculates an authenticated SHA-256 checksum to prevent undetected bit-rot or offline tampering.
   - Path-traversal safeguards and MIME-type/extension restrictions.

---

## Architecture Overview

```
                  +----------------------------------------------+
                  |         React 19 + Tailwind CSS Frontend     |
                  |     (Zero-Trust UI, Dark Cryptographic Theme)|
                  +----------------------+-----------------------+
                                         | Bearer JWT Session Token
                                         v
                  +----------------------------------------------+
                  |    TrustVault Core Security REST Gateway     |
                  |     (server.ts / Django REST Framework)      |
                  +-------+--------------------+-----------------+
                          |                    |
        +-----------------+                    +-----------------+
        |                                                        |
        v                                                        v
+-----------------------+                              +-----------------------+
|  Private Disk Storage |                              | Cryptographic Storage |
|  ./storage/documents/ |                              | ./data/database.json  |
|  - SHA-256 Checksums  |                              | - Immutable Hash Chain|
|  - Path Traversal Prev|                              | - Role & Object Grants|
+-----------------------+                              +-----------------------+
```

---

## Quick Start

### 1. Requirements
- Node.js 18+ (tested on Node v20/v22)
- Python 3.10+ (for Django reference implementation)

### 2. Running the Live Application
```bash
# Install dependencies
npm install

# Run backend with dev server
npm run dev
```
The application will launch on `http://localhost:3000`.

### 3. Running Automated Tests
```bash
# Execute the full 19-scenario automated backend test suite
npm test
```

---

## User Personas (1-Click Instant Sign-In)

| Persona | Name | Role | Email | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Administrator** | Geetha Inaganti | ADMINISTRATOR | `geetha03inaganti@gmail.com` | Full governance, audit verification, user management |
| **Compliance Officer** | Sarah Connor | ADMINISTRATOR | `sarah.connor@trustvault.internal` | Platform stats, audit inspection, threat triage |
| **Security Architect** | Alex Rivera | OWNER | `alex.rivera@trustvault.internal` | Uploads, edits, grant management, access revocation |
| **Corporate Treasury** | James Chen | OWNER | `james.chen@trustvault.internal` | Financial model uploads, ownership delegation |
| **External Auditor** | Marcus Vance | VIEWER | `marcus.vance@trustvault.internal` | Viewing authorized docs, authorized edit grants |
| **Risk Analyst** | Elena Rostova | VIEWER | `elena.rostova@trustvault.internal` | Read-only viewing and authorized downloads |
| **Suspended Contractor**| David Sterling | VIEWER (SUSPENDED)| `david.sterling@trustvault.internal` | **Blocked from API & UI access** |

---

## Security Documentation

- [Threat Model & Mitigations](THREATS.md)
- [Authorization & Access Control Policy](AUTHORIZATION.md)
- [Cryptographic Audit Log Design](AUDIT_DESIGN.md)
- [Automated Test Suite Documentation](TESTING.md)
- [Local Setup & Deployment Guide](SETUP.md)
- [API Contract Specification](API_CONTRACT.md)
