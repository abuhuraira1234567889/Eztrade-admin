"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Medal, Trophy, Flag, Undo2, X } from "lucide-react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import {
  fetchXpBoard,
  removeFromXpBoard,
  restoreToXpBoard,
  fetchCompetitions,
  fetchCompetitionStandings,
  removeFromCompetition,
  restoreToCompetition,
  memberName,
  type XpBoardRow,
  type CompetitionLite,
  type StandingRow,
} from "@/services/leaderboard-moderation";

type Tab = "xp" | "competitions";

/** The member a Remove click is asking a reason for. */
type Pending =
  | { kind: "xp"; userId: string; name: string }
  | { kind: "comp"; competitionId: string; userId: string; name: string };

export default function AdminLeaderboardPage() {
  const [tab, setTab] = useState<Tab>("xp");
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  // XP board
  const [xp, setXp] = useState<{ board: XpBoardRow[]; excluded: XpBoardRow[] } | null>(null);

  // Competitions
  const [comps, setComps] = useState<CompetitionLite[] | null>(null);
  const [compId, setCompId] = useState<string>("");
  const [standings, setStandings] = useState<StandingRow[] | null>(null);
  const [loadingStandings, setLoadingStandings] = useState(false);

  const loadXp = useCallback(() => {
    fetchXpBoard()
      .then(setXp)
      .catch(() => toast.error("Couldn't load the XP leaderboard."));
  }, []);

  const loadStandings = useCallback((id: string) => {
    if (!id) {
      setStandings(null);
      return;
    }
    setLoadingStandings(true);
    fetchCompetitionStandings(id)
      .then((r) => setStandings(r.rows ?? []))
      .catch(() => toast.error("Couldn't load standings."))
      .finally(() => setLoadingStandings(false));
  }, []);

  useEffect(() => {
    loadXp();
  }, [loadXp]);

  useEffect(() => {
    if (tab === "competitions" && !comps) {
      fetchCompetitions()
        .then(setComps)
        .catch(() => toast.error("Couldn't load competitions."));
    }
  }, [tab, comps]);

  function askRemove(p: Pending) {
    setPending(p);
    setReason("");
  }

  async function confirmRemove() {
    if (!pending) return;
    setSaving(true);
    try {
      const res =
        pending.kind === "xp"
          ? await removeFromXpBoard(pending.userId, reason.trim())
          : await removeFromCompetition(pending.competitionId, pending.userId, reason.trim());
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't remove.");
        return;
      }
      toast.success(`${pending.name} removed from the leaderboard.`);
      setPending(null);
      if (pending.kind === "xp") loadXp();
      else loadStandings(pending.competitionId);
    } catch {
      toast.error("Couldn't remove.");
    } finally {
      setSaving(false);
    }
  }

  async function restoreXp(row: XpBoardRow) {
    const res = await restoreToXpBoard(row.id).catch(() => ({ ok: false, error: "Failed." }));
    if (!res.ok) return toast.error(res.error ?? "Couldn't restore.");
    toast.success(`${memberName(row)} restored.`);
    loadXp();
  }

  async function restoreEntrant(row: StandingRow) {
    const res = await restoreToCompetition(compId, row.user_id).catch(() => ({
      ok: false,
      error: "Failed.",
    }));
    if (!res.ok) return toast.error(res.error ?? "Couldn't restore.");
    toast.success(`${memberName(row.profile)} restored.`);
    loadStandings(compId);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-purple/10 text-purple">
          <Medal className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Leaderboard</h1>
          <p className="text-xs text-muted-foreground">
            Remove a member from the XP board or an entrant from one competition. Reversible - no XP
            or score is changed.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["xp", "XP leaderboard"],
            ["competitions", "Competitions"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              tab === key
                ? "border-purple bg-purple text-white"
                : "border-border bg-surface text-secondary-foreground hover:border-purple/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "xp" ? (
        !xp ? (
          <PageSkeleton />
        ) : (
          <div className="space-y-6">
            <Section
              title="Live board - top 100"
              subtitle="Ordered by total XP. Remove takes the member off every XP board."
              icon={<Trophy className="h-4 w-4" />}
            >
              {xp.board.length === 0 ? (
                <Empty>No members with XP yet.</Empty>
              ) : (
                <ul className="divide-y divide-border">
                  {xp.board.map((row, i) => (
                    <li key={row.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                        {i + 1}
                      </span>
                      <MemberCell row={row} />
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                        {row.xp_total.toLocaleString()} XP
                      </span>
                      <button
                        type="button"
                        onClick={() => askRemove({ kind: "xp", userId: row.id, name: memberName(row) })}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-red/40 bg-red-dim px-2.5 py-1 text-xs font-semibold text-red hover:bg-red/10"
                      >
                        <Flag className="h-3 w-3" /> Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section
              title={`Removed from the leaderboard${xp.excluded.length ? ` (${xp.excluded.length})` : ""}`}
              subtitle="Hidden from every XP board until restored."
            >
              {xp.excluded.length === 0 ? (
                <Empty>Nobody is removed.</Empty>
              ) : (
                <ul className="divide-y divide-border">
                  {xp.excluded.map((row) => (
                    <li key={row.id} className="flex items-center gap-3 px-3 py-2.5">
                      <MemberCell row={row} />
                      {row.excluded_reason && (
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                          “{row.excluded_reason}”
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => restoreXp(row)}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground hover:border-purple/50"
                      >
                        <Undo2 className="h-3 w-3" /> Restore
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <select
            value={compId}
            onChange={(e) => {
              setCompId(e.target.value);
              loadStandings(e.target.value);
            }}
            className="w-full max-w-md rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
          >
            <option value="">Choose a competition...</option>
            {(comps ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.is_active ? "" : " (inactive)"}
              </option>
            ))}
          </select>

          {!compId ? (
            <Empty>Pick a competition to see its standings.</Empty>
          ) : loadingStandings ? (
            <PageSkeleton />
          ) : !standings || standings.length === 0 ? (
            <Empty>No entrants on this competition.</Empty>
          ) : (
            <Section title="Standings" subtitle="Remove takes the entrant off this competition's board.">
              <ul className="divide-y divide-border">
                {standings.map((row) => (
                  <li
                    key={row.user_id}
                    className={`flex items-center gap-3 px-3 py-2.5 ${row.admin_removed ? "opacity-60" : ""}`}
                  >
                    <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                      {row.rank ?? "-"}
                    </span>
                    <MemberCell
                      row={{
                        display_name: row.profile?.display_name ?? null,
                        first_name: row.profile?.first_name ?? null,
                        last_name: row.profile?.last_name ?? null,
                        username: row.profile?.username ?? null,
                        country: row.profile?.country ?? null,
                        tier: row.profile?.tier ?? null,
                      }}
                    />
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {row.metric_value != null
                        ? `${row.metric_value.toFixed(2)}`
                        : row.points != null
                          ? `${row.points} pts`
                          : "-"}
                    </span>
                    {row.admin_removed ? (
                      <button
                        type="button"
                        onClick={() => restoreEntrant(row)}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground hover:border-purple/50"
                      >
                        <Undo2 className="h-3 w-3" /> Restore
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          askRemove({
                            kind: "comp",
                            competitionId: compId,
                            userId: row.user_id,
                            name: memberName(row.profile),
                          })
                        }
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-red/40 bg-red-dim px-2.5 py-1 text-xs font-semibold text-red hover:bg-red/10"
                      >
                        <Flag className="h-3 w-3" /> Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => e.target === e.currentTarget && setPending(null)}
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <b className="text-sm font-semibold text-foreground">Remove {pending.name}?</b>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-surface-soft"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              {pending.kind === "xp"
                ? "They'll disappear from every XP board until restored."
                : "They'll disappear from this competition's standings until restored."}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional, for the audit log)"
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm text-foreground"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-soft"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={confirmRemove}
                className="rounded-lg border border-red/40 bg-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-red/90 disabled:opacity-50"
              >
                {saving ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon}
          {title}
        </div>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function MemberCell({
  row,
}: {
  row: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    country: string | null;
    tier: number | null;
  };
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="truncate text-sm font-medium text-foreground">{memberName(row)}</div>
      <div className="truncate text-[11px] text-muted-foreground">
        {row.username ? `@${row.username}` : "no username"}
        {row.country ? ` · ${row.country}` : ""}
        {row.tier != null ? ` · tier ${row.tier}` : ""}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
