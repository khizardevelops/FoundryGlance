<script lang="ts">
  import { BlockTitle, Button, List, ListInput, Navbar, Page, Popup, Preloader } from 'konsta/svelte';

  let {
    onClose = () => {},
    onLoad = async (_source: string) => {},
  }: {
    onClose?: () => void;
    onLoad?: (source: string) => Promise<void>;
  } = $props();

  let source = $state('');
  let loading = $state(false);
  let error = $state('');

  async function submit(event?: SubmitEvent) {
    event?.preventDefault();
    if (loading || !source.trim()) return;

    loading = true;
    error = '';
    try {
      await onLoad(source);
      onClose();
    } catch (reason) {
      error = reason instanceof Error ? reason.message : 'Could not import that font source.';
    } finally {
      loading = false;
    }
  }
</script>

<Popup opened onBackdropClick={() => { if (!loading) onClose(); }}>
  <Page>
    <Navbar title="Add Web Fonts">
      {#snippet left()}
        <Button inline clear disabled={loading} onClick={onClose}>Cancel</Button>
      {/snippet}
      {#snippet right()}
        <Button inline clear disabled={loading || !source.trim()} onClick={() => submit()}>
          {#if loading}
            <Preloader class="w-4 h-4" />
          {:else}
            Add
          {/if}
        </Button>
      {/snippet}
    </Navbar>

    <form onsubmit={submit}>
      <BlockTitle>Font Source</BlockTitle>
      <List inset strong>
        <ListInput
          type="text"
          label="Google Fonts family or CSS URL"
          placeholder="Inter"
          value={source}
          disabled={loading}
          clearButton
          onInput={(event) => {
            source = (event.target as HTMLInputElement).value;
            error = '';
          }}
          onClear={() => {
            source = '';
            error = '';
          }}
        />
      </List>

      {#if error}
        <div class="mx-6 -mt-2 text-sm text-red-500" role="alert">{error}</div>
      {/if}

      <div class="mx-6 mt-5 text-sm opacity-60 space-y-2">
        <p>Enter a family name such as <span class="font-semibold">Inter</span>, a Google Fonts specimen or embed URL, or a direct CSS stylesheet URL.</p>
        <p>Family names load the standard weights and italic styles that Google Fonts provides. Other providers must allow cross-origin stylesheet access.</p>
      </div>

      <div class="mx-6 mt-5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] p-3 text-xs opacity-60">
        Web fonts are fetched from their provider and require an internet connection. They are loaded for preview only and are not installed on your system.
      </div>

      <button type="submit" class="sr-only" aria-hidden="true" tabindex="-1">Add web fonts</button>
    </form>
  </Page>
</Popup>
