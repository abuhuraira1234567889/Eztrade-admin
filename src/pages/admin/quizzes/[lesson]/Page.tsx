"use client";

import { Link } from "react-router-dom";
import { ChevronLeft, Languages } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { loadLessonQuizQuestions } from "@/lib/quizzes/get-localized";
import { retranslateLessonQuizzes } from "@/services/action-stubs";
import { QuestionForm, type ExistingQuestion } from "./question-form";
import { QuestionRow } from "./question-row";

/**
 * Per-lesson quiz editor. Lists the lesson's existing questions (edit/delete
 * inline) and an "add question" form at the bottom. Staff-gated by the /admin
 * layout. The `[lesson]` route param is the lesson UUID.
 */

import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function AdminLessonQuizPage() {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const params = useParams() as Record<string, string>;
  const [content, setContent] = useState<React.ReactNode>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { lesson: lessonId } = params;
  const quizLang = i18n.language?.trim() || "en";
  const supabase = createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, slug")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) { navigate("/404"); return; }

  const { data: rows } = await supabase
    .from("lesson_quizzes")
    .select("id, question, options, correct_index, explanation, order_index")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });

  const englishById = new Map(
    ((rows ?? []) as Array<{
      id: string;
      question: string;
      options: unknown;
      correct_index: number;
      explanation: string | null;
      order_index: number;
    }>).map((r) => [
      r.id,
      {
        id: r.id,
        question: r.question,
        options: Array.isArray(r.options) ? (r.options as string[]) : [],
        correctIndex: r.correct_index,
        explanation: r.explanation,
        orderIndex: r.order_index,
      } satisfies ExistingQuestion,
    ]),
  );

  let localizedRows: ExistingQuestion[];
  try {
    localizedRows = (await loadLessonQuizQuestions(supabase, lessonId, quizLang)).map((r) => ({
      id: r.id,
      question: r.question,
      options: r.options,
      correctIndex: r.correctIndex,
      explanation: r.explanation,
      orderIndex: r.orderIndex,
    }));
  } catch {
    localizedRows = [...englishById.values()];
  }

  const questions = localizedRows;

  const quizIds = [...englishById.keys()];
  const txCounts = new Map<string, number>();
  if (quizIds.length > 0) {
    const { data: txRows } = await supabase
      .from("lesson_quiz_translations")
      .select("quiz_id")
      .in("quiz_id", quizIds);
    for (const row of txRows ?? []) {
      const id = (row as { quiz_id: string }).quiz_id;
      txCounts.set(id, (txCounts.get(id) ?? 0) + 1);
    }
  }

  const langLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === quizLang)?.name ?? quizLang.toUpperCase();
  const previewingTranslation = quizLang !== "en";
  const nextOrder = questions.length
    ? Math.max(...questions.map((q) => q.orderIndex)) + 1
    : 0;
  const needsTranslate = questions.some((q) => (txCounts.get(q.id) ?? 0) < 15);
  const lessonTitle = (lesson as { title: string }).title;

  async function handleRetranslateAll() {
    if (!confirm("Re-translate all questions in this lesson? This may take several minutes.")) {
      return;
    }
    const res = await retranslateLessonQuizzes(quizIds);
    if (!res.ok) {
      alert(res.error ?? "Re-translate failed.");
      return;
    }
    if (res.error) alert(res.error);
    window.location.reload();
  }

  const __jsx = (
    <div className="max-w-3xl mx-auto">
      <Link
        to="/admin/quizzes"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-purple mb-4"
      >
        <ChevronLeft className="w-3 h-3" /> All quizzes
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">{lessonTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {questions.length} question(s). English is saved on create; backend auto-translates
            to 15 languages via Google Translate.
            {previewingTranslation && (
              <span className="block mt-1 text-purple">
                Previewing member view in {langLabel}. Edit saves English.
              </span>
            )}
          </p>
        </div>
        {needsTranslate && questions.length > 0 && (
          <button
            type="button"
            onClick={() => void handleRetranslateAll()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-purple/40 text-purple text-xs font-semibold hover:bg-purple-dim transition flex-shrink-0"
          >
            <Languages className="w-3.5 h-3.5" />
            Translate all
          </button>
        )}
      </div>

      {questions.length > 0 && (
        <ul className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border mb-8">
          {questions.map((q, i) => (
            <QuestionRow
              key={q.id}
              lessonId={lessonId}
              question={q}
              editQuestion={englishById.get(q.id) ?? q}
              index={i}
              translationCount={txCounts.get(q.id) ?? 0}
            />
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-purple/30 bg-purple-dim p-5">
        <h2 className="text-sm font-display font-bold mb-4">Add a question</h2>
        <QuestionForm lessonId={lessonId} defaultOrder={nextOrder} />
      </div>
    </div>
  );
        if (!cancelled) { setContent(__jsx); setLoading(false); }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t, i18n.language, navigate, params]);

  if (loading) return <PageSkeleton />;
  return content;
}
