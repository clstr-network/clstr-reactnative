
import { Link, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, FolderKanban, GraduationCap, MessageSquare, Users, Home, Users2, Share } from "lucide-react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  canView: boolean;
  badgeCount?: number;
}

const QuickNavigation = () => {
  const location = useLocation();
  
  // FINAL Matrix Permissions - filter nav items based on profile type
  const {
    canViewProjects,
    canViewClubs,
    canViewEvents,
    canViewEcoCampus,
    canViewAlumniDirectory,
    canBrowseMentors,
  } = useFeatureAccess();

  // Build nav items dynamically based on permissions
  const navItems = useMemo((): NavItem[] => {
    const items: NavItem[] = [
      {
        label: "Home",
        icon: <Home className="h-[18px] w-[18px]" />,
        path: "/home",
        canView: true,
      },
      {
        label: "Alumni Directory",
        icon: <Users className="h-[18px] w-[18px]" />,
        path: "/alumni-directory",
        canView: canViewAlumniDirectory,
      },
      {
        label: "Mentorship",
        icon: <GraduationCap className="h-[18px] w-[18px]" />,
        path: "/mentorship",
        canView: canBrowseMentors,
      },
      {
        label: "Events",
        icon: <Calendar className="h-[18px] w-[18px]" />,
        path: "/events",
        canView: canViewEvents,
      },
      {
        label: "Messages",
        icon: <MessageSquare className="h-[18px] w-[18px]" />,
        path: "/messaging",
        canView: true,
      },
      {
        label: "Clubs",
        icon: <Users2 className="h-[18px] w-[18px]" />,
        path: "/events?tab=clubs",
        canView: canViewClubs,
      },
      {
        label: "EcoCampus",
        icon: <Share className="h-[18px] w-[18px]" />,
        path: "/ecocampus",
        canView: canViewEcoCampus,
      },
      {
        label: "Projects",
        icon: <FolderKanban className="h-[18px] w-[18px]" />,
        path: "/projects",
        canView: canViewProjects,
      },
    ];

    return items.filter(item => item.canView);
  }, [
    canViewProjects,
    canViewClubs,
    canViewEvents,
    canViewEcoCampus,
    canViewAlumniDirectory,
    canBrowseMentors,
  ]);

  // Check if current path is active
  const isActive = (path: string) => {
    return location.pathname === path ||
      (path !== '/home' && location.pathname.startsWith(path));
  };

  return (
    <div className="alumni-card p-4 md:p-6">
      <h3 className="home-section-title font-medium text-sm text-white/70 uppercase tracking-wide mb-4">Quick Navigation</h3>
      <nav className="space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <motion.div
              key={item.label}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              <Link
                to={item.path}
                aria-current={active ? "page" : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 relative group',
                  active
                    ? 'bg-blue-500/20 text-white font-medium'
                    : 'hover:bg-white/[0.05]'
                )}
              >
                <div className={cn(
                  'flex-shrink-0 transition-colors duration-200',
                  active ? 'text-white' : 'text-white/40 group-hover:text-white/60'
                )}>
                  {item.icon}
                </div>

                <span className={cn(
                  'text-sm truncate flex-1 transition-colors duration-200',
                  active ? 'text-white' : 'text-white/50 group-hover:text-white/70'
                )}>
                  {item.label}
                </span>

                {/* Badge count */}
                {item.badgeCount != null && item.badgeCount > 0 && (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#ef4444] text-white text-[10px] font-bold px-1">
                    {item.badgeCount > 99 ? '99+' : item.badgeCount}
                  </span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>
    </div>
  );
};

export default QuickNavigation;
