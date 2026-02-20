#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════════
# CLSTR Phase 9 — Windows PowerShell Deep Link Test Runner
#
# For developers on Windows using Android emulator (adb).
# iOS Simulator tests require macOS.
#
# Prerequisites:
#   - Android SDK with adb in PATH
#   - Android emulator running
#   - App installed via: npx expo run:android
#
# Usage:
#   .\scripts\test-android-deeplinks.ps1
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

$SCHEME = "clstr"
$PKG = "network.clstr.mobile"
$Pass = 0
$Total = 0

function Log($msg)    { Write-Host "[TEST] $msg" -ForegroundColor Cyan }
function Pass($msg)   { Write-Host "  ✓ SENT $msg" -ForegroundColor Green; $script:Pass++; $script:Total++ }
function Warn($msg)   { Write-Host "  ⚠ WARN $msg" -ForegroundColor Yellow }
function Header($msg) { Write-Host "`n═══ $msg ═══`n" -ForegroundColor White }

# Check adb
if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: adb not found. Add Android SDK platform-tools to PATH." -ForegroundColor Red
    exit 1
}

# Check emulator connected
$devices = adb devices | Select-String "emulator"
if (-not $devices) {
    Write-Host "ERROR: No Android emulator detected. Start one from Android Studio." -ForegroundColor Red
    exit 1
}

Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor White
Write-Host "║  CLSTR Phase 9 — Android Deep Link Tests (Win)   ║" -ForegroundColor White
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor White

# ─── Step 1: Auth Callback Deep Links ─────────────────────────
Header "Step 1 — Auth Callback Deep Links"

Log "1a. PKCE code callback (should show error, NOT crash)"
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://auth/callback?code=test-pkce-123" $PKG
Start-Sleep 3
Pass "PKCE callback sent"

Log "1b. Error callback"
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://auth/callback?error=access_denied" $PKG
Start-Sleep 3
Pass "Error callback sent"

Log "1c. Implicit flow callback"
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://auth/callback?access_token=fake-at`&refresh_token=fake-rt" $PKG
Start-Sleep 3
Pass "Implicit callback sent"

Log "1d. Idempotency — same code twice"
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://auth/callback?code=idem-test-001" $PKG
Start-Sleep 1
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://auth/callback?code=idem-test-001" $PKG
Start-Sleep 3
Pass "Duplicate code sent"

# ─── Step 2: Cold Start Deep Link ─────────────────────────────
Header "Step 2 — Cold Start Deep Link"

Log "2a. Force-stop + profile deep link"
adb shell am force-stop $PKG
Start-Sleep 2
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://profile/test-user-id" $PKG
Start-Sleep 5
Pass "Cold-start profile link"

Log "2b. Force-stop + post deep link"
adb shell am force-stop $PKG
Start-Sleep 2
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://post/123" $PKG
Start-Sleep 5
Pass "Cold-start post link"

# ─── Step 3: Background Resume ────────────────────────────────
Header "Step 3 — Background Resume"

Log "3a. Auth callback → Home → back"
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://auth/callback?code=bg-resume-test" $PKG
Start-Sleep 2
Log "    Pressing Home..."
adb shell input keyevent KEYCODE_HOME
Start-Sleep 5
Log "    Bringing app back..."
adb shell am start -n "${PKG}/.MainActivity"
Start-Sleep 3
Pass "Background/foreground cycle"

# ─── Step 4: Route Deep Links ─────────────────────────────────
Header "Step 4 — Route Deep Links"

Log "4a. Profile deep link"
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://profile/abc-123" $PKG
Start-Sleep 3
Pass "Profile link"

Log "4b. Event deep link"
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://events/evt-789" $PKG
Start-Sleep 3
Pass "Event link"

Log "4c. Messaging deep link"
adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://messaging" $PKG
Start-Sleep 3
Pass "Messaging link"

# ─── Summary ──────────────────────────────────────────────────
Header "Summary"

Write-Host "  Commands sent: $Total" -ForegroundColor White
Write-Host "  All dispatched: $Pass" -ForegroundColor Green
Write-Host ""
Write-Host "  ⚠ VISUALLY VERIFY each result on the emulator." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Manual checks:" -ForegroundColor Cyan
Write-Host "    • R6: Kill → reopen → still authenticated?"
Write-Host "    • Chat stress: Use DevTestOverlay in-app"
Write-Host "    • Offline: Toggle airplane mode → no crash"
Write-Host ""
Write-Host "Done." -ForegroundColor White
