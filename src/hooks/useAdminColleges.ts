import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/contexts/AdminContext';
import { useToast } from '@/hooks/use-toast';
import { assertValidUuid, isValidUuid } from '@/lib/uuid';
import { formatCollegeName, normalizeDomain, isValidDomain, isPublicEmailDomain } from '@/lib/college-utils';

/**
 * useAdminColleges - React Query hook for Admin Colleges page
 * 
 * CORRECT DATA MODEL:
 * - Colleges page shows ONLY canonical college entities from `colleges` table
 * - A college is an INSTITUTION with name, city, country, UUID
 * - Domains are ATTRIBUTES of colleges (one college can have many domains)
 * 
 * IMPORTANT:
 * - A domain is NOT a college
 * - gmail.com should NEVER appear on the Colleges page
 * - College IDs are proper UUIDs. Always use assertValidUuid() before mutations.
 */

// Types for admin colleges data
export type CollegeStatus = 'verified' | 'unverified' | 'flagged';

export interface AdminCollege {
  /** UUID from the colleges table - this is the PRIMARY KEY */
  id: string;
  /** Display name of the college (human-readable, not a domain) */
  name: string;
  /** City location */
  city: string | null;
  /** Country location */
  country: string | null;
  /** Canonical domain (e.g., "example.edu") - used for linking profiles */
  canonical_domain: string;
  /** Total user count */
  users_count: number;
  /** Alumni user count */
  alumni_count: number;
  /** Student user count */
  student_count: number;
  /** Faculty user count */
  faculty_count: number;
  /** Number of domain aliases pointing to this college */
  domains_count: number;
  /** Verification status */
  status: CollegeStatus;
  /** When the first user from this college joined */
  first_user_at: string | null;
  /** When the most recent user from this college joined */
  latest_user_at: string | null;
  /** AI confidence score for auto-detection */
  confidence_score: number;
  /** Number of posts in the last 7 days */
  posts_per_week: number;
  /** Total post count */
  posts_count: number;
  /** Number of clubs */
  clubs_count: number;
  /** Number of events */
  events_count: number;
  /** Active users in last 7 days */
  active_users_7d: number;
  /** When the college record was created */
  created_at: string;
}

export interface CollegeDomain {
  id: string;
  domain: string;
  status: 'approved' | 'pending' | 'blocked';
  user_count: number;
}

// Cache configuration constants
const COLLEGES_STALE_TIME = 1000 * 60 * 2; // 2 minutes
const COLLEGES_REFETCH_INTERVAL = 1000 * 60 * 5; // 5 minutes background refetch

/**
 * Fetch colleges from database using the CORRECT data model
 * 
 * This queries the `colleges` table directly - NOT domains.
 * Public email domains (gmail.com, etc.) should NEVER appear here.
 */
