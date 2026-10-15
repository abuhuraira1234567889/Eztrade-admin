"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, ShieldAlert, ShieldBan, Trash2, VolumeX } from "lucide-react";
import { deleteApi, getApi, patchApi, postApi } from "@/services/api";
import { ConfirmModal, MuteModal, type MuteTarget } from "./mute-modal";

type RuleKind = "keyword" | "domain" | "regex";

type Rule = {
  id: string;
  kind: RuleKind;
  pattern: string;
  is_active: boolean;
  note: string | null;
  created_at: string;
};

type Mute = {
  user_id: string;
  name: string;
  reason: string | null;
  muted_at: string;
  expires_at: string | null;
};

type BlockedAttempt = {
  id: string;
  user_id: string;
  name: string;
  body: string;
  reason: "keyword" | "domain" | "regex" | "profanity";
  matched: string;
  created_at: string;
};

/**
 * Staff panel for announcement-comment moderation: the banned keyword / link
 * list (edited live, no deploy) and the muted-member list.
 */
export function CommentModerationPanel() {
  const { t } = useTranslation("announcements");

  const [rules, setRules] = useState<Rule[]>([]);
  const [mutes, setMutes] = useState<Mute[]>([]);
  const [blocked, setBlocked] = useState<BlockedAttempt[]>([]);
  const [muteTarget, setMuteTarget] = useState<MuteTarget | null>(null);
  const [pendingRuleDelete, setPendingRuleDelete] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<RuleKind>("keyword");
  const [pattern, setPattern] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, m, b] = await Promise.all([
        getApi<{ ok: boolean; items?: Rule[] }>("/api/announcements/comment-rules"),
        getApi<{ ok: boolean; items?: Mute[] }>("/api/announcements/comment-mutes"),
        getApi<{ ok: boolean; items?: BlockedAttempt[] }>(
          "/api/announcements/comment-blocked?limit=50",
        ),
      ]);
      setRules(r.items ?? []);
      setMutes(m.items ?? []);
      setBlocked(b.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load moderation settings.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addRule() {
    if (!pattern.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await postApi<{ ok: boolean; error?: string }>(
        "/api/announcements/comment-rules",
        { kind, pattern: pattern.trim(), note: note.trim() || undefined },
      );
      if (!res.ok) {
        setError(res.error ?? "Could not add that rule.");
      } else {
        setPattern("");
        setNote("");
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add that rule.");
    }
    setBusy(false);
  }

  async function toggleRule(rule: Rule) {
    await patchApi(`/api/announcements/comment-rules/${rule.id}`, {
      isActive: !rule.is_active,
    });
    await load();
  }

  async function removeRule(rule: Rule) {
    setPendingRuleDelete(null);
    await deleteApi(`/api/announcements/comment-rules/${rule.id}`);
    await load();
  }

  async function unmute(userId: string) {
    await deleteApi(`/api/announcements/comment-mutes/${userId}`);
    await load();
  }

  /** Mute straight from a blocked attempt - the common moderation follow-up. */
  async function muteFromAttempt(input: {
    reason: string;
    expiresAt: string | null;
  }) {
    const target = muteTarget;
    setMuteTarget(null);
    if (!target) return;
    await postApi("/api/announcements/comment-mutes", {
      userId: target.userId,
      reason: input.reason || undefined,
      expiresAt: input.expiresAt,
    });
    await load();
  }

  const kindLabel = (k: RuleKind) =>
    k === "keyword"
      ? t("admin.ruleKindKeyword")
      : k === "domain"
        ? t("admin.ruleKindDomain")
        : t("admin.ruleKindRegex");

  return (
    <section className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <ShieldBan className="h-5 w-5 text-purple" aria-hidden />
          {t("admin.moderationHeading")}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("admin.moderationSubtitle")}
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Add rule */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,140px)_minmax(0,1fr)]">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              {t("admin.ruleKind")}
            </span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as RuleKind)}
              className="rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm text-foreground outline-none focus:border-purple/50"
            >
              <option value="keyword">{t("admin.ruleKindKeyword")}</option>
              <option value="domain">{t("admin.ruleKindDomain")}</option>
              <option value="regex">{t("admin.ruleKindRegex")}</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              {t("admin.rulePattern")}
            </span>
            <input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder={t("admin.rulePatternPlaceholder")}
              className="rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-purple/50"
            />
          </label>
        </div>

        <label className="mt-3 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("admin.ruleNote")}
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("admin.ruleNotePlaceholder")}
            className="rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-purple/50"
          />
        </label>

        <button
          type="button"
          onClick={() => void addRule()}
          disabled={busy || !pattern.trim()}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-purple px-3.5 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-4 w-4" aria-hidden />
          )}
          {busy ? t("admin.ruleAdding") : t("admin.ruleAdd")}
        </button>
      </div>

      {/* Rule list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : rules.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          {t("admin.ruleEmpty")}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap"
            >
              <span className="shrink-0 rounded-full bg-surface-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {kindLabel(rule.kind)}
              </span>
              <div className="min-w-0 flex-1">
                <code className="block truncate font-mono text-sm text-foreground">
                  {rule.pattern}
                </code>
                {rule.note && (
                  <span className="text-xs text-muted-foreground">{rule.note}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void toggleRule(rule)}
                className={[
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  rule.is_active
                    ? "bg-green-500/15 text-green-400 hover:bg-green-500/25"
                    : "bg-surface-soft text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {rule.is_active ? t("admin.ruleActive") : t("admin.rulePaused")}
              </button>
              <button
                type="button"
                onClick={() => setPendingRuleDelete(rule)}
                aria-label={t("admin.ruleDelete")}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* What the filter stopped, platform-wide */}
      <div className="pt-2">
        <h3 className="flex items-center gap-2 font-display text-base font-bold">
          <ShieldAlert className="h-4 w-4 text-purple" aria-hidden />
          {t("admin.blockedHeading", { count: blocked.length })}
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("admin.blockedSubtitle")}
        </p>

        {blocked.length === 0 ? (
          <p className="mt-3 rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            {t("admin.blockedEmpty")}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {blocked.map((b) => (
              <li key={b.id} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-foreground">
                      {b.name}
                    </span>
                    <span className="rounded-full bg-red-dim/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red">
                      {t(`admin.blockedReason.${b.reason}`)}
                    </span>
                    <code className="rounded bg-surface-soft px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {b.matched}
                    </code>
                    <span className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line break-words text-sm text-muted-foreground line-through decoration-red/40">
                    {b.body}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMuteTarget({ userId: b.user_id, name: b.name })}
                  className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:border-amber/50 hover:text-amber"
                >
                  {t("admin.commentMuteAuthor")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mutes */}
      <div className="pt-2">
        <h3 className="flex items-center gap-2 font-display text-base font-bold">
          <VolumeX className="h-4 w-4 text-purple" aria-hidden />
          {t("admin.mutesHeading")}
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("admin.mutesSubtitle")}
        </p>

        {mutes.length === 0 ? (
          <p className="mt-3 rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            {t("admin.mutesEmpty")}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {mutes.map((m) => (
              <li key={m.user_id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {m.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {m.reason ? `${m.reason} · ` : ""}
                    {m.expires_at
                      ? `${t("admin.muteExpires")} ${new Date(m.expires_at).toLocaleDateString()}`
                      : t("admin.muteForever")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void unmute(m.user_id)}
                  className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:border-purple/50"
                >
                  {t("admin.muteUnmute")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MuteModal
        target={muteTarget}
        onCancel={() => setMuteTarget(null)}
        onConfirm={(input) => void muteFromAttempt(input)}
      />

      <ConfirmModal
        open={pendingRuleDelete !== null}
        title={t("admin.ruleDeleteTitle")}
        body={t("admin.ruleDeleteConfirm")}
        confirmLabel={t("admin.ruleDelete")}
        onCancel={() => setPendingRuleDelete(null)}
        onConfirm={() => {
          if (pendingRuleDelete) void removeRule(pendingRuleDelete);
        }}
      />
    </section>
  );
}
