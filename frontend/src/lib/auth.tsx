import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    // Set up listener BEFORE getSession (best practice)
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .finally(() => setLoading(false));
    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback<AuthContextValue["signInWithPassword"]>(
    async (email, password) => {
      if (!isSupabaseConfigured) return { error: "Supabase is not configured." };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signUpWithPassword = useCallback<AuthContextValue["signUpWithPassword"]>(
    async (email, password, fullName) => {
      if (!isSupabaseConfigured)
        return { error: "Supabase is not configured.", needsConfirmation: false };
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: fullName ? { full_name: fullName } : undefined,
        },
      });
      if (error) return { error: error.message, needsConfirmation: false };
      // If a session is returned, email confirmation is OFF
      const needsConfirmation = !data.session;
      return { error: null, needsConfirmation };
    },
    [],
  );

  const signInWithGoogle = useCallback<AuthContextValue["signInWithGoogle"]>(async () => {
    if (!isSupabaseConfigured) return { error: "Supabase is not configured." };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback<AuthContextValue["resetPassword"]>(async (email) => {
    if (!isSupabaseConfigured) return { error: "Supabase is not configured." };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  }, []);

  const updatePassword = useCallback<AuthContextValue["updatePassword"]>(async (newPassword) => {
    if (!isSupabaseConfigured) return { error: "Supabase is not configured." };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      configured: isSupabaseConfigured,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [
      user,
      session,
      loading,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
