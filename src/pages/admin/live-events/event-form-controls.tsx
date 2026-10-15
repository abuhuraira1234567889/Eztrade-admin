"use client";

import * as React from "react";
import { SESSION_BANNERS } from "./session-banners";

/**
 * Visual picker for the predefined session banners. The selected banner's
 * path is stored in a hidden `banner_image_url` input so it posts with the
 * form. Admins can no longer free-type a URL.
 */
export function BannerPicker({
  defaultValue,
}: {
  defaultValue?: string | null;
}) {
  const [selected, setSelected] = React.useState<string>(
    defaultValue && SESSION_BANNERS.some((b) => b.path === defaultValue)
      ? defaultValue
      : "",
  );

  return (
    <div>
      <input type="hidden" name="banner_image_url" value={selected} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SESSION_BANNERS.map((banner) => {
          const isActive = selected === banner.path;
          return (
            <button
              key={banner.key}
              type="button"
              onClick={() => setSelected(isActive ? "" : banner.path)}
              aria-pressed={isActive}
              className={
                "group relative rounded-xl overflow-hidden border text-left transition " +
                (isActive
                  ? "border-purple ring-2 ring-purple/40"
                  : "border-border hover:border-purple/60")
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={banner.path}
                alt={banner.label}
                className="w-full block"
                style={{ aspectRatio: "16/9", objectFit: "cover" }}
              />
              <div className="px-2.5 py-1.5 flex items-center justify-between gap-2 bg-surface-soft">
                <span className="text-[11px] font-medium text-foreground truncate">
                  {banner.label}
                </span>
                {isActive && (
                  <span className="text-[9px] uppercase font-bold tracking-wider text-purple flex-shrink-0">
                    Selected
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {selected && (
        <button
          type="button"
          onClick={() => setSelected("")}
          className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Clear selection
        </button>
      )}
    </div>
  );
}

/**
 * Single cadence dropdown that drives both the display `recurrence` label and,
 * on create, the series generation (`repeat` + `occurrences`). Picking anything
 * other than "Once" reveals the occurrence count. On edit a series is never
 * regenerated, so the count is hidden and `repeat` is forced to "none" - the
 * dropdown only relabels the existing session.
 *
 * "Daily" is really "runs on the selected weekdays": the admin ticks which days
 * of the week it repeats on (default Mon–Fri, including optional Sat/Sun) and only
 * those days are generated. The chosen days post as a comma-separated
 * `days` list (0 = Sunday … 6 = Saturday).
 */
const CADENCE_OPTIONS = [
  { value: "once", label: "Once · single session", repeat: "none" },
  { value: "daily", label: "Daily · on selected weekdays", repeat: "daily" },
  { value: "weekly", label: "Weekly", repeat: "weekly" },
  { value: "monthly", label: "Monthly", repeat: "monthly" },
] as const;

// JS Date.getDay(): 0 = Sun … 6 = Sat. Mon-first, weekends last.
const WEEKDAYS = [
  { value: 1, short: "Mon" },
  { value: 2, short: "Tue" },
  { value: 3, short: "Wed" },
  { value: 4, short: "Thu" },
  { value: 5, short: "Fri" },
  { value: 6, short: "Sat" },
  { value: 0, short: "Sun" },
] as const;

const DEFAULT_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri

// Keep in sync with services/live-admin.ts MAX_OCCURRENCES.
const MAX_OCCURRENCES = 1000;

export function RecurrenceControls({
  isEdit,
  defaultRecurrence,
}: {
  isEdit?: boolean;
  defaultRecurrence?: string | null;
}) {
  const initial =
    CADENCE_OPTIONS.find((o) => o.value === defaultRecurrence)?.value ?? "once";
  const [cadence, setCadence] = React.useState<string>(initial);
  const [occurrences, setOccurrences] = React.useState<number>(12);
  const [days, setDays] = React.useState<number[]>(DEFAULT_DAYS);

  const repeat =
    CADENCE_OPTIONS.find((o) => o.value === cadence)?.repeat ?? "none";
  // A series is never regenerated on edit, so no new occurrences are ever cut.
  const effectiveRepeat = isEdit ? "none" : repeat;
  const showCount = !isEdit && effectiveRepeat !== "none";
  const showDays = !isEdit && effectiveRepeat === "daily";

  const toggleDay = (value: number) => {
    setDays((prev) =>
      prev.includes(value)
        ? prev.filter((d) => d !== value)
        : [...prev, value],
    );
  };

  const handleOccurrencesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      setOccurrences(0);
      return;
    }

    let num = parseInt(val, 10);
    if (isNaN(num)) return;

    if (num < 1) num = 1;
    if (num > MAX_OCCURRENCES) num = MAX_OCCURRENCES;
    setOccurrences(num);
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Both fields post regardless of layout; occurrences only when relevant. */}
        <input type="hidden" name="recurrence" value={cadence} />
        <input type="hidden" name="repeat" value={effectiveRepeat} />
        {/* Weekdays the daily series runs on. Ignored unless repeat = daily. */}
        <input type="hidden" name="days" value={days.join(",")} />
        <label className="block">
          <div className="eyebrow mb-1.5">Repeats</div>
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
          >
            {CADENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-muted-foreground mt-1">
            {isEdit
              ? "Changing this only relabels the session; it does not regenerate the series."
              : "Each occurrence is a separate session you can edit or delete on its own."}
          </div>
        </label>
        {showCount && (
          <label className="block">
            <div className="eyebrow mb-1.5">Number of occurrences</div>
            <input
              type="number"
              name="occurrences"
              value={occurrences || ""}
              onChange={handleOccurrencesChange}
              min={1}
              max={MAX_OCCURRENCES}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
            />
            <div className="text-[11px] text-muted-foreground mt-1">
              Total sessions to create. Max {MAX_OCCURRENCES.toLocaleString()}.
            </div>
          </label>
        )}
      </div>
      {showDays && (
        <div>
          <div className="eyebrow mb-1.5">Runs on</div>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((wd) => {
              const active = days.includes(wd.value);
              return (
                <button
                  key={wd.value}
                  type="button"
                  onClick={() => toggleDay(wd.value)}
                  aria-pressed={active}
                  className={
                    "px-3 py-1.5 rounded-md border text-xs font-medium transition " +
                    (active
                      ? "border-purple bg-purple/15 text-purple"
                      : "border-border bg-surface-soft text-muted-foreground hover:border-purple/60")
                  }
                >
                  {wd.short}
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {days.length === 0
              ? "No weekdays selected - the series will default to Monday–Friday."
              : "The series repeats every week on the highlighted days until the occurrence count is reached."}
          </div>
        </div>
      )}
    </div>
  );
}
