import { Suspense, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { consumeAuthRedirectReason } from "@/lib/auth-session";
import { supabase } from "@/lib/supabase/client";
import { safePath } from "@/lib/safe-path";
import { toast } from "sonner";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { PasswordInput } from "@/components/cypher/PasswordInput";
import { EztradeLogo } from "@/components/cypher/EztradeLogo";
import { AuthThemeToggle } from "@/components/cypher/AuthThemeToggle";
import { errorBoxCls, inputCls, submitBtnCls } from "./auth-styles";

/**
 * Admin Console login - deliberately distinct from the consumer (user-side)
 * login. Where the user side uses the marketing split-screen (AuthSplit +
 * AuthBrandPanel: equity curve, cycling verbs, "create account"), the admin
 * panel uses a single, focused, security-forward console card on a dark
 * technical backdrop (dotted grid + ambient glow, monospace chrome, a lock
 * badge and a "restricted access" framing). The auth logic is unchanged.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFallback() {
  const { t } = useTranslation("auth");
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-xs text-muted-foreground tracking-wider">{t("common.loading")}</div>
    </div>
  );
}

function LoginForm() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTo = safePath(params.get("redirect"));
  const sessionExpiredShown = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionExpiredShown.current) return;
    const urlReason = params.get("reason") === "session_expired";
    const storageReason = consumeAuthRedirectReason() === "session_expired";
    if (!urlReason && !storageReason) return;
    sessionExpiredShown.current = true;
    toast.message(t("login.sessionExpired"));
  }, [params, t]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      toast.error(signInError.message);
      return;
    }
    toast.success(t("login.heading"));
    navigate(redirectTo);
  }

  return (
    <div className="admin-auth relative min-h-screen w-full overflow-hidden bg-background">
      {/* technical backdrop: dotted grid + ambient indigo→purple glow */}
      <div aria-hidden="true" className="admin-auth__grid" />
      <div aria-hidden="true" className="admin-auth__glow" />

      {/* theme switcher, pinned top-right like the rest of the auth screens */}
      <div className="absolute right-4 top-4 z-20">
        <AuthThemeToggle />
      </div>

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="admin-auth__rise w-full max-w-[26rem]">
          {/* brand + restricted-access ribbon */}
          <div className="mb-6 flex items-center justify-between">
            <EztradeLogo wordmark height={20} />
            <span className="admin-auth__badge">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {t("admin.badge")}
            </span>
          </div>

          <div className="admin-auth__card">
            {/* top accent rail signals "console", not "marketing" */}
            <div aria-hidden="true" className="admin-auth__rail" />

            <div className="px-6 pb-6 pt-7">
              <div className="mb-6 flex items-start gap-3">
                <span className="admin-auth__lock" aria-hidden="true">
                  <Lock className="h-4 w-4" />
                </span>
                <div>
                  <div className="admin-auth__eyebrow">{t("admin.eyebrow")}</div>
                  <h1 className="font-display text-2xl font-semibold leading-tight text-foreground">
                    {t("admin.heading")}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">{t("admin.subtitle")}</p>
                </div>
              </div>

              <form onSubmit={onSubmit} className="space-y-3">
                <label className="block">
                  <span className="admin-auth__label">{t("common.email")}</span>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={"mt-1 " + inputCls}
                  />
                </label>
                <label className="block">
                  <span className="admin-auth__label">{t("common.password")}</span>
                  <PasswordInput
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    wrapperClassName="mt-1"
                    className={inputCls}
                  />
                </label>

                {error && <div className={errorBoxCls}>{error}</div>}

                <button type="submit" disabled={loading} className={submitBtnCls}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? t("login.submitLoading") : t("login.submit")}
                </button>

                <div className="flex justify-end pt-1 text-xs text-muted-foreground">
                  <Link to="/forgot-password" className="hover:text-purple">
                    {t("login.forgotPassword")}
                  </Link>
                </div>
              </form>
            </div>

            {/* secure footer strip inside the card */}
            <div className="admin-auth__note">
              <span className="admin-auth__notedot" aria-hidden="true" />
              {t("admin.secureNote")}
            </div>
          </div>

          <p className="admin-auth__footer">{t("admin.footer")}</p>
        </div>
      </main>

      {/* Component-scoped styling. Prefixed `admin-auth-` so it never leaks. */}
      <style>{`
        /* faint code grid - built from the theme's border colour so it adapts
           to light/dark automatically */
        .admin-auth__grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(to right, var(--border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--border) 1px, transparent 1px);
          background-size: 44px 44px;
          opacity: .35;
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 38%, #000 35%, transparent 78%);
          mask-image: radial-gradient(ellipse 70% 60% at 50% 38%, #000 35%, transparent 78%);
        }

        /* ambient brand glow - indigo into purple, a single "moment" */
        .admin-auth__glow {
          position: absolute;
          left: 50%;
          top: -14%;
          width: 52rem;
          height: 36rem;
          transform: translateX(-50%);
          pointer-events: none;
          background:
            radial-gradient(closest-side, color-mix(in srgb, var(--color-purple) 30%, transparent), transparent 70%),
            radial-gradient(closest-side, color-mix(in srgb, var(--color-indigo-mark) 26%, transparent), transparent 72%);
          background-position: 60% 30%, 38% 64%;
          background-repeat: no-repeat;
          background-size: 60% 80%, 55% 75%;
          opacity: .55;
          filter: blur(8px);
        }

        /* restricted-access ribbon */
        .admin-auth__badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 9999px;
          border: 1px solid color-mix(in srgb, var(--color-purple) 35%, var(--border));
          background: color-mix(in srgb, var(--color-purple) 12%, transparent);
          color: var(--color-purple);
          font-family: var(--font-code);
          font-size: 10.5px;
          letter-spacing: .12em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        /* the console card */
        .admin-auth__card {
          position: relative;
          overflow: hidden;
          border-radius: var(--radius-xl, 16px);
          border: 1px solid var(--border-strong, var(--border));
          background: var(--bg-surface);
          box-shadow: var(--shadow-elev-lg, 0 24px 60px -24px rgba(0,0,0,.55));
        }

        /* top accent rail */
        .admin-auth__rail {
          height: 3px;
          width: 100%;
          background: linear-gradient(90deg, var(--color-indigo-mark), var(--color-purple), var(--color-purple-400, var(--color-purple)));
        }

        .admin-auth__lock {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: none;
          height: 36px;
          width: 36px;
          border-radius: 10px;
          color: var(--color-purple);
          border: 1px solid color-mix(in srgb, var(--color-purple) 30%, var(--border));
          background: color-mix(in srgb, var(--color-purple) 10%, transparent);
        }

        .admin-auth__eyebrow {
          font-family: var(--font-code);
          font-size: 11px;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: var(--color-purple);
          margin-bottom: 2px;
        }

        .admin-auth__label {
          display: block;
          font-family: var(--font-code);
          font-size: 11px;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        /* secure footer strip inside the card */
        .admin-auth__note {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 24px;
          border-top: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg-elevated) 60%, transparent);
          font-size: 11.5px;
          color: var(--text-muted);
        }
        .admin-auth__notedot {
          height: 7px;
          width: 7px;
          flex: none;
          border-radius: 9999px;
          background: var(--color-signal-long);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-signal-long) 22%, transparent);
        }

        .admin-auth__footer {
          margin-top: 22px;
          text-align: center;
          font-family: var(--font-code);
          font-size: 10.5px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .admin-auth__rise {
          animation: admin-auth-rise .5s var(--ease-transform, cubic-bezier(.22,.61,.36,1)) both;
        }
        @keyframes admin-auth-rise {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .admin-auth__rise { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
    </div>
  );
}
