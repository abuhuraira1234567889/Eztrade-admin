"use client";

import { useState, useTransition } from "react";
import { useNavigate } from "react-router-dom";
import { updateQuestion, createQuestion } from "@/services/action-stubs";

export type ExistingQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  orderIndex: number;
};

/**
 * Add/edit form for a single quiz question. Mirrors the admin form pattern
 * (FormData -> server action). Four option inputs, a radio to mark the correct
 * one, an optional explanation, and an order index. When `existing` is passed
 * it edits in place; otherwise it creates.
 */
export function QuestionForm({
  lessonId,
  existing,
  defaultOrder,
  onDone,
}: {
  lessonId: string;
  existing?: ExistingQuestion;
  defaultOrder?: number;
  onDone?: () => void;
}) {
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [correct, setCorrect] = useState(existing?.correctIndex ?? 0);

  const opts = [0, 1, 2, 3].map((i) => existing?.options[i] ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      void (existing ? updateQuestion(formData) : createQuestion(formData)).then((res) => {
        if (res && "error" in res && res.error) {
          setError(res.error);
          return;
        }
        if (res && "translationNote" in res && res.translationNote) {
          setNotice(res.translationNote);
        }
        window.location.reload();
        onDone?.();
      });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="lesson_id" value={lessonId} />
      {existing && <input type="hidden" name="id" value={existing.id} />}

      <div>
        <label className="field-label">Question</label>
        <textarea
          name="question"
          required
          defaultValue={existing?.question ?? ""}
          rows={2}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          placeholder="What does a pip measure?"
        />
      </div>

      <div className="space-y-2">
        <label className="field-label">Options (select the correct one)</label>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct_index"
              value={i}
              checked={correct === i}
              onChange={() => setCorrect(i)}
              className="accent-purple"
              aria-label={`Mark option ${String.fromCharCode(65 + i)} correct`}
            />
            <input
              name={`option_${i}`}
              defaultValue={opts[i]}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              placeholder={`Option ${String.fromCharCode(65 + i)}${i > 1 ? " (optional)" : ""}`}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_120px] gap-3">
        <div>
          <label className="field-label">Explanation (shown after answering)</label>
          <input
            name="explanation"
            defaultValue={existing?.explanation ?? ""}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            placeholder="A pip is the fourth decimal place on most pairs."
          />
        </div>
        <div>
          <label className="field-label">Order</label>
          <input
            name="order_index"
            type="number"
            defaultValue={existing?.orderIndex ?? defaultOrder ?? 0}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}
      {notice && <p className="text-sm text-purple">{notice}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple-700 transition disabled:opacity-60"
        >
          {isPending
            ? "Saving & translating… (up to ~1 min)"
            : existing
              ? "Save changes"
              : "Add question"}
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-surface-soft transition"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
