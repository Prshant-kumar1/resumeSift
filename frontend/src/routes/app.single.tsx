import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, FileText, Sparkles, Download, ChevronDown, AlertCircle } from "lucide-react";
import { ResultBadge } from "@/components/ResultBadge";
import { Skeleton } from "@/components/Skeleton";
import { api, type JobDescription, type ScreeningResult } from "@/lib/api";
import { useAppStore, useLocalStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/single")({
  head: () => ({
    meta: [
      { title: "Single Screening — ResumeSift" },
      {
        name: "description",
        content: "Screen a single resume against any job description with AI.",
      },
    ],
  }),
  component: SinglePage,
});

function ScoreGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color =
    clamped >= 70
      ? "var(--color-success)"
      : clamped >= 40
        ? "var(--color-warning)"
        : "var(--color-destructive)";
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  return (
    <div className="relative inline-flex h-36 w-36 items-center justify-center">
      <svg width={144} height={144} viewBox="0 0 144 144" className="-rotate-90">
        <circle cx="72" cy="72" r={r} stroke="oklch(1 0 0 / 8%)" strokeWidth="10" fill="none" />
        <circle
          cx="72"
          cy="72"
          r={r}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tight" style={{ color }}>
          {Math.round(clamped)}%
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          match score
        </span>
      </div>
    </div>
  );
}

function SinglePage() {
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [customJD, setCustomJD] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const localJobs = useLocalStore((s) => s.jobs);
  const addHistory = useLocalStore((s) => s.addHistory);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<JobDescription[]>("/jobs")
      .then((res) => {
        const list = Array.isArray(res) ? res : [];
        setJobs(list.length ? list : (localJobs as unknown as JobDescription[]));
      })
      .catch(() => setJobs(localJobs as unknown as JobDescription[]));
  }, [localJobs]);

  const allJobs = useMemo(() => {
    const seen = new Set<string>();
    const merged = [...jobs, ...(localJobs as unknown as JobDescription[])].filter((j) => {
      const k = String(j.id);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return merged;
  }, [jobs, localJobs]);

  const selectedJob = allJobs.find((j) => String(j.id) === selectedJobId);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    if (file.type === "application/pdf") {
      // PDF binary cannot be extracted without a parser library.
      // Clear any previous text and prompt the user to paste it manually.
      setIsPdf(true);
      setResumeText("");
    } else {
      setIsPdf(false);
      const text = await file.text();
      setResumeText(text);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const submit = async () => {
    setError(null);
    if (!resumeText.trim()) return setError("Resume text is required.");
    const jd = showCustom ? customJD : (selectedJob?.description ?? "");
    if (!jd.trim()) return setError("Please choose a job or paste a custom JD.");

    setLoading(true);
    setResult(null);
    try {
      const res = await api.post<ScreeningResult>("/screening/screen", {
        resume_text: resumeText,
        job_description: jd,
        job_title: selectedJob?.title,
      });
      setResult(res);
      addHistory({
        ...res,
        date: new Date().toISOString(),
        job_role: selectedJob?.title ?? "Custom JD",
      });
    } catch (e) {
      console.error("Screening API error:", e);
      setError(
        "The screening API is currently unreachable. Please check the backend URL in Settings and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* LEFT: Input */}
      <div className="surface flex flex-col gap-4 rounded-xl border border-border/60 p-5">
        <div>
          <h2 className="text-sm font-semibold">Candidate Resume</h2>
          <p className="text-xs text-muted-foreground">Paste resume text or upload a PDF</p>
        </div>

        <div
          ref={dropRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-elevated px-4 py-6 text-center transition hover:border-primary/40"
        >
          <Upload className="mb-2 h-5 w-5 text-primary" />
          <p className="text-xs">
            <label className="cursor-pointer font-semibold text-primary hover:underline">
              Click to upload
              <input
                type="file"
                accept=".pdf,.txt"
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>{" "}
            <span className="text-muted-foreground">or drag & drop a PDF / TXT</span>
          </p>
          {fileName && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-[11px] text-primary">
              <FileText className="h-3 w-3" /> {fileName}
            </p>
          )}
        </div>

        {isPdf && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              PDF text extraction is not supported in the browser. Please paste the resume text
              manually in the box below.
            </span>
          </div>
        )}

        <textarea
          value={resumeText}
          onChange={(e) => {
            setResumeText(e.target.value);
            if (isPdf && e.target.value) setIsPdf(false);
          }}
          placeholder="Or paste the resume text here…"
          className="surface-elev min-h-40 w-full rounded-lg border border-border px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />

        {/* JD Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Job Description</label>
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
                  {j.department ? ` · ${j.department}` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          <button
            onClick={() => setShowCustom((v) => !v)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {showCustom ? "Hide custom JD" : "Or paste a custom JD"}
          </button>
          {showCustom && (
            <textarea
              value={customJD}
              onChange={(e) => setCustomJD(e.target.value)}
              placeholder="Paste the job description…"
              className="surface-elev min-h-32 w-full rounded-lg border border-border px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className={cn(
            "mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60",
            !loading && "glow-ring",
          )}
        >
          <Sparkles className="h-4 w-4" />
          {loading ? "Analyzing…" : "Screen Resume"}
        </button>
      </div>

      {/* RIGHT: Results */}
      <div className="surface rounded-xl border border-border/60 p-5">
        <h2 className="text-sm font-semibold">Screening Result</h2>
        <p className="text-xs text-muted-foreground">AI-powered evaluation</p>

        {loading ? (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-36 w-36 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !result ? (
          <div className="mt-12 flex flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-medium">Awaiting analysis</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Provide a resume and job description, then run the screening to see results here.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="flex flex-wrap items-center gap-5">
              <ScoreGauge score={Number(result.probability ?? result.score ?? 0)} />
              <div className="space-y-2">
                <ResultBadge result={String(result.result ?? "")} />
                <div className="text-xs text-muted-foreground">
                  Confidence:{" "}
                  <span className="font-semibold text-foreground">
                    {Math.round(Number(result.confidence ?? result.probability ?? 0))}%
                  </span>
                </div>
              </div>
            </div>

            {result.matched_skills && result.matched_skills.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Matched Skills
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {result.matched_skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-primary/15 px-2 py-1 text-[11px] font-medium text-primary ring-1 ring-primary/20"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.missing_skills && result.missing_skills.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Missing Skills
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {result.missing_skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive/90 ring-1 ring-destructive/20"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.recommendation && (
              <div className="rounded-lg border border-border/60 bg-surface-elevated p-3 text-xs leading-relaxed text-muted-foreground">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground">
                  Recommendation
                </p>
                {result.recommendation}
              </div>
            )}

            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(result, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `screening-report-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm font-medium transition hover:bg-surface"
            >
              <Download className="h-4 w-4" />
              Download Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
