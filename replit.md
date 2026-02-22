# Nexus - replit.md

## Overview

Nexus is a professional networking mobile application built with Expo (React Native) and an Express backend. It features a social feed, messaging/chat, network connections, notifications, and user profiles — similar in concept to LinkedIn but with a dark, neon-accented cyberpunk aesthetic. The app uses file-based routing via expo-router with a tab-based navigation structure.

Currently, the app runs with **seed data** (in-memory mock data via React Context) on the frontend side, while the backend has a minimal Express server with PostgreSQL/Drizzle ORM configured but largely unused. The project is in an early stage where the UI shell is complete but backend API integration is not yet wired up.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Mobile App)
- **Framework**: Expo SDK 54 with React Native 0.81, React 19
- **Routing**: expo-router v6 with file-based routing and typed routes enabled
- **Navigation Structure**: Tab-based layout with 5 tabs (Feed, Network, Messages, Notifications, Profile) plus stack screens for Chat and Settings
- **State Management**: React Context (`DataProvider` in `lib/data-context.tsx`) holds all app state with seed data. TanStack React Query is installed and configured (`lib/query-client.ts`) but not actively used for data fetching yet
- **Styling**: React Native StyleSheet with a custom dark theme color system (`constants/colors.ts`). Uses Space Grotesk font family. No Tailwind or NativeWind
- **Platform Support**: Primarily targets iOS and Android with basic web support. Platform-specific adjustments (safe area insets, web top padding) are handled inline
- **Key UI Components**: GlassContainer (translucent card), Avatar (with initials and online indicator), PostCard, ConversationItem, MessageBubble, ConnectionCard, NotificationItem, SettingsRow
- **Haptics**: expo-haptics used throughout for tactile feedback on interactions
- **Keyboard Handling**: react-native-keyboard-controller with a compatibility wrapper for web

### Backend (Express Server)
- **Framework**: Express 5 running on Node.js
- **Entry Point**: `server/index.ts`, compiled with `tsx` for dev or `esbuild` for production
- **Routes**: Defined in `server/routes.ts` — currently empty, just creates an HTTP server. All routes should be prefixed with `/api`
- **Storage Layer**: `server/storage.ts` defines an `IStorage` interface with a `MemStorage` in-memory implementation. Currently only has User CRUD methods
- **CORS**: Configured to allow Replit domains and localhost origins
- **Static Serving**: In production, serves a static landing page from `server/templates/landing-page.html`

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` — currently only has a `users` table with id, username, and password fields
- **Migrations**: Output to `./migrations` directory
- **Schema Push**: Use `npm run db:push` (drizzle-kit push) to sync schema to database
- **Validation**: drizzle-zod generates Zod schemas from Drizzle table definitions
- **Note**: The database is configured but the app doesn't use it yet — frontend uses seed data instead

### Shared Code
- **Location**: `shared/` directory contains code shared between frontend and backend
- **Path Aliases**: `@/*` maps to project root, `@shared/*` maps to `./shared/*`

### Build & Deploy
- **Dev Mode**: Two processes — `expo:dev` for the Expo dev server and `server:dev` for the Express API
- **Production Build**: Custom build script (`scripts/build.js`) handles Expo static web builds. Server is bundled with esbuild
- **Environment**: Relies on Replit environment variables (`REPLIT_DEV_DOMAIN`, `DATABASE_URL`, etc.)

## External Dependencies

### Database
- **PostgreSQL**: Required via `DATABASE_URL` environment variable. Used with Drizzle ORM for schema management and queries

### Key NPM Packages
- **expo** (~54.0.27): Core mobile framework
- **expo-router** (~6.0.17): File-based navigation
- **express** (^5.0.1): Backend HTTP server
- **drizzle-orm** (^0.39.3) + **drizzle-kit**: Database ORM and migration tooling
- **@tanstack/react-query** (^5.83.0): Data fetching/caching (configured but not actively used)
- **pg** (^8.16.3): PostgreSQL client driver
- **zod** + **drizzle-zod**: Schema validation
- **react-native-reanimated**, **react-native-gesture-handler**, **react-native-screens**: Core RN navigation dependencies
- **expo-haptics**: Tactile feedback
- **expo-secure-store**: Secure credential storage (installed, not yet used)
- **@expo-google-fonts/space-grotesk**: Custom typography

### External Services
- **Replit**: Deployment platform — uses Replit-specific environment variables for domain configuration and CORS
- No third-party auth, analytics, or external APIs are currently integrated