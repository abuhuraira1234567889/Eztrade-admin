"use client";

import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { SidebarBrand } from "@/components/cypher/SidebarBrand";
import { canAccessRoute } from "@/lib/rbac/routeAccess";
import {
 ChevronLeft, ShieldCheck,
 Gift, ShoppingBag, Upload, FileUp, Sliders, BarChart3, Bell, Users,
 FileSearch, Video, Wrench, LineChart, Settings, Trophy, Medal,
 GraduationCap, UserPlus, Megaphone, Lightbulb, Bug, History, Headphones, Send,
 ClipboardList, Network, BookOpen, CalendarClock,
 SlidersHorizontal, ScrollText, Share2, Mail, ImageIcon, Palette,
 type LucideIcon,
} from "lucide-react";

type NavItem = {
 href: string;
 labelKey: string;
 icon: LucideIcon;
};

type NavGroup = {
 titleKey: string;
 icon: LucideIcon;
 items: NavItem[];
};

/**
 * Admin nav groups - mirrors the member sidebar's group/eyebrow structure
 * (Sidebar.tsx) so the two shells feel like the same product. Routes are the
 * ones that actually exist under app/admin/* today.
 *
 * Items carry NO roles of their own: visibility is derived from ROUTE_ACCESS
 * (@/lib/rbac/routeAccess), the same table AdminLayout enforces. A link is
 * shown exactly when the page behind it would actually open.
 */
const NAV_GROUPS: NavGroup[] = [
 { titleKey: "groups.adminInsights", icon: LineChart, items: [
 { href: "/admin/analytics", labelKey: "admin.analytics", icon: BarChart3 },
 { href: "/admin/leads", labelKey: "admin.leads", icon: UserPlus },
 { href: "/admin/product-feedback", labelKey: "admin.productFeedback", icon: ClipboardList },
 { href: "/admin/users", labelKey: "admin.users", icon: Users },
 { href: "/admin/telegram", labelKey: "admin.telegram", icon: Send },
 { href: "/admin/tradingview", labelKey: "admin.tradingview", icon: LineChart },
 ]},
 { titleKey: "groups.adminOperations", icon: Wrench, items: [
 { href: "/admin/redemptions", labelKey: "admin.redemptions", icon: Gift },
 { href: "/admin/rewards", labelKey: "admin.rewards", icon: ShoppingBag },
 // CSV Import + PuPrime Import hidden per request - re-enable by uncommenting.
 // { href: "/admin/csv-import", labelKey: "admin.csvImport", icon: Upload },
 { href: "/admin/live-events", labelKey: "admin.liveSessions", icon: Video },
 { href: "/admin/competitions", labelKey: "admin.competitions", icon: Trophy },
 { href: "/admin/leaderboard", labelKey: "admin.leaderboard", icon: Medal },
 { href: "/admin/quizzes", labelKey: "admin.quizzes", icon: GraduationCap },
 { href: "/admin/academy", labelKey: "admin.academy", icon: BookOpen },
 { href: "/admin/trade-ideas", labelKey: "admin.tradeIdeas", icon: Lightbulb },
 { href: "/admin/support", labelKey: "admin.support", icon: Headphones },
 { href: "/admin/extensions", labelKey: "admin.extensions", icon: CalendarClock },
 { href: "/admin/knowledge-base", labelKey: "admin.knowledgeBase", icon: BookOpen },
 { href: "/admin/announcements", labelKey: "admin.announcements", icon: Megaphone },
 { href: "/admin/notifications", labelKey: "admin.notifications", icon: Bell },
 ]},
 { titleKey: "groups.adminConfig", icon: Settings, items: [
 { href: "/admin/tiers", labelKey: "admin.tiers", icon: Sliders },
 { href: "/admin/settings", labelKey: "admin.settings", icon: SlidersHorizontal },
 { href: "/admin/milestones", labelKey: "admin.milestones", icon: Medal },
 { href: "/admin/legal", labelKey: "admin.legal", icon: ScrollText },
 { href: "/admin/brand-content", labelKey: "admin.brandContent", icon: Share2 },
 { href: "/admin/email-templates", labelKey: "admin.emailTemplates", icon: Mail },
 { href: "/admin/images", labelKey: "admin.images", icon: ImageIcon },
 { href: "/admin/team", labelKey: "admin.team", icon: Users },
 { href: "/admin/qa", labelKey: "admin.qa", icon: FileSearch },
 { href: "/admin/crons", labelKey: "admin.crons", icon: History },
 ]},
];

const SIDEBAR_W_OPEN = 256;
const SIDEBAR_W_COLLAPSED = 64;

