import { useEffect, useState, type FormEvent } from "react";
import { LoginDialog } from "./components/Organisms/LoginDialog";
import { LandingPage } from "./components/Organisms/LandingPage";
import { ProfileLandingPage } from "./components/Organisms/ProfileLandingPage";
import { Spinner } from "./components/Atoms/Spinner";
import { getProfiles } from "./lib/profiles";
import { getProfileAuthEmail } from "./lib/profile-auth";
import { getSupabaseClient } from "./lib/supabase";
import type { Profile } from "./lib/database.types";

function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [loginProfile, setLoginProfile] = useState<Profile | null>(null);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [authenticatedProfile, setAuthenticatedProfile] =
    useState<Profile | null>(null);

  function openLogin(profile: Profile) {
    setSelectedProfile(profile.id);
    setLoginProfile(profile);
    setLoginPassword("");
    setLoginError(null);
  }

  function closeLogin() {
    if (isSigningIn) return;
    setLoginProfile(null);
    setLoginPassword("");
    setLoginError(null);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loginProfile) return;

    setIsSigningIn(true);
    setLoginError(null);

    try {
      const { error } = await getSupabaseClient().auth.signInWithPassword({
        email: getProfileAuthEmail(loginProfile.id),
        password: loginPassword,
      });

      if (error) throw error;

      setAuthenticatedProfile(loginProfile);
      setLoginProfile(null);
      setLoginPassword("");
    } catch {
      setLoginError(
        "Incorrect password, or this profile's Supabase Auth account is not set up. Please try again.",
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleLogout() {
    setIsSigningOut(true);
    setLogoutError(null);

    try {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) throw error;

      setAuthenticatedProfile(null);
      setSelectedProfile(null);
    } catch {
      setLogoutError("Sign-out failed. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function restoreAppState() {
      try {
        const [loadedProfiles, sessionResult] = await Promise.all([
          getProfiles(),
          getSupabaseClient().auth.getSession(),
        ]);

        if (sessionResult.error) throw sessionResult.error;
        if (!isMounted) return;

        setProfiles(loadedProfiles);

        const savedEmail = sessionResult.data.session?.user.email;
        const savedProfile = loadedProfiles.find(
          (profile) => getProfileAuthEmail(profile.id) === savedEmail,
        );

        if (savedProfile) {
          setAuthenticatedProfile(savedProfile);
          setSelectedProfile(savedProfile.id);
        }
      } catch (error: unknown) {
        if (isMounted) {
          const message =
            error instanceof Error
              ? error.message
              : "An unknown error occurred while restoring the app.";
          setLoadError(`Could not load your profile: ${message}`);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void restoreAppState();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void px-6 text-starlight">
        <Spinner label="Loading your training dashboard..." />
      </main>
    );
  }

  if (authenticatedProfile) {
    return (
      <ProfileLandingPage
        isSigningOut={isSigningOut}
        logoutError={logoutError}
        onLogout={handleLogout}
        profile={authenticatedProfile}
      />
    );
  }

  const statusMessage = selectedProfile
    ? `Profile selected // ${profiles.find((profile) => profile.id === selectedProfile)?.name}`
    : "Select your profile";

  return (
    <>
      <LandingPage
        loadError={loadError}
        onSelectProfile={openLogin}
        profiles={profiles}
        selectedProfileId={selectedProfile}
        statusMessage={statusMessage}
      />
      <div
        aria-hidden="true"
        className={`login-beam-scene ${loginProfile ? "login-beam-scene--foreground" : ""}`}
      >
        <span className="login-beam login-beam--violet" />
        <span className="login-beam login-beam--blue" />
        <span className="login-beam-impact" />
      </div>
      {loginProfile && (
        <LoginDialog
          error={loginError}
          isSigningIn={isSigningIn}
          onClose={closeLogin}
          onPasswordChange={setLoginPassword}
          onSubmit={handleLogin}
          password={loginPassword}
          profile={loginProfile}
        />
      )}
    </>
  );
}

export default App;
