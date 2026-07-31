import type { LanguageSample, TextAlign, ViewMode } from '$lib/types';
import { loadLanguages } from '$lib/utils/languages';
import { settings } from '$lib/stores/settings.svelte';

export type CardView = {
  text: string;
  rtl: boolean;
  align: TextAlign;
  language: LanguageSample | undefined;
  overridden: boolean;
};

/**
 * Preview appearance: what text is shown, in which language/direction, at what
 * size, and in which grid layout. Also owns per-family language overrides.
 */
class PreviewStore {
  languages = $state<LanguageSample[]>([]);
  selectedLanguage = $state<LanguageSample | undefined>(undefined);
  text = $state('');
  fontSize = $state(settings.current.default_font_size);
  textAlign = $state<TextAlign>('left');
  viewMode = $state<ViewMode>('card');
  columns = $state(3);
  merged = $state(true);

  /**
   * Per-family language overrides, keyed by family name so they survive
   * merged/separate switches and unkeyed `{#each}` re-renders.
   */
  languageOverrides = $state<Record<string, string>>({});

  readonly isRtl = $derived(this.selectedLanguage?.is_rtl ?? false);
  readonly columnsCount = $derived(this.viewMode === 'list' ? 1 : Math.min(this.columns, 5));

  init(): void {
    const languages = loadLanguages();
    const fallback = languages.find((l) => l.id === 'en_Latn') ?? languages[0];
    this.languages = languages;
    this.fontSize = settings.current.default_font_size;
    if (fallback) this.selectLanguage(fallback);
  }

  selectLanguage(lang: LanguageSample): void {
    this.selectedLanguage = lang;
    this.text = this.sampleText(lang);
    this.textAlign = lang.is_rtl ? 'right' : 'left';
  }

  /** Re-reads sample text after settings change, unless the user typed their own. */
  refreshFromSettings(): void {
    this.fontSize = settings.current.default_font_size;
    if (this.selectedLanguage) this.text = this.sampleText(this.selectedLanguage);
  }

  sampleText(lang: LanguageSample): string {
    return settings.customText(lang.id) ?? lang.tester;
  }

  setFontSize(value: number): void {
    this.fontSize = value;
    void settings.patch({ default_font_size: value });
  }

  setCardLanguage(familyName: string, lang: LanguageSample | null): void {
    if (!lang) {
      const { [familyName]: _removed, ...rest } = this.languageOverrides;
      this.languageOverrides = rest;
      return;
    }
    this.languageOverrides = { ...this.languageOverrides, [familyName]: lang.id };
  }

  clearOverrides(): void {
    this.languageOverrides = {};
  }

  /** Resolves what a single card should render, honouring its override. */
  cardView(familyName: string): CardView {
    const overrideId = this.languageOverrides[familyName];
    const override = overrideId ? this.languages.find((l) => l.id === overrideId) : undefined;

    if (!override) {
      return {
        text: this.text,
        rtl: this.isRtl,
        align: this.textAlign,
        language: this.selectedLanguage,
        overridden: false,
      };
    }

    return {
      text: this.sampleText(override),
      rtl: override.is_rtl,
      // Centre is direction-agnostic; otherwise follow the override's own direction,
      // matching what the toolbar does when the global language changes.
      align: this.textAlign === 'center' ? 'center' : override.is_rtl ? 'right' : 'left',
      language: override,
      overridden: true,
    };
  }
}

export const preview = new PreviewStore();
