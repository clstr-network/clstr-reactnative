/**
 * Jobs API
 * Handles all job-related operations with Supabase
 * Includes job posting, applications, saving, and search functionality
 */

import { supabase } from "@/integrations/supabase/client";
import { handleApiError } from "@/lib/errorHandler";
import { assertValidUuid } from "@/lib/uuid";

// Types
// Job interface aligned with Supabase 'jobs' table plus optional extended fields
export interface Job {
    id: string;
    job_title: string;
    company_name: string;
    description: string;
    location: string | null;
    job_type: string | null;
    experience_level: string | null;
    salary_min: number | null;
    salary_max: number | null;
    skills_required: string[] | null;
    requirements: string | null;
    responsibilities: string | null;
    benefits: string | null;
    is_remote: boolean | null;
    application_deadline: string | null;
    application_url: string | null;
    application_email: string | null;
    poster_id: string;
    college_domain: string | null;
    is_active: boolean | null;
    views_count: number | null;
    applications_count: number | null;
    created_at: string | null;
    updated_at: string | null;
    // Optional fields (may not exist in DB but used in app)
    title?: string;
    company_logo?: string | null;
    city?: string | null;
    country?: string | null;
    category?: string;
    experience_min?: number | null;
    experience_max?: number | null;
    currency?: string | null;
    salary_period?: string | null;
    required_skills?: string[] | null;
    preferred_skills?: string[] | null;
    tags?: string[] | null;
    work_mode?: string | null;
    application_method?: string | null;
    posted_by?: string;
    status?: string;
    saved_count?: number | null;
    expires_at?: string | null;
    deleted_at?: string | null;
    // Joined fields
    poster?: {
        id: string;
        full_name: string;
        avatar_url: string | null;
        role: string;
    };
    isSaved?: boolean;
    hasApplied?: boolean;
    matchScore?: number;
}

export interface JobApplication {
    id: string;
    job_id: string;
    user_id: string;
    resume_url: string;
    cover_letter: string | null;
    portfolio_url: string | null;
    status: string | null;
    submitted_at: string | null;
    created_at: string;
    updated_at: string;
    job?: Job;
}

export interface JobFilters {
    search?: string;
    jobType?: string;
    experienceLevel?: string;
    category?: string;
    isRemote?: boolean;
    sortBy?: 'recent' | 'salary-high' | 'salary-low';
    alumniOnly?: boolean;
    collegeDomain?: string;
}

export interface CreateJobInput {
    job_title: string;
    company_name: string;
    company_logo?: string;
    description: string;
    location: string;
    city?: string;
    country?: string;
    job_type: string;
    category: string;
    experience_level?: string;
    experience_min?: number;
    experience_max?: number;
    salary_min?: number;
    salary_max?: number;
    currency?: string;
    salary_period?: string;
    required_skills?: string[];
    preferred_skills?: string[];
    requirements?: string;
    responsibilities?: string;
    benefits?: string;
    is_remote?: boolean;
    work_mode?: string;
    application_deadline?: string;
    application_url?: string;
    application_email?: string;
    application_method?: string;
}

export interface ApplyToJobInput {
    job_id: string;
    resume_url: string;
    cover_letter?: string;
    portfolio_url?: string;
}

/**
 * Get jobs with optional filters
 */
