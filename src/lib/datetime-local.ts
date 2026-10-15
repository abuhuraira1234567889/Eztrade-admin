/**
 * HTML `datetime-local` values look like `2026-06-12T14:44` with no timezone.
 * They must be converted in the browser (admin's local zone) before sending to
 * the API - otherwise a UTC server interprets the same string as UTC wall time.
 */

export function datetimeLocalToIso(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (hasTimezoneOffset(trimmed)) return trimmed;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return trimmed;
  return d.toISOString();
}

export function isoToDatetimeLocal(iso: string | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function hasTimezoneOffset(value: string): boolean {
  return /[zZ]$|[+-]\d{2}:\d{2}$/.test(value);
}
