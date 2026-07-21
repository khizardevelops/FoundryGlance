import { invoke } from '@tauri-apps/api/core';
import type { FontFamily, FontFile } from '$lib/types';

const _loadedFamilies = new Map<string, boolean>();
const _loadingFamilies = new Map<string, Promise<void>>();

export function isFontLoaded(familyName: string): boolean {
  return _loadedFamilies.has(familyName);
}

export async function loadFontFamily(family: FontFamily): Promise<void> {
  if (_loadedFamilies.has(family.name)) return;

  const existing = _loadingFamilies.get(family.name);
  if (existing) return existing;

  const promise = _loadFamily(family);
  _loadingFamilies.set(family.name, promise);
  return promise;
}

async function _loadFamily(family: FontFamily): Promise<void> {
  try {
    const fontPromises = family.fonts.map((font) => _loadSingleFont(font, family.name));

    await Promise.all(fontPromises);
    _loadedFamilies.set(family.name, true);
  } catch (e) {
    console.error(`Failed to load font family ${family.name}:`, e);
  } finally {
    _loadingFamilies.delete(family.name);
  }
}

async function _loadSingleFont(font: FontFile, familyName: string): Promise<void> {
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

    const fontFace = new FontFace(familyName, `url(${url})`, {
      weight: String(weight),
      style,
    });

    await fontFace.load();
    document.fonts.add(fontFace);
  } catch (e) {
    console.error(`Failed to load font: ${font.filename}`, e);
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

export function clearFonts(): void {
  _loadedFamilies.clear();
  _loadingFamilies.clear();
}
