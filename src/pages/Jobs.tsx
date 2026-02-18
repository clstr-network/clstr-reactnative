import { useEffect, useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Search, Filter, Briefcase, MapPin, Building, ChevronRight, BookmarkPlus, Bookmark, Share2, Plus, Loader2, ExternalLink, Shield } from 'lucide-react';
import { Can } from '@/components/auth/PermissionGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/contexts/ProfileContext';
import { JobPostingDialog } from '@/components/jobs/JobPostingDialog';
import { JobApplicationDialog } from '@/components/jobs/JobApplicationDialog';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getJobs,
  getRecommendedJobs,
  getAlumniJobs,
  getSavedJobs,
  toggleSaveJob,
  shareJob,
  refreshJobMatches,
  Job,
  JobFilters,
} from '@/lib/jobs-api';
import { useFeatureAccess, useRouteGuard } from '@/hooks/useFeatureAccess';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Jobs = () => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Feature access check - redirect Faculty and Club roles
  const { canBrowseJobs, canApplyToJobs, canPostJobs, canSaveJobs, canUseAIJobMatching, profileType, isLoading: permissionsLoading } = useFeatureAccess();
  
  // Route guard - redirect if user doesn't have permission to browse jobs
  useRouteGuard(canBrowseJobs, '/home');
  
  const [lastQueryError, setLastQueryError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [jobType, setJobType] = useState('all');
  const [experienceLevel, setExperienceLevel] = useState('all-experience');
  const [sortBy, setSortBy] = useState<'recent' | 'salary-high' | 'salary-low'>('recent');

  // Dialogs
  const [isPostJobOpen, setIsPostJobOpen] = useState(false);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Profile completion percentage (for AI match section)
  const profileCompletion = profile?.profile_completion || 0;

  const allJobsQueryKey = ['jobs', 'all', searchQuery, jobType, experienceLevel, sortBy] as const;
  const recommendedJobsQueryKey = ['jobs', 'recommended'] as const;
  const alumniJobsQueryKey = ['jobs', 'alumni'] as const;
  const savedJobsQueryKey = ['jobs', 'saved'] as const;

  const { data: allJobs = [], isLoading: isLoadingAll, error: allJobsError } = useQuery({
    queryKey: allJobsQueryKey,
    queryFn: async () => {
      const filters: JobFilters = {
        search: searchQuery || undefined,
        jobType: jobType !== 'all' ? jobType : undefined,
        experienceLevel: experienceLevel !== 'all-experience' ? experienceLevel : undefined,
        sortBy,
      };
      const { jobs, error } = await getJobs(filters);
      if (error) throw new Error(error);
      return jobs;
    },
    staleTime: 30_000,
    enabled: canBrowseJobs, // Only run query if user has permission
  });

  const { data: recommendedJobs = [], isLoading: isLoadingRecommended, error: recommendedJobsError } = useQuery({
    queryKey: recommendedJobsQueryKey,
    queryFn: async () => {
      const { jobs, error } = await getRecommendedJobs();
      if (error) throw new Error(error);
      return jobs;
    },
    staleTime: 30_000,
    enabled: canBrowseJobs,
  });

  const { data: alumniJobs = [], isLoading: isLoadingAlumni, error: alumniJobsError } = useQuery({
    queryKey: alumniJobsQueryKey,
    queryFn: async () => {
      const { jobs, error } = await getAlumniJobs();
      if (error) throw new Error(error);
      return jobs;
    },
    staleTime: 30_000,
    enabled: canBrowseJobs,
  });

  const { data: savedJobs = [], isLoading: isLoadingSaved, error: savedJobsError } = useQuery({
    queryKey: savedJobsQueryKey,
    queryFn: async () => {
      const { jobs, error } = await getSavedJobs();
      if (error && error !== 'Not authenticated') throw new Error(error);
      return jobs;
    },
    staleTime: 30_000,
    enabled: canSaveJobs,
  });

  useEffect(() => {
    const error = allJobsError || recommendedJobsError || alumniJobsError || savedJobsError;
    if (!error) return;
    const message = error instanceof Error ? error.message : 'Failed to load jobs';
    if (message === lastQueryError) return;

    setLastQueryError(message);
    toast({ title: 'Error', description: message, variant: 'destructive' });
  }, [allJobsError, recommendedJobsError, alumniJobsError, savedJobsError, lastQueryError, toast]);

  useEffect(() => {
    if (!canBrowseJobs) return; // Don't subscribe if no permission
    
    const channel = supabase
      .channel('jobs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_items', filter: 'type=eq.job' }, () => {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_applications' }, () => {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_match_scores' }, () => {
        // Invalidate recommended jobs when match scores are updated
        queryClient.invalidateQueries({ queryKey: ['jobs', 'recommended'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, canBrowseJobs]);

  const toggleSaveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { saved, error } = await toggleSaveJob(jobId);
      if (error) throw new Error(error);
      return saved;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  // Handle save job toggle
  const handleToggleSave = async (job: Job) => {
    if (!canSaveJobs) {
      toast({ title: 'Not allowed', description: 'You cannot save jobs with your profile type.', variant: 'destructive' });
      return;
    }
    try {
      const saved = await toggleSaveMutation.mutateAsync(job.id);

      toast({
        title: saved ? 'Job saved!' : 'Job unsaved',
        description: saved ? 'Added to your saved jobs.' : 'Removed from saved jobs.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save/unsave job';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  // Handle share job
  const handleShareJob = async (job: Job) => {
    const { success, error } = await shareJob(job);
    if (success) {
      toast({
        title: 'Link copied!',
        description: 'Job link has been copied to your clipboard.',
      });
    } else if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    }
  };

  // Handle apply button
  const handleApplyClick = (job: Job) => {
    if (job.hasApplied) {
      toast({
        title: 'Already applied',
        description: 'You have already applied to this job.',
      });
      return;
    }

    // If job has external URL, open it
    if (job.application_url) {
      window.open(job.application_url, '_blank');
      return;
    }

    setSelectedJob(job);
    setIsApplyDialogOpen(true);
  };

  // Callback for when a job is created
  const handleJobCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  };

  // Callback for when an application is submitted
  const handleApplicationSubmitted = () => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  };

  // Access control - show restriction message if not permitted (after all hooks)
  if (!permissionsLoading && !canBrowseJobs) {
    return (
      <div className="container max-w-2xl py-12 px-4">
        <Alert variant="destructive">
          <Shield className="h-5 w-5" />
          <AlertTitle className="text-lg font-semibold">Access Restricted</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">
              Jobs and Career features are not available for {profileType} profiles.
              This feature is available for Students and Alumni only.
            </p>
            <Button onClick={() => navigate('/home')} size="sm">
              Go to Home
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-4 md:py-6 px-4 md:px-6 pb-20 md:pb-6">
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-bold">Career Opportunities</h1>
            <p className="text-sm md:text-base text-white/60">Exclusive jobs and internships from alumni and partners</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Can permission="canPostJob">
              <Button
                className="bg-white/10 border border-white/15 text-white hover:bg-white/[0.15] w-full sm:w-auto"
                onClick={() => setIsPostJobOpen(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Post Job
              </Button>
            </Can>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/40" />
              <Input
                type="search"
                placeholder="Search jobs..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsFilterOpen(!isFilterOpen)} className="w-full sm:w-auto">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* Global Filter Panel */}
        {isFilterOpen && (
          <div className="alumni-card p-3 md:p-4 space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm md:text-base font-semibold">Filter Jobs</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsFilterOpen(false)}>
                Close
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-4">
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger className="w-full sm:w-[160px] md:w-[180px]">
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Job Type</SelectLabel>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger className="w-full sm:w-[160px] md:w-[180px]">
                  <SelectValue placeholder="Experience Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Experience</SelectLabel>
                    <SelectItem value="all-experience">All Levels</SelectItem>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior Level</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-full sm:w-[160px] md:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Sort</SelectLabel>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="salary-high">Salary (High to Low)</SelectItem>
                    <SelectItem value="salary-low">Salary (Low to High)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  setJobType('all');
                  setExperienceLevel('all-experience');
                  setSortBy('recent');
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="recommended">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="recommended" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Recommended</span>
              <span className="sm:hidden">For You</span>
            </TabsTrigger>
            <TabsTrigger value="all-jobs" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">All Jobs</span>
              <span className="sm:hidden">All</span>
            </TabsTrigger>
            <TabsTrigger value="alumni-jobs" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Alumni Posted</span>
              <span className="sm:hidden">Alumni</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="text-xs sm:text-sm">Saved</TabsTrigger>
          </TabsList>

          {/* Recommended Jobs Tab - Uses Supabase-persisted skill matching */}
          <TabsContent value="recommended" className="mt-4 md:mt-6">
            <div className="alumni-card p-3 md:p-4 mb-4 md:mb-6 bg-white/[0.04] border border-white/10">
              <div className="flex flex-col gap-3 md:gap-4">
                <div>
                  <h3 className="text-sm md:text-base font-semibold">Skill-Based Job Match</h3>
                  <p className="text-xs md:text-sm text-white/60">
                    Jobs ranked by how well they match your skills, experience, and preferences
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex-1 w-full">
                    <p className="text-xs text-white/60 mb-1">Profile completeness (better matches with complete profile):</p>
                    <div className="flex items-center gap-2">
                      <Progress value={profileCompletion} className="h-2 flex-1 max-w-[200px]" />
                      <span className="text-xs font-medium">{profileCompletion}%</span>
                    </div>
                  </div>
                  <Button size="sm" className="bg-white/10 border border-white/15 text-white hover:bg-white/[0.15] w-full sm:w-auto" onClick={() => navigate('/profile')}>
                    {profileCompletion < 80 ? 'Complete Profile' : 'Edit Profile'}
                  </Button>
                </div>
                {profileCompletion < 50 && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    💡 Add your skills and interests in your profile to get better job recommendations
                  </p>
                )}
              </div>
            </div>

            {isLoadingRecommended ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-white/60" />
              </div>
            ) : recommendedJobs.length === 0 ? (
              <EmptyState message="No recommended jobs yet. Complete your profile with skills and interests to get personalized recommendations." />
            ) : (
              <div className="grid gap-3 md:gap-6 grid-cols-1 lg:grid-cols-2">
                {recommendedJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onSave={handleToggleSave}
                    onShare={handleShareJob}
                    onApply={handleApplyClick}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* All Jobs Tab */}
          <TabsContent value="all-jobs" className="mt-4 md:mt-6">
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 md:gap-4 mb-4 md:mb-6">
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger className="w-full sm:w-[160px] md:w-[180px]">
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Job Type</SelectLabel>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger className="w-full sm:w-[160px] md:w-[180px]">
                  <SelectValue placeholder="Experience Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Experience</SelectLabel>
                    <SelectItem value="all-experience">All Levels</SelectItem>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior Level</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-full sm:w-[160px] md:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Sort</SelectLabel>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="salary-high">Salary (High to Low)</SelectItem>
                    <SelectItem value="salary-low">Salary (Low to High)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {isLoadingAll ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-white/60" />
              </div>
            ) : allJobs.length === 0 ? (
              <EmptyState message="No jobs found matching your criteria." />
            ) : (
              <div className="grid gap-3 md:gap-6 grid-cols-1 lg:grid-cols-2">
                {allJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onSave={handleToggleSave}
                    onShare={handleShareJob}
                    onApply={handleApplyClick}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Alumni Jobs Tab */}
          <TabsContent value="alumni-jobs" className="mt-4 md:mt-6">
            <div className="alumni-card p-3 md:p-4 mb-4 md:mb-6">
              <div className="flex flex-col gap-3 md:gap-4">
                <div>
                  <h3 className="text-sm md:text-base font-semibold">Alumni Job Board</h3>
                  <p className="text-xs md:text-sm text-white/60">Jobs posted directly by alumni from your college</p>
                </div>
                <Can permission="canPostJob">
                  <Button
                    className="bg-white/10 border border-white/15 text-white hover:bg-white/[0.15] w-full sm:w-auto"
                    onClick={() => setIsPostJobOpen(true)}
                    size="sm"
                  >
                    <Briefcase className="h-4 w-4 mr-2" />
                    Post a Job
                  </Button>
                </Can>
              </div>
            </div>

            {isLoadingAlumni ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-white/60" />
              </div>
            ) : alumniJobs.length === 0 ? (
              <EmptyState message="No alumni jobs posted yet. Be the first to share an opportunity!" />
            ) : (
              <div className="grid gap-3 md:gap-6 grid-cols-1 lg:grid-cols-2">
                {alumniJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onSave={handleToggleSave}
                    onShare={handleShareJob}
                    onApply={handleApplyClick}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Saved Jobs Tab */}
          <TabsContent value="saved" className="mt-4 md:mt-6">
            {isLoadingSaved ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-white/60" />
              </div>
            ) : savedJobs.length === 0 ? (
              <div className="alumni-card p-6 md:p-8 text-center">
                <p className="text-sm md:text-base text-white/60">Your saved jobs will appear here</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => {
                  const tabsList = document.querySelector('[value="all-jobs"]') as HTMLElement;
                  tabsList?.click();
                }}>
                  Browse Jobs
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 md:gap-6 grid-cols-1 lg:grid-cols-2">
                {savedJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onSave={handleToggleSave}
                    onShare={handleShareJob}
                    onApply={handleApplyClick}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="alumni-card p-3 md:p-4 mt-4 md:mt-6">
          <div className="flex flex-col gap-3 md:gap-4">
            <div>
              <h3 className="text-sm md:text-base font-semibold">Need help with your job search?</h3>
              <p className="text-xs md:text-sm text-white/60">Our career advisors and alumni mentors are ready to help</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => navigate('/mentorship')}>Find a Mentor</Button>
              <Button className="bg-alumni-secondary hover:bg-alumni-secondary/90 text-white w-full sm:w-auto" size="sm" onClick={() => navigate('/mentorship')}>
                Book Career Advisor
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <JobPostingDialog
        open={isPostJobOpen}
        onOpenChange={setIsPostJobOpen}
        onJobCreated={handleJobCreated}
      />
      <JobApplicationDialog
        open={isApplyDialogOpen}
        onOpenChange={setIsApplyDialogOpen}
        job={selectedJob}
        onApplicationSubmitted={handleApplicationSubmitted}
      />
    </div>
  );
};

// Empty state component
const EmptyState = ({ message }: { message: string }) => (
  <div className="alumni-card p-8 text-center">
    <Briefcase className="h-12 w-12 mx-auto text-white/40 mb-4" />
    <p className="text-white/60">{message}</p>
  </div>
);

// Job Card Component
interface JobCardProps {
  job: Job;
  onSave: (job: Job) => void;
  onShare: (job: Job) => void;
  onApply: (job: Job) => void;
}

const JobCard = ({ job, onSave, onShare, onApply }: JobCardProps) => {
  const skills = job.required_skills || job.skills_required || job.preferred_skills || [];
  const isAlumniPosted = job.poster?.role === 'alumni';
  const postedDate = new Date(job.created_at);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24));
  const postedText = diffDays === 0 ? 'Posted today' :
    diffDays === 1 ? 'Posted yesterday' :
      diffDays < 7 ? `Posted ${diffDays} days ago` :
        diffDays < 30 ? `Posted ${Math.floor(diffDays / 7)} weeks ago` :
          `Posted ${Math.floor(diffDays / 30)} months ago`;

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-2 md:pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex gap-2 md:gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 md:h-12 md:w-12 bg-white/[0.06] rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
              {job.company_logo ? (
                <img src={job.company_logo} alt={job.company_name} className="h-full w-full object-cover" />
              ) : (
                <Building className="h-5 w-5 md:h-6 md:w-6 text-white/60" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base md:text-lg line-clamp-2">
                <Link
                  to={`/jobs/${job.id}`}
                  className="hover:underline"
                  aria-label={`View job: ${job.job_title || job.title}`}
                >
                  {job.job_title || job.title}
                </Link>
              </CardTitle>
              <CardDescription className="text-xs md:text-sm truncate">{job.company_name}</CardDescription>
            </div>
          </div>
          <div className="flex gap-0.5 md:gap-1 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => onSave(job)}
                  >
                    {job.isSaved ? (
                      <Bookmark className="h-3.5 w-3.5 md:h-4 md:w-4 fill-current text-white/60" />
                    ) : (
                      <BookmarkPlus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{job.isSaved ? 'Unsave Job' : 'Save Job'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => onShare(job)}
                  >
                    <Share2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share Job</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-xs md:text-sm text-white/60 mb-2 md:mb-3">
          <div className="flex items-center">
            <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
            <span className="truncate">{job.location}</span>
          </div>
          <span>•</span>
          <div className="flex items-center">
            <Briefcase className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
            <span className="capitalize truncate">{job.job_type?.replace('-', ' ')}</span>
          </div>
          {job.is_remote && (
            <>
              <span>•</span>
              <Badge variant="outline" className="text-xs">Remote</Badge>
            </>
          )}
        </div>

        <p className="text-xs md:text-sm text-white mb-2 md:mb-3 line-clamp-2">{job.description}</p>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {skills.slice(0, 4).map((skill, index) => (
              <Badge key={index} variant="secondary">{skill}</Badge>
            ))}
            {skills.length > 4 && (
              <Badge variant="outline">+{skills.length - 4} more</Badge>
            )}
          </div>
        )}

        {isAlumniPosted && (
          <div className="text-sm text-white/60 flex items-center">
            <span className="font-medium">Posted by {job.poster?.full_name || 'alumni'}</span>
          </div>
        )}

        {job.matchScore !== undefined && job.matchScore > 0 && (
          <div className="text-sm mt-2">
            <div className="flex items-center">
              <span className={`font-medium ${
                job.matchScore >= 70 ? 'text-green-600' : 
                job.matchScore >= 40 ? 'text-alumni-secondary' : 
                'text-white/60'
              }`}>
                Match: {job.matchScore}%
              </span>
              <Progress 
                value={job.matchScore} 
                className={`h-1.5 w-20 ml-2 ${
                  job.matchScore >= 70 ? '[&>div]:bg-green-500' : 
                  job.matchScore >= 40 ? '[&>div]:bg-alumni-secondary' : 
                  ''
                }`} 
              />
            </div>
          </div>
        )}

        {(job.salary_min || job.salary_max) && (
          <div className="text-sm text-white/60 mt-2">
            💰 {job.currency || '$'}
            {job.salary_min?.toLocaleString()}
            {job.salary_max && ` - ${job.salary_max.toLocaleString()}`}
            {job.salary_period && ` / ${job.salary_period}`}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-3">
        <div className="text-xs md:text-sm text-white/40 order-1">
          {postedText}
        </div>
        <div className="flex gap-2 order-2">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" asChild>
            <Link to={`/jobs/${job.id}`}>Details</Link>
          </Button>
          <Button
            size="sm"
            className={`flex-1 sm:flex-none ${job.hasApplied
              ? "bg-green-600 hover:bg-green-600/90 text-white"
              : "bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]"
            }`}
            onClick={() => onApply(job)}
            disabled={job.hasApplied}
          >
            {job.hasApplied ? (
              'Applied ✓'
            ) : job.application_url ? (
              <>
                Apply <ExternalLink className="ml-1 h-3.5 w-3.5 md:h-4 md:w-4" />
              </>
            ) : (
              <>
                Apply Now <ChevronRight className="ml-1 h-3.5 w-3.5 md:h-4 md:w-4" />
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default Jobs;
