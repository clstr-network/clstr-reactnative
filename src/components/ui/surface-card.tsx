/**
 * ═══════════════════════════════════════════════════════════════
 * SurfaceCard — Tier-based card component
 * ═══════════════════════════════════════════════════════════════
 *
 * Replaces raw div + className patterns with a declarative API.
 * Respects the home-theme card tier system.
 */

import * as React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { cardHoverVariants } from '@/lib/animations';

export type SurfaceTier = 1 | 2 | 3;

interface SurfaceCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  /** Visual tier: 1 (strongest), 2 (neutral), 3 (quietest) */
  tier?: SurfaceTier;
  /** Enable subtle hover lift animation */
  hoverable?: boolean;
  /** Enable press-down feedback on click */
  pressable?: boolean;
  /** Remove default padding */
  noPadding?: boolean;
  /** Additional class names */
  className?: string;
  children: React.ReactNode;
}

const tierClasses: Record<SurfaceTier, string> = {
  1: 'home-card-tier1',
  2: 'home-card-tier2',
  3: 'home-card-tier3',
};

const paddingClasses: Record<SurfaceTier, string> = {
  1: 'p-4',
  2: 'p-4 md:p-6',
  3: 'p-4 md:p-6',
};

/**
 * SurfaceCard — A motion-enhanced card that automatically picks up
 * the correct tier styling from the home-theme design system.
 *
 * @example
 * <SurfaceCard tier={2} hoverable>
 *   <PostContent />
 * </SurfaceCard>
 */
export const SurfaceCard = React.forwardRef<HTMLDivElement, SurfaceCardProps>(
  (
    {
      tier = 2,
      hoverable = false,
      pressable = false,
      noPadding = false,
      className,
      children,
      ...motionProps
    },
    ref
  ) => {
    const motionVariants = hoverable || pressable ? cardHoverVariants : undefined;
    const whileHover = hoverable ? 'hover' : undefined;
    const whileTap = pressable ? 'tap' : undefined;

    return (
      <motion.div
        ref={ref}
        className={cn(
          tierClasses[tier],
          !noPadding && paddingClasses[tier],
          className
        )}
        variants={motionVariants}
        initial="rest"
        whileHover={whileHover}
        whileTap={whileTap}
        {...motionProps}
      >
        {children}
      </motion.div>
    );
  }
);

SurfaceCard.displayName = 'SurfaceCard';

/**
 * SurfaceCardHeader — Optional header row with title and action slot
 */
interface SurfaceCardHeaderProps {
  title: string;
  action?: React.ReactNode;
  className?: string;
}

export const SurfaceCardHeader: React.FC<SurfaceCardHeaderProps> = ({
  title,
  action,
  className,
}) => (
  <div className={cn('flex items-center justify-between mb-4', className)}>
    <h3 className="home-section-title font-medium text-sm text-white/70 uppercase tracking-wide">
      {title}
    </h3>
    {action}
  </div>
);

/**
 * SurfaceCardDivider — Thin horizontal rule in card context
 */
export const SurfaceCardDivider: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('border-t border-white/[0.07] my-3', className)} />
);
