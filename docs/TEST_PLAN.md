# Clstr React Native — Feature & Stability Test Plan

**Date:** 2026-02-22  
**Version:** 2.0 — Chaos/Stability Edition  
**Purpose:** One-by-one feature testing + production hardening. **Completion ≠ Stability.**  
**How to use:** Work through each section sequentially. Mark each test ✅ Pass / ❌ Fail / ⏭️ Skip.  
**Philosophy:** Feature parity is meaningless if it's not stable, secure, and performant on real devices.

---

## 🗺️ EXECUTION ROADMAP: DIVIDING THE STRESS

Do not try to test all 367 items at once. Use this phase-wise execution strategy to implement, test, harden, and fix in manageable chunks.

### 🏁 Sprint 1: The Vault (Identity & Security)
*Focus: If auth or security is broken, nothing else matters.*
1. **Implement & Test:** Phase 0 (Foundation) + Phase 1 (Auth) + Phase 4 (Roles & RBAC)
2. **Harden:** Phase 12 (Auth Teardown Audit) + Phase 13 (RLS Security Audit)
3. **Fix:** Ensure nuclear logout works, no ghost sessions, and Postman attacks fail.

### 🏁 Sprint 2: The Engine (Core Loop & Performance)
*Focus: The 90% use-case (Feed, Profile, Navigation) must be buttery smooth.*
1. **Implement & Test:** Phase 2 (Core Screens) + Phase 5 (Navigation) + Phase 6 (UI Polish)
2. **Harden:** Phase 14 (Performance Profiling) + Phase 15 (Design System Drift)
3. **Fix:** Flipper JS thread ≥55 FPS, render counts stable, UI matches web tokens.

### 🏁 Sprint 3: The Network (Realtime & Chaos)
*Focus: Chat and Notifications must survive bad WiFi and rapid tapping.*
1. **Implement & Test:** Phase 3 (Realtime) + Phase 9 (Messaging & Notifications only)
2. **Harden:** Phase 11 (Chaos Testing)
3. **Fix:** Airplane mode recovery, no duplicate messages, no infinite reconnect loops.

### 🏁 Sprint 4: The Polish (Parity & Deep Links)
*Focus: Advanced features and cross-platform intent.*
1. **Implement & Test:** Phase 8 (Additional Features) + Phase 9 (Advanced Features)
2. **Harden:** Phase 10 (Backend Parity Audit) + Phase 16 (Deep Link Intent)
3. **Fix:** Replace direct Supabase queries in `mentorship.ts` with `@clstr/core`. Ensure logged-out deep links survive the auth flow.

### 🏁 Sprint 5: The Filter (V1 Cut & Launch)
*Focus: Trimming the fat for a stable V1 release.*
1. **Implement & Test:** Phase 7 (Performance) + Phase 17 (Platform & Accessibility)
2. **Harden:** Phase 18 (V1 Strategic Focus Audit)
3. **Fix:** Defer unstable features (AI Chat, EcoCampus) to V2. Ensure core loop is P0-bug free.

---

## Prerequisites

Before testing, ensure:
- [ ] `.env` has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] Run `bun install` (or `npm install`)
- [ ] Build a dev client via EAS (`eas build --profile development --platform android/ios`) — **NOT Expo Go**
- [ ] Have at least 2 test accounts (different roles: Student, Faculty/Alumni)
- [ ] Have a second device or emulator for realtime tests
- [ ] Have a **low-end Android device** (3GB RAM, budget chipset) for performance tests
- [ ] Have Flipper installed for JS thread profiling
- [ ] Have Postman or `curl` ready for direct API security tests
- [ ] Run `grep -R "\['" app/` before testing to zero-out manual query key arrays

---

## PHASE 0 — Foundation

### F0.1: Supabase Client Connection
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 1 | App connects to Supabase | Launch app → check console logs | No `SUPABASE_URL missing` or connection errors | ☐ |
| 2 | SecureStore token storage | Log in → kill app → reopen | Session restored, no login screen shown | ☐ |
| 3 | API adapter layer works | Navigate to Feed → observe network | Real posts loaded (not mock/seed data) | ☐ |

### F0.2: Mock Layer Removal
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 4 | No seed data visible | Browse Feed, Messages, Network | All data comes from Supabase (no "John Doe" seed users) | ☐ |
| 5 | No DataProvider errors | Check console for `DataProvider` or `storage.ts` warnings | Only deprecation notices, no runtime errors | ☐ |

---

## PHASE 1 — Authentication

### F1.1: Email/Password Login
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 6 | Successful login | Enter valid email + password → tap Login | Redirected to Feed (Home tab) | ☐ |
| 7 | Invalid credentials | Enter wrong password → tap Login | Error message shown, stays on login screen | ☐ |
| 8 | Empty fields validation | Tap Login with empty email/password | Validation error shown | ☐ |
| 9 | Double-tap idempotency | Rapidly tap Login twice | Only one auth request sent, no duplicate errors | ☐ |

### F1.2: Email/Password Signup
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 10 | Successful signup | Enter new email + password → tap Sign Up | Redirected to verify email or onboarding | ☐ |
| 11 | Duplicate email | Enter existing email → tap Sign Up | Error: "Email already registered" or similar | ☐ |
| 12 | Weak password | Enter < 6 char password → Sign Up | Validation error about password requirements | ☐ |

### F1.3: Magic Link (OTP)
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 13 | Send magic link | Enter email → tap "Sign in with magic link" | Navigate to magic-link-sent screen | ☐ |
| 14 | Magic link deep link | Tap link in email | App opens, `clstr://auth/callback` handled, user logged in | ☐ |
| 15 | Expired magic link | Wait > 1hr, tap old link | Error message, redirect to login | ☐ |

### F1.4: Forgot Password
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 16 | Send reset email | Login → "Forgot password?" → enter email → Submit | Success message, reset email sent | ☐ |
| 17 | Non-existent email | Enter unknown email → Submit | Generic success (no user enumeration) | ☐ |

### F1.5: Session Persistence
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 18 | Kill + reopen | Log in → force kill app → reopen | Auto-logged in, Feed shown (no login screen) | ☐ |
| 19 | Background 10 min | Log in → background app 10 min → foreground | Session valid, data refreshed | ☐ |
| 20 | Token refresh | Stay logged in for > 1hr | No surprise logouts; session refreshed silently | ☐ |

### F1.6: Onboarding (4-Step)
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 21 | New user sees onboarding | Sign up new account | Redirected to onboarding, not Feed | ☐ |
| 22 | Step 1: Name | Enter first + last name → Next | Progresses to Step 2 | ☐ |
| 23 | Step 2: Role selection | Select Student/Faculty/Alumni → Next | Progresses to Step 3 | ☐ |
| 24 | Step 3: Department | Enter department info → Next | Progresses to Step 4 | ☐ |
| 25 | Step 4: Bio | Enter bio → Complete | Profile created, redirected to Feed | ☐ |
| 26 | Skip optional steps | Leave bio blank → Complete | Profile created with minimal data | ☐ |

### F1.7: Auth Guard (Navigation)
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 27 | Unauthenticated redirect | Open app without login → try `/` | Redirected to login screen | ☐ |
| 28 | Incomplete onboarding redirect | Login with account missing profile | Redirected to onboarding screen | ☐ |
| 29 | Sign out | Profile → Settings → Sign Out | Returned to login, session cleared | ☐ |

