// Parichay service worker.
//   app shell                  → precached, cache-first (opens in airplane mode)
//   WebLLM module, Google Fonts → cached on first online visit, stale-while-revalidate
//   Gemma weights               → left to WebLLM, which keeps them in its own Cache Storage
// Bump VERSION when shell files change.

const VERSION = "2";
const SHELL = `parichay-shell-${VERSION}`;
const RUNTIME = "parichay-runtime";
const PRECACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./icon.svg",
  "./js/main.js",
  "./js/adapters/gemma.js",
  "./js/domain/biodata.js",
  "./js/domain/extract.js",
  "./js/domain/format.js",
  "./js/domain/licence.js",
  "./js/domain/render.js",
];
const RUNTIME_HOSTS = ["esm.run", "cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("parichay-shell-") && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) event.respondWith(shellFirst(req));
  else if (RUNTIME_HOSTS.includes(url.hostname)) event.respondWith(staleWhileRevalidate(req));
});

async function shellFirst(req) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  try {
    return await fetch(req);
  } catch (err) {
    if (req.mode === "navigate") {
      const index = await cache.match("./index.html");
      if (index) return index;
    }
    throw err;
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(req);
  const fresh = fetch(req)
    .then((res) => {
      if (res.ok || res.type === "opaque") cache.put(req, res.clone());
      return res;
    })
    .catch(() => undefined);
  return hit ?? (await fresh) ?? Response.error();
}
