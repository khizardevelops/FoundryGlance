<script lang="ts">
  import {
    Badge,
    Button,
    Card,
    List,
    ListItem,
    Popover,
    Preloader,
    Range,
    Searchbar,
    Segmented,
    SegmentedButton,
  } from 'konsta/svelte';
  import type { LanguageSample, ViewMode, ThemeMode, TextAlign } from '$lib/types';

  let {
    previewText = '',
    fontSize = 28,
    isScanning = false,
    viewMode = 'card' as ViewMode,
    themeMode = 'light' as ThemeMode,
    columns = 3,
    merged = true,
    textAlign = 'left' as TextAlign,
    languages = [] as LanguageSample[],
    selectedLanguage = undefined as LanguageSample | undefined,
    onPickDirectory = (() => {}) as () => void,
    onOpenExternalFonts = (() => {}) as () => void,
    onOpenSettings = (() => {}) as () => void,
    onTextChanged = ((_v: string) => {}) as (v: string) => void,
    onFontSizeChanged = ((_v: number) => {}) as (v: number) => void,
    onViewModeChanged = ((_v: ViewMode) => {}) as (v: ViewMode) => void,
    onLanguageChanged = ((_l: LanguageSample) => {}) as (l: LanguageSample) => void,
    onColumnsChanged = ((_v: number) => {}) as (v: number) => void,
    onMergedChanged = ((_v: boolean) => {}) as (v: boolean) => void,
    onThemeModeChanged = ((_v: ThemeMode) => {}) as (v: ThemeMode) => void,
    onTextAlignChanged = ((_v: TextAlign) => {}) as (v: TextAlign) => void,
  } = $props();

  let langOpen = $state(false);
  let langSearch = $state('');
  let langTarget = $state<HTMLElement | null>(null);
  const alignOptions: { v: TextAlign }[] = [{ v: 'left' }, { v: 'center' }, { v: 'right' }];

  function filteredLangs(langs: LanguageSample[], query: string): LanguageSample[] {
    if (!query) return langs;
    const q = query.toLowerCase();
    return langs.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q) ||
        l.tester.toLowerCase().includes(q)
    );
  }

  function selectLanguage(lang: LanguageSample) {
    onLanguageChanged(lang);
    langOpen = false;
    langSearch = '';
  }

  function toggleTheme() {
    onThemeModeChanged(themeMode === 'dark' ? 'light' : 'dark');
  }
</script>

