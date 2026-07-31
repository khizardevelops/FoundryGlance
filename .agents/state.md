# State

Describe how the project works right now. Keep this present-tense and accurate. Include runtime behavior, important components, and data flow here.

## Current State

Tauri 2 + SvelteKit 5 + Konsta UI (iOS theme) font previewer. Rust backend scans directories for font files with a native SFNT parser and serves settings persistence via JSON file. The frontend can also fetch Google Fonts or CORS-enabled CSS font stylesheets, sanitize their `@font-face` rules, derive metadata, and preview the remote families. Frontend uses Konsta `<Card>` components for the toolbar and font cards, Konsta `<Page>` for the native iOS surface, and standard Konsta components throughout.

## State Management

All app state lives in runes store modules under `src/lib/stores/`, each exporting a singleton class instance. Components read fields directly and call methods; `+page.svelte` is wiring only and holds just two local booleans for dialog visibility.

- `settings.svelte.ts` — `settings`: `current` AppSettings, `loaded`, derived `accentClass`, plus `load` / `save` / `patch` / `reset` / `snapshot`. Persists via Tauri, falling back to localStorage (`foundryglance:settings`) outside it.
- `theme.svelte.ts` — `theme`: persisted `preference` ('light'/'dark'/'system'), `systemDark` from a live matchMedia listener, derived `dark` / `mode`, plus `init` / `sync` / `set` / `toggle`. Toggling writes `theme_mode` into settings.
- `preview.svelte.ts` — `preview`: languages, selected language, preview text, font size, alignment, view mode, columns, merged, per-family `languageOverrides`, derived `isRtl` / `columnsCount`, and `cardView(familyName)`.
- `library.svelte.ts` — `library`: families, totals, selectedPath, scanning flags, import warnings, derived `fontEntries` / `entries` / `isEmpty`, plus `scanPath` / `scanFiles` / `importWeb` / `restore`. Writes a `SessionSource` pointer to localStorage (`foundryglance:last-source`) on each successful load and replays it on boot.
- `history.svelte.ts` — `history`: web import entries, `load` / `record` / `remove` / `clear`.

`src/lib/utils/theme.ts` and `src/lib/utils/settings.ts` were deleted; the old `writable` store and module-level `_current` are gone.

What survives a reload: accent, font size, custom texts, theme choice, import history, and the last loaded font set (re-scanned or re-fetched from a stored source pointer). What does not, by design: preview text edits, view mode/columns/alignment, per-card language overrides, and fonts picked as browser `File` objects.

## Implemented

- Font scanning (directory pick or drag-drop): returns `ScanResult` with `families` (grouped), `font_count`, `folder_name`
- Web font importing: the Web popup takes a textarea and accepts a Google Fonts family name, a `Family:wght@100..900` css2 selection, a specimen or `share?selection.family=` URL, a direct CSS stylesheet URL, or several of those one per line.
- Bulk web font importing: a pasted Google Fonts `<link>` embed snippet (including its `preconnect` lines, which are skipped by `rel` inspection) or a `<style>@import url(...)</style>` block imports every selected family in one action. All discovered stylesheets are fetched in parallel; a source that fails is reported as a warning and does not block the others.
- External CSS handling: fetched stylesheets are reduced to sanitized `@font-face` rules, Unicode subset rules collapse into logical variants, variable weight ranges are supported, and families appearing in more than one stylesheet are merged into a single card.
- Per-card preview language: each FontCard/FontTile has a globe button opening the shared `LanguageMenu` popover. An override changes that card's sample text, direction, and alignment; unoverridden cards keep following the toolbar. Overrides live in the `preview` store as `languageOverrides` keyed by family name, are cleared by `library.setScanResult`, and are reset per card via the menu's "Use toolbar language" row.
- `LanguageMenu.svelte`: one search-and-select language popover shared by AppToolbar, FontCard, and FontTile. Optional `resetLabel` prop adds the reset row; callers own the trigger button and `target` element.
- Web import history: every successful web import is recorded with an epoch-ms timestamp, its resolved source URLs, family names, font count, and label. Shown newest-first in the Add Web Fonts popup with relative + absolute times; clicking a row re-imports it, and a Clear History button empties the list. Persisted via `load_history` / `save_history` / `clear_history` to `~/.config/foundryglance/history.json` (capped at 200 in Rust), falling back to localStorage outside Tauri. Re-importing the same sources moves the entry to the top rather than duplicating it.
- Settings system: Tauri command `load_settings` / `save_settings` / `reset_settings`, persisted as JSON in the config dir, with a localStorage fallback outside Tauri. Current settings are `default_font_size`, `accent_color`, `theme_mode`, and per-language `custom_texts`. All Rust fields carry `#[serde(default)]` so older files still load.
- Accent colour: 8 iOS palette colours, each declared as `--color-brand-*` in `app.css` so Konsta generates a `.k-color-brand-<name>` class; `settings.accentClass` puts the right one on the App root. Changing it recolours buttons, badges, sliders, and segmented controls live.
- Font preview rendering: Tauri-scanned fonts load bytes via `read_font_bytes`; browser-scanned fonts load directly from selected/dropped `File` objects. Blob URLs are cleaned up after `FontFace` loading.
- Settings popup: Konsta `<Popup>`, `<Page>`, `<Navbar>`, `<List>`, `<ListInput>`, `<ListButton>`, and `<Range>` inside `<ListItem>{#snippet inner()}`. Range slider uses native Konsta iOS styling. Destructive reset button uses `colors` prop.
- Layout: Konsta `<App theme="ios">` wrapper; `theme.dark` drives both the `dark` prop and the `.dark` class on the App root, alongside `settings.accentClass`. Preloader shown while settings load; `library.restore()` runs after first paint.
- Toolbar: Konsta `<Card contentWrap={false}>` with `<Button>`, `<Searchbar>`, `<Popover>` with backdrop dismissal, Konsta `<List>` + `<ListItem>` in the popover for language selection, `<Badge>`, `<Segmented>` groups, and native `<Range>` for font size.
- CSS: Minimal `app.css` with proper import order (`@import 'tailwindcss'` then `@import 'konsta/svelte/theme.css'`), one `--color-brand-*` declaration per selectable accent so Konsta generates their classes, no manual `--k-color-*` overrides. No custom CSS targeting Konsta internals.
- FontCard/FontTile: Use Konsta `<Card>` with `{#snippet header()}` and `{#snippet footer()}` for native iOS card appearance with automatic hairline dividers.
- Svelte 5 runes: `$state`, `$derived`, `$effect` throughout; `$props()` without generic type args

