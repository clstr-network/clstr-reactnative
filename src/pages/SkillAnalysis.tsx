/**
 * Skill Analysis Page
 * Displays skill gap analysis, market alignment, and peer comparison
 * 
 * PERMISSION MATRIX:
 * - Student: ✅ All features including peer comparison
 * - Alumni: ✅ All features except peer comparison
 * - Faculty: 🚫 No access
 * - Club: 🚫 No access
 */

import { useState } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { useSkillAnalysis } from "@/hooks/useSkillAnalysis";
import { useNavigate, Link } from "react-router-dom";
import { 
  getSkillDistribution, 
  getScoreBgColor, 
  getScoreColor,
  getScoreLabel 
} from "@/lib/skill-analysis-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  Target,
  TrendingUp,
  Users,
  Briefcase,
  RefreshCw,
  ChevronRight,
  Award,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Lightbulb,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Shield,
} from "lucide-react";
import { useFeatureAccess, useRouteGuard } from "@/hooks/useFeatureAccess";

const SkillAnalysis = () => {
  const { profile } = useProfile();
  const { canAccessSkillAnalysis, canViewPeerComparison, profileType, isLoading: permissionsLoading } = useFeatureAccess();
  const navigate = useNavigate();
  const userId = profile?.id;
  
  // Route guard - redirect Faculty and Club profiles away from Skill Analysis
  useRouteGuard(canAccessSkillAnalysis, '/home');
  
  const {
    analysis,
    isLoading,
    isComputing,
    error,
    overallScore,
    scoreLabel,
    scoreColor,
    refresh,
  } = useSkillAnalysis(userId);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
      toast({
        title: "Analysis updated",
        description: "Your skill analysis has been refreshed with the latest data.",
      });
    } catch (err) {
      toast({
        title: "Refresh failed",
        description: err instanceof Error ? err.message : "Failed to refresh analysis",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Permission check - using new feature-based permissions
  if (!permissionsLoading && !canAccessSkillAnalysis) {
    return (
      <div className="container py-6 px-4 md:px-6">
        <Card className="max-w-lg mx-auto">
          <CardContent className="py-10 text-center">
            <Shield className="h-12 w-12 mx-auto text-white/40 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-white/60 mb-4">
              Skill Analysis is not available for {profileType} profiles.
              This feature is available for Students and Alumni only.
            </p>
            <Button onClick={() => navigate("/home")}>Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not logged in
  if (!profile) {
    return (
      <div className="container py-6 px-4 md:px-6">
        <Card className="max-w-lg mx-auto">
          <CardContent className="py-10 text-center">
            <p className="text-white/60 mb-4">Please sign in to view your skill analysis.</p>
            <Button onClick={() => navigate("/login")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container py-6 px-4 md:px-6 pb-20 md:pb-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container py-6 px-4 md:px-6">
        <Card className="max-w-lg mx-auto">
          <CardContent className="py-10 text-center">
            <XCircle className="h-12 w-12 mx-auto text-white/40 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Analysis</h2>
            <p className="text-white/60 mb-4">{error.message}</p>
            <Button onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? "Retrying..." : "Try Again"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No analysis yet
  if (!analysis) {
    return (
      <div className="container py-6 px-4 md:px-6">
        <Card className="max-w-lg mx-auto">
          <CardContent className="py-10 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-white/60 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Ready to Analyze Your Skills?</h2>
            <p className="text-white/60 mb-4">
              Get insights on your skill alignment with job market trends,
              identify gaps, and see how you compare with peers.
            </p>
            <Button onClick={handleRefresh} disabled={isComputing}>
              {isComputing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Start Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const distribution = getSkillDistribution(analysis);
  const computedDate = new Date(analysis.computed_at);
  const timeAgo = getTimeAgo(computedDate);

  return (
    <div className="container py-6 px-4 md:px-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-white/60" />
            Skill Analysis
          </h1>
          <p className="text-white/60 mt-1">
            Last updated {timeAgo}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing || isComputing}
        >
          {isRefreshing || isComputing ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Analysis
        </Button>
      </div>

      {/* Overall Score Card */}
      <Card className="mb-6">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className={`flex-shrink-0 w-32 h-32 rounded-full ${getScoreBgColor(overallScore)} flex items-center justify-center`}>
              <div className="text-center">
                <div className={`text-4xl font-bold ${scoreColor}`}>{overallScore}</div>
                <div className="text-sm text-white/60">Overall</div>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">
                Your Skill Health: <span className={scoreColor}>{scoreLabel}</span>
              </h2>
              <p className="text-white/60 mb-4">
                Based on market alignment, skill completeness, and diversity.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <ScoreBar
                  label="Market Fit"
                  value={analysis.market_alignment_score}
                  icon={<TrendingUp className="h-4 w-4" />}
                />
                <ScoreBar
                  label="Completeness"
                  value={analysis.completeness_score}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                />
                <ScoreBar
                  label="Diversity"
                  value={analysis.diversity_score}
                  icon={<Target className="h-4 w-4" />}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Your Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-white/60" />
              Your Skills ({analysis.skill_count})
            </CardTitle>
            <CardDescription>Skills on your profile</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.skill_count === 0 ? (
              <div className="text-center py-4">
                <p className="text-white/60 text-sm mb-2">No skills added yet</p>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/profile/${userId}`}>Add Skills</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {analysis.current_skills.slice(0, 8).map((skill, idx) => (
                    <Badge key={idx} variant="secondary">
                      {skill.name}
                    </Badge>
                  ))}
                  {analysis.skill_count > 8 && (
                    <Badge variant="outline">+{analysis.skill_count - 8} more</Badge>
                  )}
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Technical</span>
                    <span className="font-medium">{distribution.technical}%</span>
                  </div>
                  <Progress value={distribution.technical} className="h-2" />
                  <div className="flex justify-between">
                    <span>Soft Skills</span>
                    <span className="font-medium">{distribution.soft}%</span>
                  </div>
                  <Progress value={distribution.soft} className="h-2" />
                  <div className="flex justify-between">
                    <span>Domain</span>
                    <span className="font-medium">{distribution.domain}%</span>
                  </div>
                  <Progress value={distribution.domain} className="h-2" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trending Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Trending Skills
            </CardTitle>
            <CardDescription>In-demand in the job market</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.trending_skills.length === 0 ? (
              <p className="text-white/60 text-sm">No trending data available</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {analysis.trending_skills.map((skill, idx) => {
                  const hasSkill = analysis.current_skills.some(
                    (s) => s.name.toLowerCase() === skill.toLowerCase()
                  );
                  return (
                    <Badge
                      key={idx}
                      variant={hasSkill ? "default" : "outline"}
                      className={hasSkill ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
                    >
                      {hasSkill && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {skill}
                    </Badge>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommended Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              Recommended to Learn
            </CardTitle>
            <CardDescription>Skills that would boost your profile</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.recommended_skills.length === 0 ? (
              <p className="text-white/60 text-sm">
                Great job! You have the trending skills covered.
              </p>
            ) : (
              <div className="space-y-2">
                {analysis.recommended_skills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-md bg-yellow-50 border border-yellow-200"
                  >
                    <ArrowRight className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">{skill}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skill Gaps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Skill Gaps
            </CardTitle>
            <CardDescription>Missing skills for job matches</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.skill_gaps.length === 0 ? (
              <p className="text-white/60 text-sm">
                No significant gaps detected based on your job matches.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {analysis.skill_gaps.slice(0, 10).map((skill, idx) => (
                  <Badge key={idx} variant="outline" className="border-orange-300 text-orange-700">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Job Market Fit
            </CardTitle>
            <CardDescription>How you match with available jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Matching Jobs</span>
                <span className="text-2xl font-bold text-blue-600">
                  {analysis.matching_job_count}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Avg Match Score</span>
                <span className="text-lg font-semibold">
                  {analysis.avg_job_match_score}%
                </span>
              </div>
              {analysis.top_job_categories.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-white/60 mb-2">Best fit categories:</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.top_job_categories.map((cat, idx) => (
                        <Badge key={idx} variant="secondary">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/jobs">
                  Browse Jobs <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Peer Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Peer Comparison
            </CardTitle>
            <CardDescription>How you compare with peers at your college</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="text-3xl font-bold text-purple-600">
                  Top {100 - analysis.peer_percentile}%
                </div>
                <p className="text-sm text-white/60">
                  Among peers at your institution
                </p>
              </div>
              
              {analysis.differentiating_skills.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Your standout skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.differentiating_skills.map((skill, idx) => (
                        <Badge key={idx} className="bg-purple-100 text-purple-800">
                          ⭐ {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              {analysis.common_peer_skills.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-white/60 mb-2">Common among peers:</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.common_peer_skills.slice(0, 5).map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Helper Components
const ScoreBar = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) => (
  <div className="space-y-1">
    <div className="flex items-center gap-1 text-sm text-white/60">
      {icon}
      <span>{label}</span>
    </div>
    <Progress value={value} className="h-2" />
    <div className={`text-sm font-medium ${getScoreColor(value)}`}>{value}%</div>
  </div>
);

// Helper function
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  
  return date.toLocaleDateString();
}

export default SkillAnalysis;
