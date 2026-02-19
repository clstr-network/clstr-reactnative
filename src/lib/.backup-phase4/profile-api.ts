import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { handleApiError } from "@/lib/errorHandler";
import { assertValidUuid } from "@clstr/shared/utils/uuid";

// Types
export type SkillLevel = Database["public"]["Enums"]["skill_level"];

export interface ExperienceData {
  id?: string;
  profile_id?: string;
  title: string;
  company: string;
  location?: string;
  start_date: string;
  end_date?: string;
  description?: string;
}

export interface EducationData {
  id?: string;
  profile_id?: string;
  degree: string;
  school: string;
  location?: string;
  start_date: string;
  end_date?: string;
  description?: string;
}

export interface SkillData {
  id?: string;
  profile_id?: string;
  name: string;
  level: SkillLevel;
}

export interface ProjectData {
  id?: string;
  profile_id?: string;
  name: string;
  description?: string;
  url?: string;
  image_url?: string | null;
  start_date?: string;
  end_date?: string;
  skills?: string[];
}

export interface Connection {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  message?: string;
  created_at: string;
  updated_at: string;
}

// Experience CRUD
export const addExperience = async (profileId: string, experienceData: ExperienceData) => {
  try {
    const { data, error } = await supabase
      .from('profile_experience')
      .insert({
        profile_id: profileId,
        title: experienceData.title,
        company: experienceData.company,
        location: experienceData.location,
        start_date: experienceData.start_date,
        end_date: experienceData.end_date,
        description: experienceData.description,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'addExperience',
      userMessage: 'Failed to add experience',
      details: { profileId, experienceData },
    });
  }
};

export const updateExperience = async (experienceId: string, data: Partial<ExperienceData>) => {
  try {
    const { data: updated, error } = await supabase
      .from('profile_experience')
      .update({
        title: data.title,
        company: data.company,
        location: data.location,
        start_date: data.start_date,
        end_date: data.end_date,
        description: data.description,
      })
      .eq('id', experienceId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'updateExperience',
      userMessage: 'Failed to update experience',
      details: { experienceId, data },
    });
  }
};

export const deleteExperience = async (experienceId: string) => {
  try {
    const { error } = await supabase
      .from('profile_experience')
      .delete()
      .eq('id', experienceId);

    if (error) throw error;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'deleteExperience',
      userMessage: 'Failed to delete experience',
      details: { experienceId },
    });
  }
};

export const getExperiences = async (profileId: string) => {
  try {
    const { data, error } = await supabase
      .from('profile_experience')
      .select('*')
      .eq('profile_id', profileId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleApiError(error, {
      operation: 'getExperiences',
      userMessage: 'Failed to fetch experiences',
      details: { profileId },
    });
  }
};

// Education CRUD
export const addEducation = async (profileId: string, educationData: EducationData) => {
  try {
    const { data, error } = await supabase
      .from('profile_education')
      .insert({
        profile_id: profileId,
        degree: educationData.degree,
        school: educationData.school,
        location: educationData.location,
        start_date: educationData.start_date,
        end_date: educationData.end_date,
        description: educationData.description,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'addEducation',
      userMessage: 'Failed to add education',
      details: { profileId, educationData },
    });
  }
};

export const updateEducation = async (educationId: string, data: Partial<EducationData>) => {
  try {
    const { data: updated, error } = await supabase
      .from('profile_education')
      .update({
        degree: data.degree,
        school: data.school,
        location: data.location,
        start_date: data.start_date,
        end_date: data.end_date,
        description: data.description,
      })
      .eq('id', educationId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'updateEducation',
      userMessage: 'Failed to update education',
      details: { educationId, data },
    });
  }
};

export const deleteEducation = async (educationId: string) => {
  try {
    const { error } = await supabase
      .from('profile_education')
      .delete()
      .eq('id', educationId);

    if (error) throw error;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'deleteEducation',
      userMessage: 'Failed to delete education',
      details: { educationId },
    });
  }
};

