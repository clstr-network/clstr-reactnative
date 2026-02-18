/**
 * InstallPrompt — PWA install banner
 *
 * Shows a dismissible bottom banner on mobile viewports (< 768px) when:
 * - The browser fires `beforeinstallprompt`
 * - The app is not already installed (standalone)
 * - The user hasn't snoozed the prompt in the last 7 days
 */

import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnimatePresence, motion } from "framer-motion";

export function InstallPrompt() {
  const { canShow, install, snooze } = usePWAInstall();
  const isMobile = useIsMobile();

  // Only show on mobile viewports
  if (!canShow || !isMobile) return null;

  return (
    <AnimatePresence>
      {canShow && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-16 left-3 right-3 z-50 md:hidden"
        >
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#141414] p-3 shadow-2xl shadow-black/60 backdrop-blur-sm">
            {/* App icon */}
            <img
              src="/icons/icon-96x96.png"
              alt="clstr app icon"
              width={48}
              height={48}
              className="rounded-lg flex-shrink-0"
            />

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                Install clstr
              </p>
              <p className="text-xs text-white/50 truncate">
                Add to your home screen for the best experience
              </p>
            </div>

            {/* Install button */}
            <Button
              size="sm"
              onClick={install}
              className="flex-shrink-0 gap-1.5 bg-white text-black hover:bg-white/90"
            >
              <Download className="h-4 w-4" />
              Install
            </Button>

            {/* Dismiss / snooze */}
            <button
              type="button"
              onClick={snooze}
              className="flex-shrink-0 p-1 rounded-full text-white/40 hover:text-white/70 transition-colors"
              aria-label="Dismiss install prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
