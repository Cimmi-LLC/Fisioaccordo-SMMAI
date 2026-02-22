

## Fix: Generazione immagini sempre attiva + Indicatore di caricamento

### Problema 1: Le immagini non vengono generate
Nel file `useCarouselSlides.ts`, la funzione `generateImagesForSlides` viene chiamata **solo** quando ci sono slide da carosello (riga 91). Ma per i post singoli (riga 50-69) e per i fallback (riga 44, 94), la generazione immagini **non viene mai chiamata**. Ecco perche' non vedi piu' immagini.

### Problema 2: Nessun indicatore di caricamento
La variabile `isGeneratingImages` esiste nel hook ma non viene mai passata alla `PreviewSection`, quindi l'utente non sa che le immagini si stanno generando.

### Soluzione

**File: `src/hooks/useCarouselSlides.ts`**
- Chiamare `generateImagesForSlides` anche dopo aver creato le slide per post singoli (dopo riga 68)
- Chiamare `generateImagesForSlides` anche dopo aver creato le fallback slides (righe 44-45 e 94-95)
- Assicurarsi che almeno 1 immagine venga sempre generata

**File: `src/components/MainContent.tsx`**
- Passare `isGeneratingImages` come prop a `PreviewSection`

**File: `src/components/PreviewSection.tsx`**
- Aggiungere la prop `isGeneratingImages` all'interfaccia
- Mostrare un indicatore di caricamento sopra le slide quando `isGeneratingImages` e' true: un banner con icona spinner e testo "Creazione immagini in corso..." che scompare quando le immagini sono pronte

### Risultato
- Ogni volta che generi contenuto, almeno 1 immagine viene sempre generata
- Sopra le slide appare un indicatore "Creazione immagini..." che scompare quando le immagini sono pronte

