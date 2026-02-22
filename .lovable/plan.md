

# Piano di Modernizzazione Completo

Questo piano trasforma l'app in un sistema intelligente che impara da ogni utente, usa le loro foto, analizza i trend virali e migliora continuamente.

---

## Cosa Viene Costruito

1. **Libreria foto personale** - Ogni utente carica le sue foto e l'AI le usa nei post
2. **Memoria AI per utente** - Il sistema ricorda correzioni, preferenze, stile, brand e migliora ogni volta
3. **Analisi post virali** - Analizza reel, caroselli, video virali e trova i pattern comuni
4. **Trend del momento** - Cerca e consiglia i trend attuali per il settore dell'utente

---

## Fase 1: Database - Nuove Tabelle

### Tabella `user_photos`
Foto caricate dall'utente, organizzate per categoria, riutilizzabili nei post.

```text
user_photos
- id (uuid, PK)
- user_id (uuid, NOT NULL)
- storage_path (text) -- percorso nel bucket Supabase Storage
- public_url (text) -- URL pubblico dell'immagine
- filename (text)
- category (text) -- es: "logo", "team", "clinica", "trattamento", "prodotto"
- tags (text[]) -- tag liberi per ricerca
- created_at (timestamptz)

RLS: user_id = auth.uid()
```

### Tabella `user_ai_memory`
Memoria persistente dell'AI per ogni utente: correzioni, preferenze, stile.

```text
user_ai_memory
- id (uuid, PK)
- user_id (uuid, NOT NULL)
- memory_type (text) -- "correction", "preference", "style", "brand_voice", "feedback"
- content (text) -- descrizione della memoria
- context (text) -- in che contesto e' stata acquisita
- importance (int, default 5) -- 1-10, priorita' nel prompt
- created_at (timestamptz)
- updated_at (timestamptz)

RLS: user_id = auth.uid()
```

### Tabella `viral_analysis`
Pattern trovati dall'analisi di post virali.

```text
viral_analysis
- id (uuid, PK)
- user_id (uuid, NOT NULL)
- post_url (text) -- URL del post analizzato
- platform (text) -- instagram, tiktok, linkedin, ecc
- post_type (text) -- reel, carosello, foto, video
- patterns (jsonb) -- pattern trovati (hook, struttura, CTA, ecc)
- engagement_data (jsonb) -- like, commenti, condivisioni
- analysis_text (text) -- analisi AI completa
- created_at (timestamptz)

RLS: user_id = auth.uid()
```

### Tabella `trending_topics`
Trend del momento trovati dall'AI.

```text
trending_topics
- id (uuid, PK)
- user_id (uuid, NOT NULL)
- topic (text)
- category (text) -- settore/nicchia
- trend_score (int) -- 1-100
- source (text) -- dove e' stato trovato
- suggested_content (text) -- idea di contenuto suggerita
- expires_at (timestamptz) -- i trend scadono
- created_at (timestamptz)

RLS: user_id = auth.uid()
```

### Storage Bucket
Creare bucket `user-photos` (pubblico) per le foto degli utenti.

---

## Fase 2: Storage - Upload Foto Utente

### Bucket `user-photos`
- Bucket pubblico per le foto caricate dagli utenti
- RLS: ogni utente puo' solo caricare/eliminare nella sua cartella (`user_id/`)
- Supporto formati: JPG, PNG, WebP
- Limite: 10MB per file

### Componente `PhotoLibrary`
- Griglia di foto caricate dall'utente
- Upload drag & drop
- Categorizzazione (logo, team, clinica, trattamento)
- Tag liberi per ricerca
- Selezione foto per inserirle nei post
- Anteprima e eliminazione

---

## Fase 3: Edge Function `analyze-viral-post`

Nuova edge function che analizza un post virale dato il suo URL o testo.

```text
POST /analyze-viral-post
Input: { url?: string, text?: string, platform: string, postType: string }
Output: {
  patterns: {
    hook_type: string,
    structure: string[],
    cta_style: string,
    emotional_triggers: string[],
    formatting: string[],
    hashtag_strategy: string
  },
  analysis: string,
  score: number,
  takeaways: string[]
}
```

Usa il Lovable AI Gateway per analizzare il contenuto e trovare:
- Tipo di hook (domanda, statistica, provocazione, storia)
- Struttura narrativa (problema-soluzione, lista, storia, tutorial)
- Trigger emotivi usati
- Stile CTA
- Pattern di formattazione (emoji, spazi, lunghezza frasi)

---

## Fase 4: Edge Function `find-trends`

Nuova edge function che trova i trend del momento per il settore dell'utente.

