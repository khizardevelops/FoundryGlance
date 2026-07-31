# Decisions

## Active Decisions

- **Organizing state is not persisting it**: every store must state where its state survives to. Current answers — `settings` and `history`: Tauri JSON file, localStorage fallback. `library`: a `SessionSource` pointer in localStorage, replayed on boot. `preview` and `theme.systemDark`: deliberately in-memory only. A store with no persistence answer is a bug waiting to be reported (see BUG-003).
- **Every Tauri-backed store needs a browser fallback**: `invoke` throws without a Tauri runtime, and `bun run dev` is a supported workflow. Catching that and falling back to in-memory defaults silently breaks persistence in dev; fall back to localStorage instead.
- **Persisted theme preference beats the OS**: `AppSettings.theme_mode` is `'light' | 'dark' | 'system'`. `system` is only the first-run default; once the user toggles, the stored value wins on every load. `theme.dark` is derived from preference plus a live `matchMedia` listener, so `system` also tracks OS changes without a reload.
- **Rust `AppSettings` fields all carry `#[serde(default)]`**: a settings.json from an older build (or the pre-port Flutter app, which is what is actually on disk) otherwise fails to deserialize and is silently replaced with defaults.
- **Session restore stores the source, never the fonts**: font bytes, `File` handles, and Blob URLs cannot be serialized, and a directory may have changed. Restoring re-runs the scan or re-fetches the stylesheet, and passes `record: false` so replaying does not pollute import history.
- **State lives in runes store modules, not components**: `src/lib/stores/*.svelte.ts` export singleton class instances holding `$state`/`$derived` fields (`settings`, `theme`, `preview`, `library`, `history`). Svelte 5 runes are the framework's own state primitive, so no external state library is warranted. Components read `store.field` directly and call store methods; `+page.svelte` is wiring only. Replaced the old `writable` store in `utils/theme.ts` and the module-level `_current` in `utils/settings.ts`, both deleted.
- **Accent colour switches by Konsta brand class, never by CSS variable**: Konsta bakes `--k-color-*` from `--color-brand-*` at build time, so runtime variable assignment is a no-op. Every selectable accent must be declared as `--color-brand-<name>` in `app.css` AND listed in `ACCENT_COLORS` (`utils/accent.ts`); the layout puts `settings.accentClass` on the `<App>` root. See BUG-002.
- **Import history persists via its own Rust command pair**: `load_history` / `save_history` / `clear_history` write `~/.config/foundryglance/history.json`, mirroring the settings commands rather than adding `tauri-plugin-store`. Keeps the dual-mode fallback pattern (localStorage outside Tauri) and adds no Cargo/capability changes. Capped at 200 entries in Rust.
- **History entries dedupe by source set**: re-importing the same stylesheet URLs moves the existing entry to the top with a fresh timestamp instead of appending a duplicate.
- **Timestamps use `Intl`, not a date library**: `utils/time.ts` wraps `Intl.RelativeTimeFormat` and `toLocaleString` for "2 minutes ago · 31 Jul 2026, 19:27". Locale-aware with no dependency.

