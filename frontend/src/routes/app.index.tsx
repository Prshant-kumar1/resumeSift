import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Target,
  TrendingUp,
  Calendar,
  Eye,
  EyeOff,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Inbox,
  Sliders,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Link } from "@tanstack/react-router";
import { ResultBadge } from "@/components/ResultBadge";
import { Skeleton } from "@/components/Skeleton";
import { useAppStore, useLocalStore } from "@/lib/store";
import { api, type ScreeningResult } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — ResumeSift" },
      {
        name: "description",
        content: "Track screening activity, match rates, and recent results.",
      },
    ],
  }),
  component: DashboardPage,
});

type Stat = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { dir: "up" | "down"; pct: string; vs: string };
};

function StatCard({ stat, loading }: { stat: Stat; loading?: boolean }) {
  const Icon = stat.icon;
  return (
    <div className="surface relative overflow-hidden rounded-xl border border-border/60 p-4 transition hover:border-primary/30">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="h-4 w-4" />
        </div>
        {stat.trend && !loading && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              stat.trend.dir === "up"
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {stat.trend.dir === "up" ? "↑" : "↓"} {stat.trend.pct}
          </span>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{stat.label}</p>
      {loading ? (
        <Skeleton className="mt-1.5 h-7 w-20" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tracking-tight">{stat.value}</p>
      )}
      {stat.trend && !loading && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{stat.trend.vs}</p>
      )}
    </div>
  );
}

