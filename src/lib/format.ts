/** "2026-10-06" -> "October 6, 2026". Days are UTC, so format in UTC to avoid showing the wrong day. */
export function formatDate(value: string): string {
  const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** Closing time shown in the viewer's own time zone, e.g. "5:29 AM". */
export function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'today' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ordinal(position: number): string {
  return ['first', 'second', 'third', 'fourth', 'fifth'][position - 1] ?? 'next';
}
