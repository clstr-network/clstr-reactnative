#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# CLSTR Phase 9 — Local Deep Link Test Script (Android Emulator)
#
# Prerequisites:
#   - Android SDK + emulator running
#   - App installed via: npx expo run:android
#   - No Play Console needed
#   - No domain DNS needed
#
# Usage:
#   chmod +x scripts/test-android-deeplinks.sh
#   ./scripts/test-android-deeplinks.sh
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

SCHEME="clstr"
PKG="network.clstr.mobile"
PASS=0
TOTAL=0

log()    { echo -e "${CYAN}[TEST]${NC} $1"; }
pass()   { echo -e "${GREEN}  ✓ SENT${NC} $1"; PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); }
warn()   { echo -e "${YELLOW}  ⚠ WARN${NC} $1"; }
header() { echo -e "\n${BOLD}═══ $1 ═══${NC}\n"; }

# Check adb is available
if ! command -v adb &> /dev/null; then
  echo -e "${RED}ERROR: adb not found. Install Android SDK Platform-Tools.${NC}"
  exit 1
fi

# Check emulator is connected
DEVICES=$(adb devices | grep -c "emulator" || true)
if [ "$DEVICES" -eq 0 ]; then
  echo -e "${RED}ERROR: No Android emulator detected. Start one from Android Studio.${NC}"
  exit 1
fi

echo -e "${BOLD}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  CLSTR Phase 9 — Android Deep Link Test Suite     ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════╝${NC}"

# ─── Step 1: Auth Callback Deep Links ─────────────────────────
header "Step 1 — Auth Callback Deep Links"

log "1a. PKCE code callback (invalid code → should show error, NOT crash)"
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://auth/callback?code=test-pkce-123" "${PKG}"
sleep 3
pass "PKCE callback. Verify: AuthCallbackScreen shows error state."

log "1b. Error callback (expired link)"
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://auth/callback?error=access_denied" "${PKG}"
sleep 3
pass "Error callback. Verify: Shows sign-in failed screen."

log "1c. OAuth implicit flow callback"
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://auth/callback?access_token=fake-at&refresh_token=fake-rt" "${PKG}"
sleep 3
pass "Implicit callback. Verify: Shows error (invalid token)."

log "1d. Idempotency — same code twice"
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://auth/callback?code=idem-test-001" "${PKG}"
sleep 1
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://auth/callback?code=idem-test-001" "${PKG}"
sleep 3
pass "Duplicate code. Verify: NO loop, shows 'already used'."

# ─── Step 2: Cold Start Deep Link ─────────────────────────────
header "Step 2 — Cold Start Deep Link"

log "2a. Force-stop app, then profile deep link"
adb shell am force-stop "${PKG}"
sleep 2
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://profile/test-user-id" "${PKG}"
sleep 5
pass "Cold-start profile. Verify: App launches → Profile screen."

log "2b. Force-stop app, then post deep link"
adb shell am force-stop "${PKG}"
sleep 2
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://post/123" "${PKG}"
sleep 5
pass "Cold-start post. Verify: App launches → PostDetail screen."

# ─── Step 3: Background Resume ────────────────────────────────
header "Step 3 — Background Resume During Auth"

log "3a. Open auth callback, then Home → back"
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://auth/callback?code=bg-resume-test" "${PKG}"
sleep 2
log "    Pressing Home..."
adb shell input keyevent KEYCODE_HOME
sleep 5
log "    Bringing app back..."
adb shell am start -n "${PKG}/.MainActivity"
sleep 3
pass "Background/foreground. Verify: No duplicate exchange."

# ─── Step 4: Route Deep Links ─────────────────────────────────
header "Step 4 — Route Deep Links"

log "4a. Profile deep link"
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://profile/abc-123" "${PKG}"
sleep 3
pass "Profile link → ProfileScreen."

log "4b. Event deep link"
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://events/evt-789" "${PKG}"
sleep 3
pass "Event link → EventDetailScreen."

log "4c. Home deep link"
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://home" "${PKG}"
sleep 3
pass "Home link → HomeScreen."

log "4d. Messaging deep link"
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://messaging" "${PKG}"
sleep 3
pass "Messaging link → MessagingListScreen."

# ─── Summary ──────────────────────────────────────────────────
header "Test Summary"

echo -e "  Deep link commands sent: ${BOLD}${TOTAL}${NC}"
echo -e "  ${GREEN}All commands dispatched: ${PASS}${NC}"
echo -e ""
echo -e "${YELLOW}  ⚠ VISUALLY VERIFY each result on the emulator.${NC}"
echo -e ""
echo -e "  ${CYAN}Manual checks still needed:${NC}"
echo -e "    • R6 persistence: Kill → reopen → still authenticated?"
echo -e "    • Chat stress: Use DevTestOverlay 🧪 button in-app"
echo -e "    • Notification nav: Use DevTestOverlay dispatch"
echo -e "    • Offline: Toggle airplane mode → no crash"
echo -e ""
echo -e "${BOLD}Done.${NC}"
