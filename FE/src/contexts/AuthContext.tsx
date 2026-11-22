import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch } from '@/lib/api';

export type UserRole = "STUDENT" | "TEACHER" | "ADMIN" | "STAFF" | "HEAD_STAFF";

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  accessToken?: string;
  forcePasswordChange?: boolean;
  fullName?: string;
  roles?: string[];
  phoneNumber?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<any>;
  verifyEmail: (userId: string, code: string) => Promise<boolean>;
  logout: () => void;
  updateUserData: (data: Partial<User>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem('lms_user');
    const storedToken = localStorage.getItem('lms_token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<any> => {
    setLoading(true);
    try {
      const res = await apiFetch<any>('/login', {
        method: 'POST',
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const response = res.data;
      
      if (response && response.needsVerification) {
        setLoading(false);
        return { needsVerification: true, userId: response.id, email: response.email };
      }

      if (response && response.accessToken) {
        const newUser: User = {
          id: response.id,
          username: response.username,
          email: response.email || response.username,
          name: response.fullName || response.username,
          fullName: response.fullName,
          phoneNumber: response.phoneNumber,
          roles: response.roles || [],
          role: response.roles.includes('ADMIN') ? 'ADMIN' :
            response.roles.includes('HEAD_STAFF') ? 'HEAD_STAFF' :
              response.roles.includes('STAFF') ? 'STAFF' :
                response.roles.includes('TEACHER') ? 'TEACHER' : 'STUDENT',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${response.username}`,
          accessToken: response.accessToken,
          forcePasswordChange: response.forcePasswordChange,
        };

        setUser(newUser);
        localStorage.setItem('lms_user', JSON.stringify(newUser));
        localStorage.setItem('lms_token', response.accessToken);
        setLoading(false);
        return { success: true };
      }
      return { success: false };
    } catch (error: any) {
      console.error('Login error:', error);
      setLoading(false);
      throw error;
    }
  };

  const verifyEmail = async (userId: string, code: string): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await apiFetch<any>('/verify-email', {
        method: 'POST',
        body: JSON.stringify({ userId, code }),
      });

      const response = res.data;
      if (response && response.accessToken) {
        const newUser: User = {
          id: response.id,
          username: response.username,
          email: response.email || response.username,
          name: response.fullName || response.username,
          fullName: response.fullName,
          phoneNumber: response.phoneNumber,
          roles: response.roles || [],
          role: response.roles.includes('ADMIN') ? 'ADMIN' :
            response.roles.includes('HEAD_STAFF') ? 'HEAD_STAFF' :
              response.roles.includes('STAFF') ? 'STAFF' :
                response.roles.includes('TEACHER') ? 'TEACHER' : 'STUDENT',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${response.username}`,
          accessToken: response.accessToken,
          forcePasswordChange: response.forcePasswordChange,
        };

        setUser(newUser);
        localStorage.setItem('lms_user', JSON.stringify(newUser));
        localStorage.setItem('lms_token', response.accessToken);
        setLoading(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Verify error:', error);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiFetch<any>('/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('lms_user');
      localStorage.removeItem('lms_token');
    }
  };

  const updateUserData = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('lms_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      verifyEmail,
      logout,
      updateUserData,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
