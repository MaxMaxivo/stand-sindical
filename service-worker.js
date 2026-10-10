const CACHE_NAME = "stand-sindical-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/css/styles.css",
  "./assets/data/images.js",
  "./assets/data/products.js",
  "./assets/data/shows.js",
  "./assets/data/config.js",
  "./assets/js/domain.js",
  "./assets/js/storage.js",
  "./assets/js/cloud.js",
  "./assets/js/app.js",
  "./assets/images/bufalo-3d.svg",
  "./assets/images/remera-unisex.svg",
  "./assets/images/producto-pendiente.svg",
  "./assets/images/icon.svg",
  "./assets/images/remeras-oficial.jpg",
  "./assets/images/lamina-zajaros.webp",
  "./assets/images/discos-oficial.jpg",
  "./assets/images/libro-subtitulado.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("stand-sindical-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
