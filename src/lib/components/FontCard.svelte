<script lang="ts">
  import { Button, Card, Range, Preloader } from 'konsta/svelte';
  import LanguageMenu from '$lib/components/LanguageMenu.svelte';
  import type { FontFamily, LanguageSample } from '$lib/types';
  import { availableWeights, hasItalic, weightLabel } from '$lib/utils/family-utils';
  import { languageShortCode } from '$lib/utils/languages';
  import { isFontLoaded, loadFontFamily } from '$lib/utils/font-loader';

  let {
    family,
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
  let boldOn = $state(false);
  let italicOn = $state(false);
  let snapMode = $state(true);
  let weight = $state(400);
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
    boldOn = false;
    italicOn = false;
    weight = 400;

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

  const weights = $derived(availableWeights(family));
  const hasItalicVariant = $derived(hasItalic(family));

  function snap(v: number): number {
    if (weights.length === 0) return Math.round(v);
    let best = weights[0];
    let bestDiff = Math.abs(best - v);
    for (const w of weights) {
      const d = Math.abs(w - v);
      if (d < bestDiff) {
        bestDiff = d;
        best = w;
      }
    }
    return best;
  }

  const displayWeight = $derived(boldOn ? (snapMode ? snap(weight) : Math.round(weight)) : null);
  const effectiveText = $derived(previewText || family.name);

  const badges = $derived(
    weights.length <= 4
      ? weights.map((w) => weightLabel(w)).join(' · ')
      : `${weights.length} weights`
  );
</script>

<Card
  outline
  contentWrap={false}
  contentWrapPadding=""
  class="!my-0 !mx-0 h-full flex flex-col group transition-shadow hover:shadow-md"
>
  <!-- Card Content (Top) -->
  <div class="p-3 flex-1 flex flex-col min-h-0">
    <!-- Header row -->
    <div class="flex items-center justify-between gap-2 mb-2 opacity-60">
      <span class="text-[12px] font-semibold tracking-tight truncate">{family.name}</span>
      {#if badges}
        <span class="text-[10px] font-medium tracking-wide uppercase shrink-0">{badges}</span>
      {/if}
    </div>

    <!-- Preview Area -->
    <div class="flex-1 flex items-center min-h-[40px]" style="text-align: {textAlign}">
      {#if loading}
        <Preloader class="w-4 h-4 mx-auto opacity-50" />
      {:else if loadError}
        <span class="text-xs opacity-40 mx-auto">Failed to load</span>
      {:else}
        <div
          class="w-full leading-snug overflow-hidden"
          style="
            font-family: {loaded ? `'${family.name}'` : 'inherit'};
            font-size: {fontSize}px;
            font-weight: {displayWeight ?? 400};
            font-style: {italicOn ? 'italic' : 'normal'};
            direction: {rtl ? 'rtl' : 'ltr'};
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
          "
        >
          {effectiveText}
        </div>
      {/if}
    </div>
  </div>

  <!-- Controls (Bottom) - Using a subtle iOS style frosted/tinted bar instead of a heavy divider -->
  <div class="px-3 py-2 bg-black/[0.03] dark:bg-white/[0.05] border-t border-black/[0.05] dark:border-white/[0.05] flex items-center gap-1.5 transition-opacity">
    <!-- Bold toggle -->
    <Button
      inline
      tonal={!boldOn}
      clear={!boldOn}
      rounded
      small
      class="font-bold shrink-0 !w-7 !h-7 !min-w-0 !p-0 flex items-center justify-center text-xs"
      onClick={() => {
        boldOn = !boldOn;
        if (boldOn && weight === 400) {
          weight = weights.includes(700) ? 700 : (weights.length > 0 ? weights[weights.length - 1] : 700);
        }
      }}
    >B</Button>

    <!-- Italic toggle -->
    <Button
      inline
      tonal={!italicOn}
      clear={!italicOn}
      rounded
      small
      class="italic shrink-0 !w-7 !h-7 !min-w-0 !p-0 flex items-center justify-center text-xs"
      disabled={!hasItalicVariant}
      onClick={() => { if (hasItalicVariant) italicOn = !italicOn; }}
    >I</Button>

    <!-- Per-card language -->
    <span bind:this={langTarget} class="shrink-0">
      <Button
        inline
        tonal={!languageOverridden}
        clear={!languageOverridden}
        rounded
        small
        aria-label="Preview language for {family.name}: {activeLanguage?.name ?? 'default'}"
        title={activeLanguage?.name ?? 'Preview language'}
        class="shrink-0 !h-7 !min-w-0 !px-1.5 flex items-center justify-center gap-1 text-[10px] font-semibold"
        onClick={() => langOpen = !langOpen}
      >
        <svg class="w-3.5 h-3.5 opacity-70" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 00-1.38-3.56A8.03 8.03 0 0118.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 015.08 16zm2.95-8H5.08a7.987 7.987 0 014.33-3.56A15.65 15.65 0 008.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 01-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>
        {#if languageOverridden && activeLanguage}
          <span class="tabular-nums">{languageShortCode(activeLanguage)}</span>
        {/if}
      </Button>
    </span>

    <!-- Weight slider -->
    {#if boldOn && weights.length > 1}
      <div class="flex flex-1 items-center gap-2 min-w-0 ml-1">
        <span class="text-[10px] font-medium opacity-40 shrink-0 tabular-nums min-w-[1.5rem] text-right">{displayWeight}</span>
        <Range
          value={weight}
          min={100}
          max={900}
          step={1}
          onInput={(e) => weight = parseFloat((e.target as HTMLInputElement).value)}
          class="flex-1 min-w-0"
        />

      </div>
    {/if}
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
