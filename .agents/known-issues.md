# Known Issues

## Bugs

- (none known)

## Fragile Areas

- **External providers**: Direct third-party CSS URLs must allow cross-origin `fetch` access. Google Fonts does; providers without CORS headers cannot currently be imported.
- **External CSS parser**: Intentionally accepts only conventional `@font-face` descriptors with HTTP(S) `url()` sources. Data URLs and unusual CSS constructions are rejected rather than injected.
- **Blob URL management**: Local font Blob URLs are revoked after `FontFace.load()` finishes; loaded faces remain registered until the source is cleared.
- **Svelte 5 proxy + structuredClone**: `structuredClone` on Svelte 5 proxied state objects throws in the settings popup. SettingsDialog works around this with a plain object clone.

## Workarounds

- `$props()` generic type args not supported → annotate destructured variables with TS types directly on the destructuring pattern
- `as const` not supported in Svelte template expressions → move const arrays to `<script>` section as typed variables

## Technical Debt

- No automated tests (neither frontend nor backend)
- No CI/CD pipeline
- No error boundaries for font scanning failures
- Svelte 5 a11y warnings suppressed (warnings only, not errors) for interactive `<div>` elements with click/drag handlers
