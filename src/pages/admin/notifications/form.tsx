"use client";

import { useState, useTransition } from "react";
import { Save, Check, Send, Mail, Power } from "lucide-react";
import { saveAdminNotifPrefs } from "@/services/action-stubs";

type Prefs = {
 admin_telegram_user_id?: number | null;
 admin_notif_telegram?: boolean;
 admin_notif_email?: boolean;
 admin_on_duty?: boolean;
 telegram_username?: string | null;
};

export function AdminNotifForm({ initial }: { initial: Prefs }) {
 const [pending, startTransition] = useTransition();
 const [saved, setSaved] = useState(false);
 const [tgId, setTgId] = useState<string>(initial.admin_telegram_user_id?.toString() ?? "");
 const [prefs, setPrefs] = useState<Prefs>({
 admin_notif_telegram: initial.admin_notif_telegram ?? true,
 admin_notif_email: initial.admin_notif_email ?? true,
 admin_on_duty: initial.admin_on_duty ?? false,
 });

 function set<K extends keyof Prefs>(k: K, v: Prefs[K]) { setPrefs((p) => ({ ...p, [k]: v })); }

 function save() {
 startTransition(() => {
 void saveAdminNotifPrefs({ ...prefs, admin_telegram_user_id: tgId.trim() ? Number(tgId) : null }).then((res) => {
 if (res.ok) {
 setSaved(true);
 setTimeout(() => setSaved(false), 1500);
 }
 });
 });
 }

 return (
 <div className="space-y-4">
 {/* On-duty toggle */}
 <div className={"rounded-xl border p-5 "+ (prefs.admin_on_duty ? "border-green/40 bg-green-dim/40" : "border-border bg-surface")}>
 <label className="flex items-start gap-3 cursor-pointer">
 <input
 type="checkbox"
 checked={!!prefs.admin_on_duty}
 onChange={(e) => set("admin_on_duty", e.target.checked)}
 className="mt-1 accent-purple"
 />
 <div className="flex-1">
 <div className="flex items-center gap-2 font-display font-bold text-base">
 <Power className={"w-4 h-4 "+ (prefs.admin_on_duty ? "text-green" : "text-muted-foreground")} /> On duty
 </div>
 <div className="text-xs text-secondary-foreground leading-relaxed mt-1">
 When you're on duty, every new IB-pending submission pings you directly. Toggle off to silence the alerts and let teammates handle the queue.
 </div>
 </div>
 </label>
 </div>

 {/* Channels */}
 <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
 <div className="flex items-center gap-2 mb-1">
 <Mail className="w-4 h-4 text-purple" />
 <h3 className="text-sm uppercase tracking-wider font-bold">Email</h3>
 </div>
 <Toggle
 label="Send pending-submission alerts to my email"
 desc="Branded email to your account address with a one-click link to the queue."
 checked={!!prefs.admin_notif_email}
 onChange={(v) => set("admin_notif_email", v)}
 />
 </div>

 <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
 <div className="flex items-center gap-2 mb-1">
 <Send className="w-4 h-4 text-purple" />
 <h3 className="text-sm uppercase tracking-wider font-bold">Telegram</h3>
 </div>
 <label className="block">
 <span className="field-label">Your Telegram user ID (numeric)</span>
 <input
 type="text"
 inputMode="numeric"
 value={tgId}
 onChange={(e) => setTgId(e.target.value.replace(/[^0-9]/g, ""))}
 placeholder="e.g. 5959697508"
 className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm outline-none focus:border-purple"
 />
 <span className="block text-[10px] text-muted-foreground mt-1.5">
 Open <code>@userinfobot</code> on Telegram to get yours. Without this, we can't DM you · alerts fall back to the group.
 </span>
 </label>
 <Toggle
 label="DM me when a new submission lands"
 desc="Bot DMs you the broker, PU UID, MT login, and an Approve link. Off-duty toggle still applies."
 checked={!!prefs.admin_notif_telegram}
 onChange={(v) => set("admin_notif_telegram", v)}
 />
 </div>

 <button
 onClick={save}
 disabled={pending}
 className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-60"
 >
 {saved ? <><Check className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> {pending ? "Saving…" : "Save"}</>}
 </button>
 </div>
 );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
 return (
 <label className="flex items-start gap-3 p-2 rounded-md cursor-pointer hover:bg-surface-soft transition">
 <input type="checkbox" className="mt-1 accent-purple" checked={checked} onChange={(e) => onChange(e.target.checked)} />
 <div className="flex-1">
 <div className="text-sm font-semibold">{label}</div>
 <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
 </div>
 </label>
 );
}
