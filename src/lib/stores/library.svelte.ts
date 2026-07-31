import { invoke } from '@tauri-apps/api/core';
import type { FontFamily, FontFile, ScanResult, SessionSource } from '$lib/types';
import { scanBrowserFontFiles } from '$lib/utils/browser-fonts';
import { fetchExternalFonts } from '$lib/utils/external-fonts';
import { clearFonts } from '$lib/utils/font-loader';
import { history } from '$lib/stores/history.svelte';
import { preview } from '$lib/stores/preview.svelte';

export type FontEntry = { family: FontFamily; font: FontFile };

const SESSION_KEY = 'foundryglance:last-source';

/**
 * A pointer to what was last loaded, so a reload can rebuild it. Only the
 * source is stored, never the parsed fonts — font bytes and Blob URLs cannot be
 * serialized, and a directory may have changed since. localStorage is used
 * rather than a config file because this is throwaway session state.
 */
function readSessionSource(): SessionSource | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionSource) : null;
  } catch {
    return null;
  }
}

function writeSessionSource(source: SessionSource | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (source) localStorage.setItem(SESSION_KEY, JSON.stringify(source));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // storage unavailable or full — restore is best-effort
  }
}

/** The currently loaded font set, however it was obtained, plus how to load one. */
class LibraryStore {
  families = $state<FontFamily[]>([]);
  totalFonts = $state(0);
  selectedPath = $state<string | null>(null);
  isScanning = $state(false);
  loadingMessage = $state('Scanning font files...');
  importWarnings = $state<string[]>([]);

  readonly fontEntries = $derived<FontEntry[]>(
    this.families.flatMap((family) => family.fonts.map((font) => ({ family, font })))
  );
  readonly entries = $derived<(FontFamily | FontEntry)[]>(
    preview.merged ? this.families : this.fontEntries
  );
  readonly isEmpty = $derived(this.families.length === 0 && !this.selectedPath);

  setScanResult(result: ScanResult): void {
    this.families = result.families;
    this.totalFonts = result.font_count;
    this.selectedPath = result.folder_name ?? this.selectedPath;
    this.importWarnings = [];
    preview.clearOverrides();
    this.isScanning = false;
  }

  async scanPath(path: string): Promise<void> {
    this.beginScan('Scanning font files...');
    clearFonts();
    this.selectedPath = path;
    try {
      this.setScanResult(await invoke<ScanResult>('scan_directory', { path }));
      writeSessionSource({ kind: 'directory', path });
    } catch (error) {
      console.error('Failed to scan directory', error);
      this.isScanning = false;
    }
  }

  async scanFiles(files: File[]): Promise<void> {
    this.beginScan('Scanning font files...');
    clearFonts();
    try {
      const result = await scanBrowserFontFiles(files);
      this.selectedPath = result.folder_name;
      this.setScanResult(result);
      // Browser File objects cannot be re-opened without another user gesture,
      // so there is nothing restorable to remember here.
      writeSessionSource(null);
    } catch (error) {
      console.error('Failed to scan font files', error);
      this.isScanning = false;
    }
  }

  /**
   * Rebuilds the last session's font set after a reload. Runs in the background
   * so it never blocks first paint, and quietly forgets a source it cannot load
   * (deleted directory, offline, no Tauri runtime for a directory source).
   */
  async restore(): Promise<void> {
    const source = readSessionSource();
    if (!source) return;

    try {
      if (source.kind === 'web') {
        await this.importWeb(source.sources.join('\n'), { record: false });
      } else {
        await this.scanPath(source.path);
      }
    } catch (error) {
      console.warn('Could not restore the previous session', error);
      writeSessionSource(null);
      this.isScanning = false;
    }
  }

  /**
   * Fetches web fonts and replaces the library. Records the import in history
   * unless this is a session restore, which would otherwise re-stamp the entry
   * on every reload and push it to the top of the list.
   */
  async importWeb(source: string, options: { record?: boolean } = {}): Promise<void> {
    this.beginScan('Fetching web fonts...');
    try {
      const { result, warnings, sources } = await fetchExternalFonts(source, {
        onProgress: (loaded, total) => {
          if (total > 1) this.loadingMessage = `Fetching web fonts... (${loaded}/${total})`;
        },
      });

      clearFonts();
      this.setScanResult(result);
      this.importWarnings = warnings;
      writeSessionSource({ kind: 'web', sources });
      if (options.record !== false) await history.record(sources, result, Date.now());
    } catch (error) {
      this.isScanning = false;
      throw error;
    }
  }

  /**
   * Note: this deliberately does NOT call `clearFonts()`. Directory scans clear
   * up front, but a web import must keep the current library intact until the
   * fetch actually succeeds — otherwise a failed import wipes what was loaded.
   */
  private beginScan(message: string): void {
    this.isScanning = true;
    this.loadingMessage = message;
    this.importWarnings = [];
  }
}

export const library = new LibraryStore();
