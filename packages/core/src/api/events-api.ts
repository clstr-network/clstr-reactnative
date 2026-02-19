/**
 * Events API — shared, platform-agnostic module.
 *
 * Conventions:
 *  • Every Supabase-touching function receives `client` as its first arg.
 *  • `handleApiError` → `createAppError`.
 *  • `window.location.origin` → `appUrl` parameter.
 *  • `sendMessage` from messages-api → dependency-injected via `deps`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { assertValidUuid } from "../utils/uuid";
import { createAppError } from "../errors";

// ============================================================================
// TYPES
// ============================================================================

export interface EventCreator {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

export interface Event {
  id: string;
  creator_id: string;
  college_domain: string | null;
  title: string;
  description: string | null;
  category: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  is_virtual: boolean;
  virtual_link: string | null;
  cover_image_url: string | null;
  max_attendees: number | null;
  registration_required: boolean;
  registration_deadline: string | null;
  tags: string[] | null;
  external_registration_link: string | null;
  registration_click_count: number;
  created_at: string;
  updated_at: string;
  // Computed fields
  creator?: EventCreator;
  is_registered?: boolean;
  attendees_count?: number;
  start_time?: string | null;
  end_time?: string | null;
  event_type?: string | null;
}

export interface EventShare {
  id: string;
  event_id: string;
  user_id: string;
  share_type: "dm" | "link";
  receiver_id: string | null;
  created_at: string;
}

export interface UpdateEventInput {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  is_virtual: boolean;
  virtual_link: string | null;
  category: string | null;
  max_attendees: number | null;
  registration_required: boolean;
  registration_deadline: string | null;
  tags: string[] | null;
  external_registration_link: string | null;
}

export interface ConnectionUser {
  id: string;
  full_name: string;
  avatar_url: string;
  role: string;
}

export interface Connection {
  id: string;
  requester_id: string;
  receiver_id: string;
  requester?: ConnectionUser;
  receiver?: ConnectionUser;
}

// ============================================================================
// HELPERS (pure — no web APIs)
// ============================================================================

const getAuthenticatedUserId = async (client: SupabaseClient): Promise<string> => {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) throw error;
  if (!user?.id) throw new Error("User not authenticated");

  assertValidUuid(user.id, "userId");
  return user.id;
};

export const parseEventTime = (
  eventTime: string | null | undefined,
): { start_time: string | null; end_time: string | null } => {
  if (!eventTime) return { start_time: null, end_time: null };
  const parts = eventTime.split("-").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { start_time: null, end_time: null };
  if (parts.length === 1) return { start_time: parts[0], end_time: null };
  return { start_time: parts[0], end_time: parts.slice(1).join(" - ") };
};

export const extractEventType = (tags: string[] | null | undefined): string | null => {
  const typeTag = (tags ?? []).find(
    (t) => typeof t === "string" && t.toLowerCase().startsWith("type:"),
  );
  if (!typeTag) return null;
  const value = typeTag.slice("type:".length).trim();
  return value || null;
};

export const normalizeCreator = (creatorData: unknown): EventCreator | undefined => {
  if (
    creatorData &&
    typeof creatorData === "object" &&
    !("error" in creatorData) &&
    "id" in creatorData
  ) {
    const { id, full_name, avatar_url, role } = creatorData as EventCreator;
    return {
      id,
      full_name: full_name ?? null,
      avatar_url: avatar_url ?? null,
      role: role ?? "Student",
    };
  }
  return undefined;
};

// ============================================================================
// PUBLIC EVENT FETCHING (No Auth Required)
// ============================================================================

export async function getEventByIdPublic(
  client: SupabaseClient,
  eventId: string,
): Promise<Event | null> {
  assertValidUuid(eventId, "eventId");

  try {
    const { data, error } = await client
      .from("events")
      .select(`*, creator:profiles!events_creator_id_fkey(id, full_name, avatar_url, role)`)
      .eq("id", eventId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    if (!data) return null;

    const { start_time, end_time } = parseEventTime(data.event_time);

    const { count: attendeesCount } = await client
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .neq("status", "cancelled");

    return {
      ...data,
      creator: normalizeCreator(data.creator),
      is_registered: false,
      start_time,
      end_time,
      event_type: extractEventType(data.tags),
      attendees_count: attendeesCount ?? 0,
      registration_click_count: data.registration_click_count ?? 0,
    };
  } catch (error) {
    throw createAppError("Failed to load event", "getEventByIdPublic", error);
  }
}

// ============================================================================
// AUTHENTICATED EVENT FETCHING
// ============================================================================

export async function getEventById(
  client: SupabaseClient,
  eventId: string,
): Promise<Event | null> {
  assertValidUuid(eventId, "eventId");

  try {
    const userId = await getAuthenticatedUserId(client);

    const { data, error } = await client
      .from("events")
      .select(`*, creator:profiles!events_creator_id_fkey(id, full_name, avatar_url, role)`)
      .eq("id", eventId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    if (!data) return null;

    const { start_time, end_time } = parseEventTime(data.event_time);

    const { data: registration } = await client
      .from("event_registrations")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle();

    const { count: attendeesCount } = await client
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .neq("status", "cancelled");

    return {
      ...data,
      creator: normalizeCreator(data.creator),
      is_registered: !!registration && registration.status !== "cancelled",
      start_time,
      end_time,
      event_type: extractEventType(data.tags),
      attendees_count: attendeesCount ?? 0,
      registration_click_count: data.registration_click_count ?? 0,
    };
  } catch (error) {
    throw createAppError("Failed to load event", "getEventById", error);
  }
}

// ============================================================================
// EVENT REGISTRATION
// ============================================================================

export async function registerForEvent(
  client: SupabaseClient,
  eventId: string,
): Promise<{ success: boolean }> {
  assertValidUuid(eventId, "eventId");

  try {
    const userId = await getAuthenticatedUserId(client);

    const { data: profile } = await client
      .from("profiles")
      .select("college_domain")
      .eq("id", userId)
      .single();

    const { error } = await client.from("event_registrations").insert({
      event_id: eventId,
      user_id: userId,
      college_domain: profile?.college_domain ?? null,
      status: "confirmed",
    });

    if (error) {
      if (error.code === "23505") return { success: true };
      throw error;
    }

    return { success: true };
  } catch (error) {
    throw createAppError("Failed to register for event", "registerForEvent", error);
  }
}

export async function unregisterFromEvent(
  client: SupabaseClient,
  eventId: string,
): Promise<{ success: boolean }> {
  assertValidUuid(eventId, "eventId");

  try {
    const userId = await getAuthenticatedUserId(client);

    const { error } = await client
      .from("event_registrations")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    throw createAppError("Failed to unregister from event", "unregisterFromEvent", error);
  }
}

export async function trackExternalRegistrationClick(
  client: SupabaseClient,
  eventId: string,
): Promise<void> {
  assertValidUuid(eventId, "eventId");

  try {
    await client.rpc("increment_event_registration_click", { event_id_param: eventId });
  } catch (error) {
    console.warn("Failed to track registration click:", error);
  }
}

// ============================================================================
// EVENT SHARING
// ============================================================================

/**
 * Dependencies injected by the platform adapter so we avoid direct import
 * of web-only APIs (`window.location`) and cross-module singletons.
 */
