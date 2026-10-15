"use client";

import { useEffect, useState } from "react";
import { ShellSkeleton } from "@/components/cypher/Skeleton";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { canAccessRoute, landingRouteFor } from "@/lib/rbac/routeAccess";
import { RouteForbidden } from "@/components/routing/RouteForbidden";
import { AdminSidebar } from "@/components/cypher/AdminSidebar";
import { AdminTopBar } from "@/components/cypher/AdminTopBar";
import { SignOutButton } from "@/components/cypher/SignOutButton";
import { syncLanguageFromProfile } from "@/services/language";
import { RouteOutletShell } from "@/components/routing/RouteOutletBoundary";

export default function AdminLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [shell, setShell] = useState<{
    userName: string | null;
    avatarUrl: string | null;
    userLanguage: string;
    roles: string[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      const [{ data: isStaff }, { data: profile }, { data: roleRows }] = await Promise.all([
        supabase.rpc("is_staff" as never).single(),
        supabase
          .from("profiles")
          .select("first_name, last_name, display_name, email, avatar_url, language")
          .eq("id", user.id)
          .single(),
        supabase.from("app_roles").select("role").eq("user_id", user.id),
      ]);

      if (!isStaff) {
        // Standalone admin portal: a signed-in but non-staff user has nowhere
        // to go, so show an access-denied screen instead of redirecting.
        setDenied(true);
        setReady(true);
        return;
      }

      const profileRow = profile as {
        display_name?: string | null;
        first_name?: string | null;
        avatar_url?: string | null;
        language?: string | null;
      } | null;

      const roleSet = new Set<string>((roleRows ?? []).map((r: { role: string }) => r.role));
      if (roleSet.size === 0) roleSet.add("admin");

      const roles = [...roleSet];

      const userLanguage = profileRow?.language ?? "en";
      await syncLanguageFromProfile(userLanguage);

      setShell({
        userName: profileRow?.display_name || profileRow?.first_name || null,
        avatarUrl: profileRow?.avatar_url ?? null,
        userLanguage,
        roles,
      });
      setReady(true);
    }
    void load();
  }, [navigate]);

  // Per-route authorization. Runs on every navigation (not just mount), so a
  // typed URL, a back-button hop, or an in-app link all hit the same check.
  // ROUTE_ACCESS is deny-by-default, so an unmapped page is super_admin-only.
  const home = shell ? landingRouteFor(shell.roles) : "/admin";
  const authorized = !shell || canAccessRoute(pathname, shell.roles);

  // The bare /admin hub is a redirect, not a denial: roles that don't own the
  // multi-section dashboard (live_host, educator, signal_provider, marketing)
  // get bounced to the one page they do own.
  const redirectHome = !authorized && pathname.replace(/\/$/, "") === "/admin" && home !== "/admin";
  useEffect(() => {
    if (redirectHome) navigate(home, { replace: true });
  }, [redirectHome, home, navigate]);

  if (ready && denied) {
    return (
      <main className="member-main">
        <div className="member-main__content" style={{ display: "grid", placeItems: "center", minHeight: "60vh", textAlign: "center", gap: "1rem" }}>
          <div>
            <h1 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 600 }}>Access denied</h1>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
              This account doesn't have staff access to the admin portal.
            </p>
          </div>
          <SignOutButton>Sign out</SignOutButton>
        </div>
      </main>
    );
  }

  // Hold the skeleton for the tick between deciding to redirect and the effect
  // firing, so the forbidden screen never flashes on the way to /admin.
  if (!ready || !shell || redirectHome) {
    return (
      <ShellSkeleton />
    );
  }

  return (
    <>
      <AdminTopBar
        userName={shell.userName}
        avatarUrl={shell.avatarUrl}
        language={shell.userLanguage}
        roles={shell.roles}
      />
      <AdminSidebar roles={shell.roles} />
      <main className="member-main">
        <div className="member-main__content">
          <RouteOutletShell>
            {authorized ? <Outlet /> : <RouteForbidden homeHref={home} />}
          </RouteOutletShell>
        </div>
      </main>
    </>
  );
}
