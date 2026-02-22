

## Fix: Indicatore di caricamento + Immagini AI visibili nelle slide

### Problema 1: L'indicatore di caricamento non appare mai
Il flusso attuale e':
1. `generateCarouselSlides()` chiama `setCarouselSlides(slides)` -- le slide esistono
2. Poi chiama `generateImagesForSlides()` che setta `isGeneratingImages = true`

Il blocco `isGeneratingImages && carouselSlides.length === 0` non si attiva MAI perche' le slide vengono create PRIMA che `isGeneratingImages` diventi `true`.

**Soluzione:** Settare `isGeneratingImages = true` all'INIZIO di `generateCarouselSlides()`, non solo dentro `generateImagesForSlides()`.

### Problema 2: Le immagini AI generate non vengono mostrate
La edge function genera le immagini e le salva su Storage (funziona -- i log confermano upload riusciti). Il risultato viene salvato in `slide.imageUrl`. Ma la funzione `renderSlide()` in PreviewSection.tsx mostra solo:
- Layer di testo del template
- `userImageUrl` nelle photo zone (foto caricate dall'utente)

L'`imageUrl` (immagine AI) non viene MAI renderizzata come sfondo o immagine visibile nella slide.

**Soluzione:** Usare `imageUrl` come sfondo della slide quando disponibile, mostrando l'immagine AI sotto i layer di testo.

### File da modificare

**`src/hooks/useCarouselSlides.ts`**
- Aggiungere `setIsGeneratingImages(true)` all'inizio di `generateCarouselSlides()` (prima della chiamata a `generate-content`)
- Gestire il caso errore con `setIsGeneratingImages(false)`

**`src/components/PreviewSection.tsx`**
- Nel metodo `renderSlide()`, rendere `slide.imageUrl` come immagine di sfondo della slide quando presente
- L'immagine AI viene mostrata sotto i layer di testo del template, funzionando come sfondo visivo

### Dettagli tecnici

**useCarouselSlides.ts - loading anticipato:**
```text
const generateCarouselSlides = useCallback(async () => {
    setIsGeneratingImages(true);  // <-- SUBITO all'inizio
    // ... rest of function
    // In caso di errore senza chiamare generateImagesForSlides:
    // setIsGeneratingImages(false);
});
```

**PreviewSection.tsx - mostrare imageUrl come sfondo:**
```text
// Dentro renderSlide, dopo bgStyle e prima dei layer:
{slide.imageUrl && (
  <img
    src={slide.imageUrl}
    alt={`Slide ${index + 1}`}
    className="absolute inset-0 w-full h-full object-cover"
  />
)}
```

### Risultato
- L'utente vede "Creazione immagini in corso..." immediatamente quando clicca Genera
- Le immagini AI generate appaiono come sfondo delle slide nel carosello
- I layer di testo del template si sovrappongono alle immagini
- Funziona per tutti i tipi di post (carosello, singolo, storia, reel)

