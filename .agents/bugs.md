# Bugs

This is the active queue for observed or suspected defects that can be fixed within the project's current foundational technology. These problems require investigation, repair, and verification.

> **Agent rule:** Every current bug is unresolved work. Keep it visible and give it a concrete Next action until a fix is verified. Never close or reclassify a bug merely because it is difficult, low priority, or has a workaround.

## File Boundary

- Foundational technology means the core database, auth provider, framework or runtime, infrastructure platform, protocol, or fundamental algorithmic approach on which the project is built.
- Keep a problem here when it can be fixed through code, configuration, schemas, integrations, or supported upgrades without replacing that foundation.
- Difficulty does not determine the file. An extra-hard defect remains a bug if the current foundation can support a correct implementation.
- Move a problem to known-issues.md only when evidence shows that a correct fix requires replacing or re-architecting foundational technology. Carry over the evidence and identify the required foundational change.
- A workaround reduces impact but does not resolve or close a bug.
- After a fix is verified, move the entry to Fixed Bugs. Do not mark a bug fixed based only on a code change.
- When a bug is part of the current work plan, tasks.md may reference its bug ID instead of duplicating its details.

## Current Bugs

Difficulty describes the likely scope and uncertainty of the fix, not its severity or priority. Reclassify a bug when new evidence changes the estimate. Within each section, order bugs by severity and then age.

### Needs Triage

Use this section when a report is not yet reproducible or there is not enough evidence to estimate the fix. Record the smallest next investigation step, then move the bug to a difficulty section once its scope is understood.

### Easy Fix

The cause is understood and localized. The fix should be a small change with focused verification.

### Hard Fix

The bug needs substantial investigation or coordinated changes across multiple parts of the system.

### Extra Hard Fix

The root cause is unclear or the repair needs broad, coordinated work, but a correct fix is still possible within the current foundational technology. Record the smallest useful experiment instead of guessing at a solution.

<!--
Current bug entry:

#### BUG-001 — Short title
- Severity: low | medium | high | critical
- Status: reported | reproduced | investigating | fixing | blocked
- Area:
- Reported: YYYY-MM-DD
- Reproduction:
- Expected:
- Actual:
- Evidence:
- Workaround: none
- Next action:
-->

## Fixed Bugs

Keep a concise, verifiable history here. Add newly fixed bugs first.

### BUG-003 — Everything reset on page refresh (accent, theme, loaded fonts)
- Fixed: 2026-07-31
- Reported: user refreshed the app in a browser at localhost:1420 and lost the accent colour, the light-mode choice, and every loaded font.
- Cause: three separate ones, only unified by the symptom.
  1. **Accent**: `settings.load()` calls `invoke('load_settings')`, which throws without a Tauri runtime. The catch fell back to in-memory defaults, so settings had never persisted in browser dev mode. Pre-existing, but only visible once the accent actually worked (BUG-002).
  2. **Theme**: a regression introduced in the same session. `theme.initFromSystem()` seeded dark mode from `prefers-color-scheme` on every load, and the toggle was never persisted, so a manual light-mode choice was overwritten by the OS preference on each reload. Before the change the app always started light and was merely forgetful; afterwards it actively fought the user.
  3. **Fonts**: the loaded font set had never been persisted in any form. Introducing stores organized the state but did not make it durable.
- Resolution:
  1. `settings` store gained a localStorage fallback for `load`/`save`/`reset`, mirroring the `history` store.
  2. Added `theme_mode: 'light' | 'dark' | 'system'` to `AppSettings` (Rust + TS). The persisted preference is now the source of truth; `system` is only the first-run default, and `theme.dark` is derived from preference + a live `matchMedia` listener. Every field on the Rust `AppSettings` also gained `#[serde(default)]` so an older or partial settings.json loads instead of being discarded.
  3. Added a `SessionSource` pointer (`{kind:'web',sources}` or `{kind:'directory',path}`) written on each successful load and replayed by `library.restore()` after first paint. Only the source is stored, never parsed fonts. Restore passes `record: false` so it does not re-stamp the history entry on every reload. Browser-picked `File` objects are explicitly not restorable and clear the pointer.
- Verification: driven through CDP with `prefers-color-scheme: dark` forced on. Set accent Orange, toggled to light, imported Amiri + Lora, then reloaded twice: root class stayed `k-color-brand-orange` with no `dark`, `--k-color-primary` stayed `rgb(255 149 0)`, both families were restored, and history stayed at exactly 1 entry. Toggling back to dark and reloading persisted `theme_mode: "dark"`. Screenshot confirms a light UI under a dark OS preference. No console exceptions.
- Reference: uncommitted working tree as of 2026-07-31

### BUG-002 — Accent colour picker had no effect on the UI
- Fixed: 2026-07-31
- Cause: Konsta's `plugin-colors.js` reads `--color-brand-primary` at BUILD time, derives the whole `--k-color-*` token set from it, and bakes literal values into a `:root, .k-color-brand-primary` rule. The generated CSS contains zero occurrences of `var(--color-brand-primary)`, so the runtime `document.documentElement.style.setProperty('--color-brand-primary', hex)` calls in `+layout.svelte` and `SettingsDialog.save()` wrote a property nothing reads. Selecting and saving a swatch worked; the colour simply had no path to the UI. The picker had never worked.
- Resolution: declared all 8 palette colours as `--color-brand-*` in `src/app.css` so the plugin generates a `.k-color-brand-<name>` class per colour, added `src/lib/utils/accent.ts` mapping a stored hex to its class, and applied `settings.accentClass` on the Konsta `<App>` root in `+layout.svelte`. Custom-property inheritance carries the tokens down the tree. Both `setProperty` calls were removed. This respects the existing "never override `--k-color-*`" decision.
- Verification: confirmed the cause by building and grepping the output (`:root,.k-color-brand-primary{--k-color-primary:#007aff;…}`, `var(--color-brand-primary)` count = 0). After the fix, driving the app through CDP: picking Green moved the App root class from `k-color-brand-blue` to `k-color-brand-green`, `--k-color-primary` changed from `rgb(0 122 255)` to `rgb(52 199 89)`, and the Open button's computed `background-color` became `rgb(52, 199, 89)`.
- Reference: uncommitted working tree as of 2026-07-31

### BUG-001 — Pasting a Google Fonts `<link>` embed snippet imported the wrong URL
- Fixed: 2026-07-31
- Cause: `normalizeExternalFontSource` extracted the href with a single non-global `/\bhref\s*=\s*["']([^"']+)["']/i` match. Google's embed snippet opens with two `<link rel="preconnect">` lines, so the first match was `https://fonts.googleapis.com` (the preconnect origin) instead of the stylesheet on the third line.
- Resolution: `extractCandidates` in `src/lib/utils/external-fonts.ts` now scans every `<link ...>` tag, reads its `rel`, and keeps only stylesheet links (`rel` containing `stylesheet`, `rel="preload" as="style"`, or no `rel` at all). All `@import` rules are collected too, and the result is a list rather than one URL.
- Verification: drove the running dev server via CDP with the exact snippet from the report — 8 families imported, 8 `<style data-external-font-source>` tags injected, all 8 present in `document.fonts`. A preconnect-only paste now produces a clear error instead of a bad fetch.
- Reference: uncommitted working tree as of 2026-07-31

<!--
Fixed bug entry:

### BUG-001 — Short title
- Fixed: YYYY-MM-DD
- Cause:
- Resolution:
- Verification:
- Reference: commit, PR, or issue
-->
