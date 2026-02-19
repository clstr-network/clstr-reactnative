import { useEffect } from "react";
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { assertValidUuid } from "@clstr/shared/utils/uuid";
import { getJobById, shareJob } from "@/lib/jobs-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

const JOB_DETAIL_QUERY_KEY = (jobId: string) => ["job", jobId] as const;

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (!id) {
    throw new Error("Missing job id");
  }

  assertValidUuid(id, "jobId");

  const { data, isLoading, error } = useQuery({
    queryKey: JOB_DETAIL_QUERY_KEY(id),
    queryFn: async () => {
      const { job, error: jobError } = await getJobById(id);
      if (jobError) throw new Error(jobError);
      if (!job) throw new Error("Job not found");
      return job;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(CHANNELS.jobs.detail(id))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs", filter: `id=eq.${id}` },
        () => queryClient.invalidateQueries({ queryKey: JOB_DETAIL_QUERY_KEY(id) })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "saved_items", filter: `item_id=eq.${id}` },
        () => queryClient.invalidateQueries({ queryKey: JOB_DETAIL_QUERY_KEY(id) })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_applications", filter: `job_id=eq.${id}` },
        () => queryClient.invalidateQueries({ queryKey: JOB_DETAIL_QUERY_KEY(id) })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  if (isLoading) {
    return (
      <div className="container py-8 px-4 md:px-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      </div>
    );
  }

  if (error) {
    throw error;
  }

  const job = data;

  return (
    <div className="container py-6 px-4 md:px-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{job.job_title}</h1>
          <p className="text-white/60">{job.company_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const result = await shareJob(job);
              if (result.error) {
                toast({
                  title: "Couldn't share job",
                  description: result.error,
                  variant: "destructive",
                });
                return;
              }
              toast({
                title: "Link copied",
                description: "Job link copied to clipboard.",
              });
            }}
          >
            Copy link
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {job.job_type && <Badge variant="secondary" className="capitalize">{job.job_type.replace("-", " ")}</Badge>}
          {job.experience_level && (
            <Badge variant="secondary" className="capitalize">
              {job.experience_level}
            </Badge>
          )}
          {job.is_remote && <Badge variant="outline">Remote</Badge>}
        </div>

        {job.location && (
          <div>
            <div className="text-sm text-white/60">Location</div>
            <div className="text-sm">{job.location}</div>
          </div>
        )}

        <div>
          <div className="text-sm text-white/60">Description</div>
          <div className="whitespace-pre-wrap text-sm text-white">{job.description}</div>
        </div>

        {(job.skills_required?.length || 0) > 0 && (
          <div>
            <div className="text-sm text-white/60">Skills</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(job.skills_required || []).map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {job.application_url && (
          <div className="pt-2">
            <Button
              className="bg-white/10 hover:bg-white/[0.15] text-white"
              onClick={() => window.open(job.application_url!, "_blank", "noopener,noreferrer")}
            >
              Apply (External)
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
