# Decisions

## Active Decisions

- **Svelte 5 runes throughout**: Use `$state`, `$derived`, `$effect`, `$props()` without generic type args; annotate destructured variables directly with TS types. `$props<Type>()` is NOT supported in this Svelte version.
- **`$props()` defaults**: Use regular JS defaults with type annotations on the destructuring pattern, e.g. `let { x = 5 }: { x: number } = $props()`. Do NOT use `$props<number>()` as a default value.
- **Layout → page data flow**: Page manages its own theme/settings state locally instead of receiving via layout `{@render children(args)}` (Svelte 5 snippets don't accept render-time arguments in SvelteKit).
- **Hex color format**: 6-char `#RRGGBB` on frontend at all times. Rust `normalize_color` function strips legacy 8-char `#AARRGGBB` to `#RRGGBB`.
- **Konsta UI components**: Always use Konsta `<Range>`, `<Toggle>`, `<Preloader>` instead of native HTML equivalents. Import from `konsta/svelte`.
- **Konsta Card for custom containers**: Use `<Card contentWrap={false}>` with `{#snippet header()}` / `{#snippet footer()}` for custom card layouts (toolbar, font cards). Do NOT use `<Glass>` as a general-purpose container.
- **Konsta CSS rules**: Import `konsta/svelte/theme.css` in `app.css`, NOT in layout. Use `--color-brand-*` for custom colors. Never override `--k-color-*` internal variables. Never target `.k-*` internal classes.
- **Konsta Button onClick**: Always use `onClick` prop (capital C), never DOM `onclick`.
- **Konsta ListItem for Range slider**: Use `<ListItem>{#snippet inner()}<Range .../>{/snippet}</ListItem>` pattern, never raw `<li>` wrappers.
- **Shared dark mode**: Use `src/lib/utils/theme.ts` `darkMode` store for app-wide theme state. Layout passes `$darkMode` into Konsta `<App dark>` and applies the `.dark` class on the App root; pages/components should not keep independent dark state.
- **Settings dialog deep copy**: Do not use `structuredClone()` on Svelte proxy props. Clone settings with a plain object copy for edit-in-place.
- **Popover dismissal**: Use default backdrop behavior (do not set `backdrop={false}`) so clicking outside dismisses the popover.
- **External font imports**: Accept Google Fonts names/specimen/embed URLs and direct HTTP(S) CSS URLs. Never inject a provider stylesheet verbatim; parse and reconstruct only sanitized `@font-face` rules, reject credentialed/data URLs, and require CORS-enabled stylesheet fetching.
- **Remote font loading**: Store a sanitized external stylesheet on each imported `FontFamily`. Inject each source once and let CSS lazily fetch only the variants used by the previews; remove injected styles in `clearFonts`.

## Rejected Options

- **`slot`-based layout**: Replaced with `{@render children()}` snippet syntax for Svelte 5 compatibility.
- **`<Glass>` as general container**: Replaced with `<Card>` which provides proper iOS card styling, automatic hairline dividers, and theme-aware colors.
- **Custom CSS for Konsta components**: Removed all custom CSS targeting Konsta internals (`.toolbar-glass`, `.lang-menu-item`, `.k-list-button-destructive`, `.settings-range-row`).
- **Manual `--k-color-*` overrides**: Removed; Konsta generates these automatically from `--color-brand-*`.
- **`navbar` prop on Button**: Does not exist in Konsta v5; use `inline clear` instead.

## Revisit Later

- Consider SvelteKit `+layout.ts` `load()` → `$page.data` API for proper layout-to-page data flow (less duplication of dark mode init).
- Evaluate replacing HTML5 DnD with a pointer-event-based drag system for better cross-platform consistency.
