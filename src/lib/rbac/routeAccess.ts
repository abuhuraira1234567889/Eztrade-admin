/**
 * Single source of truth for admin route -> role access.
 *
 * Before this file, roles lived in four duplicated nav arrays (AdminSidebar +
 * AdminMobileMenu, x2 apps) that only *hid links*. Any staff member could reach
 * any admin page by typing the URL. Everything that gates an admin page - the
 * sidebar, the mobile menu, and the router guard in AdminLayout - now reads
 * this map, and the backend mirrors it with @Roles() on the matching endpoints.
 *
 * Keep in sync with:
 *   - backend/src/common/rbac/route-access.ts   (API-side mirror)
 *   - app_roles.role CHECK constraint           (schema/001_initial.sql, 052)
 */

/** Every grantable role. Mirrors the app_roles CHECK constraint. */
export const APP_ROLES = [
  "super_admin",
  "admin",
  "support",
  "educator",
  "signal_provider",
  "compliance",
  "marketing",
  "live_host",
  // va / analyst / access_bot still exist in the DB CHECK but grant nothing here:
  // the Access Bot and its ops roles moved to GoPromo (metaads.gopromo.io).
] as const;

export type AppRole = (typeof APP_ROLES)[number];

/**
 * super_admin is never listed in the tables below - it is granted every route
 * implicitly so a new page can never accidentally lock out the owner.
 */
export const SUPER_ROLE: AppRole = "super_admin";

type RouteRule = {
  /** Path prefix. Longest matching prefix wins, so a nested route such as
   *  /admin/academy/courses can be narrower than /admin/academy. */
  prefix: string;
  /** Roles allowed in addition to super_admin. Empty = super_admin only. */
  roles: AppRole[];
  /** Match this path only, never its children. Used for the /admin hub so it
   *  can't act as a catch-all that silently opens unmapped pages. */
  exact?: boolean;
};

/**
 * Route table. Order does not matter - resolution is longest-prefix.
 * A path with no matching rule is denied (deny-by-default): adding a page
 * without adding it here makes it super_admin-only, never world-open.
 */
export const ROUTE_ACCESS: RouteRule[] = [
  // --- Insights ---
  { prefix: "/admin/analytics", roles: ["admin", "marketing"] },
  { prefix: "/admin/users", roles: ["admin"] },
  // Marketing owns the funnel, so leads pair with analytics rather than users.
  { prefix: "/admin/leads", roles: ["admin", "marketing"] },
  { prefix: "/admin/product-feedback", roles: ["admin", "marketing"] },
  { prefix: "/admin/telegram", roles: ["admin"] },
  { prefix: "/admin/tradingview", roles: ["admin"] },

  // --- Operations ---
  { prefix: "/admin/redemptions", roles: ["admin", "compliance"] },
  { prefix: "/admin/rewards", roles: ["admin", "compliance"] },
  { prefix: "/admin/csv-import", roles: ["admin", "compliance"] },
  { prefix: "/admin/puprime-import", roles: ["admin", "compliance"] },
  { prefix: "/admin/live-events", roles: ["admin", "signal_provider", "live_host"] },
  { prefix: "/admin/competitions", roles: ["admin", "educator"] },
  { prefix: "/admin/leaderboard", roles: ["admin"] },
  { prefix: "/admin/quizzes", roles: ["admin", "educator"] },
  { prefix: "/admin/trade-ideas", roles: ["admin", "signal_provider"] },
  { prefix: "/admin/ib-access", roles: ["admin"] },
  { prefix: "/admin/extensions", roles: ["admin", "compliance"] },
  { prefix: "/admin/support", roles: ["admin", "support", "compliance"] },
  { prefix: "/admin/knowledge-base", roles: ["admin", "support", "compliance"] },
  { prefix: "/admin/announcements", roles: ["admin", "support"] },
  { prefix: "/admin/notifications", roles: ["admin", "compliance", "support"] },

  // --- Config ---
  { prefix: "/admin/tiers", roles: ["admin", "compliance"] },
  { prefix: "/admin/team", roles: [] }, // super_admin only
  { prefix: "/admin/qa", roles: ["admin"] },
  { prefix: "/admin/crons", roles: ["admin"] },

  // --- Site-config config (runtime branding, catalogs, copy) ---
  { prefix: "/admin/academy", roles: ["admin", "educator"] },
  { prefix: "/admin/settings", roles: ["admin"] },
  { prefix: "/admin/milestones", roles: ["admin"] },
  { prefix: "/admin/ib-ranks", roles: ["admin"] },
  { prefix: "/admin/legal", roles: ["admin", "compliance"] },
  { prefix: "/admin/brand-content", roles: ["admin", "marketing"] },
  { prefix: "/admin/email-templates", roles: ["admin"] },
  { prefix: "/admin/images", roles: ["admin"] },
  { prefix: "/admin/theme", roles: ["admin"] },

  // --- Hub ---
  // The bare /admin index is a multi-section dashboard, so it is only useful to
  // the two broad roles. Everyone else is sent to their own landing route.
  // `exact` is essential here: without it this rule would cover every /admin/*
  // path that has no rule of its own, handing `admin` any page added later.
  { prefix: "/admin", roles: ["admin"], exact: true },
];

/**
 * Landing-route preference order. The first entry the caller can access becomes
 * their home when they hit /admin or an unauthorized URL. Ordered so that
 * single-purpose roles (live_host, educator, signal_provider) land on the page
 * they actually own.
 */
const LANDING_ORDER = [
  "/admin",
  "/admin/analytics",
  "/admin/support",
  "/admin/live-events",
  "/admin/quizzes",
  "/admin/trade-ideas",
  "/admin/notifications",
];

/** Strip a trailing slash so "/admin/team/" matches "/admin/team". */
function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/** True when `rule` covers `pathname` at a path-segment boundary. */
function covers(rule: RouteRule, pathname: string): boolean {
  if (pathname === rule.prefix) return true;
  return !rule.exact && pathname.startsWith(rule.prefix + "/");
}

/** The most specific rule covering `pathname`, or null when none matches. */
export function ruleFor(pathname: string): RouteRule | null {
  const path = normalize(pathname);
  let best: RouteRule | null = null;
  for (const rule of ROUTE_ACCESS) {
    if (!covers(rule, path)) continue;
    if (!best || rule.prefix.length > best.prefix.length) best = rule;
  }
  return best;
}

/**
 * Authorization check for an admin path. Deny-by-default: an unmapped
 * /admin/* path is super_admin-only.
 */
export function canAccessRoute(pathname: string, roles: readonly string[]): boolean {
  if (roles.includes(SUPER_ROLE)) return true;
  const rule = ruleFor(pathname);
  if (!rule) return false;
  return rule.roles.some((r) => roles.includes(r));
}

/** Where to send a user who has no access to the page they asked for. */
export function landingRouteFor(roles: readonly string[]): string {
  const hit = LANDING_ORDER.find((path) => canAccessRoute(path, roles));
  // No accessible admin page at all - AdminLayout renders the denied screen.
  return hit ?? "/admin";
}