### F1.8: Email Verification
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 30 | Verify email screen shown | After signup → verify email screen | Shows "Check your email" message | ☐ |
| 31 | Verification link works | Click link in verification email | Email verified, proceed to onboarding/feed | ☐ |

---

## PHASE 2 — Core Screens (Live Data)

### F2.1: Feed Screen
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 32 | Feed loads real posts | Navigate to Home tab | Posts displayed with author, content, timestamps | ☐ |
| 33 | Pull-to-refresh | Pull down on Feed | Spinner shown, fresh data loaded | ☐ |
| 34 | Empty feed | New account with no connections/posts | Empty state message shown (not crash) | ☐ |
| 35 | Post card layout | View any post | Shows avatar, name, role badge, content, reaction bar | ☐ |

### F2.2: Post Reactions
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 36 | Add reaction | Tap a reaction emoji on post | Reaction count increments, emoji highlighted | ☐ |
| 37 | Remove reaction | Tap same reaction again | Reaction count decrements, un-highlighted | ☐ |
| 38 | Multiple reaction types | Try all 7 reaction types on same post | Each type toggles independently | ☐ |

### F2.3: Post Comments
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 39 | View comments | Tap post → Post Detail | Comments loaded under post content | ☐ |
| 40 | Add comment | Type comment → Send | Comment appears in list, count updates | ☐ |
| 41 | Empty comments | View post with no comments | Empty state shown, input still available | ☐ |

### F2.4: Post Detail Screen
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 42 | Navigate to detail | Tap post in Feed | Full post detail loads with comments | ☐ |
| 43 | Back navigation | Tap back button on post detail | Returns to Feed at same scroll position | ☐ |
| 44 | Keyboard avoiding | Tap comment input | Keyboard appears, input stays visible | ☐ |

### F2.5: Messages — Conversation List
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 45 | Conversations load | Navigate to Messages tab | List of conversations with last message | ☐ |
| 46 | Unread indicator | Receive message → view conversation list | Unread conversation shows bold/indicator | ☐ |
| 47 | Empty conversations | New account with no messages | Empty state shown | ☐ |

### F2.6: Chat Screen
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 48 | Open chat | Tap conversation | Chat screen loads with message history | ☐ |
| 49 | Send message | Type message → Send | Message appears in chat, input clears | ☐ |
| 50 | Messages marked read | Open chat with unread messages | Unread count resets for that conversation | ☐ |
| 51 | Chat scroll | Chat with many messages | Scrolls to latest, can scroll up for history | ☐ |

### F2.7: Network Screen
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 52 | Connections tab | Navigate to Network tab | My connections listed with avatars/badges | ☐ |
| 53 | Pending requests | View Pending section | Incoming requests shown with Accept/Reject | ☐ |
| 54 | Accept connection | Tap Accept on pending request | Request removed from pending, added to connections | ☐ |
| 55 | Reject connection | Tap Reject on pending request | Request removed from pending list | ☐ |
| 56 | Send connection request | Visit user profile → Send Request | Request sent, button changes to "Pending" | ☐ |

### F2.8: Events Screen
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 57 | Events list loads | Navigate to Events (via header icon) | Events shown with date, title, location | ☐ |
| 58 | Category filter | Tap category chips | Events filtered by selected category | ☐ |
| 59 | Event detail | Tap event | Full event detail loads | ☐ |
| 60 | RSVP toggle | Tap RSVP on event detail | Registration toggled, button state changes | ☐ |

### F2.9: Profile Screen
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 61 | Own profile loads | Navigate to Profile tab | Your profile data (name, bio, role, avatar) | ☐ |
| 62 | Other user profile | Tap user avatar → `/user/:id` | Other user's profile loads with connection status | ☐ |
| 63 | Mutual connections | View other user's profile | Mutual connection count displayed | ☐ |

### F2.10: Notifications Screen
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 64 | Notifications load | Tap bell icon → Notifications | List of notifications grouped by date | ☐ |
| 65 | Mark single read | Tap a notification | Notification marked as read, navigates to context | ☐ |
| 66 | Mark all read | Tap "Mark all as read" | All notifications marked read | ☐ |

---

## PHASE 3 — Realtime & Lifecycle

### F3.1: Realtime Messages
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 67 | Live message delivery | Send message from Device B to Device A | Message appears on Device A without manual refresh | ☐ |
| 68 | Conversation list updates | Receive new message on Messages tab | Conversation moves to top with latest message preview | ☐ |
| 69 | Active chat realtime | Both users in same chat → one sends | Message appears instantly on other device | ☐ |

### F3.2: Realtime Feed
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 70 | New posts banner | User B creates post while User A on Feed | "New posts available" banner appears on User A's Feed | ☐ |
| 71 | Banner tap refreshes | Tap "New posts available" banner | Feed refreshes, banner dismisses, new post visible | ☐ |
| 72 | Own post no banner | Create post yourself | Post appears without "new posts" banner | ☐ |

### F3.3: Realtime Notifications
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 73 | Badge count updates | Trigger notification (e.g., send connection request) | Notification bell badge count increments | ☐ |
| 74 | Badge resets on view | Navigate to Notifications screen | Badge count resets to 0 | ☐ |
| 75 | Tab bar badge | Receive notification while on Feed | Tab bar bell icon shows badge | ☐ |

### F3.4: Realtime Reconnection
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 76 | Airplane mode recovery | Enable airplane mode 30s → disable | Realtime reconnects, pending messages arrive | ☐ |
| 77 | Background → foreground | Background app 5 min → foreground | Session refreshed, stale caches invalidated, realtime reconnected | ☐ |
| 78 | WiFi switch | Switch from WiFi to cellular | Realtime channels recover | ☐ |

### F3.5: AppState Lifecycle
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 79 | Foreground session check | Background app > 5 min → resume | Token refreshed proactively (no auth errors) | ☐ |
| 80 | Cache invalidation on resume | Background → foreground | Conversations, notifications, unread counts refreshed | ☐ |

---

## PHASE 4 — Role System & Permissions

### F4.1: Student Role
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 81 | Student sees create post | Login as Student → Feed | Create post button visible | ☐ |
| 82 | Student no create event | Login as Student → Events | No "Create Event" button | ☐ |
| 83 | Student profile menu | Login as Student → Profile menu | Jobs, Skill Analysis visible; Mentorship may vary | ☐ |

### F4.2: Faculty Role
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 84 | Faculty sees create event | Login as Faculty → Events | "Create Event" button visible | ☐ |
| 85 | Faculty profile menu | Login as Faculty → Profile menu | Role-specific items visible | ☐ |

### F4.3: Alumni Role
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 86 | Alumni permissions | Login as Alumni → check all screens | Appropriate features visible/hidden per RBAC matrix | ☐ |

### F4.4: Club Role
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 87 | Club can create event | Login as Club → Events | "Create Event" button visible | ☐ |
| 88 | Club-specific features | Login as Club → Profile menu | Club-specific items visible | ☐ |

