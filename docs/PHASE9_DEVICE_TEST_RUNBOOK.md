# CLSTR Phase 9 — Physical Device Test Runbook

> **Rule**: Phase 9 is complete ONLY when every row in every matrix below shows ✅.
> Architecture without runtime proof is theory. This document is the proof.

---

## Prerequisites

Before running any test:

1. **Replace placeholders** in these files:
   - `public/.well-known/apple-app-site-association` → real `<TEAM_ID>`
   - `public/.well-known/assetlinks.json` → real `<SHA256_FINGERPRINT>`
   - `apps/mobile/app.json` → real `<EXPO_PROJECT_ID>`

2. **Deploy `.well-known` files** to production:
   ```bash
   # After deploy, validate:
   curl -I https://clstr.network/.well-known/apple-app-site-association
   # Must return: 200 + Content-Type: application/json

   curl -I https://clstr.network/.well-known/assetlinks.json
   # Must return: 200 + Content-Type: application/json
   ```

3. **Build on physical devices**:
   ```bash
   # iOS (requires Apple Developer account + provisioning profile)
   eas build --platform ios --profile preview

   # Android
   eas build --platform android --profile preview
   ```

4. **Run pre-flight validation**:
   ```bash
   node scripts/validate-phase9.js
   ```

---

## Test Matrix A: Deep Link Validation

| # | Test Case | Steps | Expected Result | iOS | Android |
|---|-----------|-------|-----------------|-----|---------|
| A1 | Magic link (app installed, active) | 1. Send magic link email<br>2. Tap link in Mail/Gmail | App comes to foreground, session created, navigates to Main | ☐ | ☐ |
| A2 | Magic link (app killed) | 1. Force-quit app<br>2. Tap magic link | App cold starts, AuthCallback processes link, session created | ☐ | ☐ |
| A3 | Magic link (app backgrounded) | 1. Open app, background it<br>2. Tap magic link | App resumes, session created without duplicate exchange | ☐ | ☐ |
| A4 | Magic link (expired) | 1. Wait for link expiry (or use stale link)<br>2. Tap link | Error UI: "This sign-in link has expired" | ☐ | ☐ |
| A5 | Magic link tapped twice | 1. Tap magic link<br>2. Background app<br>3. Tap same link again | No crash, shows "already used" or stays signed in | ☐ | ☐ |
| A6 | Universal link → post/123 | 1. Share https://clstr.network/post/123<br>2. Tap in Messages | PostDetail screen with correct post | ☐ | ☐ |
| A7 | Universal link → profile/456 | 1. Share https://clstr.network/profile/456<br>2. Tap in Messages | ProfileScreen with correct profile | ☐ | ☐ |
| A8 | Universal link → events/789 | 1. Share https://clstr.network/events/789<br>2. Tap in Messages | EventDetail screen | ☐ | ☐ |
| A9 | Link on non-installed device | 1. Uninstall app<br>2. Tap universal link | Opens in Safari/Chrome (web fallback) | ☐ | ☐ |
| A10 | Link while nav tree loading | 1. Kill app<br>2. Tap link immediately on launch | Intent queued, dispatched after nav ready | ☐ | ☐ |

### iOS-Specific Verification
```bash
# On Mac, check AASA cached by the CDN Apple uses:
curl -s "https://app-site-association.cdn-apple.com/a/v1/clstr.network" | python3 -m json.tool
# If this returns your AASA → Apple has cached it. If 404 → Apple hasn't fetched it yet.
```

### Android-Specific Verification
```bash
# On device via adb:
adb shell pm get-app-links network.clstr.mobile
# Must show: verified: true

# If not verified, force re-verify:
adb shell pm verify-app-links --re-verify network.clstr.mobile

# Check intent resolution:
adb shell am start -a android.intent.action.VIEW \
  -d "https://clstr.network/post/123" \
  network.clstr.mobile
```

---

## Test Matrix B: Push Notification Validation

