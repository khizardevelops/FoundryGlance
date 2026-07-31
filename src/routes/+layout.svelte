<script lang="ts">
  import { App, Preloader } from 'konsta/svelte';
  import '../app.css';
  import { onMount } from 'svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { history } from '$lib/stores/history.svelte';
  import { library } from '$lib/stores/library.svelte';
  import { theme } from '$lib/stores/theme.svelte';
  import { preview } from '$lib/stores/preview.svelte';

  let {
    children,
  }: {
    children?: import('svelte').Snippet;
  } = $props();

  let ready = $state(false);

  onMount(async () => {
    // Settings first: the theme preference and accent both come from them.
    await settings.load();
    theme.init(settings.current.theme_mode);
    preview.init();
    void history.load();

    ready = true;
    // Rehydrating the last font set can hit the network, so it runs after first
    // paint; the page shows its own scanning indicator meanwhile.
    void library.restore();
  });
</script>

{#if ready}
  <!--
    The accent class carries Konsta's derived `--k-color-*` tokens down the tree.
    Konsta bakes those tokens at build time, so this class swap - not a CSS
    variable assignment - is what actually changes the accent at runtime.
  -->
  <App
    theme="ios"
    dark={theme.dark}
    class="{theme.dark ? 'dark' : ''} {settings.accentClass}"
  >
    {#if children}{@render children()}{/if}
  </App>
{:else}
  <div class="flex items-center justify-center min-h-screen bg-black">
    <Preloader class="w-6 h-6 text-white" />
  </div>
{/if}
