import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  MessageSquare,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import {
  fetchFeedbackSummary,
  fetchSurvey,
  saveSurvey,
  type FeedbackSummary,
  type SurveyConfig,
  type SurveyOption,
  type SurveySection,
} from "@/services/product-feedback-admin";

const inputCls =
  "w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm outline-none focus:border-purple disabled:opacity-50";

type Tab = "results" | "setup";

/**
 * Product feedback: the member survey (what the dashboard pop-up asks) and how
 * members have ranked it. Everything the pop-up shows - title, steps, items -
 * comes from the Survey setup tab.
 */
export default function AdminProductFeedbackPage() {
  const [tab, setTab] = useState<Tab>("results");

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-purple" /> Product Feedback
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          The dashboard survey members fill in, and how they rank each item. Lower average position = more favoured.
        </p>
      </div>

      <div className="mb-5 inline-flex gap-1 rounded-lg border border-border bg-surface p-1">
        {(
          [
            ["results", "Results"],
            ["setup", "Survey setup"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={
              "px-3.5 py-1.5 rounded-md text-sm font-semibold transition-colors " +
              (tab === key ? "bg-purple text-white" : "text-muted-foreground hover:text-foreground")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "results" ? <Results /> : <SurveySetup />}
    </div>
  );
}

// ── Results ──────────────────────────────────────────────────────────────────

function Results() {
  const [data, setData] = useState<FeedbackSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFeedbackSummary()
      .then((res) => !cancelled && setData(res))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "read failed"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="p-4 text-sm text-red">Couldn't load feedback: {error}</div>;
  if (!data) return <PageSkeleton />;

  const maxDay = Math.max(1, ...data.responsesByDay.map((d) => d.count));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <div>
          <div className="text-3xl font-display font-bold text-foreground tabular-nums">{data.totalResponses.toLocaleString()}</div>
          <div className="text-xs font-semibold text-muted-foreground">Responses to the current survey</div>
        </div>
        {data.legacyResponses > 0 && (
          <p className="max-w-md text-xs text-muted-foreground">
            {data.legacyResponses.toLocaleString()} older responses answered the previous fixed survey and aren't counted here.
          </p>
        )}
      </div>

      {data.totalResponses === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No feedback submitted for this survey yet.</p>
        </div>
      ) : (
        <>
          {data.sections.map((s) => (
            <SectionCard key={s.key} section={s} />
          ))}

          {/* Ranking changes over time: response volume per day (the Δ column in
              each table shows how each item has moved since the first day). */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-sm text-foreground font-bold mb-1">Responses over time</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Daily submission volume. The <strong>Δ</strong> column above tracks each item's rank movement since the first day of
              responses.
            </p>
            <ol className="space-y-2">
              {data.responsesByDay.map((d) => (
                <li key={d.date}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span>{d.date}</span>
                    <span className="tabular-nums text-muted-foreground">{d.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-soft overflow-hidden">
                    <div className="h-full bg-purple" style={{ width: `${(d.count / maxDay) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}

/** One survey step: a table ranked by average position. */
function SectionCard({ section }: { section: FeedbackSummary["sections"][number] }) {
  // Backend returns catalog order; show it ranked (best average first, unranked last).
  const items = [...section.items].sort((a, b) => {
    if (a.rank == null) return 1;
    if (b.rank == null) return -1;
    return a.rank - b.rank;
  });

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <h2 className="text-sm text-purple font-bold">{section.label}</h2>
        {!section.isActive && <InactiveBadge />}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-soft text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left w-12">#</th>
              <th className="px-4 py-2.5 text-left">Item</th>
              <th className="px-3 py-2.5 text-right">Avg pos</th>
              <th className="px-3 py-2.5 text-right">#1</th>
              <th className="px-3 py-2.5 text-right">% #1</th>
              <th className="px-3 py-2.5 text-right">% Top 3</th>
              <th className="px-3 py-2.5 text-right">Δ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.slug} className="border-t border-border">
                <td className="px-4 py-2.5 tabular-nums font-bold text-foreground">{it.rank ?? "-"}</td>
                <td className="px-4 py-2.5 font-semibold text-foreground">
                  <span className="inline-flex items-center gap-2">
                    {it.label}
                    {!it.isActive && <InactiveBadge />}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-bold text-foreground">
                  {it.avgPosition != null ? it.avgPosition.toFixed(2) : "-"}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{it.firstCount}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{it.pctFirst}%</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{it.pctTop3}%</td>
                <td className="px-3 py-2.5 text-right">
                  <RankDelta delta={it.rankDelta} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Rank movement since the first day: + = climbed, - = slipped. */
function RankDelta({ delta }: { delta: number | null }) {
  if (delta == null || delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-muted-foreground">
        <Minus className="w-3 h-3" />
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 tabular-nums font-semibold ${up ? "text-green" : "text-red"}`}>
      {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(delta)}
    </span>
  );
}

function InactiveBadge() {
  return <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold bg-surface-soft text-muted-foreground">Hidden</span>;
}

// ── Survey setup ─────────────────────────────────────────────────────────────

/** Draft rows carry a local id so React keys survive renames before a slug exists. */
type DraftOption = SurveyOption & { _id: string; isNew?: boolean };
type DraftSection = Omit<SurveySection, "options"> & { _id: string; isNew?: boolean; options: DraftOption[] };
type Draft = Omit<SurveyConfig, "sections"> & { sections: DraftSection[] };

let localSeq = 0;
const localId = () => `new-${++localSeq}`;

/** "Live sessions" → "live_sessions", made unique among `taken`. */
function slugify(text: string, taken: Set<string>, fallback: string, minLen = 1): string {
  let base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  if (base.length < minLen || !/^[a-z0-9]/.test(base)) base = fallback;
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}_${n}`;
  return slug;
}

function toDraft(s: SurveyConfig): Draft {
  return {
    isEnabled: s.isEnabled,
    title: s.title,
    subtitle: s.subtitle,
    sections: s.sections.map((sec) => ({
      ...sec,
      _id: sec.id ?? localId(),
      options: sec.options.map((o) => ({ ...o, _id: o.id ?? localId() })),
    })),
  };
}

function toPayload(d: Draft): SurveyConfig {
  return {
    isEnabled: d.isEnabled,
    title: d.title,
    subtitle: d.subtitle,
    sections: d.sections.map((s) => ({
      key: s.key,
      title: s.title,
      prompt: s.prompt,
      isActive: s.isActive,
      options: s.options.map((o) => ({ slug: o.slug, label: o.label, isActive: o.isActive })),
    })),
  };
}

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function SurveySetup() {
  const [saved, setSaved] = useState<SurveyConfig | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSurvey()
      .then((s) => {
        setSaved(s);
        setDraft(toDraft(s));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "read failed"));
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-amber bg-surface p-4 text-sm">
        Couldn't load the survey: {error}. If this is a new install, apply migration <code>194_product_feedback_dynamic.sql</code>.
      </div>
    );
  }
  if (!draft || !saved) return <PageSkeleton />;

  const dirty = JSON.stringify(toPayload(draft)) !== JSON.stringify(toPayload(toDraft(saved)));

  const updateSection = (id: string, patch: Partial<DraftSection>) =>
    setDraft((d) => d && { ...d, sections: d.sections.map((s) => (s._id === id ? { ...s, ...patch } : s)) });
  const updateOption = (sectionId: string, optionId: string, patch: Partial<DraftOption>) =>
    setDraft(
      (d) =>
        d && {
          ...d,
          sections: d.sections.map((s) =>
            s._id === sectionId ? { ...s, options: s.options.map((o) => (o._id === optionId ? { ...o, ...patch } : o)) } : s,
          ),
        },
    );

  function addSection() {
    setDraft((d) => {
      if (!d) return d;
      const taken = new Set(d.sections.map((s) => s.key));
      const n = d.sections.length + 1;
      return {
        ...d,
        sections: [
          ...d.sections,
          { _id: localId(), isNew: true, key: slugify(`step_${n}`, taken, `step_${n}`, 2), title: "", prompt: "", isActive: true, options: [] },
        ],
      };
    });
  }

  function addOption(section: DraftSection) {
    const label = (newItem[section._id] ?? "").trim();
    if (!label) return;
    const taken = new Set(section.options.map((o) => o.slug));
    const slug = slugify(label, taken, `item_${section.options.length + 1}`);
    updateSection(section._id, { options: [...section.options, { _id: localId(), isNew: true, slug, label, isActive: true }] });
    setNewItem((m) => ({ ...m, [section._id]: "" }));
  }

  async function onSave() {
    if (!draft) return;
    // New steps take their key from the title on first save; saved keys never change.
    const taken = new Set(draft.sections.filter((s) => !s.isNew).map((s) => s.key));
    const prepared: Draft = {
      ...draft,
      sections: draft.sections.map((s, i) => {
        if (!s.isNew) return s;
        const key = slugify(s.title, taken, `step_${i + 1}`, 2);
        taken.add(key);
        return { ...s, key };
      }),
    };
    setSaving(true);
    try {
      const res = await saveSurvey(toPayload(prepared));
      setSaved(res);
      setDraft(toDraft(res));
      toast.success("Survey saved. Members see the new version on their next dashboard visit.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 pb-20">
      {/* Pop-up header + on/off */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-foreground">Pop-up</h2>
          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={draft.isEnabled}
              onChange={(e) => setDraft({ ...draft, isEnabled: e.target.checked })}
              className="h-4 w-4 accent-[var(--color-purple)]"
            />
            Show the survey to members
          </label>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Title</span>
            <input
              className={inputCls + " mt-1"}
              value={draft.title}
              maxLength={120}
              placeholder="Leave empty for the default: “Help us improve <brand>”"
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Subtitle</span>
            <input
              className={inputCls + " mt-1"}
              value={draft.subtitle}
              maxLength={400}
              placeholder="Leave empty for the default intro line"
              onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Members who already answered aren't asked again. Hidden steps/items stay in the results for past responses.
        </p>
      </div>

      {draft.sections.map((s, i) => (
        <div key={s._id} className={"rounded-xl border border-border bg-surface p-4 " + (s.isActive ? "" : "opacity-70")}>
          <div className="flex flex-wrap items-start gap-3">
            <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-purple text-xs font-bold text-white">{i + 1}</span>
            <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Step title</span>
                <input
                  className={inputCls + " mt-1"}
                  value={s.title}
                  maxLength={120}
                  placeholder="e.g. Trade ideas"
                  onChange={(e) => updateSection(s._id, { title: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Question</span>
                <input
                  className={inputCls + " mt-1"}
                  value={s.prompt}
                  maxLength={400}
                  placeholder="e.g. Rank the trade ideas you use the most."
                  onChange={(e) => updateSection(s._id, { prompt: e.target.value })}
                />
              </label>
            </div>
            <div className="flex items-center gap-1">
              <IconButton label="Move step up" disabled={i === 0} onClick={() => setDraft({ ...draft, sections: move(draft.sections, i, -1) })}>
                <ChevronUp className="h-4 w-4" />
              </IconButton>
              <IconButton
                label="Move step down"
                disabled={i === draft.sections.length - 1}
                onClick={() => setDraft({ ...draft, sections: move(draft.sections, i, 1) })}
              >
                <ChevronDown className="h-4 w-4" />
              </IconButton>
              {s.isNew ? (
                <IconButton label="Remove step" onClick={() => setDraft({ ...draft, sections: draft.sections.filter((x) => x._id !== s._id) })}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              ) : (
                <label className="ml-1 inline-flex items-center gap-1.5 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={s.isActive}
                    onChange={(e) => updateSection(s._id, { isActive: e.target.checked })}
                    className="h-4 w-4 accent-[var(--color-purple)]"
                  />
                  Shown
                </label>
              )}
            </div>
          </div>

          <ul className="mt-3 grid gap-1.5">
            {s.options.map((o, j) => (
              <li key={o._id} className={"flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 " + (o.isActive ? "" : "opacity-60")}>
                <span className="w-5 text-center text-xs font-bold tabular-nums text-muted-foreground">{j + 1}</span>
                <input
                  className={inputCls + " flex-1"}
                  value={o.label}
                  maxLength={120}
                  aria-label={`Item ${j + 1} label`}
                  onChange={(e) => updateOption(s._id, o._id, { label: e.target.value })}
                />
                <code className="hidden text-[11px] text-muted-foreground sm:inline">{o.slug}</code>
                <IconButton label="Move item up" disabled={j === 0} onClick={() => updateSection(s._id, { options: move(s.options, j, -1) })}>
                  <ChevronUp className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label="Move item down"
                  disabled={j === s.options.length - 1}
                  onClick={() => updateSection(s._id, { options: move(s.options, j, 1) })}
                >
                  <ChevronDown className="h-4 w-4" />
                </IconButton>
                {o.isNew ? (
                  <IconButton label="Remove item" onClick={() => updateSection(s._id, { options: s.options.filter((x) => x._id !== o._id) })}>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                ) : (
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={o.isActive}
                      onChange={(e) => updateOption(s._id, o._id, { isActive: e.target.checked })}
                      className="h-4 w-4 accent-[var(--color-purple)]"
                    />
                    Shown
                  </label>
                )}
              </li>
            ))}
          </ul>

          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addOption(s);
            }}
          >
            <input
              className={inputCls}
              value={newItem[s._id] ?? ""}
              maxLength={120}
              placeholder="Add an item, e.g. Enrgy"
              onChange={(e) => setNewItem((m) => ({ ...m, [s._id]: e.target.value }))}
            />
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-soft"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </form>
          {s.isActive && s.options.filter((o) => o.isActive).length < 2 && (
            <p className="mt-2 text-xs font-semibold text-amber">A shown step needs at least 2 shown items.</p>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addSection}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-2 text-sm font-semibold hover:bg-surface-soft"
      >
        <Plus className="h-4 w-4" /> Add step
      </button>

      {/* Save bar */}
      <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-end gap-2 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
        {dirty && <span className="mr-auto text-xs font-semibold text-amber">Unsaved changes</span>}
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => setDraft(toDraft(saved))}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-soft disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" /> Discard
        </button>
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => void onSave()}
          className="inline-flex items-center gap-1.5 rounded-md bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save survey"}
        </button>
      </div>
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-soft hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}
