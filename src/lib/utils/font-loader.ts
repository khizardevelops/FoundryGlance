import { invoke } from '@tauri-apps/api/core';
import type { FontFamily, FontFile } from '$lib/types';
import { defaultVariant } from '$lib/utils/family-utils';

const loadedFamilies = new Set<string>();
const loadingFamilies = new Map<string, Promise<void>>();
const externalStylesheets = new Map<string, HTMLStyleElement>();
const loadedFontFaces = new Set<FontFace>();
let loadGeneration = 0;

export function isFontLoaded(family: FontFamily): boolean {
  return loadedFamilies.has(familyKey(family));
}

export function loadFontFamily(family: FontFamily): Promise<void> {
  const key = familyKey(family);
  if (loadedFamilies.has(key)) return Promise.resolve();

  const existing = loadingFamilies.get(key);
  if (existing) return existing;

  const generation = loadGeneration;
  const promise = loadFamily(family, generation)
    .then(() => {
      if (generation !== loadGeneration) throw new Error('Font load was superseded.');
      loadedFamilies.add(key);
    })
    .finally(() => {
      if (loadingFamilies.get(key) === promise) loadingFamilies.delete(key);
    });

  loadingFamilies.set(key, promise);
  return promise;
}

async function loadFamily(family: FontFamily, generation: number): Promise<void> {
  if (family.external_stylesheet) {
    await loadExternalFamily(family);
    return;
  }

  await Promise.all(family.fonts.map((font) => loadSingleFont(font, family.name, generation)));
}

async function loadExternalFamily(family: FontFamily): Promise<void> {
  const stylesheet = family.external_stylesheet;
  if (!stylesheet) return;

  installExternalStylesheet(stylesheet.url, stylesheet.css);

  const variant = defaultVariant(family);
  const style = variant.is_italic ? 'italic' : 'normal';
  const familyName = `"${escapeCssString(family.name)}"`;
  await document.fonts.load(`${style} ${variant.weight} 1em ${familyName}`);
}

function installExternalStylesheet(url: string, css: string): void {
  if (externalStylesheets.has(url)) return;

  const style = document.createElement('style');
  style.dataset.externalFontSource = url;
  style.textContent = css;
  document.head.append(style);
  externalStylesheets.set(url, style);
}

async function loadSingleFont(font: FontFile, familyName: string, generation: number): Promise<void> {
  let url: string | null = null;
  try {
    if (font.file) {
      url = URL.createObjectURL(font.file);
    } else {
      const bytes: number[] = await invoke('read_font_bytes', { path: font.path });
      url = URL.createObjectURL(new Blob([new Uint8Array(bytes)]));
    }

    const weight = font.weight || 400;
    const style = font.is_italic ? 'italic' : 'normal';
    const weightDescriptor = font.weight_min !== undefined && font.weight_max !== undefined &&
      font.weight_min !== font.weight_max
      ? `${font.weight_min} ${font.weight_max}`
      : String(weight);

    const fontFace = new FontFace(familyName, `url(${url})`, {
      weight: weightDescriptor,
      style,
    });

    await fontFace.load();
    if (generation !== loadGeneration) return;
    document.fonts.add(fontFace);
    loadedFontFaces.add(fontFace);
  } catch (error) {
    console.error(`Failed to load font: ${font.filename}`, error);
    throw error;
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

export function clearFonts(): void {
  loadGeneration += 1;
  loadedFamilies.clear();
  loadingFamilies.clear();

  for (const style of externalStylesheets.values()) style.remove();
  externalStylesheets.clear();

  for (const face of loadedFontFaces) document.fonts.delete(face);
  loadedFontFaces.clear();
}

function familyKey(family: FontFamily): string {
  if (family.external_stylesheet) {
    return `external:${family.external_stylesheet.url}:${family.name}`;
  }
  return `local:${family.name}:${family.fonts.map((font) => font.path).join('|')}`;
}

function escapeCssString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replace(/[\r\n\f]/g, ' ');
}
