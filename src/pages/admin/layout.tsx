"use client";

import {  } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";
import { AdminSidebar } from "@/components/cypher/AdminSidebar";
import { AdminTopBar } from "@/components/cypher/AdminTopBar";

/**
 * Admin shell - uses the same sidebar + top bar chrome as the member-facing
 * platform (app/(member)/layout.tsx) so the admin panel feels native. The
 * route gate (`is_staff()` RPC) is unchanged; only the visual shell was
 * swapped from the bespoke header-only layout to the shared two-column
 * sidebar + sticky top bar layout.
 */

import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function AdminLayout({ children }: { children?: React.ReactNode }) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  const [content, setContent] = useState<React.ReactNode>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) { navigate("/login"); return; }

 const { data: isStaff } = await supabase.rpc("is_staff" as never).single();
 if (!isStaff) { navigate("/dashboard"); return; }

 // Fetch the user's profile (for avatar / display name / language) and their
 // assigned roles concurrently - they're independent reads.
 const [{ data: profile }, { data: roleRows }] = await Promise.all([
 supabase
 .from("profiles")
 .select("first_name, last_name, display_name, email, avatar_url, language")
 .eq("id", user.id)
 .single(),
 supabase
 .from("app_roles")
 .select("role")
 .eq("user_id", user.id),
 ]);

 // Supabase generated types collapse to `never` here (same as in
 // app/(member)/layout.tsx); cast through the column shape we asked for to
 // keep the narrow types available without spreading `any` through the file.
 const profileRow = profile as {
 display_name?: string | null;
 first_name?: string | null;
 email?: string | null;
 avatar_url?: string | null;
 language?: string | null;
 } | null;
 const userName = profileRow?.display_name || profileRow?.first_name || null;
 const avatarUrl = profileRow?.avatar_url ?? null;
 const userLanguage = profileRow?.language ?? "en";

 const roleSet = new Set<string>((roleRows ?? []).map((r: { role: string }) => r.role));
 // Back-compat: treat a staff user with no explicit role rows as `admin`.
 if (roleSet.size === 0) roleSet.add("admin");
 const roles = Array.from(roleSet);

 const __jsx = (
 <>
 <AdminTopBar
 userEmail={profileRow?.email ?? user.email}
 userName={userName}
 avatarUrl={avatarUrl}
 roles={roles}
 language={userLanguage}
 />
 <AdminSidebar roles={roles} />
 <main
 className="md:ml-[var(--sidebar-w,296px)] pt-14 min-h-screen w-auto transition-[margin] duration-200"
 style={{ background: "var(--bg-page)" }}
 >
 <div className="px-4 sm:px-6 md:px-8 lg:px-10 py-6 md:py-8">
 {children}
 </div>
 </main>
 </>
 );
        if (!cancelled) { setContent(__jsx); setLoading(false); }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t, navigate]);

  if (loading) return <PageSkeleton />;
  return content;
}
