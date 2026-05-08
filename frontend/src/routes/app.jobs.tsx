import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Briefcase, Sparkles, X, Inbox, Search } from "lucide-react";
import { api, type JobDescription } from "@/lib/api";
import { useLocalStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/jobs")({
  head: () => ({
    meta: [
      { title: "Job Repository — ResumeSift" },
      { name: "description", content: "Save and manage job descriptions to screen against." },
    ],
  }),
  component: JobsPage,
});

type Form = { title: string; department: string; description: string };

function JobsPage() {
  const navigate = useNavigate();
  const { jobs, addJob, updateJob, deleteJob } = useLocalStore();
  const [remoteJobs, setRemoteJobs] = useState<JobDescription[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({ title: "", department: "", description: "" });
  const [errors, setErrors] = useState<Partial<Form>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  useEffect(() => {
    api
      .get<JobDescription[]>("/jobs")
      .then((res) => setRemoteJobs(Array.isArray(res) ? res : []))
      .catch(() => setRemoteJobs([]));
  }, []);

  const allJobs = [
    ...remoteJobs.map((j) => ({
      id: String(j.id),
      title: j.title,
      department: j.department ?? "",
      description: j.description ?? "",
      created_at: j.created_at ?? "",
      candidates_screened: j.candidates_screened ?? 0,
      remote: true,
    })),
    ...jobs.map((j) => ({ ...j, remote: false })),
  ];

  const departments = Array.from(
    new Set(allJobs.map((j) => j.department).filter((d) => d && d.trim().length > 0)),
  ).sort();

  const q = query.trim().toLowerCase();
  const filteredJobs = allJobs.filter((j) => {
    if (departmentFilter !== "all" && (j.department || "") !== departmentFilter) return false;
    if (!q) return true;
    return (
      j.title.toLowerCase().includes(q) ||
      (j.department || "").toLowerCase().includes(q) ||
      (j.description || "").toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: "", department: "", description: "" });
    setErrors({});
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const j = jobs.find((x) => x.id === id);
    if (!j) return;
    setEditingId(id);
    setForm({ title: j.title, department: j.department, description: j.description });
    setErrors({});
    setOpen(true);
  };

  const validate = () => {
    const e: Partial<Form> = {};
    if (!form.title.trim()) e.title = "Title is required";
    else if (form.title.length > 120) e.title = "Title is too long";
    if (form.department.length > 60) e.department = "Department is too long";
    if (!form.description.trim()) e.description = "Description is required";
    else if (form.description.length > 8000) e.description = "Description is too long";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    if (editingId) {
      updateJob(editingId, form);
    } else {
      const job = addJob(form);
      // Best-effort POST to backend
      api.post("/jobs", form).catch(() => void job);
    }
    setOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {filteredJobs.length} of {allJobs.length} job descriptions
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add New Job
        </button>
      </div>

      {allJobs.length > 0 && (
        <div className="surface flex flex-col gap-2 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, department, or keyword in description…"
              className="surface-elev w-full rounded-lg border border-border py-2 pl-9 pr-9 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="surface-elev rounded-lg border border-border px-3 py-2 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-52"
          >
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {(query || departmentFilter !== "all") && (
            <button
              onClick={() => {
                setQuery("");
                setDepartmentFilter("all");
              }}
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {allJobs.length === 0 ? (
        <div className="surface flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-5 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Inbox className="h-8 w-8" />
          </div>
          <h3 className="text-base font-semibold">No saved jobs yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first job description to start screening candidates.
          </p>
          <button
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add a job
          </button>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="surface flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-5 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold">No jobs match your filters</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different keyword or clear the filters.
          </p>
          <button
            onClick={() => {
              setQuery("");
              setDepartmentFilter("all");
            }}
            className="mt-5 rounded-lg border border-border bg-surface-elevated px-4 py-2 text-sm font-medium hover:bg-surface"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredJobs.map((j) => (
            <div
              key={j.id}
              className="surface group flex flex-col rounded-xl border border-border/60 p-5 transition hover:border-primary/30"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold">{j.title}</h3>
                  {j.department && (
                    <span className="mt-1 inline-block rounded-md bg-surface-elevated px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {j.department}
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                {j.description || "No description."}
              </p>

              <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {j.created_at
                    ? `Added ${new Date(j.created_at).toLocaleDateString()}`
                    : "Recently added"}
                </span>
                <span className="rounded-md bg-surface-elevated px-2 py-0.5">
                  {j.candidates_screened ?? 0} screened
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() =>
                    navigate({ to: "/app/single", search: { job: String(j.id) } as never })
                  }
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/25"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Use for Screening
                </button>
                {!j.remote && (
                  <>
                    <button
                      onClick={() => openEdit(j.id)}
                      className="rounded-md border border-border bg-surface-elevated p-1.5 text-muted-foreground hover:text-foreground"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(j.id)}
                      className="rounded-md border border-border bg-surface-elevated p-1.5 text-muted-foreground hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="surface w-full max-w-lg rounded-2xl border border-border/60 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">{editingId ? "Edit Job" : "Add New Job"}</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-surface-elevated"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Job Title
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={cn(
                    "surface-elev w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2",
                    errors.title
                      ? "border-destructive/60 focus:ring-destructive/20"
                      : "border-border focus:border-primary/50 focus:ring-primary/20",
                  )}
                  placeholder="e.g. Senior Frontend Engineer"
                />
                {errors.title && (
                  <p className="mt-1 text-[11px] text-destructive">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Department
                </label>
                <input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="surface-elev w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. Engineering"
                />
                {errors.department && (
                  <p className="mt-1 text-[11px] text-destructive">{errors.department}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Job Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={cn(
                    "surface-elev min-h-40 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2",
                    errors.description
                      ? "border-destructive/60 focus:ring-destructive/20"
                      : "border-border focus:border-primary/50 focus:ring-primary/20",
                  )}
                  placeholder="Paste the full JD here…"
                />
                {errors.description && (
                  <p className="mt-1 text-[11px] text-destructive">{errors.description}</p>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border bg-surface-elevated px-4 py-2 text-sm font-medium hover:bg-surface"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {editingId ? "Save Changes" : "Add Job"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="surface w-full max-w-sm rounded-2xl border border-border/60 p-6">
            <h3 className="text-base font-semibold">Delete this job?</h3>
            <p className="mt-1 text-sm text-muted-foreground">This action cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-border bg-surface-elevated px-4 py-2 text-sm font-medium hover:bg-surface"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteJob(confirmDelete);
                  setConfirmDelete(null);
                }}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
