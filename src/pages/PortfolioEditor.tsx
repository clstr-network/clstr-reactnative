/**
 * PortfolioEditor.tsx — Same exact flow as the showcase's ProfileEditor.tsx
 *
 * Full WYSIWYG editor with:
 * - Split-screen live preview (desktop)
 * - Edit all profile & portfolio fields inline
 * - Template selection link → /portfolio/templates
 * - Visibility toggles, isLive toggle, slug editor
 * - Auto-save settings; manual Save for profile data
 */

import { motion } from "framer-motion";
import { usePortfolioEditor } from "@/hooks/usePortfolioEditor";
import { useProfile } from "@/contexts/ProfileContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  User,
  GraduationCap,
  Briefcase,
  Code2,
  FolderOpen,
  MessageSquare,
  Settings,
  Eye,
  Plus,
  Trash2,
  Link as LinkIcon,
  Palette,
  PanelLeftClose,
  PanelLeft,
  Save,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type {
  PortfolioEducation as Education,
  PortfolioExperience as Experience,
  PortfolioProject as Project,
} from "@/types/portfolio";
import { PORTFOLIO_TEMPLATES as templates } from "@/types/portfolio";
import MinimalTemplate from "@/components/profile/portfolio/MinimalTemplate";
import ElianaTemplate from "@/components/profile/portfolio/ElianaTemplate";
import TypefolioTemplate from "@/components/profile/portfolio/TypefolioTemplate";
import GeekyTemplate from "@/components/profile/portfolio/GeekyTemplate";
import { useIsMobile } from "@/hooks/use-mobile";

const sectionAnim = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/[0.04] border border-white/10 rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="p-2 bg-white/[0.06] rounded-lg">
        <Icon className="w-5 h-5 text-white/70" />
      </div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </div>
  );
}

function TemplatePreview({ profile }: { profile: any }) {
  switch (profile.settings.template) {
    case "eliana":
      return <ElianaTemplate profile={profile} />;
    case "typefolio":
      return <TypefolioTemplate profile={profile} />;
    case "geeky":
      return <GeekyTemplate profile={profile} />;
    default:
      return <MinimalTemplate profile={profile} />;
  }
}

