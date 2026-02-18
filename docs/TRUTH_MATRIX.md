<!-- markdownlint-disable MD013 MD060 -->
# Truth Matrix (Routes → Data → Supabase → Realtime)

**Last Updated:** February 15, 2026 (Saved Items theme + functionality hardening: home-theme integration, unsave actions for project/club cards, SEO metadata, React Query cache invalidation on unsave mutations.)

## Saved Items Hardening Audit (Feb 15, 2026)

| Route | Page / Surface | Data Sources | Tables | Realtime / Mutations | Status |
| ----- | -------------- | ------------ | ------ | -------------------- | ------ |
| `/saved` | `SavedItems` | React Query (`[saved-items, profileId]`) + `saved-api.getSavedItems` + `saved-api.toggleSaveItem` + Supabase realtime | `saved_items`, `posts`, `profiles`, `post_likes`, `comments`, `comment_likes`, `collab_projects`, `clubs` | ✅ Realtime on `saved_items` (user-scoped), `posts`, `post_likes`, `comments`, `comment_likes` + unsave mutations for all item types + React Query cache invalidation on every mutation + SEO metadata | ✅ FULLY FUNCTIONING |

### Mismatch Inventory (Resolved in this pass)

- ✅ Fixed missing `home-theme` wrapper: Page was rendering without the `home-theme bg-[#000000] text-white` wrapper used by all other authenticated pages, causing white background and broken theme variables.
- ✅ Fixed non-themed loading/error/access-denied states: All conditional render paths now wrapped in `home-theme`.
- ✅ Fixed missing SEO metadata: Added `<SEO>` component with title and description to all render paths.
- ✅ Fixed missing unsave action for projects/clubs: Added remove (X) button on project and club cards with `toggleSaveItem` mutation + toast feedback + cache invalidation.
- ✅ Fixed non-interactive project/club cards: Cards now navigate to project detail (`/projects?view=<id>`) and club detail (`/ecocampus/clubs/<id>`) on click.
- ✅ Fixed inconsistent card styling: Project and club cards now use `home-card-tier2` class matching the design system. Badge colors use explicit `bg-white/[0.08]` and `border-white/15` instead of relying on missing theme variables.
- ✅ Fixed TabsList styling: Tabs now use `bg-white/[0.06] border border-white/10` with explicit active state colors consistent with home-theme.
- ✅ Verified: All data reads come from Supabase `saved_items` table via `saved-api.ts` — no JSON blobs, no localStorage, no demo data.
- ✅ Verified: UUID validation enforced via `assertValidUuid` in all API paths. Invalid IDs cause hard errors.
- ✅ Verified: RLS policies on `saved_items` enforce user-scoped SELECT/INSERT/DELETE. Domain isolation enforced in application layer for cross-domain item access.
- ✅ Verified: Realtime subscriptions correctly scoped to user ID and invalidate React Query cache on any change.
- ✅ Verified: Page refresh preserves state (all data from Supabase, no local-only persistence).

## Home Feed Hardening Audit (Feb 15, 2026)

| Route | Page / Surface | Data Sources | Tables | Realtime / Mutations | Status |
| ----- | -------------- | ------------ | ------ | -------------------- | ------ |
| `/home` | `Home` + `PostCard` | React Query (`useInfiniteQuery` key `[home-feed, sortOrder]`) + `social-api.getPosts` + Supabase realtime | `posts`, `profiles`, `post_likes`, `comments`, `comment_likes`, `reposts`, `post_shares`, `saved_items`, `hidden_posts` | ✅ Realtime on all feed entities + predicate-based cache invalidation (`home-feed`, `feed-posts`) + hidden-posts filtered server-side | ✅ FULLY FUNCTIONING |
| `/post/:id` | `PostDetail` + `PostCard` | React Query (`getPostById`/`getPostByIdPublic`) + Supabase realtime | `posts`, `profiles`, `post_likes`, `comments`, `saved_items`, `post_shares` | ✅ Realtime subscriptions + PostCard navigation guard prevents reload loop when already on detail page | ✅ FULLY FUNCTIONING |
| `/saved` | `SavedItems` | React Query + `saved-api` + Supabase realtime | `saved_items`, `posts`, `post_likes`, `comments`, `collab_projects`, `clubs` | ✅ Realtime + unsave mutations + cache invalidation + home-theme integration + SEO | ✅ FULLY FUNCTIONING |

### Mismatch Inventory (Resolved — Home Feed pass)

- ✅ Fixed YouTube/Vimeo/external video embeds: `PostCard` now uses `ReactPlayer` for URLs that `ReactPlayer.canPlay()` supports, native `<video>` for direct uploads.
- ✅ Fixed document post rendering: `PostCard` now renders `post.documents` array with file icon, name, and download link.
- ✅ Fixed post-detail reload loop: `handleCardBodyClick` now checks `useLocation().pathname` and skips navigation when already on `/post/:id`.
- ✅ Fixed cache key mismatch: All optimistic updates (reaction, save, repost, share) use `queryClient.setQueriesData` with predicate matching any key containing `home-feed` or `feed-posts`.
- ✅ Fixed hidden posts not filtering: `getPosts()` in `social-api.ts` now fetches `hidden_posts` for the current user and excludes them from results.
- ✅ Fixed share count not updating: `ShareModal.onShared` now optimistically increments `shares_count` in feed cache.
- ✅ Disabled Video and Document buttons in `PostComposer` for beta (Photo remains active).

## Connected Count + Profile Completion Audit (Feb 14, 2026)

| Route | Page / Surface | Data Sources | Tables | Realtime / Mutations | Status |
| ----- | -------------- | ------------ | ------ | -------------------- | ------ |
| `/profile/:id?` | `Profile` + `ProfileHeader` | React Query (`getConnectionCount`) + `social-api` + Supabase realtime | `profiles`, `connections`, `posts`, `profile_views` | ✅ DB count query (`head: true`, exact) + realtime invalidation on `connections`/`posts`/`profile_views` + strict UUID route guard | ✅ FULLY FUNCTIONING |
| `/feed` | `Feed` network card | React Query (`getConnectionCount`) + Supabase realtime | `connections`, `profile_views` | ✅ DB count query + realtime invalidation on requester/receiver connection rows | ✅ FULLY FUNCTIONING |
| `/network` | `Network` tabs + mutations | React Query + `social-api` + Supabase realtime | `profiles`, `connections` | ✅ Mutations persist via normalized `connections`; realtime + invalidation now covers `network`, `profile-stats`, `connectedUsers` | ✅ FULLY FUNCTIONING |
| `/alumni-directory` | Alumni connect CTA | React Query + `social-api` + Supabase realtime | `profiles`, `alumni_profiles`, `connections` | ✅ Connection mutation persisted + realtime invalidation expanded to connected-count consumers | ✅ FULLY FUNCTIONING |
| `/home` | `TrendingAlumni` connect CTA | React Query + `social-api` + Supabase realtime | `profiles`, `connections` | ✅ Mutation + realtime invalidation now aligned with `profile-stats` and messaging contacts caches | ✅ FULLY FUNCTIONING |
| `/onboarding` | `Onboarding` profile write | Supabase upsert | `profiles`, role tables | ✅ Client no longer writes guessed completion (`50/70`); DB trigger computes canonical `profile_completion` | ✅ FULLY FUNCTIONING |
| `/club-onboarding` | `ClubOnboarding` profile write | Supabase upsert | `profiles`, `club_profiles`, `clubs` | ✅ Client no longer writes guessed completion (`50/70`); DB trigger computes canonical `profile_completion` | ✅ FULLY FUNCTIONING |
| Global profile state | `ProfileContext` | Supabase-only fetch/realtime | `profiles` | ✅ Removed localStorage profile hydration and client completion recompute; DB remains sole source of truth | ✅ FULLY FUNCTIONING |

### Mismatch Inventory (Resolved)

- ✅ Fixed frontend-derived completion drift in onboarding/profile state paths.
- ✅ Fixed stale cache paths where connection mutations did not invalidate all count/contact consumers.
- ✅ Fixed source-of-truth ambiguity by moving completion derivation to DB trigger (`public.set_profile_completion_from_row`).
- ✅ Connected counts remain DB `count` queries (not local array length) wherever used for user-facing metrics.

## Legend

| Status               | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| ✅ FULLY FUNCTIONING | Supabase is source of truth; mutations persist; cache invalidation correct; hard errors on invalid IDs |
| ⚠️ PARTIAL           | Works, but missing realtime, has weak persistence/invalidations, or relies on local-only/demo behavior |
| 🧪 DEMO / DISABLED   | UI-only or placeholder behavior; not fully backed by Supabase |
| ❌ BROKEN            | User-visible action claims to persist/do something but doesn't |

---

## Route → Page → Data Sources → Tables → Realtime / Mutations → Status

### Connections + Notifications Security Audit (RLS / Persistence / Realtime)

| Route | Page / Surface | Data Sources | Tables | Realtime / Mutations | Status |
| ----- | -------------- | ------------ | ------ | -------------------- | ------ |
| `/network` | `Network` | React Query + `social-api` + Supabase client | `profiles`, `connections` | ✅ Persisted connection mutations + realtime on requester/receiver rows + React Query invalidation | ✅ FULLY FUNCTIONING |
| `/profile/:id?` | `Profile` | ProfileContext + React Query + `social-api` | `profiles`, `connections`, `profile_views`, `posts` | ✅ Persisted send request + realtime status refresh + cache invalidation (`network`, `profile-stats`) | ✅ FULLY FUNCTIONING |
| `/profile/:id/connections` | `ProfileConnectionsPage` + `ProfileConnections` | `social-api` + Supabase Realtime + local UI state | `connections`, `profiles` | ✅ Uses hardened connection APIs only + persisted accept/reject/remove + realtime refresh + query invalidation | ✅ FULLY FUNCTIONING |
| Authenticated global navbar | `NotificationDropdown` | React Query + Supabase client | `notifications`, `connections` | ✅ User-scoped realtime + persisted read/delete/clear mutations + no client-side notification inserts | ✅ FULLY FUNCTIONING |

#### Mismatch Inventory (Resolved in this pass)

- ✅ Fixed connection privacy policy drift risk by enforcing participant-only SELECT predicate: `auth.uid() IN (requester_id, receiver_id)`.
- ✅ Fixed notification insert attack surface by removing direct client INSERT policies on `public.notifications`.
- ✅ Fixed live UI path split by refactoring `ProfileConnections` to use hardened `social-api` connection mutations.
- ✅ Fixed potential stale UX by preserving realtime listeners and explicit React Query invalidations after connection mutations.
- ✅ Hard-fail UUID validation retained/enforced in service paths used by this feature.

### Message Gating Hardening (Connected-only DM)

| Route | Page | Data Sources | Tables | Realtime / Mutations | Status |
| ----- | ---- | ------------ | ------ | -------------------- | ------ |
| `/profile/:id?` | `Profile` + `ProfileHeader` | ProfileContext + React Query + `social-api` | `profiles`, `connections` | ✅ Connection status synced via realtime + strict UI gate (`connectionStatus === connected`) + role bypass (`Alumni`/`Organization`) | ✅ FULLY FUNCTIONING |
| `/messaging` | `Messaging` | React Query + `messages-api` + Supabase client | `messages`, `profiles`, `connections` | ✅ URL partner deep-link now server-validated (`assertCanMessagePartner`) + send/read API guard enforces persisted connection gating | ✅ FULLY FUNCTIONING |

#### Message Gating Mismatch Findings (Resolved)

- ✅ Fixed UI mismatch: `ProfileHeader` previously rendered `Message` as enabled regardless of relationship state.
- ✅ Fixed navigation bypass: `/messaging?partner=<id>` now blocks non-connected targets for non-privileged roles.
- ✅ Fixed service-layer bypass: `sendMessage` and `getMessages` now hard-fail unless users are connected (or privileged role bypass).
- ✅ Fixed status normalization gap: profile view now maps `accepted` → `connected` before button gating.

### Realtime / Cache Privacy-Leak Remediation (Profiles/Posts)

| Route | Page | Data Sources | Tables | Realtime / Mutations | Status |
| ----- | ---- | ------------ | ------ | -------------------- | ------ |
| `/home` | `Home` | React Query + `social-api` + Supabase client | `posts`, `profiles`, `post_likes`, `comments`, `post_shares` | ✅ Realtime listeners + mutation invalidation; visibility now bounded by strict same-college RLS (or self/admin) | ✅ FULLY FUNCTIONING |
| `/profile/:id?` | `Profile` | ProfileContext + `getProfileById` + React Query | `profiles`, `profile_*`, `posts` | ✅ User/domain-scoped realtime + strict route UUID validation; no global profile stream exposure | ✅ FULLY FUNCTIONING |
| `/portfolio/editor` | `PortfolioEditor` | React Query + Supabase client | `profiles`, `profile_education`, `profile_experience`, `profile_skills`, `profile_projects`, `posts` | ✅ User-scoped realtime filters (`id=eq.<uid>`, `user_id=eq.<uid>`) + persisted writes + query invalidation | ✅ FULLY FUNCTIONING |
| `/ecocampus` | `Requests`, `SharedItems` | React Query + Supabase realtime | `item_requests`, `shared_items`, `item_request_responses`, `shared_item_intents`, `profiles` | ✅ `profiles` realtime now domain-scoped (`college_domain=eq.<domain>`) + UUID hard-fail before user-scoped subscriptions | ✅ FULLY FUNCTIONING |

#### EcoCampus Connection Gate Fix (Feb 15, 2026)

- ✅ Fixed: Contact/Buy/Rent buttons in `SharedItems` and "I Have This" button in `Requests` were **broken** because they used `sendMessage()` from `messages-api.ts`, which enforces a connection gate (`assertCanMessagePartner` → requires `connections.status = accepted`). Marketplace users typically don't have prior connections.
- ✅ Fixed: Created `sendEcoCampusMessage()` in `ecocampus-api.ts` that inserts into `messages` directly, bypassing the connection gate while still enforcing same-college domain isolation. RLS on `messages` already enforces `sender_id = auth.uid()` and same-college `college_domain` checks.
- ✅ Fixed: `SharedItems.tsx` and `Requests.tsx` now import `sendEcoCampusMessage` from `ecocampus-api` instead of `sendMessage` from `messages-api`.
- ✅ Verified: Intent/response creation + message send + rollback-on-failure flow is intact.
- ✅ Verified: No demo data, no JSON blobs, no fake IDs, no local-only persistence.
- ✅ Verified: Realtime subscriptions are correct and scoped (shared_items, item_requests, profiles by college_domain, intents/responses by user ID).
- ✅ Verified: React Query cache invalidation fires on every mutation settle.

