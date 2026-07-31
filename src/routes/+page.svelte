<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { open } from '@tauri-apps/plugin-dialog';
  import { List, ListItem, Page, Preloader } from 'konsta/svelte';
  import AppToolbar from '$lib/components/AppToolbar.svelte';
  import FontCard from '$lib/components/FontCard.svelte';
  import FontTile from '$lib/components/FontTile.svelte';
  import SettingsDialog from '$lib/components/SettingsDialog.svelte';
  import ExternalFontDialog from '$lib/components/ExternalFontDialog.svelte';
  import DropZone from '$lib/components/DropZone.svelte';
  import { loadLanguages } from '$lib/utils/languages';
  import { scanBrowserFontFiles } from '$lib/utils/browser-fonts';
  import { fetchExternalFonts } from '$lib/utils/external-fonts';
  import { getCurrentSettings, saveSettings } from '$lib/utils/settings';
  import { clearFonts } from '$lib/utils/font-loader';
  import { darkMode } from '$lib/utils/theme';
  import type {
    FontFamily,
    FontFile,
    ScanResult,
    LanguageSample,
    ViewMode,
    ThemeMode,
    TextAlign,
    AppSettings,
  } from '$lib/types';

  let settings = $state<AppSettings>(getCurrentSettings());
  let fontSize = $state(getCurrentSettings().default_font_size);
  let isRtl = $state(false);
  let isScanning = $state(false);
  let families = $state<FontFamily[]>([]);
  let familyEntries = $state<FontFamily[]>([]);
  let fontEntries = $state<{ family: FontFamily; font: FontFile }[]>([]);
  let totalFonts = $state(0);
  let selectedPath = $state<string | null>(null);
  let viewMode = $state<ViewMode>('card');
  let columns = $state(3);
  let merged = $state(true);
  let textAlign = $state<TextAlign>('left');
  let languages = $state<LanguageSample[]>([]);
  let selectedLanguage = $state<LanguageSample | undefined>(undefined);
  let previewText = $state('');
  let showSettings = $state(false);
  let showExternalFonts = $state(false);
  let loadingMessage = $state('Scanning font files...');

  function setThemeMode(mode: 'light' | 'dark') {
    darkMode.set(mode === 'dark');
  }

  function isTauriRuntime(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  let mounted = $state(false);

  $effect(() => {
    mounted = true;
    return () => { mounted = false; };
  });

  $effect(() => {
    settings = getCurrentSettings();
    const langs = loadLanguages();
    const def = langs.find((l) => l.id === 'en_Latn') ?? langs[0];
    languages = langs;
    selectedLanguage = def;
    previewText = getCurrentSettings().custom_texts[def.id] ?? def.tester;
    isRtl = def.is_rtl;
    textAlign = def.is_rtl ? 'right' : 'left';
    fontSize = getCurrentSettings().default_font_size;

  });

  function onLangChanged(l: LanguageSample) {
    selectedLanguage = l;
    previewText = getCurrentSettings().custom_texts[l.id] ?? l.tester;
    isRtl = l.is_rtl;
    textAlign = l.is_rtl ? 'right' : 'left';
  }

  async function pickDirectory() {
    if (!isTauriRuntime()) {
      const files = await pickBrowserFontFiles();
      if (files.length) await scanFiles(files);
      return;
    }

    try {
      const dir = await open({
        directory: true,
        multiple: false,
        title: 'Select Font Root Directory',
      });
      if (dir) {
        isScanning = true;
        loadingMessage = 'Scanning font files...';
        selectedPath = dir;
        clearFonts();
        const result: ScanResult = await invoke('scan_directory', { path: dir });
        if (mounted) {
          setScanResult(result);
        }
      }
    } catch (e) {
      console.error('Failed to pick directory', e);
      if (mounted) isScanning = false;
    }
  }

  async function scanPath(path: string) {
    isScanning = true;
    loadingMessage = 'Scanning font files...';
    selectedPath = path;
    clearFonts();
    try {
      const result: ScanResult = await invoke('scan_directory', { path });
      if (mounted) setScanResult(result);
    } catch (e) {
      console.error('Failed to scan directory', e);
      if (mounted) isScanning = false;
    }
  }

  async function scanFiles(files: File[]) {
    isScanning = true;
    loadingMessage = 'Scanning font files...';
    clearFonts();
    try {
      const result = await scanBrowserFontFiles(files);
      selectedPath = result.folder_name;
      if (mounted) setScanResult(result);
    } catch (e) {
      console.error('Failed to scan font files', e);
      if (mounted) isScanning = false;
    }
  }

  function pickBrowserFontFiles(): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '.ttf,.otf,font/ttf,font/otf';
      input.style.display = 'none';
      input.setAttribute('webkitdirectory', '');
      input.setAttribute('directory', '');

      const done = (files: File[] = []) => {
        input.remove();
        resolve(files);
      };

      input.addEventListener('change', () => done(Array.from(input.files ?? [])), { once: true });
      input.addEventListener('cancel', () => done(), { once: true });
      document.body.append(input);
      input.click();
    });
  }

  function setScanResult(r: ScanResult) {
    familyEntries = r.families;
    fontEntries = r.families.flatMap((f) =>
      f.fonts.map((font) => ({ family: f, font }))
    );
    families = r.families;
    totalFonts = r.font_count;
    selectedPath = r.folder_name ?? selectedPath;
    isScanning = false;
  }

  async function loadExternalFonts(source: string) {
    isScanning = true;
    loadingMessage = 'Fetching web fonts...';
    try {
      const result = await fetchExternalFonts(source);
      clearFonts();
      if (mounted) setScanResult(result);
    } catch (error) {
      if (mounted) isScanning = false;
      throw error;
    }
  }

  const entries = $derived(merged ? familyEntries : fontEntries);

  function openSettings() { showSettings = true; }
  function closeSettings() { showSettings = false; }
  function onSettingsSaved() {
    settings = getCurrentSettings();
    fontSize = settings.default_font_size;
    if (selectedLanguage) {
      previewText = settings.custom_texts[selectedLanguage.id] ?? selectedLanguage.tester;
    }
  }

  function onFontSizeChanged(v: number) {
    fontSize = v;
    const s = { ...getCurrentSettings(), default_font_size: v };
    settings = s;
    saveSettings(s);
  }

  const columnsCount = $derived.by(() => {
    if (viewMode === 'list') return 1;
    return Math.min(columns, 5);
  });
