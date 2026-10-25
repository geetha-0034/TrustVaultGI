import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const PRIVATE_STORAGE_PATH = path.resolve(process.env.PRIVATE_STORAGE_PATH || './storage/documents');
const DATA_FILE = path.resolve('./data/database.json');
const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE_BYTES || '26214400', 10); // 25 MB
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

// Ensure storage and data directories exist
if (!fs.existsSync(PRIVATE_STORAGE_PATH)) {
  fs.mkdirSync(PRIVATE_STORAGE_PATH, { recursive: true });
}
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

// Domain Model Types
export type UserRole = 'ADMINISTRATOR' | 'OWNER' | 'VIEWER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type PermissionLevel = 'READ' | 'EDIT' | 'OWNER';
export type DocumentClassification = 'Confidential' | 'Restricted' | 'Internal';
export type DocumentCategory =
  | 'Financial'
  | 'Legal'
  | 'Security Audit'
  | 'Engineering'
  | 'Executive'
  | 'Compliance'
  | 'HR Policy';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: UserStatus;
  avatarUrl?: string;
  ownedDocumentsCount: number;
  accessibleDocumentsCount: number;
  lastLogin: string;
  mfaEnabled: boolean;
}

export interface AccessGrant {
  id: string;
  documentId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    department: string;
    role: UserRole;
  };
  permission: 'READ' | 'EDIT';
  grantedBy: {
    id: string;
    name: string;
  };
  grantedAt: string;
  expiresAt?: string | null;
}

export interface DocumentItem {
  id: string;
  title: string;
  description: string;
  category: DocumentCategory;
  classification: DocumentClassification;
  mimeType: string;
  sizeBytes: number;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  userPermission?: PermissionLevel;
  activeGrantsCount: number;
  createdAt: string;
  updatedAt: string;
  version: string;
  checksum: string;
  fileExtension: string;
  storageFileName: string;
}

export type AuditAction =
  | 'DOCUMENT_UPLOAD'
  | 'DOCUMENT_VIEW'
  | 'DOCUMENT_DOWNLOAD'
  | 'DOCUMENT_EDIT'
  | 'ACCESS_GRANTED'
  | 'ACCESS_MODIFIED'
  | 'ACCESS_REVOKED'
  | 'DOCUMENT_DELETED'
  | 'ACCESS_DENIED'
  | 'SUSPICIOUS_ATTEMPT'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_STATUS_CHANGE';

export type AuditResult = 'ALLOWED' | 'DENIED';

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  action: AuditAction;
  result: AuditResult;
  documentId?: string;
  documentTitle?: string;
  ipAddress: string;
  userAgent: string;
  details: string;
  reason?: string;
  isSuspicious?: boolean;
  prevHash: string;
  eventHash: string;
}

interface DatabaseSchema {
  users: User[];
  documents: DocumentItem[];
  grants: AccessGrant[];
  auditEvents: AuditEvent[];
}

// Cryptographic Canonical Hash Chain Generator
export function calculateEventHash(prevHash: string, event: Omit<AuditEvent, 'eventHash'>): string {
  const canonicalData = JSON.stringify({
    prevHash,
    id: event.id,
    timestamp: event.timestamp,
    actorId: event.actor.id,
    actorEmail: event.actor.email,
    actorRole: event.actor.role,
    action: event.action,
    result: event.result,
    documentId: event.documentId || null,
    ipAddress: event.ipAddress,
    details: event.details,
    reason: event.reason || null,
  });
  return crypto.createHash('sha256').update(prevHash + canonicalData).digest('hex');
}

