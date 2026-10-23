"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Gift, LoaderCircle, Pencil, Trash2, UserPlus, X } from "lucide-react";
import {
  grantFreeAccess,
  listFreeAccessGrants,
  listFreeAccessModules,
  revokeFreeAccess,
  type FreeAccessGrant,
  type FreeAccessModuleDef,
} from "@/services/action-stubs";

const ACCESS_DURATIONS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
  { value: "custom", label: "Custom days" },
  { value: "permanent", label: "No expiry" },
] as const;

type AccessDuration = (typeof ACCESS_DURATIONS)[number]["value"];

type SuccessNotice = {
  title: string;
  detail: string;
};

function expiryLabel(expiresAt: string | null) {
  if (!expiresAt) return "No expiry";
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return "Expiry unavailable";
  return expiry.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Free Access Management - grant per-module complimentary access by email.
 * Lives on the Cron Jobs page under Member tools. Does not change rank,
 * payments, or lifecycle state; only rank gates for selected modules.
 */
export function FreeAccessManager() {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [duration, setDuration] = useState<AccessDuration>("30");
  const [customDays, setCustomDays] = useState("30");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modules, setModules] = useState<FreeAccessModuleDef[]>([]);
  const [grants, setGrants] = useState<FreeAccessGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessNotice | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  async function refresh() {
    try {
      const [{ modules: mods }, { grants: rows }] = await Promise.all([
        listFreeAccessModules(),
        listFreeAccessGrants(),
      ]);
      setModules(mods);
      setGrants(rows);
    } catch {
      /* keep current */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function startEdit(g: FreeAccessGrant) {
    setSuccess(null);
    setEditingUserId(g.userId);
    setEmail(g.email ?? "");
    setSelected(new Set(g.modules));
    if (!g.expiresAt) {
      setDuration("permanent");
    } else {
      const remainingDays = Math.max(
        1,
        Math.ceil((new Date(g.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      );
      const preset = ACCESS_DURATIONS.find((option) => option.value === String(remainingDays));
      setDuration(preset ? (preset.value as AccessDuration) : "custom");
      setCustomDays(String(remainingDays));
    }
    setErr(null);
  }

  function cancelEdit() {
    setEditingUserId(null);
    setEmail("");
    setSelected(new Set());
    setDuration("30");
    setCustomDays("30");
    setErr(null);
  }

  async function submit() {
    setErr(null);
    setSuccess(null);
    if (!email.trim()) return setErr("Enter an email");
    if (selected.size === 0) return setErr("Select at least one module");
    const durationDays =
      duration === "permanent"
        ? null
        : duration === "custom"
          ? Number(customDays)
          : Number(duration);
    if (
      durationDays !== null &&
      (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650)
    ) {
      return setErr("Enter a whole number of days between 1 and 3,650.");
    }
    const normalizedEmail = email.trim().toLowerCase();
    const moduleCount = selected.size;
    const wasEditing = editingUserId !== null;
    const durationDescription =
      durationDays === null
        ? "It has no expiry."
        : `It will expire in ${durationDays} ${durationDays === 1 ? "day" : "days"}.`;

    setSaving(true);
    try {
      const result = await grantFreeAccess({
        email: normalizedEmail,
        modules: [...selected],
        durationDays,
      });

      if (!result.ok) {
        setErr(result.error ?? "Failed to save free access.");
        return;
      }

      cancelEdit();
      setSuccess({
        title: wasEditing ? "Free access updated" : "Free access granted",
        detail: `${normalizedEmail} now has access to ${moduleCount} ${moduleCount === 1 ? "module" : "modules"}. ${durationDescription}`,
      });
      await refresh();
    } catch {
      setErr("The access request could not be completed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function revoke(userId: string) {
    if (!confirm("Revoke all free access for this user?")) return;
    setSuccess(null);
    startTransition(() => {
      void revokeFreeAccess({ userId }).then((r) => {
        if (r.ok) {
          if (editingUserId === userId) cancelEdit();
          void refresh();
        } else setErr(r.error ?? "Failed to revoke.");
      });
    });
  }

  const labelFor = (key: string) => modules.find((m) => m.key === key)?.label ?? key;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
          <Gift className="w-3.5 h-3.5" /> Free Access Management
        </h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
          Grant complimentary access to specific modules for an existing member. A grant is a
          FLOOR, not a ceiling: it lifts the funding block for the modules you tick, and the
          member also keeps anything their own rank unlocks (shown as “· by rank” below), so
          reaching a rank restores that module without you ticking it. Overrides rank /
          subscription gates for the selected modules only - does not change their rank, payments,
          or account status. Ban and IB checks still apply.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-purple" />
            <h3 className="text-sm uppercase tracking-wider font-bold">
              {editingUserId ? "Update free access" : "Grant free access"}
            </h3>
          </div>
          {editingUserId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" /> Cancel edit
            </button>
          )}
        </div>

        {success && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-3 rounded-lg border border-green/30 bg-green-dim px-4 py-3 text-green"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{success.title}</p>
              <p className="mt-0.5 text-xs text-foreground/80">{success.detail}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              aria-label="Dismiss success message"
              className="rounded p-0.5 text-green hover:bg-green/10"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Member email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!editingUserId}
              placeholder="user@example.com (must already have an account)"
              className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm outline-none focus:border-purple disabled:opacity-60"
            />
          </label>

          <div className="block">
            <span className="text-xs font-semibold text-muted-foreground">Access duration</span>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value as AccessDuration)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm outline-none focus:border-purple"
            >
              {ACCESS_DURATIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {duration === "custom" && (
              <label className="mt-2 block">
                <span className="sr-only">Custom access duration in days</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={3650}
                  step={1}
                  required
                  value={customDays}
                  onChange={(event) => setCustomDays(event.target.value)}
                  placeholder="Number of days"
                  aria-describedby="custom-duration-help"
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm outline-none focus:border-purple"
                />
                <span id="custom-duration-help" className="mt-1 block text-[11px] text-muted-foreground">
                  Enter 1–3,650 whole days.
                </span>
              </label>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2">Modules</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {modules.map((m) => (
              <label
                key={m.key}
                className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                  selected.has(m.key)
                    ? "border-purple/40 bg-purple-dim/40"
                    : "border-border bg-surface-soft hover:border-border"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(m.key)}
                  onChange={() => toggle(m.key)}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{m.label}</span>
                  <span className="block text-[11px] text-muted-foreground leading-snug">
                    {m.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {duration === "permanent"
              ? "This access will not expire."
              : `This access will expire ${duration === "custom" ? customDays || "-" : duration} days after it is saved.`}
          </p>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={pending || saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Gift className="w-4 h-4" aria-hidden="true" />
            )}
            {saving
              ? editingUserId
                ? "Updating access…"
                : "Granting access…"
              : editingUserId
                ? "Update access"
                : "Grant access"}
          </button>
          {err && (
            <div role="alert" className="basis-full text-xs text-red">
              {err}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="bg-surface-soft px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground font-bold">
          Users with free access ({grants.length})
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : grants.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No free-access grants yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-bold">User</th>
                  <th className="px-4 py-2.5 font-bold">Modules</th>
                  <th className="px-4 py-2.5 font-bold">Granted</th>
                  <th className="px-4 py-2.5 font-bold">Expires</th>
                  <th className="px-4 py-2.5 font-bold">By</th>
                  <th className="px-4 py-2.5 font-bold">Status</th>
                  <th className="px-4 py-2.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={g.userId} className="border-t border-border align-top">
                    <td className="px-4 py-3">
                      <div className="font-display font-bold">{g.name ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">{g.email ?? "-"}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {g.rank > 0 ? `Rank ${g.rank}` : "Unranked"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {g.modules.map((key) => (
                          <span
                            key={key}
                            className={
                              g.rankEarnedModules.includes(key)
                                ? // Ticked AND already earned by rank: the tick is
                                  // doing nothing. Worth seeing before renewing.
                                  "inline-flex rounded-md bg-purple-dim text-purple text-[10px] font-semibold px-1.5 py-0.5 opacity-60 line-through decoration-1"
                                : "inline-flex rounded-md bg-purple-dim text-purple text-[10px] font-semibold px-1.5 py-0.5"
                            }
                            title={
                              g.rankEarnedModules.includes(key)
                                ? `Ticked, but their rank already unlocks this - the tick is redundant.`
                                : undefined
                            }
                          >
                            {labelFor(key)}
                          </span>
                        ))}
                        {g.rankEarnedModules
                          .filter((key) => !g.modules.includes(key))
                          .map((key) => (
                            <span
                              key={key}
                              className="inline-flex rounded-md border border-border text-muted-foreground text-[10px] font-semibold px-1.5 py-0.5"
                              title="Not ticked - their rank unlocks this on its own."
                            >
                              {labelFor(key)} · by rank
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(g.grantedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {expiryLabel(g.expiresAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {g.updatedByEmail ?? g.grantedByEmail ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-green-dim text-green text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5">
                        {g.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => startEdit(g)}
                        disabled={pending}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mr-3"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => revoke(g.userId)}
                        disabled={pending}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
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
