import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing you in… — ResumeSift" }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!isSupabaseConfigured) {
        navigate({ to: "/login" });
        return;
      }
      // detectSessionInUrl handles OAuth + magic link automatically.
      // Poll briefly for the session (PKCE token exchange happens async).
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          navigate({ to: "/app" });
          return;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      navigate({ to: "/login" });
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="bg-aurora flex min-h-screen items-center justify-center px-4">
      <div className="glass-strong flex items-center gap-3 rounded-2xl px-6 py-5 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Completing sign-in…
      </div>
    </div>
  );
}
