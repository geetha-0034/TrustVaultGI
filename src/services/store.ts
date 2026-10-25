import { User, DocumentItem, AccessGrant, AuditEvent } from '../types';
import {
  INITIAL_USERS,
  INITIAL_DOCUMENTS,
  INITIAL_GRANTS,
  INITIAL_AUDIT_EVENTS,
} from '../data/mockData';

const STORAGE_USERS = 'tv_store_users';
const STORAGE_DOCS = 'tv_store_docs';
const STORAGE_GRANTS = 'tv_store_grants';
const STORAGE_AUDIT = 'tv_store_audit';
const STORAGE_CURRENT_USER_ID = 'tv_store_current_user_id';

class LocalStore {
  private users: User[] = [];
  private documents: DocumentItem[] = [];
  private grants: AccessGrant[] = [];
  private auditEvents: AuditEvent[] = [];
  private currentUserId: string = 'usr-01'; // Default: Sarah Connor (Admin)

  constructor() {
    this.init();
  }

  private init() {
    try {
      const storedUsers = localStorage.getItem(STORAGE_USERS);
      const storedDocs = localStorage.getItem(STORAGE_DOCS);
      const storedGrants = localStorage.getItem(STORAGE_GRANTS);
      const storedAudit = localStorage.getItem(STORAGE_AUDIT);
      const storedCurrentUserId = localStorage.getItem(STORAGE_CURRENT_USER_ID);

      if (storedUsers) {
        const parsed: User[] = JSON.parse(storedUsers);
        for (const initU of INITIAL_USERS) {
          if (!parsed.some((u) => u.email.toLowerCase() === initU.email.toLowerCase())) {
            parsed.unshift(initU);
          }
        }
        this.users = parsed;
      } else {
        this.users = [...INITIAL_USERS];
      }
      this.documents = storedDocs ? JSON.parse(storedDocs) : [...INITIAL_DOCUMENTS];
      this.grants = storedGrants ? JSON.parse(storedGrants) : [...INITIAL_GRANTS];
      this.auditEvents = storedAudit ? JSON.parse(storedAudit) : [...INITIAL_AUDIT_EVENTS];
      this.currentUserId = storedCurrentUserId || 'usr-00';

      this.persist();
    } catch {
      this.resetToDefaults();
    }
  }

  public resetToDefaults() {
    this.users = JSON.parse(JSON.stringify(INITIAL_USERS));
    this.documents = JSON.parse(JSON.stringify(INITIAL_DOCUMENTS));
    this.grants = JSON.parse(JSON.stringify(INITIAL_GRANTS));
    this.auditEvents = JSON.parse(JSON.stringify(INITIAL_AUDIT_EVENTS));
    this.currentUserId = 'usr-01';
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_USERS, JSON.stringify(this.users));
      localStorage.setItem(STORAGE_DOCS, JSON.stringify(this.documents));
      localStorage.setItem(STORAGE_GRANTS, JSON.stringify(this.grants));
      localStorage.setItem(STORAGE_AUDIT, JSON.stringify(this.auditEvents));
      localStorage.setItem(STORAGE_CURRENT_USER_ID, this.currentUserId);
    } catch {
      // Local storage limit or quota exceeded
    }
  }

  // Current User
  public getCurrentUserId(): string {
    return this.currentUserId;
  }

  public setCurrentUserId(userId: string) {
    this.currentUserId = userId;
    this.persist();
  }

  public getCurrentUser(): User {
    const user = this.users.find((u) => u.id === this.currentUserId);
    return user || this.users[0];
  }

  // Users
  public getUsers(): User[] {
    return [...this.users];
  }

  public addUser(user: User): User {
    this.users.unshift(user);
    this.persist();
    return user;
  }

  public getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  public updateUser(id: string, updates: Partial<User>): User {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error(`User ${id} not found`);
    this.users[index] = { ...this.users[index], ...updates };
    this.persist();
    return this.users[index];
  }

  // Documents
  public getDocuments(): DocumentItem[] {
    return [...this.documents];
  }

  public getDocumentById(id: string): DocumentItem | undefined {
    return this.documents.find((d) => d.id === id);
  }

  public addDocument(doc: DocumentItem): DocumentItem {
    this.documents.unshift(doc);
    this.persist();
    return doc;
  }

  public updateDocument(id: string, updates: Partial<DocumentItem>): DocumentItem {
    const index = this.documents.findIndex((d) => d.id === id);
    if (index === -1) throw new Error(`Document ${id} not found`);
    this.documents[index] = { ...this.documents[index], ...updates };
    this.persist();
    return this.documents[index];
  }

  public deleteDocument(id: string): boolean {
    const index = this.documents.findIndex((d) => d.id === id);
    if (index === -1) return false;
    this.documents.splice(index, 1);
    // Also cleanup grants for this doc
    this.grants = this.grants.filter((g) => g.documentId !== id);
    this.persist();
    return true;
  }

  // Grants
  public getGrants(): AccessGrant[] {
    return [...this.grants];
  }

  public getGrantsForDocument(documentId: string): AccessGrant[] {
    return this.grants.filter((g) => g.documentId === documentId);
  }

  public addGrant(grant: AccessGrant): AccessGrant {
    this.grants.unshift(grant);
    // Update active grants count on document
    const doc = this.documents.find((d) => d.id === grant.documentId);
    if (doc) {
      doc.activeGrantsCount = this.grants.filter((g) => g.documentId === grant.documentId).length;
    }
    this.persist();
    return grant;
  }

  public updateGrant(grantId: string, updates: Partial<AccessGrant>): AccessGrant {
    const index = this.grants.findIndex((g) => g.id === grantId);
    if (index === -1) throw new Error(`Grant ${grantId} not found`);
    this.grants[index] = { ...this.grants[index], ...updates };
    this.persist();
    return this.grants[index];
  }

  public removeGrant(grantId: string): AccessGrant | null {
    const index = this.grants.findIndex((g) => g.id === grantId);
    if (index === -1) return null;
    const removed = this.grants[index];
    this.grants.splice(index, 1);
    const doc = this.documents.find((d) => d.id === removed.documentId);
    if (doc) {
      doc.activeGrantsCount = this.grants.filter((g) => g.documentId === removed.documentId).length;
    }
    this.persist();
    return removed;
  }

  // Audit Events
  public getAuditEvents(): AuditEvent[] {
    return [...this.auditEvents];
  }

  public addAuditEvent(event: AuditEvent): AuditEvent {
    this.auditEvents.unshift(event);
    this.persist();
    return event;
  }
}

export const localStore = new LocalStore();
