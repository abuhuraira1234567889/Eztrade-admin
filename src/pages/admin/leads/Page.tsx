"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, UserPlus } from "lucide-react";
import { getApi } from "@/services/api";

/**
 * Funnel leads (`public.leads`) - people who left their details on a landing
 * page before signing up. Read through /api/admin/data/leads: the table's RLS
 * denies the browser's anon key, and a browser-direct read comes back as an
 * empty array rather than an error, which would look exactly like "no leads".
 */

type Lead = {
  id: string;
  created_at: string | null;
  name: string | null;
  country: string | null;
  email: string | null;
  telegram: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

const PAGE_SIZE = 50;

/** "@handle" / "https://t.me/handle" / "handle" → the bare handle, or null. */
function telegramHandle(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.trim().replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "");
  const handle = v.replace(/^@/, "").trim();
  // Some entrants type an email into the Telegram box - don't link that.
  if (!handle || handle.includes("@") || /\s/.test(handle)) return null;
  return handle;
}

function fmtWhen(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminLeadsPage() {
  const [rows, setRows] = useState<Lead[] | null>(null);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounced so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      const params: Record<string, string> = { page: String(page) };
      if (search.trim()) params.search = search.trim();

      getApi<{ rows: Lead[]; count: number }>("/api/admin/data/leads", params)
        .then((res) => {
          if (cancelled) return;
          setRows(res.rows ?? []);
          setCount(res.count ?? 0);
        })
        .catch((e: unknown) => {
          // A failed read must not render as "no leads yet".
          if (!cancelled) setError(e instanceof Error ? e.message : "Leads read failed.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, page]);

  // Reset to the first page whenever the term changes, or a search can land on
  // a page number that no longer exists in the filtered set.
  useEffect(() => {
    setPage(0);
  }, [search]);

  const list = rows ?? [];
  const rangeStart = count === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = page * PAGE_SIZE + list.length;
  const hasNext = rangeEnd < count;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            <UserPlus className="h-5 w-5 text-purple" aria-hidden />
            Leads
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Landing-page signups captured before registration, newest first.
          </p>
        </div>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, telegram, country, campaign"
            className="w-72 rounded-lg border border-border bg-surface-soft py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span>
            {loading
              ? "Loading…"
              : count === 0
                ? "No leads"
                : `${rangeStart}–${rangeEnd} of ${count}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="rounded-md border border-border p-1 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext || loading}
              className="rounded-md border border-border p-1 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error ? (
          <div className="px-4 py-6 text-sm text-red">Leads could not be loaded: {error}</div>
        ) : loading && rows === null ? (
          <div className="px-4 py-8 text-sm text-muted-foreground">Loading leads…</div>
        ) : list.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            {search.trim() ? `No leads match "${search.trim()}".` : "No leads captured yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-soft text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left">Name</th>
                  <th className="px-4 py-2.5 text-left">Email</th>
                  <th className="px-4 py-2.5 text-left">Telegram</th>
                  <th className="px-4 py-2.5 text-left">Country</th>
                  <th className="px-4 py-2.5 text-left">Source</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right">Captured</th>
                </tr>
              </thead>
              <tbody>
                {list.map((l) => {
                  const handle = telegramHandle(l.telegram);
                  return (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-4 py-2.5 font-semibold text-foreground">{l.name || "-"}</td>
                      <td className="px-4 py-2.5">
                        {l.email ? (
                          <a href={`mailto:${l.email}`} className="text-purple hover:underline">
                            {l.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {handle ? (
                          <a
                            href={`https://t.me/${handle}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-purple hover:underline"
                          >
                            @{handle}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">{l.telegram || "-"}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        {l.country || "-"}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {l.utm_source || l.utm_medium || l.utm_campaign ? (
                          <>
                            <div className="text-foreground">
                              {[l.utm_source, l.utm_medium].filter(Boolean).join(" · ") || "-"}
                            </div>
                            {l.utm_campaign && (
                              <div className="text-[11px] text-muted-foreground" title={l.utm_campaign}>
                                {l.utm_campaign}
                              </div>
                            )}
                          </>
                        ) : (
                          // No UTM tags at all - they arrived without campaign
                          // tracking (direct link, or a form that dropped them).
                          <span className="text-muted-foreground">Direct</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-muted-foreground">
                        {fmtWhen(l.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
