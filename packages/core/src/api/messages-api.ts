/**
 * Messages API â€” @clstr/core
 *
 * Platform-agnostic messaging functions.
 * Transformation: supabase singleton â†’ client param, handleApiError â†’ createAppError.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { assertValidUuid } from '../utils/uuid';
import { createAppError } from '../errors';
import { normalizeCollegeDomain } from '../schemas/validation';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type MessagingConnectionStatus = 'connected' | 'pending' | 'none' | 'blocked';

export interface MessageUser {
  id: string;
  full_name: string;
  avatar_url: string;
  role: string;
  last_seen?: string | null;
}

export interface MessageAttachment {
  url: string;
  type: string;  // MIME type
  name: string;  // original file name
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  college_domain?: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  sender?: MessageUser;
  receiver?: MessageUser;
}

export interface Conversation {
  partner_id: string;
  partner: MessageUser;
  last_message: Message;
  unread_count: number;
}

export const PRIVILEGED_MESSAGING_ROLES = ['Alumni', 'Faculty', 'Club', 'Organization'];

// â”€â”€â”€ Internal helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function fetchProfilePublic(
  client: SupabaseClient,
  userId: string
): Promise<MessageUser | null> {
  const { data } = await client
    .from('profiles')
    .select('id, full_name, avatar_url, role, last_seen')
    .eq('id', userId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    full_name: data.full_name || 'Anonymous',
    avatar_url: data.avatar_url || '',
    role: data.role || 'Member',
    last_seen: data.last_seen ?? null,
  };
}

function normalizeConnectionStatus(
  status: string | null | undefined
): MessagingConnectionStatus {
  if (!status) return 'none';
  const s = status.toLowerCase();
  if (s === 'accepted') return 'connected';
  if (s === 'pending') return 'pending';
  if (s === 'blocked') return 'blocked';
  return 'none';
}

async function getConnectionStatusBetweenUsers(
  client: SupabaseClient,
  userId1: string,
  userId2: string
): Promise<MessagingConnectionStatus> {
  const { data } = await client
    .from('connections')
    .select('status')
    .or(
      `and(requester_id.eq.${userId1},receiver_id.eq.${userId2}),and(requester_id.eq.${userId2},receiver_id.eq.${userId1})`
    )
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return normalizeConnectionStatus(data?.status);
}

async function getMessagingEligibility(
  client: SupabaseClient,
  senderId: string,
  receiverId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const connectionStatus = await getConnectionStatusBetweenUsers(client, senderId, receiverId);

  if (connectionStatus === 'blocked') {
    return { allowed: false, reason: 'This user has blocked you.' };
  }
  if (connectionStatus === 'connected') {
    return { allowed: true };
  }

  // Check privileged roles
  const { data: senderProfile } = await client
    .from('profiles')
    .select('role')
    .eq('id', senderId)
    .maybeSingle();

  if (senderProfile?.role && PRIVILEGED_MESSAGING_ROLES.includes(senderProfile.role)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'You must be connected to message this user.',
  };
}

async function getAuthenticatedUserId(client: SupabaseClient): Promise<string> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// â”€â”€â”€ Exported Functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Assert the current user can message a partner (throws on failure). */
export async function assertCanMessagePartner(
  client: SupabaseClient,
  partnerId: string
): Promise<void> {
  assertValidUuid(partnerId, 'partnerId');
  const userId = await getAuthenticatedUserId(client);

  const { allowed, reason } = await getMessagingEligibility(client, userId, partnerId);
  if (!allowed) {
    throw new Error(reason || 'Messaging not allowed.');
  }
}

/** Get unread message count for the current user. */
export async function getUnreadMessageCount(client: SupabaseClient): Promise<number> {
  const userId = await getAuthenticatedUserId(client);

  const { count, error } = await client
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false);

  if (error) {
    console.warn('Failed to get unread count:', error);
    return 0;
  }
  return count || 0;
}

/** Get conversation list for the current user. */
export async function getConversations(client: SupabaseClient): Promise<Conversation[]> {
  try {
    const userId = await getAuthenticatedUserId(client);

    // Get recent messages
    const { data: messages, error } = await client
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    if (!messages || messages.length === 0) return [];

    // Group by partner
    const conversationMap = new Map<string, { messages: any[]; partnerId: string }>();
    for (const msg of messages) {
      const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, { messages: [], partnerId });
      }
      conversationMap.get(partnerId)!.messages.push(msg);
    }

    // Fetch partner profiles
    const partnerIds = [...conversationMap.keys()];
    const { data: profiles } = await client
      .from('profiles')
      .select('id, full_name, avatar_url, role, last_seen')
      .in('id', partnerIds);

    const profilesMap = new Map(
      (profiles || []).map((p) => [p.id, p])
    );

    // Build conversations
    const conversations: Conversation[] = [];
    for (const [partnerId, { messages: partnerMessages }] of conversationMap) {
      const profile = profilesMap.get(partnerId);
      const lastMsg = partnerMessages[0];
      const unreadCount = partnerMessages.filter(
        (m) => m.receiver_id === userId && !m.is_read
      ).length;

      conversations.push({
        partner_id: partnerId,
        partner: {
          id: partnerId,
          full_name: profile?.full_name || 'Anonymous',
          avatar_url: profile?.avatar_url || '',
          role: profile?.role || 'Member',
          last_seen: profile?.last_seen ?? null,
        },
        last_message: lastMsg,
        unread_count: unreadCount,
      });
    }

    conversations.sort(
      (a, b) =>
        new Date(b.last_message.created_at).getTime() -
        new Date(a.last_message.created_at).getTime()
    );

    return conversations;
  } catch (error) {
    throw createAppError('Failed to load conversations', 'getConversations', error);
  }
}

