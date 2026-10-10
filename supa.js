// Utilidades de Supabase (sin dependencias): validar sesión y hablar con PostgREST usando la service-role key.
// Variables de Netlify: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

const baseUrl = () => (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const anonKey = () => process.env.SUPABASE_ANON_KEY || "";
const enc = encodeURIComponent;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });

function needEnv() {
  const missing = [!baseUrl() && "SUPABASE_URL", !serviceKey() && "SUPABASE_SERVICE_ROLE_KEY"].filter(Boolean);
  if (missing.length) throw new HttpError(500, `Faltan variables en Vercel: ${missing.join(", ")}.`);
}

async function rest(path, { method = "GET", body, prefer, headers = {} } = {}) {
  needEnv();
  const res = await fetch(`${baseUrl()}/rest/v1/${path}`, {
    method,
    headers: { apikey: serviceKey(), Authorization: `Bearer ${serviceKey()}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) {}
  if (!res.ok) throw new HttpError(502, `Supabase ${res.status}: ${(data && (data.message || data.error)) || text || "error"}`);
  return data;
}

// Lee todas las filas (PostgREST limita a 1000 por petición). `path` debe incluir un order estable.
async function restAll(path) {
  const out = [], size = 1000;
  for (let offset = 0; ; offset += size) {
    const page = await rest(`${path}${path.includes("?") ? "&" : "?"}limit=${size}&offset=${offset}`);
    out.push(...(page || []));
    if (!page || page.length < size) return out;
  }
}

// Valida el access_token con Supabase y devuelve { user, profile, isAdmin }.
async function authenticate(event, { needProfile = true } = {}) {
  needEnv();
  const token = String((event.headers && (event.headers.authorization || event.headers.Authorization)) || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new HttpError(401, "Falta la sesión. Inicia sesión de nuevo.");
  let res;
  try { res = await fetch(`${baseUrl()}/auth/v1/user`, { headers: { apikey: anonKey() || serviceKey(), Authorization: `Bearer ${token}` } }); }
  catch (e) { throw new HttpError(502, "No se pudo validar la sesión."); }
  if (!res.ok) throw new HttpError(401, "Tu sesión expiró. Inicia sesión de nuevo.");
  const user = await res.json();
  if (!user || !user.id) throw new HttpError(401, "Sesión no válida.");
  let profile = null;
  if (needProfile) {
    const rows = await rest(`profiles?id=eq.${enc(user.id)}&select=id,email,display_name,role&limit=1`);
    profile = (rows && rows[0]) || null;
  }
  return { user, profile, isAdmin: !!profile && profile.role === "admin" };
}

const parseBody = (event) => { try { return JSON.parse(event.body || "{}") || {}; } catch (e) { throw new HttpError(400, "JSON no válido."); } };

// Envuelve un handler: método permitido + manejo uniforme de errores.
const wrap = (methods, fn) => async (event) => {
  try {
    if (!methods.includes(event.httpMethod)) return json(405, { error: "Método no permitido" });
    return await fn(event);
  } catch (error) {
    if (error instanceof HttpError) return json(error.status, { error: error.message });
    console.error(error);
    return json(500, { error: "Error interno del servidor." });
  }
};

module.exports = { HttpError, rest, restAll, authenticate, parseBody, wrap, json, enc, UUID, serviceKey, baseUrl };
