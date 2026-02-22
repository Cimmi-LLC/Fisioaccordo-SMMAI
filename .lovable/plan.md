

# Supporto Upload Multi-Formato nel Template Uploader

## Cosa cambia
Attualmente il template uploader accetta solo PNG, JPG e WebP. Aggiungeremo il supporto per:

- **SVG** (`.svg`) -- ideale per estrarre livelli vettoriali
- **HEIC/HEIF** (`.heic`, `.heif`) -- formato nativo iPhone
- **PDF** (`.pdf`) -- utile per esportazioni da Canva
- **Qualsiasi altro formato immagine** (BMP, TIFF, ecc.)

## Modifiche

### `src/components/TemplateUploader.tsx`

1. **Attributo `accept` degli input file** (riga 276-277): espandere per includere `image/*,.svg,.pdf,.heic,.heif`
2. **Filtro `handleFilesSelected`** (riga 131): invece di filtrare solo `image/png|jpeg|webp`, accettare tutti i file immagine (`f.type.startsWith('image/')`) piu SVG (`image/svg+xml`), PDF (`application/pdf`), e HEIC/HEIF (che su iPhone possono avere MIME vuoto, quindi accettare anche per estensione `.heic`/`.heif`)
3. **Messaggio di errore** (riga 133): aggiornare il testo per elencare i nuovi formati supportati
4. **Upload su storage** (riga 224-226): il `contentType` viene gia preso da `pf.file.type`, quindi funziona automaticamente per i nuovi formati. Per HEIC con MIME vuoto, impostare un fallback a `image/heic`

Nota: i file SVG e PDF verranno usati come riferimento visivo nel pannello di anteprima dell'editor livelli, non come sfondo finale (come da piano precedente).

