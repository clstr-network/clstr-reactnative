# Clstr Mobile — Fix Implementation Plan v2

> **Date**: 2026-02-22
> **Scope**: Post-audit fix plan for all incomplete features, broken flows, dead buttons, mock-data leaks, and missing web-parity items discovered after completing the original IMPLEMENTATION_PLAN.md (Phases 0–9).
>
> **Principle**: _Same brain, different body._ Logic must be identical to web. UX must be native.

---

## Executive Summary

The original 10-phase implementation plan is marked ✅ DONE, but a static code audit reveals **21+ significant issues** where screens were scaffolded but critical wiring was missed. Four active screens still import from the deprecated mock layer (`lib/storage.ts`), meaning **posts created on mobile go to AsyncStorage — not Supabase**. Seven profile menu buttons are dead (`onPress: () => {}`). The Message button has no connection gate. No Edit Profile, Avatar Upload, or Feed Pagination exists. An entire legacy `app/(main)/` directory with 10+ mock-data screens is still shipping.

This plan is organized into **12 fix phases (F1–F12)**, ordered by severity. Each phase lists:
- **Problem** — what is broken / missing
- **Root Cause** — why it happened
- **Files to Change** — exact paths
- **Implementation Steps** — specific code changes
- **Verification** — how to confirm the fix
- **Deliverables** — what's done when the phase is complete

---

## Issue Registry (Quick Reference)

| # | Issue | Severity | Phase | File(s) | Status |
|---|-------|----------|-------|---------|--------|
| 1 | `create-post.tsx` uses mock `addPost` from `lib/storage` | 🔴 Critical | F1 | `app/create-post.tsx` | ✅ Fixed |
| 2 | `post-actions.tsx` uses mock `toggleSavePost` from `lib/storage` | 🔴 Critical | F1 | `app/post-actions.tsx` | ✅ Fixed |
| 3 | `post-actions.tsx` Share/Copy/Report do nothing | 🔴 Critical | F2 | `app/post-actions.tsx` | ✅ Fixed |
| 4 | Duplicate legacy `app/notifications.tsx` uses mock storage | 🟠 High | F3 | `app/notifications.tsx` | ✅ Fixed |
| 5 | Duplicate legacy `app/onboarding.tsx` uses mock storage | 🟠 High | F3 | `app/onboarding.tsx` | ✅ Fixed |
| 6 | Duplicate legacy `app/new-post.tsx` uses deprecated `data-context` | 🟠 High | F3 | `app/new-post.tsx` | ✅ Fixed |
| 7 | Entire `app/(main)/` directory (10+ mock screens) still ships | 🟠 High | F3 | `app/(main)/**` | ✅ Fixed |
| 8 | `app/(tabs)/more.tsx` imports `CURRENT_USER` from mock-data | 🟠 High | F3 | `app/(tabs)/more.tsx` | ✅ Fixed |
| 9 | 7 profile menu items have empty `onPress: () => {}` | 🔴 Critical | F4 | `app/(tabs)/profile.tsx` | ✅ Fixed |
| 10 | No Edit Profile screen exists | 🔴 Critical | F5 | NEW: `app/edit-profile.tsx` | ✅ Fixed |
| 11 | No avatar upload (no `expo-image-picker`) | 🟠 High | F5 | NEW: `app/edit-profile.tsx` | ✅ Fixed |
| 12 | No Education/Experience/Skills CRUD on mobile | 🟠 High | F5 | NEW: `app/edit-profile.tsx` | ✅ Fixed |
| 13 | No Profile Completion banner | 🟡 Medium | F5 | `app/(tabs)/profile.tsx` | ✅ Fixed |
| 14 | Message button has NO connection gate | 🔴 Critical | F6 | `app/user/[id].tsx` | ✅ Fixed |
| 15 | Chat screen has NO connection eligibility check | 🔴 Critical | F6 | `app/chat/[id].tsx` | ✅ Fixed |
| 16 | No "New Conversation" / compose button in Messages tab | 🟠 High | F6 | `app/(tabs)/messages.tsx` | ✅ Fixed |
| 17 | Feed uses `useQuery` not `useInfiniteQuery` — no pagination | 🟠 High | F7 | `app/(tabs)/index.tsx` | ✅ Fixed |
| 18 | Create Event button is dead (`/* TODO */`) | 🟠 High | F8 | `app/(tabs)/events.tsx` | ⬜ Pending |
| 19 | No `createEvent` function in `@clstr/core` or `lib/api/events.ts` | 🟠 High | F8 | `lib/api/events.ts` | ⬜ Pending |
| 20 | Profile stats use `profile.connections?.length` instead of DB count | 🟡 Medium | F9 | `app/(tabs)/profile.tsx`, `app/user/[id].tsx` | ⬜ Pending |
| 21 | Hardcoded query keys (`['connectionStatus', id]`, etc.) | 🟡 Medium | F9 | `app/user/[id].tsx` | ⬜ Pending |
| 22 | Post share/repost not wired in Feed | 🟡 Medium | F10 | `app/(tabs)/index.tsx` | ⬜ Pending |
| 23 | `lib/api/mentorship.ts` uses raw Supabase (no `@clstr/core`) | 🟡 Medium | F11 | `lib/api/mentorship.ts` | ⬜ Deferred |
| 24 | `lib/api/alumni.ts` uses raw Supabase RPC | 🟡 Medium | F11 | `lib/api/alumni.ts` | ⬜ Deferred |
| 25 | No block-connection UI | 🔵 Low | F12 | NEW | ⬜ Pending |
| 26 | No online/last-seen status | 🔵 Low | F12 | Future | ⬜ Pending |
| 27 | College-domain feed isolation not verified on mobile | 🟡 Medium | F12 | `app/(tabs)/index.tsx` | ⬜ Pending |

---

## Phase F1 — Fix Create Post & Save Post (Mock → Real Supabase) ✅ DONE

**Priority**: 🔴 CRITICAL — Posts created on mobile currently go to AsyncStorage, not the database.
**Status**: ✅ COMPLETED (2026-02-22)

### Resolution Summary

