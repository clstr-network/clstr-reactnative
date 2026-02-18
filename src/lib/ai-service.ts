/**
 * AI Service — All AI-related API calls.
 *
 * Three workflows, one principle: AI is advisory, DB is authority.
 *
 * A) AI Chat (Career Assistant) — persisted sessions via Supabase
 * B) AI Excel Upload Review — read-only data quality check
 * C) (Future) AI Change/Regression Review — CI/PR integration
 *
 * AI NEVER: creates invites, modifies identity, overrides DB rules.
 */

import { supabase } from '@/integrations/supabase/client';
import { handleApiError } from '@/lib/errorHandler';
import type {
  AIChatSession,
  AIChatMessage,
  AIReviewInput,
  AIReviewOutput,
  AIReviewWarning,
  AIReviewSummary,
  AIWarningType,
} from '@/types/ai';

// ─── AI Chat (Career Assistant) ──────────────────────────────

/**
 * Create a new chat session. Returns the session record.
 */
export async function createChatSession(): Promise<AIChatSession> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .insert({ user_id: session.user.id })
    .select()
    .single();

  if (error) throw handleApiError(error, { operation: 'createChatSession' });
  return data as AIChatSession;
}

/**
 * Fetch all chat sessions for the current user (most recent first).
 */
export async function getChatSessions(): Promise<AIChatSession[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .select('*')
    .eq('user_id', session.user.id)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) throw handleApiError(error, { operation: 'getChatSessions' });
  return (data ?? []) as AIChatSession[];
}

/**
 * Fetch messages for a specific chat session.
 */
export async function getChatMessages(sessionId: string): Promise<AIChatMessage[]> {
  if (!sessionId) return [];

  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw handleApiError(error, { operation: 'getChatMessages' });
  return (data ?? []) as AIChatMessage[];
}

/**
 * Save a message to a chat session and return the saved row.
 */
export async function saveChatMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  isError = false
): Promise<AIChatMessage> {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
      error: isError,
    })
    .select()
    .single();

  if (error) throw handleApiError(error, { operation: 'saveChatMessage' });

  // Update session's updated_at
  await supabase
    .from('ai_chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  return data as AIChatMessage;
}

/**
 * Send messages to the AI chat edge function and return
 * the assistant's response content.
 */
export async function sendAIChatMessage(
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: { messages },
    });

    if (error) throw error;

    const content =
      data?.choices?.[0]?.message?.content ||
      'I apologize, but I couldn\'t generate a response. Please try again.';

    return content;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'sendAIChatMessage',
      userMessage: 'Failed to connect to AI chat. Please try again.',
    });
  }
}

/**
 * Delete a chat session and all its messages.
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  // Messages cascade-deleted via FK
  const { error } = await supabase
    .from('ai_chat_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw handleApiError(error, { operation: 'deleteChatSession' });
}

/**
 * Update session title (e.g., derived from first message).
 */
export async function updateChatSessionTitle(
  sessionId: string,
  title: string
): Promise<void> {
  const { error } = await supabase
    .from('ai_chat_sessions')
    .update({ title })
    .eq('id', sessionId);

  if (error) throw handleApiError(error, { operation: 'updateChatSessionTitle' });
}

// ─── AI Excel Upload Review (Workflow A) ─────────────────────

/**
 * Deterministic AI review of validated alumni invite rows.
 *
 * This runs client-side (no LLM call) — it performs the exact checks
 * specified in the AI working document:
 *
 * 1. Domain anomalies — detect typos / legacy domains
 * 2. Name ↔ email mismatch — catch wrong-row errors
 * 3. Graduation year sanity — catch future/past anomalies
 * 4. Probable duplicates — catch semantic duplicates
 * 5. Column meaning drift — detect mis-mapped columns
 *
 * Returns machine-readable warnings. AI NEVER auto-fixes.
 */
