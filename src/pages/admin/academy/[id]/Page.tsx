"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Upload,
  Trash2,
  Plus,
  Check,
  X,
  Film,
  CircleCheck,
  AlertTriangle,
  FileText,
  Languages,
} from "lucide-react";
import { LessonContentEditor } from "./LessonContentEditor";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import {
  getCourse,
  updateCourse,
  uploadCourseThumbnail,
  createLesson,
  updateLesson,
  deleteLesson,
  uploadLessonVideo,
  removeLessonVideo,
  bunnyStatus,
  translateCourse,
  type CourseRow,
  type LessonRow,
} from "@/services/academy-admin";

const inputCls =
  "w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm outline-none focus:border-purple";
const numCls =
  "w-full px-2.5 py-1.5 text-right tabular-nums rounded-md border border-border bg-background text-sm outline-none focus:border-purple";

type CourseDraft = {
  title: string;
  slug: string;
  description: string;
  duration_min: string;
  tier_min: string;
  order_index: string;
  is_published: boolean;
};

type LessonDraft = {
  title: string;
  slug: string;
  description: string;
  module_title: string;
  module_order: string;
  order_index: string;
  duration_sec: string;
};

function courseDraft(c: CourseRow): CourseDraft {
  return {
    title: c.title,
    slug: c.slug,
    description: c.description ?? "",
    duration_min: c.duration_min == null ? "" : String(c.duration_min),
    tier_min: String(c.tier_min ?? 1),
    order_index: String(c.order_index ?? 0),
    is_published: c.is_published,
  };
}

function lessonDraft(l: LessonRow): LessonDraft {
  return {
    title: l.title,
    slug: l.slug,
    description: l.description ?? "",
    module_title: l.module_title ?? "",
    module_order: String(l.module_order ?? 1),
    order_index: String(l.order_index ?? 0),
    duration_sec: l.duration_sec == null ? "" : String(l.duration_sec),
  };
}

