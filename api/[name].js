// HistoPráctica · API completa en UN solo archivo para Vercel.
// Ubicación en el repositorio: api/[name].js   →  atiende /api/bank, /api/progress, /api/finish-exam, etc.
const __defs = {}, __cache = {};
const __resolve = (dir, p) => { const parts = dir ? dir.split("/") : []; for (const seg of p.split("/")) { if (seg === "." || seg === "") continue; if (seg === "..") parts.pop(); else parts.push(seg); } return parts.join("/").replace(/\.js$/, ""); };
const __makeRequire = (dir) => (p) => {
  if (!p.startsWith(".")) return require(p);
  const key = __resolve(dir, p);
  if (__cache[key]) return __cache[key].exports;
  if (!__defs[key]) throw new Error("Módulo interno no encontrado: " + key);
  const m = { exports: {} }; __cache[key] = m;
  __defs[key](m, m.exports, __makeRequire(key.includes("/") ? key.slice(0, key.lastIndexOf("/")) : ""));
  return m.exports;
};

__defs["_lib/labels"] = function (module, exports, require) {
// Catálogos de etiquetas para generar distractores (copia de los de la página).
const T={epi:"Tejido epitelial",con:"Tejido conjuntivo",adi:"Tejido adiposo",car:"Tejido cartilaginoso",oseo:"Tejido óseo",san:"Sangre",mus:"Tejido muscular",ner:"Tejido nervioso"};
const LB={epi:["Epitelio simple plano","Epitelio simple cúbico","Epitelio simple cilíndrico","Epitelio plano estratificado queratinizado","Epitelio plano estratificado no queratinizado","Epitelio plano estratificado paraqueratinizado","Epitelio cúbico estratificado","Epitelio cilíndrico estratificado","Epitelio pseudoestratificado","Urotelio (epitelio de transición)"],
con:["Tejido conjuntivo laxo","Tejido conjuntivo denso irregular","Tejido conjuntivo denso regular","Mesénquima","Tejido conjuntivo mucoso"],
adi:["Tejido adiposo blanco (unilocular)","Tejido adiposo pardo (multilocular)"],car:["Cartílago hialino","Cartílago elástico","Fibrocartílago"],
oseo:["Hueso compacto","Hueso esponjoso"],san:["Frotis sanguíneo"],mus:["Músculo estriado esquelético","Músculo estriado cardiaco","Músculo liso"],
ner:["Corteza cerebral","Corteza cerebelosa","Epitelio ependimario","Sustancia blanca","Sustancia negra","Sustancia gris","Nervio periférico","Ganglio espinal","Ganglio autónomo"]};
const DIVS=["Sistema nervioso central","Sistema nervioso periférico"];
const CE={san:["Eritrocito","Neutrófilo","Eosinófilo","Basófilo","Linfocito","Monocito","Plaqueta","Célula plasmática","Neutrófilo en banda","Reticulocito"],con:["Fibroblasto","Fibrocito","Macrófago","Mastocito","Célula plasmática","Adipocito","Célula mesenquimatosa"],adi:["Adipocito","Adipocito multilocular","Fibroblasto","Célula endotelial","Macrófago"],
car:["Condrocito","Condroblasto","Célula condrogénica","Fibroblasto"],oseo:["Osteocito","Osteoblasto","Osteoclasto","Célula osteoprogenitora"],mus:["Fibra muscular esquelética","Cardiomiocito","Célula muscular lisa"],
ner:["Neurona","Astrocito","Oligodendrocito","Microglía","Célula ependimaria"],epi:["Célula epitelial","Célula caliciforme","Célula basal","Célula ciliada","Célula en paraguas (urotelio)","Célula endotelial"]};
const ES={epi:["Membrana basal","Luz","Tejido conectivo subyacente","Cilios","Microvellosidades (borde en cepillo)","Estrato córneo"],con:["Fibras colágenas","Sustancia fundamental","Núcleo de fibroblasto"],adi:["Adipocito","Capilar","Núcleo del adipocito"],
car:["Condrocito","Laguna","Grupo isógeno","Matriz territorial","Matriz interterritorial","Pericondrio"],oseo:["Osteona","Conducto de Havers","Sistemas intersticiales","Periostio","Endostio","Laguna"],
san:["Núcleo multilobulado","Gránulos citoplasmáticos","Palidez central","Núcleo arriñonado","Núcleo excéntrico","Halo perinuclear (Golgi)","Citoplasma basófilo"],mus:["Disco intercalar","Endomisio","Perimisio","Núcleo periférico","Fascículo muscular"],ner:["Soma","Dendritas","Axón","Plexo coroideo","Epitelio ependimario","Neuropilo"]};
const REL={san:["con"],con:["san","adi"],adi:["con"],car:["oseo","con"],oseo:["car","con"],mus:["con"],ner:["epi"],epi:["con"]};

module.exports={T,LB,CE,ES,REL,DIVS};

};

