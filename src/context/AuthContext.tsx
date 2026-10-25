import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService, LoginCredentials } from '../services/authService';
import { apiClient } from '../services/apiClient';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  switchPersona: (userId: string) => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    setIsLoading(true);
    try {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
      apiClient.setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const resp = await authService.login(credentials);
      setCurrentUser(resp.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setCurrentUser(null);
      setIsLoading(false);
    }
  };

  const switchPersona = async (userId: string) => {
    setIsLoading(true);
    try {
      const user = await authService.switchPersona(userId);
      setCurrentUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCurrentUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        logout,
        switchPersona,
        refreshCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
