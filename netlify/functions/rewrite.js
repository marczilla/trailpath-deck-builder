/* =====================================================================
   Secure Claude proxy for the Coaching Deck Builder (hybrid rewrite).
   Uses Anthropic tool-use so the model's output is ALWAYS valid JSON.
   Key is read from env (never sent to the browser). Optional SITE_PASSWORD.
   Runtime: Netlify Functions (Node 18+, global fetch available).
   Body: { auth?, password?, ctx, content, instruction?, model }
   Returns: { content: object }
   ===================================================================== */
const DEFAULT_MODEL = "claude-haiku-4-5";
const SITE_PASSWORD = process.env.SITE_PASSWORD || "";

const SYSTEM_PROMPT =
  "You localize coaching/training-deck copy for a specific client. Rewrite the human-readable text " +
  "values in the provided deck content so the examples, scenarios and tone fit the client's company " +
  "and industry, and follow any extra instruction the user gives. Keep array lengths the same, keep " +
  "every {{placeholder}} token intact, be concise and professional, and do not invent statistics. " +
  "Return your result by calling the apply_rewrite tool, mirroring the exact structure of the deck content.";

const TOOLS = [{
  name: "apply_rewrite",
  description: "Return the rewritten deck fields, mirroring the structure of the provided deck content.",
  input_schema: {
    type: "object",
    properties: {
      objectives: { type: "object" },
      why: { type: "object" },
      scenario: { type: "object" },
      scenarioSituation: { type: "string" },
    },
    additionalProperties: true,
  },
}];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return resp(405, { error: "Method not allowed" });
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
  const instruction = (body.instruction || "").toString().slice(0, 500).trim();

  const user =
    "CLIENT CONTEXT:\n" + JSON.stringify(ctx) +
    (instruction ? "\n\nEXTRA INSTRUCTION FROM THE USER (follow it): " + instruction : "") +
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
        tools: TOOLS,
        tool_choice: { type: "tool", name: "apply_rewrite" },
        messages: [{ role: "user", content: user }],
      }),
    });

    const data = await res.json();
    if (!res.ok) return resp(res.status, { error: (data.error && data.error.message) || "Anthropic API error" });

    const block = (data.content || []).find((b) => b.type === "tool_use");
    if (!block || !block.input || typeof block.input !== "object") {
      return resp(502, { error: "Model did not return structured output" });
    }
    return resp(200, { content: block.input });
  } catch (e) {
    return resp(500, { error: String((e && e.message) || e) });
  }
};

function resp(statusCode, obj) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) };
}