#### Mismatch Inventory (Current)

- ✅ Fixed: permissive/stale SELECT policy name drift is now handled by deterministic drop-all-select-policies migration for `profiles`/`posts` before recreating strict policies.
- ✅ Fixed: realtime privacy leak path (`profiles` global stream under permissive RLS) is closed by strict select predicates (self/same-college/admin only).
- ✅ Fixed: manager governance enforced at DB write layer (`posts` INSERT/UPDATE/DELETE blocked for `role = manager`).
- ✅ Fixed: EcoCampus broad `profiles` realtime listeners are now college-domain scoped instead of table-wide.
- ✅ Fixed: UUID hard-fail added for EcoCampus user-scoped realtime channels.
- ⚠️ Intentional architecture (not a bug): portfolio settings remain persisted in `profiles.social_links` JSONB (`src/lib/portfolio-api.ts`) per current schema phase; not local-only and still Supabase-persisted.

### Connection Request Race Condition Audit (Feb 14, 2026)

| Route | Page | Data Sources | Tables | Realtime / Mutations | Status |
| ----- | ---- | ------------ | ------ | -------------------- | ------ |
| `/network` | `Network` | React Query + `social-api` + Supabase client | `profiles`, `connections` | ✅ Realtime subscriptions on `connections` requester/receiver + mutation invalidation on send/accept/reject | ✅ FULLY FUNCTIONING |
| `/profile/:id?` | `Profile` | `getProfileById` + `social-api` (`sendConnectionRequest`, `checkConnectionStatus`) + React Query | `profiles`, `connections`, `profile_views`, `posts` | ✅ Connection send persists + stats/query invalidation + realtime connection-status sync on table changes | ✅ FULLY FUNCTIONING |
| `/profile/:id/connections` | `ProfileConnectionsPage` + `ProfileConnections` | `profile-api` + Supabase Realtime | `connections`, `profiles` | ✅ Persisted remove/accept/reject + realtime refresh + query invalidation (`network`, `profile-stats`) + self-only route enforcement | ✅ FULLY FUNCTIONING |
| `/admin/talent-graph` | `AdminTalentGraph` | `useAdminTalentGraph` + React Query + Supabase | `profiles`, `connections`, `admin_talent_edges`, related graph tables | ✅ Realtime invalidation on `connections`; accepted-only edge projection | ✅ FULLY FUNCTIONING |
| `/admin/users` | `AdminUsers` | `useAdminUsers` + React Query + Supabase | `profiles`, `posts`, `connections`, `profile_skills` | ✅ Realtime invalidation on `connections`; accepted-only connection count projection | ✅ FULLY FUNCTIONING |

#### Connection Feature Mismatch Findings (Resolved)

- ✅ Fixed DB race window: added canonical pair uniqueness (`LEAST(requester_id, receiver_id)`, `GREATEST(requester_id, receiver_id)`) so opposite-direction concurrent inserts cannot create duplicate logical relationships.
- ✅ Fixed governance mismatch: connection review (`accepted` / `rejected`) is now receiver-only at RLS + trigger layers; requester cannot approve/reject their own request.
- ⚠️ Service-layer duplication remains (`social-api` and `profile-api` both touch `connections`); logic is consistent for this feature path, but API ownership is still split.
- ✅ Fixed silent mutation success: status update/delete APIs now hard-fail if no row was affected.
- ✅ Fixed conflict handling: send path now handles DB unique conflicts (`23505`) and returns deterministic business errors.
- ✅ Added deterministic status resolution in multi-row edge cases while existing data is being normalized.

#### Deprecated / Demo / Non-persisted Surface Check (Connections)

- ✅ No connection writes to JSON blobs or local-storage state.
- ✅ No fake IDs for connection mutations.
- ✅ No demo fallback persistence in network/profile connection actions.
- ✅ Removed route/RLS mismatch by enforcing `/profile/:id/connections` as self-only in UI.

### Private Profile Visibility Audit (RLS + Realtime)

| Route | Page | Data Sources | Tables | Realtime / Mutations | Status |
| ----- | ---- | ------------ | ------ | -------------------- | ------ |
| `/settings` | `Settings` | `useUserSettings` + React Query + Supabase Realtime | `user_settings` | ✅ Persisted visibility mutation (`profile_visibility`) + user-scoped realtime + cache invalidation | ✅ FULLY FUNCTIONING |
| `/profile/:id?` | `Profile` | `getProfileById` + ProfileContext + React Query | `profiles`, `user_settings`, `connections`, `profile_projects`, `profile_education`, `profile_experience`, `profile_skills`, `profile_achievements`, `profile_certifications`, `posts` | ✅ RLS `can_view_profile()` enforcement + realtime refresh on visibility changes (`user_settings` trigger touches `profiles.updated_at`) + hard unavailable state on access revocation | ✅ FULLY FUNCTIONING |
| `/profile/:id/connections` | `ProfileConnectionsPage` | `profile-api` + Supabase Realtime | `connections`, `profiles` | ✅ Connection mutations persist + realtime subscriptions + network/profile cache invalidation | ✅ FULLY FUNCTIONING |
| `/network` | `Network` | React Query + `social-api` + Supabase client | `profiles`, `connections` | ✅ Profiles list now filtered by enforced RLS visibility; realtime + mutation invalidation retained | ✅ FULLY FUNCTIONING |
| `/alumni-directory` | `AlumniDirectory` | React Query + Supabase client | `profiles`, `alumni_profiles`, `connections` | ✅ Visibility-constrained profile reads through RLS + existing mutation invalidation | ✅ FULLY FUNCTIONING |

#### Private Visibility Mismatch Findings & Fixes (Implemented)

- ✅ Fixed backend mismatch where `profile_visibility` existed but was not part of profile SELECT authorization.
- ✅ Removed effective API bypass by enforcing visibility in RLS using accepted `connections` membership for `connections`-only profiles.
- ✅ Extended visibility enforcement to profile detail tables so private profile data cannot be read through side tables.
- ✅ Added trigger-based realtime propagation for visibility flips (`user_settings` update now bumps `profiles.updated_at`).
- ✅ Updated profile viewer realtime handling to clear stale profile state when access is revoked.
- ✅ Strengthened profile loading safety: related-table fetch failures now hard-fail instead of silently returning partial data.

### Profiles/Posts Isolation Audit (Global RLS Bypass)

| Route | Page | Data Sources | Tables | Realtime / Mutations | Status |
| ----- | ---- | ------------ | ------ | -------------------- | ------ |
| `/home` | `Home` | React Query + `social-api` + Supabase client | `posts`, `profiles`, `post_likes`, `comments`, `comment_likes`, `saved_items` | ✅ Realtime subscriptions on feed entities + create/engage mutations + query invalidation | ✅ FULLY FUNCTIONING |
| `/post/:id` | `PostDetail` | React Query + `getPostById`/`getPostByIdPublic` | `posts`, `profiles`, `post_likes`, `comments`, `comment_likes`, `saved_items` | ✅ Realtime subscriptions + mutation-triggered invalidation; UUID hard validation at route | ⚠️ PARTIAL (cross-college and most unauthenticated reads now blocked by domain RLS by design) |
| `/profile/:id?` | `Profile` | ProfileContext + `getProfileById` + React Query | `profiles`, `profile_projects`, `profile_education`, `profile_experience`, `profile_skills`, `posts`, `connections`, `profile_views` | ✅ Realtime on profile/stats tables + persisted mutations; strict UUID validation for route id | ✅ FULLY FUNCTIONING |
| `/profile/:id/connections` | `ProfileConnectionsPage` | ProfileContext + `ProfileConnections` | `profiles`, `connections` | ✅ Persisted connection mutations via API + UUID route hard-fail | ✅ FULLY FUNCTIONING |
| `/network` | `Network` | React Query + Supabase client + `social-api` | `profiles`, `connections` | ✅ Domain-scoped reads + realtime invalidation + mutation invalidation | ✅ FULLY FUNCTIONING |
| `/portfolio/:slug` | `Portfolio` | React Query + `portfolio-api` (profiles-backed) | `profiles`, `profile_education`, `profile_experience`, `profile_skills`, `profile_projects`, `posts` | Read-only page; no realtime required | ⚠️ PARTIAL (public cross-college access reduced by strict profile domain isolation; requires authenticated same-college/admin visibility unless profile row is domain-null) |

### Profile Posts Crash + Persistence Audit (Feb 14, 2026)

| Route | Page | Data Sources | Tables | Realtime / Mutations | Status |
| ----- | ---- | ------------ | ------ | -------------------- | ------ |
| `/profile/:id?` | `Profile` + `ProfilePosts` | React Query (`getPostsByUser`) + Supabase client | `posts`, `post_likes`, `profiles`, `saved_items` | ✅ Realtime on `posts` (scoped by `user_id`) + `post_likes`; post creation persists to `posts`; cache invalidation on mutate | ✅ FULLY FUNCTIONING |
| `/portfolio/editor` | `PortfolioEditor` + `usePortfolioEditor` | React Query + Supabase client + adapter layer | `profiles`, `profile_education`, `profile_experience`, `profile_skills`, `profile_projects`, `posts` | ✅ Realtime on `profiles`, `profile_*`, `posts`; profile/profile_* mutations persisted with hard-fail errors; query invalidation for profile/post keys | ✅ FULLY FUNCTIONING |
| `/portfolio/:slug` | `Portfolio` | `portfolio-api` + adapter projections | `profiles`, `profile_*`, `posts` | Read-only render from persisted rows only | ✅ FULLY FUNCTIONING |

#### Mismatch Findings & Fixes (Implemented)

- ✅ Fixed schema mismatch in `usePortfolioEditor`: posts query now uses `posts.user_id` (removed stale `author_id` reference).
- ✅ Removed non-persisted local posts lifecycle in `PortfolioEditor` (`add/update/remove` with fake `Date.now()` IDs).
- ✅ Enforced DB truth: portfolio posts section is now read-only projection of persisted `posts` rows.
- ✅ Added realtime invalidation for portfolio editor when `posts` rows change for the current user.
- ✅ Strengthened mutation safety in `usePortfolioEditor`: delete/insert errors for `profile_education`, `profile_experience`, `profile_skills`, and `profile_projects` now hard-fail and block false "Saved" success.
- ✅ Enforced hard UUID failures in portfolio editor fetch/save path via `assertValidUuid(userId, "userId")`.


### Core Routes

| Route       | Page     | Data Sources                       | Tables                                                   | Realtime / Mutations                                 | Status               |
| ----------- | -------- | ---------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- | -------------------- |
| `/home`     | Home     | React Query + Supabase client      | `posts`, `profiles`, `post_likes`, `comments`, `comment_likes` | ✅ Realtime (scoped) + mutations + cache invalidation | ✅ FULLY FUNCTIONING |
| `/post/:id` | PostDetail | React Query + Supabase client    | `posts`, `post_likes`, `comments`, `comment_likes`, `saved_items` | ✅ Realtime (scoped) + mutations + cache invalidation | ✅ FULLY FUNCTIONING |
| `/network`  | Network  | React Query + Supabase client      | `profiles`, `connections`                                | ✅ Realtime + mutations + cache invalidation         | ✅ FULLY FUNCTIONING |
| `/search`   | Search (deprecated) | Redirect to `/home`         | None                                                     | None                                                 | 🧪 DEMO / DISABLED |
| `/messaging`| Messaging| React Query + Supabase Realtime    | `messages`, `profiles`, `connections`                    | ✅ Full realtime (optimistic cache updates) + RPC + mutations + unread count | ✅ FULLY FUNCTIONING |
| `/profile`  | Profile  | ProfileContext + React Query       | `profiles`, `profile_*`, role-specific tables            | ✅ Realtime + mutations + cache invalidation         | ✅ FULLY FUNCTIONING |
| `/settings` | Settings | ProfileContext + React Query hooks | `user_settings`, `push_subscriptions`, `profiles`        | ✅ Realtime + mutations + cache invalidation         | ✅ FULLY FUNCTIONING |
| `/saved`    | Saved    | React Query + Supabase client      | `saved_items`, `posts`, `collab_projects`                | ✅ Realtime + mutations + cache invalidation         | ✅ FULLY FUNCTIONING |
| `/onboarding` | Onboarding | Supabase Auth + direct DB     | `profiles`, `student_profiles`, `alumni_profiles`, `faculty_profiles` | ✅ Upsert + role-specific creation + cache invalidation + autocomplete submit guard + role-aware interests entry | ✅ FULLY FUNCTIONING |

### Global UI Surfaces

| Surface           | Feature           | Data Sources                  | Tables                     | Realtime / Mutations                 | Status               |
| ----------------- | ----------------- | ----------------------------- | -------------------------- | ------------------------------------ | -------------------- |
| Navbar (all pages) | Typeahead Search  | React Query + Supabase client | `profiles`, `events`       | No realtime (intentional), no mutations | ✅ FULLY FUNCTIONING |
| Home Feed         | PersonalEmailPrompt | React Query + Supabase RPC  | `profiles` (personal_email cols) | ✅ Realtime via ProfileContext + cache invalidation | ✅ FULLY FUNCTIONING |

### Notification Security & Persistence Audit

