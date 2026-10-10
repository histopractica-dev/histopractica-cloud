// POST /.netlify/functions/finish-exam → guarda el intento (exam_attempts) y envía el correo por Resend.
// Es idempotente: si el intento ya existe no se duplica; si su correo no salió, se reintenta.
const crypto = require("crypto");
const { wrap, json, authenticate, parseBody, rest, enc, UUID, HttpError } = require("./_lib/supa");
const { resolve, norm } = require("./_lib/quiz");
const { T } = require("./_lib/labels");
const { notify } = require("./_lib/notify");

const MN = { A: "Tejido", B: "Célula", C: "Estructura" };

async function loadQuestions(ids, isAdmin) {
  const map = new Map();
  for (let i = 0; i < ids.length; i += 80) {
    const list = ids.slice(i, i + 80).map((x) => `"${x.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",");
    const rows = await rest(`questions?id=${enc(`in.(${list})`)}&select=id,theme,subtype,cells,structures,published,verified`);
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
      const m = ["A", "B", "C"].includes(d && d.mode) ? d.mode : "A", th = q ? q.theme : String((d && d.theme) || "");
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