export const getEducation = async (profileId: string) => {
  try {
    const { data, error } = await supabase
      .from('profile_education')
      .select('*')
      .eq('profile_id', profileId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleApiError(error, {
      operation: 'getEducation',
      userMessage: 'Failed to fetch education',
      details: { profileId },
    });
  }
};

// Skills CRUD
export const updateSkills = async (profileId: string, skillList: SkillData[]) => {
  try {
    // First, delete all existing skills for this profile
    const { error: deleteError } = await supabase
      .from('profile_skills')
      .delete()
      .eq('profile_id', profileId);

    if (deleteError) throw deleteError;

    // Then, insert all new skills
    if (skillList.length > 0) {
      const { data, error: insertError } = await supabase
        .from('profile_skills')
        .insert(
          skillList.map(skill => ({
            profile_id: profileId,
            name: skill.name,
            level: skill.level,
          }))
        )
        .select();

      if (insertError) throw insertError;
      return data;
    }

    return [];
  } catch (error) {
    throw handleApiError(error, {
      operation: 'updateSkills',
      userMessage: 'Failed to update skills',
      details: { profileId, skillList },
    });
  }
};

export const getSkills = async (profileId: string) => {
  try {
    const { data, error } = await supabase
      .from('profile_skills')
      .select('*')
      .eq('profile_id', profileId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleApiError(error, {
      operation: 'getSkills',
      userMessage: 'Failed to fetch skills',
      details: { profileId },
    });
  }
};

export const addSkill = async (profileId: string, skillData: SkillData) => {
  try {
    const { data, error } = await supabase
      .from('profile_skills')
      .insert({
        profile_id: profileId,
        name: skillData.name,
        level: skillData.level,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'addSkill',
      userMessage: 'Failed to add skill',
      details: { profileId, skillData },
    });
  }
};

export const updateSkill = async (skillId: string, data: Partial<SkillData>) => {
  try {
    const { data: updated, error } = await supabase
      .from('profile_skills')
      .update({
        name: data.name,
        level: data.level,
      })
      .eq('id', skillId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'updateSkill',
      userMessage: 'Failed to update skill',
      details: { skillId, data },
    });
  }
};

export const deleteSkill = async (skillId: string) => {
  try {
    const { error } = await supabase
      .from('profile_skills')
      .delete()
      .eq('id', skillId);

    if (error) throw error;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'deleteSkill',
      userMessage: 'Failed to delete skill',
      details: { skillId },
    });
  }
};

// Projects CRUD
export const addProject = async (profileId: string, projectData: ProjectData) => {
  try {
    assertValidUuid(profileId, "profileId");
    const { data, error } = await supabase
      .from('profile_projects' as any)
      .insert({
        profile_id: profileId,
        name: projectData.name,
        description: projectData.description,
        url: projectData.url,
        image_url: projectData.image_url,
        start_date: projectData.start_date,
        end_date: projectData.end_date,
        skills: projectData.skills,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'addProject',
      userMessage: 'Failed to add project',
      details: { profileId, projectData },
    });
  }
};

export const updateProject = async (projectId: string, data: Partial<ProjectData>) => {
  try {
    const { data: updated, error } = await supabase
      .from('profile_projects' as any)
      .update({
        name: data.name,
        description: data.description,
        url: data.url,
        image_url: data.image_url,
        start_date: data.start_date,
        end_date: data.end_date,
        skills: data.skills,
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'updateProject',
      userMessage: 'Failed to update project',
      details: { projectId, data },
    });
  }
};

export const deleteProject = async (projectId: string) => {
  try {
    const { error } = await supabase
      .from('profile_projects' as any)
      .delete()
      .eq('id', projectId);

    if (error) throw error;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'deleteProject',
      userMessage: 'Failed to delete project',
      details: { projectId },
    });
  }
};

const PROJECT_IMAGE_BUCKET = "project-images";
const MAX_PROJECT_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

/**
 * Upload a project image to Supabase Storage
 */
