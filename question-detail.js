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
