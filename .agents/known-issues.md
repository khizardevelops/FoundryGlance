# Known Issues

## Bugs

- (none known)

## Fragile Areas

- **Accent colours are build-time, not runtime**: adding a colour to `ACCENT_COLORS` in `utils/accent.ts` without also declaring `--color-brand-<key>` in `app.css` silently falls back to blue, because Konsta only generates a `.k-color-brand-<key>` class for declared colours. The two lists must be kept in sync by hand. Arbitrary user-picked hex accents are not possible without runtime colour derivation.

- **External providers**: Direct third-party CSS URLs must allow cross-origin `fetch` access. Google Fonts does; providers without CORS headers cannot currently be imported.
- **External CSS parser**: Intentionally accepts only conventional `@font-face` descriptors with HTTP(S) `url()` sources. Data URLs and unusual CSS constructions are rejected rather than injected.
- **Provider 4xx responses are indistinguishable from network failures**: Google answers an unknown family with a CORS-less 400, so the webview's `fetch` rejects and the HTTP status is unreachable. The import error is worded to name the likely cause ("check the family name, the URL, and your connection") because the status code cannot be surfaced.
- **Bare family names use the Google v1 CSS API**: `googleFontsUrl` requests all 18 static variants via `css?family=X:100,...`. Verified that families offering fewer variants (Amiri, Noto Sans Math) return only what they have rather than 400, but this is v1 behavior the project depends on, not a documented guarantee.
- **Variant counts differ by user agent**: Google serves variable-font CSS to Chrome-class UAs (one collapsed Variable variant per style) and static per-weight CSS to others. The same import shows 16 fonts in the WebView and 66 under a non-browser fetch. Expected, but it makes font counts non-portable across WebViews.
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
