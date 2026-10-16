"use client";

import { useTranslation } from "react-i18next";
import { EztradeLogo } from "@/components/cypher/EztradeLogo";

/**
 * AuthBrandPanel - the desktop-only (>= lg) left info/branding panel of the
 * split-screen auth layout. Renders on --bg-page (never a purple fill), with
 * purple reserved for "moments": the single cycling verb, the self-drawing
 * equity curve, and one ambient glow. The final onboarding step is a real
 * "Copier live" moment reusing the existing .pulse-dot vocabulary.
 *
 * All copy lives in the DOM via the "auth" i18n namespace (auth.panel.*).
 * Decorative SVG is aria-hidden; the cycling verb exposes a stable sr-only
 * phrase. Motion is pure transform/opacity/stroke-dashoffset (no JS loops);
 * a scoped prefers-reduced-motion block forces a calm static end-state because
 * globals.css's global reduced-motion rule would otherwise freeze one-shots
 * on frame 0.
 */

export function AuthBrandPanel() {
  const { t } = useTranslation("auth");

  // Cycling verbs for the third headline line. Guarded against i18n configs
  // that don't return arrays, so a bad config can never throw on .map.
  const verbsRaw = t("panel.verbs", { returnObjects: true });
  const verbs = Array.isArray(verbsRaw) ? (verbsRaw as string[]) : [];

  // The platform's real pillars (pulled from the marketing site). The genuinely
  // live one - daily sessions - keeps the green "live" dot.
  const steps = [
    { key: "academy", live: false },
    { key: "tools", live: false },
    { key: "live", live: true },
  ] as const;

  // The four strategies, taught end-to-end in the Academy.
  const tags = ["aurex", "vektor", "meridian", "halcyon"] as const;

  return (
    <aside
      className="auth-panel relative hidden lg:flex lg:w-[52%] xl:w-[55%] shrink-0
                 flex-col justify-between overflow-hidden
                 bg-background border-r border-border
                 px-[clamp(2.5rem,4vw,4.5rem)] py-[clamp(2.5rem,4vw,4rem)]"
    >
      {/* ambient purple "moment" - decorative only */}
      <div aria-hidden="true" className="auth-glow" />

      {/* TOP - logo + live eyebrow */}
      <header
        className="auth-rise relative z-10 flex items-center justify-between"
        style={{ animationDelay: "0ms" }}
      >
        <EztradeLogo wordmark height={22} />
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span className="pulse-dot auth-dot-live" aria-hidden="true" />
          {t("panel.status")}
        </span>
      </header>

      {/* MIDDLE - the verb wall + the grafted equity-curve focal */}
      <div className="relative z-10 max-w-[36rem]">
        <span className="eyebrow auth-rise" style={{ animationDelay: "80ms" }}>
          {t("panel.eyebrow")}
        </span>

        <h2 className="auth-headline mt-3">
          <span className="auth-line auth-rise" style={{ animationDelay: "150ms" }}>
            {t("panel.headlineLine1")}
          </span>
          <span className="auth-line auth-rise" style={{ animationDelay: "240ms" }}>
            {t("panel.headlineLine2")}
          </span>

          {/* cycling verb slot - decorative; sr-only phrase carries real copy */}
          <span
            className="auth-verbslot auth-rise"
            style={{ animationDelay: "330ms" }}
            aria-hidden="true"
          >
            {verbs.map((v, i) => (
              <span
                key={v}
                className="auth-verb"
                style={{ animationDelay: `${-2.6 * i}s` }}
              >
                {v}
              </span>
            ))}
            {/* underline rule, draws/retracts in sync with each verb swap */}
            <svg
              className="auth-underline"
              viewBox="0 0 240 4"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <line x1="1" y1="2" x2="239" y2="2" />
            </svg>
          </span>
          <span className="sr-only">{t("panel.headlineSr")}</span>
        </h2>

        {/* GRAFT (Market Pulse): self-drawing equity curve focal - quiet, one-shot */}
        <div
          className="auth-rise mt-7"
          style={{ animationDelay: "420ms" }}
          aria-hidden="true"
        >
          <svg
            className="auth-curve-svg block w-full max-w-[30rem]"
            viewBox="0 0 480 120"
            fill="none"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* faint baseline grid */}
            {[30, 60, 90].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="480"
                y2={y}
                stroke="var(--border)"
                strokeWidth="1"
              />
            ))}
            {/* equity line - strokes itself on once */}
            <path
              className="auth-curve"
              d="M4 104 L44 96 L84 100 L124 80 L164 84 L204 62 L244 70 L284 46 L324 52 L364 30 L404 38 L444 16 L476 22"
              stroke="var(--color-purple)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
            />
            {/* head dot lands at the end of the draw */}
            <circle className="auth-curve-head" cx="476" cy="22" r="3.5" fill="var(--text-primary)" />
          </svg>
        </div>
      </div>

      {/* BOTTOM - onboarding ledger (with the grafted "copier live" moment) + tags */}
      <div className="relative z-10 max-w-[34rem]">
        <ol className="auth-ledger" aria-label={t("panel.ledgerLabel")}>
          {steps.map((s, i) => (
            <li
              key={s.key}
              className="auth-step auth-rise"
              style={{ animationDelay: `${500 + i * 90}ms` }}
            >
              <span
                className="auth-step__n"
                style={{ fontFamily: "var(--font-code)" }}
                aria-hidden="true"
              >
                {`0${i + 1}`}
              </span>
              <span
                className={`auth-step__dot${s.live ? " is-live" : ""}`}
                aria-hidden="true"
              />
              <span className="auth-step__body">
                <span className="auth-step__t">{t(`panel.steps.${s.key}.title`)}</span>
                <span className="auth-step__d">{t(`panel.steps.${s.key}.desc`)}</span>
              </span>
            </li>
          ))}
        </ol>

        <ul
          className="auth-tags hairline-t auth-rise"
          style={{ animationDelay: "800ms" }}
        >
          {tags.map((tag, i) => (
            <li key={tag}>
              <span
                className="auth-tags__i"
                style={{ fontFamily: "var(--font-code)" }}
                aria-hidden="true"
              >
                {`0${i + 1}`}
              </span>{" "}
              {t(`panel.tags.${tag}`)}
            </li>
          ))}
        </ul>
      </div>

      {/* Component-scoped keyframes. Class names are prefixed `auth-`. Kept inline
          so the panel is fully self-contained and the reduced-motion overrides
          stay unlayered (they must beat globals.css's @layer base rule). */}
      <style>{`
        /* ambient purple glow - a "moment", never a section fill */
        .auth-glow {
          position: absolute;
          left: -12%;
          bottom: -8%;
          width: 46rem;
          height: 46rem;
          pointer-events: none;
          background: radial-gradient(circle at center, rgba(146,54,218,.16), transparent 62%);
          opacity: .10;
          animation: auth-glow 9s var(--ease-transform) infinite alternate;
          will-change: transform, opacity;
        }
        @keyframes auth-glow {
          from { transform: scale(1); opacity: .10; }
          to   { transform: scale(1.06); opacity: .14; }
        }

        /* live status dot - green override on the existing .pulse-dot vocabulary.
           Recolour BOTH the dot and its ::after halo (globals hardcodes purple). */
        .auth-dot-live { background: var(--color-signal-long); }
        .auth-dot-live::after { background: var(--color-signal-long); }

        /* headline */
        .auth-headline {
          font-family: var(--font-display);
          font-weight: 600;
          line-height: 1.02;
          letter-spacing: -0.025em;
          font-size: clamp(40px, 4.8vw, 70px);
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
        }
        .auth-line { display: block; }

        /* cycling verb slot - fixed height = one line, clips the type-wheel.
           Height is in em so it tracks the clamp() font-size at every breakpoint
           and never crops descenders (g / p / y). */
        .auth-verbslot {
          position: relative;
          display: block;
          height: 1.16em;
          overflow: hidden;
          padding-bottom: .06em;
        }
        .auth-verb {
          position: absolute;
          left: 0;
          top: 0;
          white-space: nowrap;
          color: var(--color-purple);
          -webkit-text-fill-color: var(--color-purple);
          animation: auth-verb 10.4s var(--ease-emphasize) infinite;
          will-change: transform, opacity;
        }
        @keyframes auth-verb {
          0%, 7%    { transform: translateY(100%); opacity: 0; }
          15%, 30%  { transform: translateY(0);    opacity: 1; }
          38%, 100% { transform: translateY(-110%); opacity: 0; }
        }
        .auth-underline {
          position: absolute;
          left: 0;
          bottom: .04em;
          width: 42%;
          height: 4px;
          overflow: visible;
        }
        .auth-underline line {
          stroke: var(--color-purple);
          stroke-width: 2;
          stroke-linecap: round;
          stroke-dasharray: 238;
          stroke-dashoffset: 238;
          animation: auth-underline 2.6s var(--ease-emphasize) infinite;
          will-change: stroke-dashoffset;
        }
        @keyframes auth-underline {
          0%   { stroke-dashoffset: 238; }
          26%  { stroke-dashoffset: 0; }
          74%  { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 238; }
        }

        /* GRAFT: equity curve draws itself on once, then rests */
        .auth-curve {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          filter: drop-shadow(0 0 6px rgba(146,54,218,.40));
          animation: auth-draw 2.4s var(--ease-transform) .55s forwards;
        }
        @keyframes auth-draw { to { stroke-dashoffset: 0; } }
        .auth-curve-head {
          opacity: 0;
          animation: auth-fade .4s linear 2.7s forwards;
        }
        @keyframes auth-fade { to { opacity: 1; } }

        /* entrance rise - fires once on mount */
        .auth-rise {
          opacity: 0;
          animation: auth-rise .6s var(--ease-transform) both;
        }
        @keyframes auth-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: none; }
        }

        /* onboarding ledger */
        .auth-ledger {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin: 0 0 22px;
          padding: 0;
          list-style: none;
        }
        .auth-step {
          display: grid;
          grid-template-columns: auto auto 1fr;
          align-items: center;
          gap: 14px;
        }
        .auth-step__n {
          font-size: 12px;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
        }
        .auth-step__dot {
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: var(--text-muted);
          opacity: .5;
        }
        /* GRAFT: the "copier live" proof moment */
        .auth-step__dot.is-live {
          background: var(--color-signal-long);
          opacity: 1;
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-signal-long) 22%, transparent);
          animation: auth-livedot 2s ease-in-out 2.7s infinite;
        }
        @keyframes auth-livedot {
          0%, 100% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-signal-long) 22%, transparent); }
          50%      { box-shadow: 0 0 0 7px color-mix(in srgb, var(--color-signal-long) 0%, transparent); }
        }
        .auth-step__body { display: flex; flex-direction: column; line-height: 1.2; }
        .auth-step__t {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 15px;
          color: var(--text-primary);
        }
        .auth-step__d { font-size: 13px; color: var(--text-muted); }

        /* feature tags footer */
        .auth-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 26px;
          padding-top: 18px;
          list-style: none;
          margin: 0;
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 14px;
          color: var(--text-secondary-foreground, var(--text-secondary));
        }
        .auth-tags__i { color: var(--text-muted); font-size: 11px; }

        /* Scoped reduced-motion: globals.css collapses durations to 0.01ms which
           would freeze loops/one-shots mid-frame. Force a calm static end-state. */
        @media (prefers-reduced-motion: reduce) {
          .auth-rise { opacity: 1 !important; animation: none !important; transform: none !important; }
          .auth-glow { animation: none !important; opacity: .12 !important; transform: none !important; }
          .auth-verb { animation: none !important; opacity: 0; transform: translateY(-110%); }
          .auth-verb:first-of-type { opacity: 1; transform: none; }
          .auth-underline line { animation: none !important; stroke-dashoffset: 0; }
          .auth-curve { animation: none !important; stroke-dashoffset: 0; }
          .auth-curve-head { animation: none !important; opacity: 1; }
          .auth-step__dot.is-live { animation: none !important; }
        }
      `}</style>
    </aside>
  );
}
