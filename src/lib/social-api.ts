import { supabase } from "@/integrations/supabase/client";
import { handleApiError } from "@/lib/errorHandler";
import { assertValidUuid } from "@/lib/uuid";
import { normalizeCollegeDomain } from "@/lib/validation";
import { hasPermission, type UserRole } from "@/lib/permissions";
import {
  getConversations as getConversationsCore,
  getMessages as getMessagesCore,
  markMessagesAsRead as markMessagesAsReadCore,
  sendMessage as sendMessageCore,
} from "@/lib/messages-api";
import type { Json } from "@/integrations/supabase/types";

const POST_MEDIA_BUCKET = "post-media";
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB limit per attachment

// ============================================================================
// LINKEDIN-STYLE REACTION TYPES
// ============================================================================
export type ReactionType = 'like' | 'celebrate' | 'support' | 'love' | 'insightful' | 'curious' | 'laugh';

export const REACTION_EMOJI_MAP: Record<ReactionType, string> = {
  like: '👍',
  celebrate: '🎉',
  support: '🤝',
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
  laugh: 'Laugh',
};

export interface ReactionCount {
  type: ReactionType;
  count: number;
}

export interface ReactionSummary {
  total: number;
  topReactions: ReactionCount[];
  userReaction: ReactionType | null;
}

export interface FeedFilters {
  collegeDomain?: string | null;
}

export interface GetUserPostsParams {
  pageSize?: number;
  cursor?: string | null;
}

export interface GetPostsParams {
  pageSize?: number;
  cursor?: string | null;
  filters?: FeedFilters;
  sortBy?: 'recent' | 'top';
}

export interface GetPostsResponse {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type PostAttachmentInput = {
  type: "image" | "video" | "document";
  file?: File;
  url?: string;
};

export interface CreatePostPayload {
  content: string;
  attachment?: PostAttachmentInput;
  poll?: Poll;
}

// Poll option interface
interface PollOption {
  text: string;
  votes: number;
  [key: string]: Json | undefined;
}

interface Poll {
  question: string;
  options: PollOption[];
  endDate: string;
  [key: string]: Json | undefined;
}

const normalizePoll = (value: unknown): Poll | undefined => {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) return undefined;

  const maybePoll = value as Partial<Poll>;
  if (typeof maybePoll.question !== "string") return undefined;
  if (typeof maybePoll.endDate !== "string") return undefined;
  if (!Array.isArray(maybePoll.options)) return undefined;

  return maybePoll as Poll;
};

export interface Post {
  id: string;
  user_id: string;
  content: string;
  images?: string[];
  video?: string;
  documents?: string[];
  poll?: Poll;
  likes_count: number;
  views_count?: number;
  comments_count: number;
  shares_count: number;
  reposts_count?: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
    college_domain?: string | null;
  };
  // LinkedIn-style engagement data
  liked?: boolean;
  saved?: boolean;
  userReaction?: ReactionType | null;
  topReactions?: ReactionCount[];
  reposted?: boolean;
  // If this is a repost, contains the original post
  originalPost?: Post | null;
  repostCommentary?: string | null;
  isRepost?: boolean;
}

// Repost interface
export interface Repost {
  id: string;
  original_post_id: string;
  user_id: string;
  college_domain: string;
  commentary_text: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
  };
  originalPost?: Post;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
  };
  replies?: Comment[];
  liked?: boolean;
}

export interface Connection {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  message?: string;
  created_at: string;
  updated_at: string;
  requester?: {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
    college_domain?: string | null;
  };
  receiver?: {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
  };
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  receiver?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

const ensureAuthenticatedUser = async () => {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) {
    throw new Error("User not authenticated");
  }
  return data.user;
};

const fetchCollegeDomainForUser = async (userId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("college_domain")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const raw = data?.college_domain ?? null;
  if (!raw) return null;
  const normalized = normalizeCollegeDomain(raw);
  return normalized || null;
};

const ensureCollegeDomain = async (userId: string, filters?: FeedFilters) => {
  const profileDomain = await fetchCollegeDomainForUser(userId);

  if (!profileDomain) {
    throw new Error("Profile missing college domain. Please complete onboarding.");
  }

  if (filters?.collegeDomain) {
    const requested = normalizeCollegeDomain(filters.collegeDomain);
    if (requested && requested !== profileDomain) {
      throw new Error("You can only access posts from your own college domain.");
    }
  }

  return profileDomain;
};

const getFileExtension = (file: File) => {
  const byName = file.name?.split(".").pop();
  if (byName && byName.length <= 10) {
    return byName.toLowerCase();
  }
  const byType = file.type?.split("/").pop();
  if (byType) {
    return byType.toLowerCase();
  }
  return "bin";
};

