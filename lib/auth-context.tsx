import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { getUserProfile, isOnboardingComplete, saveUserProfile, createUserProfile, type UserProfile, type UserRole } from './storage';

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isOnboarded: boolean;
  signUp: (data: { name: string; role: UserRole; department: string; bio?: string; graduationYear?: string }) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);

  const loadUser = async () => {
    try {
      const [profile, onboarded] = await Promise.all([
        getUserProfile(),
        isOnboardingComplete(),
      ]);
      setUser(profile);
      setIsOnboarded(onboarded);
    } catch (e) {
      console.error('Failed to load user:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const signUp = async (data: { name: string; role: UserRole; department: string; bio?: string; graduationYear?: string }) => {
    const profile = await createUserProfile(data);
    setUser(profile);
    setIsOnboarded(true);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    await saveUserProfile(updated);
    setUser(updated);
  };

  const refresh = async () => {
    await loadUser();
  };

  const value = useMemo(() => ({
    user,
    isLoading,
    isOnboarded,
    signUp,
    updateProfile,
    refresh,
  }), [user, isLoading, isOnboarded]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
