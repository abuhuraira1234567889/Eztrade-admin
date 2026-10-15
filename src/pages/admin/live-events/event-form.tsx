"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteLiveEvent, upsertLiveEvent } from "@/services/action-stubs";
import { isoToDatetimeLocal } from "@/lib/datetime-local";
import { BannerPicker, RecurrenceControls } from "./event-form-controls";

type EventRow = {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  topic: string | null;
  host_name: string | null;
  starts_at: string;
  ends_at: string;
  transcript_url: string | null;
  recording_url: string | null;
  banner_image_url: string | null;
  language: string;
  tier_min: number;
  recurrence: string;
  is_published: boolean;
  stream_join_link?: string | null;
  stream_host_join_link?: string | null;
  delivery_mode?: string | null;
  zoom_join_url?: string | null;
};

function toLocalInput(iso: string | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({ event }: { event?: EventRow }) {
  const isEdit = !!event;
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const now = toLocalInput(new Date().toISOString());

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);

    // Ensure transcript URL has a protocol if it looks like a domain
    const transcriptUrl = formData.get("transcript_url") as string;
    if (transcriptUrl && !/^https?:\/\//i.test(transcriptUrl)) {
      formData.set("transcript_url", `https://${transcriptUrl}`);
    }

    // Ensure recording URL has a protocol if it looks like a domain
    const recordingUrl = formData.get("recording_url") as string;
    if (recordingUrl && !/^https?:\/\//i.test(recordingUrl)) {
      formData.set("recording_url", `https://${recordingUrl}`);
    }

    const res = await upsertLiveEvent(formData);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Could not save session.");
      return;
    }
    navigate("/admin/live-events");
  }

  async function handleDelete(formData: FormData) {
    setError(null);
    setPending(true);
    const res = await deleteLiveEvent(formData);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Could not delete session.");
      return;
    }
    navigate("/admin/live-events");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
      <Link
        to="/admin/live-events"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-purple mb-3"
      >
        ← All sessions
      </Link>
      <h1 className="text-2xl font-display font-bold mb-1">
        {isEdit ? "Edit session" : "New session"}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Members see this on /live as soon as you check "Published".
      </p>

      {error && (
        <div className="rounded-md border border-red/30 bg-red/10 px-3 py-2 text-sm text-red">
          {error}
        </div>
      )}

      <form
        key={event?.id ?? "new"}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(new FormData(e.currentTarget));
        }}
        className="space-y-5"
      >
        {isEdit && <input type="hidden" name="id" value={event!.id} />}

        <Field label="Title" required>
          <input
            type="text"
            name="title"
            defaultValue={event?.title ?? ""}
            required
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
          />
        </Field>

        <Field label="Topic" hint="Short category, e.g. Forex · Indices">
          <input
            type="text"
            name="topic"
            defaultValue={event?.topic ?? ""}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
          />
        </Field>

        <Field label="Host name" hint="Shown to members as the presenter">
          <input
            type="text"
            name="host_name"
            defaultValue={event?.host_name ?? ""}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
          />
        </Field>

        <Field
          label="Description"
          hint="Markdown not supported. Plain text only."
        >
          <textarea
            name="description"
            defaultValue={event?.description ?? ""}
            rows={4}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
          />
        </Field>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Starts at" required>
            <input
              type="datetime-local"
              name="starts_at"
              defaultValue={toLocalInput(event?.starts_at)}
              min={isEdit ? undefined : now}
              required
              className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
            />
          </Field>
          <Field label="Ends at" required>
            <input
              type="datetime-local"
              name="ends_at"
              defaultValue={toLocalInput(event?.ends_at)}
              min={isEdit ? undefined : now}
              required
              className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
            />
          </Field>
        </div>

        <Field label="Transcript URL" hint="Optional external transcript link">
          <input
            type="text"
            name="transcript_url"
            defaultValue={event?.transcript_url ?? ""}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
          />
        </Field>

        <Field
          label="Recording URL"
          hint="Optional link to the recording of the call. Shown to members after the session."
        >
          <input
            type="text"
            name="recording_url"
            defaultValue={event?.recording_url ?? ""}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
          />
        </Field>

        <Field
          label="Session image"
          hint="Pick a banner. Shown on /live and the event page. Optional."
        >
          <BannerPicker defaultValue={event?.banner_image_url} />
        </Field>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Min rank">
            <select
              name="tier_min"
              defaultValue={String(event?.tier_min ?? 1)}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
            >
              <option value="0">0 · Unverified</option>
              <option value="1">1 · Beginner</option>
              <option value="2">2 · Starter</option>
              <option value="3">3 · Bronze</option>
              <option value="4">4 · Silver</option>
              <option value="5">5 · Gold</option>
              <option value="6">6 · Platinum</option>
              <option value="7">7 · VIP</option>
            </select>
          </Field>
          <Field label="Language">
            <input
              type="text"
              name="language"
              defaultValue={event?.language ?? "en"}
              maxLength={10}
              onChange={(e) => {
                // allow only alphabets (a–z, A–Z)
                e.target.value = e.target.value.replace(/[^a-zA-Z]/g, "");
              }}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
            />
          </Field>
        </div>

        <div className="rounded-xl border border-border bg-surface-soft/50 p-4">
          <div className="text-sm font-display font-bold mb-1">Recurrence</div>
          <p className="text-[11px] text-muted-foreground mb-3">
            {isEdit
              ? "How this session is labelled to members."
              : "Spin up a whole series at once. Daily runs on the days you pick below (default Mon–Fri). Each occurrence is created as its own event."}
          </p>
          <RecurrenceControls isEdit={isEdit} defaultRecurrence={event?.recurrence} />
        </div>

        <Field
          label="Slug"
          hint="URL path under /live/. Leave blank to auto-generate from title + date."
        >
          <input
            type="text"
            name="slug"
            defaultValue={event?.slug ?? ""}
            placeholder="auto-generated"
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
          />
        </Field>

        <div className="rounded-xl border border-border bg-surface-soft/50 p-4 space-y-4">
          <div>
            <div className="text-sm font-display font-bold mb-1">How members join</div>
            <p className="text-[11px] text-muted-foreground">
              Members join through Zoom. Paste the meeting link below - their
              &ldquo;Join Zoom&rdquo; button opens this URL.
            </p>
          </div>
          <Field
            label="Zoom link"
            hint="The Zoom meeting URL members open to join this session."
          >
            <input
              type="url"
              name="zoom_join_url"
              defaultValue={event?.zoom_join_url ?? ""}
              placeholder="https://zoom.us/j/..."
              className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
            />
          </Field>
        </div>

        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={event?.is_published ?? false}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">
            Published (visible to members)
          </span>
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple/90 transition disabled:opacity-60"
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create session"}
          </button>
          <Link
            to="/admin/live-events"
            className="text-xs text-muted-foreground hover:text-foreground uppercase tracking-wider"
          >
            Cancel
          </Link>
        </div>
      </form>

      {isEdit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleDelete(new FormData(e.currentTarget));
          }}
          className="mt-10 pt-6 border-t border-border"
        >
          <input type="hidden" name="id" value={event!.id} />
          <h3 className="text-sm font-display font-bold text-red mb-2">
            Danger zone
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Deleting cancels any RSVPs for this session. There's no undo.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="text-xs text-red hover:underline uppercase tracking-wider disabled:opacity-60"
          >
            {pending ? "Deleting…" : "Delete this session"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="eyebrow mb-1.5">
        {label}
        {required && <span className="text-red ml-1">*</span>}
      </div>
      {children}
      {hint && (
        <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>
      )}
    </label>
  );
}
