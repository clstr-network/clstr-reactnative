/**
 * AI System Types
 *
 * Types for the three AI workflows:
 * A) Admin Excel Upload Review (Data Precision Layer)
 * B) System Walkthrough & Validation (documentation/process — no runtime types)
 * C) Change / Regression Review (CI/PR — no runtime types)
 *
 * AI is an advisory auditor: explains, validates, flags risks, simulates edge cases.
 * AI does NOT: create invites, modify identity, override DB rules, approve actions.
 */

// ─── AI Chat (Career Assistant) ──────────────────────────────

export interface AIChatSession {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  error: boolean;
  created_at: string;
}

// ─── AI Excel Upload Review (Workflow A) ─────────────────────

/**
 * Input to the AI review step — structured, no tokens/auth IDs/DB IDs.
 * AI sees ONLY what it needs to detect data quality issues.
 */
export interface AIReviewInput {
  college_id: string | null;
  expected_college_domain: string | null;
  rows: AIReviewInputRow[];
}

export interface AIReviewInputRow {
  row_index: number;
  college_email: string;
  personal_email: string;
  full_name: string | null;
  grad_year: number | null;
  degree: string | null;
  major: string | null;
  status: 'valid';
}

/**
 * AI review output — machine-readable warnings only.
 * AI never auto-fixes data; admin decides per-row.
 */
export interface AIReviewOutput {
  warnings: AIReviewWarning[];
  summary: AIReviewSummary;
}

export type AIWarningType =
  | 'domain_anomaly'
  | 'name_email_mismatch'
  | 'graduation_year_anomaly'
  | 'probable_duplicate'
  | 'column_meaning_drift';

export interface AIReviewWarning {
  type: AIWarningType;
  row_index: number;
  confidence: number;
  message: string;
}

export interface AIReviewSummary {
  total_rows: number;
  flagged_rows: number;
  high_risk_rows: number;
}

/**
 * Per-row admin decision after AI review.
 * AI warnings shown before "Confirm Upload" — admin chooses accept/exclude.
 */
export type AIReviewRowDecision = 'accept' | 'exclude';

export interface AIReviewRowStatus {
  row_index: number;
  decision: AIReviewRowDecision;
  warnings: AIReviewWarning[];
}

// ─── AI Review Result (persisted per batch) ──────────────────

export interface AIReviewResult {
  id: string;
  batch_context: string;
  review_input_hash: string;
  warnings: AIReviewWarning[];
  summary: AIReviewSummary;
  admin_decisions: AIReviewRowStatus[];
  reviewed_by: string;
  created_at: string;
}
