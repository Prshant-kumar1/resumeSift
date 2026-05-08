import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  ArrowRight,
  FileSearch,
  Layers,
  Briefcase,
  ShieldCheck,
  Download,
  BarChart3,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ResumeSift — AI Resume Screening for Recruiters" },
      {
        name: "description",
        content:
          "Screen hundreds of resumes against any job description in seconds. AI-powered match scoring, batch processing, and ranked candidates — built for hiring teams.",
      },
      { property: "og:title", content: "ResumeSift — AI Resume Screening" },
      {
        property: "og:description",
        content: "AI-powered resume screening that surfaces your best candidates instantly.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="bg-aurora min-h-screen text-foreground">
      {/* Top nav */}
      <header className="sticky top-3 z-30 mx-auto mt-3 flex w-[min(1200px,calc(100%-1.5rem))] items-center justify-between rounded-full glass px-4 py-2.5 sm:px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">
            Resume<span className="text-primary">Sift</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition hover:text-foreground">
            Features
          </a>
          <a href="#how" className="transition hover:text-foreground">
            How it works
          </a>
          <a href="#cta" className="transition hover:text-foreground">
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link
            to="/login"
            className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            to="/login"
            search={{ mode: "signup" }}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="glass mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">
              <Zap className="h-3 w-3 text-primary" />
              Built for high-volume hiring
            </div>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-[64px]">
              Screen <span className="text-gradient-teal">100s of resumes</span>
              <br className="hidden sm:block" /> in seconds.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              ResumeSift reads every resume against your job description, scores the match, and
              ranks the best candidates — so your team only spends time on the people worth
              talking to.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/login"
                search={{ mode: "signup" }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
              >
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how"
                className="glass inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-elevated/40"
              >
                See how it works
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                No credit card
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                GDPR-friendly anonymization
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                CSV import &amp; export
              </span>
            </div>
          </div>

          {/* Glass mock card */}
          <div className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-primary/30 via-transparent to-primary/10 blur-2xl" />
              <div className="glass-strong rounded-2xl p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Screening result
                  </div>
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                    Strong match
                  </span>
                </div>

                <div className="flex items-center gap-5">
                  <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                    <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke="var(--color-border)"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke="var(--color-primary)"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        strokeDashoffset={`${2 * Math.PI * 42 * (1 - 0.87)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold tracking-tight">87%</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Senior Frontend Engineer</p>
                    <p className="text-xs text-muted-foreground">Anonymous candidate · 4y exp</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {["React", "TypeScript", "Tailwind", "GraphQL"].map((t) => (
                        <span
                          key={t}
                          className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  {[
                    { l: "Skills", v: "92%" },
                    { l: "Experience", v: "84%" },
                    { l: "Keywords", v: "85%" },
                  ].map((m) => (
                    <div key={m.l} className="glass rounded-lg px-2 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {m.l}
                      </p>
                      <p className="text-sm font-semibold">{m.v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating mini card */}
              <div className="glass absolute -bottom-6 -left-6 hidden rounded-xl px-3 py-2.5 text-xs sm:flex sm:items-center sm:gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Layers className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="font-semibold">142 resumes</p>
                  <p className="text-[10px] text-muted-foreground">screened in 38s</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            What you get
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything a recruiter needs to move faster.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: FileSearch,
              title: "AI match scoring",
              desc: "Each resume gets a 0-100 score plus an explanation of matched and missing skills.",
            },
            {
              icon: Layers,
              title: "Batch screening",
              desc: "Upload a CSV and get every candidate scored and ranked in one pass.",
            },
            {
              icon: Briefcase,
              title: "Job repository",
              desc: "Save job descriptions once, reuse them across screenings, track per-role activity.",
            },
            {
              icon: ShieldCheck,
              title: "Privacy mode",
              desc: "Anonymize candidate names instantly to keep evaluations bias-free.",
            },
            {
              icon: Download,
              title: "CSV export",
              desc: "Send shortlists to ATS or share with hiring managers in one click.",
            },
            {
              icon: BarChart3,
              title: "Hiring insights",
              desc: "Match rate, throughput and confidence trends in a live dashboard.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="glass group rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-glow"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps to a ranked shortlist.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { n: "01", t: "Paste your job description", d: "Save once, reuse forever." },
            { n: "02", t: "Upload resumes", d: "PDF, TXT, or CSV — single or in bulk." },
            { n: "03", t: "Get ranked candidates", d: "Match scores, missing skills, export." },
          ].map((s) => (
            <div key={s.n} className="glass-strong relative overflow-hidden rounded-2xl p-6">
              <span className="absolute -top-2 right-4 text-7xl font-black text-primary/10">
                {s.n}
              </span>
              <h3 className="text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section id="cta" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="glass-strong relative overflow-hidden rounded-3xl px-8 py-12 text-center sm:px-12 sm:py-16">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Stop reading resumes one by one.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Create a free account and screen your first 50 candidates today.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/login"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="glass inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition hover:bg-surface-elevated/40"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-6 pb-10">
        <div className="glass flex flex-col items-center justify-between gap-3 rounded-2xl px-6 py-4 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>© {new Date().getFullYear()} ResumeSift. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#how" className="hover:text-foreground">
              How it works
            </a>
            <Link to="/login" className="hover:text-foreground">
              Log in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