export async function getJobs(filters: JobFilters = {}): Promise<{ jobs: Job[]; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        // Get user's college domain for domain isolation
        let userCollegeDomain: string | null = null;
        if (user) {
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("college_domain")
                .eq("id", user.id)
                .single();

            if (profileError) throw profileError;
            if (!profile?.college_domain) {
                throw new Error("Profile missing college domain");
            }
            userCollegeDomain = profile.college_domain;
        }

        // Build query - use explicit type to avoid infinite type instantiation
        let finalQuery = supabase
            .from("jobs")
            .select(`
        *,
        poster:profiles!jobs_poster_id_fkey(id, full_name, avatar_url, role)
      `)
            .eq("is_active", true);

        // Apply domain filter
        if (userCollegeDomain) {
            finalQuery = finalQuery.or(`college_domain.eq.${userCollegeDomain},college_domain.is.null`);
        } else {
            // Anonymous users can only see public jobs
            finalQuery = finalQuery.is("college_domain", null);
        }

        // Apply search filter
        if (filters.search) {
            const searchTerm = `%${filters.search}%`;
            finalQuery = finalQuery.or(`job_title.ilike.${searchTerm},company_name.ilike.${searchTerm},description.ilike.${searchTerm}`);
        }

        // Apply job type filter
        if (filters.jobType && filters.jobType !== 'all') {
            finalQuery = finalQuery.eq("job_type", filters.jobType);
        }

        // Apply experience level filter
        if (filters.experienceLevel && filters.experienceLevel !== 'all-experience') {
            finalQuery = finalQuery.eq("experience_level", filters.experienceLevel);
        }

        // Apply category filter - Note: category may not exist in DB
        // Skipping category filter as it's not in Supabase types

        // Apply remote filter
        if (filters.isRemote !== undefined) {
            finalQuery = finalQuery.eq("is_remote", filters.isRemote);
        }

        // Apply alumni only filter
        if (filters.alumniOnly) {
            // Jobs posted by alumni (users with role 'alumni')
            finalQuery = finalQuery.not("poster", "is", null);
        }

        // Apply sorting
        let sortedQuery;
        switch (filters.sortBy) {
            case 'salary-high':
                sortedQuery = finalQuery.order("salary_max", { ascending: false, nullsFirst: false });
                break;
            case 'salary-low':
                sortedQuery = finalQuery.order("salary_min", { ascending: true, nullsFirst: false });
                break;
            case 'recent':
            default:
                sortedQuery = finalQuery.order("created_at", { ascending: false });
        }

        const { data: jobs, error } = await sortedQuery;

        if (error) throw error;

        // Get user's saved jobs and applications if logged in
        let savedJobIds = new Set<string>();
        let appliedJobIds = new Set<string>();

        if (user && jobs && jobs.length > 0) {
            const jobIds = jobs.map(j => j.id);

            const { data: savedJobs } = await supabase
                .from("saved_items")
                .select("item_id")
                .eq("user_id", user.id)
                .eq("type", "job")
                .in("item_id", jobIds);

            savedJobIds = new Set(savedJobs?.map(({ item_id }) => item_id) || []);

            const { data: applications } = await supabase
                .from("job_applications")
                .select("job_id")
                .eq("user_id", user.id)
                .in("job_id", jobIds);

            appliedJobIds = new Set(applications?.map(({ job_id }) => job_id) || []);
        }

        // Enrich jobs with saved/applied status
        const enrichedJobs = (jobs || []).map(job => ({
            ...job,
            isSaved: savedJobIds.has(job.id),
            hasApplied: appliedJobIds.has(job.id),
        })) as Job[];

        return { jobs: enrichedJobs, error: null };
    } catch (error) {
        const apiError = handleApiError(error, {
            operation: 'getJobs',
            userMessage: 'Failed to load jobs. Please try again.',
        });
        return { jobs: [], error: apiError.message };
    }
}

// ============================================================================
// Extended Job type with match score details from Supabase RPC
// ============================================================================
export interface JobWithMatchScore extends Job {
    total_score: number;
    skill_score: number;
    experience_score: number;
    location_score: number;
    matched_skills: string[];
    missing_skills: string[];
    match_reasons: string[];
}

// Raw RPC response type
interface RecommendedJobRow {
    job_id: string;
    job_title: string;
    company_name: string;
    description: string;
    location: string | null;
    job_type: string | null;
    experience_level: string | null;
    salary_min: number | null;
    salary_max: number | null;
    skills_required: string[] | null;
    is_remote: boolean | null;
    is_active: boolean | null;
    application_deadline: string | null;
    application_url: string | null;
    application_email: string | null;
    poster_id: string;
    college_domain: string | null;
    created_at: string;
    total_score: number;
    skill_score: number;
    experience_score: number;
    location_score: number;
    matched_skills: string[];
    missing_skills: string[];
    match_reasons: string[];
    is_saved: boolean;
    has_applied: boolean;
}

