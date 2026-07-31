<script lang="ts">
  import {
    BlockTitle,
    Button,
    List,
    ListButton,
    ListInput,
    ListItem,
    Navbar,
    Page,
    Popup,
    Preloader,
  } from 'konsta/svelte';
  import { history } from '$lib/stores/history.svelte';
  import { absoluteTime, relativeTime } from '$lib/utils/time';
  import type { ImportHistoryEntry } from '$lib/types';

  let {
    onClose = () => {},
    onLoad = async (_source: string) => {},
  }: {
    onClose?: () => void;
    onLoad?: (source: string) => Promise<void>;
  } = $props();

  const PLACEHOLDER = `Inter
<link href="https://fonts.googleapis.com/css2?family=Amiri&family=Mirza&display=swap" rel="stylesheet">`;

  let source = $state('');
  let loading = $state(false);
  let error = $state('');

  async function run(value: string) {
    loading = true;
    error = '';
    try {
      await onLoad(value);
      onClose();
    } catch (reason) {
      error = reason instanceof Error ? reason.message : 'Could not import that font source.';
    } finally {
      loading = false;
    }
  }

  async function submit(event?: SubmitEvent) {
    event?.preventDefault();
    if (loading || !source.trim()) return;
    await run(source);
  }

  async function reimport(entry: ImportHistoryEntry) {
    if (loading) return;
    await run(entry.sources.join('\n'));
  }

  function familySummary(entry: ImportHistoryEntry): string {
    const names = entry.families;
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
  }

  function countSummary(entry: ImportHistoryEntry): string {
    const fonts = `${entry.font_count} ${entry.font_count === 1 ? 'font' : 'fonts'}`;
    const families = entry.families.length === 1 ? '1 family' : `${entry.families.length} families`;
    return `${fonts} · ${families}`;
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
          type="textarea"
          label="Family names, CSS URLs, or an embed snippet"
          placeholder={PLACEHOLDER}
          inputStyle="min-height: 7.5rem; font-family: ui-monospace, monospace; font-size: 0.8rem;"
          value={source}
          disabled={loading}
          onInput={(event) => {
            source = (event.target as HTMLTextAreaElement).value;
            error = '';
          }}
        />
      </List>

      {#if error}
        <div class="mx-6 -mt-2 text-sm text-red-500" role="alert">{error}</div>
      {/if}

      <div class="mx-6 mt-5 text-sm opacity-60 space-y-2">
        <p>
          Paste the whole <span class="font-semibold">&lt;link&gt;</span> or
          <span class="font-semibold">@import</span> embed code from Google Fonts to import every
          selected family at once — the <span class="font-semibold">preconnect</span> lines are ignored.
        </p>
        <p>You can also enter family names, a specimen or share URL, or direct CSS stylesheet URLs, one per line.</p>
        <p>Other providers must allow cross-origin stylesheet access.</p>
      </div>

      <div class="mx-6 mt-5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] p-3 text-xs opacity-60">
        Web fonts are fetched from their provider and require an internet connection. They are loaded for preview only and are not installed on your system.
      </div>

      <button type="submit" class="sr-only" aria-hidden="true" tabindex="-1">Add web fonts</button>
    </form>

    {#if history.entries.length}
      <BlockTitle>Import History</BlockTitle>
      <List inset strong class="max-h-[40vh] overflow-y-auto">
        {#each history.entries as entry (entry.id)}
          <ListItem
            link
            title={familySummary(entry)}
            subtitle={countSummary(entry)}
            text={`${relativeTime(entry.imported_at)} · ${absoluteTime(entry.imported_at)}`}
            onClick={() => reimport(entry)}
          />
        {/each}
      </List>

      <List inset strong>
        <ListButton
          onClick={() => history.clear()}
          colors={{ textIos: 'text-red-500', textMaterial: 'text-red-500' }}
        >
          Clear History
        </ListButton>
      </List>
    {/if}
  </Page>
</Popup>
