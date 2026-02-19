/**
 * useAdminDomains - React Query hook for Admin Domains page
 * 
 * CORRECT DATA MODEL:
 * - Domains page shows RAW EMAIL DOMAINS from `college_domain_aliases`
 * - A domain may or may not be mapped to a college via `college_id` FK
 * - Domains are NOT colleges - they are attributes of colleges
 * 
 * Columns: Domain, Mapped College (nullable), User Count, First Seen, Status
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/contexts/AdminContext';
import { useToast } from '@/hooks/use-toast';
import { assertValidUuid } from '@/lib/uuid';
import { 
  normalizeDomain, 
  isValidDomain, 
  isPublicEmailDomain,
  formatCollegeName,
} from '@/lib/college-utils';

// Types
export type DomainStatus = 'approved' | 'pending' | 'blocked';

export interface AdminDomain {
  /** UUID from college_domain_aliases.id */
  id: string;
  /** Raw email domain (e.g., "raghuenggcollege.in") */
  domain: string;
  /** UUID of the mapped college (nullable if unmapped) */
  college_id: string | null;
  /** Name of the mapped college (nullable if unmapped) */
  college_name: string | null;
  /** Number of users with this email domain */
  user_count: number;
  /** When domain was first seen */
  first_seen: string | null;
  /** When domain was last updated */
  last_seen: string | null;
  /** Domain status: approved, pending, or blocked */
  status: DomainStatus;
}

export interface AdminDomainCollegeOption {
  id: string;
  name: string;
  canonical_domain: string;
}

/**
 * Fetch domains from Supabase using the correct data model
 * This queries college_domain_aliases with LEFT JOIN to colleges
 */
async function fetchDomains(): Promise<AdminDomain[]> {
  try {
    // Try the new RPC first
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc('get_admin_domains_list');
    
    if (!rpcError && rpcData && Array.isArray(rpcData)) {
      return rpcData.map((item: any) => ({
        id: item.id || item.domain,
        domain: item.domain,
        college_id: item.college_id || null,
        college_name: item.college_name || null,
        user_count: Number(item.user_count) || 0,
        first_seen: item.first_seen || null,
        last_seen: item.last_seen || null,
        status: (item.status || 'pending') as DomainStatus,
      }));
    }

    // Fallback: Query directly from college_domain_aliases with LEFT JOIN to colleges
    const { data: aliasData, error: aliasError } = await supabase
      .from('college_domain_aliases')
      .select('id, domain, college_id, status, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (aliasError) {
      console.error('Error fetching domain aliases:', aliasError);
      throw aliasError;
    }

    // Get college names for mapping
    const collegeIds = (aliasData || [])
      .filter((a: any) => a.college_id)
      .map((a: any) => a.college_id);
    
    const collegeMap = new Map<string, string>();
    if (collegeIds.length > 0) {
      const { data: collegesData } = await supabase
        .from('colleges')
        .select('id, name')
        .in('id', collegeIds);
      
      (collegesData || []).forEach((c: any) => {
        collegeMap.set(c.id, c.name);
      });
    }

    // Get user counts per domain (using college_domain since domain column was dropped)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('college_domain')
      .not('college_domain', 'is', null);

    const domainUserCounts = new Map<string, number>();
    (profiles || []).forEach((profile: any) => {
      if (profile.college_domain) {
        const count = domainUserCounts.get(profile.college_domain) || 0;
        domainUserCounts.set(profile.college_domain, count + 1);
      }
    });

    return (aliasData || []).map((item: any) => ({
      id: item.id || item.domain,
      domain: item.domain,
      college_id: item.college_id || null,
      college_name: item.college_id ? (collegeMap.get(item.college_id) || null) : null,
      user_count: domainUserCounts.get(item.domain) || 0,
      first_seen: item.created_at || null,
      last_seen: item.updated_at || null,
      status: (item.status || 'pending') as DomainStatus,
    }));
  } catch (error) {
    console.error('Error fetching admin domains:', error);
    throw error;
  }
}

async function fetchCollegeOptions(): Promise<AdminDomainCollegeOption[]> {
  const { data, error } = await supabase
    .from('colleges')
    .select('id, name, canonical_domain')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching colleges for domain mapping:', error);
    throw error;
  }

  return (data || []).map((college: any) => ({
    id: college.id,
    name: college.name || formatCollegeName(college.canonical_domain),
    canonical_domain: college.canonical_domain,
  }));
}

/**
 * Approve/map a domain to a college
 */
