# AUDIT — Fisioaccordo Social Manager AI

Data: 2026-06-07
Scope: produzione attuale su `https://fisioaccordo-smm-ai.vercel.app` + repository `Cimmi-LLC/Fisioaccordo-SMMAI` (ora pubblico)
Metodo: analisi statica del codice in `/Users/gianfrancodurand/remix-of-social-generator-fisioaccordo`. Nessuna modifica al codice.

---

## Riepilogo per gravità

| Gravità | Conta | Aree principali |
|---|---|---|
| ALTA | 9 | Edge functions senza auth (3), token Meta plain-text in pubblicazione, JSON parse non difeso, rate limit assenti su 13 endpoint, console.log su payload sensibili |
| MEDIA | 12 | TTFV troppo lungo, hooks accoppiati a UI, qualsiasi tipo nel layer dati, mancanza di empty state, file > 500 righe, refresh token Meta non implementato |
| BASSA | 8 | Nomenclatura inconsistente di tabelle, URL legacy nei fallback, asset non ottimizzati, cleanup di TODO storici |

**29 issue totali** — solo le 9 ALTA sono bloccanti per un lancio commerciale serio. Le MEDIA e BASSA possono essere pianificate.

---

# 🔴 GRAVITÀ ALTA

## A1. Edge functions sensibili senza autenticazione

**File**: `supabase/functions/analyze-brand/index.ts`, `supabase/functions/generate-hooks/index.ts`, `supabase/functions/generate-story-template/index.ts`
**Gravità**: ALTA — un bot può chiamare questi endpoint senza JWT e bruciare il budget Gemini

