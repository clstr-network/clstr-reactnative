/**
 * Events API adapter — Event CRUD, registration, sharing, listing.
 * Binds @clstr/core events-api functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
import { supabase } from '../adapters/core-client';
import {
  getEventByIdPublic as _getEventByIdPublic,
  getEventById as _getEventById,
  registerForEvent as _registerForEvent,
  unregisterFromEvent as _unregisterFromEvent,
  trackExternalRegistrationClick as _trackExternalRegistrationClick,
  shareEvent as _shareEvent,
  shareEventToMultiple as _shareEventToMultiple,
  recordEventLinkCopy as _recordEventLinkCopy,
  getConnectionsForSharing as _getConnectionsForSharing,
  deleteEvent as _deleteEvent,
  updateEvent as _updateEvent,
  parseEventTime,
  extractEventType,
  normalizeCreator,
} from '@clstr/core/api/events-api';

// Re-export types + pure helpers
export type {
  EventCreator,
  Event,
  EventShare,
  UpdateEventInput,
  ConnectionUser,
  ShareEventDeps,
} from '@clstr/core/api/events-api';

export { parseEventTime, extractEventType, normalizeCreator };

// Bound API functions
export const getEventByIdPublic = withClient(_getEventByIdPublic);
export const getEventById = withClient(_getEventById);
export const registerForEvent = withClient(_registerForEvent);
export const unregisterFromEvent = withClient(_unregisterFromEvent);
export const trackExternalRegistrationClick = withClient(_trackExternalRegistrationClick);
export const shareEvent = withClient(_shareEvent);
export const shareEventToMultiple = withClient(_shareEventToMultiple);
export const recordEventLinkCopy = withClient(_recordEventLinkCopy);
export const getConnectionsForSharing = withClient(_getConnectionsForSharing);
export const deleteEvent = withClient(_deleteEvent);
export const updateEvent = withClient(_updateEvent);

// ─── Custom functions (not in @clstr/core) ──────────────────────

/**
 * List all events for the current user's college domain,
 * enriched with registration counts and the user's own RSVP status.
 */
export async function getEvents() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Cast to any for direct table queries (Database type uses GenericTable)
  const db = supabase as any;

  // Get user's college domain
  const { data: profile } = await db
    .from('profiles')
    .select('college_domain')
    .eq('id', user.id)
    .maybeSingle();

  let query = db
    .from('events')
    .select('*, creator:profiles!creator_id(id, full_name, avatar_url, role)')
    .order('event_date', { ascending: true });

  if (profile?.college_domain) {
    query = query.eq('college_domain', profile.college_domain);
  }

  const { data: events, error } = await query;
  if (error) throw error;
  if (!events || events.length === 0) return [];

  const eventIds = events.map((e: any) => e.id);
  const [regResult, userRegs] = await Promise.all([
    db.from('event_registrations').select('event_id').in('event_id', eventIds),
    db.from('event_registrations').select('event_id').eq('user_id', user.id).in('event_id', eventIds),
  ]);

  const regCounts = new Map<string, number>();
  for (const r of regResult.data ?? []) regCounts.set((r as any).event_id, (regCounts.get((r as any).event_id) || 0) + 1);
  const userRegSet = new Set((userRegs.data ?? []).map((r: any) => r.event_id));

  return events.map((event: any) => ({
    ...event,
    is_registered: userRegSet.has(event.id),
    attendees_count: regCounts.get(event.id) ?? 0,
  }));
}

/**
 * Create a new event for the current user's college domain.
 * @clstr/core doesn't export a createEvent function, so this is a custom adapter
 * matching the same pattern as getEvents above.
 */
export async function createEvent(input: {
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  location?: string;
  is_virtual?: boolean;
  category?: string;
  max_attendees?: number;
  external_registration_link?: string;
  tags?: string[];
  registration_required?: boolean;
  registration_deadline?: string;
  virtual_link?: string;
  cover_image_url?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const db = supabase as any;

  // Get user's college domain
  const { data: profile } = await db
    .from('profiles')
    .select('college_domain')
    .eq('id', user.id)
    .maybeSingle();

  const { data, error } = await db
    .from('events')
    .insert({
      title: input.title,
      description: input.description ?? null,
      event_date: input.event_date,
      event_time: input.event_time ?? null,
      location: input.location ?? null,
      is_virtual: input.is_virtual ?? false,
      category: input.category ?? null,
      max_attendees: input.max_attendees ?? null,
      external_registration_link: input.external_registration_link ?? null,
      tags: input.tags ?? null,
      registration_required: input.registration_required ?? false,
      registration_deadline: input.registration_deadline ?? null,
      virtual_link: input.virtual_link ?? null,
      cover_image_url: input.cover_image_url ?? null,
      creator_id: user.id,
      college_domain: profile?.college_domain ?? null,
    })
    .select('*, creator:profiles!creator_id(id, full_name, avatar_url, role)')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Toggle RSVP for an event — register if not registered, unregister if already registered.
 */
export async function toggleEventRegistration(eventId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const db = supabase as any;

  const { data: existing } = await db
    .from('event_registrations')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await db.from('event_registrations').delete().eq('id', existing.id);
    if (error) throw error;
    return { registered: false };
  } else {
    const { error } = await db.from('event_registrations').insert({ event_id: eventId, user_id: user.id });
    if (error) throw error;
    return { registered: true };
  }
}
