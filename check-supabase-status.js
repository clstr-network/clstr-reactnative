import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFiles } from './scripts/utils/env.js';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.dirname(__filename);

loadEnvFiles(projectRoot);

const projectRef = process.env.SUPABASE_PROJECT_REF || process.env.VITE_SUPABASE_PROJECT_ID;
const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  (projectRef ? `https://${projectRef}.supabase.co` : undefined);

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️  Missing Supabase credentials. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or service role key) are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const keyType =
  supabaseKey === process.env.SUPABASE_SERVICE_ROLE_KEY ||
  supabaseKey === process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    ? 'service role'
    : 'anon';

console.log(`Connecting to Supabase project ${projectRef ?? '(unknown ref)'} using ${keyType} key`);

console.log('🔍 SUPABASE DATABASE STATUS CHECK\n');
console.log('=' .repeat(80));

// Try to check if we can access tables that should exist
async function checkTableAccess(tableName) {
  try {
    // Try a simple select query
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      // If RLS blocks access, try to see if table exists by attempting an insert (which will fail but tell us if table exists)
      if (error.message.includes('permission denied') || error.message.includes('policy')) {
        return { exists: true, accessible: false, error: 'RLS blocked' };
      }
      return { exists: false, error: error.message };
    }
    return { exists: true, accessible: true, count: count || 0 };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function checkDatabase() {
  const tables = [
    // Core tables
    { name: 'profiles', category: '👤 CORE USER PROFILES' },

    // Role-specific tables
    { name: 'student_profiles', category: '🎓 ROLE-SPECIFIC PROFILES' },
    { name: 'alumni_profiles', category: '🎓 ROLE-SPECIFIC PROFILES' },
    { name: 'faculty_profiles', category: '🎓 ROLE-SPECIFIC PROFILES' },
    { name: 'club_profiles', category: '🎓 ROLE-SPECIFIC PROFILES' },
    { name: 'organization_profiles', category: '🎓 ROLE-SPECIFIC PROFILES' },

    // Social features
    { name: 'posts', category: '💬 SOCIAL FEATURES' },
    { name: 'comments', category: '💬 SOCIAL FEATURES' },
    { name: 'post_likes', category: '💬 SOCIAL FEATURES' },
    { name: 'comment_likes', category: '💬 SOCIAL FEATURES' },
    { name: 'connections', category: '💬 SOCIAL FEATURES' },
    { name: 'messages', category: '💬 SOCIAL FEATURES' },
    { name: 'notifications', category: '💬 SOCIAL FEATURES' },

    // Collaboration features
    { name: 'collab_projects', category: '🤝 COLLABORATION (CollabHub)' },
    { name: 'collab_project_roles', category: '🤝 COLLABORATION (CollabHub)' },
    { name: 'collab_team_members', category: '🤝 COLLABORATION (CollabHub)' },
    { name: 'collab_project_applications', category: '🤝 COLLABORATION (CollabHub)' },
    { name: 'collab_project_updates', category: '🤝 COLLABORATION (CollabHub)' },

    // Jobs & Career
    { name: 'jobs', category: '💼 JOBS & CAREER' },
    { name: 'job_applications', category: '💼 JOBS & CAREER' },

    // Events
    { name: 'events', category: '📅 EVENTS' },
    { name: 'event_registrations', category: '📅 EVENTS' },

    // Mentorship
    { name: 'mentorship_offers', category: '🎯 MENTORSHIP' },
    { name: 'mentorship_requests', category: '🎯 MENTORSHIP' },

    // Verification & Admin
    { name: 'verification_requests', category: '✅ VERIFICATION & ADMIN' },
    { name: 'role_change_history', category: '✅ VERIFICATION & ADMIN' },
    { name: 'admin_roles', category: '✅ VERIFICATION & ADMIN' },

    // Additional features
    { name: 'saved_items', category: '⭐ ADDITIONAL FEATURES' },
    { name: 'moderation_reports', category: '⭐ ADDITIONAL FEATURES' },
    { name: 'moderation_actions', category: '⭐ ADDITIONAL FEATURES' },
    { name: 'profile_education', category: '⭐ ADDITIONAL FEATURES' },
    { name: 'profile_experience', category: '⭐ ADDITIONAL FEATURES' },
    { name: 'profile_skills', category: '⭐ ADDITIONAL FEATURES' },
    { name: 'profile_certifications', category: '⭐ ADDITIONAL FEATURES' },
    { name: 'profile_projects', category: '⭐ ADDITIONAL FEATURES' },
    { name: 'profile_achievements', category: '⭐ ADDITIONAL FEATURES' },
  ];

  let currentCategory = '';
  const summary = {
    total: 0,
    existing: 0,
    accessible: 0,
    rls_blocked: 0,
    missing: 0,
    withData: 0,
    empty: 0
  };

  for (const table of tables) {
    if (table.category !== currentCategory) {
      console.log('\n' + '='.repeat(80));
      console.log(table.category);
      console.log('='.repeat(80));
      currentCategory = table.category;
    }

    const result = await checkTableAccess(table.name);
    summary.total++;

    if (result.exists) {
      summary.existing++;
      if (result.accessible) {
        summary.accessible++;
        const status = result.count > 0 ? `✅ EXISTS & ACCESSIBLE (${result.count} rows)` : '✅ EXISTS & ACCESSIBLE (empty)';
        console.log(`\n📊 ${table.name.padEnd(35)} ${status}`);
        if (result.count > 0) {
          summary.withData++;
        } else {
          summary.empty++;
        }
      } else {
        summary.rls_blocked++;
        console.log(`\n🔒 ${table.name.padEnd(35)} ✅ EXISTS (RLS Protected)`);
      }
    } else {
      summary.missing++;
      console.log(`\n❌ ${table.name.padEnd(35)} MISSING`);
      if (result.error && !result.error.includes('RLS blocked')) {
        console.log(`   Error: ${result.error}`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📈 DATABASE SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total tables checked:     ${summary.total}`);
  console.log(`✅ Existing tables:       ${summary.existing}`);
  console.log(`   - Accessible:          ${summary.accessible}`);
  console.log(`   - RLS Protected:       ${summary.rls_blocked}`);
  console.log(`   - With data:           ${summary.withData}`);
  console.log(`   - Empty:               ${summary.empty}`);
  console.log(`❌ Missing tables:        ${summary.missing}`);

  // Key flows status
  console.log('\n' + '='.repeat(80));
  console.log('🔄 KEY FLOWS STATUS');
  console.log('='.repeat(80));

  // Authentication Flow
  const profilesCheck = await checkTableAccess('profiles');
  console.log(`\n1. AUTHENTICATION FLOW:`);
  if (profilesCheck.exists) {
    console.log(`   ✓ Core profiles table: ✅ ${profilesCheck.accessible ? 'Ready' : 'Exists (RLS Protected)'}`);
  } else {
    console.log(`   ✓ Core profiles table: ❌ Missing`);
  }

  // Role System Flow
  const roleTablesExist = (
    (await checkTableAccess('student_profiles')).exists &&
    (await checkTableAccess('alumni_profiles')).exists &&
    (await checkTableAccess('faculty_profiles')).exists
  );
  console.log(`\n2. ROLE SYSTEM FLOW:`);
  console.log(`   ✓ Role-specific tables: ${roleTablesExist ? '✅ Ready' : '⚠️  Incomplete'}`);

  // Social Features Flow
  const socialTablesExist = (
    (await checkTableAccess('posts')).exists &&
    (await checkTableAccess('connections')).exists &&
    (await checkTableAccess('messages')).exists
  );
  console.log(`\n3. SOCIAL FEATURES FLOW:`);
  console.log(`   ✓ Social tables: ${socialTablesExist ? '✅ Ready' : '⚠️  Incomplete'}`);

  // Collaboration Flow
  const collabTablesExist = (
    (await checkTableAccess('collab_projects')).exists &&
    (await checkTableAccess('collab_project_roles')).exists
  );
  console.log(`\n4. COLLABORATION FLOW (CollabHub):`);
  console.log(`   ✓ Project tables: ${collabTablesExist ? '✅ Ready' : '⚠️  Incomplete'}`);

  console.log('\n' + '='.repeat(80));
  console.log('🔑 NOTE: RLS Protected tables exist but require authentication to access.');
  console.log('This is normal and expected for a secure application.');
  console.log('='.repeat(80));
}

checkDatabase().catch(console.error);
