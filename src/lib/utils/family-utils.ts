import type { FontFamily, FontFile } from '$lib/types';

export function availableWeights(family: FontFamily): number[] {
  const weights = family.fonts.map((f) => f.weight);
  return [...new Set(weights)].sort((a, b) => a - b);
}

export function hasItalic(family: FontFamily): boolean {
  return family.fonts.some((f) => f.is_italic);
}

export function variantFor(
  family: FontFamily,
  weight: number,
  italic: boolean = false
): FontFile | undefined {
  let best: FontFile | undefined;
  let bestDiff = 9999;
  for (const f of family.fonts) {
    if (f.is_italic !== italic) continue;
    const diff = Math.abs(f.weight - weight);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = f;
    }
  }
  return best;
}

export function weightLabel(w: number): string {
  switch (w) {
    case 100: return 'Thin';
    case 200: return 'XLt';
    case 300: return 'Light';
    case 400: return 'Reg';
    case 500: return 'Med';
    case 600: return 'SBd';
    case 700: return 'Bold';
    case 800: return 'XBd';
    case 900: return 'Blk';
    default: return `w${w}`;
  }
}

export function defaultVariant(family: FontFamily): FontFile {
  const regular = family.fonts.find((f) => f.weight === 400 && !f.is_italic);
  return regular ?? family.fonts[0];
}