Both files were already migrated from mock `@/lib/storage` to real Supabase APIs in a prior pass.
Final fix applied: `post-actions.tsx` query key updated from hardcoded `['saved-items']` to `QUERY_KEYS.savedItems(user.id)` for proper user-scoped cache invalidation (matching `app/saved.tsx`).

### Problem

`app/create-post.tsx` (line 13) imports `addPost` from `@/lib/storage` (the deprecated AsyncStorage mock layer). Posts created by users are written to local AsyncStorage and **never reach Supabase**. Query key is hardcoded as `['posts']` instead of `QUERY_KEYS.feed`.

`app/post-actions.tsx` (line 8) imports `toggleSavePost` from `@/lib/storage`. Save/unsave operations go to AsyncStorage instead of the real `toggleSavePost` from `lib/api/social.ts`.

### Root Cause

Phase 2 scaffolded these screens before the `lib/api/social.ts` adapter was completed. The wiring was never updated.

### Files to Change

- `app/create-post.tsx`
- `app/post-actions.tsx`

### Implementation Steps

#### F1.1 — Fix `app/create-post.tsx`

1. **Remove** import: `import { addPost, type Post } from '@/lib/storage';`
2. **Add** import: `import { createPost, type CreatePostPayload } from '@/lib/api/social';`
3. **Add** import: `import { QUERY_KEYS } from '@/lib/query-keys';`
4. **Replace** the `CATEGORIES` type to use `string` instead of `Post['category']` (the `@clstr/core` `CreatePostPayload` uses a different category type).
5. **Rewrite** `handlePost()`:
   ```tsx
   const handlePost = async () => {
     if (!content.trim() || !user) return;
     setPosting(true);
     Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
     try {
       await createPost({
         content: content.trim(),
         category,
       });
       queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
       router.back();
     } catch (e) {
       Alert.alert('Error', 'Failed to create post. Please try again.');
     } finally {
       setPosting(false);
     }
   };
   ```
6. **Key change**: Use `invalidateQueries` (server refetch) instead of `setQueryData` (local mock overwrite).

#### F1.2 — Fix `app/post-actions.tsx`

1. **Remove** import: `import { toggleSavePost } from '@/lib/storage';`
2. **Add** imports:
   ```tsx
   import { toggleSavePost, reportPost } from '@/lib/api/social';
   import { QUERY_KEYS } from '@/lib/query-keys';
   ```
3. **Rewrite** `handleSave()`:
   ```tsx
   const handleSave = async () => {
     if (!id) return;
     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
     try {
       await toggleSavePost(id);
       queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
       queryClient.invalidateQueries({ queryKey: QUERY_KEYS.savedItems });
       router.back();
     } catch (e) {
       Alert.alert('Error', 'Failed to save post.');
     }
   };
   ```
4. Replace hardcoded `['posts']` → `QUERY_KEYS.feed`.

### Verification

- [x] Create a post → verify it appears in feed (not just local) — `createPost` from `@/lib/api/social` calls Supabase
- [x] Save a post → verify it persists across app restart — `toggleSavePost` from `@/lib/api/social` calls Supabase
- [x] Confirm `lib/storage.ts` is no longer imported by `create-post.tsx` or `post-actions.tsx`
- [x] Query key `QUERY_KEYS.savedItems(user.id)` used instead of hardcoded `['saved-items']`

### Deliverables

- ✅ `create-post.tsx` creates posts via real Supabase API (`createPost` from `@/lib/api/social`)
- ✅ `post-actions.tsx` saves/unsaves via real Supabase API (`toggleSavePost` from `@/lib/api/social`)
- ✅ All query keys use `QUERY_KEYS.*` constants
- ✅ `useAuth()` added to `post-actions.tsx` for user-scoped cache key

---

## Phase F2 — Fix Post Actions (Share, Copy Link, Report) ✅ DONE

**Priority**: 🔴 CRITICAL — Three out of four post actions do nothing.
**Status**: ✅ COMPLETED (2026-02-22)

### Problem

In `app/post-actions.tsx`:
- **Share Post** → calls `router.back()` (does nothing)
- **Copy Link** → calls `router.back()` (does nothing)
- **Report Post** → shows a local `Alert` with no backend call

### Root Cause

Phase 2 scaffolded the UI but never wired the action handlers.

### Files to Change

- `app/post-actions.tsx`

### Implementation Steps

#### F2.1 — Implement Share Post

```tsx
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

const postUrl = `https://clstr.network/post/${id}`;

const handleShare = async () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  try {
    await Share.share({
      message: `Check out this post on Clstr: ${postUrl}`,
      url: postUrl, // iOS only
    });
  } catch (e) {
    // User cancelled — no action needed
  }
  router.back();
};
```

#### F2.2 — Implement Copy Link

```tsx
const handleCopyLink = async () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  await Clipboard.setStringAsync(postUrl);
  Alert.alert('Copied', 'Post link copied to clipboard.');
  router.back();
};
```

#### F2.3 — Implement Report Post (Backend)

```tsx
const handleReport = async () => {
  if (!id) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  try {
    await reportPost(id);
    Alert.alert('Reported', 'Post has been reported. Thank you for helping keep the community safe.');
  } catch (e) {
    Alert.alert('Error', 'Failed to report post. Please try again.');
  }
  router.back();
};
```

#### F2.4 — Wire all actions

Update the `actions` array to use the new handlers:
```tsx
const actions = [
  { icon: saved ? 'bookmark' : 'bookmark-outline', label: saved ? 'Unsave Post' : 'Save Post', color: colors.warning, onPress: handleSave },
  { icon: 'share-outline', label: 'Share Post', color: colors.accent, onPress: handleShare },
  { icon: 'copy-outline', label: 'Copy Link', color: colors.textSecondary, onPress: handleCopyLink },
  { icon: 'flag-outline', label: 'Report Post', color: colors.danger, onPress: handleReport },
];
```

### Dependencies

- `expo-clipboard` ✅ Already installed: `expo-clipboard@~8.0.8` in `package.json`

### Verification

- [x] Share Post → opens native share sheet (`Share.share()` with post URL)
- [x] Copy Link → copies `https://clstr.network/post/<id>` to clipboard via `expo-clipboard`
- [x] Report Post → calls `reportPost()` from `lib/api/social.ts` with platform-specific UI (iOS: `Alert.prompt`, Android: preset reason)
- [x] All 4 action buttons are functional and wired in the `actions` array

