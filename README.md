# Broshfit

Broshfit is a React + TypeScript fitness app built with Vite, Tailwind CSS, Supabase, and a generated PWA manifest/service worker.

## Run locally

Copy `.env.example` to `.env.local`, fill in the Supabase project URL and publishable (or legacy anon) key, then run `npm run dev`.

Use `getSupabaseClient()` from `src/lib/supabase.ts` to access Supabase. These `VITE_` values are shipped to browsers and are public by design. Never use a service-role key or database password in frontend code, `.env.local`, GitHub Actions variables, or Pages builds. Enforce access through Supabase Row Level Security (RLS).

### Password-only profile sign-in

Each profile signs in with the Auth email `profile-<profile-id>@broshfit.invalid`, where `<profile-id>` is the profile UUID. Provision a confirmed Supabase Auth user with that exact email and the desired password for each profile. The `.invalid` domain cannot receive email, so email confirmation and password-reset email flows are unavailable for these accounts.

## GitHub Pages deployment

The workflow in `.github/workflows/deploy.yml` builds and deploys the app to GitHub Pages when changes are pushed to `main` or when run manually. It uses the Pages-provided base path, so project sites and root/custom-domain sites get the correct asset and PWA URLs.

1. Push this repository to GitHub and enable Pages in **Settings → Pages**, choosing **GitHub Actions** as the build and deployment source.
2. In **Settings → Secrets and variables → Actions → Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the project URL and publishable (or legacy anon) key from Supabase. These values are public in the deployed JavaScript; repository variables are appropriate. The workflow fails if either value is missing.
3. In Supabase **Authentication → URL Configuration**, set the production Site URL and add the production URL to Redirect URLs. For a project site, it is typically `https://<owner>.github.io/<repository>/`; for a user/organization site or custom domain, use its root URL.
4. Review the existing RLS policies before putting real data in production. Workout sessions and history are scoped to the authenticated user; profile cards and shared exercise/routine catalog data are currently readable by anonymous visitors and should contain no private information.

Apply all pending Supabase migrations to the production project before deploying UI changes that depend on them. Run database migrations from a trusted local environment; the database password is only for the Supabase CLI and is never needed by this static site or its Pages workflow.

The `.env*` files are ignored by Git except `.env.example`; do not commit local credentials. GitHub Pages is static hosting, so all browser-side configuration is visible to users. Keep database passwords and Supabase service-role keys exclusively in trusted server-side environments.

## PWA

Production builds generate a manifest and service worker. The PWA uses icons derived from `src/assets/logo.png`; install it from the browser's install option (or **Add to Home Screen** on iOS). The service worker caches the app shell and build assets; Supabase data operations still require a network connection.

Run `npm run build` and `npm run preview` to test the production PWA locally. Service workers require HTTPS except on localhost.
