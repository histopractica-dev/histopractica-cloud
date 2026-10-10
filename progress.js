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
