<!-- markdownlint-disable MD013 MD060 -->
# Feature × Profile Permission Matrix

**Last Updated:** February 14, 2026 (Connection privacy + notification governance hardening: participant-only connection visibility and server-side-only notification creation.)

## Profile Types

| Type        | Description                                        |
| ----------- | -------------------------------------------------- |
| **Student** | Currently enrolled student                         |
| **Alumni**  | Graduated student (includes Organization → Alumni) |
| **Faculty** | Teaching staff (includes Principal/Dean)           |
| **Club**    | Student organization account                       |

> Governance note: users with role value `manager` are review-only for feed content at both UI guard and RLS layers (no `posts` INSERT/UPDATE/DELETE privileges).

> Connection governance: request creation is requester-owned (`auth.uid() = requester_id`), review decisions are receiver-only (`pending → accepted/rejected` by `receiver_id` only), and connection row visibility is participant-only (`auth.uid() IN (requester_id, receiver_id)`). Directionality uniqueness is DB-enforced across unordered user pairs.

> Messaging governance: DM initiation is connected-only (`connections.status = accepted`, normalized as `connected` in UI). Only privileged roles (`Alumni`, `Organization`) may bypass the connection gate.

> Connections route governance: `/profile/:id/connections` is self-only; users manage only their own connection graph and pending inbox.

> Profile visibility governance: profile reads are now DB-enforced by `user_settings.profile_visibility` (`public` / `connections` / `private`). `connections` visibility requires an accepted row in `connections`; `private` is owner + platform-admin only.

---

## 1. Core Platform & Social

| Feature                      | Student | Alumni | Faculty | Club |
| ---------------------------- | ------- | ------ | ------- | ---- |
| Home Feed (View Posts, same-college scope) | ✅ | ✅ | ✅ | ✅ |
| Create Post                  | ✅      | ✅     | ✅      | ✅   |
| Like / Comment / Share       | ✅      | ✅     | ✅      | ✅   |
| Save / Bookmarks             | ✅      | ✅     | ✅      | 🚫   |
| Messaging                    | ✅      | ✅     | ✅      | ✅   |
| Navbar Typeahead (People + Events) | ✅      | ✅     | ✅      | ✅   |
| Profile Photo – View         | ✅      | ✅     | ✅      | ✅   |
| Profile Photo – Edit/Upload (own profile) | ✅ | ✅ | ✅ | ✅ |
| Profile Photo – Remove (own profile) | ✅ | ✅ | ✅ | ✅ |

## 2. Jobs & Careers

| Feature            | Student | Alumni | Faculty | Club |
| ------------------ | ------- | ------ | ------- | ---- |
| Jobs – Browse      | ✅      | ✅     | 🚫      | 🚫   |
| Jobs – Apply       | ✅      | ✅     | 🚫      | 🚫   |
| Jobs – Post        | 🚫      | ✅     | 🚫      | 🚫   |
| Jobs – Save        | ✅      | ✅     | 🚫      | 🚫   |
| AI Job Matching    | ✅      | ✅     | 🚫      | 🚫   |

## 3. Skill Analysis / Career Intelligence

| Feature            | Student | Alumni | Faculty | Club |
| ------------------ | ------- | ------ | ------- | ---- |
| Skill Analysis     | ✅      | ✅     | 🚫      | 🚫   |
| Skill Gap Analysis | ✅      | ✅     | 🚫      | 🚫   |
| Job Fit / Scoring  | ✅      | ✅     | 🚫      | 🚫   |
| Peer Comparison    | ✅      | 🚫     | 🚫      | 🚫   |
| Trending Skills    | ✅      | ✅     | 🚫      | 🚫   |

## 3b. AI Career Assistant

| Feature                    | Student | Alumni | Faculty | Club |
| -------------------------- | ------- | ------ | ------- | ---- |
| AI Chat (career guidance)  | ✅      | ✅     | ✅      | 🚫   |
| Chat Session History       | ✅      | ✅     | ✅      | 🚫   |
| AI Excel Upload Review     | 🚫      | 🚫     | 🚫      | 🚫   |

> **Note:** AI Excel Upload Review is admin-only (platform_admin role, not tied to profile type). AI Chat is available to all authenticated users with a profile.

## 4. Mentorship

