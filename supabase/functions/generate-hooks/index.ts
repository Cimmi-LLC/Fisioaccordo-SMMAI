import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, audience, tone, platform } = await req.json();

    if (!topic) {
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const systemPrompt = `Sei un esperto di copywriting virale con specializzazione in contenuti per social media.
Il tuo compito è generare hook potenti che catturano l'attenzione nei primi 3 secondi.

CARATTERISTICHE HOOK EFFICACI:
- Pattern interrupt forte (emoji shock, numeri, domande provocatorie)
- Emotional trigger immediato (curiosità, paura, desiderio)
- Promise specifica di valore
- Linguaggio diretto e personale
- Adatto al platform target

STILI DI HOOK DA GENERARE:
1. Emotional Hooks (paura, desiderio, frustrazione)
2. Curiosity Gaps (segreti, verità nascoste, metodi sconosciuti)
3. Controversy Hooks (contro-intuitivo, shock, breaking beliefs)
4. Storytelling Hooks (trasformazione, prima/dopo, case study)
5. Authority Hooks (dati scientifici, expert reveal, statistiche)
6. Urgency Hooks (time-sensitive, limited, esclusività)

Per ogni hook, genera anche un virality_score da 1-100 basato su:
- Emotional intensity (30%)
- Curiosity gap strength (25%)
- Relevance to audience (20%)
- Pattern interrupt power (15%)
- Social proof potential (10%)`;

    const userPrompt = `Genera 20 hook potenti per questo topic:

TOPIC: ${topic}
AUDIENCE: ${audience || 'generale'}
TONE: ${tone || 'professionale ma coinvolgente'}
PLATFORM: ${platform || 'Instagram'}

REQUISITI:
- Ogni hook deve essere completo e pronto all'uso
- Lunghezza: 80-120 caratteri massimo per hook
- Variare gli stili (emotional, curiosity, controversy, etc.)
- Includere emoji strategici
- Adattare al tone e audience specificati

FORMATO RISPOSTA (JSON):
{
  "hooks": [
    {
      "text": "🚨 ATTENZIONE: ...",
      "style": "emotional",
      "virality_score": 85,
      "reasoning": "Breve spiegazione del perché questo hook funziona"
    }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsedContent = JSON.parse(content);

    const sortedHooks = parsedContent.hooks.sort((a: any, b: any) =>
      (b.virality_score || 0) - (a.virality_score || 0)
    );

    return new Response(
      JSON.stringify({
        hooks: sortedHooks,
        metadata: {
          topic,
          audience,
          tone,
          platform,
          generated_at: new Date().toISOString()
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-hooks function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback_hooks: generateFallbackHooks()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generateFallbackHooks() {
  return [
    {
      text: "🚨 ATTENZIONE: Questa scoperta può cambiare tutto",
      style: "emotional",
      virality_score: 75,
      reasoning: "Pattern interrupt forte con promise implicita"
    },
    {
      text: "❌ ERRORE COMUNE: Il 90% delle persone sbaglia questo",
      style: "curiosity",
      virality_score: 82,
      reasoning: "Curiosity gap + statistica shock"
    },
    {
      text: "🔥 RIVELAZIONE: Quello che nessuno ti dice davvero",
      style: "controversy",
      virality_score: 78,
      reasoning: "Authority challenge + segreto rivelato"
    }
  ];
}
