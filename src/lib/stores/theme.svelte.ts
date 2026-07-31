import type { ThemeMode, ThemePreference } from '$lib/types';
import { settings } from '$lib/stores/settings.svelte';

/**
 * The persisted preference is the source of truth. 'system' is only the
 * first-run default — once the user toggles, that choice is saved and the OS
 * preference no longer overrides it on reload.
 */
class ThemeStore {
  preference = $state<ThemePreference>('system');
  systemDark = $state(false);

  readonly dark = $derived(
    this.preference === 'system' ? this.systemDark : this.preference === 'dark'
  );
  readonly mode = $derived<ThemeMode>(this.dark ? 'dark' : 'light');

  #listening = false;

  /** Call after settings have loaded. */
  init(preference: ThemePreference = 'system'): void {
    this.preference = preference;

    if (this.#listening || typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemDark = query.matches;
    query.addEventListener('change', (event) => {
      this.systemDark = event.matches;
    });
    this.#listening = true;
  }

  /** Re-reads the preference after settings are saved or reset elsewhere. */
  sync(preference: ThemePreference = 'system'): void {
    this.preference = preference;
  }

  set(mode: ThemePreference): void {
    this.preference = mode;
    void settings.patch({ theme_mode: mode });
  }

  toggle(): void {
    this.set(this.dark ? 'light' : 'dark');
  }
}

export const theme = new ThemeStore();
