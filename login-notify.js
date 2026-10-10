// POST /.netlify/functions/login-notify → avisa a NOTIFICATION_EMAIL de un inicio de sesión (desde EMAIL_FROM, con Resend).
const { wrap, json, authenticate, parseBody } = require("./_lib/supa");
const { notify } = require("./_lib/notify");

exports.handler = wrap(["POST"], async (event) => {
  const { user } = await authenticate(event, { needProfile: false });
  // Solo inicios de sesión reales y recientes (evita spam con tokens viejos).
  const last = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : NaN;
  if (!Number.isNaN(last) && Date.now() - last > 5 * 60 * 1000) return json(200, { ok: true, skipped: "sesión no reciente" });

  const body = parseBody(event), h = event.headers || {};
  const result = await notify("login", {
    email: user.email || "", name: (user.user_metadata && user.user_metadata.display_name) || "", method: String(body.method || "contraseña").slice(0, 60), at: new Date().toISOString(),
    ip: h["x-nf-client-connection-ip"] || String(h["x-forwarded-for"] || "").split(",")[0].trim() || "desconocida", ua: String(h["user-agent"] || "desconocido").slice(0, 300),
  });
  if (!result.ok) { console.error("login-notify: no se pudo enviar:", result.error); return json(502, { ok: false, emailSent: false, error: result.error }); }
  return json(200, { ok: true, emailSent: true });
});
