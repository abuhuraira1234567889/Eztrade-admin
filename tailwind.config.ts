import type { Config } from "tailwindcss";

// Bare CSS variables can't take Tailwind opacity modifiers, so route brand
// tints through color-mix() (same helper as the member frontend) - `/40` then
// scales the tint while the colour still follows the tenant palette.
const token = (cssVar: string, scale = 100) =>
  `color-mix(in srgb, var(${cssVar}) calc(<alpha-value> * ${scale}%), transparent)`;

const config: Config = {
 // Support both legacy `.dark` class and the new `[data-theme="dark"]` attribute.
 // The theme-init script in app/layout.tsx writes [data-theme], existing
 // components using `.dark:` modifiers keep working through the fallback selector
 // we expose in globals.css §2.
 darkMode: ["selector", '[data-theme="dark"]'],

 content: [
 "./index.html",
 "./src/**/*.{ts,tsx}",
 ],

 theme: {
 extend: {
 // ── Colors: all driven from globals.css CSS variables ─────────────────
 colors: {
 // Brand purple ramp (sacred - #EE7C2C primary)
 purple: {
 50: "var(--color-purple-50)",
 100: "var(--color-purple-100)",
 200: "var(--color-purple-200)",
 300: "var(--color-purple-300)",
 400: "var(--color-purple-400)",
 500: "var(--color-purple-500)",
 DEFAULT: "rgb(var(--color-purple-rgb) / <alpha-value>)",
 light: "var(--color-purple-500)",
 700: "var(--color-purple-700)",
 800: "var(--color-purple-800)",
 950: "var(--color-purple-950)",
 // A 10% brand tint; `/40` etc. scale the tint itself.
 dim: token("--color-purple", 10),
 },
 "indigo-mark": "var(--color-indigo-mark)",

 // Ink (dark surface ramp)
 ink: {
 600: "var(--color-ink-600)",
 700: "var(--color-ink-700)",
 800: "var(--color-ink-800)",
 900: "var(--color-ink-900)",
 950: "var(--color-ink-950)",
 },

 // Bone (light surface ramp)
 bone: {
 50: "var(--color-bone-50)",
 100: "var(--color-bone-100)",
 200: "var(--color-bone-200)",
 300: "var(--color-bone-300)",
 },

 // Slate (cool-grey type ramp, Stripe-lifted)
 slate: {
 300: "var(--color-slate-300)",
 500: "var(--color-slate-500)",
 700: "var(--color-slate-700)",
 900: "var(--color-slate-900)",
 },

 // Signal - mode-invariant TradingView discipline
 green: {
 DEFAULT: "rgb(var(--color-signal-long-rgb) / <alpha-value>)",
 dim: "rgba(34, 197, 94, 0.10)",
 },
 red: {
 DEFAULT: "rgb(var(--color-signal-short-rgb) / <alpha-value>)",
 dim: "rgba(239, 68, 68, 0.10)",
 },
 amber: {
 DEFAULT: "rgb(var(--color-signal-warn-rgb) / <alpha-value>)",
 dim: "rgba(245, 158, 11, 0.10)",
 },
 blue: {
 DEFAULT: "rgb(var(--color-signal-info-rgb) / <alpha-value>)",
 dim: "rgba(59, 130, 246, 0.10)",
 },

 // Semantic role tokens (mode-adaptive)
 background: "var(--bg-page)",
 surface: "rgb(var(--surface) / <alpha-value>)",
 "surface-soft": "rgb(var(--surface-soft) / <alpha-value>)",
 border: "var(--border)",
 "border-strong": "var(--border-strong)",
 foreground: "var(--text-primary)",
 "secondary-foreground":"var(--text-default)",
 "muted-foreground": "var(--text-muted)",
 "disabled-foreground":"var(--text-disabled)",
 },

 // 18 May (AJ): JetBrains Mono pulled from UI chrome - `` now
 // resolves to Urbanist (sans). Real code blocks should use `font-code`
 // explicitly. Tabular numbers still work via Urbanist's `tabular-nums`
 // OpenType feature plus Tailwind's `tabular-nums` utility.
 fontFamily: {
 // Through the CSS variables (same stacks, defined in globals.css) so the admin
 // Theme page can swap fonts at runtime - a literal list here would pin them.
 sans: ["var(--font-body)"],
 body: ["var(--font-body)"],
 display: ["var(--font-display)"],
 mono: ["var(--font-mono)"],
 code: ["JetBrains Mono Variable", "JetBrains Mono", "ui-monospace", "monospace"],
 },

 // Radii - match the design-system spec
 borderRadius: {
 sm: "var(--radius-sm)",
 md: "var(--radius-md)",
 lg: "var(--radius-lg)",
 xl: "var(--radius-xl)",
 "2xl":"var(--radius-2xl)",
 "3xl":"var(--radius-3xl)",
 },

 // Shadows - semantic elevation + brand glow
 boxShadow: {
 "elev-sm": "var(--shadow-elev-sm)",
 "elev-md": "var(--shadow-elev-md)",
 "elev-lg": "var(--shadow-elev-lg)",
 "glow-purple": "var(--shadow-glow-purple)",
 "glow-purple-strong":"var(--shadow-glow-purple-strong)",
 },

 // Motion easings + durations - Stripe-style
 transitionTimingFunction: {
 glide: "var(--ease-transform)",
 color: "var(--ease-color)",
 emphasize: "var(--ease-emphasize)",
 },
 transitionDuration: {
 instant: "var(--duration-instant)",
 fast: "var(--duration-fast)",
 base: "var(--duration-base)",
 slow: "var(--duration-slow)",
 section: "var(--duration-section)",
 },

 keyframes: {
 "fade-in": {
 "0%": { opacity: "0", transform: "translateY(6px)" },
 "100%": { opacity: "1", transform: "translateY(0)" },
 },
 "spin-slow": { to: { transform: "rotate(360deg)" } },
 },
 animation: {
 "fade-in": "fade-in .3s ease",
 "spin-slow": "spin-slow .8s linear infinite",
 },
 },
 },

 plugins: [require("tailwindcss-animate")],
};

export default config;
