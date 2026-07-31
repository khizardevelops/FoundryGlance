import type { FontFamily, FontFile, ScanResult } from '$lib/types';

const GOOGLE_VARIANTS = [
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '100italic',
  '200italic',
  '300italic',
  '400italic',
  '500italic',
  '600italic',
  '700italic',
  '800italic',
  '900italic',
].join(',');

const MAX_STYLESHEETS = 24;
const MAX_STYLESHEET_LENGTH = 1_000_000;

type ParsedWeight = {
  css: string;
  value: number;
  min: number;
  max: number;
};

type ParsedFace = {
  familyName: string;
  isItalic: boolean;
  weight: ParsedWeight;
  css: string;
};

type Stylesheet = {
  url: string;
  css: string;
};

export type ExternalFontImport = {
  result: ScanResult;
  warnings: string[];
  /** Normalized stylesheet URLs that were fetched successfully; recorded in history. */
  sources: string[];
};

export type FetchExternalFontsOptions = {
  onProgress?: (loaded: number, total: number) => void;
};

export async function fetchExternalFonts(
  source: string,
  options: FetchExternalFontsOptions = {}
): Promise<ExternalFontImport> {
  const urls = parseExternalFontSources(source);
  const failures: { url: string; reason: string }[] = [];
  let loaded = 0;

  options.onProgress?.(0, urls.length);

  const sheets = await Promise.all(
    urls.map(async (url): Promise<Stylesheet | null> => {
      try {
        return { url, css: await fetchStylesheet(url) };
      } catch (error) {
        failures.push({ url, reason: errorMessage(error) });
        return null;
      } finally {
        loaded += 1;
        options.onProgress?.(loaded, urls.length);
      }
    })
  );

  const warnings = failures.map((failure) => `${describeSource(failure.url)}: ${failure.reason}`);
  const fetched = sheets.filter((sheet): sheet is Stylesheet => sheet !== null);
  if (!fetched.length) {
    throw new Error(
      urls.length === 1
        ? capitalize(failures[0].reason)
        : `None of the ${urls.length} stylesheets could be imported. ${warnings[0]}`
    );
  }

  const { families, emptySheets } = collectFamilies(fetched);
  if (!families.length) {
    throw new Error('No usable @font-face rules were found in that stylesheet.');
  }

  for (const url of emptySheets) {
    warnings.push(`${describeSource(url)}: no usable @font-face rules.`);
  }

  return {
    result: buildScanResult(families, fetched),
    warnings,
    sources: fetched.map((sheet) => sheet.url),
  };
}

async function fetchStylesheet(url: string): Promise<string> {
  let response: Response;

  try {
    response = await fetch(url, { headers: { Accept: 'text/css,*/*;q=0.1' } });
  } catch {
    // Providers answer an unknown family with a CORS-less 4xx, which surfaces
    // here as a network failure, so name that cause too.
    throw new Error('could not load the stylesheet — check the family name, the URL, and your connection.');
  }

  if (!response.ok) {
    throw new Error(`the font provider returned HTTP ${response.status}.`);
  }

  const css = await response.text();
  if (css.length > MAX_STYLESHEET_LENGTH) {
    throw new Error('the remote stylesheet is too large to import.');
  }

  return css;
}

/**
 * Accepts anything a user is likely to paste: a family name, a stylesheet URL, a
 * Google Fonts specimen/share link, a full `<link>` embed snippet (including the
 * `preconnect` tags that ship with it), a `<style>@import url(...)</style>` block,
 * or several of those separated by newlines.
 */
export function parseExternalFontSources(source: string): string[] {
  const value = source.trim();
  if (!value) {
    throw new Error('Enter a Google Fonts family, stylesheet URL, or embed snippet.');
  }

  const urls: string[] = [];
  const seen = new Set<string>();
  let firstError: string | null = null;

  for (const candidate of extractCandidates(value)) {
    let url: string;
    try {
      url = normalizeExternalFontSource(candidate);
    } catch (error) {
      firstError ??= errorMessage(error);
      continue;
    }

    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }

  if (!urls.length) {
    throw new Error(firstError ?? 'No font stylesheet URLs were found in that input.');
  }

  if (urls.length > MAX_STYLESHEETS) {
    throw new Error(`Too many stylesheets in one import (${urls.length}); the limit is ${MAX_STYLESHEETS}.`);
  }

  return urls;
}

