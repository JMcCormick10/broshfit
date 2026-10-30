# Broshfit — Agent Guide

## Project

Broshfit is a fitness-focused progressive web app built as a client-side React application. Supabase is the planned backend for authentication and data storage.

## Tech stack

- React 19 and TypeScript 6
- Vite 8 for development and production builds
- Tailwind CSS 4 via `@tailwindcss/vite`
- Supabase JavaScript client via `@supabase/supabase-js`
- `vite-plugin-pwa` for the web app manifest and generated service worker
- Oxlint for linting

## Common commands

- `npm run dev` — start the local Vite server
- `npm run build` — run TypeScript project checks and build production assets
- `npm run lint` — lint the project with Oxlint
- `npm run preview` — serve the production build locally

Use npm for package management and keep `package-lock.json` in sync when dependencies change. There is currently no test script; add or update tests when introducing test infrastructure or testable behavior.

## Conventions

- Write application code in TypeScript and React function components. Preserve the existing strict TypeScript settings and avoid `any` unless there is a clear reason.
- Prefer Tailwind utility classes for component styling. Keep global styles and base element rules in `src/index.css`; Tailwind is loaded there and configured through `vite.config.ts`.
- Treat `src/constants/theme.css` as the source of truth for Broshfit's strength-training design tokens. Reuse its CSS variables or Tailwind color utilities instead of repeating hex values; keep dark neutrals dominant, energetic orange primary, and electric blue supporting. Reserve red for exceptional achievements, green for success, and glow effects for special moments.
- Put reusable application code under `src/`; put shared integrations/helpers in `src/lib/`.
- Organize UI components under `src/components/`: `Atoms/` for small reusable pieces such as buttons, inputs, and headings; `Molecules/` for components composed from smaller pieces; and `Organisms/` for larger page sections composed from molecules and atoms. Keep these directories empty until components are needed.
- `src/App.css` is currently leftover Vite-template CSS and is not imported by the app. Prefer Tailwind for new component styles; only revive or remove that file when there is a deliberate reason.
- Use `getSupabaseClient()` from `src/lib/supabase.ts` to access Supabase. Configure the browser URL and publishable/anon key through Vite environment variables. Never expose a Supabase service-role key in client code; enforce data access with Supabase Row Level Security.
- Keep PWA manifest and service-worker configuration in `vite.config.ts`; the PWA plugin generates the production service worker. Test PWA changes with `npm run build` and `npm run preview`.
- Follow the formatting in the file being edited, and avoid unrelated formatting changes.

## Project documentation

See `README.md` for local setup, Supabase environment configuration, and PWA preview instructions. Update this guide when project-wide conventions or the stack change.
