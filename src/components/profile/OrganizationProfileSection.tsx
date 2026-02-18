import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Clock, 
  Users, 
  Handshake, 
  Target,
  MapPin,
  Mail,
  Phone,
  Globe,
  Calendar,
  Award,
  Edit
} from 'lucide-react';

interface OrganizationProfile {
  organization_type?: string;
  industry?: string;
  founded_year?: number;
  size?: string;
  website?: string;
  services_offered?: string[];
  operating_hours?: string;
  office_location?: string;
  contact_persons?: Array<{
    name: string;
    position: string;
    email?: string;
    phone?: string;
  }>;
  partnership_opportunities?: Array<{
    type: string;
    description: string;
    requirements?: string[];
  }>;
  current_initiatives?: Array<{
    title: string;
    description: string;
    start_date?: string;
    end_date?: string;
  }>;
  past_collaborations?: string[];
  recognition?: Array<{
    title: string;
    year: number;
    description?: string;
  }>;
  target_audience?: string[];
  social_responsibility?: string[];
  contact_email?: string;
  contact_phone?: string;
  social_media?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
}

interface OrganizationProfileSectionProps {
  profile: {
    id: string;
    full_name?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    location?: string | null;
  };
  orgProfile: OrganizationProfile;
  isOwner: boolean;
  onEdit?: () => void;
}

