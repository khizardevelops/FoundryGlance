import { invoke } from '@tauri-apps/api/core';
import type { ImportHistoryEntry, ScanResult } from '$lib/types';

const STORAGE_KEY = 'foundryglance:import-history';
const MAX_ENTRIES = 200;

/**
 * History of web font imports, newest first, persisted to
 * `~/.config/foundryglance/history.json` via Tauri. Outside the Tauri runtime
 * (browser dev mode) it falls back to localStorage so the feature still works.
 */
class HistoryStore {
  entries = $state<ImportHistoryEntry[]>([]);
  loaded = $state(false);

  async load(): Promise<void> {
    try {
      this.entries = await invoke<ImportHistoryEntry[]>('load_history');
    } catch {
      this.entries = readLocal();
    }
    this.loaded = true;
  }

  /** Records a completed import. Newest entry wins if the same sources repeat. */
  async record(sources: string[], result: ScanResult, importedAt: number): Promise<void> {
    const entry: ImportHistoryEntry = {
      id: `${importedAt}-${sources.join(' ')}`,
      imported_at: importedAt,
      sources,
      families: result.families.map((family) => family.name),
      font_count: result.font_count,
      label: result.folder_name,
    };

    const key = sources.join(' ');
    const deduped = this.entries.filter((existing) => existing.sources.join(' ') !== key);
    this.entries = [entry, ...deduped].slice(0, MAX_ENTRIES);
    await this.persist();
  }

  async remove(id: string): Promise<void> {
    this.entries = this.entries.filter((entry) => entry.id !== id);
    await this.persist();
  }

  async clear(): Promise<void> {
    this.entries = [];
    try {
      await invoke('clear_history');
    } catch {
      writeLocal([]);
    }
  }

  private async persist(): Promise<void> {
    const entries = $state.snapshot(this.entries) as ImportHistoryEntry[];
    try {
      await invoke('save_history', { entries });
    } catch {
      writeLocal(entries);
    }
  }
}

function readLocal(): ImportHistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(entries: ImportHistoryEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage unavailable or full — history is best-effort
  }
}

export const history = new HistoryStore();
