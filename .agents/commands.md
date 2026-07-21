# Project Commands

## Frontend

- `npm run dev` — Start Vite dev server (frontend only, no Tauri)
- `npm run build` — Production build of SvelteKit frontend
- `npm run preview` — Preview production build
- `npm run check` — Run `svelte-kit sync` + `svelte-check` for TypeScript errors
- `npm run check:watch` — Same as check but in watch mode

## Backend (Rust / Tauri)

- `cargo check` — Check Rust code compiles (from `src-tauri/`)
- `cargo build` — Build Rust binary (release: `cargo build --release`)

## Tauri (Dev / Build)

Run from the project root (`tauri-app/`):

- `npm run tauri dev` — Start Tauri dev mode (frontend + Rust backend with hot-reload)
- `npm run tauri build` — Build production Tauri app (bundles frontend + Rust into final binary)

## Utility

- `npm run tauri -- --help` — List all Tauri CLI commands
