# Clstr.network → clstr-reactnative: Full Parity Implementation Plan

> **Generated**: February 23, 2026
> **Scope**: All non-admin features
> **Baseline**: 3 files already modified (auth-context.tsx, login.tsx, signup.tsx) — 0 compile errors

---

## Overview

| Metric | Web (`src/`) | Mobile (`app/` + `lib/`) | Gap |
|---|---|---|---|
| Screens (non-admin) | 37 pages | 27 screens | 10 missing |
| Hooks | 37 (12 admin) | 8 | 17 non-admin missing |
| Auth Callback | 529 lines | 129 lines | ~400 lines of validation logic |
| Onboarding | 1265 lines | 291 lines | ~974 lines of features |
| Theme | Pure black `#000000` dark-only | Light default `#F8FAFC`, dark `#0F172A` | Entire palette off |

---

## Changes Already Applied This Session

| File | What Changed |
|---|---|
| `lib/auth-context.tsx` | Added `signInWithGoogle()` using expo-web-browser + Supabase OAuth. Added `WebBrowser.maybeCompleteAuthSession()`. Updated type, default, and provider value. |
| `app/(auth)/login.tsx` | Complete rewrite. Replaced email/password form with Google-only "Continue with Google" button in a dark (`#000000`) card layout matching web's `Login.tsx`. |
| `app/(auth)/signup.tsx` | Complete rewrite. Added "Continue with Google" + "or use a magic link" separator + email-based magic link form, matching web's `Signup.tsx`. Dark theme, `signInWithOtp`, success state. |

---

## Phase 0 — BLOCKER (Must Do Before Testing)

### Task 0.1: Configure Supabase Redirect URLs

**Effort**: 5 min | **Impact**: OAuth will silently fail without this

1. Open **Supabase Dashboard → Authentication → URL Configuration**
2. Add to **Redirect URLs**:
   - `clstr://auth/callback`
   - `exp://192.168.x.x:8081/--/auth/callback` (dev — replace with your local IP)
   - `com.clstr.app://auth/callback` (if using custom scheme)
3. Verify the `scheme` in `app.json` is `"clstr"`

### Task 0.2: Verify expo-web-browser + Linking Config

**Effort**: 10 min

1. Confirm `app.json` → `expo.scheme` = `"clstr"`
2. Confirm `app/+native-intent.tsx` handles `auth/callback` deep link
3. Test on Android emulator that `WebBrowser.openAuthSessionAsync` returns to app

---

## Phase 1 — Auth Callback Parity (P0 Security)

### Task 1.1: Create Mobile Validation Adapter

**File**: `lib/adapters/validation.ts` (NEW — ~30 lines)
**Source**: Web's `src/lib/validation.ts` pattern
**What it does**: Re-exports pure functions from `@clstr/shared` and pre-binds the mobile Supabase client for server functions.

```
Exports needed:
- isValidAcademicEmail(email) → boolean        (pure, from @clstr/shared/schemas/validation)
- getDomainFromEmail(email) → string           (pure, from @clstr/shared/schemas/validation)
- getCollegeDomainFromEmail(email) → string    (pure, from @clstr/shared/schemas/validation)
- getCollegeDomainFromEmailServer(email) → Promise<string>  (needs supabase client)
```

### Task 1.2: Create Mobile College-Utils Adapter

**File**: `lib/adapters/college-utils.ts` (NEW — ~20 lines)
**Source**: Web's `src/lib/college-utils.ts` pattern

```
Exports needed:
- isPublicEmailDomain(domain) → boolean        (pure, from @clstr/shared/utils/college-utils)
- isPublicEmailDomainServer(domain) → Promise<boolean>  (needs supabase client)
- PUBLIC_EMAIL_DOMAINS                          (constant, from @clstr/shared)
```

### Task 1.3: Rewrite Auth Callback

**File**: `app/auth/callback.tsx` (REWRITE — from 129 → ~300 lines)
**Source**: Web's `src/pages/AuthCallback.tsx` (529 lines)

Port these web callback features (skip admin/club-specific flows for v1):

