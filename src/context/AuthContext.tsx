import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  registerFirstAdmin: (data: { username: string; password: string; full_name: string; email?: string }) => Promise<void>;
  logout: () => void;
  needsSetup: boolean;
  checkSetupStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('smartbiz_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const checkSetupStatus = async () => {
    try {
      const res = await apiClient.get('/auth/setup-status');
      setNeedsSetup(res.data.needs_setup);
    } catch {
      // Backend might still be starting
    }
  };

  const fetchCurrentUser = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await apiClient.get('/auth/me');
      setUser(res.data);
    } catch {
      setToken(null);
      localStorage.removeItem('smartbiz_token');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSetupStatus();
    fetchCurrentUser();
  }, [token]);

  const login = async (username: string, password: string) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const res = await apiClient.post('/auth/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, user_id, full_name, role, company_id } = res.data;
    localStorage.setItem('smartbiz_token', access_token);
    setToken(access_token);
    setUser({
      id: user_id,
      username,
      full_name,
      role,
      company_id,
      is_active: true,
    });
  };

  const registerFirstAdmin = async (data: { username: string; password: string; full_name: string; email?: string }) => {
    const res = await apiClient.post('/auth/register', data);
    const { access_token, user_id, full_name, role, company_id } = res.data;
    localStorage.setItem('smartbiz_token', access_token);
    setToken(access_token);
    setUser({
      id: user_id,
      username: data.username,
      full_name,
      role,
      company_id,
      is_active: true,
    });
    setNeedsSetup(false);
  };

  const logout = () => {
    localStorage.removeItem('smartbiz_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        registerFirstAdmin,
        logout,
        needsSetup,
        checkSetupStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
