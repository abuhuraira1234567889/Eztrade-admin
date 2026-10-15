"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bot, BotOff, Headphones, Loader2, Search, Wrench, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupportTicketsLive } from "@/hooks/useSupportTicketsLive";
import {
  SUPPORT_CATEGORY_LABELS,
  isTicketOpen,
  listAdminSupportTickets,
  type SupportTicket,
} from "@/services/support";

type Filter = "all" | "tech" | "escalated" | "open" | "awaiting_user" | "resolved" | "closed";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tech", label: "AI → tech team" },
  { value: "escalated", label: "Taken over" },
  { value: "open", label: "Open" },
  { value: "awaiting_user", label: "Awaiting member" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const FILTER_VALUES = new Set<Filter>(FILTERS.map(({ value }) => value));

function supportFilterFrom(value: string | null): Filter {
  return value && FILTER_VALUES.has(value as Filter) ? (value as Filter) : "all";
}

// The AI flags a ticket for the engineering/technical team by writing an
// escalation_reason while still handling the member itself (escalated_at stays
// null). A "Taken over" ticket (escalated_at set) is a full human hand-off.
function isTechFlagged(ticket: SupportTicket) {
  return Boolean(ticket.escalation_reason) && !ticket.escalated_at;
}

function statusClass(status: string) {
  if (status === "open" || status === "ai_handling") return "bg-amber-dim text-amber border-amber/30";
  if (status === "awaiting_user") return "bg-purple-dim text-purple border-purple/30";
  if (status === "resolved" || status === "closed") return "bg-green-dim text-green border-green/30";
  return "bg-surface-soft text-secondary-foreground border-border";
}

function memberLabel(ticket: SupportTicket) {
  const p = ticket.profile;
  if (!p) return "Unknown member";
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
  return name || p.display_name || p.email || "Unknown member";
}

export default function AdminSupportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filter = supportFilterFrom(searchParams.get("filter"));
  const query = searchParams.get("q") ?? "";

  const latestRequest = useRef(0);

  const setInboxParam = useCallback(
    (key: "filter" | "q", value: string) => {
      const next = new URLSearchParams(searchParams);
      const shouldRemove = (key === "filter" && value === "all") || (key === "q" && value === "");
      if (shouldRemove) next.delete(key);
      else next.set(key, value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // `silent` skips the spinner: background refreshes shouldn't flicker the UI,
  // only an explicit load (mount, filter change) should.
  const load = useCallback(
    async (silent = false) => {
      // A filter can change while the previous request is still running. Only
      // the newest request may update the inbox, otherwise an old "All" result
      // can replace the newly selected technical-team view.
      const requestId = ++latestRequest.current;
      if (!silent) setLoading(true);
      try {
        const result = await listAdminSupportTickets(filter === "all" ? undefined : filter);
        if (requestId !== latestRequest.current) return;
        if (!result.ok) setError(result.error);
        else {
          setTickets(result.tickets);
          setError(null);
        }
      } finally {
        if (requestId === latestRequest.current) setLoading(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Member messages land on the inbox without a reload.
  const refresh = useCallback(() => void load(true), [load]);
  useSupportTicketsLive(refresh);

  const openCount = tickets.filter((t) => isTicketOpen(t.status)).length;
  const escalatedCount = tickets.filter((t) => t.escalated_at).length;
  const techCount = tickets.filter(isTechFlagged).length;
  const unreadCount = tickets.filter((t) => t.unread).length;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleTickets = useMemo(() => {
    if (!normalizedQuery) return tickets;

    return tickets.filter((ticket) => {
      const profile = ticket.profile;
      const searchable = [
        ticket.subject,
        ticket.status.replace(/_/g, " "),
        ticket.priority,
        ticket.category,
        ticket.category ? SUPPORT_CATEGORY_LABELS[ticket.category] : null,
        ticket.escalation_reason,
        profile?.first_name,
        profile?.last_name,
        profile?.display_name,
        profile?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [normalizedQuery, tickets]);

  const ticketSearch = searchParams.toString();

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Headphones className="w-6 h-6 text-purple" />
            Support inbox
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Member support requests. The AI assistant answers members automatically. Take over any ticket to reply yourself.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="px-3 py-1.5 rounded-md text-xs uppercase tracking-wider font-bold border bg-purple-dim text-purple border-purple/30 inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple" />
              {unreadCount} unread
            </span>
          )}
          {techCount > 0 && (
            <span className="px-3 py-1.5 rounded-md text-xs uppercase tracking-wider font-bold border bg-red-dim text-red border-red/30 inline-flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              {techCount} tech team
            </span>
          )}
          {escalatedCount > 0 && (
            <span className="px-3 py-1.5 rounded-md text-xs uppercase tracking-wider font-bold border bg-surface-soft text-secondary-foreground border-border inline-flex items-center gap-1.5">
              <BotOff className="w-3.5 h-3.5" />
              {escalatedCount} taken over
            </span>
          )}
          <span
            className={cn(
              "px-3 py-1.5 rounded-md text-xs uppercase tracking-wider font-bold border",
              openCount > 0 ? "bg-amber-dim text-amber border-amber/30" : "bg-green-dim text-green border-green/30",
            )}
          >
            {tickets.length === 0 ? "No tickets" : `${openCount} open · ${tickets.length} total`}
          </span>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => setInboxParam("q", event.target.value)}
          placeholder="Search member, email, subject, category, or status…"
          aria-label="Search support tickets"
          className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-surface-soft border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple/50"
        />
        {query && (
          <button
            type="button"
            onClick={() => setInboxParam("q", "")}
            aria-label="Clear support search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-surface transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setInboxParam("filter", value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold border transition",
              filter === value
                ? "bg-purple text-white border-purple"
                : "bg-surface border-border hover:border-purple/40",
            )}
          >
            {label}
          </button>
        ))}
        {loading && <Loader2 className="w-4 h-4 animate-spin text-purple self-center" />}
      </div>

      {error && (
        <div className="mb-4 text-sm text-red px-3 py-2 rounded-md bg-red-dim border border-red/20">{error}</div>
      )}

      {visibleTickets.length === 0 && !loading ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center">
          {normalizedQuery ? (
            <>
              <Search className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="text-base font-display font-bold">No matching tickets</h3>
              <p className="text-sm text-muted-foreground mt-2">
                No tickets in this view match “{query.trim()}”.
              </p>
            </>
          ) : (
            <>
              <Headphones className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="text-base font-display font-bold">Inbox is clear</h3>
              <p className="text-sm text-muted-foreground mt-2">New member support requests will appear here.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {visibleTickets.map((ticket) => {
            const escalated = Boolean(ticket.escalated_at);
            const techFlagged = isTechFlagged(ticket);
            const aiHandling = ticket.status === "ai_handling" || (ticket.ai_enabled && !escalated);
            return (
              <Link
                key={ticket.id}
                to={`/admin/support/${ticket.id}${ticketSearch ? `?${ticketSearch}` : ""}`}
                className={cn(
                  "block rounded-xl border p-4 hover:border-purple/40 transition group",
                  escalated || ticket.unread ? "border-purple/30" : "border-border",
                  ticket.unread ? "bg-purple-dim" : "bg-surface",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {ticket.unread && (
                        <span
                          className="w-2 h-2 rounded-full bg-purple flex-shrink-0"
                          title="Unread member message"
                          aria-label="Unread member message"
                        />
                      )}
                      <h2
                        className={cn(
                          "font-display text-sm group-hover:text-purple transition",
                          ticket.unread ? "font-extrabold" : "font-bold",
                        )}
                      >
                        {ticket.subject}
                      </h2>
                      <span
                        className={cn(
                          "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-bold",
                          statusClass(ticket.status),
                        )}
                      >
                        {ticket.status.replace(/_/g, " ")}
                      </span>
                      {escalated ? (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-bold bg-surface-soft text-secondary-foreground border-border inline-flex items-center gap-1">
                          <BotOff className="w-3 h-3" />
                          Taken over
                        </span>
                      ) : aiHandling ? (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-bold bg-purple-dim text-purple border-purple/30 inline-flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          AI
                        </span>
                      ) : null}
                      {techFlagged && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-bold bg-red-dim text-red border-red/30 inline-flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          Tech team
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{memberLabel(ticket)}</div>
                    {ticket.profile?.email && <div className="text-xs text-muted-foreground">{ticket.profile.email}</div>}
                    {ticket.category && (
                      <span className="text-[10px] uppercase tracking-wider text-purple font-bold mt-1 inline-block">
                        {SUPPORT_CATEGORY_LABELS[ticket.category]}
                      </span>
                    )}
                    {(escalated || techFlagged) && ticket.escalation_reason && (
                      <p className="text-xs text-red/90 mt-1 line-clamp-1">↳ {ticket.escalation_reason}</p>
                    )}
                  </div>
                  <time className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {new Date(ticket.updated_at).toLocaleString()}
                  </time>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
