"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

/**
 * Algorithmic eligibility-rule builder. Admins compose any number of
 * conditions (metric + operator + value), e.g. "Balance ≥ 1000 AND Lots traded
 * ≥ 5". The rows serialize to a hidden JSON input (`rule_conditions`) submitted
 * with the competition form; the server action stores them under
 * rules.conditions and the member detail page renders them as readable lines.
 */

export type Condition = { metric: string; op: string; value: number };

const METRICS: { value: string; label: string; unit: "usd" | "pct" | "num" }[] = [
  { value: "balance", label: "Account balance", unit: "usd" },
  { value: "equity", label: "Equity", unit: "usd" },
  { value: "lots", label: "Lots traded (30d)", unit: "num" },
  { value: "trades", label: "Trades (30d)", unit: "num" },
  { value: "win_rate", label: "Win rate", unit: "pct" },
  { value: "profit", label: "Net profit", unit: "usd" },
  { value: "profit_factor", label: "Profit factor", unit: "num" },
  { value: "drawdown_pct", label: "Max drawdown", unit: "pct" },
  { value: "tier", label: "Rank (1=Beginner … 7=VIP)", unit: "num" },
];

const OPS = [
  { value: ">=", label: "≥" },
  { value: ">", label: ">" },
  { value: "<=", label: "≤" },
  { value: "<", label: "<" },
  { value: "==", label: "=" },
];

export function RulesBuilder({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: Condition[];
}) {
  const [rows, setRows] = useState<Condition[]>(
    defaultValue && defaultValue.length ? defaultValue : [],
  );

  function update(next: Condition[]) {
    setRows(next);
  }
  function add() {
    update([...rows, { metric: "balance", op: ">=", value: 0 }]);
  }
  function remove(i: number) {
    update(rows.filter((_, idx) => idx !== i));
  }
  function set(i: number, patch: Partial<Condition>) {
    update(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const inputCls =
    "px-2.5 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm outline-none focus:border-purple/50";

  return (
    <div className="space-y-3">
      {/* Serialized payload for the form action */}
      <input type="hidden" name={name} value={JSON.stringify(rows)} readOnly />

      {rows.length === 0 && (
        <p className="text-[12px] text-muted-foreground">
          No eligibility conditions yet - the competition is open to everyone. Add conditions to
          gate entry (e.g. balance ≥ $1,000 and 5+ lots traded).
        </p>
      )}

      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select value={r.metric} onChange={(e) => set(i, { metric: e.target.value })} className={inputCls + " min-w-[180px]"}>
              {METRICS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select value={r.op} onChange={(e) => set(i, { op: e.target.value })} className={inputCls + " w-16"}>
              {OPS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              type="number"
              step="any"
              value={Number.isFinite(r.value) ? r.value : 0}
              onChange={(e) => set(i, { value: Number(e.target.value) })}
              className={inputCls + " w-32"}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:text-red hover:border-red/40 transition"
              aria-label="Remove condition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-soft px-3 py-2 text-xs font-semibold text-foreground hover:border-purple/50 transition"
      >
        <Plus className="h-3.5 w-3.5" /> Add condition
      </button>
    </div>
  );
}
