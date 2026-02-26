# Clstr.network → clstr-reactnative: Full Implementation Plan V2

> **Generated**: February 26, 2026  
> **Baseline**: IMPLEMENTATION_PLAN.md Phases 0–8 COMPLETE, PARITY_PLAN_V2.md 8 infrastructure phases COMPLETE  
> **Scope**: All non-admin features — remaining gaps only  
> **Status**: 119 tests passing, 0 TypeScript errors in mobile scope  

---

## Executive Summary

### What's Done (Phases 0–8)
| Area | Status |
|---|---|
| Google OAuth (login + signup) | ✅ Complete — both screens have Google "G" SVG button |
| Magic link signup | ✅ Complete — `signInWithOtp` on mobile |
| Auth callback (academic email validation, domain update, metadata sync) | ✅ Complete (~470 lines) |
| Onboarding (8-step flow matching web) | ✅ Complete — avatar, university, major, timeline, interests, social links, bio |
| Theme (pure black `#000000`, forced dark mode, rgba surface tiers) | ✅ Complete |
| Missing screens (connections, update-password, verify-email, help-center, alumni-invite, portfolio-editor) | ✅ Complete |
| Missing hooks (14 created: useNetwork, useSkillAnalysis, useAIChat, etc.) | ✅ Complete |
| Screen depth enrichments (11 screens enriched with search/filter/sort) | ✅ Complete |
| TypeScript audit (0 errors in mobile + packages scope) | ✅ Complete |
| Supabase client unification, query key canonicalization, realtime lifecycle | ✅ Complete |

### What's Still Missing (This Plan)
| Gap | Priority | Effort |
|---|---|---|
| **P0: Auth debugging** — User reports Google button not visible | P0 | 2-4 hrs |
| **P1: Event edit/delete** — Web has full CRUD, mobile is read-only | P1 | 6-8 hrs |
| **P2: Cover photo upload** — Web profile has cover banner, mobile doesn't | P2 | 4-6 hrs |
| **P2: ClubAuth flow** — Access-code-gated club/faculty provisioning | P2 | 8-12 hrs |
| **P2: ClubOnboarding** — Club-specific profile setup | P2 | 6-8 hrs |
| **P2: Advanced network filters** — Web has role/branch/year filters | P2 | 4-6 hrs |
| **P2: Peer comparison in Skill Analysis** — Web shows campus peer stats | P2 | 3-4 hrs |
| **P3: Portfolio template picker** — Template selection before editing | P3 | 4-6 hrs |
| **P3: Job application/posting dialogs** — Apply + post job flows | P3 | 6-8 hrs |
| **P3: Event share modal** — Native share + deep link generation | P3 | 2-3 hrs |
| **P3: Post share/repost modals** — Share + quote-repost flows | P3 | 4-6 hrs |
| **P3: Magic link edge function** — Use `send-magic-link` edge fn like web | P3 | 2-3 hrs |
| **P3: Feed "Create Post" card** — Inline compose card in feed | P3 | 3-4 hrs |
| **P3: Trending topics sidebar** — Campus trending topics | P3 | 3-4 hrs |
| **TOTAL** | | **~56-82 hrs** |

---

## Phase 9 — P0: Auth Flow Debugging

### Issue: User Reports Google Button Not Visible

The code in `app/(auth)/login.tsx` (217 lines) and `app/(auth)/signup.tsx` (364 lines) **does contain the Google "Continue with Google" button** with the SVG "G" icon. Potential causes for the button not appearing:

#### 9.1: Verify Navigation Route

**Check**: Is the user landing on the correct auth screen?

The root layout (`app/_layout.tsx`) uses `useProtectedRoute()` which redirects unauthenticated users. If the redirect target is wrong, the user may see a blank screen or the wrong screen.

**Action**:
```
1. Open app/_layout.tsx
2. Find useProtectedRoute() hook implementation
3. Verify it routes to '/(auth)/login' when not authenticated
4. Check if there's a splash/loading state that blocks rendering
```

**File**: `app/_layout.tsx` — verify the auth guard logic  
**File**: `lib/auth-context.tsx` — verify `isLoading` state doesn't get stuck

#### 9.2: Verify Build Cache

**Action**:
```bash
# Clear Metro bundler cache
npx expo start --clear

# If using EAS, clear build cache
eas build --clear-cache

# Verify the login screen renders
# Navigate manually to: exp://localhost:8081/--/(auth)/login
```

#### 9.3: Check expo-web-browser OAuth Flow

The Google OAuth button calls `signInWithGoogle()` from `lib/auth-context.tsx`, which uses `WebBrowser.openAuthSessionAsync`. If `expo-web-browser` isn't properly linked:

**Action**:
```bash
# Verify expo-web-browser is installed
npx expo install expo-web-browser

# Check app.json has the scheme
# app.json → expo.scheme should be "clstr"

# Verify Supabase redirect URLs include:
# - clstr://auth/callback
# - exp://192.168.x.x:8081/--/auth/callback (for dev)
```

#### 9.4: Check Error Boundary Swallowing

The root layout wraps everything in `<ErrorBoundary>`. If the login screen throws during render, the error boundary may show a fallback that hides the Google button.

**Action**: Add temporary `console.log` in `app/(auth)/login.tsx` `LoginScreen` component body to verify it renders.

#### 9.5: Verify Auth State

If the user is already authenticated but `onboarding_complete` is false, the auth guard may redirect to onboarding instead of login, causing confusion about "missing" Google button.

