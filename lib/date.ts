/**
 * Returns today's date as YYYY-MM-DD string.
 * Shared across API routes for consistent date handling.
 */
export function todayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Formats a Date object as YYYY-MM-DD string (for API/data use).
 */
export function formatDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Formats a date for display using the user's locale.
 * Use this for all user-facing date strings.
 */
export function formatDisplayDate(
  date: string | Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(d);
}
