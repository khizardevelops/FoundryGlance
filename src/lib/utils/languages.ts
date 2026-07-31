import type { LanguageSample } from '$lib/types';
import languagesData from '$lib/assets/languages.json';

let _cache: LanguageSample[] | null = null;

export function loadLanguages(): LanguageSample[] {
  if (_cache) return _cache;
  _cache = (languagesData as any[]).map(
    (e) =>
      ({
        id: e.id,
        name: e.name,
        direction: e.direction,
        tester: e.tester,
        poster_md: e.poster_md,
        is_rtl: e.direction === 'RTL',
      } as LanguageSample)
  );
  return _cache;
}

/** `en_Latn` -> `EN`. Used as a compact per-card language indicator. */
export function languageShortCode(lang: LanguageSample): string {
  return (lang.id.split('_')[0] || lang.id).toUpperCase();
}