<Card class="!m-0 !rounded-2xl" contentWrap={false}>
  {#if typeof window !== 'undefined'}
    <div class="flex flex-col gap-2 p-2.5">
      <!-- Row 1: Logo, Open button, Search, Settings, Theme -->
      <div class="flex items-center gap-2 min-w-0 flex-wrap">
        <div class="flex flex-col pl-1 shrink-0">
          <span class="text-[15px] font-bold tracking-tight leading-none">foundry</span>
          <span class="text-[15px] font-bold tracking-tight leading-none -mt-[2px]">glance</span>
        </div>

        <Button
          inline
          rounded
          small
          disabled={isScanning}
          class="shrink-0 gap-1.5 whitespace-nowrap font-bold"
          onClick={onPickDirectory}
        >
          {#if isScanning}
            <Preloader class="w-4 h-4 text-white" />
            Scanning
          {:else}
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
            Open
          {/if}
        </Button>

        <Button
          inline
          tonal
          rounded
          small
          disabled={isScanning}
          aria-label="Add web fonts"
          class="shrink-0 gap-1.5 whitespace-nowrap font-semibold"
          onClick={onOpenExternalFonts}
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04A7.49 7.49 0 005.5 8a6 6 0 00.15 12H19a5 5 0 00.35-9.96zM13 13v4h-2v-4H8l4-4 4 4h-3z"/></svg>
          Web
        </Button>

        <Searchbar
          value={previewText}
          placeholder="Preview text"
          clearButton
          class="flex-1 min-w-0"
          onInput={(e) => onTextChanged((e.target as HTMLInputElement).value)}
          onClear={() => onTextChanged('')}
        />

        <Button
          inline
          tonal
          rounded
          small
          aria-label="Open settings"
          class="shrink-0"
          onClick={onOpenSettings}
        >
          <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.611 3.611 0 0112 15.6z"/></svg>
        </Button>

        <Button
          inline
          tonal
          rounded
          small
          aria-label="Toggle color scheme"
          class="shrink-0"
          onClick={toggleTheme}
        >
          {#if themeMode === 'dark'}
            <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>
          {:else}
            <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/></svg>
          {/if}
        </Button>
      </div>

      <!-- Row 2: Language, View mode, Columns, Merged, Align, Font size -->
      <div class="flex items-center gap-2 flex-wrap">
        <span bind:this={langTarget} class="shrink-0">
          <Button
            inline
            tonal
            rounded
            small
            aria-label="Choose preview language"
            class="shrink-0 gap-1.5 whitespace-nowrap"
            onClick={() => langOpen = !langOpen}
          >
            <svg class="w-3.5 h-3.5 opacity-70" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 00-1.38-3.56A8.03 8.03 0 0118.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 015.08 16zm2.95-8H5.08a7.987 7.987 0 014.33-3.56A15.65 15.65 0 008.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 01-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>
            <span class="truncate max-w-[120px]">{selectedLanguage?.name ?? 'English'}</span>
            <Badge small>{selectedLanguage?.is_rtl ? 'RTL' : 'LTR'}</Badge>
          </Button>
        </span>

        <Segmented strong rounded class="w-auto shrink-0">
          <SegmentedButton active={viewMode === 'list'} aria-label="List view" onClick={() => onViewModeChanged('list')}>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zM9 5v4h12V5H9z"/></svg>
          </SegmentedButton>
          <SegmentedButton active={viewMode === 'card'} aria-label="Card view" onClick={() => onViewModeChanged('card')}>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>
          </SegmentedButton>
        </Segmented>

        {#if viewMode === 'card'}
          <Segmented strong rounded class="w-auto shrink-0">
            {#each [2, 3, 4, 5] as col}
              <SegmentedButton active={columns === col} onClick={() => onColumnsChanged(col)}>{col}</SegmentedButton>
            {/each}
          </Segmented>
        {/if}

        <Segmented strong rounded class="w-auto shrink-0">
          <SegmentedButton active={merged} onClick={() => onMergedChanged(true)}>Merged</SegmentedButton>
          <SegmentedButton active={!merged} onClick={() => onMergedChanged(false)}>Separate</SegmentedButton>
        </Segmented>

        <Segmented strong rounded class="w-auto shrink-0">
          {#each alignOptions as item}
            <SegmentedButton active={textAlign === item.v} aria-label="Align {item.v}" onClick={() => onTextAlignChanged(item.v)}>
              {#if item.v === 'left'}
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v2H3V3zm0 4h14v2H3V7zm0 4h18v2H3v-2zm0 4h14v2H3v-2zm0 4h18v2H3v-2z"/></svg>
              {:else if item.v === 'center'}
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v2H3V3zm4 4h10v2H7V7zm-4 4h18v2H3v-2zm4 4h10v2H7v-2zm-4 4h18v2H3v-2z"/></svg>
              {:else}
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v2H3V3zm4 4h14v2H7V7zm-4 4h18v2H3v-2zm4 4h14v2H7v-2zm-4 4h18v2H3v-2z"/></svg>
              {/if}
            </SegmentedButton>
          {/each}
        </Segmented>

        <!-- Font size slider -->
        <div class="flex-1 basis-56 min-w-0">
          <div class="flex items-center gap-2 px-1">
            <span class="text-[12px] font-semibold opacity-50 shrink-0 tabular-nums min-w-[2rem] text-right">{Math.round(fontSize)}px</span>
            <div class="flex-1 min-w-0">
              <Range
                value={fontSize}
                min={8}
                max={96}
                step={1}
                onInput={(e) => onFontSizeChanged(parseFloat((e.target as HTMLInputElement).value))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    {#if langOpen}
      <Popover
        opened
        target={langTarget || undefined}
        angle
        onBackdropClick={() => langOpen = false}
        class="w-80 max-w-[calc(100vw-24px)]"
      >
        <div class="p-2">
          <Searchbar
            value={langSearch}
            placeholder="Search languages"
            clearButton
            onInput={(e) => langSearch = (e.target as HTMLInputElement).value}
            onClear={() => langSearch = ''}
          />
        </div>
        <List inset strong class="!mt-0 !mb-2 max-h-72 overflow-y-auto">
          {#each filteredLangs(languages, langSearch) as lang}
            <ListItem
              title={lang.name}
              after={lang.is_rtl ? 'RTL' : 'LTR'}
              onClick={() => selectLanguage(lang)}
              class={lang.id === selectedLanguage?.id ? 'k-color-brand-primary' : ''}
            />
          {/each}
        </List>
      </Popover>
    {/if}
  {/if}
</Card>
