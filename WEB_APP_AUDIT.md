# Clstr Web App — Comprehensive Source Audit

> Generated for PARITY_PLAN_V2.md planning. Covers every hook, context, page, component directory, and Supabase integration in `src/`.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication Methods](#2-authentication-methods)
3. [Identity & Role System](#3-identity--role-system)
4. [Supabase Tables & RPCs](#4-supabase-tables--rpcs)
5. [Edge Functions](#5-edge-functions)
6. [Realtime Subscriptions](#6-realtime-subscriptions)
7. [Hooks & Contexts — Full Inventory](#7-hooks--contexts--full-inventory)
8. [Pages — Full Inventory](#8-pages--full-inventory)
9. [Component Directory Map](#9-component-directory-map)
10. [Role-Based Logic & Permissions](#10-role-based-logic--permissions)
11. [Web-Only Features](#11-web-only-features)
12. [UI Component Patterns](#12-ui-component-patterns)
13. [Shared Package Dependencies](#13-shared-package-dependencies)
14. [Lib Layer — API & Utility Modules](#14-lib-layer--api--utility-modules)
15. [Type Definitions](#15-type-definitions)

---

## 1. Architecture Overview

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite (SPA) |
| Routing | React Router v6 |
| Data Fetching | TanStack React Query v5 |
| Backend | Supabase (Auth, Postgres, Realtime, Storage, Edge Functions) |
| Styling | Tailwind CSS + shadcn/ui + Framer Motion |
| Shared Code | `@clstr/shared` monorepo package (types, query-keys, channels, utils) |
| PWA | Service Worker + VAPID Push Notifications |
| Build | Vite, deployed on Vercel |

**Entry Points:**
- `src/main.tsx` → `src/App.tsx` → React Router with `<Layout>` wrapper
- Adapters layer: `src/adapters/` (bind.ts, core-client.ts, error-display.ts, web-deps.ts) — abstraction for web-specific dependencies

---

## 2. Authentication Methods

### 2.1 Google OAuth (Primary)
- **Login page:** Google OAuth only — `supabase.auth.signInWithOAuth({ provider: 'google' })`
- **Signup page:** Google OAuth as primary path
- Redirect URL: `{origin}/auth/callback` with security validation (must match current origin)
- Handles `?reason=email_transitioned` redirect on Login page (shows info toast)
- Merge info display when AuthCallback signals account merge

### 2.2 Magic Link (Signup Only)
- **Signup page:** Alternative to Google OAuth for academic email addresses
- Calls `send-magic-link` edge function with `{ email, redirectUrl }`
- Academic email validation via `useAcademicEmailValidator` hook (checks `.edu` or known academic domains)
- Shows "check your email" confirmation after sending

### 2.3 OTP (Alumni Invite Claim Only)
- **AlumniInvite page:** When alumni claim an invite, they authenticate via OTP to their personal email
- `supabase.auth.signInWithOtp({ email })` → 6-digit code verification
- Scoped to the alumni invite claim flow only — not general-purpose auth

### 2.4 Session Management
- Supabase session auto-refresh via `@supabase/supabase-js`
- `onAuthStateChange` listener in useIdentity invalidates/clears cache on SIGNED_IN/SIGNED_OUT
- Email transition forces full logout + redirect (JWT contains old email, must re-auth)
- Account deactivation: local-scope signOut + cache clear (15-day grace period)

---

## 3. Identity & Role System

### 3.1 Identity Context (Authoritative)
- **`src/contexts/IdentityContext.tsx`** wraps `useIdentity` hook
- Single source of truth via `get_identity_context()` RPC
- Returns: `identity`, `isAuthenticated`, `needsOnboarding`, `collegeDomain`, `role`, `isAlumni`, `isStudent`, `isFaculty`, `isClub`, `refreshIdentity`
- React Query config: `staleTime: Infinity`, `gcTime: 24 hours` — never re-fetches unless invalidated
- Invalidated by: auth state change, realtime profile row update (role, email, college_domain, is_verified)

### 3.2 Profile Context (Deprecated for Identity)
- **`src/contexts/ProfileContext.tsx`** — **DEPRECATED** for identity/role/permission checks
- Still valid for: `avatar_url`, `full_name`, `headline`, `bio`, `location`, `profile_completion`, `updateProfile()`
- Warning: `college_domain` from profile can diverge after email transitions
- Loads domain users filtered by `college_domain`, maintains realtime subscription

### 3.3 Four Canonical Roles
| Role | Source | Description |
|---|---|---|
| `Student` | Auto-determined by enrollment year vs current date | Active college student |
| `Alumni` | Auto-determined by graduation year, or accepted alumni invite | Graduated student |
| `Faculty` | Set during onboarding or admin | College staff/instructor |
| `Club` | Set via ClubAuth flow | Student organization account |

- `user_role` enum in DB: `"Student" | "Alumni" | "Faculty" | "Club" | "Organization"`
- Onboarding auto-detects Student vs Alumni based on enrollment/graduation year calculation

---

## 4. Supabase Tables & RPCs

### 4.1 Tables (Discovered from Hooks/Pages)

| Table | Used In | Purpose |
|---|---|---|
| `profiles` | ProfileContext, useIdentity, usePortfolioEditor, everywhere | Core user profiles |
| `alumni_profiles` | useMentorship, AlumniDirectory | Extended alumni data (graduation_year, industry, etc.) |
| `connections` | Network, Profile, Messaging | User-to-user connection graph |
| `posts` | Home, Feed, PostDetail, usePortfolioEditor | User-generated posts |
| `post_likes` | Feed, Home | Post like tracking |
| `comments` | Feed, Home, PostDetail | Post comments |
| `post_shares` | Feed | Post share/repost tracking |
| `events` | Events, EventDetail, UpcomingEvents | Campus events |
| `event_registrations` | Events, EventDetail | Event attendance tracking |
| `jobs` | Jobs, JobDetail | Job listings |
| `job_applications` | Jobs, JobDetail | Job application tracking |
| `saved_items` | SavedItems, Jobs, Projects | Bookmarked items (posts, jobs, projects, clubs) |
| `clubs` | Clubs, Events | Student organizations |
| `mentorship_offers` | useMentorship | Mentor availability/settings |
| `mentorship_requests` | useMentorship | Mentorship request tracking |
| `ai_chat_sessions` | useAIChat | AI career assistant conversation sessions |
| `ai_chat_messages` | useAIChat | Individual AI chat messages |
| `skill_analysis` | useSkillAnalysis | Skill gap analysis results |
| `profile_education` | usePortfolioEditor, EducationForm | Education history entries |
| `profile_experience` | usePortfolioEditor, ExperienceForm | Work experience entries |
| `profile_skills` | usePortfolioEditor, SkillForm | Skill inventory |
| `profile_projects` | usePortfolioEditor | Portfolio project entries |
| `portfolio_settings` | usePortfolio | Portfolio configuration (slug, template, active) |
| `user_settings` | useUserSettings, Settings | User preferences (notifications, privacy, theme) |
| `push_subscriptions` | usePushNotifications | Browser push notification subscriptions |
| `alumni_invites` | useAlumniInvites, useAlumniInviteClaim | Alumni invitation tokens + status |

### 4.2 RPCs (Discovered from Hooks/Pages)

| RPC | Hook/Page | Purpose |
|---|---|---|
| `get_identity_context()` | useIdentity | Authoritative identity resolution |
| `get_invite_ops_stats()` | useIdentity (useInviteOpsStats) | Admin invite operations statistics |
| `get_alumni_invites` | useAlumniInvites | List alumni invites with filters |
| `bulk_upsert_alumni_invites` | useAlumniInvites | Bulk create/update invites |
| `resend_alumni_invite` | useAlumniInvites | Resend invite email |
| `cancel_alumni_invite` | useAlumniInvites | Cancel pending invite |
| `validate_alumni_invite_token` | useAlumniInviteClaim | Validate invite token on claim |
| `accept_alumni_invite` | useAlumniInviteClaim | Accept an alumni invite |
| `dispute_alumni_invite` | useAlumniInviteClaim | Dispute an alumni invite |
| `get_accepted_invite_context()` | Onboarding | Get invite context for newly accepted alumni |
| `get_alumni_by_domain` | AlumniDirectory | Fetch alumni filtered by college domain |
| `typeaheadSearch()` | useTypeaheadSearch | Navbar search with domain isolation |

### 4.3 Supabase Client Configuration
- File: `src/integrations/supabase/client.ts`
- Auto-generated typed client: `createClient<Database>(URL, ANON_KEY)`
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### 4.4 Database Types
- File: `src/integrations/supabase/types.ts`
- Generic typed schema with `Database.public.Tables`, `.Views`, `.Functions`
- Enums: `user_role` ("Student"|"Alumni"|"Faculty"|"Club"|"Organization"), `skill_level` ("Beginner"|"Intermediate"|"Expert"|"Professional")

---

## 5. Edge Functions

| Function | Trigger | Purpose |
|---|---|---|
| `send-magic-link` | Signup page | Sends magic link for academic email auth |
| `send-alumni-invite-email` | useAlumniInvites (admin) | Sends alumni invitation emails |
| AI chat function (unnamed) | useAIChat | Processes AI career assistant messages |
| Skill analysis compute | useSkillAnalysis | Computes skill gap analysis |
| Account deactivation | useDeleteAccount | Deactivates account with grace period |
| Email verification | useEmailTransition | Sends/verifies email transition codes |

---

## 6. Realtime Subscriptions

The web app uses Supabase `postgres_changes` extensively. Every major data entity has realtime:

| Channel/Table | Hook/Page | Events |
|---|---|---|
| `profiles` (row changes) | useIdentity, ProfileContext, usePortfolioEditor | UPDATE (role, email, domain, verified) |
| `posts` | Feed, Home | INSERT, UPDATE, DELETE |
| `post_likes` | Feed | INSERT, DELETE |
| `comments` | Feed | INSERT, DELETE |
| `post_shares` | Feed | INSERT |
| `connections` | Network, Profile | INSERT, UPDATE, DELETE |
| `events` | Events | * |
| `event_registrations` | Events | * |
| `jobs` | Jobs, JobDetail | * |
| `job_applications` | JobDetail | * |
| `saved_items` | SavedItems, JobDetail | * |
| `clubs` | Clubs | * |
| `mentorship_offers` | useMentorship | * |
| `mentorship_requests` | useMentorship | * |
| `ai_chat_messages` | useAIChat | INSERT |
| `ai_chat_sessions` | useAIChat | * |
| `skill_analysis` | useSkillAnalysis | * |
| `portfolio_settings` | usePortfolio | * |
| `profile_education` | usePortfolioEditor | * |
| `profile_experience` | usePortfolioEditor | * |
| `profile_skills` | usePortfolioEditor | * |
| `profile_projects` | usePortfolioEditor | * |
| `user_settings` | useUserSettings | * |
| Partner profiles | Messaging | UPDATE (full_name, avatar_url, headline) |

**Pattern:** Most subscriptions use the shared `CHANNELS` object from `@clstr/shared` for channel naming, and invalidate React Query caches on change.

---

## 7. Hooks & Contexts — Full Inventory

### Contexts (2)

| Context | File | Lines | Purpose |
|---|---|---|---|
| IdentityContext | `src/contexts/IdentityContext.tsx` | 71 | Wraps useIdentity; provides role flags, collegeDomain, refreshIdentity |
| ProfileContext | `src/contexts/ProfileContext.tsx` | 499 | Profile CRUD, domain users, realtime. **DEPRECATED** for identity checks |

### Hooks (19)

| Hook | File | Lines | Purpose |
|---|---|---|---|
| useIdentity | `src/hooks/useIdentity.ts` | 210 | `get_identity_context()` RPC, auth listener, realtime invalidation |
| useNetwork | `src/hooks/useNetwork.ts` | 42 | Online/offline detection, connection quality info |
| usePermissions | `src/hooks/usePermissions.ts` | 78 | **DEPRECATED** — delegates to IdentityContext |
| useRolePermissions | `src/hooks/useRolePermissions.ts` | 259 | 40+ boolean RBAC permissions for all features |
| useFeatureAccess | `src/hooks/useFeatureAccess.ts` | 155 | Feature × Profile matrix, route guards, hidden nav items |
| useAIChat | `src/hooks/useAIChat.ts` | 160 | AI career assistant sessions/messages, edge function calls |
| useMentorship | `src/hooks/useMentorship.ts` | 929 | Mentors, requests, relationships, offer settings, realtime |
| usePortfolio | `src/hooks/usePortfolio.ts` | 82 | Portfolio settings CRUD, activate portfolio |
| usePortfolioEditor | `src/hooks/usePortfolioEditor.ts` | 308 | WYSIWYG editor: load/save 5 sub-tables, realtime sync with dirty check |
| useSkillAnalysis | `src/hooks/useSkillAnalysis.ts` | 110 | Skill gap analysis CRUD + compute, realtime |
| useAlumniInvites | `src/hooks/useAlumniInvites.ts` | 175 | Admin: bulk upload, resend, cancel invites via RPCs |
| useAlumniInviteClaim | `src/hooks/useAlumniInviteClaim.ts` | 100 | Public: validate, accept, dispute invites via RPCs |
| useDeleteAccount | `src/hooks/useDeleteAccount.ts` | 40 | Account deactivation with 15-day grace period |
| useEmailTransition | `src/hooks/useEmailTransition.ts` | 200 | Full email migration (college→personal): link, verify, transition, remove |
| useFileUpload | `src/hooks/useFileUpload.ts` | 120 | Client-side file validation, drag-drop, previews, progress |
| usePushNotifications | `src/hooks/usePushNotifications.ts` | 256 | PWA push: SW registration, VAPID, enable/disable, test |
| useUserSettings | `src/hooks/useUserSettings.ts` | 75 | User preferences CRUD with realtime |
| usePagination | `src/hooks/usePagination.ts` | 55 | Simple client-side pagination |
| useTypeaheadSearch | `src/hooks/useTypeaheadSearch.ts` | 40 | Navbar typeahead search with college_domain isolation |

---

## 8. Pages — Full Inventory

### Auth & Onboarding

| Page | File | Lines | Key Features |
|---|---|---|---|
| Login | `src/pages/Login.tsx` | ~230 | Google OAuth only; responsive mobile glass card / desktop two-column; handles email_transitioned redirect, merge info |
| Signup | `src/pages/Signup.tsx` | ~200 | Google OAuth + Magic Link; academic email validation; redirect URL security |
| Onboarding | `src/pages/Onboarding.tsx` | 1369 | Multi-step: role selection → university/major → enrollment year → auto-detect Student/Alumni; alumni invite context from RPC; ClubAuth staff detection |

### Core App Pages

| Page | File | Lines | Key Features |
|---|---|---|---|
| Home | `src/pages/Home.tsx` | 383 | Infinite scroll feed; PostComposer; ProfileSummary sidebar; QuickNavigation; TrendingConnections; TrendingTopics; UpcomingEvents; ProfileCompletionBanner; PersonalEmailPrompt |
| Feed | `src/pages/Feed.tsx` | 213 | Post feed with realtime on posts/likes/comments/shares; network stats sidebar |
| Search | `src/pages/Search.tsx` | 6 | Redirects to /home (search is navbar typeahead) |
| Profile | `src/pages/Profile.tsx` | 520 | Own/other profile view; edit modal; avatar upload/remove; connection status + actions; stats (connections, views, posts); realtime |
| ProfileConnections | `src/pages/ProfileConnectionsPage.tsx` | 85 | Own connections only; delegates to ProfileConnections component |
| Settings | `src/pages/Settings.tsx` | 753 | Tabs: notifications (push), privacy, account; EmailTransitionSettings; theme selection; password reset; account deactivation |

### Social & Communication

| Page | File | Lines | Key Features |
|---|---|---|---|
| Messaging | `src/pages/Messaging.tsx` | 437 | Conversations list; ChatView; connected users without conversations; realtime partner updates; URL deep-link (?partner=) |
| Network | `src/pages/Network.tsx` | 817 | User discovery; connection requests; AdvancedFilters; role-contextual subtitle |

### Content & Activities

| Page | File | Lines | Key Features |
|---|---|---|---|
| Events | `src/pages/Events.tsx` | 2119 | Full CRUD; virtual/in-person/hybrid; external registration links; registration tracking; EventShareModal; club follow |
| Jobs | `src/pages/Jobs.tsx` | 817 | Browse/search/filter; AI-recommended; alumni jobs; saved; posting dialog; application dialog; **Route guard: Faculty/Club blocked** |
| Clubs | `src/pages/Clubs.tsx` | 446 | Club discovery; join (Students) / follow (Alumni via connections); realtime |
| Projects | `src/pages/Projects.tsx` | 2294 | Projects + TeamUps dual system; create/apply/manage; role-based applications; save items |
| Mentorship | `src/pages/Mentorship.tsx` | 370 | Student: find mentors, my requests; Mentor: dashboard, offer settings, incoming requests |
| EcoCampus | `src/pages/EcoCampus.tsx` | 100 | Campus marketplace: SharedItems, Requests, MyListings; **Route guard: Alumni/Club blocked** |
| SkillAnalysis | `src/pages/SkillAnalysis.tsx` | 555 | Skill gap analysis; market alignment; peer comparison (Students only); **Route guard: Faculty/Club blocked** |

### Portfolio System

| Page | File | Lines | Key Features |
|---|---|---|---|
| Portfolio | `src/pages/Portfolio.tsx` | 126 | Public page at `/portfolio/:slug`; slug resolution; PortfolioRenderer; JSON-LD SEO |
| PortfolioEditor | `src/pages/PortfolioEditor.tsx` | 644 | Split-screen WYSIWYG; 4 templates (Minimal, Eliana, Typefolio, Geeky); all sections editable |

### Alumni System

| Page | File | Lines | Key Features |
|---|---|---|---|
| AlumniDirectory | `src/pages/AlumniDirectory.tsx` | 657 | Alumni discovery; filters (graduation year, industry, mentor status); `get_alumni_by_domain` RPC |
| AlumniInvite | `src/pages/AlumniInvite.tsx` | 540 | Public invite claim: validate token → confirm identity → OTP auth to personal email → accept → onboarding |

### Detail Pages

| Page | File | Lines | Key Features |
|---|---|---|---|
| PostDetail | `src/pages/PostDetail.tsx` | 234 | Public/private post view; auth detection → public API fallback |
| EventDetail | `src/pages/EventDetail.tsx` | 239 | Public/private event detail; auth detection |
| JobDetail | `src/pages/JobDetail.tsx` | 165 | Job detail; realtime on jobs/saved_items/job_applications |

### Utility Pages

| Page | File | Lines | Key Features |
|---|---|---|---|
| SavedItems | `src/pages/SavedItems.tsx` | 377 | Saved posts/jobs/projects/clubs with tabs; unsave functionality |
| HelpCenter | `src/pages/HelpCenter.tsx` | 322 | FAQ with categories; contact form writes to Supabase |
| Landing | `src/pages/Landing.tsx` | 50 | Marketing: Navbar, Hero, Promo, MeetIRL, FeaturedSections, HowItWorks, Prizes, Footer |

---

## 9. Component Directory Map

### `src/components/auth/` (3 files)
- `PermissionGuard.tsx` — Wraps children with permission check
- `ReactivationPrompt.tsx` — Prompt for reactivating deactivated accounts
- `RouteGuard.tsx` — Route-level permission enforcement with redirect

### `src/components/events/` (4 files)
- `EventDetailCard.tsx` — Event detail card layout
- `EventShareModal.tsx` — Share event via link/social
- `PublicEventCard.tsx` — Public-facing event card
- `index.ts` — Barrel exports

### `src/components/jobs/` (2 files)
- `JobApplicationDialog.tsx` — Apply to job dialog
- `JobPostingDialog.tsx` — Create/edit job posting dialog

### `src/components/messages/` (2 files)
- `ChatView.tsx` — Individual conversation view
- `ConversationList.tsx` — List of conversations

### `src/components/network/` (2 files)
- `AdvancedFilters.tsx` — Multi-faceted network search filters
- `ConnectionManager.tsx` — Connection request management

### `src/components/profile/` (25 files + 2 subdirs)
- `AlumniProfileSection.tsx` / `ClubProfileSection.tsx` / `FacultyProfileSection.tsx` / `StudentProfileSection.tsx` / `OrganizationProfileSection.tsx` — Role-specific profile sections
- `RoleSpecificProfile.tsx` — Role-aware profile rendering switcher
- `AvatarCropModal.tsx` / `CoverPhotoUpload.tsx` — Media upload/crop
- `EditProfileModal.tsx` — Profile edit dialog
- `EducationForm.tsx` / `ExperienceForm.tsx` / `SkillForm.tsx` — Sub-entity forms
- `EmailTransitionSettings.tsx` — Email transition UI in settings
- `PersonalEmailPrompt.tsx` — Prompt to add personal email
- `ProfileActions.tsx` — Connect/message/follow action buttons
- `ProfileCompletionBanner.tsx` — Profile completion progress nudge
- `ProfileConnections.tsx` — Connections list/grid
- `ProfileEducation.tsx` / `ProfileExperience.tsx` / `ProfileSkills.tsx` / `ProfileProjects.tsx` / `ProfilePosts.tsx` — Profile section renderers
- `ProfileHeader.tsx` — Profile header with avatar, name, stats
- `ProfileTabs.tsx` — Tab navigation for profile sections
- **`portfolio/`** (5 files): `PortfolioRenderer.tsx`, `MinimalTemplate.tsx`, `ElianaTemplate.tsx`, `TypefolioTemplate.tsx`, `GeekyTemplate.tsx`
- **`tabs/`** (3 files): `AboutTab.tsx`, `PostsTab.tsx`, `ProjectsTab.tsx`

### `src/components/mentorship/` (6 files)
- `MentorCard.tsx` — Mentor discovery card
- `MentorDashboard.tsx` — Mentor's management dashboard
- `MentorOfferSettings.tsx` — Configure mentorship availability
- `MentorStatusBadge.tsx` — Active/paused/unavailable badge
- `StudentRequestList.tsx` — Student's mentorship request list
- `index.ts` — Barrel exports

### `src/components/ecocampus/` (4 files)
- `SharedItems.tsx` — Browse shared campus items
- `Requests.tsx` — Item request management
- `MyListings.tsx` — User's own listings
- `NewPostDialog.tsx` — Create marketplace listing

### `src/components/ai/` (1 file)
- `AIChatbot.tsx` — AI career assistant chat interface

### `src/components/home/` (23 files)
- **Post System:** `PostCard.tsx`, `PostComposer.tsx`, `PostComments.tsx`, `CreatePostCard.tsx`, `CreatePostModal.tsx`, `PublicPostCard.tsx`, `RepostModal.tsx`, `ShareModal.tsx`
- **Comments:** `CommentSection.tsx`, `CommentDrawer.tsx`, `InlineCommentInput.tsx`, `comment-utils.ts`
- **Engagement:** `ReactionPicker.tsx`, `PollCreator.tsx`
- **Media:** `DragDropZone.tsx`, `MediaPreview.tsx`
- **Sidebar/Discovery:** `ProfileSummary.tsx`, `QuickNavigation.tsx`, `TrendingAlumni.tsx`, `TrendingTopics.tsx`, `TrendingTopicCard.tsx`, `UpcomingEvents.tsx`
- **Hero:** `HeroSection.tsx`

### `src/components/landing/` (7 files)
- `HeroSection.tsx` — Landing page hero
- `PromoSection.tsx` — Product promotion
- `MeetIRLSection.tsx` — IRL meetup section
- `FeaturedSections.tsx` — Featured content
- `HowItWorksSection.tsx` — How-it-works steps
- `PrizesSection.tsx` — Prizes/rewards
- `Footer.tsx` — Landing footer

### `src/components/layout/` (10 files)
- `Layout.tsx` — Main app layout wrapper
- `PublicLayout.tsx` — Layout for public/unauthenticated pages
- `Navbar.tsx` — Top navigation bar
- `Footer.tsx` — App footer
- `AddButton.tsx` — Floating action button (role-aware options)
- `AuthGate.tsx` — Auth-required wrapper
- `FloatingChatWidget.tsx` — Floating AI chat widget
- `NotificationDropdown.tsx` — Notification bell dropdown
- `ScrollToTop.tsx` — Scroll restoration
- `Layout.test.tsx` — Layout tests

### `src/components/mobile/` (2 files)
- `BottomNavigation.tsx` — Mobile bottom tab bar
- `MobileMenu.tsx` — Mobile hamburger menu

### `src/components/moderation/` (0 files)
- **Empty directory** — Placeholder for moderation features

### `src/components/pwa/` (1 file)
- `InstallPrompt.tsx` — PWA install prompt

### `src/components/team-ups/` (4 files)
- `CreateTeamUpModal.tsx` — Create a team-up
- `JoinTeamUpModal.tsx` — Join a team-up
- `TeamUpCard.tsx` — Team-up display card
- `index.ts` — Barrel exports

### `src/components/ui/` (65 files)
Full shadcn/ui component library plus custom additions:
- **Standard shadcn:** accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, switch, table, tabs, textarea, toggle, toggle-group, tooltip
- **Toast System:** toast.tsx, toaster.tsx, sonner.tsx, use-toast.ts
- **Custom Components:** autocomplete, BatchFilter, circular-progress, DateRangeFilter, DepartmentFilter, empty-state, error-state, ErrorBoundary, lazy-image, page-not-found, skeleton-loader, surface-card, typography, undo-snackbar, user-avatar, user-badge

---

## 10. Role-Based Logic & Permissions

### 10.1 Feature × Profile Matrix (February 2026 Final)

| Feature | Student | Alumni | Faculty | Club |
|---|---|---|---|---|
| Feed | ✅ | ✅ | ✅ | ✅ |
| Network | ✅ | ✅ | ✅ | ✅ |
| Messaging | ✅ | ✅ | ✅ | ✅ |
| Events | ✅ | ✅ | ✅ | ✅ |
| Portfolio | ✅ | ✅ | ✅ | ✅ |
| AI Chat | ✅ | ✅ | ✅ | ✅ |
| Club Mgmt | ✅ | ✅ | ✅ | ✅ |
| Jobs | ✅ | ✅ | ❌ | ❌ |
| Mentorship | ✅ Request | ✅ Offer | ✅ Offer | ❌ |
| EcoCampus | ✅ | ❌ | ✅ | ❌ |
| Skill Analysis | ✅ | ✅ | ❌ | ❌ |
| Alumni Directory | ✅ | ✅ | ✅ | ❌ |
| Projects/TeamUps | ✅ | ✅ | ✅ | ✅ |

### 10.2 Permission Implementation Stack
1. **`useFeatureAccess`** → calls `getFeaturePermissions()` from `@/lib/feature-permissions`
2. **`useRolePermissions`** → 40+ granular booleans per feature area
3. **`useRouteGuard`** → redirect-on-denied with offline awareness
4. **`RouteGuard` component** → declarative route protection
5. **`PermissionGuard` component** → inline permission gating
6. **`AddButton`** → role-aware floating action button options

### 10.3 Key Role Rules
- Students request mentorship; Alumni/Faculty offer mentorship
- Club leads manage clubs; Students join clubs; Alumni follow clubs
- "Permissions apply at ACTION TIME, not HISTORICAL STATE TIME" — e.g., a student who transitions to alumni still sees old mentorship requests
- `addButtonOptions` array is dynamically filtered by role

---

## 11. Web-Only Features

These features exist in the web app but will need careful consideration for mobile parity:

### 11.1 PWA Infrastructure
- Service worker registration (`usePushNotifications`)
- VAPID push notification subscription/management
- `InstallPrompt.tsx` — prompts user to install PWA
- Standalone mode detection + auto-prompt behavior
- **Mobile equivalent:** React Native push notifications (Expo Notifications)

### 11.2 Portfolio Public Pages
- `/portfolio/:slug` — public portfolio URLs
- 4 theme templates: Minimal, Eliana, Typefolio, Geeky
- WYSIWYG split-screen editor
- JSON-LD structured data for SEO
- **Mobile equivalent:** Deep link to web portfolio or in-app WebView

### 11.3 Landing/Marketing Page
- Full marketing page with 7 sections
- SEO-optimized with structured data
- **Mobile equivalent:** Not applicable (app store listing serves this purpose)

### 11.4 Admin Alumni Invite Dashboard
- Bulk invite upload, resend, cancel
- RPCs + edge functions for email sending
- **Mobile equivalent:** May be admin-only web feature

### 11.5 Email Transition System
- College email → personal email migration
- 6-digit verification code flow
- 34 verification matrix states (cooldown, rate-limit, brute-force lockout, expired)
- Forces JWT refresh via logout+redirect
- **Mobile equivalent:** Same Supabase backend, needs dedicated UI

### 11.6 URL-Based Deep Linking
- `?partner=` for direct messaging
- `?reason=email_transitioned` for login redirects
- Public/private detail pages with auth detection fallback
- **Mobile equivalent:** React Navigation deep links

### 11.7 Drag-and-Drop
- File upload with drag-drop zones (`useFileUpload`, `DragDropZone.tsx`)
- **Mobile equivalent:** Image picker / document picker

### 11.8 Floating Chat Widget
- `FloatingChatWidget.tsx` — persistent AI chat bubble in layout
- **Mobile equivalent:** Tab or dedicated screen

---

## 12. UI Component Patterns

### 12.1 Design System
- **Colors:** Dark theme — `bg-black`, `text-white`, opacity variants (`text-white/80`, `text-white/60`)
- **Font:** Space Grotesk (imported)
- **Cards:** Glass morphism effect — `bg-white/5`, `backdrop-blur`, `border-white/10`
- **Animations:** Framer Motion throughout — `motion.div` for page transitions, list animations, hover effects
- **Icons:** Lucide React icon library
- **Toasts:** Sonner toast library
- **Design Tokens:** `src/lib/design-tokens.ts` — centralized design system constants

### 12.2 Layout Pattern
```
PublicLayout (no auth) → Landing, Login, Signup, Portfolio, AlumniInvite
Layout (auth required) → All other pages
  ├── Navbar (top) → search typeahead, notifications, avatar
  ├── Main content area
  ├── BottomNavigation (mobile only)
  └── FloatingChatWidget (AI assistant)
```

### 12.3 Component Library (shadcn/ui)
65 components in `src/components/ui/`, including full shadcn foundation plus custom additions for the domain (BatchFilter, DepartmentFilter, DateRangeFilter, user-avatar, user-badge, empty-state, error-state, surface-card, undo-snackbar, lazy-image, circular-progress).

### 12.4 Common Page Pattern
```tsx
// Every page follows this pattern:
function Page() {
  const { identity, isAuthenticated, collegeDomain } = useIdentityContext();
  const { canAccessFeature } = useFeatureAccess();
  const { data, isLoading } = useQuery(/* Supabase query */);
  // Realtime subscription via useEffect
  // Route guard check
  // Responsive layout with motion animations
}
```

---

## 13. Shared Package Dependencies

The web app imports from `@clstr/shared`:

| Import | Purpose |
|---|---|
| `@clstr/shared/types/identity` | IdentityContext type definition |
| `@clstr/shared/types/profile` | UserProfile, ProfileUpdate types |
| `@clstr/shared/types/portfolio` | PortfolioSettings, PortfolioData types |
| `@clstr/shared/types/mentorship` | Mentorship types |
| `@clstr/shared/types/alumni-invite` | AlumniInvite types |
| `@clstr/shared/types/ai` | AI chat types |
| `@clstr/shared/query-keys` | `QUERY_KEYS` object — centralized cache keys |
| `@clstr/shared/channels` | `CHANNELS` object — realtime channel names |
| `@clstr/shared/utils/uuid` | UUID generation |
| `@clstr/shared/utils/university-data` | University/college data for autocomplete |

---

## 14. Lib Layer — API & Utility Modules

The `src/lib/` directory contains 40+ modules organizing all Supabase API calls and utilities:

### API Modules
| Module | Purpose |
|---|---|
| `api.ts` | Core API utilities/helpers |
| `profile-api.ts` | Profile CRUD operations |
| `social-api.ts` | Connections, likes, comments, shares |
| `messages-api.ts` | Messaging/conversations |
| `events-api.ts` | Events CRUD + registration |
| `jobs-api.ts` | Jobs CRUD + applications |
| `clubs-api.ts` | Clubs CRUD + membership |
| `projects-api.ts` | Projects CRUD |
| `team-ups-api.ts` | Team-ups CRUD |
| `ecocampus-api.ts` | EcoCampus marketplace |
| `portfolio-api.ts` | Portfolio CRUD |
| `portfolio-adapter.ts` | Portfolio data transformation |
| `search-api.ts` | Search operations |
| `typeahead-search.ts` | Typeahead search implementation |
| `saved-api.ts` | Saved items CRUD |
| `trending-api.ts` | Trending content |
| `resume-api.ts` | Resume operations |
| `ai-service.ts` | AI assistant service |
| `skill-analysis-api.ts` | Skill analysis operations |
| `admin-api.ts` | Admin operations |
| `admin-constants.ts` | Admin configuration |

### Utility Modules
| Module | Purpose |
|---|---|
| `permissions.ts` | Permission checking functions |
| `feature-permissions.ts` | Feature × Profile matrix implementation |
| `account.ts` | Account operations (deactivate) |
| `email-transition.ts` | Email transition flow logic |
| `alumni-identification.ts` | Alumni detection helpers |
| `alumni-invite-parser.ts` | Invite data parsing |
| `analytics.ts` | Analytics tracking |
| `animations.ts` | Animation presets |
| `college-utils.ts` | College/university helpers |
| `cropImage.ts` | Image cropping utility |
| `design-tokens.ts` | Design system constants |
| `errorHandler.ts` | Global error handling |
| `event-status.ts` | Event status computation |
| `profile.ts` | Profile helper functions |
| `pushNotifications.ts` | Push notification utilities |
| `schema.ts` | Validation schemas (Zod) |
| `university-data.ts` | University database |
| `user-settings.ts` | User settings helpers |
| `utils.ts` | General utilities |
| `uuid.ts` | UUID generation |
| `validation.ts` | Input validation |

---

## 15. Type Definitions

Local type files in `src/types/`:

| Type File | Purpose |
|---|---|
| `admin.ts` | Admin-specific types |
| `ai.ts` | AI chat session/message types |
| `alumni-invite.ts` | Alumni invite types |
| `identity.ts` | Identity context types |
| `mentorship.ts` | Mentorship types |
| `portfolio.ts` | Portfolio types |
| `profile.ts` | Profile types |
| `social.ts` | Social interaction types |
| `supabase.ts` | Supabase-specific type augmentations |

---

## Summary for Parity Planning

### What the mobile app MUST replicate:
1. **Identity system** — `get_identity_context()` RPC, 4 canonical roles, feature matrix
2. **Core feeds** — Posts with likes/comments/shares, realtime updates
3. **Network** — Connections, discovery, advanced filters
4. **Messaging** — Conversations, chat view, realtime
5. **Events** — Full CRUD with registration, virtual/hybrid support
6. **Jobs** — Browse, apply, AI recommendations (role-gated)
7. **Clubs** — Discovery, join/follow
8. **Mentorship** — Student request / Mentor offer dual flow
9. **Projects + TeamUps** — Full CRUD with applications
10. **Profile** — Edit, role-specific sections, connections, stats
11. **Settings** — Notifications, privacy, theme, account management
12. **Saved items** — Cross-entity bookmarks
13. **EcoCampus** — Marketplace (role-gated)
14. **Skill Analysis** — Gap analysis (role-gated)
15. **Alumni Directory** — Discovery with filters
16. **AI Career Assistant** — Chat sessions with edge function backend
17. **Email transition** — College→personal email migration

### What may differ on mobile:
- **PWA/Push** → Expo Notifications (different implementation, same backend)
- **Portfolio public pages** → Deep link to web or WebView
- **Landing page** → Not needed (App Store handles marketing)
- **Admin alumni invites** → Possibly web-only admin tool
- **Drag-and-drop file upload** → Native image/document picker
- **Floating chat widget** → Dedicated tab or bottom sheet
- **URL deep linking** → React Navigation deep links
- **SEO/JSON-LD** → Not applicable for native app

### Shared backend (no changes needed):
- All Supabase tables, RPCs, edge functions
- All realtime channel subscriptions
- `@clstr/shared` package (types, query-keys, channels, utils)
- Authentication providers (Google OAuth, OTP)
