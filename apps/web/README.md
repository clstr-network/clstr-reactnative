# apps/web

This is the existing Clstr web app. It runs from the **monorepo root** using the
root-level `vite.config.ts`, `tailwind.config.ts`, `tsconfig.app.json`, and `src/` directory.

This `apps/web/` directory exists solely as a workspace pointer for Turborepo
task orchestration. All web source code remains in `/src/` at the monorepo root.

## Scripts

```bash
# From monorepo root:
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run test         # Run Vitest tests

# From apps/web/:
npm run dev          # Same as above (delegates to root)
```