| Feature                        | Student | Alumni | Faculty | Club |
| ------------------------------ | ------- | ------ | ------- | ---- |
| Browse Mentors                 | ✅      | ✅     | ✅      | 🚫   |
| Request Mentorship             | ✅      | 🚫     | 🚫      | 🚫   |
| Cancel Own Pending Request     | ✅      | ✅(*)  | ✅(*)   | 🚫   |
| View Own Mentee History        | ✅      | ✅(*)  | ✅(*)   | 🚫   |
| View Suggested Mentor (on reject) | ✅  | ✅(*)  | ✅(*)   | 🚫   |
| Submit Feedback (as Mentee)    | ✅      | ✅(*)  | ✅(*)   | 🚫   |
| Offer Mentorship               | 🚫      | ✅     | ✅      | 🚫   |
| Manage Mentorship Requests     | 🚫      | ✅     | ✅      | 🚫   |
| Reject with Suggest Another    | 🚫      | ✅     | ✅      | 🚫   |
| Set Help Type / Commitment     | 🚫      | ✅     | ✅      | 🚫   |
| Pause / Resume Offer           | 🚫      | ✅     | ✅      | 🚫   |
| Complete Mentorship            | 🚫      | ✅     | ✅      | 🚫   |
| Submit Feedback (as Mentor)    | 🚫      | ✅     | ✅      | 🚫   |
| View Mentor Dashboard          | 🚫      | ✅     | ✅      | 🚫   |
| View Mentor Status Badge       | ✅      | ✅     | ✅      | 🚫   |
| View Soft Highlights           | ✅      | ✅     | ✅      | 🚫   |
| SLA Metrics (internal only)    | 🚫      | 🚫(**) | 🚫(**) | 🚫   |
| Auto-Expiry Notifications      | ✅      | ✅(*)  | ✅(*)   | 🚫   |
| Mentorship→Projects Bridge CTA | 🚫      | ✅     | ✅      | 🚫   |

> **(*) Role Transition Rule:** Alumni/Faculty who were previously Students retain access to their OWN mentee history. They can cancel pending requests, view request history, give feedback on completed mentorships, and see auto-expiry notifications. They CANNOT create NEW mentorship requests. Permissions apply at ACTION TIME, not historical state time.
>
> **(**) SLA Metrics:** avg_response_hours, acceptance rate, ignored count are collected silently in the DB. They are NOT shown in any UI yet. They exist for future AI matching and "Responsive mentors" sorting. No user-facing permission needed.

### Mentorship Edge Cases (Enforced)

| Edge Case | Rule | Enforcement |
| --------- | ---- | ----------- |
| Student → Alumni transition | Existing mentorships remain valid; no deletion; no forced completion | RLS + query scope |
| Role change before mentor responds | Mentor can still accept/reject; mentorship proceeds normally | DB trigger (action-time check) |
| Alumni pauses offer | Hidden from discovery; no new requests; existing mentorships continue | `is_paused` column + query filter |
| User blocks another user | ALL active mentorships auto-cancelled; chat locked | DB trigger `trg_cancel_mentorships_on_block` (migration 098) |
| Duplicate mentorship request | Only ONE pending/accepted mentorship per user pair | Partial unique index `mentorship_requests_active_pair_uniq` (migration 098) |
| Student cancels then re-requests | Allowed; new request row created | No restriction (completed/cancelled not counted) |
| Mentor slots full mid-burst | DB trigger prevents acceptance over slot limit | DB trigger `trg_guard_mentor_slot_overflow` (migration 098) |
| Feedback independence | Each side submits independently; null = no feedback; no blocking | Independent boolean columns |
| Reverse mentorship after role change | Allowed; treated as brand-new directional relationship | No restriction |
| Profile deactivation | Mentorship records preserved for audit; shown as "Former mentor" | Soft display fallback |

## 5. Projects / CollabHub

| Feature                    | Student | Alumni | Faculty | Club |
| -------------------------- | ------- | ------ | ------- | ---- |
| View Projects              | ✅      | ✅     | ✅      | ✅   |
| Create Projects            | ✅      | ✅     | ✅      | ✅   |
| Apply to Projects          | ✅      | ✅     | 🚫      | 🚫   |
| Manage Team / Applications | ✅      | ✅     | ✅      | ✅   |

## 5b. Team-Ups (Hackathons / Events)

| Feature                    | Student | Alumni | Faculty | Club |
| -------------------------- | ------- | ------ | ------- | ---- |
| View Team-Ups              | ✅      | ✅     | ✅      | ✅   |
| Create Team-Up             | ✅      | ✅     | 🚫      | 🚫   |
| Request to Join            | ✅      | ✅     | 🚫      | 🚫   |
| Manage Team Requests       | ✅      | ✅     | 🚫      | 🚫   |

## 6. Clubs

| Feature     | Student | Alumni | Faculty | Club |
| ----------- | ------- | ------ | ------- | ---- |
| View Clubs  | ✅      | ✅     | ✅      | ✅   |
| Join Club   | ✅      | 🚫     | 🚫      | 🚫   |
| Follow Club | 🚫      | ✅     | 🚫      | 🚫   |
| Manage Club | 🚫      | 🚫     | 🚫      | ✅   |

