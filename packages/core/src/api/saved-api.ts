/**
 * Saved Items API — Cross-Platform
 *
 * Handles saving/bookmarking posts, projects, clubs, events, jobs
 * with domain isolation and privacy checks.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAppError } from '../errors';
import { assertValidUuid } from '../utils/uuid';

// ── Types ────────────────────────────────────────────────────

export type SavedItemType = 'post' | 'project' | 'club' | 'event' | 'job';

export interface SavedItem {
  id: string;
  user_id: string;
  type: SavedItemType;
  item_id: string;
  created_at: string;
}

export interface SavedPost {
  id: string;
  user_id: string;
  content: string;
  images?: string[];
  video?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  updated_at: string;
  college_domain?: string | null;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
    college_domain?: string | null;
  };
  liked?: boolean;
  saved?: boolean;
}

export interface SavedProject {
  id: string;
  title: string;
  description: string;
  summary?: string;
  category?: string;
  project_type?: string;
  status: string;
  skills?: string[];
  tags?: string[];
  cover_image_url?: string;
  team_size_target?: number;
  team_size_current?: number;
  college_domain: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  owner?: {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
  };
}

export interface SavedClub {
  id: string;
  name: string;
  description: string;
  short_description?: string;
  club_type: string;
  category?: string;
  member_count: number;
  meeting_schedule?: string;
  meeting_location?: string;
  contact_email?: string;
  college_domain: string;
  created_at: string;
  updated_at: string;
}

export interface GetSavedItemsResult {
  posts: SavedPost[];
  projects: SavedProject[];
  clubs: SavedClub[];
  error: string | null;
}

// ── Helpers ──────────────────────────────────────────────────

const isValidProjectOwner = (owner: unknown): owner is NonNullable<SavedProject['owner']> => {
  return (
    !!owner &&
    typeof owner === 'object' &&
    'id' in owner &&
    'full_name' in owner &&
    'avatar_url' in owner &&
    'role' in owner
  );
};

// ── API Functions ────────────────────────────────────────────

/**
 * Get all saved items for the current user grouped by type.
 * Respects domain isolation and privacy settings.
 */