**Action**: 
```typescript
// In app/_layout.tsx, add logging to useProtectedRoute:
console.log('[auth-guard]', { isLoading, isAuthenticated, needsOnboarding, segments });
```

### Estimated Effort: 2-4 hours (mostly debugging, not coding)

### Phase 9 Execution Update (2026-02-26)

#### ✅ Implemented in Code

1. **Auth guard route hardening** (`app/_layout.tsx`)
  - Added explicit public auth route allowlist (`login`, `signup`, `forgot-password`, `verify-email`, `magic-link-sent`, `academic-email-required`).
  - Unauthenticated users are now redirected to `/(auth)/login` unless already on an allowed public auth route.
  - Signed-in users who still need onboarding are forced to `/(auth)/onboarding` from any non-onboarding route.

2. **Auth loading resilience fix** (`lib/auth-context.tsx`)
  - Wrapped initial `supabase.auth.getSession()` hydration in `try/catch/finally`.
  - Ensures `isLoading` is always cleared even on initialization failures, preventing splash/auth deadlock.

3. **Phase 9 diagnostics logging**
  - Added dev-only auth-guard state logging in `app/_layout.tsx`:
    - `pathname`, `segments`, `authLoading`, `idLoading`, `isAuthenticated`, `needsOnboarding`.
  - Added dev-only render logs in:
    - `app/(auth)/login.tsx` → `[LoginScreen] rendered`
    - `app/(auth)/signup.tsx` → `[SignupScreen] rendered`

#### ✅ Validation Completed

- Static diagnostics: no editor/type errors in changed files.
- Targeted tests: `npm run test:mobile -- lib/__tests__/auth-idempotency.test.ts` → **7/7 passing**.

#### ⏳ Remaining Manual Verification (Device/Environment)

1. **Cache/build reset**
  - `npx expo start --clear`

2. **Route verification**
  - Deep link/open `/(auth)/login` and confirm Google button is visible.
  - Confirm unauthenticated navigation always resolves to login from protected routes.

3. **OAuth environment verification**
  - Confirm `expo.scheme` is `clstr`.
  - Confirm Supabase redirect allowlist includes `clstr://auth/callback` and active dev callback URLs.
  - Confirm `expo-web-browser` linking behavior on Android/iOS physical device.

#### Guided Runtime Checklist Execution (2026-02-26)

Executed now during Phase 9 follow-through:

1. **Config preflight — app scheme**
  - Verified in `app.json`: `expo.scheme = "clstr"` ✅

2. **Callback route + deep-link handling**
  - Verified route exists: `app/auth/callback.tsx` ✅
  - Verified native intent mapping includes `auth/callback` → `/auth/callback` ✅
  - Verified callback flow handles both token and PKCE code paths (`setSession` + `exchangeCodeForSession`) ✅

3. **Expo cache-clear runtime boot**
  - Ran: `npx expo start --clear`
  - Result: Metro started successfully (`exp://127.0.0.1:8081`) ✅
  - No startup blockers related to auth routing found.

4. **Supabase redirect configuration audit**
  - `supabase/config.toml` currently has only localhost web callbacks in `additional_redirect_urls`.
  - `clstr://auth/callback` is **not present** in this local config snapshot ⚠️
  - Action required: add native callback URI(s) in Supabase project Auth redirect allowlist (dashboard/env-specific), including:
    - `clstr://auth/callback`
    - active dev callback URI used by current runtime profile (if applicable)

5. **Magic-link edge function callback default**
  - `supabase/functions/send-magic-link/index.ts` defaults to web callback (`https://clstr.network/auth/callback`) when `redirectTo` not provided.
  - Not a blocker for Google button visibility, but relevant for Phase 18 and should stay aligned with mobile redirect strategy.

#### Phase 9 Status

- **Engineering implementation**: ✅ Complete
- **Runtime environment verification**: ⏳ Pending manual check on target device/build profile

---

## Phase 10 — P1: Event Edit/Delete on Mobile

### Problem

Web `src/pages/Events.tsx` (1000+ lines) has full CRUD:
- **Create event** ✅ (mobile has `app/create-event.tsx`)
- **View events** ✅ (mobile has `app/(tabs)/events.tsx`)
- **View event detail** ✅ (mobile has `app/event/[id].tsx`)
- **Edit event** ❌ MISSING on mobile
- **Delete event** ❌ MISSING on mobile
- **RSVP toggle** ✅ (mobile has this)

Web uses `updateEvent()` and `deleteEvent()` from `src/lib/events-api.ts` (which re-export from `@clstr/core`).

### Implementation Plan

#### 10.1: Create Event Edit Screen

**File**: `app/event/edit/[id].tsx` (NEW — ~400 lines)  
**Source**: Web's `Events.tsx` L189-260 (edit dialog state) + L792-850 (handleUpdateEvent)

```
Screen flow:
1. Load event by ID using getEventById()
2. Pre-fill form with all event fields:
   - title, description, event_date, event_time, location
   - is_virtual, virtual_link, category, max_attendees, tags
   - external_registration_url
3. Permission check: only event creator OR admin can edit
   - Use useFeatureAccess().canCreateEvents + check event.created_by === user.id
4. Save via updateEvent() from @clstr/core (already available via withClient)
5. Navigate back to event detail on success
```

**Components needed**:
- Reuse the form from `create-event.tsx` — extract shared form into `components/EventForm.tsx`
- Date/time picker (already exists in create-event)
- Category picker (already exists in create-event)

