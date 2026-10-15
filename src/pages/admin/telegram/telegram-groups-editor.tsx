"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteTelegramGroup,
  fetchTelegramGroups,
  renameTelegramGroup,
  type TelegramGroupRow,
} from "@/services/action-stubs";

const inputCls =
  "w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm";

/**
 * Editable list of Telegram signal groups. The display name feeds the member
 * app everywhere (getting-started preview, "Join {group}", the feed labels), so
 * renaming here is the single place to rebrand a community group.
 */
export function TelegramGroupsEditor() {
  const [groups, setGroups] = useState<TelegramGroupRow[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchTelegramGroups().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setGroups(res.groups);
        setDraft(Object.fromEntries(res.groups.map((g) => [g.id, g.name])));
      } else {
        setGroups([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(g: TelegramGroupRow) {
    const name = (draft[g.id] ?? "").trim();
    if (!name || name === g.name) return;
    setSaving(g.id);
    const res = await renameTelegramGroup(g.id, name);
    setSaving(null);
    if (!res.ok) {
      toast.error(res.error ?? "Could not rename group.");
      return;
    }
    setGroups((prev) => (prev ?? []).map((x) => (x.id === g.id ? { ...x, name } : x)));
    toast.success(`Renamed to "${name}".`);
  }

  async function remove(g: TelegramGroupRow) {
    if (!window.confirm(`Remove the "${g.name}" group? Members will no longer see it.`)) return;
    setSaving(g.id);
    const res = await deleteTelegramGroup(g.id);
    setSaving(null);
    if (!res.ok) {
      toast.error(res.error ?? "Could not remove group.");
      return;
    }
    setGroups((prev) => (prev ?? []).filter((x) => x.id !== g.id));
    toast.success(`Removed "${g.name}".`);
  }

  if (groups === null) return null;

  return (
    <section className="rounded-xl border border-border bg-surface overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-display font-bold text-lg">Telegram groups</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Rename a community group. The new name shows everywhere members see it.
        </p>
      </div>
      <div className="p-5 space-y-3">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No groups configured.</p>
        ) : (
          groups.map((g) => {
            const changed = (draft[g.id] ?? "").trim() !== g.name;
            return (
              <div key={g.id} className="flex items-end gap-3">
                <div className="flex-1">
                  <div className="eyebrow mb-1.5">
                    <span className="font-mono text-[11px] text-muted-foreground">{g.id}</span>
                    {typeof g.min_tier === "number" && (
                      <span className="ml-2 text-[11px] text-muted-foreground">
                        tier {g.min_tier}+
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={draft[g.id] ?? ""}
                    maxLength={80}
                    onChange={(e) => setDraft((d) => ({ ...d, [g.id]: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <button
                  type="button"
                  disabled={!changed || saving === g.id || !(draft[g.id] ?? "").trim()}
                  onClick={() => void save(g)}
                  className="px-4 py-2 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple/90 transition disabled:opacity-50"
                >
                  {saving === g.id ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  disabled={saving === g.id}
                  onClick={() => void remove(g)}
                  className="px-3 py-2 rounded-lg border border-red/40 text-red text-sm font-medium hover:bg-red/10 transition disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