## 7. Events

| Feature       | Student | Alumni | Faculty | Club |
| ------------- | ------- | ------ | ------- | ---- |
| View Events   | ✅      | ✅     | ✅      | ✅   |
| Attend / RSVP | ✅      | ✅     | ✅      | ✅   |
| Create Events | 🚫      | 🚫     | ✅      | ✅   |
| Manage Events | 🚫      | 🚫     | ✅      | ✅   |

## 8. Alumni Directory

| Feature               | Student | Alumni | Faculty | Club |
| --------------------- | ------- | ------ | ------- | ---- |
| View Alumni Directory | ✅      | ✅     | ✅      | 🚫   |
| Connect with Alumni   | ✅      | ✅     | ✅      | 🚫   |

## 9. EcoCampus (Marketplace)

| Feature         | Student | Alumni | Faculty | Club |
| --------------- | ------- | ------ | ------- | ---- |
| Browse Listings | ✅      | 🚫     | ✅      | 🚫   |
| Create Listing  | ✅      | 🚫     | ✅      | 🚫   |
| Manage Listings | ✅      | 🚫     | ✅      | 🚫   |

## 10. System & Settings

| Feature       | Student | Alumni | Faculty | Club |
| ------------- | ------- | ------ | ------- | ---- |
| Notifications | ✅      | ✅     | ✅      | ✅   |
| Settings      | ✅      | ✅     | ✅      | ✅   |
| Onboarding    | ✅      | ✅     | ✅      | ✅   |
| Onboarding Interests Entry Mode | Preset chips | Preset chips | Manual entry | 🚫 (not applicable) |

> **Notification Governance Rule:** End users cannot directly insert into `public.notifications`; notification creation is server-controlled (service role, triggers, controlled functions). User actions may only read/update/delete rows allowed by RLS.

## 11. Portfolio

| Feature                        | Student | Alumni | Faculty | Club |
| ------------------------------ | ------- | ------ | ------- | ---- |
| View own portfolio (public)    | ✅      | ✅     | ✅      | ✅   |
| View others' portfolio (public)| ✅      | ✅     | ✅      | ✅   |
| Activate / deactivate portfolio| ✅      | ✅     | ✅      | ✅   |
| Share portfolio URL            | ✅      | ✅     | ✅      | ✅   |
| Choose portfolio template      | ✅      | ✅     | ✅      | ✅   |
| Toggle section visibility      | ✅      | ✅     | ✅      | ✅   |

> **Note:** Portfolio activation/edit remains owner-only. Due strict profile domain RLS isolation, cross-college public portfolio visibility is no longer guaranteed unless the viewer is in the same college domain (or a platform admin), or the profile row is domain-null.

---

## Alumni Invite Feature Permissions

### Alumni Invite System Permissions

#### Access by Role (Alumni Invites)

| Action | Student | Alumni | Faculty | Club | Public (Unauthenticated) | Enforced At |
|--------|---------|--------|---------|------|-------------------------|-------------|
| Validate invite token | N/A | N/A | N/A | N/A | ✅ | DB RPC (anon + authenticated grant) |
| Accept invite (claim identity) | N/A | N/A | N/A | N/A | ✅ (post-signup) | DB RPC (`auth.uid()` + email match) |
| Dispute invite | N/A | N/A | N/A | N/A | ✅ | DB RPC (anon + authenticated grant) |
| View own accepted invite | ✅ | ✅ | ❌ | ❌ | ❌ | DB RPC (`auth.uid()`) |
| Upload bulk invites (Excel/CSV) | ❌ | ❌ | ❌ | ❌ | ❌ | DB RPC (`is_platform_admin()`) |
| List all invites | ❌ | ❌ | ❌ | ❌ | ❌ | DB RPC (`is_platform_admin()`) |
| Resend invite email | ❌ | ❌ | ❌ | ❌ | ❌ | DB RPC (`is_platform_admin()` + 24h cooldown) |
| Cancel invite | ❌ | ❌ | ❌ | ❌ | ❌ | DB RPC (`is_platform_admin()`) |
| View invite ops stats | ❌ | ❌ | ❌ | ❌ | ❌ | DB RPC (`is_platform_admin()`) |
| Send invite email (Edge Function) | ❌ | ❌ | ❌ | ❌ | ❌ | Edge Function (Authorization header) |

> **Note:** Alumni invite actions (upload, list, resend, cancel, stats) are **platform admin only** — enforced at the database RPC level via `is_platform_admin()`. Invite claim actions (validate, accept, dispute) are public token-based flows; the invitee does not need an existing account. After accepting, the invitee becomes a Student or Alumni profile.