__defs["_lib/email"] = function (module, exports, require) {
// Helper único de correo (Resend). Úsalo desde cualquier función de Netlify:
//   const { sendEmail, esc } = require("./_lib/email");
// Variables de entorno: RESEND_API_KEY, EMAIL_FROM (remitente), NOTIFICATION_EMAIL (destino; admite varios separados por coma).
const RESEND_URL = "https://api.resend.com/emails";

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const recipients = () => String(process.env.NOTIFICATION_EMAIL || "").split(/[;,]/).map((x) => x.trim()).filter(Boolean);

async function sendEmail({ subject, html, text, to, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const list = to && to.length ? to : recipients();
  const missing = [!apiKey && "RESEND_API_KEY", !from && "EMAIL_FROM", !list.length && "NOTIFICATION_EMAIL"].filter(Boolean);
  if (missing.length) return { ok: false, error: `Faltan variables de entorno en Vercel: ${missing.join(", ")}` };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "User-Agent": "histopractica/1.0" },
      body: JSON.stringify({ from, to: list, subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, status: response.status, error: body.message || body.error || `Resend respondió ${response.status}` };
    return { ok: true, id: body.id };
  } catch (error) {
    return { ok: false, error: error.name === "AbortError" ? "Tiempo de espera agotado con Resend" : error.message };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { sendEmail, esc, recipients };

};

__defs["_lib/supa"] = function (module, exports, require) {
// Utilidades de Supabase (sin dependencias): validar sesión y hablar con PostgREST usando la service-role key.
// Variables de Netlify: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

const baseUrl = () => (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const anonKey = () => process.env.SUPABASE_ANON_KEY || "";
const enc = encodeURIComponent;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });

function needEnv() {
  const missing = [!baseUrl() && "SUPABASE_URL", !serviceKey() && "SUPABASE_SERVICE_ROLE_KEY"].filter(Boolean);
  if (missing.length) throw new HttpError(500, `Faltan variables en Vercel: ${missing.join(", ")}.`);
}

async function rest(path, { method = "GET", body, prefer, headers = {} } = {}) {
  needEnv();
  const res = await fetch(`${baseUrl()}/rest/v1/${path}`, {
    method,
    headers: { apikey: serviceKey(), Authorization: `Bearer ${serviceKey()}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) {}
  if (!res.ok) throw new HttpError(502, `Supabase ${res.status}: ${(data && (data.message || data.error)) || text || "error"}`);
  return data;
}

// Lee todas las filas (PostgREST limita a 1000 por petición). `path` debe incluir un order estable.
async function restAll(path) {
  const out = [], size = 1000;
  for (let offset = 0; ; offset += size) {
    const page = await rest(`${path}${path.includes("?") ? "&" : "?"}limit=${size}&offset=${offset}`);
    out.push(...(page || []));
    if (!page || page.length < size) return out;
  }
}

// Valida el access_token con Supabase y devuelve { user, profile, isAdmin }.
async function authenticate(event, { needProfile = true } = {}) {
  needEnv();
  const token = String((event.headers && (event.headers.authorization || event.headers.Authorization)) || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new HttpError(401, "Falta la sesión. Inicia sesión de nuevo.");
  let res;
  try { res = await fetch(`${baseUrl()}/auth/v1/user`, { headers: { apikey: anonKey() || serviceKey(), Authorization: `Bearer ${token}` } }); }
  catch (e) { throw new HttpError(502, "No se pudo validar la sesión."); }
  if (!res.ok) throw new HttpError(401, "Tu sesión expiró. Inicia sesión de nuevo.");
  const user = await res.json();
  if (!user || !user.id) throw new HttpError(401, "Sesión no válida.");
  let profile = null;
  if (needProfile) {
    const rows = await rest(`profiles?id=eq.${enc(user.id)}&select=id,email,display_name,role&limit=1`);
    profile = (rows && rows[0]) || null;
  }
  return { user, profile, isAdmin: !!profile && profile.role === "admin" };
}

const parseBody = (event) => { try { return JSON.parse(event.body || "{}") || {}; } catch (e) { throw new HttpError(400, "JSON no válido."); } };

// Envuelve un handler: método permitido + manejo uniforme de errores.
const wrap = (methods, fn) => async (event) => {
  try {
    if (!methods.includes(event.httpMethod)) return json(405, { error: "Método no permitido" });
    return await fn(event);
  } catch (error) {
    if (error instanceof HttpError) return json(error.status, { error: error.message });
    console.error(error);
    return json(500, { error: "Error interno del servidor." });
  }
};

module.exports = { HttpError, rest, restAll, authenticate, parseBody, wrap, json, enc, UUID, serviceKey, baseUrl };

};

__defs["_lib/quiz"] = function (module, exports, require) {
// Lógica de preguntas en el servidor: respuesta correcta, clave de pregunta y opciones (con distractores).
const crypto = require("crypto");
const { LB, CE, ES, REL, DIVS } = require("./labels");
const { rest, HttpError, enc } = require("./supa");

const norm = (s) => String(s == null ? "" : s).normalize("NFC").trim().toLowerCase();
const shuf = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const distract = (ans, tiers) => { const seen = new Set([norm(ans)]), out = []; for (const t of tiers) for (const x of shuf(t)) if (out.length < 3 && !seen.has(norm(x))) { seen.add(norm(x)); out.push(x); } return out; };

const sameNum = (a, b) => (a == null && b == null) || (a != null && b != null && Math.abs(Number(a) - Number(b)) < 1e-6);
const matchTarget = (list, t) => (t && Array.isArray(list) ? list.find((c) => c && sameNum(c.x, t.x) && sameNum(c.y, t.y) && sameNum(c.w, t.w) && sameNum(c.h, t.h)) || null : null);

async function findQuestion(id, isAdmin) {
  if (typeof id !== "string" || !id || id.length > 300) throw new HttpError(400, "Pregunta no válida.");
  const rows = await rest(`questions?id=eq.${enc(id)}&select=*&limit=1`);
  const q = rows && rows[0];
  if (!q || (!isAdmin && !(q.published && q.verified))) throw new HttpError(404, "Esa pregunta ya no está disponible.");
  return q;
}

// Devuelve la respuesta correcta y la clave que usa la página (mismo formato que itKey del cliente).
function resolve(q, mode, target) {
  if (mode === "A") {
    if (!q.subtype) throw new HttpError(400, "Esta imagen no tiene pregunta de tejido.");
    return { expected: q.subtype, key: `${q.id}|A|` };
  }
  if (mode === "D") {
    if (!q.division) throw new HttpError(400, "Esta imagen no tiene pregunta de central o periférico.");
    return { expected: q.division, key: `${q.id}|D|` };
  }
  if (mode !== "B" && mode !== "C") throw new HttpError(400, "Modalidad no válida.");
  const t = matchTarget(mode === "B" ? q.cells : q.structures, target);
  if (!t || !t.n) throw new HttpError(404, "No se encontró esa marca en la imagen.");
  return { expected: t.n, key: `${q.id}|${mode}|${t.x},${t.y},${t.w},${t.h}` };
}

const cache = new Map();
async function bankNames(theme, mode) {
  let e = cache.get(theme);
  if (!e || Date.now() - e.t > 60000) { e = { t: Date.now(), rows: (await rest(`questions?theme=eq.${enc(theme)}&published=eq.true&verified=eq.true&select=cells,structures`)) || [] }; cache.set(theme, e); }
  return e.rows.flatMap((r) => (mode === "B" ? r.cells : r.structures) || []).map((m) => m && m.n).filter(Boolean);
}

async function optionsFor(q, mode, expected) {
  // Modalidad D (sistema nervioso): solo central vs periférico.
  if (mode === "D") return shuf([expected, ...DIVS.filter((x) => norm(x) !== norm(expected))]);
  const pool = mode === "A" ? LB : mode === "B" ? CE : ES;
  const mine = mode === "A" ? [] : await bankNames(q.theme, mode);
  const same = (pool[q.theme] || []).concat(mine), rel = (REL[q.theme] || []).flatMap((k) => pool[k] || []), all = [].concat(...Object.values(pool));
  // «Tejido» en sistema nervioso solo compite con regiones específicas (nunca con central/periférico ni con otros tejidos).
  const tiers = mode === "A" && q.theme === "ner" ? [same] : [same, rel, all];
  return shuf([expected, ...distract(expected, tiers)]);
}

module.exports = { norm, findQuestion, resolve, optionsFor, matchTarget };

};

__defs["_lib/notify"] = function (module, exports, require) {
// Cola de notificaciones (tabla notification_outbox) + envío con Resend.
const crypto = require("crypto");
const { sendEmail, esc } = require("./email");
const { rest, enc } = require("./supa");

const tz = () => process.env.NOTIFICATION_TIMEZONE || "America/Mexico_City";
const fmtDate = (iso) => { try { return new Date(iso).toLocaleString("es-MX", { timeZone: tz(), dateStyle: "full", timeStyle: "medium" }); } catch (e) { return String(iso || ""); } };
const table = (rows) => `<table style="border-collapse:collapse;width:100%">${rows.map(([k, v]) => `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#777;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:8px;border-bottom:1px solid #eee"><b>${esc(v)}</b></td></tr>`).join("")}</table>`;
const wrapHtml = (title, inner) => `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#333"><h2 style="margin:0 0 12px">${esc(title)}</h2>${inner}</div>`;

function buildEmail(type, p) {
  if (type === "login") {
    const rows = [["Usuario", p.email || "—"], ["Nombre", p.name || "—"], ["Método", p.method || "—"], ["Fecha y hora", fmtDate(p.at)], ["IP", p.ip || "—"], ["Dispositivo", p.ua || "—"]];
    return { subject: `🔑 Inicio de sesión: ${p.email || "usuario"}`, html: wrapHtml("🔑 Nuevo inicio de sesión en HistoPráctica", table(rows)), text: "Nuevo inicio de sesión en HistoPráctica\n\n" + rows.map(([k, v]) => `${k}: ${v}`).join("\n") };
  }
  if (type === "exam_completed") {
    const secs = Math.max(0, Math.floor(p.duration_seconds || 0));
    const who = p.name ? `${p.name} (${p.email})` : p.email || "—";
    const rows = [["Estudiante", who], ["Resultado", `${p.correct} de ${p.total} correctas · ${p.score}%`], ["Incorrectas", String(p.incorrect)], ["Sin responder", String(p.unanswered || 0)], ["Temas", (p.themes || []).join(", ") || "—"], ["Duración", `${Math.floor(secs / 60)} min ${secs % 60} s`], ["Fecha y hora", fmtDate(p.at)]];
    const bad = Array.isArray(p.bad) ? p.bad : [];
    const badHtml = bad.length ? `<h3 style="margin:18px 0 6px">Falladas</h3>${bad.map((b) => `<p style="margin:6px 0">${esc(b.prompt)}<br>Eligió: <span style="color:#c0392b">${esc(b.selected)}</span> · Correcta: <b style="color:#2e7d32">${esc(b.expected)}</b></p>`).join("")}` : "";
    const badText = bad.length ? "\n\nFalladas:\n" + bad.map((b) => `- ${b.prompt} | Eligió: ${b.selected} | Correcta: ${b.expected}`).join("\n") : "";
    return { subject: `📝 Examen: ${p.email || "estudiante"} · ${p.score}% (${p.correct}/${p.total})`, html: wrapHtml("📝 Examen completado en HistoPráctica", table(rows) + badHtml), text: "Examen completado en HistoPráctica\n\n" + rows.map(([k, v]) => `${k}: ${v}`).join("\n") + badText };
  }
  return { subject: `Notificación de HistoPráctica (${type})`, html: wrapHtml("Notificación", `<pre>${esc(JSON.stringify(p, null, 2))}</pre>`), text: JSON.stringify(p, null, 2) };
}

const patchAttempt = (attemptId, ok, error) => rest(`exam_attempts?id=eq.${enc(attemptId)}`, { method: "PATCH", prefer: "return=minimal", body: ok ? { notification_status: "sent", notification_error: null, email_sent_at: new Date().toISOString() } : { notification_status: "failed", notification_error: String(error || "error").slice(0, 500) } });

// Envía una fila de la cola y registra el resultado (en la cola y, si aplica, en exam_attempts).
async function deliver(row) {
  const p = row.payload || {};
  await rest(`notification_outbox?id=eq.${enc(row.id)}`, { method: "PATCH", prefer: "return=minimal", body: { status: "sending" } }).catch(() => {});
  const result = await sendEmail(buildEmail(row.event_type, p));
  await rest(`notification_outbox?id=eq.${enc(row.id)}`, { method: "PATCH", prefer: "return=minimal", body: result.ok ? { status: "sent", attempts: (row.attempts || 0) + 1, last_error: null, sent_at: new Date().toISOString() } : { status: "failed", attempts: (row.attempts || 0) + 1, last_error: String(result.error || "error").slice(0, 500) } }).catch((e) => console.error("outbox update", e.message));
  if (p.attempt_id) await patchAttempt(p.attempt_id, result.ok, result.error).catch((e) => console.error("attempt update", e.message));
  return result;
}

async function queue(eventType, payload) {
  const rows = await rest("notification_outbox", { method: "POST", prefer: "return=representation", body: { id: crypto.randomUUID(), event_type: eventType, payload, status: "pending", attempts: 0, created_at: new Date().toISOString() } });
  return rows && rows[0];
}

// Encola y envía. Si la cola no está disponible, envía directo para no perder el aviso.
async function notify(eventType, payload) {
  let row = null;
  try { row = await queue(eventType, payload); } catch (e) { console.error("outbox insert:", e.message); }
  if (row) return deliver(row);
  const result = await sendEmail(buildEmail(eventType, payload));
  if (payload.attempt_id) await patchAttempt(payload.attempt_id, result.ok, result.error).catch(() => {});
  return result;
}

module.exports = { buildEmail, deliver, queue, notify, patchAttempt };

};

__defs["public-config"] = function (module, exports, require) {
// GET /.netlify/functions/public-config → valores públicos de Supabase para el navegador.
const { json } = require("./_lib/supa");
exports.handler = async () => {
  const supabaseUrl = process.env.SUPABASE_URL, supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return json(500, { error: "Faltan SUPABASE_URL y/o SUPABASE_ANON_KEY en Vercel." });
  return json(200, { supabaseUrl, supabaseAnonKey });
};

};

__defs["bank"] = function (module, exports, require) {
// GET /.netlify/functions/bank → catálogo de preguntas.
// Admin: todo (con respuestas). Estudiante: solo publicadas y verificadas, SIN respuestas (las marcas llevan un código opaco).
const crypto = require("crypto");
const { wrap, json, authenticate, restAll, serviceKey } = require("./_lib/supa");

const token = (n) => "g" + crypto.createHmac("sha256", serviceKey()).update(String(n || "").trim().toLowerCase()).digest("hex").slice(0, 10);
const mask = (list) => (Array.isArray(list) ? list : []).map((t) => ({ n: token(t && t.n), x: t.x, y: t.y, w: t.w, h: t.h }));

exports.handler = wrap(["GET"], async (event) => {
  const { isAdmin } = await authenticate(event);
  const select = "id,theme,subtype,division,image_path,external_image_url,source,source_url,author,license,traits,verified,published,cells,structures,guides";
  const rows = await restAll(`questions?select=${select}${isAdmin ? "" : "&published=eq.true&verified=eq.true"}&order=created_at.asc,id.asc`);
  const questions = rows.map((r) => (isAdmin ? { ...r, has_subtype: !!r.subtype, has_division: !!r.division } : { ...r, subtype: null, division: null, has_subtype: !!r.subtype, has_division: !!r.division, cells: mask(r.cells), structures: mask(r.structures) }));
  return json(200, { questions });
});

};

__defs["question-detail"] = function (module, exports, require) {
// POST /.netlify/functions/question-detail  { questionId, mode, target } → { options }
const { wrap, json, authenticate, parseBody } = require("./_lib/supa");
const { findQuestion, resolve, optionsFor } = require("./_lib/quiz");

exports.handler = wrap(["POST"], async (event) => {
  const { isAdmin } = await authenticate(event);
  const { questionId, mode, target } = parseBody(event);
  const q = await findQuestion(questionId, isAdmin);
  const { expected } = resolve(q, mode, target);
  return json(200, { options: await optionsFor(q, mode, expected) });
});

};

__defs["progress"] = function (module, exports, require) {
// /.netlify/functions/progress
//  GET    → { keys, errors, stats }          (progreso del usuario)
//  POST   → { isCorrect, expected }          (verifica y guarda UNA respuesta)
//  DELETE → { ok }                           (reinicia el progreso)
const crypto = require("crypto");
const { wrap, json, authenticate, parseBody, rest, restAll, enc, UUID, HttpError } = require("./_lib/supa");
const { findQuestion, resolve, norm } = require("./_lib/quiz");

async function getProgress(uid) {
  const rows = await restAll(`practice_answers?user_id=eq.${enc(uid)}&select=question_key,theme,is_correct,answered_at&order=answered_at.asc,id.asc`);
  const last = new Map(), t = {};
  let n = 0, a = 0, streak = 0, best = 0;
  for (const r of rows) {
    last.set(r.question_key, r.is_correct); n++;
    const z = (t[r.theme] = t[r.theme] || { a: 0, n: 0 }); z.n++;
    if (r.is_correct) { a++; z.a++; streak++; best = Math.max(best, streak); } else streak = 0;
  }
  let s = 0;
  if (rows.length) { const at = await rest(`exam_attempts?user_id=eq.${enc(uid)}&completed_at=gte.${enc(rows[0].answered_at)}&select=id`); s = (at || []).length; }
  return { keys: [...last.keys()], errors: [...last].filter(([, ok]) => !ok).map(([k]) => k), stats: { xp: a * 10, n, a, best, s, t } };
}

exports.handler = wrap(["GET", "POST", "DELETE"], async (event) => {
  const { user, isAdmin } = await authenticate(event);
  if (event.httpMethod === "GET") return json(200, await getProgress(user.id));

  if (event.httpMethod === "DELETE") {
    await rest(`practice_answers?user_id=eq.${enc(user.id)}`, { method: "DELETE", prefer: "return=minimal" });
    await rest(`profiles?id=eq.${enc(user.id)}`, { method: "PATCH", body: { best_streak: 0 }, prefer: "return=minimal" });
    return json(200, { ok: true });
  }

  const { answerId, questionId, mode, selected, target } = parseBody(event);
  if (!UUID.test(String(answerId || ""))) throw new HttpError(400, "Identificador de respuesta no válido.");
  if (typeof selected !== "string" || !selected || selected.length > 300) throw new HttpError(400, "Respuesta no válida.");

  const existing = await rest(`practice_answers?user_id=eq.${enc(user.id)}&answer_id=eq.${enc(answerId)}&select=is_correct,target_label&limit=1`);
  if (existing && existing[0]) return json(200, { isCorrect: existing[0].is_correct, expected: existing[0].target_label || "" });

  const q = await findQuestion(questionId, isAdmin);
  const { expected, key } = resolve(q, mode, target);
  const isCorrect = norm(selected) === norm(expected);
  try {
    await rest("practice_answers", { method: "POST", prefer: "return=minimal", body: { id: crypto.randomUUID(), user_id: user.id, answer_id: answerId, question_key: key, question_id: q.id, mode, theme: q.theme, target_label: expected, is_correct: isCorrect, answered_at: new Date().toISOString() } });
  } catch (e) { if (!/duplicate|23505/i.test(e.message)) throw e; }
  return json(200, { isCorrect, expected });
});

};

__defs["rank-stats"] = function (module, exports, require) {
// Rankings complementarios: récord de racha y XP acumulado.
const { wrap, json, authenticate, restAll } = require("./_lib/supa");

exports.handler = wrap(["GET"], async (event) => {
  await authenticate(event);
  const [profiles, answers] = await Promise.all([
    restAll("profiles?select=id,display_name,best_streak&order=id.asc"),
    restAll("practice_answers?select=id,user_id,is_correct,answered_at&order=user_id.asc,answered_at.asc,id.asc"),
  ]);

  const byUser = new Map();
  for (const row of answers || []) {
    if (!row.user_id) continue;
    let s = byUser.get(row.user_id);
    if (!s) { s = { current: 0, best: 0, xp: 0 }; byUser.set(row.user_id, s); }
    if (row.is_correct === true) {
      s.current++;
      s.xp += 10;
      if (s.current > s.best) s.best = s.current;
    } else {
      s.current = 0;
    }
  }

  const people = new Map((profiles || []).map((p) => [p.id, {
    user_id: p.id,
    alias: String(p.display_name || "").trim() || "Estudiante",
    best_streak: Number(p.best_streak) || 0,
  }]));
  for (const id of byUser.keys()) {
    if (!people.has(id)) people.set(id, { user_id: id, alias: "Estudiante", best_streak: 0 });
  }

  const best = [], xp = [];
  for (const p of people.values()) {
    const s = byUser.get(p.user_id) || { best: 0, xp: 0 };
    const maxStreak = Math.max(p.best_streak, s.best);
    if (maxStreak > 0) best.push({ user_id: p.user_id, alias: p.alias, points: maxStreak });
    if (s.xp > 0) xp.push({ user_id: p.user_id, alias: p.alias, points: s.xp });
  }
  const order = (a, b) => b.points - a.points || a.alias.localeCompare(b.alias, "es-MX");
  best.sort(order); xp.sort(order);
  return json(200, { best, xp });
});

};

__defs["finish-exam"] = function (module, exports, require) {
// POST /.netlify/functions/finish-exam → guarda el intento (exam_attempts) y envía el correo por Resend.
// Es idempotente: si el intento ya existe no se duplica; si su correo no salió, se reintenta.
const crypto = require("crypto");
const { wrap, json, authenticate, parseBody, rest, enc, UUID, HttpError } = require("./_lib/supa");
const { resolve, norm } = require("./_lib/quiz");
const { T } = require("./_lib/labels");
const { notify } = require("./_lib/notify");

const MN = { A: "Tejido", B: "Célula", C: "Estructura", D: "Central o periférico" };

async function loadQuestions(ids, isAdmin) {
  const map = new Map();
  for (let i = 0; i < ids.length; i += 80) {
    const list = ids.slice(i, i + 80).map((x) => `"${x.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",");
    const rows = await rest(`questions?id=${enc(`in.(${list})`)}&select=id,theme,subtype,division,cells,structures,published,verified`);
    for (const r of rows || []) if (isAdmin || (r.published && r.verified)) map.set(r.id, r);
  }
  return map;
}

exports.handler = wrap(["POST"], async (event) => {
  const { user, profile, isAdmin } = await authenticate(event);
  const b = parseBody(event);
  if (!UUID.test(String(b.attemptId || ""))) throw new HttpError(400, "Identificador de intento no válido.");
  const details = Array.isArray(b.details) ? b.details.slice(0, 1000) : [];
  if (!details.length) throw new HttpError(400, "El examen no tiene respuestas.");

  const emailInfo = { email: (profile && profile.email) || user.email || "", name: (profile && profile.display_name) || (user.user_metadata && user.user_metadata.display_name) || "" };

  // ¿Ya existe este intento?
  const found = await rest(`exam_attempts?user_id=eq.${enc(user.id)}&client_attempt_id=eq.${enc(b.attemptId)}&select=*&limit=1`);
  let attempt = found && found[0];

  if (!attempt) {
    const ids = [...new Set(details.map((d) => String((d && d.question_id) || "")).filter(Boolean))];
    const qs = await loadQuestions(ids, isAdmin);
    let correct = 0, incorrect = 0, unanswered = 0;
    const theme = {}, mode = {}, saved = [], bad = [];
    for (const d of details) {
      const q = qs.get(String((d && d.question_id) || ""));
      let expected = null;
      try { if (q) expected = resolve(q, d.mode, d.target).expected; } catch (e) {}
      const m = ["A", "B", "C", "D"].includes(d && d.mode) ? d.mode : "A", th = q ? q.theme : String((d && d.theme) || "");
      const row = { question_id: String((d && d.question_id) || ""), mode: m, theme: th, target: (d && d.target) || null, selected: String((d && d.selected) || "").slice(0, 300), prompt: String((d && d.prompt) || "").slice(0, 300) };
      if (expected == null) { unanswered++; saved.push({ ...row, expected: null, is_correct: null }); continue; }
      const ok = norm(row.selected) === norm(expected);
      ok ? correct++ : incorrect++;
      (theme[th] = theme[th] || { correct: 0, total: 0 }).total++; (mode[m] = mode[m] || { correct: 0, total: 0 }).total++;
      if (ok) { theme[th].correct++; mode[m].correct++; } else bad.push({ prompt: row.prompt, selected: row.selected, expected });
      saved.push({ ...row, expected, is_correct: ok });
    }
    const total = details.length, answered = correct + incorrect;
    const started = b.startedAt && !Number.isNaN(Date.parse(b.startedAt)) ? new Date(b.startedAt).toISOString() : null;
    const themes = (Array.isArray(b.themes) ? b.themes : []).filter((k) => T[k]);
    const row = {
      id: crypto.randomUUID(), user_id: user.id, client_attempt_id: b.attemptId, exam_title: String(b.title || "Práctica de histología").slice(0, 200), mode: String(b.mode || "practice").slice(0, 40), themes,
      started_at: started, completed_at: new Date().toISOString(), total_questions: total, correct_answers: correct, incorrect_answers: incorrect, unanswered,
      score: answered || total ? Math.round((1000 * correct) / total) / 10 : 0, duration_seconds: Math.min(86400 * 7, Math.max(0, Math.floor(Number(b.durationSeconds)) || 0)),
      theme_summary: theme, mode_summary: mode, details: saved, notification_status: "pending", created_at: new Date().toISOString(),
    };
    try { await rest("exam_attempts", { method: "POST", prefer: "return=minimal", body: row }); attempt = row; attempt._bad = bad; }
    catch (e) { if (!/duplicate|23505/i.test(e.message)) throw e; const again = await rest(`exam_attempts?user_id=eq.${enc(user.id)}&client_attempt_id=eq.${enc(b.attemptId)}&select=*&limit=1`); attempt = again && again[0]; }
  }
  if (!attempt) throw new HttpError(500, "No se pudo guardar el examen.");
  if (attempt.notification_status === "sent") return json(200, { ok: true, emailSent: true, attemptId: attempt.id });

  const bad = attempt._bad || (Array.isArray(attempt.details) ? attempt.details.filter((d) => d.is_correct === false).map((d) => ({ prompt: d.prompt, selected: d.selected, expected: d.expected })) : []);
  const result = await notify("exam_completed", {
    attempt_id: attempt.id, ...emailInfo, score: Number(attempt.score), correct: attempt.correct_answers, incorrect: attempt.incorrect_answers, unanswered: attempt.unanswered, total: attempt.total_questions,
    duration_seconds: attempt.duration_seconds, themes: (attempt.themes || []).map((k) => T[k] || k), at: attempt.completed_at, bad: bad.slice(0, 20),
  });
  return json(200, { ok: true, emailSent: result.ok === true, attemptId: attempt.id, ...(result.ok ? {} : { emailError: result.error }) });
});

};

__defs["retry-notifications"] = function (module, exports, require) {
// POST /.netlify/functions/retry-notifications (solo admin) → { sent, failed }
// Reenvía los correos pendientes/fallidos de la cola y los exámenes con correo sin confirmar.
const { wrap, json, authenticate, rest, enc, HttpError } = require("./_lib/supa");
const { deliver, notify } = require("./_lib/notify");
const { T } = require("./_lib/labels");

exports.handler = wrap(["POST"], async (event) => {
  const { isAdmin } = await authenticate(event);
  if (!isAdmin) throw new HttpError(403, "Solo un administrador puede reintentar notificaciones.");
  let sent = 0, failed = 0;
  const done = new Set();

  const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const rows = (await rest(`notification_outbox?or=${enc(`(status.in.(pending,failed),and(status.eq.sending,created_at.lt.${stale}))`)}&attempts=lt.10&select=*&order=created_at.asc&limit=40`)) || [];
  for (const row of rows) {
    if (row.payload && row.payload.attempt_id) done.add(row.payload.attempt_id);
    const r = await deliver(row); r.ok ? sent++ : failed++;
  }

  // Exámenes con correo sin confirmar que no están en la cola (por ejemplo, de versiones anteriores).
  const old = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const atts = (await rest(`exam_attempts?notification_status=in.(pending,failed)&completed_at=lt.${enc(old)}&select=id,user_id,score,correct_answers,incorrect_answers,unanswered,total_questions,duration_seconds,themes,completed_at,details&order=completed_at.asc&limit=20`)) || [];
  for (const a of atts) {
    if (done.has(a.id)) continue;
    const prof = ((await rest(`profiles?id=eq.${enc(a.user_id)}&select=email,display_name&limit=1`)) || [])[0] || {};
    const bad = (Array.isArray(a.details) ? a.details : []).filter((d) => d.is_correct === false).slice(0, 20).map((d) => ({ prompt: d.prompt, selected: d.selected, expected: d.expected }));
    const r = await notify("exam_completed", { attempt_id: a.id, email: prof.email || "", name: prof.display_name || "", score: Number(a.score), correct: a.correct_answers, incorrect: a.incorrect_answers, unanswered: a.unanswered, total: a.total_questions, duration_seconds: a.duration_seconds, themes: (a.themes || []).map((k) => T[k] || k), at: a.completed_at, bad });
    r.ok ? sent++ : failed++;
  }
  return json(200, { sent, failed });
});

};

__defs["login-notify"] = function (module, exports, require) {
// POST /.netlify/functions/login-notify → avisa a NOTIFICATION_EMAIL de un inicio de sesión (desde EMAIL_FROM, con Resend).
const { wrap, json, authenticate, parseBody } = require("./_lib/supa");
const { notify } = require("./_lib/notify");

exports.handler = wrap(["POST"], async (event) => {
  const { user } = await authenticate(event, { needProfile: false });
  // Solo inicios de sesión reales y recientes (evita spam con tokens viejos).
  const last = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : NaN;
  if (!Number.isNaN(last) && Date.now() - last > 5 * 60 * 1000) return json(200, { ok: true, skipped: "sesión no reciente" });

  const body = parseBody(event), h = event.headers || {};
  const result = await notify("login", {
    email: user.email || "", name: (user.user_metadata && user.user_metadata.display_name) || "", method: String(body.method || "contraseña").slice(0, 60), at: new Date().toISOString(),
    ip: h["x-nf-client-connection-ip"] || String(h["x-forwarded-for"] || "").split(",")[0].trim() || "desconocida", ua: String(h["user-agent"] || "desconocido").slice(0, 300),
  });
  if (!result.ok) { console.error("login-notify: no se pudo enviar:", result.error); return json(502, { ok: false, emailSent: false, error: result.error }); }
  return json(200, { ok: true, emailSent: true });
});

};


__defs["_lib/guard"] = function (module, exports, require) {
// Seguridad de imágenes: copia de cada foto en Postgres (tabla image_backups) y restauración al bucket histology-images.
const crypto = require("crypto");
const { rest, restAll, baseUrl, serviceKey, HttpError, enc } = require("./supa");
const { sendEmail, esc } = require("./email");

const BUCKET = "histology-images", MIN_BYTES = 1000;
const encPath = (p) => String(p).split("/").map(encodeURIComponent).join("/");
const sHeaders = (extra) => ({ apikey: serviceKey(), Authorization: `Bearer ${serviceKey()}`, ...(extra || {}) });
const publicUrl = (p) => `${baseUrl()}/storage/v1/object/public/${BUCKET}/${encPath(p)}`;

function looksImage(buf, type) {
  if (!buf || buf.length < MIN_BYTES) return false;
  if (/svg/i.test(type || "")) return buf.slice(0, 2000).toString("utf8").includes("<svg");
  const h4 = buf.slice(0, 4).toString("latin1");
  return (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) || (buf[0] === 0x89 && h4.slice(1) === "PNG") || h4 === "GIF8" || (h4 === "RIFF" && buf.slice(8, 12).toString("latin1") === "WEBP");
}

const tableHint = (e) => {
  if (/image_backups|PGRST205|42P01/i.test(String((e && e.message) || ""))) throw new HttpError(500, "Falta crear la tabla image_backups en Supabase. Ejecuta el archivo supabase-image-backups.sql en el SQL Editor.");
  throw e;
};

async function listStorage() {
  const map = new Map();
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${baseUrl()}/storage/v1/object/list/${BUCKET}`, { method: "POST", headers: sHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ prefix: "", limit: 1000, offset, sortBy: { column: "name", order: "asc" } }) });
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data)) throw new HttpError(502, `Storage no respondió bien al listar el bucket (${res.status}).`);
    for (const o of data) if (o && o.name && o.id !== null) map.set(o.name, o.metadata && o.metadata.size != null ? Number(o.metadata.size) : null);
    if (data.length < 1000) return map;
  }
}

async function downloadObject(path) {
  const res = await fetch(`${baseUrl()}/storage/v1/object/authenticated/${BUCKET}/${encPath(path)}`, { headers: sHeaders() });
  if (!res.ok) return null;
  return { buf: Buffer.from(await res.arrayBuffer()), type: (res.headers.get("content-type") || "image/jpeg").split(";")[0] };
}

async function uploadObject(path, buf, type) {
  const res = await fetch(`${baseUrl()}/storage/v1/object/${BUCKET}/${encPath(path)}`, { method: "POST", headers: sHeaders({ "Content-Type": type || "image/jpeg", "x-upsert": "true", "cache-control": "max-age=3600" }), body: buf });
  if (!res.ok) { const t = await res.text().catch(() => ""); throw new HttpError(502, `No se pudo subir ${path} (${res.status}) ${t.slice(0, 120)}`); }
}

async function storeBackup(id, path, buf, type) {
  const row = { question_id: id, image_path: path, content_type: type || "image/jpeg", data: buf.toString("base64"), bytes: buf.length, sha256: crypto.createHash("sha256").update(buf).digest("hex"), updated_at: new Date().toISOString() };
  try { await rest("image_backups?on_conflict=question_id", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: row }); } catch (e) { tableHint(e); }
}
async function getBackup(id) {
  try { const rows = await rest(`image_backups?question_id=eq.${enc(id)}&select=*&limit=1`); return (rows && rows[0]) || null; } catch (e) { tableHint(e); }
}
async function backupIndex() {
  try { const rows = await restAll("image_backups?select=question_id,image_path,bytes&order=question_id.asc"); return new Map((rows || []).map((r) => [r.question_id, r])); } catch (e) { tableHint(e); }
}
async function restoreFrom(backup, path) {
  const buf = Buffer.from(String(backup.data || ""), "base64");
  if (!looksImage(buf, backup.content_type)) throw new HttpError(500, "La copia guardada no parece una imagen válida.");
  await uploadObject(path, buf, backup.content_type);
}

// Procesa items con n trabajadores hasta el límite de tiempo; devuelve cuántos quedaron sin procesar.
async function pool(items, n, fn, deadline) {
  let i = 0;
  const worker = async () => { while (i < items.length) { if (Date.now() > deadline) return; await fn(items[i++]); } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return Math.max(0, items.length - i);
}

// Revisa todas las imágenes: restaura las que faltan, crea las copias que faltan y comprueba que se sirvan públicamente.
async function runCheck({ budgetMs } = {}) {
  const deadline = Date.now() + (budgetMs || Number(process.env.GUARD_BUDGET_MS) || 8000);
  const qs = (await restAll("questions?select=id,image_path&image_path=not.is.null&order=id.asc")) || [];
  const backups = await backupIndex();
  const files = await listStorage();
  const r = { total: qs.length, ok: 0, restored: [], missing: [], unserved: [], backedUp: 0, backupPending: 0, notChecked: 0, failed: [] };
  const present = [], absent = [];
  for (const q of qs) { const sz = files.get(q.image_path); (files.has(q.image_path) && (sz === null || sz >= MIN_BYTES) ? present : absent).push(q); }

  r.notChecked += await pool(absent, 4, async (q) => {
    if (!backups.has(q.id)) { r.missing.push(q.id); return; }
    try { await restoreFrom(await getBackup(q.id), q.image_path); r.restored.push(q.id); }
    catch (e) { r.failed.push({ id: q.id, error: e.message }); }
  }, deadline);

  r.backupPending = await pool(present.filter((q) => !backups.has(q.id)), 6, async (q) => {
    try {
      const d = await downloadObject(q.image_path);
      if (!d || !looksImage(d.buf, d.type)) throw new Error("archivo ilegible o no es una imagen");
      await storeBackup(q.id, q.image_path, d.buf, d.type); r.backedUp++;
    } catch (e) { r.failed.push({ id: q.id, error: e.message }); }
  }, deadline);

  r.notChecked += await pool(present, 12, async (q) => {
    try {
      const res = await fetch(publicUrl(q.image_path), { headers: { Range: "bytes=0-0" }, signal: AbortSignal.timeout(6000) });
      try { res.body && (await res.body.cancel()); } catch (e) {}
      res.ok ? r.ok++ : r.unserved.push(q.id);
    } catch (e) { r.unserved.push(q.id); }
  }, deadline);
  return r;
}

const hasProblems = (r) => !!(r.restored.length || r.missing.length || r.unserved.length || r.failed.length);

async function emailReport(r) {
  const block = (title, arr) => (arr.length ? { html: `<h3 style="margin:16px 0 6px">${esc(title)} (${arr.length})</h3><p style="word-break:break-all;font-family:monospace;font-size:13px">${arr.map((x) => esc(x)).join("<br>")}</p>`, text: `\n${title} (${arr.length}):\n${arr.join("\n")}\n` } : { html: "", text: "" });
  const parts = [
    block("Restauradas automáticamente desde la copia", r.restored),
    block("SIN archivo y SIN copia: hay que volver a subirlas", r.missing),
    block("El archivo existe pero no se sirve públicamente (revisa que el bucket sea público)", r.unserved),
    block("Con error", r.failed.map((f) => `${f.id}: ${f.error}`)),
  ];
  const summary = `Revisadas: ${r.total} · Bien: ${r.ok} · Copias nuevas: ${r.backedUp}` + (r.notChecked || r.backupPending ? ` · Sin revisar por tiempo: ${r.notChecked + r.backupPending}` : "");
  const n = r.restored.length + r.missing.length + r.unserved.length + r.failed.length;
  return sendEmail({
    subject: `⚠️ HistoPráctica: problemas con ${n} imagen(es) del banco`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#333"><h2 style="margin:0 0 12px">🛡 Revisión diaria de imágenes</h2><p>${esc(summary)}</p>${parts.map((p) => p.html).join("")}</div>`,
    text: `Revisión diaria de imágenes de HistoPráctica\n\n${summary}\n${parts.map((p) => p.text).join("")}`,
  });
}
const emailFailure = (e) => sendEmail({ subject: "❌ HistoPráctica: no se pudo revisar las imágenes", html: `<div style="font-family:Arial,sans-serif"><h2>❌ La revisión diaria de imágenes falló</h2><p>${esc((e && e.message) || e)}</p></div>`, text: `La revisión diaria de imágenes falló: ${(e && e.message) || e}` });

// Restaura UNA imagen si su archivo falta (lo usa la web cuando una foto no carga).
const healAt = new Map();
async function healOne(qid) {
  if (Date.now() - (healAt.get(qid) || 0) < 30000) return { restored: false, exists: null, throttled: true };
  if (healAt.size > 500) healAt.clear();
  healAt.set(qid, Date.now());
  const rows = await rest(`questions?id=eq.${enc(qid)}&select=id,image_path&limit=1`), q = rows && rows[0];
  if (!q || !q.image_path) return { restored: false, exists: false };
  const d = await downloadObject(q.image_path);
  if (d && looksImage(d.buf, d.type)) return { restored: false, exists: true };
  const b = await getBackup(q.id);
  if (!b) return { restored: false, exists: false, noBackup: true };
  await restoreFrom(b, q.image_path);
  return { restored: true, exists: false };
}

module.exports = { looksImage, storeBackup, runCheck, hasProblems, emailReport, emailFailure, healOne };

};

__defs["image-guard"] = function (module, exports, require) {
// POST /api/image-guard  { action: "check" | "store" | "heal", ... }
//  check (admin): restaura las fotos que faltan, crea copias pendientes y comprueba que se sirvan
//  store (admin): guarda la copia de una foto { questionId, contentType, data (base64) }
//  heal  (sesión): restaura una foto concreta si falta su archivo { questionId }
const { wrap, json, authenticate, parseBody, rest, enc, HttpError } = require("./_lib/supa");
const G = require("./_lib/guard");

exports.handler = wrap(["POST"], async (event) => {
  const { isAdmin } = await authenticate(event);
  const b = parseBody(event), action = String(b.action || ""), id = String(b.questionId || "");
  if (action === "heal") {
    if (!id || id.length > 300) throw new HttpError(400, "Pregunta no válida.");
    return json(200, { ok: true, ...(await G.healOne(id)) });
  }
  if (!isAdmin) throw new HttpError(403, "Solo un administrador puede usar esta función.");
  if (action === "check") return json(200, { ok: true, ...(await G.runCheck()) });
  if (action === "store") {
    if (!id || id.length > 300) throw new HttpError(400, "Pregunta no válida.");
    const type = /^image\/[a-z0-9.+-]+$/i.test(String(b.contentType || "")) ? String(b.contentType) : "image/jpeg";
    const data = String(b.data || "");
    if (!data || data.length > 5000000) throw new HttpError(400, "Imagen vacía o demasiado grande.");
    const buf = Buffer.from(data, "base64");
    if (!G.looksImage(buf, type)) throw new HttpError(400, "El archivo no parece una imagen válida.");
    const rows = await rest(`questions?id=eq.${enc(id)}&select=id,image_path&limit=1`), q = rows && rows[0];
    if (!q) throw new HttpError(404, "Esa pregunta no existe en la base de datos.");
    if (!q.image_path) throw new HttpError(400, "Esa pregunta no tiene imagen en Storage.");
    await G.storeBackup(q.id, q.image_path, buf, type);
    return json(200, { ok: true, bytes: buf.length });
  }
  throw new HttpError(400, "Acción no válida.");
});

};

__defs["image-watchdog"] = function (module, exports, require) {
// GET /api/image-watchdog → revisión diaria (Vercel Cron). Restaura lo que falte y avisa por correo si hubo problemas.
// Autorización: cabecera "Authorization: Bearer <CRON_SECRET>" (Vercel la envía sola) o sesión de administrador.
const crypto = require("crypto");
const { wrap, json, authenticate, HttpError } = require("./_lib/supa");
const G = require("./_lib/guard");

const cronOk = (event) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(String((event.headers && (event.headers.authorization || event.headers.Authorization)) || "")), want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
};

exports.handler = wrap(["GET", "POST"], async (event) => {
  if (!cronOk(event)) { const { isAdmin } = await authenticate(event); if (!isAdmin) throw new HttpError(403, "Solo el cron programado o un administrador."); }
  let report;
  try { report = await G.runCheck(); }
  catch (e) { const mail = await G.emailFailure(e).catch((x) => ({ ok: false, error: x.message })); console.error("image-watchdog:", e.message, mail.ok ? "(aviso enviado)" : "(aviso NO enviado: " + mail.error + ")"); throw e; }
  let email = { sent: false, reason: "sin problemas" };
  if (G.hasProblems(report)) { const r = await G.emailReport(report); email = r.ok ? { sent: true } : { sent: false, error: r.error }; }
  return json(200, { ok: true, ...report, email });
});

};

