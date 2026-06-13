/* =====================================================================
   Secure Claude proxy for the Coaching Deck Builder.
   The Anthropic API key is read from the environment, never sent to the
   browser. Set it in Netlify:  Site settings → Environment variables →
   ANTHROPIC_API_KEY.
   Runtime: Netlify Functions (Node 18+, global fetch available).
   ===================================================================== */
const DEFAULT_MODEL = "claude-haiku-4-5";
const SITE_PASSWORD = process.env.SITE_PASSWORD || "";

const SYSTEM_PROMPT =
  "You localize coaching/training-deck copy for a specific client. You will " +
  "receive a JSON object of deck content and a client context. Rewrite the " +
  "human-readable TEXT VALUES so the examples, scenarios and tone fit the " +
  "client's company and industry. RULES: (1) Return ONLY a single valid JSON " +
  "object with the EXACT same keys and structure as the input — no markdown, " +
  "no commentary. (2) Keep every {{placeholder}} token intact. (3) Keep array " +
  "lengths the same. (4) Keep it concise and professional. (5) Do not invent statistics.";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return resp(405, { error: "Method not allowed" });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return resp(500, { error: "Server is missing ANTHROPIC_API_KEY" });

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return resp(400, { error: "Invalid JSON body" }); }

  if (SITE_PASSWORD && body.password !== SITE_PASSWORD) return resp(401, { error: "Unauthorized" });
  if (body.auth) return resp(200, { ok: true });

  const ctx = body.ctx || {};
  const content = body.content || {};
  const model = body.model || DEFAULT_MODEL;

  const user =
    "CLIENT CONTEXT:\n" + JSON.stringify(ctx) +
    "\n\nDECK CONTENT TO REWRITE:\n" + JSON.stringify(content);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: user }],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return resp(res.status, { error: (data.error && data.error.message) || "Anthropic API error" });
    }

    const text = (data.content || []).map((b) => b.text || "").join("");
    const a = text.indexOf("{"), z = text.lastIndexOf("}");
    if (a < 0 || z < 0) return resp(502, { error: "Model did not return JSON" });

    let parsed;
    try { parsed = JSON.parse(text.slice(a, z + 1)); }
    catch { return resp(502, { error: "Model returned invalid JSON" }); }

    return resp(200, { content: parsed });
  } catch (e) {
    return resp(500, { error: String((e && e.message) || e) });
  }
};

function resp(statusCode, obj) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) };
}
