const CACHE = "novel-reader-v36";
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
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// 页面代码与样式必须走网络优先，否则改了代码用户永远拿到旧版本
const NETWORK_FIRST = /\.(html|css|js|json)$/i;

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isDocument = event.request.mode === "navigate" || url.pathname.endsWith("/") || NETWORK_FIRST.test(url.pathname);

  if (isDocument) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // 图片等静态资源：先用缓存，同时后台更新
  event.respondWith(
    caches.match(event.request).then(hit => {
      const network = fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
