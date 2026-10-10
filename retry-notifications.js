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