export const OrganizationProfileSection = ({ 
  profile, 
  orgProfile, 
  isOwner, 
  onEdit 
}: OrganizationProfileSectionProps) => {
  
  return (
    <div className="space-y-6">
      {/* Header Actions */}
      {isOwner && (
        <div className="flex justify-end">
          <Button onClick={onEdit} variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Organization Profile
          </Button>
        </div>
      )}

      {/* Organization Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Information
          </CardTitle>
          <CardDescription>General information about the organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orgProfile.organization_type && (
              <div>
                <p className="text-sm text-white/60">Type</p>
                <p className="font-medium">{orgProfile.organization_type}</p>
              </div>
            )}
            
            {orgProfile.industry && (
              <div>
                <p className="text-sm text-white/60">Industry</p>
                <p className="font-medium">{orgProfile.industry}</p>
              </div>
            )}

            {orgProfile.founded_year && (
              <div>
                <p className="text-sm text-white/60">Founded</p>
                <p className="font-medium">{orgProfile.founded_year}</p>
              </div>
            )}

            {orgProfile.size && (
              <div>
                <p className="text-sm text-white/60">Organization Size</p>
                <p className="font-medium">{orgProfile.size}</p>
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

            {orgProfile.website && (
              <div>
                <p className="text-sm text-white/60">Website</p>
                <a 
                  href={orgProfile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline flex items-center gap-2"
                >
                  <Globe className="h-4 w-4" />
                  Visit Website
                </a>
              </div>
            )}
          </div>

          {orgProfile.target_audience && orgProfile.target_audience.length > 0 && (
            <div>
              <p className="text-sm text-white/60 mb-2">Target Audience</p>
              <div className="flex flex-wrap gap-2">
                {orgProfile.target_audience.map((audience, index) => (
                  <Badge key={index} variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {audience}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services Offered */}
      {orgProfile.services_offered && orgProfile.services_offered.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Services Offered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {orgProfile.services_offered.map((service, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <span>{service}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operating Hours & Location */}
      {(orgProfile.operating_hours || orgProfile.office_location) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Office Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orgProfile.operating_hours && (
              <div>
                <p className="text-sm text-white/60">Operating Hours</p>
                <p className="font-medium">{orgProfile.operating_hours}</p>
              </div>
            )}
            
            {orgProfile.office_location && (
              <div>
                <p className="text-sm text-white/60">Office Location</p>
                <p className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {orgProfile.office_location}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contact Persons */}
      {orgProfile.contact_persons && orgProfile.contact_persons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contact Persons
            </CardTitle>
            <CardDescription>Key contacts within the organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orgProfile.contact_persons.map((person, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-1">
                  <p className="font-medium">{person.name}</p>
                  <p className="text-sm text-white/60">{person.position}</p>
                  {person.email && (
                    <a 
                      href={`mailto:${person.email}`}
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Mail className="h-3 w-3" />
                      {person.email}
                    </a>
                  )}
                  {person.phone && (
                    <a 
                      href={`tel:${person.phone}`}
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" />
                      {person.phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partnership Opportunities */}
      {orgProfile.partnership_opportunities && orgProfile.partnership_opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5" />
              Partnership Opportunities
            </CardTitle>
            <CardDescription>Available collaboration and partnership options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orgProfile.partnership_opportunities.map((opportunity, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{opportunity.type}</h4>
                    <Badge variant="outline">Open</Badge>
                  </div>
                  <p className="text-sm text-white/60 mb-2">
                    {opportunity.description}
                  </p>
                  {opportunity.requirements && opportunity.requirements.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Requirements:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {opportunity.requirements.map((req, reqIndex) => (
                          <li key={reqIndex} className="text-sm text-white/60">
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Initiatives */}
      {orgProfile.current_initiatives && orgProfile.current_initiatives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Current Initiatives
            </CardTitle>
            <CardDescription>Ongoing programs and projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orgProfile.current_initiatives.map((initiative, index) => (
                <div key={index} className="border-l-2 border-primary pl-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{initiative.title}</p>
                      <p className="text-sm text-white/60 mt-1">
                        {initiative.description}
                      </p>
                      {(initiative.start_date || initiative.end_date) && (
                        <p className="text-sm text-white/60 flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4" />
                          {initiative.start_date && new Date(initiative.start_date).toLocaleDateString()}
                          {initiative.end_date && ` - ${new Date(initiative.end_date).toLocaleDateString()}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recognition & Awards */}
      {orgProfile.recognition && orgProfile.recognition.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Recognition & Awards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orgProfile.recognition.map((award, index) => (
                <div key={index} className="border-l-2 border-primary pl-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{award.title}</p>
                      {award.description && (
                        <p className="text-sm text-white/60 mt-1">
                          {award.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">{award.year}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Social Responsibility */}
      {orgProfile.social_responsibility && orgProfile.social_responsibility.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5" />
              Social Responsibility
            </CardTitle>
            <CardDescription>Community engagement and CSR initiatives</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              {orgProfile.social_responsibility.map((initiative, index) => (
                <li key={index}>{initiative}</li>
              ))}
            </ul>
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
          {orgProfile.contact_email && (
            <div>
              <p className="text-sm text-white/60">General Inquiries</p>
              <a 
                href={`mailto:${orgProfile.contact_email}`}
                className="font-medium text-blue-600 hover:underline flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                {orgProfile.contact_email}
              </a>
            </div>
          )}

          {orgProfile.contact_phone && (
            <div>
              <p className="text-sm text-white/60">Phone</p>
              <a 
                href={`tel:${orgProfile.contact_phone}`}
                className="font-medium text-blue-600 hover:underline flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                {orgProfile.contact_phone}
              </a>
            </div>
          )}

          {orgProfile.social_media && (
            <div>
              <p className="text-sm text-white/60 mb-2">Social Media</p>
              <div className="flex flex-wrap gap-2">
                {orgProfile.social_media.linkedin && (
                  <a 
                    href={orgProfile.social_media.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    LinkedIn
                  </a>
                )}
                {orgProfile.social_media.twitter && (
                  <a 
                    href={orgProfile.social_media.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Twitter
                  </a>
                )}
                {orgProfile.social_media.facebook && (
                  <a 
                    href={orgProfile.social_media.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Facebook
                  </a>
                )}
                {orgProfile.social_media.instagram && (
                  <a 
                    href={orgProfile.social_media.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Instagram
                  </a>
                )}
                {orgProfile.social_media.youtube && (
                  <a 
                    href={orgProfile.social_media.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    YouTube
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

export default OrganizationProfileSection;