### F4.5: Permission Enforcement
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 89 | Feature gating consistency | Compare web vs mobile for same role | Same features visible/hidden on both platforms | ☐ |
| 90 | Role change reflection | Admin changes user role server-side → user reopens app | New role permissions applied (identity refreshed) | ☐ |

---

## PHASE 5 — Navigation & Deep Linking

### F5.1: Tab Bar
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 91 | 5 tabs visible | View tab bar | Home, Network, Create(+), Messages, Profile | ☐ |
| 92 | Create tab intercept | Tap + button in center | Create post modal slides up from bottom | ☐ |
| 93 | Tab switching | Tap each tab | Correct screen loads, state preserved | ☐ |

### F5.2: Stack Navigation
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 94 | Post detail animation | Tap post | Slides in from right | ☐ |
| 95 | Create post modal | Tap + button | Slides up from bottom | ☐ |
| 96 | Back navigation | Press back on any detail screen | Returns to previous screen | ☐ |
| 97 | Deep stack | Feed → Post → User → Chat → Back × 3 | Navigates back correctly through stack | ☐ |

### F5.3: Deep Links — Custom Scheme
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 98 | `clstr://post/:id` | Open link (via ADB/xcrun) | Navigates to post detail | ☐ |
| 99 | `clstr://profile/:id` | Open link | Navigates to user profile | ☐ |
| 100 | `clstr://events/:id` | Open link | Navigates to event detail | ☐ |
| 101 | `clstr://notifications` | Open link | Navigates to notifications | ☐ |
| 102 | `clstr://settings` | Open link | Navigates to settings | ☐ |
| 103 | `clstr://feed` | Open link | Navigates to Home tab | ☐ |

### F5.4: Deep Links — Universal Links
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 104 | `https://clstr.network/post/:id` | Tap link in browser/email | App opens to post detail | ☐ |
| 105 | `https://clstr.network/profile/:id` | Tap link | App opens to user profile | ☐ |

### F5.5: Deep Link — Cold Start
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 106 | Cold start deep link | Kill app → tap `clstr://post/:id` | App opens directly to post detail | ☐ |
| 107 | Cold start auth required | Kill app → sign out in Supabase → tap deep link | Login screen shown, then navigate to target after auth | ☐ |

### F5.6: Header Icons
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 108 | Feed header — Events icon | Tap calendar icon on Feed | Navigates to Events screen | ☐ |
| 109 | Feed header — Bell icon | Tap bell icon on Feed | Navigates to Notifications screen | ☐ |
| 110 | Profile header — Gear icon | Tap gear icon on Profile | Navigates to Settings screen | ☐ |

---

## PHASE 6 — UI Polish & Design Parity

### F6.1: Theme Support
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 111 | Light mode | Set device to light mode | App uses light color palette | ☐ |
| 112 | Dark mode | Set device to dark mode | App uses dark color palette | ☐ |
| 113 | System mode follows | Toggle device dark mode | App theme switches automatically | ☐ |
| 114 | No hardcoded colors | Browse all screens in both themes | No white-on-white or black-on-black text | ☐ |

### F6.2: Typography
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 115 | Inter font loaded | View any text in app | Inter font rendered (not system default) | ☐ |
| 116 | Font weight variety | View headings, body, labels | Bold headers, medium labels, regular body | ☐ |
| 117 | Splash waits for fonts | Cold start app | Splash screen stays until fonts loaded | ☐ |

### F6.3: Component Visual Audit
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 118 | Avatar sizes | Check avatars across screens | Consistent sizes (xs in lists, lg in profiles) | ☐ |
| 119 | Role badges | View posts/profiles with different roles | Correct badge colors per role (Student/Faculty/Alumni/Club) | ☐ |
| 120 | PostCard layout | View multiple posts in Feed | Consistent spacing, rounded corners, proper hierarchy | ☐ |
| 121 | EventCard layout | View Events screen | Date badge, title, location well-formatted | ☐ |
| 122 | ConversationItem | View Messages list | Avatar, name, last message, timestamp aligned | ☐ |
| 123 | ConnectionCard | View Network connections | Avatar, name, badge, action buttons | ☐ |

---

## PHASE 7 — Performance

### F7.1: Scroll Performance
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 124 | Feed scroll 60fps | Scroll through 50+ posts rapidly | Smooth, no jank or dropped frames | ☐ |
| 125 | Messages scroll | Scroll through conversation list rapidly | Smooth scrolling | ☐ |
| 126 | Chat scroll (inverted) | Scroll through long chat history | Smooth, no flicker on inverted list | ☐ |

### F7.2: Memory & Re-renders
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 127 | No unnecessary re-renders | Enable React DevTools profiler → scroll Feed | PostCard items don't re-render when scrolling | ☐ |
| 128 | Memory stable | Use app for 15 min, navigate all screens | No increasing memory usage (check dev tools) | ☐ |

### F7.3: Cache Behavior
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 129 | Stale feed refetch | View Feed → switch tab → come back after 30s | Feed may refetch (staleTime: 30s) | ☐ |
| 130 | Events cache longer | View Events → switch tab → come back within 60s | Events served from cache (staleTime: 60s) | ☐ |
| 131 | Identity cache stable | Navigate between screens | `get_identity_context()` NOT called on every navigation | ☐ |

---

## PHASE 8 — Additional Screens

### F8.1: Search
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 132 | Search opens | Navigate to Search (via header/profile menu) | Search screen with auto-focused input | ☐ |
| 133 | Typeahead results | Type 3+ characters | People and Events results appear | ☐ |
| 134 | Debounced input | Type rapidly | Search fires after 300ms pause (not on every keystroke) | ☐ |
| 135 | Navigate from results | Tap person result | Navigates to `/user/:id` | ☐ |
| 136 | Tap event result | Tap event result | Navigates to `/event/:id` | ☐ |
| 137 | Clear search | Tap X button | Input clears, results clear | ☐ |
| 138 | Empty results | Search for "xyznonexistent123" | "No results" message shown | ☐ |

### F8.2: Saved Items
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 139 | Saved screen loads | Navigate to Saved Items | 3-tab view: Posts, Projects, Clubs | ☐ |
| 140 | Posts tab | Tap Posts tab | Saved posts listed (or empty state) | ☐ |
| 141 | Projects tab | Tap Projects tab | Saved projects listed (or empty state) | ☐ |
| 142 | Clubs tab | Tap Clubs tab | Saved clubs listed (or empty state) | ☐ |
| 143 | Pull to refresh | Pull down on any tab | Data refreshed | ☐ |

### F8.3: Settings
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 144 | Settings loads | Navigate to Settings | All sections visible: Appearance, Notifications, Privacy, Account, Support, Danger | ☐ |
| 145 | Theme toggle | Change theme Light → Dark | App theme changes immediately | ☐ |
| 146 | Theme System option | Select System | App follows device theme | ☐ |
| 147 | Notification toggles | Toggle email/push/message/connection notifications | Each toggle saves (optimistic update) | ☐ |
| 148 | Privacy visibility | Change Profile visibility (Public/Connections/Private) | Setting saved | ☐ |
| 149 | Sign out | Tap Sign Out → Confirm | Signed out, returned to login | ☐ |
| 150 | Delete account | Tap Delete Account → Confirm × 2 | Account deactivated, signed out | ☐ |
| 151 | Help Center link | Tap Help Center | Opens web link | ☐ |
| 152 | Feedback link | Tap Feedback | Opens mailto: link | ☐ |

