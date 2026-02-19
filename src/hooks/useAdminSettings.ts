import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { updateAdminSetting, logAdminActivity } from '@/lib/admin-api';
import { useAdmin } from '@/contexts/AdminContext';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { CHANNELS } from '@clstr/shared/realtime/channels';

export interface AdminSettingsValues {
  notifications: Record<string, boolean>;
  data: Record<string, boolean>;
}

export interface SystemInfo {
  version: string;
  environment: string;
  lastDeployment: string | null;
  supabaseProject: string;
  region: string;
}

export interface MaintenanceMode {
  enabled: boolean;
  message: string;
  estimated_end: string | null;
  enabled_at: string | null;
  enabled_by: string | null;
}

export interface CacheSettings {
  last_cleared: string | null;
  clear_count: number;
  cleared_by: string | null;
}

export interface ApiKeySettings {
  last_rotated: string | null;
  rotation_count: number;
  rotated_by: string | null;
}

const DEFAULT_SETTINGS: AdminSettingsValues = {
  notifications: {},
  data: {},
};

const DEFAULT_SYSTEM_INFO: SystemInfo = {
  version: '1.0.0',
  environment: import.meta.env.MODE || 'development',
  lastDeployment: null,
  supabaseProject: 'Unknown',
  region: 'Unknown',
};

const DEFAULT_MAINTENANCE_MODE: MaintenanceMode = {
  enabled: false,
  message: 'Platform is undergoing scheduled maintenance. Please check back soon.',
  estimated_end: null,
  enabled_at: null,
  enabled_by: null,
};

const SETTINGS_KEYS = {
  notifications: 'notification_rules',
  data: 'data_anonymization',
  systemInfo: 'system_info',
  maintenanceMode: 'maintenance_mode',
  cacheSettings: 'cache_settings',
  apiKeys: 'api_keys',
} as const;

async function fetchAdminSettings(): Promise<AdminSettingsValues> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [SETTINGS_KEYS.notifications, SETTINGS_KEYS.data]);

  if (error) {
    throw error;
  }

  const settings: AdminSettingsValues = {
    notifications: {},
    data: {},
  };

  for (const row of data || []) {
    if (row.setting_key === SETTINGS_KEYS.notifications) {
      settings.notifications = (row.setting_value || {}) as Record<string, boolean>;
    }
    if (row.setting_key === SETTINGS_KEYS.data) {
      settings.data = (row.setting_value || {}) as Record<string, boolean>;
    }
  }

  return settings;
}

async function fetchSystemInfo(): Promise<SystemInfo> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('setting_value')
    .eq('setting_key', SETTINGS_KEYS.systemInfo)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return DEFAULT_SYSTEM_INFO;
    }
    throw error;
  }

  return (data?.setting_value as SystemInfo) || DEFAULT_SYSTEM_INFO;
}

async function fetchMaintenanceMode(): Promise<MaintenanceMode> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('setting_value')
    .eq('setting_key', SETTINGS_KEYS.maintenanceMode)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return DEFAULT_MAINTENANCE_MODE;
    }
    throw error;
  }

  return (data?.setting_value as MaintenanceMode) || DEFAULT_MAINTENANCE_MODE;
}

async function saveAdminSettings(values: AdminSettingsValues): Promise<void> {
  await Promise.all([
    updateAdminSetting(SETTINGS_KEYS.notifications, values.notifications),
    updateAdminSetting(SETTINGS_KEYS.data, values.data),
  ]);
}

export function useAdminSettings() {
  const { isAdmin, isFounder } = useAdmin();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.admin.settings(),
    queryFn: fetchAdminSettings,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 5,
  });

  const mutation = useMutation({
    mutationFn: async (values: AdminSettingsValues) => {
      if (!isFounder) {
        throw new Error('Only the founder can modify admin settings');
      }
      await saveAdminSettings(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.settings() });
    },
  });

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel(CHANNELS.admin.settings())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_settings' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.settings() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.systemInfo() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.maintenanceMode() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  return {
    settings: query.data || DEFAULT_SETTINGS,
    isLoading: query.isLoading,
    error: query.error,
    saveSettings: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}

