/**
 * ═══════════════════════════════════════════════════════════════
 * CLSTR ANIMATION SYSTEM — Reusable Framer Motion Variants
 * ═══════════════════════════════════════════════════════════════
 *
 * Centralized motion configs for consistent micro-interactions.
 * Import individual variants as needed.
 */

import type { Variants, Transition } from 'framer-motion';

// ─── Common Transitions ──────────────────────────────────────

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
  mass: 0.8,
};

export const snappySpring: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 0.5,
};

export const gentleSpring: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 20,
  mass: 1,
};

export const smoothEase: Transition = {
  duration: 0.3,
  ease: [0.16, 1, 0.3, 1],
};

// ─── Feed Item Variants ──────────────────────────────────────

/** Staggered feed cards sliding up from below */
export const feedItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: Math.min(i, 5) * 0.06,
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: { duration: 0.2 },
  },
};

/** Container that orchestrates staggered children */
export const feedContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

// ─── Card Interactions ───────────────────────────────────────

/** Subtle lift on hover (non-mobile) */
export const cardHoverVariants: Variants = {
  rest: {
    y: 0,
    transition: smoothEase,
  },
  hover: {
    y: -2,
    transition: snappySpring,
  },
  tap: {
    scale: 0.99,
    transition: { duration: 0.1 },
  },
};

// ─── Button / Icon Interactions ──────────────────────────────

/** Reaction button — heartbeat pulse */
export const reactionPulse: Variants = {
  rest: { scale: 1 },
  tap: {
    scale: [1, 1.3, 0.95, 1.1, 1],
    transition: { duration: 0.4, times: [0, 0.2, 0.4, 0.7, 1] },
  },
};

/** Icon press — snappy micro scale */
export const iconPress: Variants = {
  rest: { scale: 1, rotate: 0 },
  tap: {
    scale: 0.85,
    transition: { duration: 0.1 },
  },
  hover: {
    scale: 1.1,
    transition: snappySpring,
  },
};

/** Bookmark toggle — flip animation */
export const bookmarkFlip: Variants = {
  rest: { rotateY: 0, scale: 1 },
  active: {
    rotateY: [0, 180, 360],
    scale: [1, 1.2, 1],
    transition: { duration: 0.5, ease: 'easeInOut' },
  },
};

// ─── Expand / Collapse ───────────────────────────────────────

/** Smooth height expand for comments, details */
export const expandVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeInOut' },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

// ─── Slide Variants ──────────────────────────────────────────

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

export const slideInFromLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

export const slideInFromRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

// ─── Scale / Pop ─────────────────────────────────────────────

/** Pop-in for toasts, badges, new items */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: snappySpring,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.15 },
  },
};

/** Skeleton shimmer (used with AnimatePresence) */
export const skeletonFade: Variants = {
  visible: { opacity: 1 },
  exit: {
    opacity: 0,
    transition: { duration: 0.3 },
  },
};

// ─── Progress ────────────────────────────────────────────────

/** Circular progress fill animation */
export const progressFill = {
  initial: { pathLength: 0 },
  animate: (value: number) => ({
    pathLength: value / 100,
    transition: {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      delay: 0.3,
    },
  }),
};

/** Counter number animation */
export const counterVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.8 },
  },
};

// ─── Page Transitions ────────────────────────────────────────

export const pageTransition: Variants = {
  initial: { opacity: 0 },
  enter: {
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

// ─── Tooltip / Popover ───────────────────────────────────────

export const tooltipVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 4,
    transition: { duration: 0.1 },
  },
};

// ─── Utility: stagger delay helper ──────────────────────────

export const staggerDelay = (index: number, base = 0.06, max = 5) =>
  Math.min(index, max) * base;