- **Svelte 5 runes throughout**: Use `$state`, `$derived`, `$effect`, `$props()` without generic type args; annotate destructured variables directly with TS types. `$props<Type>()` is NOT supported in this Svelte version.
- **`$props()` defaults**: Use regular JS defaults with type annotations on the destructuring pattern, e.g. `let { x = 5 }: { x: number } = $props()`. Do NOT use `$props<number>()` as a default value.
- **Layout → page data flow**: Page manages its own theme/settings state locally instead of receiving via layout `{@render children(args)}` (Svelte 5 snippets don't accept render-time arguments in SvelteKit).
- **Hex color format**: 6-char `#RRGGBB` on frontend at all times. Rust `normalize_color` function strips legacy 8-char `#AARRGGBB` to `#RRGGBB`.
- **Konsta UI components**: Always use Konsta `<Range>`, `<Toggle>`, `<Preloader>` instead of native HTML equivalents. Import from `konsta/svelte`.
- **Konsta Card for custom containers**: Use `<Card contentWrap={false}>` with `{#snippet header()}` / `{#snippet footer()}` for custom card layouts (toolbar, font cards). Do NOT use `<Glass>` as a general-purpose container.
- **Konsta CSS rules**: Import `konsta/svelte/theme.css` in `app.css`, NOT in layout. Use `--color-brand-*` for custom colors. Never override `--k-color-*` internal variables. Never target `.k-*` internal classes.
- **Konsta Button onClick**: Always use `onClick` prop (capital C), never DOM `onclick`.
- **Konsta ListItem for Range slider**: Use `<ListItem>{#snippet inner()}<Range .../>{/snippet}</ListItem>` pattern, never raw `<li>` wrappers.
- **Shared dark mode**: Use the `theme` store (`src/lib/stores/theme.svelte.ts`) for app-wide theme state. Layout passes `theme.dark` into Konsta `<App dark>` and applies the `.dark` class on the App root; pages/components should not keep independent dark state. `theme.initFromSystem()` seeds it from `prefers-color-scheme` on mount.
- **Settings dialog deep copy**: Do not use `structuredClone()` on Svelte proxy props. Clone settings with a plain object copy for edit-in-place. The same applies before sending state across the Tauri boundary — `history.persist()` uses `$state.snapshot()` so `invoke` receives a plain array.
- **Popover dismissal**: Use default backdrop behavior (do not set `backdrop={false}`) so clicking outside dismisses the popover.
- **External font imports**: Accept Google Fonts names/specimen/embed URLs and direct HTTP(S) CSS URLs. Never inject a provider stylesheet verbatim; parse and reconstruct only sanitized `@font-face` rules, reject credentialed/data URLs, and require CORS-enabled stylesheet fetching.
- **Remote font loading**: Store a sanitized external stylesheet on each imported `FontFamily`. Inject each source once and let CSS lazily fetch only the variants used by the previews; remove injected styles in `clearFonts`.
- **External font input is a list, not a value**: `parseExternalFontSources` always returns an array of stylesheet URLs. Markup input (`<link>` tags, `@import` rules) wins over plain-text parsing; only when no markup is present does the input get split by line. Capped at 24 stylesheets per import.
- **`<link>` tags are filtered by `rel`**: Keep only `rel` containing `stylesheet`, `rel="preload"` with `as="style"`, or a missing `rel`. This is what makes pasting Google's full embed snippet work — its two leading `preconnect` lines must be skipped, not fetched. See BUG-001 in bugs.md.
- **Comma-splitting only for non-URLs**: Google css2 URLs legitimately contain commas (`family=Amiri:ital,wght@0,400`), so a line is comma-split into family names only when `looksLikeUrl` is false.
- **css2 specs are detected before URL parsing**: `new URL('Inter:wght@100..900')` succeeds with scheme `inter:`, so `normalizeExternalFontSource` checks `looksLikeUrl` first and routes anything else to the Google family/css2 builders.
- **Per-family CSS scoping**: An imported family carries only its own `@font-face` rules, keyed `<sorted source urls>#<family>`. This keeps families that appear in several stylesheets merged into one card with no duplicated rule injection.
- **Per-card language overrides live in the page, keyed by family name**: `{#each}` blocks here are unkeyed, so Svelte reuses card components by index — component-local override state would follow the grid slot, not the typeface. `+page.svelte` owns `languageOverrides` and resolves each card's text/direction/alignment through `cardView(familyName)`. Keying by family (not font path) also keeps an override applied across merged/separate view switches and to every variant of a family.
- **Overrides are session-only**: `setScanResult` clears `languageOverrides`; nothing is persisted to settings. A new scan or import starts clean.
- **Override alignment follows the override's direction**: an overridden card computes `rtl ? 'right' : 'left'`, mirroring what the toolbar already does when the global language changes. `center` is direction-agnostic and is preserved from the global setting.
- **One shared `LanguageMenu`**: the search + list + selection popover exists once and is used by the toolbar and both card types. Callers supply the trigger button and `target`; the menu owns its own search state.
- **Partial import failures are warnings, not errors**: `fetchExternalFonts` returns `{ result, warnings }` and only throws when every source fails. `+page.svelte` renders the warnings in a banner so one bad family cannot block a bulk paste.

## Rejected Options

- **`slot`-based layout**: Replaced with `{@render children()}` snippet syntax for Svelte 5 compatibility.
- **`<Glass>` as general container**: Replaced with `<Card>` which provides proper iOS card styling, automatic hairline dividers, and theme-aware colors.
- **Custom CSS for Konsta components**: Removed all custom CSS targeting Konsta internals (`.toolbar-glass`, `.lang-menu-item`, `.k-list-button-destructive`, `.settings-range-row`).
- **Manual `--k-color-*` overrides**: Removed; Konsta generates these automatically from `--color-brand-*`.
- **`navbar` prop on Button**: Does not exist in Konsta v5; use `inline clear` instead.

## Revisit Later

- Consider SvelteKit `+layout.ts` `load()` → `$page.data` API for proper layout-to-page data flow (less duplication of dark mode init).
- Evaluate replacing HTML5 DnD with a pointer-event-based drag system for better cross-platform consistency.