function isRecommendedJobsRpcUnavailable(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const anyErr = err as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
    const code = typeof anyErr.code === 'string' ? anyErr.code : '';
    const message = typeof anyErr.message === 'string' ? anyErr.message : '';
    const details = typeof anyErr.details === 'string' ? anyErr.details : '';
    const hint = typeof anyErr.hint === 'string' ? anyErr.hint : '';
    const combined = `${code} ${message} ${details} ${hint}`.toLowerCase();

    // Common PostgREST / Postgres signals when RPC doesn't exist or isn't exposed.
    if (code === '42883' || code === 'pgrst202') return true;
    if (combined.includes('get_recommended_jobs_with_scores') && combined.includes('does not exist')) return true;
    if (combined.includes('could not find the function') && combined.includes('get_recommended_jobs_with_scores')) return true;

    // If RPC exists but user cannot execute it (RLS/privileges), treat as unavailable.
    if (code === '42501' && combined.includes('get_recommended_jobs_with_scores')) return true;

    return false;
}

/**
 * Get jobs recommended for the user based on Supabase-persisted match scores
 * Uses the get_recommended_jobs_with_scores RPC for real skill-based matching
 */
export async function getRecommendedJobs(limit: number = 20, minScore: number = 0): Promise<{ jobs: Job[]; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { jobs: [], error: null };
        }

        // Call the RPC function that computes and persists match scores
        // Type assertion needed until Supabase types are regenerated
        const { data, error } = await (supabase.rpc as any)(
            'get_recommended_jobs_with_scores',
            {
                p_user_id: user.id,
                p_limit: limit,
                p_min_score: minScore,
            }
        );

        if (error) throw error;

        // Transform RPC response to Job[] format
        const rawJobs = (data || []) as RecommendedJobRow[];

        // Fetch poster information for each job
        const posterIds = [...new Set(rawJobs.map(j => j.poster_id))];
        const { data: posters } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role')
            .in('id', posterIds);

        const posterMap = new Map(
            (posters || []).map(p => [p.id, p])
        );

        const jobs: Job[] = rawJobs.map(row => ({
            id: row.job_id,
            job_title: row.job_title,
            company_name: row.company_name,
            description: row.description,
            location: row.location,
            job_type: row.job_type,
            experience_level: row.experience_level,
            salary_min: row.salary_min,
            salary_max: row.salary_max,
            skills_required: row.skills_required,
            requirements: null,
            responsibilities: null,
            benefits: null,
            is_remote: row.is_remote,
            application_deadline: row.application_deadline,
            application_url: row.application_url,
            application_email: row.application_email,
            poster_id: row.poster_id,
            college_domain: row.college_domain,
            is_active: row.is_active,
            views_count: null,
            applications_count: null,
            created_at: row.created_at,
            updated_at: null,
            // Match score data
            matchScore: row.total_score,
            // Extended match details stored on job object
            poster: posterMap.get(row.poster_id) || undefined,
            isSaved: row.is_saved,
            hasApplied: row.has_applied,
        }));

        return { jobs, error: null };
    } catch (error) {
        // Recommended jobs is an optional feature; if the backing RPC isn't available,
        // quietly fall back to an empty list (the UI already shows a helpful empty state).
        if (isRecommendedJobsRpcUnavailable(error)) {
            return { jobs: [], error: null };
        }

        const apiError = handleApiError(error, {
            operation: 'getRecommendedJobs',
            userMessage: 'Failed to load recommended jobs.',
        });
        return { jobs: [], error: apiError.message };
    }
}

/**
 * Refresh match scores for the current user
 * Call this after profile updates to recompute job matches
 */
export async function refreshJobMatches(): Promise<{ success: boolean; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const { error } = await (supabase.rpc as any)(
            'refresh_user_job_matches',
            { p_user_id: user.id }
        );

        if (error) throw error;
        return { success: true, error: null };
    } catch (error) {
        // Optional feature; if the RPC isn't available in the current DB, do not hard-fail.
        if (isRecommendedJobsRpcUnavailable(error)) {
            return { success: true, error: null };
        }

        const apiError = handleApiError(error, {
            operation: 'refreshJobMatches',
            userMessage: 'Failed to refresh job matches.',
        });
        return { success: false, error: apiError.message };
    }
}

/**
 * Get jobs posted by alumni
 */
