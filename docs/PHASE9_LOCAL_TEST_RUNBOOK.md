<!-- markdownlint-disable MD013 -->
# Phase 9 — Local Test Runbook (No Apple Dev / Play Console / Expo Push)

> **Zero-cost architecture validation.** Tests 80% of Phase 9
> risk surface using custom scheme deep links, manual push
> simulation, and local auth only.

---

## What We CAN'T Test Locally

| Feature | Requires |
| --------- | ---------- |
| Universal Links (iOS) | Apple Developer Team ID + associated domains |
| Android App Links `autoVerify` | Signed release build + `.well-known/assetlinks.json` |
| Production Expo Push | Expo `projectId` + push credentials |

## What We CAN Test Locally (80% of Risk)

| # | Scenario | Tool |
| --- | ---------- | ------ |
| 1 | PKCE auth callback flow | `xcrun simctl openurl` / `adb shell am start` |
| 2 | Idempotency guard (no duplicate exchange) | Same + verify no loop |
| 3 | Navigation intent queue (cold start) | Kill app → deep link |
| 4 | Background → foreground resume | Home → return |
| 5 | SecureStore persistence (R6) | Kill → reopen → check auth |
| 6 | Chat reconnect + dedup | Background → messages → foreground |
| 7 | Notification navigation routing | DevTestOverlay `dispatchDeepLink()` |
| 8 | Offline resilience | Airplane mode |
| 9 | Session refresh (`autoRefreshToken`) | DevTestOverlay or wait |

---

## Prerequisites

```bash
# iOS (macOS only)
npx expo run:ios

# Android
npx expo run:android

# Verify custom scheme is registered
# app.json → "scheme": "clstr" ✓
```

---

## Step 1 — Custom Scheme Deep Links

### iOS Simulator
```bash
xcrun simctl openurl booted "clstr://auth/callback?code=test123"
```

### Android Emulator
```bash
adb shell am start -a android.intent.action.VIEW -d "clstr://auth/callback?code=test123" network.clstr.mobile
```

### Windows (PowerShell)
```powershell
adb shell am start -a android.intent.action.VIEW -d "clstr://auth/callback?code=test123" network.clstr.mobile
```

**Expected:**
- [x] App opens
- [x] `AuthCallbackScreen` mounts
- [x] `exchangeCodeForSession()` attempts exchange
- [x] Shows error state (code is invalid)
- [x] "Back to Login" button works
- [x] **NO crash, NO infinite loop**

---

## Step 2 — Cold Start Deep Link

```bash
# iOS
xcrun simctl terminate booted network.clstr.mobile
xcrun simctl openurl booted "clstr://profile/test-user-id"

# Android
adb shell am force-stop network.clstr.mobile
adb shell am start -a android.intent.action.VIEW -d "clstr://profile/test-user-id" network.clstr.mobile
```

**Expected:**
- [x] App launches from dead
- [x] `navigationRef` queue catches URL via `getInitialURL()`
- [x] `onNavigationReady()` flushes pending URL
- [x] Correct screen opens (Profile or Login → Profile after auth)
- [x] **NOT** the Home screen (if it opens Home, linking is broken)

---

## Step 3 — Background Resume During Auth

1. Trigger: `clstr://auth/callback?code=bg-test`
2. While spinner is showing → press Home button
3. Wait 5-10 seconds
4. Return to app

**Expected:**
- [x] No duplicate `exchangeCodeForSession()` call
- [x] No infinite loop
- [x] `exchangeInFlightRef` prevents re-entry
- [x] `AppState` listener checks for session on resume

---

## Step 4 — Idempotency Guard (Two Layers)

### Layer 1 — Deep Link Dedup (navigationRef.ts)

Identical URLs within 500ms are silently deduplicated at the dispatch level.

```bash
# Send same URL 3× rapidly (< 500ms between each)
xcrun simctl openurl booted "clstr://auth/callback?code=idem-001"
xcrun simctl openurl booted "clstr://auth/callback?code=idem-001"
xcrun simctl openurl booted "clstr://auth/callback?code=idem-001"
```

