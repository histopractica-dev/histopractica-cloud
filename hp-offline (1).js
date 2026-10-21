/* HistoPráctica – instalación y uso sin conexión.
   Guarda en este dispositivo el banco de preguntas y sus imágenes, deja entrar sin internet
   y manda las respuestas pendientes al servidor cuando vuelve la conexión (el servidor las vuelve a corregir). */
(function () {
  "use strict";
  var IMG = "hp-img", MODE = false, deferred = null, busy = false, flushing = false;
  var Q = "hp_offq", X = "hp_offx", OPT = "hp_off_opt";
  var $ = function (s) { return document.querySelector(s) };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m] }) };
  var lsGet = function (k) { try { return JSON.parse(localStorage.getItem(k) || "[]") } catch (e) { return [] } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { } };

  /* ---------- almacenamiento propio (IndexedDB) ---------- */
  var db = function () { return new Promise(function (res, rej) { var r = indexedDB.open("hp-offline", 1); r.onupgradeneeded = function () { r.result.createObjectStore("kv") }; r.onsuccess = function () { res(r.result) }; r.onerror = function () { rej(r.error) } }) };
  var idb = function (mode, key, val) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction("kv", mode === "r" ? "readonly" : "readwrite"), s = t.objectStore("kv"), q = mode === "r" ? s.get(key) : mode === "w" ? s.put(val, key) : s.delete(key); t.oncomplete = function () { res(q.result) }; t.onerror = t.onabort = function () { rej(t.error) } }) }) };

  var online = function () { return navigator.onLine !== false };
  var isApp = function () { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true };
  var isIOS = function () { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) };

  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; fab() });
  window.addEventListener("appinstalled", function () { deferred = null; fab() });

  /* ---------- descarga del paquete ---------- */
  async function download(onP) {
    var s = await SUPA.auth.getSession(), tok = s.data && s.data.session && s.data.session.access_token;
    if (!tok) throw new Error("Inicia sesión para descargar el contenido.");
    var r = await fetch("/api/offline-pack", { headers: { Authorization: "Bearer " + tok }, cache: "no-store" });
    var p = await r.json().catch(function () { return {} });
    if (!r.ok) throw new Error(p.error || "No se pudo descargar el banco.");
    var rows = p.questions || [];
    for (var i = 0; i < rows.length; i++) rows[i].__url = await imageUrlForRow(rows[i]);
    var urls = Array.from(new Set(rows.map(function (x) { return x.__url }).filter(Boolean)));
    var c = await caches.open(IMG), done = 0, fail = 0, n = 0;
    onP(0, urls.length);
    async function one() {
      while (n < urls.length) {
        var u = urls[n++];
        try {
          if (!(await c.match(u, { ignoreVary: true }))) {
            var res = await fetch(u, { mode: "cors", credentials: "omit" });
            if (!res.ok) throw new Error("HTTP " + res.status);
            await c.put(u, res)
          }
        } catch (e) { fail++ }
        onP(++done, urls.length)
      }
    }
    await Promise.all([one(), one(), one(), one()]);
    var keep = new Set(urls), ks = await c.keys();
    for (var k = 0; k < ks.length; k++) if (!keep.has(ks[k].url)) await c.delete(ks[k]);
    var pack = { rows: rows, at: Date.now(), images: urls.length - fail, failed: fail };
    await idb("w", "pack", pack);
    try { localStorage.setItem(OPT, "1") } catch (e) { }
    return pack
  }

  /* ---------- cola de respuestas sin conexión ---------- */
  function queue(rec) { var q = lsGet(Q).filter(function (x) { return x.answerId !== rec.answerId }); q.push(rec); lsSet(Q, q) }
  function queueExam(S) {
    var body = { attemptId: S.attemptId, title: "Práctica de histología", mode: "practice", themes: (S.c && S.c.temas) || [], startedAt: S.startedAt, durationSeconds: Math.floor((Date.now() - S.startTimeMs) / 1000), details: S.ans.map(function (x) { return { question_id: x.q.it.e.id, mode: x.q.it.m, theme: x.q.it.e.tema, target: x.q.it.t || null, selected: x.pick, prompt: x.q.txt } }) };
    var q = lsGet(X).filter(function (x) { return x.attemptId !== body.attemptId }); q.push(body); lsSet(X, q)
  }
  var pending = function () { return lsGet(Q).length + lsGet(X).length };
  async function flush() {
    if (flushing || !online() || !pending() || typeof SUPA === "undefined" || !SUPA) return;
    flushing = true;
    try {
      var s = await SUPA.auth.getSession();
      if (!s.data || !s.data.session) return;
      var tok = s.data.session.access_token, q = lsGet(Q), keepQ = [];
      for (var i = 0; i < q.length; i++) {
        try { await progressRequest("POST", q[i]) } catch (e) { if (e instanceof TypeError) { keepQ = q.slice(i); break } console.warn("Respuesta descartada:", e.message) }
      }
      lsSet(Q, keepQ);
      var xs = lsGet(X), keepX = [];
      for (var j = 0; j < xs.length; j++) {
        try {
          var r = await fetch("/api/finish-exam", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok }, body: JSON.stringify(xs[j]) });
          if (!r.ok && r.status >= 500) throw new TypeError("server")
        } catch (e) { if (e instanceof TypeError) { keepX = xs.slice(j); break } }
      }
      lsSet(X, keepX);
      if (!keepQ.length && typeof syncProgress === "function") syncProgress()
    } finally { flushing = false; fab(); toast() }
  }

  /* ---------- entrar sin conexión ---------- */
  async function boot() {
    try {
      var u = await idb("r", "user"), pack = await idb("r", "pack");
      if (!u || !pack || !u.user) return false;
      MODE = true;
      CURRENT_USER = u.user; CURRENT_PROFILE = Object.assign({}, u.profile, { role: "student" });
      REMOTE_BANK = await rowsToBank(pack.rows, true); loadBank();
      var pr = u.progress || {};
      ANSWERED = new Set((pr.keys || []).concat(lsGet(Q).map(function (x) { return x.key })));
      REMOTE_ERRORS = pr.errors || []; REMOTE_STATS = pr.stats || {}; SYNC_READY = true; SYNC_ERROR = false;
      LANDING_ACTIVE = false; home(); toast(); fab();
      return true
    } catch (e) { console.warn("Modo sin conexión no disponible", e); return false }
  }
  function saveUser(user, profile) {
    idb("r", "user").then(function (old) {
      return idb("w", "user", { user: { id: user.id, email: user.email, user_metadata: user.user_metadata }, profile: { id: profile.id, display_name: profile.display_name, email: profile.email, role: profile.role }, progress: (old && old.progress && old.user && old.user.id === user.id) ? old.progress : null })
    }).catch(function () { })
  }
  function saveProgress(p) { idb("r", "user").then(function (u) { if (u) { u.progress = { keys: p.keys, errors: p.errors, stats: p.stats }; return idb("w", "user", u) } }).catch(function () { }) }
  async function clearUser() { try { await idb("d", "user"); await idb("d", "pack"); localStorage.removeItem(OPT) } catch (e) { } fab() }
  var PACK = null;
  async function loadPack() { try { PACK = await idb("r", "pack") } catch (e) { PACK = null } return PACK }
  var same = function (a, b) { return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h };
  function fullItem(item) {
    if (!PACK) return item;
    var row = PACK.rows.filter(function (r) { return r.id === item.e.id })[0];
    if (!row) return item;
    var e = Object.assign({}, item.e, { subtipo: row.subtype || undefined, division: row.division || undefined, neurona: row.neuron || undefined, celulas: row.cells || [], estructuras: row.structures || [] }), t = item.t;
    if (t) { var l = (item.m === "B" ? e.celulas : e.estructuras).filter(function (c) { return c && same(c, t) })[0]; if (!l) return item; t = Object.assign({}, t, { n: l.n }) }
    return Object.assign({}, item, { e: e }, t ? { t: t } : {})
  }
  async function afterLogin() {
    await loadPack();
    flush();
    var old = !PACK || Date.now() - PACK.at > 864e5;
    if (localStorage.getItem(OPT) === "1" && old && online() && !(navigator.connection && navigator.connection.saveData)) {
      try { await download(function () { }); await loadPack() } catch (e) { console.warn("No se pudo actualizar el paquete", e) }
    }
    fab()
  }

  /* ---------- interfaz ---------- */
  function css() {
    if ($("#hp-off-css")) return;
    var s = document.createElement("style"); s.id = "hp-off-css";
    s.textContent = "#hp-off-fab{position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:40;width:44px;height:44px;border-radius:50%;border:2px solid var(--ln,#e5e5e5);background:var(--card,#fff);color:inherit;font-size:20px;cursor:pointer;box-shadow:0 2px 0 var(--ln,#e5e5e5)}#hp-off-fab[hidden],body:not(.hasnav) #hp-off-fab{display:none}#hp-off-fab{font-family:\"Apple Color Emoji\",\"Segoe UI Emoji\",\"Noto Color Emoji\",sans-serif;font-variant-emoji:emoji;line-height:1;padding:0}#hp-off-fab i{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:#ff9600;color:#fff;font:800 11px/18px Nunito,sans-serif;font-style:normal;text-align:center}#hp-off-bar{position:fixed;left:0;right:0;top:0;z-index:60;padding:calc(6px + env(safe-area-inset-top,0px)) 12px 6px;background:#ff9600;color:#fff;font:700 13px/1.3 Nunito,sans-serif;text-align:center}.hp-off-pb{height:10px;border-radius:5px;background:var(--ln,#e5e5e5);overflow:hidden;margin:10px 0}.hp-off-pb b{display:block;height:100%;width:0;background:#58cc02;transition:width .2s}@media(max-width:899px){body.hasnav #hp-off-fab{bottom:calc(80px + env(safe-area-inset-bottom,0px))}}";
    document.head.appendChild(s)
  }
  function fab() {
    css();
    var b = $("#hp-off-fab");
    if (!b) { b = document.createElement("button"); b.id = "hp-off-fab"; b.type = "button"; b.setAttribute("aria-label", "Instalar y usar sin conexión"); b.onclick = panel; document.body.appendChild(b) }
    var n = pending();
    b.innerHTML = "📲\uFE0F" + (n ? "<i>" + n + "</i>" : "");
    b.hidden = !(typeof CURRENT_USER !== "undefined" && CURRENT_USER) && !deferred
  }
  function toast() {
    var bar = $("#hp-off-bar");
    var msg = !online() || MODE ? "Sin conexión · tus respuestas se guardan y se envían al reconectar" : "";
    if (!msg) { if (bar) bar.remove(); return }
    css();
    if (!bar) { bar = document.createElement("div"); bar.id = "hp-off-bar"; bar.setAttribute("role", "status"); document.body.appendChild(bar) }
    bar.textContent = msg
  }
  function packInfo(pack, est) { return pack ? "✅ Contenido descargado: <b>" + pack.rows.length + "</b> preguntas y <b>" + pack.images + "</b> imágenes" + (pack.failed ? " (" + pack.failed + " no se pudieron bajar)" : "") + ". Actualizado el " + new Date(pack.at).toLocaleDateString("es") + est + "." : "Aún no has descargado el contenido para usar sin conexión." }
  async function usage() { try { var e = await navigator.storage.estimate(); return " · uso en este dispositivo: " + Math.round((e.usage || 0) / 1048576) + " MB" } catch (x) { return "" } }
  async function panel() {
    var pack = await loadPack(), n = pending(), est = "";
    try { var e = await navigator.storage.estimate(); est = " · uso en este dispositivo: " + Math.round((e.usage || 0) / 1048576) + " MB" } catch (x) { }
    var inst = isApp() ? "<p>✅ La app ya está instalada en este dispositivo.</p>" : deferred ? '<button class="btn" id="hp-i" type="button">Instalar la app</button>' : isIOS() ? "<p>En Safari toca <b>Compartir</b> y luego <b>Añadir a pantalla de inicio</b>.</p>" : "<p>Abre el menú del navegador y elige <b>Instalar app</b> (o <b>Añadir a pantalla de inicio</b>).</p>";
    var logged = typeof CURRENT_USER !== "undefined" && CURRENT_USER && !MODE;
    var pk = '<p id="hp-pk">' + packInfo(pack, est) + "</p>";
    modal('<h2 style="margin-top:0;font-size:1.25rem">Instalar y usar sin conexión</h2>' + inst + pk + (n ? "<p>🔄 Respuestas pendientes de enviar: <b>" + n + "</b></p>" : "") + '<div class="hp-off-pb" hidden><b id="hp-pb"></b></div><p class="mu" id="hp-om"></p>' + (logged ? '<button class="btn" id="hp-d" type="button">' + (pack ? "Actualizar contenido" : "Descargar para usar sin conexión") + "</button>" : '<p class="mu">' + (MODE ? "Estás sin conexión." : "Inicia sesión para descargar el contenido.") + "</p>") + '<p class="mu">La descarga usa datos móviles; conviene hacerla con Wi-Fi. Para entrar sin internet debes haber iniciado sesión antes en este dispositivo.</p>');
    var i = $("#hp-i"); if (i) i.onclick = async function () { deferred.prompt(); await deferred.userChoice; deferred = null; fab() };
    var d = $("#hp-d"); if (d) d.onclick = async function () {
      if (busy) return; busy = true; d.disabled = true;
      var pb = $(".hp-off-pb"), bar = $("#hp-pb"), m = $("#hp-om"); pb.hidden = false; m.textContent = "Descargando…";
      try {
        var r = await download(function (a, t) { bar.style.width = (t ? Math.round(100 * a / t) : 100) + "%"; m.textContent = "Descargando imágenes " + a + " de " + t + "…" });
        await loadPack(); var pkEl = $("#hp-pk"); if (pkEl && PACK) pkEl.innerHTML = packInfo(PACK, await usage()); d.textContent = "Actualizar contenido"; m.textContent = "Listo: " + r.rows.length + " preguntas disponibles sin conexión." + (r.failed ? " " + r.failed + " imágenes no se pudieron bajar; vuelve a pulsar para reintentar." : "")
      } catch (e) { m.textContent = (e && e.message) || "No se pudo completar la descarga." }
      busy = false; d.disabled = false
    }
  }

  window.addEventListener("online", function () {
    toast(); flush().then(function () {
      if (MODE && typeof SUPA !== "undefined" && SUPA) SUPA.auth.getSession().then(function (s) { if (s.data && s.data.session) { MODE = false; toast(); enterApp(s.data.session).catch(function () { }) } }).catch(function () { })
    })
  });
  window.addEventListener("offline", function () { loadPack(); toast() });
  document.addEventListener("DOMContentLoaded", function () { loadPack(); toast() });
  if (document.readyState !== "loading") { loadPack(); toast() }

  window.hpOffline = { boot: boot, on: function () { return MODE || !online() }, full: fullItem, queue: queue, queueExam: queueExam, saveUser: saveUser, saveProgress: saveProgress, clearUser: clearUser, afterLogin: afterLogin, flush: flush };
})();