async function fetchColleges(): Promise<AdminCollege[]> {
  try {
    // Try the new RPC first (uses proper college_id FK joins)
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc('get_admin_colleges_list');
    
    if (!rpcError && rpcData && Array.isArray(rpcData)) {
      // Validate all college IDs are proper UUIDs
      for (const college of rpcData) {
        assertValidUuid(college.id, 'college.id');
      }
      
      return rpcData.map((college: any) => ({
        id: college.id,
        name: college.name || formatCollegeName(college.canonical_domain),
        city: college.city || null,
        country: college.country || null,
        canonical_domain: college.canonical_domain,
        users_count: Number(college.total_users) || 0,
        alumni_count: Number(college.alumni_count) || 0,
        student_count: Number(college.student_count) || 0,
        faculty_count: Number(college.faculty_count) || 0,
        domains_count: Number(college.domains_count) || 0,
        status: (college.status || 'unverified') as CollegeStatus,
        first_user_at: college.first_user_at || null,
        latest_user_at: college.latest_user_at || null,
        confidence_score: Number(college.confidence_score) || 0,
        posts_per_week: 0, // Calculated separately if needed
        posts_count: Number(college.posts_count) || 0,
        clubs_count: Number(college.clubs_count) || 0,
        events_count: Number(college.events_count) || 0,
        active_users_7d: Number(college.active_users_7d) || 0,
        created_at: college.created_at || new Date().toISOString(),
      }));
    }

    // Fallback: Direct query with proper joins
    const [collegesResult, aliasesResult, statsResult] = await Promise.all([
      supabase.from('colleges').select('id, canonical_domain, name, city, country, status, confidence_score, created_at, updated_at'),
      supabase.from('college_domain_aliases').select('college_id, domain').not('college_id', 'is', null),
      (supabase as any).rpc('get_admin_college_stats').catch(() => ({ data: [] })),
    ]);

    if (collegesResult?.error) {
      throw new Error(`Failed to fetch colleges: ${collegesResult.error.message}`);
    }

    const collegesData = (collegesResult?.data || []) as any[];
    const aliasesData = (aliasesResult?.data || []) as any[];
    const statsData = (statsResult?.data || []) as any[];

    // Build stats map by canonical_domain
    const statsMap = new Map<string, any>();
    for (const stat of statsData) {
      if (stat.college_domain) {
        statsMap.set(stat.college_domain, stat);
      }
    }

    // Count domains per college (by college_id)
    const domainsCountMap = new Map<string, number>();
    for (const alias of aliasesData) {
      if (alias.college_id) {
        domainsCountMap.set(alias.college_id, (domainsCountMap.get(alias.college_id) || 0) + 1);
      }
    }

    // Validate all college IDs are proper UUIDs
    for (const college of collegesData) {
      assertValidUuid(college.id, 'college.id');
    }

    return collegesData.map((college) => {
      const canonicalDomain = college.canonical_domain;
      const stats = statsMap.get(canonicalDomain);

      return {
        id: college.id,
        name: college?.name || formatCollegeName(canonicalDomain),
        city: college?.city || null,
        country: college?.country || null,
        canonical_domain: canonicalDomain,
        users_count: parseInt(stats?.total_users) || 0,
        alumni_count: parseInt(stats?.alumni_count) || 0,
        student_count: parseInt(stats?.student_count) || 0,
        faculty_count: parseInt(stats?.faculty_count) || 0,
        domains_count: domainsCountMap.get(college.id) || 0,
        status: (college?.status || 'unverified') as CollegeStatus,
        first_user_at: stats?.first_user_at || college?.created_at || null,
        latest_user_at: stats?.latest_user_at || college?.updated_at || null,
        confidence_score: Number(college?.confidence_score) || 0,
        posts_per_week: 0,
        posts_count: parseInt(stats?.post_count) || 0,
        clubs_count: parseInt(stats?.club_count) || 0,
        events_count: parseInt(stats?.event_count) || 0,
        active_users_7d: parseInt(stats?.active_users_7d) || 0,
        created_at: college?.created_at || new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error('Error fetching colleges:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes('row-level security') || errMsg.includes('permission denied') || errMsg.includes('RLS')) {
      throw new Error('Access denied. Please ensure your account is listed as a platform admin in Supabase.');
    }
    throw error;
  }
}

// Verify college mutation
async function verifyCollegeFn({ collegeId, adminRole }: { collegeId: string; adminRole: string | null }): Promise<void> {
  assertValidUuid(collegeId, 'collegeId');
  if (!adminRole) throw new Error('Not authorized');

  const { error } = await supabase
    .from('colleges')
    .update({ 
      status: 'verified',
      updated_at: new Date().toISOString(),
    })
    .eq('id', collegeId);

  if (error) {
    throw new Error(`Failed to verify college: ${error.message}`);
  }

  await logAdminAction('verify_college', 'college', collegeId);
}

// Flag college mutation
async function flagCollegeFn({ collegeId, adminRole }: { collegeId: string; adminRole: string | null }): Promise<void> {
  assertValidUuid(collegeId, 'collegeId');
  if (!adminRole) throw new Error('Not authorized');

  const { error } = await supabase
    .from('colleges')
    .update({ 
      status: 'flagged',
      updated_at: new Date().toISOString(),
    })
    .eq('id', collegeId);

  if (error) {
    throw new Error(`Failed to flag college: ${error.message}`);
  }

  await logAdminAction('flag_college', 'college', collegeId);
}

// Update college info mutation
async function updateCollegeFn({ 
  collegeId, 
  name, 
  city, 
  country,
  confidenceScore,
  adminRole,
}: { 
  collegeId: string; 
  name?: string; 
  city?: string; 
  country?: string;
  confidenceScore?: number;
  adminRole: string | null;
}): Promise<void> {
  assertValidUuid(collegeId, 'collegeId');
  if (!adminRole) throw new Error('Not authorized');
  if (adminRole === 'moderator') throw new Error('Insufficient permissions');

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (city !== undefined) updates.city = city;
  if (country !== undefined) updates.country = country;
  if (confidenceScore !== undefined) updates.confidence_score = confidenceScore;

  const { error } = await supabase
    .from('colleges')
    .update(updates)
    .eq('id', collegeId);

  if (error) {
    throw new Error(`Failed to update college: ${error.message}`);
  }

  // Log the action
  await logAdminAction('update_college', 'college', collegeId, { name, city, country, confidenceScore });
}

/**
 * Merge two colleges by moving all users and aliases from source to target
 * 
 * @param sourceDomain - The canonical domain of the college to merge FROM (will be deleted)
 * @param targetDomain - The canonical domain of the college to merge INTO (will be kept)
 * 
 * NOTE: These are DOMAIN STRINGS, not UUIDs. The function operates on canonical_domain fields.
 */
async function mergeCollegesFn({ 
  sourceDomain, 
  targetDomain, 
  adminRole 
}: { 
  sourceDomain: string; 
  targetDomain: string; 
  adminRole: string | null;
}): Promise<void> {
  if (!adminRole) throw new Error('Not authorized');
  if (adminRole === 'moderator') throw new Error('Insufficient permissions');
  
  // Validate domain inputs
  if (!sourceDomain || !targetDomain) {
    throw new Error('Source and target domains are required');
  }
  
  const normalizedSource = normalizeDomain(sourceDomain);
  const normalizedTarget = normalizeDomain(targetDomain);
  
  if (!isValidDomain(normalizedSource)) {
    throw new Error('Invalid source domain format');
  }
  
  if (!isValidDomain(normalizedTarget)) {
    throw new Error('Invalid target domain format');
  }
  
  if (normalizedSource === normalizedTarget) {
    throw new Error('Cannot merge a college into itself');
  }

  // Step 1: Update all profiles from source to target domain
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ 
      college_domain: normalizedTarget,
      updated_at: new Date().toISOString(),
    })
    .eq('college_domain', normalizedSource);

  if (profileError) {
    throw new Error(`Failed to update profiles: ${profileError.message}`);
  }

  // Step 2: Move alias mappings to target canonical domain
  const { error: aliasError } = await supabase
    .from('college_domain_aliases')
    .update({ 
      canonical_domain: normalizedTarget, 
      updated_at: new Date().toISOString() 
    })
    .eq('canonical_domain', normalizedSource);

  if (aliasError) {
    throw new Error(`Failed to update domain aliases: ${aliasError.message}`);
  }

  // Step 3: Delete the source college entity
  const { error: deleteError } = await supabase
    .from('colleges')
    .delete()
    .eq('canonical_domain', normalizedSource);

  if (deleteError) {
    throw new Error(`Failed to delete source college: ${deleteError.message}`);
  }

  // Log the action
  await logAdminAction('merge_colleges', 'college', normalizedSource, { merged_into: normalizedTarget });
}

// Log admin action (non-blocking - won't fail mutations if logging fails)
async function logAdminAction(
  actionType: string, 
  targetType: string, 
  targetId: string, 
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
  
    const { error } = await (supabase as any)
      .from('admin_activity_logs')
      .insert({
        admin_email: session?.user?.email || 'unknown',
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        details,
      });

    if (error) {
      console.warn('Failed to log admin action:', error.message);
    }
  } catch (err) {
    console.warn('Failed to log admin action:', err);
  }
}

