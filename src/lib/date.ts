const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toDateParam(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidDateParam(value: string): boolean {
  if (!DATE_PARAM_PATTERN.test(value)) return false;
  const date = parseDateParam(value);
  return !Number.isNaN(date.getTime());
}

// Interprets the YYYY-MM-DD param as UTC midnight. The plain date input carries
// no timezone info, and the server's OS timezone can't be relied on (it differs
// between local dev and most hosting platforms), so UTC is the only interpretation
// that's deterministic across environments.
export function parseDateParam(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

// The shadcn Calendar (react-day-picker) works with Date objects in the
// browser's local time zone, not UTC — these two helpers keep the client-side
// picker's round-trip (string -> Date -> string) in that same local frame,
// separately from the UTC frame the server uses for DB day boundaries.
export function toLocalDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateParam(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
