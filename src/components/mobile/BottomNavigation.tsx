
import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Calendar, 
  FolderKanban, 
  GraduationCap, 
  Home, 
  Leaf, 
  MessageSquare, 
  MoreHorizontal, 
  Users, 
  X
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

const BottomNavigation = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  
  // Get all feature permissions and hidden nav items from FINAL matrix
  const { 
    canViewProjects,
    canViewEvents,
    canViewEcoCampus,
    canBrowseMentors, 
    hiddenNavItems 
  } = useFeatureAccess();

  useEffect(() => {
    setActiveTab(location.pathname);
  }, [location]);

  const isActive = (path: string) => {
    if (path === '/home' && (activeTab === '/home' || activeTab === '/feed')) {
      return true;
    }
    return activeTab === path || activeTab.startsWith(path + '/');
  };

  // Primary nav items shown directly in bottom bar (max 5 for usability)
  // Filter based on hiddenNavItems from FINAL matrix
  const allPrimaryNavItems = [
    { icon: Home, label: 'Home', path: '/home', navKey: null }, // always visible
    { icon: Users, label: 'Network', path: '/network', navKey: null }, // always visible
    { icon: MessageSquare, label: 'Messages', path: '/messaging', navKey: null }, // always visible
    { icon: Calendar, label: 'Events', path: '/events', navKey: 'events' },
  ];
  
  // Filter primary nav items by hiddenNavItems
  const primaryNavItems = allPrimaryNavItems.filter(item => {
    if (!item.navKey) return true;
    return !hiddenNavItems.includes(item.navKey);
  });

  // Filter secondary nav items based on FINAL matrix permissions
  const secondaryNavItems = useMemo(() => {
    // Define items inside useMemo to include permission values in closure
    const items = [
      { icon: FolderKanban, label: 'Projects', path: '/projects', canView: canViewProjects, navKey: 'projects' },
      { icon: GraduationCap, label: 'Mentorship', path: '/mentorship', canView: canBrowseMentors, navKey: 'mentorship' },
      { icon: Leaf, label: 'EcoCampus', path: '/ecocampus', canView: canViewEcoCampus, navKey: 'ecocampus' },
    ];
    
    return items.filter(item => {
      // Check both the direct permission AND hiddenNavItems
      if (!item.canView) return false;
      if (hiddenNavItems.includes(item.navKey)) return false;
      return true;
    });
  }, [canBrowseMentors, canViewProjects, canViewEcoCampus, hiddenNavItems]);

  // Check if any secondary item is active (to highlight "More" button)
  const isSecondaryActive = secondaryNavItems.some(item => isActive(item.path));

  const handleNavClick = () => {
    setIsMoreOpen(false);
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 w-full bg-[#000000] border-t border-white/10 z-50 md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex justify-around items-center h-16">
        {primaryNavItems.map((item) => {
          const isItemActive = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full touch-target ${
                isItemActive 
                  ? 'text-white' 
                  : 'text-white/40'
              }`}
              aria-label={item.label}
              aria-current={isItemActive ? 'page' : undefined}
            >
              <item.icon className={`h-6 w-6 ${
                isItemActive ? 'text-white' : 'text-white/40'
              }`} />
              <span className={`text-xs mt-1 ${
                isItemActive ? 'font-medium text-white' : 'text-white/40'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More Menu */}
        <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={`flex flex-col items-center justify-center w-full h-full touch-target ${
                isSecondaryActive 
                  ? 'text-white' 
                  : 'text-white/40'
              }`}
              aria-label="More navigation options"
            >
              <MoreHorizontal className={`h-6 w-6 ${
                isSecondaryActive ? 'text-white' : 'text-white/40'
              }`} />
              <span className={`text-xs mt-1 ${
                isSecondaryActive ? 'font-medium text-white' : 'text-white/40'
              }`}>
                More
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-xl bg-[#000000] border-white/10 text-white">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-white">More</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-4 pb-6">
              {secondaryNavItems.map((item) => {
                const isItemActive = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleNavClick}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl transition-colors ${
                      isItemActive 
                        ? 'bg-white/[0.10] text-white border border-white/15' 
                        : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08] border border-white/10'
                    }`}
                    aria-label={item.label}
                    aria-current={isItemActive ? 'page' : undefined}
                  >
                    <item.icon className={`h-7 w-7 mb-2 ${
                      isItemActive ? 'text-white' : 'text-white/50'
                    }`} />
                    <span className={`text-sm ${
                      isItemActive ? 'font-medium text-white' : 'text-white/60'
                    }`}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default BottomNavigation;