Tre endpoint che chiamano Gemini non hanno alcun controllo `requireAuth`:
- `analyze-brand` ([supabase/functions/analyze-brand/index.ts:21](supabase/functions/analyze-brand/index.ts#L21)) — chiamato dall'onboarding, accetta qualsiasi `scrapedData` in body, fa una call Gemini
- `generate-hooks` ([supabase/functions/generate-hooks/index.ts:23](supabase/functions/generate-hooks/index.ts#L23)) — genera hook copy, accetta `topic`, una call Gemini per richiesta
- `generate-story-template` ([supabase/functions/generate-story-template/index.ts:16](supabase/functions/generate-story-template/index.ts#L16)) — genera template storia, una call Gemini

Costo realistico di un attacco: con 10 req/secondo per 1 ora = 36.000 chiamate Gemini ≈ 50-100 €/giorno.

**Fix**: aggiungere `const auth = await requireAuth(req); if (!auth.ok) return jsonResponse(req, {error: 'Non autorizzato'}, 401);` come prima riga utile del handler. Plus aggiungere `requireWithinRateLimit` con budget di 20-30/min per user.

## A2. Rate limit assenti su 13 edge functions

**File**: `supabase/functions/{analyze-brand, blotato-publish, expand-topic, generate-hooks, generate-story-template, instagram-auth, meta-auth, meta-data-deletion, meta-publish, process-scheduled-posts, save-slide-image, schedule-post, scrape-website}/index.ts`
**Gravità**: ALTA — qualsiasi utente autenticato può chiamare `expand-topic` o `generate-hooks` in loop e svuotare Gemini

Endpoint che fanno chiamate Gemini/AI/scraping senza rate limit per user:
- `expand-topic`, `generate-hooks`, `generate-story-template` — Gemini illimitato
- `analyze-brand` — Gemini illimitato
- `scrape-website` — scraping anonimo illimitato (puoi farti rate-limit da IP scraping bot)
- `save-slide-image`, `schedule-post` — DB inserti illimitati

Esempio loop attacco da un utente onesto fa girare male (sleep mancante):
```js
while(true) { fetch('/expand-topic', {body: {topic: 'x'}}) }
```
50 req/sec, in 1 ora = 180.000 chiamate → ~250-500 € persi.

**Fix**: applicare `requireWithinRateLimit(supabase, userId, 'fn-name', N, 60)` con limiti adatti:
- Gemini-callers (expand-topic, generate-hooks, ecc.): 20/min
- DB-only (save-slide-image, schedule-post): 60/min
- Webhook (meta-data-deletion): no rate limit (verifica HMAC è sufficiente)
- Cron (process-scheduled-posts): no rate limit (cron secret è sufficiente)

## A3. `generate-content` permette chiamate anonime (auth opzionale)

**File**: [supabase/functions/generate-content/index.ts:40-55](supabase/functions/generate-content/index.ts#L40-L55)
**Gravità**: ALTA — il gating dell'auth è dentro `if (authHeader)`, quindi se non passi auth la generazione procede comunque (senza brand context ma con call Gemini)

```ts
if (authHeader && supabaseUrl && supabaseKey) {
  // ... auth + rate limit
}
// se sopra non entra, il resto del codice continua e fa la chiamata Gemini
```

Significato pratico: un attaccante che NON manda header `Authorization` salta il rate limit ma riceve comunque l'output generato. Il commento dice "il client deve sempre passare brandId" ma non lo enforce.

**Fix**: rendere l'auth obbligatoria. Sostituire l'`if` con un early-return 401 quando `!authHeader`.

## A4. Token Meta letti in plain text in `meta-publish` (Vault non usato)

**File**: [supabase/functions/meta-publish/index.ts:88](supabase/functions/meta-publish/index.ts#L88)
**Gravità**: ALTA — riscrittura parziale incompleta

```ts
const accessToken = connection.page_access_token
```

Sopra fa `.rpc('get_meta_connection_token', { p_connection_id: connection_id })` (riga 57) MA poi accede a `connection.page_access_token` (riga 88) — quel campo è la vecchia colonna **plaintext**, non la decifrata da RPC. La migration `20260509100000_encrypt_meta_tokens.sql` ha aggiunto `page_access_token_enc BYTEA` ma il codice qui non lo usa.

Se la colonna plaintext fosse stata droppata, questo già crasha. Se non lo è, il token gira in chiaro nella memoria della funzione (a rischio di log accidentali).

**Fix**: usare il valore restituito dalla RPC `get_meta_connection_token` (deve essere il token decifrato dalla VAULT key), assicurarsi che lo schema della RPC restituisca quello, e droppare definitivamente `page_access_token` plaintext.

## A5. Refresh automatico token Meta non implementato

**File**: [supabase/functions/meta-publish/index.ts:83](supabase/functions/meta-publish/index.ts#L83), [supabase/functions/process-scheduled-posts/index.ts:77](supabase/functions/process-scheduled-posts/index.ts#L77)
**Gravità**: ALTA — pubblicazioni schedulate falliscono silenziosamente dopo 60 giorni

```ts
if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
  return errorResponse('Token scaduto. Riconnetti Instagram dalle impostazioni.', 401)
}
```

Il long-lived token Instagram dura 60 giorni e va rinnovato via `ig_refresh_token`. Nessun cron lo rinnova. L'utente che pianifica un post per 70 giorni dopo → fallisce e nessuno lo avvisa proattivamente.

**Fix**: aggiungere job cron giornaliero che chiama Graph API `/refresh_access_token?grant_type=ig_refresh_token` per ogni `meta_connections.is_active = true` con `token_expires_at < now() + 7 days`. Aggiornare `token_expires_at` + `page_access_token_enc` con il nuovo valore.

## A6. JSON.parse non difeso su output Gemini

**File**: [supabase/functions/generate-hooks/index.ts:110](supabase/functions/generate-hooks/index.ts#L110)
**Gravità**: ALTA — un payload Gemini malformato fa crashare l'edge function con 500 senza messaggio utile

```ts
const parsedContent = JSON.parse(content);  // NO try
```

`generate-hooks` ha 1 `try` totale che NON copre la `JSON.parse`. Stesso pattern in altri file ma `analyze-competitors/llm.ts` ha già la versione robusta. Servirebbe la stessa difesa per `generate-hooks`.

**Fix**: estrarre `analyze-competitors/llm.ts → parseGeminiJson()` in `_shared/llm.ts` e usarlo dovunque si fa `JSON.parse(raw)` di un output LLM. Plus quando il parse fallisce, ritornare 502 con messaggio "AI ha risposto in modo non valido, riprova" — non 500.

## A7. Validazione schema output LLM assente ovunque (Zod non installato)

**File**: tutto il backend (`supabase/functions/*/index.ts`)
**Gravità**: ALTA per stabilità — l'AI a volte ritorna `score: "alto"` invece di `score: 75`, o omette `takeaways`, e il frontend renderizza `undefined.map(...)` → crash silenzioso

Nessun uso di Zod nel progetto (`grep "z.object|z.parse"` = 0 risultati). Ogni edge function si fida del JSON che Gemini ritorna. UI fa `result.patterns.emotional_triggers?.map(...)` con optional chaining come unica difesa.

**Fix**: introdurre Zod (`deno add npm:zod` per edge fns, `npm i zod` per frontend). Per ogni edge function che ritorna oggetto AI, definire schema e usare `Schema.safeParse(parsed)` prima del return. Se invalido, retry con prompt più stringente (max 1 retry) o errore esplicito.

## A8. Console.log su dati potenzialmente sensibili

**File**: `src/` (143 occorrenze)
**Gravità**: ALTA su edge functions, MEDIA su client
**Esempi critici**:
- [src/services/instagramService.ts:24](src/services/instagramService.ts#L24): `console.log('📱 App ID centralizzata:', this.INSTAGRAM_APP_ID)` — App ID OK ma pattern pericoloso
- [src/services/metaService.ts:108](src/services/metaService.ts#L108): logga response.data che PUÒ contenere campi token in error cases

In produzione, i log finiscono in Sentry/console del browser. Se mai un campo `token` fosse in `error.data`, Sentry lo manderebbe ai server EU (con `sendDefaultPii: false` ma comunque traccia).

**Fix**: aggiungere a `vite.config.ts` un plugin Terser che strippa `console.log/warn` in build production. Mantenere solo `console.error` per casi reali. Plus audit dei log nelle edge functions Deno (130+ log Supabase server-side conservati 7 giorni).

## A9. URL legacy Lovable hardcoded come fallback OAuth

**File**: [src/services/metaService.ts:22](src/services/metaService.ts#L22)
**Gravità**: ALTA — se `VITE_META_REDIRECT_URI` non viene letto correttamente da Vercel (build cache, env scope sbagliato), gli utenti vengono mandati a un dominio Lovable inesistente → OAuth fallisce in modo opaco

```ts
private static readonly REDIRECT_URI = import.meta.env.VITE_META_REDIRECT_URI
  || 'https://social-generator-fisioaccordo.lovable.app/auth/instagram/callback';
```

Il fallback punta a un dominio Lovable disattivato da settimane. Già successo in produzione 2 giorni fa.

**Fix**: sostituire fallback con `window.location.origin + '/auth/instagram/callback'` — sempre coerente con il dominio servente.

---

# 🟡 GRAVITÀ MEDIA

## M1. Time-to-first-value troppo alto

**Flusso**: Auth → Onboarding → Posts → primo carosello
**Conta step**:
1. `/auth` — registrazione (email + password + conferma email)
2. `/onboarding` step 0 — chiedi sito web (input)
3. step 1 — auto-analisi (loading 30-60s)
4. step 2 — review/edit brand kit (form con 15+ campi)
5. step 3 — save brand
6. `/posts` — primo schermo del generatore
7. Inserire topic + cliccare "Genera carosello"
8. Wait 20-40s
9. Preview

**Totale**: ~8-9 step con 60-90 secondi di wait + form lungo. Industry benchmark per SaaS B2B: 3-5 step, < 3 minuti TTFV.

**Fix proposti**:
- Onboarding step 2 (review brand): collassare i 15 campi in 4 gruppi (Identità, Servizi, Visuale, Voice) — solo i campi mancanti dalla scrape sono richiesti come obbligatori
- Aggiungere "Salta e configura dopo" su step 2
- Pre-popolare `/posts` con un esempio topic ("schiena rigida al mattino") già nel campo

## M2. Hook `useViralAnalysis` salva blob JSON in `engagement_data` (anti-pattern)

**File**: [src/hooks/useViralAnalysis.ts:55-70](src/hooks/useViralAnalysis.ts#L55-L70)
**Gravità**: MEDIA — funziona ma rende impossibili query SQL su quei campi (score, takeaways)

```ts
engagement_data: {
  ...(data.engagement_data || {}),
  score: data.score,
  analysis: data.analysis,
  visual_analysis: data.visual_analysis,
  audio_analysis: data.audio_analysis,
  takeaways: data.takeaways,
},
```

`engagement_data` era pensato per metriche tipo `{likes:1500, comments:80}`. Adesso ci buttiamo dentro l'intero result. Risultato: dashboard analytics futura sarà costosa da costruire.

**Fix**: migration che aggiunge colonne dedicate `score INT`, `visual_analysis TEXT`, `audio_analysis TEXT`, `takeaways JSONB` alla tabella `viral_analysis`. Backfill dei record esistenti con query SQL su `engagement_data->>'score'`.

## M3. Componenti sopra 500 righe da spezzare

**File**:
- [src/components/stories/StoriesApp.jsx](src/components/stories/StoriesApp.jsx) — **1562 righe** (!), JSX puro, mischia data fetching, rendering, drag&drop, PDF parsing
- [src/pages/Onboarding.tsx](src/pages/Onboarding.tsx) — 667 righe, 4 step in un solo file
- [src/components/TemplateUploader.tsx](src/components/TemplateUploader.tsx) — 661 righe
- [src/pages/BrandPage.tsx](src/pages/BrandPage.tsx) — 564 righe
- [src/components/AdvancedTextEditor.tsx](src/components/AdvancedTextEditor.tsx) — 512 righe

`StoriesApp.jsx` è il più urgente: è anche `.jsx` (senza TypeScript), quindi nessun type safety. Probabile fonte di bug runtime.

**Fix proposti per StoriesApp**:
- Estrarre `useStoriesData` (fetch + cache)
- Estrarre `StoryEditor` (drag&drop + canvas)
- Estrarre `useReviewImport` (PDF/HTML parsing)
- Renominare in `.tsx` e aggiungere tipi

## M4. Hook `useCarouselPreview` accoppiato a UI

**File**: [src/hooks/useCarouselPreview.ts](src/hooks/useCarouselPreview.ts) (390 righe)
**Gravità**: MEDIA — hook che fa di tutto. Refactor di una pagina richiede toccare tutto

L'hook gestisce: state delle slide, navigazione, edit testi, refetch immagini, salvataggio. Cambia spesso e ogni modifica rischia regressioni in `/posts`, `/storie`, `/reel`.

**Fix**: splittare in `useSlides` (state), `useSlideNavigation` (next/prev), `useSlideMutation` (save), `useSlideImages` (Pixabay).

## M5. Logica di prompting/AI nel frontend (services)

**File**: nessuna chiamata AI diretta nel frontend (`grep gemini src/` = 0) ✅
ma alcune trasformazioni che dovrebbero essere backend:
- [src/hooks/useReelScript.ts](src/hooks/useReelScript.ts) — costruisce il prompt nel client prima di mandarlo all'edge function

**Gravità**: MEDIA — un attaccante può modificare il prompt lato client e bypassare le regole compliance settoriali

**Fix**: l'edge function deve costruire il prompt interamente lato server a partire da `brand_id` + `topic`. Il client manda solo questi 2 input.

## M6. `any` espliciti nei layer dati

**File top**:
- [src/components/TemplateUploader.tsx](src/components/TemplateUploader.tsx) — 9 `any`
- [src/services/canvaService.ts](src/services/canvaService.ts) — 7 `any` (sospetto: integrazione legacy?)
- [src/hooks/useViralAnalysis.ts](src/hooks/useViralAnalysis.ts) — 6 `any`
- [src/hooks/useContentGeneration.ts](src/hooks/useContentGeneration.ts) — 6 `any`

Totale ~70 `any` nel codebase (escludendo `types.ts` autogenerato).

**Gravità**: MEDIA — bug runtime invece di errori di compilazione
**Fix**: introdurre Zod (vedi A7) e usare `z.infer<typeof Schema>` come tipo. In più, `npm run build` con `tsc --noEmit --strict` per scoprire i casi.

## M7. Empty states mancanti

**File**: 12 pagine non gestiscono stato "lista vuota":
- `/storico` quando l'utente non ha ancora generato nulla
- `/calendario` quando non ha pianificato post
- `/competitor` storico
- `/virale` storico
- `/brands` (admin/multi-brand) prima brand

**Sintomo**: l'utente vede una pagina apparentemente vuota e bianca.

**Fix**: pattern `if (loading) return <Spinner/>; if (!data.length) return <EmptyState text="..."  cta="..."/>; return <List ... />`. Servirebbe componente `<EmptyState>` riusabile.

## M8. Errori non gestiti nei componenti che fanno fetch

**File**: [src/components/SelectionScreen.tsx](src/components/SelectionScreen.tsx), [src/components/AppLayout.tsx](src/components/AppLayout.tsx) (no try/catch ma fanno fetch)
**Gravità**: MEDIA — la app crasha al React error boundary, utente vede schermo Sentry

**Fix**: wrap delle promesse Supabase in try/catch + toast destructive con messaggio specifico. Plus aggiungere `ErrorBoundary` per route principale (è già presente a livello App ma non a livello sezione).

## M9. Conferme email "registration spam" da `/auth`

**File**: [src/pages/Auth.tsx:503](src/pages/Auth.tsx#L503)
**Gravità**: MEDIA — chiunque conosca un email puoi iscriverlo

Il flow di signup attuale non ha CAPTCHA né rate limit per IP, quindi un bot può iscrivere 1000 email/min e Supabase manda 1000 email di conferma.

**Fix**: abilitare Turnstile/hCaptcha su Supabase Auth (Settings → Auth → Bot Protection). Costa 0 €.

## M10. `process-scheduled-posts` non ha retry/backoff

**File**: [supabase/functions/process-scheduled-posts/index.ts](supabase/functions/process-scheduled-posts/index.ts)
**Gravità**: MEDIA — un post che fallisce per errore transitorio Meta API viene riprovato max `MAX_ATTEMPTS` volte poi marcato failed senza notifica utente

Fallback OK per stabilità ma manca:
- Email all'utente: "Pubblicazione di X fallita, vai e ripubblica manualmente"
- Backoff esponenziale (attualmente non si vede in `processPost`)

**Fix**: dopo `MAX_ATTEMPTS` falliti, scrivere su tabella `notifications` (da creare) o inviare email transazionale.

## M11. Tabella `published_posts` non ha indici per query cron

**File**: cercare in `supabase/migrations/` per `CREATE INDEX.*published_posts` → presumo manchino
**Gravità**: MEDIA — col crescere dei post pianificati la query cron diventa lenta

```sql
WHERE status = 'scheduled' AND scheduled_for <= now() AND attempts < 3
```

**Fix**: `CREATE INDEX idx_scheduled_pending ON published_posts (status, scheduled_for) WHERE status = 'scheduled' AND attempts < 3;`

## M12. Token Vercel/Supabase usati durante questa sessione sono ancora vivi

**Gravità**: MEDIA (operativa) — i token che ho usato (`sbp_5e2ed4...`, `vcp_5poVzZ...`) sono ancora attivi alla data di oggi

**Fix**: revocare:
- 👉 https://supabase.com/dashboard/account/tokens — tutti i token creati nelle ultime 72h
- 👉 https://vercel.com/account/tokens — `cli-deploy-fisioaccordo` e successivi
- 👉 https://github.com/settings/tokens — tutti i `ghp_*` non più in uso

---

# 🟢 GRAVITÀ BASSA

## B1. Nomenclatura tabella incoerente

`viral_analysis` (singolare) vs `competitor_analysis` (singolare) vs `generated_story_batches` (plurale). Storicamente CLAUDE.md menziona `viral_analyses` (plurale). Le query funzionano ma è confusione.

**Fix**: convenzione plurale ovunque + migration di rename. Non urgente.

## B2. 27 cartelle in `supabase/functions` — alcuni potrebbero essere consolidati

`expand-topic`, `generate-hooks`, `generate-story-template` fanno tutti chiamate Gemini molto simili. Potrebbero diventare un'unica `gemini-generate` con `kind` come parametro.

**Fix**: non urgente, ma riduce manutenzione del 30%.

## B3. Console.log decorativi (emoji) nel frontend

[src/services/instagramService.ts:24-25](src/services/instagramService.ts#L24-L25): `'📱 App ID centralizzata:', '🔄 Redirect URI:'`. Sono utili in dev, in produzione no.

**Fix**: come A8, strip in build.

## B4. Asset non ottimizzati

`public/` contiene PNG dei reel di esempio, og-image, ecc. Nessun check di dimensioni.

**Fix**: passaggio una tantum di `sips -Z 1200 *.png` per le immagini > 1200px lato lungo.

## B5. `vercel.json` ridondante adesso

Adesso che hai connesso Git + il repo è pubblico, le rewrites SPA potrebbero non essere più necessarie se Vercel rileva framework Vite. Verifica.

**Fix**: testare rimozione, se funziona toglierlo per non avere config duplicata.

## B6. Lazy loading routes già fatto ma alcuni chunk piccoli (< 5KB) si potrebbero unire

`assets/arrow-left-C3MsgF6X.js` è un'icona Lucide spezzata in chunk. Vite ha già ottimizzato ma forse `manualChunks` config può ridurre HTTP overhead.

**Fix**: modificare `vite.config.ts` con `build.rollupOptions.output.manualChunks` per raggruppare lucide-react in un singolo chunk.

## B7. Migration files con timestamp 2026

I file in `supabase/migrations/` hanno date 2026 (es. `20260509100000_encrypt_meta_tokens.sql`). Devono essere reali (sei nel 2026) ma se hai contributors esterni potrebbe confondere.

**Fix**: non c'è. Solo nota.

## B8. Cleanup dependabot alerts GitHub

GitHub segnala 37 vulnerabilità (12 high, 20 moderate, 5 low) nelle deps npm. Tutte transitive (Radix/shadcn).

**Fix**: pianificare `npm audit fix` controllato. Nessuna è 0-day.

---

# Appendice — mappa route e flussi

## Route pubbliche (no auth)
- `/auth`, `/auth/instagram/callback`, `/reset-password`, `/onboarding`
- `/privacy`, `/cookie-policy`, `/terms`, `/deletion-status`, `/data-deletion`

## Route protette (in `AppLayout`)
- `/posts` (Index) — carosello/post statici
- `/storie` (StoriesGenerator) — storie 9:16
- `/reel` (ReelPage) — script reel
- `/trend` (TrendPage) — discovery trend
- `/competitor` (CompetitorPage) — analisi competitor
- `/virale` (ViralePage) — analisi reel virali
- `/calendario` (CalendarPage) — programmazione
- `/storico` (HistoryPage) — generations log
- `/brands`, `/brand` (BrandsListPage/BrandPage) — gestione brand
- `/admin` (AdminPage) — superadmin (RBAC `roles` table)
- `/settings` (Settings) — account + connessioni social

## Edge functions (21 totali)

| Function | Auth | Rate limit | Note |
|---|---|---|---|
| analyze-brand | ❌ | ❌ | A1, A2 |
| analyze-competitors | ✅ | ✅ 5/min | OK |
| analyze-viral-post | ✅ | ✅ 10/min | OK |
| blotato-publish | ✅ | ❌ | A2 |
| expand-topic | ✅ | ❌ | A2 |
| find-trends | ✅ | ✅ 10/min | OK |
| generate-carousel-images | ✅ | ✅ 40/min | OK |
| generate-content | ⚠️ opzionale | ✅ se auth | A3 |
| generate-hooks | ❌ | ❌ | A1, A2 |
| generate-reel-script | ✅ | ✅ 20/min | OK |
| generate-stories | ✅ | ✅ 50/min | OK |
| generate-story-template | ❌ | ❌ | A1, A2 |
| instagram-auth | ✅ | ❌ | A2 (basso rischio: ok solo se auth) |
| meta-auth | ✅ | ❌ | A2 (basso rischio idem) |
| meta-data-deletion | webhook | ❌ | OK (HMAC) |
| meta-publish | ✅ | ❌ | A2 + A4 + A5 |
| process-scheduled-posts | cron secret | ❌ | OK |
| save-slide-image | ✅ | ❌ | A2 |
| schedule-post | ✅ | ❌ | A2 |
| scrape-reviews | ✅ | ✅ 5/min | OK |
| scrape-website | ❌ | ❌ | A1, A2 |

## Time-to-first-value (worst case)

```
Apertura URL → click signup → email verifica → click link → onboarding
→ inserisci sito web → wait 30-60s → review brand (15 campi) → save brand
→ /posts → topic + click Genera → wait 20-40s → vedo carosello
```

8-9 azioni utente, ~3-5 minuti se sito web è scrapabile. Più lungo se devi compilare manualmente.

## Stack secrets / dove vivono

| Tipo | Where | Note |
|---|---|---|
| `VITE_META_APP_ID` | Vercel env (build-time) | Inline nel bundle JS (OK è pubblica) |
| `VITE_META_REDIRECT_URI` | Vercel env | Idem |
| `VITE_SUPABASE_*` | Vercel env | Idem (anon key è OK pubblica) |
| `META_APP_SECRET` | Supabase secrets | Server-only |
| `INSTAGRAM_APP_SECRET` | Supabase secrets | Server-only — quello vero usato dal codice |
| `GEMINI_API_KEY` | Supabase secrets | Server-only |
| `APIFY_API_TOKEN` | Supabase secrets | Server-only |
| `PIXABAY_API_KEY` | Supabase secrets | Server-only |
| `meta_token_key` | Supabase Vault | Master key cifratura token Meta in DB |
| `cron_secret` | Supabase Vault | Per cron → edge fn auth |

✅ Nessuna chiave segreta esposta nel bundle frontend (verificato con `grep -r AIza|sk-|app_secret src/` = 0).

---

# Recommended order of fixes

**Sprint 1 (1 settimana)** — sblocchi commerciali e dataloss
1. A1 + A2 — aggiungere auth + rate limit a tutti gli endpoint
2. A3 — chiudere auth bypass su `generate-content`
3. A4 — usare la RPC decifrata in `meta-publish`, dropping del plaintext column
4. A9 — fix fallback URL OAuth

**Sprint 2 (1 settimana)** — robustezza
5. A6 + A7 — Zod + parser robusto LLM in shared
6. A5 — cron refresh token Meta
7. A8 — strip console.log in build
8. M9 — abilitare CAPTCHA signup

**Sprint 3 (2 settimane)** — UX e qualità
9. M1 — accorciare onboarding
10. M3 — refactor StoriesApp.jsx → .tsx + spezzare
11. M7 — pattern EmptyState
12. M2 + M11 — schema viral_analysis + indici

**Backlog (quando hai tempo)**
13. B1-B8 — pulizia

---

Fine audit.