| Route | Page / Surface | Data Sources | Tables / Functions | Realtime / Mutations | Status |
| ----- | -------------- | ------------ | ------------------ | -------------------- | ------ |
| `/home` | `Layout` navbar notification bell (`NotificationDropdown`) | React Query + Supabase client + auth session | `notifications`, `connections` | ✅ User-scoped realtime (`postgres_changes`) + persisted read/delete mutations + strict UUID guardrails | ✅ FULLY FUNCTIONING |
| `/network` | `Network` + navbar notification actions | `social-api` + React Query + Supabase | `connections`, `notifications` | ✅ Connection accept/reject persists and notification is marked read with cache invalidation | ✅ FULLY FUNCTIONING |
| `/messaging` | `Messaging` + navbar notification bell | React Query + Supabase Realtime + trigger pipeline | `messages`, `notifications`, `create_notification()` (trigger path) | ✅ Message insert trigger creates persisted notifications; dropdown realtime refreshes across routes | ✅ FULLY FUNCTIONING |
| `/projects` | `Projects` (team-up/applications) + navbar notification bell | React Query + Supabase trigger functions | `notifications`, `collab_project_applications`, `team_up_requests` | ✅ Server-side notification generation through DB functions/triggers; no client-side notification inserts | ✅ FULLY FUNCTIONING |
| `/settings` | `Settings` (notification preferences only) | React Query + user settings services | `user_settings`, `push_subscriptions` | ✅ Persisted preference toggles; no writes to `notifications` table | ✅ FULLY FUNCTIONING |
| `All authenticated routes` | Global `Navbar` mount | React Query cache + auth listener | `notifications` | ✅ Cache keys are user-scoped and cleared on logout to prevent cross-session leakage | ✅ FULLY FUNCTIONING |

#### Notification Mismatch Findings (Post-Fix)

- ✅ No notification UI writes to JSON blobs or demo data; writes go to normalized tables only.
- ✅ No local-only fake notification lifecycle remains; source of truth is `public.notifications`.
- ✅ Realtime subscription exists and is user-filtered (`user_id=eq.<auth uid>`).
- ✅ Notification mutations invalidate React Query cache after every write path.
- ✅ Direct cross-user insert spoofing path removed by RLS policy hardening + function execute revocation.

### Onboarding UX Hardening (Detailed)

| Component | Source of Truth | Realtime | Cache Invalidation / Sync | Guardrails | Status |
| --------- | --------------- | -------- | ------------------------- | ---------- | ------ |
| `Autocomplete` in forms | Controlled React state + form field state | N/A (UI behavior) | N/A | ✅ Trigger button `type="button"`; Enter key prevented from submitting parent form | ✅ FULLY FUNCTIONING |
| Onboarding role-based interests | `profiles.interests` through onboarding upsert | ✅ via ProfileContext after onboarding completion | ✅ identity/profile query invalidation + `refreshProfile()` | ✅ Staff/Dean/Principal manual entry; Student/Alumni guided chip selection; minimum-interest validation preserved | ✅ FULLY FUNCTIONING |
| Select/Popover/Command dark-surface alignment | Shared UI component classes | N/A (UI style system) | N/A | ✅ Removed token-driven accent/blue fallback surfaces; aligned to platform black glass styles | ✅ FULLY FUNCTIONING |

### Profile Avatar Lifecycle (Detailed)

| Component | Source of Truth | Realtime | Cache Invalidation / Sync | Guardrails | Status |
| --------- | --------------- | -------- | ------------------------- | ---------- | ------ |
| ProfileHeader avatar actions (`View / Edit / Remove`) | `profiles.avatar_url` + Supabase Storage (`avatars`) | ✅ via profile channel (`profiles` table subscription) | ✅ `updateProfile()` path + ProfileContext/query invalidations | ✅ File type/size validation + owner-only mutations | ✅ FULLY FUNCTIONING |
| `uploadProfileAvatar(file, userId)` | Supabase Storage upload + public URL | N/A (mutation) | ✅ profile update propagates via realtime | ✅ Retry logic + bucket existence errors + MIME checks | ✅ FULLY FUNCTIONING |
| `removeProfileAvatar(avatarUrl)` | Supabase Storage remove by parsed path | N/A (mutation) | ✅ profile update (`avatar_url = null`) propagates via realtime | ✅ No-op for empty/invalid URL; typed error on hard failure | ✅ FULLY FUNCTIONING |
| `Profile.tsx` avatar remove flow | Supabase mutation (`profiles.avatar_url = null`) | ✅ reflected by profile channel | ✅ local state sync + context update | ✅ owner check + destructive error toasts | ✅ FULLY FUNCTIONING |

#### Avatar Audit Notes

- Avatar selection state is never source-of-truth; DB `profiles.avatar_url` remains authoritative.
- UI now exposes explicit user-visible operations: view, edit/upload, remove.
- On new upload, previous avatar file cleanup is attempted best-effort to limit orphaned storage growth.
- Known architectural limit: historical orphan files cannot be fully guaranteed eliminated without a server-side lifecycle job or DB-backed file index.

### Role Badges (User Roles)

| Route | Page / Surface | Data Sources | Tables | Realtime / Mutations | Status |
| ----- | -------------- | ------------ | ------ | -------------------- | ------ |
| `/home` | Home feed + comments + share | React Query + ProfileContext | `profiles`, `posts`, `comments`, `connections` | ✅ Feed realtime + profile-domain subscription + cache invalidation | ✅ FULLY FUNCTIONING |
| `/post/:id` | PostDetail (auth + public) | React Query + Supabase client | `profiles`, `posts`, `comments` | ✅ Post/comment realtime + profile-domain subscription | ✅ FULLY FUNCTIONING |
| `/network` | Network (discover/requests/connections) | React Query + Supabase client | `profiles`, `connections` | ✅ Profile-domain subscription + connection mutations | ✅ FULLY FUNCTIONING |
| `/events` | Events list + organizer | React Query + Supabase client | `events`, `profiles` | ✅ Mutations + profile-domain subscription | ✅ FULLY FUNCTIONING |
| `/event/:id` | Event detail + public card | React Query + Supabase client | `events`, `profiles` | ✅ Mutations + profile-domain subscription | ✅ FULLY FUNCTIONING |
| `/mentorship` | Mentorship (enhanced) | React Query + useMentorship hook | `mentorship_offers` (help_type, commitment_level, is_paused, last_active_at, avg_response_hours, total_requests_received, total_requests_accepted, total_requests_ignored, total_mentees_helped), `mentorship_requests` (accepted_at, completed_at, responded_at, auto_expired, suggested_mentor_id, mentee_feedback, mentor_feedback), `profiles`, `alumni_profiles`, `connections`, `messages`, `notifications` | ✅ 6 realtime channels (domain offers/requests/profiles + user mentee/mentor + connection blocks) + upsert offers + request/accept/reject/cancel/complete/feedback/reject-with-suggestion mutations + DB triggers for auto-connect + auto-message + auto-notify + mentee count sync + SLA metric update + request count tracking + auto-expiry (Edge Function) + block-cancel trigger + slot overflow guard + duplicate prevention (unique index) + role-transition history visibility + soft highlights + project bridge CTA + cache invalidation | ✅ FULLY FUNCTIONING |
| `/projects` | Project owner card | React Query + Supabase client | `collab_projects`, `profiles` | ✅ Mutations + profile-domain subscription | ✅ FULLY FUNCTIONING |
| `/profile/:id` | Profile header + connections | ProfileContext + React Query | `profiles`, `connections` | ✅ Profile realtime + cache invalidation | ✅ FULLY FUNCTIONING |

### Feature Routes (Permission-Gated)

| Route              | Page            | Data Sources                  | Tables                                                               | Realtime / Mutations                                    | Status               |
| ------------------ | --------------- | ----------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------- | -------------------- |
| `/jobs`            | Jobs            | React Query + Supabase client | `jobs`, `job_applications`, `job_saves`, `profiles`                  | ✅ Realtime + mutations + cache invalidation            | ✅ FULLY FUNCTIONING |
| `/jobs/:id`        | JobDetail       | React Query + Supabase client | `jobs`, `job_applications`, `profiles`                               | ✅ Realtime + mutations + cache invalidation            | ✅ FULLY FUNCTIONING |
| `/mentorship`      | Mentorship (enhanced) | React Query + useMentorship hook | `mentorship_offers` (help_type, commitment_level, is_paused, last_active_at, avg_response_hours, total_requests_received, total_requests_accepted, total_requests_ignored, total_mentees_helped), `mentorship_requests` (accepted_at, completed_at, responded_at, auto_expired, suggested_mentor_id, mentee_feedback, mentor_feedback), `profiles`, `alumni_profiles`, `connections`, `messages`, `notifications` | ✅ 6 realtime channels (domain offers/requests/profiles + user mentee/mentor + connection blocks) + upsert offers + request/accept/reject/cancel/complete/feedback/reject-with-suggestion mutations + DB triggers for auto-connect + auto-message + auto-notify + mentee count sync + SLA metric update + request count tracking + auto-expiry (Edge Function) + block-cancel trigger + slot overflow guard + duplicate prevention (unique index) + role-transition history visibility + soft highlights + project bridge CTA + cache invalidation | ✅ FULLY FUNCTIONING |
| `/skill-analysis`  | SkillAnalysis   | React Query + Supabase RPCs   | `skill_analysis`, `profile_skills`, `jobs`                           | ✅ Realtime + RPC mutations + cache invalidation        | ✅ FULLY FUNCTIONING |
| `/projects`        | Projects        | React Query + Supabase client | `collab_projects`, `collab_project_roles`, `collab_team_members`     | ✅ Realtime + mutations + cache invalidation            | ✅ FULLY FUNCTIONING |
| `/projects?mode=team-ups` | Projects (Team-Ups) | React Query + Supabase Realtime | `team_ups`, `team_up_members`, `team_up_requests`, `team_up_role_definitions`, `notifications` | ✅ Full realtime + mutations + request inbox + notifications | ✅ FULLY FUNCTIONING |
| `/clubs`           | Clubs           | React Query + Supabase client | `profiles` (role='Club'), `connections`                              | ✅ Realtime + mutations + cache invalidation            | ✅ FULLY FUNCTIONING |
| `/events`          | Events          | useState + Supabase client    | `events`, `event_registrations`, `profiles` (role='Club')            | ✅ Realtime + mutations + cache invalidation            | ✅ FULLY FUNCTIONING |
| `/event/:id`       | EventDetail     | React Query + Supabase client | `events`, `event_registrations`, `event_shares`, `profiles`          | ✅ Realtime + mutations + share tracking                | ✅ FULLY FUNCTIONING |
| `/alumni-invite` | AlumniInvite  | `useAlumniInviteClaim` → Supabase RPCs | `alumni_invites`, `auth.users`                   | ✅ Token validate + accept + dispute RPCs + auth OTP/password | ✅ FULLY FUNCTIONING |
| `/admin/alumni-invites` | AdminAlumniInvites | React Query + Supabase RPCs + Realtime | `alumni_invites`, `colleges`, `platform_admins` | ✅ Realtime subscription + RPC mutations + cache invalidation | ✅ FULLY FUNCTIONING |
| `/alumni-directory`| AlumniDirectory | React Query + Supabase client | `profiles`, `alumni_profiles`, `connections`                         | ✅ Realtime + mutations + cache invalidation            | ✅ FULLY FUNCTIONING |
| `/ecocampus`       | EcoCampus       | React Query + Supabase client | `shared_items`, `item_requests`, `shared_item_intents`, `item_request_responses`, `profiles`, `messages` | ✅ Realtime (`postgres_changes`) + persisted mutations + `sendEcoCampusMessage` (connection-gate-free marketplace messaging) + post-mutation invalidation + UUID hard-fail checks | ✅ FULLY FUNCTIONING |
| `/help`            | Help            | React Query + Supabase client | `support_tickets`                                                    | ✅ Mutations + cache invalidation                       | ✅ FULLY FUNCTIONING |

### EcoCampus Feature Surface Audit (Route → Page → Data Sources → Tables → Realtime / Mutations → Status)

| Route | Page | Data Sources | Tables | Realtime / Mutations | Status |
| ----- | ---- | ------------ | ------ | -------------------- | ------ |
| `/ecocampus` | `EcoCampus` shell tabs | Local tab state + feature guards + child React Query hooks | N/A (composition only) | No local persistence; delegates to Supabase-backed children | ✅ FULLY FUNCTIONING |
| `/ecocampus` | `SharedItems` (`src/components/ecocampus/SharedItems.tsx`) | React Query (`fetchSharedItems`, `fetchSharedItemIntents`) + Supabase Realtime + `sendEcoCampusMessage` | `shared_items`, `shared_item_intents`, `profiles`, `messages` | ✅ Realtime on `shared_items`, `profiles`, `shared_item_intents`; ✅ persisted intent insert + marketplace message (bypasses connection gate); ✅ rollback on failure; ✅ cache invalidation on settled | ✅ FULLY FUNCTIONING |
| `/ecocampus` | `Requests` (`src/components/ecocampus/Requests.tsx`) | React Query (`fetchRequests`, `fetchItemRequestResponses`) + Supabase Realtime + `sendEcoCampusMessage` | `item_requests`, `item_request_responses`, `profiles`, `messages` | ✅ Realtime on `item_requests`, `profiles`, `item_request_responses`; ✅ persisted response insert + marketplace message (bypasses connection gate); ✅ rollback on failure; ✅ cache invalidation on settled | ✅ FULLY FUNCTIONING |
| `/ecocampus` | `MyListings` (`src/components/ecocampus/MyListings.tsx`) | React Query + Supabase Realtime + mutation APIs | `shared_items`, `item_requests` | ✅ Realtime scoped to `user_id`; ✅ persisted update/delete/toggle mutations + query invalidation | ✅ FULLY FUNCTIONING |
| `/ecocampus` | `NewPostDialog` (`src/components/ecocampus/NewPostDialog.tsx`) | React Hook Form + mutation APIs + Supabase Storage upload | `shared_items`, `item_requests`, storage bucket `shared-items` | ✅ persisted create mutations + query invalidation; image upload stored in Supabase storage | ✅ FULLY FUNCTIONING |

### Public Routes (No Auth Required)

| Route              | Page            | Data Sources                  | Tables                                                               | Realtime / Mutations                                    | Status               |
| ------------------ | --------------- | ----------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------- | -------------------- |
| `/portfolio/:slug` | Portfolio       | React Query + Supabase client | `profiles`, `profile_education`, `profile_experience`, `profile_skills`, `profile_projects`, `posts` (`social_links` jsonb → `_portfolio` key) | No realtime (public read-only page), no mutations       | ✅ FULLY FUNCTIONING |

### Auth Routes

