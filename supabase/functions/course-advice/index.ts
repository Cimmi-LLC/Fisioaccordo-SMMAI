// Corso per andare virali — 3 consigli sull'account, legati alla lezione.
//
// Input: { brandId, lessonId }. Solo admin (la sezione è riservata) e solo
// brand propri. Legge il testo della lezione, il Brand Kit e le metriche
// Instagram degli ultimi 120 giorni (post_metrics), calcola mediana e
// outlier (5× la mediana) e chiede a Gemini 3 consigli concreti che
// applicano la lezione a quell'account, citando i numeri. Il risultato si
// salva in course_advice, così riaprendo la lezione si rivede.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { adminClient, requireAuth, assertBrandOwnership, requireWithinRateLimit } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";

const MODELS = ["gemini-2.5-pro", "gemini-2.5-flash"];
const LESSON_MAX_CHARS = 14000;
const DAYS = 120;

type MetricRow = {
  external_post_id: string;
  snapshot_date: string;
  caption_excerpt: string | null;
  reach: number | null;
  video_views: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  avg_view_sec: number | null;
  video_completion_rate: number | null;
  followers_total: number | null;
};

type PostSummary = {
  didascalia: string;
  primo_dato: string;
  copertura: number;
  visualizzazioni: number | null;
  like: number | null;
  commenti: number | null;
  salvataggi: number | null;
  condivisioni: number | null;
  secondi_medi_visione: number | null;
  volte_la_mediana: number | null;
};

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

async function isAdmin(authHeader: string): Promise<boolean> {
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await client.rpc("is_admin");
  return !error && data === true;
}