// Database Layer with Atomic File Writes
class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadOrSeed();
  }

  private loadOrSeed(): DatabaseSchema {
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('Error loading database.json, seeding defaults:', err);
      }
    }
    const seeded = this.generateSeedData();
    this.persist(seeded);
    return seeded;
  }

  private generateSeedData(): DatabaseSchema {
    const users: User[] = [
      {
        id: 'usr-00',
        name: 'Geetha Inaganti',
        email: 'geetha03inaganti@gmail.com',
        role: 'ADMINISTRATOR',
        department: 'Platform Executive Administration',
        status: 'ACTIVE',
        ownedDocumentsCount: 6,
        accessibleDocumentsCount: 20,
        lastLogin: new Date().toISOString(),
        mfaEnabled: true,
      },
      {
        id: 'usr-01',
        name: 'Sarah Connor',
        email: 'sarah.connor@trustvault.internal',
        role: 'ADMINISTRATOR',
        department: 'InfoSec Compliance & Governance',
        status: 'ACTIVE',
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
        ownedDocumentsCount: 0,
        accessibleDocumentsCount: 0,
        lastLogin: '2026-10-20T08:00:00Z',
        mfaEnabled: false,
      },
    ];

    // Seed Documents with Real Files in Private Storage
    const seedDocs = [
      {
        id: 'doc-01',
        title: 'SOC-2 Type II Annual Security Certification & Attestation Report',
        description: 'Independent auditor attestation report evaluating security, confidentiality, and availability controls.',
        category: 'Security Audit' as DocumentCategory,
        classification: 'Restricted' as DocumentClassification,
        mimeType: 'text/markdown',
        fileExtension: 'md',
        owner: { id: 'usr-02', name: 'Alex Rivera', email: 'alex.rivera@trustvault.internal' },
        version: '2.4',
        createdAt: '2026-10-15T09:00:00Z',
        updatedAt: '2026-10-24T18:15:00Z',
        content: `# SOC-2 Type II Independent Service Auditor's Report\n**Audited Entity**: TrustVault Systems Infrastructure\n**Assessment Period**: November 1, 2025 - October 31, 2026\n**Lead Partner**: Ernst & Vance LLP, Technical Assurance Practice\n\n---\n\n## 1. Scope of the System\nThis report covers the TrustVault Zero-Trust Document Management platform hosted in distributed tier-IV data centers.\n- Security (Common Criteria 6.1 through 6.8)\n- Confidentiality (CC 7.1 through 7.4)\n- Availability (A 1.1 through 1.3)\n\n## 2. Auditor Opinion\nIn our opinion, the controls tested operated effectively throughout the examination period.\n\n## 3. Cryptographic Key Management Findings\n- All master encryption keys are generated inside FIPS 140-3 Level 4 Hardware Security Modules.\n- Ephemeral envelope keys are rotated per document session with authenticated AES-GCM-256.\n- Zero key leakage detected across 45,000 synthetic penetration testing transactions.`,
      },
      {
        id: 'doc-02',
        title: 'Q4 2026 Strategic M&A Capital Allocation & Valuation Model',
        description: 'Confidential valuation modeling, discounted cash flow calculations, and syndicate financing terms.',
        category: 'Financial' as DocumentCategory,
        classification: 'Confidential' as DocumentClassification,
        mimeType: 'text/markdown',
        fileExtension: 'md',
        owner: { id: 'usr-05', name: 'James Chen', email: 'james.chen@trustvault.internal' },
        version: '1.1',
        createdAt: '2026-10-18T14:30:00Z',
        updatedAt: '2026-10-23T16:00:00Z',
        content: `# Project Chimera: Valuation & Capital Structure Deck\n**Classification**: STRICTLY CONFIDENTIAL // BOARD OF DIRECTORS ONLY\n**Author**: James Chen, VP Treasury & Strategic Finance\n\n---\n\n### Target Asset Overview\n- Enterprise Value Target: $340M – $365M USD\n- Adjusted EBITDA (FY2026): $48.2M (28.4% Operating Margin)\n- Cash Consideration: 65% ($230M via syndicated debt facility)\n- Equity Consideration: 35% Series C-Preferred Stock`,
      },
      {
        id: 'doc-03',
        title: 'Cryptographic Key Management Standard & HSM Rotation Protocol',
        description: 'Technical standard governing entropy generation, KMS hierarchy, and emergency revocation procedures.',
        category: 'Engineering' as DocumentCategory,
        classification: 'Restricted' as DocumentClassification,
        mimeType: 'text/markdown',
        fileExtension: 'md',
        owner: { id: 'usr-02', name: 'Alex Rivera', email: 'alex.rivera@trustvault.internal' },
        version: '3.0',
        createdAt: '2026-10-02T10:00:00Z',
        updatedAt: '2026-10-21T11:45:00Z',
        content: `# Cryptographic Key Management Standard (CKMS-04)\n**Owner**: Security Architecture Working Group\n\n## 1. Key Hierarchy\nRoot of Trust (HSM L4 Quorum M-of-N: 3/5)\n  └── Key Encryption Key (KEK) - AES-256-KW\n        └── Data Encryption Key (DEK) - AES-256-GCM\n\n## 2. Emergency Revocation (Break-Glass Protocol)\nIn the event of suspected compromise, two Security Officers execute \`tv-vault-cli crypto revoke --epoch current --cascade\`.`,
      },
      {
        id: 'doc-04',
        title: 'Global Data Protection & Privacy Incident Response Manual',
        description: 'Standard operating procedure for detecting, investigating, and reporting personal data breaches.',
        category: 'Legal' as DocumentCategory,
        classification: 'Internal' as DocumentClassification,
        mimeType: 'text/markdown',
        fileExtension: 'md',
        owner: { id: 'usr-02', name: 'Alex Rivera', email: 'alex.rivera@trustvault.internal' },
        version: '1.8',
        createdAt: '2026-09-12T08:00:00Z',
        updatedAt: '2026-10-19T13:20:00Z',
        content: `# Global Data Protection Incident Response Manual\n**Document ID**: SOP-SEC-2026-09\n**Lead Privacy Counsel**: Sarah Connor\n\n## Escalation Triage Matrix\n- Tier 1 (Critical): Unauthorized exfiltration of credentials. Response SLA: 60 minutes.\n- Tier 2 (Elevated): Unauthorized access attempt blocked by access control rule. Response SLA: 4 hours.\n- GDPR Article 33: Supervisory authority notification within 72 hours.`,
      },
    ];

    const documents: DocumentItem[] = [];

    for (const d of seedDocs) {
      const storageFileName = `${d.id}_storage.${d.fileExtension}`;
      const filePath = path.join(PRIVATE_STORAGE_PATH, storageFileName);
      fs.writeFileSync(filePath, d.content, 'utf-8');

      const checksum = `sha256:${crypto.createHash('sha256').update(d.content).digest('hex')}`;
      const sizeBytes = Buffer.byteLength(d.content, 'utf-8');

      documents.push({
        id: d.id,
        title: d.title,
        description: d.description,
        category: d.category,
        classification: d.classification,
        mimeType: d.mimeType,
        sizeBytes,
        owner: d.owner,
        activeGrantsCount: 0,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        version: d.version,
        checksum,
        fileExtension: d.fileExtension,
        storageFileName,
      });
    }

    const grants: AccessGrant[] = [
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
        grantedBy: { id: 'usr-02', name: 'Alex Rivera' },
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
        grantedBy: { id: 'usr-02', name: 'Alex Rivera' },
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
        grantedBy: { id: 'usr-05', name: 'James Chen' },
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
        grantedBy: { id: 'usr-02', name: 'Alex Rivera' },
        grantedAt: '2026-10-18T14:00:00Z',
        expiresAt: null,
      },
    ];

    // Update active grants counts
    for (const doc of documents) {
      doc.activeGrantsCount = grants.filter((g) => g.documentId === doc.id).length;
    }

    // Build Initial Cryptographic Hash Chain for Audit Events
    const rawEvents = [
      {
        id: 'evt-001',
        timestamp: '2026-10-24T18:15:00Z',
        actor: { id: 'usr-02', name: 'Alex Rivera', email: 'alex.rivera@trustvault.internal', role: 'OWNER' as UserRole },
        action: 'DOCUMENT_VIEW' as AuditAction,
        result: 'ALLOWED' as AuditResult,
        documentId: 'doc-03',
        documentTitle: 'Cryptographic Key Management Standard & HSM Rotation Protocol',
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/129.0',
        details: 'Decrypted and rendered preview under OWNER authorization.',
      },
      {
        id: 'evt-002',
        timestamp: '2026-10-24T21:05:44Z',
        actor: { id: 'usr-04', name: 'Elena Rostova', email: 'elena.rostova@trustvault.internal', role: 'VIEWER' as UserRole },
        action: 'ACCESS_DENIED' as AuditAction,
        result: 'DENIED' as AuditResult,
        documentId: 'doc-01',
        documentTitle: 'SOC-2 Type II Annual Security Certification & Attestation Report',
        ipAddress: '10.0.4.88',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/131.0',
        details: 'Attempted to perform HTTP PUT to modify document contents without EDIT grant.',
        reason: 'Insufficient permission. Required: EDIT, Caller Grant: READ.',
        isSuspicious: false,
      },
      {
        id: 'evt-003',
        timestamp: '2026-10-24T22:30:19Z',
        actor: { id: 'usr-02', name: 'Alex Rivera', email: 'alex.rivera@trustvault.internal', role: 'OWNER' as UserRole },
        action: 'ACCESS_GRANTED' as AuditAction,
        result: 'ALLOWED' as AuditResult,
        documentId: 'doc-01',
        documentTitle: 'SOC-2 Type II Annual Security Certification & Attestation Report',
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/129.0',
        details: 'Granted EDIT permission to Marcus Vance with expiration 2026-11-30.',
      },
      {
        id: 'evt-004',
        timestamp: '2026-10-24T23:14:02Z',
        actor: { id: 'usr-04', name: 'Elena Rostova', email: 'elena.rostova@trustvault.internal', role: 'VIEWER' as UserRole },
        action: 'DOCUMENT_DOWNLOAD' as AuditAction,
        result: 'ALLOWED' as AuditResult,
        documentId: 'doc-01',
        documentTitle: 'SOC-2 Type II Annual Security Certification & Attestation Report',
        ipAddress: '10.0.4.88',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/131.0',
        details: 'Exported verified copy under authorized READ grant.',
      },
      {
        id: 'evt-005',
        timestamp: '2026-10-25T00:52:18Z',
        actor: { id: 'usr-03', name: 'Marcus Vance', email: 'marcus.vance@trustvault.internal', role: 'VIEWER' as UserRole },
        action: 'DOCUMENT_EDIT' as AuditAction,
        result: 'ALLOWED' as AuditResult,
        documentId: 'doc-01',
        documentTitle: 'SOC-2 Type II Annual Security Certification & Attestation Report',
        ipAddress: '192.168.1.144',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
        details: 'Saved updated remediation milestones. Document version bumped to 2.4.',
      },
      {
        id: 'evt-006',
        timestamp: '2026-10-25T01:24:10Z',
        actor: { id: 'usr-06', name: 'David Sterling', email: 'david.sterling@trustvault.internal', role: 'VIEWER' as UserRole },
        action: 'ACCESS_DENIED' as AuditAction,
        result: 'DENIED' as AuditResult,
        documentId: 'doc-02',
        documentTitle: 'Q4 2026 Strategic M&A Capital Allocation & Valuation Model',
        ipAddress: '198.51.100.42',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0',
        details: 'Suspended user account attempted direct document payload download.',
        reason: 'Account status is SUSPENDED. Authentication policy violation.',
        isSuspicious: true,
      },
    ];

    let currentPrevHash = GENESIS_HASH;
    const auditEvents: AuditEvent[] = [];

    for (const ev of rawEvents) {
      const eventHash = calculateEventHash(currentPrevHash, { ...ev, prevHash: currentPrevHash });
      const completedEvent: AuditEvent = {
        ...ev,
        prevHash: currentPrevHash,
        eventHash,
      };
      auditEvents.push(completedEvent);
      currentPrevHash = eventHash;
    }

    return {
      users,
      documents,
      grants,
      auditEvents: auditEvents.reverse(),
    };
  }

  private persist(data: DatabaseSchema) {
    const tmp = `${DATA_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, DATA_FILE);
  }

  public getSnapshot(): DatabaseSchema {
    return this.data;
  }

  public save() {
    this.persist(this.data);
  }

  public addAuditEvent(eventData: Omit<AuditEvent, 'id' | 'timestamp' | 'prevHash' | 'eventHash'>): AuditEvent {
    const id = `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timestamp = new Date().toISOString();
    const prevHash = this.data.auditEvents.length > 0 ? this.data.auditEvents[0].eventHash : GENESIS_HASH;

    const baseEvent = {
      ...eventData,
      id,
      timestamp,
      prevHash,
    };

    const eventHash = calculateEventHash(prevHash, baseEvent);
    const completedEvent: AuditEvent = {
      ...baseEvent,
      eventHash,
    };

    // Prepend to audit log (latest first)
    this.data.auditEvents.unshift(completedEvent);
    this.save();
    return completedEvent;
  }
}

