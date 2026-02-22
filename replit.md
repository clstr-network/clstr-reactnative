# CLSTR - College Networking App

## Overview

CLSTR is a college networking mobile application built with Expo (React Native) and an Express.js backend. It provides a social platform for students, alumni, and faculty to connect, share posts, message each other, and discover campus events. The app features a dark-themed UI with tab-based navigation covering a feed, network discovery, messaging, events, and a settings/more menu.

Currently the app uses mock data for all frontend features. The backend has a basic Express server with PostgreSQL database support via Drizzle ORM, but API routes are mostly stubbed out. The project is designed to run on Replit with web preview support.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture
- **Routing**: Expo Router v6 with file-based routing. Tab navigation lives in `app/(tabs)/` with screens for feed (index), network, messages, events, and more. A dynamic route `app/chat/[id].tsx` handles individual chat conversations
- **State Management**: TanStack React Query for server state (configured in `lib/query-client.ts`), local React state (`useState`) for UI state. No global state management library
- **Styling**: React Native `StyleSheet.create()` with a centralized dark theme color system in `constants/colors.ts`. The app uses a consistent dark color palette (background: `#0D0D0D`, primary/accent: `#E5A100` gold)
- **Fonts**: Inter font family loaded via `@expo-google-fonts/inter` (Regular, Medium, SemiBold, Bold weights)
- **Key Libraries**: 
  - `react-native-gesture-handler` and `react-native-reanimated` for gestures/animations
  - `expo-haptics` for tactile feedback on interactions
  - `expo-image-picker`, `expo-location` available but not heavily used yet
  - `date-fns` for date formatting
  - `expo-blur` and `expo-glass-effect` for visual effects (iOS tab bar blur)

### Backend (Express.js)

- **Runtime**: Node.js with TypeScript, compiled via `tsx` for dev and `esbuild` for production
- **Server**: Express v5 with CORS configured for Replit domains and localhost
- **API Pattern**: Routes registered in `server/routes.ts` via `registerRoutes()`. All API routes should be prefixed with `/api`
- **Storage Layer**: Abstracted via `IStorage` interface in `server/storage.ts`. Currently uses `MemStorage` (in-memory Map). Designed to be swapped for database-backed storage
- **Static File Serving**: In production, serves pre-built Expo web assets from `dist/` directory

### Database

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` - currently has a single `users` table with `id` (UUID), `username`, and `password` fields
- **Validation**: Zod schemas generated from Drizzle schemas via `drizzle-zod`
- **Migrations**: Output to `./migrations` directory, managed via `drizzle-kit push`
- **Connection**: Uses `DATABASE_URL` environment variable

### Data Flow

- Frontend makes API requests via `apiRequest()` helper in `lib/query-client.ts`, which constructs URLs from `EXPO_PUBLIC_DOMAIN` environment variable
- Currently all frontend data comes from `lib/mock-data.ts` (users, posts, conversations, messages, events) - this needs to be migrated to real API calls
- The `shared/` directory contains schema definitions shared between frontend and backend

### Build & Deployment

- **Dev mode**: Two processes run simultaneously - Expo dev server (`expo:dev`) and Express server (`server:dev`)
- **Production build**: Expo web is statically built (`expo:static:build`), Express server is bundled with esbuild (`server:build`), then served by Express (`server:prod`)
- **Build script**: `scripts/build.js` handles the Expo static build process with Metro bundler
- The Express server runs on port 5000

### Project Structure

```
app/                    # Expo Router screens (file-based routing)
  (tabs)/               # Tab navigator screens
  chat/[id].tsx         # Dynamic chat screen
components/             # Reusable React Native components
constants/              # Theme colors and constants
lib/                    # Client utilities (mock data, query client)
server/                 # Express backend
  index.ts              # Server entry point
  routes.ts             # API route registration
  storage.ts            # Data storage abstraction
shared/                 # Shared code between client and server
  schema.ts             # Drizzle database schema
migrations/             # Drizzle migration files
scripts/                # Build scripts
assets/                 # Images and static assets
```

## Recent Changes

### Feb 22, 2026
- Updated theme to match actual clstr app screenshots: amber/gold primary (#E5A100), near-black background (#0D0D0D)
- Changed tab structure to Home/Network/Messages/Events/More (matching original app)
- Added top bar with hamburger menu, search bar, and user avatar on all screens
- Network screen: Discover/Requests/Connections tabs with counts, filter icons
- Messages screen: Chats/Contacts tabs with counts
- Feed screen: Compose area, media buttons, sort selector
- More screen: Profile card with role badge, organized menu sections
- User cards show amber role badges (Student/Alumni) and connection status buttons

## External Dependencies

- **PostgreSQL**: Database accessed via `DATABASE_URL` environment variable, managed through Drizzle ORM
- **Replit Environment**: Uses Replit-specific environment variables (`REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`, `REPLIT_INTERNAL_APP_DOMAIN`) for CORS configuration and URL resolution
- **Google Fonts**: Inter font family loaded from `@expo-google-fonts/inter`
- **No external auth service**: Authentication is not yet implemented; the schema has username/password fields suggesting local auth is planned
- **No external APIs**: All data is currently mocked client-side