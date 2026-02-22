

## Rimuovere "Pubblica su X Piattaforma" + Feedback su Copy e Immagini

### Cosa cambia

1. **Rimuovere il tasto "Pubblica su X Piattaforma"** dal form di generazione (il tasto duplicato in basso a sinistra). I tasti di pubblicazione nella sezione Anteprima a destra restano.

2. **Aggiungere feedback sul copy generato** nella sezione Anteprima: widget thumbs up/down + commento sotto il testo generato, usando il `FeedbackWidget` gia' esistente.

3. **Aggiungere feedback sulle immagini generate**: nuovo widget simile sotto le slide/immagini, con un tipo di memoria dedicato `image_feedback` che viene salvato e usato dall'AI per migliorare le immagini future.

4. **Usare i feedback immagini nella generazione**: la edge function `generate-carousel-images` carichera' i feedback immagini dell'utente e li includera' nel prompt, cosi' le immagini miglioreranno di volta in volta.

### Dettagli tecnici

**File: `src/components/ContentForm.tsx`**
- Rimuovere il blocco "Publish Button" (righe 277-286) che mostra "Pubblica su X Piattaforma"

**File: `src/components/PreviewSection.tsx`**
- Importare e aggiungere `FeedbackWidget` sotto il testo generato (dopo il blocco `<pre>`)
- Creare un nuovo componente `ImageFeedbackWidget` inline o separato, sotto le immagini generate, con thumbs up/down + commento
- Il feedback immagini salva con tipo `image_feedback` nella memoria AI

**File: `src/hooks/useAIMemory.ts`**
- Aggiungere funzione `addImageFeedback(isPositive, comment, imageContext)` che salva con `memory_type: 'image_feedback'`

**File: `src/components/ImageFeedbackWidget.tsx`** (nuovo)
- Widget simile a `FeedbackWidget` ma per immagini
- Domanda: "Come ti sembrano le immagini?"
- Placeholder commento: "Es: troppo scure, preferisco colori caldi, piu' minimaliste..."
- Usa `addImageFeedback` da `useAIMemory`

**File: `supabase/functions/generate-carousel-images/index.ts`**
- Accettare un parametro opzionale `imagePreferences` (stringa) dal client
- Includere le preferenze immagini nel prompt di generazione

**File: `src/hooks/useCarouselSlides.ts`**
- Caricare le memorie `image_feedback` dell'utente prima di chiamare `generate-carousel-images`
- Passarle come parametro `imagePreferences` alla funzione

### Flusso feedback

```text
Utente genera contenuto
    |
    v
Vede copy + immagini nella Preview
    |
    +-- Feedback copy: thumbs + commento --> salva come "feedback" in user_ai_memory
    |       --> la prossima generazione copy legge queste memorie e si adatta
    |
    +-- Feedback immagini: thumbs + commento --> salva come "image_feedback" in user_ai_memory
            --> la prossima generazione immagini legge queste preferenze nel prompt
```

### Risultato
- Niente piu' tasto "Pubblica" duplicato nel form
- L'utente puo' dare feedback sia sul copy che sulle immagini
- L'AI ricorda e migliora di volta in volta per ogni utente
- Le preferenze immagini vengono incluse direttamente nel prompt di generazione