#### 10.2: Add Delete Event Functionality

**File**: `app/event/[id].tsx` (MODIFY — add ~50 lines)

```
Changes:
1. Add "..." menu button in header (creator/admin only)
2. Menu options: "Edit Event" → navigate to edit screen, "Delete Event" → confirmation dialog
3. Delete uses deleteEvent() from @clstr/core
4. Confirmation: Alert.alert with destructive action
5. On delete: invalidate events query, navigate back to events list
```

#### 10.3: Create Event API Adapter (if not exists)

**File**: `lib/api/events.ts` (check if `updateEvent` and `deleteEvent` are exposed)

Currently `lib/api.ts` exports `getEvents`, `getEventById`, `toggleEventRegistration`. Need to add:
```typescript
export { updateEvent } from '@clstr/core/api/event-api';
export { deleteEvent } from '@clstr/core/api/event-api';
```

Or use `withClient` pattern:
```typescript
import { createEventApi } from '@clstr/core';
export const updateEvent = withClient(createEventApi.updateEvent);
export const deleteEvent = withClient(createEventApi.deleteEvent);
```

#### 10.4: Extract Shared EventForm Component

**File**: `components/EventForm.tsx` (NEW — ~300 lines)

Extracted from `app/create-event.tsx` to be reusable:
- All form fields (title, description, date, time, location, virtual toggle, category, etc.)
- Validation logic
- `onSubmit` callback prop
- Optional `initialValues` prop for edit mode

**Modify**: `app/create-event.tsx` to use `<EventForm />` instead of inline form  
**Use in**: `app/event/edit/[id].tsx`

### Permission Model

```
canEditEvent(event, userId, role):
  - event.created_by === userId → true
  - role === 'Organization' → true (club can edit its own events)
  - Otherwise → false

canDeleteEvent(event, userId, role):
  - Same as canEditEvent
```

### Estimated Effort: 6-8 hours

---

## Phase 11 — P2: Cover Photo Upload

### Problem

Web `src/components/profile/CoverPhotoUpload.tsx` (333 lines) allows users to upload a cover/banner photo on their profile. Mobile profile (`app/(tabs)/profile.tsx`) has no cover photo display or upload.

The `cover_photo_url` field already exists in the `profiles` table and in the TypeScript types (`@clstr/core/types/profile.ts` L121).

### Implementation Plan

#### 11.1: Create CoverPhoto Component

**File**: `components/CoverPhoto.tsx` (NEW — ~150 lines)

```
Props:
  - coverUrl: string | null
  - isEditable: boolean
  - profileId: string
  - onCoverUpdated: (url: string | null) => void

UI:
  - Full-width banner at top of profile (height: ~160px on mobile)
  - If no cover: gradient placeholder (dark gray → transparent)
  - If editable: camera icon overlay button in bottom-right corner
  - On press: ActionSheet with "Choose from Gallery" / "Remove Cover" options
  - Uses useFileUpload hook for image picking and Supabase storage upload
  - Upload to 'covers' bucket (or 'avatars' with 'covers/' prefix)
  - Update profiles table: supabase.from('profiles').update({ cover_photo_url })
```

#### 11.2: Integrate into Profile Screen

**File**: `app/(tabs)/profile.tsx` (MODIFY — ~30 lines added)

```
Changes:
1. Import CoverPhoto component
2. Add <CoverPhoto> above the profile header (avatar, name, headline)
3. Pass coverUrl from profile data
4. Pass isEditable = isCurrentUser
5. onCoverUpdated → invalidate profile query
```

#### 11.3: Integrate into User Profile Screen

**File**: `app/user/[id].tsx` (MODIFY — ~15 lines added)

```
Changes:
1. Display cover photo (read-only) for other users' profiles
2. No edit button for non-current-user profiles
```

#### 11.4: Storage Bucket Setup

```
Supabase Dashboard:
1. Ensure 'covers' bucket exists (or reuse 'avatars' with path prefix 'covers/')
2. RLS policy: insert/update for authenticated users on their own files
3. Public read access for display
```

### Estimated Effort: 4-6 hours

---

## Phase 12 — P2: ClubAuth + ClubOnboarding

### Problem

Web has two separate flows for club/faculty accounts:
1. **ClubAuth** (`src/pages/ClubAuth.tsx`, 719 lines) — Access-code-gated provisioning flow
2. **ClubOnboarding** (`src/pages/ClubOnboarding.tsx`, 669 lines) — Club-specific profile setup

These are entirely missing from mobile.

### Web ClubAuth Flow (719 lines)

```
1. User navigates to /club-auth
2. Enters a 6-digit access code
3. Code is verified against club_access_codes table
4. Session stores verification result with 30-min expiry
5. Role is determined from access code (Club, Faculty, Principal, Dean)
6. User creates account or links existing account
7. Profile is created with the verified role
8. Role integrity signature is stored for verification
```

### Web ClubOnboarding Flow (669 lines)

```
After ClubAuth succeeds:
1. Club name (pre-filled from access code if available)
2. University (autocomplete)
3. Category (dropdown: Academic, Cultural, Sports, Technical, Social, etc.)
4. Founding year
5. Bio/description
6. Interests/tags
7. Social links
8. Profile picture
9. Creates club_profiles record
```

### Implementation Plan

#### 12.1: Create ClubAuth Screen

