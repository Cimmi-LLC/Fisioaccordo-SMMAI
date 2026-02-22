

# Mostrare TUTTE le immagini nell'anteprima

## Problema attuale
1. L'anteprima mostra solo le prime 4 slide e dice "+X altre slide" per il resto -- le immagini rimanenti non si vedono
2. Per i post singoli (post-singolo, storia, reel) non viene generata nessuna slide visiva, quindi non si vede nessuna anteprima con il template applicato

## Soluzione

### 1. `PreviewSection.tsx` -- Mostrare TUTTE le slide
- Rimuovere il `.slice(0, 4)` che limita la visualizzazione a 4 slide
- Rimuovere il messaggio "+X altre slide"
- Mostrare tutte le slide in una griglia responsive (2 colonne su mobile, 3 su desktop per molte slide)

### 2. `useCarouselSlides.ts` -- Generare 1 slide anche per post singoli
- Accettare `postType` come parametro nel form data
- Per `post-singolo`, `storia`, `reel`: generare 1 sola slide con il contenuto del post, cosi il template viene applicato e l'anteprima mostra l'immagine con il testo sovrapposto
- Per `carosello`: comportamento invariato (genera N slide)

### 3. `useContentGeneration.ts` / componente padre
- Passare `postType` al hook `useCarouselSlides` perche sappia quante slide generare

## Dettagli tecnici

### File modificati
- `src/components/PreviewSection.tsx` -- rimuovere slice(0,4), mostrare tutte le slide
- `src/hooks/useCarouselSlides.ts` -- aggiungere `postType` al FormData, generare 1 slide per post singoli
- Eventuali aggiornamenti nel componente che passa i dati al hook (per includere `postType`)
