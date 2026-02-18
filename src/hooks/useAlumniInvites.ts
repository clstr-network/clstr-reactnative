/**
 * useAlumniInvites — React Query hook for the admin alumni-invite dashboard.
 *
 * Handles: listing, filtering, bulk upload, resending, and cancelling invites.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  AlumniInvite,
  AlumniInviteBulkResult,
  AlumniInviteFilters,
  AlumniInviteListResult,
  ValidatedAlumniInviteRow,
} from "@/types/alumni-invite";

const QUERY_KEY = "alumni-invites";

// ─── Fetch invites (admin) ───────────────────────────────────

async function fetchAlumniInvites(
  filters: AlumniInviteFilters
): Promise<AlumniInviteListResult> {
  const { data, error } = await supabase.rpc("get_alumni_invites", {
    p_status: filters.status ?? null,
    p_college_domain: filters.college_domain ?? null,
    p_search: filters.search ?? null,
    p_limit: filters.limit ?? 50,
    p_offset: filters.offset ?? 0,
  });

  if (error) throw new Error(error.message);

  const result = data as unknown as AlumniInviteListResult;
  if (!result.success) throw new Error(result.error ?? "Failed to fetch invites");
  return result;
}

// ─── Bulk upsert invites ─────────────────────────────────────

async function bulkUpsertInvites(
  rows: ValidatedAlumniInviteRow[],
  invitedBy: string
): Promise<AlumniInviteBulkResult> {
  const { data, error } = await supabase.rpc("bulk_upsert_alumni_invites", {
    p_invites: rows as unknown as Record<string, unknown>,
    p_invited_by: invitedBy,
  });

  if (error) throw new Error(error.message);
  return data as unknown as AlumniInviteBulkResult;
}

// ─── Resend invite ───────────────────────────────────────────

async function resendInvite(
  inviteId: string
): Promise<{ success: boolean; token?: string; personal_email?: string; error?: string }> {
  const { data, error } = await supabase.rpc("resend_alumni_invite", {
    p_invite_id: inviteId,
  });

  if (error) throw new Error(error.message);
  return data as unknown as { success: boolean; token?: string; personal_email?: string; error?: string };
}

// ─── Cancel invite ───────────────────────────────────────────

async function cancelInvite(inviteId: string): Promise<void> {
  const { data, error } = await supabase.rpc("cancel_alumni_invite", {
    p_invite_id: inviteId,
  });

  if (error) throw new Error(error.message);

  const result = data as unknown as { success: boolean; error?: string };
  if (!result.success) throw new Error(result.error ?? "Cancel failed");
}

// ─── Send invite email ──────────────────────────────────────

async function sendInviteEmail(
  personalEmail: string,
  token: string,
  fullName?: string | null
): Promise<void> {
  const { error } = await supabase.functions.invoke("send-alumni-invite-email", {
    body: {
      to: personalEmail,
      token,
      full_name: fullName ?? undefined,
    },
  });

  if (error) throw new Error(error.message);
}

// ─── Hook ────────────────────────────────────────────────────

export function useAlumniInvites(filters: AlumniInviteFilters = {}) {
  const queryClient = useQueryClient();

  const invitesQuery = useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: () => fetchAlumniInvites(filters),
    staleTime: 30_000,
  });

  const bulkUploadMutation = useMutation({
    mutationFn: ({ rows, invitedBy }: { rows: ValidatedAlumniInviteRow[]; invitedBy: string }) =>
      bulkUpsertInvites(rows, invitedBy),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['invite-ops-stats'] });
      toast.success(`Upload complete: ${result.inserted} invites created`);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} rows had errors`);
      }
    },
    onError: (err: Error) => {
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (invite: AlumniInvite) => {
      const result = await resendInvite(invite.id);
      if (!result.success) throw new Error(result.error ?? "Resend failed");
      // Send the email
      await sendInviteEmail(invite.personal_email, result.token!, invite.full_name);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['invite-ops-stats'] });
      toast.success("Invite resent successfully");
    },
    onError: (err: Error) => {
      toast.error(`Resend failed: ${err.message}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (inviteId: string) => cancelInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['invite-ops-stats'] });
      toast.success("Invite cancelled");
    },
    onError: (err: Error) => {
      toast.error(`Cancel failed: ${err.message}`);
    },
  });

  return {
    // Data
    invites: (invitesQuery.data?.invites ?? []) as AlumniInvite[],
    total: invitesQuery.data?.total ?? 0,
    isLoading: invitesQuery.isLoading,
    isError: invitesQuery.isError,
    error: invitesQuery.error,
    refetch: invitesQuery.refetch,

    // Mutations
    bulkUpload: bulkUploadMutation.mutateAsync,
    isBulkUploading: bulkUploadMutation.isPending,

    resendInvite: resendMutation.mutate,
    isResending: resendMutation.isPending,

    cancelInvite: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,

    // Send individual email (for after bulk upload)
    sendInviteEmail,
  };
}
