import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { assertValidUuid } from '@/lib/uuid';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MentorStatusBadge } from '@/components/mentorship/MentorStatusBadge';
import { HELP_TYPE_OPTIONS, computeMentorBadgeStatus } from '@/types/mentorship';
import type { MentorHelpType, MentorshipOfferRow } from '@/types/mentorship';
import {
  Briefcase,
  Building,
  TrendingUp,
  Award,
  Users,
  Calendar,
  Heart,
  ExternalLink
} from 'lucide-react';

interface AlumniProfileData {
  id?: string;
  user_id?: string;
  /** @deprecated Use user_id instead */
  profile_id?: string;
  graduation_year?: number;
  graduation_date?: string;
  degree_obtained?: string;
  current_company?: string;
  current_position?: string;
  industry?: string;
  years_of_experience?: number;
  career_level?: string;
  employment_status?: string;
  linkedin_url?: string;
  company_website?: string;
  willing_to_mentor?: boolean;
  mentorship_areas?: string[];
  available_for_recruitment?: boolean;
  open_to_opportunities?: boolean;
  can_provide_referrals?: boolean;
  available_for_speaking?: boolean;
  willing_to_post_jobs?: boolean;
  donations_made?: number;
  events_attended?: number;
}

interface AlumniProfileSectionProps {
  data: AlumniProfileData;
  isOwner: boolean;
  onEdit?: () => void;
}

const getErrorMessage = (error: unknown, fallback = 'Failed to update mentor status') =>
  error instanceof Error ? error.message : fallback;

