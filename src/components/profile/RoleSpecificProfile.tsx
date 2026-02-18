import { useCallback, useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { StudentProfileSection } from './StudentProfileSection';
import { AlumniProfileSection } from './AlumniProfileSection';
import { FacultyProfileSection } from './FacultyProfileSection';
import { ClubProfileSection } from './ClubProfileSection';
import { OrganizationProfileSection } from './OrganizationProfileSection';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/profile';
import { assertValidUuid } from '@/lib/uuid';

interface RoleSpecificProfileProps {
  profile: UserProfile;
  isOwner: boolean;
  onEdit?: () => void;
}

type StudentProfileData = ComponentProps<typeof StudentProfileSection>['data'];
type AlumniProfileData = ComponentProps<typeof AlumniProfileSection>['data'];
type FacultyProfileData = ComponentProps<typeof FacultyProfileSection>['data'];
type ClubProfileData = ComponentProps<typeof ClubProfileSection>['clubProfile'];
type OrganizationProfileData = ComponentProps<typeof OrganizationProfileSection>['orgProfile'];

type RoleProfileData =
  | StudentProfileData
  | AlumniProfileData
  | FacultyProfileData
  | ClubProfileData
  | OrganizationProfileData;

const supabaseClient = supabase as SupabaseClient<Record<string, unknown>>;

export const RoleSpecificProfile = ({ 
  profile, 
  isOwner, 
  onEdit 
}: RoleSpecificProfileProps) => {
  const [roleProfile, setRoleProfile] = useState<RoleProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoleProfile = useCallback(async () => {
    if (!profile.id || !profile.role) {
      setLoading(false);
      return;
    }

    try {
      assertValidUuid(profile.id, 'profile.id');
      setLoading(true);
      setError(null);

      const fetchRoleData = async () => {
        switch (profile.role) {
          case 'Student':
            return supabaseClient.from('student_profiles').select('*').eq('user_id', profile.id).single();
          case 'Alumni':
            return supabaseClient.from('alumni_profiles').select('*').eq('user_id', profile.id).single();
          case 'Faculty':
          case 'Principal':
          case 'Dean':
            return supabaseClient.from('faculty_profiles').select('*').eq('user_id', profile.id).single();
          case 'Club':
            return supabaseClient.from('club_profiles').select('*').eq('user_id', profile.id).single();
          case 'Organization':
            return supabaseClient.from('organization_profiles').select('*').eq('user_id', profile.id).single();
          default:
            return null;
        }
      };

      const response = await fetchRoleData();
      if (!response) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = response;

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No role-specific profile found - this is okay, profile might be new
          setRoleProfile(null);
        } else {
          throw fetchError;
        }
      } else {
        setRoleProfile(data);
      }
    } catch (err) {
      console.error('Error fetching role profile:', err);
      setError((err as Error).message || 'Failed to load role-specific profile');
    } finally {
      setLoading(false);
    }
  }, [profile.id, profile.role]);

  useEffect(() => {
    fetchRoleProfile();
  }, [fetchRoleProfile]);

  useEffect(() => {
    if (!profile.id || !profile.role) return;

    let table: string | null = null;
    switch (profile.role) {
      case 'Student':
        table = 'student_profiles';
        break;
      case 'Alumni':
        table = 'alumni_profiles';
        break;
      case 'Faculty':
      case 'Principal':
      case 'Dean':
        table = 'faculty_profiles';
        break;
      case 'Club':
        table = 'club_profiles';
        break;
      case 'Organization':
        table = 'organization_profiles';
        break;
      default:
        table = null;
    }

    if (!table) return;

    const channel = supabase
      .channel(`role-profile-${table}-${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `user_id=eq.${profile.id}` },
        () => {
          fetchRoleProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRoleProfile, profile.id, profile.role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading profile details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // If no role-specific profile exists yet, show message to owner
  if (!roleProfile && isOwner) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Complete Your Profile</AlertTitle>
        <AlertDescription>
          Add {profile.role}-specific information to your profile to help others learn more about you.
        </AlertDescription>
      </Alert>
    );
  }

  // If no role-specific profile and not owner, don't show anything
  if (!roleProfile) {
    return null;
  }

  // Render appropriate role-specific component
  switch (profile.role) {
    case 'Student':
      return (
        <StudentProfileSection 
          data={roleProfile as StudentProfileData}
          isOwner={isOwner}
          onEdit={onEdit}
        />
      );

    case 'Alumni':
      return (
        <AlumniProfileSection 
          data={roleProfile as AlumniProfileData}
          isOwner={isOwner}
          onEdit={onEdit}
        />
      );

    case 'Faculty':
      return (
        <FacultyProfileSection 
          data={roleProfile as FacultyProfileData}
          isOwner={isOwner}
          onEdit={onEdit}
        />
      );

    case 'Club':
      return (
        <ClubProfileSection 
          profile={profile}
          clubProfile={roleProfile as ClubProfileData}
          isOwner={isOwner}
          onEdit={onEdit}
        />
      );

    case 'Organization':
      return (
        <OrganizationProfileSection 
          profile={profile}
          orgProfile={roleProfile as OrganizationProfileData}
          isOwner={isOwner}
          onEdit={onEdit}
        />
      );

    default:
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unknown Role</AlertTitle>
          <AlertDescription>
            Profile role "{profile.role}" is not recognized.
          </AlertDescription>
        </Alert>
      );
  }
};

export default RoleSpecificProfile;
