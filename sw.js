// WordCraft service worker: makes the web build installable and usable offline.
//
// The build's asset names carry a content hash (wordcraft-web-<hash>.js, ..._bg.wasm),
// so this worker never hard-codes them. It reads index.html, caches whatever that page
// references, and drops cached assets a newer index.html no longer references. Replacing
// the build files with a newer release therefore needs no change here.

const CACHE = 'wordcraft-pwa-v1';

const SHELL = [
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

// Hashed build output: safe to serve from cache forever.
const HASHED = /\/wordcraft-[^/]*-?[0-9a-f]{16}(?:_bg)?\.(?:js|wasm|ico)$/;

function assetsIn(html) {
  const found = new Set();
  const re = /(?:href|src|from|module_or_path:)\s*=?\s*["']\.\/(wordcraft-[^"']+)["']/g;
  let m;
  while ((m = re.exec(html))) found.add(new URL('./' + m[1], self.registration.scope).href);
  return found;
}

async function storeIndex(cache, response) {
  const html = await response.clone().text();
  await cache.put(new URL('./', self.registration.scope).href, response.clone());
  await cache.put(new URL('./index.html', self.registration.scope).href, response.clone());
  return html;
}

// Cache only the files not cached yet: re-fetching a cached 40 MB .wasm on every visit would
// burn the user's data plan for nothing (the names are content hashes, so a hit is current).
async function addMissing(cache, urls) {
  const missing = [];
  for (const u of urls) if (!(await cache.match(u, { ignoreVary: true }))) missing.push(u);
  if (missing.length) await cache.addAll(missing);
}

// Remove hashed files from older builds so a 40 MB .wasm doesn't pile up per release.
async function prune(cache, keep) {
  for (const req of await cache.keys()) {
    if (HASHED.test(new URL(req.url).pathname) && !keep.has(req.url)) await cache.delete(req);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const res = await fetch('./index.html', { cache: 'no-cache' });
    if (!res.ok) throw new Error('index.html: HTTP ' + res.status);
    const html = await storeIndex(cache, res);
    const assets = assetsIn(html);
    await cache.addAll(SHELL);
    await addMissing(cache, [...assets]);
    await prune(cache, assets);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Bundled fonts are fetched once and kept in WordCraft's own font store (IndexedDB);
  // caching them here too would only store them twice.
  if (/\/fonts\/[^/]+\.woff2$/.test(url.pathname)) return;

  // The page itself: network first so a new release shows up, cache when offline.
  // ignoreSearch lets ?sample or ?webgl open offline too.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req, { cache: 'no-cache' });
        if (res.ok) {
          const html = await storeIndex(cache, res);
          const assets = assetsIn(html);
          // Fetch the new build's files in the background, then forget the old ones.
          event.waitUntil(addMissing(cache, [...assets]).then(() => prune(cache, assets)).catch(() => {}));
        }
        return res;
      } catch (err) {
        const cached = await cache.match('./index.html', { ignoreSearch: true });
        if (cached) return cached;
        throw err;
      }
    })());
    return;
  }

  // Hashed .js/.wasm/.ico: cache first, they never change under the same name.
  if (HASHED.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req, { ignoreVary: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) event.waitUntil(cache.put(req, res.clone()));
      return res;
    })());
    return;
  }

  // Everything else (icons, manifest): stale-while-revalidate.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  })());
});
