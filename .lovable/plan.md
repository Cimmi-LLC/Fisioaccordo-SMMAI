

## Piano: Progress visuale dettagliato per generazione immagini e pubblicazione

L'obiettivo e' mostrare a Meta ogni singolo passaggio in modo grafico e chiaro, con icone, step numerati e stato visivo (in corso, completato, errore).

---

### 1. Nuovo componente `PublishingPipeline.tsx`

Un componente che mostra una pipeline verticale con step visivi durante la pubblicazione:

```text
┌─────────────────────────────────────┐
│  📤 Publishing to Instagram         │
│                                     │
│  ✅ Step 1: Checking connection     │
│  ✅ Step 2: Preparing content       │
│  ✅ Step 3: Uploading image         │
│  ⏳ Step 4: Creating media...       │  ← spinner
│  ○  Step 5: Publishing post         │  ← grigio
│  ○  Step 6: Confirming publication  │
│                                     │
│  ████████████░░░░░  65%             │
└─────────────────────────────────────┘
```

Ogni step ha:
- Icona circolare: grigia (pending), spinner blu (in corso), check verde (fatto), X rossa (errore)
- Testo descrittivo
- Linea di connessione verticale tra step

**File**: `src/components/PublishingPipeline.tsx`

Props: `steps: { label: string, status: 'pending' | 'active' | 'done' | 'error' }[]`, `title: string`, `progress: number`

---

### 2. Nuovo componente `ImageGenerationProgress.tsx`

Sostituisce il generico "Creating images..." con una griglia visiva slide-per-slide:

```text
┌─────────────────────────────────────┐
│  🎨 Generating Images               │
│                                     │
│  [✅ Slide 1] [⏳ Slide 2] [○ S3]  │  ← mini card per slide
│                                     │
│  Slide 2 of 5 — Creating image...  │
│  ████████████░░░░░  40%             │
└─────────────────────────────────────┘
```

**File**: `src/components/ImageGenerationProgress.tsx`

Props: `totalSlides: number`, `currentSlide: number`, `isGenerating: boolean`

---

### 3. Modifiche a file esistenti

**`src/hooks/useCarouselSlides.ts`**:
- Aggiungere stato `imageGenProgress: { current: number, total: number }` 
- Aggiornare `current` ad ogni iterazione nel loop di generazione immagini
- Esporre `imageGenProgress` nel return

**`src/components/PreviewSection.tsx`**:
- Sostituire il semplice `<Loader2> Creating images...` con `<ImageGenerationProgress>`
- Passare `imageGenProgress` come prop

**`src/components/MainContent.tsx`**:
- Passare `imageGenProgress` a `PreviewSection`
- Integrare `PublishingPipeline` nel flusso `handlePublish` con step granulari
- Aggiungere stato `publishingSteps` che si aggiorna ad ogni fase della pubblicazione
- Mostrare `PublishingPipeline` sopra la preview quando `isPublishing`

**`src/components/SmartCopyActions.tsx`**:
- Mostrare lo stato di pubblicazione con il `PublishingPipeline` inline quando l'utente clicca "Publish Now"

---

### 4. Dettaglio step di pubblicazione

Gli step mostrati durante la pubblicazione saranno:

1. "Verifying Instagram connection" 
2. "Preparing content and caption"
3. "Uploading images to Instagram"
4. "Creating media container"
5. "Waiting for media processing"
6. "Publishing to feed"
7. "Publication confirmed! ✨"

Ogni step si illumina man mano che il flusso in `handlePublish` procede, usando `useState` con un array di step.

---

### Riepilogo file

| File | Azione |
|------|--------|
| `src/components/PublishingPipeline.tsx` | **Nuovo** — pipeline visiva a step |
| `src/components/ImageGenerationProgress.tsx` | **Nuovo** — progresso slide-per-slide |
| `src/hooks/useCarouselSlides.ts` | Aggiungere tracking progresso per slide |
| `src/components/PreviewSection.tsx` | Usare `ImageGenerationProgress` |
| `src/components/MainContent.tsx` | Integrare `PublishingPipeline` nel flusso publish, passare progress |
| `src/components/SmartCopyActions.tsx` | Mostrare pipeline inline durante pubblicazione |

