#!/usr/bin/env node
/**
 * CLSTR Phase 9 — Device Test Validation Script
 *
 * Pre-flight checks that can be run before physical device testing.
 * Validates everything that CAN be validated without a real device.
 *
 * Usage:
 *   node scripts/validate-phase9.js
 *   node scripts/validate-phase9.js --domain clstr.network
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DOMAIN = process.argv.includes('--domain')
  ? process.argv[process.argv.indexOf('--domain') + 1]
  : 'clstr.network';

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';
const INFO = '\x1b[36mℹ\x1b[0m';

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function pass(msg) { passCount++; console.log(`  ${PASS} ${msg}`); }
function fail(msg) { failCount++; console.log(`  ${FAIL} ${msg}`); }
function warn(msg) { warnCount++; console.log(`  ${WARN} ${msg}`); }
function info(msg) { console.log(`  ${INFO} ${msg}`); }
function header(msg) { console.log(`\n\x1b[1m${msg}\x1b[0m`); }

// ─── HTTP fetch helper ───────────────────────────────────────
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () =>
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        }),
      );
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

// ─── Local file checks ──────────────────────────────────────

function checkLocalFiles() {
  header('1. Local File Structure');

  // AASA file
  const aasaPath = path.join(__dirname, '..', 'public', '.well-known', 'apple-app-site-association');
  if (fs.existsSync(aasaPath)) {
    pass('apple-app-site-association exists');
    try {
      const aasa = JSON.parse(fs.readFileSync(aasaPath, 'utf8'));
      if (aasa.applinks?.details?.[0]?.appIDs) {
        const appId = aasa.applinks.details[0].appIDs[0];
        if (appId.includes('<TEAM_ID>')) {
          fail(`AASA appIDs contains placeholder: ${appId} — MUST replace with real Team ID`);
        } else {
          pass(`AASA appIDs configured: ${appId}`);
        }
      } else {
        fail('AASA missing applinks.details[0].appIDs');
      }

      const components = aasa.applinks?.details?.[0]?.components;
      if (components && components.length > 0) {
        pass(`AASA has ${components.length} path components`);
        const hasAuth = components.some((c) => c['/']?.includes('/auth/callback'));
        if (hasAuth) {
          pass('AASA includes /auth/callback path');
        } else {
          fail('AASA missing /auth/callback path');
        }
      } else {
        fail('AASA has no path components');
      }
    } catch (e) {
      fail(`AASA is not valid JSON: ${e.message}`);
    }
  } else {
    fail('apple-app-site-association file missing');
  }

  // assetlinks.json
  const assetlinksPath = path.join(__dirname, '..', 'public', '.well-known', 'assetlinks.json');
  if (fs.existsSync(assetlinksPath)) {
    pass('assetlinks.json exists');
    try {
      const al = JSON.parse(fs.readFileSync(assetlinksPath, 'utf8'));
      if (Array.isArray(al) && al.length > 0) {
        const target = al[0].target;
        if (target?.package_name) {
          pass(`Android package: ${target.package_name}`);
        }
        if (target?.sha256_cert_fingerprints?.[0]?.includes('<SHA256')) {
          fail('assetlinks.json contains placeholder SHA256 fingerprint — MUST replace');
        } else if (target?.sha256_cert_fingerprints?.[0]) {
          pass('SHA256 fingerprint configured');
        } else {
          fail('assetlinks.json missing SHA256 fingerprint');
        }
      }
    } catch (e) {
      fail(`assetlinks.json is not valid JSON: ${e.message}`);
    }
  } else {
    fail('assetlinks.json file missing');
  }

  // app.json
  const appJsonPath = path.join(__dirname, '..', 'apps', 'mobile', 'app.json');
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const expo = appJson.expo;

    if (expo?.ios?.bundleIdentifier) {
      pass(`iOS bundleIdentifier: ${expo.ios.bundleIdentifier}`);
    } else {
      fail('Missing ios.bundleIdentifier in app.json');
    }

    if (expo?.ios?.associatedDomains?.includes('applinks:clstr.network')) {
      pass('iOS associatedDomains includes applinks:clstr.network');
    } else {
      fail('Missing applinks:clstr.network in ios.associatedDomains');
    }

    if (expo?.android?.package) {
      pass(`Android package: ${expo.android.package}`);
    } else {
      fail('Missing android.package in app.json');
    }

    const intentFilters = expo?.android?.intentFilters;
    if (intentFilters?.[0]?.autoVerify === true) {
      pass('Android autoVerify: true');
    } else {
      fail('Android autoVerify not set to true');
    }

    if (expo?.extra?.eas?.projectId?.includes('<EXPO_PROJECT_ID>')) {
      fail('EAS projectId contains placeholder — push notifications will NOT work');
    } else if (expo?.extra?.eas?.projectId) {
      pass(`EAS projectId configured: ${expo.extra.eas.projectId}`);
    } else {
      fail('Missing eas.projectId — push notifications require this');
    }

    // Check notification plugin
    const plugins = expo?.plugins ?? [];
    const hasNotifPlugin = plugins.some(
      (p) => (Array.isArray(p) ? p[0] : p) === 'expo-notifications',
    );
    if (hasNotifPlugin) {
      pass('expo-notifications plugin configured');
    } else {
      fail('expo-notifications plugin missing from app.json');
    }
  } else {
    fail('apps/mobile/app.json not found');
  }
}

// ─── vercel.json checks ──────────────────────────────────────

function checkVercelConfig() {
  header('2. Vercel Deployment Config');

  const vercelPath = path.join(__dirname, '..', 'vercel.json');
  if (!fs.existsSync(vercelPath)) {
    fail('vercel.json not found');
    return;
  }

  const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));

  // Check .well-known rewrite exists
  const rewrites = vercel.rewrites ?? [];
  const hasWellKnownRewrite = rewrites.some((r) =>
    r.source?.includes('.well-known'),
  );
  if (hasWellKnownRewrite) {
    pass('.well-known rewrite rule exists');
  } else {
    fail('.well-known rewrite rule missing — files may not be served!');
  }

  // Check Content-Type header for .well-known
  const headers = vercel.headers ?? [];
  const wellKnownHeader = headers.find((h) =>
    h.source?.includes('.well-known'),
  );
  if (wellKnownHeader) {
    const ctHeader = wellKnownHeader.headers?.find(
      (h) => h.key === 'Content-Type',
    );
    if (ctHeader?.value === 'application/json') {
      pass('.well-known Content-Type: application/json');
    } else {
      fail(`.well-known Content-Type is "${ctHeader?.value}" — Apple requires application/json`);
    }

    const cacheHeader = wellKnownHeader.headers?.find(
      (h) => h.key === 'Cache-Control',
    );
    if (cacheHeader) {
      pass(`.well-known Cache-Control: ${cacheHeader.value}`);
    } else {
      warn('.well-known has no Cache-Control header');
    }
  } else {
    fail('.well-known headers not configured — Apple will reject');
  }
}

// ─── Remote validation ───────────────────────────────────────

async function checkRemoteFiles() {
  header(`3. Remote Validation (${DOMAIN})`);

  // AASA
  try {
    const aasaRes = await fetchUrl(`https://${DOMAIN}/.well-known/apple-app-site-association`);
    if (aasaRes.statusCode === 200) {
      pass(`AASA returns HTTP ${aasaRes.statusCode}`);

      const ct = aasaRes.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        pass(`AASA Content-Type: ${ct}`);
      } else {
        fail(`AASA Content-Type is "${ct}" — Apple requires application/json`);
      }

      try {
        JSON.parse(aasaRes.body);
        pass('AASA body is valid JSON');
      } catch {
        fail('AASA body is NOT valid JSON');
      }
    } else {
      fail(`AASA returns HTTP ${aasaRes.statusCode}`);
    }
  } catch (e) {
    warn(`Could not fetch AASA: ${e.message} (deploy first)`);
  }

  // assetlinks
  try {
    const alRes = await fetchUrl(`https://${DOMAIN}/.well-known/assetlinks.json`);
    if (alRes.statusCode === 200) {
      pass(`assetlinks.json returns HTTP ${alRes.statusCode}`);

      const ct = alRes.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        pass(`assetlinks.json Content-Type: ${ct}`);
      } else {
        fail(`assetlinks.json Content-Type is "${ct}" — Android requires application/json`);
      }
    } else {
      fail(`assetlinks.json returns HTTP ${alRes.statusCode}`);
    }
  } catch (e) {
    warn(`Could not fetch assetlinks.json: ${e.message} (deploy first)`);
  }
}

// ─── Code architecture checks ────────────────────────────────

function checkCodeArchitecture() {
  header('4. Code Architecture');

  // Check navigationRef is used in App.tsx
  const appTsx = path.join(__dirname, '..', 'apps', 'mobile', 'App.tsx');
  if (fs.existsSync(appTsx)) {
    const content = fs.readFileSync(appTsx, 'utf8');
    if (content.includes('navigationRef')) {
      pass('App.tsx uses navigationRef');
    } else {
      fail('App.tsx does NOT use navigationRef — notifications may fire into void');
    }
    if (content.includes('onReady') || content.includes('onNavigationReady')) {
      pass('App.tsx has onReady handler for intent queue flush');
    } else {
      fail('App.tsx missing onReady — queued intents will never dispatch');
    }
  }

  // Check AuthCallbackScreen has idempotency
  const authCallback = path.join(
    __dirname, '..', 'packages', 'shared', 'src', 'screens', 'auth', 'AuthCallbackScreen.tsx',
  );
  if (fs.existsSync(authCallback)) {
    const content = fs.readFileSync(authCallback, 'utf8');
    if (content.includes('consumedCodes')) {
      pass('AuthCallbackScreen has PKCE code idempotency guard');
    } else {
      fail('AuthCallbackScreen has NO idempotency guard — duplicate exchanges possible');
    }
    if (content.includes('AppState')) {
      pass('AuthCallbackScreen handles background-resume');
    } else {
      fail('AuthCallbackScreen does NOT handle background-resume');
    }
  }

  // Check linking.ts has dispatchDeepLink
  const linkingTs = path.join(
    __dirname, '..', 'packages', 'shared', 'src', 'navigation', 'linking.ts',
  );
  if (fs.existsSync(linkingTs)) {
    const content = fs.readFileSync(linkingTs, 'utf8');
    if (content.includes('dispatchDeepLink') || content.includes('navigationRef.isReady')) {
      pass('linking.ts guards against nav-not-ready');
    } else {
      fail('linking.ts has NO nav readiness guard');
    }
  }
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log('\n\x1b[1;36m═══════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1;36m  CLSTR Phase 9 — Pre-Device Validation\x1b[0m');
  console.log('\x1b[1;36m═══════════════════════════════════════════════\x1b[0m');

  checkLocalFiles();
  checkVercelConfig();
  await checkRemoteFiles();
  checkCodeArchitecture();

  // Summary
  header('Summary');
  console.log(`  ${PASS} Passed: ${passCount}`);
  if (warnCount > 0) console.log(`  ${WARN} Warnings: ${warnCount}`);
  if (failCount > 0) console.log(`  ${FAIL} Failed: ${failCount}`);

  if (failCount > 0) {
    console.log(`\n  \x1b[31;1m⛔ ${failCount} blocking issue(s) must be fixed before device testing.\x1b[0m\n`);
    process.exit(1);
  } else if (warnCount > 0) {
    console.log(`\n  \x1b[33;1m⚠ Non-blocking warnings. Proceed to device testing.\x1b[0m\n`);
  } else {
    console.log(`\n  \x1b[32;1m✅ All pre-flight checks passed. Ready for device testing.\x1b[0m\n`);
  }
}

main().catch((err) => {
  console.error('Validation script error:', err);
  process.exit(1);
});