const uploadPostAttachment = async (file: File, userId: string, type: "image" | "video" | "document") => {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error("Attachment is too large. Maximum size is 20MB.");
  }

  const extension = getFileExtension(file);
  const safeType = type === "image" ? "images" : type === "video" ? "videos" : "documents";
  const filePath = `${userId}/${safeType}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error } = await supabase.storage
    .from(POST_MEDIA_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || undefined,
    });

  if (error) {
    if (error.message?.includes("not found")) {
      throw new Error("Post media bucket missing. Create a 'post-media' bucket in Supabase storage.");
    }
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(filePath);

  return publicUrl;
};

// ===== POST FUNCTIONS =====

export async function createPost(payload: CreatePostPayload) {
  try {
    const user = await ensureAuthenticatedUser();
    const content = payload.content?.trim();
    if (!content) {
      const error = new Error("Post content cannot be empty");
      error.name = 'ValidationError';
      throw error;
    }

    // Enforce canonical college domain on write.
    // This is the primary guard against cross-college leakage.
    const collegeDomain = await ensureCollegeDomain(user.id);

    let images: string[] | undefined;
    let video: string | undefined;
    let documents: string[] | undefined;

    if (payload.attachment) {
      const { type, file, url } = payload.attachment;
      if (type === "image") {
        if (file) {
          const uploadedUrl = await uploadPostAttachment(file, user.id, "image");
          images = [uploadedUrl];
        } else if (url) {
          images = [url];
        }
      } else if (type === "video") {
        if (file) {
          video = await uploadPostAttachment(file, user.id, "video");
        } else if (url) {
          video = url;
        }
      } else if (type === "document") {
        if (file) {
          const uploadedUrl = await uploadPostAttachment(file, user.id, "document");
          documents = [uploadedUrl];
        }
      }
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        content,
        images,
        video,
        documents,
        college_domain: collegeDomain,
        poll: (payload.poll ?? null) as unknown as Json | null,
      })
      .select(`*`)
      .single();

    if (error) throw error;

    // Fetch the user profile separately
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role, college_domain")
      .eq("id", user.id)
      .single();

    return {
      ...data,
      poll: normalizePoll((data as unknown as { poll?: unknown })?.poll),
      user: userProfile ? {
        id: userProfile.id,
        full_name: userProfile.full_name || 'Anonymous',
        avatar_url: userProfile.avatar_url || '',
        role: userProfile.role || 'Member',
        college_domain: userProfile.college_domain || null,
      } : undefined,
    };
  } catch (error) {
    throw handleApiError(error, {
      operation: "createPost",
      userMessage: "Unable to create your post right now. Please try again.",
    });
  }
}

export async function getPosts(params: GetPostsParams = {}): Promise<GetPostsResponse> {
  try {
    const user = await ensureAuthenticatedUser();
    const { pageSize = 10, cursor = null, sortBy = 'recent' } = params;

    const collegeDomain = await ensureCollegeDomain(user.id, params.filters);

    // Determine ordering based on sortBy parameter
    const orderColumn = sortBy === 'top' ? 'likes_count' : 'created_at';

    // Fetch posts first (without relying on FK join which may fail)
    let query = supabase
      .from("posts")
      .select(`
        id,
        user_id,
        content,
        images,
        video,
        documents,
        college_domain,
        poll,
        likes_count,
        comments_count,
        shares_count,
        created_at,
        updated_at
      `)
      .eq("college_domain", collegeDomain)
      .order(orderColumn, { ascending: false })
      .limit(pageSize + 1);

    // For cursor-based pagination with 'top' sort, we use likes_count
    if (cursor && sortBy === 'recent') {
      query = query.lt("created_at", cursor);
    } else if (cursor && sortBy === 'top') {
      // For top sorting, cursor is the likes_count of the last item
      query = query.lt("likes_count", parseInt(cursor));
    }

    const { data, error } = await query;
    if (error) throw error;

    // Filter out posts the user has hidden
    let visiblePosts = data ?? [];
    try {
      const { data: hiddenRows } = await supabase
        .from("hidden_posts")
        .select("post_id")
        .eq("user_id", user.id);

      if (hiddenRows && hiddenRows.length > 0) {
        const hiddenIds = new Set(hiddenRows.map((r: { post_id: string }) => r.post_id));
        visiblePosts = visiblePosts.filter((p) => !hiddenIds.has(p.id));
      }
    } catch (err) {
      console.warn('Failed to fetch hidden posts, showing all:', err);
    }

    const posts = visiblePosts;
    const limited = posts.slice(0, pageSize);
    const postIds = limited.map((post) => post.id);
    const userIds = [...new Set(limited.map((post) => post.user_id))];

    // Fetch profiles for all post authors in a single query
    const profilesMap = new Map<string, { id: string; full_name: string | null; avatar_url: string | null; role: string | null; college_domain: string | null }>();
    if (userIds.length > 0) {
      try {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, role, college_domain")
          .in("id", userIds);

        if (!profilesError && profiles) {
          profiles.forEach((profile) => {
            profilesMap.set(profile.id, profile);
          });
        } else if (profilesError) {
          console.warn('Failed to fetch profiles for posts:', profilesError);
        }
      } catch (err) {
        console.warn('Ignored error fetching profiles:', err);
      }
    }

    // Fetch user reactions (with reaction type) and top reactions for each post
    const userReactionsMap = new Map<string, ReactionType>();
    const topReactionsMap = new Map<string, ReactionCount[]>();
    
    if (postIds.length > 0) {
      try {
        // Fetch user's reactions with reaction type
        const result = await supabase
          .from("post_likes")
          .select("post_id, reaction_type")
          .eq("user_id", user.id)
          .in("post_id", postIds);

        const reactions = result?.data ?? null;
        const reactionsError = result?.error ?? null;

        if (!reactionsError && reactions) {
          reactions.forEach((r: { post_id: string; reaction_type: string }) => {
            userReactionsMap.set(r.post_id, r.reaction_type as ReactionType);
          });
        } else if (reactionsError) {
          console.warn('Failed to fetch user reactions:', reactionsError);
        }

        // Fetch top reactions for all posts (batch query)
        const { data: allReactions, error: allReactionsError } = await supabase
          .from("post_likes")
          .select("post_id, reaction_type")
          .in("post_id", postIds);

        if (!allReactionsError && allReactions) {
          // Group reactions by post and count them
          const reactionsByPost = new Map<string, Map<string, number>>();
          allReactions.forEach((r: { post_id: string; reaction_type: string }) => {
            if (!reactionsByPost.has(r.post_id)) {
              reactionsByPost.set(r.post_id, new Map());
            }
            const postReactions = reactionsByPost.get(r.post_id)!;
            postReactions.set(r.reaction_type, (postReactions.get(r.reaction_type) || 0) + 1);
          });

          // Convert to top reactions array (top 3 by count)
          reactionsByPost.forEach((reactions, postId) => {
            const sorted = Array.from(reactions.entries())
              .map(([type, count]) => ({ type: type as ReactionType, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 3);
            topReactionsMap.set(postId, sorted);
          });
        } else if (allReactionsError) {
          console.warn('Failed to fetch top reactions:', allReactionsError);
        }
      } catch (err) {
        console.warn('Ignored error fetching reactions:', err);
      }
    }

    // Fetch repost state for user
    const repostedPostIds = new Set<string>();
    if (postIds.length > 0) {
      try {
        const { data: userReposts } = await supabase
          .from("reposts")
          .select("original_post_id")
          .eq("user_id", user.id)
          .in("original_post_id", postIds);

        userReposts?.forEach((r: { original_post_id: string }) => repostedPostIds.add(r.original_post_id));
      } catch (err) {
        console.warn('Failed to fetch repost state:', err);
      }
    }

    const normalizedPosts = limited.map((post) => {
      const userProfile = profilesMap.get(post.user_id);
      const userReaction = userReactionsMap.get(post.id);
      return {
        ...post,
        poll: normalizePoll((post as unknown as { poll?: unknown })?.poll),
        liked: userReaction !== undefined,
        userReaction: userReaction || null,
        topReactions: topReactionsMap.get(post.id) || [],
        reposted: repostedPostIds.has(post.id),
        user: userProfile ? {
          id: userProfile.id,
          full_name: userProfile.full_name || 'Anonymous',
          avatar_url: userProfile.avatar_url || '',
          role: userProfile.role || 'Member',
          college_domain: userProfile.college_domain || null,
        } : undefined,
      };
    });

    // Saved state (bookmarks)
    let savedPostIds = new Set<string>();
    if (postIds.length > 0) {
      try {
        const result = await supabase
          .from("saved_items")
          .select("item_id")
          .eq("user_id", user.id)
          .eq("type", "post")
          .in("item_id", postIds);

        const savedRows = result?.data ?? null;
        const savedError = result?.error ?? null;

        if (!savedError && savedRows) {
          savedPostIds = new Set((savedRows || []).map((row: { item_id: string }) => row.item_id));
        } else if (savedError) {
          console.warn("Failed to fetch saved posts:", savedError);
        }
      } catch (err) {
        console.warn("Ignored error fetching saved posts:", err);
      }
    }

    const postsWithSaved = normalizedPosts.map((post) => ({
      ...post,
      saved: savedPostIds.has(post.id),
    }));

    const hasMore = posts.length > pageSize;
    // Use appropriate cursor based on sort order
    const nextCursor = hasMore
      ? (sortBy === 'top' ? String(posts[pageSize].likes_count) : posts[pageSize].created_at)
      : null;

    return {
      posts: postsWithSaved,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    throw handleApiError(error, {
      operation: "getPosts",
      userMessage: "Failed to load your feed.",
      details: { params },
    });
  }
}

export async function getPostsByUser(targetUserId: string, params: GetUserPostsParams = {}): Promise<GetPostsResponse> {
  try {
    assertValidUuid(targetUserId, "targetUserId");
    const user = await ensureAuthenticatedUser();
    const { pageSize = 10, cursor = null } = params;

    const viewerCollegeDomain = await ensureCollegeDomain(user.id);
    const targetCollegeDomain = await fetchCollegeDomainForUser(targetUserId);
    if (!targetCollegeDomain) {
      throw new Error("Target profile missing college domain.");
    }
    if (targetCollegeDomain !== viewerCollegeDomain) {
      throw new Error("You can only view posts from your own college domain.");
    }

    let query = supabase
      .from("posts")
      .select(
        `
        id,
        user_id,
        content,
        images,
        video,
        documents,
        college_domain,
        poll,
        likes_count,
        comments_count,
        shares_count,
        created_at,
        updated_at
      `
      )
      .eq("user_id", targetUserId)
      .eq("college_domain", viewerCollegeDomain)
      .order("created_at", { ascending: false })
      .limit(pageSize + 1);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const posts = data ?? [];
    const limited = posts.slice(0, pageSize);
    const postIds = limited.map((post) => post.id);

    // Fetch profile for the author (single user)
    let authorProfile:
      | {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        role: string | null;
        college_domain: string | null;
      }
      | null = null;

    try {
      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role, college_domain")
        .eq("id", targetUserId)
        .maybeSingle();

      if (!profileError && profileRow) {
        authorProfile = profileRow;
      } else if (profileError) {
        console.warn("Failed to fetch profile for user posts:", profileError);
      }
    } catch (err) {
      console.warn("Ignored error fetching profile for user posts:", err);
    }

    // Liked state
    let likedPostIds = new Set<string>();
    if (postIds.length > 0) {
      try {
        const result = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds);

        const likes = result?.data ?? null;
        const likesError = result?.error ?? null;

        if (!likesError && likes) {
          likedPostIds = new Set((likes || []).map((like: { post_id: string }) => like.post_id));
        } else if (likesError) {
          console.warn("Failed to fetch liked posts:", likesError);
        }
      } catch (err) {
        console.warn("Ignored error fetching liked posts:", err);
      }
    }

    const normalizedPosts = limited.map((post) => ({
      ...post,
      poll: normalizePoll((post as unknown as { poll?: unknown })?.poll),
      liked: likedPostIds.has(post.id),
      user: authorProfile
        ? {
          id: authorProfile.id,
          full_name: authorProfile.full_name || "Anonymous",
          avatar_url: authorProfile.avatar_url || "",
          role: authorProfile.role || "Member",
          college_domain: authorProfile.college_domain || null,
        }
        : undefined,
    }));

    // Saved state
    let savedPostIds = new Set<string>();
    if (postIds.length > 0) {
      try {
        const result = await supabase
          .from("saved_items")
          .select("item_id")
          .eq("user_id", user.id)
          .eq("type", "post")
          .in("item_id", postIds);

        const savedRows = result?.data ?? null;
        const savedError = result?.error ?? null;

        if (!savedError && savedRows) {
          savedPostIds = new Set((savedRows || []).map((row: { item_id: string }) => row.item_id));
        } else if (savedError) {
          console.warn("Failed to fetch saved posts:", savedError);
        }
      } catch (err) {
        console.warn("Ignored error fetching saved posts:", err);
      }
    }

    const postsWithSaved = normalizedPosts.map((post) => ({
      ...post,
      saved: savedPostIds.has(post.id),
    }));

    const hasMore = posts.length > pageSize;
    const nextCursor = hasMore ? posts[pageSize].created_at : null;

    return {
      posts: postsWithSaved,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    throw handleApiError(error, {
      operation: "getPostsByUser",
      userMessage: "Failed to load posts.",
      details: { targetUserId, params },
    });
  }
}

export async function getUserPostsCount(targetUserId: string): Promise<number> {
  try {
    assertValidUuid(targetUserId, "targetUserId");

    // Use SECURITY DEFINER RPC that handles college-domain checks internally.
    // This avoids the client-side domain check that can throw and cascade-fail.
    const { data, error } = await supabase.rpc('get_user_posts_count', {
      p_target_user_id: targetUserId,
    });

    if (error) {
      // Fallback if RPC doesn't exist yet (42883)
      const rpcCode = (error as { code?: string }).code;
      if (rpcCode === '42883') {
        const user = await ensureAuthenticatedUser();
        const viewerCollegeDomain = await ensureCollegeDomain(user.id);
        const targetCollegeDomain = await fetchCollegeDomainForUser(targetUserId);
        if (!targetCollegeDomain || targetCollegeDomain !== viewerCollegeDomain) {
          return 0;
        }
        const { count, error: fallbackError } = await supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", targetUserId)
          .eq("college_domain", viewerCollegeDomain);
        if (fallbackError) throw fallbackError;
        return count ?? 0;
      }
      throw error;
    }

    return (data as number) ?? 0;
  } catch (error) {
    throw handleApiError(error, {
      operation: "getUserPostsCount",
      userMessage: "Failed to load posts count.",
      details: { targetUserId },
    });
  }
}

/**
 * PUBLIC POST FETCH - No auth required
 * Used for public post view (/post/:id) - allows unauthenticated users to view posts
 * Returns read-only post data without user-specific state (liked, saved)
 */
export async function getPostByIdPublic(postId: string): Promise<Post> {
  try {
    assertValidUuid(postId, "postId");

    const { data: post, error } = await supabase
      .from("posts")
      .select(`
        id,
        user_id,
        content,
        images,
        video,
        documents,
        college_domain,
        poll,
        likes_count,
        comments_count,
        shares_count,
        created_at,
        updated_at
      `)
      .eq("id", postId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Post not found");
      }
      throw error;
    }

    // Fetch author profile (public data only)
    let userProfile: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      role: string | null;
      college_domain: string | null;
    } | null = null;

    try {
      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role, college_domain")
        .eq("id", post.user_id)
        .maybeSingle();

      if (!profileError && profileRow) {
        userProfile = profileRow;
      }
    } catch (err) {
      console.warn("Failed to fetch profile for public post:", err);
    }

    return {
      ...post,
      poll: normalizePoll((post as unknown as { poll?: unknown })?.poll),
      liked: false, // Public view - not logged in
      saved: false, // Public view - not logged in
      user: userProfile
        ? {
            id: userProfile.id,
            full_name: userProfile.full_name || "Anonymous",
            avatar_url: userProfile.avatar_url || "",
            role: userProfile.role || "Member",
            college_domain: userProfile.college_domain || null,
          }
        : undefined,
    };
  } catch (error) {
    throw handleApiError(error, {
      operation: "getPostByIdPublic",
      userMessage: "Failed to load this post.",
      details: { postId },
    });
  }
}

export async function getPostById(postId: string): Promise<Post> {
  try {
    assertValidUuid(postId, "postId");
    const user = await ensureAuthenticatedUser();
    const collegeDomain = await ensureCollegeDomain(user.id);

    const { data: post, error } = await supabase
      .from("posts")
      .select(`
        id,
        user_id,
        content,
        images,
        video,
        documents,
        college_domain,
        poll,
        likes_count,
        comments_count,
        shares_count,
        created_at,
        updated_at
      `)
      .eq("id", postId)
      .single();

    if (error) throw error;

    if (post.college_domain && post.college_domain !== collegeDomain) {
      throw new Error("You can only access posts from your own college domain.");
    }

    let userProfile:
      | {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        role: string | null;
        college_domain: string | null;
      }
      | null = null;

    try {
      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role, college_domain")
        .eq("id", post.user_id)
        .maybeSingle();

      if (!profileError && profileRow) {
        userProfile = profileRow;
      } else if (profileError) {
        console.warn("Failed to fetch profile for post detail:", profileError);
      }
    } catch (err) {
      console.warn("Ignored error fetching profile for post detail:", err);
    }

    let liked = false;
    try {
      const { data: likeRow, error: likeError } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!likeError && likeRow) {
        liked = true;
      } else if (likeError) {
        console.warn("Failed to fetch liked state for post detail:", likeError);
      }
    } catch (err) {
      console.warn("Ignored error fetching liked state:", err);
    }

    let saved = false;
    try {
      const { data: savedRow, error: savedError } = await supabase
        .from("saved_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "post")
        .eq("item_id", postId)
        .maybeSingle();

      if (!savedError && savedRow) {
        saved = true;
      } else if (savedError) {
        console.warn("Failed to fetch saved state for post detail:", savedError);
      }
    } catch (err) {
      console.warn("Ignored error fetching saved state:", err);
    }

    return {
      ...post,
      poll: normalizePoll((post as unknown as { poll?: unknown })?.poll),
      liked,
      saved,
      user: userProfile
        ? {
          id: userProfile.id,
          full_name: userProfile.full_name || "Anonymous",
          avatar_url: userProfile.avatar_url || "",
          role: userProfile.role || "Member",
          college_domain: userProfile.college_domain || null,
        }
        : undefined,
    };
  } catch (error) {
    throw handleApiError(error, {
      operation: "getPostById",
      userMessage: "Failed to load this post.",
      details: { postId },
    });
  }
}

export async function getConnectionStatusesForUsers(targetUserIds: string[]) {
  const user = await ensureAuthenticatedUser();

  const uniqueIds = [...new Set(targetUserIds)].filter(Boolean);
  uniqueIds.forEach((id) => assertValidUuid(id, "targetUserId"));

  if (uniqueIds.length === 0) {
    return new Map<string, string | null>();
  }

  // Fetch any connection rows between the current user and the target users.
  const { data, error } = await supabase
    .from("connections")
    .select("requester_id, receiver_id, status")
    .or(
      `and(requester_id.eq.${user.id},receiver_id.in.(${uniqueIds.join(",")})),and(receiver_id.eq.${user.id},requester_id.in.(${uniqueIds.join(",")}))`
    );

  if (error) throw error;

  const statusByUserId = new Map<string, string | null>();
  uniqueIds.forEach((id) => statusByUserId.set(id, null));

  const statusPriority: Record<string, number> = {
    accepted: 1,
    pending: 2,
    blocked: 3,
    rejected: 4,
  };

  (data ?? []).forEach((row) => {
    const otherId = row.requester_id === user.id ? row.receiver_id : row.requester_id;
    if (!statusByUserId.has(otherId)) return;

    const incomingStatus = row.status ?? null;
    const existingStatus = statusByUserId.get(otherId) ?? null;

    if (!incomingStatus) return;
    if (!existingStatus) {
      statusByUserId.set(otherId, incomingStatus);
      return;
    }

    const existingPriority = statusPriority[existingStatus] ?? Number.MAX_SAFE_INTEGER;
    const incomingPriority = statusPriority[incomingStatus] ?? Number.MAX_SAFE_INTEGER;

    if (incomingPriority < existingPriority) {
      statusByUserId.set(otherId, incomingStatus);
    }
  });

  return statusByUserId;
}

export async function togglePostLike(postId: string) {
  return toggleReaction(postId, 'like');
}

// Legacy alias for backward compatibility
export async function toggleLike(postId: string, userId?: string) {
  void userId;
  const result = await toggleReaction(postId, 'like');
  return { liked: result.reaction !== null };
}

/**
 * LinkedIn-style Reaction Toggle
 * - If user has no reaction: adds the reaction
 * - If user has same reaction: removes it
 * - If user has different reaction: changes to new reaction
 */
export async function toggleReaction(
  postId: string, 
  reactionType: ReactionType = 'like'
): Promise<{
  action: 'added' | 'removed' | 'changed';
  reaction: ReactionType | null;
  previous?: ReactionType;
  totalReactions: number;
  topReactions: ReactionCount[];
}> {
  try {
    assertValidUuid(postId, "postId");
    const user = await ensureAuthenticatedUser();

    // Call the RPC function for atomic reaction toggle
    const { data, error } = await (supabase.rpc as any)(
      'toggle_reaction',
      {
        p_post_id: postId,
        p_reaction_type: reactionType,
      }
    );

    if (error) throw error;

    const result = data as {
      action: string;
      reaction: string | null;
      previous?: string;
      total_reactions: number;
      top_reactions: Array<{ type: string; count: number }> | null;
    };

    return {
      action: result.action as 'added' | 'removed' | 'changed',
      reaction: result.reaction as ReactionType | null,
      previous: result.previous as ReactionType | undefined,
      totalReactions: result.total_reactions || 0,
      topReactions: (result.top_reactions || []).map(r => ({
        type: r.type as ReactionType,
        count: r.count,
      })),
    };
  } catch (error) {
    throw handleApiError(error, {
      operation: "toggleReaction",
      details: { postId, reactionType },
      userMessage: "Unable to update your reaction. Please try again.",
    });
  }
}

/**
 * Get top reactions for a post
 */
export async function getPostTopReactions(postId: string): Promise<ReactionCount[]> {
  try {
    assertValidUuid(postId, "postId");

    const { data, error } = await (supabase.rpc as any)(
      'get_post_top_reactions',
      { p_post_id: postId }
    );

    if (error) throw error;

    return (data || []).map((r: { reaction_type: string; count: number }) => ({
      type: r.reaction_type as ReactionType,
      count: r.count,
    }));
  } catch (error) {
    console.warn('Failed to get post reactions:', error);
    return [];
  }
}

/**
 * Get user's reaction on a specific post
 */
export async function getUserReaction(postId: string): Promise<ReactionType | null> {
  try {
    assertValidUuid(postId, "postId");

    const { data, error } = await (supabase.rpc as any)(
      'get_user_reaction',
      { p_post_id: postId }
    );

    if (error) throw error;

    return data as ReactionType | null;
  } catch (error) {
    console.warn('Failed to get user reaction:', error);
    return null;
  }
}

export async function likePost(postId: string) {
  assertValidUuid(postId, "postId");
  const currentReaction = await getUserReaction(postId);
  if (currentReaction === 'like') {
    return { liked: true };
  }

  const result = await toggleReaction(postId, 'like');
  return { liked: result.reaction !== null };
}

export async function unlikePost(postId: string) {
  assertValidUuid(postId, "postId");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("post_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", user.id);

  if (error) throw error;
  return { liked: false };
}

export async function deletePost(postId: string) {
  assertValidUuid(postId, "postId");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", user.id);

  if (error) throw error;
}

export async function updatePost(postId: string, updates: {
  content?: string;
  images?: string[];
  video?: string;
}) {
  assertValidUuid(postId, "postId");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  if (typeof updates.content === "string" && !updates.content.trim()) {
    throw new Error("Post content cannot be empty");
  }

  const hasUpdates = Object.keys(updates).some((key) => updates[key as keyof typeof updates] !== undefined);
  if (!hasUpdates) {
    throw new Error("No updates provided");
  }

  const { data, error } = await supabase
    .from("posts")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .eq("user_id", user.id)
    .select(`*`)
    .single();

  if (error) throw error;

  // Fetch the user profile separately
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  return {
    ...data,
    user: userProfile || undefined,
  };
}

// ===== COMMENT FUNCTIONS =====

export async function getComments(postId: string, limit = 50) {
  assertValidUuid(postId, "postId");
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch comments with pagination to avoid huge payloads
  const { data: comments, error } = await supabase
    .from("comments")
    .select(`*`)
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  if (!comments || comments.length === 0) {
    return [];
  }

  const userIds = [...new Set(comments.map(c => c.user_id))];
  const commentIds = comments.map(c => c.id);

  // Parallel fetch: profiles + comment likes in one pass
  const [profilesResult, likesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .in("id", userIds),
    user
      ? supabase
          .from("comment_likes")
          .select("comment_id")
          .eq("user_id", user.id)
          .in("comment_id", commentIds)
      : Promise.resolve({ data: null, error: null }),
  ]);

  const profilesMap = new Map(
    (profilesResult.data ?? []).map(p => [p.id, p])
  );
  const likedCommentIds = new Set(
    (likesResult.data ?? []).map((l: { comment_id: string }) => l.comment_id)
  );

  // Build nested structure
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  comments.forEach(comment => {
    const userProfile = profilesMap.get(comment.user_id);
    const commentWithLike = {
      ...comment,
      liked: likedCommentIds.has(comment.id),
      replies: [],
      user: userProfile ? {
        id: userProfile.id,
        full_name: userProfile.full_name || 'Anonymous',
        avatar_url: userProfile.avatar_url || '',
        role: userProfile.role || 'Member',
      } : undefined,
    };
    commentMap.set(comment.id, commentWithLike);
  });

  comments.forEach(comment => {
    const commentNode = commentMap.get(comment.id)!;
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(commentNode);
      }
    } else {
      rootComments.push(commentNode);
    }
  });

  return rootComments;
}

export async function createComment(data: {
  post_id: string;
  content: string;
  parent_id?: string;
}) {
  assertValidUuid(data.post_id, "postId");
  if (data.parent_id) assertValidUuid(data.parent_id, "parentCommentId");
  const user = await ensureAuthenticatedUser();
  const collegeDomain = await ensureCollegeDomain(user.id);

  const { data: postRow, error: postError } = await supabase
    .from("posts")
    .select("id, college_domain")
    .eq("id", data.post_id)
    .maybeSingle();

  if (postError) throw postError;
  if (!postRow) {
    throw new Error("Post not found");
  }
  if (postRow.college_domain && postRow.college_domain !== collegeDomain) {
    throw new Error("You can only comment on posts from your own college domain.");
  }

  if (data.parent_id) {
    const { data: parentRow, error: parentError } = await supabase
      .from("comments")
      .select("id, post_id")
      .eq("id", data.parent_id)
      .maybeSingle();

    if (parentError) throw parentError;
    if (!parentRow) {
      throw new Error("Parent comment not found");
    }
    if (parentRow.post_id !== data.post_id) {
      throw new Error("Replies must target a comment on the same post.");
    }
  }

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      user_id: user.id,
      ...data,
      college_domain: postRow.college_domain ?? collegeDomain,
    })
    .select(`*`)
    .single();

  if (error) throw error;

  // Fetch user profile separately
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  return {
    ...comment,
    user: userProfile || undefined,
  };
}

export async function toggleCommentLike(commentId: string) {
  assertValidUuid(commentId, "commentId");
  const user = await ensureAuthenticatedUser();
  const collegeDomain = await ensureCollegeDomain(user.id);

  const { data: commentRow, error: commentError } = await supabase
    .from("comments")
    .select("id, post_id, college_domain")
    .eq("id", commentId)
    .maybeSingle();

  if (commentError) throw commentError;
  if (!commentRow) {
    throw new Error("Comment not found");
  }
  if (commentRow.college_domain && commentRow.college_domain !== collegeDomain) {
    throw new Error("You can only react to comments from your own college domain.");
  }

  const likeCollegeDomain = commentRow.college_domain ?? collegeDomain;

  const { data: existing, error: existingError } = await supabase
    .from("comment_likes")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .eq("id", existing.id);
    if (error) throw error;
    return { liked: false };
  } else {
    const { error } = await supabase
      .from("comment_likes")
      .insert({ comment_id: commentId, user_id: user.id, college_domain: likeCollegeDomain });
    if (error) throw error;
    return { liked: true };
  }
}

/**
 * Edit a comment
 * Only the comment author can edit their own comment
 */
export async function editComment(commentId: string, content: string): Promise<Comment> {
  try {
    assertValidUuid(commentId, "commentId");
    const user = await ensureAuthenticatedUser();
    const collegeDomain = await ensureCollegeDomain(user.id);

    // Verify the comment exists and belongs to the user
    const { data: commentRow, error: commentError } = await supabase
      .from("comments")
      .select("id, user_id, post_id, college_domain")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError) throw commentError;
    if (!commentRow) {
      throw new Error("Comment not found");
    }

    // Only the author can edit their own comment
    if (commentRow.user_id !== user.id) {
      throw new Error("You can only edit your own comments");
    }

    // Ensure college domain matches
    if (commentRow.college_domain && commentRow.college_domain !== collegeDomain) {
      throw new Error("You can only edit comments from your own college domain");
    }

    // Update the comment
    const { data, error } = await supabase
      .from("comments")
      .update({ content: content.trim(), updated_at: new Date().toISOString() })
      .eq("id", commentId)
      .eq("user_id", user.id)
      .select(`*`)
      .single();

    if (error) throw error;

    // Fetch user profile for the response
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .eq("id", user.id)
      .maybeSingle();

    return {
      ...data,
      user: profile ? {
        id: profile.id,
        full_name: profile.full_name || 'Anonymous',
        avatar_url: profile.avatar_url || '',
        role: profile.role || 'Member',
      } : undefined,
    } as Comment;
  } catch (error) {
    throw handleApiError(error, {
      operation: "editComment",
      userMessage: "Failed to edit comment. Please try again.",
      details: { commentId },
    });
  }
}

/**
 * Delete a comment
 * Only the comment author can delete their own comment
 * Note: Deleting a top-level comment will decrement comments_count
 * Deleting a reply will NOT decrement comments_count (per spec)
 */
export async function deleteComment(commentId: string): Promise<void> {
  try {
    assertValidUuid(commentId, "commentId");
    const user = await ensureAuthenticatedUser();
    const collegeDomain = await ensureCollegeDomain(user.id);

    // Verify the comment exists and belongs to the user
    const { data: commentRow, error: commentError } = await supabase
      .from("comments")
      .select("id, user_id, post_id, parent_id, college_domain")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError) throw commentError;
    if (!commentRow) {
      throw new Error("Comment not found");
    }

    // Only the author can delete their own comment
    if (commentRow.user_id !== user.id) {
      throw new Error("You can only delete your own comments");
    }

    // Ensure college domain matches
    if (commentRow.college_domain && commentRow.college_domain !== collegeDomain) {
      throw new Error("You can only delete comments from your own college domain");
    }

    // Delete the comment (cascade will handle replies and likes)
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (error) throw error;
  } catch (error) {
    throw handleApiError(error, {
      operation: "deleteComment",
      userMessage: "Failed to delete comment. Please try again.",
      details: { commentId },
    });
  }
}

// ===== CONNECTION FUNCTIONS =====

export async function sendConnectionRequest(receiverId: string, message?: string) {
  assertValidUuid(receiverId, "receiverId");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (receiverId === user.id) {
    throw new Error("You cannot connect with yourself.");
  }

  const { data: requesterProfile, error: requesterProfileError } = await supabase
    .from("profiles")
    .select("role, college_domain")
    .eq("id", user.id)
    .maybeSingle();

  if (requesterProfileError) throw requesterProfileError;

  const requesterRole = (requesterProfile?.role as UserRole | null) ?? null;
  if (!hasPermission(requesterRole, "canSendConnectionRequest")) {
    throw new Error("You are not authorized to send connection requests.");
  }

  const collegeDomain = requesterProfile?.college_domain
    ? normalizeCollegeDomain(requesterProfile.college_domain)
    : null;

  if (!collegeDomain) {
    throw new Error("Profile missing college domain. Please complete onboarding.");
  }

  // CB-2 FIX: Validate receiver is in the same college domain before allowing request
  const { data: receiverProfile, error: receiverProfileError } = await supabase
    .from("profiles")
    .select("college_domain")
    .eq("id", receiverId)
    .maybeSingle();

  if (receiverProfileError) throw receiverProfileError;

  const receiverDomain = receiverProfile?.college_domain
    ? normalizeCollegeDomain(receiverProfile.college_domain)
    : null;

  if (!receiverDomain) {
    throw new Error("Receiver profile missing college domain.");
  }

  if (receiverDomain !== collegeDomain) {
    throw new Error("You can only connect with users from your own college domain.");
  }

  const { data: existingConnection, error: existingError } = await supabase
    .from("connections")
    .select("id, status")
    .or(`and(requester_id.eq.${user.id},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${user.id})`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingConnection) {
    if (existingConnection.status === "accepted") {
      throw new Error("You are already connected with this user.");
    }
    if (existingConnection.status === "pending") {
      throw new Error("A connection request is already pending.");
    }
    if (existingConnection.status === "blocked") {
      throw new Error("You cannot send a request to this user.");
    }
  }

  const { data, error } = await supabase
    .from("connections")
    .insert({
      requester_id: user.id,
      receiver_id: receiverId,
      message,
      status: "pending",
      college_domain: collegeDomain,
    })
    .select()
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      const { data: conflictConnection, error: conflictError } = await supabase
        .from("connections")
        .select("id, status")
        .or(`and(requester_id.eq.${user.id},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (conflictError) throw conflictError;

      if (conflictConnection?.status === "accepted") {
        throw new Error("You are already connected with this user.");
      }
      if (conflictConnection?.status === "pending") {
        throw new Error("A connection request is already pending.");
      }
      if (conflictConnection?.status === "blocked") {
        throw new Error("You cannot send a request to this user.");
      }

      throw new Error("A connection already exists between these users.");
    }

    throw error;
  }
  return data;
}