### F8.4: Push Notifications
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 153 | Permission prompt | First launch after install | Push notification permission dialog shown | ☐ |
| 154 | Token registered | Grant permission → check Supabase | Device token stored via `upsert_device_token` RPC | ☐ |
| 155 | Foreground notification | Receive push while app is open | Alert + sound shown | ☐ |
| 156 | Background notification tap | Receive push in background → tap | App opens to relevant screen (deep link) | ☐ |
| 157 | Token deactivation | Sign out | Device token deactivated via `deactivate_device_token` | ☐ |
| 158 | Android channel | Check Android notification settings | Custom channel with HIGH importance | ☐ |

---

## PHASE 9 — Advanced Features

### F9.1: Jobs
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 159 | Jobs screen loads | Navigate to Jobs (Profile menu → Jobs) | Jobs list with search bar and tabs | ☐ |
| 160 | Browse tab | View Browse tab | Available jobs displayed | ☐ |
| 161 | Saved tab | View Saved tab | Saved jobs displayed (or empty state) | ☐ |
| 162 | Search jobs | Type in search bar | Jobs filtered by search query | ☐ |
| 163 | Job detail | Tap a job | Full job detail with requirements, description | ☐ |
| 164 | Save job | Tap save/bookmark on job | Job saved, appears in Saved tab | ☐ |
| 165 | Unsave job | Tap save again on saved job | Job removed from Saved tab | ☐ |
| 166 | Apply to job | Tap Apply on job detail | Apply action triggered (confirm dialog or redirect) | ☐ |
| 167 | Role gating | Login as role without job access | Jobs menu item hidden | ☐ |

### F9.2: Mentorship
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 168 | Mentorship screen loads | Navigate to Mentorship | Tab view: Mentors / My Requests / Incoming / Active | ☐ |
| 169 | Mentors tab | View Mentors tab | Available mentors listed | ☐ |
| 170 | My Requests tab | View My Requests | Sent mentorship requests listed | ☐ |
| 171 | Incoming tab | View Incoming | Received mentorship requests listed | ☐ |
| 172 | Active tab | View Active | Active mentorship relationships listed | ☐ |
| 173 | Request mentorship | Tap on mentor → request | Mentorship request sent | ☐ |
| 174 | Role gating | Check mentorship access per role | Appropriate features per Student/Faculty/Alumni | ☐ |

### F9.3: Clubs
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 175 | Clubs screen loads | Navigate to Clubs | Browse clubs list | ☐ |
| 176 | Follow club | Tap Follow on a club | Following state updated | ☐ |
| 177 | Unfollow club | Tap Unfollow | Following state reverted | ☐ |
| 178 | Club details visible | View club card | Name, description, member count shown | ☐ |

### F9.4: Alumni Directory
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 179 | Alumni screen loads | Navigate to Alumni Directory | List of alumni shown | ☐ |
| 180 | Search alumni | Type in search bar | Alumni filtered by name | ☐ |
| 181 | Mentor filter | Toggle "Mentors only" filter | Only mentors shown | ☐ |
| 182 | View alumni profile | Tap an alumni | Navigate to `/user/:id` | ☐ |

### F9.5: Projects / CollabHub
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 183 | Projects screen loads | Navigate to Projects | Explore / My Projects tabs | ☐ |
| 184 | Explore tab | View Explore tab | Available projects with tech stack tags | ☐ |
| 185 | My Projects tab | View My Projects | User's own projects listed | ☐ |
| 186 | Project detail | Tap a project | Full detail with open roles | ☐ |
| 187 | Apply to project role | Tap Apply on open role | Application submitted | ☐ |

### F9.6: EcoCampus / Marketplace
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 188 | EcoCampus loads | Navigate to EcoCampus | Items / Requests / My Listings tabs | ☐ |
| 189 | Browse items | View Items tab | Marketplace items listed | ☐ |
| 190 | Browse requests | View Requests tab | Community requests listed | ☐ |
| 191 | My listings | View My Listings tab | User's own listings | ☐ |
| 192 | Role gating | Only Student/Faculty can access | Other roles don't see EcoCampus nav | ☐ |

### F9.7: Portfolio
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 193 | Portfolio loads | Navigate to Portfolio | Settings form with slug, toggles | ☐ |
| 194 | Edit slug | Change portfolio slug → save | Slug updated | ☐ |
| 195 | Toggle sections | Enable/disable portfolio sections | Toggles persist | ☐ |
| 196 | Activate portfolio | Tap Activate | Portfolio activated | ☐ |

### F9.8: Skill Analysis
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 197 | Skill Analysis loads | Navigate to Skill Analysis | Score card + distribution + skill bars | ☐ |
| 198 | Score displayed | View score card | Skill score shown with visual indicator | ☐ |
| 199 | Skill bars | View individual skills | Bar chart for each skill with level | ☐ |
| 200 | Distribution chart | View distribution | Skill category distribution shown | ☐ |

### F9.9: AI Chat
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 201 | AI Chat loads | Navigate to AI Chat | Sessions list or empty state | ☐ |
| 202 | New session | Start new chat session | Empty chat view opens | ☐ |
| 203 | Send message | Type message → Send | Message appears in chat, AI responds | ☐ |
| 204 | View past sessions | Navigate back to sessions list | Previous sessions listed | ☐ |
| 205 | Resume session | Tap past session | Chat history loaded, can continue | ☐ |

---

---
---

# PART 2 — STABILITY & HARDENING (Completion ≠ Stability)

> Everything above tests *features*. Everything below tests whether those features **survive production**.

---

## PHASE 10 — BACKEND PARITY AUDIT

> **Red Flag:** If web uses `@clstr/core` and mobile uses direct Supabase queries for the same feature, you don't have parity — you have duplication. Logic will drift. Validation rules will diverge. RLS assumptions will differ.

### PA.1: API Layer Parity Table

Audit every feature. Fill in the table. Any row where Web = `@clstr/core` and Mobile = `direct` is a **parity violation**.

| # | Feature | Web uses `@clstr/core`? | Mobile uses `@clstr/core`? | Any direct Supabase? | Verdict | Status |
|---|---------|------------------------|---------------------------|---------------------|---------|--------|
| 206 | Feed / Posts | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |
| 207 | Post Reactions | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |
| 208 | Post Comments | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |
| 209 | Messaging | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |
| 210 | Connections | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |
| 211 | Events | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |
| 212 | Profile | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |
| 213 | Notifications | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |
| 214 | Jobs | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |
| 215 | **Mentorship** | ☐ Yes / ☐ No | ☐ Yes / ☐ No | **☐ Yes — direct queries** | ☐ Parity / ☐ **Drift** | ☐ |
| 216 | Clubs | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |
| 217 | **Alumni** | ☐ Yes / ☐ No | ☐ Yes / ☐ No | **☐ Yes — direct RPC** | ☐ Parity / ☐ **Drift** | ☐ |
| 218 | Projects | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |
| 219 | EcoCampus | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |
| 220 | Portfolio | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |
| 221 | Skill Analysis | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |
| 222 | AI Chat | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |
| 223 | Search | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |
| 224 | Saved Items | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |
| 225 | Settings | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Yes / ☐ No | ☐ Parity / ☐ Drift | ☐ |

