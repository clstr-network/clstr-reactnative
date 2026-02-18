/**
 * CLSTR — Migration Linter
 * Scans SQL migration files for dangerous patterns that violate security invariants.
 * 
 * Usage:
 *   node scripts/lint-migrations.js                # lint all migrations
 *   node scripts/lint-migrations.js --staged       # lint only staged migration files (for CI)
 *   node scripts/lint-migrations.js <file> [file…]  # lint specific files
 * 
 * Exit code 1 if any violations found.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(projectRoot, 'supabase', 'migrations');

// ─── Dangerous Patterns ────────────────────────────────────────────────
// Each rule has: id, description, regex, severity ('error' | 'warning')
const RULES = [
  {
    id: 'NO_USING_TRUE',
    description: 'USING (true) creates an open-read policy — use auth.uid() scoping instead',
    pattern: /USING\s*\(\s*true\s*\)/gi,
    severity: 'error',
  },
  {
    id: 'NO_GRANT_ALL',
    description: 'GRANT ALL ON is overly permissive — grant specific privileges only',
    pattern: /GRANT\s+ALL\s+ON\s+/gi,
    severity: 'error',
  },
  {
    id: 'DEFINER_WITHOUT_SEARCH_PATH',
    description: 'SECURITY DEFINER without SET search_path enables search_path hijack attacks',
    // Match SECURITY DEFINER that is NOT followed (within 500 chars) by SET search_path
    // We handle this with a custom checker below instead of pure regex
    pattern: null,
    severity: 'error',
    custom: true,
  },
  {
    id: 'NO_SELECT_STAR_IN_DEFINER',
    description: 'SELECT * inside SECURITY DEFINER may leak columns added in future migrations',
    // We check this with custom logic — only flag SELECT * inside SECURITY DEFINER blocks
    pattern: null,
    severity: 'error',
    custom: true,
  },
  {
    id: 'NO_RETURN_QUERY_SELECT_STAR',
    description: 'RETURN QUERY SELECT * returns full rows — enumerate columns explicitly',
    pattern: /RETURN\s+QUERY\s+SELECT\s+\*/gi,
    severity: 'error',
  },
  {
    id: 'NO_DROP_POLICY_WITHOUT_REPLACEMENT',
    description: 'DROP POLICY without a corresponding CREATE POLICY in the same migration risks exposure gaps',
    pattern: null,
    severity: 'warning',
    custom: true,
  },
  {
    id: 'NO_DISABLE_RLS',
    description: 'ALTER TABLE ... DISABLE ROW LEVEL SECURITY removes all RLS protection',
    pattern: /ALTER\s+TABLE\s+[^\n;]+DISABLE\s+ROW\s+LEVEL\s+SECURITY/gi,
    severity: 'error',
  },
  {
    id: 'NO_PUBLIC_EXECUTE',
    description: 'GRANT EXECUTE ON FUNCTION ... TO public gives anonymous access to RPCs',
    pattern: /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+[^\n;]+TO\s+public/gi,
    severity: 'error',
  },
  {
    id: 'NO_FORCE_ROLE',
    description: 'SET ROLE or SET LOCAL ROLE in migrations can bypass RLS unexpectedly',
    pattern: /SET\s+(LOCAL\s+)?ROLE\s+/gi,
    severity: 'warning',
  },
];

// ─── Custom Checkers ────────────────────────────────────────────────────

/**
 * Check for SECURITY DEFINER functions missing SET search_path.
 * Parses CREATE OR REPLACE FUNCTION blocks.
 */
