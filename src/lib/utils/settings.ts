import { invoke } from '@tauri-apps/api/core';
import type { AppSettings } from '$lib/types';

const defaultSettings: AppSettings = {
  default_font_size: 28,
  custom_texts: {},
  accent_color: '#007aff',
};

let _current: AppSettings = { ...defaultSettings };

export async function loadSettings(): Promise<AppSettings> {
  try {
    _current = await invoke<AppSettings>('load_settings');
  } catch {
    _current = { ...defaultSettings };
  }
  return _current;
}

export function getCurrentSettings(): AppSettings {
  return _current;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  _current = settings;
  try {
    await invoke('save_settings', { settings });
  } catch {
    // silently fail outside Tauri runtime
  }
}

export async function resetSettings(): Promise<void> {
  _current = { ...defaultSettings };
  try {
    await invoke('reset_settings');
  } catch (e) {
    console.error('Failed to reset settings', e);
  }
}

export { defaultSettings };