**File**: `app/club-auth.tsx` (NEW — ~450 lines)  
**Source**: Web `ClubAuth.tsx`

```
Screen flow:
1. Welcome card — "Club & Faculty Access"
2. 6-digit access code input (OTP-style, 6 individual boxes)
3. Verify code against Supabase:
   - supabase.from('club_access_codes').select().eq('code', input).single()
4. On valid code:
   - Store verification in secure store (code, role, expiry = now + 30min)
   - Show success state with determined role badge
   - "Continue" button → navigate to onboarding or club-onboarding
5. On invalid: error message, retry
6. On expired: error + re-enter code

Components needed:
  - AccessCodeInput (6 digit OTP-style) — use TextInput with maxLength=6
  - RoleBadge display
  - Timer display for 30-min expiry
```

#### 12.2: Create ClubOnboarding Screen

**File**: `app/club-onboarding.tsx` (NEW — ~500 lines)  
**Source**: Web `ClubOnboarding.tsx`

```
Screen flow (step wizard, similar to student onboarding):
Step 0: Club Name (TextInput, required)
Step 1: University (Autocomplete, reuse from onboarding)
Step 2: Category (picker: Academic, Cultural, Sports, Technical, Social, Other)
Step 3: Founding Year (year picker)
Step 4: Description/Bio (TextArea)
Step 5: Interests/Tags (ChipPicker, reuse from onboarding)
Step 6: Social Links (reuse from onboarding)
Step 7: Profile Picture (AvatarPicker, reuse from onboarding)

On complete:
  - Create profiles record with role='Organization'
  - Create club_profiles record with club-specific fields
  - Mark onboarding_complete = true
  - Navigate to home
```

#### 12.3: Add ClubAuth Route to Root Layout

**File**: `app/_layout.tsx` (MODIFY — ~5 lines)

```
Add Stack.Screen entries:
  <Stack.Screen name="club-auth" options={{ headerShown: false }} />
  <Stack.Screen name="club-onboarding" options={{ headerShown: false }} />
```

#### 12.4: Update Auth Context for Club Flow

**File**: `lib/auth-context.tsx` (MODIFY — ~80 lines)

```
Add:
  - completeClubOnboarding(payload: ClubOnboardingPayload) method
  - ClubOnboardingPayload type (clubName, university, category, foundingYear, etc.)
  - Creates club_profiles record
  - Sets role to 'Organization' in profiles table
```

#### 12.5: Access Code Validation API

**File**: `lib/api/club-auth.ts` (NEW — ~60 lines)

```typescript
export async function validateAccessCode(code: string): Promise<{
  valid: boolean;
  role: string;
  collegeDomain?: string;
  clubName?: string;
}>;

export async function consumeAccessCode(code: string, userId: string): Promise<void>;
```

### Estimated Effort: 8-12 hours (most complex remaining feature)

---

## Phase 13 — P2: Advanced Network Filters

### Problem

Web `src/components/network/AdvancedFilters.tsx` provides filters for:
- **Role** (Student, Alumni, Faculty, Club)
- **Branch/Major** (free text or dropdown)
- **Graduation Year** (range or specific year)
- **Enrollment Year**

Mobile `app/(tabs)/network.tsx` only has basic typeahead search. No structured filters.

### Implementation Plan

#### 13.1: Create NetworkFilters Component

**File**: `components/NetworkFilters.tsx` (NEW — ~250 lines)

```
UI: Horizontal ScrollView of filter chips + expandable bottom sheet

Filter chips (horizontal scroll):
  - "Role ▾" → bottom sheet with checkboxes (Student, Alumni, Faculty, Club)
  - "Branch ▾" → bottom sheet with text search + common options
  - "Year ▾" → bottom sheet with year range picker
  - "Clear All" chip (appears when any filter active)

State:
  interface NetworkFilters {
    roles?: string[];          // ['Student', 'Alumni']
    branch?: string;           // 'Computer Science'
    graduationYearMin?: number;
    graduationYearMax?: number;
    enrollmentYear?: number;
  }

Filtering:
  - Applied client-side on the fetched network users array
  - OR passed as query params to the Supabase query
```

#### 13.2: Create FilterBottomSheet Component

**File**: `components/FilterBottomSheet.tsx` (NEW — ~150 lines)

Reusable bottom sheet for filter selection:
- Uses `@gorhom/bottom-sheet` or plain `Modal` with `Animated` slide-up
- Content slot for different filter types (checkbox list, text input, year picker)
- Apply/Clear buttons at bottom

#### 13.3: Integrate into Network Screen

**File**: `app/(tabs)/network.tsx` (MODIFY — ~60 lines)

```
Changes:
1. Import NetworkFilters component
2. Add <NetworkFilters> below search bar
3. Wire filter state to existing useQuery queryFn
4. Update Supabase query to apply filters:
   - .in('role', filters.roles)  
   - .ilike('branch', `%${filters.branch}%`)
   - .gte('graduation_year', filters.graduationYearMin)
   - .lte('graduation_year', filters.graduationYearMax)
```

### Estimated Effort: 4-6 hours

---

## Phase 14 — P2: Peer Comparison in Skill Analysis

### Problem

Web `src/pages/SkillAnalysis.tsx` has a "Peer Comparison" section (L463-510) that shows:
- Average skill scores of peers in the same major/university
- Bar chart comparing the user's skills vs campus average
- Available only for Students (`canViewPeerComparison` from `useFeatureAccess`)