function checkDefinerWithoutSearchPath(content, filePath) {
  const violations = [];
  // Find all CREATE FUNCTION blocks that contain SECURITY DEFINER
  const funcBlockRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([\w.]+)\s*\([\s\S]*?(?:\$\$[\s\S]*?\$\$|\$[\w]+\$[\s\S]*?\$[\w]+\$)[\s\S]*?;/gi;
  let match;
  while ((match = funcBlockRegex.exec(content)) !== null) {
    const block = match[0];
    const funcName = match[1];
    if (/SECURITY\s+DEFINER/i.test(block) && !/SET\s+search_path/i.test(block)) {
      const line = content.substring(0, match.index).split('\n').length;
      violations.push({
        ruleId: 'DEFINER_WITHOUT_SEARCH_PATH',
        severity: 'error',
        message: `SECURITY DEFINER function "${funcName}" missing SET search_path`,
        file: filePath,
        line,
      });
    }
  }
  return violations;
}

/**
 * Check for SELECT * inside SECURITY DEFINER function bodies.
 */
function checkSelectStarInDefiner(content, filePath) {
  const violations = [];
  const funcBlockRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([\w.]+)\s*\([\s\S]*?(?:\$\$[\s\S]*?\$\$|\$[\w]+\$[\s\S]*?\$[\w]+\$)[\s\S]*?;/gi;
  let match;
  while ((match = funcBlockRegex.exec(content)) !== null) {
    const block = match[0];
    const funcName = match[1];
    if (/SECURITY\s+DEFINER/i.test(block)) {
      // Extract the body between $$ delimiters
      const bodyMatch = block.match(/\$\$[\s\S]*?\$\$|\$[\w]+\$([\s\S]*?)\$[\w]+\$/);
      const body = bodyMatch ? bodyMatch[0] : '';
      // Strip SQL comments
      const cleanBody = body.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
      if (/SELECT\s+\*/i.test(cleanBody)) {
        const line = content.substring(0, match.index).split('\n').length;
        violations.push({
          ruleId: 'NO_SELECT_STAR_IN_DEFINER',
          severity: 'error',
          message: `SELECT * found inside SECURITY DEFINER function "${funcName}" — enumerate columns explicitly`,
          file: filePath,
          line,
        });
      }
    }
  }
  return violations;
}

/**
 * Check for DROP POLICY without a corresponding CREATE POLICY in the same file.
 */
function checkDropPolicyWithoutReplacement(content, filePath) {
  const violations = [];
  const dropPolicyRegex = /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"?(\w+)"?\s+ON\s+"?(\w+)"?/gi;
  const createPolicyRegex = /CREATE\s+POLICY\s+"?(\w+)"?\s+ON\s+"?(\w+)"?/gi;

  const dropped = [];
  let match;
  while ((match = dropPolicyRegex.exec(content)) !== null) {
    dropped.push({
      name: match[1].toLowerCase(),
      table: match[2].toLowerCase(),
      index: match.index,
    });
  }

  const created = new Set();
  while ((match = createPolicyRegex.exec(content)) !== null) {
    created.add(`${match[2].toLowerCase()}.${match[1].toLowerCase()}`);
  }

  for (const d of dropped) {
    const key = `${d.table}.${d.name}`;
    // Allow drop-and-replace with different name if table has a corresponding CREATE
    const tableHasCreate = [...created].some(c => c.startsWith(d.table + '.'));
    if (!created.has(key) && !tableHasCreate) {
      const line = content.substring(0, d.index).split('\n').length;
      violations.push({
        ruleId: 'NO_DROP_POLICY_WITHOUT_REPLACEMENT',
        severity: 'warning',
        message: `DROP POLICY "${d.name}" on "${d.table}" without a replacement CREATE POLICY in the same migration`,
        file: filePath,
        line,
      });
    }
  }
  return violations;
}

// ─── Main ───────────────────────────────────────────────────────────────

function lintFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(projectRoot, filePath);
  const violations = [];

  // Strip SQL comments for regex-based rules to prevent false positives
  const cleanContent = content
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // Run regex-based rules
  for (const rule of RULES) {
    if (rule.custom || !rule.pattern) continue;
    let match;
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    while ((match = regex.exec(cleanContent)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      violations.push({
        ruleId: rule.id,
        severity: rule.severity,
        message: rule.description,
        file: relativePath,
        line,
      });
    }
  }

  // Run custom checks (these strip comments internally)
  violations.push(...checkDefinerWithoutSearchPath(content, relativePath));
  violations.push(...checkSelectStarInDefiner(content, relativePath));
  violations.push(...checkDropPolicyWithoutReplacement(content, relativePath));

  return violations;
}

function getMigrationFiles(args) {
  if (args.includes('--staged')) {
    // Get staged .sql files in migrations directory
    try {
      const staged = execSync('git diff --cached --name-only --diff-filter=ACMR', { cwd: projectRoot })
        .toString()
        .trim()
        .split('\n')
        .filter(f => f.startsWith('supabase/migrations/') && f.endsWith('.sql'));
      return staged.map(f => path.join(projectRoot, f));
    } catch {
      console.error('Failed to get staged files (not a git repo?)');
      return [];
    }
  }

  // Specific files passed as arguments
  const files = args.filter(a => !a.startsWith('--'));
  if (files.length > 0) {
    return files.map(f => path.resolve(f));
  }

  // Default: all migration files
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }
  return fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && !f.startsWith('.'))
    .sort()
    .map(f => path.join(migrationsDir, f));
}

function main() {
  const args = process.argv.slice(2);
  const files = getMigrationFiles(args);

  if (files.length === 0) {
    console.log('No migration files to lint.');
    process.exit(0);
  }

  console.log('\n🔍 CLSTR Migration Linter\n');
  console.log('═══════════════════════════════════════════════════\n');

  let totalErrors = 0;
  let totalWarnings = 0;
  let filesWithIssues = 0;

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.warn(`  ⚠️  File not found: ${file}`);
      continue;
    }
    const violations = lintFile(file);
    if (violations.length > 0) {
      filesWithIssues++;
      const basename = path.basename(file);
      console.log(`  📄 ${basename}`);
      for (const v of violations) {
        const icon = v.severity === 'error' ? '❌' : '⚠️ ';
        console.log(`     ${icon} [${v.ruleId}] Line ${v.line}: ${v.message}`);
        if (v.severity === 'error') totalErrors++;
        else totalWarnings++;
      }
      console.log('');
    }
  }

  console.log('═══════════════════════════════════════════════════');
  console.log(`\n📊 Scanned ${files.length} migration files`);
  console.log(`   ${totalErrors} errors, ${totalWarnings} warnings across ${filesWithIssues} files\n`);

  if (totalErrors > 0) {
    console.error('🚨 MIGRATION LINT FAILED — Fix errors before merge.\n');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.warn('⚠️  Lint passed with warnings — review before merge.\n');
  } else {
    console.log('🟢 ALL MIGRATIONS PASS LINT — Clean.\n');
  }
}

main();
