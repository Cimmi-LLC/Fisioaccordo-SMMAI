

## Fix: Slide del carosello non vengono mostrate

### Problema principale

Quando il contenuto viene caricato dalla **cache** (perche' hai gia' generato lo stesso topic), il codice salta completamente la generazione delle slide del carosello. Per questo non vedi ne' le slide ne' la barra di caricamento.

Nel file `useContentGeneration.ts`, linea 40-47, il codice fa `return` senza mai chiamare `generateCarouselSlides()`.

### Soluzione

**File: `src/hooks/useContentGeneration.ts`**

- Aggiungere la chiamata a `generateCarouselSlides()` anche quando il contenuto viene caricato dalla cache (linea 42, dopo `setGeneratedContent(cached.content)`)
- Cosi' le slide vengono generate sempre, sia con contenuto fresco che dalla cache

```text
// Prima (bug):
if (cached) {
  setGeneratedContent(cached.content);
  toast({ title: "Contenuto dalla cache!" });
  return;   // <-- generateCarouselSlides() MAI chiamato
}

// Dopo (fix):
if (cached) {
  setGeneratedContent(cached.content);
  generateCarouselSlides();  // <-- AGGIUNTO
  toast({ title: "Contenuto dalla cache!" });
  return;
}
```

### Risultato

- Le slide del carosello vengono generate SEMPRE, anche quando il testo viene dalla cache
- La barra di caricamento "Creazione immagini in corso..." sara' visibile
- Le immagini verranno generate correttamente con il sistema sequenziale gia' implementato

