<script lang="ts">
  import { onMount } from 'svelte';
  import { Card } from 'konsta/svelte';
  import { filesFromDataTransfer } from '$lib/utils/browser-fonts';

  let {
    enabled = true,
    onFolderDropped = (_path: string) => {},
    onFilesDropped = (_files: File[]) => {},
    children,
  }: {
    enabled?: boolean;
    onFolderDropped?: (path: string) => void;
    onFilesDropped?: (files: File[]) => void;
    children?: import('svelte').Snippet;
  } = $props();

  let dragging = $state(false);
  let dragCounter = 0;

  function isTauriRuntime(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  onMount(() => {
    if (!isTauriRuntime()) return;

    let unlisten: (() => void) | undefined;

    import('@tauri-apps/api/window').then(({ getCurrentWindow }) =>
      getCurrentWindow().onDragDropEvent((event) => {
        if (!enabled) return;
        if (event.payload.type === 'enter' || event.payload.type === 'over') {
          dragging = true;
        } else if (event.payload.type === 'leave') {
          dragging = false;
        } else if (event.payload.type === 'drop') {
          dragging = false;
          const path = event.payload.paths[0];
          if (path) onFolderDropped(path);
        }
      })
    ).then((fn) => {
      unlisten = fn;
    }).catch(() => {});

    return () => {
      unlisten?.();
    };
  });

  function handleDragEnter(e: DragEvent) {
    if (!enabled) return;
    e.preventDefault();
    dragCounter++;
    dragging = true;
  }

  function handleDragOver(e: DragEvent) {
    if (!enabled) return;
    e.preventDefault();
  }

  function handleDragLeave() {
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dragging = false;
    }
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragCounter = 0;
    dragging = false;
    if (!enabled) return;
    if (isTauriRuntime()) return;

    const path = (e.dataTransfer?.files?.[0] as ({ path?: string } | undefined))?.path;
    if (path) {
      onFolderDropped(path);
      return;
    }

    if (e.dataTransfer) {
      const files = await filesFromDataTransfer(e.dataTransfer);
      if (files.length) onFilesDropped(files);
    }
  }
</script>

<div
  class="relative min-h-screen"
  role="region"
  ondragenter={handleDragEnter}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  {#if dragging && enabled}
    <div class="absolute inset-0 z-50 flex items-center justify-center bg-primary/5 backdrop-blur-sm transition-all">
      <Card outline class="text-center">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-50 text-primary" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
        </svg>
        <p class="text-base font-semibold">Drop font folder here</p>
        <p class="text-xs opacity-50 mt-1">Supports .ttf and .otf files</p>
      </Card>
    </div>
  {/if}
  {@render children?.()}
</div>
