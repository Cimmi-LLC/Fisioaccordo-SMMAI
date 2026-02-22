

## Fix: Indicatore di caricamento immagini sempre visibile

### Problema
L'indicatore "Creazione immagini in corso..." e' dentro il blocco `carouselSlides.length > 0` in `PreviewSection.tsx`. Questo significa che:
- Quando `generateCarouselSlides` sta ancora creando le slide (prima di `setCarouselSlides`), non c'e' nessun feedback visivo
- Anche quando le slide sono in fase di creazione immagini, se per qualche motivo `carouselSlides` e' vuoto, l'indicatore non appare

### Soluzione

**File: `src/components/PreviewSection.tsx`**

Spostare l'indicatore di caricamento FUORI dal blocco `carouselSlides.length > 0`, cosi' che venga mostrato ogni volta che `isGeneratingImages` e' `true`, indipendentemente dallo stato delle slide.

Prima (codice attuale):
```text
{carouselSlides.length > 0 && (
  <div className="mb-4">
    <h3>...</h3>
    {isGeneratingImages && (
      <div>Creazione immagini in corso...</div>
    )}
    <div className="grid ...">
      {carouselSlides.map(...)}
    </div>
  </div>
)}
```

Dopo (fix):
```text
{isGeneratingImages && carouselSlides.length === 0 && (
  <div className="mb-4">
    <h3>{titolo dinamico}</h3>
    <div>Creazione immagini in corso...</div>
  </div>
)}
{carouselSlides.length > 0 && (
  <div className="mb-4">
    <h3>...</h3>
    {isGeneratingImages && (
      <div>Creazione immagini in corso...</div>
    )}
    <div className="grid ...">
      {carouselSlides.map(...)}
    </div>
  </div>
)}
```

In questo modo:
- Se le slide non sono ancora state create ma le immagini sono in generazione, l'utente vede "Creazione immagini in corso..."
- Se le slide esistono e le immagini sono in generazione, l'indicatore appare sopra le slide come prima
- L'indicatore usa il titolo dinamico corretto (Immagine del Post, della Storia, ecc.)

