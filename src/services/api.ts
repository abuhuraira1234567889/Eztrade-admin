import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { forceAuthSignOut } from "@/lib/auth-session";
import { supabase } from "@/lib/supabase/client";

/**
 * API client for NestJS backend.
 * In dev: leave VITE_API_URL empty - requests use relative /api paths via Vite proxy.
 * In prod: set VITE_API_URL=https://api.your-domain.com
 */
// http://api.eztrade.io redirects to HTTPS; browsers turn that redirect into GET and
// quiz create returns "lesson_id query param is required". Always use https in production.
function resolveApiBaseUrl(): string {
  let url = (import.meta.env.VITE_API_URL ?? "").trim();
  if (url.startsWith("http://api.eztrade.io")) {
    url = url.replace("http://", "https://");
  }
  return url.replace(/\/$/, "");
}

const baseURL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  // Quiz create/update runs Google Translate for ~15 languages (can take 30–60s).
  timeout: 120_000,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  let {
    data: { session },
  } = await supabase.auth.getSession();

  const expiresAtMs = (session?.expires_at ?? 0) * 1000;
  if (session?.access_token && expiresAtMs > 0 && expiresAtMs < Date.now() + 60_000) {
    const refreshed = await supabase.auth.refreshSession();
    session = refreshed.data.session ?? session;
  }

  if (!session?.access_token) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const retry = await supabase.auth.getSession();
      session = retry.data.session ?? session;
      if (!session?.access_token) {
        void forceAuthSignOut();
        return new Promise(() => {});
      }
    }
  }

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const { data, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && data.session?.access_token) {
        original.headers.Authorization = `Bearer ${data.session.access_token}`;
        return api(original);
      }
      void forceAuthSignOut();
      return new Promise(() => {});
    }
    // Axios's default message is the useless "Request failed with status code N".
    // Replace it with the backend's real detail (NestJS returns { message } on
    // HttpException) so error banners show WHY, not just the status.
    const body = error.response?.data as { message?: string | string[] } | undefined;
    const detail = Array.isArray(body?.message) ? body?.message.join(", ") : body?.message;
    if (detail) error.message = detail;
    return Promise.reject(error);
  },
);

export async function postApi<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await api.post<T>(path, body);
  return data;
}

export async function getApi<T>(path: string, params?: Record<string, string>): Promise<T> {
  const { data } = await api.get<T>(path, { params });
  return data;
}

export async function patchApi<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await api.patch<T>(path, body);
  return data;
}

export async function deleteApi<T>(path: string): Promise<T> {
  const { data } = await api.delete<T>(path);
  return data;
}

export * from "@/services/action-stubs";
