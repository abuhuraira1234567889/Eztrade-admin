import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { FIELD_LIMITS } from "@/lib/field-limits";
import { signUp, detectSignupCountry, type DetectedCountry } from "@/services/auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/cypher/PasswordInput";
import { AuthSplit } from "@/components/cypher/AuthSplit";
import { errorBoxCls, inputCls, submitBtnCls } from "./auth-styles";

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpFallback />}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpFallback() {
  const { t } = useTranslation("auth");
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-xs text-muted-foreground tracking-wider">{t("common.loading")}</div>
    </div>
  );
}

function SignUpForm() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  // const [params] = useSearchParams();
  // const refCode = params.get("ref") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [detected, setDetected] = useState<DetectedCountry | null>(null);
  // const [referralWarning, setReferralWarning] = useState<string | null>(null);

  // Country is detected from the IP in the BACKGROUND - there's no country field.
  // If a VPN/proxy is detected we warn (the captured country wouldn't be the
  // user's real one); the server re-checks and is authoritative at submit. If
  // detection fails entirely we say nothing and proceed with no country (the
  // server stores null) - a detection outage never blocks sign-up.
  useEffect(() => {
    let cancelled = false;
    detectSignupCountry().then((d) => {
      if (cancelled) return;
      setDetected(d);
      if (d?.blocked) toast.error(t("signUp.vpnBlocked"));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vpnBlocked = detected?.blocked === true;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (vpnBlocked) {
      setError(t("signUp.vpnBlocked"));
      toast.error(t("signUp.vpnBlocked"));
      return;
    }
    setLoading(true);
    setError(null);
    // setReferralWarning(null);

    const fd = new FormData(e.currentTarget);
    const result = await signUp(fd);

    if ("error" in result) {
      setLoading(false);
      setError(result.error);
      toast.error(result.error);
      return;
    }

    // if (result.referralWarning) {
    //   setReferralWarning(result.referralWarning);
    //   toast.warning(result.referralWarning);
    // }

    if (result.needsConfirmation) {
      setLoading(false);
      setSuccess(true);
      toast.success(t("common.checkEmailHeading"));
      return;
    }

    toast.success(t("signUp.heading"));
    navigate("/");
  }

  if (success) {
    return (
      <AuthSplit>
        <div className="w-full max-w-md text-center">
          <div className="text-xs text-purple mb-2">{t("common.brandEyebrow")}</div>
          <h1 className="text-3xl font-display font-semibold gradient-purple">
            {t("common.checkEmailHeading")}
          </h1>
          <p className="text-secondary-foreground text-sm mt-4 leading-relaxed">
            {t("signUp.successBody")}
          </p>
          {/* {referralWarning && (
            <p className="text-xs text-amber mt-3 px-4">{referralWarning}</p>
          )} */}
          <Link
            to="/login"
            className="mt-8 inline-block text-xs uppercase tracking-wider text-purple hover:underline"
          >
            {t("common.backToSignIn")}
          </Link>
        </div>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit>
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-xs text-purple mb-2">{t("common.brandEyebrow")}</div>
          <h1 className="text-3xl font-display font-semibold gradient-purple">
            {t("signUp.heading")}
          </h1>
          <p className="text-muted-foreground text-sm mt-2">{t("signUp.subtitle")}</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-3 bg-surface border border-border rounded-xl p-5 shadow-sm"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("signUp.firstName")}>
              <input name="first_name" required maxLength={FIELD_LIMITS.firstName} className={inputCls} />
            </Field>
            <Field label={t("signUp.lastName")}>
              <input name="last_name" required maxLength={FIELD_LIMITS.lastName} className={inputCls} />
            </Field>
          </div>

          <Field label={t("common.email")}>
            <input type="email" name="email" autoComplete="email" required className={inputCls} />
          </Field>

          <Field label={t("common.password")}>
            <PasswordInput
              name="password"
              autoComplete="new-password"
              required
              minLength={FIELD_LIMITS.passwordMin}
              maxLength={FIELD_LIMITS.password}
              className={inputCls}
            />
            <span className="text-[10px] text-muted-foreground mt-1 block">
              {t("signUp.passwordHint")}
            </span>
          </Field>

          {SUPPORTED_LANGUAGES.length > 1 ? (
            <Field label={t("signUp.language")}>
              <select name="language" required defaultValue="en" className={inputCls}>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            // Only one supported language - no picker; submit it silently.
            <input type="hidden" name="language" value={SUPPORTED_LANGUAGES[0]?.code ?? "en"} />
          )}

          {/* Referrals paused - restore referral code field when program returns.
          <Field
            label={
              refCode ? t("signUp.referralCodePrefilled") : t("signUp.referralCodeOptional")
            }
          >
            <input
              name="referral_code"
              defaultValue={refCode}
              maxLength={FIELD_LIMITS.referralCode}
              className={inputCls + " uppercase"}
              placeholder={t("signUp.referralCodePlaceholder")}
            />
          </Field>
          */}

          <label className="flex items-start gap-2 mt-3 text-xs text-muted-foreground leading-relaxed">
            <input type="checkbox" name="agree" required className="mt-0.5" />
            <span>
              {t("signUp.agreePrefix")}{" "}
              <Link to="/terms" className="text-purple hover:underline">
                {t("signUp.termsLink")}
              </Link>{" "}
              {t("signUp.and")}{" "}
              <Link to="/risk" className="text-purple hover:underline">
                {t("signUp.riskLink")}
              </Link>
              .
            </span>
          </label>

          {error && <div className={errorBoxCls}>{error}</div>}
          {/* {referralWarning && !success && (
            <div className="text-xs text-amber px-3 py-2 rounded-md bg-amber/10 border border-amber/20">
              {referralWarning}
            </div>
          )} */}

          <button type="submit" disabled={loading} className={"mt-2 " + submitBtnCls}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? t("signUp.submitLoading") : t("signUp.submit")}
          </button>

          <div className="pt-2 text-center text-xs text-muted-foreground">
            {t("signUp.alreadyHaveAccount")}{" "}
            <Link to="/login" className="text-purple hover:underline font-semibold">
              {t("signUp.signInLink")}
            </Link>
          </div>
        </form>
      </div>
    </AuthSplit>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