export interface ShareEventDeps {
  sendMessage: (client: SupabaseClient, receiverId: string, content: string) => Promise<unknown>;
  appUrl: string;
}

export async function shareEvent(
  client: SupabaseClient,
  deps: ShareEventDeps,
  params: { event_id: string; receiver_id: string; message?: string },
): Promise<{ success: boolean }> {
  assertValidUuid(params.event_id, "eventId");
  assertValidUuid(params.receiver_id, "receiverId");

  try {
    const userId = await getAuthenticatedUserId(client);

    const event = await getEventById(client, params.event_id);
    if (!event) throw new Error("Event not found");

    const eventUrl = `${deps.appUrl}/event/${params.event_id}`;
    const eventDate = new Date(event.event_date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    let messageContent = params.message ? `${params.message}\n\n` : "";
    messageContent += `📅 Event Shared\n`;
    messageContent += `━━━━━━━━━━━━━━━\n`;
    messageContent += `${event.title}\n`;
    messageContent += `📆 ${eventDate}`;
    if (event.start_time) messageContent += ` at ${event.start_time}`;
    messageContent += `\n`;
    if (event.location && !event.is_virtual) messageContent += `📍 ${event.location}\n`;
    if (event.is_virtual) messageContent += `💻 Virtual Event\n`;
    messageContent += `━━━━━━━━━━━━━━━\n`;
    messageContent += `View Event: ${eventUrl}`;

    await deps.sendMessage(client, params.receiver_id, messageContent);

    const { error: shareError } = await client.from("event_shares").insert({
      event_id: params.event_id,
      user_id: userId,
      share_type: "dm",
      receiver_id: params.receiver_id,
    });

    if (shareError && shareError.code !== "42P01") {
      console.warn("Failed to record event share:", shareError);
    }

    return { success: true };
  } catch (error) {
    throw createAppError("Failed to share event", "shareEvent", error);
  }
}

export async function shareEventToMultiple(
  client: SupabaseClient,
  deps: ShareEventDeps,
  params: { event_id: string; receiver_ids: string[]; message?: string },
): Promise<{ sent: number; failed: number }> {
  assertValidUuid(params.event_id, "eventId");
  if (!params.receiver_ids || params.receiver_ids.length === 0) {
    throw new Error("At least one recipient is required");
  }
  params.receiver_ids.forEach((id, idx) => assertValidUuid(id, `receiverId[${idx}]`));

  const results = await Promise.allSettled(
    params.receiver_ids.map((receiver_id) =>
      shareEvent(client, deps, {
        event_id: params.event_id,
        receiver_id,
        message: params.message,
      }),
    ),
  );

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  if (failed > 0 && successful === 0) throw new Error("Failed to share event");

  return { sent: successful, failed };
}

export async function recordEventLinkCopy(
  client: SupabaseClient,
  eventId: string,
): Promise<void> {
  assertValidUuid(eventId, "eventId");

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user?.id) return;

    const { error } = await client.from("event_shares").insert({
      event_id: eventId,
      user_id: user.id,
      share_type: "link",
      receiver_id: null,
    });

    if (error && error.code !== "42P01") {
      console.warn("Failed to record link copy:", error);
    }
  } catch {
    // Non-fatal
  }
}

