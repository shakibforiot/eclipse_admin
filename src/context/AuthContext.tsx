import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AdminUser, NavigationTab, ToastMessage } from '../types.ts';
import { api } from '../lib/api.ts';

interface AuthContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  toasts: ToastMessage[];
  showToast: (title: string, message?: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  refreshAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (
    title: string,
    message?: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'success'
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshAdmin = async () => {
    const token = localStorage.getItem('eclipse_admin_token');
    if (!token) {
      setAdmin(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res.success && res.admin) {
        setAdmin(res.admin);
      } else {
        localStorage.removeItem('eclipse_admin_token');
        setAdmin(null);
      }
    } catch {
      localStorage.removeItem('eclipse_admin_token');
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAdmin();
  }, []);

  const login = async (username: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await api.login(username, pass);
      if (res.success && res.token) {
        localStorage.setItem('eclipse_admin_token', res.token);
        setAdmin(res.admin);
        showToast('Login Successful', `Welcome back, ${res.admin.username}`, 'success');
        setIsLoading(false);
        return true;
      } else {
        showToast('Authentication Failed', res.error || 'Invalid credentials', 'error');
        setIsLoading(false);
        return false;
      }
    } catch (err: any) {
      showToast('Login Error', err.message || 'Unable to connect to server', 'error');
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('eclipse_admin_token');
    setAdmin(null);
    setActiveTab('dashboard');
    showToast('Logged Out', 'Your administrator session has ended', 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        activeTab,
        setActiveTab,
        login,
        logout,
        toasts,
        showToast,
        removeToast,
        refreshAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
