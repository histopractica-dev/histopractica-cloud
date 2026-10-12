// BORRADOR — api/landing-image.js
// Devuelve UNA imagen aleatoria del banco para la portada pública: solo url, tema y atribución.
// No devuelve id, respuestas, subtipo, marcas ni nada del resto del banco.
// Usa la clave de servicio únicamente aquí, en el servidor (no se envía al navegador y no toca RLS).
//
// SUPUESTOS A CONFIRMAR (no pude ver tu api-handler.js ni el esquema):
//  - Tabla "questions" con columnas: theme, image_path, external_image_url, source, author, license, verified, published
//  - Bucket público "histology-images"
//  - Variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Vercel
//  - package.json sin "type":"module" (si lo tiene, cambia module.exports por export default)
const TABLE = "questions";
const BUCKET = "histology-images";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });
  const base = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return res.status(500).json({ error: "Configuración incompleta" });
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const filter = "verified=eq.true&published=eq.true&source=not.is.null&license=not.is.null" +
    "&or=(image_path.not.is.null,external_image_url.not.is.null)";
  try {
    // 1) cuántas imágenes son elegibles (solo el conteo)
    const head = await fetch(`${base}/rest/v1/${TABLE}?select=id&${filter}`, {
      method: "HEAD", headers: { ...h, Prefer: "count=exact", Range: "0-0" } });
    const total = Number((head.headers.get("content-range") || "").split("/")[1]);
    if (!Number.isFinite(total) || total < 1) return res.status(404).json({ error: "Sin imágenes" });
    // 2) una fila al azar, solo con las columnas necesarias
    const off = Math.floor(Math.random() * total);
    const r = await fetch(`${base}/rest/v1/${TABLE}?select=theme,image_path,external_image_url,source,author,license&${filter}&order=id.asc&offset=${off}&limit=1`, { headers: h });
    const row = (await r.json())[0];
    if (!row) return res.status(404).json({ error: "Sin imágenes" });
    const url = row.image_path
      ? `${base}/storage/v1/object/public/${BUCKET}/${row.image_path.split("/").map(encodeURIComponent).join("/")}`
      : row.external_image_url;
    if (!/^https:\/\//.test(url || "")) return res.status(404).json({ error: "Sin imágenes" });
    return res.status(200).json({ url, theme: row.theme, source: row.source, author: row.author || null, license: row.license });
  } catch (e) {
    return res.status(500).json({ error: "No se pudo obtener la imagen" });
  }
};
