import { AuditEvent, AuditAction, AuditResult, PlatformStats } from '../types';
import { apiClient } from './apiClient';
import { localStore } from './store';

export interface AuditFilterParams {
  search?: string;
  action?: AuditAction | 'ALL';
  result?: AuditResult | 'ALL';
  isSuspiciousOnly?: boolean;
  documentId?: string;
  page?: number;
  limit?: number;
}

export interface AuditListResult {
  events: AuditEvent[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ChainVerificationResult {
  chainValid: boolean;
  totalVerifiedBlocks: number;
  genesisHash: string;
  headHash: string;
  brokenIndex: number | null;
  brokenReason: string | null;
}

export const auditService = {
  async getPlatformAuditLogs(params: AuditFilterParams = {}): Promise<AuditListResult> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        const query = new URLSearchParams();
        if (params.search) query.set('search', params.search);
        if (params.action && params.action !== 'ALL') query.set('action', params.action);
        if (params.result && params.result !== 'ALL') query.set('result', params.result);
        if (params.isSuspiciousOnly) query.set('isSuspiciousOnly', 'true');
        if (params.page) query.set('page', params.page.toString());
        if (params.limit) query.set('limit', params.limit.toString());

        const url = `/api/audit${query.toString() ? '?' + query.toString() : ''}`;
        return await apiClient.http<AuditListResult>(url);
      } catch (err) {
        console.warn('Real API getPlatformAuditLogs error:', err);
        throw err;
      }
    }

    return apiClient.request(() => {
      const currentUser = localStore.getCurrentUser();
      if (currentUser.role !== 'ADMINISTRATOR') {
        throw {
          status: 403,
          code: 'ADMIN_REQUIRED',
          message: 'Only platform administrators are authorized to inspect the global security audit trail.',
        };
      }

      let events = localStore.getAuditEvents();

      if (params.search && params.search.trim()) {
        const q = params.search.toLowerCase().trim();
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

      if (params.action && params.action !== 'ALL') {
        events = events.filter((e) => e.action === params.action);
      }

      if (params.result && params.result !== 'ALL') {
        events = events.filter((e) => e.result === params.result);
      }

      if (params.isSuspiciousOnly) {
        events = events.filter((e) => e.isSuspicious);
      }

      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const total = events.length;
      const page = params.page || 1;
      const limit = params.limit || 15;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;

      return {
        events: events.slice(startIndex, startIndex + limit),
        total,
        page,
        totalPages,
      };
    });
  },

  async getDocumentAuditLogs(documentId: string): Promise<AuditEvent[]> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        return await apiClient.http<AuditEvent[]>(`/api/documents/${documentId}/activity`);
      } catch (err) {
        console.warn('Real API getDocumentAuditLogs error:', err);
        throw err;
      }
    }

    return apiClient.request(() => {
      const all = localStore.getAuditEvents();
      const docEvents = all.filter((e) => e.documentId === documentId);
      docEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return docEvents;
    });
  },

  async logAuditEvent(eventData: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
    const event: AuditEvent = {
      ...eventData,
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    localStore.addAuditEvent(event);
    return event;
  },

  async exportAuditLogs(format: 'csv' | 'json'): Promise<{ data: string; mimeType: string; filename: string }> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const token = apiClient.getToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/audit/export?format=${format}`, { headers });
        if (!res.ok) throw new Error(`Export failed with status ${res.status}`);
        const data = await res.text();
        return {
          data,
          mimeType: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;',
          filename: `trustvault_audit_trail_${timestamp}.${format}`,
        };
      } catch (err) {
        console.warn('Real API exportAuditLogs error, falling back:', err);
      }
    }

    return apiClient.request(() => {
      const events = localStore.getAuditEvents();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      if (format === 'json') {
        const data = JSON.stringify(events, null, 2);
        return {
          data,
          mimeType: 'application/json',
          filename: `trustvault_audit_trail_${timestamp}.json`,
        };
      } else {
        const headers = ['Timestamp', 'Event ID', 'Actor Name', 'Actor Email', 'Role', 'Action', 'Result', 'Document Reference', 'IP Address', 'Details', 'Reason', 'Suspicious Flag'];
        const rows = events.map((e) => [
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
        ]);
        const data = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        return {
          data,
          mimeType: 'text/csv;charset=utf-8;',
          filename: `trustvault_audit_trail_${timestamp}.csv`,
        };
      }
    });
  },

  async getPlatformStats(): Promise<PlatformStats> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        return await apiClient.http<PlatformStats>('/api/audit/stats');
      } catch (err) {
        console.warn('Real API getPlatformStats error:', err);
      }
    }

    return apiClient.request(() => {
      const docs = localStore.getDocuments();
      const users = localStore.getUsers();
      const events = localStore.getAuditEvents();

      const totalStorageBytes = docs.reduce((acc, d) => acc + d.sizeBytes, 0);
      const deniedAttemptsCount = events.filter((e) => e.result === 'DENIED').length;
      const suspiciousActivityCount = events.filter((e) => e.isSuspicious).length;

      return {
        totalDocuments: docs.length,
        activeUsers: users.filter((u) => u.status === 'ACTIVE').length,
        totalAuditEvents: events.length,
        deniedAttemptsCount,
        suspiciousActivityCount,
        totalStorageBytes,
      };
    });
  },

  async verifyAuditChain(): Promise<ChainVerificationResult> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        return await apiClient.http<ChainVerificationResult>('/api/audit/verify-chain');
      } catch (err) {
        console.warn('Real API verifyAuditChain error:', err);
        throw err;
      }
    }

    return {
      chainValid: true,
      totalVerifiedBlocks: 6,
      genesisHash: '0000000000000000000000000000000000000000000000000000000000000000',
      headHash: 'simulated_head_hash_valid',
      brokenIndex: null,
      brokenReason: null,
    };
  },
};
