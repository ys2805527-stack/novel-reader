const CACHE = 'novel-reader-v50';
const ASSET_CACHE = 'novel-reader-assets-v1';
const CORE_ASSETS = ['./index.html', './theme.css', './manifest.json', './assets/vendor/jszip.min.js'];
const OPTIONAL_ASSETS = [
  './icon-180v2.png', './icon-192v2.png', './icon-512v2.png',
  ...Array.from({ length: 28 }, (_, index) => './assets/book-illustrations/cover-' + String(index + 1).padStart(2, '0') + '.webp')
];
const scopedURL = path => new URL(path, self.registration.scope).href;
const corePaths = new Set(CORE_ASSETS.map(path => new URL(scopedURL(path)).pathname));

self.addEventListener('install', event => {
  // Optional illustrations never gate installation of a coherent app bundle.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
    CORE_ASSETS.map(path => new Request(scopedURL(path), { cache: 'reload' }))
  )));
  // Existing windows keep their version; activate after they close instead of
  // forcing a mid-session skipWaiting and reload.
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

async function cacheFirst(request, cacheName, key) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(key);
  if (cached) return cached;
  // Migrate existing local illustrations before making another network request.
  if (cacheName === ASSET_CACHE) {
    const previous = await caches.match(key);
    if (previous) {
      await cache.put(key, previous.clone()).catch(() => {});
      return previous;
    }
  }
  const response = await fetch(request);
  if (response.ok) await cache.put(key, response.clone()).catch(() => {});
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  const home = new URL('./', self.registration.scope).pathname;
  const isHome = url.pathname === home || url.pathname === new URL(scopedURL('./index.html')).pathname;
  const key = isHome ? scopedURL('./index.html') : url.origin + url.pathname;
  const appFile = isHome || corePaths.has(url.pathname) || /\.html$/i.test(url.pathname);
  event.respondWith(cacheFirst(request, appFile ? CACHE : ASSET_CACHE, key).catch(() => Response.error()));
});

let warmingAssets = null;
async function warmOptionalAssets() {
  let cursor = 0;
  let complete = true;
  const assetCache = await caches.open(ASSET_CACHE);
  // Two background downloads at a time avoid competing with the first screen.
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (cursor < OPTIONAL_ASSETS.length) {
      const key = scopedURL(OPTIONAL_ASSETS[cursor++]);
      try {
        const response = await cacheFirst(new Request(key), ASSET_CACHE, key);
        if (!response.ok || !(await assetCache.match(key))) complete = false;
      } catch (_) { complete = false; }
    }
  }));
  // Keep legacy images until all optional assets have migrated successfully.
  if (complete) {
    const names = await caches.keys();
    await Promise.all(names.filter(name => /^novel-reader-v\d+$/.test(name) && name !== CACHE)
      .map(name => caches.delete(name)));
  }
}

self.addEventListener('message', event => {
  if (event.data?.type !== 'WARM_ASSETS') return;
  if (!warmingAssets) warmingAssets = warmOptionalAssets().finally(() => { warmingAssets = null; });
  event.waitUntil(warmingAssets);
});
