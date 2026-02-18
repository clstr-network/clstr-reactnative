import { supabase } from "@/integrations/supabase/client";
import { assertValidUuid } from "@/lib/uuid";

// ============================================================================
// TYPES
// ============================================================================

export type TeamUpIntent = "looking_for_teammates" | "looking_to_join";

export type TeamUpEventType =
  | "hackathon"
  | "college_event"
  | "competition"
  | "short_term_project";

export type TeamUpCommitment = "core_member" | "part_time" | "flexible";

export type TeamUpWorkMode = "on_campus" | "remote" | "hybrid";

export type TeamUpAvailability = "weekdays" | "weekends" | "evenings" | "flexible";

export type TeamUpTimeCommitment = "under_5_hours" | "5_to_10_hours" | "over_10_hours";

export type TeamUpExperience = "beginner" | "intermediate" | "advanced";

export type TeamUpRoleType = "core_member" | "support" | "advisor";

export type TeamUpStatus = "active" | "closed" | "expired" | "matched";

export type TeamUpRequestStatus = "pending" | "accepted" | "declined";

export type TeamUpRequestType = "join_request" | "invite";

export interface TeamUpRoleDefinition {
  id: string;
  name: string;
  category: string;
  display_order: number;
  is_active: boolean;
}

export interface TeamUpCreator {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  completed_team_ups_count?: number;
}

export interface TeamUp {
  id: string;
  creator_id: string;
  college_domain: string;
  intent: TeamUpIntent;
  event_type: TeamUpEventType;
  event_name: string;
  event_deadline: string;
  team_size_target: number | null;
  team_size_current: number;
  roles_needed: string[];
  commitment: TeamUpCommitment | null;
  work_mode: TeamUpWorkMode | null;
  skills_offered: string[];
  experience_level: TeamUpExperience | null;
  availability: TeamUpAvailability | null;
  time_commitment: TeamUpTimeCommitment | null;
  preferred_role_type: TeamUpRoleType | null;
  status: TeamUpStatus;
  auto_expires_at: string;
  created_at: string;
  updated_at: string;
  // Freshness tracking (migration 066)
  last_request_at: string | null;
  last_member_added_at: string | null;
  request_count: number;
  decline_count: number;
  creator?: TeamUpCreator;
}

export interface TeamUpMember {
  id: string;
  team_up_id: string;
  user_id: string;
  college_domain: string;
  role_name: string | null;
  is_creator: boolean;
  joined_at: string;
  user?: TeamUpCreator;
}

export interface TeamUpRequest {
  id: string;
  team_up_id: string;
  requester_id: string;
  college_domain: string;
  request_type: TeamUpRequestType;
  skills: string[];
  availability: TeamUpAvailability | null;
  status: TeamUpRequestStatus;
  created_at: string;
  responded_at: string | null;
  requester?: TeamUpCreator;
  team_up?: Pick<TeamUp, "id" | "event_name" | "creator_id">;
}

// ============================================================================
// CREATE PARAMS
// ============================================================================

export interface CreateTeamUpLookingForTeammatesParams {
  intent: "looking_for_teammates";
  event_type: TeamUpEventType;
  event_name: string;
  event_deadline: string;
  team_size_target: number;
  roles_needed: string[];
  commitment: TeamUpCommitment;
  work_mode: TeamUpWorkMode;
  userId: string;
  collegeDomain: string;
}

export interface CreateTeamUpLookingToJoinParams {
  intent: "looking_to_join";
  event_type: TeamUpEventType;
  event_name: string;
  event_deadline?: string;
  skills_offered: string[];
  experience_level?: TeamUpExperience;
  availability: TeamUpAvailability;
  time_commitment: TeamUpTimeCommitment;
  preferred_role_type: TeamUpRoleType;
  userId: string;
  collegeDomain: string;
}

export type CreateTeamUpParams =
  | CreateTeamUpLookingForTeammatesParams
  | CreateTeamUpLookingToJoinParams;

export interface CreateTeamUpRequestParams {
  teamUpId: string;
  requesterId: string;
  requestType: TeamUpRequestType;
  skills: string[];
  availability?: TeamUpAvailability;
  collegeDomain: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const getErrorMessage = (error: unknown, fallback = "Something went wrong"): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return fallback;
};

