# Professioni: post per nutrizionisti, personal trainer e altre figure sanitarie

Il generatore non è più cablato sulla fisioterapia. Ogni brand ha una
**professione**, scelta dall'utente oppure rilevata dal codice, e tutta la
pipeline (copy, idee, reel, storie, immagini AI, stock Pixabay, Template
Genesis, analisi competitor) usa il lessico di quel mestiere.

## Come funziona

- **Registro**: `src/lib/brand/profession.ts`, specchiato byte per byte in
  `supabase/functions/_shared/brand/profession.ts` (il test `mirrorSync` lo
  pretende). Per ogni professione: etichetta, settore, kicker di copertina,
  come chiama le persone che segue (paziente / cliente / donna), parole
  chiave per il riconoscimento, categorie del brand kit, idee rapide,
  istruzioni per il copywriter AI (lessico e limiti deontologici), scena e
  soggetto per le foto AI, tag Pixabay da ammettere, query di ripiego, copy
  segnaposto del template.
- **Rilevamento** (`detectProfession`): punteggio per parole chiave sui campi
  del brand (nome e categorie pesano di più, poi sito, servizi, descrizione,
  target, temi). Due professioni alla pari = nessuna decisione. Il solo topic
  di un post conta solo quando il brand non dice nulla e l'indizio è netto.
- **Risoluzione** (`resolveProfession`): scelta esplicita (`brands.professione`)
  → professione trovata dall'analisi del sito (`raw_analysis.professione`) →
  rilevamento sui campi del brand → topic → default `fisioterapista`
  (i brand esistenti non cambiano comportamento).
- **"Altro"**: `brands.professione = 'altro'` + `professione_custom` con
  l'etichetta scritta dall'utente, che diventa anche il kicker del template.

## Dove si sceglie

- Onboarding, dopo il nome: selettore con «Automatica · rilevata: X» e la lista.
  L'analisi del sito (`analyze-brand`) ora restituisce `professione` e
  `professione_label`.
- Brand kit (`/brand`, scheda Brand Kit, sotto il nome). Le categorie proposte
  seguono la professione.

## Database

Migration `20261009100000_brand_professione.sql`: colonne `professione` e
`professione_custom` su `public.brands`. Nessun CHECK: gli slug vivono nel
codice, valori sconosciuti vengono ignorati.

## Ordine di rilascio

1. Applicare la migration (`supabase db push` o SQL editor). Senza la colonna
   il salvataggio del brand kit dal frontend fallisce (PGRST204).
2. Pubblicare le edge function toccate: `analyze-brand`, `expand-topic`,
   `generate-content`, `generate-reel-script`, `analyze-competitors`,
   `generate-carousel-images`, `generate-carousel-slides`, `generate-template`
   (tutte importano `_shared/brand/profession.ts`).
3. Pubblicare il frontend.

I template già approvati restano validi: il nuovo skeleton di copertina ha
`{{kicker}}`, i vecchi no (la sostituzione è un no-op). Per cambiare il kicker
di un brand che cambia professione va rifatto il Template Genesis.

## Aggiungere una professione

Aggiungere una voce a `PROFESSIONS` in `src/lib/brand/profession.ts`, copiare il
file in `supabase/functions/_shared/brand/profession.ts`, aggiornare il tipo
`ProfessionId`, far girare `npm test`. Nessuna migration.