Mobile `app/skill-analysis.tsx` has skill bars and distribution but NO peer comparison section.

### Implementation Plan

#### 14.1: Add Peer Comparison Section

**File**: `app/skill-analysis.tsx` (MODIFY — ~100 lines added)

```
Add after the existing DistributionSection:

1. Permission check: 
   const { canViewPeerComparison } = useFeatureAccess();

2. Fetch peer data:
   - The skill analysis API in @clstr/core already returns peer_comparison data
   - Check if useSkillAnalysis hook returns peerData

3. UI:
   - Section header: "Peer Comparison" with info tooltip
   - For each skill: side-by-side bars
     - Left bar (user's score, colored)
     - Right bar (campus average, muted gray)
     - Label: skill name + "You: 75% | Avg: 62%"
   - Empty state: "Not enough data for comparison"

4. Role gate:
   - Only show for Students (canViewPeerComparison === true)
   - Alumni/Faculty/Club: hide section entirely
```

#### 14.2: Verify Skill Analysis API Returns Peer Data

**File**: Check `packages/core/src/api/skill-analysis-api.ts`

The peer comparison data should already be returned by the `getSkillAnalysis()` RPC. Verify the response shape includes:
```typescript
peer_comparison?: {
  campus_avg_scores: Record<string, number>;
  percentile: number;
  peer_count: number;
}
```

If not present in the RPC response, the peer comparison may need a separate RPC call or Supabase edge function.

### Estimated Effort: 3-4 hours

---

## Phase 15 — P3: Portfolio Template Picker

### Problem

Web has `src/pages/PortfolioTemplatePicker.tsx` (not yet audited) that lets users choose a portfolio layout template before editing. Mobile route `app/portfolio-template-picker.tsx` exists but may be a stub.

### Implementation Plan

#### 15.1: Verify Current Mobile State

**Check**: Read `app/portfolio-template-picker.tsx` to see if it's implemented or a stub.

#### 15.2: Implement Template Picker

**File**: `app/portfolio-template-picker.tsx` (NEW or REWRITE — ~300 lines)

```
Flow:
1. Grid of 3-4 template previews (image cards)
2. Each template has a name & description
3. On select: save template choice to profile.portfolio_template
4. Navigate to portfolio-editor with selected template

Templates:
  - "Classic" — standard resume-style layout
  - "Modern" — card-based, accent colors
  - "Minimal" — clean, text-focused
  - "Creative" — full-width sections, project showcase focus

Each template is a style configuration, not a separate component.
```

### Estimated Effort: 4-6 hours

---

## Phase 16 — P3: Job Application & Posting Dialogs

### Problem

Web has:
- `src/components/jobs/JobApplicationDialog.tsx` — Apply to a job with cover letter + resume upload
- `src/components/jobs/JobPostingDialog.tsx` — Post a new job listing (for employers/alumni)

Mobile `app/jobs.tsx` and `app/job/[id].tsx` display jobs but have no apply or post flows.

### Implementation Plan

#### 16.1: Create Job Application Screen

**File**: `app/job/apply/[id].tsx` (NEW — ~350 lines)

```
Screen flow:
1. Job title + company header (read-only)
2. Cover letter TextInput (multiline, optional)
3. Resume upload button (PDF via DocumentPicker or image via ImagePicker)
   - expo-document-picker for PDF files
   - Upload to Supabase storage 'resumes' bucket
4. Contact email (pre-filled from profile)
5. Submit button → create job_applications record
6. Success state → navigate back to job detail
```

#### 16.2: Create Job Posting Screen

**File**: `app/create-job.tsx` (NEW — ~400 lines)

```
Screen flow:
1. Job title (required)
2. Company name (required, pre-fill from profile if alumni/org)
3. Job type picker (Full-time, Part-time, Internship, Contract, Remote)
4. Location (TextInput, optional for remote)
5. Description (multiline TextInput)
6. Requirements (multiline TextInput)
7. Salary range (optional, two number inputs)
8. Application deadline (date picker)
9. External application URL (optional)
10. Submit → create jobs record
11. Permission gate: only Alumni + Organization roles
```

#### 16.3: Add Apply Button to Job Detail

**File**: `app/job/[id].tsx` (MODIFY — ~30 lines)

```
Add "Apply" button at bottom of job detail:
  - If already applied: show "Applied ✓" badge (disabled)
  - If external URL: open in browser
  - Otherwise: navigate to app/job/apply/[id]
```

#### 16.4: Add "Post Job" FAB/Button

**File**: `app/jobs.tsx` (MODIFY — ~20 lines)

```
Add floating action button or header button for posting a new job:
  - Only visible for Alumni + Organization roles
  - Navigate to app/create-job
```

### Dependencies:
```bash
npx expo install expo-document-picker
```

### Estimated Effort: 6-8 hours

---

## Phase 17 — P3: Share & Repost Modals

### Problem

Web has:
- `src/components/home/ShareModal.tsx` — Share post via link/clipboard/social
- `src/components/home/RepostModal.tsx` — Quote-repost with comment
- `src/components/events/EventShareModal.tsx` — Share event

Mobile has basic native share via `Share.share()` but no integrated share/repost UI.

### Implementation Plan

#### 17.1: Create ShareSheet Component

**File**: `components/ShareSheet.tsx` (NEW — ~180 lines)

