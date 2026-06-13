/**
 * Call Gemini once with system + user prompt. Returns parsed JSON or throws.
 */
export async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.7
): Promise<any> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return parseGeminiJson(raw);
}

/**
 * Robust JSON parse for LLM output. Strategies in order:
 * 1. Plain JSON.parse (after stripping markdown fences)
 * 2. Extract substring between first '{' and last '}'
 * 3. Double-parse for double-encoded responses
 * 4. Unwrap nested-in-summary
 * Throws with raw preview if everything fails — caller must wrap.
 */
function parseGeminiJson(raw: string): any {
  const stripped = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  const tryParse = (s: string): any | null => {
    try { return JSON.parse(s); } catch { return null; }
  };

  // Try plain
  let parsed = tryParse(stripped);

  // Try substring {…}
  if (!parsed) {
    const first = stripped.indexOf("{");
    const last = stripped.lastIndexOf("}");
    if (first !== -1 && last > first) {
      parsed = tryParse(stripped.substring(first, last + 1));
    }
  }

  // Try double-decoded ("\"{ ... }\"")
  if (!parsed) {
    const once = tryParse(raw);
    if (typeof once === "string") parsed = tryParse(once);
  }

  if (!parsed) {
    console.error("[analyze-competitors] Gemini returned unparseable text. Preview:", raw.substring(0, 300));
    throw new Error("Risposta non valida dal modello AI. Riprova.");
  }

  // Unwrap if entire payload is nested in a string field (Gemini quirk)
  if (typeof parsed.summary === "string" && parsed.summary.trim().startsWith("{") && !parsed.strengths?.length) {
    const unwrapped = tryParse(parsed.summary);
    if (unwrapped && typeof unwrapped === "object") parsed = unwrapped;
  }

  return parsed;
}
