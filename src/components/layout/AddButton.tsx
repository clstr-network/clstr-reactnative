import { useState } from 'react';
import { Plus, X, FileText, Briefcase, Users, Calendar, UserPlus, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ActionOption {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export const AddButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { 
    canPostInFeed, 
    canCreateProjects, 
    canOfferMentorship,
    canPostInClubs,
    canCreateEvents,
    isStudent,
    isFaculty,
    isAlumni,
    isClubLead 
  } = useRolePermissions();

  // Build options based on permissions
  const options: ActionOption[] = [];

  // All roles can create posts
  if (canPostInFeed) {
    options.push({
      label: 'Create Post',
      icon: FileText,
      action: () => navigate('/home')
    });
  }

  // All users can create projects
  if (canCreateProjects) {
    options.push({
      label: 'Create Project',
      icon: Briefcase,
      action: () => navigate('/projects')
    });
  }

  // Alumni can offer mentorship (toggle via profile)
  if (canOfferMentorship && isAlumni) {
    options.push({
      label: 'Manage Mentorship',
      icon: Users,
      action: () => navigate('/profile')
    });
  }

  // Club Leads can post in clubs
  if (canPostInClubs && isClubLead) {
    options.push({
      label: 'Create Club Post',
      icon: Users,
      action: () => navigate('/clubs')
    });
  }

  // Club Leads can create events
  if (canCreateEvents && isClubLead) {
    options.push({
      label: 'Create Event',
      icon: Calendar,
      action: () => navigate('/events')
    });
  }

  if (options.length === 0) {
    return null; // Don't show button if no actions available
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action Menu */}
      <div
        className={cn(
          "absolute bottom-16 right-0 flex flex-col gap-2 transition-all duration-300",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        {options.map((option) => {
          const IconComponent = option.icon;
          return (
            <Button
              key={option.label}
              variant="secondary"
              size="sm"
              onClick={() => {
                option.action();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 shadow-lg whitespace-nowrap"
            >
              <IconComponent className="h-4 w-4" />
              {option.label}
            </Button>
          );
        })}
      </div>

      {/* Main FAB */}
      <Button
        size="lg"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-full shadow-2xl transition-all duration-300",
          isOpen && "rotate-45"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>
    </div>
  );
};
