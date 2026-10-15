"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Check, X, Trash2, BookOpen, Eye, EyeOff, PencilLine } from "lucide-react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import {
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  type CourseRow,
} from "@/services/academy-admin";

const inputCls =
  "w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm outline-none focus:border-purple";

export default function AcademyAdminPage() {
  const [courses, setCourses] = useState<CourseRow[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", description: "" });

  async function load() {
    try {
      const { courses } = await listCourses();
      setCourses(courses);
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Couldn't load courses.");
      setCourses([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createNew() {
    if (!draft.title.trim()) {
      toast.error("Course title is required.");
      return;
    }
    setCreating(true);
    try {
      await createCourse({ title: draft.title.trim(), description: draft.description.trim() || null });
      toast.success("Course created. Open it to add lessons.");
      setAdding(false);
      setDraft({ title: "", description: "" });
      await load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Couldn't create the course.");
    } finally {
      setCreating(false);
    }
  }

  async function togglePublish(c: CourseRow) {
    setBusyId(c.id);
    try {
      await updateCourse(c.id, { isPublished: !c.is_published });
      await load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Couldn't update.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(c: CourseRow) {
    if (!window.confirm(`Delete "${c.title}" and all its lessons? This also removes their videos from Bunny.`)) {
      return;
    }
    setBusyId(c.id);
    try {
      await deleteCourse(c.id);
      toast.success("Course deleted.");
      await load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Couldn't delete.");
    } finally {
      setBusyId(null);
    }
  }

  if (!courses) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Academy</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Courses and lessons members see in the Academy. Open a course to manage its lessons and
            upload videos. A course stays hidden from members until you publish it.
          </p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple/90 transition"
        >
          <Plus className="w-4 h-4" /> New course
        </button>
      </div>

      {adding && (
        <div className="rounded-xl border border-purple/30 bg-surface p-4 space-y-3">
          <h2 className="text-sm font-semibold">New course</h2>
          <label className="block text-xs text-muted-foreground">
            Title
            <input
              className={inputCls + " mt-1"}
              value={draft.title}
              onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Forex Foundations"
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            Description
            <textarea
              className={inputCls + " mt-1 min-h-[60px]"}
              value={draft.description}
              onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={createNew}
              disabled={creating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple/90 transition disabled:opacity-60"
            >
              <Check className="w-4 h-4" /> {creating ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-surface-soft transition"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {courses.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-surface overflow-hidden flex flex-col">
            <div className="aspect-[16/9] bg-surface-soft overflow-hidden">
              <CourseThumb thumbnailUrl={c.thumbnail_url} slug={c.slug} title={c.title} />
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="font-display font-bold leading-tight">{c.title}</div>
                <span
                  className={
                    "inline-flex flex-none items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold " +
                    (c.is_published
                      ? "bg-emerald-500/15 text-emerald-600"
                      : "bg-muted-foreground/15 text-muted-foreground")
                  }
                >
                  {c.is_published ? "Published" : "Draft"}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                <code>{c.slug}</code> · {c.lesson_count ?? 0} lesson{(c.lesson_count ?? 0) === 1 ? "" : "s"}
              </div>
              {c.description && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{c.description}</p>
              )}
              <div className="mt-auto pt-3 flex items-center gap-1.5">
                <Link
                  to={`/admin/academy/${c.id}`}
                  className="inline-flex items-center gap-1 rounded-md bg-purple px-2.5 py-1 text-xs font-semibold text-white hover:bg-purple/90 transition"
                >
                  <PencilLine className="w-3 h-3" /> Manage
                </Link>
                <button
                  onClick={() => togglePublish(c)}
                  disabled={busyId === c.id}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-soft transition disabled:opacity-50"
                >
                  {c.is_published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {c.is_published ? "Unpublish" : "Publish"}
                </button>
                <button
                  onClick={() => remove(c)}
                  disabled={busyId === c.id}
                  className="ml-auto inline-flex items-center gap-1 rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 transition disabled:opacity-50"
                  title="Delete course"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted-foreground">
          No courses yet. Click <span className="font-medium text-foreground">New course</span> to create the first one.
        </div>
      )}
    </div>
  );
}

// Base origin for bundled course artwork (member app serves /course-thumbnails/*).
const ASSET_BASE = (
  (import.meta.env.VITE_STATIC_ASSET_CDN_URL as string | undefined) ??
  (import.meta.env.VITE_PLATFORM_URL as string | undefined) ??
  ""
)
  .toString()
  .trim()
  .replace(/\/+$/, "");

/** Make a possibly-relative artwork path absolute against the member origin. */
function absolutize(u: string | null | undefined): string {
  if (!u) return "";
  if (/^(?:https?:|data:|blob:)/i.test(u)) return u;
  return ASSET_BASE ? `${ASSET_BASE}/${u.replace(/^\/+/, "")}` : "";
}

/**
 * Course thumbnail: the stored thumbnail, then the bundled
 * /course-thumbnails/<slug> default (webp then png), then a book icon.
 */
function CourseThumb({ thumbnailUrl, slug, title }: { thumbnailUrl: string | null; slug: string; title: string }) {
  const candidates = [
    absolutize(thumbnailUrl),
    absolutize(`/course-thumbnails/${slug}.webp`),
    absolutize(`/course-thumbnails/${slug}.png`),
  ].filter(Boolean);
  const [idx, setIdx] = useState(0);
  const src = candidates[idx];
  if (!src) {
    return (
      <div className="grid h-full w-full place-items-center text-muted-foreground">
        <BookOpen className="w-7 h-7" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={title}
      loading="lazy"
      className="h-full w-full object-cover"
      onError={() => setIdx((i) => i + 1)}
    />
  );
}
