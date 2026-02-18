const { Pool } = require('pg');
const fs = require('fs');

// Load .env manually
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  });
} catch {}

// Build connection string from available env vars
const projectRef = (process.env.VITE_SUPABASE_URL || '').match(/\/\/([^.]+)\./)?.[1];
const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD || '');
const connStr = `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;

const pool = new Pool({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  // Get all SECURITY DEFINER functions missing SET search_path
  const res = await pool.query(`
    SELECT p.proname, 
           pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.prosecdef = true
      AND NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) c WHERE c ILIKE 'search_path%'
      )
    ORDER BY p.proname;
  `);
  
  // Generate ALTER FUNCTION statements
  console.log('-- Migration: Add SET search_path to all SECURITY DEFINER functions missing it');
  console.log('-- Generated: ' + new Date().toISOString());
  console.log('');
  for (const r of res.rows) {
    const sig = r.args ? `public.${r.proname}(${r.args})` : `public.${r.proname}()`;
    console.log(`ALTER FUNCTION ${sig} SET search_path = public;`);
  }
  
  console.log(`\n-- Total: ${res.rows.length} functions`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