export function AlumniProfileSection({
  data,
  isOwner,
  onEdit
}: AlumniProfileSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [willingToMentor, setWillingToMentor] = useState<boolean>(data.willing_to_mentor ?? false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showOptInQuestion, setShowOptInQuestion] = useState(false);
  const [selectedHelpType, setSelectedHelpType] = useState<MentorHelpType>('general');

  // Resolve user_id - alumni_profiles uses user_id as the foreign key, not profile_id
  const resolvedUserId = data.user_id || data.profile_id;

  // Fetch actual mentorship offer from DB to compute real badge status
  const mentorOfferQuery = useQuery({
    queryKey: ['mentorship', 'profile-offer', resolvedUserId],
    queryFn: async (): Promise<MentorshipOfferRow | null> => {
      if (!resolvedUserId) return null;
      assertValidUuid(resolvedUserId, 'userId');
      const { data: offerData, error } = await supabase
        .from('mentorship_offers')
        .select('*')
        .eq('mentor_id', resolvedUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (offerData ?? null) as unknown as MentorshipOfferRow | null;
    },
    enabled: !!resolvedUserId,
    staleTime: 30_000,
  });

  const actualBadgeStatus = computeMentorBadgeStatus(mentorOfferQuery.data);

  const handleMentorOptIn = () => {
    setShowOptInQuestion(true);
  };

  const handleMentorOptInConfirm = async (helpType: MentorHelpType) => {
    setSelectedHelpType(helpType);
    setShowOptInQuestion(false);
    await handleMentorToggle(true, helpType);
  };

  const handleMentorToggle = async (checked: boolean, helpType?: MentorHelpType) => {
    if (!resolvedUserId) return;

    assertValidUuid(resolvedUserId, 'userId');

    setIsUpdating(true);
    try {
      const { error: alumniError } = await supabase
        .from('alumni_profiles')
        .update({ willing_to_mentor: checked })
        .eq('user_id', resolvedUserId);

      if (alumniError) throw alumniError;

      if (checked) {
        const { data: existingOffer, error: offerFetchError } = await supabase
          .from('mentorship_offers')
          .select('id, mentor_id, is_active')
          .eq('mentor_id', resolvedUserId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (offerFetchError) throw offerFetchError;

        if (existingOffer?.id) {
          const { error: offerUpdateError } = await supabase
            .from('mentorship_offers')
            .update({ is_active: true })
            .eq('id', existingOffer.id);

          if (offerUpdateError) throw offerUpdateError;
        } else {
          // Get college_domain from the profiles table for proper domain scoping
          const { data: profileData } = await supabase
            .from('profiles')
            .select('college_domain')
            .eq('id', resolvedUserId)
            .single();

          const { error: offerInsertError } = await supabase
            .from('mentorship_offers')
            .insert({
              mentor_id: resolvedUserId,
              college_domain: profileData?.college_domain ?? null,
              is_active: true,
              help_type: helpType ?? selectedHelpType ?? 'general',
              commitment_level: 'occasional',
            });

          if (offerInsertError) throw offerInsertError;
        }
      } else {
        const { error: offerDeactivateError } = await supabase
          .from('mentorship_offers')
          .update({ is_active: false })
          .eq('mentor_id', resolvedUserId);

        if (offerDeactivateError) throw offerDeactivateError;
      }

      setWillingToMentor(checked);
      queryClient.invalidateQueries({ queryKey: ['mentorship'] });
      queryClient.invalidateQueries({ queryKey: ['mentorship', 'profile-offer', resolvedUserId] });
      queryClient.invalidateQueries({ queryKey: ['alumni-directory'] });
      toast({
        title: checked ? "Mentorship Enabled" : "Mentorship Disabled",
        description: checked
          ? "You are now available for mentorship requests from students and faculty."
          : "You will no longer receive mentorship requests.",
      });
    } catch (error) {
      console.error('Error updating mentor status:', error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update mentor status. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Professional Information */}
      <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-white/40" />
            <CardTitle className="text-white">Professional Information</CardTitle>
          </div>
          {isOwner && (
            <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]" onClick={onEdit}>
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-white/40">Current Position</p>
              <p className="font-medium text-white/70">{data.current_position || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-white/40">Company</p>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-white/30" />
                <p className="font-medium text-white/70">{data.current_company || 'Not specified'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-white/40">Industry</p>
              <p className="font-medium text-white/70">{data.industry || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-white/40">Experience</p>
              <p className="font-medium text-white/70">
                {data.years_of_experience
                  ? `${data.years_of_experience} years`
                  : 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/40">Career Level</p>
              {data.career_level && (
                <Badge variant="secondary" className="bg-white/[0.08] text-white/60 border border-white/10">{data.career_level}</Badge>
              )}
            </div>
            <div>
              <p className="text-sm text-white/40">Status</p>
              {data.employment_status && (
                <Badge
                  variant={data.employment_status === 'Employed' ? 'default' : 'secondary'}
                  className="bg-white/[0.08] text-white/60 border border-white/10"
                >
                  {data.employment_status}
                </Badge>
              )}
            </div>
          </div>

          {/* External Links */}
          <div className="flex gap-2">
            {data.linkedin_url && (
              <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]" asChild>
                <a href={data.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  LinkedIn
                </a>
              </Button>
            )}
            {data.company_website && (
              <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]" asChild>
                <a href={data.company_website} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Company
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Academic Background */}
      <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-white/40" />
            <CardTitle className="text-white">Academic Background</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-white/40">Graduation Year</p>
            <p className="font-medium text-lg text-white/70">{data.graduation_year || 'Not specified'}</p>
          </div>
          {data.degree_obtained && (
            <div>
              <p className="text-sm text-white/40">Degree</p>
              <p className="font-medium text-white/70">{data.degree_obtained}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mentorship Settings - Only visible to owner */}
      {isOwner && (
        <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-white/40" />
              <CardTitle className="text-white">Mentorship Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Opt-in Question for non-mentors */}
            {!willingToMentor && !showOptInQuestion && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-white/70">
                  Do you want to offer mentorship to students?
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-white/10 hover:bg-white/15 text-white border border-white/15"
                    onClick={handleMentorOptIn}
                    disabled={isUpdating}
                  >
                    Yes, I want to mentor
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 text-white/50 hover:bg-white/[0.06] bg-transparent"
                    disabled={isUpdating}
                  >
                    Not right now
                  </Button>
                </div>
              </div>
            )}

            {/* Help type selector — shown when alumni clicks "Yes" */}
            {showOptInQuestion && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-white/70">
                  How would you like to help students?
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {HELP_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleMentorOptInConfirm(option.value)}
                      disabled={isUpdating}
                      className="text-left rounded-lg border border-white/10 bg-white/[0.03] p-3 text-white/50 hover:bg-white/[0.08] hover:border-white/20 transition-all disabled:opacity-50"
                    >
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-white/40 mt-0.5">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active mentorship controls */}
            {willingToMentor && (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-white/70">Available for Mentorship</p>
                    <p className="text-sm text-white/40">
                      Allow students and faculty to send you mentorship requests
                    </p>
                  </div>
                  <Switch
                    checked={willingToMentor}
                    onCheckedChange={(checked) => handleMentorToggle(checked)}
                    disabled={isUpdating}
                    className="data-[state=checked]:bg-white/30"
                  />
                </div>
                <div className="home-card-tier3 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-white/60 font-medium">✓ Mentorship Active</p>
                    <MentorStatusBadge status={actualBadgeStatus} size="sm" />
                  </div>
                  <p className="text-xs text-white/40">
                    Students and faculty from your college can now find you in the Mentorship page and send requests.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mentorship & Opportunities */}
      <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-white/40" />
            <CardTitle className="text-white">Mentorship & Opportunities</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {data.willing_to_mentor && (
              <div>
                <Badge variant="default" className="bg-white/[0.08] text-white/60 border border-white/10 mb-2">
                  Available for Mentorship
                </Badge>
                {data.mentorship_areas && data.mentorship_areas.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-white/40 mb-2">Areas of Expertise:</p>
                    <div className="flex flex-wrap gap-2">
                      {data.mentorship_areas.map((area, index) => (
                        <Badge key={index} variant="outline" className="bg-white/[0.04] text-white/60 border-white/10">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {data.can_provide_referrals && (
              <Badge variant="default" className="bg-white/[0.08] text-white/60 border border-white/10">
                Can Provide Referrals
              </Badge>
            )}
            {data.available_for_recruitment && (
              <Badge variant="default" className="bg-white/[0.08] text-white/60 border border-white/10">
                Available for Recruiting
              </Badge>
            )}
            {data.open_to_opportunities && (
              <Badge variant="default" className="bg-white/[0.08] text-white/60 border border-white/10">
                Open to New Opportunities
              </Badge>
            )}
            {data.available_for_speaking && (
              <Badge variant="default" className="bg-white/[0.08] text-white/60 border border-white/10">
                Available for Speaking Engagements
              </Badge>
            )}
            {data.willing_to_post_jobs && (
              <Badge variant="default" className="bg-white/[0.08] text-white/60 border border-white/10">
                Willing to Post Jobs
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Community Engagement */}
      {(data.donations_made || data.events_attended) && (
        <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-white/40" />
              <CardTitle className="text-white">Community Engagement</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {data.events_attended && data.events_attended > 0 && (
                <div className="home-card-tier3 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-white/70">{data.events_attended}</p>
                  <p className="text-sm text-white/40">Events Attended</p>
                </div>
              )}
              {data.donations_made && data.donations_made > 0 && (
                <div className="home-card-tier3 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-white/70">{data.donations_made}</p>
                  <p className="text-sm text-white/40">Donations Made</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AlumniProfileSection;