export default function AcademyCourseEditorPage() {
  const params = useParams() as Record<string, string>;
  const courseId = params.id;
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseRow | null>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [cDraft, setCDraft] = useState<CourseDraft | null>(null);
  const [lDrafts, setLDrafts] = useState<Record<string, LessonDraft>>({});
  const [bunnyOk, setBunnyOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCourse, setSavingCourse] = useState(false);
  const [thumbBusy, setThumbBusy] = useState(false);
  const [savingLesson, setSavingLesson] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({});
  const [addingLesson, setAddingLesson] = useState(false);
  const [newLesson, setNewLesson] = useState({ title: "", module_title: "", module_order: "1" });
  const [openContent, setOpenContent] = useState<Set<string>>(new Set());
  const [translating, setTranslating] = useState(false);

  const thumbInput = useRef<HTMLInputElement | null>(null);
  const videoInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    try {
      const { course, lessons } = await getCourse(courseId);
      setCourse(course);
      setLessons(lessons);
      setCDraft(courseDraft(course));
      setLDrafts(Object.fromEntries(lessons.map((l) => [l.id, lessonDraft(l)])));
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Couldn't load the course.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    void bunnyStatus()
      .then((s) => setBunnyOk(s.configured))
      .catch(() => setBunnyOk(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const setLDraft = (id: string, patch: Partial<LessonDraft>) =>
    setLDrafts((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const toggleContent = (id: string) =>
    setOpenContent((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function saveCourse() {
    if (!cDraft) return;
    if (!cDraft.title.trim()) {
      toast.error("Title can't be empty.");
      return;
    }
    setSavingCourse(true);
    try {
      await updateCourse(courseId, {
        title: cDraft.title.trim(),
        slug: cDraft.slug.trim() || undefined,
        description: cDraft.description.trim() || null,
        durationMin: cDraft.duration_min === "" ? null : Number(cDraft.duration_min),
        tierMin: Number(cDraft.tier_min) || 1,
        orderIndex: Number(cDraft.order_index) || 0,
        isPublished: cDraft.is_published,
      });
      toast.success("Course saved.");
      await load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Couldn't save the course.");
    } finally {
      setSavingCourse(false);
    }
  }

  async function runTranslate() {
    if (!window.confirm("Translate this course and all its lessons into every supported language? This can take a minute.")) {
      return;
    }
    setTranslating(true);
    try {
      const res = await translateCourse(courseId);
      if (res.ok) toast.success(`Translated ${res.translated} row(s) across all languages.`);
      else toast.warning(`Translated ${res.translated}, with ${res.errors.length} issue(s): ${res.errors[0] ?? ""}`);
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Translation failed (Google Translate not configured?).");
    } finally {
      setTranslating(false);
    }
  }

  async function onThumb(file: File | undefined) {
    if (!file) return;
    setThumbBusy(true);
    try {
      await uploadCourseThumbnail(courseId, file);
      toast.success("Thumbnail updated.");
      await load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Couldn't upload the thumbnail.");
    } finally {
      setThumbBusy(false);
    }
  }

  async function addLesson() {
    if (!newLesson.title.trim()) {
      toast.error("Lesson title is required.");
      return;
    }
    try {
      await createLesson(courseId, {
        title: newLesson.title.trim(),
        moduleTitle: newLesson.module_title.trim() || null,
        moduleOrder: Number(newLesson.module_order) || 1,
        orderIndex: (lessons.length + 1) * 10,
      });
      toast.success("Lesson added.");
      setAddingLesson(false);
      setNewLesson({ title: "", module_title: "", module_order: "1" });
      await load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Couldn't add the lesson.");
    }
  }

  async function saveLesson(id: string) {
    const d = lDrafts[id];
    if (!d.title.trim()) {
      toast.error("Lesson title can't be empty.");
      return;
    }
    setSavingLesson(id);
    try {
      await updateLesson(id, {
        title: d.title.trim(),
        slug: d.slug.trim() || undefined,
        description: d.description.trim() || null,
        moduleTitle: d.module_title.trim() || null,
        moduleOrder: Number(d.module_order) || 1,
        orderIndex: Number(d.order_index) || 0,
        durationSec: d.duration_sec === "" ? null : Number(d.duration_sec),
      });
      toast.success("Lesson saved.");
      await load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Couldn't save the lesson.");
    } finally {
      setSavingLesson(null);
    }
  }

  async function removeLesson(l: LessonRow) {
    if (!window.confirm(`Delete lesson "${l.title}"? Its video is removed from Bunny too.`)) return;
    setSavingLesson(l.id);
    try {
      await deleteLesson(l.id);
      toast.success("Lesson deleted.");
      await load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Couldn't delete the lesson.");
    } finally {
      setSavingLesson(null);
    }
  }

  async function onVideo(lessonId: string, file: File | undefined) {
    if (!file) return;
    setVideoProgress((p) => ({ ...p, [lessonId]: 0 }));
    try {
      await uploadLessonVideo(lessonId, file, (f) =>
        setVideoProgress((p) => ({ ...p, [lessonId]: f })),
      );
      toast.success("Video uploaded. Bunny will transcode it shortly.");
      await load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Video upload failed.");
    } finally {
      setVideoProgress((p) => {
        const next = { ...p };
        delete next[lessonId];
        return next;
      });
    }
  }

  async function dropVideo(lessonId: string) {
    if (!window.confirm("Remove this lesson's video?")) return;
    try {
      await removeLessonVideo(lessonId);
      toast.success("Video removed.");
      await load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Couldn't remove the video.");
    }
  }

  // Lessons grouped by module for display.
  const grouped = useMemo(() => {
    const map = new Map<string, LessonRow[]>();
    for (const l of lessons) {
      const key = `${l.module_order}|${l.module_title ?? ""}`;
      (map.get(key) ?? map.set(key, []).get(key)!).push(l);
    }
    return [...map.entries()].sort((a, b) => {
      const ao = Number(a[0].split("|")[0]);
      const bo = Number(b[0].split("|")[0]);
      return ao - bo;
    });
  }, [lessons]);

  if (loading || !course || !cDraft) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate("/admin/academy")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" /> All courses
        </button>
      </div>

      {bunnyOk === false && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-none" />
          <span>
            Bunny Stream isn't configured (<code className="text-xs">BUNNY_STREAM_LIBRARY_ID</code> /{" "}
            <code className="text-xs">BUNNY_STREAM_API_KEY</code> on the backend). You can still edit
            courses and lessons, but video upload is disabled until those are set.
          </span>
        </div>
      )}

      {/* Course settings */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 className="text-xl font-display font-bold">Course settings</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={runTranslate}
              disabled={translating}
              title="Generate every supported-language translation for this course + its lessons"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-surface-soft transition disabled:opacity-60"
            >
              <Languages className="w-4 h-4" /> {translating ? "Translating…" : "Translate all"}
            </button>
            <button
              onClick={saveCourse}
              disabled={savingCourse}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple/90 transition disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> {savingCourse ? "Saving…" : "Save course"}
            </button>
          </div>
        </div>
        <div className="flex gap-4 flex-col lg:flex-row">
          <div className="flex-none">
            <div className="aspect-[16/9] w-48 overflow-hidden rounded-lg border border-border bg-surface-soft">
              <CourseThumb thumbnailUrl={course.thumbnail_url} slug={course.slug} title={course.title} />
            </div>
            <input
              ref={thumbInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => onThumb(e.target.files?.[0])}
            />
            <button
              onClick={() => thumbInput.current?.click()}
              disabled={thumbBusy}
              className="mt-2 inline-flex w-48 items-center justify-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-soft transition disabled:opacity-60"
            >
              <Upload className="w-3 h-3" /> {thumbBusy ? "Uploading…" : "Thumbnail"}
            </button>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground sm:col-span-2">
              Title
              <input
                className={inputCls + " mt-1"}
                value={cDraft.title}
                onChange={(e) => setCDraft({ ...cDraft, title: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Slug
              <input
                className={inputCls + " mt-1"}
                value={cDraft.slug}
                onChange={(e) => setCDraft({ ...cDraft, slug: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Duration (min)
              <input
                type="number"
                className={numCls + " mt-1"}
                value={cDraft.duration_min}
                onChange={(e) => setCDraft({ ...cDraft, duration_min: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground sm:col-span-2">
              Description
              <textarea
                className={inputCls + " mt-1 min-h-[60px]"}
                value={cDraft.description}
                onChange={(e) => setCDraft({ ...cDraft, description: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Min rank (tier)
              <input
                type="number"
                min="1"
                max="7"
                className={numCls + " mt-1"}
                value={cDraft.tier_min}
                onChange={(e) => setCDraft({ ...cDraft, tier_min: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Sort order
              <input
                type="number"
                className={numCls + " mt-1"}
                value={cDraft.order_index}
                onChange={(e) => setCDraft({ ...cDraft, order_index: e.target.value })}
              />
            </label>
            <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer sm:col-span-2 mt-1">
              <input
                type="checkbox"
                checked={cDraft.is_published}
                onChange={(e) => setCDraft({ ...cDraft, is_published: e.target.checked })}
                className="accent-purple"
              />
              Published (visible to members)
            </label>
          </div>
        </div>
      </div>

      {/* Lessons */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-display font-bold">Lessons ({lessons.length})</h2>
          <button
            onClick={() => setAddingLesson((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple/90 transition"
          >
            <Plus className="w-4 h-4" /> Add lesson
          </button>
        </div>

        {addingLesson && (
          <div className="rounded-lg border border-purple/30 bg-background p-3 mb-4 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <label className="text-xs text-muted-foreground sm:col-span-2">
              Title
              <input
                className={inputCls + " mt-1"}
                value={newLesson.title}
                onChange={(e) => setNewLesson((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. What is a pip?"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Module
              <input
                className={inputCls + " mt-1"}
                value={newLesson.module_title}
                onChange={(e) => setNewLesson((p) => ({ ...p, module_title: e.target.value }))}
                placeholder="Module 1"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Module #
              <input
                type="number"
                className={numCls + " mt-1"}
                value={newLesson.module_order}
                onChange={(e) => setNewLesson((p) => ({ ...p, module_order: e.target.value }))}
              />
            </label>
            <div className="sm:col-span-4 flex gap-2">
              <button
                onClick={addLesson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple/90 transition"
              >
                <Check className="w-4 h-4" /> Add
              </button>
              <button
                onClick={() => setAddingLesson(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-surface-soft transition"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        )}

        {lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No lessons yet. Add one above.
          </p>
        ) : (
          <div className="space-y-5">
            {grouped.map(([key, rows]) => {
              const moduleTitle = key.split("|").slice(1).join("|");
              return (
                <div key={key}>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold mb-2">
                    {moduleTitle || "Ungrouped"} · module {key.split("|")[0]}
                  </div>
                  <div className="space-y-3">
                    {rows.map((l) => {
                      const d = lDrafts[l.id] ?? lessonDraft(l);
                      const prog = videoProgress[l.id];
                      const uploading = prog !== undefined;
                      return (
                        <div key={l.id} className="rounded-lg border border-border bg-background p-3">
                          <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                            <label className="text-[11px] text-muted-foreground sm:col-span-3">
                              Title
                              <input
                                className={inputCls + " mt-0.5"}
                                value={d.title}
                                onChange={(e) => setLDraft(l.id, { title: e.target.value })}
                              />
                            </label>
                            <label className="text-[11px] text-muted-foreground sm:col-span-2">
                              Slug
                              <input
                                className={inputCls + " mt-0.5"}
                                value={d.slug}
                                onChange={(e) => setLDraft(l.id, { slug: e.target.value })}
                              />
                            </label>
                            <label className="text-[11px] text-muted-foreground">
                              Order
                              <input
                                type="number"
                                className={numCls + " mt-0.5"}
                                value={d.order_index}
                                onChange={(e) => setLDraft(l.id, { order_index: e.target.value })}
                              />
                            </label>
                            <label className="text-[11px] text-muted-foreground sm:col-span-3">
                              Module title
                              <input
                                className={inputCls + " mt-0.5"}
                                value={d.module_title}
                                onChange={(e) => setLDraft(l.id, { module_title: e.target.value })}
                              />
                            </label>
                            <label className="text-[11px] text-muted-foreground">
                              Module #
                              <input
                                type="number"
                                className={numCls + " mt-0.5"}
                                value={d.module_order}
                                onChange={(e) => setLDraft(l.id, { module_order: e.target.value })}
                              />
                            </label>
                            <label className="text-[11px] text-muted-foreground">
                              Duration (sec)
                              <input
                                type="number"
                                className={numCls + " mt-0.5"}
                                value={d.duration_sec}
                                onChange={(e) => setLDraft(l.id, { duration_sec: e.target.value })}
                              />
                            </label>
                            <label className="text-[11px] text-muted-foreground sm:col-span-6">
                              Description
                              <input
                                className={inputCls + " mt-0.5"}
                                value={d.description}
                                onChange={(e) => setLDraft(l.id, { description: e.target.value })}
                              />
                            </label>
                          </div>

                          {/* Video + actions */}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span
                              className={
                                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium " +
                                (l.bunny_video_id
                                  ? "bg-emerald-500/15 text-emerald-600"
                                  : "bg-muted-foreground/15 text-muted-foreground")
                              }
                            >
                              {l.bunny_video_id ? <CircleCheck className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                              {l.bunny_video_id ? "Video attached" : "No video"}
                            </span>

                            <input
                              ref={(el) => {
                                videoInputs.current[l.id] = el;
                              }}
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => onVideo(l.id, e.target.files?.[0])}
                            />
                            <button
                              onClick={() => videoInputs.current[l.id]?.click()}
                              disabled={uploading || bunnyOk === false}
                              title={bunnyOk === false ? "Bunny Stream not configured" : undefined}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-surface-soft transition disabled:opacity-50"
                            >
                              <Upload className="w-3 h-3" />
                              {uploading ? `Uploading ${Math.round((prog ?? 0) * 100)}%` : l.bunny_video_id ? "Replace video" : "Upload video"}
                            </button>
                            {l.bunny_video_id && !uploading && (
                              <button
                                onClick={() => dropVideo(l.id)}
                                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-surface-soft transition"
                              >
                                Remove video
                              </button>
                            )}

                            <button
                              onClick={() => toggleContent(l.id)}
                              className={
                                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition " +
                                (openContent.has(l.id)
                                  ? "border-purple/50 bg-purple-dim text-purple"
                                  : "border-border hover:bg-surface-soft")
                              }
                            >
                              <FileText className="w-3 h-3" /> Body
                            </button>

                            <div className="ml-auto flex items-center gap-1.5">
                              <button
                                onClick={() => saveLesson(l.id)}
                                disabled={savingLesson === l.id}
                                className="inline-flex items-center gap-1 rounded-md bg-purple px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-purple/90 transition disabled:opacity-50"
                              >
                                <Save className="w-3 h-3" /> {savingLesson === l.id ? "…" : "Save"}
                              </button>
                              <button
                                onClick={() => removeLesson(l)}
                                disabled={savingLesson === l.id}
                                className="inline-flex items-center gap-1 rounded-md border border-red-500/40 px-2 py-1 text-[11px] text-red-600 hover:bg-red-500/10 transition disabled:opacity-50"
                                title="Delete lesson"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {uploading && (
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
                              <div
                                className="h-full bg-purple transition-all"
                                style={{ width: `${Math.round((prog ?? 0) * 100)}%` }}
                              />
                            </div>
                          )}

                          {openContent.has(l.id) && (
                            <LessonContentEditor lesson={l} onSaved={() => void load()} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <Link to="/admin/academy" className="text-sm text-purple font-medium hover:underline">
          ← Back to all courses
        </Link>
      </div>
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

function absolutize(u: string | null | undefined): string {
  if (!u) return "";
  if (/^(?:https?:|data:|blob:)/i.test(u)) return u;
  return ASSET_BASE ? `${ASSET_BASE}/${u.replace(/^\/+/, "")}` : "";
}

function CourseThumb({ thumbnailUrl, slug, title }: { thumbnailUrl: string | null; slug: string; title: string }) {
  const candidates = [
    absolutize(thumbnailUrl),
    absolutize(`/course-thumbnails/${slug}.webp`),
    absolutize(`/course-thumbnails/${slug}.png`),
  ].filter(Boolean);
  const [idx, setIdx] = useState(0);
  const src = candidates[idx];
  if (!src) {
    return <div className="grid h-full w-full place-items-center text-muted-foreground text-xs">No image</div>;
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
