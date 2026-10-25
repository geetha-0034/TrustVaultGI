import { DocumentItem, PermissionLevel, DocumentCategory, DocumentClassification } from '../types';
import { apiClient } from './apiClient';
import { localStore } from './store';

export interface DocumentFilterParams {
  search?: string;
  category?: string;
  classification?: string;
  scope?: 'all' | 'owned' | 'shared';
  sortBy?: 'updatedAt' | 'createdAt' | 'title' | 'sizeBytes';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface DocumentListResult {
  documents: DocumentItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UploadDocumentPayload {
  title: string;
  category: DocumentCategory;
  classification: DocumentClassification;
  description: string;
  content: string;
  fileName: string;
  fileSizeBytes: number;
}

export const documentService = {
  async getDocuments(params: DocumentFilterParams = {}): Promise<DocumentListResult> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        const query = new URLSearchParams();
        if (params.search) query.set('search', params.search);
        if (params.category) query.set('category', params.category);
        if (params.classification) query.set('classification', params.classification);
        if (params.scope) query.set('scope', params.scope);
        if (params.sortBy) query.set('sortBy', params.sortBy);
        if (params.order) query.set('order', params.order);
        if (params.page) query.set('page', params.page.toString());
        if (params.limit) query.set('limit', params.limit.toString());

        const url = `/api/documents${query.toString() ? '?' + query.toString() : ''}`;
        return await apiClient.http<DocumentListResult>(url);
      } catch (err) {
        // Fallback to local store if offline
        console.warn('Real API call failed, falling back to localStore:', err);
      }
    }

    // Local fallback
    return apiClient.request(() => {
      const currentUser = localStore.getCurrentUser();
      const allDocs = localStore.getDocuments();

      let accessibleDocs: DocumentItem[] = [];
      for (const doc of allDocs) {
        const perm: PermissionLevel | null =
          doc.owner.id === currentUser.id
            ? 'OWNER'
            : currentUser.role === 'ADMINISTRATOR'
            ? 'OWNER'
            : (localStore.getGrantsForDocument(doc.id).find((g) => g.userId === currentUser.id)?.permission || null);

        if (perm !== null) {
          accessibleDocs.push({
            ...doc,
            userPermission: perm,
            activeGrantsCount: localStore.getGrantsForDocument(doc.id).length,
          });
        }
      }

      if (params.scope === 'owned') {
        accessibleDocs = accessibleDocs.filter((d) => d.owner.id === currentUser.id);
      } else if (params.scope === 'shared') {
        accessibleDocs = accessibleDocs.filter((d) => d.owner.id !== currentUser.id);
      }

      if (params.search && params.search.trim() !== '') {
        const q = params.search.toLowerCase().trim();
        accessibleDocs = accessibleDocs.filter(
          (d) =>
            d.title.toLowerCase().includes(q) ||
            d.description.toLowerCase().includes(q) ||
            d.owner.name.toLowerCase().includes(q)
        );
      }

      if (params.category && params.category !== 'ALL') {
        accessibleDocs = accessibleDocs.filter((d) => d.category === params.category);
      }

      if (params.classification && params.classification !== 'ALL') {
        accessibleDocs = accessibleDocs.filter((d) => d.classification === params.classification);
      }

      const sortBy = params.sortBy || 'updatedAt';
      const order = params.order || 'desc';

      accessibleDocs.sort((a, b) => {
        const valA: string | number = a[sortBy] as string | number;
        const valB: string | number = b[sortBy] as string | number;

        if (typeof valA === 'string') {
          return order === 'asc'
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        } else {
          return order === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
        }
      });

      const total = accessibleDocs.length;
      const page = params.page || 1;
      const limit = params.limit || 10;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;

      return {
        documents: accessibleDocs.slice(startIndex, startIndex + limit),
        total,
        page,
        totalPages,
      };
    });
  },

  async getDocumentById(id: string): Promise<DocumentItem> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        return await apiClient.http<DocumentItem>(`/api/documents/${id}`);
      } catch (err) {
        console.warn('Real API getDocumentById error, falling back:', err);
        throw err;
      }
    }

    return apiClient.request(() => {
      const doc = localStore.getDocumentById(id);
      if (!doc) {
        throw { status: 404, code: 'DOCUMENT_NOT_FOUND', message: 'Document not found.' };
      }
      return doc;
    });
  },

  async getDocumentContent(id: string): Promise<{ content: string; checksum: string; updatedAt: string }> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        const res = await apiClient.http<{ id: string; content: string; checksum: string; updatedAt: string }>(
          `/api/documents/${id}/content`
        );
        return {
          content: res.content,
          checksum: res.checksum,
          updatedAt: res.updatedAt,
        };
      } catch (err) {
        console.warn('Real API getDocumentContent error:', err);
        throw err;
      }
    }

    return apiClient.request(async () => {
      const doc = await this.getDocumentById(id);
      return {
        content: doc.content,
        checksum: doc.checksum,
        updatedAt: doc.updatedAt,
      };
    });
  },

  async updateDocumentContent(id: string, content: string, changeSummary?: string): Promise<DocumentItem> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        return await apiClient.http<DocumentItem>(`/api/documents/${id}/content`, {
          method: 'PUT',
          body: JSON.stringify({ content, changeSummary }),
        });
      } catch (err) {
        console.warn('Real API updateDocumentContent error:', err);
        throw err;
      }
    }

    return apiClient.request(async () => {
      const doc = await this.getDocumentById(id);
      return localStore.updateDocument(id, { content, updatedAt: new Date().toISOString() });
    });
  },

  async uploadDocument(payload: UploadDocumentPayload): Promise<DocumentItem> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        return await apiClient.http<DocumentItem>('/api/documents', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn('Real API uploadDocument error:', err);
        throw err;
      }
    }

    return apiClient.request(() => {
      const currentUser = localStore.getCurrentUser();
      const id = `doc-${Date.now()}`;
      const extension = payload.fileName.split('.').pop() || 'md';
      const checksum = `sha256:${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

      const newDoc: DocumentItem = {
        id,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        classification: payload.classification,
        mimeType: extension === 'pdf' ? 'application/pdf' : 'text/markdown',
        fileExtension: extension,
        sizeBytes: payload.fileSizeBytes || 102400,
        owner: { id: currentUser.id, name: currentUser.name, email: currentUser.email },
        userPermission: 'OWNER',
        activeGrantsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0',
        checksum,
        content: payload.content || `# ${payload.title}\n\nDocument initialized on ${new Date().toLocaleDateString()}.`,
      };

      localStore.addDocument(newDoc);
      return newDoc;
    });
  },

  async deleteDocument(id: string): Promise<{ success: boolean; id: string }> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        await apiClient.http<{ message: string; id: string }>(`/api/documents/${id}`, {
          method: 'DELETE',
        });
        return { success: true, id };
      } catch (err) {
        console.warn('Real API deleteDocument error:', err);
        throw err;
      }
    }

    return apiClient.request(async () => {
      localStore.deleteDocument(id);
      return { success: true, id };
    });
  },

  async downloadDocument(id: string): Promise<{ fileName: string; url: string }> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        const { blob, filename } = await apiClient.download(`/api/documents/${id}/download`);
        const url = URL.createObjectURL(blob);
        return { fileName: filename, url };
      } catch (err) {
        console.warn('Real API downloadDocument error, falling back:', err);
        throw err;
      }
    }

    return apiClient.request(async () => {
      const doc = await this.getDocumentById(id);
      const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const fileName = `${doc.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_v${doc.version}.${doc.fileExtension}`;
      return { fileName, url };
    });
  },
};
