<script lang="ts">
  import { App, Preloader } from 'konsta/svelte';
  import '../app.css';
  import { onMount } from 'svelte';
  import { loadSettings } from '$lib/utils/settings';
  import { darkMode } from '$lib/utils/theme';

  let {
    children,
  }: {
    children?: import('svelte').Snippet;
  } = $props();

  let ready = $state(false);

  onMount(async () => {
    const s = await loadSettings();
    if (s.accent_color) {
      document.documentElement.style.setProperty('--color-brand-primary', s.accent_color);
    }
    ready = true;
  });
</script>

{#if ready}
  <App theme="ios" dark={$darkMode} class={$darkMode ? 'dark' : ''}>
    {#if children}{@render children()}{/if}
  </App>
{:else}
  <div class="flex items-center justify-center min-h-screen bg-black">
    <Preloader class="w-6 h-6 text-white" />
  </div>
{/if}
