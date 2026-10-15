import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { EmailOtpType, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { safePath } from "@/lib/safe-path";
import { syncSignupProfileFromMetadata } from "@/lib/sync-signup-profile";

/** Wait for detectSessionInUrl or onAuthStateChange to finish exchanging the code. */
async function waitForSession(timeoutMs: number): Promise<Session | null> {
  const { data: initial } = await supabase.auth.getSession();
  if (initial.session) return initial.session;

  return new Promise((resolve) => {
    const deadline = window.setTimeout(() => {
      sub.subscription.unsubscribe();
      void supabase.auth.getSession().then(({ data }) => resolve(data.session));
    }, timeoutMs);

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        window.clearTimeout(deadline);
        sub.subscription.unsubscribe();
        resolve(session);
      }
    });
  });
}

/**
 * Handles Supabase email confirmation, magic-link, and OAuth callbacks.
 * With detectSessionInUrl enabled, the client may exchange ?code= before this
 * effect runs - we fall back to an existing session before reporting missing_code.
 */
export default function AuthCallbackPage() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const token_hash = params.get("token_hash");
    const type = params.get("type") as EmailOtpType | null;
    const next = params.get("next");
    const urlError = params.get("error_description") ?? params.get("error");

    void (async () => {
      if (urlError) {
        setError(urlError);
        return;
      }

      const hashType = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type");
      const isRecovery = type === "recovery" || hashType === "recovery";

      if (token_hash && type) {
        const { error: otpError } = await supabase.auth.verifyOtp({ token_hash, type });
        if (otpError) {
          setError(otpError.message);
          return;
        }
      } else if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          // detectSessionInUrl may have already consumed this code.
          const session = await waitForSession(500);
          if (!session) {
            setError(exchangeError.message);
            return;
          }
        }
      } else {
        const session = await waitForSession(3000);
        if (!session) {
          setError("missing_code");
          return;
        }
      }

      if (isRecovery) {
        navigate("/reset-password", { replace: true });
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await syncSignupProfileFromMetadata(user);
      }

      if (next) {
        navigate(safePath(next), { replace: true });
        return;
      }

      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      navigate("/onboarding/verify", { replace: true });
    })();
  }, [params, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-xl font-display font-semibold text-red">Sign-in failed</h1>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-6 text-sm text-purple hover:underline"
          >
            {t("common.backToSignIn")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-xs text-muted-foreground tracking-wider">{t("common.loading")}</div>
    </div>
  );
}