// Hook for admin colleges
export function useAdminColleges() {
  const { isAdmin, adminUser } = useAdmin();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for colleges
  const collegesQuery = useQuery({
    queryKey: ['admin-colleges'],
    queryFn: fetchColleges,
    enabled: isAdmin,
    staleTime: COLLEGES_STALE_TIME,
    refetchInterval: COLLEGES_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });

  // Realtime subscription for colleges and related tables
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin_colleges_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'colleges' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-colleges'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'college_domain_aliases' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-colleges'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-colleges'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-colleges'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_college_stats' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-colleges'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  // Verify college mutation
  const verifyMutation = useMutation({
    mutationFn: (collegeId: string) => verifyCollegeFn({ collegeId, adminRole: adminUser?.role || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-colleges'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['admin-domains'] });
      toast({
        title: 'College Verified',
        description: 'The college has been verified successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Flag college mutation
  const flagMutation = useMutation({
    mutationFn: (collegeId: string) => flagCollegeFn({ collegeId, adminRole: adminUser?.role || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-colleges'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['admin-domains'] });
      toast({
        title: 'College Flagged',
        description: 'The college has been flagged.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update college mutation
  const updateMutation = useMutation({
    mutationFn: (payload: { collegeId: string; name?: string; city?: string; country?: string; confidenceScore?: number }) =>
      updateCollegeFn({ ...payload, adminRole: adminUser?.role || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-colleges'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['admin-domains'] });
      toast({
        title: 'College Updated',
        description: 'The college information has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Merge colleges mutation
  const mergeMutation = useMutation({
    mutationFn: (payload: { sourceDomain: string; targetDomain: string }) =>
      mergeCollegesFn({ ...payload, adminRole: adminUser?.role || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-colleges'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['admin-domains'] });
      toast({
        title: 'Colleges Merged',
        description: 'The colleges have been merged successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    colleges: collegesQuery.data || [],
    isLoading: collegesQuery.isLoading,
    error: collegesQuery.error,
    refetch: collegesQuery.refetch,
    verifyCollege: verifyMutation.mutate,
    flagCollege: flagMutation.mutate,
    updateCollege: updateMutation.mutate,
    /** Merge source college into target college using their domain strings */
    mergeColleges: mergeMutation.mutate,
    isUpdating: verifyMutation.isPending || flagMutation.isPending || updateMutation.isPending || mergeMutation.isPending,
  };
}
