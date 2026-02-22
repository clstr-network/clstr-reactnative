# replit.md

## Overview

**clstr** is a college/alumni networking mobile application built with Expo (React Native) and an Express backend. It enables students and alumni to connect, share posts, attend events, and message each other within their college community. The app features authentication with onboarding, a social feed, network/people discovery, events listing, direct messaging, and user profiles.

Currently the app runs primarily on mock data (generated client-side) with local AsyncStorage-based auth. The backend server and database schema exist but are mostly scaffolded — API routes and real data persistence are not yet fully implemented.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, targeting iOS, Android, and Web
- **Routing**: expo-router with file-based routing. The app uses nested layouts:
  - `app/_layout.tsx` — Root layout with providers (QueryClient, Auth, GestureHandler, Keyboard)
  - `app/(auth)/` — Auth flow: login, signup, onboarding screens
  - `app/(main)/` — Authenticated app: tabs, chat, search, settings, post detail
  - `app/(main)/(tabs)/` — Bottom tab navigation: Home (feed), Network, Events, Messages, Profile
- **State Management**: React Query (`@tanstack/react-query`) for server state, React context for auth state
- **Auth**: Client-side auth context (`lib/auth-context.tsx`) using AsyncStorage for persistence. Login/signup currently stores user profile locally without real server validation. Onboarding collects profile info (name, department, graduation year, role).
- **Styling**: StyleSheet-based with a centralized dark theme color system (`constants/colors.ts`). The app uses a fully dark UI (black background, indigo primary color #6366F1).
- **Fonts**: Inter font family (400, 500, 600, 700 weights) via `@expo-google-fonts/inter`
- **Data**: Currently uses mock data generators in `lib/mock-data.ts` for posts, people, events, conversations, and messages. The `lib/query-client.ts` has helpers (`apiRequest`, `getQueryFn`) ready for connecting to the Express API.
- **Key UI Libraries**: expo-haptics, expo-blur, expo-glass-effect, expo-image, react-native-reanimated, react-native-gesture-handler, react-native-keyboard-controller

### Backend (Express)

- **Framework**: Express 5 running on Node.js
- **Entry point**: `server/index.ts` — sets up CORS (supporting Replit domains and localhost), JSON parsing, and serves static builds in production
- **Routes**: `server/routes.ts` — currently empty scaffold, all routes should be prefixed with `/api`
- **Storage**: `server/storage.ts` — defines an `IStorage` interface with user CRUD methods. Currently uses `MemStorage` (in-memory Map). Ready to be swapped for database-backed storage.
- **Static serving**: In production, serves the Expo web static build from `dist/` directory
- **Build**: Server is bundled with esbuild to `server_dist/` for production

### Database

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: `shared/schema.ts` — currently defines a single `users` table with `id` (UUID), `username`, and `password` fields. Uses `drizzle-zod` for insert schema validation.
- **Config**: `drizzle.config.ts` — reads `DATABASE_URL` env var, outputs migrations to `./migrations/`
- **Push command**: `npm run db:push` runs `drizzle-kit push` to sync schema to database
- **Note**: The schema is minimal. The app's data model (posts, events, conversations, connections, profiles) is currently only represented in mock data and will need corresponding database tables.

### Shared Code

- `shared/schema.ts` is imported by both frontend and backend via the `@shared/*` path alias
- TypeScript path aliases: `@/*` maps to root, `@shared/*` maps to `./shared/*`

### Development Workflow

- **Dev mode**: Run two processes simultaneously:
  - `npm run server:dev` — Express server with tsx (port 5000)
  - `npm run expo:dev` — Expo dev server with Metro bundler
- **Production build**: `npm run expo:static:build` builds the web app, `npm run server:build` bundles the server, `npm run server:prod` runs it
- **Database**: `npm run db:push` to push schema changes

### Key Design Decisions

1. **Mock data first**: The app was built UI-first with mock data generators, making it easy to visualize all features before implementing real APIs. The transition path is to replace mock data calls with React Query hooks hitting `/api` endpoints.

2. **Expo Router file-based routing**: Chosen for its convention-over-configuration approach and native navigation support. Auth and main flows are separated into route groups.

3. **In-memory storage as default**: The `MemStorage` class allows the app to run without a database during development. When Postgres is provisioned, swap to a Drizzle-based implementation.

4. **Dark-only theme**: Single color scheme (dark) with no light mode toggle, keeping the design consistent and reducing complexity.

## Recent Changes (Feb 22, 2026)

- Built complete app UI with all core screens:
  - Auth flow: Login, Signup, Onboarding with profile completion
  - 5-tab navigation: Home (feed), Network, Events, Messages, Profile
  - Stack screens: Search, Settings, Chat (direct messaging)
- Generated custom app icon and splash screen with network cluster design
- Implemented mock data system for posts, people, events, conversations, messages
- Auth context with AsyncStorage persistence (login/signup/logout/profile update)
- Dark theme with Inter font family throughout
- Liquid glass tab support for iOS 26+ with BlurView fallback
- All interactive features: like/save posts, connect with people, RSVP events, send messages
- Reusable components: Avatar (initials-based), Badge (status indicators)

## External Dependencies

- **PostgreSQL**: Required for persistent data storage. Connection via `DATABASE_URL` environment variable. Currently uses Drizzle ORM but the database may not be provisioned yet.
- **Expo Services**: Uses Expo's build and development infrastructure. The app is configured for Replit deployment with proxy URL handling.
- **AsyncStorage**: `@react-native-async-storage/async-storage` for local auth token/profile persistence on device.
- **No external auth provider**: Auth is currently self-managed (no OAuth, Firebase, etc.)
- **No external APIs**: All data is currently mocked. No third-party API integrations yet.
- **Replit Environment**: Uses `REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`, `REPLIT_INTERNAL_APP_DOMAIN` environment variables for CORS and deployment URL configuration.