**Known violations:**
- `lib/api/mentorship.ts` — ~340 lines of **direct Supabase queries** ("no `@clstr/core` module exists")
- `lib/api/alumni.ts` — **direct RPC** (`get_alumni_by_domain`) — acceptable only if web does the same

### PA.2: Query Key Consistency Audit
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 226 | Zero manual query key arrays | Run `grep -R "\['" app/ --include="*.tsx" --include="*.ts"` | **Zero** manual `['string']` array literals in query calls | ☐ |
| 227 | All queries use QUERY_KEYS | Audit every `useQuery` call in `app/` | Every query key is `QUERY_KEYS.*` from `@clstr/core` | ☐ |
| 228 | Mutations invalidate correct keys | Audit every `useMutation` `onSuccess` | Invalidation targets match the query being mutated | ☐ |
| 229 | No cache ghost keys | Toggle between screens → check `queryClient.getQueryCache().getAll()` in debugger | No orphaned keys growing over time | ☐ |

---

## PHASE 11 — CHAOS TESTING

> This is where production apps either survive — or implode.

### CT.A: Network Failure Matrix

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 230 | Airplane mode during chat send | Open chat → airplane mode ON → send 3 messages → airplane mode OFF | Messages queue locally OR fail gracefully. **No duplicate sends.** No crash. On reconnect: retry OR show failed state. | ☐ |
| 231 | Airplane mode during realtime | Be in Feed → WiFi OFF → wait 30s → WiFi ON | `useAppStateRealtimeLifecycle()` reconnects. No duplicate channels. No memory leaks. No stale UI. | ☐ |
| 232 | Subscription count after reconnect | Add `console.log(subscriptionManager.activeCount())` → repeat test 231 three times | Active count should be **constant** (never grows infinitely) | ☐ |
| 233 | Background → net drop → foreground | Background app → disable network → wait 2 min → re-enable → foreground | Token refresh if needed. Realtime reconnect. Queries invalidated. **No crash.** | ☐ |
| 234 | WiFi → cellular switch | Be in chat → switch from WiFi to cellular data | Realtime channels recover. Messages still deliver. | ☐ |
| 235 | Network error UI | Disable all connectivity → navigate to Feed | Graceful error state shown (not blank screen, not crash) | ☐ |
| 236 | Network error on mutation | Disable WiFi → try to send message / react / comment | Error feedback shown to user. Mutation does not silently fail. | ☐ |
| 237 | Slow network simulation | Use network link conditioner (500ms latency, 50% packet loss) → browse Feed + Chat | App remains usable. Loading states visible. No timeout crashes. | ☐ |

### CT.B: Auth Race Conditions

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 238 | Double-tap login (10x) | Tap login button 10 times rapidly | Only **1** Supabase auth request. Button disabled while loading. No duplicate sessions. | ☐ |
| 239 | Double-tap signup (10x) | Tap signup button 10 times rapidly | Only 1 signup request. No duplicate accounts. | ☐ |
| 240 | Logout during active realtime | Be in chat → receive message → **immediately** tap logout | `unsubscribeAll()` fires. `queryClient.clear()` fires. Identity reset. Device token deactivated. **No events received after logout.** | ☐ |
| 241 | Ghost channel check post-logout | Logout → wait 10s → check console for any Supabase realtime events | **Zero** events received. No "ghost subscriptions." | ☐ |
| 242 | Switch accounts rapidly | Login as User A → logout → login as User B (within 5s) | No cache bleed. No conversations from A visible in B. All channels reset. Identity = User B. | ☐ |
| 243 | Account switch — cache isolation | Login A → view Feed → view Messages → logout → login B → check Feed + Messages | Only User B's data visible. Zero remnants from User A. | ☐ |
| 244 | Concurrent session conflict | Login on Device 1 → login same account on Device 2 → continue using Device 1 | Device 1 either stays valid or gets clean session refresh. No corruption. | ☐ |
| 245 | Token expiry mid-use | Wait until token is <30s from expiry → perform API call | Token auto-refreshed silently. API call succeeds. No logout. | ☐ |

### CT.C: Deep Link Storm

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 246 | 5 deep links in 5 seconds | Fire 5 `adb shell am start` commands rapidly with different post IDs | Only **last** link wins. No navigation crash. No stack explosion. | ☐ |
| 247 | Deep link while logged out (intent preservation) | Sign out → open `clstr://post/SOME-UUID` | Redirect to login. **After login → navigate to post.** Intent must NOT be lost. | ☐ |
| 248 | Deep link during onboarding | New account that hasn't onboarded → open `clstr://post/uuid` | Onboarding completes first → then navigate to post (or queue intent) | ☐ |
| 249 | Invalid deep link entity | Open `clstr://post/nonexistent-uuid` | Error state or "not found" screen. No crash. No infinite spinner. | ☐ |
| 250 | Deep link to auth-gated feature | Open `clstr://mentorship` while logged out | Login → then navigate to mentorship (if permitted by role) | ☐ |
| 251 | Universal link while app backgrounded | Background app → tap `https://clstr.network/post/uuid` in browser | App foregrounds to correct post detail | ☐ |
| 252 | Deep link stack depth | Open `clstr://post/1` → tap user → `clstr://post/2` → tap user → back × 4 | Navigation stack resolves cleanly. No orphan screens. | ☐ |

### CT.D: Stress Tests

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 253 | Chat flood — 100 rapid messages | Send 100 messages rapidly from web to mobile user | Mobile: no freeze, no duplicates, scroll smooth, all 100 arrive in order | ☐ |
| 254 | Feed flood — 50 rapid posts | Create 50 posts from web while mobile user is on Feed | "New posts" banner appears. Tapping it loads all 50. No crash. | ☐ |
| 255 | Notification flood — 30 rapid | Trigger 30 notifications rapidly (connection requests from multiple users) | Badge count correct. List renders all 30. No duplicate entries. | ☐ |
| 256 | Rapid RSVP toggle | Toggle RSVP on same event 20 times rapidly | Final state is correct (registered or not). No duplicate registrations in DB. | ☐ |
| 257 | Rapid reaction toggle | Toggle same reaction on same post 20 times rapidly | Final reaction count is correct (0 or 1). No drift. | ☐ |
| 258 | Rapid tab switch × 50 | Switch tabs rapidly 50 times | No crash. No stale data. No memory spike. Tab state preserved. | ☐ |

---

## PHASE 12 — AUTH TEARDOWN AUDIT

> **Rule: Logout must be nuclear.** If even one subscription survives, you have a memory leak. If any cache persists, you have cross-user data bleed.

### AT.1: Nuclear Logout Checklist

