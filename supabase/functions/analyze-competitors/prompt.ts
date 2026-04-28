import type { ScrapedRaw } from "./types.ts";

/**
 * Build the legacy v1 prompt context (compatible with existing schema).
 * This will be replaced in Commit 4 by buildSystemPromptV2 / buildUserPromptV2.
 */
export function buildLegacyContext(
  scraped: ScrapedRaw | null,
  manualInfo: string | undefined,
  username: string,
  platform: string
): string {
  if (scraped && scraped.posts.length > 0) {
    return `DATI REALI DEL PROFILO @${scraped.username}:
- Post analizzati: ${scraped.postsCount}
- Like medi per post: ${scraped.avgLikes}
- Commenti medi per post: ${scraped.avgComments}
- Like totali: ${scraped.totalLikes}
- Commenti totali: ${scraped.totalComments}

ULTIMI POST (caption + engagement):
${scraped.posts.map((p, i) =>
  `${i + 1}. [${p.type}] ${p.likes} like, ${p.comments} commenti\n   Caption: ${p.caption}\n   Hashtags: ${(p.hashtags || []).join(", ")}`
).join("\n\n")}`;
  }
  if (manualInfo) {
    return `INFORMAZIONI SUL COMPETITOR:\n${manualInfo}`;
  }
  return `Profilo competitor: @${username} su ${platform || "Instagram"}\nNOTA: Non è stato possibile scaricare i dati del profilo. Analizza basandoti sulla tua conoscenza generale del settore fisioterapia/salute su Instagram.`;
}

export const LEGACY_SYSTEM_PROMPT = "Sei un esperto analista di social media marketing specializzato nel settore sanitario e fisioterapico. Analizzi competitor e fornisci insight strategici actionable. Basa l'analisi sui dati reali quando disponibili. Rispondi SOLO con JSON valido.";

export function buildLegacyUserPrompt(competitorContext: string): string {
  return `Sei un esperto di social media marketing nel settore fisioterapia/salute.

Analizza questo competitor e fornisci un'analisi strategica completa:

${competitorContext}

CONTESTO: L'analisi è per FisioAccordo, uno studio di fisioterapia che vuole migliorare la propria presenza social.

Rispondi SOLO con un JSON valido:
{
  "competitor_name": "@username o nome",
  "overall_score": 75,
  "engagement_rate": "alto/medio/basso",
  "content_strategy": {
    "main_topics": ["lista dei 3-5 topic principali trattati"],
    "posting_frequency": "frequenza stimata di pubblicazione",
    "best_content_type": "tipo di contenuto che funziona meglio (carosello, reel, foto, etc.)",
    "tone_of_voice": "tono comunicativo usato"
  },
  "strengths": ["3-5 punti di forza specifici con dettagli"],
  "weaknesses": ["3-5 punti deboli o aree scoperte"],
  "opportunities": ["3-5 opportunità che FisioAccordo può sfruttare guardando questo competitor"],
  "content_ideas": [
    {
      "idea": "Idea specifica per un contenuto",
      "format": "carosello/reel/storia",
      "why": "Perché funzionerebbe basandosi sull'analisi"
    }
  ],
  "hashtag_analysis": {
    "most_used": ["hashtag più usati dal competitor"],
    "suggested": ["hashtag che FisioAccordo dovrebbe usare"]
  },
  "summary": "Analisi riassuntiva in 3-4 frasi con insight actionable"
}`;
}