function extractCandidates(value: string): string[] {
  const candidates: string[] = [];

  for (const tag of value.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = tag.match(/\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const relValue = (rel?.[1] ?? rel?.[2] ?? rel?.[3] ?? '').toLowerCase();
    const isStylesheet =
      !relValue ||
      /\bstylesheet\b/.test(relValue) ||
      (/\bpreload\b/.test(relValue) && /\bas\s*=\s*["']?style\b/i.test(tag));
    if (!isStylesheet) continue;

    const href = tag.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const link = href?.[1] ?? href?.[2] ?? href?.[3];
    if (link) candidates.push(link);
  }

  const importPattern = /@import\s+(?:url\(\s*)?(?:"([^"]*)"|'([^']*)'|([^)\s;]+))/gi;
  for (const match of value.matchAll(importPattern)) {
    const imported = match[1] ?? match[2] ?? match[3];
    if (imported) candidates.push(imported);
  }

  if (candidates.length) return candidates.map(decodeHtmlEntities);

  if (/<link\b/i.test(value) || /@import\b/i.test(value)) {
    throw new Error('That snippet has no stylesheet URL — include the <link rel="stylesheet"> or @import line.');
  }

  return splitPlainSources(value);
}

function splitPlainSources(value: string): string[] {
  const sources: string[] = [];

  for (const line of decodeHtmlEntities(value).split(/[\r\n]+/)) {
    const trimmed = line.trim().replace(/[;,]+$/, '');
    if (!trimmed) continue;

    // URLs may legitimately contain commas (`family=Amiri:ital,wght@0,400`),
    // so only comma-split input that reads as a list of family names.
    if (looksLikeUrl(trimmed)) {
      sources.push(trimmed);
      continue;
    }

    for (const part of trimmed.split(',')) {
      const family = part.trim();
      if (family) sources.push(family);
    }
  }

  return sources;
}

function looksLikeUrl(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ||
    /^\/\//.test(value) ||
    /^[\w-]+(?:\.[\w-]+)+\//.test(value);
}

export function normalizeExternalFontSource(source: string): string {
  let value = decodeHtmlEntities(source).trim();
  if (!value) throw new Error('Enter a Google Fonts family, stylesheet URL, or embed snippet.');

  // Checked before URL parsing: `Inter:wght@100..900` is a valid-looking URL to
  // `new URL()` (scheme `inter:`) but is really a css2 family selection.
  if (value.startsWith('//')) value = `https:${value}`;
  else if (!looksLikeUrl(value)) return googleFamilyUrl(value);
  else if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) value = `https://${value}`;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return googleFamilyUrl(value);
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only HTTP and HTTPS font stylesheets are supported.');
  }

  if (url.username || url.password) {
    throw new Error('Font stylesheet URLs cannot contain credentials.');
  }

  if (url.hostname === 'fonts.google.com') {
    // The "Get embed code" / share links carry the whole selection in one param:
    // ?selection.family=Amiri:wght@400;700|Mirza:wght@400
    const selection = url.searchParams.get('selection.family');
    if (selection) {
      const specs = selection.split('|').map((spec) => spec.trim()).filter(Boolean);
      if (specs.length) return googleCss2Url(specs);
    }

    const parts = url.pathname.split('/').filter(Boolean);
    const specimenIndex = parts.indexOf('specimen');
    const encodedFamily = specimenIndex >= 0 ? parts[specimenIndex + 1] : undefined;
    if (!encodedFamily) {
      throw new Error('Use a Google Fonts specimen page, embed URL, or family name.');
    }
    return googleFamilyUrl(decodeURIComponent(encodedFamily).replaceAll('+', ' '));
  }

  return url.href;
}

export function parseExternalFontStylesheet(css: string, stylesheetUrl: string): ScanResult {
  const sheets: Stylesheet[] = [{ url: stylesheetUrl, css }];
  const { families } = collectFamilies(sheets);

  if (!families.length) {
    throw new Error('No usable @font-face rules were found in that stylesheet.');
  }

  return buildScanResult(families, sheets);
}

function collectFamilies(sheets: Stylesheet[]): { families: FontFamily[]; emptySheets: string[] } {
  type Bucket = {
    variants: Map<string, FontFile>;
    css: string[];
    sources: Set<string>;
  };

  const familyMap = new Map<string, Bucket>();
  const emptySheets: string[] = [];
  const facePattern = /@font-face\s*{([\s\S]*?)}/gi;

  for (const sheet of sheets) {
    let faceCount = 0;

    for (const match of sheet.css.matchAll(facePattern)) {
      const face = parseFace(match[1], sheet.url);
      if (!face) continue;
      faceCount += 1;

      const bucket = familyMap.get(face.familyName) ??
        { variants: new Map<string, FontFile>(), css: [], sources: new Set<string>() };
      bucket.css.push(face.css);
      bucket.sources.add(sheet.url);

      // Providers emit one rule per unicode subset; collapse those into a single
      // variant while keeping every rule in the injected CSS.
      const variantKey = `${face.isItalic ? 'italic' : 'normal'}:${face.weight.min}-${face.weight.max}`;
      if (!bucket.variants.has(variantKey)) {
        const subfamily = subfamilyName(face.weight.value, face.isItalic, face.weight.min !== face.weight.max);
        bucket.variants.set(variantKey, {
          path: `external:${sheet.url}#${encodeURIComponent(face.familyName)}-${variantKey}`,
          family_name: face.familyName,
          subfamily,
          weight: face.weight.value,
          weight_min: face.weight.min,
          weight_max: face.weight.max,
          is_italic: face.isItalic,
          filename: `${face.familyName} ${subfamily} (web)`,
        });
      }

      familyMap.set(face.familyName, bucket);
    }

    if (!faceCount) emptySheets.push(sheet.url);
  }

  const families = Array.from(familyMap, ([name, bucket]) => ({
    name,
    fonts: Array.from(bucket.variants.values()).sort((a, b) =>
      a.weight - b.weight || Number(a.is_italic) - Number(b.is_italic)
    ),
    external_stylesheet: {
      url: `${Array.from(bucket.sources).sort().join(' ')}#${encodeURIComponent(name)}`,
      css: bucket.css.join('\n\n'),
    },
  })).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  return { families, emptySheets };
}

function buildScanResult(families: FontFamily[], sheets: Stylesheet[]): ScanResult {
  const familyLabel = families.length <= 3
    ? families.map((family) => family.name).join(', ')
    : `${families.slice(0, 3).map((family) => family.name).join(', ')} +${families.length - 3}`;

  return {
    families,
    font_count: families.reduce((count, family) => count + family.fonts.length, 0),
    folder_name: `${providerLabel(sheets)} · ${familyLabel}`,
  };
}

function providerLabel(sheets: Stylesheet[]): string {
  const hosts = Array.from(new Set(sheets.map((sheet) => hostOf(sheet.url))));
  const names = hosts.map((host) => (host === 'fonts.googleapis.com' ? 'Google Fonts' : host));
  return names.length <= 2 ? names.join(' + ') : `${names.length} sources`;
}

function googleFamilyUrl(spec: string): string {
  // `Inter:wght@100..900` is a css2 selection; a bare name gets every static variant.
  return spec.includes(':') ? googleCss2Url([spec]) : googleFontsUrl(spec);
}

function googleFontsUrl(familyName: string): string {
  const family = familyName.trim().replace(/\s+/g, ' ');
  if (!family || family.length > 120) {
    throw new Error('Enter a valid Google Fonts family name.');
  }

  const encoded = encodeURIComponent(family).replaceAll('%20', '+');
  return `https://fonts.googleapis.com/css?family=${encoded}:${GOOGLE_VARIANTS}&display=swap`;
}

function googleCss2Url(specs: string[]): string {
  const families = specs.map((spec) => {
    const normalized = spec.trim().replace(/\s+/g, '+');
    if (!normalized || normalized.length > 200 || !/^[A-Za-z0-9+.:,;@_-]+$/.test(normalized)) {
      throw new Error(`"${spec}" is not a valid Google Fonts family selection.`);
    }
    return `family=${normalized}`;
  });

  if (!families.length) throw new Error('Enter a valid Google Fonts family name.');
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}

function parseFace(body: string, stylesheetUrl: string): ParsedFace | null {
  const rawFamily = descriptor(body, 'font-family');
  const rawSource = descriptor(body, 'src');
  if (!rawFamily || !rawSource) return null;

  const familyName = decodeCssString(rawFamily);
  const source = sanitizeSources(rawSource, stylesheetUrl);
  const weight = parseWeight(descriptor(body, 'font-weight') || '400');
  if (!familyName || !source || !weight) return null;

  const rawStyle = (descriptor(body, 'font-style') || 'normal').trim().toLowerCase();
  const isItalic = rawStyle.startsWith('italic') || rawStyle.startsWith('oblique');
  const unicodeRange = sanitizeUnicodeRange(descriptor(body, 'unicode-range'));
  const familyCss = escapeCssString(familyName);

  const lines = [
    '@font-face {',
    `  font-family: "${familyCss}";`,
    `  font-style: ${isItalic ? 'italic' : 'normal'};`,
    `  font-weight: ${weight.css};`,
    '  font-display: swap;',
    `  src: ${source};`,
  ];
  if (unicodeRange) lines.push(`  unicode-range: ${unicodeRange};`);
  lines.push('}');

  return {
    familyName,
    isItalic,
    weight,
    css: lines.join('\n'),
  };
}

function descriptor(body: string, name: string): string | null {
  const match = body.match(new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'i'));
  return match?.[1]?.trim() || null;
}