export async function getAlumniJobs(): Promise<{ jobs: Job[]; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        // Get user's college domain
        let userCollegeDomain: string | null = null;
        if (user) {
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("college_domain")
                .eq("id", user.id)
                .single();

            if (profileError) throw profileError;
            if (!profile?.college_domain) {
                throw new Error("Profile missing college domain");
            }
            userCollegeDomain = profile.college_domain;
        }

        // Get alumni user IDs
        const { data: alumniProfiles } = await supabase
            .from("profiles")
            .select("id")
            .eq("role", "Alumni");

        const alumniIds = alumniProfiles?.map(p => p.id) || [];

        if (alumniIds.length === 0) {
            return { jobs: [], error: null };
        }

        let query = supabase
            .from("jobs")
            .select(`
        *,
        poster:profiles!jobs_poster_id_fkey(id, full_name, avatar_url, role)
      `)
            .eq("is_active", true)
            .in("poster_id", alumniIds)
            .order("created_at", { ascending: false });

        if (userCollegeDomain) {
            query = query.or(`college_domain.eq.${userCollegeDomain},college_domain.is.null`);
        } else {
            query = query.is("college_domain", null);
        }

        const { data: jobs, error } = await query;

        if (error) throw error;

        // Get saved/applied status if user is logged in
        let enrichedJobs: Job[] = (jobs || []) as unknown as Job[];
        if (user && jobs && jobs.length > 0) {
            const jobIds = jobs.map(j => j.id);


            const { data: savedJobs } = await supabase
                .from("saved_items")
                .select("item_id")
                .eq("user_id", user.id)
                .eq("type", "job")
                .in("item_id", jobIds);

            const { data: applications } = await supabase
                .from("job_applications")
                .select("job_id")
                .eq("user_id", user.id)
                .in("job_id", jobIds);

            const savedJobIds = new Set(savedJobs?.map(({ item_id }) => item_id) || []);
            const appliedJobIds = new Set(applications?.map(({ job_id }) => job_id) || []);

            enrichedJobs = (jobs as unknown as Job[]).map(job => ({
                ...job,
                isSaved: savedJobIds.has(job.id),
                hasApplied: appliedJobIds.has(job.id),
            }));
        }

        return { jobs: enrichedJobs, error: null };
    } catch (error) {
        const apiError = handleApiError(error, {
            operation: 'getAlumniJobs',
            userMessage: 'Failed to load alumni jobs.',
        });
        return { jobs: [], error: apiError.message };
    }
}

/**
 * Get user's saved jobs
 */
export async function getSavedJobs(): Promise<{ jobs: Job[]; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { jobs: [], error: "Not authenticated" };
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("college_domain")
            .eq("id", user.id)
            .single();

        if (profileError) throw profileError;
        if (!profile?.college_domain) {
            throw new Error("Profile missing college domain");
        }

        // Get saved job IDs
        const { data: savedJobs, error: savedError } = await supabase
            .from("saved_items")
            .select("item_id, created_at")
            .eq("user_id", user.id)
            .eq("type", "job")
            .order("created_at", { ascending: false });

        if (savedError) throw savedError;

        if (!savedJobs || savedJobs.length === 0) {
            return { jobs: [], error: null };
        }

        const jobIds = savedJobs.map(({ item_id }) => item_id);

        // Fetch the actual jobs
        const { data: jobs, error } = await supabase
            .from("jobs")
            .select(`
        *,
        poster:profiles!jobs_poster_id_fkey(id, full_name, avatar_url, role)
      `)
            .in("id", jobIds)
            .or(`college_domain.eq.${profile.college_domain},college_domain.is.null`);

        if (error) throw error;

        // Mark all as saved and check applied status
        const { data: applications } = await supabase
            .from("job_applications")
            .select("job_id")
            .eq("user_id", user.id)
            .in("job_id", jobIds);

        const appliedJobIds = new Set(applications?.map(({ job_id }) => job_id) || []);

        const enrichedJobs = (jobs || []).map(job => ({
            ...job,
            isSaved: true,
            hasApplied: appliedJobIds.has(job.id),
        })) as Job[];

        return { jobs: enrichedJobs, error: null };
    } catch (error) {
        const apiError = handleApiError(error, {
            operation: 'getSavedJobs',
            userMessage: 'Failed to load saved jobs.',
        });
        return { jobs: [], error: apiError.message };
    }
}

