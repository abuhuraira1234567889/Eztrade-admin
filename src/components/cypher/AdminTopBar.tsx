"use client";

import { Link } from "react-router-dom";
import { useState, useRef, useEffect, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check, ChevronLeft, ChevronRight, ShieldCheck, Headphones } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { AdminMobileMenuButton } from "@/components/cypher/AdminMobileMenu";
import { NotificationBell } from "@/components/cypher/NotificationBell";
import { ThemeToggle } from "@/components/cypher/ThemeToggle";
import { Glyph } from "@/components/cypher/Glyph";
import { SignOutButton } from "@/components/cypher/SignOutButton";
import { setLanguage } from "@/services/language";

type Props = {
 userEmail?: string | null;
 userName?: string | null;
 avatarUrl?: string | null;
 roles: string[];
 language?: string;
};

export function AdminTopBar({
 userEmail,
 userName,
 avatarUrl = null,
 roles,
 language = "en",
}: Props) {
 const [menuOpen, setMenuOpen] = useState(false);
 const [langPanelOpen, setLangPanelOpen] = useState(false);
 const [langPending, startLangTransition] = useTransition();
 const menuRef = useRef<HTMLDivElement>(null);
 const { t } = useTranslation("common");
 const { t: tnav } = useTranslation("nav");
 const currentLanguage =
 SUPPORTED_LANGUAGES.find((l) => l.code === language) ?? SUPPORTED_LANGUAGES[0];
 const canViewSupport = roles.some((r) =>
   ["super_admin", "admin", "support", "compliance"].includes(r),
 );

 function pickLanguage(code: string) {
 if (code === language) {
 setLangPanelOpen(false);
 return;
 }
 startLangTransition(() => {
 void setLanguage(code).then((r) => {
 if (r.ok) {
 const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0];
 document.documentElement.lang = lang.code;
 document.documentElement.dir = lang.rtl ? "rtl" : "ltr";
 setLangPanelOpen(false);
 setMenuOpen(false);
 setTimeout(() => window.location.reload(), 50);
 }
 });
 });
 }

 // Close the account menu on outside click (incl. clicks on the top bar) + Esc.
 // Identical behaviour to CypherTopBar so the menu feels the same.
 useEffect(() => {
 if (!menuOpen) { setLangPanelOpen(false); return; }
 const onPointer = (e: MouseEvent) => {
 if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
 };
 const onKey = (e: KeyboardEvent) => {
 if (e.key !== "Escape") return;
 if (langPanelOpen) setLangPanelOpen(false);
 else setMenuOpen(false);
 };
 document.addEventListener("mousedown", onPointer);
 document.addEventListener("keydown", onKey);
 return () => {
 document.removeEventListener("mousedown", onPointer);
 document.removeEventListener("keydown", onKey);
 };
 }, [menuOpen, langPanelOpen]);

 return (
 <header
 className="app-topbar flex items-center px-6 border-b border-border backdrop-blur-xl"
 style={{
 background: "color-mix(in srgb, var(--bg-page) 88%, transparent)",
 WebkitBackdropFilter: "blur(20px)",
 }}
 >
 <AdminMobileMenuButton roles={roles} />

 <div className="flex items-center gap-3 ml-auto">
 {canViewSupport && (
 <Link
 to="/admin/support"
 title={tnav("admin.support")}
 className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-surface-soft text-foreground hover:border-purple/40 h-9 px-2.5 sm:px-3 text-xs font-display font-semibold transition-colors duration-base ease-color"
 >
 <Headphones className="w-3.5 h-3.5 flex-shrink-0 text-purple" aria-hidden />
 <span className="hidden sm:inline">{tnav("admin.support")}</span>
 </Link>
 )}

 <NotificationBell />

 <ThemeToggle />

 <div className="relative" ref={menuRef}>
 <button
 onClick={() => setMenuOpen((v) => !v)}
 aria-label={t("topBar.accountMenu")}
 aria-expanded={menuOpen}
 className="flex items-center gap-2 px-1.5 py-1 rounded-full hover:bg-surface-soft transition active:scale-95"
 >
 {avatarUrl ? (
 // eslint-disable-next-line @next/next/no-img-element
 <img
 src={avatarUrl}
 alt=""
 className="w-8 h-8 rounded-full object-cover ring-2 ring-purple/15"
 />
 ) : (
 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple to-purple-light text-white text-xs font-bold grid place-items-center ring-2 ring-purple/15">
 {(userName?.[0] ?? userEmail?.[0] ?? "?").toUpperCase()}
 </div>
 )}
 <Glyph name="chevron-down" size={12} className={"text-muted-foreground transition-transform " + (menuOpen ? "rotate-180" : "")} />
 </button>

 {menuOpen && (
 <div
 className="absolute top-full end-0 mt-2 w-64 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
 style={{
 background: "var(--bg-elevated)",
 border: "1px solid var(--border-strong)",
 }}
 >
 {langPanelOpen ? (
 <div>
 <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
 <button
 type="button"
 onClick={() => setLangPanelOpen(false)}
 aria-label={t("topBar.backToAccountMenu")}
 className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-soft transition"
 >
 <ChevronLeft className="w-4 h-4" />
 </button>
 <span className="font-display text-sm font-semibold text-foreground">{t("topBar.language")}</span>
 </div>
 <ul className="p-1.5 max-h-[80vh] overflow-y-auto">
 {SUPPORTED_LANGUAGES.map((lang) => {
 const isCurrent = lang.code === language;
 return (
 <li key={lang.code}>
 <button
 type="button"
 onClick={() => pickLanguage(lang.code)}
 disabled={langPending}
 dir={lang.rtl ? "rtl" : "ltr"}
 className={
 "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition hover:bg-surface-soft disabled:opacity-50 " +
 (isCurrent ? "text-foreground" : "text-muted-foreground")
 }
 >
 <span aria-hidden className="inline-block h-6 w-6 rounded-full overflow-hidden ring-1 ring-border-strong/40 flex-shrink-0">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src={`/flags/${lang.flag}.svg`}
 alt=""
 className="w-full h-full object-cover"
 loading="lazy"
 />
 </span>
 <span className="flex-1 font-display font-semibold">{lang.name}</span>
 {isCurrent && <Check className="w-4 h-4 text-purple flex-shrink-0" />}
 </button>
 </li>
 );
 })}
 </ul>
 </div>
 ) : (
 <>
 {/* Identity card */}
 <div className="relative px-4 py-3.5 border-b border-border">
 <div
 aria-hidden
 className="pointer-events-none absolute inset-0"
 style={{
 background:
 "radial-gradient(circle at top right, rgba(238,124,44,0.18), transparent 60%)",
 }}
 />
 <div className="relative flex items-center gap-3">
 {avatarUrl ? (
 // eslint-disable-next-line @next/next/no-img-element
 <img
 src={avatarUrl}
 alt=""
 className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-purple/30"
 />
 ) : (
 <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple to-purple-light text-white text-sm font-bold grid place-items-center flex-shrink-0 ring-2 ring-purple/30">
 {(userName?.[0] ?? userEmail?.[0] ?? "?").toUpperCase()}
 </div>
 )}
 <div className="min-w-0">
 <div className="text-[14px] font-display font-semibold text-foreground truncate">
 {userName || userEmail}
 </div>
 {userEmail && userName && (
 <div className="text-[11px] text-muted-foreground truncate">{userEmail}</div>
 )}
 <div className="mt-1.5 inline-flex pill pill-purple items-center gap-1">
 <ShieldCheck className="w-3 h-3" aria-hidden />
 {tnav("groups.admin")}
 </div>
 </div>
 </div>
 </div>

 {/* Items */}
 <div className="p-1.5">
 {/* Only show the Language entry when there's more than one language to pick. */}
 {SUPPORTED_LANGUAGES.length > 1 && (
 <button
 type="button"
 onClick={() => setLangPanelOpen(true)}
 aria-haspopup="menu"
 aria-expanded={langPanelOpen}
 className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-surface-soft transition"
 >
 <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-soft text-muted-foreground group-hover:bg-purple-dim group-hover:text-purple transition">
 <Globe className="w-4 h-4" />
 </span>
 <span className="font-display flex-1 text-left">{t("topBar.language")}</span>
 <span aria-hidden className="inline-block h-4 w-4 rounded-full overflow-hidden ring-1 ring-border-strong/40 flex-shrink-0">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src={`/flags/${currentLanguage.flag}.svg`}
 alt=""
 className="w-full h-full object-cover"
 loading="lazy"
 />
 </span>
 <span className="text-xs text-muted-foreground">{currentLanguage.name}</span>
 <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
 </button>
 )}
 </div>

 {/* Sign out */}
 <div className="border-t border-border p-1.5">
 <SignOutButton className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-display font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-soft transition">
 <Glyph name="logout" size={14} /> {t("actions.signOut")}
 </SignOutButton>
 </div>
 </>
 )}
 </div>
 )}
 </div>
 </div>
 </header>
 );
}
