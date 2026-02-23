/**
 * Social API — cross-platform shared layer.
 *
 * Extracted from `src/lib/social-api.ts`.
 * All Supabase access is via the injected `client` parameter.
 * `handleApiError` → `createAppError`.
 * `File` → `CrossPlatformFile` for attachment uploads.
 * `window.location.origin` → `appUrl` parameter on share functions.
 * Messages re-exported from `./messages-api`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAppError } from "../errors";
import { assertValidUuid } from "../utils";
import { normalizeCollegeDomain } from "../schemas/validation";
import { hasPermission, type UserRole } from "./permissions";
import {
  getConversations as getConversationsCore,
  getMessages as getMessagesCore,
  markMessagesAsRead as markMessagesAsReadCore,
  sendMessage as sendMessageCore,
} from "./messages-api";
import type { CrossPlatformFile } from "../types/file";
import { getFileName, getFileType, getFileSize } from "../types/file";
import type { Json } from "../supabase/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POST_MEDIA_BUCKET = "post-media";
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB limit per attachment

// ============================================================================
// LINKEDIN-STYLE REACTION TYPES
// ============================================================================

export type ReactionType =
  | "like"
  | "celebrate"
  | "support"
  | "love"
  | "insightful"
  | "curious"
  | "laugh";

export const REACTION_EMOJI_MAP: Record<ReactionType, string> = {
  like: "👍",
  celebrate: "🎉",
  support: "🤝",
  love: "❤️",
  insightful: "💡",
  curious: "🤔",
  laugh: "😂",
};

export const REACTION_LABELS: Record<ReactionType, string> = {
  like: "Like",
  celebrate: "Celebrate",
  support: "Support",
  love: "Love",
  insightful: "Insightful",
  curious: "Curious",
  laugh: "Laugh",
};

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

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
  sortBy?: "recent" | "top";
}

export interface GetPostsResponse {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type PostAttachmentInput = {
  type: "image" | "video" | "document";
  file?: CrossPlatformFile;
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
  [key: string]: Json | PollOption[] | undefined;
}

interface Poll {
  question: string;
  options: PollOption[];
  endDate: string;
  [key: string]: Json | PollOption[] | undefined;
}

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
  status: "pending" | "accepted" | "rejected" | "blocked";
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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const normalizePoll = (value: unknown): Poll | undefined => {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) return undefined;

  const maybePoll = value as Partial<Poll>;
  if (typeof maybePoll.question !== "string") return undefined;
  if (typeof maybePoll.endDate !== "string") return undefined;
  if (!Array.isArray(maybePoll.options)) return undefined;

  return maybePoll as Poll;
};

const ensureAuthenticatedUser = async (client: SupabaseClient) => {
  const { data } = await client.auth.getUser();
  if (!data?.user) {
    throw new Error("User not authenticated");
  }
  return data.user;
};

const fetchCollegeDomainForUser = async (client: SupabaseClient, userId: string) => {
  const { data, error } = await client
    .from("profiles")
    .select("college_domain")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const raw = (data as Record<string, unknown> | null)?.college_domain as string | null;
  if (!raw) return null;
  const normalized = normalizeCollegeDomain(raw);
  return normalized || null;
};

const ensureCollegeDomain = async (
  client: SupabaseClient,
  userId: string,
  filters?: FeedFilters,
) => {
  const profileDomain = await fetchCollegeDomainForUser(client, userId);

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

/**
 * Robust file-extension extraction for CrossPlatformFile.
 * Tries the file name first, then falls back to the MIME type.
 */
const getFileExtensionLocal = (file: CrossPlatformFile): string => {
  const name = getFileName(file);
  const byName = name?.split(".").pop();
  if (byName && byName.length <= 10) {
    return byName.toLowerCase();
  }
  const type = getFileType(file);
  const byType = type?.split("/").pop();
  if (byType) {
    return byType.toLowerCase();
  }
  return "bin";
};

