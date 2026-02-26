# Clstr.network — Web vs Mobile Feature Comparison

> **Generated from source code analysis** of `src/pages/` (web) and `app/` (mobile).

---

## 1. Auth Methods Supported

| Method | Web | Mobile |
|--------|-----|--------|
| Google OAuth (`signInWithOAuth`) | ✅ Login + Signup | ✅ Login + Signup |
| Magic Link (Resend edge function `send-magic-link`) | ✅ Signup only | ✅ Signup only |
| OTP (`signInWithOtp`) | ✅ Alumni Invite flow only | ✅ Alumni Invite flow only |
| Password signup | ✅ Alumni Invite + ClubAuth flows | ✅ Alumni Invite flow |
| Password reset (`resetPasswordForEmail`) | ✅ ForgotPassword + Settings | ✅ ForgotPassword + Settings |
| Academic email validation | ✅ AuthCallback validates `.edu` domain | ✅ auth/callback validates `.edu` domain |
| ClubAuth access-code-gated flow | ✅ Full 3-step (code → role → auth) | ❌ **NOT IMPLEMENTED** |
| Email transition (college → personal) | ✅ Settings + VerifyPersonalEmail page | ✅ Settings + verify-personal-email screen |
| Account merge (transitioned email) | ✅ AuthCallback `mergeTransitionedAccount()` | ❓ Uncertain (callback.tsx exists but not fully audited) |

**Key gap**: ClubAuth is **web-only**. Club/Faculty/Principal/Dean accounts can only be created via web.

---

## 2. Per-Page Feature & Supabase Inventory

### A. Feed / Home

| Aspect | Web (`Home.tsx` / `Feed.tsx`) | Mobile (`(tabs)/index.tsx`) |
|--------|-------|--------|
| Post composer | `PostComposer` with text, images, video, documents, polls | `create-post.tsx` with images, video, documents, polls (4 content types) |
| Post card | `PostCard` — likes, comments, shares, reposts, reactions, bookmarks | `PostCard` — likes, comments, shares, reposts, reactions, polls |
| Sort | Recent/Top dropdown | Recent/Top sort |
| Infinite scroll | ✅ `useInfiniteQuery` | ✅ `useInfiniteQuery` |
| Sidebar widgets | ProfileSummary, QuickNavigation, TrendingConnections, TrendingTopics, UpcomingEvents, ProfileCompletionBanner, PersonalEmailPrompt | ❌ No sidebar (mobile layout) |
| Realtime | `posts`, `post_likes`, `comments`, `post_shares`, `connections` | ✅ Realtime multi-subscription |
| Framer Motion animations | ✅ `feedItemVariants`, `feedContainerVariants` | ❌ No equivalent (native animations minimal) |
| **Supabase tables** | `posts`, `post_likes`, `comments`, `post_shares`, `connections`, `profiles`, `saved_items` | Same |
| **Supabase functions** | `getPosts()`, `createPost()`, `toggleLike()`, `toggleRepost()`, `submitPollVote()` | Same API via `@/lib/api` |

**Feed gap**: Web has rich sidebar widgets (trending alumni, trending topics, upcoming events, profile completion banner, personal email prompt). Mobile trades these for a clean single-column feed.

---

### B. Profile

