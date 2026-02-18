import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import Sitemap from "vite-plugin-sitemap";

process.env.BROWSERSLIST_IGNORE_OLD_DATA = "true";

const BASE_URL = "https://clstr.network";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    chunkSizeWarningLimit: 3200,
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    Sitemap({
      hostname: BASE_URL,
      dynamicRoutes: [
        "/",
        "/login",
        "/signup",
        "/clubs",
        "/events",
        "/mentorship",
        "/projects",
        "/jobs",
        "/ecocampus",
      ],
      exclude: ["/onboarding", "/settings", "/auth/*", "/admin/*"],
      changefreq: "weekly",
      priority: 0.8,
      lastmod: new Date(),
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./packages/shared/src"),
    },
  },
}));
