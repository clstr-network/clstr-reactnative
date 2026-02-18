/**
 * ═══════════════════════════════════════════════════════════════
 * CircularProgress — SVG-based animated circular progress
 * ═══════════════════════════════════════════════════════════════
 *
 * Used in ProfileCompletionBanner for a gamified feel.
 * Animated stroke via framer-motion.
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CircularProgressProps {
  /** 0–100 */
  value: number;
  /** px size of the circle */
  size?: number;
  /** px stroke width */
  strokeWidth?: number;
  /** Track (bg) color */
  trackColor?: string;
  /** Active stroke color */
  activeColor?: string;
  /** Show percentage text in the center */
  showLabel?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 72,
  strokeWidth = 5,
  trackColor = 'rgba(255,255,255,0.08)',
  activeColor = '#eab308',
  showLabel = true,
  className,
  children,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: circumference - (clampedValue / 100) * circumference,
          }}
          transition={{
            duration: 1.2,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.2,
          }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children ?? (
          showLabel && (
            <motion.span
              className="text-sm font-bold text-white"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.4 }}
            >
              {clampedValue}%
            </motion.span>
          )
        )}
      </div>
    </div>
  );
};
