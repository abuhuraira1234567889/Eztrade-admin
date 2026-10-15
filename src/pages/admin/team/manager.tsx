"use client";

import { useState, useTransition } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Trash2, Shield } from "lucide-react";
import { addRole, removeRole } from "@/services/action-stubs";

type Member = { user_id: string; email: string; name: string; roles: string[] };

const ROLES = ["super_admin", "admin", "compliance", "support", "educator", "signal_provider", "marketing", "live_host"];

export function TeamManager({ members, currentUserId }: { members: Member[]; currentUserId: string }) {
 const navigate = useNavigate();
 const [pending, startTransition] = useTransition();
 const [email, setEmail] = useState("");
 const [role, setRole] = useState<string>("compliance");
 const [err, setErr] = useState<string | null>(null);

 function add() {
 setErr(null);
 if (!email.trim()) return setErr("Enter an email");
 startTransition(() => { void addRole({ email: email.trim().toLowerCase(), role }).then((r) => {
 if (r.ok) {
 setEmail("");
 window.location.reload();
 } else setErr(r.error ?? null);
 }); });
 }

 function revoke(userId: string, role: string) {
 if (userId === currentUserId && role === "super_admin") {
 if (!confirm("You're removing your own super_admin role. You won't be able to manage roles after this. Continue?")) return;
 }
 startTransition(() => { void removeRole({ userId, role }).then((r) => {
 if (r.ok) window.location.reload();
 }); });
 }

 return (
 <div className="space-y-6">
 {/* Add */}
 <div className="rounded-xl border border-border bg-surface p-5">
 <div className="flex items-center gap-2 mb-3">
 <UserPlus className="w-4 h-4 text-purple" />
 <h2 className="text-sm uppercase tracking-wider font-bold">Grant role</h2>
 </div>
 <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2">
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="user@example.com (must already have an account)"
 className="px-3 py-2 rounded-md border border-border bg-background text-sm outline-none focus:border-purple"
 />
 <select
 value={role}
 onChange={(e) => setRole(e.target.value)}
 className="px-3 py-2 rounded-md border border-border bg-background text-sm outline-none focus:border-purple">
 {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
 </select>
 <button
 onClick={add}
 disabled={pending}
 className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-60"
 >
 <Shield className="w-4 h-4" /> Grant
 </button>
 </div>
 {err && <div className="text-xs text-red mt-2">{err}</div>}
 </div>

 {/* Existing members */}
 <div className="rounded-xl border border-border bg-surface overflow-hidden">
 <div className="bg-surface-soft px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground font-bold">
 Team members ({members.length})
 </div>
 {members.length === 0 ? (
 <div className="px-4 py-8 text-center text-sm text-muted-foreground">No team members yet · grant the first role above.</div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <tbody>
 {members.map((m) => (
 <tr key={m.user_id} className="border-t border-border">
 <td className="px-4 py-3">
 <div className="font-display font-bold">{m.name}{m.user_id === currentUserId && <span className="ml-2 text-[10px] text-purple">(you)</span>}</div>
 <div className="text-xs text-muted-foreground ">{m.email}</div>
 </td>
 <td className="px-4 py-3">
 <div className="flex flex-wrap gap-1.5">
 {m.roles.map((r) => (
 <span key={r} className="inline-flex items-center gap-1 eyebrow bg-purple-dim px-2 py-0.5 rounded font-bold">
 {r}
 <button
 onClick={() => revoke(m.user_id, r)}
 disabled={pending}
 title={`Revoke ${r}`}
 className="hover:text-red"
 >
 <Trash2 className="w-3 h-3" />
 </button>
 </span>
 ))}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 );
}