Verify that **sign out** performs ALL of these in order:

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 259 | `supabase.auth.signOut()` called | Logout → check network tab / logs | Supabase session revoked server-side | ☐ |
| 260 | `subscriptionManager.unsubscribeAll()` | Logout → check `subscriptionManager.activeCount()` | **0** active subscriptions after logout | ☐ |
| 261 | `queryClient.clear()` | Logout → check `queryClient.getQueryCache().getAll().length` | **0** cached queries after logout | ☐ |
| 262 | Identity context reset | Logout → check identity context values | `user = null`, `role = null`, `isAuthenticated = false` | ☐ |
| 263 | Push token deactivated | Logout → check Supabase `device_tokens` table | Token row has `active = false` or is deleted | ☐ |
| 264 | SecureStore cleared | Logout → kill app → reopen | Login screen shown (no auto-restore of old session) | ☐ |
| 265 | No post-logout realtime events | Logout → wait 30s → trigger event for old user from web | **Zero** events received on mobile. Console clean. | ☐ |

### AT.2: Identity Derivation (Never Store, Always Derive)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 266 | Role from RPC, not local | Check `useIdentity()` implementation | Role reads from `get_identity_context()` RPC, NOT from local storage | ☐ |
| 267 | Identity refresh on auth change | Trigger `onAuthStateChange` (e.g., re-login) | Identity cache invalidated and re-fetched | ☐ |
| 268 | Realtime role change | Admin changes user role in DB → user has app open | Identity subscription fires → UI updates to new role permissions | ☐ |
| 269 | No stale role after switch | Login as Student → admin changes to Alumni → user foregrounds | `useFeatureAccess` returns Alumni permissions, not Student | ☐ |

### AT.3: Session Hydration Gate

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 270 | Splash holds during auth loading | Cold start → observe | Splash screen visible until `authLoading` AND `identityLoading` both false | ☐ |
| 271 | No flash of unauthenticated | Cold start with valid session → observe | Feed appears directly. **Zero** frames showing login screen. | ☐ |
| 272 | No flash during font loading | Cold start → observe | Splash holds until Inter fonts loaded. No fallback-font flash. | ☐ |
| 273 | Redirect loop prevention | Corrupt auth state (e.g., partial session) | App does NOT loop between login → feed → login. Lands on login cleanly. | ☐ |

---

## PHASE 13 — RBAC vs RLS SECURITY AUDIT

> **UI permissions ≠ security.** If RLS doesn't match UI gating, an attacker can bypass mobile.

### SEC.1: UI Gating vs Database Policy

For every write operation, verify **both** UI gating AND RLS enforcement:

| # | Feature | UI gated? | RLS enforced? | Postman bypass test | Status |
|---|---------|-----------|---------------|---------------------|--------|
| 274 | Create Post (Student) | ☐ Yes / ☐ No | ☐ Yes / ☐ No | POST insert as student → should succeed | ☐ |
| 275 | Create Post (unauthenticated) | N/A | ☐ Yes / ☐ No | POST insert with no token → **must fail** | ☐ |
| 276 | Create Event (Student) | ☐ Yes (hidden) | ☐ Yes / ☐ No | INSERT into `events` as Student token → **must fail** | ☐ |
| 277 | Create Event (Faculty/Club) | ☐ Yes (shown) | ☐ Yes / ☐ No | INSERT into `events` as Faculty token → should succeed | ☐ |
| 278 | Send Message (no connection) | ☐ Yes / ☐ No | ☐ Yes / ☐ No | INSERT into `messages` to non-connected user → **must fail** | ☐ |
| 279 | Update foreign profile | N/A | ☐ Yes / ☐ No | UPDATE `profiles` where `id != auth.uid()` → **must fail** | ☐ |
| 280 | Read foreign private messages | N/A | ☐ Yes / ☐ No | SELECT `messages` where neither party is `auth.uid()` → **must return 0 rows** | ☐ |
| 281 | Delete foreign post | N/A | ☐ Yes / ☐ No | DELETE from `posts` where `author_id != auth.uid()` → **must fail** | ☐ |
| 282 | Modify foreign reaction | N/A | ☐ Yes / ☐ No | UPDATE `post_likes` where `user_id != auth.uid()` → **must fail** | ☐ |
| 283 | Cross-domain data access | N/A | ☐ Yes / ☐ No | SELECT posts from different college domain → **must return only own domain** | ☐ |
| 284 | Alumni access as Student | ☐ Yes / ☐ No | ☐ Yes / ☐ No | Call `get_alumni_by_domain` as Student → check if RLS restricts | ☐ |
| 285 | EcoCampus access as Alumni | ☐ Yes (hidden) | ☐ Yes / ☐ No | INSERT into EcoCampus table as Alumni → **must fail** (Student/Faculty only) | ☐ |

### SEC.2: Direct API Attack Tests (Postman)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 286 | Unauthenticated API call | `curl` Supabase REST endpoint with no auth header | 401 or empty result set | ☐ |
| 287 | Expired token API call | Use token expired >1hr ago → make API call | 401 response | ☐ |
| 288 | Cross-user data via anon key | Use anon key only → SELECT `messages` | RLS blocks: 0 rows returned | ☐ |
| 289 | Privilege escalation — role spoof | Modify JWT claims client-side → make API call | Supabase rejects (JWT signature mismatch) | ☐ |
| 290 | Mass data extraction | SELECT * from `profiles` with valid token | RLS filters to only visible profiles (not all users) | ☐ |

---

## PHASE 14 — MOBILE PERFORMANCE PROFILING

> React Native behaves beautifully on simulators. Not on budget Android phones.

### PERF.A: JS Thread Profiling (Flipper)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 291 | Feed scroll JS FPS | Flipper → Performance → scroll Feed 200 posts | JS thread stays **≥55 FPS** consistently | ☐ |
| 292 | Chat scroll JS FPS | Scroll chat with 300 messages | JS thread stays ≥55 FPS | ☐ |
| 293 | Tab switch JS FPS | Switch tabs rapidly 10 times → observe FPS | No drops below 30 FPS | ☐ |
| 294 | Memory during extended use | Use app for 15 min, navigate all screens | Memory: no upward trend. Stable ±20MB. | ☐ |

### PERF.B: Low-End Android Device (3GB RAM)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 295 | Cold start time | Kill app → launch → time to interactive | **< 4 seconds** to Feed visible | ☐ |
| 296 | Navigation transition smoothness | Tap post → observe transition | No visible jank on slide-in animation | ☐ |
| 297 | Feed image loading | Scroll feed with image-heavy posts | Images load progressively. No white flash. No OOM crash. | ☐ |
| 298 | Background memory pressure | Open 5 other apps → return to Clstr | App resumes without crash. May need reload but no corrupt state. | ☐ |
| 299 | Chat with many messages | Open chat with 500+ messages → scroll to top | No crash. May be slow but must not freeze. | ☐ |

