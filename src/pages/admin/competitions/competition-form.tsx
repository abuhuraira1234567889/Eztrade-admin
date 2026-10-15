"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createCompetition,
  deleteCompetition,
  updateCompetition,
} from "@/services/action-stubs";
import { ThumbnailPicker } from "./thumbnail-picker";
import { RulesBuilder, type Condition } from "./rules-builder";

/** Pull the algorithmic eligibility conditions out of the stored rules jsonb. */
function ruleConditions(rules: unknown): Condition[] {
  if (rules && typeof rules === "object" && !Array.isArray(rules)) {
    const c = (rules as Record<string, unknown>).conditions;
    if (Array.isArray(c)) {
      return c.filter(
        (x): x is Condition =>
          !!x && typeof x === "object" && typeof (x as Condition).metric === "string",
      );
    }
  }
  return [];
}

/**
 * Shared form for /admin/competitions/new and /admin/competitions/[id].
 * The two routes pass different action targets via the `mode` prop -
 * `createCompetition` for new, `updateCompetition` for edit. Mirrors the
 * shape of app/admin/live-events/event-form.tsx so the two admin tools feel
 * visually identical.
 */

type CompetitionRow = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  kind: string;
  starts_at: string;
  ends_at: string;
  rules: unknown;
  is_active: boolean;
  thumbnail_url: string | null;
  prize_pool_label: string | null;
  entry_mode?: string | null;
};

/** Pull a numeric rule value out of the stored jsonb so the structured fields
 *  pre-fill on edit. Tolerates the legacy free-text/JSON-string shape. */