| Feature | Web Lines | Priority | Mobile Action |
|---|---|---|---|
| Academic email validation | L115-140 | **P0** | Block non-edu emails, redirect to AcademicEmailRequired screen |
| Platform admin bypass check | L120-130 | Skip | Admin feature — not needed per user instruction |
| Email transition merge | L145-260 | P2 | Detect transitioned emails, call `mergeTransitionedAccount` |
| Profile domain update for OAuth | L300-350 | **P0** | Set `college_domain` on profile if missing after OAuth |
| OAuth metadata sync (name, avatar) | L340-350 | **P1** | Copy Google name/avatar to profile if blank |
| PKCE code exchange | L470-495 | Already done | ✅ Current callback handles this |
| Database error recovery | L450-470 | P1 | Retry after `"Database error saving new user"` |
| Error hash param handling | L435-450 | **P1** | Parse `#error=...` from OAuth redirect |

**Implementation outline for rewritten callback**:

```typescript
// 1. Extract session (existing token/code parsing — keep current logic)
// 2. NEW: Validate academic email
//    - const isAcademic = isValidAcademicEmail(user.email)
//    - if (!isAcademic) → router.replace('/(auth)/academic-email-required')
// 3. NEW: Check/update profile domain
//    - Query profiles table for user.id
//    - If no college_domain → set it from email (if academic, not public)
// 4. NEW: Sync OAuth metadata (full_name, avatar_url)
// 5. Check onboarding_complete → route to onboarding or home
```

### Task 1.4: Create AcademicEmailRequired Screen

**File**: `app/(auth)/academic-email-required.tsx` (NEW — ~80 lines)
**Source**: Web's `src/pages/AcademicEmailRequired.tsx` (80 lines)

Simple static screen:
- Dark `#000000` background (match auth theme)
- Graduate cap icon
- "Academic Email Required" heading
- Explanation text
- "Try with a different account" button → signs out + routes to signup
- "Go back to login" link → routes to login

### Task 1.5: Create `useAcademicEmailValidator` Hook

**File**: `lib/hooks/useAcademicEmailValidator.ts` (NEW — ~50 lines)
**Source**: Web's `src/hooks/useAcademicEmailValidator.ts` (48 lines)

```typescript
export function useAcademicEmailValidator() {
  // Returns { isValid, isChecking, domain, error } for a given email
  // Uses isValidAcademicEmail from lib/adapters/validation
  // Optionally checks EXPO_PUBLIC_ALLOWED_EMAIL_DOMAINS env var
}
```

---

## Phase 2 — Onboarding Parity (P1 Registration Quality)

### Task 2.1: Expand `OnboardingPayload` Type

**File**: `lib/auth-context.tsx`
**Change**: Expand `OnboardingPayload` interface

```typescript
interface OnboardingPayload {
  fullName: string;
  role: string;
  // Existing
  department: string;
  graduationYear?: string;
  bio?: string;
  // NEW — matching web Onboarding.tsx
  university?: string;
  major?: string;
  enrollmentYear?: string;
  courseDurationYears?: string;
  interests?: string[];
  socialLinks?: {
    website?: string;
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    googleScholar?: string;
  };
  avatarUrl?: string | null;
}
```

### Task 2.2: Update `completeOnboarding()` in Auth Context

**File**: `lib/auth-context.tsx`
**Change**: Expand the profile payload creation to include new fields

Map all new fields to `ProfileSignupPayload`:
- `university` → `profile.university`
- `major` → `profile.major` + `profile.branch`
- `enrollmentYear` → `profile.enrollment_year`
- `courseDurationYears` → `profile.course_duration_years`
- `interests` → `profile.interests`
- `socialLinks` → `profile.social_links` (sanitized)
- `avatarUrl` → `profile.avatar_url`
- Auto-calculate `headline` = `"{major} · {university}"`
- Auto-determine role from graduation using `determineUserRoleFromGraduation()` from `@clstr/shared`

### Task 2.3: Create `useFileUpload` Hook

**File**: `lib/hooks/useFileUpload.ts` (NEW — ~100 lines)
**Source**: Web's `src/hooks/useFileUpload.ts` (110 lines)

```typescript
export function useFileUpload() {
  // Uses expo-image-picker for camera/gallery
  // Uploads to Supabase Storage (avatars bucket)
  // Returns { pickImage, uploadImage, isUploading, progress }
  // Validates file size (5MB max) and type (image/*)
}
```

**Dependencies**: `expo-image-picker`, `expo-file-system`

### Task 2.4: Rewrite Onboarding Screen

**File**: `app/(auth)/onboarding.tsx` (REWRITE — from 291 → ~700 lines)
**Source**: Web's `src/pages/Onboarding.tsx` (1265 lines)

