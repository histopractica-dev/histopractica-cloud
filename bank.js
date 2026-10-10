// GET /.netlify/functions/bank → catálogo de preguntas.
// Admin: todo (con respuestas). Estudiante: solo publicadas y verificadas, SIN respuestas (las marcas llevan un código opaco).
const crypto = require("crypto");
const { wrap, json, authenticate, restAll, serviceKey } = require("./_lib/supa");

const token = (n) => "g" + crypto.createHmac("sha256", serviceKey()).update(String(n || "").trim().toLowerCase()).digest("hex").slice(0, 10);
const mask = (list) => (Array.isArray(list) ? list : []).map((t) => ({ n: token(t && t.n), x: t.x, y: t.y, w: t.w, h: t.h }));

exports.handler = wrap(["GET"], async (event) => {
  const { isAdmin } = await authenticate(event);
  const select = "id,theme,subtype,image_path,external_image_url,source,source_url,author,license,traits,verified,published,cells,structures,guides";
  const rows = await restAll(`questions?select=${select}${isAdmin ? "" : "&published=eq.true&verified=eq.true"}&order=created_at.asc,id.asc`);
  const questions = rows.map((r) => (isAdmin ? { ...r, has_subtype: !!r.subtype } : { ...r, subtype: null, has_subtype: !!r.subtype, cells: mask(r.cells), structures: mask(r.structures) }));
  return json(200, { questions });
});