function ruleNum(rules: unknown, key: string): string {
  if (rules && typeof rules === "object" && !Array.isArray(rules)) {
    const v = (rules as Record<string, unknown>)[key];
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return "";
}

/** Pull the free-text `details` rule, if present. */
function ruleDetails(rules: unknown): string {
  if (rules && typeof rules === "object" && !Array.isArray(rules)) {
    const v = (rules as Record<string, unknown>).details;
    if (typeof v === "string") return v;
  }
  // Legacy: whole rules stored as a plain string → seed the details box with it.
  if (typeof rules === "string") return rules;
  return "";
}

function toLocalInput(iso: string | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Must match DB check constraint competitions_kind_check. */
const KIND_OPTIONS: { value: string; label: string }[] = [
  { value: "league", label: "League · ongoing PT score ladder" },
  { value: "referral_race", label: "Referral race" },
  { value: "best_analysis", label: "Best analysis" },
  { value: "custom", label: "Custom" },
];

export function CompetitionForm({ competition }: { competition?: CompetitionRow }) {
  const isEdit = !!competition;
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    const res = isEdit
      ? await updateCompetition(formData)
      : await createCompetition(formData);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Could not save competition.");
      return;
    }
    navigate(isEdit ? `/admin/competitions/${res.id}` : "/admin/competitions");
  }

  async function handleDelete(formData: FormData) {
    if (!window.confirm("Delete this competition and all its entries? This cannot be undone.")) {
      return;
    }
    setError(null);
    setPending(true);
    const res = await deleteCompetition(formData);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Could not delete competition.");
      return;
    }
    navigate("/admin/competitions");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
      <Link
        to="/admin/competitions"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-purple mb-3"
      >
        ← All competitions
      </Link>
      <h1 className="text-2xl font-display font-bold mb-1">
        {isEdit ? "Edit competition" : "New competition"}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Members see this on /rewards/competitions as soon as you check "Active".
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red/30 bg-red/10 px-3 py-2 text-sm text-red">
          {error}
        </div>
      )}

      <form
        key={competition?.id ?? "new"}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(new FormData(e.currentTarget));
        }}
        className="space-y-5"
      >
        {isEdit && <input type="hidden" name="id" value={competition!.id} />}

        <Field label="Name" required>
          <input
            type="text"
            name="name"
            defaultValue={competition?.name ?? ""}
            required
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
          />
        </Field>

        <Field label="Slug" hint="URL path under /rewards/competitions/. Leave blank to auto-generate from name + start date.">
          <input
            type="text"
            name="slug"
            defaultValue={competition?.slug ?? ""}
            placeholder="auto-generated"
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
          />
        </Field>

        <Field label="Description" hint="Short body copy under the title. Plain text.">
          <textarea
            name="description"
            defaultValue={competition?.description ?? ""}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
          />
        </Field>

        <Field label="Kind" hint="Drives the chip on the card. Ranking is scored from entry points.">
          <select
            name="kind"
            defaultValue={
              KIND_OPTIONS.some((o) => o.value === competition?.kind)
                ? competition!.kind
                : "custom"
            }
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
          >
            {KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </Field>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Starts at" required>
            <input
              type="datetime-local"
              name="starts_at"
              defaultValue={toLocalInput(competition?.starts_at)}
              required
              className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
            />
          </Field>
          <Field label="Ends at" required>
            <input
              type="datetime-local"
              name="ends_at"
              defaultValue={toLocalInput(competition?.ends_at)}
              required
              className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
            />
          </Field>
        </div>

        <Field
          label="Prize pool label"
          hint='Short headline copy, e.g. "$10,000 prize pool". Rendered above the rules block and on the card.'
        >
          <input
            type="text"
            name="prize_pool_label"
            defaultValue={competition?.prize_pool_label ?? ""}
            placeholder="$10,000 prize pool"
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
          />
        </Field>

        <Field label="Banner image" hint="Shown on the competitions list card and as the hero on the detail page. Upload a 720 × 300px banner (2.4:1).">
          <ThumbnailPicker
            defaultValue={competition?.thumbnail_url}
            competitionId={competition?.id}
          />
        </Field>

        <Field label="Entry mode" hint="Automatic enters every eligible member the moment the competition goes live. Manual shows a Join button so members opt in themselves.">
          <select
            name="entry_mode"
            defaultValue={competition?.entry_mode ?? "auto"}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
          >
            <option value="auto">Automatic · everyone entered</option>
            <option value="manual">Manual · members tap Join</option>
          </select>
        </Field>

        <fieldset className="rounded-xl border border-border p-4 space-y-4">
          <legend className="px-1 text-xs uppercase tracking-wider text-muted-foreground">Rules</legend>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Minimum trades" hint="Trades needed to qualify.">
              <input type="number" min={0} step={1} name="rule_min_trades" defaultValue={ruleNum(competition?.rules, "min_trades")} placeholder="e.g. 10" className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm" />
            </Field>
            <Field label="Number of winners" hint="How many top places get a prize.">
              <input type="number" min={0} step={1} name="rule_top_winners" defaultValue={ruleNum(competition?.rules, "top_winners")} placeholder="e.g. 3" className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm" />
            </Field>
            <Field label="Prize pool (USD)" hint="Numeric - renders as a $ figure.">
              <input type="number" min={0} step={1} name="rule_prize_pool_usd" defaultValue={ruleNum(competition?.rules, "prize_pool_usd")} placeholder="e.g. 1000" className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm" />
            </Field>
            <Field label="Max drawdown %" hint="Disqualify above this drawdown. Optional.">
              <input type="number" min={0} step={0.1} name="rule_max_drawdown_pct" defaultValue={ruleNum(competition?.rules, "max_drawdown_pct")} placeholder="e.g. 20" className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm" />
            </Field>
            <Field label="Minimum rank to enter" hint="Tier number 1–7 (Beginner→VIP). Optional.">
              <input type="number" min={0} max={7} step={1} name="rule_tier_min" defaultValue={ruleNum(competition?.rules, "tier_min")} placeholder="e.g. 1" className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm" />
            </Field>
          </div>
          <Field label="Additional rules" hint="Any extra conditions, in plain text. Shown as a paragraph under the structured rules.">
            <textarea name="rule_details" defaultValue={ruleDetails(competition?.rules)} rows={4} placeholder="e.g. Only USD accounts. Hedging not allowed. Winners verified before payout." className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm" />
          </Field>
          <div className="pt-1">
            <div className="eyebrow mb-1.5">Eligibility conditions</div>
            <RulesBuilder name="rule_conditions" defaultValue={ruleConditions(competition?.rules)} />
          </div>
        </fieldset>

        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={competition?.is_active ?? true}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Active (visible to members)</span>
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple/90 transition disabled:opacity-60"
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create competition"}
          </button>
          <Link
            to="/admin/competitions"
            className="text-xs text-muted-foreground hover:text-foreground uppercase tracking-wider"
          >
            Cancel
          </Link>
        </div>
      </form>

      {isEdit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleDelete(new FormData(e.currentTarget));
          }}
          className="mt-10 pt-6 border-t border-border"
        >
          <input type="hidden" name="id" value={competition!.id} />
          <h3 className="text-sm font-display font-bold text-red mb-2">Danger zone</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Deleting drops the leaderboard and entries for this competition. There's no undo.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="text-xs text-red hover:underline uppercase tracking-wider disabled:opacity-60"
          >
            Delete this competition
          </button>
        </form>
      )}
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="eyebrow mb-1.5">
        {label}{required && <span className="text-red ml-1">*</span>}
      </div>
      {children}
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </label>
  );
}