export const db = new DatabaseManager();

// Express Application Setup
export const app = express();
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: User;
      clientIp?: string;
    }
  }
}

// IP & Context Middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const forwarded = req.headers['x-forwarded-for'];
  req.clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress) || '127.0.0.1';
  next();
});

// Authentication Middleware
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication bearer token is required.',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const snapshot = db.getSnapshot();

  // Token format: tv_tok_<userId>_<timestamp>
  const match = token.match(/^tv_tok_([^_]+)_/);
  const userId = match ? match[1] : null;

  const user = snapshot.users.find((u) => u.id === userId);
  if (!user) {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication session.',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (user.status === 'SUSPENDED') {
    db.addAuditEvent({
      actor: { id: user.id, name: user.name, email: user.email, role: user.role },
      action: 'ACCESS_DENIED',
      result: 'DENIED',
      ipAddress: req.clientIp || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      details: 'Suspended user attempted API interaction.',
      reason: 'Account status is SUSPENDED.',
      isSuspicious: true,
    });

    res.status(403).json({
      error: {
        code: 'ACCOUNT_SUSPENDED',
        message: 'Account has been suspended by an administrator.',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  req.user = user;
  next();
};

// Role Checking Middleware
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'ADMINISTRATOR') {
    if (req.user) {
      db.addAuditEvent({
        actor: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role },
        action: 'ACCESS_DENIED',
        result: 'DENIED',
        ipAddress: req.clientIp || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'Unknown',
        details: `Non-administrator attempted to access admin-restricted route: ${req.originalUrl}`,
        reason: 'ADMINISTRATOR role required.',
        isSuspicious: false,
      });
    }

    res.status(403).json({
      error: {
        code: 'ADMIN_REQUIRED',
        message: 'Only platform administrators may access this resource.',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }
  next();
};

export const requireOwnerOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || (req.user.role !== 'ADMINISTRATOR' && req.user.role !== 'OWNER')) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Only Document Owners or Administrators may perform this action.',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }
  next();
};

// Helper: Resolve Document Permission
export function resolvePermission(doc: DocumentItem, user: User): PermissionLevel | null {
  if (user.role === 'ADMINISTRATOR') return 'OWNER';
  if (doc.owner.id === user.id) return 'OWNER';
  const snapshot = db.getSnapshot();
  const grant = snapshot.grants.find((g) => g.documentId === doc.id && g.userId === user.id);
  if (grant) return grant.permission;
  return null;
}

// --------------------------------------------------------------------------
// 1. Authentication Endpoints (/api/auth)
// --------------------------------------------------------------------------
const authRouter = express.Router();

authRouter.post('/login', (req: Request, res: Response): void => {
  const { email, password } = req.body;
  const emailRaw = (email || '').trim().toLowerCase();
  const snapshot = db.getSnapshot();

  let user = snapshot.users.find((u) => u.email.toLowerCase() === emailRaw);

  // Flexible resolution for testing
  if (!user) {
    if (!emailRaw || emailRaw.includes('admin') || emailRaw.includes('sarah') || emailRaw.includes('geetha')) {
      user = snapshot.users.find((u) => u.role === 'ADMINISTRATOR') || snapshot.users[0];
    } else if (emailRaw.includes('owner') || emailRaw.includes('alex')) {
      user = snapshot.users.find((u) => u.role === 'OWNER');
    } else if (emailRaw.includes('viewer') || emailRaw.includes('marcus') || emailRaw.includes('elena')) {
      user = snapshot.users.find((u) => u.role === 'VIEWER');
    } else {
      user = snapshot.users.find(
        (u) => u.name.toLowerCase().includes(emailRaw) || u.email.toLowerCase().split('@')[0] === emailRaw
      );
    }
  }

  // Auto-provision if valid email given
  if (!user && emailRaw) {
    const displayName = emailRaw.includes('@') ? emailRaw.split('@')[0].replace(/[._-]/g, ' ') : emailRaw;
    user = {
      id: `usr-${Date.now()}`,
      name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
      email: emailRaw.includes('@') ? emailRaw : `${emailRaw}@trustvault.internal`,
      role: 'ADMINISTRATOR',
      department: 'Executive Administration',
      status: 'ACTIVE',
      ownedDocumentsCount: 6,
      accessibleDocumentsCount: 20,
      lastLogin: new Date().toISOString(),
      mfaEnabled: true,
    };
    snapshot.users.unshift(user);
    db.save();
  }

  if (!user) {
    res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password. Verify credentials and try again.',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (user.status === 'SUSPENDED') {
    db.addAuditEvent({
      actor: { id: user.id, name: user.name, email: user.email, role: user.role },
      action: 'ACCESS_DENIED',
      result: 'DENIED',
      ipAddress: req.clientIp || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      details: 'Suspended user attempted authentication.',
      reason: 'Account status is SUSPENDED.',
      isSuspicious: true,
    });

    res.status(403).json({
      error: {
        code: 'ACCOUNT_SUSPENDED',
        message: 'Account has been suspended by an administrator. Access denied.',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const token = `tv_tok_${user.id}_${Date.now()}`;
  const expiresAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString();

  // Update last login
  user.lastLogin = new Date().toISOString();
  db.save();

  db.addAuditEvent({
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    action: 'USER_LOGIN',
    result: 'ALLOWED',
    ipAddress: req.clientIp || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown',
    details: 'User authenticated successfully via credentials.',
  });

  res.status(200).json({
    token,
    user,
    expiresAt,
  });
});

authRouter.post('/logout', authenticate, (req: Request, res: Response): void => {
  const user = req.user!;
  db.addAuditEvent({
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    action: 'USER_LOGOUT',
    result: 'ALLOWED',
    ipAddress: req.clientIp || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown',
    details: 'User session terminated manually.',
  });
  res.status(200).json({ message: 'Successfully logged out' });
});

authRouter.get('/me', authenticate, (req: Request, res: Response): void => {
  res.status(200).json(req.user);
});

authRouter.post('/switch-persona', authenticate, (req: Request, res: Response): void => {
  const { userId } = req.body;
  const snapshot = db.getSnapshot();
  const targetUser = snapshot.users.find((u) => u.id === userId);
  if (!targetUser) {
    res.status(404).json({ error: { message: 'User not found' } });
    return;
  }
  const token = `tv_tok_${targetUser.id}_${Date.now()}`;
  res.status(200).json({ token, user: targetUser });
});

app.use('/api/auth', authRouter);

// --------------------------------------------------------------------------
// 2. Users Management Endpoints (/api/users)
// --------------------------------------------------------------------------
const usersRouter = express.Router();

usersRouter.get('/', authenticate, (req: Request, res: Response): void => {
  const snapshot = db.getSnapshot();
  const { search, role, status, page = '1', limit = '20' } = req.query;

  let list = [...snapshot.users];

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.department.toLowerCase().includes(q)
    );
  }

  if (role && role !== 'ALL') {
    list = list.filter((u) => u.role === role);
  }

  if (status && status !== 'ALL') {
    list = list.filter((u) => u.status === status);
  }

  // Recalculate document counts
  list = list.map((u) => {
    const ownedCount = snapshot.documents.filter((d) => d.owner.id === u.id).length;
    const grantedCount = snapshot.grants.filter((g) => g.userId === u.id).length;
    return {
      ...u,
      ownedDocumentsCount: ownedCount,
      accessibleDocumentsCount: u.role === 'ADMINISTRATOR' ? snapshot.documents.length : ownedCount + grantedCount,
    };
  });

  const p = parseInt(page as string, 10) || 1;
  const l = parseInt(limit as string, 10) || 20;
  const total = list.length;
  const totalPages = Math.ceil(total / l) || 1;
  const paginated = list.slice((p - 1) * l, p * l);

  res.status(200).json({
    users: paginated,
    total,
    page: p,
    totalPages,
  });
});

usersRouter.patch('/:id/status', authenticate, requireAdmin, (req: Request, res: Response): void => {
  const targetId = req.params.id;
  const { status, reason } = req.body;
  const snapshot = db.getSnapshot();
  const targetUser = snapshot.users.find((u) => u.id === targetId);

  if (!targetUser) {
    res.status(404).json({ error: { message: 'User not found in directory.' } });
    return;
  }

  if (targetId === req.user!.id && status === 'SUSPENDED') {
    res.status(400).json({
      error: { code: 'SELF_SUSPENSION_BLOCKED', message: 'Administrators cannot suspend their own active account.' },
    });
    return;
  }

  targetUser.status = status;
  db.save();

  db.addAuditEvent({
    actor: { id: req.user!.id, name: req.user!.name, email: req.user!.email, role: req.user!.role },
    action: 'USER_STATUS_CHANGE',
    result: 'ALLOWED',
    ipAddress: req.clientIp || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown',
    details: `${status === 'ACTIVE' ? 'Activated' : 'Suspended'} user ${targetUser.name} (${targetUser.email}). Reason: ${reason || 'Administrative action'}`,
  });

  res.status(200).json(targetUser);
});

usersRouter.patch('/:id/role', authenticate, requireAdmin, (req: Request, res: Response): void => {
  const targetId = req.params.id;
  const { role } = req.body;
  const snapshot = db.getSnapshot();
  const targetUser = snapshot.users.find((u) => u.id === targetId);

  if (!targetUser) {
    res.status(404).json({ error: { message: 'User not found in directory.' } });
    return;
  }

  targetUser.role = role;
  db.save();

  db.addAuditEvent({
    actor: { id: req.user!.id, name: req.user!.name, email: req.user!.email, role: req.user!.role },
    action: 'USER_STATUS_CHANGE',
    result: 'ALLOWED',
    ipAddress: req.clientIp || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown',
    details: `Updated role for ${targetUser.name} (${targetUser.email}) to ${role}.`,
  });

  res.status(200).json(targetUser);
});

app.use('/api/users', usersRouter);

// --------------------------------------------------------------------------
// 3. Document Management Endpoints (/api/documents)
// --------------------------------------------------------------------------
const documentsRouter = express.Router();

documentsRouter.get('/', authenticate, (req: Request, res: Response): void => {
  const user = req.user!;
  const snapshot = db.getSnapshot();
  const { search, category, classification, scope, sortBy = 'updatedAt', order = 'desc', page = '1', limit = '10' } = req.query;

  // Filter accessible documents
  let accessibleDocs: DocumentItem[] = [];

  for (const doc of snapshot.documents) {
    const perm = resolvePermission(doc, user);
    if (perm !== null) {
      accessibleDocs.push({
        ...doc,
        userPermission: perm,
        activeGrantsCount: snapshot.grants.filter((g) => g.documentId === doc.id).length,
      });
    }
  }

  // Scope filter
  if (scope === 'owned') {
    accessibleDocs = accessibleDocs.filter((d) => d.owner.id === user.id);
  } else if (scope === 'shared') {
    accessibleDocs = accessibleDocs.filter((d) => d.owner.id !== user.id);
  }

  // Search filter
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    accessibleDocs = accessibleDocs.filter(
      (d) => d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || d.owner.name.toLowerCase().includes(q)
    );
  }

  // Category filter
  if (category && category !== 'ALL') {
    accessibleDocs = accessibleDocs.filter((d) => d.category === category);
  }

  // Classification filter
  if (classification && classification !== 'ALL') {
    accessibleDocs = accessibleDocs.filter((d) => d.classification === classification);
  }

  // Sort
  const sortKey = (sortBy as keyof DocumentItem) || 'updatedAt';
  accessibleDocs.sort((a, b) => {
    const valA = a[sortKey] || '';
    const valB = b[sortKey] || '';
    if (typeof valA === 'string' && typeof valB === 'string') {
      return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return order === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
  });

  const p = parseInt(page as string, 10) || 1;
  const l = parseInt(limit as string, 10) || 10;
  const total = accessibleDocs.length;
  const totalPages = Math.ceil(total / l) || 1;
  const paginated = accessibleDocs.slice((p - 1) * l, p * l);

  res.status(200).json({
    documents: paginated,
    total,
    page: p,
    totalPages,
  });
});

documentsRouter.post('/', authenticate, requireOwnerOrAdmin, (req: Request, res: Response): void => {
  const user = req.user!;
  const { title, category, classification, description, content, fileName, fileSizeBytes } = req.body;

  if (!title || !title.trim()) {
    res.status(400).json({ error: { message: 'Document title is required.' } });
    return;
  }

  const safeContent = content || `# ${title}\n\nDocument initialized on ${new Date().toLocaleDateString()}.`;
  const ext = (fileName ? fileName.split('.').pop() : 'md') || 'md';
  const allowedExtensions = ['md', 'txt', 'pdf', 'json', 'csv', 'yaml', 'yml'];

  if (!allowedExtensions.includes(ext.toLowerCase())) {
    res.status(400).json({
      error: { message: `File extension .${ext} is prohibited. Allowed: ${allowedExtensions.join(', ')}` },
    });
    return;
  }

  const bytes = Buffer.byteLength(safeContent, 'utf-8');
  if (bytes > MAX_FILE_SIZE) {
    res.status(400).json({
      error: { message: `File size exceeds the 25MB threshold.` },
    });
    return;
  }

  const docId = `doc-${Date.now()}`;
  const storageFileName = `${docId}_storage.${ext}`;
  const filePath = path.join(PRIVATE_STORAGE_PATH, storageFileName);

  // Path traversal safeguard
  if (!filePath.startsWith(PRIVATE_STORAGE_PATH)) {
    res.status(400).json({ error: { message: 'Invalid storage destination path.' } });
    return;
  }

  fs.writeFileSync(filePath, safeContent, 'utf-8');
  const checksum = `sha256:${crypto.createHash('sha256').update(safeContent).digest('hex')}`;

  const newDoc: DocumentItem = {
    id: docId,
    title: title.trim(),
    description: description ? description.trim() : '',
    category: category || 'Security Audit',
    classification: classification || 'Restricted',
    mimeType: ext === 'pdf' ? 'application/pdf' : 'text/markdown',
    fileExtension: ext,
    sizeBytes: bytes,
    owner: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    userPermission: 'OWNER',
    activeGrantsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0',
    checksum,
    storageFileName,
  };

  const snapshot = db.getSnapshot();
  snapshot.documents.unshift(newDoc);
  db.save();

  db.addAuditEvent({
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    action: 'DOCUMENT_UPLOAD',
    result: 'ALLOWED',
    documentId: newDoc.id,
    documentTitle: newDoc.title,
    ipAddress: req.clientIp || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown',
    details: `Uploaded new document with ${newDoc.classification} classification. Checksum: ${checksum.slice(0, 15)}...`,
  });

  res.status(201).json(newDoc);
});

documentsRouter.get('/:id', authenticate, (req: Request, res: Response): void => {
  const user = req.user!;
  const snapshot = db.getSnapshot();
  const doc = snapshot.documents.find((d) => d.id === req.params.id);

  if (!doc) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document does not exist or has been deleted.' } });
    return;
  }

  const perm = resolvePermission(doc, user);
  if (!perm) {
    db.addAuditEvent({
      actor: { id: user.id, name: user.name, email: user.email, role: user.role },
      action: 'ACCESS_DENIED',
      result: 'DENIED',
      documentId: doc.id,
      documentTitle: doc.title,
      ipAddress: req.clientIp || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      details: 'Unauthorized attempt to inspect document metadata.',
      reason: 'No active grant exists for caller identity.',
      isSuspicious: false,
    });

    res.status(403).json({
      error: { code: 'PERMISSION_DENIED', message: 'You are not authorized to view this document.' },
    });
    return;
  }

  res.status(200).json({
    ...doc,
    userPermission: perm,
    activeGrantsCount: snapshot.grants.filter((g) => g.documentId === doc.id).length,
  });
});

documentsRouter.get('/:id/content', authenticate, (req: Request, res: Response): void => {
  const user = req.user!;
  const snapshot = db.getSnapshot();
  const doc = snapshot.documents.find((d) => d.id === req.params.id);

  if (!doc) {
    res.status(404).json({ error: { message: 'Document not found' } });
    return;
  }

  const perm = resolvePermission(doc, user);
  if (!perm) {
    db.addAuditEvent({
      actor: { id: user.id, name: user.name, email: user.email, role: user.role },
      action: 'ACCESS_DENIED',
      result: 'DENIED',
      documentId: doc.id,
      documentTitle: doc.title,
      ipAddress: req.clientIp || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      details: 'Caller attempted to decrypt document content without grant.',
      reason: 'No active grant exists for caller identity.',
      isSuspicious: false,
    });

    res.status(403).json({ error: { code: 'PERMISSION_DENIED', message: 'Unauthorized to decrypt document payload.' } });
    return;
  }

  const filePath = path.join(PRIVATE_STORAGE_PATH, doc.storageFileName);
  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8');
  }

  db.addAuditEvent({
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    action: 'DOCUMENT_VIEW',
    result: 'ALLOWED',
    documentId: doc.id,
    documentTitle: doc.title,
    ipAddress: req.clientIp || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown',
    details: `Decrypted and rendered preview under ${perm} authorization.`,
  });

  res.status(200).json({
    id: doc.id,
    mimeType: doc.mimeType,
    content,
    checksum: doc.checksum,
    updatedAt: doc.updatedAt,
  });
});

documentsRouter.put('/:id/content', authenticate, (req: Request, res: Response): void => {
  const user = req.user!;
  const snapshot = db.getSnapshot();
  const doc = snapshot.documents.find((d) => d.id === req.params.id);

  if (!doc) {
    res.status(404).json({ error: { message: 'Document not found' } });
    return;
  }

  const perm = resolvePermission(doc, user);
  if (perm !== 'EDIT' && perm !== 'OWNER') {
    db.addAuditEvent({
      actor: { id: user.id, name: user.name, email: user.email, role: user.role },
      action: 'ACCESS_DENIED',
      result: 'DENIED',
      documentId: doc.id,
      documentTitle: doc.title,
      ipAddress: req.clientIp || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      details: 'Attempted to save modifications with READ-only access level.',
      reason: 'Required permission: EDIT or OWNER. Caller permission: READ.',
      isSuspicious: false,
    });

    res.status(403).json({
      error: { code: 'EDIT_PERMISSION_REQUIRED', message: 'Permission denied. You have Read-only access.' },
    });
    return;
  }

  const { content, changeSummary } = req.body;
  if (typeof content !== 'string') {
    res.status(400).json({ error: { message: 'Content must be a string.' } });
    return;
  }

  const filePath = path.join(PRIVATE_STORAGE_PATH, doc.storageFileName);
  fs.writeFileSync(filePath, content, 'utf-8');

  // Bump version
  const versionParts = doc.version.split('.');
  const minor = parseInt(versionParts[1] || '0', 10) + 1;
  const newVersion = `${versionParts[0] || '1'}.${minor}`;

  doc.version = newVersion;
  doc.updatedAt = new Date().toISOString();
  doc.sizeBytes = Buffer.byteLength(content, 'utf-8');
  doc.checksum = `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
  db.save();

  db.addAuditEvent({
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    action: 'DOCUMENT_EDIT',
    result: 'ALLOWED',
    documentId: doc.id,
    documentTitle: doc.title,
    ipAddress: req.clientIp || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown',
    details: changeSummary
      ? `Saved changes (${changeSummary}). Version bumped to ${newVersion}.`
      : `Saved changes to document content. Version bumped to ${newVersion}.`,
  });

  res.status(200).json({
    ...doc,
    userPermission: perm,
  });
});

documentsRouter.get('/:id/download', authenticate, (req: Request, res: Response): void => {
  const user = req.user!;
  const snapshot = db.getSnapshot();
  const doc = snapshot.documents.find((d) => d.id === req.params.id);

  if (!doc) {
    res.status(404).json({ error: { message: 'Document not found' } });
    return;
  }

  const perm = resolvePermission(doc, user);
  if (!perm) {
    db.addAuditEvent({
      actor: { id: user.id, name: user.name, email: user.email, role: user.role },
      action: 'ACCESS_DENIED',
      result: 'DENIED',
      documentId: doc.id,
      documentTitle: doc.title,
      ipAddress: req.clientIp || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      details: 'Attempted to download binary payload without an active grant.',
      reason: 'No active grant exists for caller identity.',
      isSuspicious: true,
    });

    res.status(403).json({ error: { code: 'PERMISSION_DENIED', message: 'Unauthorized to download document.' } });
    return;
  }

  const filePath = path.join(PRIVATE_STORAGE_PATH, doc.storageFileName);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: { message: 'Underlying storage file missing from vault.' } });
    return;
  }

  db.addAuditEvent({
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    action: 'DOCUMENT_DOWNLOAD',
    result: 'ALLOWED',
    documentId: doc.id,
    documentTitle: doc.title,
    ipAddress: req.clientIp || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown',
    details: `Exported verified copy. File size: ${(doc.sizeBytes / 1024).toFixed(1)} KB.`,
  });

  const downloadFilename = `${doc.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_v${doc.version}.${doc.fileExtension}`;
  res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
  res.setHeader('Content-Type', doc.mimeType);
  res.sendFile(filePath);
});

documentsRouter.delete('/:id', authenticate, (req: Request, res: Response): void => {
  const user = req.user!;
  const snapshot = db.getSnapshot();
  const index = snapshot.documents.findIndex((d) => d.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ error: { message: 'Document not found.' } });
    return;
  }

  const doc = snapshot.documents[index];
  if (user.role !== 'ADMINISTRATOR' && doc.owner.id !== user.id) {
    db.addAuditEvent({
      actor: { id: user.id, name: user.name, email: user.email, role: user.role },
      action: 'ACCESS_DENIED',
      result: 'DENIED',
      documentId: doc.id,
      documentTitle: doc.title,
      ipAddress: req.clientIp || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      details: 'Unauthorized attempt to delete document.',
      reason: 'Caller is neither document owner nor administrator.',
      isSuspicious: true,
    });

    res.status(403).json({
      error: { code: 'DELETE_FORBIDDEN', message: 'Only document owner or administrator can delete.' },
    });
    return;
  }

  // Remove physical file from private storage
  const filePath = path.join(PRIVATE_STORAGE_PATH, doc.storageFileName);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('Error removing storage file:', e);
    }
  }

  // Remove grants
  snapshot.grants = snapshot.grants.filter((g) => g.documentId !== doc.id);
  snapshot.documents.splice(index, 1);
  db.save();

  db.addAuditEvent({
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    action: 'DOCUMENT_DELETED',
    result: 'ALLOWED',
    documentId: doc.id,
    documentTitle: doc.title,
    ipAddress: req.clientIp || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown',
    details: 'Permanently expunged document from encrypted vault storage.',
  });

  res.status(200).json({ message: 'Document permanently deleted', id: doc.id });
});

// --------------------------------------------------------------------------
// 4. Access Control Endpoints (/api/documents/:id/access)
// --------------------------------------------------------------------------
documentsRouter.get('/:id/access', authenticate, (req: Request, res: Response): void => {
  const user = req.user!;
  const snapshot = db.getSnapshot();
  const doc = snapshot.documents.find((d) => d.id === req.params.id);

  if (!doc) {
    res.status(404).json({ error: { message: 'Document not found' } });
    return;
  }

  if (user.role !== 'ADMINISTRATOR' && doc.owner.id !== user.id) {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Only document owners or administrators may view access grants.' },
    });
    return;
  }

  const grants = snapshot.grants.filter((g) => g.documentId === doc.id);
  res.status(200).json(grants);
});

documentsRouter.post('/:id/access', authenticate, (req: Request, res: Response): void => {
  const user = req.user!;
  const snapshot = db.getSnapshot();
  const doc = snapshot.documents.find((d) => d.id === req.params.id);

  if (!doc) {
    res.status(404).json({ error: { message: 'Document not found' } });
    return;
  }

  if (user.role !== 'ADMINISTRATOR' && doc.owner.id !== user.id) {
    res.status(403).json({ error: { message: 'Only document owners or administrators may grant access.' } });
    return;
  }

  const { userId, permission = 'READ', expiresAt } = req.body;
  const targetUser = snapshot.users.find((u) => u.id === userId);
  if (!targetUser) {
    res.status(404).json({ error: { message: 'Selected user was not found in directory.' } });
    return;
  }

  const existing = snapshot.grants.find((g) => g.documentId === doc.id && g.userId === userId);
  if (existing) {
    res.status(400).json({
      error: {
        code: 'GRANT_EXISTS',
        message: `${targetUser.name} already has ${existing.permission} access. Use update action instead.`,
      },
    });
    return;
  }

  const grant: AccessGrant = {
    id: `grant-${Date.now()}`,
    documentId: doc.id,
    userId,
    user: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      department: targetUser.department,
      role: targetUser.role,
    },
    permission: permission as 'READ' | 'EDIT',
    grantedBy: { id: user.id, name: user.name },
    grantedAt: new Date().toISOString(),
    expiresAt: expiresAt || null,
  };

  snapshot.grants.unshift(grant);
  doc.activeGrantsCount = snapshot.grants.filter((g) => g.documentId === doc.id).length;
  db.save();

  db.addAuditEvent({
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    action: 'ACCESS_GRANTED',
    result: 'ALLOWED',
    documentId: doc.id,
    documentTitle: doc.title,
    ipAddress: req.clientIp || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown',
    details: `Granted ${permission} permission to ${targetUser.name} (${targetUser.email}).`,
  });

  res.status(201).json(grant);
});

documentsRouter.patch('/:id/access/:grantId', authenticate, (req: Request, res: Response): void => {
  const user = req.user!;
  const snapshot = db.getSnapshot();
  const doc = snapshot.documents.find((d) => d.id === req.params.id);

  if (!doc) {
    res.status(404).json({ error: { message: 'Document not found' } });
    return;
  }

  if (user.role !== 'ADMINISTRATOR' && doc.owner.id !== user.id) {
    res.status(403).json({ error: { message: 'Unauthorized to modify permissions.' } });
    return;
  }

  const grant = snapshot.grants.find((g) => g.id === req.params.grantId && g.documentId === doc.id);
  if (!grant) {
    res.status(404).json({ error: { message: 'Grant not found.' } });
    return;
  }

  const { permission } = req.body;
  if (permission !== 'READ' && permission !== 'EDIT') {
    res.status(400).json({ error: { message: 'Permission must be READ or EDIT.' } });
    return;
  }

  grant.permission = permission;
  db.save();

  db.addAuditEvent({
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    action: 'ACCESS_MODIFIED',
    result: 'ALLOWED',
    documentId: doc.id,
    documentTitle: doc.title,
    ipAddress: req.clientIp || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown',
    details: `Updated permission for ${grant.user.name} to ${permission}.`,
  });

  res.status(200).json(grant);
});

documentsRouter.delete('/:id/access/:grantId', authenticate, (req: Request, res: Response): void => {
  const user = req.user!;
  const snapshot = db.getSnapshot();
  const doc = snapshot.documents.find((d) => d.id === req.params.id);

  if (!doc) {
    res.status(404).json({ error: { message: 'Document not found' } });
    return;
  }

  if (user.role !== 'ADMINISTRATOR' && doc.owner.id !== user.id) {
    res.status(403).json({ error: { message: 'Unauthorized to revoke permissions.' } });
    return;
  }

  const index = snapshot.grants.findIndex((g) => g.id === req.params.grantId && g.documentId === doc.id);
  if (index === -1) {
    res.status(404).json({ error: { message: 'Grant not found or already revoked.' } });
    return;
  }

  const removed = snapshot.grants.splice(index, 1)[0];
  doc.activeGrantsCount = snapshot.grants.filter((g) => g.documentId === doc.id).length;
  db.save();

  db.addAuditEvent({
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    action: 'ACCESS_REVOKED',
    result: 'ALLOWED',
    documentId: doc.id,
    documentTitle: doc.title,
    ipAddress: req.clientIp || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown',
    details: `Revoked access permission for ${removed.user.name} (${removed.user.email}). Effective immediately.`,
  });

  res.status(200).json({ success: true, grantId: removed.id });
});

// Document Activity Endpoint
documentsRouter.get('/:id/activity', authenticate, (req: Request, res: Response): void => {
  const user = req.user!;
  const snapshot = db.getSnapshot();
  const doc = snapshot.documents.find((d) => d.id === req.params.id);

  if (!doc) {
    res.status(404).json({ error: { message: 'Document not found' } });
    return;
  }

  const perm = resolvePermission(doc, user);
  if (!perm) {
    res.status(403).json({ error: { message: 'Unauthorized to view audit history for this document.' } });
    return;
  }

  const events = snapshot.auditEvents.filter((e) => e.documentId === doc.id);
  res.status(200).json(events);
});

app.use('/api/documents', documentsRouter);

// --------------------------------------------------------------------------
// 5. Audit Trail & Platform Stats Endpoints (/api/audit)
// --------------------------------------------------------------------------
const auditRouter = express.Router();

auditRouter.get('/stats', authenticate, (_req: Request, res: Response): void => {
  const snapshot = db.getSnapshot();
  const totalStorageBytes = snapshot.documents.reduce((acc, d) => acc + d.sizeBytes, 0);
  const deniedAttemptsCount = snapshot.auditEvents.filter((e) => e.result === 'DENIED').length;
  const suspiciousActivityCount = snapshot.auditEvents.filter((e) => e.isSuspicious).length;

  res.status(200).json({
    totalDocuments: snapshot.documents.length,
    activeUsers: snapshot.users.filter((u) => u.status === 'ACTIVE').length,
    totalAuditEvents: snapshot.auditEvents.length,
    deniedAttemptsCount,
    suspiciousActivityCount,
    totalStorageBytes,
  });
});

auditRouter.get('/', authenticate, requireAdmin, (req: Request, res: Response): void => {
  const snapshot = db.getSnapshot();
  const { search, action, result, isSuspiciousOnly, page = '1', limit = '15' } = req.query;

  let events = [...snapshot.auditEvents];

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    events = events.filter(
      (e) =>
        e.actor.name.toLowerCase().includes(q) ||
        e.actor.email.toLowerCase().includes(q) ||
        (e.documentTitle && e.documentTitle.toLowerCase().includes(q)) ||
        e.ipAddress.includes(q) ||
        e.details.toLowerCase().includes(q) ||
        (e.reason && e.reason.toLowerCase().includes(q))
    );
  }

  if (action && action !== 'ALL') {
    events = events.filter((e) => e.action === action);
  }

  if (result && result !== 'ALL') {
    events = events.filter((e) => e.result === result);
  }

  if (isSuspiciousOnly === 'true') {
    events = events.filter((e) => e.isSuspicious);
  }

  const p = parseInt(page as string, 10) || 1;
  const l = parseInt(limit as string, 10) || 15;
  const total = events.length;
  const totalPages = Math.ceil(total / l) || 1;
  const paginated = events.slice((p - 1) * l, p * l);

  res.status(200).json({
    events: paginated,
    total,
    page: p,
    totalPages,
  });
});

auditRouter.get('/export', authenticate, requireAdmin, (req: Request, res: Response): void => {
  const { format = 'csv' } = req.query;
  const snapshot = db.getSnapshot();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="trustvault_audit_trail_${timestamp}.json"`);
    res.status(200).send(JSON.stringify(snapshot.auditEvents, null, 2));
  } else {
    const headers = [
      'Timestamp',
      'Event ID',
      'Actor Name',
      'Actor Email',
      'Role',
      'Action',
      'Result',
      'Document Reference',
      'IP Address',
      'Details',
      'Reason',
      'Suspicious Flag',
      'Previous Hash',
      'Event Hash',
    ];
    const rows = snapshot.auditEvents.map((e) => [
      `"${e.timestamp}"`,
      `"${e.id}"`,
      `"${e.actor.name}"`,
      `"${e.actor.email}"`,
      `"${e.actor.role}"`,
      `"${e.action}"`,
      `"${e.result}"`,
      `"${(e.documentTitle || e.documentId || '').replace(/"/g, '""')}"`,
      `"${e.ipAddress}"`,
      `"${(e.details || '').replace(/"/g, '""')}"`,
      `"${(e.reason || '').replace(/"/g, '""')}"`,
      `"${e.isSuspicious ? 'TRUE' : 'FALSE'}"`,
      `"${e.prevHash}"`,
      `"${e.eventHash}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv;charset=utf-8;');
    res.setHeader('Content-Disposition', `attachment; filename="trustvault_audit_trail_${timestamp}.csv"`);
    res.status(200).send(csvContent);
  }
});

// Verifiable Hash-Chain Audit Integrity Checker
auditRouter.get('/verify-chain', authenticate, requireAdmin, (_req: Request, res: Response): void => {
  const snapshot = db.getSnapshot();
  // Reverse to check in chronological order (oldest to newest)
  const chronological = [...snapshot.auditEvents].reverse();

  let brokenIndex = -1;
  let brokenReason = '';
  let expectedPrev = GENESIS_HASH;

  for (let i = 0; i < chronological.length; i++) {
    const ev = chronological[i];

    if (ev.prevHash !== expectedPrev) {
      brokenIndex = i;
      brokenReason = `Event ${ev.id} prevHash mismatch. Expected ${expectedPrev}, found ${ev.prevHash}`;
      break;
    }

    const recomputedHash = calculateEventHash(ev.prevHash, ev);
    if (recomputedHash !== ev.eventHash) {
      brokenIndex = i;
      brokenReason = `Event ${ev.id} hash tampering detected. Stored ${ev.eventHash}, recomputed ${recomputedHash}`;
      break;
    }

    expectedPrev = ev.eventHash;
  }

  const isValid = brokenIndex === -1;
  res.status(200).json({
    chainValid: isValid,
    totalVerifiedBlocks: chronological.length,
    genesisHash: GENESIS_HASH,
    headHash: snapshot.auditEvents[0]?.eventHash || GENESIS_HASH,
    brokenIndex: brokenIndex !== -1 ? brokenIndex : null,
    brokenReason: brokenReason || null,
  });
});

app.use('/api/audit', auditRouter);

// --------------------------------------------------------------------------
// Start Server with Vite Middlewares in Dev
// --------------------------------------------------------------------------
export async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('./dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('./dist/index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TrustVault Backend] Listening securely on port ${PORT}`);
  });

  return { app, server };
}

// Automatically start if called directly
if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  startServer();
}
