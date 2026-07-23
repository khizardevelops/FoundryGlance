# State

Describe how the project works right now. Keep this present-tense and accurate. Include runtime behavior, important components, and data flow here.

## Current State

Tauri 2 + SvelteKit 5 + Konsta UI (iOS theme) font previewer. Rust backend scans directories for font files, extracts metadata via `fc-scan`, and serves settings persistence via JSON file. Frontend uses Konsta `<Card>` components for the toolbar and font cards, Konsta `<Page>` for the native iOS surface, and standard Konsta components throughout.

## Implemented

- Font scanning (directory pick or drag-drop): returns `ScanResult` with `families` (grouped), `font_count`, `folder_name`
- Settings system: Tauri command `load_settings` / `save_settings` / `reset_settings`, persisted as JSON in app data dir. Current settings are only `default_font_size` and per-language `custom_texts`.
- Font preview rendering: Tauri-scanned fonts load bytes via `read_font_bytes`; browser-scanned fonts load directly from selected/dropped `File` objects. Blob URLs are cleaned up after `FontFace` loading.
- Settings popup: Konsta `<Popup>`, `<Page>`, `<Navbar>`, `<List>`, `<ListInput>`, `<ListButton>`, and `<Range>` inside `<ListItem>{#snippet inner()}`. Range slider uses native Konsta iOS styling. Destructive reset button uses `colors` prop.
- Layout: Konsta `<App theme="ios">` wrapper, shared `darkMode` store initialized from `window.matchMedia`, `.dark` class applied on the App root for Tailwind class-based dark variants, Preloader shown while loading settings
- Toolbar: Konsta `<Card contentWrap={false}>` with `<Button>`, `<Searchbar>`, `<Popover>` with backdrop dismissal, Konsta `<List>` + `<ListItem>` in the popover for language selection, `<Badge>`, `<Segmented>` groups, and native `<Range>` for font size.
- CSS: Minimal `app.css` with proper import order (`@import 'tailwindcss'` then `@import 'konsta/svelte/theme.css'`), single `--color-brand-primary` definition, no manual `--k-color-*` overrides. No custom CSS targeting Konsta internals.
- FontCard/FontTile: Use Konsta `<Card>` with `{#snippet header()}` and `{#snippet footer()}` for native iOS card appearance with automatic hairline dividers.
- Svelte 5 runes: `$state`, `$derived`, `$effect` throughout; `$props()` without generic type args

## Documentation

- `README.md` rewritten for the Tauri + SvelteKit port with architecture, data flow, dual-mode frontend, porting notes, and full setup instructions.
- `.github/workflows/release.yml` CI workflow: builds on tag push `v*.*.*` or manual dispatch, matrix over ubuntu-22.04 / windows-latest / macos-latest, auto-attaches `.deb`/`.AppImage`/`.msi`/`.dmg` to a draft GitHub Release.

## Missing Or Partial

- Keyboard accessibility on interactive controls (toggle rows, draggable stops, drag-reorder handles)
- Full end-to-end Tauri build verification

## Pipeline And Flow

1. App mounts → layout loads settings via Tauri invoke, sets dark mode from `matchMedia`
2. Page mounts → loads languages, initializes preview text
3. User picks folder → in Tauri, native dialog + `scan_directory`; in plain browser/Vite, hidden directory input + TypeScript SFNT metadata parser; families render as FontCards (grid) or FontTiles (list)
4. Settings dialog → plain object clone of current settings → edit in place → save writes back to Rust in Tauri or local in-memory settings in browser
5. Konsta `<Page>` provides the native iOS light/dark surface

## Input Handling

- Folder drag/drop is owned by `DropZone.svelte`, using Tauri `getCurrentWindow().onDragDropEvent` for real filesystem paths. Outside Tauri it reads dropped browser `File` objects, including directory entries when `webkitGetAsEntry` is available.

## Side Effects

- Font loading via dynamic `<style>` injection leaks `@fontsource-variable` stylesheets per preview (not cleaned up)
- Blob URLs from `@fontsource` conversion are cleaned up in `finally` block of font-loader helper
- Svelte 5 proxy settings objects must not be passed to `structuredClone`; use a plain object clone for settings.

## Invariants

- `folder_name` is derived from the scanned directory's final path component, returned in `ScanResult`
- Konsta theme.css is imported in app.css, NOT in layout component
- No custom CSS targets Konsta internal variables or classes
- All Konsta Button components use `onClick` prop, not DOM `onclick`
