# Known Issues

## Bugs

- (none known)

## Fragile Areas

- **Font loading**: Dynamic `<style>` injection for `@fontsource-variable` sheets is not cleaned up on component destroy — multiple previews accumulate `<style>` tags in `<head>`.
- **Blob URL management**: Blob URLs are cleaned up on unmount but if the font-loader helper throws before URL creation, cleanup may be missed (mitigated by try/finally).
- **Svelte 5 proxy + structuredClone**: `structuredClone` on Svelte 5 proxied state objects throws in the settings popup. SettingsDialog works around this with a plain object clone.

## Workarounds

- `$props()` generic type args not supported → annotate destructured variables with TS types directly on the destructuring pattern
- `as const` not supported in Svelte template expressions → move const arrays to `<script>` section as typed variables

## Technical Debt

- No automated tests (neither frontend nor backend)
- No CI/CD pipeline
- No error boundaries for font scanning failures
- Svelte 5 a11y warnings suppressed (warnings only, not errors) for interactive `<div>` elements with click/drag handlers
