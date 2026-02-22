/**
 * Notifications API adapter for mobile.
 *
 * @clstr/core does not export notification functions, so we use direct
 * Supabase queries following the same patterns as the rest of the API layer.
 */

import { supabase } from '@/lib/adapters/core-client';

// Cast to any for direct table queries (Database type uses GenericTable)
const db = supabase as any;

// ─── Types ────────────────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────

async function getAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not authenticated');
  return user;
}

// ─── Queries ──────────────────────────────────────────────────

export async function getNotifications(): Promise<Notification[]> {
  const user = await getAuthUser();

  const { data, error } = await db
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as Notification[];
}

// ─── Mutations ────────────────────────────────────────────────

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await getAuthUser();

  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) throw error;
}
