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
    Range,
    Searchbar,
  } from 'konsta/svelte';
  import type { AppSettings, LanguageSample } from '$lib/types';
  import { settings as settingsStore, defaultSettings } from '$lib/stores/settings.svelte';
  import { theme } from '$lib/stores/theme.svelte';
  import { ACCENT_COLORS, DEFAULT_ACCENT } from '$lib/utils/accent';

  let {
    settings,
    languages,
    onClose = () => {},
    onSaved = () => {},
  }: {
    settings: AppSettings;
    languages: LanguageSample[];
    onClose?: () => void;
    onSaved?: () => void;
  } = $props();

  function cloneSettings(value: AppSettings): AppSettings {
    return {
      default_font_size: value.default_font_size,
      custom_texts: { ...value.custom_texts },
      accent_color: value.accent_color ?? DEFAULT_ACCENT,
      theme_mode: value.theme_mode ?? 'system',
    };
  }

  // svelte-ignore state_referenced_locally
  let edit = $state<AppSettings>(cloneSettings(settings));
  let langSearch = $state('');
  // svelte-ignore state_referenced_locally
  let langCustomTexts = $state<Record<string, string>>({ ...settings.custom_texts });

  const visibleLanguages = $derived.by(() => {
    if (!langSearch) return languages;
    const q = langSearch.toLowerCase();
    return languages.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q) ||
        l.tester.toLowerCase().includes(q)
    );
  });

  async function save() {
    // The accent reaches the UI through the Konsta brand class the layout derives
    // from settings.accent_color — there is no CSS variable to poke here.
    await settingsStore.save({
      default_font_size: edit.default_font_size,
      custom_texts: { ...langCustomTexts },
      accent_color: edit.accent_color,
    });
    onSaved();
    onClose();
  }

  async function reset() {
    await settingsStore.reset();
    edit = cloneSettings(defaultSettings);
    langCustomTexts = {};
    onSaved();
    onClose();
  }

  function setCustomText(id: string, value: string) {
    if (value.trim()) {
      langCustomTexts[id] = value;
    } else {
      delete langCustomTexts[id];
    }
  }
</script>

<Popup opened onBackdropClick={onClose}>
  <Page>
    <Navbar title="Settings">
      {#snippet left()}
        <Button inline clear onClick={onClose}>Cancel</Button>
      {/snippet}
      {#snippet right()}
        <Button inline clear onClick={save}>Done</Button>
      {/snippet}
    </Navbar>

    <!-- Preview Size section -->
    <BlockTitle>Preview</BlockTitle>
    <List inset strong>
      <ListItem
        title="Default Preview Size"
        after={`${Math.round(edit.default_font_size)}px`}
      />
      <ListItem>
        {#snippet inner()}
          <Range
            value={edit.default_font_size}
            min={12}
            max={64}
            step={1}
            onInput={(e) => { edit.default_font_size = parseFloat((e.target as HTMLInputElement).value); }}
          />
        {/snippet}
      </ListItem>
    </List>

    <!-- Theme section -->
    <BlockTitle>Theme</BlockTitle>
    <List inset strong>
      <ListItem title="Accent Color">
        {#snippet inner()}
          <div class="flex items-center gap-3 overflow-x-auto py-3">
            {#each ACCENT_COLORS as color}
              <button
                class="w-8 h-8 rounded-full shrink-0 border-[3px] transition-transform active:scale-95"
                class:border-black={edit.accent_color === color.value && !theme.dark}
                class:border-white={edit.accent_color === color.value && theme.dark}
                class:border-transparent={edit.accent_color !== color.value}
                style="background-color: {color.value};"
                aria-label="Set accent color to {color.name}"
                onclick={() => edit.accent_color = color.value}
              ></button>
            {/each}
          </div>
        {/snippet}
      </ListItem>
    </List>

    <!-- Custom Preview Sentences section -->
    <BlockTitle>Custom Preview Sentences</BlockTitle>

    <List inset strong>
      <ListInput
        type="search"
        placeholder="Search languages"
        value={langSearch}
        clearButton
        onInput={(e) => { langSearch = (e.target as HTMLInputElement).value; }}
        onClear={() => { langSearch = ''; }}
      />
    </List>

    <!-- Language custom text inputs -->
    <List inset strong class="max-h-[35vh] overflow-y-auto scrollbar-thin !my-4">
      {#each visibleLanguages as lang}
        <ListInput
          type="textarea"
          label={lang.name}
          value={langCustomTexts[lang.id] ?? ''}
          placeholder={lang.tester}
          onInput={(e) => setCustomText(lang.id, (e.target as HTMLTextAreaElement).value)}
        />
      {/each}
    </List>

    <!-- Reset — own section, clearly destructive -->
    <BlockTitle>Danger Zone</BlockTitle>
    <List inset strong>
      <ListButton
        onClick={reset}
        colors={{ textIos: 'text-red-500', textMaterial: 'text-red-500' }}
      >
        Reset to Defaults
      </ListButton>
    </List>
  </Page>
</Popup>
