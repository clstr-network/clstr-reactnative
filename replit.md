# clstr - University Social Network Mobile App

## Overview
clstr is a React Native (Expo) mobile application for university social networking. It supports three user roles: student, faculty, and alumni. The app provides feed, network connections, messaging, notifications, and profile management.

## Architecture
- **Frontend**: Expo Router with file-based routing, React Native
- **Backend**: Express server on port 5000 (landing page + API)
- **State**: AsyncStorage for local persistence, React Query for cache management
- **Auth**: Local onboarding flow with role selection (student/faculty/alumni)

## Project Structure
```
app/
  _layout.tsx          - Root layout with providers (QueryClient, Auth, Gesture, Keyboard)
  onboarding.tsx       - 3-step onboarding (name, role, department)
  create-post.tsx      - Modal for creating new posts
  notifications.tsx    - Notifications list screen
  chat/[id].tsx        - Chat detail screen
  +not-found.tsx       - 404 screen
  (tabs)/
    _layout.tsx        - Tab layout with liquid glass support
    index.tsx          - Feed screen with category filtering
    network.tsx        - Connections screen
    messages.tsx       - Conversations list
    profile.tsx        - User profile with settings
components/
  Avatar.tsx           - User avatar with fallback initials
  PostCard.tsx         - Feed post card component
  ConnectionCard.tsx   - Network connection card
  ConversationItem.tsx - Message list item
  NotificationItem.tsx - Notification list item
  RoleBadge.tsx        - Role indicator badge
  ErrorBoundary.tsx    - Error boundary wrapper
  ErrorFallback.tsx    - Error fallback UI
constants/
  colors.ts            - Theme colors (dark/light) with role badge colors
lib/
  auth-context.tsx     - Auth context provider
  storage.ts           - AsyncStorage data layer with seed data
  time.ts              - Relative time formatting utilities
  query-client.ts      - React Query client setup
server/
  index.ts             - Express server
  routes.ts            - API routes
  storage.ts           - Server-side storage
```

## Key Features
- Role-based profiles (student, faculty, alumni)
- Post feed with category filtering (general, academic, career, events, social)
- Network connections with connect/accept flow
- Messaging with conversation list and chat
- Notifications with read/unread state
- Dark/light theme support
- Liquid glass tab bar on iOS 26+

## Recent Changes
- Initial build: Complete app with all screens and navigation
- Theme: Dark midnight blue with teal accent (#00D1B2)
- Fonts: Inter via @expo-google-fonts/inter
