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

export async function fetchExternalFonts(source: string): Promise<ScanResult> {
  const stylesheetUrl = normalizeExternalFontSource(source);
  let response: Response;

  try {
    response = await fetch(stylesheetUrl, {
      headers: { Accept: 'text/css,*/*;q=0.1' },
    });
  } catch {
    throw new Error('Could not reach the font provider. Check the URL, connection, and CORS policy.');
  }

  if (!response.ok) {
    throw new Error(`The font provider returned HTTP ${response.status}.`);
  }

  const css = await response.text();
  if (css.length > 1_000_000) {
    throw new Error('The remote stylesheet is too large to import.');
  }

  return parseExternalFontStylesheet(css, response.url || stylesheetUrl);
}

export function normalizeExternalFontSource(source: string): string {
  let value = source.trim();
  if (!value) throw new Error('Enter a Google Fonts family or stylesheet URL.');

  const href = value.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
  const imported = value.match(/@import\s+(?:url\()?\s*["']?([^"')\s]+)["']?/i)?.[1];
  value = (href || imported || value).replaceAll('&amp;', '&').trim();

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return googleFontsUrl(value);
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only HTTP and HTTPS font stylesheets are supported.');
  }

  if (url.username || url.password) {
    throw new Error('Font stylesheet URLs cannot contain credentials.');
  }

  if (url.hostname === 'fonts.google.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    const specimenIndex = parts.indexOf('specimen');
    const encodedFamily = specimenIndex >= 0 ? parts[specimenIndex + 1] : undefined;
    if (!encodedFamily) {
      throw new Error('Use a Google Fonts specimen page, embed URL, or family name.');
    }
    return googleFontsUrl(decodeURIComponent(encodedFamily).replaceAll('+', ' '));
  }

  return url.href;
}

export function parseExternalFontStylesheet(css: string, stylesheetUrl: string): ScanResult {
  const faces: ParsedFace[] = [];
  const facePattern = /@font-face\s*{([\s\S]*?)}/gi;

  for (const match of css.matchAll(facePattern)) {
    const face = parseFace(match[1], stylesheetUrl);
    if (face) faces.push(face);
  }

  if (!faces.length) {
    throw new Error('No usable @font-face rules were found in that stylesheet.');
  }

  const safeCss = faces.map((face) => face.css).join('\n\n');
  const familyMap = new Map<string, Map<string, FontFile>>();

  for (const face of faces) {
    const familyFonts = familyMap.get(face.familyName) ?? new Map<string, FontFile>();
    const variantKey = `${face.isItalic ? 'italic' : 'normal'}:${face.weight.min}-${face.weight.max}`;

    if (!familyFonts.has(variantKey)) {
      const subfamily = subfamilyName(face.weight.value, face.isItalic, face.weight.min !== face.weight.max);
      familyFonts.set(variantKey, {
        path: `external:${stylesheetUrl}#${encodeURIComponent(face.familyName)}-${variantKey}`,
        family_name: face.familyName,
        subfamily,
        weight: face.weight.value,
        weight_min: face.weight.min,
        weight_max: face.weight.max,
        is_italic: face.isItalic,
        filename: `${face.familyName} ${subfamily} (web)`,
      });
    }

    familyMap.set(face.familyName, familyFonts);
  }

  const families: FontFamily[] = Array.from(familyMap, ([name, variants]) => ({
    name,
    fonts: Array.from(variants.values()).sort((a, b) =>
      a.weight - b.weight || Number(a.is_italic) - Number(b.is_italic)
    ),
    external_stylesheet: { url: stylesheetUrl, css: safeCss },
  })).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  const host = new URL(stylesheetUrl).hostname;
  const provider = host === 'fonts.googleapis.com' ? 'Google Fonts' : host;
  const familyLabel = families.length <= 3
    ? families.map((family) => family.name).join(', ')
    : `${families.slice(0, 3).map((family) => family.name).join(', ')} +${families.length - 3}`;

  return {
    families,
    font_count: families.reduce((count, family) => count + family.fonts.length, 0),
    folder_name: `${provider} · ${familyLabel}`,
  };
}

function googleFontsUrl(familyName: string): string {
  const family = familyName.trim().replace(/\s+/g, ' ');
  if (!family || family.length > 120) {
    throw new Error('Enter a valid Google Fonts family name.');
  }

  const encoded = encodeURIComponent(family).replaceAll('%20', '+');
  return `https://fonts.googleapis.com/css?family=${encoded}:${GOOGLE_VARIANTS}&display=swap`;
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
