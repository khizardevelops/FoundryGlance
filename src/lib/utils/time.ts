const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/** "3 hours ago" / "yesterday", in the user's locale. */
export function relativeTime(timestamp: number, now = Date.now()): string {
  const delta = timestamp - now;
  const magnitude = Math.abs(delta);

  for (const [unit, ms] of UNITS) {
    if (magnitude >= ms) return relative.format(Math.round(delta / ms), unit);
  }
  return relative.format(0, 'second');
}

/** Full local date and time, for tooltips and secondary labels. */
export function absoluteTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
