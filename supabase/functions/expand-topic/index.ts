import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveProfession, professionPromptBlock, type ResolvedProfession } from "../_shared/brand/profession.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";
import { FORMATI, formatoPerId, pubblicoDelBrand, type Pubblico } from "../_shared/brand/metodoCopy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TopicIdea {
  titolo: string;
  hook: string;
  formato: string;
  focus: string;
}

// Le idee sono il punto in cui si decide se il post vale qualcosa (la
// contrarian take): pro, con flash di riserva.
const MODELLI = ["gemini-2.5-pro", "gemini-2.5-flash"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, count, brandId } = await req.json();

    if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
      return new Response(JSON.stringify({ error: "topic obbligatorio (min 2 caratteri)" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const n = Math.max(2, Math.min(6, parseInt(String(count)) || 3));

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // Contesto del brand: chi pubblica, a chi parla, con quali parole.
    // La professione decide il mestiere per cui si propongono le idee:
    // scelta nel brand kit, altrimenti rilevata dal brand e dal topic.
    let brandHint = "";
    let prof: ResolvedProfession = resolveProfession(null, topic);
    let pubblico: Pubblico = "B2C";
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") || "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
        );
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          // brandId esplicito quando il client lo passa (utenti multi-brand);
          // altrimenti il primo brand dell'utente, mai maybeSingle su piu righe.
          let brandQuery = supabase
            .from("brands")
            .select("*")
            .eq("user_id", user.id);
          if (brandId) brandQuery = brandQuery.eq("id", brandId);
          const { data: brand } = await brandQuery.order("created_at", { ascending: true }).limit(1).maybeSingle();
          if (brand) {
            prof = resolveProfession(brand, topic);
            pubblico = pubblicoDelBrand(brand);
            const frasi = (Array.isArray(brand.frasi_pazienti) ? brand.frasi_pazienti : []).filter(Boolean).slice(0, 10);
            const vantaggi = (brand.vantaggi_competitivi || []).filter(Boolean);
            brandHint = `
CONTESTO BRAND
- Chi pubblica: ${brand.nome_business || prof.label} (${prof.label})
- A chi parla: ${brand.target_pazienti || "pubblico generale"}
- Servizi: ${(brand.servizi || []).join(", ") || "(non indicati)"}
- Temi chiave: ${(brand.temi_chiave || []).join(", ") || "(non indicati)"}
${vantaggi.length ? `- Prove e vantaggi veri (le uniche prove ammesse): ${vantaggi.join("; ")}\n` : ""}${brand.convinzione_da_ribaltare ? `- Convinzione da ribaltare scelta dal brand: «${brand.convinzione_da_ribaltare}»\n` : ""}${frasi.length ? `- Parole vere dei clienti: ${frasi.map((f: string) => `«${f}»`).join(" ")}\n` : ""}`;
          }
        }
      } catch { /* non-blocking */ }
    }

    const lettore = pubblico === "B2B"
      ? "il titolare o il professionista dello studio (problemi di agenda, tempo, soldi, collaboratori, pazienti persi)"
      : `la persona con il problema (${prof.profile.cliente}), con i suoi sintomi e la sua giornata`;

    const systemPrompt = `Sei il content strategist di ${prof.profile.labelPlural} su Instagram e usi il metodo della Short Form Academy di Kallaway. Proponi idee di carosello che costruiscono fiducia.

${professionPromptBlock(prof)}

COME SI TROVA UN'IDEA (in quest'ordine)
1. Format per primo: il modo in cui l'informazione è organizzata.
2. Seed: l'idea in una riga.
3. Convinzione comune (A): cosa crede o fa di solito il lettore, detto in concreto.
4. Contrarian take (B): cosa sai tu che lui non sa, dimostrabile in meno di un minuto. Contrasto massimo fra A e B.
5. Test: se chiunque nella nicchia potrebbe dirla, scartala. Vietate come idea centrale le ovvietà («muoviti di più», «ascolta il tuo corpo», «affidati a un professionista», «la prevenzione è importante», «organizzati meglio»).
6. Solo alla fine l'hook della copertina: il lettore e la sua situazione nelle prime parole, il contrasto dichiarato o implicito, il tu, parole semplici, al massimo 9 parole.

REGOLE
- Il lettore è ${lettore}.
- Mai prove, numeri, casi o studi inventati: solo quelli del contesto brand.${pubblico === "B2C" && prof.id !== "altro" ? "\n- Nessuna idea deve far capire che si può fare a meno del professionista o dello studio." : ""}
- Mai «sbloccare». Niente «sapevi che», «la verità su», «non sottovalutare», «X cose che non sai».

FORMAT DISPONIBILI (id: punto di partenza)
${FORMATI.map((f) => `- ${f.id}: ${f.partenza}`).join("\n")}

Rispondi SOLO con JSON valido.`;

    const userPrompt = `Topic generale: "${topic}"
${brandHint}
Proponi ESATTAMENTE ${n} idee di carosello sul topic, ognuna con un format DIVERSO e una contrarian take DIVERSA. Ognuna è un post a sé, non una serie.

Per ogni idea:
- "formato": uno degli id dei format disponibili;
- "titolo": il seed, in una riga (cosa scomponi e perché è interessante);
- "hook": la copertina, massimo 9 parole;
- "focus": la contrarian take in una frase, nella forma «Si crede che A. In realtà B, perché…».

Rispondi con {"ideas":[{"formato":"…","titolo":"…","hook":"…","focus":"…"}]}`;

    let ideas: TopicIdea[] = [];
    let ultimoStatus = 0;
    for (const model of MODELLI) {
      const res = await callGeminiWithRetry({
        apiKey: GEMINI_API_KEY,
        model,
        maxRetries: 2,
        body: {
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.95,
            responseMimeType: "application/json",
            ...(model.includes("pro") ? { thinkingConfig: { thinkingBudget: 2048 } } : {}),
          },
        },
      });
      if (!res.ok) { ultimoStatus = res.status; continue; }
      const raw = res.data?.candidates?.[0]?.content?.parts?.map((p: { text?: string; thought?: boolean }) => p.thought ? "" : (p.text || "")).join("") || "";
      try {
        const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        ideas = Array.isArray(parsed) ? parsed : (parsed.ideas || parsed.posts || []);
      } catch (err) {
        console.error("Parse error:", err, "raw:", raw.substring(0, 300));
        ideas = [];
      }
      if (ideas.length > 0) break;
    }

    if (ideas.length === 0 && ultimoStatus) throw new Error(`Gemini API error: ${ultimoStatus}`);

    const valid = ideas
      .filter((i) => i && typeof i.titolo === "string" && i.titolo.trim().length > 3)
      .slice(0, n)
      .map((i) => ({
        titolo: i.titolo.trim(),
        hook: (i.hook || "").trim(),
        // Un id fuori lista non si passa avanti: generate-content sceglierà da sé.
        formato: formatoPerId(i.formato)?.id ?? "",
        focus: (i.focus || "").trim(),
      }));

    if (valid.length === 0) {
      throw new Error("Nessuna idea valida generata");
    }

    return new Response(JSON.stringify({ ideas: valid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("expand-topic error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
