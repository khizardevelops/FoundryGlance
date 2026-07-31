import { invoke } from '@tauri-apps/api/core';
import type { AppSettings } from '$lib/types';
import { DEFAULT_ACCENT, accentClass } from '$lib/utils/accent';

const STORAGE_KEY = 'foundryglance:settings';

export const defaultSettings: AppSettings = {
  default_font_size: 28,
  custom_texts: {},
  accent_color: DEFAULT_ACCENT,
  theme_mode: 'system',
};

/** Plain, proxy-free copy. Also normalizes anything missing from an older file. */
function clone(value: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    default_font_size: value?.default_font_size ?? defaultSettings.default_font_size,
    custom_texts: { ...(value?.custom_texts ?? {}) },
    accent_color: value?.accent_color ?? DEFAULT_ACCENT,
    theme_mode: value?.theme_mode ?? 'system',
  };
}

class SettingsStore {
  current = $state<AppSettings>(clone(defaultSettings));
  loaded = $state(false);

  /** Konsta brand class for the active accent; applied on the App root. */
  readonly accentClass = $derived(accentClass(this.current.accent_color));

  get fontSize(): number {
    return this.current.default_font_size;
  }

  customText(languageId: string): string | undefined {
    return this.current.custom_texts[languageId];
  }

  async load(): Promise<AppSettings> {
    try {
      this.current = clone(await invoke<AppSettings>('load_settings'));
    } catch {
      // No Tauri runtime (browser dev mode) — settings still have to survive a
      // reload, so fall back to localStorage rather than resetting to defaults.
      this.current = clone(readLocal());
    }
    this.loaded = true;
    return this.current;
  }

  async save(next: Partial<AppSettings>): Promise<void> {
    this.current = clone({ ...this.current, ...next });
    const settings = clone(this.current);
    try {
      await invoke('save_settings', { settings });
    } catch {
      writeLocal(settings);
    }
  }

  /** Alias kept for call sites that patch a single field. */
  async patch(patch: Partial<AppSettings>): Promise<void> {
    await this.save(patch);
  }

  async reset(): Promise<void> {
    this.current = clone(defaultSettings);
    try {
      await invoke('reset_settings');
    } catch {
      writeLocal(clone(defaultSettings));
    }
  }

  snapshot(): AppSettings {
    return clone(this.current);
  }
}

function readLocal(): AppSettings | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppSettings) : null;
  } catch {
    return null;
  }
}

function writeLocal(settings: AppSettings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable or full
  }
}

export const settings = new SettingsStore();
