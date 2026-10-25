import { User, UserRole, UserStatus } from '../types';
import { apiClient } from './apiClient';
import { localStore } from './store';

export interface UserFilterParams {
  search?: string;
  role?: UserRole | 'ALL';
  status?: UserStatus | 'ALL';
  page?: number;
  limit?: number;
}

export interface UserListResult {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

export const userService = {
  async getUsers(params: UserFilterParams = {}): Promise<UserListResult> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        const query = new URLSearchParams();
        if (params.search) query.set('search', params.search);
        if (params.role && params.role !== 'ALL') query.set('role', params.role);
        if (params.status && params.status !== 'ALL') query.set('status', params.status);
        if (params.page) query.set('page', params.page.toString());
        if (params.limit) query.set('limit', params.limit.toString());

        const url = `/api/users${query.toString() ? '?' + query.toString() : ''}`;
        return await apiClient.http<UserListResult>(url);
      } catch (err) {
        console.warn('Real API getUsers error:', err);
        throw err;
      }
    }

    return apiClient.request(() => {
      let users = localStore.getUsers();

      const docs = localStore.getDocuments();
      const grants = localStore.getGrants();

      users = users.map((u) => {
        const ownedCount = docs.filter((d) => d.owner.id === u.id).length;
        const grantedCount = grants.filter((g) => g.userId === u.id).length;
        return {
          ...u,
          ownedDocumentsCount: ownedCount,
          accessibleDocumentsCount: u.role === 'ADMINISTRATOR' ? docs.length : ownedCount + grantedCount,
        };
      });

      if (params.search && params.search.trim()) {
        const q = params.search.toLowerCase().trim();
        users = users.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.department.toLowerCase().includes(q)
        );
      }

      if (params.role && params.role !== 'ALL') {
        users = users.filter((u) => u.role === params.role);
      }

      if (params.status && params.status !== 'ALL') {
        users = users.filter((u) => u.status === params.status);
      }

      const total = users.length;
      const page = params.page || 1;
      const limit = params.limit || 10;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;

      return {
        users: users.slice(startIndex, startIndex + limit),
        total,
        page,
        totalPages,
      };
    });
  },

  async updateUserStatus(userId: string, status: UserStatus, reason?: string): Promise<User> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        return await apiClient.http<User>(`/api/users/${userId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, reason }),
        });
      } catch (err) {
        console.warn('Real API updateUserStatus error:', err);
        throw err;
      }
    }

    return apiClient.request(() => {
      return localStore.updateUser(userId, { status });
    });
  },

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const config = apiClient.getConfig();
    if (config.useRealApi) {
      try {
        return await apiClient.http<User>(`/api/users/${userId}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role }),
        });
      } catch (err) {
        console.warn('Real API updateUserRole error:', err);
        throw err;
      }
    }

    return apiClient.request(() => {
      return localStore.updateUser(userId, { role });
    });
  },
};
