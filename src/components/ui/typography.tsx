/**
 * ═══════════════════════════════════════════════════════════════
 * Typography — Reusable text primitives for the home-theme
 * ═══════════════════════════════════════════════════════════════
 *
 * Provides semantic text components that enforce the type scale
 * from design-tokens.ts so you never hard-code sizes/weights.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

/* ─── Shared props ─────────────────────────────────────────── */
interface TypographyProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

/* ─── Page Title (24px / bold / tight) ─────────────────────── */
export const PageTitle: React.FC<TypographyProps> = ({
  children,
  className,
  as: Tag = 'h1',
}) => (
  <Tag
    className={cn(
      'font-bold text-xl md:text-2xl text-white tracking-tight leading-tight',
      className
    )}
  >
    {children}
  </Tag>
);

/* ─── Section Title (16px / 700 / uppercase tracking) ──────── */
export const SectionTitle: React.FC<TypographyProps> = ({
  children,
  className,
  as: Tag = 'h3',
}) => (
  <Tag
    className={cn(
      'home-section-title font-bold text-sm md:text-base text-white tracking-[-0.01em]',
      className
    )}
  >
    {children}
  </Tag>
);

/* ─── Card Title (14–16px / 600 / white) ───────────────────── */
export const CardTitle: React.FC<TypographyProps> = ({
  children,
  className,
  as: Tag = 'h4',
}) => (
  <Tag
    className={cn(
      'home-card-title font-semibold text-sm md:text-base text-white',
      className
    )}
  >
    {children}
  </Tag>
);

/* ─── Body Text (14–15px / 400 / white/90 / relaxed) ──────── */
export const BodyText: React.FC<TypographyProps> = ({
  children,
  className,
  as: Tag = 'p',
}) => (
  <Tag
    className={cn(
      'home-body-text text-sm md:text-[15px] text-white/90 leading-relaxed',
      className
    )}
  >
    {children}
  </Tag>
);

/* ─── Meta Text (12px / 400 / white/45 — timestamps, counts) ─ */
export const MetaText: React.FC<TypographyProps> = ({
  children,
  className,
  as: Tag = 'span',
}) => (
  <Tag
    className={cn(
      'home-meta-text text-xs text-white/45',
      className
    )}
  >
    {children}
  </Tag>
);

/* ─── Label (12px / 500 / white/60 / uppercase) ───────────── */
export const Label: React.FC<TypographyProps> = ({
  children,
  className,
  as: Tag = 'span',
}) => (
  <Tag
    className={cn(
      'text-xs font-medium text-white/60 uppercase tracking-wide',
      className
    )}
  >
    {children}
  </Tag>
);

/* ─── Name (16–18px / 600 / white — user names) ───────────── */
export const UserName: React.FC<TypographyProps> = ({
  children,
  className,
  as: Tag = 'span',
}) => (
  <Tag
    className={cn(
      'font-semibold text-base md:text-lg text-white truncate',
      className
    )}
  >
    {children}
  </Tag>
);

/* ─── Subtitle (13px / 400 / white/50) ─────────────────────── */
export const Subtitle: React.FC<TypographyProps> = ({
  children,
  className,
  as: Tag = 'p',
}) => (
  <Tag
    className={cn(
      'text-[13px] text-white/50',
      className
    )}
  >
    {children}
  </Tag>
);