/**
 * Toggle save/unsave a job
 */
export async function toggleSaveJob(jobId: string): Promise<{ saved: boolean; error: string | null }> {
    try {
        assertValidUuid(jobId, "jobId");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("Not authenticated");
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("college_domain")
            .eq("id", user.id)
            .single();

        if (profileError) throw profileError;
        if (!profile?.college_domain) {
            throw new Error("Profile missing college domain");
        }

        const { data: job, error: jobError } = await supabase
            .from("jobs")
            .select("id, college_domain, is_active")
            .eq("id", jobId)
            .single();

        if (jobError) throw jobError;
        if (!job || !job.is_active) {
            throw new Error("Job not found or inactive");
        }

        const matchesDomain = !job.college_domain || job.college_domain === profile.college_domain;
        if (!matchesDomain) {
            throw new Error("Job not accessible for your domain");
        }

        const { data: existing, error: checkError } = await supabase
            .from("saved_items")
            .select("id")
            .eq("user_id", user.id)
            .eq("type", "job")
            .eq("item_id", jobId)
            .maybeSingle();

        if (checkError) throw checkError;

        if (existing) {
            // Unsave
            const { error: deleteError } = await supabase
                .from("saved_items")
                .delete()
                .eq("id", existing.id);

            if (deleteError) throw deleteError;

            return { saved: false, error: null };
        } else {
            // Save
            const { error: insertError } = await supabase
                .from("saved_items")
                .insert({
                    user_id: user.id,
                    type: "job",
                    item_id: jobId,
                });

            if (insertError) {
                if (insertError.code === '23505') {
                    // Already saved (race condition)
                    return { saved: true, error: null };
                }
                throw insertError;
            }

            return { saved: true, error: null };
        }
    } catch (error) {
        const apiError = handleApiError(error, {
            operation: 'toggleSaveJob',
            userMessage: 'Failed to save/unsave job.',
        });
        return { saved: false, error: apiError.message };
    }
}

/**
 * Create a new job posting
 */
export async function createJob(input: CreateJobInput): Promise<{ job: Job | null; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("Not authenticated");
        }

        // Get user's profile for poster info and college domain
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("full_name, college_domain, role")
            .eq("id", user.id)
            .single();

        if (profileError) throw profileError;

        // Check if user can post jobs (alumni or organization)
        if (profile.role !== 'Alumni' && profile.role !== 'Organization') {
            throw new Error("Only alumni and organizations can post jobs");
        }

        const { data: job, error } = await supabase
            .from("jobs")
            .insert({
                job_title: input.job_title,
                company_name: input.company_name,
                description: input.description,
                location: input.location,
                job_type: input.job_type,
                experience_level: input.experience_level,
                salary_min: input.salary_min,
                salary_max: input.salary_max,
                skills_required: input.required_skills,
                requirements: input.requirements,
                responsibilities: input.responsibilities,
                benefits: input.benefits,
                is_remote: input.is_remote,
                application_deadline: input.application_deadline,
                application_url: input.application_url,
                application_email: input.application_email,
                poster_id: user.id,
                college_domain: profile.college_domain,
                is_active: true,
            })
            .select()
            .single();

        if (error) throw error;

        return { job: job as Job, error: null };
    } catch (error) {
        const apiError = handleApiError(error, {
            operation: 'createJob',
            userMessage: 'Failed to create job posting.',
        });
        return { job: null, error: apiError.message };
    }
}

/**
 * Apply to a job
 */
