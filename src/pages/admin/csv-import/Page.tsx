"use client";

import { createClient } from "@/lib/supabase/client";
import { CsvImportForm } from "./form";

import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function CsvImportPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  const [content, setContent] = useState<React.ReactNode>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
 const { data: brokers } = await supabase
 .from("brokers")
 .select("id, slug, display_name, csv_format, is_active")
 .eq("is_active", true)
 .order("display_name");

 const __jsx = (
 <div className="">
 <div className="mb-6">
 <h1 className="text-2xl font-display font-bold">CSV import</h1>
 <p className="text-sm text-muted-foreground mt-1">
 Upload an IB roster CSV from any of our partner brokers. Anyone newly in the roster
 who has a pending submission gets auto-approved on the spot.
 </p>
 </div>

 <CsvImportForm brokers={(brokers ?? []) as any[]} />

 <div className="mt-8 rounded-xl border border-border bg-surface p-5 text-xs text-secondary-foreground leading-relaxed">
 <h3 className="text-sm font-display font-bold text-foreground mb-2">Adding a new broker</h3>
 <ol className="list-decimal pl-5 space-y-1.5">
 <li>Add a row to the <code className="bg-purple-dim px-1 rounded">brokers</code> table with the broker's TradeSync broker_id and a <code className="bg-purple-dim px-1 rounded">csv_format</code> string.</li>
 <li>If the broker uses a non-standard CSV layout, add a parser to <code className="bg-purple-dim px-1 rounded">lib/csv-import/registry.ts</code> matching that format. Otherwise the generic parser handles common layouts (column aliases for account number, user id, currency, etc).</li>
 <li>Once the broker is <code className="bg-purple-dim px-1 rounded">is_active=true</code>, members can pick it on the broker form, and CSVs upload here.</li>
 </ol>
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
