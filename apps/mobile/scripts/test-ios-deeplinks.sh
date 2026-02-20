#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# CLSTR Phase 9 — Local Deep Link Test Script (iOS Simulator)
#
# Prerequisites:
#   - Xcode + iOS Simulator running
#   - App installed via: npx expo run:ios
#   - No Apple Developer account needed
#   - No domain DNS needed
#
# Usage:
#   chmod +x scripts/test-ios-deeplinks.sh
#   ./scripts/test-ios-deeplinks.sh
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

SCHEME="clstr"
PASS=0
FAIL=0
TOTAL=0

log()    { echo -e "${CYAN}[TEST]${NC} $1"; }
pass()   { echo -e "${GREEN}  ✓ PASS${NC} $1"; PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); }
fail()   { echo -e "${RED}  ✗ FAIL${NC} $1"; FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); }
warn()   { echo -e "${YELLOW}  ⚠ WARN${NC} $1"; }
header() { echo -e "\n${BOLD}═══ $1 ═══${NC}\n"; }

# Check xcrun is available
if ! command -v xcrun &> /dev/null; then
  echo -e "${RED}ERROR: xcrun not found. Install Xcode Command Line Tools.${NC}"
  exit 1
fi

# Check simulator is booted
BOOTED=$(xcrun simctl list devices booted 2>/dev/null | grep -c "Booted" || true)
if [ "$BOOTED" -eq 0 ]; then
  echo -e "${RED}ERROR: No iOS Simulator is booted. Start one from Xcode.${NC}"
  exit 1
fi

echo -e "${BOLD}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  CLSTR Phase 9 — iOS Deep Link Test Suite     ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════╝${NC}"

# ─── Step 1: Auth Callback Deep Links ─────────────────────────
header "Step 1 — Auth Callback Deep Links"

log "1a. PKCE code callback (invalid code → should show error, NOT crash)"
xcrun simctl openurl booted "${SCHEME}://auth/callback?code=test-pkce-123"
sleep 3
pass "Sent PKCE callback. Verify: AuthCallbackScreen shows error state."

log "1b. Error callback (expired link)"
xcrun simctl openurl booted "${SCHEME}://auth/callback?error=access_denied&error_description=Link+has+expired"
sleep 3
pass "Sent error callback. Verify: Shows 'Sign-in Failed' screen."

log "1c. OAuth implicit flow callback"
xcrun simctl openurl booted "${SCHEME}://auth/callback?access_token=fake-at&refresh_token=fake-rt"
sleep 3
pass "Sent implicit callback. Verify: Shows error (invalid token) or success."

log "1d. Idempotency — sending same code twice"
xcrun simctl openurl booted "${SCHEME}://auth/callback?code=idem-test-001"
sleep 1
xcrun simctl openurl booted "${SCHEME}://auth/callback?code=idem-test-001"
sleep 3
pass "Sent duplicate code. Verify: NO infinite loop, shows 'already used' or error."

# ─── Step 2: Cold Start Deep Link ─────────────────────────────
header "Step 2 — Cold Start Deep Link"

log "2a. Kill app, then open via profile deep link"
xcrun simctl terminate booted network.clstr.mobile 2>/dev/null || true
sleep 2
xcrun simctl openurl booted "${SCHEME}://profile/test-user-id"
sleep 5
pass "Cold-start profile link. Verify: App launches → Profile screen (or login first)."

log "2b. Kill app, then open via post deep link"
xcrun simctl terminate booted network.clstr.mobile 2>/dev/null || true
sleep 2
xcrun simctl openurl booted "${SCHEME}://post/123"
sleep 5
pass "Cold-start post link. Verify: App launches → PostDetail screen."

# ─── Step 3: Background Resume ────────────────────────────────
header "Step 3 — Background Resume During Auth"

log "3a. Open auth callback, then background + foreground"
xcrun simctl openurl booted "${SCHEME}://auth/callback?code=bg-resume-test"
sleep 2
log "    Backgrounding app..."
xcrun simctl launch booted com.apple.springboard 2>/dev/null || true
sleep 5
log "    Foregrounding app..."
xcrun simctl launch booted network.clstr.mobile 2>/dev/null || true
sleep 3
pass "Background/foreground cycle. Verify: No duplicate exchange, no loop."

# ─── Step 4: Route Deep Links (Authenticated) ─────────────────
header "Step 4 — Route Deep Links"

log "4a. Profile deep link"
xcrun simctl openurl booted "${SCHEME}://profile/abc-123"
sleep 3
pass "Profile link. Verify: navigates to ProfileScreen with id=abc-123."

log "4b. Event deep link"
xcrun simctl openurl booted "${SCHEME}://events/evt-789"
sleep 3
pass "Event link. Verify: navigates to EventDetailScreen with id=evt-789."

log "4c. Home deep link"
xcrun simctl openurl booted "${SCHEME}://home"
sleep 3
pass "Home link. Verify: navigates to HomeScreen/FeedScreen."

log "4d. Messaging deep link"
xcrun simctl openurl booted "${SCHEME}://messaging"
sleep 3
pass "Messaging link. Verify: navigates to MessagingListScreen."

# ─── Step 7: Offline Test ─────────────────────────────────────
header "Step 7 — Offline Resilience (Manual)"

warn "To test offline behavior:"
warn "  1. Enable Airplane Mode on the simulator"
warn "  2. Open the app"
warn "  3. Verify: No crash, queries fail gracefully, no infinite spinners"
warn "  4. Disable Airplane Mode"
warn "  5. Verify: App recovers, data loads"
echo ""

# ─── Summary ──────────────────────────────────────────────────
header "Test Summary"

echo -e "  Deep link tests dispatched: ${BOLD}${TOTAL}${NC}"
echo -e "  ${GREEN}Commands sent: ${PASS}${NC}"
echo -e ""
echo -e "${YELLOW}  ⚠ All 'PASS' marks mean the deep link was SENT successfully.${NC}"
echo -e "${YELLOW}    You must VISUALLY VERIFY the app behavior for each test.${NC}"
echo -e ""
echo -e "  ${CYAN}Manual checks still needed:${NC}"
echo -e "    • Step 4 (R6): Kill + reopen → still authenticated?"
echo -e "    • Step 5: Chat stress test → use DevTestOverlay 🧪 button"
echo -e "    • Step 6: Notification tap → use DevTestOverlay dispatch"
echo -e "    • Step 7: Airplane mode → no crash?"
echo -e ""
echo -e "${BOLD}Done. Check the simulator for each result.${NC}"
