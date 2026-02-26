# Clstr Mobile App — Comprehensive Audit Report

**Date:** 2026-02-22  
**Scope:** 49 screens · 24 hooks · 21 API adapters · realtime infrastructure · shared packages  
**Codebase:** `c:\Users\2005g\clstr-reactnative`

---

## Table of Contents

1. [Screen Inventory — Features, Hardcoded Data & TODOs](#1-screen-inventory)
2. [Hook Inventory — Supabase Calls & Dependencies](#2-hook-inventory)
3. [API Layer — Operations & Binding Pattern](#3-api-layer)
4. [Realtime Channels — Full Registry](#4-realtime-channels)
5. [Constants & Theme System](#5-constants--theme)
6. [Shared Packages — @clstr/core & @clstr/shared](#6-shared-packages)
7. [Mobile vs Web Hook Mismatches](#7-mobile-vs-web-hook-mismatches)
8. [Stub & Placeholder Screens](#8-stub--placeholder-screens)

---

## 1. Screen Inventory

### 1.1 Tab Screens (8)

| Screen | File | Lines | Key Features | Data Source | Hardcoded Data | TODOs |
|--------|------|-------|-------------|-------------|----------------|-------|
| **Tab Layout** | `app/(tabs)/_layout.tsx` | 245 | 5 visible + 3 hidden tabs, iOS 26+ liquid glass (`expo-glass-effect`), Create tab intercept → `/create-post` modal, `NotificationBell` badge | — | Tab icons via expo-symbols | None |
| **Feed** | `app/(tabs)/index.tsx` | 529 | Infinite scroll (`useInfiniteQuery`), reactions, sharing, reposting, sort toggle (latest/trending), network stats row, new-posts banner via realtime, `FeedSkeleton` loading | `getPosts`, `toggleReaction`, `toggleSavePost`, `voteOnPoll`, `getConnectionCount`, `getProfileViewsCount` | None | None |
| **Network** | `app/(tabs)/network.tsx` | ~290 | Connections with accept/reject, typeahead search, filter tabs | `getConnections`, `getPendingRequests`, `acceptConnection`, `rejectConnection` | None | None |
| **Messages** | `app/(tabs)/messages.tsx` | ~160 | Conversation list with search, unread counts | `getConversations` via `useMessageSubscription` | None | None |
| **Events** | `app/(tabs)/events.tsx` | ~290 | Events list with RSVP, 5 category filters (Academic/Career/Social/Workshop/Sports) | `getEvents`, `toggleEventRegistration` | Category list hardcoded in filter UI | None |
| **Profile** | `app/(tabs)/profile.tsx` | 637 | 3 sub-tabs (Posts/About/Projects), profile completion banner, social links, education/experience/skills, portfolio link, role-specific menu | `getProfile`, `getConnectionCount`, `getUserPostsCount`, `getProfileViewsCount`, `getExperiences`, `getEducation`, `getSkills`, `getPostsByUser`, `getMyProjects`, `calculateProfileCompletion`, `getMissingProfileFields` | None | None |
| **Create** | `app/(tabs)/create.tsx` | 16 | **STUB** — empty `<View />`; tab press intercepted in `_layout.tsx` | — | — | — |
| **More** | `app/(tabs)/more.tsx` | ~250 | Settings/menu hub, role-filtered sections (Saved, Mentorship, CollabHub, EcoCampus, AI Chatbot, Portfolio) | `getProfile` | Menu items hardcoded with icons | None |
| **Notifications** | `app/(tabs)/notifications.tsx` | ~130 | Notification list, mark-read, bulk mark-all | `getNotifications`, `markNotificationRead`, `markAllNotificationsRead` via `useNotificationSubscription` | None | None |

### 1.2 Auth Screens (7)

| Screen | File | Lines | Key Features | Data Source | Hardcoded Data | TODOs |
|--------|------|-------|-------------|-------------|----------------|-------|
| **Auth Layout** | `app/(auth)/_layout.tsx` | 22 | Stack layout, black background, `headerShown: false` | — | — | None |
| **Login** | `app/(auth)/login.tsx` | ~190 | Google-only OAuth sign-in. Custom "G" SVG button | `supabase.auth.signInWithOAuth` | Google SVG inline | None |
| **Signup** | `app/(auth)/signup.tsx` | ~280 | Google OAuth + magic link (OTP) dual-method signup | `supabase.auth.signInWithOAuth`, `supabase.auth.signInWithOtp` | None | None |
| **Onboarding** | `app/(auth)/onboarding.tsx` | 639 | 8-step wizard (Name → Avatar → University → Major → Timeline → Interests → Social Links → Bio). Auto role detection | `useFileUpload`, `@clstr/shared/utils/university-data`, `@clstr/core/api/alumni-identification` | Interest tags list, social link templates | None |
| **Forgot Password** | `app/(auth)/forgot-password.tsx` | ~150 | Password reset via email | `supabase.auth.resetPasswordForEmail` | None | None |
| **Verify Email** | `app/(auth)/verify-email.tsx` | ~60 | Static info screen — no API calls | — | Static instructional text | None |
| **Magic Link Sent** | `app/(auth)/magic-link-sent.tsx` | ~65 | Static confirmation — no API calls | — | Static confirmation text | None |
| **Academic Email Required** | `app/(auth)/academic-email-required.tsx` | 241 | Academic email gate with sign-out option | `supabase.auth.signOut` | None | None |

### 1.3 Auth Callback (1)

| Screen | File | Lines | Key Features | Hardcoded Data | TODOs |
|--------|------|-------|-------------|----------------|-------|
| **Auth Callback** | `app/auth/callback.tsx` | 475 | Deep-link handler for Supabase auth redirects (implicit grant + PKCE). Multi-phase: extracting → validating → profile → syncing → redirecting. Academic email validation, domain sync | None | None |

### 1.4 Dynamic Route Detail Screens (7)

| Screen | File | Lines | Key Features | Data Source | Hardcoded Data | TODOs |
|--------|------|-------|-------------|-------------|----------------|-------|
| **Post Detail** | `app/post/[id].tsx` | 418 | Comments, reactions, sharing, polls. Realtime on 6 tables | `getPostById`, `toggleReaction`, `toggleSavePost`, `voteOnPoll` | None | None |
| **Chat** | `app/chat/[id].tsx` | 465 | 1:1 messaging, attachments (image/photo/document), suggested replies, typing indicator | `getMessages`, `getProfile`, `sendMessage`, `markMessagesAsRead`, `checkConnectionStatus`, `isUserOnline` | Suggested reply prompts | None |
| **Event Detail** | `app/event/[id].tsx` | 290 | RSVP toggle, sharing, realtime registration counts | `getEventById`, `toggleEventRegistration` | None | None |
| **User Profile** | `app/user/[id].tsx` | 462 | Connect/disconnect/block, infinite posts, mutual connections | `getProfileById`, `checkConnectionStatus`, `sendConnectionRequest`, `removeConnection`, `countMutualConnections`, `getUserPostsCount`, `getPostsByUser`, `getConnectionCount`, `blockConnection` | None | None |
| **Club Detail** | `app/club/[id].tsx` | 658 | 4 sub-tabs (About/Events/Posts/Members), follow/unfollow | `followClubConnection`, `unfollowClubConnection`, **direct `supabase.from('profiles').select()`** | None | None |
| **Job Detail** | `app/job/[id].tsx` | 390 | Apply/save, realtime on 3 tables | `getJobById`, `toggleSaveJob`, `applyToJob` | None | None |
| **Project Detail** | `app/project/[id].tsx` | 1101 | Roles, team, applications, status management, delete | `getProject`, `getProjectRoles`, `getProjectTeamMembers`, `getApplicationsForProject`, `applyForRole`, `updateProjectApplicationStatus`, `updateProjectStatus`, `deleteProject` | None | None |

### 1.5 Standalone Screens (24)

| Screen | File | Lines | Key Features | Hardcoded Data | TODOs |
|--------|------|-------|-------------|----------------|-------|
| **Clubs** | `app/clubs.tsx` | 312 | Browse clubs, follow/unfollow, realtime | None | None |
| **Jobs** | `app/jobs.tsx` | 984 | 4 tabs (Browse/Recommended/Saved/Applications), post job dialog (alumni only), apply dialog, job type filters | Job type filter options | None |
| **Mentorship** | `app/mentorship.tsx` | 708 | 4 segments (Mentors/My Requests/Incoming/Active), request mentorship dialog | None | None |
| **Projects** | `app/projects.tsx` | 1046 | 4 tabs (Explore/My Projects/Team-Ups/Requests), create project form, apply for role, realtime | None | None |
| **EcoCampus** | `app/ecocampus.tsx` | 808 | 3 tabs (Shared Items/Requests/My Listings), share/request items | None | None |
| **Search** | `app/search.tsx` | 710 | 6 categories (People/Posts/Events/Jobs/Clubs/Projects), custom `useDebouncedValue` inline. **Uses mixed API + direct Supabase queries** | None | None |
| **Settings** | `app/settings.tsx` | 1049 | Theme toggle, notification prefs, push test, privacy, email transition, password reset, account deletion ("DEACTIVATE" confirmation), about/help/legal | Legal URLs, version string | None |
| **Edit Profile** | `app/edit-profile.tsx` | 1009 | Avatar upload, all fields edit, education/experience/skills CRUD, profile completion, social links, interests | None | None |
| **Connections** | `app/connections.tsx` | 210 | Connections FlatList, clubs get empty state | None | None |
| **Saved** | `app/saved.tsx` | 583 | 4 tabs (Posts/Projects/Clubs/Jobs), realtime | None | None |
| **Create Event** | `app/create-event.tsx` | 476 | Full form with DateTimePicker, categories, tags, virtual/in-person toggle | Category options | None |
| **Create Post** | `app/create-post.tsx` | 713 | 4 content tabs (Text/Media/Document/Poll). Up to 10 images, 100MB video, PDF/DOC | MIME type limits | None |
| **New Conversation** | `app/new-conversation.tsx` | 186 | Connections list to start new chat | None | None |
| **Portfolio** | `app/portfolio.tsx` | 393 | Portfolio settings (slug, section toggles) | None | None |
| **Portfolio Editor** | `app/portfolio-editor.tsx` | 766 | Full WYSIWYG editor with 8 sections, clipboard sharing | None | None |
| **Portfolio Template Picker** | `app/portfolio-template-picker.tsx` | 267 | 2-column template grid (4 templates: minimal/eliana/typefolio/geeky) | Template metadata | None |
| **Alumni** | `app/alumni.tsx` | 595 | Alumni directory, filters (grad year/industry/mentor), inline connect, realtime | None | None |
| **Alumni Invite** | `app/alumni-invite.tsx` | 689 | Deep-link invite claim flow (7 steps: validating→confirm→auth→otp→accepting→done→error) | None | None |
| **AI Chat** | `app/ai-chat.tsx` | 585 | AI career assistant, session list + active chat, markdown rendering, suggested prompts, typing indicator | Suggested prompt list | None |
| **Skill Analysis** | `app/skill-analysis.tsx` | 394 | Score distribution, skill bars with color coding | None | None |
| **Help Center** | `app/help-center.tsx` | 545 | FAQ accordion + category filters + contact support form. **Static FAQ data (8 items in 4 categories).** Direct supabase insert for tickets | FAQ items hardcoded (8 Q&A in 4 categories) | None |
| **Verify Personal Email** | `app/verify-personal-email.tsx` | 216 | Deep-link email verification (code from URL params) | None | None |
| **Update Password** | `app/update-password.tsx` | 348 | Deep-link password update with auth state listener | None | None |
| **Post Actions** | `app/post-actions.tsx` | 156 | Action sheet (save/share/copy link/report/edit/delete) | None | None |

---

## 2. Hook Inventory

### 2.1 Identity & Permissions (3)

| Hook | File | Lines | Supabase Calls | Dependencies |
|------|------|-------|---------------|-------------|
| **useIdentity** | `lib/hooks/useIdentity.ts` | 174 | `supabase.rpc('get_identity_context')`, `supabase.auth.getSession()`, `supabase.auth.onAuthStateChange()`, realtime on `profiles` table (UPDATE) | `@clstr/core/channels`, `@clstr/core/query-keys`, `supabase` direct |
| **useFeatureAccess** | `lib/hooks/useFeatureAccess.ts` | 88 | None (pure computation) | `@clstr/core/api/feature-permissions`, `useIdentityContext` |
| **useRolePermissions** | `lib/hooks/useRolePermissions.ts` | 284 | None (pure computation) | `@clstr/core/api/permissions`, `useIdentityContext` |

### 2.2 Realtime Subscriptions (4)

| Hook | File | Lines | Supabase Realtime Channel | Tables Subscribed |
|------|------|-------|---------------------------|-------------------|
| **useRealtimeSubscription** | `lib/hooks/useRealtimeSubscription.ts` | 189 | Configurable (base hook) | Single-table + multi-table variants |
| **useFeedSubscription** | `lib/hooks/useFeedSubscription.ts` | 120 | `CHANNELS.homeFeed(userId)` | `posts` (INSERT), `post_likes` (*), `comments` (INSERT) |
| **useMessageSubscription** | `lib/hooks/useMessageSubscription.ts` | 133 | `CHANNELS.messages(userId)` | `messages` (INSERT, filtered by `receiver_id`) |
| **useNotificationSubscription** | `lib/hooks/useNotificationSubscription.ts` | 103 | `CHANNELS.notifications(userId)` | `notifications` (INSERT, filtered by `user_id`) |

### 2.3 Data & CRUD Hooks (10)

| Hook | File | Lines | Supabase Calls | Key Returns |
|------|------|-------|---------------|-------------|
| **useFileUpload** | `lib/hooks/useFileUpload.ts` | 199 | `supabase.storage.from(bucket).upload()` | `pickImage`, `takePhoto`, `uploadImage`, `isUploading`, `progress` |
| **useEmailTransition** | `lib/hooks/useEmailTransition.ts` | 245 | Via API adapters: `requestPersonalEmailLink`, `verifyPersonalEmail`, `resendVerificationCode`, `transitionToPersonalEmail` | `linkMutation`, `verifyMutation`, `resendMutation`, `transitionMutation` + cooldown timer |
| **useDeleteAccount** | `lib/hooks/useDeleteAccount.ts` | 47 | Via API: `deactivateOwnAccount` RPC | `deactivate` mutation |
| **usePortfolioEditor** | `lib/hooks/usePortfolioEditor.ts` | 364 | Direct `supabase.from()` on profiles + 5 related tables. Realtime on `profile_skills/education/experience/projects/profiles` | `profile`, `updateProfile`, `saveProfile`, `updateSettings`, `isDirty` |
| **usePortfolio** | `lib/hooks/usePortfolio.ts` | 92 | Via API: `getPortfolioSettings`, `updatePortfolioSettings`, `activatePortfolio` | `usePortfolioSettings`, `usePortfolioData`, `useUpdatePortfolioSettings`, `useActivatePortfolio` |
| **useSkillAnalysis** | `lib/hooks/useSkillAnalysis.ts` | 124 | Via API: `getOrComputeSkillAnalysis`, `computeSkillAnalysis`. Realtime on `CHANNELS.skillAnalysis(userId)` | `analysis`, `overallScore`, `scoreLabel`, `scoreColor`, `refresh` |
| **useAlumniInviteClaim** | `lib/hooks/useAlumniInviteClaim.ts` | 109 | Direct `supabase.rpc('validate_alumni_invite_token')`, `supabase.rpc('accept_alumni_invite')`, `supabase.rpc('dispute_alumni_invite')` | `validateToken`, `acceptInvite`, `disputeInvite` |
| **useAlumniInvites** | `lib/hooks/useAlumniInvites.ts` | 191 | Direct `supabase.rpc()` × 4, `supabase.functions.invoke('send-alumni-invite-email')` | `invites`, `bulkUpsert`, `resend`, `cancel` |
| **useAIChat** | `lib/hooks/useAIChat.ts` | 179 | Via API: `getChatSessions`, `createChatSession`, `getChatMessages`, `sendAIChatMessage`, `saveChatMessage`, `deleteChatSession`. Realtime on `CHANNELS.aiChatMessages(sessionId)` | `useAIChatSessions`, `useAIChatMessages` |
| **useUserSettings** | `lib/hooks/useUserSettings.ts` | 87 | Via API: `getUserSettings`, `updateUserSettings`. Realtime on `CHANNELS.userSettings(userId)` | `settings`, `update` + optimistic update |

### 2.4 Platform & Utility Hooks (7)

| Hook | File | Lines | Dependencies | Key Returns |
|------|------|-------|-------------|-------------|
| **useNetwork** | `lib/hooks/useNetwork.ts` | 57 | `@react-native-community/netinfo` | `isOnline`, `connectionType`, `isWifi`, `isCellular` |
| **useTypeaheadSearch** | `lib/hooks/useTypeaheadSearch.ts` | 47 | Via API: `typeaheadSearch` | React Query wrapper, min 2 chars + valid domain |
| **usePushNotifications** | `lib/hooks/usePushNotifications.ts` | 292 | Lazy-loaded `expo-notifications`. Direct `supabase.rpc()` for device token registration | `expoPushToken`, `permissionGranted`, `isRegistering` |
| **useDeepLinkHandler** | `lib/hooks/useDeepLinkHandler.ts` | 106 | `expo-router` Linking, `deep-link-queue` | Wires deep-link queue with nav/auth lifecycle |
| **useAcademicEmailValidator** | `lib/hooks/useAcademicEmailValidator.ts` | 74 | Shared utils + `EXPO_PUBLIC_ALLOWED_EMAIL_DOMAINS` env | `validateEmail`, `isAcademicDomain` |
| **useLastSeen** | `lib/hooks/useLastSeen.ts` | 55 | Direct `supabase.from('profiles').update({ last_seen })`. AppState listener | Updates every 60s when foregrounded |
| **usePagination** | `lib/hooks/usePagination.ts` | 61 | None (pure state) | `paginatedData`, `loadMore`, `reset`, `addItem` |

---

## 3. API Layer

### 3.1 Architecture

The API layer follows a **bind adapter pattern**:

```
@clstr/core/api/<module>  →  lib/adapters/bind.ts (withClient)  →  lib/api/<module>.ts  →  screens/hooks
```

- **`lib/adapters/core-client.ts`**: Creates a singleton Supabase client via `@clstr/core.createSupabaseClient()`. Uses `expo-secure-store` on native, `localStorage` on web. Implicit flow for OAuth (PKCE causes `bad_oauth_state` on mobile).
- **`lib/adapters/bind.ts`**: Exports `withClient(fn)` which pre-binds the mobile Supabase client to any `@clstr/core` API function whose first param is `SupabaseClient`.
- **`lib/api/index.ts`**: Barrel export for all 21 adapters.

### 3.2 API Adapter Inventory

| Adapter | File | Binding | Core Module | Exported Functions |
|---------|------|---------|-------------|-------------------|
| **Social** | `lib/api/social.ts` | `withClient` | `@clstr/core/api/social-api` | `createPost`, `getPosts`, `getPostById`, `getPostByIdPublic`, `getPostsByUser`, `getUserPostsCount`, `toggleReaction`, `togglePostLike`, `getComments`, `createComment`, `toggleCommentLike`, `editComment`, `deleteComment`, `deletePost`, `updatePost`, `reportPost`, `hidePost`, `unhidePost`, `sharePost`, `sharePostToMultiple`, `saveItem`, `unsaveItem`, `checkIfSaved`, `getSavedPosts`, `toggleSavePost`, `voteOnPoll`, `hasUserVotedOnPoll`, `createRepost`, `deleteRepost`, `hasUserReposted`, `getPostReposts`, `getFeedWithReposts`, `getTopCommentsBatch`, `getTopComments`, `countMutualConnections`, `countMutualConnectionsBatch`, `getConnections`, `getConnectionRequests`, `sendConnectionRequest`, `acceptConnectionRequest`, `rejectConnectionRequest`, `removeConnection`, `checkConnectionStatus` |
| **Profile** | `lib/api/profile.ts` | `withClient` | `@clstr/core/api/profile` + `profile-api` | `getProfileById`, `createProfileRecord`, `updateProfileRecord`, `uploadProfileAvatar`, `removeProfileAvatar`, `deleteProfileAvatar`, `updateProfileAvatar`, `profileExists`, `deleteProfile`, `addExperience`, `updateExperience`, `deleteExperience`, `getExperiences`, `addEducation`, `updateEducation`, `deleteEducation`, `getEducation`, `updateSkills`, `getSkills`, `addSkill`, `updateSkill`, `deleteSkill`, `addProject`, `updateProject`, `uploadProjectImage`, `deleteProjectImage`, `getPendingConnectionRequests`, `getSentConnectionRequests`, `addConnectionRequest`, `blockConnection`, `getConnectionCount`, `getProfileViewsCount`, `trackProfileView` + pure helpers |
| **Messages** | `lib/api/messages.ts` | `withClient` | `@clstr/core/api/messages-api` | `assertCanMessagePartner`, `getUnreadMessageCount`, `getConversations`, `getMessages`, `sendMessage`, `markMessagesAsRead`, `updateLastSeen`, `subscribeToMessages`, `getConnectedUsers` |
| **Events** | `lib/api/events.ts` | **Mixed** | `@clstr/core/api/events-api` + **direct Supabase** | Bound: `getEventByIdPublic`, `getEventById`, `registerForEvent`, `unregisterFromEvent`, `trackExternalRegistrationClick`, `shareEvent`, `shareEventToMultiple`, `recordEventLinkCopy`, `getConnectionsForSharing`, `deleteEvent`, `updateEvent`. Custom (direct): `getEvents()`, `createEvent()`, `toggleEventRegistration()` |
| **Jobs** | `lib/api/jobs.ts` | `withClient` | `@clstr/core/api/jobs-api` | `getJobs`, `getJobById`, `getRecommendedJobs`, `getAlumniJobs`, `getSavedJobs`, `toggleSaveJob`, `createJob`, `applyToJob`, `getMyApplications`, `refreshJobMatches` |
| **Clubs** | `lib/api/clubs.ts` | `withClient` | `@clstr/core/api/clubs-api` | `fetchClubsWithFollowStatus`, `followClubConnection`, `unfollowClubConnection` |
| **Projects** | `lib/api/projects.ts` | `withClient` | `@clstr/core/api/projects-api` | `getProjects`, `getProject`, `getProjectRoles`, `createProject`, `deleteProject`, `applyForRole`, `getApplicationsForProject`, `getMyProjects`, `getOwnerApplications`, `updateProjectApplicationStatus`, `getProjectTeamMembers`, `updateProjectStatus` |
| **Mentorship** | `lib/api/mentorship.ts` | **Direct Supabase** | N/A (no core module) | `getMentors`, `getMyMentorshipRequests`, `getIncomingMentorshipRequests`, `getActiveRelationships`, `getMyMentorshipOffer`, `saveMentorshipOffer`, `requestMentorship`, `updateMentorshipRequestStatus`, `completeMentorship`, `cancelMentorshipRequest`, `submitMentorshipFeedback`, `deleteMentorshipOffer` |
| **Notifications** | `lib/api/notifications.ts` | **Direct Supabase** | N/A (no core module) | `getNotifications`, `markNotificationRead`, `markAllNotificationsRead` |
| **Search** | `lib/api/search.ts` | `withClient` | `@clstr/core/api/typeahead-search` | `typeaheadSearch` |
| **Saved** | `lib/api/saved.ts` | `withClient` | `@clstr/core/api/saved-api` | `getSavedItems`, `toggleSaveItem` |
| **Settings** | `lib/api/settings.ts` | `withClient` | `@clstr/core/api/user-settings` | `getUserSettings`, `updateUserSettings`, `getEffectiveTheme` |
| **Account** | `lib/api/account.ts` | `withClient` | `@clstr/core/api/account` | `deactivateOwnAccount`, `reactivateOwnAccount` |
| **Email Transition** | `lib/api/email-transition.ts` | `withClient` | `@clstr/core/api/email-transition` | `getEmailTransitionStatus`, `requestPersonalEmailLink`, `resendVerificationCode`, `verifyPersonalEmail`, `transitionToPersonalEmail`, `removePersonalEmail`, `dismissPersonalEmailPrompt`, `retryAuthEmailChange`, `mergeTransitionedAccount`, `findTransitionedProfileForEmail` |
| **Permissions** | `lib/api/permissions.ts` | Re-export (pure) | `@clstr/core/api/feature-permissions` | `normalizeProfileType`, `getFeaturePermissions`, `canAccessFeature`, `canAccessRoute`, `getHiddenNavItems`, `canPerformProjectAction`, `canPerformClubAction`, `canPerformEventAction`, `canPerformEcoCampusAction`, `canPerformJobAction`, `canPerformMentorshipAction` |
| **AI Chat** | `lib/api/ai-chat.ts` | `withClient` | `@clstr/core/api/ai-service` | `createChatSession`, `getChatSessions`, `getChatMessages`, `saveChatMessage`, `sendAIChatMessage`, `deleteChatSession`, `updateChatSessionTitle` |
| **Alumni** | `lib/api/alumni.ts` | **Direct RPC** | N/A (SECURITY DEFINER RPC) | `getAlumniByDomain` + re-exports: `determineUserRoleFromGraduation`, `isAlumni` |
| **EcoCampus** | `lib/api/ecocampus.ts` | `withClient` | `@clstr/core/api/ecocampus-api` | `fetchSharedItems`, `fetchRequests`, `fetchMySharedItems`, `fetchMyRequests`, `uploadSharedItemImage`, `createSharedItem`, `createItemRequest`, `updateSharedItemStatus`, `deleteSharedItem`, `deleteItemRequest`, `updateSharedItemDetails`, `updateItemRequest`, `fetchSharedItemIntents`, `createSharedItemIntent`, `deleteSharedItemIntent`, `fetchItemRequestResponses`, `createItemRequestResponse`, `deleteItemRequestResponse`, `sendEcoCampusMessage` |
| **Portfolio** | `lib/api/portfolio.ts` | `withClient` | `@clstr/core/api/portfolio-api` | `getPortfolioSettings`, `updatePortfolioSettings`, `activatePortfolio`, `resolvePortfolioSlug` |
| **Skill Analysis** | `lib/api/skill-analysis.ts` | `withClient` | `@clstr/core/api/skill-analysis-api` | `getSkillAnalysis`, `computeSkillAnalysis`, `getOrComputeSkillAnalysis`, `deleteSkillAnalysis` + pure: `getSkillDistribution`, `getOverallScore`, `getScoreLabel`, `getScoreColor` |

### 3.3 API Consistency Issues

**Modules bypassing `withClient` pattern (direct Supabase):**

| Module | Reason | Migration Path |
|--------|--------|---------------|
| `mentorship.ts` (446 lines) | `@clstr/core` has no `mentorship-api.ts` | Create `@clstr/core/api/mentorship-api.ts`, bind via `withClient` |
| `notifications.ts` (75 lines) | `@clstr/core` has no notification functions | Create `@clstr/core/api/notifications-api.ts` |
| `alumni.ts` (101 lines) | Uses SECURITY DEFINER RPC `get_alumni_by_domain` | Create `@clstr/core/api/alumni-api.ts` wrapping the RPC |
| `events.ts` (custom fns) | `getEvents`, `createEvent`, `toggleEventRegistration` not in core | Add to `@clstr/core/api/events-api.ts` |

**Screens with direct Supabase calls (bypassing API layer entirely):**

| Screen | Direct Calls |
|--------|-------------|
| `auth/callback.tsx` | `setSession`, `exchangeCodeForSession`, `getSession`, `signOut` |
| `club/[id].tsx` | `supabase.from('profiles').select()` |
| `search.tsx` | `supabase.from()` for posts/jobs/clubs/projects search |
| `help-center.tsx` | `supabase.from('support_tickets').insert()` |
| `update-password.tsx` | `supabase.auth.getSession`, `onAuthStateChange`, `updateUser` |
| `verify-personal-email.tsx` | `supabase.auth.getSession` |
| `forgot-password.tsx` | `supabase.auth.resetPasswordForEmail` |
| `academic-email-required.tsx` | `supabase.auth.signOut` |
| `alumni-invite.tsx` | `supabase.auth.signInWithOtp`, `verifyOtp` |
| `settings.tsx` | `supabase.auth.resetPasswordForEmail` (password modal) |

> Most direct auth calls (`getSession`, `signOut`, `signInWithOtp`) are intentional — auth operations are inherently platform-specific.

---

## 4. Realtime Channels

### 4.1 Channel Name Registry

All channel name generators are defined in `packages/core/src/channels.ts` (90 lines) and re-exported via `lib/channels.ts`.

**User-Scoped Channels:**

| Generator | Pattern | Used By |
|-----------|---------|---------|
| `CHANNELS.messages(userId)` | `messages:user:{userId}` | `useMessageSubscription` |
| `CHANNELS.notifications(userId)` | `notifications:{userId}` | `useNotificationSubscription` |
| `CHANNELS.userSettings(userId)` | `user_settings:{userId}` | `useUserSettings` |
| `CHANNELS.skillAnalysis(userId)` | `skill_analysis:{userId}` | `useSkillAnalysis` |
| `CHANNELS.homeFeed(userId)` | `home-feed-{userId}` | `useFeedSubscription` |
| `CHANNELS.savedItems(userId)` | `saved-items-{userId}` | `saved.tsx` |
| `CHANNELS.networkConnections(userId)` | `network-connections-{userId}` | `(tabs)/network.tsx` |
| `CHANNELS.profileStats(userId)` | `profile-stats-{userId}` | `(tabs)/profile.tsx` |
| `CHANNELS.profileIdentity()` | `identity-profile-realtime` | `useIdentity` |

**Content-Scoped Channels:**

| Generator | Pattern | Used By |
|-----------|---------|---------|
| `CHANNELS.postDetail(postId)` | `post-detail-{postId}` | `post/[id].tsx` |
| `CHANNELS.eventDetail(eventId)` | `event-detail-{eventId}` | `event/[id].tsx` |
| `CHANNELS.jobDetail(jobId)` | `job-{jobId}` | `job/[id].tsx` |
| `CHANNELS.eventsRealtime()` | `events-realtime` | `(tabs)/events.tsx` |
| `CHANNELS.jobsRealtime()` | `jobs-realtime` | `jobs.tsx`, `saved.tsx` |
| `CHANNELS.clubsRealtime()` | `clubs-realtime` | `clubs.tsx` |
| `CHANNELS.projects(domain, userId)` | `projects-{domain}-{userId}` | `projects.tsx` |
| `CHANNELS.aiChatMessages(sessionId)` | `ai-chat-messages-{sessionId}` | `useAIChat` |
| `CHANNELS.alumniDirectoryConnections(userId)` | `alumni-directory-connections-{userId}` | `alumni.tsx` |

**Portfolio Channels:**

| Generator | Pattern | Used By |
|-----------|---------|---------|
| `CHANNELS.portfolioEditor(table, userId)` | `portfolio-editor-{table}-{userId}` | `usePortfolioEditor` |
| `CHANNELS.portfolioEditorProfiles(userId)` | `portfolio-editor-profiles-{userId}` | `usePortfolioEditor` |
| `CHANNELS.portfolioEditorPosts(userId)` | `portfolio-editor-posts-{userId}` | `usePortfolioEditor` |

**Mentorship Channels (defined in core but not used by mobile hooks — mobile mentorship uses direct Supabase):**

| Generator | Pattern |
|-----------|---------|
| `CHANNELS.mentorshipOffers(domain)` | `mentorship-offers-{domain}` |
| `CHANNELS.mentorshipRequestsMentee(userId)` | `mentorship-requests-mentee-{userId}` |
| `CHANNELS.mentorshipRequestsMentor(userId)` | `mentorship-requests-mentor-{userId}` |

### 4.2 Subscription Manager

`lib/realtime/subscription-manager.ts` (170 lines) — Singleton `SubscriptionManager`:

- **`subscribe(name, factory)`** — Creates channel via factory, stores in `Map<name, {channel, factory}>`. Deduplicates by name.
- **`unsubscribe(name)`** — Removes from registry, calls `supabase.removeChannel()`.
- **`unsubscribeAll()`** — Tears down all active channels.
- **`reconnectAll()`** — Iterates all registered channels, removes them, recreates via stored factories. Used on foreground resume.

### 4.3 App State Lifecycle

`lib/app-state.ts` (139 lines):

- **`useAppStateRealtimeLifecycle`** — On foreground resume: (1) validate & refresh session if <5min to expiry, (2) invalidate conversations/notifications/unreadMessages caches, (3) `subscriptionManager.reconnectAll()`. Debounced (2s gap).

### 4.4 Deep Link Queue

`lib/deep-link-queue.ts` (231 lines) — Singleton that holds deep-link URLs until:
1. Navigation tree is mounted (`setNavReady()`)
2. Auth state is resolved (`setAuthReady(isAuthenticated)`)

Auth callback URLs bypass the queue entirely. 500ms dedup window. On sign-out: `reset()` clears all state.

---

## 5. Constants & Theme

### 5.1 Colors (`constants/colors.ts` — 277 lines)

| Token | Light | Dark |
|-------|-------|------|
| `background` | `#FFFFFF` | `#000000` |
| `surface.tier1` | `#F7F7F7` | `#111111` |
| `surface.tier2` | `#EEEEEE` | `#1A1A1A` |
| `surface.tier3` | `#E5E5E5` | `#222222` |
| `primary` | `#007AFF` | `#0A84FF` |
| `text.primary` | `#000000` | `#FFFFFF` |
| `text.secondary` | `#6B7280` | `#9CA3AF` |
| `text.tertiary` | `#9CA3AF` | `#6B7280` |
| `border` | `#E5E7EB` | `#2A2A2A` |
| `accent` | `#5856D6` | `#5E5CE6` |
| `success` | `#34C759` | `#30D158` |
| `warning` | `#FF9500` | `#FF9F0A` |
| `error` | `#FF3B30` | `#FF453A` |

**Badge Variants:** `student` (#007AFF), `faculty` (#5856D6), `alumni` (#FF9500), `club` (#34C759), `organization` (#AF52DE), `default` (#6B7280)

**Avatar Sizes:** `xs` (24), `sm` (32), `md` (40), `lg` (56), `xl` (80)

**Theme Mode:** Forced dark mode (Phase 3). `useThemeColors()` hook resolves current scheme.

### 5.2 Typography (`constants/typography.ts` — 212 lines)

| Property | Value |
|----------|-------|
| **Font Family** | Inter (weights: 400, 500, 600, 700, 800) |
| **Font Scale** | `2xs`=10, `xs`=11, `sm`=12, `base`=14, `md`=15, `lg`=16, `xl`=18, `2xl`=20, `3xl`=24, `4xl`=28 |
| **Line Heights** | `tight`: 1.2, `normal`: 1.5, `relaxed`: 1.75 |
| **Letter Spacing** | `tight`: -0.5, `normal`: 0, `wide`: 0.5 |

**Preset TextStyles:** `h1` (28/800), `h2` (24/700), `h3` (20/600), `h4` (18/600), `subtitle` (16/600), `body` (14/400), `bodyLarge` (16/400), `caption` (12/400), `cardTitle` (16/600), `sectionTitle` (18/700)

### 5.3 Query Keys

- **`@clstr/core/query-keys`** (113 lines) — ~40 key definitions including parameterized factories.
- **`lib/query-keys.ts`** (67 lines) — Re-exports core + `MOBILE_QUERY_KEYS` for: `connectionStatus`, `mutualConnections`, `userPostsCount`, `connectionCount`, search sub-keys, eco sub-keys, club detail sub-keys, profile stats, `myPosts`/`myEducation`/`myExperience`/`mySkills`/`myProjects`.

---

## 6. Shared Packages

### 6.1 `@clstr/core` (`packages/core/`)

**Purpose:** Pure TypeScript shared layer — Supabase client factory, API functions, types, channels, query keys.

| Directory | Contents |
|-----------|----------|
| `index.ts` | Barrel: `createSupabaseClient`, `QUERY_KEYS`, `CHANNELS`, error utils, types, schemas, API namespace |
| `channels.ts` | 90 lines — ~35 channel generators (+ admin sub-object) |
| `query-keys.ts` | 113 lines — ~40 query key factories |
| `api/` | **29 modules**: `social-api`, `profile`, `profile-api`, `messages-api`, `events-api`, `jobs-api`, `clubs-api`, `projects-api`, `ecocampus-api`, `portfolio-api`, `portfolio-adapter`, `skill-analysis-api`, `ai-service`, `saved-api`, `user-settings`, `email-transition`, `typeahead-search`, `account`, `feature-permissions`, `permissions`, `alumni-identification`, `alumni-invite-parser`, `search-api`, `resume-api`, `team-ups-api`, `trending-api`, `admin-api`, `api`, `index` |
| `types/` | 10 modules: `identity`, `profile`, `social`, `ai`, `file`, `portfolio`, `mentorship`, `alumni-invite`, `admin`, `index` |
| `schemas/` | Zod/validation schemas |
| `supabase/` | Client factory, Database types |

### 6.2 `@clstr/shared` (`packages/shared/`)

**Purpose:** Cross-platform shared utilities, types, components, and integration points.

| Directory | Contents |
|-----------|----------|
| `types/` | `admin`, `ai`, `alumni-invite`, `google-signin.d`, `identity`, `mentorship`, `portfolio`, `profile`, `social`, `supabase` |
| `utils/` | `college-utils`, `errorHandler`, `event-status`, `university-data`, `uuid` |
| `hooks/` | `useAuth` (single hook) |
| `screens/` | `auth/`, `index.ts` |
| `realtime/` | `channels.ts` |
| `query-keys.ts` | Shared query keys |
| `components/`, `design/`, `integrations/`, `navigation/`, `platform/`, `schemas/`, `supabase/` | Various shared utilities |
| `contexts/`, `lib/` | Empty |

### 6.3 Core API Modules Not Consumed by Mobile

| Core Module | Status |
|-------------|--------|
| `admin-api.ts` | Web-only (admin dashboard) |
| `resume-api.ts` | Future feature |
| `team-ups-api.ts` | May be subsumed by `projects-api` |
| `trending-api.ts` | Future feature |
| `search-api.ts` | Mobile uses `typeahead-search` only |
| `alumni-invite-parser.ts` | Used indirectly via hooks |

---

## 7. Mobile vs Web Hook Mismatches

### 7.1 Import Path Divergence

| Concern | Mobile (`lib/`) | Web (`src/`) |
|---------|----------------|-------------|
| **Supabase client** | `@/lib/adapters/core-client` (via `@clstr/core` factory) | `@/integrations/supabase/client` |
| **CHANNELS** | `@clstr/core/channels` | `@clstr/shared/realtime/channels` |
| **QUERY_KEYS** | `@clstr/core/query-keys` | `@clstr/shared/query-keys` |
| **API binding** | `withClient()` from `@/lib/adapters/bind` | `withClient()` from `@/adapters/bind` |

> **Risk:** `@clstr/core` and `@clstr/shared` export CHANNELS and QUERY_KEYS independently. If they diverge, channel names or cache keys will differ between platforms.

### 7.2 Completely Different Implementations (Platform-Divergent)

| Hook | Mobile | Web |
|------|--------|-----|
| **useFileUpload** | `expo-image-picker` (gallery + camera) + Supabase Storage. Returns: `pickImage`, `takePhoto`, `uploadImage`, `isUploading`, `progress` | Browser `File` API (FileReader, drag-and-drop). Returns: `files`, `previews`, `addFiles`, `removeFile`, `clearFiles`, `isDragging` |
| **usePushNotifications** | `expo-notifications`, Expo push token, Android notification channel, `supabase.rpc()` for device token | Web Push API (`ServiceWorker`, `PushManager`), VAPID keys |
| **useNetwork** | `@react-native-community/netinfo`. Function: `useNetwork()`. Returns: `isOnline`, `connectionType`, `isWifi`, `isCellular` | `@uidotdev/usehooks`. Function: `useNetworkStatus()`. Returns: `isOnline`, `effectiveType`, `downlink`, `rtt`, `saveData` |

### 7.3 Same Logic, Different Wiring

| Hook | Difference |
|------|-----------|
| **useIdentity** | Both call `get_identity_context()` RPC. Different import paths for channels/keys |
| **useRolePermissions** | Mobile: `@clstr/core/api/permissions`. Web: `@/lib/permissions` (local copy) |
| **usePortfolioEditor** | Both load profile + related tables with realtime. Different client paths |
| **useAIChat** | Web: `@/lib/ai-service`. Mobile: `@/lib/api/ai-chat` (binds `@clstr/core/api/ai-service`) |

### 7.4 Hooks Present in Only One Platform

| Hook | Platform | Purpose |
|------|----------|---------|
| `useDeepLinkHandler` | **Mobile only** | Deep-link queue with Expo Router |
| `useLastSeen` | **Mobile only** | `last_seen` ping every 60s with AppState |
| `useIdleDetection` | **Web only** | Idle timeout detection |
| `usePWAInstall` | **Web only** | PWA install prompt |
| `useTheme` | **Web only** | Theme management |
| `useMentorship` | **Web only** (as hook) | Mobile has API adapter, not hook |
| `use-mobile` | **Web only** | Mobile detection for responsive UI |
| `use-toast` | **Web only** | Toast notification system |
| `useAdmin*` (×12) | **Web only** | Admin dashboard hooks |
| `usePermissions` | **Web only** | Separate from `useRolePermissions` |

---

## 8. Stub & Placeholder Screens

### Confirmed Stubs

| Screen | File | Lines | Reason |
|--------|------|-------|--------|
| **Create** | `app/(tabs)/create.tsx` | 16 | Empty `<View />`. Tab press intercepted in `_layout.tsx` → redirects to `/create-post` modal. Intentional FAB-style entry point |

### Static Screens (No API, Content Only)

| Screen | File | Purpose |
|--------|------|---------|
| **Verify Email** | `app/(auth)/verify-email.tsx` | Instructional text — check your email |
| **Magic Link Sent** | `app/(auth)/magic-link-sent.tsx` | Confirmation — magic link was sent |

### Screens with Hardcoded Static Data

| Screen | Content |
|--------|---------|
| **Help Center** | 8 FAQ items in 4 categories (Getting Started, Account & Profile, Features, Technical Support) |
| **Events tab** | 5 category filter options (Academic/Career/Social/Workshop/Sports) |
| **Create Event** | Category dropdown options |
| **Jobs** | Job type filter options |
| **Chat** | Suggested reply prompts |
| **AI Chat** | Suggested prompt list |
| **Portfolio Template Picker** | 4 template definitions (minimal/eliana/typefolio/geeky) |
| **Settings** | Legal URLs, version string |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total screens | 49 |
| Tab screens | 8 (+ create stub) |
| Auth screens | 7 + 1 callback |
| Dynamic routes | 7 |
| Standalone screens | 24 |
| Total hooks | 24 |
| API adapters | 21 (16 `withClient`, 3 direct Supabase, 2 mixed) |
| Core API modules | 29 (6 not consumed by mobile) |
| Realtime channel generators | ~35 (non-admin) |
| Confirmed stubs | 1 (`create.tsx`) |
| TODOs/FIXMEs found | **0** |
| Hardcoded data screens | 8 (all intentional — filter options, FAQs, templates) |
| Direct Supabase bypass (screens) | 10 (mostly auth operations) |
| Direct Supabase bypass (API) | 3 modules + 1 mixed (mentorship, notifications, alumni, events) |
