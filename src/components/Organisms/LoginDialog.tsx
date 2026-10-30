import type { FormEvent } from "react";
import type { Profile } from "../../lib/database.types";
import { getProfileCopy } from "../../constants/profile-copy";
import { Button } from "../Atoms/Button";
import { Spinner } from "../Atoms/Spinner";
import { DialogShell } from "../Molecules/DialogShell";
import { FormField } from "../Molecules/FormField";

type LoginDialogProps = {
  error: string | null;
  isSigningIn: boolean;
  onClose: () => void;
  onPasswordChange: (password: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  password: string;
  profile: Profile;
};

export function LoginDialog({
  error,
  isSigningIn,
  onClose,
  onPasswordChange,
  onSubmit,
  password,
  profile,
}: LoginDialogProps) {
  const profileCopy = getProfileCopy(profile.name);

  return (
    <DialogShell
      closeDisabled={isSigningIn}
      closeLabel="Close sign-in dialog"
      description={profileCopy.loginDescription}
      eyebrow={profileCopy.loginEyebrow}
      onClose={onClose}
      title={`Sign in as ${profile.name}`}
      titleId="login-heading"
      widthClass="max-w-md"
      className="p-6 sm:p-8"
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <FormField label="Password">
          <input
            autoComplete="current-password"
            autoFocus
            className="w-full rounded-lg border border-border bg-void px-3.5 py-3 text-starlight outline-none transition placeholder:text-muted-steel/60 focus:border-secondary"
            onChange={(event) => onPasswordChange(event.target.value)}
            required
            type="password"
            value={password}
          />
        </FormField>

        {isSigningIn && <Spinner compact label="Verifying profile access..." />}

        {error && (
          <p
            className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2.5 text-sm text-starlight"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="primary-flex" disabled={isSigningIn} type="submit">
            {isSigningIn ? "Signing in..." : "Sign in"}
          </Button>
          <Button
            variant="outline"
            disabled={isSigningIn}
            onClick={onClose}
            type="button"
          >
            Cancel
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
