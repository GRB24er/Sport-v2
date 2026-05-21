// ═══════════════════════════════════════════════════════
// PayPerQ (OpenAI-compatible) client used by the AI chat
// assistant and ad-hoc completions. The fixture-based
// prediction engine has its own copy in lib/aiPredictor.js.
// ═══════════════════════════════════════════════════════

const DEFAULT_BASE_URL = "https://api.ppq.ai";
const DEFAULT_MODEL = "gpt-4o";

export function getAiConfig({ model, baseUrl } = {}) {
  return {
    apiKey: process.env.PPQ_API_KEY,
    baseUrl: baseUrl || process.env.PPQ_BASE_URL || DEFAULT_BASE_URL,
    model: model || process.env.PPQ_MODEL || DEFAULT_MODEL,
  };
}

export async function chatCompletion({ messages, model, temperature = 0.4, maxTokens = 1024, responseFormat, signal } = {}) {
  const cfg = getAiConfig({ model });
  if (!cfg.apiKey) throw new Error("PPQ_API_KEY not configured");
  if (!Array.isArray(messages) || !messages.length) throw new Error("messages required");

  const body = {
    model: cfg.model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (responseFormat) body.response_format = responseFormat;

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPerQ ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
    raw: data,
  };
}
