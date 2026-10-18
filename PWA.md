# WordCraft web build as a PWA

This folder is the stock `wordcraft-web-0.7.0` build plus the files that make it an installable,
offline-capable Progressive Web App. The WebAssembly app itself is unchanged.

## What was added or changed

| File | Status | Purpose |
|---|---|---|
| `manifest.webmanifest` | new | Name, icons, colours, `display: standalone` |
| `sw.js` | new | Service worker: offline cache, update handling |
| `icons/` | new | 192/512 px icons, maskable variants, `apple-touch-icon.png` (from `assets/app-icon/`, MIT OR Apache-2.0) |
| `serve.py` | new | Local test server with correct MIME types and cache headers |
| `fonts/` | new | Metric-compatible substitutes for Times New Roman, Arial, Calibri, Cambria, Courier New (see `fonts/FONTS.md`) |
| `index.html` | changed | Manifest link, theme colour, SW registration, `interactive-widget=resizes-content`, bundled-font seeding |
| `_headers`, `.htaccess` | changed | Only `wordcraft-*.js` is immutable now (not `sw.js`); `.webmanifest` MIME type |
| `*.original*` | backup | The stock files, unmodified |

## How the service worker behaves

- On install it reads `index.html`, finds the hashed `wordcraft-*` files it references and caches
  them (about 40 MB, mostly the `.wasm`). Nothing hash-specific is hard-coded, so dropping in a
  newer release build only needs the same `index.html` edits re-applied.
- Page loads are network-first, falling back to the cached page offline (`?sample` and `?webgl`
  work offline too).
- Hashed files are cache-first. When a new `index.html` references new hashes, the new files are
  cached and the old ones deleted. Files already cached are never fetched again.
- `fonts/*.woff2` are not cached by the service worker: they are copied once into WordCraft's own
  font store and not requested again.

## Requirements

Service workers run only in a secure context: `https://` or `http://localhost`. A plain
`http://192.168.x.x` address on a LAN will run the app but cannot install it.

## Viewport note

`interactive-widget=resizes-content` makes Android Chrome shrink the page when the on-screen
keyboard opens, instead of drawing the keyboard over the canvas. This is meant to keep the caret
visible on tablets. It is experimental: remove it from the viewport meta tag if it causes problems.

## Verified

Chromium 141 (headless, WebGL2 fallback): service worker activates, all 11 files cached, no
installability errors (`Page.getInstallabilityErrors` empty), app reloads and renders fully with
the network off, and a simulated release update replaces the cached build and prunes the old one.
Three further online reloads request neither the `.wasm` nor any font from the server. A .docx in
Times New Roman, Arial, Calibri, Cambria and Courier New renders with the bundled substitutes (all
20 faces load with no warnings); without them the same document falls back to Source Serif/Sans and
JetBrains Mono and breaks lines differently.
Not yet tested on a real Android tablet.
