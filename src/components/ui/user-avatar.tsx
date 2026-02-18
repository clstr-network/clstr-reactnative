import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { UserType, userTypeConfig, normalizeUserType } from './user-badge';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  userType?: UserType | string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTypeBorder?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  userType,
  size = 'md',
  className,
  showTypeBorder = true
}) => {
  // Normalize the userType to handle both DB format (capitalized) and lowercase
  const normalizedType = normalizeUserType(userType);

  const getInitials = (fullName: string): string => {
    return fullName
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  };

  const borderClasses = normalizedType && showTypeBorder ? {
    student: 'ring-2 ring-blue-200 ring-offset-2',
    alumni: 'ring-2 ring-purple-200 ring-offset-2',
    faculty: 'ring-2 ring-emerald-200 ring-offset-2',
    club: 'ring-2 ring-orange-200 ring-offset-2',
    organization: 'ring-2 ring-slate-200 ring-offset-2'
  }[normalizedType] : '';

  const gradientClasses = normalizedType ? {
    student: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    alumni: 'bg-gradient-to-br from-purple-500 to-violet-600',
    faculty: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    club: 'bg-gradient-to-br from-orange-500 to-red-500',
    organization: 'bg-gradient-to-br from-slate-500 to-gray-600'
  }[normalizedType] : 'bg-gradient-to-br from-white/10 to-white/[0.06]';

  return (
    <Avatar 
      className={cn(
        sizeClasses[size],
        borderClasses,
        'transition-all duration-200',
        className
      )}
    >
      <AvatarImage src={src || undefined} alt={name || 'User avatar'} />
      <AvatarFallback 
        className={cn(
          gradientClasses,
          'text-white font-semibold shadow-inner'
        )}
      >
        {name ? getInitials(name) : '??'}
      </AvatarFallback>
    </Avatar>
  );
};

export { UserAvatar };