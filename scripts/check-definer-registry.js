/**
 * CLSTR — SECURITY DEFINER Registry Checker
 * 
 * Ensures every SECURITY DEFINER function in the database is registered
 * in security_definer_registry.json, and no registered function has been
 * silently removed.
 * 
 * Modes:
 *   node scripts/check-definer-registry.js             # CI check (exit 1 on violations)
 *   node scripts/check-definer-registry.js --discover   # Print unregistered functions for adding to registry
 * 
 * Requires: SUPABASE_PROJECT_REF and SUPABASE_DB_PASSWORD in .env
 */
import fs from 'node:fs';
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

const REGISTRY_PATH = path.join(projectRoot, 'security_definer_registry.json');

const pool = new pg.Pool({
  host: `db.${PROJECT_REF}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function getDefinerFunctions() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT p.proname,
             pg_get_function_identity_arguments(p.oid) as args,
             p.proconfig,
             CASE WHEN p.prosrc LIKE '%personal_email%' THEN true ELSE false END as touches_pii
      FROM pg_proc p
      WHERE p.pronamespace = 'public'::regnamespace
        AND p.prosecdef = true
      ORDER BY p.proname;
    `);
    return result.rows;
  } finally {
    client.release();
  }
}

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error(`Registry file not found: ${REGISTRY_PATH}`);
    console.error('Create it with: node scripts/check-definer-registry.js --discover');
    process.exit(1);
  }
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  const args = process.argv.slice(2);
  const discoverMode = args.includes('--discover');

  console.log('\n🔐 CLSTR SECURITY DEFINER Registry Checker\n');
  console.log('═══════════════════════════════════════════════════\n');

  const dbFunctions = await getDefinerFunctions();
  const registry = loadRegistry();
  const registeredNames = new Set(Object.keys(registry.functions || {}));
  const dbNames = new Set(dbFunctions.map(f => f.proname));

  let errors = 0;
  let warnings = 0;

  // ── Check 1: Unregistered functions in database ──
  const unregistered = dbFunctions.filter(f => !registeredNames.has(f.proname));
  
  if (unregistered.length > 0) {
    if (discoverMode) {
      console.log('📋 Unregistered SECURITY DEFINER functions (add to registry):\n');
      for (const f of unregistered) {
        const config = Array.isArray(f.proconfig) ? f.proconfig : [];
        const hasSearchPath = config.some(c => c?.toLowerCase().includes('search_path'));
        console.log(`  "${f.proname}": {`);
        console.log(`    "purpose": "TODO: describe purpose",`);
        console.log(`    "pii_access": ${f.touches_pii},`);
        console.log(`    "justification": "TODO: justify SECURITY DEFINER usage",`);
        console.log(`    "owner": "TODO",`);
        console.log(`    "added": "${new Date().toISOString().split('T')[0]}"`);
        console.log(`  },`);
        if (!hasSearchPath) {
          console.log(`    ⚠️  Missing SET search_path!`);
        }
        console.log('');
      }
    } else {
      console.error(`  ❌ ${unregistered.length} UNREGISTERED SECURITY DEFINER functions found:\n`);
      for (const f of unregistered) {
        console.error(`     • ${f.proname}(${f.args || ''}) ${f.touches_pii ? '⚠️  touches PII' : ''}`);
        errors++;
      }
      console.error('\n     Add them to security_definer_registry.json or remove SECURITY DEFINER.\n');
    }
  } else {
    console.log(`  ✅ All ${dbFunctions.length} SECURITY DEFINER functions are registered.\n`);
  }

  // ── Check 2: Registered functions missing from database ──
  const removed = [...registeredNames].filter(name => !dbNames.has(name));
  
  if (removed.length > 0) {
    console.warn(`  ⚠️  ${removed.length} registered functions NOT FOUND in database:\n`);
    for (const name of removed) {
      console.warn(`     • ${name} — was it intentionally removed?`);
      warnings++;
    }
    console.warn('\n     Remove from registry if intentional, or investigate if unexpected.\n');
  } else {
    console.log(`  ✅ All registered functions exist in database.\n`);
  }

  // ── Check 3: PII access audit ──
  const piiDeclared = Object.entries(registry.functions || {})
    .filter(([, v]) => v.pii_access)
    .map(([k]) => k);
  const piiActual = dbFunctions.filter(f => f.touches_pii).map(f => f.proname);
  
  const undeclaredPII = piiActual.filter(name => {
    const entry = registry.functions?.[name];
    return entry && !entry.pii_access;
  });

  if (undeclaredPII.length > 0) {
    console.error(`  ❌ Functions touching PII but not declared as pii_access: true:\n`);
    for (const name of undeclaredPII) {
      console.error(`     • ${name}`);
      errors++;
    }
    console.error('');
  } else {
    console.log(`  ✅ PII access declarations match database reality.\n`);
  }

  // ── Check 4: search_path compliance ──
  const missingSearchPath = dbFunctions.filter(f => {
    const config = Array.isArray(f.proconfig) ? f.proconfig : [];
    return !config.some(c => c?.toLowerCase().includes('search_path'));
  });

  if (missingSearchPath.length > 0) {
    console.error(`  ❌ ${missingSearchPath.length} SECURITY DEFINER functions missing SET search_path:\n`);
    for (const f of missingSearchPath) {
      console.error(`     • ${f.proname}`);
      errors++;
    }
    console.error('');
  } else {
    console.log(`  ✅ All SECURITY DEFINER functions have SET search_path.\n`);
  }

  // ── Summary ──
  console.log('═══════════════════════════════════════════════════');
  console.log(`\n📊 ${dbFunctions.length} definer functions, ${registeredNames.size} registered`);
  console.log(`   ${errors} errors, ${warnings} warnings\n`);

  await pool.end();

  if (errors > 0 && !discoverMode) {
    console.error('🚨 REGISTRY CHECK FAILED — Register all functions before merge.\n');
    process.exit(1);
  } else {
    console.log('🟢 Registry check passed.\n');
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
