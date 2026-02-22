# CLSTR - Campus Social Network

## Overview

CLSTR is a campus/alumni social networking mobile application built with Expo (React Native) and an Express.js backend. The app provides a social feed, networking/connections, messaging, events, and user profiles — similar to a university-focused LinkedIn. The project targets iOS, Android, and web platforms through Expo's cross-platform framework.

Currently, the app uses **local mock data** managed through a React Context (`DataProvider`) with AsyncStorage persistence. The Express backend exists but has minimal routes — the server is scaffolded and ready for real API endpoints but most data logic lives client-side. A PostgreSQL database schema is defined via Drizzle ORM but is not yet wired into the application's data flow.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture (`newArchEnabled: true`)
- **Routing**: Expo Router v6 with file-based routing. The app uses a tab layout (`app/(tabs)/`) with 5 tabs: Feed, Network, Messages, Events, Profile. Detail screens live at `app/chat/[id].tsx`, `app/post/[id].tsx`, `app/event/[id].tsx`. Modal screens include `app/new-post.tsx` and `app/settings.tsx`.
- **State Management**: React Context (`lib/data-context.tsx`) serves as the primary data layer, providing mock users, posts, connections, conversations, messages, and events. Data persists locally via `@react-native-async-storage/async-storage`.
- **Styling**: Dark theme by default (`userInterfaceStyle: "dark"`). Colors are centralized in `constants/colors.ts` with a comprehensive dark palette. All styling uses React Native `StyleSheet`.
- **Fonts**: Inter font family (400, 500, 600, 700 weights) loaded via `@expo-google-fonts/inter`.
- **Animations/Haptics**: `expo-haptics` for tactile feedback, `react-native-reanimated` available for animations.
- **Key UI Libraries**: `expo-blur`, `expo-linear-gradient`, `expo-glass-effect`, `react-native-gesture-handler`, `react-native-keyboard-controller`, `react-native-safe-area-context`, `react-native-screens`.
- **Data Fetching**: `@tanstack/react-query` is configured with a query client (`lib/query-client.ts`) that can make authenticated API requests to the Express backend, but currently the app runs on local mock data instead.

### Backend (Express.js)

- **Runtime**: Node.js with Express v5, TypeScript compiled via `tsx` (dev) or `esbuild` (prod).
- **Server Entry**: `server/index.ts` sets up CORS (supporting Replit domains and localhost), JSON parsing, and serves static web builds in production.
- **Routes**: `server/routes.ts` is mostly empty — just creates an HTTP server. API routes should be prefixed with `/api`.
- **Storage**: `server/storage.ts` defines an `IStorage` interface with user CRUD methods. Currently uses `MemStorage` (in-memory Map). This is designed to be swapped for a database-backed implementation.
- **Build Scripts**: `scripts/build.js` handles Expo static web builds for production deployment.

### Database (PostgreSQL + Drizzle ORM)

- **Schema**: Defined in `shared/schema.ts` using Drizzle ORM's `pgTable`. Currently only has a `users` table with `id` (UUID), `username`, and `password` fields.
- **Validation**: Uses `drizzle-zod` to generate Zod schemas from the Drizzle table definitions (`insertUserSchema`).
- **Migrations**: Drizzle Kit configured in `drizzle.config.ts`, migrations output to `./migrations`. Push schema with `npm run db:push`.
- **Connection**: Requires `DATABASE_URL` environment variable for PostgreSQL connection.
- **Current State**: The schema is minimal and doesn't yet reflect the app's data model (posts, events, connections, conversations, messages). The `data-context.tsx` has rich TypeScript interfaces that should eventually be mirrored in the database schema.

### Shared Code

- **Path Aliases**: `@/*` maps to project root, `@shared/*` maps to `./shared/` — enables importing shared types/schema from both frontend and backend.
- **Schema as Single Source of Truth**: `shared/schema.ts` is meant to be the canonical definition for data types used by both server and client.

### Development Workflow

- **Dev Mode**: Run `npm run expo:dev` for the Expo dev server and `npm run server:dev` for the Express backend simultaneously.
- **Production**: `npm run expo:static:build` builds the web app, `npm run server:build` bundles the server, `npm run server:prod` runs the production server which serves the static web build.
- **Database**: `npm run db:push` pushes schema changes to PostgreSQL.

### Key Architectural Gaps (Known)

1. The frontend data model (posts, events, connections, conversations, messages) exists only in the React Context with mock data — no API endpoints or database tables exist for these yet.
2. Authentication is not implemented — `currentUser` is hardcoded mock data in the data context.
3. The server has no real API routes beyond the scaffold.
4. The database schema only has a `users` table — needs expansion to match the app's feature set.

## External Dependencies

- **PostgreSQL**: Database (connected via `DATABASE_URL` env var), managed through Drizzle ORM
- **Expo Services**: Build and development toolchain (Expo SDK 54)
- **AsyncStorage**: Local device storage for persisting mock data client-side
- **Replit Environment**: The app is configured for Replit deployment, using `REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`, and `REPLIT_INTERNAL_APP_DOMAIN` environment variables for CORS and URL configuration
- **No external auth provider yet**: The audit document mentions Supabase was used in a prior web version, but the current mobile codebase has no auth integration
- **No push notifications**: Not yet integrated
- **No file/image upload service**: Image picker is installed (`expo-image-picker`) but no upload backend exists