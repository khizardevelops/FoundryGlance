/**
 * Konsta derives its whole `--k-color-*` token set from `--color-brand-*` at BUILD
 * time (see konsta/plugin-colors.js), baking literal values into `:root`. Nothing
 * reads `var(--color-brand-primary)` at runtime, so setting that property from JS
 * has no effect. The supported runtime switch is to put one of the generated
 * `.k-color-brand-<name>` classes on a wrapper element and let the tokens inherit.
 *
 * Every value here must also be declared as `--color-brand-<name>` in app.css,
 * otherwise its class is never generated.
 */
export type AccentColor = {
  name: string;
  value: string;
  /** Matches the `--color-brand-<key>` declared in app.css. */
  key: string;
};

export const ACCENT_COLORS: AccentColor[] = [
  { name: 'Blue', value: '#007aff', key: 'blue' },
  { name: 'Purple', value: '#af52de', key: 'purple' },
  { name: 'Pink', value: '#ff2d55', key: 'pink' },
  { name: 'Red', value: '#ff3b30', key: 'red' },
  { name: 'Orange', value: '#ff9500', key: 'orange' },
  { name: 'Yellow', value: '#ffcc00', key: 'yellow' },
  { name: 'Green', value: '#34c759', key: 'green' },
  { name: 'Gray', value: '#8e8e93', key: 'gray' },
];

export const DEFAULT_ACCENT = ACCENT_COLORS[0].value;

/** Maps a stored hex accent to the Konsta brand class that applies it. */
export function accentClass(hex: string | undefined): string {
  const normalized = (hex ?? '').trim().toLowerCase();
  const match = ACCENT_COLORS.find((color) => color.value === normalized);
  return `k-color-brand-${(match ?? ACCENT_COLORS[0]).key}`;
}
