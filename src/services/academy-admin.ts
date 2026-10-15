import { api, getApi, postApi, patchApi, deleteApi } from "@/services/api";

export type CourseRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration_min: number | null;
  order_index: number;
  tier_min: number;
  is_published: boolean;
  created_at: string;
  lesson_count?: number;
};

/** Rich lesson body (jsonb), rendered by the member app's LessonContent.tsx. */
export type LessonContent = {
  hook?: string;
  why?: string;
  concepts?: { term: string; definition: string }[];
  snapshot?: { scene?: string; quote?: { by?: string; text?: string } };
  takeaway?: string;
  // Legacy keys (apply / coach_prompt) are preserved round-trip but not edited.
  [key: string]: unknown;
};

export type LessonRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  bunny_video_id: string | null;
  duration_sec: number | null;
  order_index: number;
  module_title: string | null;
  module_order: number;
  lesson_content: LessonContent | null;
  created_at: string;
};

export type CourseInput = {
  slug?: string;
  title?: string;
  description?: string | null;
  durationMin?: number | null;
  orderIndex?: number;
  tierMin?: number;
  isPublished?: boolean;
};

export type LessonInput = {
  slug?: string;
  title?: string;
  description?: string | null;
  moduleTitle?: string | null;
  moduleOrder?: number;
  orderIndex?: number;
  durationSec?: number | null;
  bunnyVideoId?: string | null;
};

// ── Courses ──
export function listCourses() {
  return getApi<{ courses: CourseRow[] }>("/api/admin/academy/courses");
}

export function getCourse(id: string) {
  return getApi<{ course: CourseRow; lessons: LessonRow[] }>(`/api/admin/academy/courses/${id}`);
}

export function createCourse(input: CourseInput) {
  return postApi<{ ok: boolean; id: string }>("/api/admin/academy/courses", input);
}

export function updateCourse(id: string, input: CourseInput) {
  return patchApi<{ ok: boolean }>(`/api/admin/academy/courses/${id}`, input);
}

export function deleteCourse(id: string) {
  return deleteApi<{ ok: boolean }>(`/api/admin/academy/courses/${id}`);
}

export function reorderCourses(ids: string[]) {
  return postApi<{ ok: boolean }>("/api/admin/academy/courses/reorder", { ids });
}

export async function uploadCourseThumbnail(id: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post<{ ok: boolean; url: string }>(
    `/api/admin/academy/courses/${id}/thumbnail`,
    fd,
  );
  return data;
}

// ── Lessons ──
export function createLesson(courseId: string, input: LessonInput) {
  return postApi<{ ok: boolean; id: string }>(`/api/admin/academy/courses/${courseId}/lessons`, input);
}

export function updateLesson(id: string, input: LessonInput) {
  return patchApi<{ ok: boolean }>(`/api/admin/academy/lessons/${id}`, input);
}

export function deleteLesson(id: string) {
  return deleteApi<{ ok: boolean }>(`/api/admin/academy/lessons/${id}`);
}

export function updateLessonContent(id: string, content: LessonContent | null) {
  return postApi<{ ok: boolean }>(`/api/admin/academy/lessons/${id}/content`, { content });
}

export function reorderLessons(items: { id: string; moduleOrder?: number; orderIndex: number }[]) {
  return postApi<{ ok: boolean }>("/api/admin/academy/lessons/reorder", { items });
}

// ── Video ──
export function bunnyStatus() {
  return getApi<{ configured: boolean }>("/api/admin/academy/bunny-status");
}

export async function uploadLessonVideo(
  lessonId: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<{ ok: boolean; videoId: string }> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("title", file.name);
  const { data } = await api.post<{ ok: boolean; videoId: string }>(
    `/api/admin/academy/lessons/${lessonId}/video`,
    fd,
    {
      // Large uploads: no client timeout, and report progress to the UI.
      timeout: 0,
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(e.loaded / e.total);
      },
    },
  );
  return data;
}

export function removeLessonVideo(lessonId: string) {
  return postApi<{ ok: boolean }>(`/api/admin/academy/lessons/${lessonId}/video/remove`);
}

// ── Translations (Google Translate → *_translations; slow, no client timeout) ──
export async function translateCourse(id: string) {
  const { data } = await api.post<{ ok: boolean; translated: number; errors: string[] }>(
    `/api/admin/academy/courses/${id}/translate`,
    {},
    { timeout: 0 },
  );
  return data;
}

export async function translateLesson(id: string) {
  const { data } = await api.post<{ ok: boolean; translated: number; errors: string[] }>(
    `/api/admin/academy/lessons/${id}/translate`,
    {},
    { timeout: 0 },
  );
  return data;
}
