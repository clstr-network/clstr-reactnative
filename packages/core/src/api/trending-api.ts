/**
 * Trending Topics API â€” Cross-Platform
 *
 * Provides functions to fetch trending hashtags from Supabase,
 * with realtime subscription support.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { createAppError } from '../errors';

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface RecentPost {
  id: string;
  author: string;
  author_avatar: string | null;
  excerpt: string;
  timestamp: string;
}

export interface TrendingTopic {
  id: string;
  tag: string;
  postCount: number;
  recentPosts: Array<{
    id: string;
    author: string;
    excerpt: string;
    timestamp: string;
  }>;
}

interface RawTrendingTopic {
  hashtag: string;
  post_count: number;
  recent_posts: RecentPost[] | null;
}

export interface GetTrendingTopicsParams {
  collegeDomain?: string | null;
  timeWindowHours?: number;
  limit?: number;
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function isTrendingTopicsUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const anyError = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };

  const code = anyError.code ?? '';
  const message = anyError.message ?? '';
  const details = anyError.details ?? '';
  const hint = anyError.hint ?? '';
  const text = `${code} ${message} ${details} ${hint}`.toLowerCase();

  if (code === 'PGRST202') return true;
  if (code === '42883') return true;
  if (code === '42501') return true;

  return (
    text.includes('could not find the function') ||
    (text.includes('function') && text.includes('does not exist')) ||
    (text.includes('get_trending_topics') && text.includes('not found')) ||
    text.includes('permission denied')
  );
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const postDate = new Date(timestamp);
  const diffMs = now.getTime() - postDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return postDate.toLocaleDateString();
}

function transformTrendingTopic(raw: RawTrendingTopic, index: number): TrendingTopic {
  const recentPosts = (raw.recent_posts || []).map((post) => ({
    id: post.id,
    author: post.author || 'Anonymous',
    excerpt: post.excerpt || '',
    timestamp: formatRelativeTime(post.timestamp),
  }));

  return {
    id: `trending-${raw.hashtag}-${index}`,
    tag: raw.hashtag,
    postCount: raw.post_count,
    recentPosts,
  };
}

// â”€â”€ API Functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Fetches trending topics from Supabase.
 */
export async function getTrendingTopics(
  client: SupabaseClient,
  {
    collegeDomain,
    timeWindowHours = 168,
    limit = 10,
  }: GetTrendingTopicsParams = {},
): Promise<TrendingTopic[]> {
  try {
    let effectiveDomain = collegeDomain;

    if (effectiveDomain === undefined) {
      const { data: authData } = await client.auth.getUser();
      if (authData?.user) {
        const { data: profile } = await client
          .from('profiles')
          .select('college_domain')
          .eq('id', authData.user.id)
          .single();
        effectiveDomain = profile?.college_domain ?? null;
      }
    }

    if (effectiveDomain === null || effectiveDomain === undefined) {
      return [];
    }

    const { data, error } = await (client.rpc as any)('get_trending_topics', {
      p_college_domain: effectiveDomain,
      p_time_window_hours: timeWindowHours,
      p_limit: limit,
    });

    if (error) {
      throw error;
    }

    const rawData = data as unknown as RawTrendingTopic[] | null;
    return (rawData || []).map((item: RawTrendingTopic, index: number) =>
      transformTrendingTopic(item, index),
    );
  } catch (error) {
    if (isTrendingTopicsUnavailable(error)) {
      return [];
    }
    throw createAppError(
      'Unable to load trending topics. Please try again.',
      'getTrendingTopics',
      error,
    );
  }
}

/**
 * Fetches posts for a specific hashtag (drill-down view).
 */
export async function getPostsByHashtag(
  client: SupabaseClient,
  hashtag: string,
  limit: number = 20,
): Promise<
  Array<{
    id: string;
    content: string;
    author: string;
    author_avatar: string | null;
    created_at: string;
    likes_count: number;
    comments_count: number;
  }>
> {
  try {
    const { data: authData } = await client.auth.getUser();
    let collegeDomain: string | null = null;

    if (authData?.user) {
      const { data: profile } = await client
        .from('profiles')
        .select('college_domain')
        .eq('id', authData.user.id)
        .single();
      collegeDomain = profile?.college_domain ?? null;
    }

    const normalizedHashtag = hashtag.toLowerCase().replace(/^#/, '');
    const searchPattern = `%#${normalizedHashtag}%`;

    let query = client
      .from('posts')
      .select('id, content, created_at, likes_count, comments_count, user_id')
      .ilike('content', searchPattern)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (collegeDomain) {
      query = query.eq('college_domain', collegeDomain);
    }

    const { data: posts, error: postsError } = await query;
    if (postsError) throw postsError;
    if (!posts || posts.length === 0) return [];

    const userIds = [...new Set(posts.map((p) => p.user_id))];
    const { data: profiles } = await client
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    return posts.map((post) => {
      const profile = profileMap.get(post.user_id);
      return {
        id: post.id,
        content: post.content,
        author: profile?.full_name || 'Anonymous',
        author_avatar: profile?.avatar_url || null,
        created_at: post.created_at ?? new Date().toISOString(),
        likes_count: post.likes_count ?? 0,
        comments_count: post.comments_count ?? 0,
      };
    });
  } catch (error) {
    throw createAppError(
      'Unable to load posts for this hashtag.',
      'getPostsByHashtag',
      error,
    );
  }
}

// â”€â”€ React Query Keys â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const trendingTopicsKeys = {
  all: ['trending-topics'] as const,
  list: (params?: GetTrendingTopicsParams) => ['trending-topics', 'list', params] as const,
  byHashtag: (hashtag: string) => ['trending-topics', 'hashtag', hashtag] as const,
};

// â”€â”€ Realtime Subscription â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Creates a Supabase realtime subscription for trending topics updates.
 *
 * @returns Cleanup function to unsubscribe.
 */
export function subscribeTrendingTopics(
  client: SupabaseClient,
  onUpdate: () => void,
): () => void {
  const channel = client
    .channel(CHANNELS.social.trendingTopics())
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'post_hashtags',
      },
      () => {
        onUpdate();
      },
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