export async function getSavedItems(
  client: SupabaseClient,
  profileId: string,
): Promise<GetSavedItemsResult> {
  try {
    assertValidUuid(profileId, 'profileId');
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    if (user.id !== profileId) {
      throw new Error('Unauthorized: Can only view your own saved items');
    }

    // Get user's college domain for domain isolation
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('college_domain')
      .eq('id', profileId)
      .single();

    if (profileError) throw profileError;
    const userCollegeDomain = profile?.college_domain;

    // Fetch all saved items for the user
    const { data: savedItems, error: savedError } = await client
      .from('saved_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (savedError) throw savedError;

    if (!savedItems || savedItems.length === 0) {
      return { posts: [], projects: [], clubs: [], error: null };
    }

    // Group by type
    const postIds = savedItems.filter((item) => item.type === 'post').map((item) => item.item_id);
    const projectIds = savedItems
      .filter((item) => item.type === 'project')
      .map((item) => item.item_id);
    const clubIds = savedItems.filter((item) => item.type === 'club').map((item) => item.item_id);

    // ── Posts ──
    let posts: SavedPost[] = [];
    if (postIds.length > 0) {
      let postsQuery = client
        .from('posts')
        .select(
          `*, user:profiles!posts_user_id_fkey(id, full_name, avatar_url, role, college_domain)`,
        )
        .in('id', postIds);

      if (userCollegeDomain) {
        postsQuery = postsQuery.or(
          `college_domain.eq.${userCollegeDomain},college_domain.is.null`,
        );
      }

      const { data: postsData, error: postsError } = await postsQuery;

      if (postsError) {
        console.error('Error fetching saved posts:', postsError);
      } else if (postsData) {
        const filteredPosts = postsData.filter((post) => {
          if (!post.college_domain) return true;
          if (post.college_domain === userCollegeDomain) return true;
          return false;
        });

        if (filteredPosts.length > 0) {
          const { data: likes } = await client
            .from('post_likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in(
              'post_id',
              filteredPosts.map((p) => p.id),
            );

          const likedPostIds = new Set(likes?.map((l) => l.post_id) || []);
          posts = filteredPosts.map((post) => ({
            ...post,
            liked: likedPostIds.has(post.id),
            saved: true,
          }));
        }
      }
    }

    // ── Projects ──
    let projects: SavedProject[] = [];
    if (projectIds.length > 0) {
      let projectsQuery = client
        .from('collab_projects')
        .select(
          `*, owner:profiles!collab_projects_owner_id_fkey(id, full_name, avatar_url, role)`,
        )
        .in('id', projectIds)
        .eq('visibility', 'public');

      if (userCollegeDomain) {
        projectsQuery = projectsQuery.eq('college_domain', userCollegeDomain);
      }

      const { data: projectsData, error: projectsError } = await projectsQuery;

      if (projectsError) {
        console.error('Error fetching saved projects:', projectsError);
      } else if (projectsData) {
        projects = projectsData
          .filter((project) => project.college_domain === userCollegeDomain)
          .map((project) => ({
            ...project,
            owner: isValidProjectOwner(project.owner) ? project.owner : undefined,
          }));
      }
    }

    // ── Clubs ──
    let clubs: SavedClub[] = [];
    if (clubIds.length > 0) {
      let clubsQuery = client
        .from('clubs')
        .select('*')
        .in('id', clubIds)
        .eq('is_active', true);

      if (userCollegeDomain) {
        clubsQuery = clubsQuery.eq('college_domain', userCollegeDomain);
      }

      const { data: clubsData, error: clubsError } = await clubsQuery;

      if (clubsError) {
        console.error('Error fetching saved clubs:', clubsError);
      } else if (clubsData) {
        clubs = clubsData.filter((club) => club.college_domain === userCollegeDomain);
      }
    }

    return { posts, projects, clubs, error: null };
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      if (
        message === 'Not authenticated' ||
        message.startsWith('Unauthorized') ||
        message === 'Item not found or not accessible' ||
        message.startsWith('Invalid ')
      ) {
        return { posts: [], projects: [], clubs: [], error: message };
      }
    }
    throw createAppError('Failed to load saved items. Please try again.', 'getSavedItems', error);
  }
}

/**
 * Fetch saved project IDs for the authenticated user (lightweight helper).
 */
export async function getSavedProjectIds(
  client: SupabaseClient,
  profileId: string,
): Promise<{ ids: string[]; error: string | null }> {
  try {
    assertValidUuid(profileId, 'profileId');
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    if (user.id !== profileId) {
      throw new Error('Unauthorized: Can only view your own saved projects');
    }

    const { data, error } = await client
      .from('saved_items')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('type', 'project')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { ids: (data ?? []).map((row) => row.item_id), error: null };
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      if (
        message === 'Not authenticated' ||
        message.startsWith('Unauthorized') ||
        message.startsWith('Invalid ')
      ) {
        return { ids: [], error: message };
      }
    }
    throw createAppError('Failed to load saved projects', 'getSavedProjectIds', error);
  }
}

/**
 * Toggle save/unsave for an item (post, project, club, event, job).
 * Returns the new saved state.
 */
