<script lang="ts">
  import { open } from '@tauri-apps/plugin-dialog';
  import { Page, Preloader } from 'konsta/svelte';
  import AppToolbar from '$lib/components/AppToolbar.svelte';
  import FontCard from '$lib/components/FontCard.svelte';
  import FontTile from '$lib/components/FontTile.svelte';
  import SettingsDialog from '$lib/components/SettingsDialog.svelte';
  import ExternalFontDialog from '$lib/components/ExternalFontDialog.svelte';
  import DropZone from '$lib/components/DropZone.svelte';
  import { library, type FontEntry } from '$lib/stores/library.svelte';
  import { preview } from '$lib/stores/preview.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { theme } from '$lib/stores/theme.svelte';
  import type { FontFamily } from '$lib/types';

  let showSettings = $state(false);
  let showExternalFonts = $state(false);

  function isTauriRuntime(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  async function pickDirectory() {
    if (!isTauriRuntime()) {
      const files = await pickBrowserFontFiles();
      if (files.length) await library.scanFiles(files);
      return;
    }

    try {
      const dir = await open({
        directory: true,
        multiple: false,
        title: 'Select Font Root Directory',
      });
      if (dir) await library.scanPath(dir);
    } catch (e) {
      console.error('Failed to pick directory', e);
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

  function onSettingsSaved() {
    preview.refreshFromSettings();
    // "Reset to Defaults" can change theme_mode, so pull it back into the store.
    theme.sync(settings.current.theme_mode);
  }
</script>

<Page class="min-h-screen">
  <DropZone
    enabled={!library.isScanning}
    onFolderDropped={(path) => library.scanPath(path)}
    onFilesDropped={(files) => library.scanFiles(files)}
  >
    <div class="p-3 pt-2 flex flex-col gap-2 min-h-screen">
      <AppToolbar
        previewText={preview.text}
        fontSize={preview.fontSize}
        isScanning={library.isScanning}
        viewMode={preview.viewMode}
        themeMode={theme.mode}
        columns={preview.columns}
        merged={preview.merged}
        textAlign={preview.textAlign}
        languages={preview.languages}
        selectedLanguage={preview.selectedLanguage}
        onPickDirectory={pickDirectory}
        onOpenExternalFonts={() => showExternalFonts = true}
        onOpenSettings={() => showSettings = true}
        onTextChanged={(v) => preview.text = v}
        onFontSizeChanged={(v) => preview.setFontSize(v)}
        onViewModeChanged={(v) => preview.viewMode = v}
        onLanguageChanged={(l) => preview.selectLanguage(l)}
        onColumnsChanged={(v) => preview.columns = v}
        onMergedChanged={(v) => preview.merged = v}
        onThemeModeChanged={(v) => theme.set(v)}
        onTextAlignChanged={(v) => preview.textAlign = v}
      />

      {#if library.selectedPath && !library.isScanning}
        <div class="flex items-center justify-between px-2 text-[11px] opacity-50 mb-1 -mt-1">
          <span class="font-semibold truncate pr-4">{library.selectedPath}</span>
          <span class="shrink-0">{library.totalFonts} fonts · {library.families.length} families</span>
        </div>
      {/if}

      {#if library.importWarnings.length && !library.isScanning}
        <div
          class="mx-2 mb-1 -mt-0.5 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400"
          role="status"
        >
          <span class="font-semibold">Some sources could not be imported:</span>
          {#each library.importWarnings as warning}
            <div class="opacity-80">{warning}</div>
          {/each}
        </div>
      {/if}

      {#if library.isScanning}
        <div class="flex flex-col items-center justify-center py-16 gap-4">
          <Preloader class="w-8 h-8" />
          <span class="text-sm font-semibold opacity-70">{library.loadingMessage}</span>
        </div>
      {/if}

      {#if !library.isScanning && library.isEmpty}
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

      {#if !library.isScanning && library.families.length > 0}
        <div
          class={preview.viewMode === 'list' ? 'flex flex-col gap-2 pb-8' : 'grid gap-2.5 pb-8'}
          style={preview.viewMode === 'list'
            ? ''
            : `grid-template-columns: repeat(${preview.columnsCount}, minmax(0, 1fr))`}
        >
          {#each library.entries as entry}
            <div class={preview.viewMode === 'list' ? 'h-40' : ''}>
              {#if 'fonts' in entry}
                {@const view = preview.cardView(entry.name)}
                <FontCard
                  family={entry}
                  previewText={view.text}
                  fontSize={preview.fontSize}
                  rtl={view.rtl}
                  textAlign={view.align}
                  languages={preview.languages}
                  activeLanguage={view.language}
                  languageOverridden={view.overridden}
                  onLanguageChanged={(lang) => preview.setCardLanguage(entry.name, lang)}
                />
              {:else}
                {@const e = entry as FontEntry}
                {@const view = preview.cardView(e.family.name)}
                <FontTile
                  family={e.family}
                  font={e.font}
                  previewText={view.text}
                  fontSize={preview.fontSize}
                  rtl={view.rtl}
                  textAlign={view.align}
                  languages={preview.languages}
                  activeLanguage={view.language}
                  languageOverridden={view.overridden}
                  onLanguageChanged={(lang) => preview.setCardLanguage(e.family.name, lang)}
                />
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </DropZone>

  {#if showSettings}
    <SettingsDialog
      settings={settings.current}
      languages={preview.languages}
      onClose={() => showSettings = false}
      onSaved={onSettingsSaved}
    />
  {/if}

  {#if showExternalFonts}
    <ExternalFontDialog
      onClose={() => showExternalFonts = false}
      onLoad={(source) => library.importWeb(source)}
    />
  {/if}
</Page>