```text
POST /find-trends
Input: { niche: string, platform: string }
Output: {
  trends: [{
    topic: string,
    trend_score: number,
    why_trending: string,
    content_idea: string,
    suggested_format: string
  }]
}
```

L'AI genera trend basandosi su:
- La nicchia dell'utente (fisioterapia, benessere, ecc)
- La piattaforma target
- Stagionalita' e eventi attuali
- Pattern virali recenti

---

## Fase 5: Memoria AI - Sistema di Apprendimento

### Come Funziona

1. **Dopo ogni generazione**: l'utente puo' dare feedback (thumbs up/down + commento)
2. **Correzioni manuali**: quando l'utente modifica il copy, il sistema salva la differenza come "correzione"
3. **Preferenze esplicite**: l'utente puo' impostare regole (es: "non usare mai emoji cuore", "firma sempre con il nome della clinica")
4. **Brand voice**: l'utente descrive il suo tono, valori, parole chiave del brand

### Come Viene Usato

Prima di ogni generazione, la edge function `generate-content` viene aggiornata per:
1. Caricare le ultime 20 memorie dell'utente (ordinate per importanza)
2. Includerle nel system prompt come contesto
3. L'AI genera contenuto che rispetta tutte le correzioni e preferenze passate

```text
Esempio di prompt arricchito:

"L'utente ha le seguenti preferenze memorizzate:
- [CORREZIONE] Non usare la parola 'semplicemente', preferisce 'concretamente'
- [STILE] Tono autorevole ma amichevole, mai troppo formale
- [BRAND] Studio FisioLife, specializzato in riabilitazione sportiva
- [FEEDBACK] L'utente ha preferito hook con domande dirette rispetto a statistiche
..."
```

### Componente `AIMemoryPanel`
- Sezione nelle impostazioni dove l'utente vede cosa l'AI ha memorizzato
- Puo' aggiungere/modificare/eliminare memorie
- Puo' impostare brand voice e preferenze
- Mostra statistiche: quante correzioni, quanti feedback

---

## Fase 6: Aggiornamento `generate-content`

La edge function viene aggiornata per:
1. Ricevere `user_id` e caricare le memorie dal database
2. Ricevere `user_photos` (URL delle foto selezionate dall'utente)
3. Includere le memorie nel prompt AI
4. Restituire anche suggerimenti su quali foto usare per ogni slide

---

## Fase 7: UI - Nuove Sezioni

### Tab "Le Mie Foto"
- Griglia foto con upload
- Filtri per categoria
- Selezione multipla per i post

### Tab "Analisi Virali"
- Campo per incollare URL/testo di un post virale
- Risultato analisi con pattern trovati
- Storico delle analisi fatte
- Pattern piu' comuni tra tutti i post analizzati

### Tab "Trend"
- Lista trend del momento per la nicchia dell'utente
- Score di viralita' per ogni trend
- Pulsante "Genera post su questo trend" (pre-compila il form)

### Pannello "Memoria AI"
- Mostra cosa l'AI ricorda dell'utente
- Aggiungi preferenze e regole
- Imposta brand voice
- Feedback post-generazione (pollice su/giu + nota)

---

## Ordine di Implementazione

1. Migration database (4 tabelle + bucket storage)
2. Componente `PhotoLibrary` + upload su Supabase Storage
3. Sistema memoria AI (tabella + componente `AIMemoryPanel`)
4. Aggiornamento edge function `generate-content` con memorie + foto utente
5. Edge function `analyze-viral-post` + UI analisi
6. Edge function `find-trends` + UI trend
7. Feedback post-generazione (salva correzioni automatiche)
8. Test end-to-end completo

---

## Dettagli Tecnici

### File Nuovi
- `src/components/PhotoLibrary.tsx` - Gestione foto utente
- `src/components/AIMemoryPanel.tsx` - Gestione memoria AI
- `src/components/ViralAnalyzer.tsx` - Analisi post virali
- `src/components/TrendExplorer.tsx` - Esplorazione trend
- `src/components/FeedbackWidget.tsx` - Feedback post-generazione
- `src/hooks/useUserPhotos.ts` - Hook per foto utente
- `src/hooks/useAIMemory.ts` - Hook per memoria AI
- `src/hooks/useViralAnalysis.ts` - Hook per analisi virali
- `src/hooks/useTrends.ts` - Hook per trend
- `supabase/functions/analyze-viral-post/index.ts` - Edge function analisi
- `supabase/functions/find-trends/index.ts` - Edge function trend

### File Modificati
- `supabase/functions/generate-content/index.ts` - Aggiunta memorie + foto
- `src/components/MainContent.tsx` - Nuove tab/sezioni
- `src/pages/Index.tsx` - Navigazione aggiornata
- `supabase/config.toml` - Nuove edge functions