## Documentation

- `README.md` rewritten for the Tauri + SvelteKit port with architecture, data flow, dual-mode frontend, porting notes, and full setup instructions.
- `.github/workflows/release.yml` CI workflow: builds on tag push `v*.*.*` or manual dispatch, matrix over ubuntu-22.04 / windows-latest / macos-latest, auto-attaches `.deb`/`.AppImage`/`.msi`/`.dmg` to a draft GitHub Release.

## Missing Or Partial

- Keyboard accessibility on interactive controls (toggle rows, draggable stops, drag-reorder handles)
- Full end-to-end Tauri build verification

## Pipeline And Flow

1. App mounts → layout loads settings (Tauri invoke, localStorage fallback) → applies `theme_mode` and the accent class → initializes preview → loads import history → after first paint, `library.restore()` replays the last session's font source
2. Page renders from the stores; it holds only the two dialog booleans
3. User picks folder → in Tauri, native dialog + `scan_directory`; in plain browser/Vite, hidden directory input + TypeScript SFNT metadata parser. Alternatively, user opens Web → pastes families, URLs, or an embed snippet → `parseExternalFontSources` resolves that into a list of stylesheet URLs → all are fetched in parallel, sanitized, and parsed into one merged `ScanResult`. Families render as FontCards (grid) or FontTiles (list).
4. Settings dialog → plain object clone of current settings → edit in place → `settings.save()` merges the patch and writes to Rust in Tauri or localStorage in the browser
5. Konsta `<Page>` provides the native iOS light/dark surface

## Input Handling

- Folder drag/drop is owned by `DropZone.svelte`, using Tauri `getCurrentWindow().onDragDropEvent` for real filesystem paths. Outside Tauri it reads dropped browser `File` objects, including directory entries when `webkitGetAsEntry` is available.

## Side Effects

- External font stylesheets are reconstructed from sanitized font-face descriptors and injected once per imported family (keyed by `<sorted source urls>#<family>`); `clearFonts` removes them when switching sources.
- Programmatically registered local `FontFace` instances are tracked and removed by `clearFonts`.
- Blob URLs for local font bytes are cleaned up in the font-loader helper's `finally` block.
- Svelte 5 proxy settings objects must not be passed to `structuredClone`; use a plain object clone for settings.

## Invariants

- `folder_name` is derived from the scanned directory's final path component, returned in `ScanResult`
- Konsta theme.css is imported in app.css, NOT in layout component
- No custom CSS targets Konsta internal variables or classes
- All Konsta Button components use `onClick` prop, not DOM `onclick`