---

## Email Transition Feature Permissions

### Access by Role

| Action                          | Student | Alumni | Faculty | Club | Enforced At |
|---------------------------------|---------|--------|---------|------|-------------|
| View email transition settings  | ✅      | ✅     | ❌      | ❌   | UI component role guard |
| Link personal email             | ✅      | ✅     | ❌      | ❌   | DB RPC role check + UI guard |
| Verify personal email (code)    | ✅      | ✅     | ❌      | ❌   | DB RPC role check + UI guard |
| Transition to personal email    | ✅      | ✅     | ❌      | ❌   | DB RPC role check + UI guard |
| Remove linked personal email    | ✅      | ✅     | ❌      | ❌   | UI guard (direct DB update respects RLS) |
| See graduation prompt banner    | ✅ (near grad) | ✅ (always) | ❌ | ❌ | `shouldPromptPersonalEmail` logic |

### State Machine

| State          | DB Column Value | Description                          |
|----------------|-----------------|--------------------------------------|
| `none`         | `'none'`        | No personal email linked             |
| `pending`      | `'pending'`     | Personal email submitted, awaiting code verification |
| `verified`     | `'verified'`    | Personal email verified, transition available |
| `transitioned` | `'transitioned'`| Login method switched to personal email |

### Security Invariants

| Invariant                                         | Enforced By | Status |
|---------------------------------------------------|-------------|--------|
| Personal email cannot bypass domain restriction   | Architecture: personal email is auth-only, not authz | ✅ |
| College domain stays on profile after transition  | `sync_profile_email` trigger | ✅ |
| RPC guards: only Student/Alumni, auth.uid() check | Migration 075 role checks | ✅ |
| UI guards: component-level ALLOWED_ROLES          | `EmailTransitionSettings` component | ✅ |
| Unique index prevents duplicate personal emails   | DB constraint | ✅ |
| Academic email validation unchanged at signup     | `verify-profile-email` edge function | ✅ |
| Realtime picks up new columns automatically       | ProfileContext channel subscription | ✅ |
| React Query cache invalidated on all mutations    | `useEmailTransition` hook callbacks | ✅ |
| Duplicate account merged on re-login | `merge_transitioned_account` RPC (migration 081) | ✅ |
| `handle_new_user` skips transitioned emails | Migration 081 trigger update | ✅ |
| Expired codes cleaned up automatically            | pg_cron job (migration 074) | ✅ |

---

## Implementation Files

| File | Purpose | Status |
| ---- | ------- | ------ |
| `src/lib/email-transition.ts` | Service layer (all Supabase RPC calls + auth.updateUser) | ✅ Complete |
| `src/hooks/useEmailTransition.ts` | React Query hook (query + 6 mutations) | ✅ Complete |
| `src/components/profile/EmailTransitionSettings.tsx` | Settings UI + role guard | ✅ Complete |
| `src/components/profile/PersonalEmailPrompt.tsx` | Home banner prompt | ✅ Complete |
| `src/types/profile.ts` | Type definitions (union type for status) | ✅ Complete |
| `src/contexts/ProfileContext.tsx` | Realtime + cache invalidation | ✅ Complete |
| `src/pages/AuthCallback.tsx` | Auth callback with transitioned email bypass | ✅ Complete |
| `supabase/migrations/*_072_*.sql` | Email transition schema + RPCs | ✅ Complete |
| `supabase/migrations/*_073_*.sql` | Verification codes table + RPCs | ✅ Complete |
| `supabase/migrations/*_074_*.sql` | pg_cron cleanup schedule | ✅ Complete |
| `supabase/migrations/*_075_*.sql` | DB-level role guards for RPCs | ✅ Complete |
| `supabase/migrations/*_076_*.sql` | Security hardening (brute-force, column guard) | ✅ Complete |
| `supabase/migrations/*_077_*.sql` | Complete 34-case verification matrix | ✅ Complete |
| `supabase/migrations/*_078_*.sql` | Auth-level support (transitioned lookup, trigger fix) | ✅ Complete |
| `src/pages/VerifyPersonalEmail.tsx` | Magic link landing page (auto-verifies from URL code) | ✅ Complete |
| `supabase/functions/send-verification-email/` | Edge Function for email delivery (OTP + magic link) | ✅ Complete |
| `supabase/migrations/*_079_*.sql` | Fix personal email conflict check for orphaned profiles | ✅ Complete |
| `supabase/migrations/*_081_*.sql` | Merge transitioned accounts (handle_new_user skip + merge RPC) | ✅ Complete |
