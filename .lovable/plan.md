

# Fix Rendering Anteprima: Rispettare i Livelli Grafici del Template

## Problema
Tutti i template nel database usano ancora il vecchio formato `zones` (3 bande: top/center/bottom) senza informazioni su font, colori, ombre, banner, numeri. Il risultato e un rendering brutto con testo sovrapposto senza stile.

Nessun template ha ancora il formato `layers` perche sono stati caricati prima dell'editor livelli.

## Soluzione

### 1. `PreviewSection.tsx` -- Fallback intelligente per template senza layers
Quando un template ha il vecchio formato `zones` (o nessun layer definito), generare automaticamente dei layer di default basati sul tipo di slide:

- **Slide 1 (attention)**: titolo grande in alto, sottotitolo, corpo testo
- **Slide 2-4 (problem/solution)**: numero grande al centro, body sotto, banner in basso
- **Ultima slide (cta)**: CTA grande, footer brand

I layer auto-generati avranno:
- Font, grandezze e pesi diversi per tipo (titolo grande e bold, body piu piccolo, banner con sfondo colorato)
- Colori e ombre letti dal `text_color` del template
- Sfondo per i banner
- Posizioni che non si sovrappongono

### 2. `PreviewSection.tsx` -- Migliorare il scaling dei font
Il fattore `* 0.35` e troppo aggressivo. Usare un fattore relativo alla dimensione del container (la preview e circa 200-300px, il template originale e 1080px, quindi `* 0.25` circa).

### 3. `PreviewSection.tsx` -- Variare il layout tra le slide del carosello
Per i caroselli, ogni slide avra un layout leggermente diverso:
- Slide 1: enfasi sul titolo/hook (grande, colorato)
- Slide centrali: enfasi sul numero e body
- Ultima slide: enfasi sulla CTA e brand

### 4. `useCarouselSlides.ts` -- Assicurarsi che il campo `number` sia popolato
Il generate-content gia ritorna `number` per le slide, ma verificare che il fallback lo includa.

## Dettagli tecnici

### Logica auto-generazione layer (in PreviewSection)
```text
function generateDefaultLayers(slideData, slideIndex, totalSlides, textColor):
  layers = []

  if slideIndex == 0:  // Slide apertura
    layers.push({ type: 'title', y: 15, height: 20, fontSize: 28, fontWeight: 900, color: textColor })
    layers.push({ type: 'subtitle', y: 40, height: 10, fontSize: 14 })
    layers.push({ type: 'body', y: 55, height: 25, fontSize: 12 })
    layers.push({ type: 'footer', y: 88, height: 8, fontSize: 10, opacity: 0.7 })

  elif slideIndex == totalSlides - 1:  // Slide CTA finale
    layers.push({ type: 'title', y: 10, height: 15, fontSize: 22 })
    layers.push({ type: 'body', y: 30, height: 30, fontSize: 13 })
    layers.push({ type: 'banner', y: 70, height: 10, bg: textColor, color: '#fff' })
    layers.push({ type: 'footer', y: 85, height: 10, fontSize: 12 })

  else:  // Slide contenuto
    layers.push({ type: 'title', y: 5, height: 15, fontSize: 18, fontWeight: bold })
    layers.push({ type: 'number', y: 22, height: 25, fontSize: 48, fontWeight: 900 })
    layers.push({ type: 'body', y: 50, height: 25, fontSize: 11 })
    layers.push({ type: 'banner', y: 80, height: 8, bg: textColor })
    layers.push({ type: 'footer', y: 90, height: 8, fontSize: 9 })

  return layers
```

### File modificati
- `src/components/PreviewSection.tsx` -- auto-generazione layer per vecchio formato + miglior scaling + variazione tra slide
- `src/hooks/useCarouselSlides.ts` -- assicurare campo `number` nel fallback