function decodeCssString(value: string): string {
  let decoded = value.trim();
  if ((decoded.startsWith('"') && decoded.endsWith('"')) ||
      (decoded.startsWith("'") && decoded.endsWith("'"))) {
    decoded = decoded.slice(1, -1);
  }

  return decoded
    .replace(/\\([0-9a-f]{1,6})\s?/gi, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/\\(["'\\])/g, '$1')
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&#38;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function sanitizeSources(value: string, stylesheetUrl: string): string | null {
  const sources: string[] = [];
  const sourcePattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)\s*(?:format\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\))?/gi;

  for (const match of value.matchAll(sourcePattern)) {
    const rawUrl = match[1] || match[2] || match[3];
    const rawFormat = (match[4] || match[5] || match[6] || '').trim().toLowerCase();

    let fontUrl: URL;
    try {
      fontUrl = new URL(rawUrl, stylesheetUrl);
    } catch {
      continue;
    }

    if ((fontUrl.protocol !== 'https:' && fontUrl.protocol !== 'http:') ||
        fontUrl.username || fontUrl.password) {
      continue;
    }

    const format = /^[a-z0-9-]+$/.test(rawFormat) ? ` format("${rawFormat}")` : '';
    sources.push(`url("${escapeCssString(fontUrl.href)}")${format}`);
  }

  return sources.length ? sources.join(', ') : null;
}

function sanitizeUnicodeRange(value: string | null): string | null {
  if (!value) return null;
  const range = value.trim();
  return /^[uU+0-9a-fA-F?,\-\s]+$/.test(range) ? range : null;
}

function parseWeight(value: string): ParsedWeight | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'normal') return { css: '400', value: 400, min: 400, max: 400 };
  if (normalized === 'bold') return { css: '700', value: 700, min: 700, max: 700 };

  const numbers = normalized.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!numbers.length || numbers.length > 2 || numbers.some((weight) => weight < 1 || weight > 1000)) {
    return null;
  }

  const min = Math.round(Math.min(...numbers));
  const max = Math.round(Math.max(...numbers));
  const preferred = min <= 400 && max >= 400 ? 400 : min;
  return {
    css: min === max ? String(min) : `${min} ${max}`,
    value: preferred,
    min,
    max,
  };
}

function subfamilyName(weight: number, italic: boolean, variable: boolean): string {
  const weightName = variable ? 'Variable' : ({
    100: 'Thin',
    200: 'Extra Light',
    300: 'Light',
    400: 'Regular',
    500: 'Medium',
    600: 'Semi Bold',
    700: 'Bold',
    800: 'Extra Bold',
    900: 'Black',
  } as Record<number, string>)[weight] ?? `Weight ${weight}`;
  return `${weightName}${italic ? ' Italic' : ''}`;
}

function escapeCssString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replace(/[\r\n\f]/g, ' ');
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function describeSource(url: string): string {
  let families: string[] = [];
  try {
    families = new URL(url).searchParams.getAll('family');
  } catch {
    return url;
  }

  if (!families.length) return hostOf(url);

  const names = families.map((family) => family.split(':')[0].replaceAll('+', ' '));
  return names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Import failed.';
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
