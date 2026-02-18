/**
 * Admin Dashboard API Service
 * 
 * Supabase-backed service for all admin dashboard operations.
 * This replaces localStorage-based admin management.
 */

import { supabase } from '@/integrations/supabase/client';

// Types
export interface PlatformAdmin {
  id: string;
  email: string;
  role: 'founder' | 'admin' | 'moderator';
  name: string | null;
  added_by: string;
  added_at: string;
  is_active: boolean;
  permissions: Record<string, unknown>;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemAlert {
  id: string;
  alert_type: 'warning' | 'info' | 'error' | 'success';
  title: string;
  message: string;
  action_label: string | null;
  action_route: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  auto_generated: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  expires_at: string | null;
}

export interface AdminKPIs {
  total_users: number;
  active_users_7d: number;
  active_users_30d: number;
  total_students: number;
  total_alumni: number;
  total_faculty: number;
  total_clubs: number;
  verified_clubs: number;
  total_colleges: number;
  total_posts: number;
  posts_this_week: number;
  total_events: number;
  upcoming_events: number;
  total_projects: number;
  active_projects: number;
  total_connections: number;
  total_recruiters: number;
  active_recruiters: number;
  generated_at: string;
}

export interface CollegeStats {
  college_domain: string;
  total_users: number;
  student_count: number;
  alumni_count: number;
  faculty_count: number;
  club_count: number;
  event_count: number;
  post_count: number;
  active_users_7d: number;
  first_user_at: string;
  latest_user_at: string;
}

export interface DomainStats {
  domain: string;
  canonical_domain: string | null;
  user_count: number;
  first_seen: string;
  last_seen: string;
  status: 'aliased' | 'verified' | 'unknown';
}

export interface UserGrowth {
  date: string;
  signups: number;
  student_signups: number;
  alumni_signups: number;
  faculty_signups: number;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  college_domain: string | null;
  graduation_year: number | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  skills: string[] | null;
}

export interface RecruiterAccount {
  id: string;
  company_name: string;
  contact_email: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  plan_type: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'pending' | 'cancelled';
  active_searches: number;
  messages_sent: number;
  conversion_rate: number;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  subscription_price: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AdminActivityLog {
  id: string;
  admin_email: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export const FOUNDER_EMAIL = '2005ganesh16@gmail.com';

// ============================================================================
// PLATFORM ADMINS
// ============================================================================

/**
 * Get all platform admins
 */
export async function getPlatformAdmins(): Promise<PlatformAdmin[]> {
  const { data, error } = await supabase
    .from('platform_admins')
    .select('*')
    .order('role', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching platform admins:', error);
    throw error;
  }

  return data || [];
}

/**
 * Check if current user is a platform admin
 */
export async function checkIsAdmin(): Promise<{ isAdmin: boolean; isFounder: boolean; adminUser: PlatformAdmin | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user?.email) {
    return { isAdmin: false, isFounder: false, adminUser: null };
  }

  const { data, error } = await supabase
    .from('platform_admins')
    .select('*')
    .eq('email', session.user.email.toLowerCase())
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return { isAdmin: false, isFounder: false, adminUser: null };
  }

