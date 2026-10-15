import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type LocalizedQuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  orderIndex: number;
};

type QuizRow = {
  id: string;
  question: string;
  options: unknown;
  correct_index: number;
  explanation: string | null;
  order_index: number;
};

type DbClient = SupabaseClient<Database>;

function toQuestion(row: QuizRow): LocalizedQuizQuestion {
  return {
    id: row.id,
    question: row.question,
    options: Array.isArray(row.options) ? (row.options as string[]) : [],
    correctIndex: row.correct_index,
    explanation: row.explanation,
    orderIndex: row.order_index,
  };
}

/** Fetch lesson quiz questions in the requested language (fallback to English). */
export async function getLocalizedLessonQuizzes(
  supabase: DbClient,
  lessonId: string,
  language: string,
): Promise<LocalizedQuizQuestion[]> {
  const { data: quizRows, error } = await supabase
    .from("lesson_quizzes")
    .select("id, question, options, correct_index, explanation, order_index")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });

  if (error) throw new Error(error.message);
  if (!quizRows?.length) return [];

  const base = (quizRows as QuizRow[]).map((r) => toQuestion(r));
  if (!language || language === "en") return base;

  const quizIds = base.map((q) => q.id);
  const { data: txRows, error: txErr } = await supabase
    .from("lesson_quiz_translations")
    .select("quiz_id, question, options, explanation")
    .in("quiz_id", quizIds)
    .eq("language", language);

  if (txErr) throw new Error(txErr.message);

  const byQuiz = new Map(
    ((txRows ?? []) as Array<{
      quiz_id: string;
      question: string;
      options: unknown;
      explanation: string | null;
    }>).map((row) => [row.quiz_id, row]),
  );

  return base.map((q) => {
    const tx = byQuiz.get(q.id);
    if (!tx) return q;
    return {
      ...q,
      question: tx.question ?? q.question,
      options: Array.isArray(tx.options) ? (tx.options as string[]) : q.options,
      explanation: tx.explanation ?? q.explanation,
    };
  });
}

/** True when lesson_quiz_translations has rows for this lesson + locale. */
export async function hasQuizTranslations(
  supabase: DbClient,
  lessonId: string,
  language: string,
): Promise<boolean> {
  const { data: quizRows } = await supabase
    .from("lesson_quizzes")
    .select("id")
    .eq("lesson_id", lessonId);
  const ids = (quizRows ?? []).map((r) => r.id);
  if (ids.length === 0) return false;

  const { count, error } = await supabase
    .from("lesson_quiz_translations")
    .select("id", { count: "exact", head: true })
    .in("quiz_id", ids)
    .eq("language", language);

  if (error) return false;
  return (count ?? 0) > 0;
}

/** Load quiz questions for a lesson in the given language (translations table). */
export async function loadLessonQuizQuestions(
  supabase: DbClient,
  lessonId: string,
  language: string,
): Promise<LocalizedQuizQuestion[]> {
  const quizLang = language?.trim() || "en";
  if (quizLang === "en" || (await hasQuizTranslations(supabase, lessonId, quizLang))) {
    return getLocalizedLessonQuizzes(supabase, lessonId, quizLang);
  }
  return getLocalizedLessonQuizzes(supabase, lessonId, "en");
}
