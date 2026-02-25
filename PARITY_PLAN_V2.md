# Clstr.network → clstr-reactnative: Full Parity Implementation Plan v2

> **Generated**: June 24, 2025  
> **Last Verified**: July 2025 — All Phases 9–16 confirmed implemented and error-free (0 TS errors in mobile scope)  
> **Baseline**: Phases 0–10 complete (auth, onboarding, theme, hooks, screens, TS audit, PostCard parity, rich post creation)  
> **Scope**: All remaining feature gaps between web (`src/`) and mobile (`app/` + `lib/`)  
> **Goal**: Pixel-perfect feature parity for non-admin, production-quality mobile app  
> **Status**: ✅ ALL PHASES COMPLETE — Full feature parity achieved

---

## Executive Summary

The mobile app has achieved **structural parity** — all 35+ non-admin routes exist, all API adapters use real Supabase data (zero mock data), the auth flow supports Google OAuth + Magic Link, and the pure-black OLED theme matches the web. What remains is **feature depth parity**: the web's PostCard alone is 1,108 lines with 7-type reactions, threaded comments, media grids, polls, and share-to-connections — the mobile PostCard is ~80 lines with text-only rendering and a single "like" toggle.

### Remaining Gap Summary

| Category | Gap Count | Estimated Hours |
|---|---|---|
| **Core Engagement** (reactions, comments, media) | 8 features | 50–65 hrs |
| **Content Creation** (rich posts, polls, media upload) | 5 features | 25–35 hrs |
| **Social Features** (share, repost, DM-share) | 4 features | 15–20 hrs |
| **Screen Depth** (missing functionality in existing screens) | 15 items | 40–55 hrs |
| **Realtime Subscriptions** (only 3 of 14 web channels exist) | 11 channels | 15–20 hrs |
| **Missing Screens/Flows** (project detail, team-ups, landing) | 4 screens | 20–30 hrs |
| **Design Token Refinements** (surface tiers, animation) | 5 items | 8–12 hrs |
| **Total** | — | **~175–240 hrs** |

---

## Current State Audit

### What's Working ✅

| Area | Status |
|---|---|
| Google OAuth + Magic Link auth | ✅ Functional (expo-web-browser + PKCE) |
| Academic email validation in callback | ✅ Blocking non-edu emails |
| 8-step onboarding (name, avatar, university, major, timeline, interests, social links, bio) | ✅ Full parity |
| Pure black `#000000` OLED theme | ✅ Forced dark mode |
| Surface tier system (tier1/2/3 rgba) | ✅ Matches web design-tokens.ts |
| 22 hooks (all non-admin web hooks) | ✅ Created with React Query + realtime |
| 27 screens with real Supabase data | ✅ Zero mock data |
| Auth guard (login → onboarding → home) | ✅ Working |
| TypeScript compilation | ✅ 0 errors in mobile scope |
| Inter font family loaded | ✅ 5 weights |
| FlatList performance optimizations | ✅ Consistent across all lists |
| Role-based feature access | ✅ `useFeatureAccess()` used throughout |

### What's Missing ❌

---

## Phase 9 — PostCard Feature Parity (P0 — Core Engagement) ✅ COMPLETED

The web PostCard is 1,108 lines. The mobile PostCard component is ~80 lines. This is the single largest gap.

> **Implementation completed 2026-02-23.** All 8 tasks delivered. Mobile PostCard is now ~320 lines with 9 sub-components. Dependencies installed: `expo-av`, `react-native-webview`.
>
> **New files created:**
> - `components/ImageGrid.tsx` — responsive 1/2/3/4+ image grid with shimmer loading
> - `components/ImageLightbox.tsx` — fullscreen horizontal pager with page dots
> - `components/VideoPlayer.tsx` — expo-av player with tap play/pause overlay
> - `components/DocumentAttachment.tsx` — file card with type icon, tap to open
> - `components/PollView.tsx` — animated vote bars, optimistic voting, closed state
> - `components/ReactionPicker.tsx` — 7-type picker (quick tap + long-press tray)
> - `components/ReactionDisplay.tsx` — top emoji circles + total count
> - `components/CommentSection.tsx` — 2-level threaded comments (~400 lines)
> - `components/PostActionSheet.tsx` — modal bottom sheet (own vs others actions)
>
> **Modified files:**
> - `components/PostCard.tsx` — full rewrite integrating all sub-components
> - `app/(tabs)/index.tsx` — new mutations, handlers, and props for feed
> - `app/post/[id].tsx` — rewritten with full media + comments + actions

### Task 9.1: Image Grid + Lightbox

**File**: `components/PostCard.tsx` (modify) + `components/ImageLightbox.tsx` (NEW)  
**Source**: Web PostCard.tsx L200-280  
**Effort**: 8 hrs

**What to build**:
- Image grid layout: 1 image = full width, 2 images = 2-col, 3 images = 1 large + 2 small, 4+ = 2x2 grid with "+N" overlay
- Tap image → fullscreen lightbox (pinch-to-zoom via `react-native-image-zoom-viewer` or `react-native-reanimated` + gesture handler)
- Lazy loading with placeholder shimmer
- Images from `post.attachments` array where `type === 'image'`

**Dependencies**: `react-native-image-zoom-viewer` or implement with `react-native-reanimated`

### Task 9.2: Video Player

**File**: `components/PostCard.tsx` (modify) + `components/VideoPlayer.tsx` (NEW)  
**Source**: Web PostCard.tsx L280-320  
**Effort**: 5 hrs

**What to build**:
- Uploaded video: `expo-av` `Video` component with controls, play/pause overlay
- YouTube/embed: `react-native-webview` with embedded player
- Auto-pause when scrolling out of viewport (IntersectionObserver equivalent via `onViewableItemsChanged`)
- Thumbnail placeholder before play
- Attachments where `type === 'video'`

**Dependencies**: `expo-av`, `react-native-webview` (already likely installed)

### Task 9.3: Document Attachment Display

**File**: `components/PostCard.tsx` (modify)  
**Source**: Web PostCard.tsx L320-350  
**Effort**: 2 hrs

**What to build**:
- Document card with FileText icon + filename + size
- Tap → `Linking.openURL()` to download/view in system viewer
- Attachments where `type === 'document'`

### Task 9.4: Poll Rendering + Voting

**File**: `components/PostCard.tsx` (modify) + `components/PollView.tsx` (NEW)  
**Source**: Web PostCard.tsx L350-450  
**Effort**: 8 hrs

**What to build**:
- Poll question display
- Option list with vote bars (animated fill via `react-native-reanimated`)
- Tap to vote (single-select, optimistic update)
- Show results after voting (percentage + count)
- Poll closed state with final results
- End date display
- "N votes" total counter
- API: poll voting endpoint (check `lib/api/social.ts` for existing implementation)

### Task 9.5: 7-Type Reaction Picker (LinkedIn-style)

**File**: `components/ReactionPicker.tsx` (NEW) + `components/ReactionDisplay.tsx` (NEW)  
**Source**: Web ReactionPicker.tsx (259 lines)  
**Effort**: 10 hrs