export async function cancelConnectionRequest(receiverId: string) {
  assertValidUuid(receiverId, "receiverId");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("connections")
    .delete()
    .eq("requester_id", user.id)
    .eq("receiver_id", receiverId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("No pending request found to cancel.");
  return data;
}

export async function getConnectionRequests() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("connections")
    .select(`*`)
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  if (!data || data.length === 0) return [];

  // Fetch profiles for all requesters
  const userIds = [...new Set(data.map(c => c.requester_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, branch, graduation_year, enrollment_year, course_duration_years")
    .in("id", userIds);

  const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

  return data.map(connection => ({
    ...connection,
    requester: profilesMap.get(connection.requester_id) || undefined,
  }));
}

export async function getConnections() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("connections")
    .select(`*`)
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .eq("status", "accepted")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  if (!data || data.length === 0) return [];

  // Fetch profiles for all users involved in connections
  const userIds = [...new Set(data.flatMap(c => [c.requester_id, c.receiver_id]))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, branch, graduation_year, enrollment_year, course_duration_years")
    .in("id", userIds);

  const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

  return data.map(connection => ({
    ...connection,
    requester: profilesMap.get(connection.requester_id) || undefined,
    receiver: profilesMap.get(connection.receiver_id) || undefined,
  }));
}

export async function updateConnectionStatus(
  connectionId: string,
  status: "accepted" | "rejected"
) {
  assertValidUuid(connectionId, "connectionId");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("connections")
    .update({ status })
    .eq("id", connectionId)
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Connection request not found or already reviewed.");
  }
}

export async function acceptConnectionRequest(connectionId: string) {
  return updateConnectionStatus(connectionId, "accepted");
}

export async function rejectConnectionRequest(connectionId: string) {
  return updateConnectionStatus(connectionId, "rejected");
}

export async function removeConnection(connectionId: string) {
  assertValidUuid(connectionId, "connectionId");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("connections")
    .delete()
    .eq("id", connectionId)
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Connection not found.");
  }
}

export async function checkConnectionStatus(userId: string) {
  assertValidUuid(userId, "userId");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("connections")
    .select("status")
    .or(
      `and(requester_id.eq.${user.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${user.id})`
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.status || null;
}

// ===== MESSAGE FUNCTIONS =====

export async function sendMessage(receiverId: string, content: string) {
  return sendMessageCore(receiverId, content);
}

export async function getConversations() {
  return getConversationsCore();
}

export async function getMessages(partnerId: string, limit = 50) {
  const result = await getMessagesCore(partnerId, limit);
  return result.messages;
}

export async function markMessagesAsRead(partnerId: string) {
  return markMessagesAsReadCore(partnerId);
}

// ===== POST MODERATION FUNCTIONS =====

export async function reportPost(postId: string, reason: string) {
  assertValidUuid(postId, "postId");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Create a post_reports table entry
  const { error } = await supabase
    .from("post_reports")
    .insert({
      post_id: postId,
      reporter_id: user.id,
      reason,
    });

  if (error) {
    throw error;
  }
}

export async function hidePost(postId: string) {
  assertValidUuid(postId, "postId");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Create a hidden_posts table entry
  const { error } = await supabase
    .from("hidden_posts")
    .insert({
      post_id: postId,
      user_id: user.id,
    });

  if (error) {
    throw error;
  }
}

// ===== SHARE FUNCTIONS =====

/**
 * Share a post - supports DM sharing to connections only
 * 
 * IMPORTANT: Per spec, "Share to Connections" sends the post as a message embed,
 * NOT as a duplicate post in the feed. This keeps:
 * - Feed clean
 * - Analytics clean  
 * - No duplicate engagement confusion
 *
 * share_type: 'dm' - Send post link via direct message to a connection
 */
export async function sharePost(data: {
  original_post_id: string;
  content?: string;
  share_type: 'dm';
  receiver_id: string;
}) {
  assertValidUuid(data.original_post_id, "originalPostId");
  assertValidUuid(data.receiver_id, "receiverId");
  const user = await ensureAuthenticatedUser();

  // Verify post exists
  const { data: originalPost, error: postError } = await supabase
    .from("posts")
    .select("id, content, user_id")
    .eq("id", data.original_post_id)
    .single();

  if (postError || !originalPost) {
    throw new Error("Post not found");
  }

  // Send as a message with post embed
  const postLink = `${window.location.origin}/post/${data.original_post_id}`;
  const messageContent = data.content 
    ? `${data.content}\n\n📌 Shared post: ${postLink}` 
    : `📌 Shared a post with you: ${postLink}`;

  await sendMessage(data.receiver_id, messageContent);

  // Record the share event for analytics
  const { error: shareError } = await supabase
    .from("post_shares")
    .insert({
      original_post_id: data.original_post_id,
      user_id: user.id,
      share_type: "dm",
      receiver_id: data.receiver_id,
    });

  if (shareError) {
    // Non-fatal: share was sent, just tracking failed
    console.warn("Failed to record share event:", shareError);
  }

  return { success: true };
}

/**
 * Share post to multiple connections at once
 */
export async function sharePostToMultiple(data: {
  original_post_id: string;
  content?: string;
  receiver_ids: string[];
}) {
  assertValidUuid(data.original_post_id, "originalPostId");
  if (!data.receiver_ids || data.receiver_ids.length === 0) {
    throw new Error("At least one recipient is required");
  }
  
  data.receiver_ids.forEach((id, idx) => assertValidUuid(id, `receiverId[${idx}]`));

  const results = await Promise.allSettled(
    data.receiver_ids.map(receiver_id => 
      sharePost({
        original_post_id: data.original_post_id,
        content: data.content,
        share_type: 'dm',
        receiver_id,
      })
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  if (failed > 0 && successful === 0) {
    throw new Error("Failed to share post");
  }

  return { sent: successful, failed };
}

// ===== SAVED ITEMS FUNCTIONS =====

export async function saveItem(type: 'post' | 'project' | 'club' | 'event', itemId: string) {
  assertValidUuid(itemId, "itemId");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("saved_items")
    .insert({
      user_id: user.id,
      type,
      item_id: itemId,
    });

  if (error) {
    // Check if already saved (unique constraint violation)
    if (error.code === '23505') {
      return { alreadySaved: true };
    }
    throw error;
  }
  return { alreadySaved: false };
}

export async function unsaveItem(type: 'post' | 'project' | 'club' | 'event', itemId: string) {
  assertValidUuid(itemId, "itemId");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("saved_items")
    .delete()
    .eq("user_id", user.id)
    .eq("type", type)
    .eq("item_id", itemId);

  if (error) throw error;
}

export async function checkIfSaved(type: 'post' | 'project' | 'club' | 'event', itemId: string) {
  assertValidUuid(itemId, "itemId");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("saved_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", type)
    .eq("item_id", itemId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return !!data;
}

export async function getSavedPosts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: savedItems, error } = await supabase
    .from("saved_items")
    .select("item_id, created_at")
    .eq("user_id", user.id)
    .eq("type", "post")
    .order("created_at", { ascending: false });

  if (error) throw error;

  if (!savedItems || savedItems.length === 0) return [];

  const postIds = savedItems.map(item => item.item_id);
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select(`*`)
    .in("id", postIds);

  if (postsError) throw postsError;

  if (!posts || posts.length === 0) return [];

  // Fetch profiles for all post authors
  const userIds = [...new Set(posts.map(p => p.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .in("id", userIds);

  const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

  // Check if current user liked each post
  const { data: likes } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", user.id)
    .in("post_id", postIds);

  const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
  return posts?.map(post => {
    const userProfile = profilesMap.get(post.user_id);
    return {
      ...post,
      liked: likedPostIds.has(post.id),
      user: userProfile || undefined,
    };
  }) || [];
}

export async function toggleSavePost(postId: string) {
  assertValidUuid(postId, "postId");
  const isSaved = await checkIfSaved('post', postId);
  if (isSaved) {
    await unsaveItem('post', postId);
    return { saved: false };
  } else {
    await saveItem('post', postId);
    return { saved: true };
  }
}

// ===== POLL FUNCTIONS =====

/**
 * Vote on a poll option
 * Atomically records the vote and updates vote count
 * Prevents duplicate votes per user per poll
 *
 * @param postId - The post ID containing the poll
 * @param optionIndex - The index of the option being voted on
 * @returns Updated poll object with incremented vote count
 */
export async function voteOnPoll(postId: string, optionIndex: number) {
  try {
    assertValidUuid(postId, "postId");

    if (!Number.isInteger(optionIndex) || optionIndex < 0) {
      throw new Error("Invalid option index");
    }

    // Call the vote_on_poll RPC function
    const { data, error } = await (supabase.rpc as any)(
      'vote_on_poll',
      {
        p_post_id: postId,
        p_option_index: optionIndex,
      }
    );

    if (error) {
      // Check for common error conditions
      if (error.message?.includes('already voted')) {
        throw new Error('You have already voted on this poll');
      }
      if (error.message?.includes('Invalid option index')) {
        throw new Error('Invalid poll option');
      }
      throw error;
    }

    const normalized = normalizePoll(data);
    if (!normalized) {
      throw new Error('Invalid poll response');
    }
    return normalized;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'voteOnPoll',
      userMessage: 'Failed to vote on poll. Please try again.',
      details: { postId, optionIndex },
    });
  }
}

/**
 * Check if the current user has voted on a poll
 *
 * @param postId - The post ID containing the poll
 * @returns true if user has voted, false otherwise
 */
export async function hasUserVotedOnPoll(postId: string): Promise<boolean> {
  try {
    assertValidUuid(postId, "postId");

    // Call the has_user_voted_on_poll RPC function
    const { data, error } = await (supabase.rpc as any)(
      'has_user_voted_on_poll',
      {
        p_post_id: postId,
      }
    );

    if (error) throw error;

    return Boolean(data);
  } catch (error) {
    throw handleApiError(error, {
      operation: 'hasUserVotedOnPoll',
      userMessage: 'Failed to check poll vote status.',
      details: { postId },
    });
  }
}

/**
 * Count mutual connections between two users
 *
 * @param userId - The first user ID
 * @param otherUserId - The second user ID
 * @returns Count of shared connections
 */
export async function countMutualConnections(
  userId: string,
  otherUserId: string
): Promise<number> {
  try {
    assertValidUuid(userId, "userId");
    assertValidUuid(otherUserId, "otherUserId");

    const { data, error } = await (supabase.rpc as any)(
      'count_mutual_connections',
      {
        p_user_id: userId,
        p_other_user_id: otherUserId,
      }
    );

    if (error) throw error;

    return Number(data) || 0;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'countMutualConnections',
      userMessage: 'Failed to load mutual connections.',
      // Mutual counts are non-critical UI enrichment; callers may fall back.
      // Avoid spamming global toasts while scrolling/refreshing.
      showToast: false,
      details: { userId, otherUserId },
    });
  }
}
/**
 * Batch count mutual connections for multiple users
 * More efficient than calling countMutualConnections repeatedly
 *
 * @param userId - The user ID to count mutual connections for
 * @param otherUserIds - Array of user IDs to check mutual connections with
 * @returns Map of user ID to mutual connection count
 */
export async function countMutualConnectionsBatch(
  userId: string,
  otherUserIds: string[]
): Promise<Map<string, number>> {
  try {
    assertValidUuid(userId, "userId");
    if (!Array.isArray(otherUserIds) || otherUserIds.length === 0) {
      return new Map();
    }

    // Validate all UUIDs
    otherUserIds.forEach((id, idx) => {
      assertValidUuid(id, `otherUserIds[${idx}]`);
    });

    const { data, error } = await (supabase.rpc as any)(
      'count_mutual_connections_batch',
      {
        p_user_id: userId,
        p_other_user_ids: otherUserIds,
      }
    );

    if (error) throw error;

    const resultMap = new Map<string, number>();
    if (Array.isArray(data)) {
      data.forEach((item: any) => {
        const otherUserId = item?.other_user_id;
        const rawCount = item?.mutual_count;
        const count = typeof rawCount === 'number' ? rawCount : Number(rawCount);
        if (otherUserId && Number.isFinite(count)) {
          resultMap.set(otherUserId, count);
        }
      });
    }

    return resultMap;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'countMutualConnectionsBatch',
      userMessage: 'Failed to load mutual connections.',
      // Mutual counts are non-critical UI enrichment; callers may fall back.
      // Avoid spamming global toasts while scrolling/refreshing.
      showToast: false,
      details: { userId, count: otherUserIds.length },
    });
  }
}

