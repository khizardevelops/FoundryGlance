<script lang="ts">
  import { Badge, Card, Preloader } from 'konsta/svelte';
  import type { FontFamily, FontFile } from '$lib/types';
  import { isFontLoaded, loadFontFamily } from '$lib/utils/font-loader';

  let {
    family,
    font,
    previewText = '',
    fontSize = 28,
    rtl = false,
    textAlign = 'left',
  }: {
    family: FontFamily;
    font: FontFile;
    previewText?: string;
    fontSize?: number;
    rtl?: boolean;
    textAlign?: string;
  } = $props();

  let loaded = $state(false);
  let loading = $state(false);
  let loadError = $state(false);
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
</Card>