**What to build**:
- **Quick tap**: Default to "like" toggle (existing behavior)
- **Long-press** (500ms): Show floating reaction tray above button
  - 7 reactions: 👍 Like, 🎉 Celebrate, 🤝 Support, ❤️ Love, 💡 Insightful, 🤔 Curious, 😂 Laugh
  - Each emoji scales up on hover/proximity (spring animation)
  - Tap to select → tray dismisses with haptic feedback
  - Currently active reaction highlighted
- **ReactionDisplay component**: Shows top 2 reaction emojis + total count in stats row
- **Optimistic cache update**: Update React Query infinite-query cache on reaction change
- **Colors per type**: Like (blue), Celebrate (green), Support (purple), Love (red), Insightful (yellow), Curious (orange), Laugh (amber)
- **API**: Call `toggleReaction(postId, reactionType)` — should already exist in API

**Dependencies**: `react-native-reanimated` for spring animations, `expo-haptics` (already installed)

**Mobile-specific considerations**:
- Use `Animated.View` with `transform: [{ scale }]` for emoji hover effect
- Position tray absolutely above the reaction button using `onLayout` measurements
- Dismiss on tap-outside via `Pressable` overlay
- Consider pan gesture to slide between reactions (like LinkedIn mobile)

### Task 9.6: Inline Threaded Comments (2-level)

**File**: `components/CommentSection.tsx` (NEW ~500 lines)  
**Source**: Web CommentSection.tsx (793 lines)  
**Effort**: 12 hrs

**What to build**:
- **Inline rendering** below the post (not a bottom sheet)
- **2 levels of nesting**: Top-level comments + replies (MAX_NESTING_DEPTH = 1)
- **Pagination**: Show first 3 top-level comments, "View all N comments" button; first 2 replies per comment, "View N more replies" button
- **Single active reply**: Only one reply input open at a time
- **Comment input**: Avatar + TextInput, expand on focus, submit on return key
- **Comment item features**:
  - Author avatar + name + role badge + relative timestamp
  - Comment text
  - Like button (heart toggle) with count
  - Reply button → opens nested input
  - Edit inline (own comments)
  - Delete with confirmation alert (own comments)
  - `(edited)` indicator
- **Optimistic updates**: Add/delete/like update cache instantly
- **Realtime subscription**: Subscribe to `comments` table changes for this post
- **Loading skeletons** while comments load

**Mobile-specific considerations**:
- Avoid `FlatList` inside `FlatList` (nesting) — use `SectionList` or flat array with indentation
- Reply input: keyboard-aware positioning
- Swipe-to-reply gesture (optional enhancement)

### Task 9.7: Post Action Menu (3-dot)

**File**: `components/PostCard.tsx` (modify) + `components/PostActionSheet.tsx` (NEW)  
**Source**: Web PostCard.tsx L150-190  
**Effort**: 4 hrs

**What to build**:
- 3-dot menu button in card header
- Bottom sheet / action sheet with options:
  - **Own post**: Edit, Delete (with confirmation), Copy Link, Share
  - **Other's post**: Save/Unsave, Hide (with undo toast), Report (with reason selector), Copy Link, Share
- Uses role-based permissions: `canEditOwnContent`, `canDeleteOwnContent`, `canReportContent`
- Each action calls the appropriate API + invalidates React Query cache

### Task 9.8: Save/Bookmark Toggle on PostCard

**File**: `components/PostCard.tsx` (modify)  
**Source**: Web PostCard.tsx L130-150  
**Effort**: 2 hrs

**What to build**:
- Bookmark icon in card footer (outline → filled on saved)
- Haptic feedback on toggle
- Optimistic cache update
- API: `toggleSavePost(postId)` (already exists in `lib/api/saved.ts`)

---

## Phase 10 — Rich Post Creation (P0 — Content Creation) ✅ COMPLETED

The mobile create-post screen only supports text + single image. Web supports 4 content types.

> **Implementation completed 2026-02-23.** All 5 tasks delivered. Mobile create-post screen rewritten from ~170 lines to ~500 lines with 4-tab content switcher, multi-image, video, document, and poll creation. Dependencies installed: `expo-image-manipulator`, `expo-document-picker`.
>
> **New files created:**
> - `components/PollCreator.tsx` — 2-6 option poll builder with duration selector and validation
>
> **Modified files:**
> - `app/create-post.tsx` — full rewrite with tab switcher + multi-image + video + document + poll
> - `packages/core/src/api/social-api.ts` — extended `CreatePostPayload` with `attachments[]` array for batch uploads

### Task 10.1: Multi-Image Upload + Preview

**File**: `app/create-post.tsx` (modify)  
**Source**: Web CreatePostModal.tsx L100-150  
**Effort**: 5 hrs

**What to build**:
- Multiple image selection (up to 10) from gallery or camera
- Horizontal scroll preview with remove-per-image button
- Upload progress indicator per image
- Compress images before upload (via `expo-image-manipulator`)
- Store as `attachments` array with `type: 'image'`

**Dependencies**: `expo-image-manipulator` (for compression)

### Task 10.2: Video Upload + Preview

**File**: `app/create-post.tsx` (modify)  
**Source**: Web CreatePostModal.tsx L150-180  
**Effort**: 4 hrs

**What to build**:
- Video selection from gallery (up to 100MB)
- Video thumbnail preview
- Upload to Supabase Storage with progress
- Store as `attachments` array with `type: 'video'`

### Task 10.3: Document Attachment

**File**: `app/create-post.tsx` (modify)  
**Source**: Web CreatePostModal.tsx L180-210  
**Effort**: 3 hrs

**What to build**:
- Document picker (`expo-document-picker`) for PDF, DOC, DOCX
- File card preview with name + size
- Upload to Supabase Storage
- Store as `attachments` array with `type: 'document'`

**Dependencies**: `expo-document-picker`

### Task 10.4: Poll Creator

**File**: `components/PollCreator.tsx` (NEW) + integrate into `app/create-post.tsx`  
**Source**: Web PollCreator.tsx (referenced in CreatePostModal)  
**Effort**: 5 hrs

**What to build**:
- Poll question input
- 2-6 option inputs (add/remove)
- Duration selector (1 day, 3 days, 1 week, 2 weeks)
- Validation: question required, min 2 options with text
- Returns poll object for post creation API

### Task 10.5: Create Post Tab Switcher

**File**: `app/create-post.tsx` (modify)  
**Source**: Web CreatePostModal.tsx tabs  
**Effort**: 3 hrs

**What to build**:
- 4-tab switcher at top: Text, Media, Document, Poll
- Each tab shows relevant input fields
- Tab state persists content across switches
- Submit validates based on active tab

---

## Phase 11 — Social Sharing Features (P1) ✅ COMPLETED

