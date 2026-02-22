
## Fix: Immagini reali per tutti i tipi di post (singolo, storia, reel)

### Problema attuale
Quando generi un "Post Singolo", "Storia" o "Reel", il sistema genera la slide e chiama `generateImagesForSlides`, ma:

1. L'etichetta dice "Slide del Carosello" anche per un singolo post -- confonde l'utente
2. Il formato immagine e' sempre 1080x1080 (quadrato) anche per Storie e Reel che richiedono 1080x1920 (verticale 9:16)
3. L'indicatore di caricamento "Creazione immagini in corso..." non e' abbastanza visibile per post singoli

### Soluzione

**File: `src/components/PreviewSection.tsx`**

- Cambiare il titolo della sezione slide in base al tipo di post:
  - Carosello: "Slide del Carosello"
  - Post Singolo: "Immagine del Post"
  - Storia: "Immagine della Storia"
  - Reel: "Immagine del Reel"
- Passare `postType` come nuova prop al componente

**File: `src/components/MainContent.tsx`**

- Passare `formData.postType` a `PreviewSection` come nuova prop

**File: `supabase/functions/generate-carousel-images/index.ts`**

- Accettare un parametro `format` nel body della richiesta (`square` | `vertical`)
- Per Storie e Reel, generare immagini 1080x1920 (9:16 verticale)
- Per Post e Carosello, mantenere 1080x1080 (1:1 quadrato)
- Aggiornare il prompt per specificare il formato corretto

**File: `src/hooks/useCarouselSlides.ts`**

- Passare il formato corretto a `generate-carousel-images`:
  - `post-singolo` e `carosello`: format `square`
  - `storia` e `reel`: format `vertical`

### Dettagli tecnici

**PreviewSection.tsx -- titolo dinamico:**
```text
// Nuova prop
postType?: string;

// Titolo dinamico
const sectionTitle = {
  'post-singolo': 'Immagine del Post',
  'storia': 'Immagine della Storia',
  'reel': 'Immagine del Reel',
}[postType] || 'Slide del Carosello';
```

**useCarouselSlides.ts -- formato immagine:**
```text
const imageFormat = ['storia', 'reel'].includes(postType) ? 'vertical' : 'square';

// Passare a generate-carousel-images
body: { slides: slideData, style: '...', format: imageFormat }
```

**generate-carousel-images/index.ts -- prompt con formato:**
```text
const { slides, style, format } = await req.json();
const isVertical = format === 'vertical';
const dimensions = isVertical ? '1080x1920, vertical 9:16 format' : '1080x1080, square format';

// Nel prompt:
`Create a professional social media image (${dimensions}).`
```

### Risultato
- Ogni tipo di post mostra il titolo corretto ("Immagine del Post", "Immagine della Storia", ecc.)
- Le immagini per Storie e Reel vengono generate in formato verticale 9:16
- L'utente vede chiaramente che l'immagine e' in fase di creazione per qualsiasi tipo di post
- Le immagini sono reali (generate dall'AI e salvate su Storage) per tutti i formati
