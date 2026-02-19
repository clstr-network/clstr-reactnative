/**
 * Collaborative projects API — shared, platform-agnostic module.
 *
 * Uses a local `getErrorMessage` helper (not handleApiError) for
 * error handling, matching the original web source.
 *
 * @module
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';
import type { CrossPlatformFile } from '../types/file';
import { getFileType, getFileName, getFileSize } from '../types/file';
import { assertValidUuid } from '../utils/uuid';

// ---------------------------------------------------------------------------
// DB-aliased types (resolve to Record<string, any> in the generic schema)
// ---------------------------------------------------------------------------

type ProjectRow = Database['public']['Tables']['collab_projects']['Row'];
type ProjectInsert = Database['public']['Tables']['collab_projects']['Insert'];
type ProjectRoleRow = Database['public']['Tables']['collab_project_roles']['Row'];
type ProjectApplicationRow =
  Database['public']['Tables']['collab_project_applications']['Row'];
type ProjectApplicationInsert =
  Database['public']['Tables']['collab_project_applications']['Insert'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type ProjectOwner = Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url' | 'role'>;

export type Project = ProjectRow & {
  owner?: ProjectOwner;
};

export type ProjectRole = ProjectRoleRow;

export type ProjectApplication = ProjectApplicationRow & {
  applicant?: ProjectOwner;
  role?: ProjectRole;
};

export type ProjectApplicationProject = Pick<ProjectRow, 'id' | 'title' | 'owner_id'>;

export type ProjectApplicationWithProject = ProjectApplication & {
  project?: ProjectApplicationProject;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_PROJECT_STATUS: string[] = [
  'draft',
  'open',
  'in_progress',
  'closed',
  'archived',
];

const ACTIVE_PROJECT_STATUSES: string[] = ['open', 'in_progress'];

const PROJECT_IMAGE_BUCKET = 'project-images';

const PROJECT_TYPE_MAP: Record<string, string> = {
  startup: 'startup',
  hackathon: 'hackathon',
  research: 'research',
  app: 'app',
  product: 'app',
  software: 'app',
  club: 'club',
  campus: 'club',
  other: 'other',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const normalizeProjectType = (raw?: string | null): string => {
  if (!raw) return 'other';
  const key = raw.toLowerCase();
  return PROJECT_TYPE_MAP[key] ?? 'other';
};

const deleteProjectImageSafe = async (
  client: SupabaseClient,
  imageUrl?: string | null,
): Promise<void> => {
  if (!imageUrl) return;

  try {
    const url = new URL(imageUrl);
    const bucketSegment = `/${PROJECT_IMAGE_BUCKET}/`;
    const bucketIndex = url.pathname.indexOf(bucketSegment);
    if (bucketIndex === -1) return;

    const filePath = url.pathname.slice(bucketIndex + bucketSegment.length);
    if (!filePath) return;

    await client.storage
      .from(PROJECT_IMAGE_BUCKET)
      .remove([decodeURIComponent(filePath)]);
  } catch (error) {
    console.warn('Failed to delete project image:', error);
  }
};

const normalizeProfileSummary = (profileData: unknown): ProjectOwner | undefined => {
  if (
    profileData &&
    typeof profileData === 'object' &&
    !('error' in profileData) &&
    'id' in profileData
  ) {
    const { id, full_name, avatar_url, role } = profileData as ProfileRow;
    return {
      id,
      full_name: full_name ?? 'Unknown',
      avatar_url: avatar_url ?? null,
      role: role ?? 'Student',
    };
  }
  return undefined;
};

const fallbackOwner = (id: string): ProjectOwner => ({
  id,
  full_name: 'Unknown',
  avatar_url: null,
  role: 'Student',
});

const fetchProfileSummariesById = async (
  client: SupabaseClient,
  ids: string[],
): Promise<Map<string, ProjectOwner>> => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, avatar_url, role')
    .in('id', uniqueIds);

  if (error) throw error;

  return new Map(
    (data ?? []).map((row: any) => {
      const owner = normalizeProfileSummary(row) ?? fallbackOwner(row.id);
      return [row.id, owner] as const;
    }),
  );
};

const normalizeProjectRole = (roleData: unknown): ProjectRole | undefined => {
  if (
    roleData &&
    typeof roleData === 'object' &&
    !('error' in roleData) &&
    'id' in roleData
  ) {
    return roleData as ProjectRole;
  }
  return undefined;
};

const normalizeProjectSummary = (
  projectData: unknown,
): ProjectApplicationProject | undefined => {
  if (
    projectData &&
    typeof projectData === 'object' &&
    !('error' in projectData) &&
    'id' in projectData
  ) {
    const { id, title, owner_id } = projectData as ProjectRow;
    return { id, title: title ?? 'Untitled', owner_id };
  }
  return undefined;
};

const getErrorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return fallback;
};

// ---------------------------------------------------------------------------
// Param types
// ---------------------------------------------------------------------------

export interface GetProjectsParams {
  limit?: number;
  cursor?: string;
  filters?: {
    category?: string;
    sortBy?: 'latest' | 'trending';
    searchQuery?: string;
    status?: string[];
  };
  collegeDomain: string;
}

export interface CreateProjectParams {
  title: string;
  description: string;
  summary?: string;
  category?: string;
  project_type?: string;
  skills?: string[];
  tags?: string[];
  cover_image_url?: string;
  is_remote?: boolean;
  location?: string;
  starts_on?: string;
  ends_on?: string;
  team_size_target?: number;
  userId: string;
  collegeDomain: string;
}

export interface ApplyForRoleParams {
  projectId: string;
  roleId: string | null;
  applicantId: string;
  message: string;
  skills?: string[];
  availability?: string;
  collegeDomain: string;
}

export interface UpdateApplicationStatusParams {
  applicationId: string;
  ownerId: string;
  status: string; // "applied" | "accepted" | "rejected" | …
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch projects with filters and pagination.
 */