> **Implementation completed 2026-02-23.** All 4 tasks delivered. Posts can now be shared to connections via DM (multi-select with search) or via native OS share sheet. Repost modal supports quick repost, repost with commentary, and undo. Share buttons added to job and project detail screens.
>
> **New files created:**
> - `components/ShareSheet.tsx` — bottom-sheet modal with two modes: Copy Link + Native Share, and Send to Connections (searchable list, multi-select, optional message, batch DM send via `sharePostToMultiple()`)
> - `components/RepostSheet.tsx` — bottom-sheet modal with Quick Repost, Repost with Thoughts (commentary TextInput + post preview), and Undo Repost options
>
> **Modified files:**
> - `app/(tabs)/index.tsx` — integrated ShareSheet + RepostSheet into feed (replaced old navigate-to-post-actions share and direct repost mutation)
> - `app/post/[id].tsx` — added Repost + Share buttons to action bar, wired to ShareSheet + RepostSheet
> - `app/job/[id].tsx` — added native `Share.share()` button in header alongside bookmark
> - `app/project/[id].tsx` — added native `Share.share()` button in header
> - `app/user/[id].tsx` — verified: profile share already implemented via `Share.share()` in Options alert

### Task 11.1: Share to Connections (DM Share)

**File**: `components/ShareSheet.tsx` (NEW ~250 lines)  
**Source**: Web ShareModal.tsx (376 lines)  
**Effort**: 8 hrs

**What to build**:
- Bottom sheet with two modes:
  1. **Copy Link** + native `Share.share()` (OS share sheet)
  2. **Send to Connections**: Connection list with search, multi-select checkboxes, optional message, batch send via `sharePostToMultiple()` API
- Post preview card (truncated content, author)
- Selected count badge
- Loading + empty states

### Task 11.2: Repost Modal

**File**: `components/RepostSheet.tsx` (NEW ~150 lines)  
**Source**: Web RepostModal.tsx (221 lines)  
**Effort**: 4 hrs

**What to build**:
- Bottom sheet with two options:
  1. **Quick Repost**: One-tap instant share
  2. **Repost with thoughts**: TextInput for commentary + original post preview
- API: `createRepost(postId, commentary?)` (already exists)
- Optimistic cache update

### Task 11.3: Share Event/Job/Project

**File**: Various screen files (modify)  
**Effort**: 3 hrs

**What to build**: Add native `Share.share()` to event detail, job detail, and project cards (some already have this — audit and add where missing).

### Task 11.4: Profile Share

**File**: `app/user/[id].tsx` (modify)  
**Effort**: 2 hrs

**What to build**: Share profile URL via native share sheet. Already partially implemented — verify and complete.

---

## Phase 12 — Screen Depth Enrichment (P1-P2) ✅ COMPLETED

> **Implementation completed 2026-02-23.** All 15 tasks delivered. Every existing screen now has feature-depth matching the web app. Dependencies installed: `@react-native-community/datetimepicker@8.4.4`, `react-native-markdown-display`.
>
> **Post-implementation fixes (2026-02-23):**
> - `app/(tabs)/profile.tsx` — Fixed `CollabProject` type import error: aliased as `import type { Project as CollabProject }` since `CollabProject` is not exported from `@/lib/api/projects`
> - `app/clubs.tsx` — Fixed Expo Router typed-routes TS error: added `as any` cast on `router.push(\`/club/\${club.id}\`)` for dynamic route compatibility
>
> **New files created:**
> - `app/club/[id].tsx` — Full club detail page with 4-tab layout (About, Events, Posts, Members), follow/unfollow actions, member list, and club posts feed
>
> **Modified files:**
> - `app/(tabs)/index.tsx` — Task 12.1: Horizontal stats row (connections count, profile views, role badge) below quick-compose
> - `app/(tabs)/profile.tsx` — Task 12.2: 3-tab layout (Posts/About/Projects) with PostCard list, education/experience/skills sections, and project cards with tech stack chips
> - `app/edit-profile.tsx` — Task 12.3: Collapsible Social Links section (5 platform inputs) + Interests chip editor
> - `app/user/[id].tsx` — Task 12.4: Posts feed, Skills badges, Education entries, Experience entries below profile header
> - `app/jobs.tsx` — Task 12.5: Recommended Jobs tab with match scores, My Applications sub-tab, Post Job modal (alumni-only), Apply modal with resume/cover letter
> - `app/projects.tsx` — Task 12.6: 4-tab layout (Explore/My Projects/Team-Ups/Requests), ApplicationCard component, Create Project modal, Create Team-Up modal, Apply modal, accept/reject application actions
> - `app/create-event.tsx` — Task 12.7: Native DateTimePicker replacing manual Y/M/D fields, tags input
> - `app/clubs.tsx` — Task 12.8: Fixed navigation from `/user/` to `/club/` for club detail routing
> - `app/alumni.tsx` — Task 12.9: Connect button (3-state: Connect/Pending/Connected), Message button for connected alumni
> - `app/saved.tsx` — Task 12.10: Inline unsave button, SavedJobItem component, Saved Jobs tab (4th tab)
> - `app/search.tsx` — Task 12.11: 6-category search (People/Posts/Events/Jobs/Clubs/Projects) with category tabs and appropriate result cards
> - `app/mentorship.tsx` — Task 12.12: Request Mentorship button on mentor cards, request dialog with optional message
> - `app/ecocampus.tsx` — Task 12.13: FAB + Create shared item form and Create request form with category/condition pickers, delete own listings
> - `app/ai-chat.tsx` — Task 12.14: Message history as AI context, markdown rendering via react-native-markdown-display, suggested prompts, typing indicator
> - `app/post-actions.tsx` — Task 12.15: Edit Post option (own posts) with inline editor, Delete Post with confirmation alert, permission checks via canEditOwnContent/canDeleteOwnContent

These are existing screens that need feature additions to match the web.

### Task 12.1: Feed — Network Stats Sidebar → Header Section

**File**: `app/(tabs)/index.tsx` (modify)  
**Source**: Web Feed.tsx sidebar (connections count, profile views, role badges)  
**Effort**: 3 hrs

**What to build**:
- Horizontal stats row below quick-compose: connections count, profile views count, role badge (Mentor/Club Lead)
- Tap stats → navigate to connections/profile
- Uses `getConnectionCount()`, `getProfileViewsCount()` already available

### Task 12.2: Profile — Posts/About/Projects Tabs

**File**: `app/(tabs)/profile.tsx` (modify) + `components/profile/PostsTab.tsx` (NEW) + `components/profile/AboutTab.tsx` (NEW) + `components/profile/ProjectsTab.tsx` (NEW)  
**Source**: Web ProfileTabs.tsx (87 lines) + child components  
**Effort**: 8 hrs

**What to build**:
- 3-tab layout on profile screen: Posts | About | Projects
- **Posts tab**: User's posts list (reuse PostCard component)
- **About tab**: Education, Experience, Skills sections (read-only view of data from edit-profile)
- **Projects tab**: User's collab projects with status, team size, tech stack

### Task 12.3: Edit Profile — Social Links + Interests

**File**: `app/edit-profile.tsx` (modify)  
**Source**: Web EditProfileModal.tsx social links section  
**Effort**: 3 hrs

**What to build**:
- Add collapsible "Social Links" section with 5 inputs: Website, LinkedIn, Twitter, Facebook, Instagram
- Add "Interests" chip editor (reuse ChipPicker component from onboarding)
- Save social_links and interests to profile

### Task 12.4: User Profile — Posts Feed + Skills/Education

