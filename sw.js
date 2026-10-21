/* HistoPráctica – service worker (v7, sin conexión)
   - Navegación: red primero (máx. 4 s) y, si falla, la última versión guardada.
   - Estáticos (iconos, scripts, fuentes, librería): caché con actualización en segundo plano.
   - Imágenes de preguntas: se leen de la caché "hp-img", que llena el botón «Usar sin conexión» de la app.
   - Datos (API propia, Supabase, Wikimedia API) y peticiones que no son GET: directo a la red, sin caché. */
const VERSION = "hp-v13", IMG = "hp-img";
const SHELL = ["/", "/manifest.webmanifest", "/hp-config.js", "/hp-social.js", "/hp-offline.js", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/hp-motion.js?v=4", "/vendor/gsap.min.js", "/vendor/ScrollTrigger.min.js", "/vendor/DrawSVGPlugin.min.js", "/vendor/CustomEase.min.js", "/vendor/SplitText.min.js", "/vendor/Physics2DPlugin.min.js", "/vendor/CustomBounce.min.js", "/vendor/CustomWiggle.min.js", "/vendor/MotionPathPlugin.min.js", "/vendor/ScrollToPlugin.min.js"];
const EXTRA = ["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL);
    await Promise.allSettled(EXTRA.map(u => c.add(new Request(u, { mode: "cors", credentials: "omit" }))));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== IMG).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const NO_CACHE_HOSTS = [/\.supabase\.co$/, /\.supabase\.in$/, /(^|\.)wikimedia\.org$/, /(^|\.)wikipedia\.org$/];
const STATIC_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net"];

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (NO_CACHE_HOSTS.some(r => r.test(url.hostname))) {
    // Solo las imágenes: primero la copia descargada, si no existe, la red.
    if (req.destination === "image") e.respondWith(caches.open(IMG).then(c => c.match(req.url, { ignoreVary: true })).then(hit => hit || fetch(req)));
    return;
  }
  // La API va SIEMPRE directo a la red: la caché guarda por dirección, no por usuario.
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    e.respondWith((async () => {
      const fallback = () => caches.match("/").then(r => r || Response.error());
      try {
        const res = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(no, 4000))]);
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put("/", copy));
        return res;
      } catch (_) { return fallback(); }
    })());
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !STATIC_HOSTS.includes(url.hostname)) return;

  e.respondWith(
    caches.match(req, { ignoreVary: true }).then(cached => {
      const net = fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(VERSION).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || Response.error());
      return cached || net;
    })
  );
});
