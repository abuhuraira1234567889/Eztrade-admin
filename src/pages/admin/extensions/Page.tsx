"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Clock, Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { TIER_NAMES } from "@/lib/constants";
import {
  approveExtensionRequest,
  listExtensionRequests,
  rejectExtensionRequest,
  translateExtensionReason,
  type AdminExtensionRequest,
  type ExtensionQueueFilter,
} from "@/services/extensions-admin";

/**
 * Deadline extension queue.
 *
 * Approving adds days to the member's LIVE deadline (grace_ends_at while in
 * grace, next_review_at while active), counted from whichever is later - now or
 * the current deadline - so an already-lapsed clock still buys the member the
 * full window. Rejecting changes nothing except telling them why.
 *
 * The note is the member-facing part of both decisions: it is mailed, DM'd and
 * shown on their dashboard verbatim. Required on a rejection, optional (but
 * encouraged) on an approval.
 */
const FILTERS: { value: ExtensionQueueFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Withdrawn" },
  { value: "all", label: "All" },
];

/** Offered grants. "Custom" opens a free number field (1-60). */
const DAY_PRESETS = [3, 7, 14, 30];

export default function AdminExtensionsPage() {
  const [filter, setFilter] = useState<ExtensionQueueFilter>("pending");
  const [requests, setRequests] = useState<AdminExtensionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      setError(null);
      try {
        const res = await listExtensionRequests(filter);
        setRequests(res.requests ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load extension requests.");
      } finally {
        setLoading(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "pending").length,
    [requests],
  );

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-purple" />
            Extension requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Members asking for more time to meet their requirements. Approving moves their deadline;
            rejecting leaves it where it is. Either way they get your note.
          </p>
        </div>
        {filter === "pending" && !loading && (
          <span
            className={cn(
              "px-3 py-1.5 rounded-md text-xs uppercase tracking-wider font-bold border",
              pendingCount > 0
                ? "bg-amber-dim text-amber border-amber/30"
                : "bg-green-dim text-green border-green/30",
            )}
          >
            {pendingCount > 0 ? `${pendingCount} waiting` : "Queue clear"}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors",
              filter === f.value
                ? "bg-purple-dim text-purple border-purple/30"
                : "bg-surface-soft text-secondary-foreground border-border hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <div className="rounded-xl border border-red/30 bg-surface p-5 text-sm text-red">{error}</div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <Clock className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {filter === "pending" ? "No requests waiting for review." : "Nothing here."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map((r) => (
            <RequestCard key={r.id} request={r} onDecided={() => void load(true)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function RequestCard({
  request,
  onDecided,
}: {
  request: AdminExtensionRequest;
  onDecided: () => void;
}) {
  const [days, setDays] = useState<number>(7);
  const [customDays, setCustomDays] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  // On-demand English translation of the member's reason. Members write in
  // their own language; the reviewer has to judge the ask either way.
  const [translated, setTranslated] = useState<{ text: string; lang: string | null } | null>(null);
  const [translating, setTranslating] = useState(false);

  async function toggleTranslate() {
    if (translated) {
      setTranslated(null); // showing the translation -> back to their words
      return;
    }
    const reason = request.reason?.trim();
    if (!reason) return;
    setTranslating(true);
    try {
      const res = await translateExtensionReason(reason);
      if (res.ok) setTranslated({ text: res.translatedText, lang: res.detectedSourceLang });
      else toast.error(res.error || "Couldn't translate this reason.");
    } catch {
      toast.error("Couldn't translate this reason.");
    } finally {
      setTranslating(false);
    }
  }

  const isPending = request.status === "pending";
  const clock = request.deadlineKind === "grace" ? "Grace period" : "30-day review";
  // The live deadline off the member's lifecycle row, not the request-time
  // snapshot: a failed broker pull can have pushed it since they asked.
  const liveDeadline =
    request.deadlineKind === "grace" ? request.member.graceEndsAt : request.member.nextReviewAt;

  const effectiveDays = useCustom ? Number(customDays) : days;
  const daysValid = Number.isFinite(effectiveDays) && effectiveDays >= 1 && effectiveDays <= 60;

  async function approve() {
    if (!daysValid) {
      toast.error("Grant between 1 and 60 days.");
      return;
    }
    setBusy("approve");
    try {
      const res = await approveExtensionRequest(request.id, Math.floor(effectiveDays), note.trim());
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Approved · new deadline ${fmt(res.newDeadlineAt)}`);
      onDecided();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not approve.");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (!note.trim()) {
      toast.error("Add a reason. The member sees it.");
      return;
    }
    setBusy("reject");
    try {
      const res = await rejectExtensionRequest(request.id, note.trim());
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Request declined. The member has been told.");
      onDecided();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reject.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="p-5 flex flex-col gap-4">
        {/* Header: who, what clock, when */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/admin/users/${request.userId}`}
                className="font-display font-bold text-base text-foreground hover:text-purple"
              >
                {request.member.name || request.member.email || "Unknown member"}
              </Link>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border bg-surface-soft text-secondary-foreground border-border">
                {TIER_NAMES[request.member.rank] ?? `Rank ${request.member.rank}`}
              </span>
              <StatusPill status={request.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {request.member.email} · asked {fmt(request.createdAt)}
            </p>
            <MemberProgress request={request} />
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              {clock} ends
            </div>
            <div className="text-sm font-semibold text-foreground tabular-nums">
              {fmt(liveDeadline ?? request.deadlineAt)}
            </div>
          </div>
        </div>

        {/* The member's own words, with English on request */}
        <div className="rounded-lg border border-border bg-surface-soft px-3.5 py-3">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              Their reason
            </div>
            {request.reason?.trim() ? (
              <button
                type="button"
                onClick={() => void toggleTranslate()}
                disabled={translating}
                className="inline-flex h-5 items-center gap-1 rounded px-1 text-muted-foreground opacity-70 hover:bg-purple-dim hover:text-purple hover:opacity-100 disabled:opacity-50 transition"
                title={translated ? "Show original" : "Translate to English"}
                aria-label={translated ? "Show original" : "Translate to English"}
              >
                {translating ? (
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
                ) : (
                  <Languages className="w-3 h-3" aria-hidden />
                )}
                <span className="text-[10px] font-semibold">{translated ? "Original" : "Translate"}</span>
              </button>
            ) : null}
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{request.reason}</p>
          {translated && (
            <div className="mt-2 border-t border-border pt-2">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                English{translated.lang ? ` · from ${translated.lang.toUpperCase()}` : ""}
              </div>
              <p className="text-sm text-secondary-foreground leading-relaxed whitespace-pre-wrap">
                {translated.text}
              </p>
            </div>
          )}
        </div>

        {isPending ? (
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">
                Extend by
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {DAY_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setUseCustom(false);
                      setDays(d);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors",
                      !useCustom && days === d
                        ? "bg-purple-dim text-purple border-purple/30"
                        : "bg-surface-soft text-secondary-foreground border-border hover:text-foreground",
                    )}
                  >
                    {d} days
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustom(true)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors",
                    useCustom
                      ? "bg-purple-dim text-purple border-purple/30"
                      : "bg-surface-soft text-secondary-foreground border-border hover:text-foreground",
                  )}
                >
                  Custom
                </button>
                {useCustom && (
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={customDays}
                    autoFocus
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder="1-60"
                    aria-label="Custom number of days"
                    className="w-24 rounded-md border border-border bg-surface-soft px-2.5 py-1.5 text-xs text-foreground focus:border-purple focus:outline-none"
                  />
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor={`note-${request.id}`}
                className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5 block"
              >
                Note to the member · required to decline
              </label>
              <textarea
                id={`note-${request.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 400))}
                rows={2}
                placeholder="They read this in their email, Telegram and on the dashboard."
                className="w-full rounded-lg border border-border bg-surface-soft px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-purple focus:outline-none resize-y"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void approve()}
                disabled={busy !== null || !daysValid}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : null}
                Approve {daysValid ? `· ${Math.floor(effectiveDays)} days` : ""}
              </button>
              <button
                type="button"
                onClick={() => void reject()}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red/30 bg-red-dim px-4 py-2 text-xs font-semibold text-red transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : null}
                Decline
              </button>
            </div>
          </div>
        ) : (
          <DecisionSummary request={request} />
        )}
      </div>
    </div>
  );
}

function DecisionSummary({ request }: { request: AdminExtensionRequest }) {
  if (request.status === "cancelled") {
    return <p className="text-xs text-muted-foreground">Withdrawn by the member.</p>;
  }
  const approved = request.status === "approved";
  return (
    <div className="rounded-lg border border-border bg-surface-soft px-3.5 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">
        {approved ? "Approved" : "Declined"} {request.reviewedAt ? `· ${fmt(request.reviewedAt)}` : ""}
      </div>
      {approved && (
        <p className="text-sm text-foreground">
          {request.grantedDays} days added · new deadline {fmt(request.newDeadlineAt)}
        </p>
      )}
      {request.decisionNote ? (
        <p className="text-sm text-secondary-foreground mt-1 leading-relaxed whitespace-pre-wrap">
          {request.decisionNote}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The two figures an extension is actually decided on: how much volume the
 * member has traded this cycle, and how many extensions they have already been
 * granted in it. Lots come from the same evaluator that gates them, so the
 * number here and the number that locks their account cannot disagree.
 */
function MemberProgress({ request }: { request: AdminExtensionRequest }) {
  const lots = request.member.lots;
  const used = request.extensionsUsed ?? 0;
  const limit = request.extensionsLimit ?? 0;
  const atLimit = limit > 0 && used >= limit;
  if (!lots && !used) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
      {lots && (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-soft px-2 py-1">
          <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Lots</span>
          <span className="font-semibold tabular-nums text-foreground">
            {lots.current.toFixed(2)}
            {lots.required > 0 && <span className="text-muted-foreground"> / {lots.required.toFixed(2)}</span>}
          </span>
          {lots.missing > 0 && (
            <span className="text-amber tabular-nums">{lots.missing.toFixed(2)} short</span>
          )}
        </span>
      )}
      {limit > 0 && (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 ${
            atLimit ? "border-red/40 bg-red-dim text-red" : "border-border bg-surface-soft"
          }`}
        >
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">Extensions</span>
          <span className="font-semibold tabular-nums">
            {used} / {limit}
          </span>
          {atLimit && <span className="font-semibold">limit reached</span>}
        </span>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: AdminExtensionRequest["status"] }) {
  const tone =
    status === "pending"
      ? "bg-amber-dim text-amber border-amber/30"
      : status === "approved"
        ? "bg-green-dim text-green border-green/30"
        : status === "rejected"
          ? "bg-red-dim text-red border-red/30"
          : "bg-surface-soft text-secondary-foreground border-border";
  const label = status === "cancelled" ? "withdrawn" : status;
  return (
    <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border", tone)}>
      {label}
    </span>
  );
}

function fmt(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
