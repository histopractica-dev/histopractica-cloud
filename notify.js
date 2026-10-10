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