  return {
    isAdmin: true,
    isFounder: data.role === 'founder',
    adminUser: data,
  };
}

/**
 * Add a new platform admin (founder only)
 */
export async function addPlatformAdmin(
  email: string,
  name: string,
  role: 'admin' | 'moderator' = 'admin'
): Promise<PlatformAdmin> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user?.email) {
    throw new Error('Not authenticated');
  }

  const normalizedEmail = email.toLowerCase().trim();

  const { data: existing, error: existingError } = await supabase
    .from('platform_admins')
    .select('id, is_active')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('Error checking platform admin:', existingError);
    throw existingError;
  }

  if (existing?.is_active) {
    throw new Error('User is already an admin');
  }

  const { data, error } = await supabase
    .from('platform_admins')
    .upsert({
      email: normalizedEmail,
      name,
      role,
      added_by: session.user.email,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' })
    .select()
    .single();

  if (error) {
    console.error('Error adding platform admin:', error);
    throw error;
  }

  // Log the action
  await logAdminActivity('add_admin', 'platform_admin', data.id, {
    email: normalizedEmail,
    role,
    reactivated: Boolean(existing && !existing.is_active),
  });

  return data;
}

/**
 * Remove a platform admin (founder only)
 */
export async function removePlatformAdmin(email: string): Promise<void> {
  if (email.toLowerCase() === FOUNDER_EMAIL.toLowerCase()) {
    throw new Error('Cannot remove the founder');
  }

  const { error } = await supabase
    .from('platform_admins')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('email', email.toLowerCase());

  if (error) {
    console.error('Error removing platform admin:', error);
    throw error;
  }

  // Log the action
  await logAdminActivity('remove_admin', 'platform_admin', null, { email });
}

/**
 * Update admin last login
 */
export async function updateAdminLastLogin(email: string): Promise<void> {
  await supabase
    .from('platform_admins')
    .update({ last_login_at: new Date().toISOString() })
    .eq('email', email.toLowerCase());
}

// ============================================================================
// ADMIN KPIs & ANALYTICS
// ============================================================================

/**
 * Get admin dashboard KPIs
 */
export async function getAdminKPIs(): Promise<AdminKPIs> {
  const { data, error } = await supabase
    .from('admin_dashboard_kpis')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Error fetching admin KPIs:', error);
    throw error;
  }

  return data || {
    total_users: 0,
    active_users_7d: 0,
    active_users_30d: 0,
    total_students: 0,
    total_alumni: 0,
    total_faculty: 0,
    total_clubs: 0,
    verified_clubs: 0,
    total_colleges: 0,
    total_posts: 0,
    posts_this_week: 0,
    total_events: 0,
    upcoming_events: 0,
    total_projects: 0,
    active_projects: 0,
    total_connections: 0,
    total_recruiters: 0,
    active_recruiters: 0,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Get college statistics
 */
export async function getCollegeStats(): Promise<CollegeStats[]> {
  const { data, error } = await supabase.rpc('get_admin_college_stats');

  if (error) {
    console.error('Error fetching college stats:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get domain statistics
 */
export async function getDomainStats(): Promise<DomainStats[]> {
  const { data, error } = await supabase.rpc('get_admin_domain_stats');

  if (error) {
    console.error('Error fetching domain stats:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get user growth data
 */
export async function getUserGrowth(daysBack: number = 90): Promise<UserGrowth[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (daysBack - 1));

  const { data, error } = await supabase
    .from('admin_user_growth')
    .select('date, signups, student_signups, alumni_signups, faculty_signups')
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching user growth:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get admin users list
 */
export async function getAdminUsers(params: {
  role?: string;
  collegeDomain?: string;
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('get_admin_users', {
    p_role: params.role || null,
    p_college_domain: params.collegeDomain || null,
    p_status: params.status || null,
    p_limit: params.limit || 50,
    p_offset: params.offset || 0,
  });

  if (error) {
    console.error('Error fetching admin users:', error);
    throw error;
  }

  return data || [];
}

// ============================================================================
// SYSTEM ALERTS
// ============================================================================

/**
 * Get system alerts
 */
export async function getSystemAlerts(includeRead: boolean = false): Promise<SystemAlert[]> {
  let query = supabase
    .from('system_alerts')
    .select('*')
    .eq('is_dismissed', false)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!includeRead) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching system alerts:', error);
    throw error;
  }

  return data || [];
}

/**
 * Mark alert as read
 */
export async function markAlertRead(alertId: string): Promise<void> {
  const { error } = await supabase
    .from('system_alerts')
    .update({ is_read: true })
    .eq('id', alertId);

  if (error) {
    console.error('Error marking alert as read:', error);
    throw error;
  }
}

/**
 * Dismiss alert
 */
export async function dismissAlert(alertId: string): Promise<void> {
  const { error } = await supabase
    .from('system_alerts')
    .update({ is_dismissed: true })
    .eq('id', alertId);

  if (error) {
    console.error('Error dismissing alert:', error);
    throw error;
  }
}

/**
 * Create system alert
 */
export async function createSystemAlert(alert: {
  alert_type: SystemAlert['alert_type'];
  title: string;
  message: string;
  action_label?: string;
  action_route?: string;
  auto_generated?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<SystemAlert> {
  const { data, error } = await supabase
    .from('system_alerts')
    .insert({
      ...alert,
      is_read: false,
      is_dismissed: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating system alert:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// RECRUITER ACCOUNTS
// ============================================================================

/**
 * Get all recruiter accounts
 */
export async function getRecruiterAccounts(params: {
  status?: string;
  planType?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<RecruiterAccount[]> {
  let query = supabase
    .from('recruiter_accounts')
    .select('*')
    .order('created_at', { ascending: false });

  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.planType) {
    query = query.eq('plan_type', params.planType);
  }
  if (params.limit) {
    query = query.limit(params.limit);
  }
  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recruiter accounts:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get recruiter account by ID
 */
export async function getRecruiterAccount(id: string): Promise<RecruiterAccount | null> {
  const { data, error } = await supabase
    .from('recruiter_accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching recruiter account:', error);
    throw error;
  }

  return data;
}

/**
 * Update recruiter account status
 */
export async function updateRecruiterStatus(
  id: string,
  status: RecruiterAccount['status']
): Promise<RecruiterAccount> {
  const { data, error } = await supabase
    .from('recruiter_accounts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating recruiter status:', error);
    throw error;
  }

  // Log the action
  await logAdminActivity('update_recruiter_status', 'recruiter_account', id, { status });

  return data;
}

/**
 * Update recruiter plan
 */
export async function updateRecruiterPlan(
  id: string,
  planType: RecruiterAccount['plan_type'],
  subscriptionDetails?: {
    start_date: string;
    end_date: string;
    price: number;
  }
): Promise<RecruiterAccount> {
  const updateData: Partial<RecruiterAccount> & { updated_at: string } = {
    plan_type: planType,
    updated_at: new Date().toISOString(),
  };

  if (subscriptionDetails) {
    updateData.subscription_start_date = subscriptionDetails.start_date;
    updateData.subscription_end_date = subscriptionDetails.end_date;
    updateData.subscription_price = subscriptionDetails.price;
  }

  const { data, error } = await supabase
    .from('recruiter_accounts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating recruiter plan:', error);
    throw error;
  }

  // Log the action
  await logAdminActivity('update_recruiter_plan', 'recruiter_account', id, { planType });

  return data;
}

// ============================================================================
// ADMIN SETTINGS
// ============================================================================

/**
 * Get admin setting by key
 */
export async function getAdminSetting<T = unknown>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('setting_value')
    .eq('setting_key', key)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching admin setting:', error);
    throw error;
  }

  return data?.setting_value as T;
}

/**
 * Update admin setting
 */
export async function updateAdminSetting(key: string, value: unknown): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  const { error } = await supabase
    .from('admin_settings')
    .upsert({
      setting_key: key,
      setting_value: value,
      updated_by: session?.user?.email || 'unknown',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'setting_key',
    });

  if (error) {
    console.error('Error updating admin setting:', error);
    throw error;
  }

  // Log the action
  await logAdminActivity('update_setting', 'admin_setting', key, { value });
}

// ============================================================================
// ACTIVITY LOGGING
// ============================================================================

/**
 * Log admin activity
 */
export async function logAdminActivity(
  actionType: string,
  targetType?: string,
  targetId?: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user?.email) return;

  await supabase
    .from('admin_activity_logs')
    .insert({
      admin_email: session.user.email,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      details: details || {},
    });
}

/**
 * Get admin activity logs
 */
export async function getAdminActivityLogs(params: {
  adminEmail?: string;
  actionType?: string;
  limit?: number;
} = {}): Promise<AdminActivityLog[]> {
  let query = supabase
    .from('admin_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.limit || 100);

  if (params.adminEmail) {
    query = query.eq('admin_email', params.adminEmail);
  }
  if (params.actionType) {
    query = query.eq('action_type', params.actionType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching admin activity logs:', error);
    throw error;
  }

  return data || [];
}

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to platform admins changes
 */
export function subscribeToPlatformAdmins(
  callback: (payload: { eventType: string; new: PlatformAdmin | null; old: PlatformAdmin | null }) => void
) {
  return supabase
    .channel('platform_admins_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'platform_admins' },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new as PlatformAdmin | null,
          old: payload.old as PlatformAdmin | null,
        });
      }
    )
    .subscribe();
}

/**
 * Subscribe to system alerts changes
 */
export function subscribeToSystemAlerts(
  callback: (payload: { eventType: string; new: SystemAlert | null; old: SystemAlert | null }) => void
) {
  return supabase
    .channel('system_alerts_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'system_alerts' },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new as SystemAlert | null,
          old: payload.old as SystemAlert | null,
        });
      }
    )
    .subscribe();
}

/**
 * Subscribe to recruiter accounts changes
 */
export function subscribeToRecruiterAccounts(
  callback: (payload: { eventType: string; new: RecruiterAccount | null; old: RecruiterAccount | null }) => void
) {
  return supabase
    .channel('recruiter_accounts_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'recruiter_accounts' },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new as RecruiterAccount | null,
          old: payload.old as RecruiterAccount | null,
        });
      }
    )
    .subscribe();
}
