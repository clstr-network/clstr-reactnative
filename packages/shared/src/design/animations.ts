/**
 * ═══════════════════════════════════════════════════════════════
 * CLSTR ANIMATION SYSTEM — Reanimated Equivalents
 * ═══════════════════════════════════════════════════════════════
 *
 * Cross-platform animation configs using react-native-reanimated.
 * Maps 1:1 to the Framer Motion variants in src/lib/animations.ts.
 *
 * Usage:
 *   import { animations } from '@shared/design/animations';
 *   <Animated.View entering={animations.slideUp.entering} />
 */
import {
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  type WithTimingConfig,
  type WithSpringConfig,
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideInDown,
  SlideInLeft,
  SlideInRight,
  ZoomIn,
  ZoomOut,
  FadeInUp,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';

// ─── Spring Configs ──────────────────────────────────────────

export const springConfig: WithSpringConfig = {
  stiffness: 300,
  damping: 25,
  mass: 0.8,
};

export const snappySpringConfig: WithSpringConfig = {
  stiffness: 400,
  damping: 30,
  mass: 0.5,
};

export const gentleSpringConfig: WithSpringConfig = {
  stiffness: 200,
  damping: 20,
  mass: 1,
};

// ─── Timing Configs ──────────────────────────────────────────

export const smoothEaseConfig: WithTimingConfig = {
  duration: 300,
  easing: Easing.bezier(0.16, 1, 0.3, 1),
};

export const fastConfig: WithTimingConfig = {
  duration: 150,
  easing: Easing.ease,
};

// ─── Entering / Exiting Animations ──────────────────────────

export const animations = {
  // Feed items — fade up with stagger
  feedItem: {
    entering: (index: number) =>
      FadeInUp
        .delay(Math.min(index, 5) * 60)
        .duration(400)
        .easing(Easing.bezier(0.16, 1, 0.3, 1) as unknown as (t: number) => number),
    exiting: FadeOut.duration(200),
  },

  // Card hover simulation — spring press on tap
  cardPress: {
    entering: FadeIn.duration(200),
    exiting: FadeOut.duration(150),
  },

  // Slide variants
  slideUp: {
    entering: SlideInUp.duration(300).easing(Easing.bezier(0.16, 1, 0.3, 1) as unknown as (t: number) => number),
    exiting: FadeOut.duration(200),
  },
  slideDown: {
    entering: SlideInDown.duration(300).easing(Easing.bezier(0.16, 1, 0.3, 1) as unknown as (t: number) => number),
    exiting: FadeOut.duration(200),
  },
  slideInFromLeft: {
    entering: SlideInLeft.duration(300).easing(Easing.bezier(0.16, 1, 0.3, 1) as unknown as (t: number) => number),
    exiting: FadeOut.duration(200),
  },
  slideInFromRight: {
    entering: SlideInRight.duration(300).easing(Easing.bezier(0.16, 1, 0.3, 1) as unknown as (t: number) => number),
    exiting: FadeOut.duration(200),
  },

  // Pop in — for toasts, badges, new items
  popIn: {
    entering: ZoomIn.springify().stiffness(400).damping(30),
    exiting: ZoomOut.duration(150),
  },

  // Fade
  fade: {
    entering: FadeIn.duration(300),
    exiting: FadeOut.duration(200),
  },

  // Page transition
  pageTransition: {
    entering: FadeIn.duration(300).easing(Easing.out(Easing.ease) as unknown as (t: number) => number),
    exiting: FadeOut.duration(200).easing(Easing.in(Easing.ease) as unknown as (t: number) => number),
  },

  // Tooltip / popover
  tooltip: {
    entering: FadeIn.duration(150).easing(Easing.out(Easing.ease) as unknown as (t: number) => number),
    exiting: FadeOut.duration(100),
  },

  // Skeleton shimmer fade out
  skeletonFade: {
    exiting: FadeOut.duration(300),
  },

  // Layout animation for expand/collapse
  layoutSpring: Layout.springify().stiffness(300).damping(25),
} as const;

// ─── Imperative Animation Helpers ────────────────────────────

/** Create a spring animation to a target value */
export const springTo = (toValue: number, config?: WithSpringConfig) =>
  withSpring(toValue, { ...springConfig, ...config } as WithSpringConfig);

/** Create a timing animation to a target value */
export const timingTo = (toValue: number, config?: WithTimingConfig) =>
  withTiming(toValue, { ...smoothEaseConfig, ...config });

/** Staggered delay helper */
export const staggerDelay = (index: number, base = 60, max = 5) =>
  Math.min(index, max) * base;

/** Reaction pulse — heartbeat scale sequence */
export const reactionPulseSequence = () =>
  withSequence(
    withSpring(1.3, snappySpringConfig),
    withSpring(0.95, snappySpringConfig),
    withSpring(1.1, snappySpringConfig),
    withSpring(1, snappySpringConfig),
  );

/** Bookmark flip — scale bounce */
export const bookmarkBounce = () =>
  withSequence(
    withSpring(1.2, snappySpringConfig),
    withSpring(1, springConfig),
  );
