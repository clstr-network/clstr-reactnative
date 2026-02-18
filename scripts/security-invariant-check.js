/**
 * CLSTR — Pre-/Post-Migration Security Invariant Checker
 * Runs 14 invariant checks against the remote Supabase database.
 * 
 * Usage: node scripts/security-invariant-check.js
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadEnvFiles } from './utils/env.js';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');
loadEnvFiles(projectRoot);

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!PROJECT_REF || !DB_PASSWORD) {
  console.error('Missing SUPABASE_PROJECT_REF or SUPABASE_DB_PASSWORD in .env');
  process.exit(1);
}

const pool = new pg.Pool({
  host: `db.${PROJECT_REF}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function runSQL(sql) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql);
    return result.rows;
  } finally {
    client.release();
  }
}

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(id, msg) { passed++; console.log(`  ✅ Invariant ${id}: ${msg}`); }
function fail(id, msg, detail) { failed++; console.error(`  ❌ Invariant ${id}: ${msg}`); if(detail) console.error(`     Detail:`, detail); }
function warn(id, msg) { warnings++; console.warn(`  ⚠️  Invariant ${id}: ${msg}`); }

async function main() {
  console.log('\n🔐 CLSTR Security Invariant Checker\n');
  console.log('═══════════════════════════════════════════════════\n');

  // ── Invariant 1: No cross-domain visibility without RPC gate ──
  console.log('1️⃣  Tenant Isolation');
  try {
    const policies = await runSQL(`
      SELECT policyname, qual
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT';
    `);
    const selectPolicies = Array.isArray(policies) ? policies : [];
    if (selectPolicies.length === 0) {
      fail('1', 'No SELECT policies found on profiles — expected at least profiles_select_own');
    } else {
      const allOwnRow = selectPolicies.every(p => 
        p.qual && (p.qual.includes('auth.uid()') || p.qual.includes('(id = auth.uid())'))
      );
      if (allOwnRow) {
        pass('1', `All ${selectPolicies.length} SELECT policies enforce auth.uid() — own-row only`);
      } else {
        const leaky = selectPolicies.filter(p => !p.qual?.includes('auth.uid()'));
        fail('1', `SELECT policies without auth.uid() found`, leaky.map(p => p.policyname));
      }
    }
  } catch(e) { fail('1', e.message); }

  // ── Invariant 2: All public profile reads go through RPC ──
  // (This is a code-level check done separately; verify RPCs exist)
  try {
    const rpcs = await runSQL(`
      SELECT proname FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
        AND proname IN ('get_profile_public', 'get_profiles_by_domain', 'get_alumni_by_domain');
    `);
    const rpcNames = (Array.isArray(rpcs) ? rpcs : []).map(r => r.proname);
    const expected = ['get_profile_public', 'get_profiles_by_domain', 'get_alumni_by_domain'];
    const missing = expected.filter(n => !rpcNames.includes(n));
    if (missing.length === 0) {
      pass('2', 'All 3 profile RPCs exist: get_profile_public, get_profiles_by_domain, get_alumni_by_domain');
    } else {
      fail('2', `Missing profile RPCs: ${missing.join(', ')}`);
    }
  } catch(e) { fail('2', e.message); }

  // ── Invariant 3: personal_email never leaves profile-retrieval RPCs ──
  console.log('\n2️⃣  PII Protection');
  try {
    const funcs = await runSQL(`
      SELECT proname, prosrc FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
        AND prosrc LIKE '%personal_email%'
        AND prosecdef = true;
    `);
    // These functions legitimately use personal_email for self-access, auth, or transition workflows
    const allowedFuncs = new Set([
      'get_profile_safe',              // returns caller's own profile
      'get_identity_context',          // returns caller's own identity
      'get_email_transition_status',   // returns caller's own transition status
      'get_accepted_invite_context',   // returns caller's own invite context
      'finalize_auth_email_change',    // auth email change workflow
      'validate_alumni_invite_token',  // invite validation workflow
      'resend_alumni_invite',          // admin invite management
      'transition_to_personal_email',  // email transition workflow (internal use)
      'merge_transitioned_account',    // account merge workflow (internal use)
    ]);
    const leaky = (Array.isArray(funcs) ? funcs : []).filter(f => {
      if (allowedFuncs.has(f.proname)) return false;
      // Strip SQL comments to avoid false positives
      let src = f.prosrc || '';
      src = src.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
      // Check if personal_email appears in jsonb_build_object output
      const buildsJsonWithPII = /jsonb_build_object[^;]*personal_email/is.test(src);
      return buildsJsonWithPII;
    });
    if (leaky.length === 0) {
      pass('3', 'No profile-retrieval RPC leaks personal_email (self-access/auth/transition functions allowed)');
    } else {
      fail('3', `Functions leaking personal_email: ${leaky.map(f=>f.proname).join(', ')}`);
    }
  } catch(e) { fail('3', e.message); }

  // ── Invariant 4: Sensitive tables have no readable SELECT policy ──
  try {
    const sensitivePolicies = await runSQL(`
      SELECT tablename, policyname, cmd, qual
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('email_verification_codes', 'auth_hook_error_log')
        AND cmd = 'SELECT';
    `);
    const readable = (Array.isArray(sensitivePolicies) ? sensitivePolicies : []).filter(p => {
      // USING(false) blocks all reads — OK
      if (p.qual?.includes('false')) return false;
      // is_platform_admin() is acceptable for admin-only diagnostic tables (e.g. auth_hook_error_log)
      if (p.qual?.includes('is_platform_admin')) return false;
      return true;
    });
    if (readable.length === 0) {
      pass('4', 'email_verification_codes & auth_hook_error_log have SELECT USING(false) or admin-only');
    } else {
      fail('4', `Readable SELECT policies on sensitive tables`, readable.map(p => `${p.tablename}: ${p.policyname} → ${p.qual}`));
    }
  } catch(e) { fail('4', e.message); }

  // ── Invariant 5: Plaintext OTP cannot be retrieved ──
  console.log('\n3️⃣  Auth & Email Transition');
  try {
    const otpFuncs = await runSQL(`
      SELECT proname FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
        AND proname LIKE '%generate_email_verification_code%';
    `);
    const otpList = Array.isArray(otpFuncs) ? otpFuncs : [];
    if (otpList.length === 0) {
      pass('5', 'No generate_email_verification_code function exists — OTP is safe');
    } else {
      fail('5', `OTP generation function still exists: ${otpList.map(f=>f.proname).join(', ')}`);
    }
  } catch(e) { fail('5', e.message); }

  // ── Invariant 6: transition_to_personal_email is atomic ──
  try {
    const transFunc = await runSQL(`
      SELECT prosrc FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
        AND proname = 'transition_to_personal_email';
    `);
    const funcList = Array.isArray(transFunc) ? transFunc : [];
    if (funcList.length === 0) {
      warn('6', 'transition_to_personal_email function not found (may not be needed if not used)');
    } else {
      const src = funcList[0].prosrc || '';
      const hasAdvisoryLock = /pg_advisory_xact_lock/i.test(src);
      const hasSanitizedError = /RAISE\s+EXCEPTION\s+'[^']*%'/i.test(src) === false; // no format strings leaking
      // Accept both UNION and UNION ALL — both are safe for EXISTS duplicate checks
      const hasDuplicateCheck = /\bUNION\b/i.test(src);
      
      if (hasAdvisoryLock && hasDuplicateCheck) {
        pass('6', 'transition_to_personal_email has advisory lock + comprehensive duplicate check');
      } else {
        const issues = [];
        if (!hasAdvisoryLock) issues.push('missing advisory lock');
        if (!hasDuplicateCheck) issues.push('missing comprehensive UNION duplicate check');
        fail('6', `transition_to_personal_email issues: ${issues.join(', ')}`);
      }
    }
  } catch(e) { fail('6', e.message); }

  // ── Invariant 7: No USING(true) policies ──
  console.log('\n4️⃣  RLS Stability');
  try {
    const truePolicies = await runSQL(`
      SELECT tablename, policyname, cmd, qual
      FROM pg_policies
      WHERE schemaname = 'public'
        AND qual = '(true)';
    `);
    const trueList = Array.isArray(truePolicies) ? truePolicies : [];
    if (trueList.length === 0) {
      pass('7', 'No USING(true) policies found');
    } else {
      // Some USING(true) policies are acceptable for INSERT (anyone can create their own row)
      const selectTrue = trueList.filter(p => p.cmd === 'SELECT');
      const otherTrue = trueList.filter(p => p.cmd !== 'SELECT');
      if (selectTrue.length > 0) {
        fail('7', `USING(true) SELECT policies found`, selectTrue.map(p => `${p.tablename}: ${p.policyname}`));
      } else {
        warn('7', `USING(true) on non-SELECT policies (may be OK): ${otherTrue.map(p => `${p.tablename}:${p.policyname}[${p.cmd}]`).join(', ')}`);
      }
    }
  } catch(e) { fail('7', e.message); }

  // ── Invariant 8: No broad SELECT on critical tables ──
  try {
    const broadPolicies = await runSQL(`
      SELECT tablename, policyname, qual
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('profiles', 'connections', 'messages')
        AND cmd = 'SELECT'
        AND qual NOT LIKE '%auth.uid()%';
    `);
    const broadList = Array.isArray(broadPolicies) ? broadPolicies : [];
    if (broadList.length === 0) {
      pass('8', 'All SELECT policies on profiles/connections/messages reference auth.uid()');
    } else {
      fail('8', 'Broad SELECT policies found (no auth.uid())', broadList.map(p => `${p.tablename}: ${p.policyname} → ${p.qual}`));
    }
  } catch(e) { fail('8', e.message); }

  // ── Invariant 9: SECURITY DEFINER governance ──
  console.log('\n5️⃣  SECURITY DEFINER Governance');
  try {
    const definerFuncs = await runSQL(`
      SELECT proname, proconfig, prosrc
      FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
        AND prosecdef = true;
    `);
    const defList = Array.isArray(definerFuncs) ? definerFuncs : [];
    const withoutSearchPath = defList.filter(f => {
      const config = Array.isArray(f.proconfig) ? f.proconfig : [];
      return !config.some(c => c && c.toLowerCase().includes('search_path'));
    });
    
    if (withoutSearchPath.length === 0) {
      pass('9', `All ${defList.length} SECURITY DEFINER functions have SET search_path`);
    } else {
      fail('9', `SECURITY DEFINER functions missing SET search_path`, withoutSearchPath.map(f => f.proname));
    }

    // Also check for SELECT * patterns (returning full rows)
    const selectStar = defList.filter(f => /SELECT\s+\*/i.test(f.prosrc || ''));
    if (selectStar.length > 0) {
      warn('9b', `SECURITY DEFINER functions with SELECT *: ${selectStar.map(f=>f.proname).join(', ')}`);
    }
  } catch(e) { fail('9', e.message); }

  // ── Invariant 10-11: Domain isolation (code check + immutability) ──
  console.log('\n6️⃣  Domain Isolation');
  try {
    // Check if there are any triggers that mutate college_domain
    const domainTriggers = await runSQL(`
      SELECT tgname, tgrelid::regclass, (SELECT prosrc FROM pg_proc WHERE oid = tgfoid) as src
      FROM pg_trigger
      WHERE tgrelid = 'public.profiles'::regclass
        AND tgenabled != 'D';
    `);
    const domainMutating = (Array.isArray(domainTriggers) ? domainTriggers : []).filter(t => {
      return (t.src || '').toLowerCase().includes('college_domain');
    });
    if (domainMutating.length === 0) {
      pass('10-11', 'No triggers mutate college_domain on profiles');
    } else {
      // Not necessarily bad — sync_profile_email sets domain during onboarding
      warn('10-11', `Triggers touching college_domain: ${domainMutating.map(t=>t.tgname).join(', ')} — verify they only set, never overwrite`);
    }
  } catch(e) { fail('10-11', e.message); }

  // ── Invariant 12: No silent deletion risk ──
  console.log('\n7️⃣  Merge Safety');
  try {
    // Check that merge function exists and has comprehensive checks
    const mergeFunc = await runSQL(`
      SELECT prosrc FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
        AND proname = 'merge_transitioned_account';
    `);
    const mergeList = Array.isArray(mergeFunc) ? mergeFunc : [];
    if (mergeList.length === 0) {
      warn('12', 'merge_transitioned_account not found');
    } else {
      const src = mergeList[0].prosrc || '';
      // Accept both UNION and UNION ALL — both are safe for EXISTS duplicate checks
      const hasUnionCheck = /\bUNION\b/i.test(src);
      const hasAdvisoryLock = /pg_advisory_xact_lock/i.test(src);
      if (hasUnionCheck && hasAdvisoryLock) {
        pass('12', 'merge_transitioned_account has advisory lock + comprehensive UNION check');
      } else {
        fail('12', 'merge_transitioned_account missing safety checks');
      }
    }
  } catch(e) { fail('12', e.message); }

  // ── Invariant 13: No unbounded JSON aggregation ──
  console.log('\n8️⃣  Performance Guardrails');
  try {
    const jsonAggFuncs = await runSQL(`
      SELECT proname, prosrc FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
        AND prosrc LIKE '%jsonb_agg%'
        AND prosecdef = true;
    `);
    const unbounded = (Array.isArray(jsonAggFuncs) ? jsonAggFuncs : []).filter(f => {
      const src = f.prosrc || '';
      return !(/LIMIT/i.test(src));
    });
    if (unbounded.length === 0) {
      pass('13', 'All SECURITY DEFINER functions with jsonb_agg include LIMIT');
    } else {
      fail('13', `Unbounded jsonb_agg in: ${unbounded.map(f=>f.proname).join(', ')}`);
    }
  } catch(e) { fail('13', e.message); }

  // ── Invariant 14: Full policy scan ──
  console.log('\n9️⃣  Full Policy Audit');
  try {
    const allPolicies = await runSQL(`
      SELECT policyname, tablename, cmd, qual
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    const policyList = Array.isArray(allPolicies) ? allPolicies : [];
    
    // Check for concerning patterns
    const usingTrue = policyList.filter(p => p.qual === '(true)' && p.cmd === 'SELECT');
    const noUid = policyList.filter(p => 
      p.cmd === 'SELECT' && 
      p.qual && 
      !p.qual.includes('auth.uid()') && 
      !p.qual.includes('false') &&
      !p.qual.includes('is_platform_admin')
    );

    console.log(`     Total policies: ${policyList.length}`);
    
    if (usingTrue.length === 0) {
      pass('14a', 'No USING(true) SELECT policies');
    } else {
      fail('14a', `USING(true) SELECT policies`, usingTrue.map(p => `${p.tablename}: ${p.policyname}`));
    }

    if (noUid.length === 0) {
      pass('14b', 'All SELECT policies reference auth.uid() or USING(false) or is_platform_admin()');
    } else {
      // Some tables legitimately don't need auth.uid() in SELECT (e.g. public lookup tables)
      const criticalTables = ['profiles', 'connections', 'messages', 'email_verification_codes'];
      const criticalNoUid = noUid.filter(p => criticalTables.includes(p.tablename));
      const nonCriticalNoUid = noUid.filter(p => !criticalTables.includes(p.tablename));
      
      if (criticalNoUid.length > 0) {
        fail('14b', `Critical table SELECT without auth.uid()`, criticalNoUid.map(p => `${p.tablename}: ${p.policyname} → ${p.qual}`));
      } else if (nonCriticalNoUid.length > 0) {
        warn('14b', `Non-critical tables without auth.uid() (review): ${nonCriticalNoUid.map(p => `${p.tablename}:${p.policyname}`).join(', ')}`);
      } else {
        pass('14b', 'All SELECT policies on critical tables reference auth.uid()');
      }
    }

    // Print summary of all policies for review
    console.log('\n     📋 Policy Summary by Table:');
    const byTable = {};
    policyList.forEach(p => {
      if (!byTable[p.tablename]) byTable[p.tablename] = [];
      byTable[p.tablename].push(`${p.cmd}: ${p.policyname}`);
    });
    Object.keys(byTable).sort().forEach(table => {
      console.log(`        ${table}: ${byTable[table].length} policies`);
    });

  } catch(e) { fail('14', e.message); }

  // ── Final Report ──
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${warnings} warnings\n`);
  
  if (failed > 0) {
    console.error('🚨 SECURITY INVARIANT VIOLATIONS DETECTED — DO NOT DEPLOY WITHOUT FIXING\n');
    await pool.end();
    process.exit(1);
  } else if (warnings > 0) {
    console.warn('⚠️  All critical invariants passed. Review warnings above.\n');
  } else {
    console.log('🟢 ALL INVARIANTS PASSED — Safe to deploy.\n');
  }
  await pool.end();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
