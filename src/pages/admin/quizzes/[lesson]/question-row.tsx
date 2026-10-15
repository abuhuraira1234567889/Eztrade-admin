"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Trash2, Languages } from "lucide-react";
import { deleteQuestion, retranslateQuestion } from "@/services/action-stubs";
import { QuestionForm, type ExistingQuestion } from "./question-form";

const TARGET_LANGS = 15;

/**
 * A single existing quiz question in the admin editor. Read view shows the
 * question + options (correct one badged). Edit toggles an inline QuestionForm.
 * Delete confirms then calls the backend API.
 */
export function QuestionRow({
  lessonId,
  question,
  editQuestion,
  index,
  translationCount = 0,
}: {
  lessonId: string;
  question: ExistingQuestion;
  /** English source used when editing (display uses localized `question`). */
  editQuestion?: ExistingQuestion;
  index: number;
  translationCount?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [txPending, setTxPending] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const txComplete = translationCount >= TARGET_LANGS;
  const source = editQuestion ?? question;

  function handleDelete() {
    const fd = new FormData();
    fd.set("id", question.id);
    fd.set("lesson_id", lessonId);
    startTransition(() => {
      void deleteQuestion(fd).then(() => {
        window.location.reload();
      });
    });
  }

  function handleRetranslate() {
    setTxError(null);
    setTxPending(true);
    void retranslateQuestion(question.id).then((res) => {
      setTxPending(false);
      if (!res.ok) {
        setTxError(res.error ?? "Re-translate failed.");
        return;
      }
      if (res.error) setTxError(res.error);
      window.location.reload();
    });
  }

  return (
    <li className="p-4">
      {editing ? (
        <QuestionForm
          lessonId={lessonId}
          existing={source}
          onDone={() => setEditing(false)}
        />
      ) : (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Q{index + 1}
                </div>
                <span
                  className={
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded " +
                    (txComplete
                      ? "bg-green-dim text-green"
                      : "bg-amber-500/15 text-amber-600")
                  }
                >
                  {translationCount}/{TARGET_LANGS} langs
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">{question.question}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!txComplete && (
                <button
                  type="button"
                  onClick={handleRetranslate}
                  disabled={txPending}
                  title="Generate missing translations via Google Translate"
                  className="p-1.5 rounded-md border border-purple/40 text-purple hover:bg-purple-dim transition disabled:opacity-60"
                  aria-label="Re-translate question"
                >
                  <Languages className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-surface-soft transition"
                aria-label="Edit question"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {confirming ? (
                <span className="inline-flex items-center gap-1">
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="px-2 py-1 rounded-md bg-red text-white text-xs font-semibold disabled:opacity-60"
                  >
                    {isPending ? "…" : "Delete"}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    className="px-2 py-1 rounded-md border border-border text-xs"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-red hover:bg-red-dim transition"
                  aria-label="Delete question"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          {txPending && (
            <p className="mt-2 text-xs text-purple">Translating… (up to ~1 min)</p>
          )}
          {txError && <p className="mt-2 text-xs text-red">{txError}</p>}
          <ul className="mt-2 space-y-1">
            {question.options.map((opt, i) => {
              const isCorrect = i === question.correctIndex;
              return (
                <li
                  key={i}
                  className={
                    "flex items-center gap-2 text-xs " +
                    (isCorrect ? "text-green font-semibold" : "text-secondary-foreground")
                  }
                >
                  <span className="grid place-items-center w-4 h-4 flex-shrink-0">
                    {isCorrect ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <span className="text-muted-foreground">
                        {String.fromCharCode(65 + i)}
                      </span>
                    )}
                  </span>
                  {opt}
                </li>
              );
            })}
          </ul>
          {question.explanation && (
            <p className="mt-2 text-xs text-muted-foreground italic">{question.explanation}</p>
          )}
        </div>
      )}
    </li>
  );
}
