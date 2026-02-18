import { useState } from "react";
import { Plus, ChevronDown, ChevronUp, Globe, Linkedin, Twitter, Facebook, Instagram, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProfileSkills from "@/components/profile/ProfileSkills";
import ProfileExperience from "@/components/profile/ProfileExperience";
import ProfileEducation from "@/components/profile/ProfileEducation";
import type { UserProfile } from "@/types/profile";

interface AboutTabProps {
  profile: UserProfile;
  isCurrentUser: boolean;
  onEditProfile: () => void;
}

const AboutTab = ({ profile, isCurrentUser, onEditProfile }: AboutTabProps) => {
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const socialLinks = (profile.social_links || {}) as Record<string, string>;

  return (
    <div className="space-y-6">
      {/* ── Role / Headline ── */}
      {(profile.headline || isCurrentUser) && (
        <section>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
              Role
            </h3>
            {isCurrentUser && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white/40 hover:text-white/70 hover:bg-white/[0.06] h-7 text-xs"
                onClick={onEditProfile}
              >
                <Edit3 className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
          {profile.headline ? (
            <p className="text-white/70 text-sm font-medium">{profile.headline}</p>
          ) : (
            <p className="text-white/30 italic text-sm">
              Add a short role or headline (e.g. "Founder", "CS Student")
            </p>
          )}
        </section>
      )}

      {/* ── Bio ── */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Bio</h3>
          {isCurrentUser && !profile.bio && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/40 hover:text-white/70 hover:bg-white/[0.06] h-7 text-xs"
              onClick={onEditProfile}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          )}
        </div>
        {profile.bio ? (
          <div>
            <p
              className={`text-white/60 text-sm leading-relaxed whitespace-pre-wrap ${
                !isBioExpanded && profile.bio.length > 300 ? "line-clamp-4" : ""
              }`}
            >
              {profile.bio}
            </p>
            {profile.bio.length > 300 && (
              <Button
                variant="link"
                className="p-0 h-auto text-xs text-white/40 hover:text-white/60 mt-1"
                onClick={() => setIsBioExpanded(!isBioExpanded)}
              >
                {isBioExpanded ? (
                  <>
                    Show less <ChevronUp className="h-3 w-3 ml-0.5" />
                  </>
                ) : (
                  <>
                    See more <ChevronDown className="h-3 w-3 ml-0.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-white/30 italic text-sm">
            {isCurrentUser
              ? "Share your story — what drives you, what you're working on."
              : "No bio added yet."}
          </p>
        )}
      </section>

      {/* ── Interests ── */}
      {((profile.interests && profile.interests.length > 0) || isCurrentUser) && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
              Interests
            </h3>
            {isCurrentUser && (!profile.interests || profile.interests.length === 0) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white/40 hover:text-white/70 hover:bg-white/[0.06] h-7 text-xs"
                onClick={onEditProfile}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </div>
          {profile.interests && profile.interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.interests.slice(0, 12).map((interest, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="px-3 py-1 text-xs bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-white/70 font-medium"
                >
                  {interest}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-white/30 italic text-sm">
              Add interests to help others discover you.
            </p>
          )}
        </section>
      )}

      <div className="border-t border-white/[0.06]" />

      {/* ── Experience (compact, editable) ── */}
      <section>
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
          Experience
        </h3>
        <ProfileExperience
          profileId={profile.id}
          isEditable={isCurrentUser}
        />
      </section>

      <div className="border-t border-white/[0.06]" />

      {/* ── Education (compact, editable) ── */}
      <section>
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
          Education
        </h3>
        <ProfileEducation
          profileId={profile.id}
          isEditable={isCurrentUser}
        />
      </section>

      <div className="border-t border-white/[0.06]" />

      {/* ── Skills (pills, editable) ── */}
      <section>
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
          Skills
        </h3>
        <ProfileSkills profileId={profile.id} isEditable={isCurrentUser} />
      </section>

      {/* ── Social Links ── */}
      {(socialLinks.website ||
        socialLinks.linkedin ||
        socialLinks.twitter ||
        socialLinks.facebook ||
        socialLinks.instagram) && (
        <>
          <div className="border-t border-white/[0.06]" />
          <section>
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
              Links
            </h3>
            <div className="flex flex-wrap gap-3">
              {socialLinks.website && (
                <a
                  href={socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  <span>Website</span>
                </a>
              )}
              {socialLinks.linkedin && (
                <a
                  href={socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                  <span>LinkedIn</span>
                </a>
              )}
              {socialLinks.twitter && (
                <a
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  <Twitter className="h-4 w-4" />
                  <span>Twitter</span>
                </a>
              )}
              {socialLinks.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                  <span>Facebook</span>
                </a>
              )}
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                  <span>Instagram</span>
                </a>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AboutTab;