New step flow (8 steps replacing 4):

| Step | Title | Fields | Web Parity |
|---|---|---|---|
| 0 | Full Name | TextInput (auto-filled from Google metadata) | ✅ Same as web |
| 1 | Profile Picture | Avatar picker via `useFileUpload` | NEW — matches web |
| 2 | University | Autocomplete using `getUniversityOptions()` from `@clstr/shared` | NEW — matches web |
| 3 | Major / Field | Autocomplete using `getMajorOptions()` from `@clstr/shared` | NEW — matches web |
| 4 | Academic Timeline | Enrollment year picker + course duration + auto-calculated graduation year | NEW — matches web |
| 5 | Interests | Multi-select chip UI (12 preset + custom input) | NEW — matches web |
| 6 | Social Links | Collapsible section (LinkedIn, Twitter, website, etc.) | NEW — matches web |
| 7 | Bio | TextArea (optional) | Same as current step 3 |

**Key mobile-specific components needed**:

- **Autocomplete component**: `components/Autocomplete.tsx` — searchable dropdown with FlatList. Filter `getUniversityOptions()` and `getMajorOptions()` results by text input.
- **ChipPicker component**: `components/ChipPicker.tsx` — multi-select chip grid for interests. Wrap/flow layout with `flexWrap: 'wrap'`.
- **AvatarPicker component**: `components/AvatarPicker.tsx` — circular preview + "Upload Photo" button using `expo-image-picker`.

**Auto-role determination**: Import `determineUserRoleFromGraduation()` and `calculateGraduationYear()` from `@clstr/shared` or `src/lib/alumni-identification.ts`. Show auto-determined Student/Alumni badge like web.

### Task 2.5: Create Role-Specific Profile Records

**File**: `lib/auth-context.tsx` — `completeOnboarding()` method
**Source**: Web `Onboarding.tsx` L560-630

After main profile upsert, create role-specific records:
- **Student**: upsert into `student_profiles` with `college_domain`, `expected_graduation`
- **Alumni**: upsert into `alumni_profiles` with `graduation_year`, `graduation_date`, `linkedin_url`
- **Faculty**: upsert into `faculty_profiles` with `department`, `position`

---

## Phase 3 — Theme & UI Alignment (P1 Visual Parity)

### Task 3.1: Update Dark Theme Palette to Pure Black

**File**: `constants/colors.ts`
**Change**: Align dark palette with web's `#000000` pure black design

```diff
const dark = {
-  background: '#0F172A',
-  surface: '#1E293B',
-  surfaceSecondary: '#334155',
+  background: '#000000',
+  surface: 'rgba(255, 255, 255, 0.04)',
+  surfaceSecondary: 'rgba(255, 255, 255, 0.06)',
   // ... similar changes for text (white hierarchy), borders (white/10, white/15)
};
```

Full mapping:

| Token | Current Mobile Dark | Target (Web) |
|---|---|---|
| `background` | `#0F172A` | `#000000` |
| `surface` | `#1E293B` | `rgba(255,255,255,0.04)` |
| `surfaceSecondary` | `#334155` | `rgba(255,255,255,0.06)` |
| `text` | `#F1F5F9` | `rgba(255,255,255,0.95)` |
| `textSecondary` | `#94A3B8` | `rgba(255,255,255,0.60)` |
| `textTertiary` | `#64748B` | `rgba(255,255,255,0.40)` |
| `border` | `#334155` | `rgba(255,255,255,0.10)` |
| `tint` | `#3B82F6` | `rgba(255,255,255,0.90)` |
| `primary` | `#3B82F6` | `rgba(255,255,255,0.90)` |

### Task 3.2: Update Dark Surface Tiers

**File**: `constants/colors.ts`

```diff
export const darkSurfaceTiers = {
  tier1: {
-    backgroundColor: '#1E293B',
-    borderColor: '#475569',
+    backgroundColor: 'rgba(255,255,255,0.06)',
+    borderColor: 'rgba(255,255,255,0.15)',
  },
  tier2: {
-    backgroundColor: '#1E293B',
-    borderColor: '#334155',
+    backgroundColor: 'rgba(255,255,255,0.04)',
+    borderColor: 'rgba(255,255,255,0.10)',
  },
  tier3: {
-    backgroundColor: '#1E293B',
-    borderColor: '#1E293B',
+    backgroundColor: 'rgba(255,255,255,0.02)',
+    borderColor: 'rgba(255,255,255,0.06)',
  },
};
```

