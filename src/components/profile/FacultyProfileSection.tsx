import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  BookOpen, 
  Award,
  Users,
  MapPin,
  Phone,
  Clock,
  FileText
} from 'lucide-react';

interface FacultyProfileData {
  employee_id?: string;
  department?: string;
  position?: string;
  tenure_status?: string;
  office_location?: string;
  office_hours?: string;
  phone_extension?: string;
  research_areas?: string[];
  publications?: Array<{
    title: string;
    year?: number;
    journal?: string;
    url?: string;
  }>;
  courses_taught?: string[];
  current_courses?: string[];
  academic_credentials?: string[];
  research_lab?: string;
  accepting_phd_students?: boolean;
  accepting_research_assistants?: boolean;
  consultation_available?: boolean;
  years_at_institution?: number;
  awards?: string[];
}

interface FacultyProfileSectionProps {
  data: FacultyProfileData;
  isOwner: boolean;
  onEdit?: () => void;
}

export const FacultyProfileSection: React.FC<FacultyProfileSectionProps> = ({
  data,
  isOwner,
  onEdit
}) => {
  return (
    <div className="space-y-6">
      {/* Academic Position */}
      <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-white/40" />
            <CardTitle className="text-white">Academic Position</CardTitle>
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
              <p className="text-sm text-white/40">Position</p>
              <p className="font-medium text-lg text-white/70">{data.position || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-white/40">Department</p>
              <p className="font-medium text-white/70">{data.department || 'Not specified'}</p>
            </div>
            {data.tenure_status && (
              <div>
                <p className="text-sm text-white/40">Tenure Status</p>
                <Badge variant="secondary" className="bg-white/[0.08] text-white/60 border border-white/10">{data.tenure_status}</Badge>
              </div>
            )}
            {data.years_at_institution && (
              <div>
                <p className="text-sm text-white/40">Years at Institution</p>
                <p className="font-medium text-white/70">{data.years_at_institution} years</p>
              </div>
            )}
          </div>

          {data.research_lab && (
            <div>
              <p className="text-sm text-white/40">Research Lab</p>
              <p className="font-medium text-white/70">{data.research_lab}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-white/40" />
            <CardTitle className="text-white">Contact & Office Hours</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.office_location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-white/30" />
              <div>
                <p className="text-sm text-white/40">Office</p>
                <p className="font-medium text-white/70">{data.office_location}</p>
              </div>
            </div>
          )}
          {data.phone_extension && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-white/30" />
              <div>
                <p className="text-sm text-white/40">Phone Extension</p>
                <p className="font-medium text-white/70">{data.phone_extension}</p>
              </div>
            </div>
          )}
          {data.office_hours && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-white/30" />
              <div>
                <p className="text-sm text-white/40">Office Hours</p>
                <p className="font-medium text-white/70">{data.office_hours}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Research Areas */}
      {data.research_areas && data.research_areas.length > 0 && (
        <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-white/40" />
              <CardTitle className="text-white">Research Areas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.research_areas.map((area, index) => (
                <Badge key={index} variant="outline" className="bg-white/[0.04] text-white/60 border-white/10">
                  {area}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Courses */}
      {((data.current_courses && data.current_courses.length > 0) || 
        (data.courses_taught && data.courses_taught.length > 0)) && (
        <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-white/40" />
              <CardTitle className="text-white">Courses</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.current_courses && data.current_courses.length > 0 && (
              <div>
                <p className="text-sm font-medium text-white/60 mb-2">Current Semester</p>
                <div className="flex flex-wrap gap-2">
                  {data.current_courses.map((course, index) => (
                    <Badge key={index} variant="default" className="bg-white/[0.08] text-white/60 border border-white/10">
                      {course}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {data.courses_taught && data.courses_taught.length > 0 && (
              <div>
                <p className="text-sm font-medium text-white/60 mb-2">Previously Taught</p>
                <div className="flex flex-wrap gap-2">
                  {data.courses_taught.map((course, index) => (
                    <Badge key={index} variant="secondary" className="bg-white/[0.06] text-white/60 border border-white/10">
                      {course}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Academic Credentials */}
      {data.academic_credentials && data.academic_credentials.length > 0 && (
        <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-white/40" />
              <CardTitle className="text-white">Academic Credentials</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.academic_credentials.map((credential, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Award className="h-4 w-4 text-white/30 mt-1 flex-shrink-0" />
                  <span className="text-white/70">{credential}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Publications */}
      {data.publications && data.publications.length > 0 && (
        <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-white/40" />
              <CardTitle className="text-white">Recent Publications</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.publications.slice(0, 5).map((pub, index) => (
                <li key={index} className="border-l-2 border-white/15 pl-3">
                  <p className="font-medium text-white/70">{pub.title}</p>
                  <p className="text-sm text-white/40">
                    {pub.journal && <span>{pub.journal}</span>}
                    {pub.year && <span> ({pub.year})</span>}
                  </p>
                  {pub.url && (
                    <a 
                      href={pub.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-white/60 hover:text-white"
                    >
                      View Publication
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Opportunities */}
      <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-white/40" />
            <CardTitle className="text-white">Student Opportunities</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.accepting_phd_students && (
            <Badge variant="default" className="bg-white/[0.08] text-white/60 border border-white/10">
              Accepting PhD Students
            </Badge>
          )}
          {data.accepting_research_assistants && (
            <Badge variant="default" className="bg-white/[0.08] text-white/60 border border-white/10">
              Accepting Research Assistants
            </Badge>
          )}
          {data.consultation_available && (
            <Badge variant="default" className="bg-white/[0.08] text-white/60 border border-white/10">
              Available for Consultation
            </Badge>
          )}
          {!data.accepting_phd_students && !data.accepting_research_assistants && !data.consultation_available && (
            <p className="text-sm text-white/40">Not currently accepting applications</p>
          )}
        </CardContent>
      </Card>

      {/* Awards & Recognition */}
      {data.awards && data.awards.length > 0 && (
        <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-white/40" />
              <CardTitle className="text-white">Awards & Recognition</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.awards.map((award, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Award className="h-4 w-4 text-white/30 mt-1 flex-shrink-0" />
                  <span className="text-white/70">{award}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FacultyProfileSection;
