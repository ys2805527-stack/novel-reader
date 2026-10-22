const CACHE = "novel-reader-v33";
const ASSETS = [
  "./",
  "./index.html",
  "./theme.css",
  "./manifest.json",
  "./icon-180v2.png",
  "./icon-192v2.png",
  "./icon-512v2.png",
  "./assets/vendor/jszip.min.js",
  "./assets/book-illustrations/cover-01.webp",
  "./assets/book-illustrations/cover-02.webp",
  "./assets/book-illustrations/cover-03.webp",
  "./assets/book-illustrations/cover-04.webp",
  "./assets/book-illustrations/cover-05.webp",
  "./assets/book-illustrations/cover-06.webp",
  "./assets/book-illustrations/cover-07.webp",
  "./assets/book-illustrations/cover-08.webp",
  "./assets/book-illustrations/cover-09.webp",
  "./assets/book-illustrations/cover-10.webp",
  "./assets/book-illustrations/cover-11.webp",
  "./assets/book-illustrations/cover-12.webp",
  "./assets/book-illustrations/cover-13.webp",
  "./assets/book-illustrations/cover-14.webp",
  "./assets/book-illustrations/cover-15.webp",
  "./assets/book-illustrations/cover-16.webp",
  "./assets/book-illustrations/cover-17.webp",
  "./assets/book-illustrations/cover-18.webp",
  "./assets/book-illustrations/cover-19.webp",
  "./assets/book-illustrations/cover-20.webp",
  "./assets/book-illustrations/cover-21.webp",
  "./assets/book-illustrations/cover-22.webp",
  "./assets/book-illustrations/cover-23.webp",
  "./assets/book-illustrations/cover-24.webp",
  "./assets/book-illustrations/cover-25.webp",
  "./assets/book-illustrations/cover-26.webp",
  "./assets/book-illustrations/cover-27.webp",
  "./assets/book-illustrations/cover-28.webp"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok && event.request.url.startsWith(self.location.origin)) {
      caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
    }
    return response;
  }).catch(() => event.request.mode === "navigate" ? caches.match("./index.html") : undefined)));
});