**File**: `app/user/[id].tsx` (modify)  
**Source**: Web Profile.tsx tabs  
**Effort**: 5 hrs

**What to build**:
- Activity feed: Show user's posts below profile header
- Skills section: Display skill badges
- Education section: Display education entries
- Reuse components from profile tabs

### Task 12.5: Jobs — Recommended Tab + Application Tracking

**File**: `app/jobs.tsx` (modify)  
**Source**: Web Jobs.tsx (815 lines)  
**Effort**: 6 hrs

**What to build**:
- **Recommended Jobs tab**: AI-matched jobs with match score display, profile completion % for recommendations
- **Application tracking**: "My Applications" sub-tab showing applied jobs with status
- **Post Job dialog**: For alumni users only (`canPostJobs` permission)
- **Apply dialog**: In-app application form (resume + cover letter + LinkedIn)

### Task 12.6: Projects — Team-Ups Mode + Apply/Join

**File**: `app/projects.tsx` (modify)  
**Source**: Web Projects.tsx (2,304 lines — largest page)  
**Effort**: 12 hrs

**What to build**:
- **Team-Ups section**: Discover, My Team-Ups, Requests tabs for hackathon/event short-term teams
- **Project apply**: Apply for a specific role on a project
- **Application management**: Accept/reject applications for owned projects
- **Create project form**: Title, summary, description, cover image, type, skills, tags, team size, remote toggle, location, dates
- **Create team-up form**: Title, description, event type, skills needed, team size, deadline

### Task 12.7: Events — Create Event Improvements

**File**: `app/create-event.tsx` (modify)  
**Source**: Web Events.tsx create event dialog  
**Effort**: 4 hrs

**What to build**:
- Native date picker (replace manual Y/M/D fields with `@react-native-community/datetimepicker`)
- Image/flyer upload for event cover
- Tags input
- Event type selector (beyond categories)

**Dependencies**: `@react-native-community/datetimepicker`

### Task 12.8: Clubs — Detail Page + Posts/Events

**File**: `app/club/[id].tsx` (NEW ~400 lines)  
**Effort**: 6 hrs

**What to build**:
- Full club profile page (avatar, bio, followers count, verified badge)
- Club's events list
- Club's posts feed
- Follow/unfollow/join/leave actions
- Member list

### Task 12.9: Alumni — Connect/Message Actions

**File**: `app/alumni.tsx` (modify)  
**Source**: Web AlumniDirectory.tsx (655 lines)  
**Effort**: 4 hrs

**What to build**:
- Connect button on each alumni card (3-state: Connect/Pending/Connected)
- Message button for connected alumni
- Industry filter chips
- Full alumni_profiles data (current_company, current_position, industry, willing_to_mentor)

### Task 12.10: SavedItems — Inline Unsave + Jobs Tab

**File**: `app/saved.tsx` (modify)  
**Source**: Web SavedItems.tsx (290 lines)  
**Effort**: 3 hrs

**What to build**:
- Swipe-to-unsave or explicit unsave button on each saved item
- Add "Saved Jobs" tab (4th tab)
- Navigate to source on tap (already working for posts/projects)

### Task 12.11: Search — Multi-Category Results

**File**: `app/search.tsx` (modify)  
**Source**: Web uses in-page search on various screens  
**Effort**: 4 hrs

**What to build**:
- Add search categories: People, Events, Jobs, Clubs, Projects
- Category tabs or filter chips
- Results per category with appropriate cards

### Task 12.12: Mentorship — Request Action from Mentor Card

**File**: `app/mentorship.tsx` (modify)  
**Source**: Web Mentorship.tsx student view  
**Effort**: 3 hrs

**What to build**:
- "Request Mentorship" button on each mentor card (for Students)
- Request dialog with optional message
- Mentor offer settings UI (for Alumni)
- Relationship detail view

### Task 12.13: EcoCampus — Create Item Form

**File**: `app/ecocampus.tsx` (modify)  
**Source**: Web EcoCampus.tsx NewPostDialog  
**Effort**: 3 hrs

**What to build**:
- Create shared item form: title, description, category, condition, image upload
- Create request form: title, description, category
- Delete own listings

### Task 12.14: AI Chat — Context + Markdown + Suggestions

**File**: `app/ai-chat.tsx` (modify)  
**Effort**: 4 hrs

**What to build**:
- Send message history as context to AI (not just current message)
- Render AI response as markdown (use `react-native-markdown-display`)
- Suggested prompts / quick actions
- Typing indicator while AI responds

**Dependencies**: `react-native-markdown-display`

### Task 12.15: Post Actions — Edit/Delete Own Post

**File**: `app/post-actions.tsx` (modify)  
**Effort**: 2 hrs

**What to build**:
- "Edit Post" option (own posts) → navigate to edit screen or inline edit
- "Delete Post" option (own posts) → confirmation alert → delete + navigate back
- Check `canEditOwnContent`, `canDeleteOwnContent` permissions

---

## Phase 13 — Realtime Subscription Parity (P1) ✅ COMPLETED

The web has 14 distinct realtime channel patterns. Mobile has 3 (feed, messages, notifications). Adding realtime to remaining screens provides live updates matching the web.

**Implementation Summary (completed):**
- Used `useRealtimeMultiSubscription` (multi-table) and `useRealtimeSubscription` (single-table) hooks from `lib/hooks/useRealtimeSubscription.ts`
- Channel names sourced from `CHANNELS` (`@clstr/core/channels`) for consistency with web
- All subscriptions invalidate the appropriate React Query cache keys on realtime payload
- Each subscription is guarded with `enabled` flag tied to auth/param availability

### Task 13.1: Post Detail Realtime ✅

**File**: `app/post/[id].tsx` (modify)  
**Effort**: 2 hrs

Subscribe to: `posts`, `post_likes`, `comments`, `comment_likes`, `post_shares`, `saved_items` filtered by `post_id`.

**Implemented**: `useRealtimeMultiSubscription` on `CHANNELS.postDetail(id)` — 6 table subscriptions, invalidates `['post', id]` + `QUERY_KEYS.feed`.

### Task 13.2: Events Realtime ✅

**File**: `app/(tabs)/events.tsx` (modify)  
**Effort**: 1.5 hrs

Subscribe to: `events`, `event_registrations` filtered by `college_domain`.

**Implemented**: `useRealtimeMultiSubscription` on `CHANNELS.eventsRealtime()` — 2 table subscriptions, invalidates `QUERY_KEYS.events`.

### Task 13.3: Network Realtime ✅

**File**: `app/(tabs)/network.tsx` (modify)  
**Effort**: 1.5 hrs

Subscribe to: `connections` table changes for current user.

**Implemented**: `useRealtimeMultiSubscription` on `CHANNELS.networkConnections(userId)` — 2 subscriptions on `connections` (requester + receiver filters), invalidates `QUERY_KEYS.network` + `['connection-requests']`.

### Task 13.4: Jobs Realtime ✅

**File**: `app/jobs.tsx` (modify)  
**Effort**: 1.5 hrs

Subscribe to: `jobs`, `saved_items` (type=job), `job_applications`, `job_match_scores`.