### Task 3.3: Force Dark Mode by Default

**File**: `constants/colors.ts`
**Change**: Make dark the default/only theme (matching web's dark-only)

**Option A** (recommended): Change `useThemeColors()` to always return dark palette:

```typescript
export function useThemeColors() {
  return dark; // Dark-only, matching web
}
```

**Option B** (if user wants system toggle): Keep `useColorScheme()` but default to dark.

### Task 3.4: Update Tab Bar Styling

**File**: `app/(tabs)/_layout.tsx`
**Change**: Update tab bar to pure black background with `rgba(255,255,255,0.60)` icons, white selected icon

### Task 3.5: Update Root Layout Background

**File**: `app/_layout.tsx`
**Change**: Set `StatusBar` to `light-content`, background to `#000000`

---

## Phase 4 — Missing Screens (P2)

### Task 4.1: ProfileConnectionsPage

**File**: `app/connections.tsx` (NEW — ~80 lines)
**Source**: Web's `src/pages/ProfileConnectionsPage.tsx` (78 lines)
**Effort**: 1-2 hours

Simple wrapper that takes a user ID from route params and renders a FlatList of connections using existing `lib/api/social.ts` data.

### Task 4.2: UpdatePassword Screen

**File**: `app/update-password.tsx` (NEW — ~200 lines)
**Source**: Web's `src/pages/UpdatePassword.tsx` (250 lines)
**Effort**: 2-3 hours

Form with: current password (optional for OAuth users), new password, confirm password. Uses `supabase.auth.updateUser({ password })`.

### Task 4.3: VerifyPersonalEmail Screen

**File**: `app/verify-personal-email.tsx` (NEW — ~150 lines)
**Source**: Web's `src/pages/VerifyPersonalEmail.tsx` (165 lines)
**Effort**: 2 hours

Handles email transition verification for alumni moving from college → personal email.

### Task 4.4: HelpCenter Screen

**File**: `app/help-center.tsx` (NEW — ~250 lines)
**Source**: Web's `src/pages/HelpCenter.tsx` (304 lines)
**Effort**: 2-3 hours

FAQ accordion + support contact form. Static content, no complex API calls.

### Task 4.5: AlumniInvite Screen

**File**: `app/alumni-invite.tsx` (NEW — ~350 lines)
**Source**: Web's `src/pages/AlumniInvite.tsx` (484 lines)
**Effort**: 3-4 hours

Invite claim flow: validates invite token, shows pre-filled info, routes to signup/onboarding with context.

### Task 4.6: PortfolioEditor + TemplatePicker

**Files**: `app/portfolio-editor.tsx` (NEW — ~500 lines), `app/portfolio-template-picker.tsx` (NEW — ~180 lines)
**Source**: Web's `src/pages/PortfolioEditor.tsx` (612 lines) + `src/pages/PortfolioTemplatePicker.tsx` (206 lines)
**Effort**: 1 day

Rich editor for portfolio sections (About, Experience, Projects, Skills). Template picker for visual layouts.

### Task 4.7: ClubAuth + ClubOnboarding (defer if not priority)

**Files**: `app/club-auth.tsx` (~400 lines), `app/club-onboarding.tsx` (~450 lines)
**Source**: Web's `src/pages/ClubAuth.tsx` (642 lines) + `src/pages/ClubOnboarding.tsx` (613 lines)
**Effort**: 1.5 days

Access code verification flow + club profile setup. Can be deferred.

---

## Phase 5 — Missing Hooks (P2)

| Hook | File | Source (Web) | Est. Lines | Key Deps |
|---|---|---|---|---|
| `useFileUpload` | `lib/hooks/useFileUpload.ts` | `src/hooks/useFileUpload.ts` (110) | ~100 | expo-image-picker, expo-file-system |
| `useNetwork` | `lib/hooks/useNetwork.ts` | `src/hooks/useNetwork.ts` (31) | ~30 | @react-native-community/netinfo |
| `useAcademicEmailValidator` | `lib/hooks/useAcademicEmailValidator.ts` | `src/hooks/useAcademicEmailValidator.ts` (48) | ~50 | lib/adapters/validation |
| `useDeleteAccount` | `lib/hooks/useDeleteAccount.ts` | `src/hooks/useDeleteAccount.ts` (32) | ~30 | supabase RPC |
| `useUserSettings` | `lib/hooks/useUserSettings.ts` | `src/hooks/useUserSettings.ts` (65) | ~60 | supabase query |
| `useTypeaheadSearch` | `lib/hooks/useTypeaheadSearch.ts` | `src/hooks/useTypeaheadSearch.ts` (31) | ~30 | debounced search |
| `usePagination` | `lib/hooks/usePagination.ts` | `src/hooks/usePagination.ts` (45) | ~45 | cursor-based |
| `useSkillAnalysis` | `lib/hooks/useSkillAnalysis.ts` | `src/hooks/useSkillAnalysis.ts` (104) | ~100 | lib/api/skill-analysis |
| `useAIChat` | `lib/hooks/useAIChat.ts` | `src/hooks/useAIChat.ts` (152) | ~140 | lib/api/ai-chat |
| `useMentorship` | ALREADY EXISTS (`lib/api/mentorship.ts`, 393 lines) | — | — | ✅ |
| `usePortfolio` | `lib/hooks/usePortfolio.ts` | `src/hooks/usePortfolio.ts` (73) | ~70 | lib/api/portfolio |
| `usePortfolioEditor` | `lib/hooks/usePortfolioEditor.ts` | `src/hooks/usePortfolioEditor.ts` (276) | ~250 | lib/api/portfolio |
| `useEmailTransition` | `lib/hooks/useEmailTransition.ts` | `src/hooks/useEmailTransition.ts` (226) | ~200 | supabase RPC |
| `useAlumniInviteClaim` | `lib/hooks/useAlumniInviteClaim.ts` | `src/hooks/useAlumniInviteClaim.ts` (86) | ~80 | supabase RPC |
| `useAlumniInvites` | `lib/hooks/useAlumniInvites.ts` | `src/hooks/useAlumniInvites.ts` (149) | ~140 | supabase query |

**Skip (mobile N/A)**: `useTheme` (mobile uses system), `useIdleDetection`, `usePWAInstall`, `use-mobile`, all `useAdmin*` (12 hooks)

---

## Phase 6 — Screen Depth Audit (P2-P3)

Screens that exist but need feature enrichment:

| Mobile Screen | Lines | Web Equivalent | Lines | Key Missing Features |
|---|---|---|---|---|
| `(tabs)/index.tsx` | 329 | `Feed.tsx` + `Home.tsx` | 195+340 | CreatePostCard composer widget, network stats sidebar, promoted posts |
| `(tabs)/profile.tsx` | 234 | `Profile.tsx` | 465 | Connection count + link to connections page, portfolio section, social links display, edit profile parity |
| `(tabs)/network.tsx` | 183 | `Network.tsx` | 759 | Typeahead search, mutual connections, suggested connections algorithm, pagination |
| `(tabs)/events.tsx` | 242 | `Events.tsx` | 1993 | Event creation form parity, RSVP management, event categories, recurring events |
| `jobs.tsx` | 392 | `Jobs.tsx` | 767 | Job filters, saved jobs, application tracking, company pages |
| `projects.tsx` | 326 | `Projects.tsx` | 2184 | Team management, project milestones, file uploads, collaborator invites |
| `settings.tsx` | 506 | `Settings.tsx` | 706 | Email transition UI, delete account, notification preferences granularity |
| `alumni.tsx` | 344 | `AlumniDirectory.tsx` | 597 | Filters, invite alumni flow, alumni stats |
| `skill-analysis.tsx` | 307 | `SkillAnalysis.tsx` | 533 | AI analysis depth, skill gap visualization, recommendations |
| `portfolio.tsx` | 322 | `Portfolio.tsx` | 114 | Already larger — needs PortfolioEditor integration |
| `(tabs)/messages.tsx` | 112 | `Messaging.tsx` | 385 | Message search, typing indicators, read receipts, media messages |

---

## Feature Parity Table (Full)

| Web Page | Mobile Screen | Status | Gap Notes |
|---|---|---|---|
| `Login.tsx` (Google only) | `(auth)/login.tsx` | ✅ FIXED | Was email/password, now Google OAuth matching web |
| `Signup.tsx` (Google + Magic Link) | `(auth)/signup.tsx` | ✅ FIXED | Was email/password, now Google + Magic Link matching web |
| `AuthCallback.tsx` (529 lines) | `auth/callback.tsx` (129 lines) | ⚠️ Partial | Missing academic email domain validation, admin bypass, email transition merge |
| `Onboarding.tsx` (1265 lines) | `(auth)/onboarding.tsx` (291 lines) | ⚠️ Partial | Missing: university autocomplete, avatar upload, interests picker, social links, graduation/enrollment year, course duration, major selection |
| `Feed.tsx` + `Home.tsx` | `(tabs)/index.tsx` | ⏳ Exists | Needs depth audit (CreatePostCard, PostCard, network stats sidebar) |
| `Profile.tsx` | `(tabs)/profile.tsx` | ⏳ Exists | Needs depth audit |
| `Network.tsx` | `(tabs)/network.tsx` | ⏳ Exists | Needs depth audit |
| `Events.tsx` | `(tabs)/events.tsx` | ⏳ Exists | — |
| `EventDetail.tsx` | `event/[id].tsx` | ⏳ Exists | — |
| `Messaging.tsx` | `(tabs)/messages.tsx` | ⏳ Exists | — |
| `Search.tsx` | `search.tsx` | ⏳ Exists | — |
| `Jobs.tsx` | `jobs.tsx` | ⏳ Exists | — |
| `JobDetail.tsx` | `job/[id].tsx` | ⏳ Exists | — |
| `PostDetail.tsx` | `post/[id].tsx` | ⏳ Exists | — |
| `Clubs.tsx` | `clubs.tsx` | ⏳ Exists | — |
| `Projects.tsx` | `projects.tsx` | ⏳ Exists | — |
| `Portfolio.tsx` | `portfolio.tsx` | ⏳ Exists | — |
| `EcoCampus.tsx` | `ecocampus.tsx` | ⏳ Exists | — |
| `Mentorship.tsx` | `mentorship.tsx` | ⏳ Exists | — |
| `AlumniDirectory.tsx` | `alumni.tsx` | ⏳ Exists | — |
| `SkillAnalysis.tsx` | `skill-analysis.tsx` | ⏳ Exists | — |
| `SavedItems.tsx` | `saved.tsx` | ⏳ Exists | — |
| `Settings.tsx` | `settings.tsx` | ⏳ Exists | — |
| `ForgotPassword.tsx` | `(auth)/forgot-password.tsx` | ⏳ Exists | — |
| `MagicLinkSent.tsx` | `(auth)/magic-link-sent.tsx` | ⏳ Exists | — |
| `VerifyEmail.tsx` | `(auth)/verify-email.tsx` | ⏳ Exists | — |
| `AcademicEmailRequired.tsx` | — | ❌ MISSING | Redirect target when non-academic email detected |
| `AlumniInvite.tsx` | — | ❌ MISSING | Alumni invite claim flow |
| `ClubAuth.tsx` | — | ❌ MISSING | Club staff auth flow |
| `ClubOnboarding.tsx` | — | ❌ MISSING | Club-specific onboarding |
| `HelpCenter.tsx` | — | ❌ MISSING | FAQ / support page |
| `PortfolioEditor.tsx` | — | ❌ MISSING | Rich portfolio editor |
| `PortfolioTemplatePicker.tsx` | — | ❌ MISSING | Template selection |
| `ProfileConnectionsPage.tsx` | — | ❌ MISSING | Full connections list view |
| `UpdatePassword.tsx` | — | ❌ MISSING | Password change screen |
| `VerifyPersonalEmail.tsx` | — | ❌ MISSING | Personal email verification |
| `admin/*` (13+ pages) | — | 🚫 SKIPPED | Entire admin panel (intentional — not converting) |

---

## Logic Inconsistencies

| Area | Web Behavior | Mobile Behavior | Risk |
|---|---|---|---|
| Auth primary method | Google OAuth only (login), Google + Magic Link (signup) | ~~Email/password only~~ **FIXED** — Google + Magic Link | ✅ Resolved |
| AuthCallback validation | Validates academic email domain, checks admin status, handles email transition merge (529 lines) | Simple token extraction + session set (129 lines) | **HIGH** — non-academic users could slip through |
| Session detection | `detectSessionInUrl: true` (browser default) | `detectSessionInUrl: false` (explicit in core-client) | Intentional for native deep links, but callback must handle manually |
| Redirect after auth | Complex: `authReturnUrl` from sessionStorage, `/feed` default | Root layout guard: `router.replace('/')` | OK — mobile guard pattern is standard |
| Onboarding completeness | 8+ fields, university lookup, avatar, interests, social links | 4 fields: name, role, department, bio | Profile data gap |
| Role from graduation | `determineUserRoleFromGraduation()` auto-classifies alumni | Manual role selection only | Alumni may self-misclassify |

---

## UI Inconsistencies

| Element | Web | Mobile (Before) | Mobile (After Fix) |
|---|---|---|---|
| Auth background | `#000000` pure black | `#F8FAFC` light gray | `#000000` pure black ✅ |
| Auth card | `bg-white/[0.04]` glass | Flat white form | `rgba(255,255,255,0.04)` glass ✅ |
| Font | Space Grotesk (headings) + Inter | Inter only | Inter only (acceptable for mobile) |
| Non-auth theme | Dark-only, pure black | Light default (`#F8FAFC`) with optional dark (`#0F172A` slate) | ⚠️ Unfixed — main app still uses light theme |
| Surface tiers | `rgba(255,255,255, 0.02/0.04/0.06)` | `surface1: '#F1F5F9'` (light), `#1E293B` (dark) | ⚠️ Still divergent |
| Primary color | Not explicitly declared (white text + glass on black) | `#2563EB` blue | ⚠️ Different identity |
| Border radius | `rounded-xl` = 12px on cards | `borderRadius: 16` on cards | Minor mismatch |
| Google button | `bg-white/10 border-white/15` | Didn't exist | Matching ✅ |

---

## Lifecycle & Performance Risks

| Risk | Description | Severity |
|---|---|---|
| expo-web-browser session | `WebBrowser.openAuthSessionAsync` opens in-app browser for Google OAuth — on Android some devices may not return the redirect properly | Medium |
| Deep link scheme | App scheme `clstr://` must be registered in Supabase dashboard redirect URLs for OAuth callback | **Critical** — if not configured, Google OAuth will silently fail |
| Token in URL hash | `signInWithGoogle` parses `access_token` and `refresh_token` from redirect URL hash fragment — relies on implicit grant flow | Medium — PKCE code exchange fallback exists |
| Missing auth redirect config | Supabase OAuth redirect must include `clstr://auth/callback` | **Critical** |
| Bundle size | `expo-web-browser` + `react-native-svg` already installed but now actively used | Low |
| Realtime subscriptions | Mobile has `useFeedSubscription`, `useMessageSubscription`, `useNotificationSubscription` — connection management on backgrounding not audited | Medium |

---

## Hooks Parity (37 web hooks → 8 mobile hooks)

| Web Hook | Mobile Equivalent | Status |
|---|---|---|
| `useIdentity` | `useIdentity` | ✅ Shared |
| `useRolePermissions` | `useRolePermissions` | ✅ Shared |
| `useFeatureAccess` | `useFeatureAccess` | ✅ Shared |
| `usePushNotifications` | `usePushNotifications` | ✅ Exists |
| `useNetwork` | — | ❌ Missing (connection management) |
| `usePortfolio` / `usePortfolioEditor` | — | ❌ Missing |
| `useSkillAnalysis` | — | ❌ Missing (API adapter exists) |
| `useAIChat` | — | ❌ Missing (API adapter exists) |
| `useMentorship` | `lib/api/mentorship.ts` (393 lines) | ✅ Exists as API module |
| `useFileUpload` | — | ❌ Missing (critical for avatar/attachments) |
| `useAcademicEmailValidator` | — | ❌ Missing (P0 for auth parity) |
| `useEmailTransition` | — | ❌ Missing |
| `useDeleteAccount` | — | ❌ Missing |
| `useUserSettings` | — | ❌ Missing |
| `useTypeaheadSearch` | — | ❌ Missing |
| `usePagination` | — | ❌ Missing |
| `useTheme` | — | ❌ Missing (mobile uses `useColorScheme`) |
| `useIdleDetection` | — | 🚫 N/A for mobile |
| `usePWAInstall` | — | 🚫 N/A for mobile |
| `useAdmin*` (12 hooks) | — | 🚫 N/A for mobile |

---

## Implementation Order (Sprint Plan)

### Sprint 1 (Week 1) — Auth & Security

| # | Task | Est. Hours |
|---|---|---|
| 0.1 | Configure Supabase redirect URLs | 0.1 |
| 0.2 | Verify expo-web-browser + linking | 0.5 |
| 1.1 | Create `lib/adapters/validation.ts` | 0.5 |
| 1.2 | Create `lib/adapters/college-utils.ts` | 0.5 |
| 1.3 | Rewrite auth callback with academic validation | 3 |
| 1.4 | Create AcademicEmailRequired screen | 1 |
| 1.5 | Create `useAcademicEmailValidator` hook | 1 |
| | **Sprint 1 Total** | **~6.5 hrs** |

### Sprint 2 (Week 1-2) — Onboarding & Upload

| # | Task | Est. Hours |
|---|---|---|
| 2.1 | Expand OnboardingPayload type | 0.5 |
| 2.2 | Update `completeOnboarding()` | 1.5 |
| 2.3 | Create `useFileUpload` hook | 3 |
| 2.4a | Create Autocomplete component | 2 |
| 2.4b | Create ChipPicker component | 1 |
| 2.4c | Create AvatarPicker component | 1 |
| 2.4d | Rewrite onboarding screen (8 steps) | 5 |
| 2.5 | Role-specific profile records | 1.5 |
| | **Sprint 2 Total** | **~15.5 hrs** |

### Sprint 3 (Week 2) — Theme & Visual

| # | Task | Est. Hours |
|---|---|---|
| 3.1 | Update dark palette to pure black | 1 |
| 3.2 | Update dark surface tiers | 0.5 |
| 3.3 | Force dark mode default | 0.5 |
| 3.4 | Update tab bar styling | 1 |
| 3.5 | Update root layout + StatusBar | 0.5 |
| 3.6 | Touch up all existing screens for dark theme consistency | 4 |
| | **Sprint 3 Total** | **~7.5 hrs** |

### Sprint 4 (Week 3) — Missing Screens

| # | Task | Est. Hours |
|---|---|---|
| 4.1 | ProfileConnectionsPage | 2 |
| 4.2 | UpdatePassword | 3 |
| 4.3 | VerifyPersonalEmail | 2 |
| 4.4 | HelpCenter | 3 |
| 4.5 | AlumniInvite | 4 |
| 4.6 | PortfolioEditor + TemplatePicker | 8 |
| 4.7 | ClubAuth + ClubOnboarding (deferred) | 12 |
| | **Sprint 4 Total** | **~22-34 hrs** |

### Sprint 5 (Week 3-4) — Hooks + Screen Depth

| # | Task | Est. Hours |
|---|---|---|
| 5.x | Create all 14 missing hooks | 8 |
| 6.x | Deep audit + enrich 11 existing screens | 16-24 |
| | **Sprint 5 Total** | **~24-32 hrs** |

---

## Total Estimated Effort

| Phase | Hours |
|---|---|
| Phase 0: Blockers | 0.5 |
| Phase 1: Auth Callback | 6 |
| Phase 2: Onboarding | 15.5 |
| Phase 3: Theme | 7.5 |
| Phase 4: Missing Screens | 22-34 |
| Phase 5: Missing Hooks | 8 |
| Phase 6: Screen Depth | 16-24 |
| **TOTAL** | **~76-96 hours** |

---

## Dependencies to Install

```bash
npx expo install expo-image-picker expo-file-system @react-native-community/netinfo
```

> `expo-web-browser`, `expo-linking`, `expo-haptics`, `react-native-svg` are already installed.

---

## Files Created/Modified Summary

| Action | Count | Files |
|---|---|---|
| NEW files | ~25 | 3 adapters, 14 hooks, 6 screens, 2 reusable components |
| REWRITE | 2 | `auth/callback.tsx`, `(auth)/onboarding.tsx` |
| MODIFY | 4 | `auth-context.tsx`, `constants/colors.ts`, `(tabs)/_layout.tsx`, `_layout.tsx` |

---

## Shared Package Utilities Available

These already exist in `@clstr/shared` and can be directly imported in mobile:

| Module | Function | Used By |
|---|---|---|
| `@clstr/shared/schemas/validation` | `isValidAcademicEmail`, `getDomainFromEmail`, `normalizeCollegeDomain`, `getCollegeDomainFromEmail` | Auth callback, onboarding |
| `@clstr/shared/utils/college-utils` | `isPublicEmailDomain`, `PUBLIC_EMAIL_DOMAINS`, `formatCollegeName`, `extractDomainFromEmail` | Auth callback |
| `@clstr/shared/utils/university-data` | `getUniversityOptions()`, `getMajorOptions()`, `getUniversityNameFromDomain()` | Onboarding autocomplete |
