import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  Download,
  Sparkles,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import Papa from "papaparse";
import { ResultBadge } from "@/components/ResultBadge";
import { api, type JobDescription, type ScreeningResult } from "@/lib/api";
import { useAppStore, useLocalStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/batch")({
  head: () => ({
    meta: [
      { title: "Batch Screening — ResumeSift" },
      { name: "description", content: "Upload a CSV of resumes and screen them all at once." },
    ],
  }),
  component: BatchPage,
});

type BatchRow = ScreeningResult & { rank?: number };

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });
  // FieldMismatch errors (inconsistent column counts) are non-fatal — papaparse still
  // returns partial data for affected rows, which is acceptable for batch screening.
  const criticalErrors = result.errors.filter((e) => e.type !== "FieldMismatch");
  if (criticalErrors.length > 0) {
    const messages = criticalErrors.map((e) => e.message).join("; ");
    throw new Error(criticalErrors.length === 1 ? messages : `${messages} (${criticalErrors.length} errors)`);
  }
  const headers = result.meta.fields ?? [];
  return { headers, rows: result.data };
}

function BatchPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [customJD, setCustomJD] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const { threshold, setThreshold } = useAppStore();
  const localJobs = useLocalStore((s) => s.jobs);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BatchRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<JobDescription[]>("/jobs")
      .then((res) => setJobs(Array.isArray(res) ? res : []))
      .catch(() => setJobs([]));
  }, []);

  const allJobs = useMemo(() => {
    const seen = new Set<string>();
    return [...jobs, ...(localJobs as unknown as JobDescription[])].filter((j) => {
      const k = String(j.id);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [jobs, localJobs]);

  const selectedJob = allJobs.find((j) => String(j.id) === selectedJobId);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setError(null);
    const text = await file.text();
    let headers: string[];
    let rows: Record<string, string>[];
    try {
      ({ headers, rows } = parseCsv(text));
    } catch (e) {
      setError(`Failed to parse CSV: ${e instanceof Error ? e.message : String(e)}`);
      setCsvRows([]);
      return;
    }
    if (!headers.includes("resume_text")) {
      setError("CSV must have a 'resume_text' column.");
      setCsvRows([]);
      return;
    }
    setCsvRows(rows);
  };

  const runBatch = async () => {
    setError(null);
    if (csvRows.length === 0) return setError("Upload a CSV first.");
    const jd = showCustom ? customJD : (selectedJob?.description ?? "");
    if (!jd.trim()) return setError("Provide a job description.");

    setLoading(true);
    setProgress(0);
    setResults([]);
    try {
      const res = await api.post<{ results?: BatchRow[] } | BatchRow[]>("/screening/batch", {
        resumes: csvRows.map((r) => ({
          resume_text: r.resume_text,
          candidate_name: r.candidate_name ?? r.name ?? null,
        })),
        job_description: jd,
        threshold: threshold / 100,
      });
      const list = Array.isArray(res) ? res : (res.results ?? []);
      const ranked = list
        .slice()
        .sort(
          (a, b) => Number(b.probability ?? b.score ?? 0) - Number(a.probability ?? a.score ?? 0),
        )
        .map((r, i) => ({ ...r, rank: i + 1 }));
      setResults(ranked);
      setProgress(100);
    } catch (e) {
      console.error("Batch screening API error:", e);
      setError(
        "The screening API is currently unreachable. Please check the backend URL in Settings and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const exportAll = () => {
    const csv = [
      ["Rank", "Candidate", "Result", "Score", "Matched Skills"].join(","),
      ...results.map((r) =>
        [
          r.rank,
          `"${(r.candidate_name ?? "").replace(/"/g, '""')}"`,
          r.result ?? "",
          r.score ?? r.probability ?? "",
          `"${(r.matched_skills ?? []).join("; ")}"`,
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="surface grid grid-cols-1 gap-5 rounded-xl border border-border/60 p-5 lg:grid-cols-3">
        {/* Upload */}
        <div className="lg:col-span-2 space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Upload Resume CSV</h2>
            <p className="text-xs text-muted-foreground">
              CSV must have a{" "}
              <code className="rounded bg-surface-elevated px-1 py-0.5 text-[11px]">
                resume_text
              </code>{" "}
              column. Optional:{" "}
              <code className="rounded bg-surface-elevated px-1 py-0.5 text-[11px]">
                candidate_name
              </code>
              .
            </p>
          </div>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-elevated px-4 py-10 text-center transition hover:border-primary/40"
          >
            <Upload className="mb-2 h-6 w-6 text-primary" />
            <label className="cursor-pointer text-sm font-semibold text-primary hover:underline">
              Click to upload
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
            <p className="mt-1 text-xs text-muted-foreground">or drag and drop your CSV file</p>
            {fileName && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary">
                <FileSpreadsheet className="h-3.5 w-3.5" /> {fileName} · {csvRows.length} rows
              </p>
            )}
          </div>
        </div>

        {/* JD + threshold */}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Job Description
            </label>
            <div className="relative">
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                disabled={showCustom}
                className="surface-elev w-full appearance-none rounded-lg border border-border px-3 py-2.5 pr-9 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              >
                <option value="">— Select a saved job —</option>
                {allJobs.map((j) => (
                  <option key={j.id} value={String(j.id)}>
                    {j.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <button
              onClick={() => setShowCustom((v) => !v)}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              {showCustom ? "Hide custom JD" : "Or paste a custom JD"}
            </button>
            {showCustom && (
              <textarea
                value={customJD}
                onChange={(e) => setCustomJD(e.target.value)}
                placeholder="Paste the job description…"
                className="surface-elev mt-2 min-h-24 w-full rounded-lg border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            )}
          </div>

          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Match Threshold</span>
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

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={runBatch}
            disabled={loading || csvRows.length === 0}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60",
              !loading && csvRows.length > 0 && "glow-ring",
            )}
          >
            <Sparkles className="h-4 w-4" />
            {loading ? "Processing…" : "Run Batch Screening"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="surface rounded-xl border border-border/60 p-5">
          <p className="mb-2 text-xs text-muted-foreground">Screening {csvRows.length} resumes…</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
            <div
              className="h-full animate-pulse rounded-full bg-primary"
              style={{ width: `${progress || 30}%`, transition: "width 0.4s ease" }}
            />
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="surface rounded-xl border border-border/60">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Batch Results</h2>
              <p className="text-xs text-muted-foreground">
                Sorted by score · {results.length} candidates
              </p>
            </div>
            <button
              onClick={exportAll}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" /> Export All
            </button>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Rank</th>
                  <th className="px-2 py-3 font-medium">Candidate</th>
                  <th className="px-2 py-3 font-medium">Result</th>
                  <th className="px-2 py-3 font-medium">Score</th>
                  <th className="px-2 py-3 font-medium">Matched Skills</th>
                  <th className="px-5 py-3 font-medium text-right">Download</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const score = Number(r.probability ?? r.score ?? 0);
                  return (
                    <tr
                      key={i}
                      className="border-b border-border/40 last:border-0 hover:bg-surface-elevated/50"
                    >
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                            r.rank === 1
                              ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                              : "bg-surface-elevated text-muted-foreground",
                          )}
                        >
                          {r.rank}
                        </span>
                      </td>
                      <td className="px-2 py-3 font-medium">{r.candidate_name ?? "—"}</td>
                      <td className="px-2 py-3">
                        <ResultBadge result={String(r.result ?? "")} />
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-elevated">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(100, score)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{Math.round(score)}%</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {r.matched_skills?.length ?? 0} skills
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => {
                            const blob = new Blob([JSON.stringify(r, null, 2)], {
                              type: "application/json",
                            });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${r.candidate_name ?? "candidate"}-report.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
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
        </div>
      )}
    </div>
  );
}