/** Get messages exchanged with a partner. */
export async function getMessages(
  client: SupabaseClient,
  partnerId: string,
  limit = 50
): Promise<{ messages: Message[]; partner: MessageUser | null }> {
  try {
    assertValidUuid(partnerId, 'partnerId');
    const userId = await getAuthenticatedUserId(client);

    const [messagesResult, partner] = await Promise.all([
      client
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`
        )
        .order('created_at', { ascending: true })
        .limit(limit),
      fetchProfilePublic(client, partnerId),
    ]);

    if (messagesResult.error) throw messagesResult.error;

    return {
      messages: (messagesResult.data || []) as Message[],
      partner,
    };
  } catch (error) {
    throw createAppError('Failed to load messages', 'getMessages', error);
  }
}

/**
 * Send a message to a receiver.
 * Enforces connection-based domain checks + messaging eligibility.
 */
export async function sendMessage(
  client: SupabaseClient,
  receiverId: string,
  content: string,
  attachment?: MessageAttachment
): Promise<Message> {
  try {
    assertValidUuid(receiverId, 'receiverId');
    if ((!content || !content.trim()) && !attachment) {
      throw new Error('Message content or attachment is required.');
    }

    const userId = await getAuthenticatedUserId(client);

    if (userId === receiverId) {
      throw new Error('You cannot message yourself.');
    }

    // Check messaging eligibility
    const { allowed, reason } = await getMessagingEligibility(client, userId, receiverId);
    if (!allowed) {
      throw new Error(reason || 'Messaging not allowed.');
    }

    // Look up sender college_domain for scoping
    const { data: senderProfile } = await client
      .from('profiles')
      .select('college_domain')
      .eq('id', userId)
      .maybeSingle();

    const collegeDomain = senderProfile?.college_domain
      ? normalizeCollegeDomain(senderProfile.college_domain)
      : null;

    const insertPayload: Record<string, any> = {
      sender_id: userId,
      receiver_id: receiverId,
      content: (content || '').trim() || (attachment ? `Sent ${attachment.type.startsWith('image/') ? 'an image' : 'a file'}` : ''),
      college_domain: collegeDomain,
    };

    if (attachment) {
      insertPayload.attachment_url = attachment.url;
      insertPayload.attachment_type = attachment.type;
      insertPayload.attachment_name = attachment.name;
    }

    const { data, error } = await client
      .from('messages')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;

    return data as Message;
  } catch (error) {
    throw createAppError('Failed to send message', 'sendMessage', error);
  }
}

/** Mark all messages from a partner as read. */
export async function markMessagesAsRead(
  client: SupabaseClient,
  partnerId: string
): Promise<void> {
  try {
    assertValidUuid(partnerId, 'partnerId');
    const userId = await getAuthenticatedUserId(client);

    const { error } = await client
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', partnerId)
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  } catch (error) {
    throw createAppError('Failed to mark messages as read', 'markMessagesAsRead', error);
  }
}

/** Update last_seen timestamp. */
export async function updateLastSeen(client: SupabaseClient): Promise<void> {
  const userId = await getAuthenticatedUserId(client);
  await client
    .from('profiles')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', userId);
}

/** Pure: checks whether last_seen is within 5 minutes. */
export function isUserOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 5 * 60 * 1000;
}

/** Subscribe to messages for a specific user. */
export function subscribeToMessages(
  client: SupabaseClient,
  userId: string,
  callback: (payload: any) => void
) {
  return client
    .channel(CHANNELS.social.messagesReceiver(userId))
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
      callback
    )
    .subscribe();
}

/** Get connected users for messaging (accepted connections). */
export async function getConnectedUsers(client: SupabaseClient): Promise<MessageUser[]> {
  try {
    const userId = await getAuthenticatedUserId(client);

    const { data: connections, error } = await client
      .from('connections')
      .select('requester_id, receiver_id')
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) throw error;
    if (!connections || connections.length === 0) return [];

    const partnerIds = connections.map((c) =>
      c.requester_id === userId ? c.receiver_id : c.requester_id
    );

    const { data: profiles } = await client
      .from('profiles')
      .select('id, full_name, avatar_url, role, last_seen')
      .in('id', partnerIds);

    return (profiles || []).map((p) => ({
      id: p.id,
      full_name: p.full_name || 'Anonymous',
      avatar_url: p.avatar_url || '',
      role: p.role || 'Member',
      last_seen: p.last_seen ?? null,
    }));
  } catch (error) {
    throw createAppError('Failed to load connected users', 'getConnectedUsers', error);
  }
}