export async function applyToJob(input: ApplyToJobInput): Promise<{ application: JobApplication | null; error: string | null }> {
    try {
        assertValidUuid(input.job_id, "jobId");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("Not authenticated");
        }

        // Check if already applied
        const { data: existing } = await supabase
            .from("job_applications" as any)
            .select("id")
            .eq("user_id", user.id)
            .eq("job_id", input.job_id)
            .maybeSingle();

        if (existing) {
            throw new Error("You have already applied to this job");
        }

        const { data: application, error } = await supabase
            .from("job_applications" as any)
            .insert({
                job_id: input.job_id,
                user_id: user.id,
                resume_url: input.resume_url,
                cover_letter: input.cover_letter || null,
                portfolio_url: input.portfolio_url || null,
                status: 'pending',
                submitted_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;

        // Increment applications count (best effort - handled by DB trigger if exists)
        // No explicit increment - DB trigger should handle this
        return { application: application as any as JobApplication, error: null };
    } catch (error) {
        const apiError = handleApiError(error, {
            operation: 'applyToJob',
            userMessage: 'Failed to submit application.',
        });
        return { application: null, error: apiError.message };
    }
}

/**
 * Get user's job applications
 */
export async function getMyApplications(): Promise<{ applications: JobApplication[]; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { applications: [], error: "Not authenticated" };
        }

        const { data: applications, error } = await supabase
            .from("job_applications" as any)
            .select(`
        *,
        job:jobs(*)
      `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { applications: (applications || []) as any as JobApplication[], error: null };
    } catch (error) {
        const apiError = handleApiError(error, {
            operation: 'getMyApplications',
            userMessage: 'Failed to load your applications.',
        });
        return { applications: [], error: apiError.message };
    }
}

/**
 * Get a single job by ID
 */
export async function getJobById(jobId: string): Promise<{ job: Job | null; error: string | null }> {
    try {
        assertValidUuid(jobId, "jobId");
        const { data: { user } } = await supabase.auth.getUser();

        let userCollegeDomain: string | null = null;
        if (user) {
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("college_domain")
                .eq("id", user.id)
                .single();

            if (profileError) throw profileError;
            if (!profile?.college_domain) {
                throw new Error("Profile missing college domain");
            }
            userCollegeDomain = profile.college_domain;
        }

        const { data: job, error } = await supabase
            .from("jobs")
            .select(`
        *,
        poster:profiles!jobs_poster_id_fkey(id, full_name, avatar_url, role)
      `)
            .eq("id", jobId)
            .single();

        if (error) throw error;

        if (!job.is_active) {
            throw new Error("Job not found or inactive");
        }

        if (job.college_domain) {
            if (!userCollegeDomain) {
                throw new Error("Job not accessible without profile domain");
            }
            if (job.college_domain !== userCollegeDomain) {
                throw new Error("Job not accessible for your domain");
            }
        }

        // Increment view count (best effort - handled by DB trigger if exists)
        // No explicit increment - DB trigger should handle this

        // Check if saved/applied
        let enrichedJob: Job = job as unknown as Job;
        if (user) {
            const { data: savedJob } = await supabase
                .from("saved_items")
                .select("id")
                .eq("user_id", user.id)
                .eq("type", "job")
                .eq("item_id", jobId)
                .maybeSingle();

            const { data: application } = await supabase
                .from("job_applications")
                .select("id")
                .eq("user_id", user.id)
                .eq("job_id", jobId)
                .maybeSingle();

            enrichedJob = {
                ...(job as unknown as Job),
                isSaved: !!savedJob,
                hasApplied: !!application,
            };
        }

        return { job: enrichedJob, error: null };
    } catch (error) {
        const apiError = handleApiError(error, {
            operation: 'getJobById',
            userMessage: 'Failed to load job details.',
        });
        return { job: null, error: apiError.message };
    }
}

/**
 * Generate a shareable link for a job
 */
export function getJobShareUrl(jobId: string): string {
    return `${window.location.origin}/jobs/${jobId}`;
}

/**
 * Share a job (copy to clipboard or use Web Share API)
 */
export async function shareJob(job: Job): Promise<{ success: boolean; error: string | null }> {
    try {
        const shareUrl = getJobShareUrl(job.id);
        const shareData = {
            title: `${job.job_title} at ${job.company_name}`,
            text: `Check out this job opportunity: ${job.job_title} at ${job.company_name}`,
            url: shareUrl,
        };

        if (navigator.share && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return { success: true, error: null };
        } else {
            // Fallback to clipboard
            await navigator.clipboard.writeText(shareUrl);
            return { success: true, error: null };
        }
    } catch (error) {
        // User cancelled share or clipboard failed
        if ((error as Error).name === 'AbortError') {
            return { success: false, error: null };
        }
        return { success: false, error: 'Failed to share job' };
    }
}