**Expected:**
- [x] First call: dispatched
- [x] Second + third calls: silently rejected by `dispatchDeepLink` dedup
- [x] Use DevTestOverlay → "Dedup stress (5× same URL)" to verify

### Layer 2 — Auth consumedCodes (AuthCallbackScreen.tsx)

If the same code arrives after the dedup window (e.g., via OS retry), the auth layer catches it.

```bash
# Send same code with >500ms gap
xcrun simctl openurl booted "clstr://auth/callback?code=idem-001"
sleep 2
xcrun simctl openurl booted "clstr://auth/callback?code=idem-001"
```

**Expected:**
- [x] First attempt: runs `exchangeCodeForSession()`
- [x] Second attempt: `consumedCodes.has(code)` returns true → skipped
- [x] Shows "already used" message (not a crash)

---

## Step 5 — R6 Auth Persistence

### Test 5a — Sign In
- Login with valid credentials
- Confirm user object exists (use DevTestOverlay → "Auth state snapshot")

### Test 5b — Kill App
- Swipe-kill / force-stop
- Reopen
- **Expected:** Still authenticated (SecureStore persisted the session)

### Test 5c — Token Expiry
- Wait for JWT expiry OR use DevTestOverlay → "Session refresh"
- **Expected:** `autoRefreshToken: true` renews silently

### Test 5d — Sign Out
- Sign out
- **Expected:** SecureStore cleared, session null, Login screen

### Verify SecureStore
Use DevTestOverlay buttons:
- "SecureStore inspect" → shows token metadata
- "SecureStore CLEAR" → wipes it (simulates corrupt state)

---

## Step 6 — Chat Reconnect Stress Test

1. Open a conversation
2. Send 20-30 rapid messages (use DevTestOverlay "Chat stress" or debugger console)
3. Background app for 2 minutes
4. Send messages from web during that time
5. Foreground the app

**Expected:**
- [x] `useRealtimeReconnect` fires when `AppState` → `active`
- [x] `invalidateQueries()` triggers refetch of conversations + messages
- [x] All missed messages appear
- [x] No duplicates in the list
- [x] No scroll position jump
- [x] Channel re-subscribes (`supabase.removeChannel` + new subscribe)

**If messages are missing** → reconnect logic broken in `useChatRealtime.reconnect()`
**If duplicates appear** → zombie subscription (old channel not cleaned up)

---

## Step 7 — Notification Tap Simulation

### Via DevTestOverlay
Tap 🧪 → "Deep link → Post" (or Profile, Event, etc.)

Under the hood this calls:
```ts
dispatchDeepLink("clstr://post/123")
```

### Before Nav Ready
1. Reload app (shake menu → Reload)
2. Immediately tap "Deep link → Post" before nav finishes mounting
3. **Expected:** URL queued → flushed on `onNavigationReady()`

---

## Step 8 — Offline Resilience

1. Toggle Airplane Mode on simulator/emulator
2. Open app (or navigate around if already open)

**Expected:**
- [x] No crash
- [x] React Query shows error/fallback state (retry: 2 configured)
- [x] No infinite spinners (staleTime: 5min, cached data shows)
- [x] Disable airplane mode → data loads on next interaction

---

## Automated Script Runners

### macOS (iOS Simulator)
```bash
chmod +x apps/mobile/scripts/test-ios-deeplinks.sh
./apps/mobile/scripts/test-ios-deeplinks.sh
```

### macOS/Linux (Android Emulator)
```bash
chmod +x apps/mobile/scripts/test-android-deeplinks.sh
./apps/mobile/scripts/test-android-deeplinks.sh
```

### Windows (Android Emulator)
```powershell
.\apps\mobile\scripts\test-android-deeplinks.ps1
```

---

## In-App DevTestOverlay

In `__DEV__` mode, a floating 🧪 button appears in the bottom-right corner.

Tap it to access:

