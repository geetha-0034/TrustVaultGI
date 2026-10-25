import { User, DocumentItem, AccessGrant, AuditEvent, PlatformStats } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-00',
    name: 'Geetha Inaganti',
    email: 'geetha03inaganti@gmail.com',
    role: 'ADMINISTRATOR',
    department: 'Platform Executive Administration',
    status: 'ACTIVE',
    avatarUrl: '',
    ownedDocumentsCount: 6,
    accessibleDocumentsCount: 20,
    lastLogin: '2026-10-25T02:00:00Z',
    mfaEnabled: true,
  },
  {
    id: 'usr-01',
    name: 'Sarah Connor',
    email: 'sarah.connor@trustvault.internal',
    role: 'ADMINISTRATOR',
    department: 'InfoSec Compliance & Governance',
    status: 'ACTIVE',
    avatarUrl: '',
    ownedDocumentsCount: 4,
    accessibleDocumentsCount: 18,
    lastLogin: '2026-10-25T01:30:00Z',
    mfaEnabled: true,
  },
  {
    id: 'usr-02',
    name: 'Alex Rivera',
    email: 'alex.rivera@trustvault.internal',
    role: 'OWNER',
    department: 'Security Architecture',
    status: 'ACTIVE',
    avatarUrl: '',
    ownedDocumentsCount: 6,
    accessibleDocumentsCount: 14,
    lastLogin: '2026-10-24T22:15:00Z',
    mfaEnabled: true,
  },
  {
    id: 'usr-03',
    name: 'Marcus Vance',
    email: 'marcus.vance@trustvault.internal',
    role: 'VIEWER',
    department: 'External Compliance Auditor',
    status: 'ACTIVE',
    avatarUrl: '',
    ownedDocumentsCount: 0,
    accessibleDocumentsCount: 3,
    lastLogin: '2026-10-24T19:40:00Z',
    mfaEnabled: true,
  },
  {
    id: 'usr-04',
    name: 'Elena Rostova',
    email: 'elena.rostova@trustvault.internal',
    role: 'VIEWER',
    department: 'Enterprise Risk & Governance',
    status: 'ACTIVE',
    avatarUrl: '',
    ownedDocumentsCount: 0,
    accessibleDocumentsCount: 2,
    lastLogin: '2026-10-24T14:10:00Z',
    mfaEnabled: true,
  },
  {
    id: 'usr-05',
    name: 'James Chen',
    email: 'james.chen@trustvault.internal',
    role: 'OWNER',
    department: 'Corporate Finance & Treasury',
    status: 'ACTIVE',
    avatarUrl: '',
    ownedDocumentsCount: 5,
    accessibleDocumentsCount: 8,
    lastLogin: '2026-10-23T11:05:00Z',
    mfaEnabled: false,
  },
  {
    id: 'usr-06',
    name: 'David Sterling',
    email: 'david.sterling@trustvault.internal',
    role: 'VIEWER',
    department: 'Third-Party Contractor (Offboarded)',
    status: 'SUSPENDED',
    avatarUrl: '',
    ownedDocumentsCount: 0,
    accessibleDocumentsCount: 0,
    lastLogin: '2026-10-20T08:00:00Z',
    mfaEnabled: false,
  },
];

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-01',
    title: 'SOC-2 Type II Annual Security Certification & Attestation Report',
    description: 'Independent auditor attestation report evaluating security, confidentiality, and availability controls over a 12-month observation window.',
    category: 'Security Audit',
    classification: 'Restricted',
    mimeType: 'text/markdown',
    fileExtension: 'md',
    sizeBytes: 4208192,
    owner: {
      id: 'usr-02',
      name: 'Alex Rivera',
      email: 'alex.rivera@trustvault.internal',
    },
    userPermission: 'OWNER',
    activeGrantsCount: 2,
    createdAt: '2026-10-15T09:00:00Z',
    updatedAt: '2026-10-24T18:15:00Z',
    version: '2.4',
    checksum: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    content: `# SOC-2 Type II Independent Service Auditor's Report
**Audited Entity**: TrustVault Systems Infrastructure
**Assessment Period**: November 1, 2025 - October 31, 2026
**Lead Partner**: Ernst & Vance LLP, Technical Assurance Practice

---

## 1. Scope of the System
This report covers the TrustVault Zero-Trust Document Management platform hosted in distributed tier-IV data centers. The trust service principles evaluated include:
- Security (Common Criteria 6.1 through 6.8)
- Confidentiality (CC 7.1 through 7.4)
- Availability (A 1.1 through 1.3)

## 2. Auditor Opinion
In our opinion, in all material respects:
1. The description fairly presents the system that was designed and implemented throughout the period.
2. The controls stated in the description were suitably designed to provide reasonable assurance that the service commitments and system requirements were achieved.
3. The controls tested operated effectively throughout the examination period.

## 3. Cryptographic Key Management Findings
- All master encryption keys are generated inside FIPS 140-3 Level 4 Hardware Security Modules (HSM).
- Ephemeral envelope keys are rotated per document session with authenticated AES-GCM-256.
- Zero key leakage was detected across 45,000 synthetic penetration testing transactions.

## 4. Remediation Milestones
- **M-01**: Mandatory 90-day automated credential revocation for third-party contractors [COMPLETED].
- **M-02**: Hardware-enforced WebAuthn FIDO2 keys for all privileged administrators [ENFORCED].`,
  },
  {
    id: 'doc-02',
    title: 'Q4 2026 Strategic M&A Capital Allocation & Valuation Model',
    description: 'Confidential valuation modeling, discounted cash flow calculations, and syndicate financing terms for Project Chimera.',
    category: 'Financial',
    classification: 'Confidential',
    mimeType: 'text/markdown',
    fileExtension: 'md',
    sizeBytes: 8192400,
    owner: {
      id: 'usr-05',
      name: 'James Chen',
      email: 'james.chen@trustvault.internal',
    },
    userPermission: 'READ',
    activeGrantsCount: 1,
    createdAt: '2026-10-18T14:30:00Z',
    updatedAt: '2026-10-23T16:00:00Z',
    version: '1.1',
    checksum: 'sha256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    content: `# Project Chimera: Valuation & Capital Structure Deck
**Classification**: STRICTLY CONFIDENTIAL // BOARD OF DIRECTORS ONLY
**Author**: James Chen, VP Treasury & Strategic Finance

---

### Target Asset Overview
- Enterprise Value Target: $340M – $365M USD
- Adjusted EBITDA (FY2026): $48.2M (28.4% Operating Margin)
- Cash Consideration: 65% ($230M via syndicated debt facility)
- Equity Consideration: 35% Series C-Preferred Stock

### Key Sensitivity Matrix
| Scenario | Multiple | Post-Synergy EBITDA | Net IRR (5-Yr) |
|---|---|---|---|
| Base Case | 7.5x | $54.0M | 24.8% |
| Aggressive Growth | 8.2x | $61.5M | 31.2% |
| Downside Stress | 6.8x | $44.1M | 16.4% |

### Regulatory Clearance Pathways
1. Hart-Scott-Rodino (HSR) filing prepared for submit by Dec 1, 2026.
2. CFIUS voluntary disclosure recommendation from external counsel.`,
  },
  {
    id: 'doc-03',
    title: 'Cryptographic Key Management Standard & HSM Rotation Protocol',
    description: 'Technical standard governing entropy generation, KMS hierarchy, split-knowledge quorum keys, and emergency revocation procedures.',
    category: 'Engineering',
    classification: 'Restricted',
    mimeType: 'text/markdown',
    fileExtension: 'md',
    sizeBytes: 1540200,
    owner: {
      id: 'usr-02',
      name: 'Alex Rivera',
      email: 'alex.rivera@trustvault.internal',
    },
    userPermission: 'OWNER',
    activeGrantsCount: 2,
    createdAt: '2026-10-02T10:00:00Z',
    updatedAt: '2026-10-21T11:45:00Z',
    version: '3.0',
    checksum: 'sha256:ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    content: `# Cryptographic Key Management Standard (CKMS-04)
**Owner**: Security Architecture Working Group
**Review Cadence**: Semi-Annual

---

## 1. Key Hierarchy
\`\`\`
Root of Trust (HSM L4 Quorum M-of-N: 3/5)
  └── Key Encryption Key (KEK) - AES-256-KW
        └── Data Encryption Key (DEK) - AES-256-GCM
\`\`\`

## 2. Emergency Revocation (Break-Glass Protocol)
In the event of suspected HSM compromise or physical perimeter breach:
1. Two designated Security Officers insert physical YubiHSM quorum tokens.
2. Execute command: \`tv-vault-cli crypto revoke --epoch current --cascade\`.
3. All live decryption leases terminate within 150 milliseconds.
4. Immediate broadcast of revocations to all edge verification nodes.`,
  },
  {
    id: 'doc-04',
    title: 'Global Data Protection & Privacy Incident Response Manual',
    description: 'Standard operating procedure for detecting, investigating, and reporting personal data breaches under GDPR Article 33 and CCPA.',
    category: 'Legal',
    classification: 'Internal',
    mimeType: 'text/markdown',
    fileExtension: 'md',
    sizeBytes: 2190000,
    owner: {
      id: 'usr-02',
      name: 'Alex Rivera',
      email: 'alex.rivera@trustvault.internal',
    },
    userPermission: 'OWNER',
    activeGrantsCount: 3,
    createdAt: '2026-09-12T08:00:00Z',
    updatedAt: '2026-10-19T13:20:00Z',
    version: '1.8',
    checksum: 'sha256:326b218f2f01f228d7d9fd2e1b191abf839616ae9d8f8ef1d2345e691238910a',
    content: `# Global Data Protection Incident Response Manual
**Document ID**: SOP-SEC-2026-09
**Lead Privacy Counsel**: Sarah Connor

---

## Escalation Triage Matrix
- **Tier 1 (Critical)**: Unauthorized exfiltration of salted credentials or sensitive identity records. Response SLA: 60 minutes.
- **Tier 2 (Elevated)**: Unauthorized access attempt blocked by access control rule. Response SLA: 4 hours.
- **Tier 3 (Routine)**: Internal anomalous login from authorized device. Response SLA: 24 hours.

## Notification Deadlines
- GDPR Article 33: Supervisory authority notification within **72 hours** of awareness.
- Data Subject Notifications: Without undue delay where high risk to individual rights exists.`,
  },
  {
    id: 'doc-05',
    title: 'Zero-Trust Perimeter Architecture Blueprint v3.2',
    description: 'Specification for micro-segmentation, mutual TLS 1.3 interconnects, and ephemeral token attestation for document microservices.',
    category: 'Engineering',
    classification: 'Restricted',
    mimeType: 'text/markdown',
    fileExtension: 'md',
    sizeBytes: 3120000,
    owner: {
      id: 'usr-02',
      name: 'Alex Rivera',
      email: 'alex.rivera@trustvault.internal',
    },
    userPermission: 'OWNER',
    activeGrantsCount: 1,
    createdAt: '2026-10-10T16:00:00Z',
    updatedAt: '2026-10-22T09:30:00Z',
    version: '3.2',
    checksum: 'sha256:91c28f32145b0a394a821e25b16f30e9d6c703125e1a90ef5953049182310fab',
    content: `# Zero-Trust Architecture Blueprint
**Status**: APPROVED FOR PRODUCTION DEPLOYMENT
**Principal Architect**: Alex Rivera

---

## Core Tenets
1. **Never Trust, Always Verify**: Every API interaction must validate caller identity, document grant token, and tenant isolation proof.
2. **Least Privilege Enforcement**: Access grants default to ephemeral Read-Only; Edit rights require explicit dual-signoff.
3. **Continuous Attestation**: Tokens are bound to client TLS fingerprints and expire after 60 minutes of inactivity.`,
  },
  {
    id: 'doc-06',
    title: 'Executive Compensation & Board Governance Minutes',
    description: 'Board of Directors deliberations regarding FY2027 equity grants, executive performance tiers, and audit committee certifications.',
    category: 'Executive',
    classification: 'Confidential',
    mimeType: 'text/markdown',
    fileExtension: 'md',
    sizeBytes: 1240000,
    owner: {
      id: 'usr-01',
      name: 'Sarah Connor',
      email: 'sarah.connor@trustvault.internal',
    },
    userPermission: 'OWNER',
    activeGrantsCount: 1,
    createdAt: '2026-10-20T17:00:00Z',
    updatedAt: '2026-10-23T14:10:00Z',
    version: '1.0',
    checksum: 'sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    content: `# TrustVault Systems, Inc. - Board Meeting Minutes
**Date of Meeting**: October 20, 2026
**Presiding Chair**: Dr. Jonathan Hayes
**Secretary**: Sarah Connor

---

### Attendees
- Sarah Connor, Secretary & Head of Compliance
- James Chen, Chief Financial Officer
- External Directors: 4 of 4 present (Quorum established)

### Resolutions Passed Unanimously
1. Ratified 2026 Auditor Report without modifications.
2. Approved Restricted Stock Unit (RSU) vesting cadence for technical staff.
3. Directed implementation of mandatory multi-user authorization for all high-risk vault operations.`,
  },
];

export const INITIAL_GRANTS: AccessGrant[] = [
  {
    id: 'grant-01',
    documentId: 'doc-01',
    userId: 'usr-03',
    user: {
      id: 'usr-03',
      name: 'Marcus Vance',
      email: 'marcus.vance@trustvault.internal',
      department: 'External Compliance Auditor',
      role: 'VIEWER',
    },
    permission: 'EDIT',
    grantedBy: {
      id: 'usr-02',
      name: 'Alex Rivera',
    },
    grantedAt: '2026-10-16T10:00:00Z',
    expiresAt: '2026-11-30T23:59:59Z',
  },
  {
    id: 'grant-02',
    documentId: 'doc-01',
    userId: 'usr-04',
    user: {
      id: 'usr-04',
      name: 'Elena Rostova',
      email: 'elena.rostova@trustvault.internal',
      department: 'Enterprise Risk & Governance',
      role: 'VIEWER',
    },
    permission: 'READ',
    grantedBy: {
      id: 'usr-02',
      name: 'Alex Rivera',
    },
    grantedAt: '2026-10-17T11:15:00Z',
    expiresAt: null,
  },
  {
    id: 'grant-03',
    documentId: 'doc-02',
    userId: 'usr-01',
    user: {
      id: 'usr-01',
      name: 'Sarah Connor',
      email: 'sarah.connor@trustvault.internal',
      department: 'InfoSec Compliance & Governance',
      role: 'ADMINISTRATOR',
    },
    permission: 'READ',
    grantedBy: {
      id: 'usr-05',
      name: 'James Chen',
    },
    grantedAt: '2026-10-19T08:30:00Z',
    expiresAt: null,
  },
  {
    id: 'grant-04',
    documentId: 'doc-03',
    userId: 'usr-03',
    user: {
      id: 'usr-03',
      name: 'Marcus Vance',
      email: 'marcus.vance@trustvault.internal',
      department: 'External Compliance Auditor',
      role: 'VIEWER',
    },
    permission: 'READ',
    grantedBy: {
      id: 'usr-02',
      name: 'Alex Rivera',
    },
    grantedAt: '2026-10-18T14:00:00Z',
    expiresAt: null,
  },
  {
    id: 'grant-05',
    documentId: 'doc-04',
    userId: 'usr-03',
    user: {
      id: 'usr-03',
      name: 'Marcus Vance',
      email: 'marcus.vance@trustvault.internal',
      department: 'External Compliance Auditor',
      role: 'VIEWER',
    },
    permission: 'READ',
    grantedBy: {
      id: 'usr-02',
      name: 'Alex Rivera',
    },
    grantedAt: '2026-10-19T10:00:00Z',
    expiresAt: null,
  },
  {
    id: 'grant-06',
    documentId: 'doc-04',
    userId: 'usr-04',
    user: {
      id: 'usr-04',
      name: 'Elena Rostova',
      email: 'elena.rostova@trustvault.internal',
      department: 'Enterprise Risk & Governance',
      role: 'VIEWER',
    },
    permission: 'READ',
    grantedBy: {
      id: 'usr-02',
      name: 'Alex Rivera',
    },
    grantedAt: '2026-10-19T10:05:00Z',
    expiresAt: null,
  },
];

export const INITIAL_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'evt-001',
    timestamp: '2026-10-25T01:24:10Z',
    actor: {
      id: 'usr-06',
      name: 'David Sterling',
      email: 'david.sterling@trustvault.internal',
      role: 'VIEWER',
    },
    action: 'ACCESS_DENIED',
    result: 'DENIED',
    documentId: 'doc-02',
    documentTitle: 'Q4 2026 Strategic M&A Capital Allocation & Valuation Model',
    ipAddress: '198.51.100.42',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0',
    details: 'Suspended user account attempted direct document payload download.',
    reason: 'Account status is SUSPENDED. Authentication policy violation.',
    isSuspicious: true,
  },
  {
    id: 'evt-002',
    timestamp: '2026-10-25T00:52:18Z',
    actor: {
      id: 'usr-03',
      name: 'Marcus Vance',
      email: 'marcus.vance@trustvault.internal',
      role: 'VIEWER',
    },
    action: 'DOCUMENT_EDIT',
    result: 'ALLOWED',
    documentId: 'doc-01',
    documentTitle: 'SOC-2 Type II Annual Security Certification & Attestation Report',
    ipAddress: '192.168.1.144',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    details: 'Saved updated remediation milestones. Document version bumped to 2.4.',
  },
  {
    id: 'evt-003',
    timestamp: '2026-10-24T23:14:02Z',
    actor: {
      id: 'usr-04',
      name: 'Elena Rostova',
      email: 'elena.rostova@trustvault.internal',
      role: 'VIEWER',
    },
    action: 'DOCUMENT_DOWNLOAD',
    result: 'ALLOWED',
    documentId: 'doc-01',
    documentTitle: 'SOC-2 Type II Annual Security Certification & Attestation Report',
    ipAddress: '10.0.4.88',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/131.0',
    details: 'Exported verified PDF copy under authorized READ grant.',
  },
  {
    id: 'evt-004',
    timestamp: '2026-10-24T22:30:19Z',
    actor: {
      id: 'usr-02',
      name: 'Alex Rivera',
      email: 'alex.rivera@trustvault.internal',
      role: 'OWNER',
    },
    action: 'ACCESS_GRANTED',
    result: 'ALLOWED',
    documentId: 'doc-01',
    documentTitle: 'SOC-2 Type II Annual Security Certification & Attestation Report',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/129.0',
    details: 'Granted EDIT permission to Marcus Vance with expiration 2026-11-30.',
  },
  {
    id: 'evt-005',
    timestamp: '2026-10-24T21:05:44Z',
    actor: {
      id: 'usr-04',
      name: 'Elena Rostova',
      email: 'elena.rostova@trustvault.internal',
      role: 'VIEWER',
    },
    action: 'ACCESS_DENIED',
    result: 'DENIED',
    documentId: 'doc-01',
    documentTitle: 'SOC-2 Type II Annual Security Certification & Attestation Report',
    ipAddress: '10.0.4.88',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/131.0',
    details: 'Attempted to perform HTTP PUT to modify document contents without EDIT grant.',
    reason: 'Insufficient permission. Required: EDIT, Caller Grant: READ.',
    isSuspicious: false,
  },
  {
    id: 'evt-006',
    timestamp: '2026-10-24T18:15:00Z',
    actor: {
      id: 'usr-02',
      name: 'Alex Rivera',
      email: 'alex.rivera@trustvault.internal',
      role: 'OWNER',
    },
    action: 'DOCUMENT_VIEW',
    result: 'ALLOWED',
    documentId: 'doc-03',
    documentTitle: 'Cryptographic Key Management Standard & HSM Rotation Protocol',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/129.0',
    details: 'Viewed document preview. Integrity checksum verified.',
  },
  {
    id: 'evt-007',
    timestamp: '2026-10-24T16:40:12Z',
    actor: {
      id: 'usr-06',
      name: 'David Sterling',
      email: 'david.sterling@trustvault.internal',
      role: 'VIEWER',
    },
    action: 'SUSPICIOUS_ATTEMPT',
    result: 'DENIED',
    documentId: 'doc-06',
    documentTitle: 'Executive Compensation & Board Governance Minutes',
    ipAddress: '203.0.113.88',
    userAgent: 'python-requests/2.31.0 (Automated Script)',
    details: 'Repeated unauthorized REST queries to enumeration endpoint.',
    reason: 'Suspicious bot signature and non-existent permission grant.',
    isSuspicious: true,
  },
  {
    id: 'evt-008',
    timestamp: '2026-10-24T14:12:00Z',
    actor: {
      id: 'usr-01',
      name: 'Sarah Connor',
      email: 'sarah.connor@trustvault.internal',
      role: 'ADMINISTRATOR',
    },
    action: 'USER_STATUS_CHANGE',
    result: 'ALLOWED',
    ipAddress: '172.16.0.5',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    details: 'Suspended account David Sterling following contractual offboarding notice.',
  },
  {
    id: 'evt-009',
    timestamp: '2026-10-23T11:00:00Z',
    actor: {
      id: 'usr-05',
      name: 'James Chen',
      email: 'james.chen@trustvault.internal',
      role: 'OWNER',
    },
    action: 'DOCUMENT_UPLOAD',
    result: 'ALLOWED',
    documentId: 'doc-02',
    documentTitle: 'Q4 2026 Strategic M&A Capital Allocation & Valuation Model',
    ipAddress: '192.168.1.205',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/128.0',
    details: 'Uploaded initial document file (8.2 MB). Encrypted with envelope master key.',
  },
  {
    id: 'evt-010',
    timestamp: '2026-10-22T09:10:00Z',
    actor: {
      id: 'usr-02',
      name: 'Alex Rivera',
      email: 'alex.rivera@trustvault.internal',
      role: 'OWNER',
    },
    action: 'ACCESS_REVOKED',
    result: 'ALLOWED',
    documentId: 'doc-05',
    documentTitle: 'Zero-Trust Perimeter Architecture Blueprint v3.2',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/129.0',
    details: 'Revoked READ permission for David Sterling following project milestone completion.',
  },
];

export const INITIAL_PLATFORM_STATS: PlatformStats = {
  totalDocuments: 6,
  activeUsers: 5,
  totalAuditEvents: 10,
  deniedAttemptsCount: 3,
  suspiciousActivityCount: 2,
  totalStorageBytes: 20450792,
};
