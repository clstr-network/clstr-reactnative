/**
 * Profile API — shared, platform-agnostic module.
 *
 * Covers profile sub-entities (experience, education, skills, projects,
 * connections, profile views).  The "top-level" profile record CRUD lives
 * in `profile.ts`.
 *
 * Conventions:
 *  • Every Supabase-touching function receives `client` as its first arg.
 *  • `handleApiError` → `createAppError`.
 *  • `File` → `CrossPlatformFile` (from types/file).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { assertValidUuid } from "../utils/uuid";
import { createAppError } from "../errors";
import type { CrossPlatformFile } from "../types/file";
import { getFileName, getFileSize, getFileType } from "../types/file";

// ============================================================================
// TYPES
// ============================================================================

/** Maps to `public.Enums.skill_level` in the database. */
export type SkillLevel = string;

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
  status: "pending" | "accepted" | "rejected" | "blocked";
  message?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PROJECT_IMAGE_BUCKET = "project-images";
const MAX_PROJECT_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

// ============================================================================
// EXPERIENCE CRUD
// ============================================================================

export const addExperience = async (
  client: SupabaseClient,
  profileId: string,
  experienceData: ExperienceData,
) => {
  try {
    const { data, error } = await client
      .from("profile_experience")
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
    throw createAppError("Failed to add experience", "addExperience", error);
  }
};

