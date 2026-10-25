import { User } from '../types';
import { apiClient } from './apiClient';

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresAt: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const data = await apiClient.http<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (data.token) {
      apiClient.setToken(data.token);
    }

    return data;
  },

  async logout(): Promise<{ message: string }> {
    try {
      const data = await apiClient.http<{ message: string }>('/api/auth/logout', {
        method: 'POST',
      });
      apiClient.setToken(null);
      return data;
    } catch (err) {
      apiClient.setToken(null);
      return { message: 'Logged out locally' };
    }
  },

  async getCurrentUser(): Promise<User> {
    return apiClient.http<User>('/api/auth/me');
  },

  async switchPersona(userId: string): Promise<User> {
    const data = await apiClient.http<{ token: string; user: User }>('/api/auth/switch-persona', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });

    if (data.token) {
      apiClient.setToken(data.token);
    }

    return data.user;
  },
};