### PERF.C: Render Count Audit

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 300 | PostCard render count | Add `console.count("PostCard render")` → scroll Feed | Count should be ≈ `visibleItems` count, NOT `totalItems × n` | ☐ |
| 301 | ConversationItem render count | Add `console.count("ConversationItem render")` → scroll Messages | Count stable on scroll (items off-screen don't re-render) | ☐ |
| 302 | ConnectionCard render count | Add `console.count("ConnectionCard render")` → scroll Network | Count stable | ☐ |
| 303 | NotificationItem re-render | Navigate to Notifications → back → Notifications again | Items don't re-render from scratch (cache hit) | ☐ |

### PERF.D: Bundle Size Audit

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 304 | JS bundle size | Run `npx expo export --platform android` → check bundle | **< 7MB** uncompressed JS bundle | ☐ |
| 305 | Import audit — large packages | Check for accidentally bundled large deps (moment.js, lodash full, etc.) | Only tree-shaken or minimal imports | ☐ |
| 306 | Image asset audit | Check `assets/images/` total size | **< 5MB** total image assets | ☐ |

---

## PHASE 15 — DESIGN SYSTEM DRIFT AUDIT

> If web and mobile use different semantic token names, design divergence will happen over time.

### DS.1: Token Name Parity

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 307 | Surface token mapping | Compare web `--surface-1`/`--surface-2` vs mobile `surfaceTiers.tier1`/`tier2` | Identical hex values for light and dark modes | ☐ |
| 308 | Text color mapping | Compare web `--text-primary`/`--text-muted` vs mobile `text`/`textSecondary` | Identical hex values | ☐ |
| 309 | Brand color | Compare web `--brand-primary` vs mobile `accent`/`brand` | Same hex value | ☐ |
| 310 | Border color | Compare web border tokens vs mobile `border`/`inputBorder` | Same hex values | ☐ |
| 311 | Font size scale | Compare web `font-size-*` tokens vs mobile `fontSize.*` | Same pixel values at each scale step | ☐ |
| 312 | Spacing scale | Compare web spacing tokens vs mobile `spacing.*` | Same pixel values | ☐ |
| 313 | Role badge colors | Compare web role badge hex vs mobile `badgeVariants.*` colors | Identical per role | ☐ |

### DS.2: Visual Regression (Manual Comparison)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 314 | Feed — side by side | Open web Feed + mobile Feed side by side | Card structure, spacing, typography feel consistent | ☐ |
| 315 | Profile — side by side | Open web Profile + mobile Profile side by side | Layout, sections, badges match conceptually | ☐ |
| 316 | Messages — side by side | Open web Messages + mobile Messages | Conversation list + chat feel consistent | ☐ |
| 317 | Dark mode — side by side | Compare web dark + mobile dark | No major color discrepancies | ☐ |

---

## PHASE 16 — DEEP LINK INTENT PRESERVATION

> If a user taps a deep link while logged out, the intent MUST survive the auth flow.

### DL.1: Intent Queue System

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 318 | Logged-out deep link → post | Sign out → open `clstr://post/uuid` → login | After login: navigates to post (not Feed) | ☐ |
| 319 | Logged-out deep link → profile | Sign out → open `clstr://profile/uuid` → login | After login: navigates to profile | ☐ |
| 320 | Logged-out deep link → chat | Sign out → open `clstr://messaging?partner=uuid` → login | After login: navigates to chat | ☐ |
| 321 | Intent survives onboarding | New signup via deep link → complete onboarding → check | Navigates to deep link target after onboarding | ☐ |
| 322 | Intent NOT preserved across sessions | Sign out → open deep link → kill app → reopen → login normally | Does NOT navigate to old deep link. Clean start. | ☐ |

### DL.2: Intent Queue Implementation Check

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 323 | Intent storage exists | Audit codebase for intent queue | There is a mechanism to store pending deep link path before auth redirect | ☐ |
| 324 | Intent consumed after navigation | Navigate to intent → check storage | Intent cleared from queue after use (no stale replays) | ☐ |
| 325 | Multiple intents — last wins | Fire 3 deep links while logged out → login | Only last deep link target navigated to | ☐ |

---

## PHASE 17 — PLATFORM-SPECIFIC & ACCESSIBILITY

### P.1: Android-Specific

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 326 | Hardware back button | Press back on detail screen | Navigates back (not app exit) | ☐ |
| 327 | Hardware back on Feed | Press back on Feed (root tab) | App goes to background (not crash) | ☐ |
| 328 | `removeClippedSubviews` | Scroll long list on Android → scroll back up | No blank spaces | ☐ |
| 329 | Android 12+ splash screen | Cold start on Android 12+ | System splash → app splash → content (clean transition) | ☐ |
| 330 | Keyboard dismissal | Tap outside text input | Keyboard dismissed | ☐ |
| 331 | Keyboard avoidance in chat | Open chat → tap input → keyboard appears | Input field slides up above keyboard. Messages still visible. | ☐ |

### P.2: iOS-Specific

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 332 | Swipe-back gesture | Swipe from left edge on detail screen | Slides back with animation | ☐ |
| 333 | Safe area handling | View on iPhone with notch/Dynamic Island | Content respects safe areas (no overlap with notch/home indicator) | ☐ |
| 334 | iOS keyboard accessories | View chat input when keyboard is open | Input has proper toolbar/accessory if applicable | ☐ |

### P.3: Accessibility

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 335 | Screen reader — VoiceOver (iOS) | Enable VoiceOver → navigate Feed → Notifications → Chat | All interactive elements announced with labels | ☐ |
| 336 | Screen reader — TalkBack (Android) | Enable TalkBack → navigate same flow | All interactive elements announced | ☐ |
| 337 | Touch target 44×44 | Audit all buttons and tappable areas | Minimum 44×44pt touch targets | ☐ |
| 338 | Large text scaling | Set device to largest text size → browse all screens | UI adapts. Text visible. No clipping. Scrollable if needed. | ☐ |
| 339 | Reduced motion | Enable "Reduce Motion" → navigate | Animations reduced or removed | ☐ |
| 340 | Color contrast | Check primary text on all backgrounds | Meets WCAG AA (4.5:1 minimum contrast ratio) | ☐ |

---

## PHASE 18 — V1 STRATEGIC FOCUS AUDIT

> Parity is impressive. Focus is profitable.
> 90% of early retention comes from: Feed, Messaging, Profile, Notifications.
> Everything else is optional in v1.

### V1.1: Core Loop Stability (MUST BE BULLETPROOF)

| # | Feature | Chaos-tested? | Low-end tested? | RLS verified? | Production ready? | Status |
|---|---------|--------------|-----------------|---------------|-------------------|--------|
| 341 | Auth (login/signup/session) | ☐ | ☐ | ☐ | ☐ | ☐ |
| 342 | Feed (read + react + comment) | ☐ | ☐ | ☐ | ☐ | ☐ |
| 343 | Messaging (conversations + chat) | ☐ | ☐ | ☐ | ☐ | ☐ |
| 344 | Profile (own + other user) | ☐ | ☐ | ☐ | ☐ | ☐ |
| 345 | Notifications (list + realtime badge) | ☐ | ☐ | ☐ | ☐ | ☐ |
| 346 | Network (connections + requests) | ☐ | ☐ | ☐ | ☐ | ☐ |
| 347 | Events (list + detail + RSVP) | ☐ | ☐ | ☐ | ☐ | ☐ |
| 348 | Search (typeahead) | ☐ | ☐ | ☐ | ☐ | ☐ |

### V1.2: Defer-to-v2 Candidates

These features **exist** but should be flagged for deferral if v1 stability isn't proven:

| # | Feature | Active users need this in v1? | Stability risk? | Recommendation | Status |
|---|---------|------------------------------|-----------------|----------------|--------|
| 349 | AI Chat | ☐ Probably not | High (API costs, latency) | **Defer to v2** | ☐ |
| 350 | EcoCampus / Marketplace | ☐ Probably not | Medium (complex transactions) | **Defer to v2** | ☐ |
| 351 | Portfolio | ☐ No | Low | **Defer to v2** | ☐ |
| 352 | Skill Analysis | ☐ No | Low | **Defer to v2** | ☐ |
| 353 | Alumni Directory | ☐ Maybe | Low | **Evaluate** | ☐ |
| 354 | Projects / CollabHub | ☐ Maybe | Medium | **Evaluate** | ☐ |
| 355 | Jobs | ☐ Maybe | Medium | **Evaluate** | ☐ |
| 356 | Mentorship | ☐ Maybe | High (direct Supabase, no `@clstr/core`) | **Fix parity first, then evaluate** | ☐ |
| 357 | Clubs | ☐ Maybe | Low | **Evaluate** | ☐ |

### V1.3: Error UX Consistency

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 358 | Network error — Feed | WiFi off → open Feed | Error illustration/message + retry button | ☐ |
| 359 | Network error — Chat | WiFi off → open Chat | Error state + retry (not blank screen) | ☐ |
| 360 | Network error — Profile | WiFi off → open Profile | Cached profile shown OR error state + retry | ☐ |
| 361 | Network error — Events | WiFi off → open Events | Error state + retry | ☐ |
| 362 | Empty state — new user Feed | New account → Feed | Friendly empty state (not "Error" or blank) | ☐ |
| 363 | Empty state — no connections | New account → Network | "Find people" CTA or empty state | ☐ |
| 364 | Empty state — no messages | New account → Messages | Friendly empty state | ☐ |
| 365 | Server error (500) | Simulate Supabase outage | App shows "Something went wrong" + retry. No crash. | ☐ |

---

## Summary

| Section | Test Count | Range |
|---------|-----------|-------|
| **PART 1: FEATURE TESTING** | | |
| Phase 0: Foundation | 5 | #1–5 |
| Phase 1: Auth | 26 | #6–31 |
| Phase 2: Core Screens | 35 | #32–66 |
| Phase 3: Realtime | 14 | #67–80 |
| Phase 4: Roles & RBAC | 10 | #81–90 |
| Phase 5: Navigation | 20 | #91–110 |
| Phase 6: UI Polish | 13 | #111–123 |
| Phase 7: Performance | 8 | #124–131 |
| Phase 8: Additional | 27 | #132–158 |
| Phase 9: Advanced | 47 | #159–205 |
| **PART 2: STABILITY & HARDENING** | | |
| Phase 10: Backend Parity Audit | 24 | #206–229 |
| Phase 11: Chaos Testing | 29 | #230–258 |
| Phase 12: Auth Teardown Audit | 15 | #259–273 |
| Phase 13: RBAC vs RLS Security Audit | 17 | #274–290 |
| Phase 14: Performance Profiling | 16 | #291–306 |
| Phase 15: Design System Drift Audit | 11 | #307–317 |
| Phase 16: Deep Link Intent Preservation | 8 | #318–325 |
| Phase 17: Platform & Accessibility | 15 | #326–340 |
| Phase 18: V1 Strategic Focus Audit | 27 | #341–365 |
| | | |
| **TOTAL** | **367** | |

---

## Severity Classification

When a test fails, classify it:

| Severity | Meaning | Action |
|----------|---------|--------|
| 🔴 **P0 — Blocker** | Crash, data loss, security hole, cross-user bleed | Fix immediately. No ship. |
| 🟠 **P1 — Critical** | Broken core feature, auth failure, ghost subscriptions | Fix before any release. |
| 🟡 **P2 — High** | UX degradation, stale data, missing error state | Fix before public beta. |
| 🟢 **P3 — Medium** | Visual inconsistency, minor cache issue | Fix before v1.0 launch. |
| ⚪ **P4 — Low** | Nice-to-have, perf micro-optimization | Backlog. |

---

## How to Run Tests

### Using ADB for Deep Link Testing (Android)
```bash
# Custom scheme
adb shell am start -a android.intent.action.VIEW -d "clstr://post/SOME-UUID" com.clstr.network

# Universal link
adb shell am start -a android.intent.action.VIEW -d "https://clstr.network/post/SOME-UUID"

# Deep link storm (5 links in 5s)
for i in 1 2 3 4 5; do adb shell am start -a android.intent.action.VIEW -d "clstr://post/uuid-$i" com.clstr.network; sleep 1; done
```

### Using xcrun for Deep Link Testing (iOS)
```bash
# Custom scheme
xcrun simctl openurl booted "clstr://post/SOME-UUID"

# Universal link
xcrun simctl openurl booted "https://clstr.network/post/SOME-UUID"

# Deep link storm
for i in 1 2 3 4 5; do xcrun simctl openurl booted "clstr://post/uuid-$i"; sleep 1; done
```

### Query Key Audit
```bash
# Must return ZERO results — any manual ['string'] array = cache ghost risk
grep -rn "\['" app/ --include="*.tsx" --include="*.ts" | grep -i "useQuery\|queryKey\|invalidate"
```

### Subscription Count Check
```typescript
// Add to dev console or debug button:
import { subscriptionManager } from '@/lib/realtime/subscription-manager';
console.log('Active subscriptions:', subscriptionManager.activeCount());
// Should NEVER grow > expected channel count (feed + messages + notifications = ~3-5)
```

### Render Count Profiling
```typescript
// Add temporarily to PostCard.tsx:
console.count('PostCard render');
// Scroll feed — count should be ≈ windowSize * 2, not totalItems * n
```

### React DevTools Profiler (Performance)
1. Run `npx react-devtools` in terminal
2. Connect to running dev client
3. Start profiling → scroll Feed → stop profiling
4. Check for unnecessary re-renders on `PostCard` components

### Flipper JS Thread Profiling
1. Open Flipper → connect to dev client
2. Performance plugin → start recording
3. Scroll Feed 200 posts / scroll Chat 300 messages / switch tabs rapidly
4. Stop recording → check JS FPS (target: ≥55 FPS sustained)

### Bundle Size Audit
```bash
npx expo export --platform android
# Check: .expo/dist/bundles/*.js file size
# Target: < 7MB uncompressed
```

### Postman Security Tests
```bash
# Unauthenticated — should fail
curl -X GET "https://YOUR_PROJECT.supabase.co/rest/v1/messages" \
  -H "apikey: YOUR_ANON_KEY"

# Cross-user — should return 0 rows
curl -X GET "https://YOUR_PROJECT.supabase.co/rest/v1/messages?select=*" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer USER_A_TOKEN"
# Verify: only messages where sender_id or receiver_id = User A

# Privilege escalation — insert event as Student
curl -X POST "https://YOUR_PROJECT.supabase.co/rest/v1/events" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hack","description":"test"}'
# Expected: 403 or RLS violation
```

### Nuclear Logout Verification
```typescript
// Run in console after signing out:
import { subscriptionManager } from '@/lib/realtime/subscription-manager';
import { queryClient } from '@/lib/query-client';

console.log('Subscriptions:', subscriptionManager.activeCount()); // Should be 0
console.log('Cached queries:', queryClient.getQueryCache().getAll().length); // Should be 0
```