function DashboardPage() {
  const [history, setHistory] = useState<ScreeningResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { threshold, setThreshold, privacyMode, setPrivacyMode } = useAppStore();
  const localHistory = useLocalStore((s) => s.history);
  const [thresholdEditing, setThresholdEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<ScreeningResult[] | { items?: ScreeningResult[]; data?: ScreeningResult[] }>(
        "/screening/history",
      )
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res)
          ? res
          : ((res as { items?: ScreeningResult[] }).items ??
            (res as { data?: ScreeningResult[] }).data ??
            []);
        setHistory(list);
      })
      .catch(() => {
        if (cancelled) return;
        // Fall back to local-only history (or empty)
        setHistory((localHistory as ScreeningResult[]) ?? []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [localHistory]);

  const data = history ?? [];

  const stats = useMemo<Stat[]>(() => {
    const total = data.length;
    const matches = data.filter(
      (d) => (d.result || "").toString().toLowerCase() === "match",
    ).length;
    const matchRate = total ? Math.round((matches / total) * 100) : 0;
    const avgConf = total
      ? Math.round(
          data.reduce((s, d) => s + (Number(d.confidence ?? d.probability ?? 0) || 0), 0) / total,
        )
      : 0;
    const today = new Date().toDateString();
    const screenedToday = data.filter((d) => {
      const dt = new Date(d.date ?? d.created_at ?? "");
      return !isNaN(dt.getTime()) && dt.toDateString() === today;
    }).length;

    return [
      {
        label: "Total Screened",
        value: String(total || 0),
        icon: Users,
      },
      {
        label: "Match Rate",
        value: `${matchRate}%`,
        icon: Target,
      },
      {
        label: "Avg Confidence",
        value: `${avgConf}%`,
        icon: TrendingUp,
      },
      {
        label: "Screened Today",
        value: String(screenedToday),
        icon: Calendar,
      },
    ];
  }, [data]);

  const activitySeries = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: d.toLocaleDateString([], { month: "short", day: "numeric" }),
        count: data.filter((x) => (x.date ?? x.created_at ?? "").slice(0, 10) === key).length,
      });
    }
    return days;
  }, [data]);

  const matches = data.filter((d) => (d.result || "").toString().toLowerCase() === "match").length;
  const noMatches = data.length - matches;
  const distribution = data.length
    ? [
        { name: "Match", value: matches, color: "var(--color-success)" },
        { name: "No Match", value: noMatches, color: "var(--color-destructive)" },
      ]
    : [];

  // Pagination
  const PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const paged = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSelected = (idx: number) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelected(next);
  };

  const exportCsv = (rows: ScreeningResult[]) => {
    const headers = ["Candidate", "Result", "Probability", "Job Role", "Date"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${(r.candidate_name ?? "Anonymous").replace(/"/g, '""')}"`,
          r.result ?? "",
          r.probability ?? r.confidence ?? "",
          `"${(r.job_role ?? r.job_title ?? "").replace(/"/g, '""')}"`,
          r.date ?? r.created_at ?? "",
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `screenings-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} stat={s} loading={loading} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="surface lg:col-span-2 rounded-xl border border-border/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Screening Activity</h2>
              <p className="text-xs text-muted-foreground">Resumes screened in the last 14 days</p>
            </div>
            <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
              14d
            </span>
          </div>
          <div className="mt-4 h-64">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={activitySeries}
                  margin={{ top: 10, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="teal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--color-primary)", strokeOpacity: 0.3 }}
                    contentStyle={{
                      background: "var(--color-surface-elevated)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#teal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="surface rounded-xl border border-border/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Match Distribution</h2>
              <p className="text-xs text-muted-foreground">Across all screenings</p>
            </div>
          </div>

          <div className="mt-2 h-48">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="value"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {distribution.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-surface-elevated)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-2 flex items-center justify-around text-center text-xs">
            {distribution.map((d) => {
              const total = distribution.reduce((s, x) => s + x.value, 0);
              const pct = total ? Math.round((d.value / total) * 100) : 0;
              return (
                <div key={d.name}>
                  <span
                    className="mr-1 inline-block h-2 w-2 rounded-full"
                    style={{ background: d.color }}
                  />
                  {d.name} <span className="ml-1 font-semibold text-foreground">{pct}%</span>
                </div>
              );
            })}
          </div>

          {/* Threshold chip */}
          <div className="mt-4 rounded-lg border border-border/60 bg-surface-elevated p-3">
            <button
              onClick={() => setThresholdEditing((v) => !v)}
              className="flex w-full items-center justify-between text-xs"
            >
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Sliders className="h-3 w-3" /> Current Threshold
              </span>
              <span className="rounded-md bg-primary/15 px-2 py-0.5 font-semibold text-primary">
                {threshold}%
              </span>
            </button>
            {thresholdEditing && (
              <input
                type="range"
                min={0}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="mt-3 w-full accent-[var(--color-primary)]"
              />
            )}
          </div>
        </div>
      </div>

      {/* Recent screenings */}
      <div className="surface rounded-xl border border-border/60">
        <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Recent Screenings</h2>
            <p className="text-xs text-muted-foreground">Latest candidate evaluations</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setPrivacyMode(!privacyMode)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition",
                privacyMode
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-surface-elevated text-muted-foreground hover:text-foreground",
              )}
            >
              {privacyMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {privacyMode ? "Anonymous" : "Privacy off"}
            </button>
            <button
              disabled={selected.size === 0}
              onClick={() =>
                exportCsv(
                  Array.from(selected)
                    .map((i) => paged[i])
                    .filter(Boolean),
                )
              }
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" /> Export Selected
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Inbox className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold">No screenings yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started by screening your first resume.
            </p>
            <Link
              to="/app/single"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Screen your first resume <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-medium">
                      <input
                        type="checkbox"
                        className="accent-[var(--color-primary)]"
                        checked={selected.size === paged.length && paged.length > 0}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked ? new Set(paged.map((_, i) => i)) : new Set(),
                          )
                        }
                      />
                    </th>
                    <th className="px-2 py-3 font-medium">#</th>
                    <th className="px-2 py-3 font-medium">Candidate</th>
                    <th className="px-2 py-3 font-medium">Result</th>
                    <th className="px-2 py-3 font-medium">Probability</th>
                    <th className="px-2 py-3 font-medium">Job Role</th>
                    <th className="px-2 py-3 font-medium">Date</th>
                    <th className="px-2 py-3 font-medium text-right">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row, i) => {
                    const idx = page * PAGE_SIZE + i + 1;
                    const prob = Number(row.probability ?? row.confidence ?? 0);
                    return (
                      <tr
                        key={i}
                        className="border-b border-border/40 last:border-0 hover:bg-surface-elevated/50"
                      >
                        <td className="px-5 py-3">
                          <input
                            type="checkbox"
                            className="accent-[var(--color-primary)]"
                            checked={selected.has(i)}
                            onChange={() => toggleSelected(i)}
                          />
                        </td>
                        <td className="px-2 py-3 text-muted-foreground">{idx}</td>
                        <td className="px-2 py-3 font-medium">
                          {privacyMode ? "Anonymous" : (row.candidate_name ?? "—")}
                        </td>
                        <td className="px-2 py-3">
                          <ResultBadge result={String(row.result ?? "")} />
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-elevated">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${Math.min(100, prob)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(prob)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-muted-foreground">
                          {row.job_role ?? row.job_title ?? "—"}
                        </td>
                        <td className="px-2 py-3 text-muted-foreground">
                          {(row.date ?? row.created_at ?? "").toString().slice(0, 10) || "—"}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <button
                            onClick={() => exportCsv([row])}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
              <span>
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.length)} of{" "}
                {data.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-md p-1.5 hover:bg-surface-elevated disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2">
                  {page + 1} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="rounded-md p-1.5 hover:bg-surface-elevated disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
