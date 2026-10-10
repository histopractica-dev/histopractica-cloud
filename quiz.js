// Lógica de preguntas en el servidor: respuesta correcta, clave de pregunta y opciones (con distractores).
const crypto = require("crypto");
const { LB, CE, ES, REL } = require("./labels");
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
  const pool = mode === "A" ? LB : mode === "B" ? CE : ES;
  const mine = mode === "A" ? [] : await bankNames(q.theme, mode);
  const same = (pool[q.theme] || []).concat(mine), rel = (REL[q.theme] || []).flatMap((k) => pool[k] || []), all = [].concat(...Object.values(pool));
  return shuf([expected, ...distract(expected, [same, rel, all])]);
}

module.exports = { norm, findQuestion, resolve, optionsFor, matchTarget };
