import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Lock, Sparkles, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — ResumeSift" },
      { name: "description", content: "Set a new password for your ResumeSift account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const { error: err } = await updatePassword(password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setDone(true);
    setTimeout(() => navigate({ to: "/app" }), 1500);
  };

  return (
    <div className="bg-aurora flex min-h-screen flex-col text-foreground">
      <header className="mx-auto mt-4 flex w-[min(1200px,calc(100%-1.5rem))] items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">
            Resume<span className="text-primary">Sift</span>
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="glass-strong rounded-2xl p-6 sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter a new password for your account.
            </p>

            {done ? (
              <div className="mt-6 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                Password updated. Taking you to the app…
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-3" noValidate>
                <PassField id="pw" label="New password" value={password} onChange={setPassword} />
                <PassField
                  id="pw2"
                  label="Confirm new password"
                  value={confirm}
                  onChange={setConfirm}
                />
                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {!ready && (
                  <p className="text-xs text-muted-foreground">
                    Waiting for the recovery link to be verified…
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting || !ready}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Update password
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function PassField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-foreground/80">
        {label}
      </label>
      <div
        className={cn(
          "glass-input flex items-center gap-2 rounded-lg px-3 py-2 transition focus-within:ring-2 focus-within:ring-primary/40",
        )}
      >
        <Lock className="h-4 w-4 text-muted-foreground" />
        <input
          id={id}
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          placeholder="••••••••"
        />
      </div>
    </div>
  );
}
