import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { syncSignupProfileFromMetadata } from "@/lib/sync-signup-profile";
import { forceAuthSignOut } from "@/lib/auth-session";
import {
  clearSessionStart,
  hasSessionStart,
  isSessionExpired,
  recordSessionStart,
} from "@/lib/session-expiry";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function signOutSession(): Promise<void> {
  clearSessionStart();
  await supabase.auth.signOut();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const expireSessionIfNeeded = useCallback(async () => {
    if (!isSessionExpired()) return false;
    await forceAuthSignOut();
    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session && (await expireSessionIfNeeded())) {
        setLoading(false);
        return;
      }

      setSession(data.session);
      if (data.session?.user) {
        void syncSignupProfileFromMetadata(data.session.user);
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_IN") {
        recordSessionStart();
      } else if (event === "SIGNED_OUT") {
        clearSessionStart();
      } else if (event === "INITIAL_SESSION" && next?.user && !hasSessionStart()) {
        recordSessionStart();
      }

      setSession(next);
      if (next?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        void syncSignupProfileFromMetadata(next.user);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [expireSessionIfNeeded]);

  useEffect(() => {
    if (!session) return;

    void expireSessionIfNeeded();
    const interval = window.setInterval(() => {
      void expireSessionIfNeeded();
    }, 60_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void expireSessionIfNeeded();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session, expireSessionIfNeeded]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signOut: async () => {
        await signOutSession();
        setSession(null);
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
