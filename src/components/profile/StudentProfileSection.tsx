import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  GraduationCap, 
  Calendar, 
  Award,
  Users,
  Lightbulb,
  Target
} from 'lucide-react';

interface StudentProfileData {
  student_id?: string;
  current_year?: number;
  current_semester?: string;
  expected_graduation?: string;
  gpa?: number;
  academic_standing?: string;
  enrollment_status?: string;
  minor?: string;
  specialization?: string;
  clubs?: string[];
  academic_achievements?: string[];
  research_interests?: string[];
  seeking_internship?: boolean;
  seeking_research_opportunity?: boolean;
  available_for_tutoring?: boolean;
  tutoring_subjects?: string[];
}

interface StudentProfileSectionProps {
  data: StudentProfileData;
  isOwner: boolean;
  onEdit?: () => void;
}

export const StudentProfileSection: React.FC<StudentProfileSectionProps> = ({
  data,
  isOwner,
  onEdit
}) => {
  return (
    <div className="space-y-6">
      {/* Academic Information */}
      <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-white/40" />
            <CardTitle className="text-white">Academic Information</CardTitle>
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
              <p className="text-sm text-white/40">Current Year</p>
              <p className="font-medium text-white/70">
                {data.current_year ? `Year ${data.current_year}` : 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/40">Current Semester</p>
              <p className="font-medium text-white/70">{data.current_semester || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-white/40">Expected Graduation</p>
              <p className="font-medium text-white/70">
                {data.expected_graduation 
                  ? new Date(data.expected_graduation).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
                  : 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/40">Enrollment Status</p>
              <Badge variant="secondary" className="bg-white/[0.08] text-white/60 border border-white/10">{data.enrollment_status || 'Full-time'}</Badge>
            </div>
          </div>

          {data.gpa !== undefined && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-white/40">GPA</p>
                <p className="font-bold text-white/70">{data.gpa.toFixed(2)} / 4.0</p>
              </div>
              <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-white/20 rounded-full transition-all" style={{ width: `${(data.gpa / 4.0) * 100}%` }} />
              </div>
            </div>
          )}

          {data.academic_standing && (
            <div>
              <p className="text-sm text-white/40 mb-1">Academic Standing</p>
              <Badge 
                variant={data.academic_standing === 'Good Standing' ? 'default' : 'secondary'}
                className="bg-white/[0.08] text-white/60 border border-white/10"
              >
                {data.academic_standing}
              </Badge>
            </div>
          )}

          {data.specialization && (
            <div>
              <p className="text-sm text-white/40">Specialization</p>
              <p className="font-medium text-white/70">{data.specialization}</p>
            </div>
          )}

          {data.minor && (
            <div>
              <p className="text-sm text-white/40">Minor</p>
              <p className="font-medium text-white/70">{data.minor}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clubs & Organizations */}
      {data.clubs && data.clubs.length > 0 && (
        <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-white/40" />
              <CardTitle className="text-white">Clubs & Organizations</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.clubs.map((club, index) => (
                <Badge key={index} variant="secondary" className="bg-white/[0.08] text-white/60 border border-white/10">
                  {club}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Academic Achievements */}
      {data.academic_achievements && data.academic_achievements.length > 0 && (
        <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-white/40" />
              <CardTitle className="text-white">Academic Achievements</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.academic_achievements.map((achievement, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Award className="h-4 w-4 text-white/30 mt-1 flex-shrink-0" />
                  <span className="text-white/60">{achievement}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Research Interests */}
      {data.research_interests && data.research_interests.length > 0 && (
        <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-white/40" />
              <CardTitle className="text-white">Research Interests</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.research_interests.map((interest, index) => (
                <Badge key={index} variant="outline" className="bg-white/[0.04] text-white/60 border-white/10">
                  {interest}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunities */}
      <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-white/40" />
            <CardTitle className="text-white">Seeking Opportunities</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.seeking_internship && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-white/[0.08] text-white/60 border border-white/10">
                Open to Internships
              </Badge>
            </div>
          )}
          {data.seeking_research_opportunity && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-white/[0.08] text-white/60 border border-white/10">
                Seeking Research Opportunities
              </Badge>
            </div>
          )}
          {data.available_for_tutoring && (
            <div>
              <Badge variant="default" className="bg-white/[0.08] text-white/60 border border-white/10 mb-2">
                Available for Tutoring
              </Badge>
              {data.tutoring_subjects && data.tutoring_subjects.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-white/40 mb-2">Subjects:</p>
                  <div className="flex flex-wrap gap-2">
                    {data.tutoring_subjects.map((subject, index) => (
                      <Badge key={index} variant="secondary" className="bg-white/[0.06] text-white/60 border border-white/10">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!data.seeking_internship && !data.seeking_research_opportunity && !data.available_for_tutoring && (
            <p className="text-sm text-white/40">Not currently seeking opportunities</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentProfileSection;
