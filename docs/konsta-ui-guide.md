# Konsta UI Guide for AI Agents (Svelte 5 + SvelteKit 2)

## 1. Project Setup

### Dependencies

```json
{
  "dependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "konsta": "^5.2.0",
    "tailwindcss": "^4.3.3"
  }
}
```

Tailwind CSS v4 is required. Do NOT install `tailwindcss@3`, `postcss`, or `autoprefixer` — those are for v3 and will break Konsta's theme import.

### Vite Config (`vite.config.ts`)

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      compilerOptions: {
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true
      }
    })
  ]
});
```

The `@tailwindcss/vite` plugin must come **before** `sveltekit()` in the plugins array.

### CSS (`src/app.css`)

```css
@import 'tailwindcss';
@import 'konsta/svelte/theme.css';
```

**Order matters.** `@import 'tailwindcss'` must come first so Konsta's theme can extend Tailwind's base. Do NOT use `@tailwind base/components/utilities` — that is v3 syntax and will not work.

---

## 2. Layout Setup (`+layout.svelte`)

```svelte
<script lang="ts">
  import '../app.css';
  import { App } from 'konsta/svelte';

  let { children } = $props();
</script>

<App theme="ios">{@render children()}</App>
```

- `theme` can be `"ios"`, `"material"`, or `"parent"`.
- `<App>` must wrap all Konsta UI components.
- Do NOT add extra wrapper divs or custom CSS classes on `<App>` — it handles safe areas, theme classes, and touch ripple registration.

---

## 3. Importing Components

All Konsta UI components are imported from `'konsta/svelte'`:

```svelte
<script>
  import { Page, Navbar, Block, Button, List, ListItem, BlockTitle } from 'konsta/svelte';
</script>
```

---

## 4. Component Structure

A typical page follows this pattern:

```svelte
<script>
  import { Page, Navbar, Block, BlockTitle, List, ListItem } from 'konsta/svelte';
</script>

<Page>
  <Navbar title="Page Title" />

  <BlockTitle>Section Title</BlockTitle>
  <List strong inset>
    <ListItem title="Item" />
  </List>

  <Block strong>
    <p>Content here.</p>
  </Block>
</Page>
```

Key structural components:
- `<Page>` — top-level page container (not to be confused with SvelteKit's `+page.svelte`)
- `<Navbar>` — navigation bar inside a Page
- `<BlockTitle>` / `<BlockHeader>` — section headings
- `<Block>` — content block (props: `strong`, `inset`)
- `<List>` + `<ListItem>` — list views (props: `strong`, `inset`, `menuList`, `simpleList`)

---

## 5. Theme Colors — THE RIGHT WAY

### 5.1. Defining Colors

Use `@theme` in `app.css` with `--color-brand-*` variables:

```css
@import 'tailwindcss';
@import 'konsta/svelte/theme.css';

@theme {
  --color-brand-primary: #007aff;
  --color-brand-red: #ff3b30;
  --color-brand-green: #34c759;
  --color-brand-blue: #007aff;
  --color-brand-orange: #ff9500;
  --color-brand-yellow: #ffcc00;
  --color-brand-purple: #af52de;
  --color-brand-pink: #ff2d55;
}
```

**Critical rules:**
- Prefix must be `--color-brand-`. Konsta only picks up `--color-brand-*` variables.
- Do NOT define standard Tailwind colors in `@theme` (e.g., `--color-red-500`) — that overrides Tailwind's palette and can break Konsta's internal color calculations.
- Do NOT use a `tailwind.config.js` file. Tailwind v4 uses `@theme` in CSS exclusively. A `tailwind.config.js` is a v3 artifact and will be ignored or cause errors.
- Do NOT add CSS custom properties targeting Konsta's internal variables (e.g., `--k-color-primary`, `--k-color-*`). Konsta generates these automatically from your `--color-brand-*` values.

### 5.2. Applying Colors to Components

Use the `k-color-brand-*` class on any Konsta component:

```svelte
<Button>Default (primary)</Button>
<Button class="k-color-brand-red">Red Button</Button>
<Button class="k-color-brand-green">Green Button</Button>
```

The `k-color-brand-` class can be applied to parent elements and will cascade to children:

```svelte
<Page class="k-color-brand-red">
  <Button>Red Button</Button>
  <ListItem>Also red</ListItem>
</Page>
```

**Do NOT** style Konsta components with custom CSS that targets their internal structure (e.g., `.k-button`, `.k-list-item`). This will conflict with Konsta's theme variants and break animations/transitions.

### 5.3. Material Color Schemes

Material theme supports two additional schemes via classes:

- `k-md-monochrome` — monochrome scheme
- `k-md-vibrant` — vibrant scheme

These classes are ignored in iOS theme.

---

## 6. Theme Variants

Konsta provides `ios:` and `material:` variants for platform-specific styles:

```svelte
<img class="ios:h-11 material:h-12" src="..." />
<span class="ios:font-bold material:font-semibold">Hello</span>
```

Use these instead of media queries or JavaScript theme detection. Do NOT add custom CSS that overrides Konsta component styles per theme — use the built-in variants.

---

## 7. SSR Caveats

Some Konsta components access `window` during SSR. The `Range` component is a known example. Always guard browser-dependent components:

```svelte
<script>
  import { browser } from '$app/environment';
  import { Range } from 'konsta/svelte';
</script>

{#if browser}
  <Range value={val} onInput={(e) => (val = e.target.value)} />
{/if}
```

This prevents `ReferenceError: window is not defined` during SSR. The component will hydrate on the client.

---

## 8. Component Props Reference

Most Konsta components accept these common props:

| Prop | Type | Description |
|------|------|-------------|
| `colors` | object | Override component color slots (e.g., `{ thumbBgIos: 'bg-white' }`) |
| `disabled` | boolean | Disabled state |
| `className` / `class` | string | Additional CSS classes |

Each component has its own specific props. Refer to `https://konstaui.com/svelte/<component>` for details.

---

## 9. DOs and DON'Ts Summary

### DO
- Use `@theme` in CSS with `--color-brand-*` for custom colors
- Import components from `konsta/svelte`
- Wrap the app in `<App theme="...">`
- Use `k-color-brand-*` classes for color variants
- Use `ios:` / `material:` variants for theme-specific styles
- Guard `{#if browser}` around components that access browser APIs during SSR

### DON'T
- Do NOT install `tailwindcss@3`, `postcss`, `autoprefixer`
- Do NOT create `tailwind.config.js` or `postcss.config.js`
- Do NOT use `@tailwind base/components/utilities` in CSS
- Do NOT define `--color-*` without the `brand-` prefix in `@theme`
- Do NOT directly set Konsta internal CSS variables (`--k-color-*`, `--k-*`)
- Do NOT target Konsta internal CSS classes (`.k-list`, `.k-button`, `.k-page`, etc.)
- Do NOT add custom CSS that overrides Konsta component styles — use props and theme variants instead
- Do NOT write `export default function Page() { return ... }` in `.svelte` files (that is JSX/React syntax)