```
Reusable bottom sheet for sharing any content:

Props:
  - visible: boolean
  - onClose: () => void
  - shareUrl: string
  - shareTitle: string
  - shareMessage: string

Actions:
  - "Copy Link" — Clipboard.setStringAsync(shareUrl)
  - "Share via..." — Share.share({ url, title, message }) (native share sheet)
  - "Share to Messages" — navigate to new-conversation with pre-filled message

Uses native Share API — no need for platform-specific social SDKs.
```

#### 17.2: Create RepostSheet Component

**File**: `components/RepostSheet.tsx` (NEW — ~200 lines)

```
Bottom sheet for quote-reposting:

Props:
  - visible: boolean
  - onClose: () => void
  - originalPost: Post
  - onRepost: (comment: string) => void

UI:
  - Preview of original post (compact card)
  - TextInput for quote comment
  - "Repost" button
  - Creates new post with repost_of = originalPost.id
```

#### 17.3: Integrate into Post Cards

**File**: Update post card components to use ShareSheet + RepostSheet  
**File**: `app/post/[id].tsx` (MODIFY) — add share/repost buttons  
**File**: `app/(tabs)/index.tsx` (MODIFY) — wire PostCard share/repost actions

### Estimated Effort: 4-6 hours total

---

## Phase 18 — P3: Magic Link Edge Function

### Problem

Web uses the `send-magic-link` Supabase edge function to bypass Supabase's auth rate limits (4 emails/hour default). Mobile uses `signInWithOtp` directly, which hits the rate limit.

### Implementation Plan

#### 18.1: Update signInWithOtp to Use Edge Function

**File**: `lib/auth-context.tsx` (MODIFY — ~20 lines)

```typescript
// Current:
const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } });

// Updated:
const { data, error } = await supabase.functions.invoke('send-magic-link', {
  body: { email, redirectTo: emailRedirectTo },
});
if (error || data?.error) throw new Error(data?.error || error.message);
```

#### 18.2: Verify Edge Function Accepts Mobile Redirect

Check that the `send-magic-link` edge function supports the `clstr://auth/callback` redirect URL (not just web URLs).

**File**: `supabase/functions/send-magic-link/index.ts` — verify redirect URL validation

### Estimated Effort: 2-3 hours

---

## Phase 19 — P3: Feed Create-Post Card + Trending

### Problem

Web Feed has:
1. **CreatePostCard** — inline "What's on your mind?" composer at top of feed
2. **TrendingTopics** — sidebar showing campus trending hashtags/topics

Mobile feed has a sort toggle and basic post list but no inline composer or trending.

### Implementation Plan

#### 19.1: Create Inline Post Composer Card

**File**: `components/CreatePostCard.tsx` (NEW — ~120 lines)

```
UI:
  - Compact card at top of feed FlatList (ListHeaderComponent)
  - User avatar (left) + "What's on your mind?" placeholder (center-right)
  - On press: navigate to create-post screen
  - Optional: media/image attachment icons below
  - Dark glass-morphic card matching feed card style
```

#### 19.2: Integration into Feed

**File**: `app/(tabs)/index.tsx` (MODIFY — ~15 lines)

```
Add as FlatList ListHeaderComponent:
  <CreatePostCard 
    avatarUrl={profile?.avatar_url}
    onPress={() => router.push('/create-post')}
  />
```

#### 19.3: Trending Topics (Optional — Desktop Feature)

The web's TrendingTopics is a sidebar widget that only appears on desktop (3-column layout). On mobile, trending topics could be:
- A horizontal ScrollView of topic chips below the composer card
- Filtered from post hashtags via Supabase query

**Recommendation**: Skip for initial mobile release — this is a desktop layout feature. If wanted, implement as a collapsible "Trending" section in the search screen (`app/search.tsx`) instead.

### Estimated Effort: 3-4 hours (composer card only, skip trending)

---

## Full Feature Parity Matrix

