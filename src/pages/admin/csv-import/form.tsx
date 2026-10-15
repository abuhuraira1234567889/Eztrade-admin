"use client";

import { useState } from "react";
import { Upload, Check, AlertCircle } from "lucide-react";

type Broker = { id: number; slug: string; display_name: string; csv_format: string; is_active: boolean };

export function CsvImportForm({ brokers }: { brokers: Broker[] }) {
 const [brokerId, setBrokerId] = useState<number>(brokers[0]?.id ?? 0);
 const [file, setFile] = useState<File | null>(null);
 const [busy, setBusy] = useState(false);
 const [result, setResult] = useState<null | { ok: true; parsed: number; errors: number; autoApproved: number } | { ok: false; error: string }>(null);

 async function go(e: React.FormEvent) {
 e.preventDefault();
 if (!file || !brokerId) return;
 setBusy(true);
 setResult(null);
 const fd = new FormData();
 fd.append("broker_id", String(brokerId));
 fd.append("file", file);

 try {
 const r = await fetch("/api/admin/csv-import", { method: "POST", body: fd });
 const j = await r.json();
 if (j.ok) {
 setResult({ ok: true, parsed: j.summary.parsed, errors: j.summary.errors.length, autoApproved: j.autoApproved });
 } else {
 setResult({ ok: false, error: j.error ?? "Upload failed" });
 }
 } catch (err: any) {
 setResult({ ok: false, error: err?.message ?? "Network error" });
 } finally {
 setBusy(false);
 }
 }

 return (
 <form onSubmit={go} className="space-y-4 rounded-xl border border-border bg-surface p-5">
 <div>
 <label className="block field-label mb-1">Broker</label>
 <select
 value={brokerId}
 onChange={(e) => setBrokerId(Number(e.target.value))}
 className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm outline-none focus:border-purple"
 >
 {brokers.filter((b) => b.is_active).map((b) => (
 <option key={b.id} value={b.id}>{b.display_name} · {b.csv_format}</option>
 ))}
 </select>
 {brokers.length === 0 && <div className="text-xs text-amber mt-2">No brokers configured. Add one in Supabase first.</div>}
 </div>

 <div>
 <label className="block field-label mb-1">IB roster CSV</label>
 <input
 type="file"
 accept=".csv,text/csv"
 onChange={(e) => setFile(e.target.files?.[0] ?? null)}
 className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-purple/30 file:bg-purple-dim file:text-purple file:font-semibold file:text-xs file:cursor-pointer hover:file:bg-purple-dim/70"
 />
 </div>

 <button
 type="submit"
 disabled={!file || !brokerId || busy}
 className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-60"
 >
 <Upload className="w-4 h-4" /> {busy ? "Uploading…" : "Upload + auto-approve"}
 </button>

 {result?.ok && (
 <div className="rounded-md bg-green-dim border border-green/20 px-4 py-3 text-sm text-foreground">
 <div className="flex items-center gap-2 text-green font-semibold mb-1"><Check className="w-4 h-4" /> Done</div>
 <div className="text-xs text-secondary-foreground">
 Parsed <strong>{result.parsed}</strong> rows · {result.errors} errors ·
 <strong className="text-green"> {result.autoApproved} pending submissions auto-approved</strong>
 </div>
 </div>
 )}
 {result && !result.ok && (
 <div className="rounded-md bg-red-dim border border-red/20 px-4 py-3 text-sm text-red flex items-start gap-2">
 <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
 {result.error}
 </div>
 )}
 </form>
 );
}
