/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FOUNDER_EMAIL } from '@/lib/admin-constants';
import {
  addPlatformAdmin,
  checkIsAdmin,
  getPlatformAdmins,
  removePlatformAdmin,
  subscribeToPlatformAdmins,
  updateAdminLastLogin,
  type PlatformAdmin as PlatformAdminApi,
} from '@/lib/admin-api';
import { useQueryClient } from '@tanstack/react-query';

// The founder email - this user has full access and can manage other admins

// Platform admin type (matches Supabase table)
export type PlatformAdmin = PlatformAdminApi;

interface AdminContextType {
  isAdmin: boolean;
  isFounder: boolean;
  isLoading: boolean;
  adminUser: PlatformAdmin | null;
  adminUsers: PlatformAdmin[];
  currentUser: { email: string } | null;
  addAdminUser: (email: string, name: string, role?: 'admin' | 'moderator') => Promise<void>;
  removeAdminUser: (email: string) => Promise<void>;
  refreshAdminUsers: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<PlatformAdmin | null>(null);
  const [adminUsers, setAdminUsers] = useState<PlatformAdmin[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Check admin status from Supabase
  const checkAdminStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email?.toLowerCase() || null;
      setCurrentUserEmail(email);
      
      if (!email) {
        setIsAdmin(false);
        setIsFounder(false);
        setAdminUser(null);
        setAdminUsers([]);
        setIsLoading(false);
        return;
      }

      const adminStatus = await checkIsAdmin();

      if (!adminStatus.isAdmin || !adminStatus.adminUser) {
        setIsAdmin(false);
        setIsFounder(false);
        setAdminUser(null);
        setAdminUsers([]);
        setIsLoading(false);
        return;
      }

      // User is an admin
      setIsAdmin(true);
      setIsFounder(adminStatus.isFounder);
      setAdminUser(adminStatus.adminUser as PlatformAdmin);

      // Track admin login timestamp (fire-and-forget)
      updateAdminLastLogin(email).catch(() => {});

      const allAdmins = await getPlatformAdmins();
      setAdminUsers(allAdmins as PlatformAdmin[]);

    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      setIsFounder(false);
      setAdminUser(null);
      setAdminUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and auth state changes
  useEffect(() => {
    checkAdminStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
    });

    return () => subscription.unsubscribe();
  }, [checkAdminStatus]);

  // Subscribe to realtime changes for platform admins
  useEffect(() => {
    if (!isAdmin) return;

    const channel = subscribeToPlatformAdmins(async () => {
      const allAdmins = await getPlatformAdmins();
      setAdminUsers(allAdmins as PlatformAdmin[]);
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  // Add admin user (founder only)
  const addAdminUser = async (email: string, name: string, role: 'admin' | 'moderator' = 'admin') => {
    if (!isFounder) {
      throw new Error('Only the founder can add admin users');
    }
    
    const normalizedEmail = email.toLowerCase().trim();

    const data = await addPlatformAdmin(normalizedEmail, name, role);
    setAdminUsers(prev => {
      const existingIndex = prev.findIndex(u => u.email.toLowerCase() === normalizedEmail);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = data as PlatformAdmin;
        return next;
      }
      return [...prev, data as PlatformAdmin];
    });
    queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
  };

  // Remove admin user (founder only)
  const removeAdminUser = async (email: string) => {
    if (!isFounder) {
      throw new Error('Only the founder can remove admin users');
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail === FOUNDER_EMAIL.toLowerCase()) {
      throw new Error('Cannot remove the founder');
    }

    await removePlatformAdmin(normalizedEmail);

    setAdminUsers(prev => prev.map(u =>
      u.email.toLowerCase() === normalizedEmail
        ? { ...u, is_active: false, updated_at: new Date().toISOString() }
        : u
    ));
    queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
  };

  // Refresh admin users from database
  const refreshAdminUsers = async () => {
    if (!isAdmin) return;
    
    const data = await getPlatformAdmins();
    if (data) {
      setAdminUsers(data as PlatformAdmin[]);
    }
    queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
  };

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        isFounder,
        isLoading,
        adminUser,
        adminUsers,
        currentUser: currentUserEmail ? { email: currentUserEmail } : null,
        addAdminUser,
        removeAdminUser,
        refreshAdminUsers,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
