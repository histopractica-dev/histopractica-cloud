/* HistoPráctica – service worker
   - Navegación: red primero, con la última versión guardada como respaldo sin conexión.
   - Recursos estáticos (iconos, fuentes, librería): caché con actualización en segundo plano.
   - Datos (API propia, Supabase, Wikimedia) y peticiones que no son GET: siempre directo a la red, sin caché. */
const VERSION = "hp-v5";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/hp-motion.js?v=4", "/hp-social.js", "/hp-config.js", "/vendor/gsap.min.js", "/vendor/ScrollTrigger.min.js", "/vendor/DrawSVGPlugin.min.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const NO_CACHE_HOSTS = [/\.supabase\.co$/, /\.supabase\.in$/, /(^|\.)wikimedia\.org$/, /(^|\.)wikipedia\.org$/];
const STATIC_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net"];

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (NO_CACHE_HOSTS.some(r => r.test(url.hostname))) return;
  // La API (progreso, banco, preguntas) va SIEMPRE directo a la red: la caché guarda por dirección, no por usuario, y mostraba datos viejos o de otra cuenta.
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return;

  // Páginas: red primero, caché como respaldo
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/").then(r => r || Response.error()))
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !STATIC_HOSTS.includes(url.hostname)) return;

  // Estáticos: caché primero y se actualiza en segundo plano
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(VERSION).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});
