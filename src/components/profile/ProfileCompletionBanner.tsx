import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/contexts/ProfileContext";
import { getMissingProfileFields, isProfileComplete } from "@/lib/profile";
import { CircularProgress } from "@/components/ui/circular-progress";
import { motion, AnimatePresence } from "framer-motion";

/** Gamified unlock messages based on completion thresholds */
const getGameMessage = (completion: number): string => {
  if (completion < 30) return "Complete your profile to unlock Mentorship access.";
  if (completion < 50) return "Almost there — unlock Alumni Directory visibility.";
  if (completion < 70) return "Great progress! Unlock priority event registration.";
  if (completion < 90) return "So close — unlock recruiter visibility.";
  return "Final touches — make your profile shine!";
};

/**
 * Banner that shows profile completion status with circular progress and gamified messaging
 */
export const ProfileCompletionBanner = () => {
  const { profile } = useProfile();
  const navigate = useNavigate();

  if (!profile) return null;

  const completion = profile.profile_completion || 0;
  const complete = isProfileComplete(profile);
  const missingFields = getMissingProfileFields(profile);

  // Don't show banner if profile is complete
  if (complete) return null;

  const accentColor = completion >= 70 ? '#22c55e' : completion >= 40 ? '#3b82f6' : '#60a5fa';

  return (
    <motion.div
      className="home-card-tier1 relative md:pr-36"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ borderColor: `${accentColor}33` }}
    >
      <div className="flex items-start gap-4">
        {/* Circular progress ring */}
        <CircularProgress
          value={completion}
          size={64}
          strokeWidth={4}
          activeColor={accentColor}
          className="flex-shrink-0"
        />

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 flex-shrink-0" style={{ color: accentColor }} />
            <h4 className="font-semibold text-sm text-white">Complete Your Profile</h4>
          </div>

          {/* Gamified messaging */}
          <p className="text-xs text-white/60 leading-relaxed">
            {getGameMessage(completion)}
          </p>

          {/* Missing fields (compact chips) */}
          <AnimatePresence>
            {missingFields.length > 0 && (
              <motion.div
                className="flex flex-wrap gap-1.5"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.2 }}
              >
                {missingFields.slice(0, 3).map((field, index) => (
                  <span
                    key={index}
                    className="text-[10px] px-2 py-0.5 rounded-full border text-white/50"
                    style={{
                      borderColor: `${accentColor}30`,
                      backgroundColor: `${accentColor}0a`,
                    }}
                  >
                    {field}
                  </span>
                ))}
                {missingFields.length > 3 && (
                  <span className="text-[10px] text-white/40 self-center">
                    +{missingFields.length - 3} more
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            size="sm"
            onClick={() => navigate(`/profile/${profile.id}`)}
            className="md:hidden h-8 text-xs font-medium gap-1.5 transition-all duration-200 hover:gap-2.5"
            style={{
              backgroundColor: `${accentColor}20`,
              color: accentColor,
              borderColor: `${accentColor}30`,
              border: '1px solid',
            }}
          >
            Complete Profile
            <ArrowRight className="h-3 w-3" />
          </Button>

        </div>
      </div>

      <Button
        size="sm"
        onClick={() => navigate(`/profile/${profile.id}`)}
        className="hidden md:flex absolute bottom-4 right-4 h-8 text-xs font-medium gap-1.5 transition-all duration-200 hover:gap-2.5"
        style={{
          backgroundColor: `${accentColor}20`,
          color: accentColor,
          borderColor: `${accentColor}30`,
          border: '1px solid',
        }}
      >
        Complete Now
        <ArrowRight className="h-3 w-3" />
      </Button>
    </motion.div>
  );
};

/**
 * Small badge showing profile completion percentage
 */
export const ProfileCompletionBadge = () => {
  const { profile } = useProfile();

  if (!profile) return null;

  const completion = profile.profile_completion || 0;
  const complete = isProfileComplete(profile);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] text-sm">
      {complete ? (
        <>
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-green-500 font-medium">Profile Complete</span>
        </>
      ) : (
        <>
          <div className="h-4 w-4 rounded-full border-2 border-blue-500 flex items-center justify-center">
            <div
              className="h-2 w-2 rounded-full bg-blue-500"
              style={{ transform: `scale(${completion / 100})` }}
            />
          </div>
          <span className="text-white/60">{completion}% Complete</span>
        </>
      )}
    </div>
  );
};

/**
 * Compact sidebar variant — shown in right sidebar when the main banner scrolls out of view
 */
export const ProfileCompletionSidebar = () => {
  const { profile } = useProfile();
  const navigate = useNavigate();

  if (!profile) return null;

  const completion = profile.profile_completion || 0;
  const complete = isProfileComplete(profile);
  const missingFields = getMissingProfileFields(profile);

  if (complete) return null;

  const accentColor = completion >= 70 ? '#22c55e' : completion >= 40 ? '#3b82f6' : '#60a5fa';

  return (
    <motion.div
      className="home-card-tier1 cursor-pointer"
      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
      animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onClick={() => navigate(`/profile/${profile.id}`)}
      style={{ borderColor: `${accentColor}33`, overflow: 'hidden' }}
    >
      <div className="flex items-center gap-3">
        <CircularProgress
          value={completion}
          size={40}
          strokeWidth={3}
          activeColor={accentColor}
          className="flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 flex-shrink-0" style={{ color: accentColor }} />
            <span className="font-semibold text-xs text-white truncate">Complete Profile</span>
          </div>
          <p className="text-[10px] text-white/50 mt-0.5 truncate">
            {getGameMessage(completion)}
          </p>
        </div>
        <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-white/30" />
      </div>

      {/* Compact missing fields */}
      {missingFields.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {missingFields.slice(0, 2).map((field, i) => (
            <span
              key={i}
              className="text-[9px] px-1.5 py-0.5 rounded-full border text-white/45"
              style={{ borderColor: `${accentColor}25`, backgroundColor: `${accentColor}08` }}
            >
              {field}
            </span>
          ))}
          {missingFields.length > 2 && (
            <span className="text-[9px] text-white/35 self-center">+{missingFields.length - 2}</span>
          )}
        </div>
      )}
    </motion.div>
  );
};
