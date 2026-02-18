import { motion } from "framer-motion";
import type { ProfileData } from "@/types/portfolio";
import { useState } from "react";
import { MapPin, Mail, ExternalLink, Sun, Moon } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function MinimalTemplate({ profile }: { profile: ProfileData }) {
  const s = profile.settings;
  const [dark, setDark] = useState(true);
  let sectionIndex = 0;

  const bg = dark ? "bg-black" : "bg-gray-50";
  const text = dark ? "text-white" : "text-gray-900";
  const textMuted = dark ? "text-white/50" : "text-gray-500";
  const textSubtle = dark ? "text-white/30" : "text-gray-400";
  const textBody = dark ? "text-white/70" : "text-gray-600";
  const textFaint = dark ? "text-white/20" : "text-gray-300";
  const textLink = dark ? "text-white/30 hover:text-white/60" : "text-gray-400 hover:text-gray-600";
  const avatarBg = dark ? "bg-white/[0.08] border-white/10 text-white/60" : "bg-gray-200 border-gray-300 text-gray-500";
  const sectionLabel = dark ? "text-white/30" : "text-gray-400";
  const skillBg = dark ? "text-white/70 bg-white/[0.06] border-white/[0.08]" : "text-gray-700 bg-gray-100 border-gray-200";
  const cardBg = dark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-gray-200 shadow-sm";
  const tagBg = dark ? "text-white/40 bg-white/[0.04]" : "text-gray-500 bg-gray-100";
  const borderLine = dark ? "border-white/[0.08]" : "border-gray-200";
  const borderFooter = dark ? "border-white/[0.06]" : "border-gray-200";
  const toggleBg = dark ? "bg-white/[0.08] border-white/10 hover:bg-white/[0.14]" : "bg-gray-200 border-gray-300 hover:bg-gray-300";
  const toggleText = dark ? "text-white/60" : "text-gray-600";

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end mb-6 sm:mb-8">
          <button onClick={() => setDark(!dark)} className={`p-2.5 rounded-full border transition-colors ${toggleBg} ${toggleText}`} aria-label="Toggle theme">
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </motion.div>

        <motion.header variants={fadeUp} initial="hidden" animate="visible" custom={sectionIndex++} className="mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
            {profile.photo ? (
              <img src={profile.photo} alt={profile.name} className="w-20 h-20 rounded-full object-cover border shrink-0" />
            ) : (
              <div className={`w-20 h-20 rounded-full border flex items-center justify-center text-2xl font-bold shrink-0 ${avatarBg}`}>
                {initials}
              </div>
            )}
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold leading-tight ${text}`}>{profile.name}</h1>
              <p className={`text-base sm:text-lg mt-1 ${textMuted}`}>{profile.role}</p>
              <div className={`flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 mt-3 text-sm ${textSubtle}`}>
                {profile.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {profile.location}</span>}
                {profile.email && <a href={`mailto:${profile.email}`} className={`flex items-center gap-1 transition-colors ${textLink}`}><Mail className="w-3.5 h-3.5" /> {profile.email}</a>}
              </div>
              {(profile.linkedin || profile.github) && (
                <div className="flex gap-3 mt-3 justify-center sm:justify-start">
                  {profile.linkedin && <a href={`https://${profile.linkedin}`} target="_blank" rel="noreferrer" className={`text-sm transition-colors ${textLink}`}>LinkedIn ↗</a>}
                  {profile.github && <a href={`https://${profile.github}`} target="_blank" rel="noreferrer" className={`text-sm transition-colors ${textLink}`}>GitHub ↗</a>}
                </div>
              )}
            </div>
          </div>
        </motion.header>

        <div className="space-y-8 sm:space-y-10">
          {s.showAbout && profile.about && (
            <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={sectionIndex++}>
              <h2 className={`text-xs font-semibold uppercase tracking-[0.2em] mb-4 ${sectionLabel}`}>About</h2>
              <p className={`leading-relaxed ${textBody}`}>{profile.about}</p>
            </motion.section>
          )}

          {s.showExperience && profile.experience.length > 0 && (
            <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={sectionIndex++}>
              <h2 className={`text-xs font-semibold uppercase tracking-[0.2em] mb-4 ${sectionLabel}`}>Experience</h2>
              <div className="space-y-5">
                {profile.experience.map((exp) => (
                  <div key={exp.id}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`font-medium ${text}`}>{exp.role}</h3>
                        <p className={`text-sm ${textMuted}`}>{exp.company}</p>
                      </div>
                      <span className={`text-xs shrink-0 ${textSubtle}`}>{exp.startDate} — {exp.current ? "Present" : exp.endDate}</span>
                    </div>
                    {exp.description && <p className={`text-sm mt-2 leading-relaxed ${textMuted}`}>{exp.description}</p>}
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {s.showEducation && profile.education.length > 0 && (
            <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={sectionIndex++}>
              <h2 className={`text-xs font-semibold uppercase tracking-[0.2em] mb-4 ${sectionLabel}`}>Education</h2>
              <div className="space-y-4">
                {profile.education.map((edu) => (
                  <div key={edu.id}>
                    <h3 className={`font-medium ${text}`}>{edu.institution}</h3>
                    <p className={`text-sm ${textMuted}`}>{edu.degree} {edu.field && `in ${edu.field}`}</p>
                    <p className={`text-xs mt-1 ${textSubtle}`}>{edu.startYear} — {edu.endYear}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {s.showSkills && profile.skills.length > 0 && (
            <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={sectionIndex++}>
              <h2 className={`text-xs font-semibold uppercase tracking-[0.2em] mb-4 ${sectionLabel}`}>Skills</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span key={skill} className={`px-3 py-1.5 text-sm border rounded-lg ${skillBg}`}>{skill}</span>
                ))}
              </div>
            </motion.section>
          )}

          {s.showProjects && profile.projects.length > 0 && (
            <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={sectionIndex++}>
              <h2 className={`text-xs font-semibold uppercase tracking-[0.2em] mb-4 ${sectionLabel}`}>Projects</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {profile.projects.map((proj) => (
                  <div key={proj.id} className={`border rounded-xl p-3 sm:p-4 ${cardBg}`}>
                    <div className="flex items-start justify-between">
                      <h3 className={`font-medium text-sm sm:text-base ${text}`}>{proj.title}</h3>
                      {proj.link && <a href={proj.link} target="_blank" rel="noreferrer" className={`transition-colors ${textLink}`}><ExternalLink className="w-4 h-4" /></a>}
                    </div>
                    {proj.description && <p className={`text-xs sm:text-sm mt-2 leading-relaxed ${textMuted}`}>{proj.description}</p>}
                    {proj.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {proj.tags.map((tag) => (<span key={tag} className={`text-xs px-2 py-0.5 rounded ${tagBg}`}>{tag}</span>))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {s.showPosts && profile.posts.length > 0 && (
            <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={sectionIndex++}>
              <h2 className={`text-xs font-semibold uppercase tracking-[0.2em] mb-4 ${sectionLabel}`}>Posts & Activity</h2>
              <div className="space-y-4">
                {profile.posts.map((post) => (
                  <div key={post.id} className={`border-l-2 pl-4 ${borderLine}`}>
                    <h3 className={`font-medium text-sm ${text}`}>{post.title}</h3>
                    <p className={`text-sm mt-1 leading-relaxed line-clamp-3 ${textSubtle}`}>{post.content}</p>
                    <p className={`text-xs mt-2 ${textFaint}`}>{post.date}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </div>

        <motion.footer variants={fadeUp} initial="hidden" animate="visible" custom={sectionIndex} className={`mt-16 pt-8 border-t text-center ${borderFooter}`}>
          <a href="https://clstr.in" target="_blank" rel="noreferrer" className={`text-xs ${textFaint} hover:text-white/40 transition-colors`}>Built with Clstr</a>
        </motion.footer>
      </div>
    </div>
  );
}