| Aspect | Web (`Profile.tsx`) | Mobile (`(tabs)/profile.tsx` + `edit-profile.tsx`) |
|--------|-------|--------|
| View own/other profiles | ✅ Single page, `EditProfileModal` in-page | ✅ View on tab, separate `edit-profile.tsx` screen |
| Avatar upload/remove | ✅ In-page modal | ✅ `expo-image-picker` |
| Stats | Connections, Profile Views, Posts Count | Connections, Profile Views, Posts Count |
| Profile tabs | `ProfileTabs` (Posts, Education, Experience, Skills, Projects) | Inline sections (education, experience, skills, projects) |
| Connection request | ✅ Send/accept/reject inline | ✅ Send/accept on `user/[id].tsx` |
| Role badges | ✅ Role-specific sections (Alumni, Club, Faculty, Student, Org) | ✅ `RoleBadge` component |
| Profile completion banner | ✅ `ProfileCompletionBanner` | ✅ Completion % calculation + missing fields |
| Cover photo | ✅ `CoverPhotoUpload` component | ❌ Not evident in mobile |
| Realtime | `connections`, `profile_views`, `posts` | `connections`, `profile_views`, `posts` |
| **Supabase tables** | `profiles`, `connections`, `profile_views`, `posts`, `experiences`, `education`, `skills` | Same |
| **Supabase RPCs** | `getProfileById()`, `updateProfileRecord()` | Same via `@/lib/api/profile` |

**Profile gap**: Web has cover photo upload; mobile does not. Web uses modal-based editing; mobile uses a separate screen.

---

### C. Network

| Aspect | Web (`Network.tsx`) | Mobile (`(tabs)/network.tsx`) |
|--------|-------|--------|
| Tabs | Discover / Requests / Connections | All / Connected / Pending (filter-based) |
| Advanced filters | ✅ `AdvancedFilters` component (role, university, year, etc.) | ❌ Basic filters only (role chip + search) |
| Domain-scoped discovery | ✅ RPC `get_profiles_by_domain` | ✅ Same RPC |
| Connection actions | Send/Accept/Reject/Cancel | Send/Accept (Cancel on pending) |
| Role context line | ✅ `getRoleContextLine()` — rich subtitles | ✅ Role badges on cards |
| Realtime | ✅ `connections` | ✅ Multi-subscription on `connections` |
| **Supabase RPCs** | `get_profiles_by_domain()` | Same |

**Network gap**: Web has rich `AdvancedFilters` (multiple criteria); mobile has simpler chip-based filters.

---

### D. Events

| Aspect | Web (`Events.tsx` + `EventDetail.tsx`) | Mobile (`(tabs)/events.tsx` + `create-event.tsx`) |
|--------|-------|--------|
| View events | ✅ Category tabs, search, RSVP filter | ✅ Category tabs, search |
| Create event | ✅ In-page dialog (`CreateEventDialog`) | ✅ Separate `create-event.tsx` screen |
| Edit/Delete event | ✅ Edit dialog + delete confirmation | ❌ Not visible in mobile (create only) |
| RSVP | ✅ Register/Unregister toggle | ✅ RSVP toggle |
| Share modal | ✅ `EventShareModal` with link copy | ❓ Basic share (no dedicated modal found) |
| External registration link | ✅ Click-tracked external links | ❌ Not evident |
| Event detail | ✅ `EventDetail.tsx` with public/auth views, SEO | ✅ `event/[id].tsx` |
| Clubs integration | ✅ Unified Events+Clubs page | ❌ Clubs is separate screen |
| Realtime | `events`, `event_registrations` | ✅ Multi-subscription |
| **Permission matrix** | `canViewEvents`, `canCreateEvents`, `canManageEvents`, `canViewClubs`, `canJoinClub`, `canFollowClub` | Same flags via `useFeatureAccess` |
| **Supabase tables** | `events`, `event_registrations`, `profiles` (Club role) | Same |

**Events gap**: Web supports event **edit/delete** and has a unified Events+Clubs page. Mobile only creates events and has Clubs as a separate screen. Web tracks external registration link clicks.

---

### E. Messaging

| Aspect | Web (`Messaging.tsx`) | Mobile (`(tabs)/messages.tsx` + `chat/[id].tsx`) |
|--------|-------|--------|
| Conversation list | ✅ Left panel with search | ✅ Full-screen list with search |
| Chat view | ✅ Right panel (split view) | ✅ Separate `chat/[id].tsx` screen |
| Connected users tab | ✅ Connections tab to start new chats | ✅ `new-conversation.tsx` screen |
| Partner from URL | ✅ Query param `?partner=<id>` | ✅ Route param `/chat/[id]` |
| Auto-select first conversation (desktop) | ✅ | N/A (mobile navigates) |
| Partner validation | ✅ `assertCanMessagePartner` | ✅ Same validation |
| Realtime | ✅ Partner profile updates | ✅ `useMessageSubscription` |
| **Supabase functions** | `getConversations()`, `getMessages()`, `getConnectedUsers()` | Same |

