<script lang="ts">
  import { List, ListItem, Popover, Searchbar } from 'konsta/svelte';
  import type { LanguageSample } from '$lib/types';

  let {
    languages = [] as LanguageSample[],
    selectedId = undefined as string | undefined,
    target = undefined as HTMLElement | undefined,
    resetLabel = '' as string,
    onSelect = ((_l: LanguageSample) => {}) as (l: LanguageSample) => void,
    onReset = (() => {}) as () => void,
    onClose = (() => {}) as () => void,
  } = $props();

  let search = $state('');

  const matches = $derived.by(() => {
    const query = search.trim().toLowerCase();
    if (!query) return languages;
    return languages.filter(
      (l) =>
        l.name.toLowerCase().includes(query) ||
        l.id.toLowerCase().includes(query) ||
        l.tester.toLowerCase().includes(query)
    );
  });

  function select(lang: LanguageSample) {
    onSelect(lang);
    search = '';
    onClose();
  }

  function reset() {
    onReset();
    search = '';
    onClose();
  }
</script>

<Popover
  opened
  target={target || undefined}
  angle
  onBackdropClick={onClose}
  class="w-80 max-w-[calc(100vw-24px)]"
>
  <div class="p-2">
    <Searchbar
      value={search}
      placeholder="Search languages"
      clearButton
      onInput={(e) => search = (e.target as HTMLInputElement).value}
      onClear={() => search = ''}
    />
  </div>

  {#if resetLabel}
    <List inset strong class="!mt-0 !mb-2">
      <ListItem title={resetLabel} onClick={reset} />
    </List>
  {/if}

  <List inset strong class="!mt-0 !mb-2 max-h-72 overflow-y-auto">
    {#each matches as lang}
      <ListItem
        title={lang.name}
        after={lang.is_rtl ? 'RTL' : 'LTR'}
        onClick={() => select(lang)}
        class={lang.id === selectedId ? 'k-color-brand-primary' : ''}
      />
    {/each}
  </List>
</Popover>
