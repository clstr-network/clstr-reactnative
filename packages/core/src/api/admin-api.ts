/**
 * Admin Dashboard API — @clstr/core
 *
 * Platform-agnostic admin CRUD. Every function receives a SupabaseClient as
 * its first parameter instead of importing the singleton.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

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
  last_seen: string | null;
}

export interface RecruiterAccount {
  id: string;
  email: string;
  company_name: string;
  contact_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  jobs_posted: number;
  jobs_limit: number;
  created_at: string;
  approved_at: string | null;
}

export interface AdminActivityLog {
  id: string;
  admin_email: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export const FOUNDER_EMAIL = 'founder@clstr.network';

// ─── Admin Management ────────────────────────────────────────────────────────

export async function getPlatformAdmins(client: SupabaseClient): Promise<PlatformAdmin[]> {
  const { data, error } = await client
    .from('platform_admins')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get platform admins:', error);
    throw error;
  }
  return (data || []) as PlatformAdmin[];
}

export async function checkIsAdmin(client: SupabaseClient, email: string): Promise<boolean> {
  const { data, error } = await client
    .from('platform_admins')
    .select('id, is_active')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (error) {
    console.error('Failed to check admin status:', error);
    return false;
  }
  return data?.is_active === true;
}

export async function addPlatformAdmin(
  client: SupabaseClient,
  params: {
    email: string;
    role: 'admin' | 'moderator';
    name?: string;
    addedBy: string;
  }
): Promise<PlatformAdmin> {
  const { data, error } = await client
    .from('platform_admins')
    .insert({
      email: params.email.toLowerCase().trim(),
      role: params.role,
      name: params.name || null,
      added_by: params.addedBy,
      is_active: true,
      permissions: {},
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to add platform admin:', error);
    throw error;
  }
  return data as PlatformAdmin;
}

export async function removePlatformAdmin(
  client: SupabaseClient,
  adminId: string
): Promise<void> {
  const { error } = await client
    .from('platform_admins')
    .update({ is_active: false })
    .eq('id', adminId);

  if (error) {
    console.error('Failed to remove platform admin:', error);
    throw error;
  }
}

export async function updateAdminLastLogin(
  client: SupabaseClient,
  email: string
): Promise<void> {
  const { error } = await client
    .from('platform_admins')
    .update({ last_login_at: new Date().toISOString() })
    .eq('email', email.toLowerCase().trim());

  if (error) {
    console.error('Failed to update admin last login:', error);
  }
}

// ─── KPIs & Stats ────────────────────────────────────────────────────────────

export async function getAdminKPIs(client: SupabaseClient): Promise<AdminKPIs> {
  const { data, error } = await (client.rpc as any)('get_admin_kpis');
  if (error) {
    console.error('Failed to get admin KPIs:', error);
    throw error;
  }
  return data as AdminKPIs;
}

export async function getCollegeStats(client: SupabaseClient): Promise<CollegeStats[]> {
  const { data, error } = await (client.rpc as any)('get_college_stats');
  if (error) {
    console.error('Failed to get college stats:', error);
    throw error;
  }
  return (data || []) as CollegeStats[];
}

export async function getDomainStats(client: SupabaseClient): Promise<DomainStats[]> {
  const { data, error } = await (client.rpc as any)('get_domain_stats');
  if (error) {
    console.error('Failed to get domain stats:', error);
    throw error;
  }
  return (data || []) as DomainStats[];
}

export async function getUserGrowth(
  client: SupabaseClient,
  days = 30
): Promise<UserGrowth[]> {
  const { data, error } = await (client.rpc as any)('get_user_growth', { p_days: days });
  if (error) {
    console.error('Failed to get user growth:', error);
    throw error;
  }
  return (data || []) as UserGrowth[];
}

// ─── User Management ─────────────────────────────────────────────────────────

export async function getAdminUsers(
  client: SupabaseClient,
  params: {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: string;
    collegeDomain?: string;
  } = {}
): Promise<{ users: AdminUser[]; total: number }> {
  const { page = 1, pageSize = 50, search, role, collegeDomain } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, college_domain, graduation_year, is_verified, created_at, last_seen', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (role) {
    query = query.eq('role', role);
  }
  if (collegeDomain) {
    query = query.eq('college_domain', collegeDomain);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error('Failed to get admin users:', error);
    throw error;
  }
  return {
    users: (data || []) as AdminUser[],
    total: count || 0,
  };
}

// ─── System Alerts ───────────────────────────────────────────────────────────

export async function getSystemAlerts(client: SupabaseClient): Promise<SystemAlert[]> {
  const { data, error } = await client
    .from('system_alerts')
    .select('*')
    .eq('is_dismissed', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get system alerts:', error);
    throw error;
  }
  return (data || []) as SystemAlert[];
}

export async function markAlertRead(
  client: SupabaseClient,
  alertId: string
): Promise<void> {
  const { error } = await client
    .from('system_alerts')
    .update({ is_read: true })
    .eq('id', alertId);

  if (error) {
    console.error('Failed to mark alert as read:', error);
    throw error;
  }
}

export async function dismissAlert(
  client: SupabaseClient,
  alertId: string
): Promise<void> {
  const { error } = await client
    .from('system_alerts')
    .update({ is_dismissed: true })
    .eq('id', alertId);

  if (error) {
    console.error('Failed to dismiss alert:', error);
    throw error;
  }
}

export async function createSystemAlert(
  client: SupabaseClient,
  alert: {
    alert_type: SystemAlert['alert_type'];
    title: string;
    message: string;
    action_label?: string;
    action_route?: string;
    metadata?: Record<string, unknown>;
    expires_at?: string;
  }
): Promise<SystemAlert> {
  const { data, error } = await client
    .from('system_alerts')
    .insert({
      alert_type: alert.alert_type,
      title: alert.title,
      message: alert.message,
      action_label: alert.action_label || null,
      action_route: alert.action_route || null,
      metadata: alert.metadata || {},
      auto_generated: false,
      expires_at: alert.expires_at || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create system alert:', error);
    throw error;
  }
  return data as SystemAlert;
}

// ─── Recruiter Management ────────────────────────────────────────────────────

export async function getRecruiterAccounts(client: SupabaseClient): Promise<RecruiterAccount[]> {
  const { data, error } = await client
    .from('recruiter_accounts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get recruiter accounts:', error);
    throw error;
  }
  return (data || []) as RecruiterAccount[];
}

export async function getRecruiterAccount(
  client: SupabaseClient,
  id: string
): Promise<RecruiterAccount | null> {
  const { data, error } = await client
    .from('recruiter_accounts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Failed to get recruiter account:', error);
    throw error;
  }
  return data as RecruiterAccount | null;
}

export async function updateRecruiterStatus(
  client: SupabaseClient,
  id: string,
  status: RecruiterAccount['status']
): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (status === 'approved') {
    updates.approved_at = new Date().toISOString();
  }

  const { error } = await client
    .from('recruiter_accounts')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Failed to update recruiter status:', error);
    throw error;
  }
}

export async function updateRecruiterPlan(
  client: SupabaseClient,
  id: string,
  plan: RecruiterAccount['plan'],
  jobsLimit: number
): Promise<void> {
  const { error } = await client
    .from('recruiter_accounts')
    .update({ plan, jobs_limit: jobsLimit })
    .eq('id', id);

  if (error) {
    console.error('Failed to update recruiter plan:', error);
    throw error;
  }
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getAdminSetting(
  client: SupabaseClient,
  key: string
): Promise<unknown> {
  const { data, error } = await client
    .from('admin_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error(`Failed to get admin setting ${key}:`, error);
    return null;
  }
  return data?.value ?? null;
}

export async function updateAdminSetting(
  client: SupabaseClient,
  key: string,
  value: unknown
): Promise<void> {
  const { error } = await client
    .from('admin_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) {
    console.error(`Failed to update admin setting ${key}:`, error);
    throw error;
  }
}

// ─── Activity Logs ───────────────────────────────────────────────────────────

export async function logAdminActivity(
  client: SupabaseClient,
  params: {
    adminEmail: string;
    action: string;
    targetType?: string;
    targetId?: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await client
    .from('admin_activity_logs')
    .insert({
      admin_email: params.adminEmail,
      action: params.action,
      target_type: params.targetType || null,
      target_id: params.targetId || null,
      details: params.details || {},
    });

  if (error) {
    console.error('Failed to log admin activity:', error);
  }
}

export async function getAdminActivityLogs(
  client: SupabaseClient,
  params: { limit?: number; adminEmail?: string } = {}
): Promise<AdminActivityLog[]> {
  const { limit = 100, adminEmail } = params;

  let query = client
    .from('admin_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (adminEmail) {
    query = query.eq('admin_email', adminEmail);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to get admin activity logs:', error);
    throw error;
  }
  return (data || []) as AdminActivityLog[];
}

// ─── Real-time Subscriptions ─────────────────────────────────────────────────

export function subscribeToPlatformAdmins(
  client: SupabaseClient,
  callback: (payload: any) => void
) {
  return client
    .channel('platform_admins_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_admins' }, callback)
    .subscribe();
}

export function subscribeToSystemAlerts(
  client: SupabaseClient,
  callback: (payload: any) => void
) {
  return client
    .channel('system_alerts_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'system_alerts' }, callback)
    .subscribe();
}

export function subscribeToRecruiterAccounts(
  client: SupabaseClient,
  callback: (payload: any) => void
) {
  return client
    .channel('recruiter_accounts_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'recruiter_accounts' }, callback)
    .subscribe();
}
