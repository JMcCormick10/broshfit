import type { Profile } from "../../lib/database.types";
import { ProfileCard } from "../Molecules/ProfileCard";

type LandingPageProps = {
  loadError: string | null;
  onSelectProfile: (profile: Profile) => void;
  profiles: Profile[];
  selectedProfileId: string | null;
  statusMessage: string;
};

export function LandingPage({
  loadError,
  onSelectProfile,
  profiles,
  selectedProfileId,
  statusMessage,
}: LandingPageProps) {
  return (
    <main className="page-gutter relative flex min-h-screen items-center justify-center overflow-hidden bg-void py-8 text-starlight">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 42%, rgba(255,159,28,.12), transparent 56%), linear-gradient(rgba(247,244,237,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(247,244,237,.025) 1px, transparent 1px)",
          backgroundSize: "auto, 56px 56px, 56px 56px",
          maskImage: "linear-gradient(to bottom, black, transparent 90%)",
        }}
      />
      <section
        aria-labelledby="profile-heading"
        className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-surface/90 shadow-2xl shadow-black/50 backdrop-blur-xl md:grid-cols-[1.04fr_0.96fr]"
      >
        <div className="relative flex h-64 items-center justify-center overflow-hidden border-b border-border bg-void sm:h-72 md:h-auto md:min-h-[620px] md:border-r md:border-b-0">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,159,28,0.12),transparent_68%)]"
          />
          <img
            src={`${import.meta.env.BASE_URL}new-logo.png`}
            alt="Broshfit strength-training emblem"
            className="relative z-10 max-h-[15rem] w-full object-contain px-3 py-1 sm:max-h-[17rem] md:max-h-[590px] md:p-5"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 56%, rgba(11,16,22,.92) 100%)",
            }}
          />
          <div className="absolute bottom-5 left-6 z-20 hidden font-mono text-[9px] tracking-[0.18em] text-starlight/70 md:block">
            STRENGTH <span className="text-primary">//</span> DISCIPLINE
          </div>
        </div>

        <div className="flex min-h-[620px] flex-col justify-center px-6 py-10 sm:px-10 sm:py-12">
          <header className="mb-9 flex items-center justify-between">
            <span className="font-heading text-lg font-bold tracking-[0.18em]">
              BROSHFIT
            </span>
            <span className="font-mono text-[9px] tracking-[0.14em] text-muted-steel sm:text-[10px]">
              TRAINING LOG <span className="text-secondary">// 01 + 02</span>
            </span>
          </header>

          <div className="mb-7">
            <p className="mb-3 text-[10px] font-bold tracking-[0.24em] text-primary uppercase">
              Strength // Discipline
            </p>
            <h1
              id="profile-heading"
              className="font-heading text-4xl leading-none font-bold tracking-tight sm:text-5xl"
            >
              Welcome <span className="text-primary">back.</span>
            </h1>
            <p className="mt-3 text-sm text-muted-steel">
              Choose a profile to open its training log.
            </p>
          </div>

          {loadError ? (
            <p
              className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-5 text-sm text-starlight"
              role="alert"
            >
              {loadError}
            </p>
          ) : profiles.length === 0 ? (
            <p className="rounded-xl border border-border bg-void/70 px-4 py-6 text-sm text-muted-steel">
              No profiles found. Add profiles in Supabase to continue.
            </p>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  isSelected={selectedProfileId === profile.id}
                  onSelect={onSelectProfile}
                  profile={profile}
                />
              ))}
            </div>
          )}

          <div aria-live="polite" className="mt-5 min-h-8">
            <p className="font-mono text-[9px] tracking-[0.12em] text-muted-steel uppercase sm:text-[10px]">
              {statusMessage}
            </p>
          </div>

          <footer className="mt-5 border-t border-border/60 pt-4 font-mono text-[9px] tracking-[0.12em] text-muted-steel/70">
            TRAIN HARD <span className="text-primary">×</span> RECOVER STRONG
          </footer>
        </div>
      </section>
    </main>
  );
}