**Messaging gap**: Minimal — both platforms have full chat functionality. Web uses split-panel; mobile uses navigation-based flow. Feature parity is strong here.

---

### F. Jobs

| Aspect | Web (`Jobs.tsx` + `JobDetail.tsx`) | Mobile (`jobs.tsx` + `job/[id].tsx`) |
|--------|-------|--------|
| Tabs | All Jobs / Recommended / Alumni Posted / Saved | Browse / For You / Saved / Applied |
| AI job matching | ✅ `refreshJobMatches` | ✅ Same (recommended tab) |
| Post job | ✅ `JobPostingDialog` | ✅ Create job modal |
| Apply to job | ✅ `JobApplicationDialog` | ✅ Apply modal |
| Filters | Search, job type, experience, sort | Search, job type filters |
| External apply | ✅ External link button | ✅ Same |
| Realtime | `jobs`, `saved_items`, `job_applications`, `job_match_scores` | ✅ Multi-subscription |
| **Supabase tables** | `jobs`, `saved_items`, `job_applications`, `job_match_scores` | Same |
| **Permission** | `canBrowseJobs`, `canApplyToJobs`, `canPostJobs`, `canSaveJobs`, `canUseAIJobMatching` | Same |

**Jobs gap**: Mobile adds an "Applied" (My Applications) tab which web has as "Alumni Posted". Tab organization differs but core features are equivalent.

---

### G. Projects / CollabHub

| Aspect | Web (`Projects.tsx`) | Mobile (`projects.tsx`) |
|--------|-------|--------|
| Dual mode | ✅ Team-Ups + Long-Term Projects toggle | ✅ Explore / My Projects / Team-Ups / Requests |
| Create project | ✅ In-page dialog with roles | ✅ Create modal with roles |
| Join requests | ✅ Apply for roles, manage applications | ✅ Apply for roles, manage applications |
| Delete project | ✅ Delete confirmation | ✅ Alert-based delete |
| Save project | ✅ Bookmark | ✅ Via saved items |
| **Supabase tables** | `team_ups`, `projects`, `project_roles`, `project_applications`, `saved_items` | Same |

**Projects gap**: Strong parity. Mobile has a dedicated "Requests" tab for incoming applications.

---

### H. Mentorship

| Aspect | Web (`Mentorship.tsx`) | Mobile (`mentorship.tsx`) |
|--------|-------|--------|
| Student view | Find Mentors + My Requests tabs | Mentors / My Requests tabs |
| Mentor view | Dashboard + Offer Settings + Student Requests | Mentors / My Requests / Incoming / Active tabs |
| Search mentors | ✅ By name, company, industry | ✅ Search filter |
| Request mentorship | ✅ | ✅ |
| Web components | `MentorCard`, `MentorDashboard`, `MentorOfferSettings`, `StudentRequestList`, `MentorStatusBadge` | Inline MentorCard + RequestCard components |
| **Supabase tables** | `mentorship_offers`, `mentorship_requests`, `profiles`, `alumni_profiles` | Same |
| **Hook** | `useMentorship` (929 lines — full CRUD + realtime) | Same APIs via `@/lib/api/mentorship` |

**Mentorship gap**: Mobile actually has **more granular tabs** (Incoming/Active) visible inline. Web wraps them in sub-components. Feature parity is strong.

---

### I. Settings