export async function getProjects(
  client: SupabaseClient,
  params: GetProjectsParams,
): Promise<{ data: Project[]; error: string | null; hasMore: boolean }> {
  try {
    const { limit = 20, cursor, filters, collegeDomain } = params;

    if (!collegeDomain) {
      throw new Error('College domain is required to list projects');
    }

    let query = client
      .from('collab_projects')
      .select('*', { count: 'exact' })
      .eq('college_domain', collegeDomain)
      .eq('visibility', 'public');

    // Status filter
    const requestedStatuses = (filters?.status || []).filter((s) =>
      ALLOWED_PROJECT_STATUS.includes(s),
    );
    const statusFilter =
      requestedStatuses.length > 0 ? requestedStatuses : ACTIVE_PROJECT_STATUSES;
    query = query.in('status', statusFilter);

    // Search filter
    if (filters?.searchQuery && filters.searchQuery.trim()) {
      query = query.or(
        `title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%,summary.ilike.%${filters.searchQuery}%`,
      );
    }

    // Category filter
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('project_type', normalizeProjectType(filters.category));
    }

    // Sorting
    if (filters?.sortBy === 'trending') {
      query = query
        .order('engagement_score', { ascending: false })
        .order('team_size_current', { ascending: false })
        .order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Pagination
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    query = query.limit(limit);

    const { data, error, count } = await query;
    if (error) throw error;

    const rows = (data ?? []) as ProjectRow[];
    const ownerMap = await fetchProfileSummariesById(
      client,
      rows.map((row: any) => row.owner_id),
    );

    const projects: Project[] = rows.map((row: any) => ({
      ...row,
      owner: ownerMap.get(row.owner_id) ?? fallbackOwner(row.owner_id),
    }));

    const hasMore = typeof count === 'number' ? projects.length < count : false;

    return { data: projects, error: null, hasMore };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return {
      data: [],
      error: getErrorMessage(error, 'Failed to fetch projects'),
      hasMore: false,
    };
  }
}

/**
 * Get a single project by ID.
 */
