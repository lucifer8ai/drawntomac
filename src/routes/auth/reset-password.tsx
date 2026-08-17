import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateResetPassword } from "@/lib/auth";

export const Route = createFileRoute("/auth/reset-password")({
  ssr: false,
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [checking, setChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasRecoverySession(Boolean(data.session));
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setHasRecoverySession(true);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const validationError = validateResetPassword(password, confirm);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message ?? "Failed to update password.");
        return;
      }
      toast.success("Password updated. Sign in with your new password.");
      navigate({ to: "/" });
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Checking your reset link...</p>
      </div>
    );
  }

  if (!hasRecoverySession) {
    return (
      <div className="flex h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <p className="text-foreground">
            This reset link is invalid or expired.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            Request a new link
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6"
      >
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Set a new password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a password for your account.
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="new-password"
            className="text-xs font-medium text-muted-foreground"
          >
            New password
          </label>
          <input
            id="new-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border bg-input/40 px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="confirm-password"
            className="text-xs font-medium text-muted-foreground"
          >
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border bg-input/40 px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all disabled:opacity-60"
        >
          {busy ? "Saving..." : "Update password"}
        </button>
      </form>
    </main>
  );
}
