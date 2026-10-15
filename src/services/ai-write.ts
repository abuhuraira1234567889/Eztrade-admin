import axios from "axios";
import { api } from "@/services/api";

export type AiWriteContentType =
  | "general"
  | "announcement"
  | "live_event"
  | "trade_idea"
  | "support"
  | "email";

function parseApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string } | undefined;
    return data?.message ?? data?.error ?? err.message;
  }
  return err instanceof Error ? err.message : "Request failed.";
}

export async function enhanceWithAi(input: {
  draft: string;
  contentType?: AiWriteContentType;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const { data } = await api.post<{ ok: true; text: string } | { ok: false; error: string }>(
      "/api/admin/ai-write/enhance",
      {
        draft: input.draft,
        contentType: input.contentType ?? "general",
      },
    );
    return data;
  } catch (err) {
    return { ok: false, error: parseApiError(err) };
  }
}

/** Claude cleans a raw browser speech transcript (uses ANTHROPIC_API_KEY). */
export async function cleanupTranscript(
  transcript: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const { data } = await api.post<{ ok: true; text: string } | { ok: false; error: string }>(
      "/api/admin/ai-write/cleanup-transcript",
      { transcript },
    );
    return data;
  } catch (err) {
    return { ok: false, error: parseApiError(err) };
  }
}
