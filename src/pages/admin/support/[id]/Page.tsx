"use client";

import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bot, BotOff, Check, Headphones, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { SupportChatThread } from "@/components/support/SupportChatThread";
import { cn } from "@/lib/utils";
import {
  SUPPORT_CATEGORY_LABELS,
  isTicketOpen,
  updateAdminSupportTicket,
  type SupportTicket,
} from "@/services/support";

function statusClass(status: string) {
  if (status === "open" || status === "ai_handling") return "bg-amber-dim text-amber border-amber/30";
  if (status === "awaiting_user") return "bg-purple-dim text-purple border-purple/30";
  if (status === "resolved" || status === "closed") return "bg-green-dim text-green border-green/30";
  return "bg-surface-soft text-secondary-foreground border-border";
}

function memberLabel(ticket: SupportTicket | null) {
  const p = ticket?.profile;
  if (!p) return "Unknown member";
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
  return name || p.display_name || p.email || "Unknown member";
}

export default function AdminSupportTicketPage() {
  const params = useParams() as { id?: string };
  const [searchParams] = useSearchParams();
  const ticketId = params.id ?? "";
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [updating, setUpdating] = useState(false);

  if (!ticketId) return <div className="text-sm text-red">Ticket not found.</div>;

  async function patch(
    payload: Parameters<typeof updateAdminSupportTicket>[1],
    successMsg?: string,
  ) {
    setUpdating(true);
    try {
      const result = await updateAdminSupportTicket(ticketId, payload);
      if (!result.ok) toast.error(result.error);
      else {
        setTicket(result.ticket);
        if (successMsg) toast.success(successMsg);
      }
    } finally {
      setUpdating(false);
    }
  }

  // The member behind this ticket - used to deep-link the email to their admin
  // user profile. Prefer the ticket's user_id; fall back to the joined profile id.
  const memberUserId = ticket?.user_id ?? ticket?.profile?.id ?? null;

  const escalated = Boolean(ticket?.escalated_at);
  const aiEnabled = ticket?.ai_enabled ?? true;
  // The AI is only actually handling the ticket when it's enabled AND a human
  // hasn't taken over. A staff reply sets escalated_at while leaving ai_enabled
  // true, so the button must key off both - not ai_enabled alone - or it shows
  // "Take over" while the banner already says you're handling it.
  const aiHandling = aiEnabled && !escalated;
  const inboxSearch = searchParams.toString();

  return (
    <div>
      <Link
        to={`/admin/support${inboxSearch ? `?${inboxSearch}` : ""}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-purple transition mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to inbox
      </Link>

      {ticket && (
        <div className="rounded-xl border border-border bg-surface p-5 mb-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Headphones className="w-5 h-5 text-purple" />
                <h1 className="text-xl font-display font-bold">{ticket.subject}</h1>
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-bold",
                    statusClass(ticket.status),
                  )}
                >
                  {ticket.status.replace(/_/g, " ")}
                </span>
                {!escalated && aiEnabled && (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-bold bg-purple-dim text-purple border-purple/30 inline-flex items-center gap-1">
                    <Bot className="w-3 h-3" /> AI active
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">{memberLabel(ticket)}</div>
              {ticket.profile?.email &&
                (memberUserId ? (
                  <Link
                    to={`/admin/users/${memberUserId}`}
                    title="Open this member's admin profile"
                    className="text-xs text-purple hover:underline"
                  >
                    {ticket.profile.email}
                  </Link>
                ) : (
                  <div className="text-xs text-muted-foreground">{ticket.profile.email}</div>
                ))}
              {ticket.category && (
                <p className="text-xs text-muted-foreground mt-1">
                  Category: <span className="text-purple font-semibold">{SUPPORT_CATEGORY_LABELS[ticket.category]}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {aiHandling ? (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => void patch({ aiEnabled: false }, "AI turned off, you're handling this ticket.")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-border text-xs font-semibold hover:bg-surface-soft transition disabled:opacity-60"
                  title="Stop the AI assistant from replying and take over yourself"
                >
                  <BotOff className="w-3.5 h-3.5" /> Take over
                </button>
              ) : (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => void patch({ aiEnabled: true }, "AI re-enabled for this ticket.")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-purple/30 text-purple text-xs font-semibold hover:bg-purple-dim transition disabled:opacity-60"
                  title="Let the AI assistant handle replies again"
                >
                  <Bot className="w-3.5 h-3.5" /> Hand back to AI
                </button>
              )}

              {isTicketOpen(ticket.status) ? (
                <>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => void patch({ status: "resolved" }, "Marked resolved.")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-green/30 text-green text-xs font-semibold hover:bg-green-dim transition disabled:opacity-60"
                  >
                    {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Mark resolved
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => void patch({ status: "closed" })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-border text-xs font-semibold hover:bg-surface-soft transition disabled:opacity-60"
                  >
                    Close
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => void patch({ status: "open" }, "Reopened.")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-amber/30 text-amber text-xs font-semibold hover:bg-amber-dim transition disabled:opacity-60"
                >
                  {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  Reopen
                </button>
              )}
            </div>
          </div>

          {escalated && (
            <div className="mt-4 flex gap-2 rounded-md bg-surface-soft border border-border px-3 py-2 text-xs text-muted-foreground">
              <BotOff className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong className="text-foreground">You're handling this ticket.</strong>{" "}
                The AI is paused. Click "Hand back to AI" above to let it resume replying.
              </span>
            </div>
          )}
        </div>
      )}

      <SupportChatThread ticketId={ticketId} onTicketUpdate={setTicket} />
    </div>
  );
}
