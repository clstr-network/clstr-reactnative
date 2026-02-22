# Clstr - Replit Agent Guide

## Overview

Clstr is a college/university networking mobile application built with Expo (React Native) and an Express.js backend. It provides a social platform where students, alumni, and faculty can connect, share posts, message each other, discover networking opportunities, and find events. The app follows a dark-themed design language with a gold/amber primary accent color.

The project uses a monorepo-style structure with the mobile app (Expo/React Native), a Node.js/Express API server, and shared schema definitions all in one codebase. Currently, the app uses mock data for the UI while the backend infrastructure (Express + Drizzle ORM + PostgreSQL) is set up and ready for real data integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Mobile App)
- **Framework:** Expo SDK 54 with React Native 0.81, using the new architecture (`newArchEnabled: true`)
- **Routing:** Expo Router v6 with file-based routing. Tab navigation lives in `app/(tabs)/` with five tabs: Home (feed), Network, Messages, Events, and More
- **State Management:** TanStack React Query for server state; local React state for UI state
- **Fonts:** Inter font family loaded via `@expo-google-fonts/inter` (400, 500, 600, 700 weights)
- **Styling:** React Native StyleSheet API with a centralized color/design token system in `constants/colors.ts`. Dark theme only (black surfaces with tiered elevation). No Tailwind on the native side.
- **Key UI Libraries:** 
  - `react-native-gesture-handler` for gestures
  - `react-native-reanimated` for animations
  - `react-native-keyboard-controller` for keyboard handling
  - `expo-haptics` for haptic feedback
  - `expo-blur` and `expo-glass-effect` for visual effects
  - `@expo/vector-icons` (Ionicons) for icons

### Design System
- **Color Architecture:** Tiered surface system (base #000000 → tier3 → tier2 → tier1 → elevated → overlay) with semantic colors for borders and text
- **Primary Accent:** Gold/amber (#E5A100) 
- **Badge Variants:** Color-coded by user type (Student, Alumni, Faculty)
- **Category Colors:** Used for event categories
- All design tokens are centralized in `constants/colors.ts`

### Backend (API Server)
- **Framework:** Express.js v5 running on Node.js
- **Entry Point:** `server/index.ts` — sets up CORS, JSON parsing, and serves static files in production
- **Routes:** Defined in `server/routes.ts` — currently minimal, prefixed with `/api`
- **Storage Layer:** `server/storage.ts` implements an `IStorage` interface with `MemStorage` (in-memory) as the current implementation. This is designed to be swapped with a database-backed implementation.
- **Build:** Server is bundled with esbuild for production (`server:build` script)

### Database
- **ORM:** Drizzle ORM with PostgreSQL dialect
- **Schema:** Defined in `shared/schema.ts` — currently has a `users` table with id, username, and password fields
- **Validation:** Zod schemas generated from Drizzle schemas via `drizzle-zod`
- **Migrations:** Output to `./migrations/` directory
- **Config:** `drizzle.config.ts` reads `DATABASE_URL` environment variable
- **Current State:** Schema is minimal. The app currently uses mock data (`lib/mock-data.ts`) for posts, users, conversations, messages, and events. The database schema needs to be expanded to support these entities.

### Shared Code
- `shared/schema.ts` contains Drizzle table definitions and Zod schemas shared between frontend and backend
- Path aliases: `@/*` maps to root, `@shared/*` maps to `./shared/*`

### API Communication
- `lib/query-client.ts` provides `apiRequest()` helper and query client configuration
- Uses `EXPO_PUBLIC_DOMAIN` environment variable to construct API URLs
- Supports credentials (cookies) for authentication

### Development Setup
- **Dev workflow:** Run `expo:dev` for the mobile app and `server:dev` for the backend simultaneously
- **Production:** Static export build via custom `scripts/build.js`, server built with esbuild
- **Proxy:** Uses `http-proxy-middleware` to proxy API requests during development
- The Replit dev domain is used for both the Expo dev server and API server communication

## External Dependencies

### Database
- **PostgreSQL** via `DATABASE_URL` environment variable — required for Drizzle ORM
- Currently using in-memory storage (`MemStorage`), but Postgres is configured and ready

### Key NPM Packages
- **expo** (~54.0.27) — Core mobile framework
- **express** (^5.0.1) — Backend API server
- **drizzle-orm** (^0.39.3) + **drizzle-kit** — Database ORM and migration tooling
- **@tanstack/react-query** (^5.83.0) — Data fetching and caching
- **zod** + **drizzle-zod** — Schema validation
- **pg** (^8.16.3) — PostgreSQL client
- **date-fns** — Date formatting utilities
- **patch-package** — Used for patching dependencies (runs on postinstall)

### Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (required for database operations)
- `EXPO_PUBLIC_DOMAIN` — Domain for API communication from the mobile app
- `REPLIT_DEV_DOMAIN` — Replit development domain (auto-set by Replit)
- `REPLIT_DOMAINS` — Comma-separated list of Replit domains for CORS
- `REPLIT_INTERNAL_APP_DOMAIN` — Used for production deployment domain detection