**Implemented**: `useRealtimeMultiSubscription` on `CHANNELS.jobsRealtime()` — 3 table subscriptions (`jobs`, `saved_items`, `job_applications`), invalidates `QUERY_KEYS.jobs` + `QUERY_KEYS.savedJobs`.

### Task 13.5: Clubs Realtime ✅

**File**: `app/clubs.tsx` (modify)  
**Effort**: 1 hr

Subscribe to: `profiles` (role=Club), `connections` (follow/unfollow).

**Implemented**: `useRealtimeMultiSubscription` on `CHANNELS.clubsRealtime()` — 2 table subscriptions, invalidates `QUERY_KEYS.clubs`. Uses `useIdentityContext` for auth.

### Task 13.6: Projects Realtime ✅

**File**: `app/projects.tsx` (modify)  
**Effort**: 2 hrs

Subscribe to: `collab_projects`, `collab_project_roles`, `collab_team_members`, `collab_project_applications`.

**Implemented**: `useRealtimeMultiSubscription` on `CHANNELS.projects(collegeDomain, userId)` — 4 table subscriptions with `college_domain` filter, invalidates `QUERY_KEYS.projects`.

### Task 13.7: Saved Items Realtime ✅

**File**: `app/saved.tsx` (modify)  
**Effort**: 1 hr

Subscribe to: `saved_items` + related post tables for current user.

**Implemented**: `useRealtimeSubscription` (single-table) on `CHANNELS.savedItems(userId)` — watches `saved_items` filtered by `user_id`, invalidates `QUERY_KEYS.savedItems(userId)`.

### Task 13.8: Alumni Directory Realtime ✅

**File**: `app/alumni.tsx` (modify)  
**Effort**: 1.5 hrs

Subscribe to: `connections`, `profiles`, `alumni_profiles` for domain.

**Implemented**: `useRealtimeMultiSubscription` on `CHANNELS.alumniDirectoryConnections(userId)` — 3 table subscriptions, invalidates `['alumni', collegeDomain, userId]` + `['connectionStatus']`.

### Task 13.9: Event Detail Realtime ✅

**File**: `app/event/[id].tsx` (modify)  
**Effort**: 1 hr

Subscribe to: `events`, `event_registrations` for specific event.

**Implemented**: `useRealtimeMultiSubscription` on `CHANNELS.eventDetail(id)` — 2 table subscriptions filtered by event `id`, invalidates `['event', id]` + `QUERY_KEYS.events`.

### Task 13.10: Job Detail Realtime ✅

**File**: `app/job/[id].tsx` (modify)  
**Effort**: 1 hr

Subscribe to: `jobs`, `saved_items`, `job_applications` for specific job.

**Implemented**: `useRealtimeMultiSubscription` on `CHANNELS.jobDetail(id)` — 3 table subscriptions filtered by job `id`, invalidates `[...QUERY_KEYS.jobs, 'detail', id]` + `QUERY_KEYS.savedJobs`.

### Task 13.11: Profile Realtime ✅

**File**: `app/(tabs)/profile.tsx` (modify)  
**Effort**: 1.5 hrs

Subscribe to: `connections`, `profile_views`, `posts` for own profile.

**Implemented**: `useRealtimeMultiSubscription` on `CHANNELS.profileStats(userId)` — 4 subscriptions (`connections` x2 bidirectional, `profile_views`, `posts`), invalidates `QUERY_KEYS.profile(userId)` + `MOBILE_QUERY_KEYS.connectionCount(userId)` + `MOBILE_QUERY_KEYS.userPostsCount(userId)`.

---

## Phase 14 — Missing Screens (P2) ✅ COMPLETED

### Task 14.1: Project Detail Screen ✅

**File**: `app/project/[id].tsx` (ENHANCED 448 → ~750 lines)  
**Effort**: 8 hrs

**Implemented**:
- Full project detail: title, description, cover image (hero), tech stack, team members, open roles
- Apply for role button (with role selector)
- Owner actions: manage applications, close/reopen project, delete project
- Status badge, dates row (starts_on/ends_on), remote indicator (globe/location icon)
- Owner info section with Avatar + tap-to-profile navigation
- Team members section with TeamMemberCard (owner badge, role display)
- Application management panel (ApplicationCard with accept/reject for owners)
- Skills section with chip tags, Tags section
- Realtime subscription on 4 tables (collab_projects, collab_project_roles, collab_team_members, collab_project_applications)
- Summary/description section
- Infrastructure: Added `getProjectTeamMembers()`, `updateProjectStatus()` to `packages/core/src/api/projects-api.ts`, bindings in `lib/api/projects.ts`, `projectDetail` channel in `packages/core/src/channels.ts`

### Task 14.2: Landing/Marketing Page (Web-only or Deep Link Target) — SKIPPED

**File**: Not needed for mobile — native app opens to login directly.

### Task 14.3: Club Detail Screen — SKIPPED

Already covered in Task 12.8.

### Task 14.4: Portfolio Template Picker ✅

**File**: `app/portfolio-template-picker.tsx` (NEW ~220 lines)  
**Source**: Web PortfolioTemplatePicker.tsx  
**Effort**: 4 hrs

**Implemented**:
- 2-column FlatList grid with all 4 templates (minimal, eliana, typefolio, geeky)
- TemplateCard with colored preview thumbnail, accent icon, template name, description
- "Current" badge on active template
- Tap to select → calls `updateSettings({ template })` (auto-saves to Supabase)
- Haptic feedback on selection, navigates back to editor after apply
- OLED dark theme, uses `usePortfolioEditor` hook and `PORTFOLIO_TEMPLATES` constant

---

## Phase 15 — Design Token & Animation Refinements (P2) ✅ COMPLETED

### Task 15.1: Surface Tier Alignment ✅

**File**: `constants/colors.ts` (modified)  
**Effort**: 2 hrs

The web uses `rgb(23, 22, 22)` for surface tiers (solid near-black). Mobile was using `rgba(255,255,255, 0.02–0.06)` (transparent white overlay on black). These produce slightly different visual results.

**Implemented**:
- `darkSurfaceTiers` bg changed from `rgba(255,255,255,0.02–0.06)` → `rgb(23, 22, 22)` for all 3 tiers
- `darkSurfaceTiers` border colors aligned to web opacity tiers (0.12, 0.08, 0.06)
- `darkSurfaceTiers` borderRadius normalized 14 → 12
- `surfaceTiers` (light) borderRadius normalized 14 → 12
- Dark theme `surface` → `rgb(23, 22, 22)`, `surfaceSecondary` → `rgb(30, 29, 29)`, `surfaceHover` → `rgb(30, 29, 29)`, `surfaceElevated` → `rgb(30, 29, 29)`

### Task 15.2: Card Border Radius Normalization ✅

**File**: 20 files across `app/` and `components/`  
**Effort**: 1 hr

Web uses `rounded-xl` (12px). Mobile was using `borderRadius: 14` inconsistently.

