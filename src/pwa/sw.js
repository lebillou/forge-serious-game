// Forge — service worker du site (GitHub Pages) : installation sur l'écran d'accueil et jeu hors connexion.
// La page est toujours redemandée au réseau quand il répond (jamais de version périmée) ; le cache ne sert qu'hors connexion.
const VERSION = '__VERSION__';
const CACHE = `forge-${VERSION}`;
const PAGE = './';
const CORE = [PAGE, 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
const FONTS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('forge-') && k !== CACHE && k !== 'forge-fonts').map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function page(req) {
  try {
    // « no-cache » : revalidation systématique, sans attendre l'expiration du cache HTTP de GitHub Pages
    const res = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(PAGE, copy)); }
    return res;
  } catch {
    const hit = await caches.match(PAGE, { cacheName: CACHE });
    return hit || Response.error();
  }
}

async function cacheFirst(req, name) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(name).then((c) => c.put(req, copy)); }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate' && url.origin === self.location.origin) e.respondWith(page(req));
  else if (FONTS.includes(url.origin)) e.respondWith(cacheFirst(req, 'forge-fonts'));
  else if (url.origin === self.location.origin) e.respondWith(cacheFirst(req, CACHE));
});