| # | Test Case | Steps | Expected Result | iOS | Android |
|---|-----------|-------|-----------------|-----|---------|
| B1 | Permission request | 1. Fresh install<br>2. Trigger requestPermission() | OS permission dialog appears | ☐ | ☐ |
| B2 | Token stored | 1. Grant permission<br>2. Check Supabase | device_tokens row with expo_push_token + device_type | ☐ | ☐ |
| B3 | Push sent | 1. Call send-push-notification edge fn<br>2. Check response | Expo API returns `{ data: [{ status: "ok" }] }` | ☐ | ☐ |
| B4 | Push received (foreground) | 1. App in foreground<br>2. Send push | In-app alert/banner appears, console: "Notification received" | ☐ | ☐ |
| B5 | Push received (background) | 1. Background app<br>2. Send push | System notification banner appears | ☐ | ☐ |
| B6 | Push tapped (foreground) | 1. See B4<br>2. Tap notification | Navigates to correct screen (per data.url) | ☐ | ☐ |
| B7 | Push tapped (background) | 1. See B5<br>2. Tap notification | App comes to foreground, navigates to correct screen | ☐ | ☐ |
| B8 | Push tapped (cold start) | 1. Force-quit app<br>2. Send push<br>3. Tap notification | App cold starts, navigates to correct screen | ☐ | ☐ |
| B9 | Token refresh on re-login | 1. Sign out<br>2. Sign in again | device_tokens row updated (not duplicated) | ☐ | ☐ |
| B10 | Token deactivated on sign-out | 1. Sign out<br>2. Check device_tokens | Token row marked inactive | ☐ | ☐ |

### Push Test Command
```bash
# Send a test push via Expo's push API:
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[YOUR_TOKEN_HERE]",
    "title": "Test Push",
    "body": "Phase 9 validation",
    "data": { "url": "https://clstr.network/post/123" }
  }'
```

---

## Test Matrix C: Auth Edge Cases

| # | Test Case | Steps | Expected Result | iOS | Android |
|---|-----------|-------|-----------------|-----|---------|
| C1 | Background during PKCE exchange | 1. Tap magic link<br>2. Immediately background<br>3. Resume | Session created OR clean error (no ghost state) | ☐ | ☐ |
| C2 | Network loss during exchange | 1. Tap magic link<br>2. Turn off WiFi mid-exchange | Error UI with retry option | ☐ | ☐ |
| C3 | Duplicate code exchange | 1. Tap magic link → success<br>2. Navigate back to AuthCallback with same URL | "Already used" message, no crash | ☐ | ☐ |
| C4 | OAuth implicit flow | 1. Use OAuth provider<br>2. Complete flow | Tokens from hash fragment → session created | ☐ | ☐ |
| C5 | Session persistence after kill | 1. Sign in successfully<br>2. Force-quit app<br>3. Reopen | Session persisted, Main screen shown | ☐ | ☐ |

---

## Completion Criteria

Phase 9 is **DONE** when:

- [ ] All A-matrix tests pass on iPhone
- [ ] All A-matrix tests pass on Android
- [ ] All B-matrix tests pass on iPhone
- [ ] All B-matrix tests pass on Android
- [ ] All C-matrix tests pass on both platforms
- [ ] `node scripts/validate-phase9.js` exits 0
- [ ] `<TEAM_ID>`, `<SHA256_FINGERPRINT>`, `<EXPO_PROJECT_ID>` — all replaced with real values
- [ ] AASA returns 200 + application/json from production
- [ ] `adb shell pm get-app-links` shows verified: true

---

## Failure Triage

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Safari opens instead of app (iOS) | AASA not cached by Apple CDN | Check curl to cdn-apple.com; wait 24h or reinstall app |
| Android "Open with browser" prompt | autoVerify failed | `adb shell pm verify-app-links --re-verify`; check assetlinks SHA256 |
| Auth loop / blank screen | Duplicate exchangeCodeForSession | Check consumedCodes guard in AuthCallbackScreen |
| Notification tap does nothing | Nav not ready when intent fired | Check navigationRef.isReady() + intent queue |
| Push token not stored | Missing EAS projectId | Replace `<EXPO_PROJECT_ID>` in app.json |
| "Sign-in link has expired" immediately | Clock skew or Supabase OTP expiry too short | Check device clock; increase OTP expiry in Supabase dashboard |
