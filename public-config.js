// GET /.netlify/functions/public-config → valores públicos de Supabase para el navegador.
const { json } = require("./_lib/supa");
exports.handler = async () => {
  const supabaseUrl = process.env.SUPABASE_URL, supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return json(500, { error: "Faltan SUPABASE_URL y/o SUPABASE_ANON_KEY en Vercel." });
  return json(200, { supabaseUrl, supabaseAnonKey });
};
