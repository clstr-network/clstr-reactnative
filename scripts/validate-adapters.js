#!/usr/bin/env node

/**
 * validate-adapters.js
 *
 * CI / pre-push validation script for the @clstr/core ↔ web adapter bridge.
 *
 * Checks performed:
 * 1. Every @clstr/core/api/* module has corresponding exports in the core barrel
 * 2. The web adapter core-client creates a supabase client from the core factory
 * 3. No @clstr/core/api/* module directly imports a singleton supabase client
 * 4. All adapter files reference @clstr/core (not @/lib/) for business logic
 * 5. Core errors.ts has no UI dependencies (no toast, Alert, console.error)
 *
 * Exit code 0 = pass, 1 = fail.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let failures = 0;
let checks = 0;

function check(label, condition, detail) {
  checks++;
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    console.error(`  ❌ ${label}: ${detail || 'failed'}`);
    failures++;
  }
}

// ---------------------------------------------------------------------------
// 1. Core API modules are listed in the barrel
// ---------------------------------------------------------------------------
console.log('\n🔍 Check 1: Core API module exports\n');

const coreApiDir = path.join(ROOT, 'packages/core/src/api');
const coreBarrelPath = path.join(coreApiDir, 'index.ts');

if (fs.existsSync(coreApiDir)) {
  const apiFiles = fs
    .readdirSync(coreApiDir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts');

  const barrelContent = fs.existsSync(coreBarrelPath)
    ? fs.readFileSync(coreBarrelPath, 'utf-8')
    : '';

  for (const file of apiFiles) {
    const modName = file.replace('.ts', '');
    // Check the barrel references this module (either `export *` or explicit re-exports)
    const hasReference =
      barrelContent.includes(`'./${modName}'`) ||
      barrelContent.includes(`"./${modName}"`);
    check(`api/${modName} referenced in barrel`, hasReference, `Missing from api/index.ts`);
  }
} else {
  check('Core API directory exists', false, `${coreApiDir} not found`);
}

// ---------------------------------------------------------------------------
// 2. Web adapter uses core factory
// ---------------------------------------------------------------------------
console.log('\n🔍 Check 2: Web adapter core-client\n');

const coreClientPath = path.join(ROOT, 'src/adapters/core-client.ts');
if (fs.existsSync(coreClientPath)) {
  const content = fs.readFileSync(coreClientPath, 'utf-8');
  check(
    'Imports createSupabaseClient from @clstr/core',
    content.includes('createSupabaseClient') && content.includes('@clstr/core'),
  );
  check(
    'Does not import from @supabase/supabase-js directly',
    !content.includes("from '@supabase/supabase-js'") &&
      !content.includes('from "@supabase/supabase-js"'),
  );
} else {
  check('src/adapters/core-client.ts exists', false, 'File not found');
}

// ---------------------------------------------------------------------------
// 3. No singleton supabase imports in core API modules
// ---------------------------------------------------------------------------
console.log('\n🔍 Check 3: Core API modules are singleton-free\n');

const BANNED_IMPORTS = [
  '@/integrations/supabase/client',
  '../integrations/supabase/client',
  '../../integrations/supabase/client',
];

if (fs.existsSync(coreApiDir)) {
  const apiFiles = fs
    .readdirSync(coreApiDir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts');

  for (const file of apiFiles) {
    const content = fs.readFileSync(path.join(coreApiDir, file), 'utf-8');
    const hasBannedImport = BANNED_IMPORTS.some((imp) => content.includes(imp));
    check(`api/${file} has no singleton import`, !hasBannedImport, 'Imports supabase singleton');
  }
}

// ---------------------------------------------------------------------------
// 4. Adapter files reference @clstr/core (not @/lib/)
// ---------------------------------------------------------------------------
console.log('\n🔍 Check 4: Adapter bridge integrity\n');

const adaptersDir = path.join(ROOT, 'src/adapters');
if (fs.existsSync(adaptersDir)) {
  const adapterFiles = fs
    .readdirSync(adaptersDir, { recursive: true })
    .filter((f) => typeof f === 'string' && f.endsWith('.ts'));

  for (const file of adapterFiles) {
    const content = fs.readFileSync(path.join(adaptersDir, file), 'utf-8');
    // Check actual import/export statements (not JSDoc comments) for @/lib/
    const codeLines = content
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('*') && !l.trimStart().startsWith('//'));
    const importsLib = codeLines.some(
      (l) =>
        (l.includes('import') || l.includes('export')) &&
        (l.includes("from '@/lib/") || l.includes('from "@/lib/')),
    );
    // error-display may import toast from @/hooks — that's OK (it's a UI dep by design)
    if (file !== 'error-display.ts') {
      check(
        `adapters/${file} no @/lib/ imports`,
        !importsLib,
        'Imports from @/lib/ — should use @clstr/core',
      );
    }
  }
} else {
  check('src/adapters/ directory exists', false, 'Directory not found');
}

// ---------------------------------------------------------------------------
// 5. Core errors.ts has no UI dependencies
// ---------------------------------------------------------------------------
console.log('\n🔍 Check 5: Core errors.ts is UI-free\n');

const errorsPath = path.join(ROOT, 'packages/core/src/errors.ts');
if (fs.existsSync(errorsPath)) {
  const content = fs.readFileSync(errorsPath, 'utf-8');
  // Check for actual import statements / function calls, not JSDoc mentions
  const codeLines = content
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('*') && !l.trimStart().startsWith('//'));
  const code = codeLines.join('\n');
  check('No toast import', !code.match(/import.*toast/i));
  check('No Alert.alert call', !code.includes('Alert.alert'));
  check('No console.error calls', !code.includes('console.error'));
} else {
  check('Core errors.ts exists', false, 'File not found');
}

// ---------------------------------------------------------------------------
// 6. Core types barrel re-exports all type files
// ---------------------------------------------------------------------------
console.log('\n🔍 Check 6: Core types barrel completeness\n');

const coreTypesDir = path.join(ROOT, 'packages/core/src/types');
const typesBarrelPath = path.join(coreTypesDir, 'index.ts');

if (fs.existsSync(coreTypesDir)) {
  const typeFiles = fs
    .readdirSync(coreTypesDir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts');

  const typesBarrel = fs.existsSync(typesBarrelPath)
    ? fs.readFileSync(typesBarrelPath, 'utf-8')
    : '';

  for (const file of typeFiles) {
    const modName = file.replace('.ts', '');
    const hasRef =
      typesBarrel.includes(`'./${modName}'`) || typesBarrel.includes(`"./${modName}"`);
    check(`types/${modName} in barrel`, hasRef, `Missing from types/index.ts`);
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
console.log(`  ${checks} checks | ${checks - failures} passed | ${failures} failed`);
console.log('='.repeat(60) + '\n');

process.exit(failures > 0 ? 1 : 0);
