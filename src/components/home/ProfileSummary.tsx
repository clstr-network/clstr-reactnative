
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BriefcaseIcon, GraduationCap, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useProfile } from "@/contexts/ProfileContext";
import { Skeleton } from "@/components/ui/skeleton";
import { UserBadge } from "@/components/ui/user-badge";
import { UserAvatar } from "@/components/ui/user-avatar";

const ProfileSummary = () => {
  const { profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div className="alumni-card p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3 md:gap-4">
          <Skeleton className="h-14 w-14 md:h-16 md:w-16 rounded-full flex-shrink-0" />
          <div className="space-y-2 flex-1 min-w-0">
            <Skeleton className="h-5 w-28 md:w-32" />
            <Skeleton className="h-4 w-36 md:w-48" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="alumni-card p-4 md:p-6 space-y-4">
        <div className="text-center">
          <p className="text-white/50 text-sm">Please sign in to view your profile</p>
          <Button asChild className="mt-4 bg-white/10 hover:bg-white/15 text-white border border-white/15">
            <Link to="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="alumni-card p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3 md:gap-4">
        <UserAvatar
          src={profile.avatar_url}
          name={profile.full_name}
          userType={profile.role}
          size="lg"
          className="shadow-md flex-shrink-0 h-14 w-14 md:h-16 md:w-16"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="font-bold text-base md:text-lg truncate">{profile.full_name || 'Complete your profile'}</h2>
            {profile.role && (
              <UserBadge userType={profile.role} size="sm" />
            )}
          </div>
          <p className="text-xs md:text-sm text-white/50 truncate">{profile.role || 'Student'} at {getDomainDisplayName(profile.college_domain)}</p>
        </div>
      </div>

      <div className="space-y-2.5 text-sm text-white/50">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-white/30 flex-shrink-0" />
          <span className="truncate">{profile.college_domain ? `${profile.college_domain} community` : 'No location set'}</span>
        </div>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-white/30 flex-shrink-0" />
          <span className="truncate">{profile.college_domain ? `${profile.college_domain} member` : 'No batch information'}</span>
        </div>
        <div className="flex items-center gap-2">
          <BriefcaseIcon className="h-4 w-4 text-white/30 flex-shrink-0" />
          <span className="truncate">{profile.role || 'Role not set'}</span>
        </div>
      </div>

      <div className="pt-2">
        <Button asChild className="w-full bg-white/8 hover:bg-white/12 text-white text-sm border border-white/10">
          <Link to="/profile">View Profile</Link>
        </Button>
      </div>
    </div>
  );
};

// Helper functions
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

function getDomainDisplayName(domain?: string | null): string {
  if (!domain) return 'Unknown Institution';

  // Convert domain to a more readable format
  if (domain.includes('edu')) return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1) + ' University';
  if (domain.includes('ac')) return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1) + ' College';
  return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
}

export default ProfileSummary;
