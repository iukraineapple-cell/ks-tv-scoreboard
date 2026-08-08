import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { requireSupabase, supabase } from "./supabase";
import { getCurrentUserProfile, UserProfile } from "./supabase-queries";

type AuthContextValue = {
  user: User | null;
  appUser: UserProfile | null;
  session: Session | null;
  isPending: boolean;
  redirectToLogin: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAppUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<UserProfile | null>(null);
  const [isPending, setIsPending] = useState(true);

  const fetchProfile = async () => {
    try {
      if (!supabase) return;
      const profile = await getCurrentUserProfile();
      setAppUser(profile);
    } catch (err) {
      console.error("Failed to load user profile:", err);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setIsPending(false);
      return;
    }
    const client = requireSupabase();
    
    client.auth.getSession()
      .then(async ({ data }) => {
        setSession(data.session);
        if (data.session) {
          await fetchProfile();
        }
      })
      .catch((err) => {
        console.error("Error getting session:", err);
      })
      .finally(() => {
        setIsPending(false);
      });

    const { data: listener } = client.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        await fetchProfile();
      } else {
        setAppUser(null);
      }
      setIsPending(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    appUser,
    session,
    isPending,
    redirectToLogin: async () => {
      await requireSupabase().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
    },
    loginWithEmail: async (email, password) => {
      const client = requireSupabase();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      setSession(data.session);
      await fetchProfile();
      return { success: true };
    },
    signUpWithEmail: async (email, password, name) => {
      const client = requireSupabase();
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
      });
      if (error) return { success: false, error: error.message };
      setSession(data.session);
      await fetchProfile();
      return { success: true };
    },
    logout: async () => {
      await requireSupabase().auth.signOut();
      setAppUser(null);
      setSession(null);
    },
    refreshAppUser: fetchProfile,
  }), [isPending, session, appUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