async function approveDomainMutation({ 
  domain, 
  collegeId,
  createNewCollege,
  collegeName,
  adminRole,
}: { 
  domain: string; 
  collegeId?: string;
  createNewCollege?: boolean;
  collegeName?: string;
  adminRole: string | null;
}): Promise<void> {
  if (!adminRole) throw new Error('Not authorized');
  if (adminRole === 'moderator' && createNewCollege) {
    throw new Error('Insufficient permissions to create colleges');
  }
  
  const normalizedDomain = normalizeDomain(domain);
  
  if (!normalizedDomain) {
    throw new Error('Domain is required');
  }
  
  if (!isValidDomain(normalizedDomain)) {
    throw new Error('Invalid domain format');
  }
  
  if (isPublicEmailDomain(normalizedDomain)) {
    throw new Error('Cannot approve public email domains (gmail.com, yahoo.com, etc.)');
  }

  let mappedCollegeId = collegeId || null;
  let mappedCanonicalDomain: string | null = null;

  if (mappedCollegeId) {
    assertValidUuid(mappedCollegeId, 'collegeId');
  }

  // Try using the RPC if creating a new college
  if (createNewCollege) {
    const { error: rpcError } = await (supabase as any).rpc('admin_map_domain_to_college', {
      p_domain: normalizedDomain,
      p_create_college: true,
      p_college_name: collegeName || formatCollegeName(normalizedDomain),
    });
    
    if (!rpcError) {
      await logAdminAction('approve_domain', 'domain', normalizedDomain, { collegeId: 'new', collegeName });
      return;
    }
    // Fallback: manual creation if RPC fails
    const { data: newCollege, error: createError } = await supabase
      .from('colleges')
      .insert({
        canonical_domain: normalizedDomain,
        name: collegeName || formatCollegeName(normalizedDomain),
        status: 'unverified',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, canonical_domain')
      .single();

    if (createError || !newCollege) {
      throw new Error(createError?.message || 'Failed to create college for domain mapping');
    }

    mappedCollegeId = newCollege.id;
    mappedCanonicalDomain = newCollege.canonical_domain;
  }

  // Map to existing college via RPC
  if (mappedCollegeId && !createNewCollege) {
    const { error: rpcError } = await (supabase as any).rpc('admin_map_domain_to_college', {
      p_domain: normalizedDomain,
      p_college_id: mappedCollegeId,
    });
    
    if (!rpcError) {
      await logAdminAction('approve_domain', 'domain', normalizedDomain, { collegeId: mappedCollegeId });
      return;
    }
  }

  if (mappedCollegeId && !mappedCanonicalDomain) {
    const { data: college, error: collegeError } = await supabase
      .from('colleges')
      .select('id, canonical_domain')
      .eq('id', mappedCollegeId)
      .single();

    if (collegeError || !college) {
      throw new Error('College not found for domain mapping');
    }

    mappedCanonicalDomain = college.canonical_domain;
  }

  // Fallback: Direct upsert without college mapping
  const { error } = await supabase
    .from('college_domain_aliases')
    .upsert({
      domain: normalizedDomain,
      canonical_domain: mappedCanonicalDomain || normalizedDomain,
      status: 'approved',
      college_id: mappedCollegeId || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'domain' });

  if (error) throw error;

  await logAdminAction('approve_domain', 'domain', normalizedDomain, { collegeId: mappedCollegeId || null });
}

/**
 * Block a domain
 */
async function blockDomainMutation({ 
  domain, 
  adminRole,
}: { 
  domain: string; 
  adminRole: string | null;
}): Promise<void> {
  if (!adminRole) throw new Error('Not authorized');
  
  const normalizedDomain = normalizeDomain(domain);
  
  if (!normalizedDomain) {
    throw new Error('Domain is required');
  }

  // Try using RPC first
  const { error: rpcError } = await (supabase as any).rpc('admin_update_domain_status', {
    p_domain: normalizedDomain,
    p_status: 'blocked',
  });

  if (rpcError) {
    // Fallback to direct update
    const { error } = await supabase
      .from('college_domain_aliases')
      .upsert({
        domain: normalizedDomain,
        canonical_domain: normalizedDomain,
        status: 'blocked',
        college_id: null, // Remove college mapping when blocking
        updated_at: new Date().toISOString(),
      }, { onConflict: 'domain' });

    if (error) throw error;
  }

  await logAdminAction('block_domain', 'domain', normalizedDomain);
}

/**
 * Log admin action (non-blocking)
 */
async function logAdminAction(
  actionType: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    await supabase.from('admin_activity_logs').insert({
      admin_email: session?.user?.email || 'unknown',
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      details,
    });
  } catch (err) {
    console.warn('Failed to log admin action:', err);
  }
}

/**
 * Main hook for admin domains page
 */
export function useAdminDomains() {
  const { isAdmin, adminUser } = useAdmin();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for domains
  const query = useQuery({
    queryKey: QUERY_KEYS.admin.domains(),
    queryFn: fetchDomains,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });

  const collegesQuery = useQuery({
    queryKey: QUERY_KEYS.admin.domainColleges(),
    queryFn: fetchCollegeOptions,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel(CHANNELS.admin.domains())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'college_domain_aliases' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.domains() });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'colleges' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.domains() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.domainColleges() });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          // Only invalidate if domain-related field changed
          if (payload.new && ((payload.new as any).domain)) {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.domains() });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (params: { 
      domain: string; 
      collegeId?: string; 
      createNewCollege?: boolean;
      collegeName?: string;
    }) => approveDomainMutation({ 
      ...params, 
      adminRole: adminUser?.role || null,
    }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.domains() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.domainColleges() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.colleges() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.kpis() });
      toast({
        title: 'Domain Approved',
        description: `${variables.domain} has been approved${variables.collegeId || variables.createNewCollege ? ' and mapped to a college' : ''}.`,
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

  // Block mutation
  const blockMutation = useMutation({
    mutationFn: (domain: string) => blockDomainMutation({ 
      domain, 
      adminRole: adminUser?.role || null,
    }),
    onSuccess: (_, domain) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.domains() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.domainColleges() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.colleges() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.kpis() });
      toast({
        title: 'Domain Blocked',
        description: `${domain} has been blocked.`,
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
    domains: query.data || [],
    colleges: collegesQuery.data || [],
    collegesLoading: collegesQuery.isLoading,
    collegesError: collegesQuery.error,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    approveDomain: approveMutation.mutate,
    blockDomain: blockMutation.mutate,
    isUpdating: approveMutation.isPending || blockMutation.isPending,
  };
}