function summarize(rows: MetricRow[]) {
  // Una riga per post al giorno: si tiene l'ultima fotografia di ogni post.
  const latest = new Map<string, MetricRow>();
  const first = new Map<string, string>();
  let followers: number | null = null;
  let lastDay = "";
  for (const r of rows) {
    const cur = latest.get(r.external_post_id);
    if (!cur || r.snapshot_date > cur.snapshot_date) latest.set(r.external_post_id, r);
    const f = first.get(r.external_post_id);
    if (!f || r.snapshot_date < f) first.set(r.external_post_id, r.snapshot_date);
    if (r.snapshot_date >= lastDay) {
      lastDay = r.snapshot_date;
      if (typeof r.followers_total === "number") followers = r.followers_total;
    }
  }
  const posts = [...latest.values()].map((r) => ({
    row: r,
    reach: r.reach ?? r.video_views ?? 0,
  }));
  const med = median(posts.map((p) => p.reach).filter((x) => x > 0));
  const toSummary = (p: { row: MetricRow; reach: number }): PostSummary => ({
    didascalia: (p.row.caption_excerpt || "").slice(0, 220),
    primo_dato: first.get(p.row.external_post_id) || p.row.snapshot_date,
    copertura: p.reach,
    visualizzazioni: p.row.video_views,
    like: p.row.likes,
    commenti: p.row.comments,
    salvataggi: p.row.saves,
    condivisioni: p.row.shares,
    secondi_medi_visione: p.row.avg_view_sec,
    volte_la_mediana: med > 0 ? Math.round((p.reach / med) * 10) / 10 : null,
  });
  const byReach = [...posts].sort((a, b) => b.reach - a.reach);
  const outliers = med > 0 ? byReach.filter((p) => p.reach >= 5 * med) : [];
  const weeks = Math.max(1, DAYS / 7);
  return {
    stats: {
      post_analizzati: posts.length,
      reach_mediana: med,
      outlier: outliers.length,
      follower: followers,
      post_a_settimana: Math.round((posts.length / weeks) * 10) / 10,
      ultimo_dato: lastDay || null,
    },
    migliori: byReach.slice(0, 6).map(toSummary),
    peggiori: byReach.slice(-4).reverse().map(toSummary),
    outlier: outliers.slice(0, 6).map(toSummary),
  };
}

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonResponse(req, { error: auth.error }, auth.status);
    if (!(await isAdmin(auth.authHeader))) return jsonResponse(req, { error: "Sezione riservata agli amministratori" }, 403);

    const body = await req.json().catch(() => null) as { brandId?: string; lessonId?: string } | null;
    const brandId = String(body?.brandId || "");
    const lessonId = String(body?.lessonId || "");
    if (!brandId || !lessonId) return jsonResponse(req, { error: "brandId e lessonId obbligatori" }, 400);

    const supabase = adminClient();
    const own = await assertBrandOwnership(supabase, auth.userId, brandId);
    if (!own.ok) return jsonResponse(req, { error: own.error }, own.status);

    const rl = await requireWithinRateLimit(supabase, auth.userId, "course-advice", 10, 60);
    if (!rl.ok) return jsonResponse(req, { error: rl.error }, rl.status);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return jsonResponse(req, { error: "GEMINI_API_KEY non configurata" }, 500);

    const since = new Date(Date.now() - DAYS * 86400000).toISOString().slice(0, 10);
    const [lessonRes, brandRes, metricsRes] = await Promise.all([
      supabase.from("course_lessons").select("id, title, module_title, plain").eq("id", lessonId).maybeSingle(),
      supabase.from("brands").select("nome_business, professione, professione_custom, citta, servizi, target_pazienti, tono_voce, descrizione").eq("id", brandId).maybeSingle(),
      supabase.from("post_metrics")
        .select("external_post_id, snapshot_date, caption_excerpt, reach, video_views, likes, comments, saves, shares, avg_view_sec, video_completion_rate, followers_total")
        .eq("brand_id", brandId).eq("channel", "instagram").gte("snapshot_date", since)
        .order("snapshot_date", { ascending: false }).limit(5000),
    ]);
    if (lessonRes.error || !lessonRes.data) return jsonResponse(req, { error: "Lezione non trovata" }, 404);
    if (brandRes.error || !brandRes.data) return jsonResponse(req, { error: "Brand non trovato" }, 404);

    const lesson = lessonRes.data as { title: string; module_title: string | null; plain: string };
    const brand = brandRes.data as Record<string, unknown>;
    const data = summarize((metricsRes.data || []) as MetricRow[]);

    const prompt = `Sei il coach di contenuti short form di uno studio sanitario. Applichi UNA lezione di un corso all'account Instagram di questo studio.

LEZIONE: «${lesson.title}» (modulo: ${lesson.module_title || "-"})
TESTO DELLA LEZIONE:
${lesson.plain.slice(0, LESSON_MAX_CHARS)}

STUDIO (Brand Kit):
${JSON.stringify(brand)}

NUMERI INSTAGRAM DEGLI ULTIMI ${DAYS} GIORNI (ultima fotografia di ogni post; "copertura" = reach, o visualizzazioni se manca):
${JSON.stringify(data)}

Scrivi esattamente 3 consigli, in italiano, che applicano QUESTA lezione a QUESTO account.
Regole:
- Ogni consiglio è un'azione concreta da fare questa settimana (cosa pubblicare, cosa cambiare in hook, format, script, CTA, bio o ritmo), non teoria.
- Nel "perche" cita i numeri veri qui sopra (post, mediana, outlier, didascalie) e il punto della lezione da cui viene il consiglio.
- Se un post è un outlier, proponi di rifarlo cambiando un solo elemento.
- Non inventare numeri o post che non ci sono. Se i dati sono pochi o vecchi, dillo in "nota_dati" e basa i consigli su lezione e Brand Kit.
- Linguaggio semplice, diretto, frasi brevi. Mai la parola "sbloccare" riferita ai pazienti.

Rispondi SOLO con questo JSON:
{"consigli":[{"titolo":"max 10 parole","cosa_fare":"2-3 frasi","perche":"1-2 frasi con i numeri"}],"nota_dati":"una frase sui dati usati, o stringa vuota"}`;

    let parsed: { consigli?: unknown; nota_dati?: unknown } | null = null;
    for (const model of MODELS) {
      const res = await callGeminiWithRetry({
        apiKey: GEMINI_API_KEY,
        model,
        body: {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.6 },
        },
      });
      const txt = res.data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
      try {
        const j = JSON.parse(txt);
        if (Array.isArray(j?.consigli) && j.consigli.length) { parsed = j; break; }
      } catch { /* risposta non JSON: prova il modello successivo */ }
      console.warn(`course-advice: risposta non valida da ${model} (status ${res.status})`);
    }
    if (!parsed) return jsonResponse(req, { error: "L'AI non ha risposto in modo valido. Riprova tra poco." }, 502);

    const consigli = (parsed.consigli as Array<Record<string, unknown>>).slice(0, 3).map((c) => ({
      titolo: String(c.titolo || "").slice(0, 140),
      cosa_fare: String(c.cosa_fare || "").slice(0, 900),
      perche: String(c.perche || "").slice(0, 700),
    }));
    const advice = { consigli, nota_dati: String(parsed.nota_dati || "").slice(0, 400) };

    const { data: saved, error: saveErr } = await supabase
      .from("course_advice")
      .insert({ user_id: auth.userId, brand_id: brandId, lesson_id: lessonId, advice, stats: data.stats })
      .select("id, advice, stats, created_at")
      .single();
    if (saveErr) return jsonResponse(req, { error: `Consigli generati ma non salvati: ${saveErr.message}` }, 500);

    return jsonResponse(req, saved);
  } catch (e) {
    console.error("course-advice:", e);
    return jsonResponse(req, { error: e instanceof Error ? e.message : "Errore interno" }, 500);
  }
});