export default function PortfolioEditor() {
  const { profile: currentProfile, isLoading: isProfileLoading } = useProfile();
  const {
    profile,
    isLoading,
    isDirty,
    isSaving,
    updateProfile,
    updateSettings,
    saveProfile,
  } = usePortfolioEditor(currentProfile?.id);

  const [newSkill, setNewSkill] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const isMobile = useIsMobile();

  // Redirect if not logged in
  if (!isProfileLoading && !currentProfile) return <Navigate to="/login" replace />;

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white/30 text-sm">Loading editor…</div>
      </div>
    );
  }

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      updateProfile({ skills: [...profile.skills, newSkill.trim()] });
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    updateProfile({ skills: profile.skills.filter((s) => s !== skill) });
  };

  const addEducation = () => {
    const newEdu: Education = {
      id: Date.now().toString(),
      institution: "",
      degree: "",
      field: "",
      startYear: "",
      endYear: "",
    };
    updateProfile({ education: [...profile.education, newEdu] });
  };

  const updateEducation = (id: string, updates: Partial<Education>) => {
    updateProfile({
      education: profile.education.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    });
  };

  const removeEducation = (id: string) => {
    updateProfile({ education: profile.education.filter((e) => e.id !== id) });
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: Date.now().toString(),
      company: "",
      role: "",
      description: "",
      startDate: "",
      endDate: "",
      current: false,
    };
    updateProfile({ experience: [...profile.experience, newExp] });
  };

  const updateExperience = (id: string, updates: Partial<Experience>) => {
    updateProfile({
      experience: profile.experience.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    });
  };

  const removeExperience = (id: string) => {
    updateProfile({ experience: profile.experience.filter((e) => e.id !== id) });
  };

  const addProject = () => {
    const newProj: Project = {
      id: Date.now().toString(),
      title: "",
      description: "",
      link: "",
      tags: [],
    };
    updateProfile({ projects: [...profile.projects, newProj] });
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    updateProfile({
      projects: profile.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    });
  };

  const removeProject = (id: string) => {
    updateProfile({ projects: profile.projects.filter((p) => p.id !== id) });
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Editor Panel */}
      <div className={`${showPreview && !isMobile ? 'w-1/2' : 'w-full'} min-h-screen overflow-y-auto transition-all duration-300`}>
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-3">
              <Link to={`/profile/${currentProfile?.id ?? ""}`}>
                <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
                <p className="text-white/50 text-sm mt-1">
                  {showPreview ? "Changes appear live on the right →" : "Your portfolio updates automatically as you edit."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isDirty && (
                <Button
                  onClick={saveProfile}
                  disabled={isSaving}
                  className="bg-white text-black hover:bg-white/90 gap-2 font-semibold"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving…" : "Save"}
                </Button>
              )}
              {!isMobile && (
                <Button
                  onClick={() => setShowPreview(!showPreview)}
                  variant="ghost"
                  size="icon"
                  className="text-white/50 hover:text-white hover:bg-white/10"
                  title={showPreview ? "Hide preview" : "Show preview"}
                >
                  {showPreview ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
                </Button>
              )}
              <Link to={`/portfolio/${profile.settings.slug}`}>
                <Button className="bg-white/10 border border-white/15 text-white hover:bg-white/20 gap-2">
                  <Eye className="w-4 h-4" />
                  {isMobile ? "Preview" : "Full Preview"}
                </Button>
              </Link>
            </div>
          </motion.div>

          <div className="space-y-6">
            {/* Basic Info */}
            <motion.div variants={sectionAnim} initial="hidden" animate="visible">
              <GlassCard>
                <SectionHeader icon={User} title="Basic Information" />
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white/60 text-sm">Full Name</Label>
                      <Input
                        value={profile.name}
                        onChange={(e) => updateProfile({ name: e.target.value })}
                        className="bg-white/[0.06] border-white/10 text-white mt-1"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <Label className="text-white/60 text-sm">Role / Title</Label>
                      <Input
                        value={profile.role}
                        onChange={(e) => updateProfile({ role: e.target.value })}
                        className="bg-white/[0.06] border-white/10 text-white mt-1"
                        placeholder="e.g. Full-Stack Developer"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white/60 text-sm">Location</Label>
                      <Input
                        value={profile.location}
                        onChange={(e) => updateProfile({ location: e.target.value })}
                        className="bg-white/[0.06] border-white/10 text-white mt-1"
                        placeholder="City, Country"
                      />
                    </div>
                    <div>
                      <Label className="text-white/60 text-sm">Email</Label>
                      <Input
                        value={profile.email}
                        onChange={(e) => updateProfile({ email: e.target.value })}
                        className="bg-white/[0.06] border-white/10 text-white mt-1"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white/60 text-sm">LinkedIn</Label>
                      <Input
                        value={profile.linkedin}
                        onChange={(e) => updateProfile({ linkedin: e.target.value })}
                        className="bg-white/[0.06] border-white/10 text-white mt-1"
                        placeholder="linkedin.com/in/yourname"
                      />
                    </div>
                    <div>
                      <Label className="text-white/60 text-sm">GitHub</Label>
                      <Input
                        value={profile.github}
                        onChange={(e) => updateProfile({ github: e.target.value })}
                        className="bg-white/[0.06] border-white/10 text-white mt-1"
                        placeholder="github.com/yourname"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-white/60 text-sm">Portfolio Slug</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-white/40 text-sm">clstr.in/</span>
                      <Input
                        value={profile.settings.slug}
                        onChange={(e) => updateSettings({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                        className="bg-white/[0.06] border-white/10 text-white"
                        placeholder="your-name"
                      />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* About */}
            <motion.div variants={sectionAnim} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
              <GlassCard>
                <SectionHeader icon={User} title="About" />
                <Textarea
                  value={profile.about}
                  onChange={(e) => updateProfile({ about: e.target.value })}
                  className="bg-white/[0.06] border-white/10 text-white min-h-[120px]"
                  placeholder="Tell people about yourself..."
                />
              </GlassCard>
            </motion.div>

            {/* Education */}
            <motion.div variants={sectionAnim} initial="hidden" animate="visible" transition={{ delay: 0.15 }}>
              <GlassCard>
                <SectionHeader icon={GraduationCap} title="Education" />
                <div className="space-y-4">
                  {profile.education.map((edu) => (
                    <div key={edu.id} className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] space-y-3">
                      <div className="flex justify-between items-start">
                        <Input
                          value={edu.institution}
                          onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
                          className="bg-transparent border-none text-white font-medium p-0 h-auto text-base"
                          placeholder="Institution name"
                        />
                        <button onClick={() => removeEducation(edu.id)} className="text-white/30 hover:text-white/60 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          value={edu.degree}
                          onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                          className="bg-white/[0.04] border-white/[0.06] text-white/80 text-sm"
                          placeholder="Degree"
                        />
                        <Input
                          value={edu.field}
                          onChange={(e) => updateEducation(edu.id, { field: e.target.value })}
                          className="bg-white/[0.04] border-white/[0.06] text-white/80 text-sm"
                          placeholder="Field of study"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          value={edu.startYear}
                          onChange={(e) => updateEducation(edu.id, { startYear: e.target.value })}
                          className="bg-white/[0.04] border-white/[0.06] text-white/80 text-sm"
                          placeholder="Start year"
                        />
                        <Input
                          value={edu.endYear}
                          onChange={(e) => updateEducation(edu.id, { endYear: e.target.value })}
                          className="bg-white/[0.04] border-white/[0.06] text-white/80 text-sm"
                          placeholder="End year"
                        />
                      </div>
                    </div>
                  ))}
                  <Button onClick={addEducation} className="bg-white/[0.06] border border-white/10 text-white/70 hover:bg-white/10 gap-2 w-full">
                    <Plus className="w-4 h-4" /> Add Education
                  </Button>
                </div>
              </GlassCard>
            </motion.div>

            {/* Experience */}
            <motion.div variants={sectionAnim} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
              <GlassCard>
                <SectionHeader icon={Briefcase} title="Experience" />
                <div className="space-y-4">
                  {profile.experience.map((exp) => (
                    <div key={exp.id} className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] space-y-3">
                      <div className="flex justify-between items-start">
                        <Input
                          value={exp.role}
                          onChange={(e) => updateExperience(exp.id, { role: e.target.value })}
                          className="bg-transparent border-none text-white font-medium p-0 h-auto text-base"
                          placeholder="Role / Title"
                        />
                        <button onClick={() => removeExperience(exp.id)} className="text-white/30 hover:text-white/60 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <Input
                        value={exp.company}
                        onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                        className="bg-white/[0.04] border-white/[0.06] text-white/80 text-sm"
                        placeholder="Company"
                      />
                      <Textarea
                        value={exp.description}
                        onChange={(e) => updateExperience(exp.id, { description: e.target.value })}
                        className="bg-white/[0.04] border-white/[0.06] text-white/80 text-sm min-h-[80px]"
                        placeholder="What did you do?"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          value={exp.startDate}
                          onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                          className="bg-white/[0.04] border-white/[0.06] text-white/80 text-sm"
                          placeholder="Start date"
                        />
                        <Input
                          value={exp.endDate}
                          onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                          className="bg-white/[0.04] border-white/[0.06] text-white/80 text-sm"
                          placeholder="End date"
                          disabled={exp.current}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={exp.current}
                          onCheckedChange={(checked) => updateExperience(exp.id, { current: checked, endDate: checked ? "" : exp.endDate })}
                        />
                        <Label className="text-white/50 text-sm">Currently working here</Label>
                      </div>
                    </div>
                  ))}
                  <Button onClick={addExperience} className="bg-white/[0.06] border border-white/10 text-white/70 hover:bg-white/10 gap-2 w-full">
                    <Plus className="w-4 h-4" /> Add Experience
                  </Button>
                </div>
              </GlassCard>
            </motion.div>

            {/* Skills */}
            <motion.div variants={sectionAnim} initial="hidden" animate="visible" transition={{ delay: 0.25 }}>
              <GlassCard>
                <SectionHeader icon={Code2} title="Skills" />
                <div className="flex flex-wrap gap-2 mb-4">
                  {profile.skills.map((skill) => (
                    <Badge
                      key={skill}
                      className="bg-white/[0.08] text-white/80 border-white/10 hover:bg-white/[0.12] cursor-pointer gap-1 px-3 py-1"
                      onClick={() => removeSkill(skill)}
                    >
                      {skill} <span className="text-white/40">×</span>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSkill()}
                    className="bg-white/[0.06] border-white/10 text-white"
                    placeholder="Add a skill..."
                  />
                  <Button onClick={addSkill} className="bg-white/10 border border-white/15 text-white hover:bg-white/20">
                    Add
                  </Button>
                </div>
              </GlassCard>
            </motion.div>

            {/* Projects */}
            <motion.div variants={sectionAnim} initial="hidden" animate="visible" transition={{ delay: 0.3 }}>
              <GlassCard>
                <SectionHeader icon={FolderOpen} title="Projects & Achievements" />
                <div className="space-y-4">
                  {profile.projects.map((proj) => (
                    <div key={proj.id} className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] space-y-3">
                      <div className="flex justify-between items-start">
                        <Input
                          value={proj.title}
                          onChange={(e) => updateProject(proj.id, { title: e.target.value })}
                          className="bg-transparent border-none text-white font-medium p-0 h-auto text-base"
                          placeholder="Project title"
                        />
                        <button onClick={() => removeProject(proj.id)} className="text-white/30 hover:text-white/60 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <Textarea
                        value={proj.description}
                        onChange={(e) => updateProject(proj.id, { description: e.target.value })}
                        className="bg-white/[0.04] border-white/[0.06] text-white/80 text-sm min-h-[80px]"
                        placeholder="Describe the project..."
                      />
                      <Input
                        value={proj.link}
                        onChange={(e) => updateProject(proj.id, { link: e.target.value })}
                        className="bg-white/[0.04] border-white/[0.06] text-white/80 text-sm"
                        placeholder="Project link (optional)"
                      />
                    </div>
                  ))}
                  <Button onClick={addProject} className="bg-white/[0.06] border border-white/10 text-white/70 hover:bg-white/10 gap-2 w-full">
                    <Plus className="w-4 h-4" /> Add Project
                  </Button>
                </div>
              </GlassCard>
            </motion.div>

            {/* Posts */}
            <motion.div variants={sectionAnim} initial="hidden" animate="visible" transition={{ delay: 0.35 }}>
              <GlassCard>
                <SectionHeader icon={MessageSquare} title="Posts & Activity" />
                <div className="space-y-4">
                  {profile.posts.length === 0 ? (
                    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                      <p className="text-sm text-white/50">No persisted posts found.</p>
                    </div>
                  ) : (
                    profile.posts.map((post) => (
                      <div key={post.id} className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] space-y-2">
                        <p className="text-white font-medium break-words">{post.title || "Untitled post"}</p>
                        <p className="text-sm text-white/70 whitespace-pre-wrap break-words">{post.content}</p>
                        {post.date && (
                          <p className="text-xs text-white/40">{new Date(post.date).toLocaleDateString()}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {/* Visibility Settings */}
            <motion.div variants={sectionAnim} initial="hidden" animate="visible" transition={{ delay: 0.4 }}>
              <GlassCard>
                <SectionHeader icon={Settings} title="Portfolio Settings" />
                <div className="space-y-4">
                  {/* Template Selection */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">Template</p>
                      <p className="text-white/40 text-xs">
                        Currently using: {templates.find(t => t.id === profile.settings.template)?.name || "Minimal"}
                      </p>
                    </div>
                    <Link to="/portfolio/templates">
                      <Button className="bg-white/10 border border-white/15 text-white hover:bg-white/20 gap-2 text-sm">
                        <Palette className="w-4 h-4" /> Change
                      </Button>
                    </Link>
                  </div>
                  <div className="border-t border-white/[0.06] my-2" />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">Portfolio Live</p>
                      <p className="text-white/40 text-xs">Make your portfolio visible to anyone with the link</p>
                    </div>
                    <Switch
                      checked={profile.settings.isLive}
                      onCheckedChange={(checked) => updateSettings({ isLive: checked })}
                    />
                  </div>
                  {[
                    { key: "showAbout" as const, label: "About Section" },
                    { key: "showEducation" as const, label: "Education" },
                    { key: "showExperience" as const, label: "Experience" },
                    { key: "showSkills" as const, label: "Skills" },
                    { key: "showProjects" as const, label: "Projects" },
                    { key: "showPosts" as const, label: "Posts & Activity" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <p className="text-white/70 text-sm">{label}</p>
                      <Switch
                        checked={profile.settings[key]}
                        onCheckedChange={(checked) => updateSettings({ [key]: checked })}
                      />
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* Share Link */}
            <motion.div variants={sectionAnim} initial="hidden" animate="visible" transition={{ delay: 0.45 }}>
              <GlassCard className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <LinkIcon className="w-5 h-5 text-white/50" />
                  <p className="text-white/50 text-sm">Your shareable link</p>
                </div>
                <p className="text-white text-lg font-medium">
                  clstr.in/{profile.settings.slug}
                </p>
                <p className="text-white/30 text-xs mt-2">
                  Share this link on resumes, LinkedIn, or anywhere.
                </p>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Live Preview Panel */}
      {showPreview && !isMobile && (
        <div className="w-1/2 h-screen sticky top-0 border-l border-white/10 overflow-hidden bg-gray-100">
          <div className="h-full overflow-y-auto">
            <div className="transform scale-[0.85] origin-top">
              <TemplatePreview profile={profile} />
            </div>
          </div>
          <div className="absolute top-4 left-4 bg-black/70 px-3 py-1.5 rounded-full">
            <p className="text-white/70 text-xs font-medium">Live Preview</p>
          </div>
        </div>
      )}
    </div>
  );
}
