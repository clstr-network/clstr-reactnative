import { motion } from "framer-motion";
import type { ProfileData } from "@/types/portfolio";
import { MapPin, ExternalLink, Github, Linkedin, Zap } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

export default function TypefolioTemplate({ profile }: { profile: ProfileData }) {
  const s = profile.settings;
  let idx = 0;

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-white">
      <div className="h-36 sm:h-52 bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 relative overflow-hidden">
        <div className="absolute inset-0 opacity-50" />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-12 sm:-mt-16 relative">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={idx++} className="flex flex-col items-center sm:items-start sm:flex-row gap-4 sm:gap-5 text-center sm:text-left">
          {profile.photo ? (
            <img src={profile.photo} alt={profile.name} className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-lg shrink-0" />
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold border-4 border-white shadow-lg shrink-0 relative">
              {initials}
              <span className="absolute bottom-1 right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full border-2 border-white" />
            </div>
          )}
          <div className="flex-1 pt-0 sm:pt-2">
            <div className="flex flex-col gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{profile.name}</h1>
                <p className="text-purple-600 font-medium text-sm">{profile.role}</p>
                {profile.location && (
                  <p className="flex items-center justify-center sm:justify-start gap-1 text-gray-400 text-sm mt-1">
                    <MapPin className="w-3.5 h-3.5" /> {profile.location}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                {profile.linkedin && (
                  <a href={`https://${profile.linkedin}`} target="_blank" rel="noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-400 transition-all">
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {profile.github && (
                  <a href={`https://${profile.github}`} target="_blank" rel="noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-400 transition-all">
                    <Github className="w-4 h-4" />
                  </a>
                )}
                {profile.email && (
                  <a href={`mailto:${profile.email}`} className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-gray-900 text-white text-xs sm:text-sm font-medium rounded-full hover:bg-gray-800 transition-colors">
                    <Zap className="w-3.5 h-3.5" /> Get in touch
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <hr className="my-8 sm:my-10 border-gray-100" />

        <div className="space-y-10 sm:space-y-14 pb-16 sm:pb-20">
          {s.showAbout && profile.about && (
            <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={idx++}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">About Me</p>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug">{profile.about}</h2>
            </motion.section>
          )}

          {s.showSkills && profile.skills.length > 0 && (
            <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={idx++}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">Services</p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span key={skill} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:border-gray-400 transition-colors cursor-default">{skill}</span>
                ))}
              </div>
            </motion.section>
          )}

          {s.showExperience && profile.experience.length > 0 && (
            <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={idx++}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-6">Experience</p>
              <div className="space-y-6">
                {profile.experience.map((exp) => (
                  <div key={exp.id} className="border-l-2 border-gray-200 pl-5">
                    <h3 className="font-semibold text-gray-900">{exp.role}</h3>
                    <p className="text-sm text-gray-500">{exp.company} · {exp.startDate} — {exp.current ? "Present" : exp.endDate}</p>
                    {exp.description && <p className="text-sm text-gray-500 mt-2 leading-relaxed">{exp.description}</p>}
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {s.showEducation && profile.education.length > 0 && (
            <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={idx++}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-6">Education</p>
              <div className="space-y-4">
                {profile.education.map((edu) => (
                  <div key={edu.id} className="border-l-2 border-gray-200 pl-5">
                    <h3 className="font-semibold text-gray-900">{edu.institution}</h3>
                    <p className="text-sm text-gray-500">{edu.degree} {edu.field && `in ${edu.field}`}</p>
                    <p className="text-xs text-gray-400 mt-1">{edu.startYear} — {edu.endYear}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {s.showProjects && profile.projects.length > 0 && (
            <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={idx++}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4 sm:mb-6">Featured Work</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {profile.projects.map((proj) => (
                  <div key={proj.id} className="rounded-xl border border-gray-100 p-5 hover:shadow-lg transition-shadow bg-gray-50/50">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-gray-900">{proj.title}</h3>
                      {proj.link && (
                        <a href={proj.link} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-700 transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    {proj.description && <p className="text-sm text-gray-500 mt-2 leading-relaxed">{proj.description}</p>}
                    {proj.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {proj.tags.map((tag) => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-600">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {s.showPosts && profile.posts.length > 0 && (
            <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={idx++}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-6">Posts</p>
              <div className="space-y-4">
                {profile.posts.map((post) => (
                  <div key={post.id} className="border-l-2 border-purple-200 pl-5">
                    <h3 className="font-semibold text-gray-900 text-sm">{post.title}</h3>
                    <p className="text-sm text-gray-400 mt-1 leading-relaxed line-clamp-3">{post.content}</p>
                    <p className="text-xs text-gray-300 mt-2">{post.date}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </div>
      </div>

      <footer className="border-t border-gray-100 py-8 text-center">
        <a href="https://clstr.in" target="_blank" rel="noreferrer" className="text-xs text-gray-300 hover:text-gray-500 transition-colors">Built with Clstr</a>
      </footer>
    </div>
  );
}
