// Alumni Invite System Types

export interface AlumniInvite {
  id: string;
  college_email: string;
  personal_email: string;
  college_domain: string;
  full_name: string | null;
  grad_year: number | null;
  degree: string | null;
  major: string | null;
  college_id: string | null;
  token: string;
  expires_at: string;
  status: AlumniInviteStatus;
  auth_user_id: string | null;
  accepted_at: string | null;
  invited_by: string | null;
  batch_id: string | null;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  college_name?: string;
  // Cancellation metadata (from RPC)
  previous_status?: string;
}

export type AlumniInviteStatus = 'invited' | 'accepted' | 'expired' | 'disputed' | 'cancelled';

/** Row from the Excel upload before validation */
export interface AlumniInviteUploadRow {
  college_email: string;
  personal_email: string;
  full_name?: string;
  grad_year?: number | string;
  degree?: string;
  major?: string;
  college_id?: string;
}

/** Validated row ready for DB insert */
export interface ValidatedAlumniInviteRow {
  college_email: string;
  personal_email: string;
  full_name: string | null;
  grad_year: number | null;
  degree: string | null;
  major: string | null;
  college_id: string | null;
}

/** Validation result for a single row */
export interface AlumniInviteValidationResult {
  row: number;
  valid: boolean;
  data?: ValidatedAlumniInviteRow;
  errors: string[];
}

/** Bulk upload result */
export interface AlumniInviteBulkResult {
  success: boolean;
  batch_id?: string;
  inserted: number;
  updated: number;
  skipped: number;
  errors: { college_email: string; error: string }[];
}

/** Token validation result */
export interface AlumniInviteTokenResult {
  valid: boolean;
  error?: string;
  invite_id?: string;
  college_email?: string;
  personal_email?: string;
  college_domain?: string;
  full_name?: string;
  grad_year?: number;
  degree?: string;
  major?: string;
}

/** Accept invite result */
export interface AlumniInviteAcceptResult {
  success: boolean;
  error?: string;
  invite_id?: string;
  college_email?: string;
  college_domain?: string;
  full_name?: string;
  grad_year?: number;
  degree?: string;
  major?: string;
}

/** Admin invite list result */
export interface AlumniInviteListResult {
  success: boolean;
  total: number;
  invites: AlumniInvite[];
  error?: string;
}

/** Filter options for admin dashboard */
export interface AlumniInviteFilters {
  status?: AlumniInviteStatus | null;
  college_domain?: string | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}

/** Batch upload summary for admin view */
export interface AlumniInviteBatchSummary {
  batch_id: string;
  total: number;
  invited: number;
  accepted: number;
  expired: number;
  disputed: number;
  created_at: string;
}