const uploadPostAttachment = async (
  client: SupabaseClient,
  file: CrossPlatformFile,
  userId: string,
  type: "image" | "video" | "document",
) => {
  const size = getFileSize(file);
  if (size !== undefined && size > MAX_ATTACHMENT_SIZE) {
    throw new Error("Attachment is too large. Maximum size is 20MB.");
  }

  const extension = getFileExtensionLocal(file);
  const safeType =
    type === "image" ? "images" : type === "video" ? "videos" : "documents";
  const filePath = `${userId}/${safeType}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error } = await client.storage
    .from(POST_MEDIA_BUCKET)
    .upload(filePath, file as any, {
      cacheControl: "3600",
      upsert: true,
      contentType: getFileType(file) || undefined,
    });

  if (error) {
    if (error.message?.includes("not found")) {
      throw new Error(
        "Post media bucket missing. Create a 'post-media' bucket in Supabase storage.",
      );
    }
    throw error;
  }

  const {
    data: { publicUrl },
  } = client.storage.from(POST_MEDIA_BUCKET).getPublicUrl(filePath);

  return publicUrl;
};

// ===== POST FUNCTIONS =====

export async function createPost(client: SupabaseClient, payload: CreatePostPayload) {
  try {
    const user = await ensureAuthenticatedUser(client);
    const content = payload.content?.trim();
    if (!content) {
      const error = new Error("Post content cannot be empty");
      error.name = "ValidationError";
      throw error;
    }

    const collegeDomain = await ensureCollegeDomain(client, user.id);

    let images: string[] | undefined;
    let video: string | undefined;
    let documents: string[] | undefined;

    if (payload.attachment) {
      const { type, file, url } = payload.attachment;
      if (type === "image") {
        if (file) {
          const uploadedUrl = await uploadPostAttachment(client, file, user.id, "image");
          images = [uploadedUrl];
        } else if (url) {
          images = [url];
        }
      } else if (type === "video") {
        if (file) {
          video = await uploadPostAttachment(client, file, user.id, "video");
        } else if (url) {
          video = url;
        }
      } else if (type === "document") {
        if (file) {
          const uploadedUrl = await uploadPostAttachment(client, file, user.id, "document");
          documents = [uploadedUrl];
        }
      }
    }

    const { data, error } = await (client as any)
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
      .select("*")
      .single();

    if (error) throw error;

    // Fetch the user profile separately
    const { data: userProfile } = await client
      .from("profiles")
      .select("id, full_name, avatar_url, role, college_domain")
      .eq("id", user.id)
      .single();

    return {
      ...data,
      poll: normalizePoll((data as unknown as { poll?: unknown })?.poll),
      user: userProfile
        ? {
            id: (userProfile as any).id,
            full_name: (userProfile as any).full_name || "Anonymous",
            avatar_url: (userProfile as any).avatar_url || "",
            role: (userProfile as any).role || "Member",
            college_domain: (userProfile as any).college_domain || null,
          }
        : undefined,
    };
  } catch (error) {
    throw createAppError(
      "Unable to create your post right now. Please try again.",
      "createPost",
      error,
    );
  }
}

export async function getPosts(
  client: SupabaseClient,
  params: GetPostsParams = {},
): Promise<GetPostsResponse> {
  try {
    const user = await ensureAuthenticatedUser(client);
    const { pageSize = 10, cursor = null, sortBy = "recent" } = params;

    const collegeDomain = await ensureCollegeDomain(client, user.id, params.filters);

    const orderColumn = sortBy === "top" ? "likes_count" : "created_at";

    // Pre-fetch hidden post IDs
    let hiddenIds = new Set<string>();
    try {
      const { data: hiddenRows } = await client
        .from("hidden_posts")
        .select("post_id")
        .eq("user_id", user.id);

      if (hiddenRows && hiddenRows.length > 0) {
        hiddenIds = new Set(
          hiddenRows.map((r: Record<string, unknown>) => r.post_id as string),
        );
      }
    } catch (err) {
      console.warn("Failed to fetch hidden posts, showing all:", err);
    }

    const fetchLimit = pageSize + 1 + hiddenIds.size;
    let query = client
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
        reposts_count,
        created_at,
        updated_at
      `,
      )
      .eq("college_domain", collegeDomain)
      .order(orderColumn, { ascending: false })
      .limit(fetchLimit);

    if (cursor && sortBy === "recent") {
      query = query.lt("created_at", cursor);
    } else if (cursor && sortBy === "top") {
      const sepIdx = cursor.indexOf("::");
      if (sepIdx !== -1) {
        const cursorLikes = parseInt(cursor.substring(0, sepIdx));
        const cursorDate = cursor.substring(sepIdx + 2);
        query = query.or(
          `likes_count.lt.${cursorLikes},and(likes_count.eq.${cursorLikes},created_at.lt.${cursorDate})`,
        );
      } else {
        query = query.lte("likes_count", parseInt(cursor));
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    const visiblePosts = (data ?? []).filter(
      (p: Record<string, unknown>) => !hiddenIds.has(p.id as string),
    );

    const posts = visiblePosts;
    const limited = posts.slice(0, pageSize);
    const postIds = limited.map((post: Record<string, unknown>) => post.id as string);
    const userIds = [
      ...new Set(limited.map((post: Record<string, unknown>) => post.user_id as string)),
    ];

    // Fetch profiles
    const profilesMap = new Map<
      string,
      {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        role: string | null;
        college_domain: string | null;
      }
    >();
    if (userIds.length > 0) {
      try {
        const { data: profiles, error: profilesError } = await client
          .from("profiles")
          .select("id, full_name, avatar_url, role, college_domain")
          .in("id", userIds);

        if (!profilesError && profiles) {
          (profiles as any[]).forEach((profile) => {
            profilesMap.set(profile.id, profile);
          });
        } else if (profilesError) {
          console.warn("Failed to fetch profiles for posts:", profilesError);
        }
      } catch (err) {
        console.warn("Ignored error fetching profiles:", err);
      }
    }

    // Fetch user reactions and top reactions
    const userReactionsMap = new Map<string, ReactionType>();
    const topReactionsMap = new Map<string, ReactionCount[]>();

    if (postIds.length > 0) {
      try {
        const result = await client
          .from("post_likes")
          .select("post_id, reaction_type")
          .eq("user_id", user.id)
          .in("post_id", postIds);

        const reactions = result?.data ?? null;
        const reactionsError = result?.error ?? null;

        if (!reactionsError && reactions) {
          (reactions as any[]).forEach(
            (r: { post_id: string; reaction_type: string }) => {
              userReactionsMap.set(r.post_id, r.reaction_type as ReactionType);
            },
          );
        } else if (reactionsError) {
          console.warn("Failed to fetch user reactions:", reactionsError);
        }

        // Top reactions batch
        const { data: allReactions, error: allReactionsError } = await client
          .from("post_likes")
          .select("post_id, reaction_type")
          .in("post_id", postIds);

        if (!allReactionsError && allReactions) {
          const reactionsByPost = new Map<string, Map<string, number>>();
          (allReactions as any[]).forEach(
            (r: { post_id: string; reaction_type: string }) => {
              if (!reactionsByPost.has(r.post_id)) {
                reactionsByPost.set(r.post_id, new Map());
              }
              const postReactions = reactionsByPost.get(r.post_id)!;
              postReactions.set(
                r.reaction_type,
                (postReactions.get(r.reaction_type) || 0) + 1,
              );
            },
          );

          reactionsByPost.forEach((reactions, postId) => {
            const sorted = Array.from(reactions.entries())
              .map(([type, count]) => ({ type: type as ReactionType, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 3);
            topReactionsMap.set(postId, sorted);
          });
        } else if (allReactionsError) {
          console.warn("Failed to fetch top reactions:", allReactionsError);
        }
      } catch (err) {
        console.warn("Ignored error fetching reactions:", err);
      }
    }

    // Fetch repost state
    const repostedPostIds = new Set<string>();
    if (postIds.length > 0) {
      try {
        const { data: userReposts } = await client
          .from("reposts")
          .select("original_post_id")
          .eq("user_id", user.id)
          .in("original_post_id", postIds);

        (userReposts as any[] | null)?.forEach(
          (r: { original_post_id: string }) =>
            repostedPostIds.add(r.original_post_id),
        );
      } catch (err) {
        console.warn("Failed to fetch repost state:", err);
      }
    }

    const normalizedPosts = limited.map((post: any) => {
      const userProfile = profilesMap.get(post.user_id);
      const userReaction = userReactionsMap.get(post.id);
      return {
        ...post,
        poll: normalizePoll((post as unknown as { poll?: unknown })?.poll),
        liked: userReaction !== undefined,
        userReaction: userReaction || null,
        topReactions: topReactionsMap.get(post.id) || [],
        reposted: repostedPostIds.has(post.id),
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
    });

    // Saved state
    let savedPostIds = new Set<string>();
    if (postIds.length > 0) {
      try {
        const result = await client
          .from("saved_items")
          .select("item_id")
          .eq("user_id", user.id)
          .eq("type", "post")
          .in("item_id", postIds);

        const savedRows = result?.data ?? null;
        const savedError = result?.error ?? null;

        if (!savedError && savedRows) {
          savedPostIds = new Set(
            ((savedRows as any[]) || []).map(
              (row: { item_id: string }) => row.item_id,
            ),
          );
        } else if (savedError) {
          console.warn("Failed to fetch saved posts:", savedError);
        }
      } catch (err) {
        console.warn("Ignored error fetching saved posts:", err);
      }
    }

    const postsWithSaved = normalizedPosts.map((post: any) => ({
      ...post,
      saved: savedPostIds.has(post.id),
    }));

    const hasMore = posts.length > pageSize;
    let nextCursor: string | null = null;
    if (hasMore) {
      const lastPost = limited[limited.length - 1] as any;
      nextCursor =
        sortBy === "top"
          ? `${lastPost.likes_count}::${lastPost.created_at}`
          : lastPost.created_at;
    }

    return {
      posts: postsWithSaved,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    throw createAppError("Failed to load your feed.", "getPosts", error);
  }
}

export async function getPostsByUser(
  client: SupabaseClient,
  targetUserId: string,
  params: GetUserPostsParams = {},
): Promise<GetPostsResponse> {
  try {
    assertValidUuid(targetUserId, "targetUserId");
    const user = await ensureAuthenticatedUser(client);
    const { pageSize = 10, cursor = null } = params;

    const viewerCollegeDomain = await ensureCollegeDomain(client, user.id);
    const targetCollegeDomain = await fetchCollegeDomainForUser(client, targetUserId);
    if (!targetCollegeDomain) {
      throw new Error("Target profile missing college domain.");
    }
    if (targetCollegeDomain !== viewerCollegeDomain) {
      throw new Error("You can only view posts from your own college domain.");
    }

    let query = client
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
        reposts_count,
        created_at,
        updated_at
      `,
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
    const postIds = limited.map((post: any) => post.id as string);

    // Fetch profile for the author
    let authorProfile: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      role: string | null;
      college_domain: string | null;
    } | null = null;

    try {
      const { data: profileRow, error: profileError } = await client
        .from("profiles")
        .select("id, full_name, avatar_url, role, college_domain")
        .eq("id", targetUserId)
        .maybeSingle();

      if (!profileError && profileRow) {
        authorProfile = profileRow as any;
      } else if (profileError) {
        console.warn("Failed to fetch profile for user posts:", profileError);
      }
    } catch (err) {
      console.warn("Ignored error fetching profile for user posts:", err);
    }

    // Fetch user reactions and top reactions
    const userReactionsMap = new Map<string, ReactionType>();
    const topReactionsMap = new Map<string, ReactionCount[]>();

    if (postIds.length > 0) {
      try {
        const result = await client
          .from("post_likes")
          .select("post_id, reaction_type")
          .eq("user_id", user.id)
          .in("post_id", postIds);

        const reactions = result?.data ?? null;
        const reactionsError = result?.error ?? null;

        if (!reactionsError && reactions) {
          (reactions as any[]).forEach(
            (r: { post_id: string; reaction_type: string }) => {
              userReactionsMap.set(r.post_id, r.reaction_type as ReactionType);
            },
          );
        } else if (reactionsError) {
          console.warn("Failed to fetch user reactions:", reactionsError);
        }

        const { data: allReactions, error: allReactionsError } = await client
          .from("post_likes")
          .select("post_id, reaction_type")
          .in("post_id", postIds);

        if (!allReactionsError && allReactions) {
          const reactionsByPost = new Map<string, Map<string, number>>();
          (allReactions as any[]).forEach(
            (r: { post_id: string; reaction_type: string }) => {
              if (!reactionsByPost.has(r.post_id)) {
                reactionsByPost.set(r.post_id, new Map());
              }
              const postReactions = reactionsByPost.get(r.post_id)!;
              postReactions.set(
                r.reaction_type,
                (postReactions.get(r.reaction_type) || 0) + 1,
              );
            },
          );

          reactionsByPost.forEach((reactions, postId) => {
            const sorted = Array.from(reactions.entries())
              .map(([type, count]) => ({ type: type as ReactionType, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 3);
            topReactionsMap.set(postId, sorted);
          });
        }
      } catch (err) {
        console.warn("Ignored error fetching reactions:", err);
      }
    }

    const normalizedPosts = limited.map((post: any) => {
      const userReaction = userReactionsMap.get(post.id);
      return {
        ...post,
        poll: normalizePoll((post as unknown as { poll?: unknown })?.poll),
        liked: userReaction !== undefined,
        userReaction: userReaction || null,
        topReactions: topReactionsMap.get(post.id) || [],
        user: authorProfile
          ? {
              id: authorProfile.id,
              full_name: authorProfile.full_name || "Anonymous",
              avatar_url: authorProfile.avatar_url || "",
              role: authorProfile.role || "Member",
              college_domain: authorProfile.college_domain || null,
            }
          : undefined,
      };
    });

    // Saved state
    let savedPostIds = new Set<string>();
    if (postIds.length > 0) {
      try {
        const result = await client
          .from("saved_items")
          .select("item_id")
          .eq("user_id", user.id)
          .eq("type", "post")
          .in("item_id", postIds);

        const savedRows = result?.data ?? null;
        const savedError = result?.error ?? null;

        if (!savedError && savedRows) {
          savedPostIds = new Set(
            ((savedRows as any[]) || []).map(
              (row: { item_id: string }) => row.item_id,
            ),
          );
        } else if (savedError) {
          console.warn("Failed to fetch saved posts:", savedError);
        }
      } catch (err) {
        console.warn("Ignored error fetching saved posts:", err);
      }
    }

    const postsWithSaved = normalizedPosts.map((post: any) => ({
      ...post,
      saved: savedPostIds.has(post.id),
    }));

    const hasMore = posts.length > pageSize;
    const nextCursor = hasMore ? (posts[pageSize] as any).created_at : null;

    return {
      posts: postsWithSaved,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    throw createAppError("Failed to load posts.", "getPostsByUser", error);
  }
}

export async function getUserPostsCount(
  client: SupabaseClient,
  targetUserId: string,
): Promise<number> {
  try {
    assertValidUuid(targetUserId, "targetUserId");

    const { data, error } = await client.rpc("get_user_posts_count", {
      p_target_user_id: targetUserId,
    });

    if (error) {
      const rpcCode = (error as { code?: string }).code;
      if (rpcCode === "42883") {
        const user = await ensureAuthenticatedUser(client);
        const viewerCollegeDomain = await ensureCollegeDomain(client, user.id);
        const targetCollegeDomain = await fetchCollegeDomainForUser(
          client,
          targetUserId,
        );
        if (!targetCollegeDomain || targetCollegeDomain !== viewerCollegeDomain) {
          return 0;
        }
        const { count, error: fallbackError } = await client
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
    throw createAppError(
      "Failed to load posts count.",
      "getUserPostsCount",
      error,
    );
  }
}

/**
 * PUBLIC POST FETCH — No auth required.
 * Returns read-only post data without user-specific state (liked, saved).
 */
export async function getPostByIdPublic(
  client: SupabaseClient,
  postId: string,
): Promise<Post> {
  try {
    assertValidUuid(postId, "postId");

    const { data: post, error } = await client
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
      `,
      )
      .eq("id", postId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Post not found");
      }
      throw error;
    }

    let userProfile: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      role: string | null;
      college_domain: string | null;
    } | null = null;

    try {
      const { data: profileRow, error: profileError } = await client
        .from("profiles")
        .select("id, full_name, avatar_url, role, college_domain")
        .eq("id", (post as any).user_id)
        .maybeSingle();

      if (!profileError && profileRow) {
        userProfile = profileRow as any;
      }
    } catch (err) {
      console.warn("Failed to fetch profile for public post:", err);
    }

    return {
      ...(post as any),
      poll: normalizePoll(
        (post as unknown as { poll?: unknown })?.poll,
      ),
      liked: false,
      saved: false,
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
    throw createAppError("Failed to load this post.", "getPostByIdPublic", error);
  }
}

export async function getPostById(
  client: SupabaseClient,
  postId: string,
): Promise<Post> {
  try {
    assertValidUuid(postId, "postId");
    const user = await ensureAuthenticatedUser(client);
    const collegeDomain = await ensureCollegeDomain(client, user.id);

    const { data: post, error } = await client
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
        reposts_count,
        created_at,
        updated_at
      `,
      )
      .eq("id", postId)
      .single();

    if (error) throw error;

    if (
      (post as any).college_domain &&
      (post as any).college_domain !== collegeDomain
    ) {
      throw new Error("You can only access posts from your own college domain.");
    }

    // Parallel fetch: profile, user reaction + top reactions, saved state
    const [profileResult, reactionResult, allReactionsResult, savedResult] =
      await Promise.allSettled([
        client
          .from("profiles")
          .select("id, full_name, avatar_url, role, college_domain")
          .eq("id", (post as any).user_id)
          .maybeSingle(),
        client
          .from("post_likes")
          .select("id, reaction_type")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle(),
        client.from("post_likes").select("reaction_type").eq("post_id", postId),
        client
          .from("saved_items")
          .select("id")
          .eq("user_id", user.id)
          .eq("type", "post")
          .eq("item_id", postId)
          .maybeSingle(),
      ]);

    // Extract profile
    let userProfile: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      role: string | null;
      college_domain: string | null;
    } | null = null;
    if (
      profileResult.status === "fulfilled" &&
      !profileResult.value.error &&
      profileResult.value.data
    ) {
      userProfile = profileResult.value.data as any;
    }

    // Extract user reaction
    let userReaction: ReactionType | null = null;
    let liked = false;
    if (
      reactionResult.status === "fulfilled" &&
      !reactionResult.value.error &&
      reactionResult.value.data
    ) {
      liked = true;
      userReaction = (
        reactionResult.value.data as { id: string; reaction_type: string }
      ).reaction_type as ReactionType;
    }

    // Extract top reactions
    let topReactions: ReactionCount[] = [];
    if (
      allReactionsResult.status === "fulfilled" &&
      !allReactionsResult.value.error &&
      allReactionsResult.value.data
    ) {
      const reactionCounts = new Map<string, number>();
      (allReactionsResult.value.data as any[]).forEach(
        (r: { reaction_type: string }) => {
          reactionCounts.set(
            r.reaction_type,
            (reactionCounts.get(r.reaction_type) || 0) + 1,
          );
        },
      );
      topReactions = Array.from(reactionCounts.entries())
        .map(([type, count]) => ({ type: type as ReactionType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
    }

    // Extract saved state
    let saved = false;
    if (
      savedResult.status === "fulfilled" &&
      !savedResult.value.error &&
      savedResult.value.data
    ) {
      saved = true;
    }

    return {
      ...(post as any),
      poll: normalizePoll(
        (post as unknown as { poll?: unknown })?.poll,
      ),
      liked,
      saved,
      userReaction,
      topReactions,
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
    throw createAppError("Failed to load this post.", "getPostById", error);
  }
}

export async function getConnectionStatusesForUsers(
  client: SupabaseClient,
  targetUserIds: string[],
) {
  const user = await ensureAuthenticatedUser(client);

  const uniqueIds = [...new Set(targetUserIds)].filter(Boolean);
  uniqueIds.forEach((id) => assertValidUuid(id, "targetUserId"));

  if (uniqueIds.length === 0) {
    return new Map<string, string | null>();
  }

  const { data, error } = await client
    .from("connections")
    .select("requester_id, receiver_id, status")
    .or(
      `and(requester_id.eq.${user.id},receiver_id.in.(${uniqueIds.join(",")})),and(receiver_id.eq.${user.id},requester_id.in.(${uniqueIds.join(",")}))`,
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

  ((data as any[]) ?? []).forEach((row: any) => {
    const otherId =
      row.requester_id === user.id ? row.receiver_id : row.requester_id;
    if (!statusByUserId.has(otherId)) return;

    const incomingStatus = row.status ?? null;
    const existingStatus = statusByUserId.get(otherId) ?? null;

    if (!incomingStatus) return;
    if (!existingStatus) {
      statusByUserId.set(otherId, incomingStatus);
      return;
    }

    const existingPriority =
      statusPriority[existingStatus] ?? Number.MAX_SAFE_INTEGER;
    const incomingPriority =
      statusPriority[incomingStatus] ?? Number.MAX_SAFE_INTEGER;

    if (incomingPriority < existingPriority) {
      statusByUserId.set(otherId, incomingStatus);
    }
  });

  return statusByUserId;
}

// ===== REACTION FUNCTIONS =====

export async function togglePostLike(client: SupabaseClient, postId: string) {
  return toggleReaction(client, postId, "like");
}

/** Legacy alias for backward compatibility */
export async function toggleLike(
  client: SupabaseClient,
  postId: string,
  userId?: string,
) {
  void userId;
  const result = await toggleReaction(client, postId, "like");
  return { liked: result.reaction !== null };
}

/**
 * LinkedIn-style Reaction Toggle
 * - If user has no reaction: adds the reaction
 * - If user has same reaction: removes it
 * - If user has different reaction: changes to new reaction
 */
export async function toggleReaction(
  client: SupabaseClient,
  postId: string,
  reactionType: ReactionType = "like",
): Promise<{
  action: "added" | "removed" | "changed";
  reaction: ReactionType | null;
  previous?: ReactionType;
  totalReactions: number;
  topReactions: ReactionCount[];
}> {
  try {
    assertValidUuid(postId, "postId");
    await ensureAuthenticatedUser(client);

    const { data, error } = await (client.rpc as any)("toggle_reaction", {
      p_post_id: postId,
      p_reaction_type: reactionType,
    });

    if (error) throw error;

    const result = data as {
      action: string;
      reaction: string | null;
      previous?: string;
      total_reactions: number;
      top_reactions: Array<{ type: string; count: number }> | null;
    };

    return {
      action: result.action as "added" | "removed" | "changed",
      reaction: result.reaction as ReactionType | null,
      previous: result.previous as ReactionType | undefined,
      totalReactions: result.total_reactions || 0,
      topReactions: (result.top_reactions || []).map((r) => ({
        type: r.type as ReactionType,
        count: r.count,
      })),
    };
  } catch (error) {
    throw createAppError(
      "Unable to update your reaction. Please try again.",
      "toggleReaction",
      error,
    );
  }
}

/** Get top reactions for a post. */
export async function getPostTopReactions(
  client: SupabaseClient,
  postId: string,
): Promise<ReactionCount[]> {
  try {
    assertValidUuid(postId, "postId");

    const { data, error } = await (client.rpc as any)("get_post_top_reactions", {
      p_post_id: postId,
    });

    if (error) throw error;

    return ((data as any[]) || []).map(
      (r: { reaction_type: string; count: number }) => ({
        type: r.reaction_type as ReactionType,
        count: r.count,
      }),
    );
  } catch (error) {
    console.warn("Failed to get post reactions:", error);
    return [];
  }
}

/** Get user's reaction on a specific post. */
export async function getUserReaction(
  client: SupabaseClient,
  postId: string,
): Promise<ReactionType | null> {
  try {
    assertValidUuid(postId, "postId");

    const { data, error } = await (client.rpc as any)("get_user_reaction", {
      p_post_id: postId,
    });

    if (error) throw error;

    return data as ReactionType | null;
  } catch (error) {
    console.warn("Failed to get user reaction:", error);
    return null;
  }
}

export async function likePost(client: SupabaseClient, postId: string) {
  assertValidUuid(postId, "postId");
  const currentReaction = await getUserReaction(client, postId);
  if (currentReaction === "like") {
    return { liked: true };
  }

  const result = await toggleReaction(client, postId, "like");
  return { liked: result.reaction !== null };
}

export async function unlikePost(client: SupabaseClient, postId: string) {
  assertValidUuid(postId, "postId");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await client
    .from("post_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", user.id);

  if (error) throw error;
  return { liked: false };
}

export async function deletePost(client: SupabaseClient, postId: string) {
  assertValidUuid(postId, "postId");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await client
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", user.id);

  if (error) throw error;
}

export async function updatePost(
  client: SupabaseClient,
  postId: string,
  updates: {
    content?: string;
    images?: string[];
    video?: string;
  },
) {
  assertValidUuid(postId, "postId");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  if (typeof updates.content === "string" && !updates.content.trim()) {
    throw new Error("Post content cannot be empty");
  }

  const hasUpdates = Object.keys(updates).some(
    (key) => updates[key as keyof typeof updates] !== undefined,
  );
  if (!hasUpdates) {
    throw new Error("No updates provided");
  }

  const { data, error } = await (client as any)
    .from("posts")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) throw error;

  const { data: userProfile } = await client
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  return {
    ...data,
    user: (userProfile as any) || undefined,
  };
}

// ===== COMMENT FUNCTIONS =====

export async function getComments(
  client: SupabaseClient,
  postId: string,
  limit = 50,
) {
  assertValidUuid(postId, "postId");
  const {
    data: { user },
  } = await client.auth.getUser();

  const { data: comments, error } = await client
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  if (!comments || comments.length === 0) {
    return [];
  }

  const userIds = [...new Set((comments as any[]).map((c) => c.user_id))];
  const commentIds = (comments as any[]).map((c) => c.id);

  const [profilesResult, likesResult] = await Promise.all([
    client
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .in("id", userIds),
    user
      ? client
          .from("comment_likes")
          .select("comment_id")
          .eq("user_id", user.id)
          .in("comment_id", commentIds)
      : Promise.resolve({ data: null, error: null }),
  ]);

  const profilesMap = new Map(
    ((profilesResult.data as any[]) ?? []).map((p: any) => [p.id, p]),
  );
  const likedCommentIds = new Set(
    ((likesResult.data as any[]) ?? []).map(
      (l: { comment_id: string }) => l.comment_id,
    ),
  );

  // Build nested structure
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  (comments as any[]).forEach((comment) => {
    const userProfile = profilesMap.get(comment.user_id) as any;
    const commentWithLike: Comment = {
      ...comment,
      liked: likedCommentIds.has(comment.id),
      replies: [],
      user: userProfile
        ? {
            id: userProfile.id,
            full_name: userProfile.full_name || "Anonymous",
            avatar_url: userProfile.avatar_url || "",
            role: userProfile.role || "Member",
          }
        : undefined,
    };
    commentMap.set(comment.id, commentWithLike);
  });

  (comments as any[]).forEach((comment) => {
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

export async function createComment(
  client: SupabaseClient,
  data: {
    post_id: string;
    content: string;
    parent_id?: string;
  },
) {
  assertValidUuid(data.post_id, "postId");
  if (data.parent_id) assertValidUuid(data.parent_id, "parentCommentId");
  const user = await ensureAuthenticatedUser(client);
  const collegeDomain = await ensureCollegeDomain(client, user.id);

  const { data: postRow, error: postError } = await client
    .from("posts")
    .select("id, college_domain")
    .eq("id", data.post_id)
    .maybeSingle();

  if (postError) throw postError;
  if (!postRow) {
    throw new Error("Post not found");
  }
  if (
    (postRow as any).college_domain &&
    (postRow as any).college_domain !== collegeDomain
  ) {
    throw new Error(
      "You can only comment on posts from your own college domain.",
    );
  }

  if (data.parent_id) {
    const { data: parentRow, error: parentError } = await client
      .from("comments")
      .select("id, post_id")
      .eq("id", data.parent_id)
      .maybeSingle();

    if (parentError) throw parentError;
    if (!parentRow) {
      throw new Error("Parent comment not found");
    }
    if ((parentRow as any).post_id !== data.post_id) {
      throw new Error("Replies must target a comment on the same post.");
    }
  }

  const { data: comment, error } = await (client as any)
    .from("comments")
    .insert({
      user_id: user.id,
      ...data,
      college_domain: (postRow as any).college_domain ?? collegeDomain,
    })
    .select("*")
    .single();

  if (error) throw error;

  const { data: userProfile } = await client
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  return {
    ...comment,
    user: (userProfile as any) || undefined,
  };
}

export async function toggleCommentLike(
  client: SupabaseClient,
  commentId: string,
) {
  assertValidUuid(commentId, "commentId");
  const user = await ensureAuthenticatedUser(client);
  const collegeDomain = await ensureCollegeDomain(client, user.id);

  const { data: commentRow, error: commentError } = await client
    .from("comments")
    .select("id, post_id, college_domain")
    .eq("id", commentId)
    .maybeSingle();

  if (commentError) throw commentError;
  if (!commentRow) {
    throw new Error("Comment not found");
  }
  if (
    (commentRow as any).college_domain &&
    (commentRow as any).college_domain !== collegeDomain
  ) {
    throw new Error(
      "You can only react to comments from your own college domain.",
    );
  }

  const likeCollegeDomain =
    (commentRow as any).college_domain ?? collegeDomain;

  const { data: existing, error: existingError } = await client
    .from("comment_likes")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error } = await client
      .from("comment_likes")
      .delete()
      .eq("id", (existing as any).id);
    if (error) throw error;
    return { liked: false };
  } else {
    const { error } = await (client as any)
      .from("comment_likes")
      .insert({
        comment_id: commentId,
        user_id: user.id,
        college_domain: likeCollegeDomain,
      });
    if (error) throw error;
    return { liked: true };
  }
}

/**
 * Edit a comment — only the comment author can edit their own comment.
 */
export async function editComment(
  client: SupabaseClient,
  commentId: string,
  content: string,
): Promise<Comment> {
  try {
    assertValidUuid(commentId, "commentId");
    const user = await ensureAuthenticatedUser(client);
    const collegeDomain = await ensureCollegeDomain(client, user.id);

    const { data: commentRow, error: commentError } = await client
      .from("comments")
      .select("id, user_id, post_id, college_domain")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError) throw commentError;
    if (!commentRow) {
      throw new Error("Comment not found");
    }

    if ((commentRow as any).user_id !== user.id) {
      throw new Error("You can only edit your own comments");
    }

    if (
      (commentRow as any).college_domain &&
      (commentRow as any).college_domain !== collegeDomain
    ) {
      throw new Error("You can only edit comments from your own college domain");
    }

    const { data, error } = await (client as any)
      .from("comments")
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) throw error;

    const { data: profile } = await client
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .eq("id", user.id)
      .maybeSingle();

    return {
      ...data,
      user: profile
        ? {
            id: (profile as any).id,
            full_name: (profile as any).full_name || "Anonymous",
            avatar_url: (profile as any).avatar_url || "",
            role: (profile as any).role || "Member",
          }
        : undefined,
    } as Comment;
  } catch (error) {
    throw createAppError(
      "Failed to edit comment. Please try again.",
      "editComment",
      error,
    );
  }
}

/**
 * Delete a comment — only the comment author can delete their own comment.
 */
export async function deleteComment(
  client: SupabaseClient,
  commentId: string,
): Promise<void> {
  try {
    assertValidUuid(commentId, "commentId");
    const user = await ensureAuthenticatedUser(client);
    const collegeDomain = await ensureCollegeDomain(client, user.id);

    const { data: commentRow, error: commentError } = await client
      .from("comments")
      .select("id, user_id, post_id, parent_id, college_domain")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError) throw commentError;
    if (!commentRow) {
      throw new Error("Comment not found");
    }

    if ((commentRow as any).user_id !== user.id) {
      throw new Error("You can only delete your own comments");
    }

    if (
      (commentRow as any).college_domain &&
      (commentRow as any).college_domain !== collegeDomain
    ) {
      throw new Error(
        "You can only delete comments from your own college domain",
      );
    }

    const { error } = await client
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (error) throw error;
  } catch (error) {
    throw createAppError(
      "Failed to delete comment. Please try again.",
      "deleteComment",
      error,
    );
  }
}

// ===== CONNECTION FUNCTIONS =====

export async function sendConnectionRequest(
  client: SupabaseClient,
  receiverId: string,
  message?: string,
) {
  assertValidUuid(receiverId, "receiverId");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (receiverId === user.id) {
    throw new Error("You cannot connect with yourself.");
  }

  const { data: requesterProfile, error: requesterProfileError } = await client
    .from("profiles")
    .select("role, college_domain")
    .eq("id", user.id)
    .maybeSingle();

  if (requesterProfileError) throw requesterProfileError;

  const requesterRole =
    ((requesterProfile as any)?.role as UserRole | null) ?? null;
  if (!hasPermission(requesterRole, "canSendConnectionRequest")) {
    throw new Error("You are not authorized to send connection requests.");
  }

  const collegeDomain = (requesterProfile as any)?.college_domain
    ? normalizeCollegeDomain((requesterProfile as any).college_domain)
    : null;

  if (!collegeDomain) {
    throw new Error(
      "Profile missing college domain. Please complete onboarding.",
    );
  }

  // Validate receiver is in the same college domain
  const { data: receiverProfile, error: receiverProfileError } = await client
    .from("profiles")
    .select("college_domain")
    .eq("id", receiverId)
    .maybeSingle();

  if (receiverProfileError) throw receiverProfileError;

  const receiverDomain = (receiverProfile as any)?.college_domain
    ? normalizeCollegeDomain((receiverProfile as any).college_domain)
    : null;

  if (!receiverDomain) {
    throw new Error("Receiver profile missing college domain.");
  }

  if (receiverDomain !== collegeDomain) {
    throw new Error(
      "You can only connect with users from your own college domain.",
    );
  }

  const { data: existingConnection, error: existingError } = await client
    .from("connections")
    .select("id, status")
    .or(
      `and(requester_id.eq.${user.id},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${user.id})`,
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingConnection) {
    if ((existingConnection as any).status === "accepted") {
      throw new Error("You are already connected with this user.");
    }
    if ((existingConnection as any).status === "pending") {
      throw new Error("A connection request is already pending.");
    }
    if ((existingConnection as any).status === "blocked") {
      throw new Error("You cannot send a request to this user.");
    }
  }

  const { data, error } = await (client as any)
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
      const { data: conflictConnection, error: conflictError } = await client
        .from("connections")
        .select("id, status")
        .or(
          `and(requester_id.eq.${user.id},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${user.id})`,
        )
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (conflictError) throw conflictError;

      if ((conflictConnection as any)?.status === "accepted") {
        throw new Error("You are already connected with this user.");
      }
      if ((conflictConnection as any)?.status === "pending") {
        throw new Error("A connection request is already pending.");
      }
      if ((conflictConnection as any)?.status === "blocked") {
        throw new Error("You cannot send a request to this user.");
      }

      throw new Error("A connection already exists between these users.");
    }

    throw error;
  }
  return data;
}

export async function cancelConnectionRequest(
  client: SupabaseClient,
  receiverId: string,
) {
  assertValidUuid(receiverId, "receiverId");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await client
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

export async function getConnectionRequests(client: SupabaseClient) {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await client
    .from("connections")
    .select("*")
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  if (!data || data.length === 0) return [];

  const userIds = [
    ...new Set((data as any[]).map((c: any) => c.requester_id)),
  ];
  const { data: profiles } = await client
    .from("profiles")
    .select(
      "id, full_name, avatar_url, role, branch, graduation_year, enrollment_year, course_duration_years",
    )
    .in("id", userIds);

  const profilesMap = new Map(
    ((profiles as any[]) || []).map((p: any) => [p.id, p]),
  );

  return (data as any[]).map((connection: any) => ({
    ...connection,
    requester: profilesMap.get(connection.requester_id) || undefined,
  }));
}

export async function getConnections(client: SupabaseClient) {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await client
    .from("connections")
    .select("*")
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .eq("status", "accepted")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  if (!data || data.length === 0) return [];

  const userIds = [
    ...new Set(
      (data as any[]).flatMap((c: any) => [c.requester_id, c.receiver_id]),
    ),
  ];
  const { data: profiles } = await client
    .from("profiles")
    .select(
      "id, full_name, avatar_url, role, branch, graduation_year, enrollment_year, course_duration_years",
    )
    .in("id", userIds);

  const profilesMap = new Map(
    ((profiles as any[]) || []).map((p: any) => [p.id, p]),
  );

  return (data as any[]).map((connection: any) => ({
    ...connection,
    requester: profilesMap.get(connection.requester_id) || undefined,
    receiver: profilesMap.get(connection.receiver_id) || undefined,
  }));
}

export async function updateConnectionStatus(
  client: SupabaseClient,
  connectionId: string,
  status: "accepted" | "rejected",
) {
  assertValidUuid(connectionId, "connectionId");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await (client as any)
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

export async function acceptConnectionRequest(
  client: SupabaseClient,
  connectionId: string,
) {
  return updateConnectionStatus(client, connectionId, "accepted");
}

export async function rejectConnectionRequest(
  client: SupabaseClient,
  connectionId: string,
) {
  return updateConnectionStatus(client, connectionId, "rejected");
}

export async function removeConnection(
  client: SupabaseClient,
  connectionId: string,
) {
  assertValidUuid(connectionId, "connectionId");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await client
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

export async function checkConnectionStatus(
  client: SupabaseClient,
  userId: string,
) {
  assertValidUuid(userId, "userId");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await client
    .from("connections")
    .select("status")
    .or(
      `and(requester_id.eq.${user.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${user.id})`,
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as any)?.status || null;
}

// ===== MESSAGE FUNCTIONS (re-exports) =====

export async function sendMessage(
  client: SupabaseClient,
  receiverId: string,
  content: string,
) {
  return sendMessageCore(client, receiverId, content);
}

export async function getConversations(client: SupabaseClient) {
  return getConversationsCore(client);
}

export async function getMessages(
  client: SupabaseClient,
  partnerId: string,
  limit = 50,
) {
  const result = await getMessagesCore(client, partnerId, limit);
  return (result as any).messages;
}

export async function markMessagesAsRead(
  client: SupabaseClient,
  partnerId: string,
) {
  return markMessagesAsReadCore(client, partnerId);
}

// ===== POST MODERATION FUNCTIONS =====

export async function reportPost(
  client: SupabaseClient,
  postId: string,
  reason: string,
) {
  assertValidUuid(postId, "postId");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await (client as any).from("post_reports").insert({
    post_id: postId,
    reporter_id: user.id,
    reason,
  });

  if (error) {
    throw error;
  }
}

export async function undoReportPost(
  client: SupabaseClient,
  postId: string,
) {
  assertValidUuid(postId, "postId");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await client
    .from("post_reports")
    .delete()
    .eq("post_id", postId)
    .eq("reporter_id", user.id);

  if (error) {
    throw error;
  }
}

export async function hidePost(client: SupabaseClient, postId: string) {
  assertValidUuid(postId, "postId");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await (client as any).from("hidden_posts").insert({
    post_id: postId,
    user_id: user.id,
  });

  if (error) {
    throw error;
  }
}

export async function unhidePost(client: SupabaseClient, postId: string) {
  assertValidUuid(postId, "postId");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await client
    .from("hidden_posts")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }
}

// ===== SHARE FUNCTIONS =====

/**
 * Share a post — supports DM sharing to connections only.
 *
 * `appUrl` replaces `window.location.origin` for cross-platform use.
 */
export async function sharePost(
  client: SupabaseClient,
  data: {
    original_post_id: string;
    content?: string;
    share_type: "dm";
    receiver_id: string;
  },
  appUrl: string,
) {
  assertValidUuid(data.original_post_id, "originalPostId");
  assertValidUuid(data.receiver_id, "receiverId");
  const user = await ensureAuthenticatedUser(client);

  // Verify post exists
  const { data: originalPost, error: postError } = await client
    .from("posts")
    .select("id, content, user_id")
    .eq("id", data.original_post_id)
    .single();

  if (postError || !originalPost) {
    throw new Error("Post not found");
  }

  const postLink = `${appUrl}/post/${data.original_post_id}`;
  const messageContent = data.content
    ? `${data.content}\n\n📌 Shared post: ${postLink}`
    : `📌 Shared a post with you: ${postLink}`;

  await sendMessageCore(client, data.receiver_id, messageContent);

  // Record the share event for analytics
  const { error: shareError } = await (client as any)
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
 * Share post to multiple connections at once.
 */
export async function sharePostToMultiple(
  client: SupabaseClient,
  data: {
    original_post_id: string;
    content?: string;
    receiver_ids: string[];
  },
  appUrl: string,
) {
  assertValidUuid(data.original_post_id, "originalPostId");
  if (!data.receiver_ids || data.receiver_ids.length === 0) {
    throw new Error("At least one recipient is required");
  }

  data.receiver_ids.forEach((id, idx) =>
    assertValidUuid(id, `receiverId[${idx}]`),
  );

  const results = await Promise.allSettled(
    data.receiver_ids.map((receiver_id) =>
      sharePost(
        client,
        {
          original_post_id: data.original_post_id,
          content: data.content,
          share_type: "dm",
          receiver_id,
        },
        appUrl,
      ),
    ),
  );

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  if (failed > 0 && successful === 0) {
    throw new Error("Failed to share post");
  }

  return { sent: successful, failed };
}

// ===== SAVED ITEMS FUNCTIONS =====

export async function saveItem(
  client: SupabaseClient,
  type: "post" | "project" | "club" | "event",
  itemId: string,
) {
  assertValidUuid(itemId, "itemId");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await (client as any).from("saved_items").insert({
    user_id: user.id,
    type,
    item_id: itemId,
  });

  if (error) {
    if (error.code === "23505") {
      return { alreadySaved: true };
    }
    throw error;
  }
  return { alreadySaved: false };
}

export async function unsaveItem(
  client: SupabaseClient,
  type: "post" | "project" | "club" | "event",
  itemId: string,
) {
  assertValidUuid(itemId, "itemId");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await client
    .from("saved_items")
    .delete()
    .eq("user_id", user.id)
    .eq("type", type)
    .eq("item_id", itemId);

  if (error) throw error;
}

export async function checkIfSaved(
  client: SupabaseClient,
  type: "post" | "project" | "club" | "event",
  itemId: string,
) {
  assertValidUuid(itemId, "itemId");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return false;

  const { data, error } = await client
    .from("saved_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", type)
    .eq("item_id", itemId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return !!data;
}

export async function getSavedPosts(client: SupabaseClient) {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: savedItems, error } = await client
    .from("saved_items")
    .select("item_id, created_at")
    .eq("user_id", user.id)
    .eq("type", "post")
    .order("created_at", { ascending: false });

  if (error) throw error;

  if (!savedItems || savedItems.length === 0) return [];

  const postIds = (savedItems as any[]).map((item) => item.item_id);
  const { data: posts, error: postsError } = await client
    .from("posts")
    .select("*")
    .in("id", postIds);

  if (postsError) throw postsError;

  if (!posts || posts.length === 0) return [];

  // Fetch profiles for all post authors
  const userIds = [
    ...new Set((posts as any[]).map((p: any) => p.user_id)),
  ];
  const { data: profiles } = await client
    .from("profiles")
    .select("id, full_name, avatar_url, role, college_domain")
    .in("id", userIds);

  const profilesMap = new Map(
    ((profiles as any[]) || []).map((p: any) => [p.id, p]),
  );

  // Check if current user liked each post
  const { data: likes } = await client
    .from("post_likes")
    .select("post_id")
    .eq("user_id", user.id)
    .in("post_id", postIds);

  const likedPostIds = new Set(
    ((likes as any[]) || []).map((l: any) => l.post_id),
  );

  return (
    (posts as any[])?.map((post: any) => {
      const userProfile = profilesMap.get(post.user_id) as any;
      return {
        ...post,
        liked: likedPostIds.has(post.id),
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
    }) || []
  );
}

export async function toggleSavePost(client: SupabaseClient, postId: string) {
  assertValidUuid(postId, "postId");
  const isSaved = await checkIfSaved(client, "post", postId);
  if (isSaved) {
    await unsaveItem(client, "post", postId);
    return { saved: false };
  } else {
    await saveItem(client, "post", postId);
    return { saved: true };
  }
}

// ===== POLL FUNCTIONS =====

/**
 * Vote on a poll option.
 * Atomically records the vote and updates vote count.
 */
export async function voteOnPoll(
  client: SupabaseClient,
  postId: string,
  optionIndex: number,
) {
  try {
    assertValidUuid(postId, "postId");

    if (!Number.isInteger(optionIndex) || optionIndex < 0) {
      throw new Error("Invalid option index");
    }

    const { data, error } = await (client.rpc as any)("vote_on_poll", {
      p_post_id: postId,
      p_option_index: optionIndex,
    });

    if (error) {
      if (error.message?.includes("already voted")) {
        throw new Error("You have already voted on this poll");
      }
      if (error.message?.includes("Invalid option index")) {
        throw new Error("Invalid poll option");
      }
      throw error;
    }

    const normalized = normalizePoll(data);
    if (!normalized) {
      throw new Error("Invalid poll response");
    }
    return normalized;
  } catch (error) {
    throw createAppError(
      "Failed to vote on poll. Please try again.",
      "voteOnPoll",
      error,
    );
  }
}

/**
 * Check if the current user has voted on a poll.
 */
export async function hasUserVotedOnPoll(
  client: SupabaseClient,
  postId: string,
): Promise<boolean> {
  try {
    assertValidUuid(postId, "postId");

    const { data, error } = await (client.rpc as any)(
      "has_user_voted_on_poll",
      {
        p_post_id: postId,
      },
    );

    if (error) throw error;

    return Boolean(data);
  } catch (error) {
    throw createAppError(
      "Failed to check poll vote status.",
      "hasUserVotedOnPoll",
      error,
    );
  }
}

/**
 * Count mutual connections between two users.
 */
export async function countMutualConnections(
  client: SupabaseClient,
  userId: string,
  otherUserId: string,
): Promise<number> {
  try {
    assertValidUuid(userId, "userId");
    assertValidUuid(otherUserId, "otherUserId");

    const { data, error } = await (client.rpc as any)(
      "count_mutual_connections",
      {
        p_user_id: userId,
        p_other_user_id: otherUserId,
      },
    );

    if (error) throw error;

    return Number(data) || 0;
  } catch (error) {
    throw createAppError(
      "Failed to load mutual connections.",
      "countMutualConnections",
      error,
    );
  }
}

/**
 * Batch count mutual connections for multiple users.
 * More efficient than calling countMutualConnections repeatedly.
 */
export async function countMutualConnectionsBatch(
  client: SupabaseClient,
  userId: string,
  otherUserIds: string[],
): Promise<Map<string, number>> {
  try {
    assertValidUuid(userId, "userId");
    if (!Array.isArray(otherUserIds) || otherUserIds.length === 0) {
      return new Map();
    }

    otherUserIds.forEach((id, idx) => {
      assertValidUuid(id, `otherUserIds[${idx}]`);
    });

    const { data, error } = await (client.rpc as any)(
      "count_mutual_connections_batch",
      {
        p_user_id: userId,
        p_other_user_ids: otherUserIds,
      },
    );

    if (error) throw error;

    const resultMap = new Map<string, number>();
    if (Array.isArray(data)) {
      data.forEach((item: any) => {
        const otherUserId = item?.other_user_id;
        const rawCount = item?.mutual_count;
        const count =
          typeof rawCount === "number" ? rawCount : Number(rawCount);
        if (otherUserId && Number.isFinite(count)) {
          resultMap.set(otherUserId, count);
        }
      });
    }

    return resultMap;
  } catch (error) {
    throw createAppError(
      "Failed to load mutual connections.",
      "countMutualConnectionsBatch",
      error,
    );
  }
}

// ============================================================================
// REPOST FUNCTIONS (LinkedIn-style)
// ============================================================================

/**
 * Create a repost (with or without commentary).
 */
export async function createRepost(
  client: SupabaseClient,
  originalPostId: string,
  commentary?: string,
): Promise<{
  success: boolean;
  repostId: string;
  hasCommentary: boolean;
}> {
  try {
    assertValidUuid(originalPostId, "originalPostId");

    const { data, error } = await (client.rpc as any)("create_repost", {
      p_original_post_id: originalPostId,
      p_commentary_text: commentary || null,
    });

    if (error) {
      if (error.message?.includes("already reposted")) {
        throw new Error("You have already reposted this post");
      }
      throw error;
    }

    return {
      success: data.success,
      repostId: data.repost_id,
      hasCommentary: data.has_commentary,
    };
  } catch (error) {
    throw createAppError(
      "Failed to repost. Please try again.",
      "createRepost",
      error,
    );
  }
}

/**
 * Delete a repost (undo repost).
 */
export async function deleteRepost(
  client: SupabaseClient,
  originalPostId: string,
): Promise<boolean> {
  try {
    assertValidUuid(originalPostId, "originalPostId");

    const { data, error } = await (client.rpc as any)("delete_repost", {
      p_original_post_id: originalPostId,
    });

    if (error) throw error;

    return data?.success ?? true;
  } catch (error) {
    throw createAppError(
      "Failed to undo repost. Please try again.",
      "deleteRepost",
      error,
    );
  }
}

/**
 * Check if user has reposted a post.
 */
export async function hasUserReposted(
  client: SupabaseClient,
  postId: string,
): Promise<boolean> {
  try {
    assertValidUuid(postId, "postId");
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return false;

    const { data, error } = await client
      .from("reposts")
      .select("id")
      .eq("original_post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    return !!data;
  } catch (error) {
    console.warn("Failed to check repost status:", error);
    return false;
  }
}

/**
 * Get reposts for a post with user details.
 */
export async function getPostReposts(
  client: SupabaseClient,
  postId: string,
): Promise<Repost[]> {
  try {
    assertValidUuid(postId, "postId");

    const { data, error } = await client
      .from("reposts")
      .select("*")
      .eq("original_post_id", postId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) return [];

    const userIds = [
      ...new Set((data as any[]).map((r: any) => r.user_id)),
    ];
    const { data: profiles } = await client
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .in("id", userIds);

    const profilesMap = new Map(
      ((profiles as any[]) || []).map((p: any) => [p.id, p]),
    );

    return (data as any[]).map((repost: any) => ({
      ...repost,
      user: profilesMap.get(repost.user_id) || undefined,
    }));
  } catch (error) {
    throw createAppError(
      "Failed to load reposts.",
      "getPostReposts",
      error,
    );
  }
}

/**
 * Get feed that includes both posts and reposts (for Home Feed).
 * Reposts appear as separate feed items with embedded original post.
 */
export async function getFeedWithReposts(
  client: SupabaseClient,
  params: GetPostsParams = {},
): Promise<GetPostsResponse> {
  try {
    const user = await ensureAuthenticatedUser(client);
    const { pageSize = 10, cursor = null } = params;
    const collegeDomain = await ensureCollegeDomain(client, user.id, params.filters);

    // Pre-fetch hidden post IDs
    let hiddenIds = new Set<string>();
    try {
      const { data: hiddenRows } = await client
        .from("hidden_posts")
        .select("post_id")
        .eq("user_id", user.id);

      if (hiddenRows && hiddenRows.length > 0) {
        hiddenIds = new Set(
          (hiddenRows as any[]).map((r: { post_id: string }) => r.post_id),
        );
      }
    } catch (err) {
      console.warn("Failed to fetch hidden posts for feed:", err);
    }

    // Fetch regular posts — over-fetch to compensate for hidden post filtering
    const fetchLimit = pageSize + 1 + hiddenIds.size;
    let postsQuery = client
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
        reposts_count,
        created_at,
        updated_at
      `,
      )
      .eq("college_domain", collegeDomain)
      .order("created_at", { ascending: false })
      .limit(fetchLimit);

    if (cursor) {
      postsQuery = postsQuery.lt("created_at", cursor);
    }

    const { data: rawPosts, error: postsError } = await postsQuery;
    if (postsError) throw postsError;

    const posts = ((rawPosts as any[]) ?? []).filter(
      (p: any) => !hiddenIds.has(p.id),
    );

    // Fetch reposts
    let repostsQuery = client
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

    const limited = posts.slice(0, pageSize);
    const postIds = limited.map((post: any) => post.id as string);
    const userIds = [
      ...new Set([
        ...limited.map((post: any) => post.user_id as string),
        ...((reposts as any[]) || []).map((r: any) => r.user_id as string),
      ]),
    ];

    // Fetch profiles
    const profilesMap = new Map<string, any>();
    if (userIds.length > 0) {
      try {
        const { data: profiles } = await client
          .from("profiles")
          .select("id, full_name, avatar_url, role, college_domain")
          .in("id", userIds);

        (profiles as any[])?.forEach((profile: any) => {
          profilesMap.set(profile.id, profile);
        });
      } catch (err) {
        console.warn("Failed to fetch profiles:", err);
      }
    }

    // Fetch user reactions
    const userReactionsMap = new Map<string, ReactionType>();
    if (postIds.length > 0) {
      try {
        const { data: reactions } = await client
          .from("post_likes")
          .select("post_id, reaction_type")
          .eq("user_id", user.id)
          .in("post_id", postIds);

        (reactions as any[])?.forEach((r: any) => {
          userReactionsMap.set(r.post_id, r.reaction_type as ReactionType);
        });
      } catch (err) {
        console.warn("Failed to fetch reactions:", err);
      }
    }

    // Fetch saved state
    const savedPostIds = new Set<string>();
    if (postIds.length > 0) {
      try {
        const { data: savedRows } = await client
          .from("saved_items")
          .select("item_id")
          .eq("user_id", user.id)
          .eq("type", "post")
          .in("item_id", postIds);

        (savedRows as any[])?.forEach((row: any) =>
          savedPostIds.add(row.item_id),
        );
      } catch (err) {
        console.warn("Failed to fetch saved state:", err);
      }
    }

    // Fetch user's repost state
    const repostedPostIds = new Set<string>();
    if (postIds.length > 0) {
      try {
        const { data: userReposts } = await client
          .from("reposts")
          .select("original_post_id")
          .eq("user_id", user.id)
          .in("original_post_id", postIds);

        (userReposts as any[])?.forEach((r: any) =>
          repostedPostIds.add(r.original_post_id),
        );
      } catch (err) {
        console.warn("Failed to fetch repost state:", err);
      }
    }

    // Normalize posts
    const normalizedPosts: Post[] = limited.map((post: any) => {
      const userProfile = profilesMap.get(post.user_id);
      const userReaction = userReactionsMap.get(post.id);

      return {
        ...post,
        poll: normalizePoll((post as any)?.poll),
        liked: userReaction !== undefined,
        userReaction: userReaction || null,
        saved: savedPostIds.has(post.id),
        reposted: repostedPostIds.has(post.id),
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
    });

    const hasMore = posts.length > pageSize;
    const nextCursor = hasMore
      ? limited[limited.length - 1].created_at
      : null;

    return {
      posts: normalizedPosts,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    throw createAppError(
      "Failed to load your feed.",
      "getFeedWithReposts",
      error,
    );
  }
}

// ===== TOP COMMENTS =====

/**
 * Batch-fetch top comments for multiple posts at once.
 * Eliminates N+1 queries when rendering a feed with inline comment previews.
 */
export async function getTopCommentsBatch(
  client: SupabaseClient,
  postIds: string[],
  limitPerPost = 2,
): Promise<Map<string, Comment[]>> {
  const result = new Map<string, Comment[]>();
  if (postIds.length === 0) return result;

  postIds.forEach((id) => assertValidUuid(id, "postId"));

  try {
    const { data: comments, error } = await client
      .from("comments")
      .select("*")
      .in("post_id", postIds)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(limitPerPost * postIds.length + postIds.length);

    if (error) throw error;
    if (!comments || comments.length === 0) return result;

    const userIds = [
      ...new Set((comments as any[]).map((c: any) => c.user_id)),
    ];
    const { data: profiles } = await client
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .in("id", userIds);

    const profilesMap = new Map(
      ((profiles as any[]) ?? []).map((p: any) => [p.id, p]),
    );

    // Group by post_id and trim to limitPerPost
    const grouped = new Map<string, any[]>();
    (comments as any[]).forEach((c: any) => {
      const list = grouped.get(c.post_id) ?? [];
      if (list.length < limitPerPost) {
        list.push(c);
        grouped.set(c.post_id, list);
      }
    });

    grouped.forEach((list, postId) => {
      result.set(
        postId,
        list.map((comment: any) => ({
          ...comment,
          replies: [],
          user: profilesMap.get(comment.user_id) || undefined,
        })),
      );
    });
  } catch (error) {
    console.warn("Failed to batch-fetch top comments:", error);
  }

  return result;
}

/**
 * Get top comments for inline preview (first N comments) for a single post.
 * Prefer getTopCommentsBatch for feed rendering to avoid N+1.
 */
export async function getTopComments(
  client: SupabaseClient,
  postId: string,
  limit = 2,
): Promise<Comment[]> {
  const batch = await getTopCommentsBatch(client, [postId], limit);
  return batch.get(postId) ?? [];
}