const __routes = { "public-config": __makeRequire("")("./public-config").handler, "bank": __makeRequire("")("./bank").handler, "question-detail": __makeRequire("")("./question-detail").handler, "progress": __makeRequire("")("./progress").handler, "rank-stats": __makeRequire("")("./rank-stats").handler, "finish-exam": __makeRequire("")("./finish-exam").handler, "retry-notifications": __makeRequire("")("./retry-notifications").handler, "login-notify": __makeRequire("")("./login-notify").handler, "image-guard": __makeRequire("")("./image-guard").handler, "image-watchdog": __makeRequire("")("./image-watchdog").handler };

module.exports = async (req, res) => {
  try {
    let name = req.query && req.query.name;
    if (Array.isArray(name)) name = name[0];
    if (!name) name = String(req.url || "").split("?")[0].split("/").filter(Boolean).pop();
    const handler = __routes[name];
    if (!handler) { res.status(404).json({ error: "Función no encontrada: " + name }); return; }
    let body = req.body;
    if (body === undefined || body === null) body = "";
    else if (Buffer.isBuffer(body)) body = body.toString("utf8");
    else if (typeof body === "object") body = JSON.stringify(body);
    const out = await handler({ httpMethod: req.method, headers: req.headers || {}, body, path: req.url, queryStringParameters: req.query || {} });
    res.status(out.statusCode || 200);
    for (const [k, v] of Object.entries(out.headers || {})) res.setHeader(k, v);
    res.send(out.body == null ? "" : out.body);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};