export async function toggleSaveItem(
  client: SupabaseClient,
  profileId: string,
  itemType: SavedItemType,
  itemId: string,
): Promise<{ saved: boolean; error: string | null }> {
  try {
    assertValidUuid(profileId, 'profileId');
    assertValidUuid(itemId, 'itemId');
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    if (user.id !== profileId) {
      throw new Error('Unauthorized: Can only manage your own saved items');
    }

    // Get user's college domain for validation
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('college_domain')
      .eq('id', profileId)
      .single();

    if (profileError) throw profileError;
    const userCollegeDomain = profile?.college_domain;

    // Verify item exists and is accessible based on domain isolation
    let isAccessible = false;

    if (itemType === 'post') {
      const { data: post, error: postError } = await client
        .from('posts')
        .select('id, college_domain')
        .eq('id', itemId)
        .single();
      if (postError && postError.code !== 'PGRST116') throw postError;
      if (post) {
        isAccessible = !post.college_domain || post.college_domain === userCollegeDomain;
      }
    } else if (itemType === 'project') {
      const { data: project, error: projectError } = await client
        .from('collab_projects')
        .select('id, college_domain, visibility')
        .eq('id', itemId)
        .single();
      if (projectError && projectError.code !== 'PGRST116') throw projectError;
      if (project) {
        isAccessible =
          project.visibility === 'public' && project.college_domain === userCollegeDomain;
      }
    } else if (itemType === 'club') {
      const { data: club, error: clubError } = await client
        .from('clubs')
        .select('id, college_domain, is_active')
        .eq('id', itemId)
        .single();
      if (clubError && clubError.code !== 'PGRST116') throw clubError;
      if (club) {
        isAccessible = club.is_active && club.college_domain === userCollegeDomain;
      }
    } else if (itemType === 'event') {
      const { data: event, error: eventError } = await client
        .from('events')
        .select('id, college_domain')
        .eq('id', itemId)
        .single();
      if (eventError && eventError.code !== 'PGRST116') throw eventError;
      if (event) {
        isAccessible = !event.college_domain || event.college_domain === userCollegeDomain;
      }
    } else if (itemType === 'job') {
      const { data: job, error: jobError } = await client
        .from('jobs')
        .select('id, college_domain, is_active')
        .eq('id', itemId)
        .single();
      if (jobError && jobError.code !== 'PGRST116') throw jobError;
      if (job) {
        const matchesDomain = !job.college_domain || job.college_domain === userCollegeDomain;
        isAccessible = !!job.is_active && matchesDomain;
      }
    }

    if (!isAccessible) {
      throw new Error('Item not found or not accessible');
    }

    // Check if already saved
    const { data: existing, error: checkError } = await client
      .from('saved_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', itemType)
      .eq('item_id', itemId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      const { error: deleteError } = await client
        .from('saved_items')
        .delete()
        .eq('id', existing.id);
      if (deleteError) throw deleteError;
      return { saved: false, error: null };
    } else {
      const { error: insertError } = await client.from('saved_items').insert({
        user_id: user.id,
        type: itemType,
        item_id: itemId,
      });
      if (insertError) {
        if (insertError.code === '23505') {
          return { saved: true, error: null };
        }
        throw insertError;
      }
      return { saved: true, error: null };
    }
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      if (
        message === 'Not authenticated' ||
        message.startsWith('Unauthorized') ||
        message === 'Item not found or not accessible' ||
        message.startsWith('Invalid ')
      ) {
        return { saved: false, error: message };
      }
    }
    throw createAppError(
      'Failed to save/unsave item. Please try again.',
      'toggleSaveItem',
      error,
    );
  }
}

/**
 * Remove a saved item by its saved_items ID.
 */
export async function removeSavedItem(
  client: SupabaseClient,
  profileId: string,
  savedId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    assertValidUuid(profileId, 'profileId');
    assertValidUuid(savedId, 'savedId');
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    if (user.id !== profileId) {
      throw new Error('Unauthorized: Can only remove your own saved items');
    }

    const { error: deleteError } = await client
      .from('saved_items')
      .delete()
      .eq('id', savedId)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;
    return { success: true, error: null };
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      if (
        message === 'Not authenticated' ||
        message.startsWith('Unauthorized') ||
        message.startsWith('Invalid ')
      ) {
        return { success: false, error: message };
      }
    }
    throw createAppError(
      'Failed to remove saved item. Please try again.',
      'removeSavedItem',
      error,
    );
  }
}

/**
 * Check if a specific item is saved by the current user.
 */
export async function checkIfItemSaved(
  client: SupabaseClient,
  itemType: SavedItemType,
  itemId: string,
): Promise<boolean> {
  try {
    assertValidUuid(itemId, 'itemId');
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return false;

    const { data, error } = await client
      .from('saved_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', itemType)
      .eq('item_id', itemId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking if item is saved:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid')) {
      throw error;
    }
    console.error('Error checking if item is saved:', error);
    return false;
  }
}
