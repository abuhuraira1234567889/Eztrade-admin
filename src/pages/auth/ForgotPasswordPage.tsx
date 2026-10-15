import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthSplit } from "@/components/cypher/AuthSplit";
import { errorBoxCls, inputCls } from "./auth-styles";

export default function ForgotPasswordPage() {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const origin = window.location.origin;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      toast.error(resetError.message);
      return;
    }
    setSent(true);
    toast.success(t("common.checkEmailHeading"));
  }

  return (
    <AuthSplit>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-xs text-purple mb-2">{t("common.brandEyebrow")}</div>
          <h1 className="text-3xl font-display font-semibold gradient-purple">
            {t("forgotPassword.heading")}
          </h1>
          <p className="text-muted-foreground text-sm mt-2">{t("forgotPassword.subtitle")}</p>
        </div>

        {sent ? (
          <div className="bg-surface border border-border rounded-xl p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-green-dim text-green grid place-items-center mx-auto mb-3">
              ✓
            </div>
            <h2 className="text-lg font-display font-bold">{t("common.checkEmailHeading")}</h2>
            <p className="text-sm text-secondary-foreground mt-2 leading-relaxed">
              {t("forgotPassword.sentBody", { email })}
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block text-xs uppercase tracking-wider text-purple hover:underline"
            >
              {t("common.backToSignIn")}
            </Link>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="space-y-3 bg-surface border border-border rounded-xl p-5 shadow-sm"
          >
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("common.email")}
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={"mt-1 " + inputCls}
              />
            </label>

            {error && <div className={errorBoxCls}>{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-purple text-white font-semibold text-sm hover:bg-purple-700 transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? t("forgotPassword.submitLoading") : t("forgotPassword.submit")}
            </button>

            <div className="flex justify-between items-center text-xs text-muted-foreground pt-2">
              <Link to="/login" className="hover:text-purple">
                {t("common.backToSignIn")}
              </Link>
              <Link to="/sign-up" className="hover:text-purple font-semibold">
                {t("common.createAccount")}
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthSplit>
  );
}
