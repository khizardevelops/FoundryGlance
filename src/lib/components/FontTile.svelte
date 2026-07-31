<script lang="ts">
  import { Badge, Button, Card, Preloader } from 'konsta/svelte';
  import LanguageMenu from '$lib/components/LanguageMenu.svelte';
  import type { FontFamily, FontFile, LanguageSample } from '$lib/types';
  import { languageShortCode } from '$lib/utils/languages';
  import { isFontLoaded, loadFontFamily } from '$lib/utils/font-loader';

  let {
    family,
    font,
    previewText = '',
    fontSize = 28,
    rtl = false,
    textAlign = 'left',
    languages = [] as LanguageSample[],
    activeLanguage = undefined as LanguageSample | undefined,
    languageOverridden = false,
    onLanguageChanged = ((_l: LanguageSample | null) => {}) as (l: LanguageSample | null) => void,
  }: {
    family: FontFamily;
    font: FontFile;
    previewText?: string;
    fontSize?: number;
    rtl?: boolean;
    textAlign?: string;
    languages?: LanguageSample[];
    activeLanguage?: LanguageSample;
    languageOverridden?: boolean;
    onLanguageChanged?: (l: LanguageSample | null) => void;
  } = $props();

  let loaded = $state(false);
  let loading = $state(false);
  let loadError = $state(false);
  let mounted = $state(true);
  let langOpen = $state(false);
  let langTarget = $state<HTMLElement | null>(null);

  $effect(() => {
    mounted = true;
    return () => { mounted = false; };
  });

  $effect(() => {
    loaded = false;
    loading = false;
    loadError = false;

    if (isFontLoaded(family)) {
      loaded = true;
      return;
    }

    loading = true;
    loadFontFamily(family).then(() => {
      if (mounted) {
        loaded = true;
        loading = false;
      }
    }).catch(() => {
      if (mounted) {
        loading = false;
        loadError = true;
      }
    });
  });

  const effectiveText = $derived(previewText || family.name);
</script>

<Card
  outline
  contentWrap={false}
  contentWrapPadding=""
  class="!my-0 !mx-0 overflow-hidden flex flex-col group transition-shadow hover:shadow-md"
>
  <div class="p-3 flex flex-col">
    <!-- Header Row -->
    <div class="flex items-center justify-between gap-2 mb-2 opacity-60">
      <span class="text-[12px] font-semibold tracking-tight truncate">{family.name}</span>
      <div class="flex items-center gap-1 shrink-0">
        <span class="text-[10px] font-medium tracking-wide uppercase bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-sm">{font.subfamily}</span>
        <span class="text-[10px] font-medium tracking-wide uppercase bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-sm">w{font.weight}</span>
        {#if font.is_italic}
          <span class="text-[10px] font-medium tracking-wide uppercase bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-sm italic">Italic</span>
        {/if}
        <span bind:this={langTarget} class="shrink-0">
          <Button
            inline
            tonal={!languageOverridden}
            clear={!languageOverridden}
            rounded
            small
            aria-label="Preview language for {family.name}: {activeLanguage?.name ?? 'default'}"
            title={activeLanguage?.name ?? 'Preview language'}
            class="shrink-0 !h-5 !min-w-0 !px-1 flex items-center justify-center gap-0.5 text-[9px] font-semibold"
            onClick={() => langOpen = !langOpen}
          >
            <svg class="w-3 h-3 opacity-70" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 00-1.38-3.56A8.03 8.03 0 0118.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 015.08 16zm2.95-8H5.08a7.987 7.987 0 014.33-3.56A15.65 15.65 0 008.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 01-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>
            {#if languageOverridden && activeLanguage}
              <span class="tabular-nums">{languageShortCode(activeLanguage)}</span>
            {/if}
          </Button>
        </span>
      </div>
    </div>

    <!-- Preview Text -->
    <div class="min-h-[30px]">
      {#if loading}
        <Preloader class="w-4 h-4 mx-auto opacity-50" />
      {:else if loadError}
        <span class="text-xs opacity-40">Failed to load font</span>
      {:else}
        <div
          class="leading-snug overflow-hidden"
          style="
            font-family: {loaded ? `'${family.name}'` : 'inherit'};
            font-size: {fontSize}px;
            font-weight: {font.weight};
            font-style: {font.is_italic ? 'italic' : 'normal'};
            direction: {rtl ? 'rtl' : 'ltr'};
            text-align: {textAlign};
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          "
        >
          {effectiveText}
        </div>
      {/if}
    </div>
  </div>

  {#if langOpen}
    <LanguageMenu
      {languages}
      selectedId={activeLanguage?.id}
      target={langTarget || undefined}
      resetLabel={languageOverridden ? 'Use toolbar language' : ''}
      onSelect={(lang) => onLanguageChanged(lang)}
      onReset={() => onLanguageChanged(null)}
      onClose={() => langOpen = false}
    />
  {/if}
</Card>