export const updateExperience = async (
  client: SupabaseClient,
  experienceId: string,
  data: Partial<ExperienceData>,
) => {
  try {
    const { data: updated, error } = await client
      .from("profile_experience")
      .update({
        title: data.title,
        company: data.company,
        location: data.location,
        start_date: data.start_date,
        end_date: data.end_date,
        description: data.description,
      })
      .eq("id", experienceId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  } catch (error) {
    throw createAppError("Failed to update experience", "updateExperience", error);
  }
};

export const deleteExperience = async (client: SupabaseClient, experienceId: string) => {
  try {
    const { error } = await client
      .from("profile_experience")
      .delete()
      .eq("id", experienceId);

    if (error) throw error;
  } catch (error) {
    throw createAppError("Failed to delete experience", "deleteExperience", error);
  }
};

export const getExperiences = async (client: SupabaseClient, profileId: string) => {
  try {
    const { data, error } = await client
      .from("profile_experience")
      .select("*")
      .eq("profile_id", profileId)
      .order("start_date", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw createAppError("Failed to fetch experiences", "getExperiences", error);
  }
};

// ============================================================================
// EDUCATION CRUD
// ============================================================================

export const addEducation = async (
  client: SupabaseClient,
  profileId: string,
  educationData: EducationData,
) => {
  try {
    const { data, error } = await client
      .from("profile_education")
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
    throw createAppError("Failed to add education", "addEducation", error);
  }
};

export const updateEducation = async (
  client: SupabaseClient,
  educationId: string,
  data: Partial<EducationData>,
) => {
  try {
    const { data: updated, error } = await client
      .from("profile_education")
      .update({
        degree: data.degree,
        school: data.school,
        location: data.location,
        start_date: data.start_date,
        end_date: data.end_date,
        description: data.description,
      })
      .eq("id", educationId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  } catch (error) {
    throw createAppError("Failed to update education", "updateEducation", error);
  }
};

export const deleteEducation = async (client: SupabaseClient, educationId: string) => {
  try {
    const { error } = await client
      .from("profile_education")
      .delete()
      .eq("id", educationId);

    if (error) throw error;
  } catch (error) {
    throw createAppError("Failed to delete education", "deleteEducation", error);
  }
};

export const getEducation = async (client: SupabaseClient, profileId: string) => {
  try {
    const { data, error } = await client
      .from("profile_education")
      .select("*")
      .eq("profile_id", profileId)
      .order("start_date", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw createAppError("Failed to fetch education", "getEducation", error);
  }
};

// ============================================================================
// SKILLS CRUD
// ============================================================================

export const updateSkills = async (
  client: SupabaseClient,
  profileId: string,
  skillList: SkillData[],
) => {
  try {
    const { error: deleteError } = await client
      .from("profile_skills")
      .delete()
      .eq("profile_id", profileId);

    if (deleteError) throw deleteError;

    if (skillList.length > 0) {
      const { data, error: insertError } = await client
        .from("profile_skills")
        .insert(
          skillList.map((skill) => ({
            profile_id: profileId,
            name: skill.name,
            level: skill.level,
          })),
        )
        .select();

      if (insertError) throw insertError;
      return data;
    }

    return [];
  } catch (error) {
    throw createAppError("Failed to update skills", "updateSkills", error);
  }
};

export const getSkills = async (client: SupabaseClient, profileId: string) => {
  try {
    const { data, error } = await client
      .from("profile_skills")
      .select("*")
      .eq("profile_id", profileId)
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw createAppError("Failed to fetch skills", "getSkills", error);
  }
};

export const addSkill = async (
  client: SupabaseClient,
  profileId: string,
  skillData: SkillData,
) => {
  try {
    const { data, error } = await client
      .from("profile_skills")
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
    throw createAppError("Failed to add skill", "addSkill", error);
  }
};

export const updateSkill = async (
  client: SupabaseClient,
  skillId: string,
  data: Partial<SkillData>,
) => {
  try {
    const { data: updated, error } = await client
      .from("profile_skills")
      .update({ name: data.name, level: data.level })
      .eq("id", skillId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  } catch (error) {
    throw createAppError("Failed to update skill", "updateSkill", error);
  }
};

export const deleteSkill = async (client: SupabaseClient, skillId: string) => {
  try {
    const { error } = await client
      .from("profile_skills")
      .delete()
      .eq("id", skillId);

    if (error) throw error;
  } catch (error) {
    throw createAppError("Failed to delete skill", "deleteSkill", error);
  }
};

// ============================================================================
// PROJECTS CRUD
// ============================================================================

export const addProject = async (
  client: SupabaseClient,
  profileId: string,
  projectData: ProjectData,
) => {
  try {
    assertValidUuid(profileId, "profileId");
    const { data, error } = await (client as any)
      .from("profile_projects")
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
    throw createAppError("Failed to add project", "addProject", error);
  }
};

export const updateProject = async (
  client: SupabaseClient,
  projectId: string,
  data: Partial<ProjectData>,
) => {
  try {
    const { data: updated, error } = await (client as any)
      .from("profile_projects")
      .update({
        name: data.name,
        description: data.description,
        url: data.url,
        image_url: data.image_url,
        start_date: data.start_date,
        end_date: data.end_date,
        skills: data.skills,
      })
      .eq("id", projectId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  } catch (error) {
    throw createAppError("Failed to update project", "updateProject", error);
  }
};

export const deleteProject = async (client: SupabaseClient, projectId: string) => {
  try {
    const { error } = await (client as any)
      .from("profile_projects")
      .delete()
      .eq("id", projectId);

    if (error) throw error;
  } catch (error) {
    throw createAppError("Failed to delete project", "deleteProject", error);
  }
};

/**
 * Upload a project image to Supabase Storage.
 * Accepts `CrossPlatformFile` instead of the web `File` type.
 */
export const uploadProjectImage = async (
  client: SupabaseClient,
  projectId: string,
  file: CrossPlatformFile,
): Promise<string> => {
  assertValidUuid(projectId, "projectId");

  if (!file) throw new Error("No file provided");

  const fileSize = getFileSize(file);
  if (fileSize > MAX_PROJECT_IMAGE_SIZE) {
    throw new Error(`Image must be less than ${MAX_PROJECT_IMAGE_SIZE / 1024 / 1024}MB`);
  }

  const fileType = getFileType(file);
  if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
    throw new Error("Invalid image type. Allowed: JPEG, PNG, WebP, GIF");
  }

  const fileName = getFileName(file);
  const ext = fileName?.split(".").pop() || "jpg";
  const filePath = `${projectId}/${Date.now()}.${ext}`;

  try {
    const { error: uploadError } = await client.storage
      .from(PROJECT_IMAGE_BUCKET)
      .upload(filePath, file as any, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = client.storage
      .from(PROJECT_IMAGE_BUCKET)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    throw createAppError("Failed to upload project image", "uploadProjectImage", error);
  }
};

export const deleteProjectImage = async (
  client: SupabaseClient,
  imageUrl: string,
): Promise<void> => {
  if (!imageUrl) return;

  try {
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split(`/${PROJECT_IMAGE_BUCKET}/`);
    if (pathParts.length < 2) return;

    const filePath = pathParts[1];

    const { error } = await client.storage
      .from(PROJECT_IMAGE_BUCKET)
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error("Failed to delete project image:", error);
  }
};

export const getProjects = async (client: SupabaseClient, profileId: string) => {
  try {
    assertValidUuid(profileId, "profileId");
    const { data, error } = await (client as any)
      .from("profile_projects")
      .select("*")
      .eq("profile_id", profileId)
      .order("start_date", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw createAppError("Failed to fetch projects", "getProjects", error);
  }
};

// ============================================================================
// CONNECTIONS CRUD
// ============================================================================

export const getConnections = async (client: SupabaseClient, profileId: string) => {
  try {
    assertValidUuid(profileId, "profileId");

    const { data: connectionsData, error } = await client
      .from("connections")
      .select("*")
      .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`)
      .eq("status", "accepted")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!connectionsData || connectionsData.length === 0) return [];

    const profileIds = Array.from(
      new Set(connectionsData.flatMap((conn) => [conn.requester_id, conn.receiver_id])),
    ).filter((id) => id !== profileId);

    const { data: profiles, error: profilesError } = await client
      .from("profiles")
      .select("id, full_name, avatar_url, headline, role")
      .in("id", profileIds);

    if (profilesError) throw profilesError;

    const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    return connectionsData.map((conn) => {
      const isRequester = conn.requester_id === profileId;
      const otherUserId = isRequester ? conn.receiver_id : conn.requester_id;
      return { ...conn, profile: profilesMap.get(otherUserId) || null };
    });
  } catch (error) {
    throw createAppError("Failed to fetch connections", "getConnections", error);
  }
};

export const getPendingConnectionRequests = async (
  client: SupabaseClient,
  profileId: string,
) => {
  try {
    assertValidUuid(profileId, "profileId");

    const { data: requestsData, error } = await client
      .from("connections")
      .select("*")
      .eq("receiver_id", profileId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!requestsData || requestsData.length === 0) return [];

    const requesterIds = requestsData.map((req) => req.requester_id);

    const { data: profiles, error: profilesError } = await client
      .from("profiles")
      .select("id, full_name, avatar_url, headline, role")
      .in("id", requesterIds);

    if (profilesError) throw profilesError;

    const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    return requestsData.map((req) => ({
      ...req,
      requester: profilesMap.get(req.requester_id) || null,
    }));
  } catch (error) {
    throw createAppError("Failed to fetch pending requests", "getPendingConnectionRequests", error);
  }
};

export const getSentConnectionRequests = async (
  client: SupabaseClient,
  profileId: string,
) => {
  try {
    assertValidUuid(profileId, "profileId");

    const { data: requestsData, error } = await client
      .from("connections")
      .select("*")
      .eq("requester_id", profileId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!requestsData || requestsData.length === 0) return [];

    const receiverIds = requestsData.map((req) => req.receiver_id);

    const { data: profiles, error: profilesError } = await client
      .from("profiles")
      .select("id, full_name, avatar_url, headline, role")
      .in("id", receiverIds);

    if (profilesError) throw profilesError;

    const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    return requestsData.map((req) => ({
      ...req,
      receiver: profilesMap.get(req.receiver_id) || null,
    }));
  } catch (error) {
    throw createAppError("Failed to fetch sent requests", "getSentConnectionRequests", error);
  }
};

export const addConnectionRequest = async (
  client: SupabaseClient,
  requesterId: string,
  receiverId: string,
  message?: string,
) => {
  try {
    assertValidUuid(requesterId, "requesterId");
    assertValidUuid(receiverId, "receiverId");

    const { data: existing, error: checkError } = await client
      .from("connections")
      .select("id, status")
      .or(
        `and(requester_id.eq.${requesterId},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${requesterId})`,
      )
      .single();

    if (checkError && checkError.code !== "PGRST116") throw checkError;
    if (existing) throw new Error("Connection request already exists");

    const { data, error } = await client
      .from("connections")
      .insert({
        requester_id: requesterId,
        receiver_id: receiverId,
        status: "pending",
        message,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw createAppError("Failed to send connection request", "addConnectionRequest", error);
  }
};

export const acceptConnectionRequest = async (
  client: SupabaseClient,
  connectionId: string,
) => {
  try {
    assertValidUuid(connectionId, "connectionId");
    const { data, error } = await client
      .from("connections")
      .update({ status: "accepted" })
      .eq("id", connectionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw createAppError("Failed to accept connection request", "acceptConnectionRequest", error);
  }
};

export const rejectConnectionRequest = async (
  client: SupabaseClient,
  connectionId: string,
) => {
  try {
    assertValidUuid(connectionId, "connectionId");
    const { data, error } = await client
      .from("connections")
      .update({ status: "rejected" })
      .eq("id", connectionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw createAppError("Failed to reject connection request", "rejectConnectionRequest", error);
  }
};

export const removeConnection = async (client: SupabaseClient, connectionId: string) => {
  try {
    assertValidUuid(connectionId, "connectionId");
    const { error } = await client.from("connections").delete().eq("id", connectionId);

    if (error) throw error;
  } catch (error) {
    throw createAppError("Failed to remove connection", "removeConnection", error);
  }
};

export const blockConnection = async (client: SupabaseClient, connectionId: string) => {
  try {
    assertValidUuid(connectionId, "connectionId");
    const { data, error } = await client
      .from("connections")
      .update({ status: "blocked" })
      .eq("id", connectionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw createAppError("Failed to block connection", "blockConnection", error);
  }
};

export const getConnectionCount = async (client: SupabaseClient, profileId: string) => {
  try {
    assertValidUuid(profileId, "profileId");

    const { data, error } = await client.rpc("get_connection_count", {
      p_profile_id: profileId,
    });

    if (error) {
      const rpcCode = (error as { code?: string }).code;
      if (rpcCode === "42883") {
        const { count, error: fallbackError } = await client
          .from("connections")
          .select("id", { count: "exact", head: true })
          .eq("status", "accepted")
          .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`);
        if (fallbackError) throw fallbackError;
        return count ?? 0;
      }
      throw error;
    }

    return (data as number) ?? 0;
  } catch (error) {
    throw createAppError("Failed to load connections count", "getConnectionCount", error);
  }
};

export const getProfileViewsCount = async (
  client: SupabaseClient,
  profileId: string,
): Promise<number> => {
  try {
    assertValidUuid(profileId, "profileId");

    const { data: rpcCount, error: rpcError } = await client.rpc(
      "get_profile_views_count",
      { p_profile_id: profileId },
    );

    if (rpcError) {
      const rpcCode = (rpcError as { code?: string }).code;
      if (rpcCode === "42883") {
        const { count, error } = await client
          .from("profile_views")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", profileId);

        if (error) {
          console.warn("Profile views fallback failed:", error.message);
          return 0;
        }
        return count ?? 0;
      }
      throw rpcError;
    }

    return Number(rpcCount ?? 0);
  } catch (error) {
    console.error("getProfileViewsCount error:", error);
    return 0;
  }
};

export const trackProfileView = async (
  client: SupabaseClient,
  profileId: string,
  viewerId?: string,
): Promise<void> => {
  try {
    assertValidUuid(profileId, "profileId");
    if (viewerId) assertValidUuid(viewerId, "viewerId");

    const { data: session } = await client.auth.getUser();
    const authUserId = session.user?.id;

    if (!authUserId) return;
    if (authUserId === profileId) return;
    if (viewerId && viewerId !== authUserId) return;

    const { error: rpcError } = await (client.rpc as any)("track_profile_view", {
      p_profile_id: profileId,
      p_viewer_id: authUserId,
    });

    if (!rpcError) return;

    const rpcCode = (rpcError as { code?: string }).code;
    if (rpcCode !== "42883") {
      console.warn("trackProfileView RPC error:", rpcError.message);
      return;
    }

    const { error } = await client
      .from("profile_views")
      .insert({ profile_id: profileId, viewer_id: authUserId });

    if (error) {
      const code = (error as { code?: string }).code;
      if (code !== "23505") {
        console.warn("trackProfileView insert error:", error.message);
      }
    }
  } catch (error) {
    console.error("trackProfileView error:", error);
  }
};