| Route              | Page               | Data Sources                  | Tables                        | Realtime / Mutations                            | Status               |
| ------------------ | ------------------ | ----------------------------- | ----------------------------- | ----------------------------------------------- | -------------------- |
| `/login`           | Login              | Supabase Auth                 | `auth.users`                  | ✅ OAuth redirect + session management + **merge info banner (location.state)** | ✅ FULLY FUNCTIONING |
| `/signup`          | Signup             | Supabase Auth                 | `auth.users`                  | ✅ OAuth + Magic Link + academic validation     | ✅ FULLY FUNCTIONING |
| `/auth/callback`   | AuthCallback       | Supabase Auth + profiles + platform_admins | `auth.users`, `profiles`, `platform_admins` | ✅ PKCE exchange + profile check + domain sync + transitioned email bypass + **platform admin bypass (edu-mail exemption + admin redirect + auto-profile creation)** + **duplicate account merge (RPC 083: merge audit guard, sync efficiency, row locking, data safety checks, atomic identity UPDATE, bypass flag ordering)** — **localStorage('isAuthenticated') removed; Supabase session is sole auth state** | ✅ FULLY FUNCTIONING |
| `/forgot-password` | ForgotPassword     | Supabase Auth (`resetPasswordForEmail`) | `auth.users` | ✅ Sends recovery email with redirect to `/update-password` | ✅ FULLY FUNCTIONING |
| `/update-password` | UpdatePassword     | Supabase Auth (`updateUser`, `PASSWORD_RECOVERY` event) | `auth.users` | ✅ Listens for `PASSWORD_RECOVERY` + `SIGNED_IN` events, 5s timeout fallback, signs out after update | ✅ FULLY FUNCTIONING |
| `/verify-email`    | VerifyEmail        | Supabase Auth                 | —                             | ✅ Redirect-only                                | ✅ FULLY FUNCTIONING |
| `/verify-personal-email` | VerifyPersonalEmail | Supabase RPC (`verify_personal_email_code`) + React Query | `profiles`, `email_verification_codes` | ✅ Auto-verify from URL code + cache invalidation | ✅ FULLY FUNCTIONING |

### Auth — PASSWORD_RECOVERY Event Handling

The `PASSWORD_RECOVERY` event is fired by Supabase when a user clicks a password-reset link from email. Three components listen for this event to ensure the redirect works regardless of which layout is active:

| Component          | Listener Location                 | Action                                           | Status               |
| ------------------ | --------------------------------- | ------------------------------------------------ | -------------------- |
| `GlobalAuthListener` (App.tsx) | Top-level inside `<BrowserRouter>` | `navigate('/update-password', { replace: true })` | ✅ FULLY FUNCTIONING |
| `Layout.tsx`       | `onAuthStateChange` in `useEffect` | `navigate('/update-password', { replace: true })` | ✅ FULLY FUNCTIONING |
| `PublicLayout.tsx`  | `onAuthStateChange` in `useEffect` | `navigate('/update-password', { replace: true })` | ✅ FULLY FUNCTIONING |

### Auth — Email Transition & OTP Flow

Architecture: Client → RPC `generate_email_verification_code` (returns code + cooldown) → Client → Edge Function `send-verification-email` (sends code via Resend) → User email inbox

| Component                          | Source of Truth                              | Tables / RPCs                                     | Status               |
| ---------------------------------- | -------------------------------------------- | ------------------------------------------------- | -------------------- |
| `requestPersonalEmailLink()`       | `email-transition.ts`                        | RPC `request_personal_email_link`, RPC `generate_email_verification_code`, Edge Function `send-verification-email` | ✅ FULLY FUNCTIONING |
| `resendVerificationCode()`         | `email-transition.ts`                        | RPC `generate_email_verification_code`, Edge Function `send-verification-email` | ✅ FULLY FUNCTIONING |
| `verifyPersonalEmail()`            | `email-transition.ts`                        | RPC `verify_personal_email_code`                  | ✅ FULLY FUNCTIONING |
| `transitionToPersonalEmail()`      | `email-transition.ts`                        | RPC `transition_to_personal_email`, Supabase Auth `updateUser` | ✅ FULLY FUNCTIONING |
| `mergeTransitionedAccount()`       | `email-transition.ts`                        | RPC `merge_transitioned_account`                  | ✅ FULLY FUNCTIONING |
| `EmailTransitionSettings` (UI)     | `src/components/profile/`                    | All above + React Query `email-transition-status` key | ✅ FULLY FUNCTIONING |
| `/settings` (Account tab, pw reset) | `Settings.tsx`                               | Supabase Auth `resetPasswordForEmail` — uses `personal_email` for transitioned users | ✅ FULLY FUNCTIONING |
| `/settings` (Account tab, delete)  | `Settings.tsx` → `useDeleteAccount` → `lib/account.ts` → Edge Function `delete-account` | `account_deletion_audit` table, `handle_user_deletion` trigger, `auth.admin.deleteUser` | ✅ FULLY FUNCTIONING (106: schema fix + local signOut) |
| Migration 105 (OTP code return)    | `20260213120000_105_fix_email_verification_code_flow.sql` | Restores `code` + `cooldown_seconds` in RPC response (reverts CB-2 break from mig 103) | ✅ FULLY FUNCTIONING |
| Migration 114 (public domain guard) | `20260220000000_114_fix_email_transition_public_domain_guard.sql` | Fixes over-hardened public domain guard blocking Gmail transitions. Supersedes 103/107/109 for 4 functions: `block_public_domain_profile`, `sync_profile_email`, `transition_to_personal_email`, `merge_transitioned_account` | ✅ FULLY FUNCTIONING |

### Admin Routes

| Route              | Page               | Data Sources                  | Tables                        | Realtime / Mutations                            | Status               |
| ------------------ | ------------------ | ----------------------------- | ----------------------------- | ----------------------------------------------- | -------------------- |
| `/admin`           | AdminDashboard     | React Query + Supabase RPCs   | `platform_admins`, views      | ✅ Realtime + cache invalidation                | ✅ FULLY FUNCTIONING |
| `/admin/users`     | AdminUsers         | React Query + Supabase client | `profiles`, `user_settings`   | ✅ Mutations + cache invalidation               | ✅ FULLY FUNCTIONING |
| `/admin/colleges`  | AdminColleges      | React Query + Supabase client | `admin_colleges_*` views      | ✅ Mutations + cache invalidation               | ✅ FULLY FUNCTIONING |
| `/admin/settings`  | AdminSettings      | React Query + Supabase client | `platform_admins`, `admin_settings`, `admin_activity_logs` | ✅ Realtime + mutations + cache invalidation | ✅ FULLY FUNCTIONING |

---

## Admin Role Assignment — Detailed Truth Matrix

### Architecture: platform_admins Table = Admin Access, AuthCallback = Gatekeeper

The founder assigns admin/moderator roles via the Admin Settings page. These users may use
**any email** (company, personal, etc.) — they are NOT subject to the educational-email gate.
The `platform_admins` table is the source of truth for admin access. AuthCallback checks this
table before applying the edu-mail restriction.

| Component | Source of Truth | Realtime | Cache Invalidation | Role Guard | Status |
| --------- | -------------- | -------- | ------------------ | ---------- | ------ |
| `platform_admins` table | Supabase DB | ✅ Realtime subscription in AdminContext | ✅ `platform-admins` query key | ✅ `is_active = true` filter | ✅ FULLY FUNCTIONING |
| `checkPlatformAdminByEmail()` (AuthCallback) | Supabase `platform_admins` SELECT | N/A (one-time check) | N/A (auth flow) | ✅ `is_active = true` | ✅ FULLY FUNCTIONING |
| `addPlatformAdmin()` (admin-api) | Supabase UPSERT on `platform_admins` | ✅ Triggers realtime | ✅ Invalidates `platform-admins` key | ✅ Founder-only (client check + RLS) | ✅ FULLY FUNCTIONING |
| `removePlatformAdmin()` (admin-api) | Supabase UPDATE `is_active = false` | ✅ Triggers realtime | ✅ Invalidates `platform-admins` key | ✅ Founder-only | ✅ FULLY FUNCTIONING |
| `AdminContext` (checkIsAdmin) | Supabase `platform_admins` SELECT | ✅ Auth state listener + realtime | ✅ Refreshes on auth change | N/A | ✅ FULLY FUNCTIONING |
| `AdminLayout` (access gate) | `AdminContext.isAdmin` | N/A (derived) | N/A (derived) | ✅ Shows AccessDenied for non-admins | ✅ FULLY FUNCTIONING |
| Admin profile auto-creation (AuthCallback) | Supabase UPSERT on `profiles` | N/A (one-time) | N/A (redirect follows) | ✅ Only for `isPlatformAdmin` | ✅ FULLY FUNCTIONING |
| Admin redirect on login (AuthCallback) | `checkPlatformAdminByEmail()` result | N/A | N/A | ✅ Only for platform admins | ✅ FULLY FUNCTIONING |
| `updateAdminLastLogin()` | Supabase UPDATE `last_login_at` | N/A (fire-and-forget) | N/A | N/A | ✅ FULLY FUNCTIONING |

### Auth Flow for Admin-Assigned Users

| Step | Logic | Outcome |
| ---- | ----- | ------- |
| 1. User logs in via Google OAuth or Magic Link | Standard Supabase Auth | Session created |
| 2. AuthCallback checks `isValidAcademicEmail()` | Email domain validation | May fail for non-edu emails |
| 3. AuthCallback checks `checkPlatformAdminByEmail()` | Queries `platform_admins` table | Bypasses edu-mail gate if admin found |
| 4. Profile check | Queries `profiles` table by user ID | May be null for first-time admins |
| 5a. No profile → auto-create | UPSERT with `role: Alumni`, `onboarding_complete: true` | Admin gets a functional profile |
| 5b. Profile exists, onboarding incomplete → auto-complete | UPDATE `onboarding_complete = true` | Admin skips student onboarding |
| 5c. Profile exists, onboarding complete → redirect | Check `isPlatformAdmin` flag | Redirects to `/admin` instead of `/home` |
| 6. AdminContext loads | `checkIsAdmin()` verifies `platform_admins` | `isAdmin = true`, admin dashboard accessible |

### Security Invariants

| Invariant | Enforced By | Status |
| --------- | ----------- | ------ |
| Only founder can add/remove admins | `AdminContext.addAdminUser()` + `AdminSettings.tsx` UI guard | ✅ |
| Platform admins bypass edu-email check | `checkPlatformAdminByEmail()` in AuthCallback | ✅ |
| Platform admins redirect to `/admin` after login | AuthCallback `isPlatformAdmin` check | ✅ |
| Non-admin users cannot access `/admin/*` routes | `AdminLayout` → `AdminContext.isAdmin` gate | ✅ |
| Deactivated admins (`is_active = false`) are rejected | `checkIsAdmin()` filters by `is_active = true` | ✅ |
| Admin actions logged to `admin_activity_logs` | `logAdminActivity()` called in all admin mutations | ✅ |
| `last_login_at` tracked per admin | `updateAdminLastLogin()` in AdminContext | ✅ |
| Founder email is immutable constant | `FOUNDER_EMAIL` in `admin-constants.ts` | ✅ |

### Validation Checklist (Admin Role Assignment)

- [x] Founder adds `user@company.com` as admin → user can log in with that email
- [x] Non-edu admin email bypasses academic email gate in AuthCallback
- [x] Non-edu admin gets auto-created profile on first login (no onboarding required)
- [x] Admin with existing profile (onboarding incomplete) gets auto-completed
- [x] Admin with completed profile redirects to `/admin` (not `/home`)
- [x] Founder email always redirects to `/admin` after login
- [x] Deactivated admin (`is_active = false`) is blocked at edu-email gate AND AdminLayout
- [x] Realtime subscription on `platform_admins` keeps admin list in sync
- [x] React Query cache invalidated after add/remove admin
- [x] Admin add/remove logged to `admin_activity_logs`
- [x] No demo data, no localStorage-based admin, no fake IDs
- [x] Refresh page → admin status unchanged (persisted in `platform_admins`)
- [x] `AdminLayout` shows proper guidance in AccessDenied for non-admins

---

## Portfolio Feature — Detailed Truth Matrix

### Architecture: Public Portfolio Pages from Existing Profile Data

The portfolio feature generates public-facing portfolio pages at `/portfolio/:slug` using data already stored in the `profiles` table. Portfolio settings (template choice, section visibility, live/draft status) are stored in `profiles.social_links` jsonb under the `_portfolio` key. No additional DB tables or migrations are required (Phase 1).

| Component | Source of Truth | Realtime | Cache Invalidation | Role Guard | Status |
| --------- | --------------- | -------- | ------------------ | ---------- | ------ |
| `profiles.social_links._portfolio` (settings) | Supabase `profiles` table (jsonb) | ✅ via ProfileContext channel | ✅ `portfolio-settings` + `profile-stats` keys | N/A (own profile RLS) | ✅ FULLY FUNCTIONING |
| `getPortfolioSettings(profileId)` | Supabase client SELECT | N/A (query) | ✅ React Query stale/refetch | N/A (read-only) | ✅ FULLY FUNCTIONING |
| `resolvePortfolioSlug(slug)` | Supabase client SELECT | N/A (query) | ✅ React Query stale/refetch | N/A (public read-only) | ✅ FULLY FUNCTIONING |
| `updatePortfolioSettings(profileId, updates)` | Supabase client UPDATE | N/A (mutation) | ✅ Invalidates `portfolio-settings` + `profile-stats` | ✅ RLS (own profile only) | ✅ FULLY FUNCTIONING |
| `activatePortfolio(profileId, profile)` | Supabase client UPDATE | N/A (mutation) | ✅ Invalidates `portfolio-settings` + `profile-stats` | ✅ RLS (own profile only) | ✅ FULLY FUNCTIONING |
| Portfolio page (`/portfolio/:slug`) | React Query + adapter | No realtime (public, read-only) | ✅ React Query stale/refetch | N/A (public page) | ✅ FULLY FUNCTIONING |
| ProfileHeader "View Portfolio" action | `useActivatePortfolio` mutation | N/A (user-triggered) | ✅ Invalidates after success | ✅ Own profile only | ✅ FULLY FUNCTIONING |
| ProfileHeader "Share Portfolio" action | Clipboard API | N/A | N/A | ✅ Only shown when portfolio is live | ✅ FULLY FUNCTIONING |