export function useSystemInfo() {
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.admin.systemInfo(),
    queryFn: fetchSystemInfo,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 5,
  });

  // Derive displayable system info with fallbacks
  const systemInfo = {
    version: query.data?.version || import.meta.env.VITE_APP_VERSION || DEFAULT_SYSTEM_INFO.version,
    environment: query.data?.environment || import.meta.env.MODE || DEFAULT_SYSTEM_INFO.environment,
    lastDeployment: query.data?.lastDeployment ? new Date(query.data.lastDeployment) : null,
    supabaseProject: query.data?.supabaseProject || (() => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      if (!supabaseUrl) return 'Unknown';
      try {
        return new URL(supabaseUrl).hostname.split('.')[0] || 'Unknown';
      } catch {
        return 'Unknown';
      }
    })(),
    region: query.data?.region || DEFAULT_SYSTEM_INFO.region,
  };

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel(CHANNELS.admin.systemInfo())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_settings', filter: `setting_key=eq.${SETTINGS_KEYS.systemInfo}` },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.systemInfo() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  return {
    systemInfo,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useMaintenanceMode() {
  const { isAdmin, isFounder } = useAdmin();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.admin.maintenanceMode(),
    queryFn: fetchMaintenanceMode,
    enabled: isAdmin,
    staleTime: 1000 * 60,
  });

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!isFounder) {
        throw new Error('Only the founder can toggle maintenance mode');
      }

      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email || 'unknown';

      const newValue: MaintenanceMode = {
        ...DEFAULT_MAINTENANCE_MODE,
        ...query.data,
        enabled,
        enabled_at: enabled ? new Date().toISOString() : null,
        enabled_by: enabled ? userEmail : null,
      };

      await updateAdminSetting(SETTINGS_KEYS.maintenanceMode, newValue);
      await logAdminActivity(
        enabled ? 'enable_maintenance_mode' : 'disable_maintenance_mode',
        'admin_setting',
        SETTINGS_KEYS.maintenanceMode,
        { enabled }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.maintenanceMode() });
    },
  });

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel(CHANNELS.admin.maintenanceMode())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_settings', filter: `setting_key=eq.${SETTINGS_KEYS.maintenanceMode}` },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.maintenanceMode() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  return {
    maintenanceMode: query.data || DEFAULT_MAINTENANCE_MODE,
    isLoading: query.isLoading,
    error: query.error,
    toggleMaintenanceMode: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
  };
}

export function useCacheManagement() {
  const { isFounder } = useAdmin();
  const queryClient = useQueryClient();

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      if (!isFounder) {
        throw new Error('Only the founder can clear cache');
      }

      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email || 'unknown';

      // Get current cache settings
      const { data: current } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', SETTINGS_KEYS.cacheSettings)
        .single();

      const currentSettings = (current?.setting_value as CacheSettings) || {
        last_cleared: null,
        clear_count: 0,
        cleared_by: null,
      };

      // Update cache settings with new clear timestamp
      const newSettings: CacheSettings = {
        last_cleared: new Date().toISOString(),
        clear_count: (currentSettings.clear_count || 0) + 1,
        cleared_by: userEmail,
      };

      await updateAdminSetting(SETTINGS_KEYS.cacheSettings, newSettings);

      // Log the action
      await logAdminActivity('clear_cache', 'admin_setting', SETTINGS_KEYS.cacheSettings, {
        clear_count: newSettings.clear_count,
      });
    },
    onSuccess: () => {
      // Clear and refetch after confirmed DB write
      queryClient.clear();
      queryClient.invalidateQueries();
    },
  });

  return {
    clearCache: clearCacheMutation.mutateAsync,
    isClearing: clearCacheMutation.isPending,
  };
}

export function useApiKeyRotation() {
  const { isFounder } = useAdmin();
  const queryClient = useQueryClient();

  const rotateMutation = useMutation({
    mutationFn: async () => {
      if (!isFounder) {
        throw new Error('Only the founder can rotate API keys');
      }

      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email || 'unknown';

      // Get current API key settings
      const { data: current } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', SETTINGS_KEYS.apiKeys)
        .single();

      const currentSettings = (current?.setting_value as ApiKeySettings) || {
        last_rotated: null,
        rotation_count: 0,
        rotated_by: null,
      };

      // Update rotation tracking
      const newSettings: ApiKeySettings = {
        last_rotated: new Date().toISOString(),
        rotation_count: (currentSettings.rotation_count || 0) + 1,
        rotated_by: userEmail,
      };

      await updateAdminSetting(SETTINGS_KEYS.apiKeys, newSettings);

      // Log the action
      await logAdminActivity('rotate_api_keys', 'admin_setting', SETTINGS_KEYS.apiKeys, {
        rotation_count: newSettings.rotation_count,
      });

      // Note: Actual API key rotation would happen in Supabase dashboard
      // This just tracks the intent/request
      return newSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.apiKeys() });
    },
  });

  return {
    rotateApiKeys: rotateMutation.mutateAsync,
    isRotating: rotateMutation.isPending,
  };
}
