# FoundryGlance

A hyper-lightweight local font previewer for desktop — rebuilt in **Tauri 2 + SvelteKit 5**.

Recursively scan folders of `.ttf` and `.otf` files, preview custom text across all fonts in real time. No installation required.

---

## About

This is a from-scratch port of the original [FoundryGlance Flutter app](https://github.com/khizardevelops/foundryglance-flutter) to the **Tauri** desktop framework with a **SvelteKit 5** frontend. Same purpose, same lightweight philosophy — rewritten for a native desktop experience with a fraction of the binary size.

---

## Features

- **Recursive scanning** — Point it at a directory and it finds every `.ttf` and `.otf` file, no matter how deeply nested.
- **SFNT metadata parser** — Reads font family name, subfamily/style, weight, and italic flag directly from font binary tables (`name`, `OS/2`, `head`) — zero external dependencies. Implemented in both Rust (backend) and TypeScript (browser dev fallback).
- **On-the-fly font loading** — Fonts are loaded via the `FontFace` JavaScript API with Blob URLs. No system-wide installation needed.
- **Web font importing** — Enter a Google Fonts family, paste a Google Fonts specimen/embed URL, or use a CORS-enabled CSS font stylesheet. Remote variants appear in the same preview cards without being installed.
- **Family grouping with merged view** — All variants of the same family are automatically grouped. Toggle between merged cards and individual variant tiles.
- **Grid & list views** — Switch between a responsive card grid or a compact list layout. Adjustable columns (2–5).
- **Live font size control** — Smooth slider (8–96) to instantly scale preview text.
- **Bold / Italic / Weight sliders** — Per-family interactive controls to test different variants dynamically.
- **RTL & complex script support** — Full bidirectional text support. Choose from 18 language presets (Arabic, Pashto, Hebrew, CJK, etc.) or type your own text.
- **Text alignment** — Start, center, end alignment controls.
- **Custom per-language preview text** — Set persistent custom preview strings per language in settings.
- **Drag & drop** — Drop a font folder directly onto the window to start scanning. Uses native Tauri drag-drop events.
- **Native iOS-themed UI** — Konsta UI iOS theme with frosted glass cards, native-feeling controls, and automatic light/dark mode.
- **Light / dark theme** — Toggle with a button. Persists across sessions via CSS media query.
- **Configurable accent color** — Pick from 8 iOS-style accent colors in settings.
- **Settings persistence** — Custom preview texts, default font size, and accent color saved to `~/.config/foundryglance/settings.json`.
- **Cross-platform** — Runs on macOS, Windows, and Linux.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | Tauri 2 (Rust) |
| Frontend framework | SvelteKit 5 with Svelte 5 runes (`$state`, `$derived`, `$effect`) |
| Language | TypeScript |
| UI components | Konsta UI 5 (iOS theme) |
| Styling | Tailwind CSS v4 |
| Font parsing (Rust) | Custom SFNT binary table parser |
| Font parsing (TS) | Custom SFNT binary table parser (browser dev fallback) |
| Font loading | `FontFace` API with Blob URLs |
| File picking | `@tauri-apps/plugin-dialog` (native) / hidden `<input webkitdirectory>` (browser) |
| Drag & drop | `@tauri-apps/api` `onDragDropEvent` (native) / HTML5 DnD (browser) |
| Language data | `src/lib/assets/languages.json` (18 languages) |
| Settings storage | JSON file via `dirs-next` config directory |
| Build tool | Vite 6 |
| Package manager | Bun |
| Platforms | macOS, Windows, Linux |

---

## Architecture

```
foundryglance/
├── src/                          # SvelteKit frontend
│   ├── app.css                   # Tailwind + Konsta theme
│   ├── app.html                  # HTML shell
│   ├── lib/
│   │   ├── assets/
│   │   │   └── languages.json    # 18 language preview samples
│   │   ├── components/
│   │   │   ├── AppToolbar.svelte     # Main toolbar with all controls
│   │   │   ├── DropZone.svelte       # Drag-and-drop overlay
│   │   │   ├── FontCard.svelte       # Merged family card with B/I/weight controls
│   │   │   ├── FontTile.svelte       # Individual variant tile
│   │   │   ├── ExternalFontDialog.svelte # Google/CSS web font importer
│   │   │   └── SettingsDialog.svelte # Settings popup
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript interfaces
│   │   └── utils/
│   │       ├── browser-fonts.ts      # Browser-based SFNT parser
│   │       ├── external-fonts.ts     # Remote CSS fetch, sanitization, metadata
│   │       ├── family-utils.ts       # Weight/italic helpers
│   │       ├── font-loader.ts        # FontFace loading & Blob URL management
│   │       ├── languages.ts          # Language data loader
│   │       ├── settings.ts           # Settings CRUD (Tauri invocations)
│   │       └── theme.ts             # Dark mode Svelte store
│   └── routes/
│       ├── +layout.svelte           # Root layout (Konsta App, dark mode)
│       ├── +layout.ts               # SSR disabled (SPA mode)
│       └── +page.svelte             # Main single-page app
│
├── src-tauri/                     # Tauri (Rust) backend
│   ├── src/
│   │   ├── main.rs                # Entry point
│   │   ├── lib.rs                 # Tauri builder, command registration
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── scan.rs            # scan_directory, read_font_bytes
│   │   │   └── settings.rs        # load_settings, save_settings, reset_settings
│   │   └── parser/
│   │       ├── mod.rs
│   │       └── sfnt.rs            # Raw TTF/OTF SFNT metadata parser
│   ├── tauri.conf.json            # App configuration
│   ├── capabilities/
│   │   └── default.json           # Permissions
│   └── Cargo.toml
│
├── package.json
├── svelte.config.js
├── vite.config.js
└── tsconfig.json
```

### Data flow

1. **Scan**: User picks a folder → Tauri native dialog → Rust `scan_directory` recursively walks the directory, reads first 128 KB of each `.ttf`/`.otf` file, parses SFNT binary metadata, groups by family → returns `ScanResult` to frontend.
2. **Import web fonts (alternative)**: A Google Fonts family/URL or another CSS stylesheet is fetched in the frontend → only sanitized `@font-face` descriptors are retained → families and variants are derived from the CSS.
3. **Render**: SvelteKit renders `FontCard` (merged) or `FontTile` (separate) components in a responsive grid or list.
4. **Load**: Local cards call `read_font_bytes`, create Blob URLs, and register `FontFace` objects. Web cards install the sanitized font-face rules and let the browser fetch selected variants from the provider.
5. **Preview**: User types text, adjusts size/alignment, toggles bold/italic — all live, re-rendered by Svelte 5 reactivity.
6. **Settings**: Edits in the settings popup are saved via Tauri commands to `~/.config/foundryglance/settings.json`.

### Dual-mode frontend

The frontend works in two modes:
- **Tauri mode** (desktop): Uses `@tauri-apps/api` for native dialogs, file system access, and drag-drop events.
- **Browser mode** (dev): Falls back to hidden `<input webkitdirectory>` for folder selection and HTML5 drag-drop, with a TypeScript reimplementation of the SFNT parser. Run `bun run dev` for rapid frontend development without Tauri.

---

## Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/) (stable)
- [Bun](https://bun.sh/) (or npm/pnpm)
- A desktop platform target (macOS, Windows, or Linux)

### Development

```bash
# Frontend-only (browser dev mode, no Tauri)
bun install
bun run dev
# → http://localhost:5173

# Full Tauri desktop mode (hot-reloads frontend + Rust)
bun run tauri dev
```

### Build

```bash
bun run tauri build
```

The production binary will be in `src-tauri/target/release/` (or `.dmg`/`.msi`/`.AppImage` depending on platform).

### Commands

| Command | Description |
|---|---|
| `bun run dev` | Vite dev server (frontend only) |
| `bun run build` | Production SvelteKit build |
| `bun run check` | TypeScript type checking |
| `cargo check` (in `src-tauri/`) | Rust compilation check |
| `bun run tauri dev` | Tauri desktop dev mode |
| `bun run tauri build` | Production Tauri bundle |

---

## Usage

1. Launch the app.
2. Click **Open** (or drag a folder onto the window) and select a directory containing font files. Alternatively, click **Web** and enter a Google Fonts family or font stylesheet URL.
3. The app scans local `.ttf`/`.otf` files or derives remote family metadata from the imported stylesheet, then groups variants by family.
4. Type custom preview text in the search field, or pick a language preset from the popover.
5. Adjust font size with the slider, toggle between grid/list and merged/separate views, and switch text alignment as needed.
6. Click the settings gear to customize the accent color, default font size, and per-language preview text.
7. Use the **B** (bold) and **I** (italic) toggles and weight slider on merged family cards to explore variants.

---

## Settings

| Setting | Description |
|---|---|
| Default font size | Base preview font size (12–64) |
| Accent color | Primary UI accent (8 iOS-style colors) |
| Per-language text | Custom default preview string for each of the 18 languages |

Settings are persisted to `~/.config/foundryglance/settings.json`.

---

## Porting notes

This is a **complete rewrite** from the original Flutter app. Key differences:

| Aspect | Flutter (original) | Tauri + SvelteKit (this port) |
|---|---|---|
| Framework | Flutter 3 / Dart | Tauri 2 / Rust + SvelteKit 5 / TypeScript |
| UI | Custom glassmorphism widgets | Konsta UI (native iOS theme) |
| Font parser | Pure Dart SFNT parser | Rust SFNT parser (backend) + TypeScript SFNT parser (browser fallback) |
| Font loading | `FontLoader` (Flutter engine) | `FontFace` API with Blob URLs |
| Background | Animated mesh gradient (`mesh_gradient` package) | Native iOS light/dark surfaces via Konsta `<Page>` |
| Settings | In-app shared preferences | JSON file via `dirs-next` |
| Web support | GitHub Pages deployment | Not a target (desktop-only) |
| Binary size | ~20 MB+ (Flutter runtime) | ~5–8 MB (native binary) |

---

## License

MIT
