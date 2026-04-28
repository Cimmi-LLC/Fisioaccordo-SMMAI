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

  // Robust parsing: clean markdown fences, attempt double-parse, fallback to safe defaults
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let parsed = JSON.parse(cleaned);
    // If Gemini returned everything nested inside a string field, try to extract it
    if (typeof parsed.summary === "string" && parsed.summary.startsWith("{") && !parsed.strengths?.length) {
      try {
        parsed = JSON.parse(parsed.summary);
      } catch { /* keep original */ }
    }
    return parsed;
  } catch {
    try {
      return JSON.parse(JSON.parse(raw));
    } catch {
      return {
        summary: raw.substring(0, 500),
        overall_score: 50,
        strengths: [],
        weaknesses: [],
        opportunities: [],
        content_ideas: [],
      };
    }
  }
}
