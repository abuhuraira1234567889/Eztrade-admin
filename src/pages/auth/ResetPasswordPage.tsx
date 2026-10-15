import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/cypher/PasswordInput";
import { AuthSplit } from "@/components/cypher/AuthSplit";
import { errorBoxCls, inputCls, submitBtnCls } from "./auth-styles";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ResetForm />
    </Suspense>
  );
}

function Fallback() {
  const { t } = useTranslation("auth");
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-xs text-muted-foreground tracking-wider">{t("common.loading")}</div>
    </div>
  );
}

function ResetForm() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [linkOk, setLinkOk] = useState(true);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      // Supabase delivers recovery tokens via URL hash; client auto-parses them.
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      setLinkOk(!!session);
      setReady(true);
    }

    void checkSession();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setLinkOk(!!session);
        setReady(true);
        return;
      }
      if (session) {
        setLinkOk(true);
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 8) return setError(t("resetPassword.errorTooShort"));
    if (pwd !== pwd2) return setError(t("resetPassword.errorMismatch"));
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      toast.error(updateError.message);
      return;
    }
    toast.success(t("resetPassword.heading"));
    navigate("/dashboard");
  }

  if (!ready) return <Fallback />;

  if (!linkOk) {
    return (
      <AuthSplit>
        <div className="w-full max-w-sm text-center">
          <div className="text-xs text-purple mb-2">{t("common.brandEyebrow")}</div>
          <h1 className="text-3xl font-display font-semibold text-red">
            {t("resetPassword.linkExpiredHeading")}
          </h1>
          <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
            {t("resetPassword.linkExpiredBody")}
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-block px-4 py-2 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple-700"
          >
            {t("resetPassword.requestNewLink")}
          </Link>
        </div>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-xs text-purple mb-2">{t("common.brandEyebrow")}</div>
          <h1 className="text-3xl font-display font-semibold gradient-purple">
            {t("resetPassword.heading")}
          </h1>
          <p className="text-muted-foreground text-sm mt-2">{t("resetPassword.subtitle")}</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-3 bg-surface border border-border rounded-xl p-5 shadow-sm"
        >
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("resetPassword.newPassword")}
            </span>
            <PasswordInput
              autoComplete="new-password"
              required
              minLength={8}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              wrapperClassName="mt-1"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("resetPassword.confirmPassword")}
            </span>
            <PasswordInput
              autoComplete="new-password"
              required
              minLength={8}
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              wrapperClassName="mt-1"
              className={inputCls}
            />
          </label>

          {error && <div className={errorBoxCls}>{error}</div>}

          <button type="submit" disabled={loading} className={submitBtnCls}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? t("resetPassword.submitLoading") : t("resetPassword.submit")}
          </button>
        </form>
      </div>
    </AuthSplit>
  );
}