export async function getProject(
  client: SupabaseClient,
  projectId: string,
): Promise<{ data: Project | null; error: string | null }> {
  try {
    assertValidUuid(projectId, 'projectId');

    const { data, error } = await client
      .from('collab_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) throw error;

    const ownerMap = await fetchProfileSummariesById(client, [data.owner_id]);
    const project: Project = {
      ...data,
      owner: ownerMap.get(data.owner_id) ?? fallbackOwner(data.owner_id),
    };

    return { data: project, error: null };
  } catch (error) {
    console.error('Error fetching project:', error);
    return { data: null, error: getErrorMessage(error, 'Failed to fetch project') };
  }
}

/**
 * Get roles for a specific project.
 */
export async function getProjectRoles(
  client: SupabaseClient,
  projectId: string,
): Promise<{ data: ProjectRole[]; error: string | null }> {
  try {
    assertValidUuid(projectId, 'projectId');

    const { data, error } = await client
      .from('collab_project_roles')
      .select('*')
      .eq('project_id', projectId)
      .order('priority', { ascending: false });

    if (error) throw error;

    return { data: (data || []) as ProjectRole[], error: null };
  } catch (error) {
    console.error('Error fetching project roles:', error);
    return { data: [], error: getErrorMessage(error, 'Failed to fetch project roles') };
  }
}

/**
 * Create a new project with optional image upload.
 */
export async function createProject(
  client: SupabaseClient,
  params: CreateProjectParams,
  imageFile?: CrossPlatformFile,
): Promise<{ data: Project | null; error: string | null }> {
  try {
    assertValidUuid(params.userId, 'userId');

    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user || user.id !== params.userId) {
      throw new Error('Unauthorized: active session mismatch');
    }

    if (!params.collegeDomain) {
      throw new Error('College domain is required to create a project');
    }

    const projectType = normalizeProjectType(params.project_type || params.category);
    const projectStatus = 'open';

    let coverImageUrl: string | null = null;

    // Upload image if provided
    if (imageFile) {
      const fileSize = getFileSize(imageFile);
      if (fileSize !== undefined && fileSize > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB');
      }

      const fileExt = getFileName(imageFile).split('.').pop();
      const fileName = `${params.userId}-${Date.now()}.${fileExt}`;
      const filePath = `${params.userId}/${fileName}`;

      const { error: uploadError } = await client.storage
        .from(PROJECT_IMAGE_BUCKET)
        .upload(filePath, imageFile as any, {
          cacheControl: '3600',
          upsert: false,
          contentType: getFileType(imageFile),
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = client.storage.from(PROJECT_IMAGE_BUCKET).getPublicUrl(filePath);

      coverImageUrl = publicUrl;
    }

    // Prepare insert data
    const insertData: ProjectInsert = {
      title: params.title,
      summary: params.summary || params.title,
      description: params.description,
      project_type: projectType,
      skills: params.skills || [],
      tags: params.tags || [],
      hero_image_url: coverImageUrl || params.cover_image_url || null,
      is_remote: params.is_remote ?? true,
      location: params.location || null,
      starts_on: params.starts_on || null,
      ends_on: params.ends_on || null,
      team_size_target: params.team_size_target || 5,
      team_size_current: 1,
      owner_id: params.userId,
      college_domain: params.collegeDomain,
      visibility: 'public',
      status: projectStatus,
    };

    const { data, error } = await client
      .from('collab_projects')
      .insert(insertData as any)
      .select('*')
      .single();

    if (error) throw error;

    // Add creator as team member
    const { error: teamError } = await client.from('collab_team_members').insert({
      project_id: data.id,
      user_id: params.userId,
      is_owner: true,
      status: 'active',
      role_name: 'Project Owner',
      college_domain: params.collegeDomain,
    } as any);

    if (teamError) throw teamError;

    const ownerMap = await fetchProfileSummariesById(client, [params.userId]);
    const project: Project = {
      ...data,
      owner: ownerMap.get(params.userId) ?? fallbackOwner(params.userId),
    };

    return { data: project, error: null };
  } catch (error) {
    console.error('Error creating project:', error);
    return { data: null, error: getErrorMessage(error, 'Failed to create project') };
  }
}

/**
 * Delete a project owned by the current user.
 */
export async function deleteProject(
  client: SupabaseClient,
  params: { projectId: string; ownerId: string },
): Promise<{ success: boolean; error: string | null }> {
  try {
    assertValidUuid(params.projectId, 'projectId');
    assertValidUuid(params.ownerId, 'ownerId');

    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user || user.id !== params.ownerId) {
      throw new Error('Unauthorized: active session mismatch');
    }

    const { data: project, error: projectError } = await client
      .from('collab_projects')
      .select('id, owner_id, hero_image_url')
      .eq('id', params.projectId)
      .single();

    if (projectError) throw projectError;
    if (!project || project.owner_id !== params.ownerId) {
      throw new Error('Unauthorized: only project owners can delete projects');
    }

    const { error } = await client
      .from('collab_projects')
      .delete()
      .eq('id', params.projectId)
      .eq('owner_id', params.ownerId);

    if (error) throw error;

    await deleteProjectImageSafe(client, project.hero_image_url);

    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, error: getErrorMessage(error, 'Failed to delete project') };
  }
}