### Resolution Summary

All four actions were already fully implemented in `post-actions.tsx`:
- **Save/Unsave**: Uses `toggleSavePost` from `@/lib/api/social` with proper cache invalidation
- **Share**: Uses React Native `Share.share()` API with post URL
- **Copy Link**: Uses `expo-clipboard` `setStringAsync()` with confirmation alert
- **Report**: Uses `reportPost` from `@/lib/api/social` with platform-aware UI (iOS prompt / Android preset reason)

### Deliverables

- ✅ All 4 post action buttons are functional
- ✅ Uses native `Share` API + `expo-clipboard`
- ✅ Report calls real backend via `reportPost(id, reason)`

---

## Phase F3 — Delete Legacy / Duplicate Screens ✅ DONE

**Priority**: 🟠 HIGH — Duplicate screens confuse routing and import mock data.
**Status**: ✅ COMPLETED (2026-02-22)

### Problem

Six files in `app/` are duplicates of real screens and still import from `lib/storage` or `lib/mock-data`:

| Legacy File | Real Replacement | Import Source |
|-------------|-----------------|---------------|
| `app/notifications.tsx` | `app/(tabs)/notifications.tsx` | `lib/storage` |
| `app/onboarding.tsx` | `app/(auth)/onboarding.tsx` | `lib/storage` |
| `app/new-post.tsx` | `app/create-post.tsx` | `lib/data-context` |

Additionally, the entire `app/(main)/` directory contains 10+ fully mock-data-based screens that are never navigated to:

| Legacy Screen | Imports From |
|---------------|-------------|
| `app/(main)/(tabs)/index.tsx` | `lib/mock-data` |
| `app/(main)/(tabs)/messages.tsx` | `lib/mock-data` |
| `app/(main)/(tabs)/network.tsx` | `lib/mock-data` |
| `app/(main)/(tabs)/events.tsx` | `lib/mock-data` |
| `app/(main)/(tabs)/notifications.tsx` | `lib/mock-data` |
| `app/(main)/(tabs)/profile.tsx` | (mock patterns) |
| `app/(main)/chat.tsx` | `lib/mock-data` |
| `app/(main)/search.tsx` | `lib/mock-data` |
| `app/(main)/settings.tsx` | (mock patterns) |
| `app/(main)/post-detail.tsx` | (mock patterns) |
| `app/(main)/_layout.tsx` | (navigation layout) |

And `app/(tabs)/more.tsx` imports `CURRENT_USER` from `@/lib/mock-data`.

### Files to Delete

```
app/notifications.tsx          ← duplicate of app/(tabs)/notifications.tsx
app/onboarding.tsx             ← duplicate of app/(auth)/onboarding.tsx
app/new-post.tsx               ← duplicate of app/create-post.tsx
app/(main)/                    ← entire directory (10+ mock files)
```

### Files to Fix

- `app/(tabs)/more.tsx` — Remove `CURRENT_USER` import from `@/lib/mock-data` and replace with `useAuth()` user data or `useQuery` profile data.

### Implementation Steps

#### F3.1 — Delete All Legacy Files

```bash
rm app/notifications.tsx
rm app/onboarding.tsx
rm app/new-post.tsx
rm -rf app/(main)/
```

#### F3.2 — Fix `app/(tabs)/more.tsx`

1. Remove: `import { CURRENT_USER } from '@/lib/mock-data';`
2. Add: `import { useAuth } from '@/lib/auth-context';`
3. Replace all `CURRENT_USER.*` references with data from `useAuth()` or a profile query.

#### F3.3 — Verify No Remaining Mock Imports

Run: `grep -r "from '@/lib/storage'" app/ && grep -r "from '@/lib/mock-data'" app/ && grep -r "from '@/lib/data-context'" app/`

Expected: **Zero matches.**

### Verification

- [x] `grep -r "lib/storage\|lib/mock-data\|lib/data-context" app/` returns zero results
- [x] App builds without errors (`npx expo start`)
- [x] No broken navigation routes (Expo Router auto-registers files — removing files removes routes)

### Resolution Summary

All legacy/duplicate files were deleted and mock imports fully removed:
- **Deleted**: `app/notifications.tsx` (duplicate of `app/(tabs)/notifications.tsx`, imported from `lib/storage`)
- **Deleted**: `app/onboarding.tsx` (duplicate of `app/(auth)/onboarding.tsx`, imported from `lib/storage`)
- **Deleted**: `app/new-post.tsx` (duplicate of `app/create-post.tsx`, imported from `lib/data-context`)
- **Deleted**: Entire `app/(main)/` directory (10+ mock-data screens: index, messages, network, events, notifications, profile, chat, search, settings, post-detail, _layout)
- **Fixed**: `app/(tabs)/more.tsx` — replaced `CURRENT_USER` from `@/lib/mock-data` with real auth data via `useAuth()` + `useQuery(getProfileById)`. Also wired all menu items with proper `router.push()` navigation and sign-out handler. Theme tokens updated from legacy `Colors.colors` (`card`/`cardBorder`/`backgroundTertiary`) to `useThemeColors()` equivalents (`surface`/`surfaceBorder`/`surfaceSecondary`).

### Deliverables

- All mock-data imports removed from `app/`
- `app/(main)/` directory deleted
- `more.tsx` uses real auth data

---

## Phase F4 — Wire Profile Menu Buttons ✅ DONE

**Priority**: 🔴 CRITICAL — 7 menu items with empty `onPress: () => {}` handlers.
**Status**: ✅ COMPLETED (2026-02-22)

### Problem

In `app/(tabs)/profile.tsx` lines 76-83, seven menu items have dead handlers:

```tsx
{ label: 'Edit Profile', onPress: () => {} }     // ← dead
{ label: 'Saved Posts', onPress: () => {} }       // ← dead
{ label: 'Jobs & Careers', onPress: () => {} }    // ← dead
{ label: 'Skill Analysis', onPress: () => {} }    // ← dead
{ label: 'Mentorship', onPress: () => {} }        // ← dead
{ label: 'EcoCampus', onPress: () => {} }         // ← dead
{ label: 'Help & Support', onPress: () => {} }    // ← dead
```

The Phase 9 destination screens exist (`app/saved.tsx`, `app/jobs.tsx`, `app/skill-analysis.tsx`, `app/mentorship.tsx`, `app/ecocampus.tsx`) but are not wired.

### Files to Change

- `app/(tabs)/profile.tsx`

### Implementation Steps

Replace the `MENU_ITEMS` array:

```tsx
const MENU_ITEMS = [
  {
    icon: 'person-outline' as const,
    label: 'Edit Profile',
    color: colors.tint,
    onPress: () => router.push('/edit-profile'),
    visible: true,
  },
  {
    icon: 'bookmark-outline' as const,
    label: 'Saved Posts',
    color: colors.warning,
    onPress: () => router.push('/saved'),
    visible: canSaveBookmarks,
  },
  ...(canBrowseJobs ? [{
    icon: 'briefcase-outline' as const,
    label: 'Jobs & Careers',
    color: colors.tint,
    onPress: () => router.push('/jobs'),
    visible: true,
  }] : []),
  ...(canAccessSkillAnalysis ? [{
    icon: 'analytics-outline' as const,
    label: 'Skill Analysis',
    color: colors.success,
    onPress: () => router.push('/skill-analysis'),
    visible: true,
  }] : []),
  ...(canOfferMentorship ? [{
    icon: 'people-outline' as const,
    label: 'Mentorship',
    color: colors.warning,
    onPress: () => router.push('/mentorship'),
    visible: true,
  }] : []),
  ...(canBrowseEcoCampus ? [{
    icon: 'storefront-outline' as const,
    label: 'EcoCampus',
    color: colors.tint,
    onPress: () => router.push('/ecocampus'),
    visible: true,
  }] : []),
  {
    icon: 'settings-outline' as const,
    label: 'Settings',
    color: colors.textSecondary,
    onPress: () => router.push('/settings'),
    visible: true,
  },
  {
    icon: 'help-circle-outline' as const,
    label: 'Help & Support',
    color: colors.textSecondary,
    onPress: () => router.push('/settings'), // Links to settings support section
    visible: true,
  },
].filter(item => item.visible);
```

### Verification

- [x] Tap "Edit Profile" → navigates to `/edit-profile` (created in F5)
- [x] Tap "Saved Posts" → navigates to `/saved`
- [x] Tap "Jobs & Careers" → navigates to `/jobs`
- [x] Tap "Skill Analysis" → navigates to `/skill-analysis`
- [x] Tap "Mentorship" → navigates to `/mentorship`
- [x] Tap "EcoCampus" → navigates to `/ecocampus`
- [x] Tap "Help & Support" → navigates appropriately

### Resolution Summary

All 7 dead `onPress: () => {}` handlers in `app/(tabs)/profile.tsx` `MENU_ITEMS` array replaced with proper `router.push()` navigation calls:
- **Edit Profile** → `router.push('/edit-profile')` (screen to be created in F5)
- **Saved Posts** → `router.push('/saved')` (screen exists)
- **Jobs & Careers** → `router.push('/jobs')` (screen exists, role-gated via `canBrowseJobs`)
- **Skill Analysis** → `router.push('/skill-analysis')` (screen exists, role-gated via `canAccessSkillAnalysis`)
- **Mentorship** → `router.push('/mentorship')` (screen exists, role-gated via `canOfferMentorship`)
- **EcoCampus** → `router.push('/ecocampus')` (screen exists, role-gated via `canBrowseEcoCampus`)
- **Help & Support** → `router.push('/settings')` (links to settings/support section)
- **Settings** was already wired — no change needed.

### Deliverables

- All 7 profile menu items navigate to their target screens
- Zero empty `onPress: () => {}` handlers remain

---

## Phase F5 — Edit Profile Screen + Avatar Upload + Profile Completion ✅ DONE

**Priority**: 🔴 CRITICAL — No way to edit profile on mobile.
**Status**: ✅ COMPLETED (2026-02-22)

### Resolution Summary

Created `app/edit-profile.tsx` (~550 lines) with full profile editing:
- **Avatar upload** via `expo-image-picker` → `uploadProfileAvatar()` with camera icon overlay
- **Form fields**: Full Name, Headline, Bio, Major, University, Location with `updateProfileRecord()`
- **Education CRUD**: Inline add form (school, degree, dates) + swipe-to-delete
- **Experience CRUD**: Inline add form (title, company, dates) + swipe-to-delete
- **Skills CRUD**: Inline add form with level selector chips (Beginner/Intermediate/Expert/Professional) + delete
- **Profile completion**: Progress bar at top using `calculateProfileCompletion()` + missing fields hint via `getMissingProfileFields()`
- **Profile completion banner** added to `app/(tabs)/profile.tsx` — shows when < 100%, navigates to edit-profile on tap

### Problem

1. No `app/edit-profile.tsx` screen exists.
2. No avatar upload — `expo-image-picker` is not used anywhere.
3. No Education / Experience / Skills CRUD screens on mobile.
4. No profile completion banner.

The API layer is **fully ready** — `lib/api/profile.ts` exports:
- `updateProfileRecord`, `uploadProfileAvatar`, `removeProfileAvatar`
- `addExperience`, `updateExperience`, `deleteExperience`, `getExperiences`
- `addEducation`, `updateEducation`, `deleteEducation`, `getEducation`
- `updateSkills`, `getSkills`, `addSkill`, `updateSkill`, `deleteSkill`
- `calculateProfileCompletion`, `getMissingProfileFields`

### Files to Create

- `app/edit-profile.tsx` — Main edit profile screen
- `app/edit-education.tsx` — Education CRUD (optional — can be inline)
- `app/edit-experience.tsx` — Experience CRUD (optional — can be inline)

### Dependencies to Install

```bash
npx expo install expo-image-picker
```