export function reviewAlumniInviteData(input: AIReviewInput): AIReviewOutput {
  const warnings: AIReviewWarning[] = [];
  const domain = input.expected_college_domain?.toLowerCase() ?? null;

  // Index for duplicate detection
  const nameIndex = new Map<string, number[]>();
  const emailLocalIndex = new Map<string, number[]>();

  for (const row of input.rows) {
    const rowWarnings: AIReviewWarning[] = [];

    // ── 1. Domain anomaly check ──
    if (domain && row.college_email) {
      const emailDomain = row.college_email.split('@')[1]?.toLowerCase();
      if (emailDomain && emailDomain !== domain) {
        const similarity = computeDomainSimilarity(emailDomain, domain);
        if (similarity > 0.6) {
          rowWarnings.push({
            type: 'domain_anomaly',
            row_index: row.row_index,
            confidence: Math.round(similarity * 100) / 100,
            message: `Domain "${emailDomain}" is similar to expected "${domain}". Possible legacy domain or typo.`,
          });
        } else {
          rowWarnings.push({
            type: 'domain_anomaly',
            row_index: row.row_index,
            confidence: 0.95,
            message: `Domain "${emailDomain}" does not match expected "${domain}". Wrong college or data error.`,
          });
        }
      }
    }

    // ── 2. Name ↔ email mismatch ──
    if (row.full_name && row.college_email) {
      const nameParts = row.full_name.toLowerCase().split(/\s+/);
      const emailLocal = row.college_email.split('@')[0]?.toLowerCase() ?? '';
      const hasNameInEmail = nameParts.some(
        (part) => part.length > 2 && emailLocal.includes(part)
      );
      if (!hasNameInEmail && nameParts.length > 0 && emailLocal.length > 3) {
        rowWarnings.push({
          type: 'name_email_mismatch',
          row_index: row.row_index,
          confidence: 0.7,
          message: `Name "${row.full_name}" does not appear in email "${row.college_email}". Possible wrong-row error.`,
        });
      }
    }

    // ── 3. Graduation year sanity ──
    if (row.grad_year !== null) {
      const currentYear = new Date().getFullYear();
      if (row.grad_year > currentYear + 5) {
        rowWarnings.push({
          type: 'graduation_year_anomaly',
          row_index: row.row_index,
          confidence: 0.95,
          message: `Graduation year ${row.grad_year} is more than 5 years in the future.`,
        });
      } else if (row.grad_year < 1960) {
        rowWarnings.push({
          type: 'graduation_year_anomaly',
          row_index: row.row_index,
          confidence: 0.9,
          message: `Graduation year ${row.grad_year} is unusually old. Verify this is correct.`,
        });
      }
    }

    // ── 4. Build indexes for duplicate detection ──
    if (row.full_name) {
      const normalized = row.full_name.toLowerCase().replace(/\s+/g, ' ').trim();
      const existing = nameIndex.get(normalized) ?? [];
      existing.push(row.row_index);
      nameIndex.set(normalized, existing);
    }
    if (row.college_email) {
      const local = row.college_email.split('@')[0]?.toLowerCase() ?? '';
      if (local.length > 3) {
        const existing = emailLocalIndex.get(local) ?? [];
        existing.push(row.row_index);
        emailLocalIndex.set(local, existing);
      }
    }

    warnings.push(...rowWarnings);
  }

  // ── 4b. Probable duplicates (post-scan) ──
  for (const [name, indices] of nameIndex) {
    if (indices.length > 1) {
      for (const idx of indices) {
        warnings.push({
          type: 'probable_duplicate',
          row_index: idx,
          confidence: 0.8,
          message: `Name "${name}" appears in ${indices.length} rows (rows: ${indices.join(', ')}). Possible duplicate entry.`,
        });
      }
    }
  }

  // ── 5. Column meaning drift ──
  // Check if personal_email column contains college-like domains
  if (domain) {
    for (const row of input.rows) {
      if (row.personal_email) {
        const personalDomain = row.personal_email.split('@')[1]?.toLowerCase();
        if (personalDomain && personalDomain === domain) {
          warnings.push({
            type: 'column_meaning_drift',
            row_index: row.row_index,
            confidence: 0.85,
            message: `Personal email "${row.personal_email}" uses the college domain. Columns may be swapped.`,
          });
        }
      }
    }
  }

  // Deduplicate warnings by row_index + type
  const seen = new Set<string>();
  const dedupedWarnings = warnings.filter((w) => {
    const key = `${w.row_index}-${w.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const flaggedRows = new Set(dedupedWarnings.map((w) => w.row_index));
  const highRiskRows = new Set(
    dedupedWarnings
      .filter((w) => w.confidence >= 0.85)
      .map((w) => w.row_index)
  );

  return {
    warnings: dedupedWarnings,
    summary: {
      total_rows: input.rows.length,
      flagged_rows: flaggedRows.size,
      high_risk_rows: highRiskRows.size,
    },
  };
}

/**
 * Compute similarity between two domain strings using Levenshtein-like ratio.
 */
function computeDomainSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;

  if (longer.length === 0) return 1;

  const cost: number[][] = Array.from({ length: shorter.length + 1 }, (_, i) =>
    Array.from({ length: longer.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= shorter.length; i++) {
    for (let j = 1; j <= longer.length; j++) {
      const indicator = shorter[i - 1] === longer[j - 1] ? 0 : 1;
      cost[i][j] = Math.min(
        cost[i - 1][j] + 1,
        cost[i][j - 1] + 1,
        cost[i - 1][j - 1] + indicator
      );
    }
  }

  return 1 - cost[shorter.length][longer.length] / longer.length;
}

/**
 * Persist AI review results to the database for audit trail.
 */
export async function saveAIReviewResult(
  batchContext: string,
  input: AIReviewInput,
  output: AIReviewOutput,
  adminDecisions: { row_index: number; decision: 'accept' | 'exclude' }[]
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { error } = await supabase.from('ai_review_results').insert({
    batch_context: batchContext,
    review_input_hash: simpleHash(JSON.stringify(input)),
    warnings: output.warnings,
    summary: output.summary,
    admin_decisions: adminDecisions,
    reviewed_by: session.user.id,
  });

  if (error) throw handleApiError(error, { operation: 'saveAIReviewResult' });
}

/**
 * Simple string hash for deduplication / audit.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
