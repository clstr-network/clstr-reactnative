import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAdmin } from '@/contexts/AdminContext';
import { ADMIN_NAV_ITEMS } from '@clstr/shared/types/admin';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  GraduationCap,
  Globe,
  Users,
  Network,
  Briefcase,
  Folder,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Shield,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminLayoutProps {
  children: ReactNode;
}

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  GraduationCap,
  Globe,
  Users,
  Network,
  Briefcase,
  Folder,
  BarChart3,
  FileText,
  Settings,
};

// Loading skeleton
const LoadingSkeleton = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      <p className="text-sm text-gray-500">Verifying access...</p>
    </div>
  </div>
);

// Access denied component
const AccessDenied = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-6 max-w-md text-center p-8">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <Shield className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="text-gray-600">
          This dashboard is restricted to authorized platform administrators only.
          If you were assigned admin access, make sure you are signed in with the
          exact email that was registered in the admin settings. If you believe
          you should have access, contact the system founder.
        </p>
        <Button 
          onClick={() => navigate('/home')}
          className="bg-violet-600 hover:bg-violet-700"
        >
          Return to App
        </Button>
      </div>
    </div>
  );
};

// Sidebar component
const AdminSidebar = ({ collapsed = false }: { collapsed?: boolean }) => {
  const location = useLocation();
  const { adminUser, isFounder } = useAdmin();
  
  return (
    <div className={cn(
      "flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo/Header */}
      <div className="p-4 border-b border-gray-200">
        <Link to="/admin" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-gray-900">clstr.network</h1>
              <p className="text-xs text-gray-500">Admin Dashboard</p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-2 space-y-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const isActive = location.pathname === item.route || 
              (item.route !== '/admin' && location.pathname.startsWith(item.route));
            
            return (
              <Link
                key={item.id}
                to={item.route}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-gray-100",
                  isActive 
                    ? "bg-violet-100 text-violet-700 border border-violet-200" 
                    : "text-gray-600 hover:text-gray-900",
                  collapsed && "justify-center"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-xs bg-violet-500 text-white px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200">
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <Avatar className="w-9 h-9 border-2 border-violet-500">
            <AvatarFallback className="bg-violet-600 text-white text-sm">
              {adminUser?.name?.charAt(0) || adminUser?.email?.charAt(0)?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-admin-ink truncate">
                {adminUser?.name || adminUser?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-admin-ink-muted capitalize">
                {isFounder ? 'Founder & CEO' : adminUser?.role}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Top bar component
const AdminTopBar = ({ 
  title, 
  onMenuClick,
  showBackButton = false,
}: { 
  title: string;
  onMenuClick?: () => void;
  showBackButton?: boolean;
}) => {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-admin-bg-elevated/80 backdrop-blur-sm border-b border-admin-border px-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden text-admin-ink-muted hover:text-admin-ink"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-admin-ink-muted hover:text-admin-ink"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}
        <h1 className="text-lg font-semibold text-admin-ink">{title}</h1>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/home')}
          className="text-admin-ink-muted hover:text-admin-ink hover:bg-admin-bg-muted"
        >
          Back to App
        </Button>
        <Separator orientation="vertical" className="h-6 bg-admin-border-strong" />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="text-admin-ink-muted hover:text-admin-error hover:bg-admin-error-light"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isAdmin, isLoading } = useAdmin();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Get page title from current route
  const getPageTitle = () => {
    const currentNav = ADMIN_NAV_ITEMS.find(item => 
      location.pathname === item.route || 
      (item.route !== '/admin' && location.pathname.startsWith(item.route))
    );
    return currentNav?.label || 'Admin Dashboard';
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="hidden lg:block fixed inset-y-0 left-0 z-20">
          <AdminSidebar />
        </aside>
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64 bg-white border-gray-200">
            <AdminSidebar />
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col min-h-screen",
        !isMobile && "lg:ml-64"
      )}>
        <AdminTopBar 
          title={getPageTitle()} 
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
