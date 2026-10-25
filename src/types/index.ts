/**
 * TrustVault - Core Domain Models & Type Definitions
 */

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
  userPermission: PermissionLevel;
  activeGrantsCount: number;
  createdAt: string;
  updatedAt: string;
  version: string;
  content: string;
  checksum: string;
  fileExtension: string;
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
}

export interface PlatformStats {
  totalDocuments: number;
  activeUsers: number;
  totalAuditEvents: number;
  deniedAttemptsCount: number;
  suspiciousActivityCount: number;
  totalStorageBytes: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp?: number;
}