export const uploadProjectImage = async (
  projectId: string,
  file: File
): Promise<string> => {
  assertValidUuid(projectId, "projectId");

  if (!file) throw new Error("No file provided");
  if (file.size > MAX_PROJECT_IMAGE_SIZE) {
    throw new Error(`Image must be less than ${MAX_PROJECT_IMAGE_SIZE / 1024 / 1024}MB`);
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Invalid image type. Allowed: JPEG, PNG, WebP, GIF");
  }

  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `${projectId}/${Date.now()}.${ext}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(PROJECT_IMAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from(PROJECT_IMAGE_BUCKET)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    throw handleApiError(error, {
      operation: "uploadProjectImage",
      userMessage: "Failed to upload project image",
      details: { projectId },
    });
  }
};

/**
 * Delete a project image from Supabase Storage
 */
export const deleteProjectImage = async (imageUrl: string): Promise<void> => {
  if (!imageUrl) return;

  try {
    // Extract file path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split(`/${PROJECT_IMAGE_BUCKET}/`);
    if (pathParts.length < 2) return;

    const filePath = pathParts[1];

    const { error } = await supabase.storage
      .from(PROJECT_IMAGE_BUCKET)
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error("Failed to delete project image:", error);
    // Non-fatal - don't throw, just log
  }
};

export const getProjects = async (profileId: string) => {
  try {
    assertValidUuid(profileId, "profileId");
    const { data, error } = await supabase
      .from('profile_projects' as any)
      .select('*')
      .eq('profile_id', profileId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleApiError(error, {
      operation: 'getProjects',
      userMessage: 'Failed to fetch projects',
      details: { profileId },
    });
  }
};

// Connections CRUD
export const getConnections = async (profileId: string) => {
  try {
    assertValidUuid(profileId, "profileId");
    // Get connections where user is either requester or receiver and status is accepted
    const { data: connectionsData, error } = await supabase
      .from('connections')
      .select('*')
      .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!connectionsData || connectionsData.length === 0) return [];

    // Get all unique profile IDs
    const profileIds = Array.from(new Set(
      connectionsData.flatMap(conn => [conn.requester_id, conn.receiver_id])
    )).filter(id => id !== profileId);

    // Fetch profiles for all connections
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, headline, role')
      .in('id', profileIds);

    if (profilesError) throw profilesError;

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Map to return the other user's profile
    const connections = connectionsData.map(conn => {
      const isRequester = conn.requester_id === profileId;
      const otherUserId = isRequester ? conn.receiver_id : conn.requester_id;
      return {
        ...conn,
        profile: profilesMap.get(otherUserId) || null,
      };
    });

    return connections;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'getConnections',
      userMessage: 'Failed to fetch connections',
      details: { profileId },
    });
  }
};

export const getPendingConnectionRequests = async (profileId: string) => {
  try {
    assertValidUuid(profileId, "profileId");
    // Get pending requests where user is the receiver
    const { data: requestsData, error } = await supabase
      .from('connections')
      .select('*')
      .eq('receiver_id', profileId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!requestsData || requestsData.length === 0) return [];

    // Get all requester profile IDs
    const requesterIds = requestsData.map(req => req.requester_id);

    // Fetch profiles for all requesters
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, headline, role')
      .in('id', requesterIds);

    if (profilesError) throw profilesError;

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Map requests with requester profiles
    const requests = requestsData.map(req => ({
      ...req,
      requester: profilesMap.get(req.requester_id) || null,
    }));

    return requests;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'getPendingConnectionRequests',
      userMessage: 'Failed to fetch pending requests',
      details: { profileId },
    });
  }
};

export const getSentConnectionRequests = async (profileId: string) => {
  try {
    assertValidUuid(profileId, "profileId");
    // Get requests sent by the user
    const { data: requestsData, error } = await supabase
      .from('connections')
      .select('*')
      .eq('requester_id', profileId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!requestsData || requestsData.length === 0) return [];

    // Get all receiver profile IDs
    const receiverIds = requestsData.map(req => req.receiver_id);

    // Fetch profiles for all receivers
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, headline, role')
      .in('id', receiverIds);

    if (profilesError) throw profilesError;

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Map requests with receiver profiles
    const requests = requestsData.map(req => ({
      ...req,
      receiver: profilesMap.get(req.receiver_id) || null,
    }));

    return requests;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'getSentConnectionRequests',
      userMessage: 'Failed to fetch sent requests',
      details: { profileId },
    });
  }
};

export const addConnectionRequest = async (requesterId: string, receiverId: string, message?: string) => {
  try {
    assertValidUuid(requesterId, "requesterId");
    assertValidUuid(receiverId, "receiverId");
    // Check if connection already exists
    const { data: existing, error: checkError } = await supabase
      .from('connections')
      .select('id, status')
      .or(`and(requester_id.eq.${requesterId},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${requesterId})`)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      throw new Error('Connection request already exists');
    }

    const { data, error } = await supabase
      .from('connections')
      .insert({
        requester_id: requesterId,
        receiver_id: receiverId,
        status: 'pending',
        message: message,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'addConnectionRequest',
      userMessage: 'Failed to send connection request',
      details: { requesterId, receiverId, message },
    });
  }
};

export const acceptConnectionRequest = async (connectionId: string) => {
  try {
    assertValidUuid(connectionId, "connectionId");
    const { data, error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', connectionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'acceptConnectionRequest',
      userMessage: 'Failed to accept connection request',
      details: { connectionId },
    });
  }
};

export const rejectConnectionRequest = async (connectionId: string) => {
  try {
    assertValidUuid(connectionId, "connectionId");
    const { data, error } = await supabase
      .from('connections')
      .update({ status: 'rejected' })
      .eq('id', connectionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'rejectConnectionRequest',
      userMessage: 'Failed to reject connection request',
      details: { connectionId },
    });
  }
};

export const removeConnection = async (connectionId: string) => {
  try {
    assertValidUuid(connectionId, "connectionId");
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId);

    if (error) throw error;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'removeConnection',
      userMessage: 'Failed to remove connection',
      details: { connectionId },
    });
  }
};

export const blockConnection = async (connectionId: string) => {
  try {
    assertValidUuid(connectionId, "connectionId");
    const { data, error } = await supabase
      .from('connections')
      .update({ status: 'blocked' })
      .eq('id', connectionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'blockConnection',
      userMessage: 'Failed to block connection',
      details: { connectionId },
    });
  }
};

export const getConnectionCount = async (profileId: string) => {
  try {
    assertValidUuid(profileId, "profileId");

    // Use SECURITY DEFINER RPC so any authenticated user can read the count
    // even though connection rows are RLS-restricted to participants.
    const { data, error } = await supabase.rpc('get_connection_count', {
      p_profile_id: profileId,
    });

    if (error) {
      // Fallback: direct query (only works if viewer is a participant)
      const rpcCode = (error as { code?: string }).code;
      if (rpcCode === '42883') {
        const { count, error: fallbackError } = await supabase
          .from('connections')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'accepted')
          .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`);
        if (fallbackError) throw fallbackError;
        return count ?? 0;
      }
      throw error;
    }

    return (data as number) ?? 0;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'getConnectionCount',
      userMessage: 'Failed to load connections count',
      details: { profileId },
    });
  }
};

