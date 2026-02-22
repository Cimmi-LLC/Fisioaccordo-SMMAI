

# Integrazione Template Canva + Connessione Canva Utenti

## Il Problema Attuale

I template attuali (FisioaccordoTemplate, BusinessTemplate, ecc.) sono componenti React con CSS basico -- colori piatti, niente texture, niente design professionale. Le immagini generate dall'AI con Gemini sono inconsistenti e spesso brutte.

## La Soluzione

### Parte 1: I Tuoi Template Pre-caricati (per tutti gli utenti)

**Come funziona:**
1. Tu esporti da Canva i tuoi template come PNG vuoti a 1080x1080 (solo sfondo, layout grafico, decorazioni -- SENZA testo)
2. Li carichi qui in chat
3. Li salvo nel bucket Supabase `user-photos` (pubblico)
4. L'app li usa come sfondo e ci sovrappone il testo generato dall'AI con posizionamento professionale

**Database -- nuova tabella `canva_templates`:**
- `id` (uuid)
- `name` (text) -- es. "Fisioaccordo Rosa", "Business Blu"
- `description` (text)
- `category` (text) -- es. "healthcare", "business", "minimal"
- `background_url` (text) -- URL dell'immagine PNG nel bucket
- `text_zones` (jsonb) -- zone dove posizionare il testo (top, center, bottom, etc.)
- `text_color` (text) -- colore testo consigliato (bianco, nero, etc.)
- `is_default` (boolean) -- template pre-caricati dal proprietario
- `user_id` (uuid, nullable) -- null = template globale, uuid = template utente
- `created_at` (timestamptz)

**Nuovo componente `CanvaTemplateSelector.tsx`:**
- Griglia visuale con miniature dei template (non piu un dropdown triste)
- Ogni template mostra l'anteprima reale dello sfondo
- Click per selezionare, bordo evidenziato sul selezionato
- Sezione "I miei template" se l'utente ha Canva collegato

**Modifica al rendering delle slide:**
- Invece di usare i componenti React (FisioaccordoTemplate, etc.), le slide usano l'immagine PNG come sfondo
- Il testo viene posizionato sopra con CSS absolute positioning
- Le `text_zones` definiscono dove va il titolo, il body, il CTA, il footer
- Risultato: slide con aspetto professionale identico a Canva

### Parte 2: Connessione Canva per gli Utenti (opzionale)

**Canva Connect API** permette agli utenti di:
- Fare login con il proprio account Canva
- Importare i propri template come immagini di sfondo
- I template importati vengono salvati nella stessa tabella `canva_templates` con il loro `user_id`

**Prerequisiti per Canva API:**
- Creare una Canva App su [canva.com/developers](https://www.canva.com/developers)
- Ottenere Client ID e Client Secret
- Configurare il redirect URI

**Edge function `canva-auth`:**
- Scambia il codice OAuth per access token
- Recupera i design dell'utente via Canva API
- Salva la connessione

**Edge function `canva-import`:**
- Riceve l'ID di un design Canva
- Lo esporta come PNG via Canva Export API
- Lo salva nel bucket Supabase
- Crea record in `canva_templates`

**Componente `CanvaConnection.tsx`:**
- Pulsante "Collega Canva" per gli utenti
- Lista dei design importabili
- Pulsante "Importa come template" per ogni design

---

## Dettagli Tecnici

### File da creare:
- `src/components/CanvaTemplateSelector.tsx` -- griglia visuale template
- `src/components/CanvaConnection.tsx` -- collegamento account Canva utente
- `src/services/canvaService.ts` -- servizio frontend Canva API
- `supabase/functions/canva-auth/index.ts` -- OAuth Canva
- `supabase/functions/canva-import/index.ts` -- importa design come PNG

### File da modificare:
- `src/components/ContentForm.tsx` -- sostituire `VisualTemplateSelector` con `CanvaTemplateSelector`
- `src/components/PreviewSection.tsx` -- rendering slide con sfondo PNG invece di componenti React
- `src/components/template/TemplateLayoutEngine.tsx` -- supporto template basati su immagine
- `supabase/config.toml` -- registrare nuove edge functions

### Migrazione database:
- Creare tabella `canva_templates` con RLS
- Creare bucket storage dedicato (o usare `user-photos` esistente)

---

## Prossimo Step Immediato

Per iniziare, ho bisogno che tu:
1. **Esporti da Canva 3-5 template vuoti** (solo sfondo/layout, senza testo) a 1080x1080 PNG
2. **Li carichi qui in chat**

Una volta che li ho, creo tutto il sistema e le slide avranno un aspetto professionale da subito.

Per la parte Canva API degli utenti, serviranno le credenziali della Canva App (Client ID e Secret) -- ma questo lo facciamo in un secondo momento.
