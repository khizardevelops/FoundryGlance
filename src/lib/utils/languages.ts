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
