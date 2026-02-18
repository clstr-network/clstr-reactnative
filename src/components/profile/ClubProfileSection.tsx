import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Calendar, 
  UserPlus, 
  Award, 
  Target, 
  Clock,
  MapPin,
  Mail,
  Phone,
  Globe,
  Edit
} from 'lucide-react';

interface ClubProfile {
  club_type?: string;
  founding_year?: number;
  member_count?: number;
  active_member_count?: number;
  meeting_schedule?: string;
  meeting_location?: string;
  recruitment_status?: string;
  application_deadline?: string;
  leadership_team?: Array<{
    name: string;
    position: string;
    contact?: string;
  }>;
  achievements?: Array<{
    title: string;
    year: number;
    description?: string;
  }>;
  upcoming_events?: Array<{
    title: string;
    date: string;
    location?: string;
  }>;
  past_events?: string[];
  requirements?: string[];
  benefits?: string[];
  social_media?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  contact_email?: string;
  contact_phone?: string;
  focus_areas?: string[];
}

interface ClubProfileSectionProps {
  profile: {
    id: string;
    full_name?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    location?: string | null;
  };
  clubProfile: ClubProfile;
  isOwner: boolean;
  onEdit?: () => void;
}

export const ClubProfileSection = ({ 
  profile, 
  clubProfile, 
  isOwner, 
  onEdit 
}: ClubProfileSectionProps) => {
  
  return (
    <div className="space-y-6">
      {/* Header Actions */}
      {isOwner && (
        <div className="flex justify-end">
          <Button onClick={onEdit} variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Club Profile
          </Button>
        </div>
      )}

      {/* Club Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Club Information
          </CardTitle>
          <CardDescription>General information about the club</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-white/60">Club Type</p>
              <p className="font-medium">{clubProfile.club_type || 'Not specified'}</p>
            </div>
            
            {clubProfile.founding_year && (
              <div>
                <p className="text-sm text-white/60">Founded</p>
                <p className="font-medium">{clubProfile.founding_year}</p>
              </div>
            )}

            {clubProfile.member_count !== undefined && (
              <div>
                <p className="text-sm text-white/60">Total Members</p>
                <p className="font-medium flex items-center gap-2">
                  {clubProfile.member_count}
                  {clubProfile.active_member_count !== undefined && (
                    <span className="text-sm text-white/60">
                      ({clubProfile.active_member_count} active)
                    </span>
                  )}
                </p>
              </div>
            )}

            {profile.location && (
              <div>
                <p className="text-sm text-white/60">Location</p>
                <p className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {profile.location}
                </p>
              </div>
            )}
          </div>

          {clubProfile.focus_areas && clubProfile.focus_areas.length > 0 && (
            <div>
              <p className="text-sm text-white/60 mb-2">Focus Areas</p>
              <div className="flex flex-wrap gap-2">
                {clubProfile.focus_areas.map((area, index) => (
                  <Badge key={index} variant="secondary">
                    <Target className="h-3 w-3 mr-1" />
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recruitment Status */}
      {clubProfile.recruitment_status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Recruitment
            </CardTitle>
            <CardDescription>Current recruitment information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-white/60 mb-2">Status</p>
              <Badge 
                variant={clubProfile.recruitment_status === 'Open' ? 'default' : 'secondary'}
                className="text-base px-3 py-1"
              >
                {clubProfile.recruitment_status}
              </Badge>
            </div>

            {clubProfile.application_deadline && clubProfile.recruitment_status === 'Open' && (
              <div>
                <p className="text-sm text-white/60">Application Deadline</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(clubProfile.application_deadline).toLocaleDateString()}
                </p>
              </div>
            )}

            {clubProfile.requirements && clubProfile.requirements.length > 0 && (
              <div>
                <p className="text-sm text-white/60 mb-2">Requirements</p>
                <ul className="list-disc list-inside space-y-1">
                  {clubProfile.requirements.map((req, index) => (
                    <li key={index} className="text-sm">{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {clubProfile.benefits && clubProfile.benefits.length > 0 && (
              <div>
                <p className="text-sm text-white/60 mb-2">Member Benefits</p>
                <ul className="list-disc list-inside space-y-1">
                  {clubProfile.benefits.map((benefit, index) => (
                    <li key={index} className="text-sm">{benefit}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Meeting Schedule */}
      {clubProfile.meeting_schedule && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Meeting Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-white/60">Schedule</p>
              <p className="font-medium">{clubProfile.meeting_schedule}</p>
            </div>
            
            {clubProfile.meeting_location && (
              <div>
                <p className="text-sm text-white/60">Location</p>
                <p className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {clubProfile.meeting_location}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leadership Team */}
      {clubProfile.leadership_team && clubProfile.leadership_team.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Leadership Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clubProfile.leadership_team.map((leader, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <p className="font-medium">{leader.name}</p>
                  <p className="text-sm text-white/60">{leader.position}</p>
                  {leader.contact && (
                    <p className="text-sm text-blue-600 mt-1">{leader.contact}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      {clubProfile.achievements && clubProfile.achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Achievements
            </CardTitle>
            <CardDescription>Notable accomplishments and awards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clubProfile.achievements.map((achievement, index) => (
                <div key={index} className="border-l-2 border-primary pl-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{achievement.title}</p>
                      {achievement.description && (
                        <p className="text-sm text-white/60 mt-1">
                          {achievement.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">{achievement.year}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Events */}
      {clubProfile.upcoming_events && clubProfile.upcoming_events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clubProfile.upcoming_events.map((event, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-white/60 flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(event.date).toLocaleDateString()}
                  </p>
                  {event.location && (
                    <p className="text-sm text-white/60 flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {clubProfile.contact_email && (
            <div>
              <p className="text-sm text-white/60">Email</p>
              <a 
                href={`mailto:${clubProfile.contact_email}`}
                className="font-medium text-blue-600 hover:underline flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                {clubProfile.contact_email}
              </a>
            </div>
          )}

          {clubProfile.contact_phone && (
            <div>
              <p className="text-sm text-white/60">Phone</p>
              <a 
                href={`tel:${clubProfile.contact_phone}`}
                className="font-medium text-blue-600 hover:underline flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                {clubProfile.contact_phone}
              </a>
            </div>
          )}

          {clubProfile.social_media && (
            <div>
              <p className="text-sm text-white/60 mb-2">Social Media</p>
              <div className="flex flex-wrap gap-2">
                {clubProfile.social_media.website && (
                  <a 
                    href={clubProfile.social_media.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
                {clubProfile.social_media.instagram && (
                  <a 
                    href={clubProfile.social_media.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Instagram
                  </a>
                )}
                {clubProfile.social_media.facebook && (
                  <a 
                    href={clubProfile.social_media.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Facebook
                  </a>
                )}
                {clubProfile.social_media.linkedin && (
                  <a 
                    href={clubProfile.social_media.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    LinkedIn
                  </a>
                )}
                {clubProfile.social_media.twitter && (
                  <a 
                    href={clubProfile.social_media.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Twitter
                  </a>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClubProfileSection;