### Slug Resolution

| Step | Logic | Failure Mode |
| ---- | ----- | ------------ |
| 1. Parse slug | Split by `-`, take last segment as UUID fragment | 404 if slug has no segments |
| 2. Query profiles | `profiles.id ilike '{fragment}%'` | 404 if no match |
| 3. Verify full slug | `generateSlug(name, id) === slug` | 404 if slug mismatch |
| 4. Check isLive | `extractPortfolioSettings(social_links).isLive` | "Currently hidden" message |

### Templates

| Template ID | Component | Style | Photo Support |
| ----------- | --------- | ----- | ------------- |
| `minimal` | `MinimalTemplate` | Clean dark/light toggle, gradient hero | ✅ Falls back to initials |
| `eliana` | `ElianaTemplate` | Warm gradient, centered hero | ✅ Falls back to initials |
| `typefolio` | `TypefolioTemplate` | Banner + card layout, purple accents | ✅ Falls back to initials |
| `geeky` | `GeekyTemplate` | Developer-focused, emerald accents, grid | ✅ Falls back to initials |

### SEO

| Feature | Implementation | Status |
| ------- | -------------- | ------ |
| Page title | `{name} — Portfolio \| clstr` | ✅ |
| Meta description | `{name}'s professional portfolio. {role}` | ✅ |
| Open Graph tags | title, description, type=profile | ✅ |
| JSON-LD `Person` schema | name, jobTitle, description, address, email, sameAs, memberOf | ✅ |
| Semantic HTML | `<main>`, `<section>`, `<article>`, `<header>` within templates | ✅ |

### Implementation Files

| File | Purpose | Status |
| ---- | ------- | ------ |
| `src/types/portfolio.ts` | All portfolio types, defaults, template registry | ✅ Complete |
| `src/lib/portfolio-adapter.ts` | Pure adapter: UserProfile → ProfileData | ✅ Complete |
| `src/lib/portfolio-api.ts` | Supabase CRUD (settings, slug resolution, activation) | ✅ Complete |
| `src/hooks/usePortfolio.ts` | React Query hooks (4 hooks: settings, data, update, activate) | ✅ Complete |
| `src/components/profile/portfolio/MinimalTemplate.tsx` | Minimal template | ✅ Complete |
| `src/components/profile/portfolio/ElianaTemplate.tsx` | Eliana template | ✅ Complete |
| `src/components/profile/portfolio/TypefolioTemplate.tsx` | Typefolio template | ✅ Complete |
| `src/components/profile/portfolio/GeekyTemplate.tsx` | Geeky template | ✅ Complete |
| `src/components/profile/portfolio/PortfolioRenderer.tsx` | Template switcher | ✅ Complete |
| `src/pages/Portfolio.tsx` | Public portfolio page + SEO | ✅ Complete |
| `src/App.tsx` | Route registration (`/portfolio/:slug`) | ✅ Updated |
| `src/components/profile/ProfileHeader.tsx` | View/Share Portfolio actions in 3-dot menu | ✅ Updated |

### Validation Checklist

- [x] Portfolio data derived from existing `profiles` table — no schema migration needed (Phase 1)
- [x] Settings persist in `profiles.social_links` jsonb under `_portfolio` key
- [x] `assertValidUuid` used for all profile ID operations
- [x] Slug resolution verifies full slug match (not just UUID prefix)
- [x] Slug resolution falls back to full table scan for fully custom slugs
- [x] Public page shows "not found" for invalid slugs, "hidden" for non-live portfolios
- [x] First "View Portfolio" click activates (sets isLive=true), subsequent clicks open the page
- [x] "Share Portfolio" copies URL to clipboard with toast confirmation
- [x] React Query cache invalidated after every portfolio mutation
- [x] JSON-LD Person schema rendered on portfolio page
- [x] All 4 templates support photo with initials fallback
- [x] All templates respect section visibility settings (showEducation, showExperience, etc.)
- [x] No realtime needed — public page is read-only, profile owner edits via Settings/ProfileHeader
- [x] No demo data, no mock profiles, no local-only state
- [x] `getProfileById` fetches ALL related data: education, experience, skills, projects, posts (fixed Feb 9)
- [x] Portfolio editor `saveProfile` persists education/experience/skills/projects to normalized Supabase tables (fixed Feb 9)
- [x] Portfolio editor invalidates `portfolio-resolve` + `portfolio-profile` query keys after save (fixed Feb 9)
- [x] Vite build passes with zero errors
- [x] ESLint clean on all new/modified files

---

## Email Transition Feature — Detailed Truth Matrix

### Architecture: College Email = Authorization, Personal Email = Authentication

The platform uses college email domains strictly for identity and access control, while allowing personal emails only as secondary login methods linked to an already verified college account.

| Component | Source of Truth | Realtime | Cache Invalidation | Role Guard | Status |
| --------- | -------------- | -------- | ------------------ | ---------- | ------ |
| `profiles.personal_email` | Supabase `profiles` table | ✅ via ProfileContext channel | ✅ `email-transition-status` key | ✅ DB RPC + UI component | ✅ FULLY FUNCTIONING |
| `profiles.personal_email_verified` | Supabase `profiles` table | ✅ via ProfileContext channel | ✅ `email-transition-status` key | ✅ DB RPC + UI component | ✅ FULLY FUNCTIONING |
| `profiles.email_transition_status` | Supabase `profiles` table | ✅ via ProfileContext channel | ✅ `email-transition-status` key | ✅ DB RPC + UI component | ✅ FULLY FUNCTIONING |
| `profiles.personal_email_prompt_dismissed_at` | Supabase `profiles` table | ✅ via ProfileContext channel | ✅ `email-transition-status` key | ✅ DB RPC | ✅ FULLY FUNCTIONING |
| `email_verification_codes` table | Supabase (RLS + SECURITY DEFINER RPCs only) | N/A (server-side only) | N/A | ✅ RPC role check | ✅ FULLY FUNCTIONING |
| `generate_email_verification_code` RPC | Supabase SECURITY DEFINER | N/A (mutation) | ✅ Invalidates after success | ✅ Student/Alumni only | ✅ FULLY FUNCTIONING |
| `verify_personal_email_code` RPC | Supabase SECURITY DEFINER | N/A (mutation) | ✅ Invalidates after success | ✅ Student/Alumni only | ✅ FULLY FUNCTIONING |
| `request_personal_email_link` RPC | Supabase SECURITY DEFINER | N/A (mutation) | ✅ Invalidates after success | ✅ Student/Alumni only | ✅ FULLY FUNCTIONING |
| `transition_to_personal_email` RPC | Supabase SECURITY DEFINER + Auth API | N/A (mutation) | ✅ Invalidates after success | ✅ Student/Alumni only | ✅ FULLY FUNCTIONING |
| `dismiss_personal_email_prompt` RPC | Supabase SECURITY DEFINER | N/A (mutation) | ✅ Invalidates after success | N/A (harmless) | ✅ FULLY FUNCTIONING |
| `get_email_transition_status` RPC | Supabase SECURITY DEFINER | N/A (query) | ✅ 30s stale + refetch on focus | N/A (read-only) | ✅ FULLY FUNCTIONING |
| `PersonalEmailPrompt` (Home) | `useEmailTransition` hook → RPC | ✅ Inherited from ProfileContext | ✅ Via hook mutation callbacks | ✅ `shouldPromptPersonalEmail` (Student + Alumni) | ✅ FULLY FUNCTIONING |
| `EmailTransitionSettings` (Settings) | `useEmailTransition` hook → RPC | ✅ Inherited from ProfileContext | ✅ Via hook mutation callbacks | ✅ Component `ALLOWED_ROLES` check | ✅ FULLY FUNCTIONING |
| `cleanup_expired_verification_codes` | Supabase pg_cron (hourly) | N/A | N/A | `service_role` only | ✅ FULLY FUNCTIONING |
| `merge_transitioned_account` RPC | Supabase SECURITY DEFINER | N/A (mutation) | ✅ N/A (client signs out after) | ✅ Authenticated only | ✅ FULLY FUNCTIONING (083: merge audit flag, sync efficiency guard, FOR UPDATE locks, data safety, atomic identity transfer, bypass flag ordering) |
| `handle_new_user` trigger | Supabase SECURITY DEFINER | N/A (trigger) | N/A | N/A (auth-level trigger) | ✅ FULLY FUNCTIONING (081: skip profile for transitioned emails) |
| `handle_user_deletion` trigger | Supabase SECURITY DEFINER | N/A (trigger) | N/A | N/A (auth-level trigger) | ✅ FULLY FUNCTIONING (083: merge-aware audit reason, 106: schema columns added) |

### Flow States

| State | DB Value | UI Location | User Action | Next State |
| ----- | -------- | ----------- | ----------- | ---------- |
| No personal email | `email_transition_status = 'none'` | Home banner (Student near graduation / Alumni) + Settings | Enter personal email | Pending |
| Pending verification | `email_transition_status = 'pending'` | Home banner + Settings | Enter 6-digit DB code | Verified |
| Verified | `email_transition_status = 'verified'` | Settings | "Make primary login" button | Transitioned |
| Transitioned | `email_transition_status = 'transitioned'` | Settings (read-only) | None (complete) | — |
| Merge (re-login) | N/A (handled by RPC 081) | AuthCallback (auto) | Signs in with Google using personal email → merge RPC → sign out → re-login | Transitioned (original profile restored) |

### Security Rules

| Rule | Enforced By | Status |
| ---- | ----------- | ------ |
| Only authenticated users can call RPCs | `auth.uid()` check in each RPC | ✅ |
| Only Students/Alumni can use email transition RPCs | Role check in each mutation RPC (migration 075) | ✅ |
| Only Students/Alumni see email transition settings | `EmailTransitionSettings` component role guard | ✅ |
| Personal email must differ from college email | `request_personal_email_link` RPC | ✅ |
| Personal email cannot duplicate another user's email | Unique index + RPC check | ✅ |
| Verification code is 6-digit, time-limited (10 min), single-use | `email_verification_codes` table + `verify_personal_email_code` RPC | ✅ |
| Verification code table has no direct INSERT/UPDATE/DELETE | RLS policies block all direct access | ✅ |
| Previous codes invalidated on resend | `generate_email_verification_code` RPC marks old codes as used | ✅ |
| Expired codes cleaned up automatically | pg_cron hourly job (migration 074) | ✅ |
| Transition requires verified personal email | `transition_to_personal_email` RPC | ✅ |
| Cannot remove email after transition | `removePersonalEmail` service function | ✅ |
| College domain stays permanent after transition | `sync_profile_email` trigger | ✅ |
| RLS respected — users can only modify own profile | Supabase RLS policies | ✅ |
| Personal email CANNOT bypass domain restriction | By design — personal email is auth only, not authz | ✅ |
| Transitioned alumni can log in with personal email | AuthCallback checks `profiles.personal_email` + `email_transition_status` | ✅ |
| Auth email updated on transition | `transitionToPersonalEmail()` calls `supabase.auth.updateUser()` | ✅ |
| Prompt dismissal persisted in DB (30-day cooldown) | `dismiss_personal_email_prompt` RPC + `shouldPromptPersonalEmail` check | ✅ |
| Duplicate auth users merged automatically | `handle_new_user` skips profile creation (081) + `merge_transitioned_account` RPC | ✅ |
| Google identity transferred to original user on merge | `merge_transitioned_account` RPC moves auth.identities row | ✅ |
| `sync_profile_email` trigger has bypass flag restored + early-return no-op guard (083) | `sync_profile_email` trigger | ✅ |
| Merge-driven auth.users deletion records correct audit reason (083) | `handle_user_deletion` trigger | ✅ |
| `isAuthenticated` localStorage removed | AuthCallback + sign-out handlers no longer write/read `localStorage('isAuthenticated')` — Supabase session is sole auth state (Feb 10 fix) | ✅ |
| `removePersonalEmail` uses auth.uid() only — no dead params (083) | `removePersonalEmail` service | ✅ |
| `sync_profile_email` sets `bypass_public_domain_guard` (114) | `_set_bypass_flag('app.bypass_public_domain_guard', 'true')` in sync trigger | ✅ |
| `sync_profile_email` accepts 'verified' status during active transition (114) | `v_current_status IN ('transitioned', 'verified')` — not just 'transitioned' | ✅ |
| `transition_to_personal_email` sets all 3 bypass flags (114) | `bypass_email_guard` + `bypass_public_domain_guard` + `bypass_college_domain_guard` before auth.users UPDATE | ✅ |
| `merge_transitioned_account` sets `bypass_public_domain_guard` (114) | Added alongside existing `bypass_email_guard` and `bypass_college_domain_guard` | ✅ |
| `block_public_domain_profile` has transition exception (114) | Allows UPDATE when `college_domain` is valid, `email_transition_status IN ('verified','transitioned')`, and `college_domain` unchanged | ✅ |
| Merge RPC uses row-level locks to prevent races (082) | `merge_transitioned_account` RPC | ✅ |
| Merge RPC checks new user has no data before cascade delete (082) | `merge_transitioned_account` RPC | ✅ |
| Merge RPC uses atomic UPDATE for identity transfer, not DELETE+INSERT (082) | `merge_transitioned_account` RPC | ✅ |
| Merge failure in AuthCallback redirects to /login, never falls through to onboarding (082) | AuthCallback | ✅ |
| Login page shows merge info banner on redirect (082) | Login page | ✅ |
| Duplicate profile + auth user deleted after merge | `merge_transitioned_account` RPC cleans up new user | ✅ |

---

## Community Isolation Architecture — Detailed Fix Matrix (Feb 13, 2026)

### Core Principle

Community membership is determined **exclusively** by `profiles.college_domain` — never derived from `auth.users.email`, `profiles.email`, or `profiles.personal_email`.

Identity has 3 layers:

| Layer | Field | Purpose | Determines Community? |
| ----- | ----- | ------- | -------------------- |
| Login Identity | `auth.users.email` | Authentication (login) | ❌ NEVER |
| Institutional Identity | `profiles.email` + `profiles.college_domain` | Authorization + community scoping | ✅ ALWAYS |
| Recovery Identity | `profiles.personal_email` | Lifetime access, recovery, future login | ❌ NEVER |

### Cases Handled

| Case | Scenario | Community Domain Source | Status |
| ---- | -------- | ---------------------- | ------ |
| A | Student, no personal email | `profiles.college_domain` | ✅ Correct |
| B | Student, linked Gmail (verified) | `profiles.college_domain` (unchanged) | ✅ Correct |
| C | Alumni, college email disabled | `profiles.college_domain` (permanent) | ✅ Correct |
| D | Gmail user tries direct signup | ❌ Rejected at AuthCallback (no profile, no community) | ✅ Correct |
| E | Gmail user logs in after transition | `profiles.college_domain` (not auth email) | ✅ Correct |
| F | Duplicate Gmail account created | Detected + merged via `merge_transitioned_account` RPC | ✅ Correct |

### Bugs Found & Fixed

| Component | Before (Bug) | After (Fix) | Severity |
| --------- | ------------ | ----------- | -------- |
| `ProfileContext.toBasicUserProfile()` | Derived `domain` from `item.email` via `getDomainFromEmail()` — if email changed to Gmail, domain became `gmail.com` | Uses `item.college_domain \|\| item.domain` — never reads email for domain derivation | 🔴 CRITICAL |
| `ProfileContext.updateProfile()` | Recalculated `nextDomain` from email via `getDomainFromEmail(email)` — could set domain to personal email domain | Uses `college_domain` from updates or prev state — email is never used for domain | 🔴 CRITICAL |
| `normalizeProfileRecord()` (profile.ts) | Derived `domain` from `record.email` via `getDomainFromEmail()` — corrupted domain for transitioned users | Uses `record.college_domain ?? record.domain` — never reads email | 🔴 CRITICAL |
| `AuthCallback` admin profile creation | Set `domain: getDomainFromEmail(userEmail)` even for Gmail admins — created ghost "gmail.com" domain entries | Blocks public email domains from `domain` field; `college_domain` always `null` for admins | 🟡 MODERATE |
| `AuthCallback` OAuth domain update | Set `college_domain` without checking for public email domains | Added `isPublicEmailDomain()` safety net — blocks `gmail.com`, `yahoo.com`, etc. | 🟡 MODERATE |
| `getDomainFromEmail` import | Imported in `ProfileContext.tsx` but now unused after domain-derivation removal | Import removed — no dead code | 🟢 CLEANUP |

### Verified Correct (No Fix Needed)

| Component | Why It's Correct |
| --------- | ---------------- |
| `Network.tsx` | Uses `collegeDomain` from `useRolePermissions()` → `useIdentityContext()` → `get_identity_context()` RPC (reads `profiles.college_domain`) |
| `social-api.ts` `ensureCollegeDomain()` | Reads `profiles.college_domain` by user ID from DB, never from auth email |
| `trending-api.ts` | Filters by `college_domain` column directly |
| `jobs-api.ts` | Filters by `profile.college_domain` from DB |
| `Projects.tsx` | Uses `profile.college_domain` from ProfileContext (now correctly sourced) |
| `useIdentity.ts` hook | Calls `get_identity_context()` RPC — server-side, never touches auth.email for domain |
| `useRolePermissions.ts` | Reads `collegeDomain` from `useIdentityContext()` then normalizes |
| `loadDomainUsers()` (ProfileContext) | Queries `.eq('college_domain', normalizedDomain)` |
| `Onboarding.tsx` submit | Uses `alumniInviteData?.college_domain \|\| getCollegeDomainFromEmail(email)` — email is always college email at onboarding time |
| `ClubOnboarding.tsx` submit | `getDomainFromEmail(user.email)` — club auth requires academic email |
| `AuthCallback` transitioned user guard | Checks `isProfileTransitioned` before updating domain fields |

### Query Pattern Enforcement

Every community-scoped query MUST use:
```sql
WHERE college_domain = $current_user_college_domain
```