| Button | What it tests |
| -------- | -------------- |
| Auth PKCE callback | Step 1 — PKCE exchange with fake code |
| Auth error callback | Step 1 — Error param handling |
| Idempotency guard | Step 4 — Double-tap prevention (Layer 1 dedup) |
| Dedup stress (5× same URL) | Step 4 — Rapid-fire identical URL rejection |
| Cold start queue | Step 2 — Queue + flush |
| Auth state snapshot | Step 4/R6 — Current session info |
| SecureStore inspect | R6 — Token persistence |
| SecureStore CLEAR | R6 — Simulate corrupt/cleared state |
| Session refresh | R6 — Force token refresh |
| Nav state snapshot | Current route + params |
| Deep link → Profile/Post/Event | Step 1/2 — Route navigation |
| Chat stress (20 msgs) | Step 5 — Rapid message send |
| FULL DIAGNOSTIC DUMP | All state at once |

---

## Pass/Fail Criteria

### Architecture is SOLID
- Custom scheme deep links resolve to correct screens
- Cold start URL correctly queues and flushes
- Idempotency guard prevents duplicate PKCE exchanges  
- Background/foreground doesn't break auth flow
- SecureStore survives app kill
- Chat reconnects and refetches on foreground
- Offline doesn't crash

### Architecture is BROKEN
- Deep link opens Home instead of target screen → `linking.config` mapping wrong
- App loops on auth callback → idempotency guard failed
- Kill + reopen → logged out → SecureStore not persisting
- Chat shows duplicates after foreground → zombie subscription
- Crash on airplane mode → missing error boundaries

---

## Dev Console Quick Reference

From React Native debugger (Flipper / Chrome DevTools):

```js
// Import the test harness
const th = require('./src/__tests__/testHarness');

// Run any test
th.simulateDeepLink('clstr://profile/abc');
th.testAuthCallbackPKCE();
th.testIdempotencyGuard();
await th.getAuthSnapshot();
await th.inspectSecureStore();
await th.runFullDiagnostic();
await th.stressSendMessages('receiver-user-id', 20, 100);
```

---

## Bug Fix Changelog (Static Audit)

Discovered during adversarial static audit of "break it" scenarios A-D.

### Bug #1 — Rapid Reconnect Race (`useRealtimeReconnect.ts`)
**Scenario A:** Background → foreground 5× in 3 seconds.  
**Root Cause:** No debounce. Each AppState transition fired `onReconnect()` even if the prior call hadn't finished.  
**Fix:** Added `RECONNECT_DEBOUNCE_MS = 2000`, `reconnecting` ref guard, `lastReconnectAt` timestamp, and `cancelled` cleanup flag.  
**Severity:** Medium — could cause duplicate channel subscriptions and stale listener leaks.

### Bug #2 — Unmounted setState (`AuthCallbackScreen.tsx`)
**Scenario B:** Background resume during auth exchange → component unmounts while async operation is in-flight.  
**Root Cause:** AppState listener calls `getSession()` (async), then `setSessionExists(true)`. If `RootNavigator` unmounts `AuthCallbackScreen` in between, React warns about state update on unmounted component.  
**Fix:** Added `let mounted = true` guard with cleanup `mounted = false` in useEffect return.  
**Severity:** Low — React warning only, no functional breakage. But indicates sloppy lifecycle management.

### Bug #3 — Deep Link Dedup Missing (`navigationRef.ts`)
**Scenario C:** Same deep-link URL fired 3× in 200ms (OS retry, double-tap notification, etc.).  
**Root Cause:** `dispatchDeepLink()` had no dedup. All 3 calls passed through to the nav listener.  
**Fix:** Added `lastDispatchedUrl` + `lastDispatchedAt` + `DEDUP_WINDOW_MS = 500` dedup check. Identical URLs within the window silently return `false`.  
**Severity:** Medium — could corrupt navigation stack (triple-pushed screens).

### Bug #4 — Push Registration Async Leak (`usePushNotificationsMobile.ts`)
**Scenario:** Latent risk found during audit. User logs in → push registration starts its async chain → user logs out rapidly → `setState()` fires on unmounted component.  
**Root Cause:** No `cancelled` flag in the async IIFE inside `useEffect`.  
**Fix:** Added `let cancelled = false` with multi-point early-return checks and cleanup `cancelled = true` in useEffect return.  
**Severity:** Low — only fires on login, but indicates missing cleanup pattern.