| Aspect | Web (`Settings.tsx`) | Mobile (`settings.tsx`) |
|--------|-------|--------|
| Theme toggle | ✅ light/dark/system via `useTheme` | ✅ light/dark/system via `user_settings` |
| Notification preferences | ✅ Push notification toggle | ✅ Push notification toggle + email/connections toggles |
| Privacy | ✅ Profile visibility | ✅ Profile visibility |
| Email transition | ✅ `EmailTransitionSettings` component | ✅ Email transition UI |
| Password reset | ✅ | ✅ |
| Account deactivation | ✅ Type "DEACTIVATE" to confirm | ✅ Type "DEACTIVATE" to confirm |
| Saved items navigation | ❌ Separate page | ✅ Navigation link |
| About / Help / Legal links | ❌ Separate HelpCenter page | ✅ Inline links |
| Sign out | ❌ (in nav/sidebar) | ✅ Inline button |

**Settings gap**: Mobile is more comprehensive as a single screen (sign-out, help links, about). Web spreads these across Settings + nav + HelpCenter.

---

### J. Other Pages

| Page | Web | Mobile | Notes |
|------|-----|--------|-------|
| **Clubs** | `Clubs.tsx` (also in Events.tsx) | `clubs.tsx` | Parity |
| **EcoCampus** | `EcoCampus.tsx` (Shared Items/Requests/My Listings) | `ecocampus.tsx` (same 3 tabs) | Strong parity |
| **Skill Analysis** | `SkillAnalysis.tsx` (score, gaps, peer comparison) | `skill-analysis.tsx` (score, distribution, gaps) | Web has **peer comparison** section; mobile simpler |
| **Alumni Directory** | `AlumniDirectory.tsx` (filters, RPC) | `alumni.tsx` (filters, same RPC) | Parity |
| **Alumni Invite** | `AlumniInvite.tsx` (token claim, OTP/password, dispute) | `alumni-invite.tsx` (same 7-step flow) | Parity |
| **Portfolio** | Public page + Editor + Template Picker (3 files) | Settings + Editor + Template Picker (3 files) | Web has **public SEO page** with JSON-LD; mobile has settings-only |
| **Portfolio Editor** | Split-screen WYSIWYG with live preview | Section-based form editor | Web has **live preview panel** |
| **Search** | Redirect to `/home` (search in feed) | Full multi-category search (People/Posts/Events/Jobs/Clubs/Projects) | **Mobile search is FAR more capable** |
| **Saved Items** | `SavedItems.tsx` (Posts/Projects/Clubs) | `saved.tsx` (Posts/Projects/Clubs/Jobs) | Mobile adds **Saved Jobs** tab |
| **Help Center** | `HelpCenter.tsx` (FAQs + support tickets) | `help-center.tsx` (FAQs + support tickets) | Parity |
| **Post Detail** | Public + auth views, SEO, realtime | `post/[id].tsx` detail screen | Web has **public/unauthenticated view** |
| **AI Chat** | ❌ **Not a standalone page** (AIChatbot component only) | `ai-chat.tsx` (585 lines — sessions, chat, markdown, suggested prompts) | **Mobile-only as a full screen** |
| **Notifications** | ❌ **No dedicated page** (likely in-app dropdown) | `(tabs)/notifications.tsx` (full tab with mark-read) | **Mobile has dedicated notifications tab** |

---

## 3. Supabase Tables & RPCs Referenced

| Table | Web | Mobile |
|-------|-----|--------|
| `profiles` | ✅ Read/write everywhere | ✅ |
| `posts`, `post_likes`, `comments`, `comment_likes`, `post_shares` | ✅ | ✅ |
| `connections` | ✅ | ✅ |
| `events`, `event_registrations` | ✅ | ✅ |
| `jobs`, `job_applications`, `job_match_scores` | ✅ | ✅ |
| `saved_items` | ✅ | ✅ |
| `projects`, `project_roles`, `project_applications`, `team_ups` | ✅ | ✅ |
| `mentorship_offers`, `mentorship_requests` | ✅ | ✅ |
| `conversations`, `messages` | ✅ | ✅ |
| `alumni_profiles` | ✅ | ✅ |
| `profile_views` | ✅ | ✅ |
| `support_tickets` | ✅ | ✅ |
| `shared_items`, `item_requests` (EcoCampus) | ✅ | ✅ |
| `portfolio_settings` | ✅ | ✅ |
| `user_settings` | ✅ | ✅ |
| `notifications` | ✅ (via component) | ✅ |
| `ai_chat_sessions`, `ai_chat_messages` | ✅ (component) | ✅ |