### Implementation Steps

#### F5.1 — Create `app/edit-profile.tsx`

Structure:
```
┌─────────────────────────────┐
│ ← Back          Save        │
├─────────────────────────────┤
│        [Avatar + Change]     │
│  Full Name: ___________     │
│  Headline:  ___________     │
│  Bio:       ___________     │
│  Major:     ___________     │
│  University: __________     │
│  ─── Education ────────     │
│  [+ Add Education]          │
│  ─── Experience ───────     │
│  [+ Add Experience]         │
│  ─── Skills ───────────     │
│  [+ Add Skill]              │
│  ─ Profile Completion: 72% ─│
└─────────────────────────────┘
```

Key implementation:
```tsx
import * as ImagePicker from 'expo-image-picker';
import {
  getProfileById,
  updateProfileRecord,
  uploadProfileAvatar,
  calculateProfileCompletion,
  getMissingProfileFields,
  getExperiences,
  addExperience,
  deleteExperience,
  getEducation,
  addEducation,
  deleteEducation,
  getSkills,
  addSkill,
  deleteSkill,
} from '@/lib/api/profile';

// Avatar picker
const pickAvatar = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (!result.canceled && result.assets[0]) {
    const file = {
      uri: result.assets[0].uri,
      type: result.assets[0].mimeType ?? 'image/jpeg',
      name: `avatar-${Date.now()}.jpg`,
    };
    await uploadProfileAvatar(user!.id, file);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile(user!.id) });
  }
};
```

#### F5.2 — Add Profile Completion Banner to `app/(tabs)/profile.tsx`

```tsx
import { calculateProfileCompletion, getMissingProfileFields } from '@/lib/api/profile';

// Inside the render, above the menu section:
const completionPct = calculateProfileCompletion(profile);
const missingFields = getMissingProfileFields(profile);

{completionPct < 100 && (
  <Pressable
    onPress={() => router.push('/edit-profile')}
    style={[styles.completionBanner, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '30' }]}
  >
    <View style={styles.completionRow}>
      <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
      <Text style={[styles.completionText, { color: colors.text }]}>
        Profile {completionPct}% complete
      </Text>
    </View>
    <Text style={[styles.completionHint, { color: colors.textSecondary }]}>
      Add {missingFields.slice(0, 2).join(', ')} to stand out
    </Text>
  </Pressable>
)}
```

### Verification

- [x] Navigate to Edit Profile → see pre-filled form with current profile data
- [x] Change avatar → image picker opens → avatar updates in DB
- [x] Edit name, headline, bio → save → profile screen reflects changes
- [x] Add/remove education, experience, skills → persists to DB
- [x] Profile completion banner shows on profile screen when < 100%
- [x] Tapping banner navigates to edit-profile

### Deliverables

- Full Edit Profile screen with avatar upload
- Education / Experience / Skills CRUD
- Profile completion banner on profile tab

---

## Phase F6 — Connection-Gated Messaging ✅ DONE

**Priority**: 🔴 CRITICAL — Anyone can message anyone without being connected.
**Status**: ✅ COMPLETED (2026-02-22)

### Resolution Summary

- **`app/user/[id].tsx`**: Message button now checks `isConnected` before navigating; disabled with `opacity: 0.5` when not connected, shows Alert on tap.
- **`app/chat/[id].tsx`**: Added `useQuery` for `checkConnectionStatus` — non-connected users see a "Connection Required" blocked UI with lock icon and back button.
- **`app/(tabs)/messages.tsx`**: Added compose button (Ionicons `create-outline`) in header, navigates to `/new-conversation`.
- **`app/new-conversation.tsx`** (NEW): Shows searchable FlatList of user's connections (from `getConnections()`); tapping a connection navigates to `/chat/[id]`.

### Problem

1. `app/user/[id].tsx` (line 196): Message button navigates directly to `/chat/[id]` **without checking** `connectionStatus === 'connected'`. Web enforces this gate.
2. `app/chat/[id].tsx`: No eligibility check — any user can load a chat with any other user.
3. `app/(tabs)/messages.tsx`: No "New Conversation" / compose button. Users cannot start a new chat from their connections list.

### Files to Change

- `app/user/[id].tsx`
- `app/chat/[id].tsx`
- `app/(tabs)/messages.tsx`

### Implementation Steps

#### F6.1 — Gate the Message Button in `app/user/[id].tsx`

Replace the current Message button (lines 196-199):
```tsx
<Pressable
  onPress={() => {
    if (isConnected) {
      router.push({ pathname: '/chat/[id]', params: { id: id! } });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Not Connected', 'You need to connect with this user before sending a message.');
    }
  }}
  disabled={!isConnected}
  style={({ pressed }) => [
    styles.msgBtn,
    { borderColor: isConnected ? colors.border : colors.border + '40' },
    !isConnected && { opacity: 0.5 },
    pressed && { opacity: 0.85 },
  ]}
>
  <Ionicons name="chatbubble-outline" size={18} color={isConnected ? colors.text : colors.textTertiary} />
  <Text style={[styles.msgBtnText, { color: isConnected ? colors.text : colors.textTertiary }]}>Message</Text>
</Pressable>
```

#### F6.2 — Add Connection Check in `app/chat/[id].tsx`

At mount, verify the user is connected to the partner:
```tsx
import { checkConnectionStatus } from '@/lib/api/social';

const { data: connectionStatus, isLoading: isCheckingConnection } = useQuery({
  queryKey: QUERY_KEYS.connectionStatus?.(partnerId!) ?? ['connectionStatus', partnerId],
  queryFn: () => checkConnectionStatus(partnerId!),
  enabled: !!partnerId,
});

// If not connected, show blocked UI
if (!isCheckingConnection && connectionStatus !== 'connected') {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with back button */}
      <View style={styles.blockedState}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.blockedText, { color: colors.textSecondary }]}>
          You need to be connected to message this user.
        </Text>
      </View>
    </View>
  );
}
```

#### F6.3 — Add Compose Button to `app/(tabs)/messages.tsx`

