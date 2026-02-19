import { motion } from "framer-motion";
import type { ProfileData } from "@clstr/shared/types/portfolio";
import { ExternalLink, Github, Linkedin } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

export default function GeekyTemplate({ profile }: { profile: ProfileData }) {
  const s = profile.settings;
  let idx = 0;

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-bold text-gray-900">{`{•••}`}</span>
            <span className="text-lg sm:text-xl font-bold text-emerald-500">
              {profile.name.split(" ")[0].toLowerCase()}
            </span>
          </div>
          <div className="flex items-center gap-3">
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
          </div>
        </div>
      </nav>

      <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={idx++} className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="flex flex-col-reverse md:flex-row items-center gap-8 sm:gap-10 text-center md:text-left">
          <div className="flex-1">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 leading-[1.1]">
              Welcome<span className="text-emerald-500">!</span>
            </h1>
            <p className="text-xl sm:text-2xl md:text-3xl text-gray-600 mt-2 font-medium">
              to {profile.name}&apos;s Portfolio
            </p>
            {s.showAbout && profile.about && (
              <p className="text-gray-400 mt-4 sm:mt-6 leading-relaxed max-w-md mx-auto md:mx-0 text-sm sm:text-base">{profile.about}</p>
            )}
            {profile.email && (
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex items-center gap-2 mt-6 sm:mt-8 px-5 sm:px-6 py-2.5 sm:py-3 bg-emerald-500 text-white text-sm sm:text-base font-medium rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Know About Me
              </a>
            )}
          </div>
          {profile.photo ? (
            <img src={profile.photo} alt={profile.name} className="w-40 h-40 sm:w-56 sm:h-56 rounded-2xl object-cover shadow-lg shrink-0" />
          ) : (
            <div className="w-40 h-40 sm:w-56 sm:h-56 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-5xl sm:text-6xl font-bold text-gray-400 shrink-0 shadow-lg">
              {initials}
            </div>
          )}
        </div>
      </motion.section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16 pb-16 sm:pb-20">
        {s.showExperience && profile.experience.length > 0 && (
          <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={idx++}>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Experience</h2>
            <div className="h-1 w-24 sm:w-32 bg-emerald-400 rounded mb-6 sm:mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {profile.experience.map((exp) => (
                <div key={exp.id} className="rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <span className="text-xs text-emerald-500 font-semibold">{exp.startDate} — {exp.current ? "Present" : exp.endDate}</span>
                  <h3 className="font-bold text-gray-900 mt-2">{exp.role}</h3>
                  <p className="text-sm text-gray-500">{exp.company}</p>
                  {exp.description && <p className="text-sm text-gray-400 mt-3 leading-relaxed">{exp.description}</p>}
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {s.showEducation && profile.education.length > 0 && (
          <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={idx++}>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Education</h2>
            <div className="h-1 w-32 bg-emerald-400 rounded mb-8" />
            <div className="space-y-4">
              {profile.education.map((edu) => (
                <div key={edu.id} className="rounded-xl border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-900">{edu.institution}</h3>
                  <p className="text-sm text-gray-500">{edu.degree} {edu.field && `in ${edu.field}`}</p>
                  <p className="text-xs text-emerald-500 font-medium mt-1">{edu.startYear} — {edu.endYear}</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {s.showSkills && profile.skills.length > 0 && (
          <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={idx++}>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Skills</h2>
            <div className="h-1 w-32 bg-emerald-400 rounded mb-8" />
            <div className="flex flex-wrap gap-3">
              {profile.skills.map((skill) => (
                <span key={skill} className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-50 border border-gray-100 text-gray-700 hover:border-emerald-200 hover:bg-emerald-50 transition-colors">{skill}</span>
              ))}
            </div>
          </motion.section>
        )}

        {s.showProjects && profile.projects.length > 0 && (
          <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={idx++}>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Projects</h2>
            <div className="h-1 w-24 sm:w-32 bg-emerald-400 rounded mb-6 sm:mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {profile.projects.map((proj) => (
                <div key={proj.id} className="rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-32 bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
                    <span className="text-4xl font-bold text-emerald-200">{proj.title[0]}</span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-gray-900">{proj.title}</h3>
                      {proj.link && (
                        <a href={proj.link} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-emerald-500 transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    {proj.description && <p className="text-sm text-gray-500 mt-2 leading-relaxed">{proj.description}</p>}
                    {proj.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {proj.tags.map((tag) => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-600">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {s.showPosts && profile.posts.length > 0 && (
          <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={idx++}>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Blog Posts</h2>
            <div className="h-1 w-24 sm:w-32 bg-emerald-400 rounded mb-6 sm:mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {profile.posts.map((post) => (
                <div key={post.id} className="rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <p className="text-xs text-emerald-500 font-medium">{post.date}</p>
                  <h3 className="font-bold text-gray-900 mt-2">{post.title}</h3>
                  <p className="text-sm text-gray-400 mt-2 leading-relaxed line-clamp-3">{post.content}</p>
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