Sources of `college_domain` (in order of authority):
1. `get_identity_context()` RPC → `identity.college_domain` (best — server-authoritative)
2. `useIdentityContext().collegeDomain` (React context wrapper of #1)
3. `useRolePermissions().collegeDomain` (derived from #2)
4. `profile.college_domain` from ProfileContext (acceptable for display, now correctly sourced)

NEVER derive community domain from:
- ❌ `auth.users.email.split('@')[1]`
- ❌ `getDomainFromEmail(user.email)` for community scoping
- ❌ `profile.email.split('@')[1]`
- ❌ `profile.personal_email`

### Validation Checklist (Community Isolation)

- [x] `ProfileContext.toBasicUserProfile()` uses `college_domain` not email-derived domain
- [x] `ProfileContext.updateProfile()` uses `college_domain` chain, not `getDomainFromEmail`
- [x] `normalizeProfileRecord()` uses `college_domain`, not `record.email`
- [x] `AuthCallback` blocks public email domains from `college_domain` and `domain` fields
- [x] `AuthCallback` admin profile: `college_domain = null`, domain blocked for public emails
- [x] Network page scoped by `identity.college_domain` (server-authoritative)
- [x] Feed scoped by `profiles.college_domain` via `ensureCollegeDomain()` DB query
- [x] Jobs scoped by `profiles.college_domain`
- [x] Projects scoped by `profile.college_domain`
- [x] Trending topics scoped by `college_domain` column
- [x] No `getDomainFromEmail` used for runtime community scoping
- [x] Transitioned users retain original `college_domain` permanently
- [x] Gmail/Yahoo/Outlook users cannot create communities
- [x] Refresh page → community membership unchanged
- [x] No demo data, no email-derived domain, no auth.email community leaks

---

## Data Flow Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                    Supabase (Source of Truth)                │
│                                                             │
│  profiles table                                             │
│  ├── email (college)                    ← identity / authz  │
│  ├── domain / college_domain            ← college scoping   │
│  ├── personal_email                     ← lifetime access   │
│  ├── personal_email_verified            ← verification flag │
│  ├── email_transition_status            ← state machine     │
│  └── personal_email_prompt_dismissed_at ← persistent dismiss│
│                                                             │
│  email_verification_codes table                             │
│  ├── code (6-digit, time-limited, single-use)               │
│  ├── RLS: no direct INSERT/UPDATE/DELETE                    │
│  ├── Managed exclusively by SECURITY DEFINER RPCs          │
│  └── Cleaned up hourly via pg_cron (migration 074)         │
│                                                             │
│  RPCs (SECURITY DEFINER, role-guarded: Student/Alumni only) │
│  ├── request_personal_email_link(email) ← role check       │
│  ├── generate_email_verification_code(email) ← role check  │
│  ├── verify_personal_email_code(code)   ← role check       │
│  ├── transition_to_personal_email()     ← role check       │
│  ├── check_transitioned_email(email)    ← auth callback    │
│  ├── merge_transitioned_account()       ← auth callback    │
│  ├── dismiss_personal_email_prompt()                        │
│  └── get_email_transition_status()                          │
│                                                             │
│  Triggers                                                   │
│  ├── handle_new_user() — skips profile for transitioned emails │
│  ├── sync_profile_email() — transition-aware sync (bypass restored 082) │
│  └── guard_email_transition_columns() — blocks direct column edits │
│                                                             │
│  Cron Jobs (pg_cron, migration 074)                         │
│  ├── cleanup-expired-email-verification-codes (hourly)      │
│  └── vacuum-email-verification-codes (weekly)               │
└──────────────────────────┬──────────────────────────────────┘
                           │ Realtime (postgres_changes)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    ProfileContext                             │
│  ├── profiles-{userId} channel → own profile sync            │
│  └── profiles-domain-{domain} channel → college peers sync   │
│                                                              │
│  Invalidates: email-transition-status + 15 other query keys  │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    useEmailTransition Hook                    │
│  ├── React Query [email-transition-status, userId]           │
│  ├── linkPersonalEmail → RPC + generate code                 │
│  ├── verifyPersonalEmail(code) → verify_personal_email_code  │
│  ├── resendVerificationCode → generate_email_verification_code│
│  ├── transitionEmail → RPC + auth.updateUser({ email })    │
│  ├── removePersonalEmail → direct DB update                  │
│  └── dismissPrompt → dismiss_personal_email_prompt RPC       │
└──────────────────────────┬───────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────┐  ┌──────────────────────────┐
│ PersonalEmailPrompt  │  │ EmailTransitionSettings   │
│ (Home page banner)   │  │ (Settings > Account tab)  │
│                      │  │                            │
│ Shows when:          │  │ Role guard:                │
│ • Student near grad  │  │ • Only Student/Alumni      │
│ • Alumni (any time)  │  │ • Others see nothing       │
│ • No personal email  │  │                            │
│ • Not dismissed      │  │ Full management UI:        │
│   (30-day cooldown)  │  │ • Link email               │
│                      │  │ • Verify code              │
│ Dismiss = persisted  │  │ • Resend code              │
│ Resend = available   │  │ • Transition               │
│                      │  │ • Remove                   │
└──────────────────────┘  └────────────────────────────┘
```

---

## Validation Checklist (Email Transition)

- [x] Refresh page → email transition state unchanged (persisted in DB)
- [x] Realtime update propagates to ProfileContext → UI re-renders
- [x] Invalid UUIDs cause hard errors (`assertValidUuid`)
- [x] No remaining references to deprecated tables or JSON blobs
- [x] Feature works across all routes that touch it (Home, Settings)
- [x] College domain restriction is NOT bypassed by personal email
- [x] RLS respected — users can only view/edit own email transition data
- [x] React Query cache invalidated after every mutation
- [x] No demo fallbacks, fake IDs, or local-only state
- [x] Verification codes are time-limited (10 min), single-use, DB-backed
- [x] No broken `signInWithOtp` with `shouldCreateUser: false`
- [x] Prompt dismissal persisted in DB (not session-only React state)
- [x] Resend verification code available in both components
- [x] `verify_personal_email_code` actually validates the code against DB
- [x] Role guard at DB level — only Students/Alumni can call mutation RPCs
- [x] Role guard at UI level — `EmailTransitionSettings` hidden for non-Student/Alumni
- [x] Alumni prompted to link personal email (not just Students)
- [x] Expired verification codes cleaned up by pg_cron hourly job
- [x] `email_transition_status` typed as union type (not loose `string`)
- [x] `loadDomainUsers` includes `enrollment_year` and `course_duration_years` in SELECT
- [x] Transitioned user re-login via Google merges into original profile (migration 081)
- [x] `handle_new_user` skips profile creation for transitioned emails
- [x] Merge RPC transfers Google identity and deletes duplicate auth user
- [x] Merge RPC uses atomic UPDATE (not DELETE+INSERT) for identity transfer (082)
- [x] Merge RPC sets bypass_email_guard BEFORE auth.users UPDATE (082)
- [x] Merge RPC uses FOR UPDATE row locks to prevent concurrent races (082)
- [x] Merge RPC checks new user has no data before cascade delete (082)
- [x] Merge failure redirects to /login, never falls through to onboarding (082)
- [x] Login page displays merge info banner from location.state (082)
- [x] sync_profile_email trigger has bypass flag restored (082 fix for 078 regression)
- [x] No hardcoded dev access codes in production bundle
- [x] Cache invalidation in `useDeleteAccount` / `useAdminSettings` moved to `onSuccess`
- [x] `useDeleteAccount` uses `signOut({ scope: 'local' })` — prevents false "Delete failed" when server session is already gone (106)
- [x] `sync_profile_email` accepts `verified` status during active transition (114)
- [x] `sync_profile_email` sets `bypass_public_domain_guard` flag (114)
- [x] `transition_to_personal_email` sets all 3 bypass flags before auth.users UPDATE (114)
- [x] `merge_transitioned_account` sets `bypass_public_domain_guard` flag (114)
- [x] `block_public_domain_profile` allows profile UPDATE for users in transition with valid college_domain (114)
- [x] Gmail/Yahoo transitions no longer blocked by "Public domains cannot be used as primary profile email" (114)
- [x] Frontend code (email-transition.ts, useEmailTransition.ts, AuthCallback.tsx) confirmed correct — no TS changes needed (114)

### Bugs Found & Fixed — Migration 114 (Feb 20, 2026)

| Component | Before (Bug) | After (Fix) | Severity |
| --------- | ------------ | ----------- | -------- |
| `transition_to_personal_email` (103) | Updated `auth.users.email` BEFORE setting `email_transition_status = 'transitioned'`. `sync_profile_email` trigger fires when status is still `'verified'` → falls through to normal email flow → `is_public_email_domain('gmail.com')` → RAISE EXCEPTION | Sets all 3 bypass flags (`bypass_email_guard`, `bypass_public_domain_guard`, `bypass_college_domain_guard`) before any mutations. `sync_profile_email` also accepts `'verified'` status. | 🔴 CRITICAL |
| `sync_profile_email` (109) | Checked `v_current_status = 'transitioned'` only. During active transition the status is still `'verified'` → missed the transition branch → hit public domain check. Also only set 2/3 bypass flags (missing `bypass_public_domain_guard`). | Checks `v_current_status IN ('transitioned', 'verified')`. Sets all 3 bypass flags. | 🔴 CRITICAL |
| `block_public_domain_profile` (107/109) | No transition exception. ALL public-domain emails blocked on profile UPDATE, even when `college_domain` is intact and the user is in `'verified'`/`'transitioned'` state. | Added transition exception: allows UPDATE when `college_domain` is valid (non-public), `email_transition_status IN ('verified', 'transitioned')`, and `college_domain` is unchanged. | 🔴 CRITICAL |
| `merge_transitioned_account` (109) | Set `bypass_email_guard` + `bypass_college_domain_guard` but NOT `bypass_public_domain_guard` before `auth.users` UPDATE → `sync_profile_email` trigger could be blocked by `block_public_domain_profile`. | Sets all 3 bypass flags before `auth.users` UPDATE. | 🟡 MODERATE |

### Bypass Flag Matrix (Updated Migration 114)

| Flag | Verified By | Set By (SECURITY DEFINER Functions) |
| ---- | ----------- | ----------------------------------- |
| `app.bypass_email_guard` | `guard_email_transition_columns` trigger | `sync_profile_email`, `transition_to_personal_email`, `merge_transitioned_account`, `verify_personal_email_code` |
| `app.bypass_college_domain_guard` | College domain mutation triggers | `sync_profile_email`, `transition_to_personal_email`, `merge_transitioned_account` |
| `app.bypass_public_domain_guard` | `block_public_domain_profile` trigger | `sync_profile_email` (**114**), `transition_to_personal_email` (**114**), `merge_transitioned_account` (**114**) |

---

### Alumni Identity & Invite System — Detailed Truth Matrix

### Architecture: College Email = Identity Anchor, Personal Email = Login Channel

The alumni invite system enables bulk onboarding of verified alumni via admin-uploaded Excel/CSV.
College email is the immutable identity anchor; personal email is the authentication and communication channel.
All invite operations go through SECURITY DEFINER RPCs with admin guards. The `get_identity_context()` RPC
is the single authoritative endpoint for resolving "who is this user?".

| Component | Source of Truth | Realtime | Cache Invalidation | Role Guard | Status |
| --------- | -------------- | -------- | ------------------ | ---------- | ------ |
| `alumni_invites` table | Supabase DB (RLS: admin + own-accepted) | ✅ Published to `supabase_realtime` | ✅ React Query `alumni-invites` key | ✅ `is_platform_admin()` for admin, `auth.uid()` for claim | ✅ FULLY FUNCTIONING |
| `validate_alumni_invite_token` RPC | Supabase SECURITY DEFINER | N/A (query) | N/A (pre-auth, no cache) | ✅ Anon + authenticated grant | ✅ FULLY FUNCTIONING |
| `accept_alumni_invite` RPC (auth.uid()) | Supabase SECURITY DEFINER | N/A (mutation) | ✅ Client redirects to onboarding | ✅ Authenticated only, email match enforced | ✅ FULLY FUNCTIONING |
| `dispute_alumni_invite` RPC | Supabase SECURITY DEFINER | N/A (mutation) | N/A (pre-auth) | ✅ Anon + authenticated grant | ✅ FULLY FUNCTIONING |
| `cancel_alumni_invite` RPC | Supabase SECURITY DEFINER | N/A (mutation) | ✅ Invalidates `alumni-invites` key | ✅ `is_platform_admin()` | ✅ FULLY FUNCTIONING |
| `resend_alumni_invite` RPC (24h cooldown) | Supabase SECURITY DEFINER | N/A (mutation) | ✅ Invalidates `alumni-invites` key | ✅ `is_platform_admin()` | ✅ FULLY FUNCTIONING |
| `bulk_upsert_alumni_invites` RPC | Supabase SECURITY DEFINER | N/A (mutation) | ✅ Invalidates `alumni-invites` key | ✅ `is_platform_admin()` | ✅ FULLY FUNCTIONING |
| `get_alumni_invites` RPC | Supabase SECURITY DEFINER | N/A (query) | ✅ React Query 30s stale | ✅ `is_platform_admin()` | ✅ FULLY FUNCTIONING |
| `get_accepted_invite_context` RPC | Supabase SECURITY DEFINER | N/A (query) | N/A (one-time onboarding) | ✅ Authenticated only | ✅ FULLY FUNCTIONING |
| `get_identity_context` RPC | Supabase SECURITY DEFINER | N/A (query) | ✅ React Query 5min stale + auth listener | ✅ Authenticated only | ✅ FULLY FUNCTIONING |
| `get_invite_ops_stats` RPC | Supabase SECURITY DEFINER | N/A (query) | ✅ React Query 30s stale + 60s auto-refresh | ✅ `is_platform_admin()` | ✅ FULLY FUNCTIONING |
| `is_alumni_personal_email` RPC | Supabase SECURITY DEFINER (STABLE) | N/A (query) | N/A (AuthCallback check) | ✅ Anon + authenticated | ✅ FULLY FUNCTIONING |
| `expire_stale_alumni_invites` cron | pg_cron (hourly) | N/A | N/A | `service_role` only | ✅ FULLY FUNCTIONING |
| `guard_alumni_profile_email_immutability` trigger | Supabase BEFORE UPDATE trigger | N/A | N/A | N/A (trigger-level) | ✅ FULLY FUNCTIONING |
| `InviteOpsDashboard` (admin) | `useInviteOpsStats` → RPC | N/A (30s poll) | ✅ Auto-refetch 60s | ✅ Admin context | ✅ FULLY FUNCTIONING |
| `AdminAlumniInvites` page | React Query + Realtime | ✅ Realtime subscription on `alumni_invites` | ✅ Mutation callbacks + realtime refetch | ✅ Admin layout guard | ✅ FULLY FUNCTIONING |
| `AlumniInvite` claim page | `useAlumniInviteClaim` → RPCs | N/A (one-time flow) | N/A (redirects to onboarding) | N/A (public token flow) | ✅ FULLY FUNCTIONING |
| Onboarding (alumni path) | `get_accepted_invite_context` RPC | N/A (one-time) | ✅ Invalidates identity on completion | ✅ Authenticated | ✅ FULLY FUNCTIONING |
| `send-alumni-invite-email` Edge Function | Resend API | N/A | N/A | ✅ Authorization header | ✅ FULLY FUNCTIONING |

### Security Invariants (Alumni Identity)

| Invariant | Enforced By | Status |
| --------- | ----------- | ------ |
| College email is immutable on alumni profiles | `guard_alumni_profile_email_immutability` trigger (migration 088) | ✅ |
| `accept_alumni_invite` uses `auth.uid()` not a parameter | Migration 088 rewrite (old 2-param overload dropped) | ✅ |
| Auth email must match invite personal email | `accept_alumni_invite` RPC cross-check | ✅ |
| Personal email CANNOT determine college access | Architecture: college_domain is derived from college_email, not login email | ✅ |
| No public SELECT on `alumni_invites` | Migration 088: removed permissive policy, added `auth_user_id` match only | ✅ |
| Cancel invite goes through admin-gated RPC | Migration 091: `cancel_alumni_invite` RPC | ✅ |
| Resend rate-limited to 24h | Migration 089: `last_sent_at` + cooldown check | ✅ |
| Expired invites auto-cleaned | pg_cron hourly via `expire_stale_alumni_invites` (migration 088) | ✅ |
| Onboarding uses server-side invite context | `get_accepted_invite_context` RPC (migration 089), NOT sessionStorage | ✅ |
| No sessionStorage dependency for identity data | SessionStorage writes removed; DB is sole source of truth | ✅ |
| Admin realtime updates | Realtime subscription on `alumni_invites` table in admin page | ✅ |

### Implementation Files (Alumni Identity)

| File | Purpose | Status |
| ---- | ------- | ------ |
| `src/types/alumni-invite.ts` | All alumni invite types (with `last_sent_at`) | ✅ Complete |
| `src/types/identity.ts` | Canonical identity types + `InviteOpsStats` | ✅ Complete |
| `src/hooks/useAlumniInviteClaim.ts` | Public invite claim hook (validate, accept, dispute) | ✅ Complete |
| `src/hooks/useAlumniInvites.ts` | Admin invite dashboard hook (list, bulk upload, resend, cancel via RPC) | ✅ Complete |
| `src/hooks/useIdentity.ts` | Authoritative identity hook + `useInviteOpsStats` | ✅ Complete |
| `src/contexts/IdentityContext.tsx` | React context wrapper for identity | ✅ Complete |
| `src/lib/alumni-invite-parser.ts` | Excel/CSV parsing + validation | ✅ Complete |
| `src/lib/alumni-identification.ts` | Student vs Alumni role determination | ✅ Complete |
| `src/pages/AlumniInvite.tsx` | Public invite claim page (no sessionStorage) | ✅ Complete |
| `src/pages/Onboarding.tsx` | Alumni onboarding (server-side invite context only) | ✅ Complete |
| `src/pages/admin/AdminAlumniInvites.tsx` | Admin dashboard with realtime subscription | ✅ Complete |
| `src/components/admin/InviteOpsDashboard.tsx` | Pipeline health stats | ✅ Complete |
| `supabase/functions/send-alumni-invite-email/` | Edge Function for invite emails via Resend | ✅ Complete |
| `supabase/migrations/087_alumni_invites.sql` | Core table + RPCs + realtime | ✅ Complete |
| `supabase/migrations/088_alumni_invite_hardening.sql` | Security fixes (RLS, auth.uid(), immutability trigger) | ✅ Complete |
| `supabase/migrations/089_invite_risk_mitigations.sql` | Rate-limit, server-side invite context RPC | ✅ Complete |
| `supabase/migrations/090_identity_context_rpc.sql` | Centralized identity RPC + ops stats | ✅ Complete |
| `supabase/migrations/091_cancel_invite_rpc.sql` | Admin-gated cancel invite RPC | ✅ Complete |
| `supabase/migrations/093_fix_invite_ops_stats_admin_check.sql` | Fix `get_invite_ops_stats()` — replace broken `user_id` lookup with `is_platform_admin()` | ✅ Complete |

### Validation Checklist (Alumni Identity)

- [x] Refresh page → invite list unchanged (persisted in DB)
- [x] Realtime update propagates to admin dashboard when invite is accepted externally
- [x] Realtime update also invalidates `invite-ops-stats` cache (pipeline dashboard refreshes)
- [x] Invalid UUIDs cause hard errors
- [x] No remaining references to deprecated tables or JSON blobs
- [x] No sessionStorage dependency for identity data (removed)
- [x] Cancel invite uses RPC (not direct table UPDATE)
- [x] All admin mutations go through `is_platform_admin()` guarded RPCs
- [x] College email immutability enforced at trigger level
- [x] `accept_alumni_invite` uses `auth.uid()` (not parameter)
- [x] Auth email must match invite personal_email
- [x] Feature works across all routes: `/alumni-invite`, `/onboarding`, `/admin/alumni-invites`, `/auth/callback`
- [x] React Query cache invalidated after every mutation (including `invite-ops-stats`)
- [x] No demo fallbacks, fake IDs, or local-only state
- [x] `last_sent_at` field present in TypeScript type definition
- [x] Admin page stats use server-side `InviteOpsDashboard` (page-local `.filter()` stats cards removed)
- [x] 24-hour resend cooldown enforced server-side
- [x] `fetchOpsStats` throws errors instead of returning null (React Query error state is accurate)
- [x] `InviteOpsDashboard` differentiates auth errors from load failures
- [x] `handleSendAllEmails` invalidates invite list cache AND `invite-ops-stats` cache after batch send
- [x] `get_invite_ops_stats()` uses `is_platform_admin()` (not broken `user_id` column) — migration 093
- [x] Expired invites auto-cleaned by pg_cron
- [x] Personal email CANNOT bypass college domain access control

### Alumni Invite Pipeline Fix Matrix (Feb 10, 2026)

| Component | Before (Issue) | After (Fix) | Status |
| --------- | -------------- | ----------- | ------ |
| `fetchOpsStats` (useIdentity.ts) | Returned `null` on all failures — React Query never set `error` state. InviteOpsDashboard always showed "Failed to load pipeline stats" for any non-success. | Throws `Error` for RPC failures, auth errors, and empty data — React Query correctly populates `error` state. | ✅ FIXED |
| `InviteOpsDashboard` error UI | Single generic error message for all failures ("Failed to load pipeline stats") | Differentiates auth errors ("Admin access required") from genuine load failures | ✅ FIXED |
| `useAlumniInvites` bulk upload mutation | Only invalidated `alumni-invites` query key | Also invalidates `invite-ops-stats` — pipeline dashboard updates immediately | ✅ FIXED |
| `useAlumniInvites` resend mutation | Only invalidated `alumni-invites` query key | Also invalidates `invite-ops-stats` — pipeline dashboard updates immediately | ✅ FIXED |
| `useAlumniInvites` cancel mutation | Only invalidated `alumni-invites` query key | Also invalidates `invite-ops-stats` — pipeline dashboard updates immediately | ✅ FIXED |
| Realtime subscription (AdminAlumniInvites) | Only called `refetch()` on invite list | Also invalidates `invite-ops-stats` — external changes (e.g. cron expiry) update dashboard | ✅ FIXED |
| `handleSendAllEmails` (AdminAlumniInvites) | No cache invalidation after batch email send | Calls `refetch()` + `queryClient.invalidateQueries({ queryKey: ['invite-ops-stats'] })` after completion | ✅ FIXED |
| `get_invite_ops_stats` RPC (migration 090) | **ROOT CAUSE**: Queried `platform_admins.user_id` — column does not exist. SQL error crashed the RPC for all admins. | Migration 093: Replaced with `is_platform_admin()` (email-based lookup, same as all other admin RPCs) | ✅ FIXED |

---

## Identity Context Consistency — Detailed Fix Matrix (Feb 10, 2026)

### Issues Identified & Fixed (Network Context)

| Component | Before (Issue) | After (Fix) | Status |
| --------- | -------------- | ----------- | ------ |
| `useFeatureAccess` hook | Read `profile.role` from `ProfileContext` (client-side state) | Reads `role` from `useIdentityContext()` (server-authoritative `get_identity_context()` RPC) | ✅ FIXED |
| `AlumniDirectory` domain source | Used `profile?.college_domain` from `ProfileContext` | Uses `collegeDomain` from `useIdentityContext()` with fallback to `ProfileContext` | ✅ FIXED |
| `AuthCallback` localStorage | Wrote `localStorage.setItem('isAuthenticated', 'true')` in 4 places — tamper-prone client hint | Removed all writes; Supabase session is sole auth state. Logout clean-ups also removed. | ✅ FIXED |
| `Navbar` sign-out | Called `localStorage.removeItem('isAuthenticated')` before sign-out | Removed; `supabase.auth.signOut()` is sufficient | ✅ FIXED |
| `AdminLayout` sign-out | Called `localStorage.removeItem('isAuthenticated')` before sign-out | Removed; `supabase.auth.signOut()` is sufficient | ✅ FIXED |
| `AcademicEmailRequired` | Called `localStorage.removeItem('isAuthenticated')` in finally block | Removed; `supabase.auth.signOut()` already clears session | ✅ FIXED |
| `page-not-found` | Called `localStorage.removeItem('isAuthenticated')` in finally block | Removed; `supabase.auth.signOut()` already clears session | ✅ FIXED |

### Previously Verified (No Fix Required)

| Component | Verification | Status |
| --------- | ------------ | ------ |
| `Onboarding.tsx` identity invalidation | Line 577: `queryClient.invalidateQueries({ queryKey: ["identity-context"] })` already present | ✅ OK |
| `AlumniInvite.tsx` identity invalidation | Lines 118 & 166: `queryClient.invalidateQueries({ queryKey: ["identity-context"] })` already present | ✅ OK |

### Architecture (Post-Fix)

```text
┌──────────────────────────────────────────────────────────────────┐
│  get_identity_context() RPC (Supabase, SECURITY DEFINER)         │
│  └── Returns: user_id, email, role, college_domain, source, ...  │
└────────────────────────┬─────────────────────────────────────────┘
                         │ React Query ['identity-context']
                         ▼
┌──────────────────────────────────────────────────────┐
│  useIdentity() hook → IdentityContext                 │
│  ├── role (authoritative)                             │
│  ├── collegeDomain (authoritative)                    │
│  ├── source (student|alumni|faculty|club)             │
│  └── isAuthenticated (derived from identity != null)  │
└──────────┬───────────────────────┬───────────────────┘
           │                       │
           ▼                       ▼
  useFeatureAccess()      AlumniDirectory
  (role-based gates)      (domain scoping)
  ✅ Now reads from       ✅ Now reads from
  IdentityContext          IdentityContext
```

### Validation Checklist (Identity Context Fix)

- [x] `useFeatureAccess` reads `role` from `useIdentityContext()`, not `useProfile()`
- [x] `AlumniDirectory` reads `collegeDomain` from `useIdentityContext()` with ProfileContext fallback
- [x] All `localStorage.setItem('isAuthenticated')` calls removed from `AuthCallback.tsx`
- [x] All `localStorage.removeItem('isAuthenticated')` calls removed from sign-out handlers
- [x] Test file updated — no `localStorage.getItem("isAuthenticated")` assertions
- [x] Supabase session (`useIdentity` → `getSession()`) is sole auth state
- [x] `Onboarding.tsx` already invalidates `identity-context` after profile creation
- [x] `AlumniInvite.tsx` already invalidates `identity-context` after accept
- [x] Refresh page → feature access unchanged (persisted via Supabase RPC)
- [x] No demo fallbacks, no localStorage auth hints, no stale client-side role

---

## Comment / Message / Realtime Performance — Detailed Fix Matrix (Migration 086)

### Root Causes Fixed

| Issue | Before (Slow) | After (Fixed) | File |
| ----- | ------------- | ------------- | ---- |
| **Comments: 3 sequential queries** | `getComments` fetched comments → profiles → likes sequentially | `Promise.all` parallel fetch: profiles + likes in one pass | `social-api.ts` |
| **Comments: no pagination** | All comments fetched unbounded (`select("*")`) | Capped to 50 per load with `limit` parameter | `social-api.ts` |
| **Top comments N+1** | `getTopComments` per-post + separate profile lookup each time | `getTopCommentsBatch` fetches top comments for multiple posts in a single query | `social-api.ts` |
| **Realtime: feed invalidation on comments** | Any comment change invalidated entire home feed (`queryKey`) | Comment changes only invalidate `post-comments` + `top-comments` caches | `Home.tsx` |
| **Realtime: global comment_likes listener** | `comment_likes` listener had no filter → invalidated all posts' comments | Scoped: only invalidates the specific post's comment query in PostCard | `PostCard.tsx` |
| **Realtime: inline comments double-invalidate** | Inline comment channel invalidated both top-comments AND full drawer comments unconditionally | Drawer comments only invalidated if drawer is open (`isCommentDrawerOpen` check) | `PostCard.tsx` |
| **Messaging: unbounded fallback** | RPC fallback fetched ALL messages with `select("*")` + profile joins | Fallback selects specific columns + capped at 500 messages | `messages-api.ts` |
| **Messaging: realtime re-fetch per message** | Each realtime message triggered a full SELECT by ID with profile joins | INSERT payloads used directly; only parallel profile fetch for sender/receiver | `messages-api.ts` |
| **Messaging: conversations full refetch** | Every realtime message invalidated conversations query (full refetch) | Optimistic cache update via `queryClient.setQueryData` — only refetches on new conversation partner | `Messaging.tsx` |
| **DB indexes** | Missing composite indexes for comment + message query patterns | Added `idx_comments_post_created`, `idx_comments_toplevel_post`, `idx_comment_likes_user_comment`, `idx_messages_conversation_covering/reverse` | Migration 086 |

### RPC Status

| RPC | Status | Deployed Migration |
| --- | ------ | ------------------ |
| `get_conversations` | ✅ Deployed (SECURITY INVOKER, `auth.uid()` guarded) | 024 |
| `get_unread_message_count` | ✅ Deployed (SECURITY INVOKER, `auth.uid()` guarded) | 022 |
| `toggle_reaction` | ✅ Deployed | (linked via social features) |

### Performance Validation Checklist

- [x] `getComments` uses `Promise.all` for parallel profile + likes fetch
- [x] `getComments` has pagination limit (default 50)
- [x] `getTopCommentsBatch` exists for batch top-comment loading
- [x] `getTopComments` delegates to `getTopCommentsBatch` (single-post convenience)
- [x] Home.tsx realtime: comment/like changes do NOT invalidate the feed query
- [x] PostCard.tsx: inline comment channel only invalidates drawer if open
- [x] Messaging fallback: capped at 500 messages with explicit column list
- [x] Messaging realtime: INSERT events use payload data instead of re-fetch
- [x] Messaging conversations: optimistic cache update, not full invalidation
- [x] DB indexes: composite indexes for comment and message query patterns
- [x] `get_conversations` RPC deployed and used (no fallback on normal operation)
- [x] `get_unread_message_count` RPC deployed and used

---

## AI System

### AI Career Chatbot

| Aspect | Status | Details |
| ------ | ------ | ------- |
| Component | ✅ `src/components/ai/AIChatbot.tsx` | Floating chat widget, visible to authenticated users |
| DB Tables | ✅ `ai_chat_sessions`, `ai_chat_messages` | Per-user sessions, CASCADE delete on session removal |
| RLS | ✅ Users CRUD own sessions/messages only | `auth.uid() = user_id` guard on all policies |
| Realtime | ✅ `ai_chat_messages` published | INSERT events → optimistic React Query cache append |
| Service Layer | ✅ `src/lib/ai-service.ts` | `createChatSession`, `getChatSessions`, `getChatMessages`, `saveChatMessage`, `sendAIChatMessage`, `deleteChatSession`, `updateChatSessionTitle` |
| Hooks | ✅ `src/hooks/useAIChat.ts` | `useAIChatSessions()`, `useAIChatMessages(sessionId)` with mutations + realtime |
| Edge Function | ✅ `supabase/functions/ai-chat/index.ts` | Proxies to OpenRouter API (`qwen/qwen3-235b-a22b:free`), JWT-authenticated |
| Persistence | ✅ Supabase-persisted | Sessions & messages survive page refresh, multi-device |
| Migration | ✅ `092_ai_system_tables.sql` | Deployed |

### AI Excel Upload Review (Workflow A)

| Aspect | Status | Details |
| ------ | ------ | ------- |
| Review Function | ✅ `reviewAlumniInviteData()` in `ai-service.ts` | Deterministic client-side checks (5 warning types) |
| Warning Types | ✅ `domain_anomaly`, `name_email_mismatch`, `graduation_year_anomaly`, `probable_duplicate`, `column_meaning_drift` | Levenshtein similarity for domains, regex for name/email |
| Admin Integration | ✅ `AdminAlumniInvites.tsx` | AI review runs after parse/validate, warnings shown in dialog with per-row exclude toggle |
| Audit Persistence | ✅ `ai_review_results` table | Stores input hash, warnings, admin decisions (accepted/excluded per row) |
| RLS | ✅ Platform admins only | `is_platform_admin()` guard |
| Principle | ✅ Advisory only | AI flags risks, admin decides. AI never creates/modifies invites. |

### AI System Walkthrough & Change Review (Workflows B & C)

| Aspect | Status | Details |
| ------ | ------ | ------- |
| System Walkthrough (B) | ℹ️ Documentation/process pattern | No runtime code — covered by TRUTH_MATRIX.md validation checklist |
| Change/Regression Review (C) | ℹ️ CI/PR process pattern | No runtime code — covered by code review + linting pipeline |

---

## Network Card Context Fix — Detailed Truth Matrix (Feb 10, 2026)

### Problem: Context Blindness on Network Cards

The Network page is college-scoped (`college_domain`), yet every card redundantly displayed the university/college name — adding zero information. Users scanning the network needed academic context (branch, year, graduation status), not the invariant college name.

### Issues Identified & Fixed

| Component | Before (Issue) | After (Fix) | Status |
| --------- | -------------- | ----------- | ------ |
| Network Discover query | Selected `id, full_name, avatar_url, role, university, college_domain, bio` only | Now also selects `branch, graduation_year, enrollment_year, course_duration_years` | ✅ FIXED |
| `getConnectionRequests()` (social-api.ts) | Profile SELECT: `id, full_name, avatar_url, role, domain` | Now also selects `branch, graduation_year, enrollment_year, course_duration_years` | ✅ FIXED |
| `getConnections()` (social-api.ts) | Profile SELECT: `id, full_name, avatar_url, role, domain` | Now also selects `branch, graduation_year, enrollment_year, course_duration_years` | ✅ FIXED |
| `NetworkUser` interface | Lacked `branch`, `graduation_year`, `enrollment_year`, `course_duration_years` | All 4 fields added (nullable) | ✅ FIXED |
| `toNetworkUser()` helper | Did not map academic fields | Maps all 4 new fields with null defaults | ✅ FIXED |
| Discover tab card subtitle | Showed `{user.university}` — redundant in college-scoped view | Shows computed `getRoleContextLine()`: branch + year based on role | ✅ FIXED |
| Requests tab card subtitle | Showed `{request.requester?.university}` | Shows `getRoleContextLine(request.requester)` | ✅ FIXED |
| Connections tab card subtitle | Showed `{user.university}` | Shows `getRoleContextLine(user)` | ✅ FIXED |
| Search placeholder | "Search by name, role, or university..." | "Search by name, role, or branch..." | ✅ FIXED |
| Search filter | Searched `university` field | Searches `branch` field | ✅ FIXED |
| AdvancedFilters: branch filter | Defined in `NetworkFilters` but **never applied** in filtering | Now filters users by `branch` (case-insensitive match) | ✅ FIXED |
| AdvancedFilters: year filter | Defined in `NetworkFilters` but **never applied** in filtering | Now computes year of study from `enrollment_year` + `course_duration_years` and matches | ✅ FIXED |

### Role Context Line Logic (`getRoleContextLine`)

| Role | Format | Example |
| ---- | ------ | ------- |
| Student (with enrollment_year) | `{branch} • {N}th Year` or `Final Year` | `CSE • 3rd Year` |
| Student (no enrollment_year, has graduation_year) | `{branch} • Class of {year}` | `ECE • Class of 2027` |
| Alumni | `{branch} • Class of {graduation_year}` | `Mechanical • Class of 2021` |
| Faculty | `Faculty • {branch}` | `Faculty • Computer Science` |
| Club / Organization | `Club • {branch}` | `Club • Entrepreneurship` |
| Fallback (no branch) | Role name only | `Student` |

### Year of Study Computation

```text
yearOfStudy = currentYear - enrollmentYear + 1
If yearOfStudy >= courseDuration → "Final Year"
Otherwise → ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
```

### Data Sources (All from Supabase `profiles` table)

| Field | Column | Type | Present Since |
| ----- | ------ | ---- | ------------- |
| Branch/Department | `profiles.branch` | text | Migration 002 |
| Graduation Year | `profiles.graduation_year` | text | Migration 002 |
| Enrollment Year | `profiles.enrollment_year` | integer | Migration 046 |
| Course Duration | `profiles.course_duration_years` | integer (default 4) | Migration 046 |

### Validation Checklist (Network Card Context Fix)

- [x] Discover tab: cards show branch + year instead of college name
- [x] Requests tab: requester cards show branch + year instead of college name
- [x] Connections tab: connected user cards show branch + year instead of college name
- [x] All data sourced from Supabase `profiles` table (no local state, no mock data)
- [x] `NetworkUser` interface includes all 4 academic fields
- [x] `toNetworkUser()` maps all 4 academic fields with safe defaults
- [x] `getRoleContextLine()` handles Student, Alumni, Faculty, Club, and fallback
- [x] Year of study correctly computed from `enrollment_year` + `course_duration_years`
- [x] Final Year detection works when `yearOfStudy >= duration`
- [x] Branch filter now functional in AdvancedFilters
- [x] Year filter now functional in AdvancedFilters
- [x] Search searches by branch (not redundant university)
- [x] Realtime subscription unchanged — still invalidates all `['network']` queries on connections change
- [x] React Query cache correctly includes new fields in stale/refetch cycle
- [x] No demo data, no fake IDs, no local-only state
- [x] Refresh page → card context lines unchanged (data from Supabase)
- [x] No new libraries introduced
- [x] No SQL migrations required (columns already exist)

### Alumni Directory Card Fix (Same Session)

| Component | Before (Issue) | After (Fix) | Status |
| --------- | -------------- | ----------- | ------ |
| Alumni query SELECT | Did not include `branch` from profiles | Now selects `branch` alongside other profile fields | ✅ FIXED |
| `AlumniUser` interface | Lacked `branch` field | Added `branch: string \| null` | ✅ FIXED |
| Alumni card subtitle | Only showed `Class of {year}` | Shows `{branch} • Class of {year}` (both optional, joined) | ✅ FIXED |
| Alumni search | Searched `university` (redundant in domain-scoped view) | Searches `branch` instead | ✅ FIXED |
| Search placeholder | "Search by name, company, position, or industry..." | "Search by name, company, position, branch, or industry..." | ✅ FIXED |
