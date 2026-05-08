import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { useAppStore, useLocalStore } from "@/lib/store";
import { DEFAULT_API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ResumeSift" },
      { name: "description", content: "Manage API configuration, defaults, and your account." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const {
    apiBaseUrl,
    setApiBaseUrl,
    threshold,
    setThreshold,
    privacyMode,
    setPrivacyMode,
    displayName,
    email,
    role,
    setProfile,
  } = useAppStore();
  const clearHistory = useLocalStore((s) => s.clearHistory);

  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [testMsg, setTestMsg] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const testConnection = async () => {
    setTestStatus("loading");
    setTestMsg("");
    try {
      const res = await fetch(apiBaseUrl.replace(/\/$/, "") + "/health").catch(() =>
        fetch(apiBaseUrl),
      );
      if (res && res.ok) {
        setTestStatus("ok");
        setTestMsg(`Connected · ${res.status}`);
      } else {
        setTestStatus("err");
        setTestMsg(`Error · ${res?.status ?? "unreachable"}`);
      }
    } catch (e) {
      setTestStatus("err");
      setTestMsg((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* API */}
      <Section title="API Configuration" subtitle="Backend endpoint that powers screening">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Backend URL</label>
        <input
          value={apiBaseUrl}
          onChange={(e) => setApiBaseUrl(e.target.value)}
          className="surface-elev w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={testConnection}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            {testStatus === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Test Connection
          </button>
          <button
            onClick={() => {
              setApiBaseUrl(DEFAULT_API_BASE_URL);
              setTestStatus("idle");
              setTestMsg("");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> Reset to default
          </button>
          {testStatus === "ok" && (
            <span className="inline-flex items-center gap-1 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> {testMsg}
            </span>
          )}
          {testStatus === "err" && (
            <span className="inline-flex items-center gap-1 text-xs text-destructive">
              <XCircle className="h-3.5 w-3.5" /> {testMsg}
            </span>
          )}
        </div>
      </Section>

      {/* Defaults */}
      <Section title="Screening Defaults" subtitle="Applied to new screenings by default">
        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Default Threshold</span>
            <span className="rounded-md bg-primary/15 px-2 py-0.5 font-semibold text-primary">
              {threshold}%
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-[var(--color-primary)]"
          />
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-surface-elevated px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Anonymize candidates by default</p>
            <p className="text-xs text-muted-foreground">Hide names in tables and reports</p>
          </div>
          <button
            onClick={() => setPrivacyMode(!privacyMode)}
            className={cn(
              "relative h-6 w-11 rounded-full transition",
              privacyMode ? "bg-primary" : "bg-border",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-background transition",
                privacyMode ? "left-[22px]" : "left-0.5",
              )}
            />
          </button>
        </div>
      </Section>

      {/* Account */}
      <Section title="Account" subtitle="Your profile information">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Display Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setProfile({ displayName: e.target.value })}
              className="surface-elev w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
            <input
              value={email}
              readOnly
              className="surface-elev w-full cursor-not-allowed rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Role</label>
            <input
              value={role}
              onChange={(e) => setProfile({ role: e.target.value })}
              className="surface-elev w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </Section>

      {/* Danger */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/15 text-destructive ring-1 ring-destructive/30">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Danger Zone</h3>
            <p className="text-xs text-muted-foreground">
              Permanently remove all locally stored screening history.
            </p>
          </div>
          <button
            onClick={() => setConfirmClear(true)}
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20"
          >
            Clear History
          </button>
        </div>
      </div>

      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="surface w-full max-w-sm rounded-2xl border border-border/60 p-6">
            <h3 className="text-base font-semibold">Clear all screening history?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This will permanently delete all locally stored results. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmClear(false)}
                className="rounded-lg border border-border bg-surface-elevated px-4 py-2 text-sm font-medium hover:bg-surface"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearHistory();
                  setConfirmClear(false);
                }}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90"
              >
                Yes, clear it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface rounded-xl border border-border/60 p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {subtitle && <p className="mb-4 text-xs text-muted-foreground">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-4"}>{children}</div>
    </section>
  );
}
