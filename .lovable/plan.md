

# Sistema Template Multi-Livello Avanzato

## Problema attuale
Il sistema attuale salva solo 3 zone generiche (top/center/bottom) con Y e altezza. Manca completamente la possibilita di definire i singoli livelli di un template: font, colori, ombre, posizione numeri, banner, zone immagine, ecc.

## Soluzione
Trasformare il campo `text_zones` (JSON) da semplice lista di 3 zone a un sistema di **livelli individuali** (layers), ognuno con tutte le proprieta visive necessarie. L'account mother definisce i livelli una volta per template, e poi il sistema li riempie automaticamente col contenuto generato dall'AI.

## Architettura dei Livelli

Ogni template avra un array di layer, ognuno con queste proprieta:

| Proprieta | Tipo | Descrizione |
|---|---|---|
| `id` | string | Identificativo unico del layer |
| `type` | enum | `title`, `number`, `subtitle`, `body`, `cta`, `banner`, `image`, `logo`, `footer` |
| `x`, `y` | number (%) | Posizione in percentuale |
| `width`, `height` | number (%) | Dimensioni in percentuale |
| `fontFamily` | string | Font (Arial, Montserrat, Impact, ecc.) |
| `fontSize` | number (px) | Grandezza font in px (scalato) |
| `fontWeight` | string | normal, bold, 900, ecc. |
| `color` | string | Colore testo |
| `textAlign` | string | left, center, right |
| `textTransform` | string | none, uppercase, capitalize |
| `shadow` | object | `{ enabled, color, blur, offsetX, offsetY }` |
| `backgroundColor` | string | Per banner/CTA (colore sfondo) |
| `borderRadius` | number | Per banner/CTA arrotondati |
| `padding` | number | Padding interno |
| `lineHeight` | number | Altezza riga |
| `letterSpacing` | number | Spaziatura lettere |
| `opacity` | number | Trasparenza 0-1 |

## Mapping automatico layer -> contenuto generato

Quando l'AI genera un post, il contenuto viene mappato automaticamente:
- `title` -> Titolo/Hook del post
- `number` -> Numero grande (es. "280", "97%")
- `subtitle` -> Sottotitolo
- `body` -> Corpo del testo
- `cta` -> Call to action
- `banner` -> Testo banner (es. "CLICCA IN BASSO E LAVORA CON NOI")
- `footer` -> Nome azienda/brand
- `image` -> Zona dove inserire la foto dell'utente
- `logo` -> Zona logo

## Modifiche ai file

### 1. `src/components/TemplateUploader.tsx` -- Riscrittura editor livelli
- Rimuovere il vecchio editor con 3 zone (top/center/bottom)
- Aggiungere un "Layer Editor" con:
  - Pulsante "+ Aggiungi Livello" con menu tipo (title, number, subtitle, body, cta, banner, image, footer)
  - Per ogni livello aggiunto: pannello collassabile con tutti i controlli (posizione X/Y, dimensioni W/H, font, grandezza, peso, colore, ombra, sfondo, ecc.)
  - Preview live che mostra tutti i livelli posizionati sopra il template PNG
  - Possibilita di riordinare e cancellare livelli
  - Il campo `text_zones` salvato nel DB diventa: `{ layers: [...] }` invece di `{ zones: [...] }`
- Ogni template puo avere i propri livelli individuali (non piu impostazioni condivise per tutti i file)

### 2. `src/components/PreviewSection.tsx` -- Rendering multi-livello
- Aggiornare `renderSlideWithTemplate` per leggere il nuovo formato `layers`
- Renderizzare ogni layer come un `div` posizionato assolutamente con tutte le proprieta CSS
- Per i layer `banner`: renderizzare con sfondo colorato + testo
- Per i layer `image`: renderizzare la zona immagine dell'utente
- Mantenere compatibilita col vecchio formato `zones` (fallback)

### 3. `src/hooks/useCarouselSlides.ts` -- Struttura contenuto per layer
- Aggiornare la struttura del contenuto generato per includere campi mappabili ai layer: `title`, `number`, `subtitle`, `body`, `cta`, `banner`, `footer`
- L'edge function `generate-content` gia ritorna questi campi per le slide del carosello

### 4. `src/components/CanvaTemplateSelector.tsx` -- Nessuna modifica sostanziale
- Funziona gia, i template vengono filtrati per categoria

## Dettagli tecnici

### Esempio JSON salvato in `text_zones`
```text
{
  "layers": [
    {
      "id": "logo",
      "type": "logo",
      "x": 35, "y": 2, "width": 30, "height": 8,
      "fontSize": 12, "fontFamily": "Montserrat",
      "fontWeight": "bold", "color": "#E91E63",
      "textAlign": "center"
    },
    {
      "id": "title",
      "type": "title",
      "x": 10, "y": 25, "width": 80, "height": 15,
      "fontSize": 36, "fontFamily": "Impact",
      "fontWeight": "900", "color": "#E91E63",
      "textAlign": "center", "textTransform": "uppercase",
      "shadow": { "enabled": true, "color": "#000", "blur": 4 }
    },
    {
      "id": "number",
      "type": "number",
      "x": 25, "y": 40, "width": 50, "height": 20,
      "fontSize": 72, "fontFamily": "Arial Black",
      "fontWeight": "900", "color": "#000000",
      "textAlign": "center"
    },
    {
      "id": "body",
      "type": "body",
      "x": 10, "y": 60, "width": 80, "height": 15,
      "fontSize": 14, "fontFamily": "Arial",
      "fontWeight": "bold", "color": "#000",
      "textAlign": "center", "textTransform": "uppercase"
    },
    {
      "id": "banner",
      "type": "banner",
      "x": 15, "y": 78, "width": 70, "height": 8,
      "fontSize": 12, "fontFamily": "Arial",
      "fontWeight": "bold", "color": "#FFFFFF",
      "textAlign": "center", "textTransform": "uppercase",
      "backgroundColor": "#E91E63", "borderRadius": 4
    }
  ]
}
```

### Compatibilita
- Se `text_zones` ha il vecchio formato `{ zones: [...] }`, funziona ancora con il fallback
- I nuovi template usano `{ layers: [...] }` per il sistema avanzato

### File modificati
- `src/components/TemplateUploader.tsx` -- nuovo Layer Editor completo
- `src/components/PreviewSection.tsx` -- rendering layer-based
- `src/hooks/useCarouselSlides.ts` -- struttura contenuto compatibile con layer

