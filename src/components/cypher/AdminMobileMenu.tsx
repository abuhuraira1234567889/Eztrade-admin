"use client";

import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/components/cypher/SignOutButton";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { canAccessRoute } from "@/lib/rbac/routeAccess";
import {
 Menu, X, ArrowRight, ShieldCheck,
 Gift, ShoppingBag, Upload, FileUp, Sliders, BarChart3, Bell, Users, FileSearch,
 Video, LogOut, Trophy, Medal, GraduationCap, UserPlus, Lightbulb, Megaphone, Bug, History, Headphones,
 Send, LineChart, ClipboardList, Network, BookOpen, CalendarClock,
 SlidersHorizontal, ScrollText, Share2, Mail, ImageIcon, Palette,
 type LucideIcon,
} from "lucide-react";

type AdminItem = {
 href: string;
 labelKey: string;
 descriptionKey?: string;
 icon: LucideIcon;
};

type AdminGroup = {
 titleKey: string;
 items: AdminItem[];
};

/**
 * Admin nav mirrors the structure used by AdminSidebar so that the mobile
 * menu and desktop sidebar surface the same groups in the same order.
 */
const ADMIN_GROUPS: AdminGroup[] = [
 { titleKey: "groups.adminInsights", items: [
 { href: "/admin/analytics", labelKey: "admin.analytics", descriptionKey: "admin.analyticsDesc", icon: BarChart3 },
 { href: "/admin/leads", labelKey: "admin.leads", descriptionKey: "admin.leadsDesc", icon: UserPlus },
 { href: "/admin/product-feedback", labelKey: "admin.productFeedback", descriptionKey: "admin.productFeedbackDesc", icon: ClipboardList },
 { href: "/admin/telegram", labelKey: "admin.telegram", descriptionKey: "admin.telegramDesc", icon: Send },
 { href: "/admin/tradingview", labelKey: "admin.tradingview", descriptionKey: "admin.tradingviewDesc", icon: LineChart },
 ]},
 { titleKey: "groups.adminOperations", items: [
 { href: "/admin/redemptions", labelKey: "admin.redemptions", descriptionKey: "admin.redemptionsDesc", icon: Gift },
 { href: "/admin/rewards", labelKey: "admin.rewards", descriptionKey: "admin.rewardsDesc", icon: ShoppingBag },
 // CSV Import + PuPrime Import hidden per request - re-enable by uncommenting.
 // { href: "/admin/csv-import", labelKey: "admin.csvImport", descriptionKey: "admin.csvImportDesc", icon: Upload },
 // live_host: a team role that ONLY sees + hosts Live Sessions (no other nav).
 { href: "/admin/live-events", labelKey: "admin.liveSessions", descriptionKey: "admin.liveSessionsDesc", icon: Video },
 { href: "/admin/competitions", labelKey: "admin.competitions", descriptionKey: "admin.competitionsDesc", icon: Trophy },
 { href: "/admin/leaderboard", labelKey: "admin.leaderboard", descriptionKey: "admin.leaderboardDesc", icon: Medal },
 { href: "/admin/quizzes", labelKey: "admin.quizzes", descriptionKey: "admin.quizzesDesc", icon: GraduationCap },
 { href: "/admin/academy", labelKey: "admin.academy", descriptionKey: "admin.academyDesc", icon: BookOpen },
 { href: "/admin/trade-ideas", labelKey: "admin.tradeIdeas", descriptionKey: "admin.tradeIdeasDesc", icon: Lightbulb },
 { href: "/admin/announcements", labelKey: "admin.announcements", descriptionKey: "admin.announcementsDesc", icon: Megaphone },
 { href: "/admin/notifications", labelKey: "admin.notifications", descriptionKey: "admin.notificationsDesc", icon: Bell },
 { href: "/admin/support", labelKey: "admin.support", descriptionKey: "admin.supportDesc", icon: Headphones },
 { href: "/admin/extensions", labelKey: "admin.extensions", descriptionKey: "admin.extensionsDesc", icon: CalendarClock },
 { href: "/admin/knowledge-base", labelKey: "admin.knowledgeBase", descriptionKey: "admin.knowledgeBaseDesc", icon: BookOpen },
 ]},
 { titleKey: "groups.adminConfig", items: [
 { href: "/admin/tiers", labelKey: "admin.tiers", descriptionKey: "admin.tiersDesc", icon: Sliders },
 { href: "/admin/settings", labelKey: "admin.settings", descriptionKey: "admin.settingsDesc", icon: SlidersHorizontal },
 { href: "/admin/milestones", labelKey: "admin.milestones", descriptionKey: "admin.milestonesDesc", icon: Medal },
 { href: "/admin/legal", labelKey: "admin.legal", descriptionKey: "admin.legalDesc", icon: ScrollText },
 { href: "/admin/brand-content", labelKey: "admin.brandContent", descriptionKey: "admin.brandContentDesc", icon: Share2 },
 { href: "/admin/email-templates", labelKey: "admin.emailTemplates", descriptionKey: "admin.emailTemplatesDesc", icon: Mail },
 { href: "/admin/images", labelKey: "admin.images", descriptionKey: "admin.imagesDesc", icon: ImageIcon },
 { href: "/admin/team", labelKey: "admin.team", descriptionKey: "admin.teamDesc", icon: Users },
 { href: "/admin/qa", labelKey: "admin.qa", descriptionKey: "admin.qaDesc", icon: FileSearch },
 { href: "/admin/crons", labelKey: "admin.crons", descriptionKey: "admin.cronsDesc", icon: History },
 ]},
];