</script>

<Page class="min-h-screen">
  <DropZone enabled={!isScanning} onFolderDropped={scanPath} onFilesDropped={scanFiles}>
      <div class="p-3 pt-2 flex flex-col gap-2 min-h-screen">
        <AppToolbar
          {previewText}
          {fontSize}
          {isScanning}
          {viewMode}
          themeMode={$darkMode ? 'dark' : 'light'}
          {columns}
          {merged}
          {textAlign}
          {languages}
          {selectedLanguage}
          onPickDirectory={pickDirectory}
          onOpenExternalFonts={() => showExternalFonts = true}
          onOpenSettings={openSettings}
          onTextChanged={(v) => previewText = v}
          onFontSizeChanged={onFontSizeChanged}
          onViewModeChanged={(v) => viewMode = v}
          onLanguageChanged={onLangChanged}
          onColumnsChanged={(v) => columns = v}
          onMergedChanged={(v) => merged = v}
          onThemeModeChanged={setThemeMode}
          onTextAlignChanged={(v) => textAlign = v}
        />

        {#if selectedPath && !isScanning}
          <div class="flex items-center justify-between px-2 text-[11px] opacity-50 mb-1 -mt-1">
            <span class="font-semibold truncate pr-4">{selectedPath}</span>
            <span class="shrink-0">{totalFonts} fonts · {families.length} families</span>
          </div>
        {/if}

        {#if isScanning}
          <div class="flex flex-col items-center justify-center py-16 gap-4">
            <Preloader class="w-8 h-8" />
            <span class="text-sm font-semibold opacity-70">{loadingMessage}</span>
          </div>
        {/if}

        {#if !isScanning && families.length === 0 && !selectedPath}
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <svg class="w-12 h-12 mx-auto mb-3 opacity-20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
              </svg>
              <p class="text-sm font-bold opacity-35">Open a folder or add web fonts</p>
              <p class="text-[11px] opacity-20 mt-1">Supports .ttf, .otf, Google Fonts, and CSS font stylesheets</p>
            </div>
          </div>
        {/if}

        {#if !isScanning && families.length > 0}
          {#if viewMode === 'list'}
            <div class="flex flex-col gap-2 pb-8">
              {#each entries as entry, i}
                <div class="h-40">
                  {#if 'fonts' in entry}
                    <FontCard family={entry} {previewText} {fontSize} rtl={isRtl} {textAlign} />
                  {:else}
                    {@const e = entry as { family: FontFamily; font: FontFile }}
                    <FontTile family={e.family} font={e.font} {previewText} {fontSize} rtl={isRtl} {textAlign} />
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <div
              class="grid gap-2.5 pb-8"
              style="grid-template-columns: repeat({columnsCount}, minmax(0, 1fr))"
            >
              {#each entries as entry, i}
                <div>
                  {#if 'fonts' in entry}
                    <FontCard family={entry} {previewText} {fontSize} rtl={isRtl} {textAlign} />
                  {:else}
                    {@const e = entry as { family: FontFamily; font: FontFile }}
                    <FontTile family={e.family} font={e.font} {previewText} {fontSize} rtl={isRtl} {textAlign} />
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    </DropZone>

  {#if showSettings}
    <SettingsDialog
      {settings}
      {languages}
      onClose={closeSettings}
      onSaved={onSettingsSaved}
    />
  {/if}

  {#if showExternalFonts}
    <ExternalFontDialog
      onClose={() => showExternalFonts = false}
      onLoad={loadExternalFonts}
    />
  {/if}
</Page>
