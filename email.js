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
