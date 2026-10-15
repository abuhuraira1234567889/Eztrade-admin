"use client";

import { createClient } from "@/lib/supabase/client";
import { TeamManager } from "./manager";
import { AmbassadorManager } from "./ambassadors";

import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type Member = { user_id: string; email: string; name: string; roles: string[]; granted_at: string };

export default function TeamPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Super admin only. NB: the RPC param is `_role` (has_role(_role text)) -
        // passing `role_name` makes PostgREST 404 the function, so isSuper would be
        // null and every super_admin gets bounced out of the page.
        const { data: isSuper } = await supabase.rpc("has_role" as never, { _role: "super_admin" } as never);
        if (!isSuper) {
          navigate("/admin");
          return;
        }

        const { data: rows } = await supabase
          .from("app_roles")
          .select(
            "user_id, role, granted_at, profile:profiles!app_roles_user_id_fkey(email, first_name, last_name)",
          )
          .order("granted_at", { ascending: false });

        const byUser = new Map<string, Member>();
        for (const r of (rows ?? []) as any[]) {
          const id = r.user_id;
          if (!byUser.has(id)) {
            byUser.set(id, {
              user_id: id,
              email: r.profile?.email ?? "-",
              name:
                [r.profile?.first_name, r.profile?.last_name].filter(Boolean).join(" ") ||
                (r.profile?.email ?? "-"),
              roles: [],
              granted_at: r.granted_at,
            });
          }
          byUser.get(id)!.roles.push(r.role);
        }

        if (!cancelled) {
          setMembers(Array.from(byUser.values()));
          setCurrentUserId(user?.id ?? "");
          setReady(true);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, navigate]);

  if (loading) return <PageSkeleton />;
  if (!ready) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Team & roles</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Grant or revoke admin roles. <strong>super_admin</strong> sees everything,{" "}
          <strong>compliance</strong> only sees Approvals, <strong>support</strong> only sees
          Notifications, marketing only Analytics, <strong>live_host</strong> only hosts Live Sessions.
        </p>
      </div>

      <TeamManager members={members} currentUserId={currentUserId} />

      <div className="mt-10 pt-8 border-t border-border">
        <AmbassadorManager />
      </div>
    </div>
  );
}
