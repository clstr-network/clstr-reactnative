/**
 * Trending Topics API
 * 
 * Provides functions to fetch trending hashtags from Supabase,
 * with React Query integration and realtime support.
 */

import { supabase } from "@/integrations/supabase/client";
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { handleApiError } from "@/lib/errorHandler";

// ============================================================================
// Types
// ============================================================================

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

function isTrendingTopicsUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const anyError = error as { code?: string; message?: string; details?: string; hint?: string };

  const code = anyError.code ?? '';
  const message = anyError.message ?? '';
  const details = anyError.details ?? '';
  const hint = anyError.hint ?? '';
  const text = `${code} ${message} ${details} ${hint}`.toLowerCase();

  // Common signals for â€œfeature not deployed / not accessibleâ€
  if (code === 'PGRST202') return true; // function not found
  if (code === '42883') return true; // undefined function
  if (code === '42501') return true; // insufficient privilege

  return (
    text.includes('could not find the function') ||
    text.includes('function') && text.includes('does not exist') ||
    text.includes('get_trending_topics') && text.includes('not found') ||
    text.includes('permission denied')
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats a timestamp into a relative time string (e.g., "2h ago")
 */
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

/**
 * Transforms raw API response to TrendingTopic format
 */
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

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetches trending topics from Supabase
 * 
 * @param params - Query parameters
 * @returns Promise<TrendingTopic[]> - Array of trending topics
 */
export async function getTrendingTopics({
  collegeDomain,
  timeWindowHours = 168, // 7 days
  limit = 10,
}: GetTrendingTopicsParams = {}): Promise<TrendingTopic[]> {
  try {
    // Get current user's college domain if not provided
    let effectiveDomain = collegeDomain;

    if (effectiveDomain === undefined) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('college_domain')
          .eq('id', authData.user.id)
          .single();
        effectiveDomain = profile?.college_domain ?? null;
      }
    }

    // ECF-4 FIX: If effectiveDomain is still null after lookup, trending
    // queries would either match all domains or return nothing depending on
    // the RPC implementation.  Return an empty result early so callers
    // get deterministic behaviour and don't show misleading "no trends" UIs.
    if (effectiveDomain === null || effectiveDomain === undefined) {
      return [];
    }

    // Call the RPC function
    // Note: Types will be auto-generated after migration is applied
    // Using type assertion to work around pre-migration type constraints
    const { data, error } = await (supabase.rpc as any)(
      'get_trending_topics',
      {
        p_college_domain: effectiveDomain,
        p_time_window_hours: timeWindowHours,
        p_limit: limit,
      }
    );

    if (error) {
      throw error;
    }

    // Transform the response
    const rawData = data as unknown as RawTrendingTopic[] | null;
    const topics = (rawData || []).map((item: RawTrendingTopic, index: number) =>
      transformTrendingTopic(item, index)
    );

    return topics;
  } catch (error) {
    // If trending backend isn't available yet (RPC missing/forbidden), treat as empty state.
    // Avoid spamming users with toasts for optional features.
    if (isTrendingTopicsUnavailable(error)) {
      return [];
    }
    handleApiError(error, {
      operation: 'getTrendingTopics',
      userMessage: 'Unable to load trending topics. Please try again.',
    });
    return [];
  }
}

/**
 * Fetches a specific hashtag's posts
 * Useful for drill-down views
 * 
 * @param hashtag - The hashtag to search (without #)
 * @param limit - Maximum posts to return
 */
export async function getPostsByHashtag(
  hashtag: string,
  limit: number = 20
): Promise<Array<{
  id: string;
  content: string;
  author: string;
  author_avatar: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
}>> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    let collegeDomain: string | null = null;

    if (authData?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('college_domain')
        .eq('id', authData.user.id)
        .single();
      collegeDomain = profile?.college_domain ?? null;
    }

    // Query posts that contain this hashtag using search
    // This approach works without the post_hashtags table during pre-migration
    const normalizedHashtag = hashtag.toLowerCase().replace(/^#/, '');
    const searchPattern = `%#${normalizedHashtag}%`;

    // Build query for posts containing the hashtag
    let query = supabase
      .from('posts')
      .select(`
        id,
        content,
        created_at,
        likes_count,
        comments_count,
        user_id
      `)
      .ilike('content', searchPattern)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply college domain filter if available
    if (collegeDomain) {
      query = query.eq('college_domain', collegeDomain);
    }

    const { data: posts, error: postsError } = await query;

    if (postsError) throw postsError;

    if (!posts || posts.length === 0) {
      return [];
    }

    // Get author info
    const userIds = [...new Set(posts.map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(
      (profiles || []).map(p => [p.id, p])
    );

    return posts.map(post => {
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
    handleApiError(error, {
      operation: 'getPostsByHashtag',
      userMessage: 'Unable to load posts for this hashtag.',
    });
    return [];
  }
}

// ============================================================================
// React Query Keys
// ============================================================================

export const trendingTopicsKeys = {
  all: ['trending-topics'] as const,
  list: (params?: GetTrendingTopicsParams) =>
    ['trending-topics', 'list', params] as const,
  byHashtag: (hashtag: string) =>
    ['trending-topics', 'hashtag', hashtag] as const,
};

// ============================================================================
// Realtime Subscription Helper
// ============================================================================

/**
 * Creates a Supabase realtime subscription for trending topics updates
 * 
 * @param onUpdate - Callback when hashtags change
 * @returns Cleanup function to unsubscribe
 */
export function subscribeTrendingTopics(
  onUpdate: () => void
): () => void {
  const channel = supabase
    .channel(CHANNELS.social.trendingTopics())
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'post_hashtags',
      },
      () => {
        // Debounce updates to avoid excessive refetches
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