| RPC | Web | Mobile |
|-----|-----|--------|
| `get_identity_context()` | ✅ | ✅ |
| `get_profiles_by_domain()` | ✅ | ✅ |
| `get_alumni_by_domain()` | ✅ | ✅ |
| `get_accepted_invite_context()` | ✅ | ✅ |
| `get_invite_ops_stats()` | ✅ (admin) | ❌ |
| `verify_personal_email_code()` | ✅ | ✅ |

| Edge Function | Web | Mobile |
|---------------|-----|--------|
| `send-magic-link` | ✅ | ✅ |

---

## 4. Web-Only Features (Not in Mobile)

| Feature | Web Location | Why Web-Only |
|---------|-------------|--------------|
| **ClubAuth** (access-code-gated Club/Faculty/Principal/Dean registration) | `ClubAuth.tsx` + `ClubOnboarding.tsx` | Complex multi-step flow; Club accounts are admin-provisioned |
| **Landing/Marketing page** | `Landing.tsx` with Navbar, Hero, Promo, HowItWorks, Prizes, Footer | Marketing; not needed in app store app |
| **Admin dashboard** (11 pages) | `src/pages/admin/` — Users, Colleges, Domains, Invites, Analytics, Reports, CollabHub, Recruiters, Settings, TalentGraph, Overview | Admin panel for platform operators |
| **Public portfolio page** with SEO/JSON-LD | `Portfolio.tsx` — slug-based, no-auth, Person schema | Public web page by nature; mobile shows settings |
| **Public post/event views** (unauthenticated) | `PostDetail.tsx`, `EventDetail.tsx` — `PublicPostCard`/`PublicEventCard` | SEO shareability; mobile requires auth |
| **Feed sidebar widgets** | ProfileSummary, TrendingAlumni, TrendingTopics, UpcomingEvents, QuickNavigation | Desktop layout; no sidebar in mobile |
| **Split-screen portfolio editor** with live preview | `PortfolioEditor.tsx` | Screen size dependent |
| **AcademicEmailRequired** page | `AcademicEmailRequired.tsx` | Web has a dedicated error page; mobile uses inline alerts |
| **Framer Motion animations** | Every page transition + list animations | React Native uses native animation APIs instead |
| **Advanced Network Filters** | `AdvancedFilters.tsx` — multi-criteria filter panel | Mobile uses simpler chip filters |
| **Event edit/delete** | `Events.tsx` — inline edit dialog + delete | Mobile only creates events |
| **Unified Events+Clubs page** | `Events.tsx` combines both | Mobile keeps separate screens |
| **Skill Analysis peer comparison section** | `SkillAnalysis.tsx` — `canViewPeerComparison` | Mobile shows simpler skill bars |
| **Cover photo upload** | `CoverPhotoUpload.tsx` in profile components | Not in mobile profile |

---

## 5. Mobile-Only Features (Not in Web)

