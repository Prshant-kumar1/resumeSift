import { create } from "zustand";
import { persist } from "zustand/middleware";

type AppState = {
  threshold: number;
  privacyMode: boolean;
  apiBaseUrl: string;
  displayName: string;
  email: string;
  role: string;
  setThreshold: (t: number) => void;
  setPrivacyMode: (v: boolean) => void;
  setApiBaseUrl: (v: string) => void;
  setProfile: (p: { displayName?: string; email?: string; role?: string }) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      threshold: 50,
      privacyMode: false,
      apiBaseUrl: "https://resumesift-backend.onrender.com/api/v1",
      displayName: "Recruiter",
      email: "recruiter@resumesift.io",
      role: "Hiring Manager",
      setThreshold: (threshold) => set({ threshold }),
      setPrivacyMode: (privacyMode) => set({ privacyMode }),
      setApiBaseUrl: (apiBaseUrl) => set({ apiBaseUrl }),
      setProfile: (p) => set((s) => ({ ...s, ...p })),
    }),
    { name: "resumesift-app" },
  ),
);

// Local-only data fallback (when API unreachable)
type LocalJob = {
  id: string;
  title: string;
  department: string;
  description: string;
  created_at: string;
  candidates_screened: number;
};

type LocalState = {
  jobs: LocalJob[];
  history: unknown[];
  addJob: (j: Omit<LocalJob, "id" | "created_at" | "candidates_screened">) => LocalJob;
  updateJob: (id: string, patch: Partial<LocalJob>) => void;
  deleteJob: (id: string) => void;
  addHistory: (h: unknown) => void;
  clearHistory: () => void;
};

export const useLocalStore = create<LocalState>()(
  persist(
    (set, get) => ({
      jobs: [],
      history: [],
      addJob: (j) => {
        const job: LocalJob = {
          ...j,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          candidates_screened: 0,
        };
        set({ jobs: [job, ...get().jobs] });
        return job;
      },
      updateJob: (id, patch) =>
        set({ jobs: get().jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) }),
      deleteJob: (id) => set({ jobs: get().jobs.filter((j) => j.id !== id) }),
      addHistory: (h) => set({ history: [h, ...get().history].slice(0, 200) }),
      clearHistory: () => set({ history: [] }),
    }),
    { name: "resumesift-local" },
  ),
);