export function AdminSidebar({ roles }: { roles: string[] }) {
 const { pathname } = useLocation();
 const { t } = useTranslation("nav");
 const { t: tc } = useTranslation("common");
 const [collapsed, setCollapsed] = useState(false);

 // Hydrate collapsed state from the same localStorage key as the member
 // sidebar so the admin shell respects the user's existing preference.
 useEffect(() => {
 try {
 const v = localStorage.getItem("pt-sidebar-collapsed");
 if (v === "1") setCollapsed(true);
 } catch { /* ignore */ }
 }, []);

 // Sync the CSS var that <main> uses for its left margin so content expands
 // and contracts in lockstep with the sidebar width - identical mechanism
 // to the member sidebar.
 useEffect(() => {
 const w = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_OPEN;
 document.documentElement.style.setProperty("--sidebar-w", `${w}px`);
 try { localStorage.setItem("pt-sidebar-collapsed", collapsed ? "1" : "0"); } catch { /* ignore */ }
 }, [collapsed]);

 const w = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_OPEN;
 const hasRole = (item: NavItem) => canAccessRoute(item.href, roles);

 return (
 <aside
 className="hidden md:flex md:flex-col fixed top-0 left-0 bottom-0 bg-surface border-r border-border z-40 overflow-y-auto overflow-x-hidden transition-[width] duration-base ease-glide group/sidebar"
 style={{ width: w }}
 >
 {/* Brand block - same lockup as the member sidebar with a small Admin
 * eyebrow underneath so admins know which context they're in. */}
 <div
 className="flex-shrink-0 border-b border-border text-foreground"
 style={{ padding: collapsed ? "16px 12px 12px" : "20px 18px 16px" }}
 >
 {collapsed ? (
 <div className="flex flex-col items-center gap-1.5">
 <SidebarBrand collapsed homeHref="/admin" />
 <ShieldCheck className="w-3 h-3 text-purple" aria-hidden />
 </div>
 ) : (
 <div className="flex flex-col gap-1">
 <SidebarBrand collapsed={false} homeHref="/admin" />
 <div className="eyebrow" style={{ paddingTop: 2 }}>
 <ShieldCheck className="eyebrow__icon" size={11} aria-hidden />
 {t("groups.admin")}
 </div>
 </div>
 )}
 </div>

 <nav className="flex-1 pb-8" style={{ paddingTop: 8 }}>
 {NAV_GROUPS.map((group) => {
 const items = group.items.filter(hasRole);
 if (items.length === 0) return null;
 const GroupIcon = group.icon;
 return (
 <div key={group.titleKey}>
 {!collapsed && (
 <div className="eyebrow eyebrow--muted" style={{ padding: "14px 18px 6px" }}>
 <GroupIcon className="eyebrow__icon" size={13} aria-hidden />
 {t(group.titleKey)}
 </div>
 )}
 {collapsed && <div className="h-2" />}

 {items.map((item) => {
 const Icon = item.icon;
 const label = t(item.labelKey);
 const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
 return (
 <Link
 key={item.href}
 to={item.href}
 title={collapsed ? label : undefined}
 className={cn(
 "flex items-center gap-3 transition-all relative",
 isActive
 ? "bg-purple-dim text-foreground font-semibold"
 : "text-secondary-foreground hover:bg-purple-dim/40 hover:text-foreground",
 collapsed && "justify-center",
 )}
 style={{
 padding: collapsed ? "10px 0" : "9px 18px",
 borderLeft: isActive ? "3px solid #EE7C2C" : "3px solid transparent",
 }}
 >
 <Icon className="w-4 h-4 flex-shrink-0" />
 {!collapsed && <span className="flex-1 text-[13.5px] font-medium">{label}</span>}
 </Link>
 );
 })}
 </div>
 );
 })}

 {/* Active roles pill block - only shown when expanded, replaces the
 * member sidebar's tier badge surface. */}
 {!collapsed && roles.length > 0 && (
 <div className="mt-6 mx-3 px-3 py-2.5 rounded-lg bg-surface-soft border border-border">
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

 {/* Collapse toggle - pinned bottom, same affordance as member sidebar */}
 <div className="flex-shrink-0 border-t border-border" style={{ padding: collapsed ? "8px 0" : "8px 12px" }}>
 <button
 onClick={() => setCollapsed((v) => !v)}
 aria-label={collapsed ? tc("sidebar.expandSidebar") : tc("sidebar.collapseSidebar")}
 title={collapsed ? tc("sidebar.expandSidebar") : tc("sidebar.collapseSidebar")}
 className={cn(
 "w-full flex items-center gap-2 rounded-md text-secondary-foreground hover:bg-purple-dim/40 hover:text-foreground transition active:scale-[0.97]",
 collapsed ? "justify-center py-2" : "px-2 py-1.5",
 )}
 >
 <ChevronLeft className={cn("w-4 h-4 flex-shrink-0 transition-transform", collapsed && "rotate-180")} />
 {!collapsed && <span className="text-[12px] uppercase">{tc("actions.collapse")}</span>}
 </button>
 </div>
 </aside>
 );
}
