/**
 * useAlumniInvites â€” React Query hook for admin alumni-invite dashboard (mobile).
 *
 * Handles: listing, filtering, bulk upload, resending, and cancelling invites.
 * Direct Supabase RPC + edge function calls (no core module for this).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { supabase } from '@/lib/adapters/core-client';
import { QUERY_KEYS } from '@/lib/query-keys';
import type {
  AlumniInvite,
  AlumniInviteBulkResult,
  AlumniInviteFilters,
  AlumniInviteListResult,
  ValidatedAlumniInviteRow,
} from '@clstr/shared/types/alumni-invite';

const QUERY_KEY = QUERY_KEYS.alumniInvites;

// â”€â”€â”€ Fetch invites (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function fetchAlumniInvites(
  filters: AlumniInviteFilters,
): Promise<AlumniInviteListResult> {
  const { data, error } = await (supabase.rpc as any)('get_alumni_invites', {
    p_status: filters.status ?? null,
    p_college_domain: filters.college_domain ?? null,
    p_search: filters.search ?? null,
    p_limit: filters.limit ?? 50,
    p_offset: filters.offset ?? 0,
  });

  if (error) throw new Error(error.message);

  const result = data as unknown as AlumniInviteListResult;
  if (!result.success) throw new Error(result.error ?? 'Failed to fetch invites');
  return result;
}

// â”€â”€â”€ Bulk upsert invites â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function bulkUpsertInvites(
  rows: ValidatedAlumniInviteRow[],
  invitedBy: string,
): Promise<AlumniInviteBulkResult> {
  const { data, error } = await (supabase.rpc as any)('bulk_upsert_alumni_invites', {
    p_invites: rows as unknown as Record<string, unknown>,
    p_invited_by: invitedBy,
  });

  if (error) throw new Error(error.message);
  return data as unknown as AlumniInviteBulkResult;
}

// â”€â”€â”€ Resend invite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function resendInviteRpc(
  inviteId: string,
): Promise<{ success: boolean; token?: string; personal_email?: string; error?: string }> {
  const { data, error } = await (supabase.rpc as any)('resend_alumni_invite', {
    p_invite_id: inviteId,
  });

  if (error) throw new Error(error.message);
  return data as unknown as {
    success: boolean;
    token?: string;
    personal_email?: string;
    error?: string;
  };
}

// â”€â”€â”€ Cancel invite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function cancelInviteRpc(inviteId: string): Promise<void> {
  const { data, error } = await (supabase.rpc as any)('cancel_alumni_invite', {
    p_invite_id: inviteId,
  });

  if (error) throw new Error(error.message);

  const result = data as unknown as { success: boolean; error?: string };
  if (!result.success) throw new Error(result.error ?? 'Cancel failed');
}

// â”€â”€â”€ Send invite email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function sendInviteEmail(
  personalEmail: string,
  token: string,
  fullName?: string | null,
): Promise<void> {
  const { error } = await supabase.functions.invoke('send-alumni-invite-email', {
    body: {
      to: personalEmail,
      token,
      full_name: fullName ?? undefined,
    },
  });

  if (error) throw new Error(error.message);
}

// â”€â”€â”€ Hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function useAlumniInvites(filters: AlumniInviteFilters = {}) {
  const queryClient = useQueryClient();

  const invitesQuery = useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: () => fetchAlumniInvites(filters),
    staleTime: 30_000,
  });

  const bulkUploadMutation = useMutation({
    mutationFn: ({
      rows,
      invitedBy,
    }: {
      rows: ValidatedAlumniInviteRow[];
      invitedBy: string;
    }) => bulkUpsertInvites(rows, invitedBy),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.identity });
      Alert.alert('Upload complete', `${result.inserted} invites created`);
      if (result.errors.length > 0) {
        Alert.alert('Warning', `${result.errors.length} rows had errors`);
      }
    },
    onError: (err: Error) => {
      Alert.alert('Upload failed', err.message);
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (invite: AlumniInvite) => {
      const result = await resendInviteRpc(invite.id);
      if (!result.success) throw new Error(result.error ?? 'Resend failed');
      // Send the email
      await sendInviteEmail(invite.personal_email, result.token!, invite.full_name);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.identity });
      Alert.alert('Success', 'Invite resent successfully');
    },
    onError: (err: Error) => {
      Alert.alert('Resend failed', err.message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (inviteId: string) => cancelInviteRpc(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.identity });
      Alert.alert('Success', 'Invite cancelled');
    },
    onError: (err: Error) => {
      Alert.alert('Cancel failed', err.message);
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
