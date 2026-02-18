import { supabase } from "@/integrations/supabase/client";
import { handleApiError } from "@/lib/errorHandler";
import { assertValidUuid } from "@/lib/uuid";
import { sendMessage } from "@/lib/messages-api";

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

// ============================================================================
// HELPERS
// ============================================================================

const getAuthenticatedUserId = async (): Promise<string> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user?.id) throw new Error("User not authenticated");

  assertValidUuid(user.id, "userId");
  return user.id;
};

const parseEventTime = (
  eventTime: string | null | undefined
): { start_time: string | null; end_time: string | null } => {
  if (!eventTime) return { start_time: null, end_time: null };
  const parts = eventTime.split("-").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { start_time: null, end_time: null };
  if (parts.length === 1) return { start_time: parts[0], end_time: null };
  return { start_time: parts[0], end_time: parts.slice(1).join(" - ") };
};

const extractEventType = (tags: string[] | null | undefined): string | null => {
  const typeTag = (tags ?? []).find(
    (t) => typeof t === "string" && t.toLowerCase().startsWith("type:")
  );
  if (!typeTag) return null;
  const value = typeTag.slice("type:".length).trim();
  return value || null;
};

const normalizeCreator = (creatorData: unknown): EventCreator | undefined => {
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

/**
 * Fetch a single event by ID - PUBLIC (no auth required)
 * Used for public event links shared externally
 */
export async function getEventByIdPublic(eventId: string): Promise<Event | null> {
  assertValidUuid(eventId, "eventId");

  try {
    const { data, error } = await supabase
      .from("events")
      .select(
        `
        *,
        creator:profiles!events_creator_id_fkey(id, full_name, avatar_url, role)
      `
      )
      .eq("id", eventId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    if (!data) return null;

    const { start_time, end_time } = parseEventTime(data.event_time);

    // Get attendee count
    const { count: attendeesCount } = await supabase
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
    throw handleApiError(error, {
      operation: "getEventByIdPublic",
      userMessage: "Failed to load event",
      details: { eventId },
    });
  }
}

/**
 * Fetch a single event by ID - AUTHENTICATED
 * Includes user's registration status
 */
export async function getEventById(eventId: string): Promise<Event | null> {
  assertValidUuid(eventId, "eventId");

  try {
    const userId = await getAuthenticatedUserId();

    const { data, error } = await supabase
      .from("events")
      .select(
        `
        *,
        creator:profiles!events_creator_id_fkey(id, full_name, avatar_url, role)
      `
      )
      .eq("id", eventId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    if (!data) return null;

    const { start_time, end_time } = parseEventTime(data.event_time);

    // Check if user is registered
    const { data: registration } = await supabase
      .from("event_registrations")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle();

    // Get attendee count
    const { count: attendeesCount } = await supabase
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
    throw handleApiError(error, {
      operation: "getEventById",
      userMessage: "Failed to load event",
      details: { eventId },
    });
  }
}

// ============================================================================
// EVENT REGISTRATION
// ============================================================================

/**
 * Register for an event
 */
export async function registerForEvent(eventId: string): Promise<{ success: boolean }> {
  assertValidUuid(eventId, "eventId");

  try {
    const userId = await getAuthenticatedUserId();

    // Get user's college domain
    const { data: profile } = await supabase
      .from("profiles")
      .select("college_domain")
      .eq("id", userId)
      .single();

    const { error } = await supabase.from("event_registrations").insert({
      event_id: eventId,
      user_id: userId,
      college_domain: profile?.college_domain ?? null,
      status: "confirmed",
    });

    if (error) {
      // Handle already registered
      if (error.code === "23505") {
        return { success: true }; // Already registered
      }
      throw error;
    }

    return { success: true };
  } catch (error) {
    throw handleApiError(error, {
      operation: "registerForEvent",
      userMessage: "Failed to register for event",
      details: { eventId },
    });
  }
}

/**
 * Unregister from an event
 */
export async function unregisterFromEvent(eventId: string): Promise<{ success: boolean }> {
  assertValidUuid(eventId, "eventId");

  try {
    const userId = await getAuthenticatedUserId();

    const { error } = await supabase
      .from("event_registrations")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    throw handleApiError(error, {
      operation: "unregisterFromEvent",
      userMessage: "Failed to unregister from event",
      details: { eventId },
    });
  }
}

/**
 * Track click on external registration link
 */
export async function trackExternalRegistrationClick(eventId: string): Promise<void> {
  assertValidUuid(eventId, "eventId");

  try {
    await supabase.rpc("increment_event_registration_click", { event_id_param: eventId });
  } catch (error) {
    // Non-fatal - don't throw, just log
    console.warn("Failed to track registration click:", error);
  }
}

// ============================================================================
// EVENT SHARING
// ============================================================================

/**
 * Share an event to a connection via DM
 * Creates a message with event embed and records the share
 */
export async function shareEvent(params: {
  event_id: string;
  receiver_id: string;
  message?: string;
}): Promise<{ success: boolean }> {
  assertValidUuid(params.event_id, "eventId");
  assertValidUuid(params.receiver_id, "receiverId");

  try {
    const userId = await getAuthenticatedUserId();

    // Get event details for the message
    const event = await getEventById(params.event_id);
    if (!event) {
      throw new Error("Event not found");
    }

    // Format the event share message
    const eventUrl = `${window.location.origin}/event/${params.event_id}`;
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
    if (event.start_time) {
      messageContent += ` at ${event.start_time}`;
    }
    messageContent += `\n`;
    if (event.location && !event.is_virtual) {
      messageContent += `📍 ${event.location}\n`;
    }
    if (event.is_virtual) {
      messageContent += `💻 Virtual Event\n`;
    }
    messageContent += `━━━━━━━━━━━━━━━\n`;
    messageContent += `View Event: ${eventUrl}`;

    // Send the message
    await sendMessage(params.receiver_id, messageContent);

    // Record the share event for analytics
    const { error: shareError } = await supabase.from("event_shares").insert({
      event_id: params.event_id,
      user_id: userId,
      share_type: "dm",
      receiver_id: params.receiver_id,
    });

    if (shareError) {
      // Non-fatal: share was sent, just tracking failed
      // Check if table doesn't exist yet
      if (shareError.code !== "42P01") {
        console.warn("Failed to record event share:", shareError);
      }
    }

    return { success: true };
  } catch (error) {
    throw handleApiError(error, {
      operation: "shareEvent",
      userMessage: "Failed to share event",
      details: { eventId: params.event_id, receiverId: params.receiver_id },
    });
  }
}

/**
 * Share event to multiple connections at once
 */
export async function shareEventToMultiple(params: {
  event_id: string;
  receiver_ids: string[];
  message?: string;
}): Promise<{ sent: number; failed: number }> {
  assertValidUuid(params.event_id, "eventId");
  if (!params.receiver_ids || params.receiver_ids.length === 0) {
    throw new Error("At least one recipient is required");
  }

  params.receiver_ids.forEach((id, idx) => assertValidUuid(id, `receiverId[${idx}]`));

  const results = await Promise.allSettled(
    params.receiver_ids.map((receiver_id) =>
      shareEvent({
        event_id: params.event_id,
        receiver_id,
        message: params.message,
      })
    )
  );

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  if (failed > 0 && successful === 0) {
    throw new Error("Failed to share event");
  }

  return { sent: successful, failed };
}

/**
 * Record a link copy share (for analytics)
 */
export async function recordEventLinkCopy(eventId: string): Promise<void> {
  assertValidUuid(eventId, "eventId");

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Only record if user is logged in
    if (!user?.id) return;

    const { error } = await supabase.from("event_shares").insert({
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

/**
 * Get user's connections for the share modal
 */
export async function getConnectionsForSharing(): Promise<Connection[]> {
  try {
    const userId = await getAuthenticatedUserId();

    const { data, error } = await supabase
      .from("connections")
      .select(
        `
        id,
        requester_id,
        receiver_id,
        requester:profiles!connections_requester_id_fkey(id, full_name, avatar_url, role),
        receiver:profiles!connections_receiver_id_fkey(id, full_name, avatar_url, role)
      `
      )
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
    throw handleApiError(error, {
      operation: "getConnectionsForSharing",
      userMessage: "Failed to load connections",
    });
  }
}

// ============================================================================
// EVENT DELETION (Creator/Admin only)
// ============================================================================

/**
 * Delete an event (creator only)
 */
export async function deleteEvent(eventId: string): Promise<{ success: boolean }> {
  assertValidUuid(eventId, "eventId");

  try {
    const userId = await getAuthenticatedUserId();

    // Check if user is the creator
    const { data: event } = await supabase
      .from("events")
      .select("creator_id")
      .eq("id", eventId)
      .single();

    if (!event) {
      throw new Error("Event not found");
    }

    if (event.creator_id !== userId) {
      throw new Error("Only the event creator can delete this event");
    }

    const { error } = await supabase.from("events").delete().eq("id", eventId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    throw handleApiError(error, {
      operation: "deleteEvent",
      userMessage: "Failed to delete event",
      details: { eventId },
    });
  }
}

// ============================================================================
// EVENT UPDATES (Creator only)
// ============================================================================

/**
 * Update an event (creator only)
 */
export async function updateEvent(input: UpdateEventInput): Promise<{ success: boolean }> {
  assertValidUuid(input.id, "eventId");

  try {
    const userId = await getAuthenticatedUserId();

    const { data: event } = await supabase
      .from("events")
      .select("creator_id")
      .eq("id", input.id)
      .single();

    if (!event) {
      throw new Error("Event not found");
    }

    if (event.creator_id !== userId) {
      throw new Error("Only the event creator can update this event");
    }

    const { error } = await supabase
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
    throw handleApiError(error, {
      operation: "updateEvent",
      userMessage: "Failed to update event",
      details: { eventId: input.id },
    });
  }
}
