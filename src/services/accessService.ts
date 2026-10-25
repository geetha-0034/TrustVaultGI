import { AccessGrant } from '../types';
import { apiClient } from './apiClient';
import { localStore } from './store';

export const accessService = {
  async getDocumentGrants(documentId: string): Promise<AccessGrant[]> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        return await apiClient.http<AccessGrant[]>(`/api/documents/${documentId}/access`);
      } catch (err) {
        console.warn('Real API getDocumentGrants error:', err);
        throw err;
      }
    }

    return apiClient.request(() => {
      const currentUser = localStore.getCurrentUser();
      const doc = localStore.getDocumentById(documentId);

      if (!doc) {
        throw {
          status: 404,
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found.',
        };
      }

      if (currentUser.role !== 'ADMINISTRATOR' && doc.owner.id !== currentUser.id) {
        throw {
          status: 403,
          code: 'PERMISSION_DENIED',
          message: 'Only document owners or administrators may view access grants.',
        };
      }

      return localStore.getGrantsForDocument(documentId);
    });
  },

  async grantAccess(
    documentId: string,
    targetUserId: string,
    permission: 'READ' | 'EDIT',
    expiresAt?: string | null
  ): Promise<AccessGrant> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        return await apiClient.http<AccessGrant>(`/api/documents/${documentId}/access`, {
          method: 'POST',
          body: JSON.stringify({
            userId: targetUserId,
            permission,
            expiresAt: expiresAt || null,
          }),
        });
      } catch (err) {
        console.warn('Real API grantAccess error:', err);
        throw err;
      }
    }

    return apiClient.request(() => {
      const currentUser = localStore.getCurrentUser();
      const doc = localStore.getDocumentById(documentId);

      if (!doc) throw { status: 404, message: 'Document not found' };

      if (currentUser.role !== 'ADMINISTRATOR' && doc.owner.id !== currentUser.id) {
        throw {
          status: 403,
          code: 'FORBIDDEN',
          message: 'Only document owners or administrators may grant document access.',
        };
      }

      const targetUser = localStore.getUserById(targetUserId);
      if (!targetUser) throw { status: 404, message: 'Selected user was not found in directory.' };

      const existing = localStore
        .getGrantsForDocument(documentId)
        .find((g) => g.userId === targetUserId);

      if (existing) {
        throw {
          status: 400,
          code: 'GRANT_EXISTS',
          message: `${targetUser.name} already has ${existing.permission} access. Use update action instead.`,
        };
      }

      const grant: AccessGrant = {
        id: `grant-${Date.now()}`,
        documentId,
        userId: targetUserId,
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          department: targetUser.department,
          role: targetUser.role,
        },
        permission,
        grantedBy: {
          id: currentUser.id,
          name: currentUser.name,
        },
        grantedAt: new Date().toISOString(),
        expiresAt: expiresAt || null,
      };

      localStore.addGrant(grant);
      return grant;
    });
  },

  async updateGrant(
    documentId: string,
    grantId: string,
    newPermission: 'READ' | 'EDIT'
  ): Promise<AccessGrant> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        return await apiClient.http<AccessGrant>(`/api/documents/${documentId}/access/${grantId}`, {
          method: 'PATCH',
          body: JSON.stringify({ permission: newPermission }),
        });
      } catch (err) {
        console.warn('Real API updateGrant error:', err);
        throw err;
      }
    }

    return apiClient.request(() => {
      return localStore.updateGrant(grantId, { permission: newPermission });
    });
  },

  async revokeGrant(documentId: string, grantId: string): Promise<{ success: boolean; grantId: string }> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        const res = await apiClient.http<{ success: boolean; grantId: string }>(
          `/api/documents/${documentId}/access/${grantId}`,
          {
            method: 'DELETE',
          }
        );
        return res;
      } catch (err) {
        console.warn('Real API revokeGrant error:', err);
        throw err;
      }
    }

    return apiClient.request(() => {
      const removed = localStore.removeGrant(grantId);
      if (!removed) throw { status: 404, message: 'Grant not found or already revoked.' };
      return { success: true, grantId };
    });
  },
};