/**
 * Apply for a role in a project.
 */
export async function applyForRole(
  client: SupabaseClient,
  params: ApplyForRoleParams,
): Promise<{ success: boolean; error: string | null }> {
  try {
    assertValidUuid(params.projectId, 'projectId');
    assertValidUuid(params.applicantId, 'applicantId');
    if (params.roleId) {
      assertValidUuid(params.roleId, 'roleId');
    }

    if (!params.collegeDomain) {
      throw new Error('College domain is required to apply');
    }

    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user || user.id !== params.applicantId) {
      throw new Error('Unauthorized: active session mismatch');
    }

    const { data: project, error: projectError } = await client
      .from('collab_projects')
      .select('id, owner_id, status, visibility, college_domain')
      .eq('id', params.projectId)
      .single();

    if (projectError) throw projectError;
    if (!project || project.visibility !== 'public') {
      throw new Error('Project not found or not public');
    }

    if (project.college_domain !== params.collegeDomain) {
      throw new Error('Project is restricted to your college domain');
    }

    if (!ACTIVE_PROJECT_STATUSES.includes(project.status as string)) {
      throw new Error('Project is not accepting applications');
    }

    if (project.owner_id === params.applicantId) {
      throw new Error('Owners cannot apply to their own project');
    }

    const { data: membership } = await client
      .from('collab_team_members')
      .select('id')
      .eq('project_id', params.projectId)
      .eq('user_id', params.applicantId)
      .maybeSingle();

    if (membership) {
      throw new Error('You are already part of this project team');
    }

    if (params.roleId) {
      const { data: role, error: roleError } = await client
        .from('collab_project_roles')
        .select('project_id, status, college_domain')
        .eq('id', params.roleId)
        .single();

      if (roleError) throw roleError;
      if (!role || role.project_id !== params.projectId) {
        throw new Error('Role not found for this project');
      }

      if (role.college_domain && role.college_domain !== params.collegeDomain) {
        throw new Error('Role is not available for your college domain');
      }

      const roleStatus = role.status as string;
      if (roleStatus !== 'open' && roleStatus !== 'interviewing') {
        throw new Error('Role is not currently open');
      }
    }

    // Check for existing application
    const { data: existingApp } = await client
      .from('collab_project_applications')
      .select('id')
      .eq('project_id', params.projectId)
      .eq('applicant_id', params.applicantId)
      .maybeSingle();

    if (existingApp) {
      throw new Error('You have already applied to this project');
    }

    const insertData: ProjectApplicationInsert = {
      project_id: params.projectId,
      role_id: params.roleId || null,
      applicant_id: params.applicantId,
      message: params.message || null,
      skills: params.skills || [],
      availability: params.availability || null,
      status: 'applied',
      college_domain: project.college_domain,
    };

    const { error } = await client
      .from('collab_project_applications')
      .insert(insertData as any);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error applying for role:', error);
    return { success: false, error: getErrorMessage(error, 'Failed to submit application') };
  }
}

/**
 * Get all applications for a specific project (owner only).
 */
export async function getApplicationsForProject(
  client: SupabaseClient,
  projectId: string,
  ownerId: string,
): Promise<{ data: ProjectApplication[]; error: string | null }> {
  try {
    assertValidUuid(projectId, 'projectId');
    assertValidUuid(ownerId, 'ownerId');

    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user || user.id !== ownerId) {
      throw new Error('Unauthorized: active session mismatch');
    }

    // Verify ownership
    const { data: project, error: projectError } = await client
      .from('collab_projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;
    if (!project || project.owner_id !== ownerId) {
      throw new Error('Unauthorized: You must be the project owner');
    }

    const { data, error } = await client
      .from('collab_project_applications')
      .select(
        `
        *,
        role:collab_project_roles!collab_project_applications_role_id_fkey(*)
      `,
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (data ?? []) as Array<ProjectApplicationRow & { role?: unknown }>;
    const applicantMap = await fetchProfileSummariesById(
      client,
      rows.map((row: any) => row.applicant_id),
    );
    const applications: ProjectApplication[] = rows.map((row: any) => ({
      ...row,
      applicant:
        applicantMap.get(row.applicant_id) ?? fallbackOwner(row.applicant_id),
      role: normalizeProjectRole(row.role),
    }));

    return { data: applications, error: null };
  } catch (error) {
    console.error('Error fetching applications:', error);
    return { data: [], error: getErrorMessage(error, 'Failed to fetch applications') };
  }
}

/**
 * Get user's own projects.
 */
export async function getMyProjects(
  client: SupabaseClient,
  userId: string,
): Promise<{ data: Project[]; error: string | null }> {
  try {
    assertValidUuid(userId, 'userId');

    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user || user.id !== userId) {
      throw new Error('Unauthorized: active session mismatch');
    }

    const { data, error } = await client
      .from('collab_projects')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (data ?? []) as ProjectRow[];
    const ownerMap = await fetchProfileSummariesById(
      client,
      rows.map((row: any) => row.owner_id),
    );
    const projects: Project[] = rows.map((row: any) => ({
      ...row,
      owner: ownerMap.get(row.owner_id) ?? fallbackOwner(row.owner_id),
    }));

    return { data: projects, error: null };
  } catch (error) {
    console.error('Error fetching my projects:', error);
    return { data: [], error: getErrorMessage(error, 'Failed to fetch your projects') };
  }
}