const normalizeCreator = (data: unknown): TeamUpCreator | undefined => {
  if (
    data &&
    typeof data === "object" &&
    !("error" in data) &&
    "id" in data
  ) {
    const { id, full_name, avatar_url, role, completed_team_ups_count } = data as TeamUpCreator & { full_name?: string; avatar_url?: string; role?: string; completed_team_ups_count?: number };
    return {
      id: id as string,
      full_name: full_name ?? "Unknown",
      avatar_url: avatar_url ?? null,
      role: role ?? "Student",
      completed_team_ups_count: completed_team_ups_count ?? 0,
    };
  }
  return undefined;
};

const fallbackCreator = (id: string): TeamUpCreator => ({
  id,
  full_name: "Unknown",
  avatar_url: null,
  role: "Student",
  completed_team_ups_count: 0,
});

const fetchProfileSummariesById = async (ids: string[]): Promise<Map<string, TeamUpCreator>> => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, completed_team_ups_count")
    .in("id", uniqueIds);

  if (error) throw error;

  return new Map(
    (data ?? []).map((row) => {
      const creator = normalizeCreator(row) ?? fallbackCreator(row.id);
      return [row.id, creator] as const;
    })
  );
};

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

export async function getTeamUpRoleDefinitions(): Promise<{
  data: TeamUpRoleDefinition[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from("team_up_role_definitions")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) throw error;

    return { data: (data ?? []) as TeamUpRoleDefinition[], error: null };
  } catch (error) {
    console.error("Error fetching role definitions:", error);
    return { data: [], error: getErrorMessage(error, "Failed to fetch role definitions") };
  }
}

// ============================================================================
// GET TEAM-UPS
// ============================================================================

export interface GetTeamUpsParams {
  collegeDomain: string;
  intent?: TeamUpIntent;
  eventType?: TeamUpEventType;
  searchQuery?: string;
  limit?: number;
}

