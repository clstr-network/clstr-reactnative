import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'student' | 'faculty' | 'alumni';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  collegeDomain: string;
  collegeName: string;
  graduationYear: string;
  department: string;
  bio: string;
  avatarUrl: string | null;
  role: UserRole;
  connectionCount: number;
  postCount: number;
  title?: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  completeOnboarding: (profile: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = '@clstr_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && mounted) {
          setUser(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load user', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadUser();
    return () => { mounted = false; };
  }, []);

  const login = useCallback(async (email: string, _password: string) => {
    const domain = email.split('@')[1] || '';
    const collegeName = domain.split('.')[0] || 'College';
    const mockUser: UserProfile = {
      id: `user_${Date.now()}`,
      fullName: '',
      email,
      collegeDomain: domain,
      collegeName: collegeName.charAt(0).toUpperCase() + collegeName.slice(1),
      graduationYear: '',
      department: '',
      bio: '',
      avatarUrl: null,
      role: 'student',
      connectionCount: 0,
      postCount: 0,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
    setUser(mockUser);
  }, []);

  const signup = useCallback(async (email: string, _password: string) => {
    return login(email, _password);
  }, [login]);

  const completeOnboarding = useCallback(async (profile: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...profile };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user && !!user.fullName,
    login,
    signup,
    completeOnboarding,
    logout,
    updateProfile,
  }), [user, isLoading, login, signup, completeOnboarding, logout, updateProfile]);

  return (
    <AuthContext.Provider value={value}>
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