/**
 * Get user's applications.
 */
export async function getMyApplications(
  client: SupabaseClient,
  userId: string,
): Promise<{ data: ProjectApplication[]; error: string | null }> {
  try {
    assertValidUuid(userId, 'userId');

    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user || user.id !== userId) {
      throw new Error('Unauthorized: active session mismatch');
    }

    const { data, error } = await client
      .from('collab_project_applications')
      .select(
        `
        *,
        role:collab_project_roles!collab_project_applications_role_id_fkey(*)
      `,
      )
      .eq('applicant_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (data ?? []) as Array<ProjectApplicationRow & { role?: unknown }>;
    const applicantMap = await fetchProfileSummariesById(
      client,
      rows.map((row: any) => row.applicant_id),
    );
    const applications: ProjectApplication[] = rows.map((row: any) => ({
      ...row,
      applicant:
        applicantMap.get(row.applicant_id) ?? fallbackOwner(row.applicant_id),
      role: normalizeProjectRole(row.role),
    }));

    return { data: applications, error: null };
  } catch (error) {
    console.error('Error fetching my applications:', error);
    return {
      data: [],
      error: getErrorMessage(error, 'Failed to fetch your applications'),
    };
  }
}

/**
 * Get applications for all projects owned by the given user.
 */
export async function getOwnerApplications(
  client: SupabaseClient,
  ownerId: string,
): Promise<{ data: ProjectApplicationWithProject[]; error: string | null }> {
  try {
    assertValidUuid(ownerId, 'ownerId');

    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user || user.id !== ownerId) {
      throw new Error('Unauthorized: active session mismatch');
    }

    const { data: ownedProjects, error: projectsError } = await client
      .from('collab_projects')
      .select('id, title, owner_id')
      .eq('owner_id', ownerId);

    if (projectsError) throw projectsError;

    const projectIds = (ownedProjects ?? []).map((p: any) => p.id);
    if (projectIds.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await client
      .from('collab_project_applications')
      .select(
        `
        *,
        role:collab_project_roles!collab_project_applications_role_id_fkey(*),
        project:collab_projects!collab_project_applications_project_id_fkey(id, title, owner_id)
      `,
      )
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (data ?? []) as Array<
      ProjectApplicationRow & { role?: unknown; project?: unknown }
    >;
    const applicantMap = await fetchProfileSummariesById(
      client,
      rows.map((row: any) => row.applicant_id),
    );
    const applications: ProjectApplicationWithProject[] = rows.map((row: any) => ({
      ...row,
      applicant:
        applicantMap.get(row.applicant_id) ?? fallbackOwner(row.applicant_id),
      role: normalizeProjectRole(row.role),
      project: normalizeProjectSummary(row.project),
    }));

    return { data: applications, error: null };
  } catch (error) {
    console.error('Error fetching owner applications:', error);
    return { data: [], error: getErrorMessage(error, 'Failed to fetch applications') };
  }
}

/**
 * Update an application's status (accept, reject, etc.).
 */