// ============================================================================
// CONNECTIONS FOR SHARING
// ============================================================================

export async function getConnectionsForSharing(
  client: SupabaseClient,
): Promise<Connection[]> {
  try {
    const userId = await getAuthenticatedUserId(client);

    const { data, error } = await client
      .from("connections")
      .select(`
        id,
        requester_id,
        receiver_id,
        requester:profiles!connections_requester_id_fkey(id, full_name, avatar_url, role),
        receiver:profiles!connections_receiver_id_fkey(id, full_name, avatar_url, role)
      `)
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

    if (error) throw error;

    const toConnectionUser = (value: unknown): ConnectionUser | undefined => {
      if (!value || typeof value !== "object") return undefined;
      const candidate = value as Partial<ConnectionUser>;
      if (typeof candidate.id !== "string") return undefined;
      return candidate as ConnectionUser;
    };

    return (data ?? []).map((conn) => ({
      id: conn.id,
      requester_id: conn.requester_id,
      receiver_id: conn.receiver_id,
      requester: toConnectionUser(conn.requester),
      receiver: toConnectionUser(conn.receiver),
    }));
  } catch (error) {
    throw createAppError("Failed to load connections", "getConnectionsForSharing", error);
  }
}

// ============================================================================
// EVENT DELETION (Creator/Admin only)
// ============================================================================

export async function deleteEvent(
  client: SupabaseClient,
  eventId: string,
): Promise<{ success: boolean }> {
  assertValidUuid(eventId, "eventId");

  try {
    const userId = await getAuthenticatedUserId(client);

    const { data: event } = await client
      .from("events")
      .select("creator_id")
      .eq("id", eventId)
      .single();

    if (!event) throw new Error("Event not found");
    if (event.creator_id !== userId) {
      throw new Error("Only the event creator can delete this event");
    }

    const { error } = await client.from("events").delete().eq("id", eventId);
    if (error) throw error;

    return { success: true };
  } catch (error) {
    throw createAppError("Failed to delete event", "deleteEvent", error);
  }
}

// ============================================================================
// EVENT UPDATES (Creator only)
// ============================================================================

export async function updateEvent(
  client: SupabaseClient,
  input: UpdateEventInput,
): Promise<{ success: boolean }> {
  assertValidUuid(input.id, "eventId");

  try {
    const userId = await getAuthenticatedUserId(client);

    const { data: event } = await client
      .from("events")
      .select("creator_id")
      .eq("id", input.id)
      .single();

    if (!event) throw new Error("Event not found");
    if (event.creator_id !== userId) {
      throw new Error("Only the event creator can update this event");
    }

    const { error } = await client
      .from("events")
      .update({
        title: input.title,
        description: input.description,
        event_date: input.event_date,
        event_time: input.event_time,
        location: input.location,
        is_virtual: input.is_virtual,
        virtual_link: input.virtual_link,
        category: input.category,
        max_attendees: input.max_attendees,
        registration_required: input.registration_required,
        registration_deadline: input.registration_deadline,
        tags: input.tags,
        external_registration_link: input.external_registration_link,
      })
      .eq("id", input.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    throw createAppError("Failed to update event", "updateEvent", error);
  }
}
