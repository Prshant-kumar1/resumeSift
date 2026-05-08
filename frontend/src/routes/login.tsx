import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Sparkles, Mail, Lock, User as UserIcon, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

type Search = { redirect?: string; mode?: "login" | "signup" };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    mode: search.mode === "signup" ? "signup" : "login",
  }),
  head: () => ({
    meta: [
      { title: "Log in — ResumeSift" },
      { name: "description", content: "Sign in to your ResumeSift recruiter account." },
    ],
  }),
  component: LoginPage,
});

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.45-1.7 4.25-5.5 4.25-3.31 0-6.01-2.74-6.01-6.12S8.69 6.1 12 6.1c1.88 0 3.14.8 3.86 1.49l2.63-2.53C16.93 3.6 14.7 2.6 12 2.6 6.86 2.6 2.7 6.76 2.7 11.9S6.86 21.2 12 21.2c6.94 0 9.3-4.86 9.3-7.79 0-.52-.05-.92-.13-1.21H12z" />
    </svg>
  );
}

function LoginPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const {
    user,
    loading,
    configured,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    resetPassword,
  } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">(search.mode ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Strict same-origin path check to prevent open-redirect attacks
  // (e.g. //evil.com or /\evil.com would otherwise pass a startsWith("/") check)
  const isSafeRedirect = (url: string) =>
    url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\");

  const targetAfterAuth = useMemo(() => {
    const r = search.redirect;
    return r && isSafeRedirect(r) ? r : "/app";
  }, [search.redirect]);

  useEffect(() => {
    if (!loading && user) {
      // Already signed in — replace instead of push so the login page is not
      // left in the browser history stack (pressing Back would skip it).
      navigate({ to: targetAfterAuth as "/app", replace: true });
    }
  }, [user, loading, targetAfterAuth]);

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "At least 6 characters";
    if (mode === "signup" && !fullName.trim()) e.fullName = "Your name helps us personalize the app";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setServerError(null);
    setInfo(null);
    if (!validate()) return;
    if (!configured) {
      setServerError(
        "Authentication is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your environment.",
      );
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "login") {
        const { error } = await signInWithPassword(email, password);
        if (error) {
          setServerError(error);
          return;
        }
        navigate({ to: targetAfterAuth as "/app", replace: true });
      } else {
        const { error, needsConfirmation } = await signUpWithPassword(email, password, fullName);
        if (error) {
          setServerError(error);
          return;
        }
        if (needsConfirmation) {
          setInfo("Check your inbox to confirm your email, then log in.");
          setMode("login");
        } else {
          navigate({ to: "/app", replace: true });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setServerError(null);
    if (!configured) {
      setServerError("Authentication is not configured yet.");
      return;
    }
    setSubmitting(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setSubmitting(false);
      setServerError(error);
    }
    // OAuth flow leaves the page; no need to reset.
  };

  const handleForgot = async () => {
    setServerError(null);
    setInfo(null);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors((p) => ({ ...p, email: "Enter your email above first" }));
      return;
    }
    const { error } = await resetPassword(email);
    if (error) setServerError(error);
    else setInfo("If an account exists, a reset link has been sent.");
  };

  return (
    <div className="bg-aurora flex min-h-screen flex-col text-foreground">
      <header className="mx-auto mt-4 flex w-[min(1200px,calc(100%-1.5rem))] items-center justify-between">
        <Link to="/" className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
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
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {mode === "login"
                  ? "Sign in to access your hiring dashboard."
                  : "Start screening resumes in under a minute."}
              </p>
            </div>

            {/* Tabs */}
            <div className="glass mb-6 grid grid-cols-2 gap-1 rounded-full p-1">
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setServerError(null);
                    setInfo(null);
                  }}
                  className={cn(
                    "rounded-full py-1.5 text-sm font-medium transition",
                    mode === m
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "login" ? "Log in" : "Sign up"}
                </button>
              ))}
            </div>

            {!configured && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  Auth is not configured. Add <code className="font-mono">VITE_SUPABASE_URL</code>{" "}
                  and <code className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</code> to your env
                  to enable login.
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogle}
              disabled={submitting}
              className="glass mb-4 flex w-full items-center justify-center gap-2.5 rounded-lg py-2.5 text-sm font-medium transition hover:bg-surface-elevated/40 disabled:opacity-60"
            >
              <GoogleIcon className="h-4 w-4" />
              Continue with Google
            </button>

            <div className="mb-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              {mode === "signup" && (
                <Field
                  id="fullName"
                  label="Full name"
                  icon={UserIcon}
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Alex Recruiter"
                  error={errors.fullName}
                  autoComplete="name"
                />
              )}
              <Field
                id="email"
                label="Email"
                icon={Mail}
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@company.com"
                error={errors.email}
                autoComplete="email"
              />
              <Field
                id="password"
                label="Password"
                icon={Lock}
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                error={errors.password}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />

              {serverError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}
              {info && (
                <div className="rounded-lg border border-success/30 bg-success/10 p-2.5 text-xs text-success">
                  {info}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "login" ? "Sign in" : "Create account"}
              </button>

              {mode === "login" && (
                <button
                  type="button"
                  onClick={handleForgot}
                  className="block w-full text-center text-xs text-muted-foreground transition hover:text-foreground"
                >
                  Forgot your password?
                </button>
              )}
            </form>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By continuing you agree to our terms and privacy policy.
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-foreground/80">
        {label}
      </label>
      <div
        className={cn(
          "glass-input flex items-center gap-2 rounded-lg px-3 py-2 transition focus-within:ring-2 focus-within:ring-primary/40",
          error && "ring-2 ring-destructive/50",
        )}
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
