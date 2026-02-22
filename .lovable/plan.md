

# Ricreare i Template Interamente in HTML/CSS (Senza PNG con Testo)

## Il vero problema
I template salvati nel database sono **screenshot PNG da Canva** che contengono gia il testo ("ASSUMIAMO", "SE SAI FAR FUNZIONARE", "CLICCA IN BASSO E LAVORA CON NOI", ecc.). Poi il sistema sovrappone ALTRO testo generato dall'AI sopra, creando il pasticcio visibile nello screenshot.

**Non si puo risolvere con overlay** -- finche il PNG contiene testo, sara sempre un disastro.

## Soluzione: Template costruiti al 100% in HTML/CSS

Invece di usare un PNG come sfondo, ogni template definisce:
- **Sfondo**: colore solido, gradiente, o solo la foto dell'utente (non un PNG con testo)
- **Tutti i livelli di testo**: posizione, font, colore, ombra, banner -- tutto in HTML/CSS
- **Zona immagine**: dove va la foto dell'utente (es. mezza slide, angolo, sfondo)

Il risultato e una slide completamente generata dal codice, senza nessun PNG pre-renderizzato.

## Struttura di un "Design Template" (nuovo formato)

Ogni template non ha piu un `background_url` con un PNG pieno di testo. Invece ha:

| Campo | Descrizione |
|---|---|
| `background` | Oggetto con `type` (solid/gradient/photo) e relativo valore (colore, gradiente CSS, o posizione foto utente) |
| `layers` | Array di livelli con tutte le proprieta visive (come definito nel piano precedente) |
| `photoZone` | Opzionale: dove posizionare la foto dell'utente (`{ x, y, width, height, opacity, objectFit }`) |
| `overlayColor` | Colore overlay sopra la foto per leggibilita testo (es. `rgba(0,0,0,0.4)`) |

### Esempio template "Fisioaccordo Rosa"
```text
{
  "background": {
    "type": "solid",
    "value": "#1a1a2e"
  },
  "photoZone": {
    "x": 0, "y": 0, "width": 100, "height": 100,
    "opacity": 0.3, "objectFit": "cover"
  },
  "overlayColor": "rgba(0,0,0,0.35)",
  "layers": [
    { "id": "brand", "type": "logo", "x": 15, "y": 3, "width": 70, "height": 7,
      "fontSize": 22, "fontFamily": "Montserrat, sans-serif", "fontWeight": "800",
      "color": "#E91E63", "textAlign": "center", "textTransform": "uppercase",
      "letterSpacing": 4, "defaultText": "ASSUMIAMO" },

    { "id": "title", "type": "title", "x": 5, "y": 12, "width": 90, "height": 18,
      "fontSize": 28, "fontFamily": "Arial Black, sans-serif", "fontWeight": "900",
      "color": "#FFFFFF", "textAlign": "center", "textTransform": "uppercase",
      "shadow": { "enabled": true, "color": "rgba(0,0,0,0.7)", "blur": 6 } },

    { "id": "subtitle", "type": "subtitle", "x": 10, "y": 32, "width": 80, "height": 8,
      "fontSize": 14, "fontFamily": "Arial, sans-serif", "fontWeight": "600",
      "color": "#E91E63", "textAlign": "center" },

    { "id": "body", "type": "body", "x": 5, "y": 42, "width": 90, "height": 28,
      "fontSize": 11, "fontFamily": "Arial, sans-serif", "fontWeight": "400",
      "color": "#FFFFFF", "textAlign": "center", "lineHeight": 1.4 },

    { "id": "banner", "type": "banner", "x": 5, "y": 74, "width": 90, "height": 8,
      "fontSize": 11, "fontFamily": "Arial Black, sans-serif", "fontWeight": "800",
      "color": "#FFFFFF", "textAlign": "center", "textTransform": "uppercase",
      "backgroundColor": "#E91E63", "borderRadius": 4 },

    { "id": "footer-line", "type": "footer", "x": 5, "y": 85, "width": 90, "height": 5,
      "fontSize": 7, "fontFamily": "Arial, sans-serif", "fontWeight": "400",
      "color": "#FFFFFF", "textAlign": "center", "opacity": 0.6,
      "defaultText": "CANDIDATI ORA IMPRENDITORI SOLO DI PERSONE INTERNE, NO FREELANCERS, SOLO FUNN" },

    { "id": "partner", "type": "footer", "x": 10, "y": 91, "width": 80, "height": 6,
      "fontSize": 9, "fontFamily": "Arial, sans-serif", "fontWeight": "600",
      "color": "#FFFFFF", "textAlign": "center",
      "defaultText": "By partnering with FISIOACCORDO" }
  ]
}
```

