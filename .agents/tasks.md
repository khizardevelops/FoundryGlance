# Tasks

## Now

- Run full `npm run tauri build` (or `cargo tauri dev`) to verify end-to-end

## Next

- Add keyboard accessibility to interactive controls in SettingsDialog (toggle rows)
- Evaluate if Popover backdrop needs to close the language menu on click-outside properly
- Push a test tag to verify the release CI workflow runs correctly

## Done

## Done

- Native iOS UI polish pass: toolbar hairline border+shadow, Range in proper ListItem inner-snippet context, language popover custom hoverable button rows with hover/active CSS, SettingsDialog with BlockTitle section headers, destructive Reset button (red), Searchbar separated from language list, FontCard/FontTile hairline separators and overflow-hidden Glass cards. `npm run check` passes 0 errors.
- Fixed Settings crash by replacing `structuredClone(settings)` with a plain object clone
- Added a plain-browser/Vite folder picker fallback using a hidden directory file input
- Added browser drag/drop scanning for selected/dropped `.ttf` and `.otf` files with a TypeScript SFNT metadata parser
- Updated font loading to use browser `File` objects directly outside Tauri and Rust `read_font_bytes` inside Tauri
- `npm run check`, `npm run build`, and `cargo check` pass after the functionality fallback fixes
- Fixed toolbar button interactions by using Konsta `onClick` props and restoring normal touch handling on the toolbar Glass shell
- Fixed folder drag/drop by moving Tauri `onDragDropEvent` handling into `DropZone.svelte` and removing the duplicate page listener
- `npm run check`, `npm run build`, and `cargo check` pass after the interaction fixes
- Replaced the page background with Konsta `<Page>` iOS light/dark surfaces and removed the animated gradient runtime
- Deleted `AmbientBackground.svelte` and removed gradient/accent settings fields from frontend and Rust settings schemas
- Rebuilt settings as a stock Konsta popup/list form with no custom mesh/color editor
- Restored only the required Konsta Tailwind token bridge for iOS primary/surface/glass colors
- Verified the clean light-mode UI screenshot with a distinct frosted Konsta Glass toolbar
- `npm run check`, `npm run build`, and `cargo check` pass after the iOS light/dark cleanup
- Removed custom global animation/interaction CSS that was fighting Konsta sizing and transitions
- Removed forced `!` utility overrides from Konsta Glass/List/Toggle/Button/Preloader surfaces
- Disabled the language Popover backdrop so opening it no longer dims the whole app behind the toolbar
- Changed the language Popover menu to a nested Konsta menu list and shortened trailing labels so rows do not clip
- Replaced custom spinner markup with Konsta `Preloader`
- `npm run check` and `npm run build` pass after the Konsta CSS cleanup; final Firefox screenshot shows the default toolbar without obvious clipping
- Fixed Konsta components rendering half-styled by adding `@source "../node_modules/konsta"` to Tailwind input CSS
- Removed hard button/segmented sizing that clipped default Konsta iOS controls; toolbar now uses Konsta sizing with wrapping and auto-width segmented controls
- Prevented closed language popover from leaking onscreen by mounting `<Popover>` only while open
- Fixed destroyed toolbar layout: Konsta buttons are explicitly `inline`, segmented controls use auto-width Konsta sizing, language moved to the second row, and the toolbar is a compact two-row control strip
- Fixed broken slider rendering across toolbar, settings, and font cards by removing height overrides from Konsta `<Range>` and leaving native iOS geometry intact
- Replaced FontCard mini controls with compact Konsta `<Button>` components
- Fixed live accent color propagation by scoping `settings.accent_color` into Konsta primary CSS variables and refreshing page settings after save/reset
- Changed default accent color to iOS pink/red `#FF2D55`
- `npm run check` and `npm run build` pass after the toolbar/settings/color fixes
- Refactored toolbar to default Konsta controls: `Glass`, `Button`, `Searchbar`, `Popover`, `ListItem`, `Badge`, `Segmented`, `SegmentedButton`
- Fixed theme toggle consistency: shared `darkMode` store drives Konsta `<App dark>`, toolbar theme state, and `.dark` Tailwind scope
- Fixed settings control bugs: mesh toggles no longer double-toggle; mesh color swatches use visible color inputs plus separate enable/remove buttons
- `npm run check` and `npm run build` pass with 0 warnings/errors
- Fixed broken UI colors: Tailwind `primary` utilities now generate from Konsta variables, `dark:` utilities are class-based, and `--k-color-text` is defined
- Phase 1: Fix hex color format (Rust normalize_color, RLS settings.ts defaults, SettingsDialog deep-clone, add folder_name to ScanResult)
- Phase 2: Replace native inputs with Konsta components (Range, Toggle, Preloader) across AppToolbar, FontCard, SettingsDialog, layout, page, FontTile
- Phase 3: Add shared animation keyframes (app.css), .interactive/.animated-size classes, entrance animations to page + staggered delays, interactive class on toolbar/card buttons
- Phase 4: Draggable gradient stop bar, color picker via hidden input, drag-and-drop reorder of swatches, weighted color blending + HSL accent + saturation in AmbientBackground
- Phase 5: Canvas grain frame-skipping (every 4th frame); fix all svelte-check and cargo-check errors