export const getProfileViewsCount = async (profileId: string): Promise<number> => {
  try {
    assertValidUuid(profileId, "profileId");

    // Use the secure RPC function which bypasses RLS
    const { data: rpcCount, error: rpcError } = await supabase.rpc(
      "get_profile_views_count",
      { p_profile_id: profileId }
    );

    if (rpcError) {
      // If RPC doesn't exist (42883), try direct count as fallback
      const rpcCode = (rpcError as { code?: string }).code;
      if (rpcCode === '42883') {
        // Fallback: direct query (may fail due to RLS if not profile owner)
        const { count, error } = await supabase
          .from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', profileId);

        if (error) {
          // Table doesn't exist or RLS blocks access
          console.warn('Profile views fallback failed:', error.message);
          return 0;
        }
        return count ?? 0;
      }
      throw rpcError;
    }

    return Number(rpcCount ?? 0);
  } catch (error) {
    // Don't throw - profile views are non-critical, return 0 and log
    console.error('getProfileViewsCount error:', error);
    return 0;
  }
};

export const trackProfileView = async (profileId: string, viewerId?: string): Promise<void> => {
  try {
    assertValidUuid(profileId, "profileId");
    if (viewerId) {
      assertValidUuid(viewerId, "viewerId");
    }

    const { data: session } = await supabase.auth.getUser();
    const authUserId = session.user?.id;

    // Must be authenticated
    if (!authUserId) return;

    // Can't view your own profile
    if (authUserId === profileId) return;

    // If viewerId provided, must match auth user
    if (viewerId && viewerId !== authUserId) return;

    // Try the RPC function first (handles deduplication)
    const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)(
      "track_profile_view",
      {
        p_profile_id: profileId,
        p_viewer_id: authUserId
      }
    );

    if (!rpcError) {
      return; // Success via RPC
    }

    // Fallback to direct insert if RPC doesn't exist
    const rpcCode = (rpcError as { code?: string }).code;
    if (rpcCode !== '42883') {
      console.warn('trackProfileView RPC error:', rpcError.message);
      return;
    }

    // Direct insert fallback
    const { error } = await supabase
      .from('profile_views')
      .insert({ profile_id: profileId, viewer_id: authUserId });

    if (error) {
      // 23505 = unique violation (already viewed today) - this is expected
      const code = (error as { code?: string }).code;
      if (code !== '23505') {
        console.warn('trackProfileView insert error:', error.message);
      }
    }
  } catch (error) {
    // Don't throw - view tracking is non-critical
    console.error('trackProfileView error:', error);
  }
};