## File da modificare

### 1. `src/components/PreviewSection.tsx`
- Aggiornare `renderSlideWithTemplate` per usare il nuovo formato:
  - Se il template ha `background.type === 'solid'` o `'gradient'`: usare CSS background
  - Se ha `photoZone`: posizionare la foto dell'utente nella zona definita
  - Se ha `overlayColor`: aggiungere un div overlay semitrasparente
  - Rendere i layer come prima, ma con supporto per `defaultText` (testo fisso del template che non cambia)
- Per i template che hanno ancora il vecchio formato (con `background_url`): NON mostrare il PNG come sfondo, usare solo il fallback con colore solido + layer auto-generati

### 2. `src/components/TemplateUploader.tsx`
- Aggiungere la possibilita di definire il `background` (colore, gradiente, o "usa foto utente")
- Aggiungere la `photoZone` (posizione e opacita della foto utente)
- Aggiungere `overlayColor` con color picker
- Aggiungere campo `defaultText` per ogni layer (testo statico che non viene sostituito dall'AI, es. "ASSUMIAMO", "By partnering with FISIOACCORDO")
- L'immagine PNG caricata serve SOLO come **riferimento visivo** per l'account mother mentre configura i livelli, ma NON viene usata come sfondo nella preview finale

### 3. `src/services/canvaService.ts`
- Aggiornare l'interfaccia `CanvaTemplate` per includere i nuovi campi opzionali nella struttura `text_zones`

### 4. Hardcode di 2-3 template di default
- Creare 2-3 template predefiniti direttamente nel codice (non nel DB) che replicano lo stile Fisioaccordo rosa:
  - **Template "Fisioaccordo Rosa"**: sfondo scuro, foto utente con overlay, testo ASSUMIAMO in rosa, banner rosa
  - **Template "Minimalista"**: sfondo bianco, testi neri, accento colore
  - **Template "Bold Dark"**: sfondo nero, testi grandi bianchi, numeri enormi
- Questi template servono come fallback quando non ci sono template con layers nel DB

## Come funziona dopo la modifica

1. L'utente genera un post
2. Il sistema prende il template selezionato
3. Se il template ha il nuovo formato (`layers` + `background`): costruisce la slide interamente in HTML/CSS con i colori, font, e posizioni definiti
4. Se il template ha il vecchio formato (solo PNG): usa un template hardcoded di default (non il PNG con testo)
5. Il testo generato dall'AI riempie i layer di tipo `title`, `body`, `number`, ecc.
6. I layer con `defaultText` (es. "ASSUMIAMO", "By partnering with...") mantengono il testo fisso

## Dettagli tecnici

### Rendering di una slide (pseudocodice)
```text
renderSlide(template, slideData, userPhoto):
  1. Crea container aspect-square
  2. Se template.background.type == 'solid': background-color CSS
     Se template.background.type == 'gradient': background CSS gradient
  3. Se template.photoZone && userPhoto:
     Posiziona img con x/y/w/h dalla photoZone, opacity dalla photoZone
  4. Se template.overlayColor:
     Div assoluto con backgroundColor = overlayColor
  5. Per ogni layer in template.layers:
     - Se layer.defaultText: usa defaultText (testo fisso)
     - Altrimenti: usa slideData[layer.type] (testo dall'AI)
     - Renderizza con tutte le proprieta CSS del layer
```

### File modificati
- `src/components/PreviewSection.tsx` -- rendering completamente CSS-based
- `src/components/TemplateUploader.tsx` -- editor per nuovo formato (background, photoZone, overlay, defaultText)
- `src/services/canvaService.ts` -- interfaccia aggiornata
- Nuovo file con template hardcoded di default

