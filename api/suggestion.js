const CATEGORIES = [
  "Mejora de la aplicación",
  "Nuevas funciones",
  "Contenido de histología",
  "Diseño y accesibilidad",
  "Otro",
];

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM;
const TO = process.env.NOTIFICATION_EMAIL;
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY;

// Límite básico por usuario: 5 sugerencias cada 10 minutos.
const hits = new Map();

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const token = String(
      req.headers.authorization || ""
    ).replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return res.status(401).json({
        error: "Inicia sesión para enviar una sugerencia.",
      });
    }

    if (!API_KEY || !FROM || !TO || !SB_URL || !SB_KEY) {
      console.error("suggestion: faltan variables de entorno");
      return res.status(500).json({
        error: "El buzón de sugerencias no está configurado.",
      });
    }

    // Validar sesión con Supabase.
    const authResponse = await fetch(
      `${SB_URL.replace(/\/+$/, "")}/auth/v1/user`,
      {
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!authResponse.ok) {
      return res.status(401).json({
        error: "Tu sesión expiró. Inicia sesión de nuevo.",
      });
    }

    const user = await authResponse.json();

    if (!user?.id) {
      return res.status(401).json({
        error: "No se pudo validar tu sesión.",
      });
    }

    // Limitar envíos por usuario.
    const now = Date.now();
    const recent = (hits.get(user.id) || []).filter(
      (t) => now - t < 600000
    );

    if (recent.length >= 5) {
      return res.status(429).json({
        error: "Has enviado muchas sugerencias. Inténtalo más tarde.",
      });
    }

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};

    const category = String(body.category || "").trim();
    const message = String(body.message || "").trim().slice(0, 2000);
    const page = String(body.page || "HistoPráctica")
      .trim()
      .slice(0, 120);

    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: "El tipo de sugerencia no es válido.",
      });
    }

    if (message.length < 8) {
      return res.status(400).json({
        error: "Escribe al menos 8 caracteres para tu sugerencia.",
      });
    }

    const displayName = String(
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      ""
    ).slice(0, 120);

    const email = String(user.email || "").slice(0, 254);

    const html = `
      <h2>Nueva sugerencia para HistoPráctica</h2>
      <p><b>Categoría:</b> ${esc(category)}</p>
      <p><b>Sugerencia:</b></p>
      <div style="white-space:pre-wrap">${esc(message)}</div>
      <p><b>Página:</b> ${esc(page)}</p>
      <p><b>Enviada por:</b> ${esc(displayName || "Sin nombre")}
      (${esc(email || "sin correo")})</p>
      <p><b>ID de usuario:</b> ${esc(user.id)}</p>
    `;

    const text = [
      "Nueva sugerencia para HistoPráctica",
      `Categoría: ${category}`,
      `Sugerencia: ${message}`,
      `Página: ${page}`,
      `Enviada por: ${displayName || "Sin nombre"} (${email || "sin correo"})`,
      `ID de usuario: ${user.id}`,
    ].join("\n\n");

    // Enviar correo mediante Resend.
    const emailResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [TO],
          ...(email ? { reply_to: email } : {}),
          subject: `Sugerencia HistoPráctica: ${category}`,
          html,
          text,
        }),
      }
    );

    if (!emailResponse.ok) {
      const detail = await emailResponse.text().catch(() => "");
      console.error(
        "suggestion resend error",
        emailResponse.status,
        detail
      );

      return res.status(502).json({
        error: "No se pudo enviar la sugerencia. Inténtalo más tarde.",
      });
    }

    // Registrar el envío después de confirmar el éxito.
    hits.set(user.id, recent.concat(now));

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("suggestion endpoint error", error);

    return res.status(500).json({
      error: "No se pudo enviar la sugerencia.",
    });
  }
}
