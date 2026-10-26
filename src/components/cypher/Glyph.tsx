"use client";

/**
 * Glyph - brand-specific inline SVG registry for the Eztrade platform.
 *
 * SCOPE (17 May 2026, after brand audit):
 * - Use Glyph ONLY for brand-specific marks: the pillar icons (academy /
 * signals / live / tools / community / rewards), the stream pillars
 * (aurex / vektor / lux / retro / edge), how-it-works steps, the wordmark.
 * - Use Lucide for every utility / system icon (user, settings, chevrons,
 * arrows, plus, x, check, etc.). Lucide is the brand-approved library
 * per `02-visual-system/iconography.md` and most pages already use it.
 * - Never mix Lucide + Glyph in the same row/cluster - pick the family the
 * row needs and stick with it.
 *
 * Ported verbatim from `~/Documents/eztrade-app/src/components/v34/Glyph.astro`.
 * Each icon is hand-drawn on a 24×24 grid with stroke="currentColor".
 *
 * To add a new glyph: drop another entry into GLYPHS keyed by a short kebab-case
 * name. Mirror the same glyph into Glyph.astro to keep the landing in sync.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export type GlyphName =
 // Pillars
 | "academy" | "signals" | "live" | "tools" | "community" | "rewards"
 // How-it-works
 | "step-signup" | "step-broker" | "step-connect" | "step-unlock"
 // Tool sub-glyphs
 | "tool-scanners" | "tool-coach" | "tool-live" | "tool-signals" | "tool-analytics"
 // Community
 | "comm-chat" | "comm-wall"
 // Streams
 | "aurex" | "vektor" | "lux" | "retro"
 // Utility (landing)
 | "arrow-right" | "clock" | "users" | "play"
 | "fmt-video" | "fmt-book" | "fmt-doc"
 // Platform-only additions (not on landing yet)
 | "home" | "sun" | "moon" | "gift" | "bell" | "search" | "menu" | "x"
 | "check" | "alert" | "info" | "external" | "copy" | "send" | "trash"
 | "edit" | "user" | "settings" | "logout" | "trending-up" | "trending-down"
 | "calendar" | "image" | "filter" | "refresh" | "chevron-down" | "chevron-left"
 | "chevron-right" | "plus" | "minus" | "mail" | "lock" | "eye" | "eye-off";

const GLYPHS: Record<GlyphName, string> = {
 // ── 6 pillar glyphs ─────────────────────────────────────────────────────
 academy: `
 <path d="M3 6c2-1 5-1 8 0v14c-3-1-6-1-8 0V6z"/>
 <path d="M21 6c-2-1-5-1-8 0v14c3-1 6-1 8 0V6z"/>
 <polyline points="6 11 8.5 12.5 11 10.5"/>
 <polyline points="13 12 15.5 9.5 18 11"/>
 <circle cx="18" cy="11" r="1.2" fill="currentColor"/>
 `,
 signals: `
 <path d="M2 12c2-4 6-4 8 0s6 4 8 0"/>
 <path d="M2 16c2-3 6-3 8 0s6 3 8 0" opacity="0.65"/>
 <path d="M2 20c2-2 6-2 8 0s6 2 8 0" opacity="0.4"/>
 <circle cx="20" cy="8" r="2" fill="currentColor"/>
 `,
 live: `
 <circle cx="12" cy="12" r="2" fill="currentColor"/>
 <path d="M7 7a7 7 0 0 1 10 0"/>
 <path d="M7 17a7 7 0 0 0 10 0"/>
 <path d="M4 4a11 11 0 0 1 16 0"/>
 <path d="M4 20a11 11 0 0 0 16 0"/>
 `,
 tools: `
 <rect x="3" y="3" width="8" height="8" rx="1.5"/>
 <rect x="13" y="13" width="8" height="8" rx="1.5"/>
 <line x1="11" y1="11" x2="13" y2="13"/>
 <circle cx="7" cy="7" r="1" fill="currentColor"/>
 <circle cx="17" cy="17" r="1" fill="currentColor"/>
 <line x1="5" y1="9" x2="9" y2="9" opacity="0.55"/>
 <line x1="15" y1="15" x2="19" y2="15" opacity="0.55"/>
 `,
 community: `
 <circle cx="6" cy="7" r="2.5"/>
 <circle cx="18" cy="7" r="2.5"/>
 <circle cx="12" cy="17" r="2.5"/>
 <line x1="8.5" y1="7" x2="15.5" y2="7"/>
 <line x1="7.5" y1="9" x2="10.5" y2="15"/>
 <line x1="16.5" y1="9" x2="13.5" y2="15"/>
 <circle cx="6" cy="7" r="0.7" fill="currentColor"/>
 <circle cx="18" cy="7" r="0.7" fill="currentColor"/>
 <circle cx="12" cy="17" r="0.7" fill="currentColor"/>
 `,
 rewards: `
 <path d="M12 2 L20 9 L12 22 L4 9 Z"/>
 <line x1="4" y1="9" x2="20" y2="9"/>
 <line x1="12" y1="2" x2="12" y2="9"/>
 <line x1="8" y1="9" x2="12" y2="22"/>
 <line x1="16" y1="9" x2="12" y2="22"/>
 `,

 // ── 4 step glyphs ───────────────────────────────────────────────────────
 "step-signup": `
 <rect x="4" y="4" width="13" height="16" rx="2"/>
 <line x1="7" y1="8" x2="13" y2="8"/>
 <line x1="7" y1="12" x2="13" y2="12"/>
 <line x1="7" y1="16" x2="10" y2="16"/>
 <polyline points="15 19 17 21 21 17"/>
 `,
 "step-broker": `
 <rect x="3" y="9" width="18" height="11" rx="1.5"/>
 <line x1="3" y1="13" x2="21" y2="13"/>
 <circle cx="7" cy="16.5" r="1" fill="currentColor"/>
 <line x1="11" y1="16.5" x2="18" y2="16.5"/>
 <polyline points="9 9 12 4 15 9"/>
 <line x1="12" y1="4" x2="12" y2="9"/>
 `,
 "step-connect": `
 <rect x="2" y="8" width="7" height="8" rx="1.5"/>
 <rect x="15" y="8" width="7" height="8" rx="1.5"/>
 <line x1="9" y1="12" x2="15" y2="12"/>
 <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
 <line x1="5.5" y1="6" x2="5.5" y2="8" opacity="0.5"/>
 <line x1="18.5" y1="6" x2="18.5" y2="8" opacity="0.5"/>
 <line x1="5.5" y1="16" x2="5.5" y2="18" opacity="0.5"/>
 <line x1="18.5" y1="16" x2="18.5" y2="18" opacity="0.5"/>
 `,
 "step-unlock": `
 <rect x="2" y="9" width="9" height="6" rx="3"/>
 <circle cx="6.5" cy="12" r="1.5" fill="currentColor"/>
 <line x1="11" y1="12" x2="22" y2="12"/>
 <line x1="14" y1="12" x2="14" y2="15"/>
 <line x1="17" y1="12" x2="17" y2="14"/>
 <line x1="20" y1="12" x2="20" y2="16"/>
 `,

 // ── 5 tool sub-glyphs ───────────────────────────────────────────────────
 "tool-scanners": `
 <line x1="3" y1="21" x2="21" y2="21"/>
 <rect x="5" y="13" width="3" height="8" fill="currentColor" stroke="none"/>
 <rect x="10.5" y="9" width="3" height="12" fill="currentColor" stroke="none"/>
 <rect x="16" y="5" width="3" height="16" fill="currentColor" stroke="none"/>
 <line x1="3" y1="6" x2="6" y2="6" stroke-dasharray="2 2" opacity="0.5"/>
 <line x1="3" y1="6" x2="3" y2="3" stroke-dasharray="2 2" opacity="0.5"/>
 `,
 "tool-coach": `
 <path d="M9 4c-2.5 0-4 1.5-4 4 0 1-1 1.5-1 3s1 2 1 3c0 2.5 1.5 4 4 4"/>
 <path d="M15 4c2.5 0 4 1.5 4 4 0 1 1 1.5 1 3s-1 2-1 3c0 2.5-1.5 4-4 4"/>
 <line x1="12" y1="4" x2="12" y2="18"/>
 <circle cx="9" cy="9" r="0.8" fill="currentColor"/>
 <circle cx="15" cy="9" r="0.8" fill="currentColor"/>
 <circle cx="9" cy="13" r="0.8" fill="currentColor"/>
 <circle cx="15" cy="13" r="0.8" fill="currentColor"/>
 `,
 "tool-live": `
 <rect x="3" y="5" width="18" height="13" rx="2"/>
 <polyline points="8 22 12 19 16 22" opacity="0.7"/>
 <polygon points="10 9 16 11.5 10 14" fill="currentColor" stroke="none"/>
 `,
 "tool-signals": `
 <path d="M6 14V10a6 6 0 0 1 12 0v4l2 3H4z"/>
 <path d="M10 20a2 2 0 0 0 4 0"/>
 <path d="M2 7l3-3" opacity="0.55"/>
 <path d="M22 7l-3-3" opacity="0.55"/>
 `,
 "tool-analytics": `
 <line x1="3" y1="3" x2="3" y2="21"/>
 <line x1="3" y1="21" x2="21" y2="21"/>
 <rect x="6" y="15" width="3" height="6" fill="currentColor" stroke="none"/>
 <rect x="11" y="11" width="3" height="10" fill="currentColor" stroke="none"/>
 <rect x="16" y="7" width="3" height="14" fill="currentColor" stroke="none"/>
 <polyline points="6 13 11 9 16 5 19 5"/>
 <polyline points="19 5 19 8" opacity="0.7"/>
 `,

 // ── 2 community glyphs ──────────────────────────────────────────────────
 "comm-chat": `
 <path d="M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-7l-5 4v-4H6a3 3 0 0 1-3-3z"/>
 <circle cx="9" cy="11" r="0.9" fill="currentColor"/>
 <circle cx="12" cy="11" r="0.9" fill="currentColor"/>
 <circle cx="15" cy="11" r="0.9" fill="currentColor"/>
 `,
 "comm-wall": `
 <path d="M6 14a6 6 0 0 1-2-6c0-2 2-4 4-4"/>
 <path d="M18 14a6 6 0 0 0 2-6c0-2-2-4-4-4"/>
 <polygon points="12 8 13.5 12 17.5 12 14.5 14.5 16 19 12 16.5 8 19 9.5 14.5 6.5 12 10.5 12" fill="currentColor" stroke="none"/>
 `,

 // ── signal stream glyphs (Aurex / Vektor / Lux / Retro) ──────────────────────────────────────────────
 aurex: `
 <path d="M12 2.6l8.1 4.7v9.4L12 21.4l-8.1-4.7V7.3z"/>
 <path d="M8.3 16.2L12 8.2l3.7 8"/>
 <line x1="9.8" y1="13.4" x2="14.2" y2="13.4"/>
 `,
 vektor: `
 <line x1="3" y1="9" x2="10" y2="9" opacity="0.5"/>
 <line x1="3" y1="15" x2="10" y2="15" opacity="0.5"/>
 <line x1="4.5" y1="19.5" x2="19.5" y2="4.5"/>
 <polyline points="11.5 4.5 19.5 4.5 19.5 12.5"/>
 `,
 lux: `
 <circle cx="12" cy="12" r="9"/>
 <path d="M12 3c-3.3 3-3.3 15 0 18" opacity="0.6"/>
 <path d="M12 3c3.3 3 3.3 15 0 18" opacity="0.6"/>
 <path d="M3.8 13.5c3-3.6 5.7-3.6 8.2-1s5.2 2.6 8.2-1"/>
 `,
 retro: `
 <path d="M5.5 14a6.5 6.5 0 0 1 13 0"/>
 <line x1="2.5" y1="14" x2="21.5" y2="14"/>
 <line x1="6" y1="17.7" x2="18" y2="17.7" opacity="0.7"/>
 <line x1="9.2" y1="21" x2="14.8" y2="21" opacity="0.45"/>
 `,

 // ── Utility glyphs (from landing) ───────────────────────────────────────
 "arrow-right": `
 <line x1="5" y1="12" x2="19" y2="12"/>
 <polyline points="12 5 19 12 12 19"/>
 `,
 clock: `
 <circle cx="12" cy="12" r="9"/>
 <polyline points="12 7 12 12 15 14"/>
 `,
 users: `
 <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/>
 <circle cx="9.5" cy="7.5" r="3.5"/>
 <path d="M21 21v-2a4 4 0 0 0-3-3.87"/>
 <circle cx="17" cy="7.5" r="3"/>
 `,
 play: `
 <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/>
 `,
 "fmt-video": `
 <rect x="3" y="6" width="14" height="12" rx="2"/>
 <polygon points="20 8 17 11 17 13 20 16" fill="currentColor" stroke="none"/>
 `,
 "fmt-book": `
 <path d="M4 5a2 2 0 0 1 2-2h12v15H6a2 2 0 0 0-2 2V5z"/>
 <line x1="8" y1="7" x2="14" y2="7"/>
 <line x1="8" y1="11" x2="14" y2="11"/>
 `,
 "fmt-doc": `
 <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
 <polyline points="15 2 15 7 20 7"/>
 <line x1="8" y1="13" x2="16" y2="13"/>
 <line x1="8" y1="17" x2="13" y2="17"/>
 `,

 // ── Platform additions (24x24, 1.6 stroke, currentColor) ────────────────
 home: `
 <path d="M3 11l9-8 9 8"/>
 <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/>
 `,
 sun: `
 <circle cx="12" cy="12" r="4"/>
 <line x1="12" y1="2" x2="12" y2="4"/>
 <line x1="12" y1="20" x2="12" y2="22"/>
 <line x1="2" y1="12" x2="4" y2="12"/>
 <line x1="20" y1="12" x2="22" y2="12"/>
 <line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/>
 <line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/>
 <line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/>
 <line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/>
 `,
 moon: `
 <path d="M21 13.5A9 9 0 1 1 10.5 3a7 7 0 0 0 10.5 10.5z"/>
 `,
 gift: `
 <polyline points="20 12 20 22 4 22 4 12"/>
 <rect x="2" y="7" width="20" height="5"/>
 <line x1="12" y1="22" x2="12" y2="7"/>
 <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
 <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
 `,
 bell: `
 <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
 <path d="M10.3 21a2 2 0 0 0 3.4 0"/>
 `,
 search: `
 <circle cx="11" cy="11" r="7"/>
 <line x1="20" y1="20" x2="16.65" y2="16.65"/>
 `,
 menu: `
 <line x1="4" y1="6" x2="20" y2="6"/>
 <line x1="4" y1="12" x2="20" y2="12"/>
 <line x1="4" y1="18" x2="20" y2="18"/>
 `,
 x: `
 <line x1="6" y1="6" x2="18" y2="18"/>
 <line x1="18" y1="6" x2="6" y2="18"/>
 `,
 check: `
 <polyline points="20 6 9 17 4 12"/>
 `,
 alert: `
 <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
 <line x1="12" y1="9" x2="12" y2="13"/>
 <circle cx="12" cy="17" r="0.9" fill="currentColor"/>
 `,
 info: `
 <circle cx="12" cy="12" r="9"/>
 <line x1="12" y1="11" x2="12" y2="16"/>
 <circle cx="12" cy="8" r="0.9" fill="currentColor"/>
 `,
 external: `
 <path d="M15 3h6v6"/>
 <path d="M10 14L21 3"/>
 <path d="M21 14v7H3V3h7"/>
 `,
 copy: `
 <rect x="9" y="9" width="13" height="13" rx="2"/>
 <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
 `,
 send: `
 <line x1="22" y1="2" x2="11" y2="13"/>
 <polygon points="22 2 15 22 11 13 2 9 22 2" fill="none"/>
 `,
 trash: `
 <polyline points="3 6 5 6 21 6"/>
 <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
 <path d="M10 11v6"/>
 <path d="M14 11v6"/>
 `,
 edit: `
 <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
 <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
 `,
 user: `
 <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
 <circle cx="12" cy="7" r="4"/>
 `,
 settings: `
 <circle cx="12" cy="12" r="3"/>
 <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15z"/>
 `,
 logout: `
 <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
 <polyline points="16 17 21 12 16 7"/>
 <line x1="21" y1="12" x2="9" y2="12"/>
 `,
 "trending-up": `
 <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
 <polyline points="17 6 23 6 23 12"/>
 `,
 "trending-down": `
 <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
 <polyline points="17 18 23 18 23 12"/>
 `,
 calendar: `
 <rect x="3" y="4" width="18" height="18" rx="2"/>
 <line x1="3" y1="10" x2="21" y2="10"/>
 <line x1="8" y1="2" x2="8" y2="6"/>
 <line x1="16" y1="2" x2="16" y2="6"/>
 `,
 image: `
 <rect x="3" y="3" width="18" height="18" rx="2"/>
 <circle cx="8.5" cy="8.5" r="1.5"/>
 <polyline points="21 15 16 10 5 21"/>
 `,
 filter: `
 <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
 `,
 refresh: `
 <polyline points="23 4 23 10 17 10"/>
 <polyline points="1 20 1 14 7 14"/>
 <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
 <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
 `,
 "chevron-down": `
 <polyline points="6 9 12 15 18 9"/>
 `,
 "chevron-left": `
 <polyline points="15 18 9 12 15 6"/>
 `,
 "chevron-right": `
 <polyline points="9 18 15 12 9 6"/>
 `,
 plus: `
 <line x1="12" y1="5" x2="12" y2="19"/>
 <line x1="5" y1="12" x2="19" y2="12"/>
 `,
 minus: `
 <line x1="5" y1="12" x2="19" y2="12"/>
 `,
 mail: `
 <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
 <polyline points="22 6 12 13 2 6"/>
 `,
 lock: `
 <rect x="3" y="11" width="18" height="11" rx="2"/>
 <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
 `,
 eye: `
 <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
 <circle cx="12" cy="12" r="3"/>
 `,
 "eye-off": `
 <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
 <line x1="1" y1="1" x2="23" y2="23"/>
 `,
};

type Props = {
 name: GlyphName;
 size?: number;
 stroke?: number;
 className?: string;
 "aria-label"?: string;
};

export function Glyph({ name, size = 24, stroke = 1.6, className, "aria-label": ariaLabel }: Props) {
 const path = GLYPHS[name];
 if (!path) {
 if (process.env.NODE_ENV === "development") {
 // eslint-disable-next-line no-console
 console.warn(`<Glyph name="${name}"> not in registry. Add it to GLYPHS in components/cypher/Glyph.tsx.`);
 }
 return null;
 }
 // The inner SVG markup comes exclusively from the GLYPHS hard-coded registry
 // above - it is never derived from user input. We use dangerouslySetInnerHTML
 // only because React doesn't expose a way to set arbitrary SVG child elements
 // without it, and a Content-Security-Policy with `style-src 'none'` ensures
 // injected event handlers or scripts can't execute even in the unlikely event
 // the registry is tampered with at build time.
 return (
 <svg
 viewBox="0 0 24 24"
 width={size}
 height={size}
 fill="none"
 stroke="currentColor"
 strokeWidth={stroke}
 strokeLinecap="round"
 strokeLinejoin="round"
 aria-hidden={ariaLabel ? undefined : true}
 aria-label={ariaLabel}
 role={ariaLabel ? "img" : undefined}
 className={cn("inline-block flex-shrink-0", className)}
 dangerouslySetInnerHTML={{ __html: path }}
 />
 );
}

export default Glyph;
