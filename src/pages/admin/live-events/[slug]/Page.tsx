"use client";

import {  } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";
import { EventForm } from "../event-form";

type Params = Promise<{ slug: string }>;

import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function AdminLiveEventEditPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const params = useParams() as Record<string, string>;
  const [content, setContent] = useState<React.ReactNode>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let __jsx: React.ReactNode = null;
const { slug } = params;
 const supabase = createClient();

 if (slug === "new") {
 if (!cancelled) { setContent(<EventForm />); setLoading(false); }
 return;
 }

 const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
 const lookup = isUuid
 ? supabase.from("live_events").select("*").eq("id", slug).maybeSingle()
 : supabase.from("live_events").select("*").eq("slug", slug).maybeSingle();
 const { data: eventRaw } = await lookup;
 if (!eventRaw) { navigate("/404"); return; }

 __jsx = <EventForm event={eventRaw as Parameters<typeof EventForm>[0]["event"]} />;
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