// ============================================================================
// REPOST FUNCTIONS (LinkedIn-style)
// ============================================================================

/**
 * Create a repost (with or without commentary)
 * - Quick repost: commentary is null
 * - Repost with thoughts: commentary contains user's text
 */
export async function createRepost(
  originalPostId: string,
  commentary?: string
): Promise<{ success: boolean; repostId: string; hasCommentary: boolean }> {
  try {
    assertValidUuid(originalPostId, "originalPostId");

    const { data, error } = await (supabase.rpc as any)(
      'create_repost',
      {
        p_original_post_id: originalPostId,
        p_commentary_text: commentary || null,
      }
    );

    if (error) {
      if (error.message?.includes('already reposted')) {
        throw new Error('You have already reposted this post');
      }
      throw error;
    }

    return {
      success: data.success,
      repostId: data.repost_id,
      hasCommentary: data.has_commentary,
    };
  } catch (error) {
    throw handleApiError(error, {
      operation: 'createRepost',
      userMessage: 'Failed to repost. Please try again.',
      details: { originalPostId },
    });
  }
}

/**
 * Delete a repost (undo repost)
 */
export async function deleteRepost(originalPostId: string): Promise<boolean> {
  try {
    assertValidUuid(originalPostId, "originalPostId");

    const { data, error } = await (supabase.rpc as any)(
      'delete_repost',
      { p_original_post_id: originalPostId }
    );

    if (error) throw error;

    return data?.success ?? true;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'deleteRepost',
      userMessage: 'Failed to undo repost. Please try again.',
      details: { originalPostId },
    });
  }
}