| Feature | Mobile Location | Why Mobile-Only |
|---------|----------------|-----------------|
| **AI Chat (full screen)** | `ai-chat.tsx` (585 lines) — sessions, markdown, suggested prompts, typing indicator | Web only has an `AIChatbot.tsx` component (not a standalone page) |
| **Dedicated Notifications tab** | `(tabs)/notifications.tsx` — full list, mark-read, mark-all-read | Web handles notifications in a dropdown/popover |
| **Full multi-category Search** | `search.tsx` (710 lines) — People, Posts, Events, Jobs, Clubs, Projects with debounce | Web search just redirects to `/home` |
| **"More" hub screen** | `(tabs)/more.tsx` — role-filtered menu linking to all features | No equivalent; web uses sidebar nav |
| **Saved Jobs tab** | `saved.tsx` has Posts/Projects/Clubs/**Jobs** | Web SavedItems has only Posts/Projects/Clubs |
| **Haptic feedback** | `expo-haptics` throughout all interactions | Not applicable to web (no hardware) |
| **Post Actions screen** | `post-actions.tsx` | Web handles post actions inline on PostCard |

---

## 6. ClubAuth & ClubOnboarding Flow Details

### ClubAuth (`ClubAuth.tsx`) — **Web Only**

This is a **completely separate authentication flow** from the normal Login/Signup:

1. **Step 1 — Access Code**: User enters a secret code verified against `VITE_CLUB_ACCESS_CODE` env var
2. **Step 2 — Role Selection**: Choose from Club / Faculty / Principal / Dean
3. **Step 3 — Auth**: Email/password login or signup (NOT Google OAuth)
4. **Security**: Session stored in `sessionStorage` with HMAC-SHA256 integrity signature, 30-minute expiry
5. **Redirect**: Club role → `/club-onboarding`, Staff roles → `/onboarding`

### ClubOnboarding (`ClubOnboarding.tsx`) — **Web Only**

Separate from regular `Onboarding.tsx`:
- Fields: Club name, university, category (Academic/Sports/Cultural/Tech/etc.), founding year, bio, interests, social links, profile picture
- Requires `isClubAccessVerified()` check
- Upserts profile with `role: 'Club'`

### Impact on Mobile

Club, Faculty, Principal, and Dean accounts **must be created via web**. Once created, these accounts can log in on mobile via Google OAuth (if they used the same Google account) or via their email. But the **provisioning flow** is web-only.

---

## 7. Feature Gap Analysis: Feed

| Feature | Web | Mobile | Gap Severity |
|---------|-----|--------|-------------|
| Post composer | ✅ Rich composer with tabs | ✅ Separate create-post screen (4 types) | Low — equivalent |
| Infinite feed with sort | ✅ | ✅ | None |
| Reactions / Likes / Comments | ✅ | ✅ | None |
| Polls | ✅ | ✅ | None |
| Repost / Share | ✅ `RepostModal` + `ShareModal` | ✅ `ShareSheet` + `RepostSheet` | None |
| Bookmarks | ✅ | ✅ | None |
| Profile sidebar | ✅ Profile card, network stats | ❌ | **Low** — mobile layout |
| Trending Alumni sidebar | ✅ | ❌ | **Medium** — discoverable content missing |
| Trending Topics sidebar | ✅ | ❌ | **Medium** — discoverable content missing |
| Upcoming Events sidebar | ✅ | ❌ | **Medium** — cross-feature discovery |
| Profile completion banner | ✅ | ✅ (on profile tab) | Low — different placement |
| Personal email prompt | ✅ (feed sidebar) | ❌ (Settings only) | **Low** |

**Summary**: Core feed functionality has full parity. The main gap is the sidebar widgets which provide cross-feature discovery on web. Consider adding a "Discover" section or stories-like row at feed top on mobile.

---

## 8. Feature Gap Analysis: Profile

| Feature | Web | Mobile | Gap Severity |
|---------|-----|--------|-------------|
| View own profile | ✅ | ✅ | None |
| View other profiles | ✅ Same page | ✅ `user/[id].tsx` | None |
| Edit profile | ✅ In-page modal | ✅ Separate screen | None (different UX patterns) |
| Avatar upload/remove | ✅ | ✅ | None |
| Cover photo upload | ✅ `CoverPhotoUpload` | ❌ | **Medium** — visual feature |
| Stats (connections, views, posts) | ✅ | ✅ | None |
| Connection actions | ✅ | ✅ | None |
| Profile tabs (Posts/Edu/Exp/Skills/Projects) | ✅ Tabbed interface | ✅ Scrollable sections | None |
| Role-specific sections | ✅ Alumni/Club/Faculty/Student/Org | ✅ Role badges | **Low** — web has richer role sections |
| Profile completion indicator | ✅ | ✅ | None |
| Realtime updates | ✅ | ✅ | None |

**Summary**: Strong parity. Main gaps: cover photo upload (medium) and role-specific profile sections (low).

---

## 9. Feature Gap Analysis: Settings

| Feature | Web | Mobile | Gap Severity |
|---------|-----|--------|-------------|
| Theme (light/dark/system) | ✅ | ✅ | None |
| Notification preferences | ✅ Push toggle | ✅ Push + email + messages + connections | **Mobile is richer** |
| Push notification test | ❓ | ✅ Test button | **Mobile advantage** |
| Profile visibility | ✅ | ✅ | None |
| Email transition | ✅ | ✅ | None |
| Password reset | ✅ | ✅ | None |
| Account deactivation | ✅ | ✅ | None |
| Sign out | ✅ (nav bar) | ✅ (inline button) | None |
| About/Help/Legal links | ❌ (HelpCenter page) | ✅ (inline links) | Mobile more accessible |
| Saved items nav link | ❌ (separate route) | ✅ (link in settings) | Mobile more discoverable |

**Summary**: Surprisingly, mobile Settings is **more comprehensive than web**. Web splits functionality across Settings page, nav bar, and separate pages.

---

## 10. Feature Gap Analysis: Messaging

| Feature | Web | Mobile | Gap Severity |
|---------|-----|--------|-------------|
| Conversation list | ✅ Left panel | ✅ Full screen list | None |
| Search conversations | ✅ | ✅ | None |
| Chat view | ✅ Right panel (split) | ✅ `chat/[id].tsx` | None |
| Start new conversation | ✅ Connections tab | ✅ `new-conversation.tsx` | None |
| Partner validation | ✅ `assertCanMessagePartner` | ✅ | None |
| Realtime messages | ✅ | ✅ `useMessageSubscription` | None |
| Desktop split panel | ✅ | N/A | N/A (layout) |
| Auto-select first conversation | ✅ | N/A | N/A (mobile pattern) |

**Summary**: **Full parity**. Both platforms implement identical messaging functionality with appropriate UI patterns for their platform.

---

## 11. Web Component Directory Inventory

| Directory | Components | Count |
|-----------|-----------|-------|
| `src/components/auth/` | PermissionGuard, ReactivationPrompt, RouteGuard | 3 |
| `src/components/home/` | PostCard, CreatePostCard, PostComposer, CommentSection, CommentDrawer, ShareModal, RepostModal, ReactionPicker, PollCreator, TrendingTopics, TrendingAlumni, UpcomingEvents, ProfileSummary, QuickNavigation, HeroSection, MediaPreview, DragDropZone, PublicPostCard, InlineCommentInput | 23 |
| `src/components/messages/` | ChatView, ConversationList | 2 |
| `src/components/network/` | AdvancedFilters, ConnectionManager | 2 |
| `src/components/profile/` | ProfileHeader, ProfileTabs, EditProfileModal, ProfileConnections, ProfilePosts, ProfileEducation, ProfileExperience, ProfileSkills, ProfileProjects, ProfileActions, ProfileCompletionBanner, PersonalEmailPrompt, CoverPhotoUpload, AvatarCropModal, EmailTransitionSettings, EducationForm, ExperienceForm, SkillForm, RoleSpecificProfile, AlumniProfileSection, ClubProfileSection, FacultyProfileSection, StudentProfileSection, OrganizationProfileSection, portfolio/ | 25+ |
| `src/components/events/` | EventDetailCard, EventShareModal, PublicEventCard | 3 |
| `src/components/jobs/` | JobApplicationDialog, JobPostingDialog | 2 |
| `src/components/mentorship/` | MentorCard, MentorDashboard, MentorOfferSettings, MentorStatusBadge, StudentRequestList | 5 |
| `src/components/ecocampus/` | SharedItems, Requests, MyListings, NewPostDialog | 4 |
| `src/components/ai/` | AIChatbot | 1 |

---

## 12. Web Features Inappropriate for Mobile

| Feature | Reason |
|---------|--------|
| **Landing/Marketing page** | App store listing serves this purpose |
| **Admin dashboard** (11 pages) | Admin operations need full desktop viewport |
| **Public SEO pages** (portfolio, posts, events) | Mobile app doesn't serve public web URLs |
| **Split-screen portfolio editor** | Insufficient screen width |
| **Feed sidebar widgets** | No sidebar in mobile; consider alternative placements |
| **Framer Motion page transitions** | React Native has its own animation system |
| **Advanced multi-criteria filter panels** | Better as bottom sheets on mobile |
| **ClubAuth provisioning flow** | Low-frequency admin action; web is fine |

---

## 13. Permission Model Parity

Both platforms use the **same permission matrix** via `useFeatureAccess`:

| Feature | Student | Alumni | Faculty | Club |
|---------|---------|--------|---------|------|
| Feed / Posts | ✅ | ✅ | ✅ | ✅ |
| Network / Connections | ✅ | ✅ | ✅ | ✅ |
| Messaging | ✅ | ✅ | ✅ | ✅ |
| Jobs (browse) | ✅ | ✅ | ✅ | ✅ |
| Jobs (post) | ❌ | ✅ | ❌ | ❌ |
| Jobs (AI matching) | ✅ | ✅ | ❌ | ❌ |
| Projects (view/create) | ✅ | ✅ | ✅ | ✅ |
| Projects (apply) | ✅ | ✅ | ❌ | ❌ |
| Events (view/RSVP) | ✅ | ✅ | ✅ | ✅ |
| Events (create/manage) | ❌ | ❌ | ✅ | ✅ |
| Clubs (view) | ✅ | ✅ | ✅ | ✅ |
| Clubs (join) | ✅ | ❌ | ❌ | ❌ |
| Clubs (follow) | ❌ | ✅ | ❌ | ❌ |
| Clubs (manage) | ❌ | ❌ | ❌ | ✅ |
| Mentorship (request) | ✅ | ❌ | ❌ | ❌ |
| Mentorship (offer) | ❌ | ✅ | ✅ | ❌ |
| Alumni Directory | ✅ | ✅ | ✅ | ❌ |
| EcoCampus | ✅ | ❌ | ✅ | ❌ |
| Skill Analysis | ✅ | ✅ | ❌ | ❌ |
| Saved Items | ✅ | ✅ | ✅ | ❌ |

Both platforms enforce this identically via `useFeatureAccess` → `useIdentityContext` → `get_identity_context()` RPC.

---

## Summary: Priority Gaps to Close

| Priority | Gap | Direction |
|----------|-----|-----------|
| 🔴 High | **Multi-category Search** — Mobile has it, web redirects to /home | Web needs search |
| 🔴 High | **Event edit/delete** — Web only | Mobile needs event management |
| 🟡 Medium | **AI Chat full screen** — Mobile only | Web should promote chatbot to a page |
| 🟡 Medium | **Cover photo upload** — Web only | Mobile profile enhancement |
| 🟡 Medium | **Trending content sidebar** — Web only | Mobile needs discovery surface |
| 🟡 Medium | **Saved Jobs tab** — Mobile only | Web SavedItems should add Jobs |
| 🟡 Medium | **Notifications tab** — Mobile-only full screen | Web needs notification center page |
| 🟢 Low | **Skill Analysis peer comparison** — Web only | Nice-to-have for mobile |
| 🟢 Low | **Advanced Network Filters** — Web only | Bottom sheet on mobile |
| ⚪ N/A | ClubAuth, Admin, Landing, Public SEO | Appropriately web-only |