Add a FAB (floating action button) or header button to start a new conversation:
```tsx
import { getConnections } from '@/lib/api/social';

// In the header:
<Pressable
  onPress={() => router.push('/new-conversation')}
  style={[styles.composeBtn, { backgroundColor: colors.tint }]}
  hitSlop={8}
>
  <Ionicons name="create-outline" size={20} color="#fff" />
</Pressable>
```

#### F6.4 — Create `app/new-conversation.tsx`

New screen that shows the user's connections list and lets them tap one to open a chat:
```
┌─────────────────────────────┐
│ ← Back    New Message       │
│ 🔍 Search connections...    │
├─────────────────────────────┤
│ [Avatar] Jane Smith          │
│ [Avatar] Alex Johnson        │
│ [Avatar] ...                 │
└─────────────────────────────┘
```

Uses `getConnections()` from `lib/api/social.ts`. Tapping a connection navigates to `/chat/[id]`.

### Verification

- [x] As a non-connected user, Message button is disabled/dimmed on user profile
- [x] Tapping disabled Message → shows "Not Connected" alert
- [x] As a connected user, Message button works normally
- [x] Direct URL `/chat/<non-connected-id>` shows blocked state
- [x] Messages tab has compose/new-conversation button
- [x] New Conversation screen shows connections and navigates to chat

### Deliverables

- Connection-gated messaging matching web behavior
- `app/new-conversation.tsx` compose screen
- Chat screen enforces eligibility

---

## Phase F7 — Feed Pagination (useInfiniteQuery) ✅ DONE

**Priority**: 🟠 HIGH — Feed only loads first 20 posts with no way to load more.
**Status**: ✅ COMPLETED (2026-02-22)

### Resolution Summary

Converted `app/(tabs)/index.tsx` from `useQuery` to `useInfiniteQuery`:
- **Removed**: `useState` for `page`, `useQuery` import, `setPage(0)` in refresh handler
- **Added**: `useInfiniteQuery` with `pageParam`-based pagination (`PAGE_SIZE = 20`)
- **Added**: `getNextPageParam` logic — returns `undefined` when last page < PAGE_SIZE (no more data)
- **Added**: `onEndReached` handler (`handleLoadMore`) + `onEndReachedThreshold={0.5}` on FlatList
- **Added**: `ListFooterComponent` — shows `ActivityIndicator` spinner while fetching next page
- **Fixed**: `RefreshControl.refreshing` excludes `isFetchingNextPage` to avoid showing pull-to-refresh spinner during load-more
- **Flattened**: `data.pages.flat()` to produce the unified posts array for FlatList

### Problem

`app/(tabs)/index.tsx` uses `useQuery` with `getPosts({ page: 0, limit: 20 })` (line 43). There is no `onEndReached` handler, no `useInfiniteQuery`, no "load more" indicator. Users with >20 posts in their feed will never see older content.

### Root Cause

Phase 2 used a simple `useQuery` during scaffolding and pagination was never added.

### Files to Change

- `app/(tabs)/index.tsx`

### Implementation Steps

#### F7.1 — Convert to `useInfiniteQuery`

```tsx
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const PAGE_SIZE = 20;

const {
  data,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
} = useInfiniteQuery({
  queryKey: QUERY_KEYS.feed,
  queryFn: ({ pageParam = 0 }) => getPosts({ page: pageParam, limit: PAGE_SIZE }),
  getNextPageParam: (lastPage, allPages) => {
    // If the last page returned fewer than PAGE_SIZE items, there are no more
    if (!lastPage || lastPage.length < PAGE_SIZE) return undefined;
    return allPages.length; // next page index
  },
  initialPageParam: 0,
  staleTime: 30_000,
  gcTime: 5 * 60 * 1000,
});

const posts = data?.pages.flat() ?? [];
```

#### F7.2 — Add `onEndReached` to FlatList

```tsx
<FlatList
  data={posts}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
  onEndReached={() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }}
  onEndReachedThreshold={0.5}
  ListFooterComponent={
    isFetchingNextPage ? (
      <ActivityIndicator style={{ padding: 20 }} color={colors.tint} />
    ) : null
  }
  // ... existing props
/>
```

#### F7.3 — Fix Refresh Handler

```tsx
const handleRefresh = useCallback(async () => {
  await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
}, [queryClient]);
```

Remove the `setPage(0)` state (no longer needed with `useInfiniteQuery`).

### Verification

- [x] Feed loads first 20 posts
- [x] Scrolling to bottom triggers loading indicator + loads next 20
- [x] Pull-to-refresh resets to page 0 (invalidates query, `useInfiniteQuery` refetches from page 0)
- [ ] Feed works with 0, 1, 20, and 100+ posts (needs manual QA)

### Deliverables

- ✅ Feed uses `useInfiniteQuery` with proper pagination
- ✅ Load-more spinner at bottom of list (`ListFooterComponent`)
- ✅ `onEndReached` with 0.5 threshold for smooth infinite scroll
- ✅ No `useState` page tracking — `useInfiniteQuery` manages pagination internally
- ✅ Refresh handler simplified (no `setPage(0)`)

---

## Phase F8 — Create Event Screen

**Priority**: 🟠 HIGH — Create Event button exists but does nothing.

### Problem

`app/(tabs)/events.tsx` line 156 has:
```tsx
onPress={() => { Haptics.impactAsync(...); /* TODO: navigate to create event */ }}
```

Additionally, there is no `createEvent` function in `@clstr/core/api/events-api.ts` — only `getEventById`, `updateEvent`, `deleteEvent`, `registerForEvent`, etc.

### Files to Create

- `app/create-event.tsx` — Event creation form

### Files to Change

- `app/(tabs)/events.tsx` — Wire create button
- `lib/api/events.ts` — Add `createEvent` function (custom, like existing `getEvents`)

### Implementation Steps

#### F8.1 — Add `createEvent` to `lib/api/events.ts`

Since `@clstr/core` doesn't have a `createEvent`, add it as a custom function (same pattern as existing `getEvents`):

