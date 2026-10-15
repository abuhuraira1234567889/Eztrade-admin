"use client";

import { createClient } from "@/lib/supabase/client";
import { CompetitionForm } from "../competition-form";
import { CompetitionStandings } from "../standings";

/**
 * Edit form. Resolves either by uuid (the primary route the list page links
 * to) or by slug as a convenience, mirroring app/admin/live-events/[slug].
 */

import React, { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function AdminEditCompetitionPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const params = useParams() as Record<string, string>;
  const [content, setContent] = useState<React.ReactNode>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { id } = params;
        const supabase = createClient();

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const lookup = isUuid
          ? supabase.from("competitions").select("*").eq("id", id).maybeSingle()
          : supabase.from("competitions").select("*").eq("slug", id).maybeSingle();
        const { data } = await lookup;
        if (!data) { navigate("/404"); return; }

        const comp = data as unknown as { id: string };
        const __jsx = (
          <>
            <CompetitionForm competition={data as unknown as Parameters<typeof CompetitionForm>[0]["competition"]} />
            {/* Standings sit under the form: the settings above are what an admin
                changes, the board below is what those settings produced. */}
            <div className="max-w-3xl mx-auto px-4 md:px-8 pb-10">
              <CompetitionStandings competitionId={comp.id} />
            </div>
          </>
        );
        if (!cancelled) { setContent(__jsx); setLoading(false); }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t, navigate, params]);

  if (loading) return <PageSkeleton />;
  return content;
}