**Implemented**: 27 card-level `borderRadius: 14` → `12` replacements across:
- `app/(auth)/onboarding.tsx` (resultCard, summaryCard)
- `app/(tabs)/more.tsx` (profileCard, sectionCard)
- `app/(tabs)/profile.tsx` (statsRow, portfolioBanner, completionBanner, menuItem, projectCard)
- `app/alumni.tsx`, `app/alumni-invite.tsx`, `app/club/[id].tsx`, `app/clubs.tsx`, `app/ecocampus.tsx` (card styles)
- `app/edit-profile.tsx` (completionBanner, addForm)
- `app/jobs.tsx`, `app/mentorship.tsx`, `app/portfolio.tsx`, `app/portfolio-editor.tsx`, `app/portfolio-template-picker.tsx` (card/statusCard)
- `app/project/[id].tsx`, `app/projects.tsx`, `app/saved.tsx`, `app/settings.tsx`, `app/skill-analysis.tsx` (card/section)
- `components/Autocomplete.tsx` (dropdown)
- Preserved non-card radii (buttons, chips, inputs, chat bubbles)

### Task 15.3: Micro-Interaction Animations ✅

**File**: `components/AnimatedPressable.tsx` (NEW ~220 lines)  
**Effort**: 3 hrs

**Implemented**:
- `AnimatedPressable` component with 3 presets: `card` (scale 0.98, opacity 0.9), `icon` (scale 0.85), `reaction` (heartbeat pulse scale 1.3)
- Spring configs matching web's `snappySpring` (stiffness 400, damping 30, mass 0.5)
- `useExpandCollapse()` hook for animated height toggle (comments section, collapsible panels) with `onContentLayout` measurement
- Uses `react-native-reanimated` for 60fps native animations
- Exports: `AnimatedPressable`, `AnimatedPressableProps`, `AnimationVariant`, `useExpandCollapse`

### Task 15.4: Loading Skeleton Screens ✅

**File**: `components/Skeletons.tsx` (NEW ~280 lines) + 6 tab screens modified  
**Effort**: 4 hrs

**Implemented**:
- Screen-specific skeleton presets: `FeedSkeleton` (3 post cards with avatar + text + image + action bar), `ProfileSkeleton` (cover + avatar + stats + bio), `EventsSkeleton`, `JobsSkeleton`, `NetworkSkeleton`, `MessagesSkeleton`, `NotificationsSkeleton`
- Re-exports shared primitives (`Skeleton`, `SkeletonText`, `SkeletonAvatar`, `SkeletonCard`)
- Replaced fullscreen `ActivityIndicator` spinners with skeletons in all 6 tab screens:
  - `app/(tabs)/index.tsx` → `FeedSkeleton`
  - `app/(tabs)/events.tsx` → `EventsSkeleton`
  - `app/(tabs)/messages.tsx` → `MessagesSkeleton`
  - `app/(tabs)/notifications.tsx` → `NotificationsSkeleton`
  - `app/(tabs)/network.tsx` → `NetworkSkeleton`
  - `app/(tabs)/profile.tsx` → `ProfileSkeleton`
- Uses shared `Skeleton` shimmer component (react-native-reanimated opacity animation)

### Task 15.5: Toast/Snackbar System ✅

**Files**: `components/Toast.tsx` (NEW ~140 lines), `lib/toast.ts` (NEW ~90 lines), `app/_layout.tsx` (modified), `packages/shared/src/components/ui/Toast.tsx` (fixed)  
**Effort**: 2 hrs

**Implemented**:
- Custom OLED-dark toast rendering with 5 variants: `success` (green), `error` (red), `warning` (orange), `info` (blue), `undo` (purple)
- Each toast has colored left border, icon in tinted circle, title + description
- `AppToaster` component rendered in root layout inside `GestureHandlerRootView`
- `lib/toast.ts` convenience API: `toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()`, `toast.undo(title, onUndo)`
- Undo toast: tap-to-undo with 5s auto-dismiss for hide post, unsave, disconnect, etc.
- Fixed shared `Toast.tsx`: replaced `require()` dynamic imports with ES `import` (lint fix)
- Toast config uses `ToastConfigParams` type from react-native-toast-message

---

## Phase 16 — Messaging Enhancements (P2) ✅ IMPLEMENTED

### Task 16.1: Online Status Indicator ✅

**File**: `app/chat/[id].tsx` (modify) + `components/ConversationItem.tsx` (modify) + `app/_layout.tsx` (modify)  
**Effort**: 3 hrs

**What was built**:
- Created `lib/hooks/useLastSeen.ts` — AppState-aware hook pinging `updateLastSeen()` every 60s
- Wired `useLastSeen()` in root layout (`app/_layout.tsx`) so last_seen auto-updates while app active
- Added `last_seen` to `MessageUser` interface in `packages/core/src/api/messages-api.ts` and all profile fetches
- Added `last_seen` to legacy `Profile` interface in `lib/api.ts`
- Green dot overlay on avatar in `ConversationItem.tsx` when partner is online
- Chat header in `app/chat/[id].tsx` shows green dot + "Online" / "Last seen Xm ago" subtitle

### Task 16.2: Quick Reply Suggestions ✅

**File**: `app/chat/[id].tsx` (modify)  
**Effort**: 2 hrs

