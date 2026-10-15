"use client";

import { createClient } from "@/lib/supabase/client";
import { AdminNotifForm } from "./form";
import { Bell } from "lucide-react";

import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function AdminNotificationsPage() {
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
 const { data: profile } = await supabase
 .from("profiles")
 .select("admin_telegram_user_id, admin_notif_telegram, admin_notif_email, admin_on_duty, telegram_username")
 .eq("id", user!.id)
 .maybeSingle();

 const __jsx = (
 <div className="">
 <div className="mb-6">
 <h1 className="text-2xl font-display font-bold flex items-center gap-2">
 <Bell className="w-6 h-6 text-purple" /> Admin notifications
 </h1>
 <p className="text-sm text-muted-foreground mt-1">
 Where new submission alerts get sent. Toggle on-duty to receive direct DMs;
 off-duty admins still get the queue page but no per-event pings.
 </p>
 </div>

 <AdminNotifForm initial={(profile as any) ?? {}} />

 <div className="mt-6 rounded-xl border border-border bg-surface p-5 text-xs text-secondary-foreground leading-relaxed">
 <strong className="text-foreground">How fan-out works:</strong> when a member submits and their account isn't yet in the IB cache,
 we ping every on-duty admin via their preferred channels. If nobody's on duty, the alert falls back to the main signals group
 chat so it doesn't get lost. Use the on-duty toggle to rotate coverage between team members.
 </div>
 </div>
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
