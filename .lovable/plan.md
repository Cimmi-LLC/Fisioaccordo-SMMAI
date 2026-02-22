

# Analisi Completa e Piano di Modernizzazione

## Problemi Critici Trovati

### 1. SICUREZZA - API Keys Esposte nel Codice (URGENTE)
- **OpenAI API key** hardcoded in `src/services/openaiService.ts` (linea 259): `sk-proj-VKMDYp...`
- **Runware API key** hardcoded in `src/services/runwareService.ts` (linea 7): `IldlzHOy...`
- Chiunque apra il browser DevTools puo' rubare queste chiavi e usarle a tue spese

**Fix**: Spostare TUTTA la logica AI in Supabase Edge Functions che usano `Deno.env.get()` per le chiavi, come gia' fatto per `generate-hooks`. Il frontend non deve MAI contenere API keys.

---

### 2. IMMAGINI - Perche' Fanno Schifo

**Problema attuale**: Le immagini del carousel sono foto stock generiche da Unsplash hardcoded in `useCarouselSlides.ts` (linee 163-191). Stesse 5 foto riciclate per ogni topic. Nessuna generazione AI delle immagini.

**Il servizio Runware** (generazione AI) esiste ma NON viene mai usato per i carousel. Usa un modello vecchio (`civitai:618692@691639`) e connessione WebSocket complessa.

**Fix**:
- Creare una edge function `generate-carousel-images` che usa il Lovable AI Gateway (`google/gemini-2.5-flash-image`) per generare immagini personalizzate per ogni slide
- Eliminare le URL Unsplash hardcoded
- Generare immagini basate sul contenuto effettivo di ogni slide (titolo, body, tema)
- Eliminare `runwareService.ts` (obsoleto) e la chiamata diretta OpenAI per immagini

---

### 3. COPY - Perche' Fa Schifo

**Problema attuale**: Il sistema di copy ha 3 strati sovrapposti e confusi:

1. **`generator.ts`** (linee 64-98): Genera copy con template HARDCODED identici per ogni topic. Stesse frasi fisse: "Ogni giorno vedo persone che lottano...", "Solo 5 posti disponibili questa settimana!"
2. **`fallbackGenerator.ts`**: Altro template hardcoded quasi identico
3. **`intelligentCopyService.ts`**: Chiama OpenAI direttamente dal browser (con API key esposta!) per generare copy

Il risultato e' che il copy e' sempre uguale, generico, pieno di emoji casuali e frasi fatte tipo "87% delle persone commette questo errore".

**Fix**:
- Creare una edge function `generate-content` che usa il Lovable AI Gateway per generare copy veramente personalizzato
- Eliminare tutti i template hardcoded (generator.ts, fallbackGenerator.ts)
- Un unico prompt AI ben costruito che riceve topic, audience, tone, platform e genera copy unico ogni volta
- Eliminare `openaiService.ts` (chiamate dirette dal browser)

---

### 4. ARCHITETTURA - Cosa E' Vecchio

| Problema | Dove | Fix |
|----------|------|-----|
| Chiamate API dal browser con chiavi esposte | `openaiService.ts`, `runwareService.ts` | Tutto via Edge Functions |
| Copy generation locale con template fissi | `src/services/copy/*` (8+ file) | Una edge function AI |
| `useCarouselSlides` con content database hardcoded | 153 righe di testo statico | Generazione AI dinamica |
| `contentDatabase` con solo 5 topic fissi | `useCarouselSlides.ts` | Qualsiasi topic via AI |
| WebSocket Runware complesso e inutilizzato | `runwareService.ts` | Sostituire con Lovable AI Gateway |
| Nessuna validazione input lato server | Ovunque | Edge functions con validazione |

---

## Piano di Implementazione (5 Fasi)

### Fase 1: Sicurezza - Rimuovere API Keys
- Eliminare `defaultOpenAIService` con API key hardcoded
- Eliminare `defaultRunwareService` con API key hardcoded
- Salvare le chiavi come Secrets nel progetto (se servono ancora)

### Fase 2: Edge Function `generate-content`
- Nuova edge function che usa `ai.gateway.lovable.dev` per generare copy personalizzato
- Prompt professionale con topic, audience, platform, tone
- Sostituisce: `openaiService.ts`, `intelligentCopyService.ts`, `generator.ts`, `fallbackGenerator.ts`, `copyBuilder.ts`

### Fase 3: Edge Function `generate-carousel-images`
- Genera immagini AI per ogni slide del carousel usando `google/gemini-2.5-flash-image`
- Input: tema slide, testo, stile visuale
- Output: immagini base64 salvate o URL
- Sostituisce: `runwareService.ts`, immagini Unsplash hardcoded

### Fase 4: Refactor `useCarouselSlides`
- Eliminare `contentDatabase` hardcoded (153 righe di testo statico)
- Generare contenuto slide dinamicamente dall'AI (usando la edge function di Fase 2)
- Supportare QUALSIASI topic, non solo i 5 hardcoded

### Fase 5: Pulizia Architettura
- Eliminare file obsoleti: `openaiService.ts`, `runwareService.ts`, `fallbackGenerator.ts`
- Semplificare `src/services/copy/` (da 8+ file a 2-3)
- Aggiornare `useContentGeneration.ts` per usare le nuove edge functions

---

## Dettagli Tecnici

### Edge Function `generate-content` (Fase 2)
```text
Endpoint: POST /generate-content
Input: { topic, audience, platform, tone, postType, numSlides }
Output: { content: string, slides: Array<{title, subtitle, body, cta}> }
Usa: ai.gateway.lovable.dev con LOVABLE_API_KEY
Modello: google/gemini-2.5-flash
```

### Edge Function `generate-carousel-images` (Fase 3)
```text
Endpoint: POST /generate-carousel-images
Input: { slides: Array<{title, body, theme}>, style: string }
Output: { images: Array<{url: string}> }
Usa: ai.gateway.lovable.dev con google/gemini-2.5-flash-image
Le immagini base64 vengono salvate in Supabase Storage
```

### File da Eliminare
- `src/services/openaiService.ts`
- `src/services/runwareService.ts`
- `src/services/copy/fallbackGenerator.ts`
- `src/services/copy/copyBuilder.ts`
- `src/services/copy/variableExtraction.ts`
- `src/services/copy/templateSelection.ts`
- `src/services/copy/audienceAnalysis.ts`

### File da Semplificare
- `src/services/intelligentCopyService.ts` - diventa un wrapper per la edge function
- `src/hooks/useCarouselSlides.ts` - elimina contentDatabase, usa AI
- `src/hooks/useContentGeneration.ts` - chiama edge function invece di servizio locale

