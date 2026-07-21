<script lang="ts">
  import { Button, Card, Range, Preloader } from 'konsta/svelte';
  import type { FontFamily } from '$lib/types';
  import { availableWeights, hasItalic, weightLabel } from '$lib/utils/family-utils';
  import { isFontLoaded, loadFontFamily } from '$lib/utils/font-loader';

  let {
    family,
    previewText = '',
    fontSize = 28,
    rtl = false,
    textAlign = 'left',
  }: {
    family: FontFamily;
    previewText?: string;
    fontSize?: number;
    rtl?: boolean;
    textAlign?: string;
  } = $props();

  let loaded = $state(false);
  let loading = $state(false);
  let loadError = $state(false);
  let boldOn = $state(false);
  let italicOn = $state(false);
  let snapMode = $state(true);
  let weight = $state(400);
  let mounted = $state(true);

  $effect(() => {
    mounted = true;
    return () => { mounted = false; };
  });

  $effect(() => {
    const familyName = family.name;

    loaded = false;
    loading = false;
    loadError = false;
    boldOn = false;
    italicOn = false;
    weight = 400;

    if (isFontLoaded(familyName)) {
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
</Card>
