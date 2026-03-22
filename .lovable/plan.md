
## Layout Semplificazione — Piano di Implementazione

### Obiettivo
Ridurre il cognitive load della pagina principale organizzando il form in 3 step chiari, spostando elementi secondari e compattando l'interfaccia. Zero modifiche alla logica.

### Struttura finale

```text
┌─ Hero (1 riga, 32px) ─────────────────────────────────────┐
│  "Crea contenuti virali in secondi"                       │
└───────────────────────────────────────────────────────────┘
┌─ Tabs (Genera / Foto / AI Memory / Virale / Trend) ───────┐
└───────────────────────────────────────────────────────────┘
┌─ Colonna sx: ContentForm 3 Step ─┐ ┌─ Colonna dx: Preview ─┐
│ [Step 1] [Step 2] [Step 3]       │ │  Skeleton animato     │
│ ─────── progress bar ─────────  │ │  quando vuoto         │
│                                  │ │                       │
│ Step 1: textarea + pubblico      │ │  Contenuto generato   │
│ Step 2: formato (6 select)       │ └───────────────────────┘
│ Step 3: template chip + foto +   │
│         piattaforme (4+altro) +  │
│         data + [Genera] button   │
│                                  │
│ Link discreto "Hook AI" sopra    │
│ il bottone Genera (solo step 3)  │
└──────────────────────────────────┘
Footer social settings: spostato in modale da AppHeader
```

### Cambiamenti per file

**1. `src/components/ContentForm.tsx`** — riscrittura principale
- Aggiungere stato locale `currentStep: 1|2|3`
- Progress bar orizzontale in cima alla card (3 segmenti colorati con label)
- Mostrare solo i campi del step corrente
- Step 1: textarea descrizione + input pubblico
- Step 2: grid 2-col con Lunghezza, Tono, Piattaforma, Tipo post, N. Slide, N. Immagini
- Step 3: CanvaTemplateSelector (compattato come chip radio), PhotoUpload, chip piattaforme (4 visibili + "altro" collassabile), datetime, bottone Genera
- Bottoni Avanti/Indietro tra step; Genera solo al step 3
- Chip template: sostituire `CanvaTemplateSelector` grandi card con radio chip testuali inline (Default | nome template | + Aggiungi) — nessuna emoji, nessun bordo card
- Chip piattaforme: prime 4 (Instagram, Facebook, LinkedIn, TikTok), poi link "+ 5 altri" che espande Pinterest, Threads, Bluesky, X, YouTube
- Aggiungere prop `onShowHookGenerator` e renderizzare link "Genera Hook AI" discreto sopra il bottone Genera (solo step 3)

**2. `src/components/MainContent.tsx`**
- Hero: ridurre a `text-[32px]`, rimuovere `<p>` sottotitolo
- `IdeaGenerator`: spostare da posizione visibile a collassabile. Aggiungere un link/bottone "Ispirazione rapida" cliccabile che apre/chiude la sezione IdeaGenerator. Default collapsed.
- `MetaConnection`: spostare fuori dal flusso principale. Renderizzare dentro un `<Dialog>` modale attivato da un bottone "Connessioni Social" nell'`AppHeader` o in un link nel footer della pagina (non nel body principale).
- `HookGenerator`: rimuovere come sezione separata — la sua visibilità è già controllata da `showHookGenerator`. Passare `onShowHookGenerator={() => setShowHookGenerator(!showHookGenerator)}` al `ContentForm`.
- Il `showViralGenerator`/`ViralFormatGenerator` rimane invariato
- Footer copyright (`Index.tsx`): rimuovere il paragrafo `© ...` dalla pagina principale

**3. `src/components/PreviewSection.tsx`** — empty state
- Sostituire il `py-16` statico con uno skeleton loader animato (3 rettangoli shimmer + barre di testo) quando `!generatedContent`
- Ridurre padding dell'empty state da `py-16` a `py-8`

**4. `src/components/AppHeader.tsx`**
- Aggiungere bottone "Social" o icona `Link` che apre un `<Dialog>` contenente `<MetaConnection />`

**5. `src/pages/Index.tsx`**
- Rimuovere il blocco footer con `© FisioAccordo`

### Dettagli tecnici step form

```text
Progress bar:
┌──[1 Contenuto]──[2 Formato]──[3 Pubblica]──┐
Segmenti: width 33% ciascuno
Attivo: bg --rosa  |  Futuro: bg --line
Label sotto: testo 9px --ink3, attivo --ink
```

Step 3 template chip (sostituisce CanvaTemplateSelector visualmente):
```text
Template: [Default] [FisioAccordo] [+ Aggiungi]
Chip radio style: border var(--line), selezionato border --rosa bg --rosa-dim
```

Chip piattaforme collassabili:
```text
[Instagram] [Facebook] [LinkedIn] [TikTok]  + altri 5...
            ↓ expanded:
[Pinterest] [Threads] [Bluesky] [X] [YouTube]
```

HookGenerator trigger (solo step 3, sopra bottone Genera):
```text
link: "Genera Hook AI per questo contenuto →"
font: 11px --viola, cursor pointer, onclick toggle HookGenerator
```

### File modificati
- `src/components/ContentForm.tsx` — step form, chip template, chip piattaforme, hook link
- `src/components/MainContent.tsx` — hero compatto, IdeaGenerator collassabile, MetaConnection in Dialog, HookGenerator collegato al form
- `src/components/PreviewSection.tsx` — skeleton animato empty state
- `src/components/AppHeader.tsx` — bottone Social per aprire Dialog MetaConnection
- `src/pages/Index.tsx` — rimozione footer copyright
