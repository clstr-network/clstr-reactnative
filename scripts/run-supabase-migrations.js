import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { loadEnvFiles } from './utils/env.js';

const __filename = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(__filename);
const projectRoot = path.resolve(scriptsDir, '..');

loadEnvFiles(projectRoot);

const isWindows = process.platform === 'win32';
const npxBin = 'npx';

const args = process.argv.slice(2);
const skipLink = args.includes('--skip-link');
const skipStatus = args.includes('--skip-status');
const dryRun = args.includes('--dry-run');
const forceLink = args.includes('--force-link');
const includeAll = args.includes('--include-all');

const projectRef =
  process.env.SUPABASE_PROJECT_REF ||
  process.env.VITE_SUPABASE_PROJECT_ID ||
  process.env.SUPABASE_PROJECT_ID;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

function requiredEnv(name, value, { optional } = { optional: false }) {
  if (!value && !optional) {
    console.error(`⚠️  Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

requiredEnv('VITE_SUPABASE_PROJECT_ID or SUPABASE_PROJECT_REF', projectRef);
requiredEnv('SUPABASE_ACCESS_TOKEN', accessToken, { optional: dryRun });
requiredEnv('SUPABASE_DB_PASSWORD', dbPassword, { optional: dryRun || skipLink });

function runCommand(commandArgs, label) {
  if (dryRun) {
    console.log(`[dry-run] npx ${commandArgs.join(' ')}`);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const child = spawn(npxBin, commandArgs, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: accessToken
      },
      shell: isWindows
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command '${label}' exited with code ${code}`));
      }
    });
  });
}

async function ensureLinked() {
  if (skipLink) {
    console.log('⏭️  Skipping supabase link step');
    return;
  }

  if (!forceLink) {
    try {
      const linkedRef = await fs.readFile(path.join(projectRoot, 'supabase', '.temp', 'project-ref'), 'utf8');
      if (linkedRef.trim() === projectRef) {
        console.log('🔗 Supabase project already linked');
        return;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('⚠️  Unable to read existing project ref, relinking...');
      }
    }
  }

  const linkArgs = [
    'supabase',
    'link',
    '--project-ref',
    projectRef,
    '--password',
    dbPassword,
    '--yes'
  ];

  console.log('🔗 Linking Supabase project...');
  await runCommand(linkArgs, 'supabase link');
}

async function pushMigrations() {
  const pushArgs = ['supabase', 'db', 'push'];
  if (includeAll) {
    pushArgs.push('--include-all');
  }
  console.log('🚀 Applying pending migrations to Supabase...');
  await runCommand(pushArgs, 'supabase db push');
}

async function runStatusCheck() {
  if (skipStatus) {
    console.log('⏭️  Skipping status check');
    return;
  }

  const statusArgs = ['node', 'check-supabase-status.js'];
  console.log('📊 Running post-migration status check...');
  await runCommand(statusArgs, 'supabase status check');
}

async function main() {
  try {
    await ensureLinked();
    await pushMigrations();
    await runStatusCheck();
    console.log('✅ Supabase migrations complete');
  } catch (error) {
    console.error('❌ Migration automation failed');
    console.error(error.message);
    process.exit(1);
  }
}

main();
