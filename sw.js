const CACHE_NAME = 'little-wild-release-v6';
const CORE_FILES = [
  './', './index.html', './styles.css', './app.js', './animals.js', './credits.json',
  './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './assets/animals/animal-assets.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_FILES);
    const response = await cache.match('./assets/animals/animal-assets.json');
    if (!response) throw new Error('Animal asset manifest is missing');
    const assetPaths = JSON.parse(await response.text());
    if (!Array.isArray(assetPaths) || assetPaths.length !== 80) throw new Error('Expected exactly 80 animal photos');
    await cache.addAll(assetPaths);
    const cachedPhotos = (await cache.keys()).filter((request) => new URL(request.url).pathname.includes('/assets/animals/') && request.url.endsWith('.webp')).length;
    if (cachedPhotos !== 80) throw new Error(`Only ${cachedPhotos} of 80 animal photos were cached`);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith('little-wild-release-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cached = await caches.match('./index.html');
      return cached || Response.error();
    }));
    return;
  }
  event.respondWith(fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(request);
    return cached || Response.error();
  }));
});