| Web Feature | Mobile Status | Phase | Priority |
|---|---|---|---|
| **AUTH** | | | |
| Google OAuth login | ✅ Complete | 0-1 | — |
| Google OAuth signup | ✅ Complete | 0-1 | — |
| Magic link signup | ✅ Complete (direct OTP) | 0-1 / 18 | P3 upgrade |
| Academic email validation | ✅ Complete | 1 | — |
| Auth callback (full validation) | ✅ Complete | 1 | — |
| AcademicEmailRequired screen | ✅ Complete | 1 | — |
| ClubAuth (access code) | ❌ Missing | 12 | P2 |
| ClubOnboarding | ❌ Missing | 12 | P2 |
| Password reset flow | ✅ Complete | 4 | — |
| **ONBOARDING** | | | |
| 8-step student onboarding | ✅ Complete | 2 | — |
| Auto-role determination | ✅ Complete | 2 | — |
| Avatar upload | ✅ Complete | 2 | — |
| University/major autocomplete | ✅ Complete | 2 | — |
| **FEED** | | | |
| Post list + realtime | ✅ Complete | 6 | — |
| Sort toggle (Recent/Top) | ✅ Complete | 6 | — |
| Inline create-post card | ❌ Missing | 19 | P3 |
| Post detail view | ✅ Exists | — | — |
| Post share modal | ❌ Missing | 17 | P3 |
| Post repost/quote | ❌ Missing | 17 | P3 |
| Trending topics sidebar | ❌ Skip (desktop) | — | — |
| Profile summary sidebar | ❌ Skip (desktop) | — | — |
| **PROFILE** | | | |
| Profile view (own + others) | ✅ Complete | 6 | — |
| Edit profile (all fields) | ✅ Complete | — | — |
| Cover photo upload | ❌ Missing | 11 | P2 |
| Social links display | ✅ Complete | 6 | — |
| Profile stats (connections, views, posts) | ✅ Complete | 6 | — |
| Portfolio banner link | ✅ Complete | 6 | — |
| **EVENTS** | | | |
| Event list + categories | ✅ Complete | 6 | — |
| Event detail | ✅ Complete | — | — |
| Create event | ✅ Complete | — | — |
| Edit event | ❌ Missing | 10 | P1 |
| Delete event | ❌ Missing | 10 | P1 |
| RSVP toggle | ✅ Complete | — | — |
| Event search | ✅ Complete | 6 | — |
| Event share modal | ❌ Missing | 17 | P3 |
| **NETWORK** | | | |
| Discover + search | ✅ Complete | 6 | — |
| Connection requests | ✅ Complete | — | — |
| My connections list | ✅ Complete | 4 | — |
| Advanced filters (role/branch/year) | ❌ Missing | 13 | P2 |
| **MESSAGING** | | | |
| Conversations list | ✅ Complete | 6 | — |
| Chat view + realtime | ✅ Complete | — | — |
| Conversation search | ✅ Complete | 6 | — |
| New conversation | ✅ Complete | — | — |
| **JOBS** | | | |
| Job listings + filters | ✅ Complete | 6 | — |
| Job detail | ✅ Complete | — | — |
| Job application dialog | ❌ Missing | 16 | P3 |
| Job posting dialog | ❌ Missing | 16 | P3 |
| **SKILL ANALYSIS** | | | |
| Skill bars + distribution | ✅ Complete | 6 | — |
| Focus areas / gap analysis | ✅ Complete | 6 | — |
| Peer comparison | ❌ Missing | 14 | P2 |
| **PORTFOLIO** | | | |
| Portfolio view | ✅ Complete | 6 | — |
| Portfolio editor | ✅ Complete | 4 | — |
| Portfolio template picker | ❌ Missing | 15 | P3 |
| **OTHER** | | | |
| Settings (all tabs) | ✅ Complete | 6 | — |
| Email transition | ✅ Complete | 6 | — |
| Account deactivation | ✅ Complete | 6 | — |
| Push notifications | ✅ Complete | — | — |
| Help center | ✅ Complete | 4 | — |
| Alumni directory + filters | ✅ Complete | 6 | — |
| Alumni invite claim | ✅ Complete | 4 | — |
| Clubs browser | ✅ Exists | — | — |
| Projects browser | ✅ Complete | 6 | — |
| EcoCampus | ✅ Exists | — | — |
| Mentorship | ✅ Exists | — | — |
| AI Chat | ✅ Exists | — | — |
| Search (multi-category) | ✅ Exists | — | — |
| Saved items | ✅ Exists | — | — |
| **ADMIN** | 🚫 Intentionally skipped | — | — |
| Landing page | 🚫 N/A (mobile has auth screens) | — | — |
| Public SEO pages | 🚫 N/A (native app) | — | — |
| PWA install prompt | 🚫 N/A (native app) | — | — |

---

## UI Audit: Remaining Mismatches

| Element | Web | Mobile | Action |
|---|---|---|---|
| Cover photo banner | 200px gradient/image banner | Not present | Phase 11 |
| Event action buttons | Edit/Delete in detail view | Only RSVP + Share | Phase 10 |
| Network filter chips | Role, Branch, Year dropdowns | Only search bar | Phase 13 |
| Skill peer comparison | Side-by-side bar chart | Not present | Phase 14 |
| Job apply button | Dialog with cover letter + resume | Not present | Phase 16 |
| Post share button | Modal with link/social options | Basic `Share.share()` | Phase 17 |
| Feed composer | Inline card at top | Navigate to create-post (button exists) | Phase 19 |
| Font: Space Grotesk | Headings use Space Grotesk | Inter only | ✅ Acceptable for mobile |
| Border radius | `rounded-xl` = 12px | 16px on some cards | Minor — leave as-is |

---

## Logic Audit: Remaining Inconsistencies

| Area | Web Behavior | Mobile Behavior | Fix Phase |
|---|---|---|---|
| Magic link delivery | Edge function `send-magic-link` (bypasses rate limits) | `signInWithOtp` (hits 4/hr default) | 18 |
| Event CRUD | Full create/read/update/delete | Create + read only | 10 |
| Club provisioning | Access-code-gated flow with 30-min expiry | Not available | 12 |
| Network filtering | Structured role/branch/year filters | Text search only | 13 |
| Job applications | Apply with cover letter + resume | View only | 16 |
| Post sharing | Custom modal with link/clipboard/social | Native `Share.share()` only | 17 |
| Peer comparison | Campus-wide skill percentiles | Not shown | 14 |

---

## Sprint Plan (Remaining Work)

### Sprint 6 (Week 5) — P0 + P1: Auth Debug + Event CRUD
| # | Task | Est. Hours | Priority |
|---|---|---|---|
| 9.x | Debug auth flow (Google button visibility) | 2-4 | P0 |
| 10.1 | Extract EventForm shared component | 3 | P1 |
| 10.2 | Create event edit screen | 3 | P1 |
| 10.3 | Add delete + edit actions to event detail | 2 | P1 |
| | **Sprint 6 Total** | **10-12 hrs** | |

