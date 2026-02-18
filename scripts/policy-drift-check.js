/**
 * CLSTR — Policy Drift Detector
 * 
 * Dumps all RLS policies + SECURITY DEFINER functions from the database,
 * hashes each definition, and compares against a stored snapshot.
 * 
 * Modes:
 *   node scripts/policy-drift-check.js --snapshot    # Generate new baseline snapshot
 *   node scripts/policy-drift-check.js               # Compare current state to snapshot (CI mode)
 * 
 * Requires: SUPABASE_PROJECT_REF and SUPABASE_DB_PASSWORD in .env
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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

const SNAPSHOT_PATH = path.join(projectRoot, 'security_policy_snapshot.json');

const pool = new pg.Pool({
  host: `db.${PROJECT_REF}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

function hash(str) {
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
}

async function getCurrentState() {
  const client = await pool.connect();
  try {
    // ── RLS Policies ──
    const policiesResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);

    // ── SECURITY DEFINER Functions ──
    const functionsResult = await client.query(`
      SELECT 
        p.proname,
        pg_get_function_identity_arguments(p.oid) as args,
        p.prosecdef,
        p.proconfig,
        md5(p.prosrc) as body_hash
      FROM pg_proc p
      WHERE p.pronamespace = 'public'::regnamespace
        AND p.prosecdef = true
      ORDER BY p.proname;
    `);

    // ── RLS enabled tables ──
    const rlsResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        rowsecurity as rls_enabled,
        forcerowsecurity as rls_forced
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    return {
      policies: policiesResult.rows.map(p => ({
        table: p.tablename,
        name: p.policyname,
        cmd: p.cmd,
        permissive: p.permissive,
        roles: p.roles,
        qual_hash: hash(p.qual || ''),
        with_check_hash: hash(p.with_check || ''),
        qual: p.qual,
        with_check: p.with_check,
      })),
      definer_functions: functionsResult.rows.map(f => ({
        name: f.proname,
        args: f.args,
        config: f.proconfig,
        body_hash: f.body_hash,
      })),
      rls_tables: rlsResult.rows.map(t => ({
        table: t.tablename,
        rls_enabled: t.rls_enabled,
        rls_forced: t.rls_forced,
      })),
    };
  } finally {
    client.release();
  }
}

function generateSnapshot(state) {
  const snapshot = {
    generated_at: new Date().toISOString(),
    summary: {
      total_policies: state.policies.length,
      total_definer_functions: state.definer_functions.length,
      rls_enabled_tables: state.rls_tables.filter(t => t.rls_enabled).length,
      total_tables: state.rls_tables.length,
    },
    policies: {},
    definer_functions: {},
    rls_tables: {},
  };

  for (const p of state.policies) {
    const key = `${p.table}.${p.name}`;
    snapshot.policies[key] = {
      cmd: p.cmd,
      permissive: p.permissive,
      roles: p.roles,
      qual_hash: p.qual_hash,
      with_check_hash: p.with_check_hash,
    };
  }

  for (const f of state.definer_functions) {
    snapshot.definer_functions[f.name] = {
      args: f.args,
      config: f.config,
      body_hash: f.body_hash,
    };
  }

  for (const t of state.rls_tables) {
    snapshot.rls_tables[t.table] = {
      rls_enabled: t.rls_enabled,
      rls_forced: t.rls_forced,
    };
  }

  return snapshot;
}

function compareSnapshots(baseline, current) {
  const diffs = {
    policies_added: [],
    policies_removed: [],
    policies_changed: [],
    functions_added: [],
    functions_removed: [],
    functions_changed: [],
    rls_disabled: [],
    rls_force_removed: [],
  };

  // ── Policy drift ──
  const baselinePolicies = new Set(Object.keys(baseline.policies || {}));
  const currentPolicies = new Set(Object.keys(current.policies || {}));

  for (const key of currentPolicies) {
    if (!baselinePolicies.has(key)) {
      diffs.policies_added.push(key);
    } else {
      const b = baseline.policies[key];
      const c = current.policies[key];
      if (b.qual_hash !== c.qual_hash || b.with_check_hash !== c.with_check_hash || b.cmd !== c.cmd) {
        diffs.policies_changed.push({ key, before: b, after: c });
      }
    }
  }
  for (const key of baselinePolicies) {
    if (!currentPolicies.has(key)) {
      diffs.policies_removed.push(key);
    }
  }

  // ── Function drift ──
  const baselineFuncs = new Set(Object.keys(baseline.definer_functions || {}));
  const currentFuncs = new Set(Object.keys(current.definer_functions || {}));

  for (const name of currentFuncs) {
    if (!baselineFuncs.has(name)) {
      diffs.functions_added.push(name);
    } else {
      const b = baseline.definer_functions[name];
      const c = current.definer_functions[name];
      if (b.body_hash !== c.body_hash) {
        diffs.functions_changed.push(name);
      }
    }
  }
  for (const name of baselineFuncs) {
    if (!currentFuncs.has(name)) {
      diffs.functions_removed.push(name);
    }
  }

  // ── RLS disablement drift ──
  for (const [table, current_state] of Object.entries(current.rls_tables || {})) {
    const baseline_state = baseline.rls_tables?.[table];
    if (baseline_state) {
      if (baseline_state.rls_enabled && !current_state.rls_enabled) {
        diffs.rls_disabled.push(table);
      }
      if (baseline_state.rls_forced && !current_state.rls_forced) {
        diffs.rls_force_removed.push(table);
      }
    }
  }

  return diffs;
}

async function main() {
  const args = process.argv.slice(2);
  const snapshotMode = args.includes('--snapshot');

  console.log('\n🔍 CLSTR Policy Drift Detector\n');
  console.log('═══════════════════════════════════════════════════\n');

  const state = await getCurrentState();
  const currentSnapshot = generateSnapshot(state);

  if (snapshotMode) {
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(currentSnapshot, null, 2) + '\n');
    console.log(`  ✅ Snapshot saved to security_policy_snapshot.json`);
    console.log(`     ${currentSnapshot.summary.total_policies} policies`);
    console.log(`     ${currentSnapshot.summary.total_definer_functions} SECURITY DEFINER functions`);
    console.log(`     ${currentSnapshot.summary.rls_enabled_tables}/${currentSnapshot.summary.total_tables} tables with RLS enabled\n`);
    await pool.end();
    return;
  }

  // ── Compare mode ──
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error('  ❌ No baseline snapshot found.');
    console.error('     Generate one with: node scripts/policy-drift-check.js --snapshot\n');
    await pool.end();
    process.exit(1);
  }

  const baseline = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  const diffs = compareSnapshots(baseline, currentSnapshot);

  let hasChanges = false;
  let criticalChanges = 0;

  // ── Report ──
  if (diffs.rls_disabled.length > 0) {
    console.error(`  🚨 RLS DISABLED on tables: ${diffs.rls_disabled.join(', ')}`);
    criticalChanges += diffs.rls_disabled.length;
    hasChanges = true;
  }

  if (diffs.rls_force_removed.length > 0) {
    console.error(`  🚨 FORCE RLS removed on tables: ${diffs.rls_force_removed.join(', ')}`);
    criticalChanges += diffs.rls_force_removed.length;
    hasChanges = true;
  }

  if (diffs.policies_removed.length > 0) {
    console.error(`  ❌ ${diffs.policies_removed.length} policies REMOVED:`);
    diffs.policies_removed.forEach(p => console.error(`     • ${p}`));
    criticalChanges += diffs.policies_removed.length;
    hasChanges = true;
  }

  if (diffs.policies_changed.length > 0) {
    console.warn(`  ⚠️  ${diffs.policies_changed.length} policies CHANGED:`);
    diffs.policies_changed.forEach(d => console.warn(`     • ${d.key} (qual hash: ${d.before.qual_hash} → ${d.after.qual_hash})`));
    hasChanges = true;
  }

  if (diffs.policies_added.length > 0) {
    console.log(`  ℹ️  ${diffs.policies_added.length} policies ADDED:`);
    diffs.policies_added.forEach(p => console.log(`     + ${p}`));
    hasChanges = true;
  }

  if (diffs.functions_removed.length > 0) {
    console.error(`  ❌ ${diffs.functions_removed.length} SECURITY DEFINER functions REMOVED:`);
    diffs.functions_removed.forEach(f => console.error(`     • ${f}`));
    criticalChanges += diffs.functions_removed.length;
    hasChanges = true;
  }

  if (diffs.functions_changed.length > 0) {
    console.warn(`  ⚠️  ${diffs.functions_changed.length} SECURITY DEFINER functions CHANGED:`);
    diffs.functions_changed.forEach(f => console.warn(`     • ${f}`));
    hasChanges = true;
  }

  if (diffs.functions_added.length > 0) {
    console.log(`  ℹ️  ${diffs.functions_added.length} SECURITY DEFINER functions ADDED:`);
    diffs.functions_added.forEach(f => console.log(`     + ${f}`));
    hasChanges = true;
  }

  if (!hasChanges) {
    console.log(`  ✅ No drift detected. Snapshot matches database state.`);
    console.log(`     ${currentSnapshot.summary.total_policies} policies, ${currentSnapshot.summary.total_definer_functions} definer functions\n`);
  }

  console.log('\n═══════════════════════════════════════════════════\n');

  await pool.end();

  if (criticalChanges > 0) {
    console.error(`🚨 ${criticalChanges} CRITICAL CHANGES DETECTED — Review required before deploy.\n`);
    console.error(`   If changes are intentional, regenerate snapshot:`);
    console.error(`   node scripts/policy-drift-check.js --snapshot\n`);
    process.exit(1);
  } else if (hasChanges) {
    console.warn(`⚠️  Non-critical changes detected. Review and update snapshot if intentional.\n`);
  } else {
    console.log(`🟢 Policy snapshot matches. No drift.\n`);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
