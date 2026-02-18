/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Building2, 
  Award,
  Crown,
  Star,
  Shield,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Lowercase keys for internal consistency
export type UserType = 'student' | 'alumni' | 'faculty' | 'club' | 'organization' | 'principal' | 'dean';

// Helper to normalize role from DB (capitalized) to lowercase UserType
export const normalizeUserType = (role?: string | null): UserType => {
  if (!role) return 'student';
  const normalized = role.toLowerCase();
  if (
    normalized === 'student' ||
    normalized === 'alumni' ||
    normalized === 'faculty' ||
    normalized === 'club' ||
    normalized === 'organization' ||
    normalized === 'principal' ||
    normalized === 'dean'
  ) {
    return normalized as UserType;
  }
  return 'student'; // Default fallback
};

interface UserBadgeProps {
  userType?: UserType | string | null;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const userTypeConfig = {
  student: {
    label: 'Student',
    icon: BookOpen,
    colors: 'bg-white/[0.04] text-cyan-300 border-transparent',
    gradient: 'from-blue-500 to-indigo-600',
    description: 'Currently pursuing education'
  },
  alumni: {
    label: 'Alumni',
    icon: GraduationCap,
    colors: 'bg-white/[0.04] text-fuchsia-300 border-transparent',
    gradient: 'from-purple-500 to-violet-600',
    description: 'Graduate of the institution'
  },
  faculty: {
    label: 'Faculty',
    icon: Crown,
    colors: 'bg-white/[0.04] text-emerald-300 border-transparent',
    gradient: 'from-emerald-500 to-teal-600',
    description: 'Teaching staff member'
  },
  club: {
    label: 'Club Member',
    icon: Users,
    colors: 'bg-white/[0.04] text-amber-300 border-transparent',
    gradient: 'from-orange-500 to-red-500',
    description: 'Active in student organizations'
  },
  organization: {
    label: 'Organization',
    icon: Building2,
    colors: 'bg-white/[0.04] text-sky-300 border-transparent',
    gradient: 'from-slate-500 to-gray-600',
    description: 'Institutional organization'
  },
  principal: {
    label: 'Principal',
    icon: Shield,
    colors: 'bg-white/[0.04] text-rose-300 border-transparent',
    gradient: 'from-rose-500 to-pink-600',
    description: 'Institution head'
  },
  dean: {
    label: 'Dean',
    icon: Award,
    colors: 'bg-white/[0.04] text-lime-300 border-transparent',
    gradient: 'from-lime-500 to-emerald-600',
    description: 'Academic leadership'
  }
};

const UserBadge: React.FC<UserBadgeProps> = ({ 
  userType, 
  size = 'md', 
  showIcon = false, 
  className 
}) => {
  // Normalize the userType to handle both DB format (capitalized) and lowercase
  const normalizedType = normalizeUserType(userType);
  const config = userTypeConfig[normalizedType];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5'
  };
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <Badge 
      className={cn(
        config.colors,
        sizeClasses[size],
        'font-medium transition-colors duration-150',
        className
      )}
      title={config.description}
    >
      {showIcon && (
        <Icon className={cn(iconSizes[size], 'mr-1.5')} />
      )}
      {config.label}
    </Badge>
  );
};

export { UserBadge, userTypeConfig };