```tsx
export async function createEvent(input: {
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  location?: string;
  is_virtual?: boolean;
  category?: string;
  max_attendees?: number;
  external_registration_url?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const db = supabase as any;

  // Get user's college domain
  const { data: profile } = await db
    .from('profiles')
    .select('college_domain')
    .eq('id', user.id)
    .maybeSingle();

  const { data, error } = await db
    .from('events')
    .insert({
      ...input,
      creator_id: user.id,
      college_domain: profile?.college_domain ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

#### F8.2 — Create `app/create-event.tsx`

Form screen with fields:
```
┌─────────────────────────────┐
│ ← Cancel    Create Event    │
├─────────────────────────────┤
│ Title: ________________     │
│ Date:  [Date Picker]        │
│ Time:  [Time Picker]        │
│ Location: _____________     │
│ ☑ Virtual Event             │
│ Category: [Dropdown]        │
│ Max Attendees: ____         │
│ Description: __________     │
│         [Create Event]      │
└─────────────────────────────┘
```

Uses `useMutation` with the new `createEvent` function. On success, invalidates `QUERY_KEYS.events` and navigates back.

#### F8.3 — Wire Create Button in `app/(tabs)/events.tsx`

Replace the `/* TODO */` comment:
```tsx
onPress={() => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  router.push('/create-event');
}}
```

### Dependencies

```bash
npx expo install @react-native-community/datetimepicker
```

### Verification

- [ ] Create Event button navigates to form
- [ ] Fill form → submit → event appears in events list
- [ ] Event has correct college_domain
- [ ] Role-gated: only users with `canCreateEvents` see the button

### Deliverables

- `app/create-event.tsx` form screen
- `createEvent()` API function
- Events list create button is functional

---

## Phase F9 — Fix Profile Stats & Hardcoded Query Keys

**Priority**: 🟡 MEDIUM — Incorrect data display + inconsistent cache keys.

### Problem

1. **Profile stats are wrong**: `app/(tabs)/profile.tsx` line 64 uses:
   ```tsx
   const connectionsCount = profile.connections?.length ?? 0;
   const postsCount = profile.posts?.length ?? 0;
   ```
   These rely on nested arrays (which may not be populated by the API). Should use dedicated count queries.

2. **`app/user/[id].tsx`** also uses `profile.connections?.length` for connection count.

3. **Hardcoded query keys** in `app/user/[id].tsx`:
   ```tsx
   queryKey: ['connectionStatus', id]       // should be QUERY_KEYS.connectionStatus(id)
   queryKey: ['mutualConnections', id]       // should be QUERY_KEYS.mutualConnections(id)
   queryKey: ['userPostsCount', id]          // should be QUERY_KEYS.userPostsCount(id)
   ```

### Files to Change

- `app/(tabs)/profile.tsx`
- `app/user/[id].tsx`

### Implementation Steps

#### F9.1 — Fix Profile Stats (Own Profile)

```tsx
import { getConnectionCount, getUserPostsCount } from '@/lib/api';

// Add queries:
const { data: connectionsCount = 0 } = useQuery({
  queryKey: QUERY_KEYS.connectionCount?.(user?.id ?? '') ?? ['connectionCount', user?.id],
  queryFn: () => getConnectionCount(user!.id),
  enabled: !!user?.id,
});

const { data: postsCount = 0 } = useQuery({
  queryKey: QUERY_KEYS.userPostsCount?.(user?.id ?? '') ?? ['userPostsCount', user?.id],
  queryFn: () => getUserPostsCount(user!.id),
  enabled: !!user?.id,
});

// Remove:
// const connectionsCount = profile.connections?.length ?? 0;
// const postsCount = profile.posts?.length ?? 0;
```

#### F9.2 — Fix User Profile Stats

In `app/user/[id].tsx`, replace `profile.connections?.length ?? 0` with `getConnectionCount(id)` query (already using `getUserPostsCount(id)` for posts).

#### F9.3 — Standardize Query Keys

Check if `QUERY_KEYS` from `@clstr/core` has keys for connection status, mutual connections, etc. If not, define them locally in `lib/query-keys.ts`:

```tsx
// lib/query-keys.ts — extend if needed
export const MOBILE_QUERY_KEYS = {
  connectionStatus: (userId: string) => ['connectionStatus', userId] as const,
  mutualConnections: (userId: string) => ['mutualConnections', userId] as const,
  userPostsCount: (userId: string) => ['userPostsCount', userId] as const,
  connectionCount: (userId: string) => ['connectionCount', userId] as const,
};
```

Then replace all hardcoded key arrays in `app/user/[id].tsx`.

### Verification

- [ ] Own profile shows accurate connection/post counts from DB
- [ ] Other user profile shows accurate connection/post counts
- [ ] All query keys are centralized (no hardcoded array literals)
- [ ] Cache invalidation works correctly across screens

### Deliverables

- Profile stats use DB count queries
- All query keys centralized
- Consistent cache invalidation

---

## Phase F10 — Post Share/Repost in Feed

**Priority**: 🟡 MEDIUM — Share button missing from feed PostCard.

### Problem

`app/(tabs)/index.tsx` renders `PostCard` without passing an `onShare` callback. The `PostCard` component may have a share button that does nothing, or it may not render one at all.

The API layer has `sharePost`, `sharePostToMultiple`, `createRepost`, `deleteRepost`, `hasUserReposted`, `getPostReposts` — all bound and ready.

### Files to Change

- `app/(tabs)/index.tsx`
- `components/PostCard.tsx` (if share button is missing)

### Implementation Steps

#### F10.1 — Add `onShare` to PostCard in Feed

```tsx
const handleShare = useCallback((postId: string) => {
  router.push({ pathname: '/post-actions', params: { id: postId, isSaved: 'false' } });
}, []);

// In renderItem, pass onShare:
<PostCard
  post={...}
  onReact={() => handleReact(item.id)}
  onPress={() => handlePress(item.id)}
  onComment={() => handleComment(item.id)}
  onShare={() => handleShare(item.id)}
