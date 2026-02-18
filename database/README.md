# Database

All database schema changes are managed via Supabase migrations in `../supabase/migrations/`.

## Migration Commands

```bash
# List all migrations
supabase migration list

# Push migrations to remote
supabase db push --include-all

# Check migration status
supabase migration status
```

## Key Migration Groups

| Range | Feature |
|-------|---------|
| 000–019 | Core schema, profiles, social, events, jobs, clubs, RLS, triggers, auth hooks |
| 020–030 | Realtime, messaging, posts, saved items, search |
| 031–044 | EcoCampus, collab projects, posts, team-ups, push subs, skill analysis, college domain aliases |
| 045–064 | Roles, alumni ID, admin, statistics, analytics, event enforcement |
| 065–071 | Team-ups enhancements, search fixes, LinkedIn engagement, user settings realtime |
| 072–083 | **Email transition system** — schema, verification codes, cron, security, auth-level support, merge, merge RPC hardening, audit guard + sync efficiency |
| 084–086 | Email cleanup, **comment/message performance indexes** (086) |
| 087–091 | **Alumni Identity & Invite System** — alumni_invites table + RPCs + realtime (087), security hardening: RLS, auth.uid() enforce, immutability trigger (088), rate-limit, server-side invite context (089), centralized identity context RPC + ops stats (090), admin-gated cancel invite RPC (091) |
| 092 | **AI System** — ai_chat_sessions, ai_chat_messages, ai_review_results tables + RLS |
| 093 | **Fix get_invite_ops_stats()** — replace broken `user_id` column ref with `is_platform_admin()` |
| 094–095 | Network/Alumni card context, advanced filters |
| 096 | **Mentorship Enhancements** — help_type, commitment_level, is_paused, last_active_at on offers; accepted_at, completed_at, mentee_feedback, mentor_feedback on requests; triggers for auto-connect, auto-message, auto-notify, mentee count sync |
| 097 | **Mentorship SLA + Expiry + Highlights** — avg_response_hours, total_requests_received/accepted/ignored, total_mentees_helped on offers; responded_at, auto_expired, suggested_mentor_id on requests; SLA metric trigger, request count trigger, auto_expire_stale_mentorship_requests() function |
| 098 | **Mentorship Edge Cases** — Auto-cancel mentorships on user block (trg_cancel_mentorships_on_block), duplicate prevention (partial unique index on active pairs), slot overflow guard (trg_guard_mentor_slot_overflow) |
| 099–105 | Fixes: realtime publication, audit reports, email verification code flow, avatars bucket |
| 106 | **Fix account_deletion_audit schema** — add missing `deletion_reason` + `deleted_at` columns so `handle_user_deletion` trigger writes correctly |

## RLS Policy Summary (profiles)

| Policy | Action | Rule |
|--------|--------|------|
| `profiles_select_public` | SELECT | All authenticated users can view all profiles |
| `profiles_insert_own` | INSERT | Users can only create their own profile |
| `profiles_update_own` | UPDATE | Users can only update their own profile |
| `profiles_delete_own` | DELETE | Users can only delete their own profile |

