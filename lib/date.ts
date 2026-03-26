/**
 * Returns today's date as YYYY-MM-DD string.
 * Shared across API routes for consistent date handling.
 */
export function todayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Formats a Date object as YYYY-MM-DD string.
 */
export function formatDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}
