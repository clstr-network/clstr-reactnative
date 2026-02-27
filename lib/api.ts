import { supabase } from '@/lib/supabase';
import {
  getMockPostsData,
  getMockPostByIdData,
  getMockConnectionsData,
  getMockEventsData,
  toggleMockEventRegistrationData,
  getMockProfileData,
  toggleMockReactionData,
  createMockRepostData,
  deleteMockRepostData,
} from '@/lib/mock-social-data';

const AUTH_MODE = process.env.EXPO_PUBLIC_AUTH_MODE;

/**
 * Typed query helper — bypasses strict generic Database type resolution.
 * The Database type uses Record<string, GenericTable> which doesn't resolve
 * properly with newer @supabase/postgrest-js versions. This helper provides
 * an untyped `from()` that works correctly at runtime while preserving the
 * full Supabase client type for `.auth`, `.storage`, etc.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (table: string) => (supabase as any).from(table);

export type ReactionType = 'like' | 'celebrate' | 'support' | 'love' | 'insightful' | 'curious' | 'laugh';

export const REACTION_EMOJI_MAP: Record<ReactionType, string> = {
  like: '👍',
  celebrate: '🎉',
  support: '🙌',
  love: '❤️',
  insightful: '💡',
  curious: '🤔',
  laugh: '😂',
};

export const REACTION_LABELS: Record<ReactionType, string> = {
  like: 'Like',
  celebrate: 'Celebrate',
  support: 'Support',
  love: 'Love',
  insightful: 'Insightful',
  curious: 'Curious',
  laugh: 'Funny',
};

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
  user_type?: string | null;
  college_domain: string | null;
  bio: string | null;
  headline: string | null;
  major?: string | null;
  university?: string | null;
  social_links?: Record<string, string> | null;
  interests?: string[] | null;
  enrollment_year?: string | null;
  course_duration_years?: string | null;
  last_seen?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  images: string[] | null;
  college_domain: string | null;
  likes_count: number;
  comments_count: number;
  shares_count?: number;
  reposts_count?: number;
  created_at: string;
  updated_at?: string;
  profile?: Profile;
  user_reaction?: ReactionType | null;
  is_saved?: boolean;
  reposted?: boolean;
  reactions_summary?: Record<ReactionType, number>;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  likes_count: number;
  created_at: string;
  profile?: Profile;
}

export interface Connection {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  updated_at?: string;
  profile?: Profile;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  college_domain: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
}

export interface Conversation {
  partner_id: string;
  partner: Profile;
  last_message: Message;
  unread_count: number;
}

export interface Event {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  is_virtual: boolean;
  college_domain: string | null;
  created_at: string;
  creator?: Profile;
  is_registered?: boolean;
  registration_count?: number;
  category?: string;
  attendees_count?: number;
  max_attendees?: number;
}

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

export interface Experience {
  id: string;
  profile_id: string;
  title: string;
  company: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
}

export interface Education {
  id: string;
  profile_id: string;
  school: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
}

export interface Skill {
  id: string;
  profile_id: string;
  name: string;
  endorsement_count?: number;
}

async function getAuthUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not authenticated');
  return user;
}

async function getUserCollegeDomain(): Promise<string | null> {
  const user = await getAuthUser();
  const { data } = await from('profiles')
    .select('college_domain')
    .eq('id', user.id)
    .single();
  return data?.college_domain ?? null;
}

// ─── Posts / Feed ───────────────────────────────────────────

export async function getPosts(params?: { page?: number; limit?: number; category?: string; sort?: string }) {
  if (AUTH_MODE === 'mock') {
    return (await getMockPostsData(params)) as unknown as Post[];
  }

  try {
    const user = await getAuthUser();
    const collegeDomain = await getUserCollegeDomain();
    const page = params?.page ?? 0;
    const limit = params?.limit ?? 20;
    const offset = page * limit;
    const to = offset + limit - 1;

    let query = from('posts')
      .select('*, profile:profiles!user_id(id, full_name, avatar_url, role, college_domain, headline)')
      .order('created_at', { ascending: false })
      .range(offset, to);

    if (collegeDomain) {
      query = query.eq('college_domain', collegeDomain);
    }

    const { data: posts, error } = await query;
    if (error) throw error;
    if (!posts || posts.length === 0) return [];

    const postIds = posts.map((p: any) => p.id);

    const [likesResult, savedResult, repostResult] = await Promise.all([
      from('post_likes')
        .select('post_id, reaction_type')
        .eq('user_id', user.id)
        .in('post_id', postIds),
      from('saved_items')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds),
      from('reposts')
        .select('original_post_id')
        .eq('user_id', user.id)
        .in('original_post_id', postIds),
    ]);

    const userReactions = new Map<string, ReactionType>();
    if (likesResult.data) {
      for (const like of likesResult.data) {
        userReactions.set(like.post_id, like.reaction_type as ReactionType);
      }
    }

    const savedPostIds = new Set<string>();
    if (savedResult.data) {
      for (const item of savedResult.data) {
        savedPostIds.add(item.post_id);
      }
    }

    const repostedPostIds = new Set<string>();
    if (repostResult.data) {
      for (const item of repostResult.data as any[]) {
        repostedPostIds.add(item.original_post_id);
      }
    }

    return posts.map((post: any) => ({
      ...post,
      user_reaction: userReactions.get(post.id) ?? null,
      is_saved: savedPostIds.has(post.id),
      reposted: repostedPostIds.has(post.id),
    })) as Post[];
  } catch (error) {
    console.error('getPosts error:', error);
    throw error;
  }
}

export async function getPostById(postId: string) {
  if (AUTH_MODE === 'mock') {
    return (await getMockPostByIdData(postId)) as unknown as Post;
  }

  try {
    const user = await getAuthUser();

    const { data: post, error } = await from('posts')
      .select('*, profile:profiles!user_id(id, full_name, avatar_url, role, college_domain, headline)')
      .eq('id', postId)
      .single();

    if (error) throw error;

    const [reactionResult, savedResult, reactionsResult] = await Promise.all([
      from('post_likes')
        .select('reaction_type')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle(),
      from('saved_items')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle(),
      from('post_likes')
        .select('reaction_type')
        .eq('post_id', postId),
    ]);

    const reactionsSummary: Record<string, number> = {};
    if (reactionsResult.data) {
      for (const r of reactionsResult.data) {
        reactionsSummary[r.reaction_type] = (reactionsSummary[r.reaction_type] || 0) + 1;
      }
    }

    return {
      ...post,
      user_reaction: reactionResult.data?.reaction_type ?? null,
      is_saved: !!savedResult.data,
      reactions_summary: reactionsSummary,
    } as Post;
  } catch (error) {
    console.error('getPostById error:', error);
    throw error;
  }
}

export async function createPost(content: string, images?: string[]) {
  try {
    const user = await getAuthUser();
    const collegeDomain = await getUserCollegeDomain();

    const { data, error } = await from('posts')
      .insert({
        user_id: user.id,
        content,
        images: images ?? null,
        college_domain: collegeDomain,
      })
      .select('*, profile:profiles!user_id(id, full_name, avatar_url, role, college_domain, headline)')
      .single();

    if (error) throw error;
    return data as Post;
  } catch (error) {
    console.error('createPost error:', error);
    throw error;
  }
}

export async function toggleReaction(postId: string, reactionType: ReactionType) {
  if (AUTH_MODE === 'mock') {
    return toggleMockReactionData(postId, reactionType);
  }

  try {
    const user = await getAuthUser();

    const { data: existing } = await from('post_likes')
      .select('id, reaction_type')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      if (existing.reaction_type === reactionType) {
        const { error } = await from('post_likes')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' as const, reactionType };
      } else {
        const { error } = await from('post_likes')
          .update({ reaction_type: reactionType })
          .eq('id', existing.id);
        if (error) throw error;
        return { action: 'changed' as const, reactionType };
      }
    } else {
      const { error } = await from('post_likes')
        .insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: reactionType,
        });
      if (error) throw error;
      return { action: 'added' as const, reactionType };
    }
  } catch (error) {
    console.error('toggleReaction error:', error);
    throw error;
  }
}

// ─── Reposts ──────────────────────────────────────────────────

export async function createRepost(originalPostId: string, commentary?: string) {
  if (AUTH_MODE === 'mock') {
    return createMockRepostData(originalPostId);
  }

  try {
    const { data, error } = await (supabase.rpc as any)('create_repost', {
      p_original_post_id: originalPostId,
      p_commentary_text: commentary || null,
    });

    if (error) {
      if (error.message?.includes('already reposted')) {
        throw new Error('You have already reposted this post');
      }
      throw error;
    }

    return {
      success: data?.success ?? true,
      repostId: data?.repost_id ?? '',
      hasCommentary: data?.has_commentary ?? false,
    };
  } catch (error) {
    console.error('createRepost error:', error);
    throw error;
  }
}

export async function deleteRepost(originalPostId: string) {
  if (AUTH_MODE === 'mock') {
    return deleteMockRepostData(originalPostId);
  }

  try {
    const { data, error } = await (supabase.rpc as any)('delete_repost', {
      p_original_post_id: originalPostId,
    });

    if (error) throw error;
    return data?.success ?? true;
  } catch (error) {
    console.error('deleteRepost error:', error);
    throw error;
  }
}

export async function getComments(postId: string) {
  try {
    const { data, error } = await from('comments')
      .select('*, profile:profiles!user_id(id, full_name, avatar_url, role, college_domain, headline)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as Comment[];
  } catch (error) {
    console.error('getComments error:', error);
    throw error;
  }
}

export async function addComment(postId: string, content: string, parentId?: string) {
  try {
    const user = await getAuthUser();

    const { data, error } = await from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
        parent_id: parentId ?? null,
      })
      .select('*, profile:profiles!user_id(id, full_name, avatar_url, role, college_domain, headline)')
      .single();

    if (error) throw error;
    return data as Comment;
  } catch (error) {
    console.error('addComment error:', error);
    throw error;
  }
}

// ─── Connections / Network ──────────────────────────────────

export async function getConnections() {
  if (AUTH_MODE === 'mock') {
    return (await getMockConnectionsData()) as unknown as Connection[];
  }

  try {
    const user = await getAuthUser();

    const { data, error } = await from('connections')
      .select(`
        *,
        requester:profiles!requester_id(id, full_name, avatar_url, role, college_domain, headline),
        receiver:profiles!receiver_id(id, full_name, avatar_url, role, college_domain, headline)
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (error) throw error;

    return (data ?? []).map((conn: any) => ({
      ...conn,
      profile: conn.requester_id === user.id ? conn.receiver : conn.requester,
    })) as Connection[];
  } catch (error) {
    console.error('getConnections error:', error);
    throw error;
  }
}

export async function getPendingRequests() {
  try {
    const user = await getAuthUser();

    const { data, error } = await from('connections')
      .select(`
        *,
        requester:profiles!requester_id(id, full_name, avatar_url, role, college_domain, headline)
      `)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((conn: any) => ({
      ...conn,
      profile: conn.requester,
    })) as Connection[];
  } catch (error) {
    console.error('getPendingRequests error:', error);
    throw error;
  }
}

export async function getSuggestedConnections() {
  try {
    const user = await getAuthUser();
    const collegeDomain = await getUserCollegeDomain();

    if (!collegeDomain) return [];

    const { data: existingConnections } = await from('connections')
      .select('requester_id, receiver_id')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .in('status', ['pending', 'accepted', 'blocked']);

    const excludeIds = new Set<string>([user.id]);
    if (existingConnections) {
      for (const conn of existingConnections) {
        excludeIds.add(conn.requester_id);
        excludeIds.add(conn.receiver_id);
      }
    }

    const { data, error } = await from('profiles')
      .select('id, full_name, avatar_url, role, college_domain, headline, bio')
      .eq('college_domain', collegeDomain)
      .not('id', 'in', `(${Array.from(excludeIds).join(',')})`)
      .limit(20);

    if (error) throw error;
    return (data ?? []) as Profile[];
  } catch (error) {
    console.error('getSuggestedConnections error:', error);
    throw error;
  }
}

export async function sendConnectionRequest(userId: string) {
  try {
    const user = await getAuthUser();

    const { data, error } = await from('connections')
      .insert({
        requester_id: user.id,
        receiver_id: userId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data as Connection;
  } catch (error) {
    console.error('sendConnectionRequest error:', error);
    throw error;
  }
}

export async function acceptConnection(connectionId: string) {
  try {
    const { data, error } = await from('connections')
      .update({ status: 'accepted' })
      .eq('id', connectionId)
      .select()
      .single();

    if (error) throw error;
    return data as Connection;
  } catch (error) {
    console.error('acceptConnection error:', error);
    throw error;
  }
}

export async function rejectConnection(connectionId: string) {
  try {
    const { data, error } = await from('connections')
      .update({ status: 'rejected' })
      .eq('id', connectionId)
      .select()
      .single();

    if (error) throw error;
    return data as Connection;
  } catch (error) {
    console.error('rejectConnection error:', error);
    throw error;
  }
}

// ─── Messages ───────────────────────────────────────────────

export async function getConversations() {
  try {
    const user = await getAuthUser();

    const { data: messages, error } = await from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!messages || messages.length === 0) return [];

    const conversationMap = new Map<string, { messages: any[]; unreadCount: number }>();

    for (const msg of messages) {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, { messages: [], unreadCount: 0 });
      }
      const conv = conversationMap.get(partnerId)!;
      conv.messages.push(msg);
      if (!msg.is_read && msg.receiver_id === user.id) {
        conv.unreadCount++;
      }
    }

    const partnerIds = Array.from(conversationMap.keys());
    const { data: profiles } = await from('profiles')
      .select('id, full_name, avatar_url, role, college_domain, headline')
      .in('id', partnerIds);

    const profileMap = new Map<string, Profile>();
    if (profiles) {
      for (const p of profiles) {
        profileMap.set(p.id, p as Profile);
      }
    }

    const conversations: Conversation[] = [];
    conversationMap.forEach((conv, partnerId) => {
      const partner = profileMap.get(partnerId);
      if (!partner) return;
      conversations.push({
        partner_id: partnerId,
        partner,
        last_message: conv.messages[0] as Message,
        unread_count: conv.unreadCount,
      });
    });

    conversations.sort((a, b) =>
      new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime()
    );

    return conversations;
  } catch (error) {
    console.error('getConversations error:', error);
    throw error;
  }
}

export async function getMessages(partnerId: string) {
  try {
    const user = await getAuthUser();

    const { data, error } = await from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as Message[];
  } catch (error) {
    console.error('getMessages error:', error);
    throw error;
  }
}

export async function sendMessage(
  receiverId: string,
  content: string,
  attachment?: { url: string; type: string; name: string }
) {
  try {
    const user = await getAuthUser();
    const collegeDomain = await getUserCollegeDomain();

    const insertPayload: Record<string, any> = {
      sender_id: user.id,
      receiver_id: receiverId,
      content: content || (attachment ? `Sent ${attachment.type.startsWith('image/') ? 'an image' : 'a file'}` : ''),
      is_read: false,
      college_domain: collegeDomain,
    };

    if (attachment) {
      insertPayload.attachment_url = attachment.url;
      insertPayload.attachment_type = attachment.type;
      insertPayload.attachment_name = attachment.name;
    }

    const { data, error } = await from('messages')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;
    return data as Message;
  } catch (error) {
    console.error('sendMessage error:', error);
    throw error;
  }
}

export async function markMessagesAsRead(partnerId: string) {
  try {
    const user = await getAuthUser();

    const { error } = await from('messages')
      .update({ is_read: true })
      .eq('sender_id', partnerId)
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
  } catch (error) {
    console.error('markMessagesAsRead error:', error);
    throw error;
  }
}

// ─── Events ─────────────────────────────────────────────────

export async function getEvents() {
  if (AUTH_MODE === 'mock') {
    return (await getMockEventsData()) as unknown as Event[];
  }

  try {
    const user = await getAuthUser();
    const collegeDomain = await getUserCollegeDomain();

    let query = from('events')
      .select('*, creator:profiles!creator_id(id, full_name, avatar_url, role, college_domain, headline)')
      .order('event_date', { ascending: true });

    if (collegeDomain) {
      query = query.eq('college_domain', collegeDomain);
    }

    const { data: events, error } = await query;
    if (error) throw error;
    if (!events || events.length === 0) return [];

    const eventIds = events.map((e: any) => e.id);

    const [registrationsResult, userRegistrations] = await Promise.all([
      from('event_registrations')
        .select('event_id')
        .in('event_id', eventIds),
      from('event_registrations')
        .select('event_id')
        .eq('user_id', user.id)
        .in('event_id', eventIds),
    ]);

    const regCounts = new Map<string, number>();
    if (registrationsResult.data) {
      for (const r of registrationsResult.data) {
        regCounts.set(r.event_id, (regCounts.get(r.event_id) || 0) + 1);
      }
    }

    const userRegSet = new Set<string>();
    if (userRegistrations.data) {
      for (const r of userRegistrations.data) {
        userRegSet.add(r.event_id);
      }
    }

    return events.map((event: any) => ({
      ...event,
      is_registered: userRegSet.has(event.id),
      registration_count: regCounts.get(event.id) ?? 0,
    })) as Event[];
  } catch (error) {
    console.error('getEvents error:', error);
    throw error;
  }
}

export async function getEventById(eventId: string) {
  try {
    const user = await getAuthUser();

    const { data: event, error } = await from('events')
      .select('*, creator:profiles!creator_id(id, full_name, avatar_url, role, college_domain, headline)')
      .eq('id', eventId)
      .single();

    if (error) throw error;

    const [regCountResult, userRegResult] = await Promise.all([
      from('event_registrations')
        .select('id', { count: 'exact' })
        .eq('event_id', eventId),
      from('event_registrations')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    return {
      ...event,
      is_registered: !!userRegResult.data,
      registration_count: regCountResult.count ?? 0,
    } as Event;
  } catch (error) {
    console.error('getEventById error:', error);
    throw error;
  }
}

export async function toggleEventRegistration(eventId: string) {
  if (AUTH_MODE === 'mock') {
    return toggleMockEventRegistrationData(eventId);
  }

  try {
    const user = await getAuthUser();

    const { data: existing } = await from('event_registrations')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await from('event_registrations')
        .delete()
        .eq('id', existing.id);
      if (error) throw error;
      return { registered: false };
    } else {
      const { error } = await from('event_registrations')
        .insert({
          event_id: eventId,
          user_id: user.id,
        });
      if (error) throw error;
      return { registered: true };
    }
  } catch (error) {
    console.error('toggleEventRegistration error:', error);
    throw error;
  }
}

// ─── Profile ────────────────────────────────────────────────

export async function getProfile(userId?: string) {
  if (AUTH_MODE === 'mock') {
    return (await getMockProfileData()) as unknown as Profile;
  }

  try {
    const targetId = userId ?? (await getAuthUser()).id;

    const { data, error } = await from('profiles')
      .select('*')
      .eq('id', targetId)
      .single();

    if (error) throw error;
    return data as Profile;
  } catch (error) {
    console.error('getProfile error:', error);
    throw error;
  }
}

export async function updateProfile(profileData: Partial<Profile>) {
  try {
    const user = await getAuthUser();

    const { id, ...updateData } = profileData;

    const { data, error } = await from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  } catch (error) {
    console.error('updateProfile error:', error);
    throw error;
  }
}

export async function getExperiences(profileId: string) {
  try {
    const { data, error } = await from('experiences')
      .select('*')
      .eq('profile_id', profileId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Experience[];
  } catch (error) {
    console.error('getExperiences error:', error);
    throw error;
  }
}

export async function getEducation(profileId: string) {
  try {
    const { data, error } = await from('education')
      .select('*')
      .eq('profile_id', profileId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Education[];
  } catch (error) {
    console.error('getEducation error:', error);
    throw error;
  }
}

export async function getSkills(profileId: string) {
  try {
    const { data, error } = await from('skills')
      .select('*')
      .eq('profile_id', profileId)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data ?? []) as Skill[];
  } catch (error) {
    console.error('getSkills error:', error);
    throw error;
  }
}

// ─── Notifications ──────────────────────────────────────────

export async function getNotifications() {
  try {
    const user = await getAuthUser();

    const { data, error } = await from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return (data ?? []) as Notification[];
  } catch (error) {
    console.error('getNotifications error:', error);
    throw error;
  }
}

export async function markNotificationRead(notificationId: string) {
  try {
    const { error } = await from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
  } catch (error) {
    console.error('markNotificationRead error:', error);
    throw error;
  }
}
