import type { ScrapedRaw } from "./types.ts";

/**
 * Build the legacy v1 prompt context (compatible with existing schema).
 * This will be replaced in Commit 4 by buildSystemPromptV2 / buildUserPromptV2.
 */
/**
 * Pulls hashtags from a free-text caption with a `#tag` regex.
 * Apify sometimes returns `hashtags: []` even when the caption has them,
 * because the scraper reads only the structured metadata. This fallback
 * catches that case and avoids forcing the LLM to invent hashtags.
 */
function extractHashtagsFromCaption(caption: string): string[] {
  if (!caption) return [];
  const matches = caption.match(/#[\p{L}0-9_]+/gu) || [];
  return matches.map((t) => t.replace(/^#/, "").toLowerCase());
}

function mergeHashtags(structured: string[] | undefined, caption: string): string[] {
  const fromCaption = extractHashtagsFromCaption(caption);
  const all = [...(structured || []), ...fromCaption].map((t) => t.replace(/^#/, "").toLowerCase());
  return Array.from(new Set(all));
}

export function buildLegacyContext(
  scraped: ScrapedRaw | null,
  manualInfo: string | undefined,
  username: string,
  platform: string
): string {
  if (scraped && scraped.posts.length > 0) {
    // Aggregate all hashtags actually observed across posts (after caption fallback)
    const allObservedHashtags = new Set<string>();
    const enrichedPosts = scraped.posts.map((p) => {
      const tags = mergeHashtags(p.hashtags, p.caption || "");
      tags.forEach((t) => allObservedHashtags.add(t));
      return { ...p, mergedHashtags: tags };
    });

    const observedList = Array.from(allObservedHashtags);
    const hashtagSection = observedList.length > 0
      ? `\nHASHTAG OSSERVATI (lista completa estratta dai post):\n${observedList.map((t) => `#${t}`).join(", ")}`
      : `\nHASHTAG OSSERVATI: NESSUN hashtag rilevato nei post analizzati. NON inventare hashtag.`;

    return `DATI REALI DEL PROFILO @${scraped.username}:
- Post analizzati: ${scraped.postsCount}
- Like medi per post: ${scraped.avgLikes}
- Commenti medi per post: ${scraped.avgComments}
- Like totali: ${scraped.totalLikes}
- Commenti totali: ${scraped.totalComments}
${hashtagSection}

ULTIMI POST (caption + engagement):
${enrichedPosts.map((p, i) =>
  `${i + 1}. [${p.type}] ${p.likes} like, ${p.comments} commenti\n   Caption: ${p.caption}\n   Hashtags rilevati: ${p.mergedHashtags.length > 0 ? p.mergedHashtags.map((t) => "#" + t).join(", ") : "(nessuno)"}`
).join("\n\n")}`;
  }
  if (manualInfo) {
    return `INFORMAZIONI SUL COMPETITOR:\n${manualInfo}`;
  }
  return `Profilo competitor: @${username} su ${platform || "Instagram"}\nNOTA: Non è stato possibile scaricare i dati del profilo. Analizza basandoti sulla tua conoscenza generale del settore fisioterapia/salute su Instagram.`;
}

/**
 * After Gemini responds, drop any hashtag in `most_used` that isn't actually
 * in the observed set. Prevents hallucinated tags from reaching the UI.
 */
export function filterMostUsedAgainstObserved(
  parsed: any,
  scraped: ScrapedRaw | null
): void {
  if (!scraped || !scraped.posts.length) return;
  if (!parsed?.hashtag_analysis?.most_used || !Array.isArray(parsed.hashtag_analysis.most_used)) return;

  const observed = new Set<string>();
  for (const p of scraped.posts) {
    for (const t of mergeHashtags(p.hashtags, p.caption || "")) {
      observed.add(t);
    }
  }

  parsed.hashtag_analysis.most_used = parsed.hashtag_analysis.most_used
    .map((h: string) => String(h).replace(/^#/, "").toLowerCase())
    .filter((h: string) => observed.has(h));
}

export const LEGACY_SYSTEM_PROMPT = `Sei un esperto analista di social media marketing specializzato nel settore sanitario e fisioterapico. Analizzi competitor e fornisci insight strategici actionable.

REGOLE CRITICHE:
- Basa OGNI analisi (engagement, topic, hashtag, frequenza) SOLO sui dati reali forniti nel prompt.
- "hashtag_analysis.most_used": USA SOLO hashtag che vedi esplicitamente nei post o nella sezione "HASHTAG OSSERVATI". Se nessun hashtag è presente, ritorna array vuoto. MAI inventare.
- "hashtag_analysis.suggested": qui PUOI proporre hashtag nuovi rilevanti per il settore, ma devono essere realistici e specifici.
- Le frequenze e i topic devono derivare dai post mostrati, non da assunzioni generiche.

Rispondi SOLO con JSON valido.`;

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
