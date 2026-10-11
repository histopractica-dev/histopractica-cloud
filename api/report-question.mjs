const REASONS = ["Imagen incorrecta", "Respuesta incorrecta", "Opciones ambiguas", "Problema técnico", "Otro"];
const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM;
const TO = process.env.ADMIN_EMAIL;
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY;
const hits = new Map();
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Inicia sesión para reportar." });
    if (!API_KEY || !FROM || !TO || !SB_URL || !SB_KEY) return res.status(500).json({ error: "El envío de reportes no está configurado." });
    const u = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` } });
    if (!u.ok) return res.status(401).json({ error: "Tu sesión expiró. Inicia sesión de nuevo." });
    const user = await u.json();
    const now = Date.now();
    const recent = (hits.get(user.id) || []).filter((t) => now - t < 600000);
    if (recent.length >= 5) return res.status(429).json({ error: "Has enviado muchos reportes. Inténtalo más tarde." });
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const qid = String(b.questionId || "").slice(0, 120);
    const reason = String(b.reason || "");
    const comment = String(b.comment || "").trim().slice(0, 500);
    if (!/^[\w.:-]{1,120}$/.test(qid) || !REASONS.includes(reason)) return res.status(400).json({ error: "Datos del reporte no válidos." });
    hits.set(user.id, recent.concat(now));
    const who = user.user_metadata?.display_name || "";
    const html = `<h2>Reporte de pregunta</h2><p><b>Pregunta:</b> ${esc(qid)}</p><p><b>Tejido:</b> ${esc(String(b.tema || "").slice(0, 80))} · <b>Modalidad:</b> ${esc(String(b.modo || "").slice(0, 80))}</p><p><b>Motivo:</b> ${esc(reason)}</p><p><b>Comentario:</b> ${esc(comment) || "—"}</p><p><b>Enviado por:</b> ${esc(who)} (${esc(user.email || "sin correo")})</p>`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [TO], reply_to: user.email || undefined, subject: `Reporte: ${reason} (${qid})`, html }),
    });
    if (!r.ok) {
      console.error("resend error", r.status, await r.text().catch(() => ""));
      return res.status(502).json({ error: "No se pudo enviar el reporte. Inténtalo más tarde." });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("report-question", e);
    return res.status(500).json({ error: "No se pudo enviar el reporte." });
  }
}
