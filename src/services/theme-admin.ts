import { api, deleteApi, getApi } from "@/services/api";

export type BrandColorKey = "secondary" | "positive" | "negative" | "warning" | "info";
export type RadiusPreset = "sharp" | "soft" | "round";
export type ThemeMode = "both" | "light" | "dark";

export type Branding = {
  primaryColor?: string;
  colors?: Partial<Record<BrandColorKey, string>>;
  fonts?: { heading?: string; body?: string };
  radius?: RadiusPreset;
  mode?: ThemeMode;
  brandName?: string;
  logoUrl?: string;
  faviconUrl?: string;
};

export type FontChoice = { family: string; category: "sans" | "display" | "serif"; weights?: string };

export type ThemeAdminData = {
  branding: Branding;
  defaults: { primary: string; positive: string; negative: string; warning: string; info: string };
  fonts: FontChoice[];
  radiusPresets: Record<RadiusPreset, Record<string, number>>;
  needsMigration?: boolean;
};

export function getTheme() {
  return getApi<ThemeAdminData>("/api/admin/theme");
}

export async function saveTheme(branding: Branding): Promise<{ ok: boolean; branding: Branding }> {
  const { data } = await api.put<{ ok: boolean; branding: Branding }>("/api/admin/theme", branding);
  return data;
}

export function resetTheme() {
  return deleteApi<{ ok: boolean }>("/api/admin/theme");
}

export async function uploadBrandImage(
  kind: "logo" | "favicon",
  file: File,
): Promise<{ ok: boolean; url: string; branding: Branding }> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post<{ ok: boolean; url: string; branding: Branding }>(
    `/api/admin/theme/upload/${kind}`,
    fd,
  );
  return data;
}

// ─── Preview helpers (mirror the member app's tenant-config + the backend map) ──

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null;
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}
function mix(hex: string, target: [number, number, number], t: number): string {
  const c = hexToRgb(hex);
  if (!c) return hex;
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(c[0] + (target[0] - c[0]) * t)}${h(c[1] + (target[1] - c[1]) * t)}${h(c[2] + (target[2] - c[2]) * t)}`;
}
const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [0, 0, 0];

const COLOR_VARS: Record<BrandColorKey, string[]> = {
  secondary: ["--secondary-fill", "--secondary-fill-hover"],
  positive: ["--color-signal-long"],
  negative: ["--color-signal-short"],
  warning: ["--color-signal-warn"],
  info: ["--color-signal-info"],
};

/** The CSS variables the member app will set for this branding. */
export function previewVars(b: Branding, radiusPresets: ThemeAdminData["radiusPresets"]): Record<string, string> {
  const v: Record<string, string> = {};
  const p = b.primaryColor;
  if (p && hexToRgb(p)) {
    Object.assign(v, {
      "--color-purple": p,
      "--color-purple-50": mix(p, WHITE, 0.92),
      "--color-purple-100": mix(p, WHITE, 0.85),
      "--color-purple-200": mix(p, WHITE, 0.7),
      "--color-purple-300": mix(p, WHITE, 0.52),
      "--color-purple-400": mix(p, WHITE, 0.32),
      "--color-purple-500": mix(p, WHITE, 0.15),
      "--color-purple-700": mix(p, BLACK, 0.2),
      "--color-purple-800": mix(p, BLACK, 0.38),
      "--color-purple-900": mix(p, BLACK, 0.55),
      "--color-purple-950": mix(p, BLACK, 0.72),
      "--brand-solid": p,
    });
  }
  for (const [key, names] of Object.entries(COLOR_VARS) as Array<[BrandColorKey, string[]]>) {
    const c = b.colors?.[key];
    if (c && hexToRgb(c)) for (const n of names) v[n] = c;
  }
  if (b.fonts?.heading) v["--font-display"] = `"${b.fonts.heading}", system-ui, sans-serif`;
  if (b.fonts?.body) v["--font-body"] = `"${b.fonts.body}", system-ui, sans-serif`;
  if (b.radius && b.radius !== "soft" && radiusPresets[b.radius]) {
    for (const [step, px] of Object.entries(radiusPresets[b.radius])) v[`--radius-${step}`] = `${px}px`;
  }
  return v;
}

/** Load Google Fonts for the preview (one <link> per family, deduped). */
export function loadPreviewFont(f: FontChoice | undefined): void {
  if (!f) return;
  const id = `preview-font-${f.family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  const spec = `${f.family}:wght@${f.weights ?? "400;500;600;700"}`;
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(spec).replace(/%20/g, "+")}&display=swap`;
  document.head.appendChild(link);
}
