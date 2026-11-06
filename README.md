# Zenkai Boost

Zenkai Boost is a strength-training log built with React, TypeScript, Vite, Tailwind CSS, and Supabase. Its visual identity uses the Zenkai Boost training artwork and a high-energy orange/blue palette.

## Run locally

Copy `.env.example` to `.env.local`, fill in the Supabase project URL and publishable (or legacy anon) key, then run `npm run dev`.

Use `getSupabaseClient()` from `src/lib/supabase.ts` to access Supabase. These `VITE_` values are shipped to browsers and are public by design. Never use a service-role key or database password in frontend code, `.env.local`, GitHub Actions variables, or Pages builds. Enforce access through Supabase Row Level Security (RLS).

### Password-only profile sign-in

Each profile signs in with the Auth email `profile-<profile-id>@broshfit.invalid`, where `<profile-id>` is the profile UUID. This existing sign-in namespace is retained for compatibility with provisioned accounts. Provision a confirmed Supabase Auth user with that exact email and the desired password for each profile. The `.invalid` domain cannot receive email, so email confirmation and password-reset email flows are unavailable for these accounts.

The `profiles.character` field controls each profile's avatar, character-specific copy, and color theme. It is separate from profile identity and workout history. Initial assignments are Josh → Goku, Brad → Vegeta, and Test → Ginyu; a signed-in profile can change its character from the avatar menu. Apply [`supabase/migrations/20261105000000_add_profile_character.sql`](./supabase/migrations/20261105000000_add_profile_character.sql) and [`supabase/migrations/20261105000001_allow_profile_character_changes.sql`](./supabase/migrations/20261105000001_allow_profile_character_changes.sql) before deploying character selection.

### Copy completed workout history to Ginyu

The `Test` profile is Ginyu's sandbox. Workout routines and exercises are shared globally, so the copy script reuses those IDs and copies only completed workout sessions, their exercise/set logs, and completion records.

To select a source profile and replace Ginyu's completed history from the command line:

1. Make sure the Supabase CLI is authenticated (`npx supabase login`) and linked to the intended project (`npx supabase link --project-ref <project-ref>`).
2. Run `npm run copy-workout-history`, select a source profile, review the source/target counts, and type `COPY` to confirm.

The command replaces Ginyu's completed workout history, leaves any in-progress Ginyu session untouched, and does not modify the source profile. It uses the linked Supabase project and requires a matching Auth user for both profiles. For a manual SQL Editor run, use [`supabase/scripts/copy-completed-workout-history.sql`](./supabase/scripts/copy-completed-workout-history.sql); it defaults to a dry run, and should only be applied after reviewing its preview notices.

After copying Brad's history to Test, [`supabase/scripts/correct-test-workout-exercises.sql`](./supabase/scripts/correct-test-workout-exercises.sql) can correct the one-time exercise substitutions. It keeps the first two completed Front Squat sessions, changes later Front Squat entries to Back Squat, and changes the Chin Ups entry in Test's latest completed workout to Wide Grip Pull-up. The correction script is dry-run-first and only touches Test's saved session exercises.

Start a routine-free workout from the workout picker with **Start Freestyle Workout**, then add exercises as you go. At least one exercise must be completed before the workout can be saved. Completed exercises are compared with the most recent completed entry for that exercise, across routines and freestyle workouts.

## GitHub Pages deployment

The workflow in `.github/workflows/deploy.yml` builds and deploys the app to GitHub Pages when changes are pushed to `main` or when run manually. It uses the Pages-provided base path, so project sites and root/custom-domain sites get the correct asset and PWA URLs.

1. Push this repository to GitHub and enable Pages in **Settings → Pages**, choosing **GitHub Actions** as the build and deployment source.
2. In **Settings → Secrets and variables → Actions → Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the project URL and publishable (or legacy anon) key from Supabase. These values are public in the deployed JavaScript; repository variables are appropriate. The workflow fails if either value is missing.
3. In Supabase **Authentication → URL Configuration**, set the production Site URL and add the production URL to Redirect URLs. For a project site, it is typically `https://<owner>.github.io/<repository>/`; for a user/organization site or custom domain, use its root URL.
4. Review the existing RLS policies before putting real data in production. Workout sessions and history are scoped to the authenticated user; profile cards and shared exercise/routine catalog data are currently readable by anonymous visitors and should contain no private information.

Apply all pending Supabase migrations to the production project before deploying UI changes that depend on them. Run database migrations from a trusted local environment; the database password is only for the Supabase CLI and is never needed by this static site or its Pages workflow.

The `.env*` files are ignored by Git except `.env.example`; do not commit local credentials. GitHub Pages is static hosting, so all browser-side configuration is visible to users. Keep database passwords and Supabase service-role keys exclusively in trusted server-side environments.

## PWA

Production builds generate a manifest and service worker. The PWA uses icons derived from `public/zenkai-boost-logo.png`; install it from the browser's install option (or **Add to Home Screen** on iOS). When a new version is detected, Zenkai Boost shows an update prompt; choose **Update now** to reload the app. Keep the installed PWA—there is no need to uninstall and add it again. The service worker caches the app shell and build assets; Supabase data operations still require a network connection.

Run `npm run build` and `npm run preview` to test the production PWA locally. Service workers require HTTPS except on localhost.
