const CACHE_NAME = "joodkids-pro-v4";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./styles.css",
  "./app.js",
  "./admin.js",
  "./manifest.webmanifest",
  "./logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

// Network-first for same-origin navigation/JS/CSS, cache-first for core assets.
// Do NOT cache cross-origin requests (e.g., Firebase SDK).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Ignore cross-origin
  if (url.origin !== self.location.origin) return;

  const isNav = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  const isStatic = url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.endsWith(".png") || url.pathname.endsWith(".webmanifest");

  if (isNav || isStatic) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match(req).then(c => c || caches.match("./index.html")))
    );
    return;
  }

  // Other same-origin: cache-first
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
      return res;
    }))
  );
});
