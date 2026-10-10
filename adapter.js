// Adapta los handlers estilo Netlify ({ statusCode, headers, body }) a funciones de Vercel (req, res).
module.exports = (handler) => async (req, res) => {
  try {
    let body = req.body;
    if (body === undefined || body === null) body = "";
    else if (Buffer.isBuffer(body)) body = body.toString("utf8");
    else if (typeof body === "object") body = JSON.stringify(body);
    const out = await handler({ httpMethod: req.method, headers: req.headers || {}, body, path: req.url, queryStringParameters: req.query || {} });
    res.status(out.statusCode || 200);
    for (const [k, v] of Object.entries(out.headers || {})) res.setHeader(k, v);
    res.send(out.body == null ? "" : out.body);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};