export async function getTeamUps(params: GetTeamUpsParams): Promise<{
  data: TeamUp[];
  error: string | null;
}> {
  try {
    const { collegeDomain, intent, eventType, searchQuery, limit = 50 } = params;

    if (!collegeDomain) {
      throw new Error("College domain is required");
    }

    let query = supabase
      .from("team_ups")
      .select("*")
      .eq("college_domain", collegeDomain)
      .eq("status", "active")
      .gte("event_deadline", new Date().toISOString().split("T")[0])
      .order("event_deadline", { ascending: true })
      .limit(limit);

    if (intent) {
      query = query.eq("intent", intent);
    }

    if (eventType) {
      query = query.eq("event_type", eventType);
    }

    if (searchQuery?.trim()) {
      query = query.ilike("event_name", `%${searchQuery.trim()}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as TeamUp[];
    const creatorMap = await fetchProfileSummariesById(rows.map((row) => row.creator_id));

    const teamUps: TeamUp[] = rows.map((row) => ({
      ...row,
      creator: creatorMap.get(row.creator_id) ?? fallbackCreator(row.creator_id),
    }));

    return { data: teamUps, error: null };
  } catch (error) {
    console.error("Error fetching team-ups:", error);
    return { data: [], error: getErrorMessage(error, "Failed to fetch team-ups") };
  }
}

// ============================================================================
// GET MY TEAM-UPS
// ============================================================================

export async function getMyTeamUps(userId: string): Promise<{
  data: TeamUp[];
  error: string | null;
}> {
  try {
    assertValidUuid(userId, "userId");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      throw new Error("Unauthorized: active session mismatch");
    }

    const { data, error } = await supabase
      .from("team_ups")
      .select("*")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = (data ?? []) as TeamUp[];
    const creatorMap = await fetchProfileSummariesById([userId]);

    const teamUps: TeamUp[] = rows.map((row) => ({
      ...row,
      creator: creatorMap.get(row.creator_id) ?? fallbackCreator(row.creator_id),
    }));

    return { data: teamUps, error: null };
  } catch (error) {
    console.error("Error fetching my team-ups:", error);
    return { data: [], error: getErrorMessage(error, "Failed to fetch your team-ups") };
  }
}

// ============================================================================
// CREATE TEAM-UP
// ============================================================================

export async function createTeamUp(params: CreateTeamUpParams): Promise<{
  data: TeamUp | null;
  error: string | null;
}> {
  try {
    assertValidUuid(params.userId, "userId");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== params.userId) {
      throw new Error("Unauthorized: active session mismatch");
    }

    if (!params.collegeDomain) {
      throw new Error("College domain is required");
    }

    // Validate event deadline is in the future
    const deadlineDate = new Date(params.event_deadline || new Date());
    if (deadlineDate < new Date()) {
      throw new Error("Event deadline must be in the future");
    }

    // Check cooldown before creating (migration 066)
    const { data: cooldownCheck, error: cooldownError } = await supabase
      .rpc("check_team_up_cooldown", {
        p_user_id: params.userId,
        p_event_name: params.event_name,
        p_college_domain: params.collegeDomain,
      });

    if (cooldownError) {
      console.error("Cooldown check error:", cooldownError);
      // Don't fail on RPC error, let DB trigger handle it
    } else if (cooldownCheck && !cooldownCheck.allowed) {
      throw new Error(cooldownCheck.message || "You must wait before creating another team-up for this event");
    }

    let insertData: Record<string, unknown>;

    if (params.intent === "looking_for_teammates") {
      const p = params as CreateTeamUpLookingForTeammatesParams;
      
      if (!p.roles_needed || p.roles_needed.length === 0) {
        throw new Error("At least one role is required");
      }
      
      if (p.team_size_target < 2 || p.team_size_target > 10) {
        throw new Error("Team size must be between 2 and 10");
      }

      insertData = {
        creator_id: params.userId,
        college_domain: params.collegeDomain,
        intent: "looking_for_teammates",
        event_type: p.event_type,
        event_name: p.event_name,
        event_deadline: p.event_deadline,
        team_size_target: p.team_size_target,
        team_size_current: 1,
        roles_needed: p.roles_needed,
        commitment: p.commitment,
        work_mode: p.work_mode,
        status: "active",
      };
    } else {
      const p = params as CreateTeamUpLookingToJoinParams;
      
      if (!p.skills_offered || p.skills_offered.length === 0) {
        throw new Error("At least one skill is required");
      }

      insertData = {
        creator_id: params.userId,
        college_domain: params.collegeDomain,
        intent: "looking_to_join",
        event_type: p.event_type,
        event_name: p.event_name,
        event_deadline: p.event_deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        skills_offered: p.skills_offered,
        experience_level: p.experience_level || null,
        availability: p.availability,
        time_commitment: p.time_commitment,
        preferred_role_type: p.preferred_role_type,
        status: "active",
      };
    }

    const { data, error } = await supabase
      .from("team_ups")
      .insert(insertData)
      .select("*")
      .single();

    if (error) throw error;

    // Add creator as member for "looking for teammates" mode
    if (params.intent === "looking_for_teammates") {
      const { error: memberError } = await supabase
        .from("team_up_members")
        .insert({
          team_up_id: data.id,
          user_id: params.userId,
          college_domain: params.collegeDomain,
          is_creator: true,
        });

      if (memberError) {
        console.error("Error adding creator as member:", memberError);
      }
    }

    const creatorMap = await fetchProfileSummariesById([params.userId]);
    const teamUp: TeamUp = {
      ...(data as TeamUp),
      creator: creatorMap.get(params.userId) ?? fallbackCreator(params.userId),
    };

    return { data: teamUp, error: null };
  } catch (error) {
    console.error("Error creating team-up:", error);
    return { data: null, error: getErrorMessage(error, "Failed to create team-up") };
  }
}

// ============================================================================
// DELETE TEAM-UP
// ============================================================================

export async function deleteTeamUp(teamUpId: string, userId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    assertValidUuid(teamUpId, "teamUpId");
    assertValidUuid(userId, "userId");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      throw new Error("Unauthorized: active session mismatch");
    }

    const { data: teamUp, error: fetchError } = await supabase
      .from("team_ups")
      .select("id, creator_id")
      .eq("id", teamUpId)
      .single();

    if (fetchError) throw fetchError;
    if (!teamUp || teamUp.creator_id !== userId) {
      throw new Error("Unauthorized: only creators can delete team-ups");
    }

    const { error } = await supabase
      .from("team_ups")
      .delete()
      .eq("id", teamUpId)
      .eq("creator_id", userId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting team-up:", error);
    return { success: false, error: getErrorMessage(error, "Failed to delete team-up") };
  }
}

// ============================================================================
// CLOSE TEAM-UP
// ============================================================================

export async function closeTeamUp(teamUpId: string, userId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    assertValidUuid(teamUpId, "teamUpId");
    assertValidUuid(userId, "userId");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      throw new Error("Unauthorized: active session mismatch");
    }

    const { error } = await supabase
      .from("team_ups")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", teamUpId)
      .eq("creator_id", userId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error("Error closing team-up:", error);
    return { success: false, error: getErrorMessage(error, "Failed to close team-up") };
  }
}

// ============================================================================
// CANCEL TEAM-UP REQUEST (requester cancels own pending request)
// ============================================================================

export async function cancelTeamUpRequest(requestId: string, userId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    assertValidUuid(requestId, "requestId");
    assertValidUuid(userId, "userId");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      throw new Error("Unauthorized: active session mismatch");
    }

    // Verify the request belongs to the current user and is still pending
    const { data: request, error: fetchError } = await supabase
      .from("team_up_requests")
      .select("id, requester_id, status")
      .eq("id", requestId)
      .single();

    if (fetchError) throw fetchError;
    if (!request) throw new Error("Request not found");
    if (request.requester_id !== userId) {
      throw new Error("Unauthorized: you can only cancel your own requests");
    }
    if (request.status !== "pending") {
      throw new Error("Only pending requests can be cancelled");
    }

    // Hard-delete the pending request (no downstream effects)
    const { error } = await supabase
      .from("team_up_requests")
      .delete()
      .eq("id", requestId)
      .eq("requester_id", userId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error("Error cancelling team-up request:", error);
    return { success: false, error: getErrorMessage(error, "Failed to cancel request") };
  }
}

// ============================================================================
// GET TEAM-UP REQUESTS (for team-up creator)
// ============================================================================

export async function getTeamUpRequests(teamUpId: string, creatorId: string): Promise<{
  data: TeamUpRequest[];
  error: string | null;
}> {
  try {
    assertValidUuid(teamUpId, "teamUpId");
    assertValidUuid(creatorId, "creatorId");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== creatorId) {
      throw new Error("Unauthorized: active session mismatch");
    }

    // Verify ownership
    const { data: teamUp, error: teamUpError } = await supabase
      .from("team_ups")
      .select("id, creator_id")
      .eq("id", teamUpId)
      .single();

    if (teamUpError) throw teamUpError;
    if (!teamUp || teamUp.creator_id !== creatorId) {
      throw new Error("Unauthorized: only creators can view requests");
    }

    const { data, error } = await supabase
      .from("team_up_requests")
      .select("*")
      .eq("team_up_id", teamUpId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = (data ?? []) as TeamUpRequest[];
    const requesterMap = await fetchProfileSummariesById(rows.map((row) => row.requester_id));

    const requests: TeamUpRequest[] = rows.map((row) => ({
      ...row,
      requester: requesterMap.get(row.requester_id) ?? fallbackCreator(row.requester_id),
    }));

    return { data: requests, error: null };
  } catch (error) {
    console.error("Error fetching team-up requests:", error);
    return { data: [], error: getErrorMessage(error, "Failed to fetch requests") };
  }
}

// ============================================================================
// GET MY REQUESTS (requests I've sent)
// ============================================================================

export async function getMyTeamUpRequests(userId: string): Promise<{
  data: TeamUpRequest[];
  error: string | null;
}> {
  try {
    assertValidUuid(userId, "userId");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      throw new Error("Unauthorized: active session mismatch");
    }

    const { data, error } = await supabase
      .from("team_up_requests")
      .select(`
        *,
        team_up:team_ups(id, event_name, creator_id)
      `)
      .eq("requester_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = (data ?? []) as Array<TeamUpRequest & { team_up?: unknown }>;
    const requests: TeamUpRequest[] = rows.map((row) => ({
      ...row,
      team_up: row.team_up as Pick<TeamUp, "id" | "event_name" | "creator_id"> | undefined,
    }));

    return { data: requests, error: null };
  } catch (error) {
    console.error("Error fetching my requests:", error);
    return { data: [], error: getErrorMessage(error, "Failed to fetch your requests") };
  }
}

// ============================================================================
// GET INCOMING REQUESTS (requests to my team-ups)
// ============================================================================

export async function getIncomingTeamUpRequests(userId: string): Promise<{
  data: TeamUpRequest[];
  error: string | null;
}> {
  try {
    assertValidUuid(userId, "userId");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      throw new Error("Unauthorized: active session mismatch");
    }

    const { data, error } = await supabase
      .from("team_up_requests")
      .select(`
        *,
        team_up:team_ups!inner(id, event_name, creator_id)
      `)
      .eq("team_up.creator_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = (data ?? []) as Array<TeamUpRequest & { team_up?: unknown }>;
    const requesterMap = await fetchProfileSummariesById(rows.map((row) => row.requester_id));

    const requests: TeamUpRequest[] = rows.map((row) => ({
      ...row,
      requester: requesterMap.get(row.requester_id) ?? fallbackCreator(row.requester_id),
      team_up: row.team_up as Pick<TeamUp, "id" | "event_name" | "creator_id"> | undefined,
    }));

    return { data: requests, error: null };
  } catch (error) {
    console.error("Error fetching incoming requests:", error);
    return { data: [], error: getErrorMessage(error, "Failed to fetch incoming requests") };
  }
}

// ============================================================================
// CREATE REQUEST (join team or invite user)
// ============================================================================

export async function createTeamUpRequest(params: CreateTeamUpRequestParams): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    assertValidUuid(params.teamUpId, "teamUpId");
    assertValidUuid(params.requesterId, "requesterId");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== params.requesterId) {
      throw new Error("Unauthorized: active session mismatch");
    }

    if (!params.collegeDomain) {
      throw new Error("College domain is required");
    }

    // Verify team-up exists and is active
    const { data: teamUp, error: teamUpError } = await supabase
      .from("team_ups")
      .select("id, creator_id, status, college_domain, intent, team_size_current, team_size_target")
      .eq("id", params.teamUpId)
      .single();

    if (teamUpError) throw teamUpError;
    if (!teamUp) {
      throw new Error("Team-up not found");
    }
    if (teamUp.status !== "active") {
      throw new Error("Team-up is no longer active");
    }
    if (teamUp.college_domain !== params.collegeDomain) {
      throw new Error("Team-up is restricted to your college");
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("team_up_members")
      .select("id")
      .eq("team_up_id", params.teamUpId)
      .eq("user_id", params.requesterId)
      .maybeSingle();

    if (existingMember) {
      throw new Error("You are already a member of this team");
    }

    // Check for existing request
    const { data: existingRequest } = await supabase
      .from("team_up_requests")
      .select("id, status")
      .eq("team_up_id", params.teamUpId)
      .eq("requester_id", params.requesterId)
      .eq("request_type", params.requestType)
      .maybeSingle();

    if (existingRequest) {
      throw new Error("You have already sent a request for this team-up");
    }

    // Validate request makes sense
    if (params.requestType === "join_request") {
      if (teamUp.intent !== "looking_for_teammates") {
        throw new Error("This team-up is not looking for teammates");
      }
      if (teamUp.creator_id === params.requesterId) {
        throw new Error("You cannot request to join your own team");
      }
      // Check if team is full
      if (teamUp.team_size_target && (teamUp.team_size_current ?? 0) >= teamUp.team_size_target) {
        throw new Error("This team is already full");
      }
    } else if (params.requestType === "invite") {
      if (teamUp.intent !== "looking_to_join") {
        throw new Error("This user is not looking to join teams");
      }
    }

    const { error } = await supabase
      .from("team_up_requests")
      .insert({
        team_up_id: params.teamUpId,
        requester_id: params.requesterId,
        college_domain: params.collegeDomain,
        request_type: params.requestType,
        skills: params.skills || [],
        availability: params.availability || null,
        status: "pending",
      });

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error("Error creating request:", error);
    return { success: false, error: getErrorMessage(error, "Failed to send request") };
  }
}

// ============================================================================
// RESPOND TO REQUEST (accept/decline) - Uses safe RPC for race condition protection
// ============================================================================

export async function respondToTeamUpRequest(
  requestId: string,
  responderId: string,
  status: "accepted" | "declined"
): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    assertValidUuid(requestId, "requestId");
    assertValidUuid(responderId, "responderId");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== responderId) {
      throw new Error("Unauthorized: active session mismatch");
    }

    // For accepts, use the safe RPC to prevent race conditions (migration 066)
    if (status === "accepted") {
      const { data: result, error: rpcError } = await supabase
        .rpc("safe_accept_team_up_request", {
          p_request_id: requestId,
          p_responder_id: responderId,
        });

      if (rpcError) {
        // Fallback to manual handling if RPC not available
        console.warn("Safe accept RPC failed, falling back to manual handling:", rpcError);
      } else if (result) {
        if (!result.success) {
          throw new Error(result.error || "Failed to accept request");
        }
        return { success: true, error: null };
      }
    }

    // Manual handling for declines or RPC fallback
    // Get request details
    const { data: request, error: requestError } = await supabase
      .from("team_up_requests")
      .select("*, team_up:team_ups(*)")
      .eq("id", requestId)
      .single();

    if (requestError) throw requestError;
    if (!request) {
      throw new Error("Request not found");
    }
    if (request.status !== "pending") {
      throw new Error("Request has already been responded to");
    }

    const teamUp = request.team_up as TeamUp;

    // Verify responder has permission
    if (request.request_type === "join_request") {
      // Team creator responds to join requests
      if (teamUp.creator_id !== responderId) {
        throw new Error("Unauthorized: only team creator can respond");
      }
    } else if (request.request_type === "invite") {
      // The invitee responds to invites
      if (request.requester_id !== responderId) {
        throw new Error("Unauthorized: only the invitee can respond");
      }
    }

    // Update request status
    const { error: updateError } = await supabase
      .from("team_up_requests")
      .update({
        status,
        responded_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) throw updateError;

    // If accepted (fallback path), add to team with overflow check
    if (status === "accepted") {
      // Double-check team isn't full
      if (teamUp.team_size_target) {
        const { count } = await supabase
          .from("team_up_members")
          .select("id", { count: "exact", head: true })
          .eq("team_up_id", request.team_up_id);

        if (count && count >= teamUp.team_size_target) {
          // Revert the accept - team is full
          await supabase
            .from("team_up_requests")
            .update({ status: "declined", responded_at: new Date().toISOString() })
            .eq("id", requestId);
          
          throw new Error("Team is already full");
        }
      }

      const newMemberUserId = request.request_type === "join_request"
        ? request.requester_id
        : teamUp.creator_id; // For invites, the team-up creator joins the inviter's team

      const { error: memberError } = await supabase
        .from("team_up_members")
        .insert({
          team_up_id: request.team_up_id,
          user_id: newMemberUserId,
          college_domain: request.college_domain,
          is_creator: false,
        });

      if (memberError) {
        console.error("Error adding member:", memberError);
        // Don't fail the whole operation
      }

      // Check if team is now full and auto-close
      if (teamUp.team_size_target) {
        const { count } = await supabase
          .from("team_up_members")
          .select("id", { count: "exact", head: true })
          .eq("team_up_id", request.team_up_id);

        if (count && count >= teamUp.team_size_target) {
          await supabase
            .from("team_ups")
            .update({ status: "matched", updated_at: new Date().toISOString() })
            .eq("id", request.team_up_id);
        }
      }
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error responding to request:", error);
    return { success: false, error: getErrorMessage(error, "Failed to respond to request") };
  }
}

// ============================================================================
// GET TEAM-UP MEMBERS
// ============================================================================

export async function getTeamUpMembers(teamUpId: string): Promise<{
  data: TeamUpMember[];
  error: string | null;
}> {
  try {
    assertValidUuid(teamUpId, "teamUpId");

    const { data, error } = await supabase
      .from("team_up_members")
      .select("*")
      .eq("team_up_id", teamUpId)
      .order("joined_at", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as TeamUpMember[];
    const userMap = await fetchProfileSummariesById(rows.map((row) => row.user_id));

    const members: TeamUpMember[] = rows.map((row) => ({
      ...row,
      user: userMap.get(row.user_id) ?? fallbackCreator(row.user_id),
    }));

    return { data: members, error: null };
  } catch (error) {
    console.error("Error fetching team-up members:", error);
    return { data: [], error: getErrorMessage(error, "Failed to fetch members") };
  }
}

// ============================================================================
// CHECK IF USER HAS REQUESTED
// ============================================================================

export async function hasUserRequestedTeamUp(teamUpId: string, userId: string): Promise<{
  hasRequested: boolean;
  requestStatus: TeamUpRequestStatus | null;
  error: string | null;
}> {
  try {
    assertValidUuid(teamUpId, "teamUpId");
    assertValidUuid(userId, "userId");

    const { data, error } = await supabase
      .from("team_up_requests")
      .select("status")
      .eq("team_up_id", teamUpId)
      .eq("requester_id", userId)
      .maybeSingle();

    if (error) throw error;

    return {
      hasRequested: !!data,
      requestStatus: data?.status as TeamUpRequestStatus | null,
      error: null,
    };
  } catch (error) {
    console.error("Error checking request status:", error);
    return { hasRequested: false, requestStatus: null, error: getErrorMessage(error) };
  }
}
