"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Save, Plus, Trash2 } from "lucide-react";
import { updateLessonContent, type LessonContent, type LessonRow } from "@/services/academy-admin";

const inputCls =
  "w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm outline-none focus:border-purple";
const areaCls = inputCls + " min-h-[56px]";

type Concept = { term: string; definition: string };

/**
 * Structured editor for a lesson's rich body (`lesson_content`), the hook / why /
 * key-concepts / snapshot / takeaway blocks members read under the video. Legacy
 * keys the member app no longer surfaces (apply, coach_prompt) are loaded and
 * written back untouched so saving never drops them.
 */
export function LessonContentEditor({ lesson, onSaved }: { lesson: LessonRow; onSaved?: () => void }) {
  const initial = (lesson.lesson_content ?? {}) as LessonContent;
  const [hook, setHook] = useState(String(initial.hook ?? ""));
  const [why, setWhy] = useState(String(initial.why ?? ""));
  const [concepts, setConcepts] = useState<Concept[]>(
    Array.isArray(initial.concepts)
      ? initial.concepts.map((c) => ({ term: String(c?.term ?? ""), definition: String(c?.definition ?? "") }))
      : [],
  );
  const [scene, setScene] = useState(String(initial.snapshot?.scene ?? ""));
  const [quoteText, setQuoteText] = useState(String(initial.snapshot?.quote?.text ?? ""));
  const [quoteBy, setQuoteBy] = useState(String(initial.snapshot?.quote?.by ?? ""));
  const [takeaway, setTakeaway] = useState(String(initial.takeaway ?? ""));
  const [saving, setSaving] = useState(false);

  // Preserve any keys we don't edit (e.g. apply, coach_prompt).
  const rest = useMemo(() => {
    const { hook, why, concepts, snapshot, takeaway, ...other } = initial;
    void hook;
    void why;
    void concepts;
    void snapshot;
    void takeaway;
    return other;
  }, [initial]);

  function buildContent(): LessonContent {
    const cleanConcepts = concepts
      .map((c) => ({ term: c.term.trim(), definition: c.definition.trim() }))
      .filter((c) => c.term || c.definition);
    const quote =
      quoteText.trim() || quoteBy.trim()
        ? { by: quoteBy.trim(), text: quoteText.trim() }
        : undefined;
    const snapshot =
      scene.trim() || quote ? { ...(scene.trim() ? { scene: scene.trim() } : {}), ...(quote ? { quote } : {}) } : undefined;

    const out: LessonContent = { ...rest };
    if (hook.trim()) out.hook = hook.trim();
    else delete out.hook;
    if (why.trim()) out.why = why.trim();
    else delete out.why;
    if (cleanConcepts.length) out.concepts = cleanConcepts;
    else delete out.concepts;
    if (snapshot) out.snapshot = snapshot;
    else delete out.snapshot;
    if (takeaway.trim()) out.takeaway = takeaway.trim();
    else delete out.takeaway;
    return out;
  }

  async function save() {
    setSaving(true);
    try {
      const content = buildContent();
      await updateLessonContent(lesson.id, Object.keys(content).length ? content : null);
      toast.success("Lesson content saved.");
      onSaved?.();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Couldn't save the content.");
    } finally {
      setSaving(false);
    }
  }

  const setConcept = (i: number, patch: Partial<Concept>) =>
    setConcepts((p) => p.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  return (
    <div className="mt-3 rounded-lg border border-border bg-surface p-3 space-y-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">Lesson body</div>

      <label className="block text-[11px] text-muted-foreground">
        Hook (punchy one-liner)
        <textarea className={areaCls + " mt-0.5"} value={hook} onChange={(e) => setHook(e.target.value)} />
      </label>

      <label className="block text-[11px] text-muted-foreground">
        Why this matters
        <textarea className={areaCls + " mt-0.5"} value={why} onChange={(e) => setWhy(e.target.value)} />
      </label>

      <div className="text-[11px] text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Key concepts</span>
          <button
            type="button"
            onClick={() => setConcepts((p) => [...p, { term: "", definition: "" }])}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] hover:bg-surface-soft transition"
          >
            <Plus className="w-3 h-3" /> Add concept
          </button>
        </div>
        <div className="mt-1.5 space-y-2">
          {concepts.map((c, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                className={inputCls + " flex-none w-40"}
                placeholder="Term"
                value={c.term}
                onChange={(e) => setConcept(i, { term: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Definition"
                value={c.definition}
                onChange={(e) => setConcept(i, { definition: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setConcepts((p) => p.filter((_, idx) => idx !== i))}
                className="flex-none rounded-md border border-red-500/40 px-2 py-1.5 text-red-600 hover:bg-red-500/10 transition"
                title="Remove concept"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {concepts.length === 0 && <div className="text-muted-foreground">No concepts — the Key concepts block is hidden.</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block text-[11px] text-muted-foreground sm:col-span-2">
          Real-world snapshot (scene)
          <textarea className={areaCls + " mt-0.5"} value={scene} onChange={(e) => setScene(e.target.value)} />
        </label>
        <label className="block text-[11px] text-muted-foreground">
          Quote text
          <input className={inputCls + " mt-0.5"} value={quoteText} onChange={(e) => setQuoteText(e.target.value)} />
        </label>
        <label className="block text-[11px] text-muted-foreground">
          Quote author
          <input className={inputCls + " mt-0.5"} value={quoteBy} onChange={(e) => setQuoteBy(e.target.value)} />
        </label>
      </div>

      <label className="block text-[11px] text-muted-foreground">
        Takeaway
        <textarea className={areaCls + " mt-0.5"} value={takeaway} onChange={(e) => setTakeaway(e.target.value)} />
      </label>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-purple px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple/90 transition disabled:opacity-60"
        >
          <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save content"}
        </button>
      </div>
    </div>
  );
}