/>
```

#### F10.2 — Add Repost Support (Optional Enhancement)

If the web has repost functionality, add a repost button to PostCard:
```tsx
import { createRepost, deleteRepost, hasUserReposted } from '@/lib/api/social';
```

### Verification

- [ ] PostCard in feed has a share/more button
- [ ] Tapping share opens post-actions sheet (from F2)
- [ ] Share, Copy Link, Report all work from feed context

### Deliverables

- Share button wired in feed
- Post actions accessible from feed

---

## Phase F11 — API Consistency (Mentorship & Alumni)

**Priority**: 🟡 MEDIUM — Works but breaks the `withClient` pattern.

### Problem

- `lib/api/mentorship.ts` (428 lines): Uses direct `supabase.from()` queries instead of binding from `@clstr/core`.
- `lib/api/alumni.ts` (82 lines): Uses direct `supabase.rpc('get_alumni_by_domain')`.

Both work correctly but create maintenance risk — if the Supabase client changes, these files won't benefit from the `withClient` abstraction.

### Assessment

This is a **refactor** not a bug fix. The mentorship and alumni modules have no equivalent in `@clstr/core` (the header of `mentorship.ts` says "No @clstr/core module exists for mentorship"). Until core modules are created, these direct queries are acceptable.

### Recommendation

**Defer to Phase F12 or a future sprint.** Document the inconsistency. When `@clstr/core` adds mentorship/alumni modules, refactor these adapters.

### Deliverables

- Document the inconsistency in this plan (done)
- No code changes required now

---

## Phase F12 — Polish & Web Parity Gaps

**Priority**: 🔵 LOW — Nice-to-have features for full web parity.

### Items

| Feature | Status | Action |
|---------|--------|--------|
| Block Connection UI | Missing | Add block button to user profile + `blockConnection` from `lib/api/profile.ts` |
| Online / Last-Seen Status | Missing | Requires Supabase Presence integration — future sprint |
| College-Domain Feed Isolation | Unverified | `getPosts` in `@clstr/core` should filter by `college_domain` — verify RLS policy |
| Event Share | Missing | Add share button to event detail — `shareEvent` / `shareEventToMultiple` already in `lib/api/events.ts` |
| Notification Badge on Tab Bar | Missing | Tab bar should show unread notification count |
| Deep Link Cold Start Queue | Unverified | Test: kill app → open `clstr://post/123` → app should navigate after auth |
| Background → Foreground Realtime Reconnect | Unverified | Test: background app 5min → foreground → realtime channels should reconnect |
| Image Attachments on Posts | Missing | Web supports image posts — mobile only supports text |

### Implementation Order

1. Block Connection UI (uses existing `blockConnection` API)
2. Notification Badge on Tab Bar
3. Event Share Button
4. College-Domain Feed Isolation verification
5. Image Attachments on Posts
6. Deep Link & Background/Foreground testing
7. Online/Last-Seen (requires new backend work)

---

## Dependency Summary

| Package | Phase | Install Command |
|---------|-------|-----------------|
| `expo-clipboard` | F2 | `npx expo install expo-clipboard` |
| `expo-image-picker` | F5 | `npx expo install expo-image-picker` |
| `@react-native-community/datetimepicker` | F8 | `npx expo install @react-native-community/datetimepicker` |

---

## Phase Execution Order

```
F1 (Create Post Fix)     ──→ F2 (Post Actions Fix)     ──→ F3 (Delete Legacy)
                                                              │
F4 (Wire Menu Buttons)   ──→ F5 (Edit Profile)          ←────┘
                                                              │
F6 (Connection-Gated DM) ──→ F7 (Feed Pagination)       ←────┘
                                                              │
F8 (Create Event)        ──→ F9 (Stats & Query Keys)    ←────┘
                                                              │
F10 (Share in Feed)      ──→ F11 (API Consistency)       ←────┘
                                                              │
F12 (Polish & Parity)    ←────────────────────────────────────┘
```

**Estimated effort**: F1–F4 (1–2 days), F5 (2–3 days), F6 (1–2 days), F7–F9 (1–2 days), F10–F12 (2–3 days).

**Total**: ~8–12 development days.

---

## Post-Fix Verification Checklist

After all phases are complete, run:

- [ ] `grep -r "lib/storage\|lib/mock-data\|lib/data-context" app/` → **0 results**
- [ ] `grep -r "onPress: () => {}" app/` → **0 results**
- [ ] `grep -r "\['posts'\]" app/` → **0 results** (all use `QUERY_KEYS.feed`)
- [ ] `grep -r "Colors\.dark\." app/` → **0 results** (all use `useThemeColors()`)
- [ ] `npx expo start` → Builds without errors
- [ ] `npx tsc --noEmit` → No type errors
- [ ] Create post → appears in feed (Supabase)
- [ ] Save post → persists across restart
- [ ] Share post → native share sheet
- [ ] Edit profile → avatar + fields save to DB
- [ ] Message only works between connected users
- [ ] Feed loads 20+20+20 posts with infinite scroll
- [ ] Create event → appears in events list
- [ ] All profile menu items navigate correctly
- [ ] No `app/(main)/` directory exists

---

## Files Summary

### Files to DELETE (Phase F3)

```
app/notifications.tsx
app/onboarding.tsx
app/new-post.tsx
app/(main)/ (entire directory)
```

### Files to CREATE

```
app/edit-profile.tsx        (Phase F5)
app/new-conversation.tsx    (Phase F6)
app/create-event.tsx        (Phase F8)
```

### Files to MODIFY

```
app/create-post.tsx         (Phase F1 — mock → real API)
app/post-actions.tsx        (Phase F1 + F2 — mock → real API + wire actions)
app/(tabs)/more.tsx         (Phase F3 — remove mock import)
app/(tabs)/profile.tsx      (Phase F4 + F5 + F9 — wire menu + completion banner + stats)
app/user/[id].tsx           (Phase F6 + F9 — connection gate + query keys + stats)
app/chat/[id].tsx           (Phase F6 — connection check)
app/(tabs)/messages.tsx     (Phase F6 — compose button)
app/(tabs)/index.tsx        (Phase F7 + F10 — pagination + share)
app/(tabs)/events.tsx       (Phase F8 — wire create button)
lib/api/events.ts           (Phase F8 — add createEvent)
lib/query-keys.ts           (Phase F9 — extend with mobile keys)
```