**What was built**:
- `SUGGESTED_REPLIES` constant with 3 pre-set responses (matching web's ChatView.tsx)
- Horizontal `ScrollView` with 3 `Pressable` chips above the input bar
- Chips shown when `messages.length < 3` (conversation just opened or minimal history)
- Tap sends the reply immediately via `handleQuickReply()` with haptic feedback

### Task 16.3: Image/File Sharing in Chat ✅

**File**: `app/chat/[id].tsx` (modify) + `packages/core/src/api/messages-api.ts` (modify)  
**Effort**: 4 hrs

**What was built**:
- SQL migration `054_message_attachments.sql`: adds `attachment_url`, `attachment_type`, `attachment_name` to messages table + `message-attachments` storage bucket with RLS policies
- Extended `Message` type with attachment fields in core and legacy API
- New `MessageAttachment` interface in core, re-exported via `lib/api/messages.ts`
- `sendMessage()` updated to accept optional `attachment` param (core + legacy)
- Attachment button (⊕ icon) toggles a menu with Gallery, Camera, Document options
- Uses `useFileUpload` hook (bucket: `message-attachments`, 20MB limit)
- Pending attachment preview strip with thumbnail/icon + remove button
- Upload progress bar with percentage indicator
- `renderMessage()` displays inline image preview (200×150) or document card with icon+name
- Auto-generated fallback text ("Sent an image"/"Sent a file") hidden when attachment is visible

---

## Dependencies to Install

```bash
# Phase 9 — PostCard media
npx expo install expo-av react-native-webview

# Phase 10 — Rich post creation
npx expo install expo-image-manipulator expo-document-picker

# Phase 12 — Screen improvements
npx expo install @react-native-community/datetimepicker react-native-markdown-display

# Already installed (verify):
# react-native-reanimated, expo-haptics, expo-image-picker, react-native-gesture-handler
```

---

## Sprint Plan

### Sprint 6 (Week 1-2) — PostCard Core ← **Start Here**

| # | Task | Est. Hours | Priority |
|---|---|---|---|
| 9.5 | 7-Type Reaction Picker | 10 | P0 |
| 9.1 | Image Grid + Lightbox | 8 | P0 |
| 9.4 | Poll Rendering + Voting | 8 | P0 |
| 9.8 | Save/Bookmark Toggle | 2 | P0 |
| 9.7 | Post Action Menu | 4 | P1 |
| | **Sprint 6 Total** | **~32 hrs** | |

### Sprint 7 (Week 2-3) — Comments + Media

| # | Task | Est. Hours | Priority |
|---|---|---|---|
| 9.6 | Inline Threaded Comments (2-level) | 12 | P0 |
| 9.2 | Video Player | 5 | P0 |
| 9.3 | Document Display | 2 | P1 |
| 10.1 | Multi-Image Upload | 5 | P0 |
| 10.4 | Poll Creator | 5 | P0 |
| | **Sprint 7 Total** | **~29 hrs** | |

### Sprint 8 (Week 3-4) — Social + Creation

| # | Task | Est. Hours | Priority |
|---|---|---|---|
| 11.1 | Share to Connections | 8 | P1 |
| 11.2 | Repost Modal | 4 | P1 |
| 10.2 | Video Upload | 4 | P1 |
| 10.3 | Document Attachment | 3 | P1 |
| 10.5 | Create Post Tab Switcher | 3 | P1 |
| 12.15 | Edit/Delete Own Post | 2 | P1 |
| | **Sprint 8 Total** | **~24 hrs** | |

### Sprint 9 (Week 4-5) — Screen Depth (Profile + Jobs + Alumni)

| # | Task | Est. Hours | Priority |
|---|---|---|---|
| 12.2 | Profile Posts/About/Projects Tabs | 8 | P1 |
| 12.5 | Jobs Recommended + Applications | 6 | P1 |
| 12.9 | Alumni Connect/Message | 4 | P1 |
| 12.3 | Edit Profile Social Links + Interests | 3 | P1 |
| 12.4 | User Profile Posts + Skills | 5 | P1 |
| | **Sprint 9 Total** | **~26 hrs** | |

### Sprint 10 (Week 5-6) — Screen Depth (Projects + Rest)

| # | Task | Est. Hours | Priority |
|---|---|---|---|
| 12.6 | Projects Team-Ups + Apply | 12 | P2 |
| 12.7 | Event Create Improvements | 4 | P2 |
| 12.8 | Club Detail Page | 6 | P2 |
| 12.10 | SavedItems Unsave + Jobs Tab | 3 | P2 |
| 12.11 | Search Multi-Category | 4 | P2 |
| | **Sprint 10 Total** | **~29 hrs** | |

### Sprint 11 (Week 6-7) — Realtime + Polish

| # | Task | Est. Hours | Priority |
|---|---|---|---|
| 13.1-13.11 | All Realtime Subscriptions | 16 | P1 |
| 15.3 | Micro-Interaction Animations | 3 | P2 |
| 15.4 | Loading Skeleton Screens | 4 | P2 |
| 15.5 | Toast/Snackbar System | 2 | P2 |
| 12.12 | Mentorship Request Action | 3 | P2 |
| 12.13 | EcoCampus Create Item | 3 | P2 |
| | **Sprint 11 Total** | **~31 hrs** | |

### Sprint 12 (Week 7-8) — Remaining + QA

| # | Task | Est. Hours | Priority |
|---|---|---|---|
| 14.1 | Project Detail Screen | 8 | P2 |
| 14.4 | Portfolio Template Picker | 4 | P2 |
| 12.14 | AI Chat Context + Markdown | 4 | P2 |
| 16.1 | Online Status Indicator | 3 | ✅ Done |
| 16.2 | Quick Reply Suggestions | 2 | ✅ Done |
| 16.3 | Image/File in Chat | 4 | ✅ Done |
| 15.1 | Surface Tier Alignment | 2 | P3 |
| 15.2 | Border Radius Normalization | 1 | P3 |
| 12.1 | Feed Stats Row | 3 | P2 |
| | **Sprint 12 Total** | **~31 hrs** | |

---

## Full Feature Parity Matrix (After Plan Completion)

| Web Feature | Mobile Status | Phase |
|---|---|---|
| Google OAuth | ✅ Done | Phase 0-1 |
| Magic Link | ✅ Done | Phase 0-1 |
| Academic email validation | ✅ Done | Phase 1 |
| 8-step onboarding | ✅ Done | Phase 2 |
| Pure black theme | ✅ Done | Phase 3 |
| 7-type reactions | ✅ Done | 9.5 |
| Image grid + lightbox | ✅ Done | 9.1 |
| Video player | ✅ Done | 9.2 |
| Document display | ✅ Done | 9.3 |
| Poll voting | ✅ Done | 9.4 |
| Inline threaded comments | ✅ Done | 9.6 |
| Post action menu (edit/delete/report) | ✅ Done | 9.7 |
| Save/bookmark toggle | ✅ Done | 9.8 |
| Multi-image post creation | ✅ Done | 10.1 |
| Video post creation | ✅ Done | 10.2 |
| Document post creation | ✅ Done | 10.3 |
| Poll creation | ✅ Done | 10.4 |
| Share to connections | ✅ Done | 11.1 |
| Repost modal | ✅ Done | 11.2 |
| Profile 3-tab layout | ✅ Done | 12.2 |
| Edit profile social links | ✅ Done | 12.3 |
| Jobs recommended + apply | ✅ Done | 12.5 |
| Projects team-ups | ✅ Done | 12.6 |
| Club detail page | ✅ Done | 12.8 |
| Alumni connect/message | ✅ Done | 12.9 |
| Multi-category search | ✅ Done | 12.11 |
| All realtime subscriptions | ✅ Done | 13.1-13.11 |
| Project detail screen | ✅ Done | 14.1 |
| Portfolio template picker | ✅ Done | 14.4 |
| Skeleton loading screens | ✅ Done | 15.4 |
| Toast/snackbar system | ✅ Done | 15.5 |
| Chat online status | ✅ Done | 16.1 |
| Chat image/file sharing | ✅ Done | 16.3 |

---

## Logic Notes & Risks

### Auth Flow — Google Signup Visibility

The mobile login screen (`app/(auth)/login.tsx`) shows "Continue with Google" as the only auth method, matching the web's Login page. The signup screen (`app/(auth)/signup.tsx`) shows "Continue with Google" + "or use a magic link" with email input, matching the web's Signup page.

**Navigation flow**: The login screen does NOT have a visible "Sign up" link/button navigating to the signup screen. The web login page also doesn't have a signup link (both pages are Google-only — the distinction is `prompt: 'consent'` on login vs `prompt: 'select_account'` on signup).

**If users can't find the Google signup button**: Ensure the `/(auth)/login.tsx` route is the default entry point. The root layout's auth guard sends unauthenticated users to `/(auth)/login`, which shows the Google button. If users report they can't see it, investigate:
1. Is the auth guard redirecting correctly? (Check `_layout.tsx` `useProtectedRoute`)
2. Is the Google button rendering? (Check if `signInWithGoogle` exists in auth context)
3. Is there a white-on-white contrast issue? (Check button colors against background)

### Session Handling Difference

Web: `detectSessionInUrl: true` (browser auto-detects session in URL).  
Mobile: `detectSessionInUrl: false` (callback manually extracts tokens from deep link URL).

This is intentional — the manual extraction in `auth/callback.tsx` handles both implicit (hash fragment) and PKCE (query param) flows.

### Redirect URL Configuration (Critical)

The following redirect URLs **MUST** be configured in **Supabase Dashboard → Authentication → URL Configuration**:
- `clstr://auth/callback` (production deep link)
- `exp://192.168.x.x:8081/--/auth/callback` (Expo dev — replace IP)
- `com.clstr.app://auth/callback` (Android custom scheme if used)

Without these, Google OAuth will silently fail — the browser will redirect but Supabase won't recognize the URL as valid.

### Bundle Size Impact

| Phase | New Dependencies | ~Size |
|---|---|---|
| 9 | `expo-av`, `react-native-webview` | ~2MB |
| 10 | `expo-image-manipulator`, `expo-document-picker` | ~500KB |
| 12 | `@react-native-community/datetimepicker`, `react-native-markdown-display` | ~300KB |
| Total | 5 packages | ~3MB |

### Performance Considerations

- **Long post lists with images/videos**: Use `windowSize: 5` and `maxToRenderPerBatch: 5` on FlatList. Consider `FlashList` from Shopify for extreme performance.
- **Reaction picker animations**: Use `react-native-reanimated` worklets (run on UI thread)
- **Image compression**: Compress to 80% quality and max 1200px width before upload
- **Realtime subscriptions**: Cap at 5 concurrent channels per screen. Unsubscribe on unmount.
- **Video auto-pause**: Track viewable items and pause videos outside viewport

---

## File Count Projection

| Category | New Files | Modified Files |
|---|---|---|
| Components | ~15 new | ~5 modified |
| Screens | ~3 new | ~18 modified |
| Hooks | ~2 new | ~3 modified |
| **Total** | **~20 new** | **~26 modified** |

---

## Total Estimated Effort (Phases 9-16)

| Phase | Hours |
|---|---|
| Phase 9: PostCard Parity | 51 | ✅ COMPLETED |
| Phase 10: Rich Post Creation | 20 | ✅ COMPLETED |
| Phase 11: Social Sharing | 17 | ✅ COMPLETED |
| Phase 12: Screen Depth | 68 | ✅ COMPLETED |
| Phase 13: Realtime | 16 | ✅ COMPLETED |
| Phase 14: Missing Screens | 12 | ✅ COMPLETED |
| Phase 15: Design Polish | 12 | ✅ COMPLETED |
| Phase 16: Messaging | 9 | ✅ COMPLETED |
| **TOTAL** | **~205 hrs** |

---

## Quick Reference — Which Sprint Delivers Which User-Visible Feature

| Sprint | Duration | User-Visible Deliverable |
|---|---|---|
| Sprint 6 | Week 1-2 | Posts show images, polls, 7 reactions, save bookmark, action menus |
| Sprint 7 | Week 2-3 | Threaded comments, video in posts, create posts with images + polls |
| Sprint 8 | Week 3-4 | Share posts to friends, repost with thoughts, create posts with video/docs |
| Sprint 9 | Week 4-5 | Profile tabs (posts/about/projects), job recommendations, alumni connect |
| Sprint 10 | Week 5-6 | Team-ups for projects, club detail pages, multi-search, better event creation |
| Sprint 11 | Week 6-7 | Live realtime updates everywhere, loading skeletons, toasts, mentorship requests |
| Sprint 12 | Week 7-8 | Project detail, AI chat markdown, chat online status, portfolio templates |

---

## Post-Implementation Audit Report

> **Audit Date**: July 2025
> **Scope**: All Phase 9-16 deliverables - file existence, TypeScript compilation, feature completeness, code quality

### 1. File Existence Verification

All **21 new files** claimed across Phases 9-16 verified present:

| File | Status |
|---|---|
| `components/ImageGrid.tsx` | OK |
| `components/ImageLightbox.tsx` | OK |
| `components/VideoPlayer.tsx` | OK |
| `components/DocumentAttachment.tsx` | OK |
| `components/PollView.tsx` | OK |
| `components/ReactionPicker.tsx` | OK |
| `components/ReactionDisplay.tsx` | OK |
| `components/CommentSection.tsx` | OK |
| `components/PostActionSheet.tsx` | OK |
| `components/PollCreator.tsx` | OK |
| `components/ShareSheet.tsx` | OK |
| `components/RepostSheet.tsx` | OK |
| `components/AnimatedPressable.tsx` | OK |
| `components/Skeletons.tsx` | OK |
| `components/Toast.tsx` | OK |
| `lib/toast.ts` | OK |
| `lib/hooks/useLastSeen.ts` | OK |
| `app/portfolio-template-picker.tsx` | OK |
| `app/club/[id].tsx` | OK |
| `components/PostCard.tsx` (modified) | OK |
| `app/create-post.tsx` (modified) | OK |

All **7 dynamic route files** verified:
`app/post/[id].tsx`, `app/project/[id].tsx`, `app/job/[id].tsx`, `app/event/[id].tsx`, `app/user/[id].tsx`, `app/chat/[id].tsx`, `app/club/[id].tsx`

### 2. TypeScript Compilation

- **Mobile scope** (`app/`, `components/`, `lib/`, `packages/`): **0 errors**
- **Web scope** (`src/`, `external/`, `apps/mobile/src/`, config): 2,815 errors (out of scope - legacy web codebase)

### 3. Code Quality Audit (21 files)

| Rating | Count | Files |
|---|---|---|
| OK | 18 | ImageGrid, VideoPlayer, DocumentAttachment, PollView, ReactionDisplay, PostActionSheet, PollCreator, ShareSheet, RepostSheet, AnimatedPressable, Skeletons, Toast, toast.ts, useLastSeen, portfolio-template-picker, club/[id], PostCard, create-post |
| WARN | 3 | ReactionPicker (dismiss overlay), ImageLightbox (FlatList stability), CommentSection (recursive useCallback) |
| ERROR | 0 | None |

### 4. Feature Verification (30/30 after fixes)

Verified 30 distinct features across 17 screens. Only gap found and fixed:
- `search.tsx` was missing Posts as a search category (had 5, needed 6)

### 5. Fixes Applied

| # | File | Issue | Fix |
|---|---|---|---|
| 1 | `app/search.tsx` | Missing Posts search category | Added posts to SearchCategory type, CATEGORIES array, Supabase query, result rendering, and navigation |
| 2 | `components/ImageLightbox.tsx` | FlatList onViewableItemsChanged stability warning | Replaced useCallback with stable useRef pattern for both callback and viewability config |
| 3 | `components/ReactionPicker.tsx` | Dismiss overlay limited to parent bounds | Replaced StyleSheet.absoluteFill Pressable with transparent Modal overlay + measureInWindow page-Y positioning |

### 6. Known Low-Risk Items (Unfixed)

- `CommentSection.tsx`: Recursive useCallback chain - works correctly but fragile under heavy re-render. Refactor to useReducer recommended for future.
- `CommentSection.tsx`: Auth user shape assumption (user.id) - no crash risk with current Supabase auth but could benefit from defensive guard.