/**
 * Check if user has reposted a post
 */
export async function hasUserReposted(postId: string): Promise<boolean> {
  try {
    assertValidUuid(postId, "postId");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from("reposts")
      .select("id")
      .eq("original_post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    return !!data;
  } catch (error) {
    console.warn('Failed to check repost status:', error);
    return false;
  }
}

/**
 * Get reposts for a post with user details
 */
export async function getPostReposts(postId: string): Promise<Repost[]> {
  try {
    assertValidUuid(postId, "postId");

    const { data, error } = await supabase
      .from("reposts")
      .select("*")
      .eq("original_post_id", postId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) return [];

    // Fetch user profiles
    const userIds = [...new Set(data.map(r => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .in("id", userIds);

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

    return data.map(repost => ({
      ...repost,
      user: profilesMap.get(repost.user_id) || undefined,
    }));
  } catch (error) {
    throw handleApiError(error, {
      operation: 'getPostReposts',
      userMessage: 'Failed to load reposts.',
      details: { postId },
    });
  }
}

/**
 * Get feed that includes both posts and reposts (for Home Feed)
 * Reposts appear as separate feed items with embedded original post
 */
export async function getFeedWithReposts(params: GetPostsParams = {}): Promise<GetPostsResponse> {
  try {
    const user = await ensureAuthenticatedUser();
    const { pageSize = 10, cursor = null } = params;
    const collegeDomain = await ensureCollegeDomain(user.id, params.filters);

    // Fetch regular posts
    let postsQuery = supabase
      .from("posts")
      .select(`
        id,
        user_id,
        content,
        images,
        video,
        documents,
        college_domain,
        poll,
        likes_count,
        comments_count,
        shares_count,
        reposts_count,
        created_at,
        updated_at
      `)
      .eq("college_domain", collegeDomain)
      .order("created_at", { ascending: false })
      .limit(pageSize + 1);

    if (cursor) {
      postsQuery = postsQuery.lt("created_at", cursor);
    }

    const { data: posts, error: postsError } = await postsQuery;
    if (postsError) throw postsError;

    // Fetch reposts (treated as feed items)
    let repostsQuery = supabase
      .from("reposts")
      .select("*")
      .eq("college_domain", collegeDomain)
      .order("created_at", { ascending: false })
      .limit(pageSize);

    if (cursor) {
      repostsQuery = repostsQuery.lt("created_at", cursor);
    }

    const { data: reposts, error: repostsError } = await repostsQuery;
    if (repostsError) {
      console.warn("Failed to fetch reposts:", repostsError);
    }

    // Process posts (original logic)
    const limited = (posts ?? []).slice(0, pageSize);
    const postIds = limited.map((post) => post.id);
    const userIds = [...new Set([
      ...limited.map((post) => post.user_id),
      ...(reposts || []).map((r) => r.user_id),
    ])];

    // Fetch profiles for all authors
    const profilesMap = new Map<string, any>();
    if (userIds.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, role, college_domain")
          .in("id", userIds);

        profiles?.forEach((profile) => {
          profilesMap.set(profile.id, profile);
        });
      } catch (err) {
        console.warn('Failed to fetch profiles:', err);
      }
    }

    // Fetch user reactions (not just likes)
    const userReactionsMap = new Map<string, ReactionType>();
    if (postIds.length > 0) {
      try {
        const { data: reactions } = await supabase
          .from("post_likes")
          .select("post_id, reaction_type")
          .eq("user_id", user.id)
          .in("post_id", postIds);

        reactions?.forEach((r) => {
          userReactionsMap.set(r.post_id, r.reaction_type as ReactionType);
        });
      } catch (err) {
        console.warn('Failed to fetch reactions:', err);
      }
    }

    // Fetch saved state
    const savedPostIds = new Set<string>();
    if (postIds.length > 0) {
      try {
        const { data: savedRows } = await supabase
          .from("saved_items")
          .select("item_id")
          .eq("user_id", user.id)
          .eq("type", "post")
          .in("item_id", postIds);

        savedRows?.forEach((row) => savedPostIds.add(row.item_id));
      } catch (err) {
        console.warn('Failed to fetch saved state:', err);
      }
    }

    // Fetch user's repost state
    const repostedPostIds = new Set<string>();
    if (postIds.length > 0) {
      try {
        const { data: userReposts } = await supabase
          .from("reposts")
          .select("original_post_id")
          .eq("user_id", user.id)
          .in("original_post_id", postIds);

        userReposts?.forEach((r) => repostedPostIds.add(r.original_post_id));
      } catch (err) {
        console.warn('Failed to fetch repost state:', err);
      }
    }

    // Normalize posts with engagement data
    const normalizedPosts: Post[] = limited.map((post) => {
      const userProfile = profilesMap.get(post.user_id);
      const userReaction = userReactionsMap.get(post.id);
      
      return {
        ...post,
        poll: normalizePoll((post as any)?.poll),
        liked: userReaction !== undefined,
        userReaction: userReaction || null,
        saved: savedPostIds.has(post.id),
        reposted: repostedPostIds.has(post.id),
        user: userProfile ? {
          id: userProfile.id,
          full_name: userProfile.full_name || 'Anonymous',
          avatar_url: userProfile.avatar_url || '',
          role: userProfile.role || 'Member',
          college_domain: userProfile.college_domain || null,
        } : undefined,
      };
    });

    const hasMore = (posts?.length ?? 0) > pageSize;
    const nextCursor = hasMore && posts ? posts[pageSize].created_at : null;

    return {
      posts: normalizedPosts,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    throw handleApiError(error, {
      operation: "getFeedWithReposts",
      userMessage: "Failed to load your feed.",
      details: { params },
    });
  }
}

/**
 * Get top comments for inline preview (first 2-3 comments)
 */
/**
 * Batch-fetch top comments for multiple posts at once.
 * Eliminates N+1 queries when rendering a feed with inline comment previews.
 */
export async function getTopCommentsBatch(
  postIds: string[],
  limitPerPost = 2
): Promise<Map<string, Comment[]>> {
  const result = new Map<string, Comment[]>();
  if (postIds.length === 0) return result;

  postIds.forEach(id => assertValidUuid(id, "postId"));

  try {
    // Fetch top-level comments for all requested posts in a single query.
    // We over-fetch slightly (limitPerPost * postIds.length) and trim per-post.
    const { data: comments, error } = await supabase
      .from("comments")
      .select("*")
      .in("post_id", postIds)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(limitPerPost * postIds.length + postIds.length);

    if (error) throw error;
    if (!comments || comments.length === 0) return result;

    // Fetch all referenced profiles in one query
    const userIds = [...new Set(comments.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .in("id", userIds);

    const profilesMap = new Map(
      (profiles ?? []).map(p => [p.id, p])
    );

    // Group by post_id and trim to limitPerPost
    const grouped = new Map<string, typeof comments>();
    comments.forEach(c => {
      const list = grouped.get(c.post_id) ?? [];
      if (list.length < limitPerPost) {
        list.push(c);
        grouped.set(c.post_id, list);
      }
    });

    grouped.forEach((list, postId) => {
      result.set(
        postId,
        list.map(comment => ({
          ...comment,
          replies: [],
          user: profilesMap.get(comment.user_id) || undefined,
        }))
      );
    });
  } catch (error) {
    console.warn('Failed to batch-fetch top comments:', error);
  }

  return result;
}

/**
 * Get top comments for inline preview (first N comments) for a single post.
 * Prefer getTopCommentsBatch for feed rendering to avoid N+1.
 */
export async function getTopComments(postId: string, limit = 2): Promise<Comment[]> {
  const batch = await getTopCommentsBatch([postId], limit);
  return batch.get(postId) ?? [];
}