### Sprint 7 (Week 5-6) — P2: Profile + Permissions
| # | Task | Est. Hours | Priority |
|---|---|---|---|
| 11.1 | Create CoverPhoto component | 3 | P2 |
| 11.2 | Integrate cover photo into profile screens | 2 | P2 |
| 13.1 | Create NetworkFilters component | 3 | P2 |
| 13.2 | Create FilterBottomSheet component | 2 | P2 |
| 13.3 | Integrate filters into network screen | 1 | P2 |
| 14.1 | Add peer comparison to skill analysis | 3 | P2 |
| | **Sprint 7 Total** | **14 hrs** | |

### Sprint 8 (Week 6-7) — P2: Club Flow
| # | Task | Est. Hours | Priority |
|---|---|---|---|
| 12.1 | Create ClubAuth screen | 5 | P2 |
| 12.2 | Create ClubOnboarding screen | 5 | P2 |
| 12.3 | Add routes to root layout | 0.5 | P2 |
| 12.4 | Update auth context for club flow | 2 | P2 |
| 12.5 | Create club-auth API adapter | 1 | P2 |
| | **Sprint 8 Total** | **13.5 hrs** | |

### Sprint 9 (Week 7-8) — P3: Polish + Missing Flows
| # | Task | Est. Hours | Priority |
|---|---|---|---|
| 15.1 | Portfolio template picker | 4 | P3 |
| 16.1 | Job application screen | 4 | P3 |
| 16.2 | Job posting screen | 4 | P3 |
| 17.1 | ShareSheet component | 2 | P3 |
| 17.2 | RepostSheet component | 2 | P3 |
| 18.1 | Magic link edge function upgrade | 2 | P3 |
| 19.1 | CreatePostCard component | 2 | P3 |
| | **Sprint 9 Total** | **20 hrs** | |

---

## Total Remaining Effort

| Sprint | Hours | Priority |
|---|---|---|
| Sprint 6: Auth Debug + Event CRUD | 10-12 | P0+P1 |
| Sprint 7: Profile + Permissions | 14 | P2 |
| Sprint 8: Club Flow | 13.5 | P2 |
| Sprint 9: Polish + Missing Flows | 20 | P3 |
| **TOTAL REMAINING** | **~58-66 hrs** | |

---

## Dependencies to Install (New)

```bash
npx expo install expo-document-picker  # For job application resume upload (Phase 16)
```

All other dependencies are already installed from prior phases.

---

## Testing Requirements

### New Tests Needed

| Test Suite | Covers | Est. Tests |
|---|---|---|
| `event-crud.test.ts` | Event edit/delete API + permission checks | 8-10 |
| `cover-photo.test.ts` | Cover photo upload + display | 4-6 |
| `club-auth.test.ts` | Access code validation + expiry | 6-8 |
| `club-onboarding.test.ts` | Club profile creation + validation | 6-8 |
| `network-filters.test.ts` | Filter application + clear | 4-6 |
| `peer-comparison.test.ts` | Data display + role gating | 3-4 |
| `job-application.test.ts` | Apply flow + resume upload | 4-6 |
| `share-repost.test.ts` | Share link generation + repost creation | 4-6 |
| **Total** | | **~39-54 tests** |

Combined with existing 119 tests → target: **~158-173 tests total**.

---

## File Impact Summary

| Action | Count | Key Files |
|---|---|---|
| **NEW screens** | 6 | `event/edit/[id].tsx`, `club-auth.tsx`, `club-onboarding.tsx`, `job/apply/[id].tsx`, `create-job.tsx`, portfolio-template-picker |
| **NEW components** | 7 | `CoverPhoto.tsx`, `EventForm.tsx`, `NetworkFilters.tsx`, `FilterBottomSheet.tsx`, `ShareSheet.tsx`, `RepostSheet.tsx`, `CreatePostCard.tsx` |
| **NEW API adapters** | 1 | `lib/api/club-auth.ts` |
| **MODIFY screens** | 8 | `event/[id].tsx`, `(tabs)/profile.tsx`, `user/[id].tsx`, `(tabs)/network.tsx`, `skill-analysis.tsx`, `jobs.tsx`, `job/[id].tsx`, `(tabs)/index.tsx` |
| **MODIFY infra** | 3 | `_layout.tsx`, `auth-context.tsx`, `create-event.tsx` |
| **NEW test files** | 8 | See testing section |

---

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Google OAuth redirect not configured in Supabase | **Critical** | Phase 9: verify `clstr://auth/callback` is in Supabase URL config |
| expo-web-browser not returning on Android | Medium | Test on physical device; fallback to `Linking.openURL` for in-app-browser issues |
| Magic link OTP rate limiting | Medium | Phase 18: switch to edge function like web |
| Club access codes table doesn't exist | Medium | Phase 12: verify table exists before building UI |
| Cover photo storage bucket RLS | Low | Phase 11: set up bucket policies |
| Document picker not working on all devices | Low | Phase 16: graceful fallback to image-only upload |

---

## Quick Reference: Screen Count

| Category | Before V2 | After V2 |
|---|---|---|
| Auth screens | 7 | 9 (+club-auth, +club-onboarding) |
| Tab screens | 6 | 6 (unchanged) |
| Standalone screens | 18 | 21 (+create-job, +event/edit/[id], +job/apply/[id]) |
| Dynamic route screens | 8 | 8 (unchanged) |
| **Total** | **39** | **44** |
