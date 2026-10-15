"use client";

import { Link } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";

/**
 * Admin quizzes index. Lists every lesson grouped by course with its current
 * quiz question count. Click through to /admin/quizzes/[lessonId] to add /
 * edit / delete questions. Staff-gated by the /admin layout (is_staff RPC).
 */

import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function AdminQuizzesPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  const [content, setContent] = useState<React.ReactNode>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let __jsx: React.ReactNode = null;
const supabase = createClient();

  const [{ data: coursesData }, { data: lessonsData }, { data: quizRows }] =
    await Promise.all([
      supabase.from("courses").select("id, title, slug").order("title"),
      supabase
        .from("lessons")
        .select("id, course_id, title, slug, module_order, order_index")
        .order("module_order", { ascending: true })
        .order("order_index", { ascending: true }),
      supabase.from("lesson_quizzes").select("lesson_id"),
    ]);

  const courses = (coursesData ?? []) as Array<{ id: string; title: string; slug: string }>;
  const lessons = (lessonsData ?? []) as Array<{
    id: string;
    course_id: string;
    title: string;
    slug: string;
    module_order: number;
    order_index: number;
  }>;

  const counts: Record<string, number> = {};
  for (const r of (quizRows ?? []) as Array<{ lesson_id: string }>) {
    counts[r.lesson_id] = (counts[r.lesson_id] ?? 0) + 1;
  }

  const byCourse = new Map<string, typeof lessons>();
  for (const l of lessons) {
    if (!byCourse.has(l.course_id)) byCourse.set(l.course_id, []);
    byCourse.get(l.course_id)!.push(l);
  }

  const totalQuestions = (quizRows ?? []).length;
  const lessonsWithNone = lessons.filter((l) => (counts[l.id] ?? 0) === 0).length;

  __jsx = (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Lesson quizzes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalQuestions} questions across {lessons.length} lessons.{" "}
          {lessonsWithNone > 0 && (
            <span className="text-red">{lessonsWithNone} lesson(s) have no quiz yet.</span>
          )}
        </p>
      </div>

      <div className="space-y-8">
        {courses.map((course) => {
          const courseLessons = byCourse.get(course.id) ?? [];
          if (courseLessons.length === 0) return null;
          return (
            <section key={course.id}>
              <h2 className="text-xs uppercase text-muted-foreground font-bold mb-3">
                {course.title}
              </h2>
              <ul className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
                {courseLessons.map((l) => {
                  const n = counts[l.id] ?? 0;
                  return (
                    <li key={l.id}>
                      <Link
                        to={`/admin/quizzes/${l.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-soft transition"
                      >
                        <span className="text-sm font-medium text-foreground">{l.title}</span>
                        <span
                          className={
                            "inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-full text-xs font-semibold " +
                            (n === 0
                              ? "bg-red-dim text-red"
                              : "bg-purple-dim text-purple")
                          }
                        >
                          {n} {n === 1 ? "Q" : "Qs"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
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
  }, [t, navigate]);

  if (loading) return <PageSkeleton />;
  return content;
}