const EXIT_DURATION_MS = 220;

/**
 * Mobile menu trigger + portal overlay for the admin context. Mirrors the
 * member `MobileMenuButton` API and visual structure so the two shells feel
 * like the same product. Renamed from the original AdminMobileMenu to make
 * its role as the burger-trigger pair explicit.
 */
export function AdminMobileMenuButton({ roles }: { roles: string[] }) {
 const { pathname } = useLocation();
 const navigate = useNavigate();
 const { t } = useTranslation("nav");
 const { t: tc } = useTranslation("common");
 const [open, setOpen] = useState(false);
 const [closing, setClosing] = useState(false);
 const [mounted, setMounted] = useState(false);
 const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

 useEffect(() => setMounted(true), []);
 useEffect(() => () => { if (exitTimer.current) clearTimeout(exitTimer.current); }, []);

 useEffect(() => {
 if (!open) return;
 const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") startClose(); };
 document.addEventListener("keydown", onEsc);
 document.body.style.overflow = "hidden";
 return () => {
 document.removeEventListener("keydown", onEsc);
 document.body.style.overflow = "";
 };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [open]);

 function startClose() {
 if (closing) return;
 setClosing(true);
 if (exitTimer.current) clearTimeout(exitTimer.current);
 exitTimer.current = setTimeout(() => {
 setOpen(false);
 setClosing(false);
 }, EXIT_DURATION_MS);
 }

 function go(href: string) {
 startClose();
 setTimeout(() => navigate(href), 60);
 }

 function staggerStyle(idx: number): React.CSSProperties {
 if (closing) return { opacity: 1 };
 return {
 animation: "pt-nav-stagger 0.28s cubic-bezier(0.16, 1, 0.3, 1) both",
 animationDelay: `${80 + idx * 22}ms`,
 };
 }

 function isActive(href: string) {
 return pathname === href || pathname?.startsWith(href + "/");
 }

 const hasRole = (item: AdminItem) => canAccessRoute(item.href, roles);

 const trigger = (
 <button
 type="button"
 aria-label={t("menu.openAdminMenu")}
 aria-expanded={open}
 onClick={() => { setClosing(false); setOpen(true); }}
 className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-purple hover:bg-surface-soft transition active:scale-95"
 >
 <Menu className="w-5 h-5" />
 </button>
 );

 if (!mounted || !open) return trigger;

 let runningIdx = 1;

 const overlay = (
 <div
 className="fixed inset-0 z-[80] flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col md:hidden bg-background"
 role="dialog"
 aria-modal="true"
 aria-label={t("menu.adminNavigation")}
 style={{
 animation: `${closing ? "pt-overlay-out" : "pt-overlay-in"} ${closing ? "200ms" : "220ms"} cubic-bezier(0.4, 0, 0.2, 1) both`,
 paddingTop: "env(safe-area-inset-top)",
 paddingBottom: "env(safe-area-inset-bottom)",
 }}
 >
 {/* Decorative purple wash - same treatment as the member menu so the
 * admin overlay reads as part of the same product. */}
 <div
 aria-hidden
 className="pointer-events-none absolute inset-0"
 style={{
 background:
 "radial-gradient(ellipse at top, rgba(238,124,44,0.18), transparent 60%),"+
 "radial-gradient(ellipse at bottom right, rgba(238,124,44,0.10), transparent 50%)",
 }}
 />

 {/* Header */}
 <div className="relative flex shrink-0 items-center justify-between px-6 pt-4 pb-3 border-b border-border">
 <div style={staggerStyle(0)}>
 <div className="eyebrow">
 <ShieldCheck className="eyebrow__icon" size={11} aria-hidden />
 {t("groups.admin")}
 </div>
 <div className="font-display font-bold text-foreground" style={{ fontSize: 16, lineHeight: 1.2 }}>
 {t("menu.operatorConsole")}
 </div>
 </div>
 <button
 type="button"
 aria-label={t("menu.closeMenu")}
 onClick={() => startClose()}
 style={staggerStyle(0)}
 className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-strong text-foreground hover:bg-surface-soft hover:text-foreground active:scale-95 transition"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 {/* Body - scrollable list, grouped by section */}
 <nav className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-6">
 {ADMIN_GROUPS.map((group) => {
 const items = group.items.filter(hasRole);
 if (items.length === 0) return null;
 runningIdx += 1;
 return (
 <div key={group.titleKey}>
 <p
 className="px-1 pb-1.5 pt-4 text-[10px] uppercase text-muted-foreground"
 style={staggerStyle(runningIdx)}
 >
 {t(group.titleKey)}
 </p>
 <ul>
 {items.map((item) => {
 runningIdx += 1;
 const Icon = item.icon;
 const active = isActive(item.href);
 return (
 <li key={item.href} style={staggerStyle(runningIdx)}>
 <button
 type="button"
 onClick={() => go(item.href)}
 className={cn(
 "group relative w-full flex items-center gap-4 border-b border-border py-4 text-left transition-colors duration-base ease-color",
 active ? "text-foreground font-semibold" : "text-secondary-foreground hover:text-foreground",
 )}
 >
 <span
 aria-hidden
 className={cn(
 "inline-flex h-9 w-9 items-center justify-center rounded-md flex-shrink-0 transition-colors",
 active ? "bg-purple text-white" : "bg-surface-soft text-muted-foreground group-hover:text-foreground group-hover:bg-surface",
 )}
 >
 <Icon className="w-4 h-4" />
 </span>
 <span className="flex-1 leading-tight min-w-0">
 <span className="font-display block text-[16px] tracking-tight">{t(item.labelKey)}</span>
 {item.descriptionKey && (
 <span className="text-[12px] text-muted-foreground mt-0.5 block truncate">{t(item.descriptionKey)}</span>
 )}
 </span>
 <ArrowRight
 className={cn(
 "w-3.5 h-3.5 transition-transform duration-base ease-glide flex-shrink-0",
 active
 ? "translate-x-0 text-purple"
 : "-translate-x-1 text-muted-foreground/40 group-hover:translate-x-0 group-hover:text-secondary-foreground",
 )}
 />
 </button>
 </li>
 );
 })}
 </ul>
 </div>
 );
 })}

 {/* Active roles surface - mirrors AdminSidebar's roles block. */}
 {roles.length > 0 && (
 <div
 className="mt-6 mx-1 px-3 py-2.5 rounded-lg bg-surface-soft border border-border"
 style={staggerStyle(runningIdx + 1)}
 >
 <div className="eyebrow eyebrow--muted" style={{ marginBottom: 6 }}>
 {t("menu.activeRoles")}
 </div>
 <div className="flex flex-wrap gap-1.5">
 {roles.map((r) => (
 <span key={r} className="pill pill-purple">{r}</span>
 ))}
 </div>
 </div>
 )}
 </nav>

 {/* Footer - sign-out */}
 <div
 className="relative shrink-0 border-t border-border px-5 py-4 space-y-2"
 style={staggerStyle(runningIdx + 3)}
 >
 <SignOutButton className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground transition">
 <LogOut className="w-3.5 h-3.5" />
 <span className="text-[11px] uppercase">{tc("actions.signOut")}</span>
 </SignOutButton>
 </div>
 </div>
 );

 return (
 <>
 {trigger}
 {createPortal(overlay, document.body)}
 </>
 );
}

/** Legacy export retained for back-compat with any direct imports. */
export const AdminMobileMenu = AdminMobileMenuButton;
