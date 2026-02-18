import { motion } from "framer-motion";
import type { ProfileData } from "@/types/portfolio";
import { ExternalLink, Github, Linkedin } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

export default function ElianaTemplate({ profile }: { profile: ProfileData }) {
  const s = profile.settings;
  let idx = 0;

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-white">
      <nav className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between">
        <span className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight">
          {profile.name.split(" ")[0].toLowerCase()}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">.</span>
        </span>
        <div className="flex items-center gap-2 sm:gap-4">
          {profile.linkedin && (
            <a href={`https://${profile.linkedin}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-700 transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
          )}
          {profile.github && (
            <a href={`https://${profile.github}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-700 transition-colors">
              <Github className="w-5 h-5" />
            </a>
          )}
          {profile.email && (
            <a href={`mailto:${profile.email}`} className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-full bg-gradient-to-r from-orange-400 to-pink-500 text-white font-medium hover:shadow-lg hover:shadow-pink-200 transition-all">
              Contact
            </a>
          )}
        </div>
      </nav>

      <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={idx++} className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center">
        {profile.photo ? (
          <img src={profile.photo} alt={profile.name} className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover mx-auto mb-4 sm:mb-6 shadow-lg shadow-pink-200" />
        ) : (
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-orange-300 to-pink-400 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold mx-auto mb-4 sm:mb-6 shadow-lg shadow-pink-200">
            {initials}
          </div>
        )}
        <p className="text-gray-500 text-base sm:text-lg mb-2">Hi! I&apos;m {profile.name.split(" ")[0]} 👋</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight max-w-2xl mx-auto">{profile.role}</h1>
        {s.showAbout && profile.about && (
          <p className="text-gray-500 mt-4 sm:mt-6 max-w-xl mx-auto leading-relaxed text-sm sm:text-base px-2">{profile.about}</p>
        )}
      </motion.section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10 sm:space-y-16 pb-16 sm:pb-20">
        {s.showExperience && profile.experience.length > 0 && (
          <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={idx++}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-6">Experience</h2>
            <div className="space-y-6">
              {profile.experience.map((exp) => (
                <div key={exp.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{exp.role}</h3>
                      <p className="text-sm text-gray-500">{exp.company}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{exp.startDate} — {exp.current ? "Present" : exp.endDate}</span>
                  </div>
                  {exp.description && <p className="text-sm text-gray-500 mt-3 leading-relaxed">{exp.description}</p>}
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {s.showEducation && profile.education.length > 0 && (
          <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={idx++}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-6">Education</h2>
            <div className="space-y-4">
              {profile.education.map((edu) => (
                <div key={edu.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-900">{edu.institution}</h3>
                  <p className="text-sm text-gray-500">{edu.degree} {edu.field && `in ${edu.field}`}</p>
                  <p className="text-xs text-gray-400 mt-1">{edu.startYear} — {edu.endYear}</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {s.showSkills && profile.skills.length > 0 && (
          <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={idx++}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-6">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span key={skill} className="px-4 py-2 text-sm rounded-full bg-gradient-to-r from-orange-50 to-pink-50 text-gray-700 border border-pink-100 font-medium">{skill}</span>
              ))}
            </div>
          </motion.section>
        )}

        {s.showProjects && profile.projects.length > 0 && (
          <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={idx++}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4 sm:mb-6">Projects</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {profile.projects.map((proj) => (
                <div key={proj.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900">{proj.title}</h3>
                    {proj.link && (
                      <a href={proj.link} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-pink-500 transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  {proj.description && <p className="text-sm text-gray-500 mt-2 leading-relaxed">{proj.description}</p>}
                  {proj.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {proj.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-600">{tag}</span>
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
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-6">Posts</h2>
            <div className="space-y-4">
              {profile.posts.map((post) => (
                <div key={post.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm">{post.title}</h3>
                  <p className="text-sm text-gray-400 mt-1 leading-relaxed line-clamp-3">{post.content}</p>
                  <p className="text-xs text-gray-300 mt-2">{post.date}</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </div>

      <footer className="border-t border-gray-100 py-8 text-center">
        <a href="https://clstr.in" target="_blank" rel="noreferrer" className="text-xs text-gray-300 hover:text-gray-500 transition-colors">Built with Clstr</a>
      </footer>
    </div>
  );
}
