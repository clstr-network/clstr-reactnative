# Copilot Instructions for Clstr.network

This file serves as a style guide and SEO manifest for the Clstr.network codebase. Referenced for every generation.

## SEO & HTML Semantics
- **Semantic Elements**: Always use semantic HTML5 elements: `<header>`, `<main>`, `<nav>`, `<article>`, `<section>`, and `<footer>`.
- **Images**: Ensure all images use the appropriate optimization components (e.g., `next/image` if migrating to Next.js, or optimized `<img>` tags with `loading="lazy"` in local dev) with a **required** `alt` attribute that describes the image context for accessibility and SEO.
- **Structured Data**: Implement JSON-LD structured data for every page entity (e.g., `Person` for profile, `EducationalOccupationalProgram` for mentorship).
- **Metadata**: For every page component, generate a corresponding Metadata object (or `<Helmet>` config) including a title (max 60 chars), description (150-160 chars), and Open Graph tags.

## Architecture & Performance
- **Framework Target**: The project is targeting a transition to a Next.js App Router architecture to support SSR/SSG/ISR. Code generation should align with React Server Components (RSCs) principles where applicable, minimizing client-side JavaScript for SEO-critical pages.
- **Rendering**: 
    - Landing/Marketing -> SSG (Static Site Generation)
    - Feeds/Search -> SSR (Server-Side Rendering)
    - Club/Event Profiles -> ISR (Incremental Static Regeneration)

## Data Scaffolding
- **Schema Mapping**:
    - University -> `CollegeOrUniversity` (Schema.org)
    - Mentorship -> `EducationalOccupationalProgram`
    - Student Project -> `Project` (`CreativeWork`)
    - Campus Event -> `Event`
    - Club -> `Organization`
- **Nested JSON-LD**: Favor nested patterns (e.g., `Person` -> `memberOf` -> `Organization`) over flat data.

## Content Strategy
- **Information Gain**: Focus on "Answer-First" structures, bulleted checklists, and structured summaries to serve generative AI overviews.
- **Tone**: Authoritative, student-centric, verified, and community-driven.