export async function updateProjectApplicationStatus(
  client: SupabaseClient,
  params: UpdateApplicationStatusParams,
): Promise<{ success: boolean; error: string | null }> {
  try {
    assertValidUuid(params.applicationId, 'applicationId');
    assertValidUuid(params.ownerId, 'ownerId');

    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user || user.id !== params.ownerId) {
      throw new Error('Unauthorized: active session mismatch');
    }

    const { data: application, error: applicationError } = await client
      .from('collab_project_applications')
      .select('id, project_id, role_id, applicant_id, status, college_domain')
      .eq('id', params.applicationId)
      .single();

    if (applicationError) throw applicationError;

    const { data: project, error: projectError } = await client
      .from('collab_projects')
      .select('id, owner_id, college_domain')
      .eq('id', application.project_id)
      .single();

    if (projectError) throw projectError;
    if (!project || project.owner_id !== params.ownerId) {
      throw new Error('Unauthorized: You must be the project owner');
    }

    if (params.status === 'accepted') {
      const { data: existingMember } = await client
        .from('collab_team_members')
        .select('id')
        .eq('project_id', application.project_id)
        .eq('user_id', application.applicant_id)
        .maybeSingle();

      if (existingMember) {
        throw new Error('Applicant is already a team member');
      }

      let roleTitle: string | null = null;

      if (application.role_id) {
        const { data: role, error: roleError } = await client
          .from('collab_project_roles')
          .select('id, title, spots_total, spots_filled, status')
          .eq('id', application.role_id)
          .single();

        if (roleError) throw roleError;
        if (!role) throw new Error('Role not found for this application');

        if (role.status !== 'open' && role.status !== 'interviewing') {
          throw new Error('Role is not currently open');
        }

        if ((role.spots_filled ?? 0) >= (role.spots_total ?? 0)) {
          throw new Error('Role has no remaining spots');
        }

        roleTitle = role.title ?? null;
      }

      const { error: teamError } = await client
        .from('collab_team_members')
        .insert({
          project_id: application.project_id,
          user_id: application.applicant_id,
          role_id: application.role_id || null,
          role_name: roleTitle,
          status: 'active',
          is_owner: false,
          college_domain:
            project.college_domain ?? application.college_domain ?? null,
        } as any);

      if (teamError) throw teamError;

      // Recalculate role fill
      const recalcRoleFill = async () => {
        if (!application.role_id) return;

        const { error: rpcError } = await client.rpc('recalculate_collab_role_fill', {
          target_role: application.role_id,
        });

        if (!rpcError) return;

        const { count: roleCount, error: roleCountError } = await client
          .from('collab_team_members')
          .select('id', { count: 'exact', head: true })
          .eq('role_id', application.role_id)
          .eq('status', 'active');

        if (roleCountError) throw roleCountError;

        const { error: roleUpdateError } = await client
          .from('collab_project_roles')
          .update({ spots_filled: roleCount ?? 0 } as any)
          .eq('id', application.role_id);

        if (roleUpdateError) throw roleUpdateError;
      };

      // Recalculate team size
      const recalcTeamSize = async () => {
        const { error: rpcError } = await client.rpc('recalculate_collab_team_size', {
          target_project: application.project_id,
        });

        if (!rpcError) return;

        const { count, error: countError } = await client
          .from('collab_team_members')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', application.project_id)
          .eq('status', 'active');

        if (countError) throw countError;

        const { error: updateError } = await client
          .from('collab_projects')
          .update({ team_size_current: count ?? 0 } as any)
          .eq('id', application.project_id);

        if (updateError) throw updateError;
      };

      // Recalculate open roles
      const recalcOpenRoles = async () => {
        const { error: rpcError } = await client.rpc('recalculate_collab_open_roles', {
          target_project: application.project_id,
        });

        if (!rpcError) return;

        const { data: roles, error: rolesError } = await client
          .from('collab_project_roles')
          .select('spots_total, spots_filled, status')
          .eq('project_id', application.project_id)
          .eq('status', 'open');

        if (rolesError) throw rolesError;

        const openSlots = (roles ?? []).reduce((total: number, role: any) => {
          const slots = Math.max(
            (role.spots_total ?? 0) - (role.spots_filled ?? 0),
            0,
          );
          return total + slots;
        }, 0);

        const { error: updateError } = await client
          .from('collab_projects')
          .update({ open_role_count: openSlots } as any)
          .eq('id', application.project_id);

        if (updateError) throw updateError;
      };

      await recalcRoleFill();
      await recalcTeamSize();
      await recalcOpenRoles();
    }

    const { error: updateError } = await client
      .from('collab_project_applications')
      .update({ status: params.status } as any)
      .eq('id', params.applicationId);

    if (updateError) throw updateError;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating application status:', error);
    return {
      success: false,
      error: getErrorMessage(error, 'Failed to update application'),
    };
  }
}
