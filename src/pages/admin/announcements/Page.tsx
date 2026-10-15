"use client";

import { createClient } from "@/lib/supabase/client";
import { Megaphone } from "lucide-react";
import { AnnouncementsManager, type AdminAnnouncement } from "./manager";
import { CommentModerationPanel } from "./comment-moderation";

import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function AdminAnnouncementsPage() {
  const { t } = useTranslation("announcements");
  const navigate = useNavigate();

  const [content, setContent] = useState<React.ReactNode>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();

  // Admin sees everything, published or not, newest first. RLS lets staff
  // read all rows.
  const { data: rows } = await supabase
    .from("announcements" as never)
    .select("id, title, body, source, is_published, published_at, comments_locked")
    .order("published_at", { ascending: false })
    .limit(200);

  const initial = ((rows ?? []) as unknown) as AdminAnnouncement[];

  const __jsx = (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <Megaphone className="h-6 w-6 text-purple" /> {t("admin.title")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("admin.subtitle")}</p>
      </div>

      <AnnouncementsManager initial={initial} />

      <div className="mt-10 border-t border-border pt-8">
        <CommentModerationPanel />
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
