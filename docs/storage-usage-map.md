# Mappa d'uso dei bucket Storage — Step 1

Data: 2026-06-07
Scope: stato reale a runtime + tracciamento di tutti i callers `getPublicUrl` / `.upload(` / `createSignedUrl` su `/Users/gianfrancodurand/remix-of-social-generator-fisioaccordo`.

## TL;DR

| Scoperta chiave | Effetto sul piano |
|---|---|
| **`carousel-images` ha 660 file. Tutti gli altri bucket sono VUOTI (0 oggetti)** | Possiamo flippare tutto il resto a private oggi, senza rischio dati esistenti. Niente backfill URL da fare. |
| **`brand-photos` bucket esiste ma il codice non lo usa** — `useBrandPhotos.ts` carica le foto del brand nel bucket `user-photos` (con prefix `brand-pool/`). Il bucket `brand-photos` è dead code | Possiamo droppare il bucket `brand-photos` o lasciarlo vuoto. Le sue policy pubbliche sono pericolose solo per la prossima volta che qualcuno scriverà dentro per sbaglio. |
| **`carousel-images` è l'unico bucket realmente in uso e ALIMENTA la pubblicazione Instagram** (URL salvati in `published_posts.image_urls[]` + passati a Meta Graph API) | Resta pubblico, o privatizzato con signed URL **rigenerata dentro `meta-publish` e `process-scheduled-posts` al momento della pubblicazione** (mai salvata in DB). |
| **TUTTE le tabelle dati cliente sono a 0 record** (user_photos, brand_photos, canva_templates, published_posts, brands.story_templates): siamo PRE-PRODUZIONE | Lo sprint si semplifica enormemente: niente migration di URL salvate, niente downtime, possiamo procedere con flip diretto. |

## 1. Stato runtime dei bucket

| Bucket | `public=` | # file | Usato dal codice? | Pubblicazione IG? |
|---|---|---|---|---|
| `carousel-images` | TRUE | **660** | SÌ — `save-slide-image`, `generate-carousel-images`, `generate-story-template` | SÌ — è il bucket consumato da meta-publish |
| `user-photos` | TRUE | 0 | SÌ — `useUserPhotos`, `useBrandPhotos` (con prefix), `TemplateUploader` | No |
| `brand-photos` | TRUE | 0 | **NO** (il codice usa `user-photos` per le foto brand) | No |
| `story-templates` | TRUE | 0 | SÌ — `useStoryTemplates` | No (le URL finiscono in `brands.story_templates` e poi servite come asset in-app) |
| `generated-images` | TRUE | 0 | NO (0 ref `getPublicUrl`, 0 ref `.upload(`) | No |
| `media-uploads` | TRUE | 0 | NO | No |
| `thumbnails` | TRUE | 0 | NO | No |
| `workspace-logos` | TRUE | 0 | NO | No |
| `media` | FALSE | 0 | NO | No |
| `templates` | FALSE | 0 | NO | No |
| `viral-uploads` | FALSE | 0 | SÌ — `ViralAnalyzer` upload + `analyze-viral-post` consume | No |

## 2. Struttura dei path di upload per ogni bucket

Decisiva per scrivere policy con `(storage.foldername(name))[1] = auth.uid()::text`:

| Bucket | Path pattern | Primo segmento | OK per policy folder-owner? |
|---|---|---|---|
| `user-photos` ([src/hooks/useUserPhotos.ts:53](src/hooks/useUserPhotos.ts#L53)) | `${user.id}/${ts}.${ext}` | `auth.uid()` | ✅ Sì |
| `user-photos` (brand pool) ([src/hooks/useBrandPhotos.ts:67](src/hooks/useBrandPhotos.ts#L67)) | `${user.id}/brand-pool/${ts}_rand.${ext}` | `auth.uid()` | ✅ Sì |
| `user-photos` (TemplateUploader) ([src/components/TemplateUploader.tsx:229](src/components/TemplateUploader.tsx#L229)) | `${user.id}/templates/${ts}-${i}.${ext}` | `auth.uid()` | ✅ Sì |
| `story-templates` ([src/hooks/useStoryTemplates.ts:38](src/hooks/useStoryTemplates.ts#L38)) | `${user.id}/${brandId}/${ts}.${ext}` | `auth.uid()` | ✅ Sì |
| `viral-uploads` ([src/components/ViralAnalyzer.tsx:61](src/components/ViralAnalyzer.tsx#L61)) | `${user.id}/${ts}.${ext}` | `auth.uid()` | ✅ Sì |
| `carousel-images` ([supabase/functions/save-slide-image/index.ts:76](supabase/functions/save-slide-image/index.ts#L76)) | `carousels/${verifiedUserId}/${carouselId}/slide_N_${ts}.${ext}` | **`carousels`** (literal!) | ⚠️ NO — `(foldername)[1]` = `'carousels'`, l'`auth.uid()` è in `[2]` |
| `carousel-images` ([supabase/functions/generate-carousel-images/index.ts:907](supabase/functions/generate-carousel-images/index.ts#L907)) | (da verificare nel codice) | ? | da verificare |
| `carousel-images` ([supabase/functions/generate-story-template/index.ts:85](supabase/functions/generate-story-template/index.ts#L85)) | (da verificare) | ? | da verificare |

⚠️ **Eccezione importante**: il path di `carousel-images` ha un prefix letterale `carousels/` prima dello user id. Per la policy folder-owner servirebbe `(storage.foldername(name))[2] = auth.uid()::text` invece di `[1]`. Ma `carousel-images` rimarrà pubblico (vedi sotto), quindi questo non è un problema operativo immediato.

## 3. URL pubblici SALVATI in DB — da convertire (se flippassimo)

| Tabella | Colonna | URL bucket sorgente | # record live | Azione richiesta |
|---|---|---|---|---|
| `user_photos` | `public_url` (text) | `user-photos` | **0** | Nessuna (vuota). Schema OK così: il `storage_path` separato è già disponibile per generare signed URL on-demand. |
| `brand_photos` | `url` (text) | `user-photos` (prefix `brand-pool/`) | **0** | Nessuna (vuota). Verificare se manca colonna `storage_path` (potrebbe esserci solo `url`). |
| `canva_templates` | `background_url` (text) | `user-photos` (prefix `templates/`) | **0** | Nessuna (vuota). |
| `brands` | `story_templates` (text[]) | `story-templates` | **0** | Nessuna (vuota). Array di URL — se mai si flippa, andrebbe convertito in array di `{bucket, path}`. |
| `published_posts` | `image_urls` (text[]) | `carousel-images` | **0** | Nessuna (vuota). Plus: questo bucket rimarrà pubblico, vedi sotto. |
| `meta_connections.profile_pic_url` | — | URL Instagram CDN (non Supabase) | — | Niente da fare. |

**Conseguenza**: zero backfill DB. Possiamo procedere con il flip dei bucket senza alcuno script di migrazione URL.

## 4. Flusso pubblicazione Instagram — quale bucket alimenta cosa

```
[client] PreviewSection.tsx
   ↓ slide come dataUrl
[edge] save-slide-image
   ↓ upload in carousel-images/carousels/<userId>/<carouselId>/slide_N_<ts>.<ext>
   ↓ ritorna publicUrl https://<ref>.supabase.co/storage/v1/object/public/carousel-images/...
[client] CarouselPreview / SchedulePostDialog
   ↓ salva l'URL in published_posts.image_urls[]
   ↓ status='scheduled'  oppure  status='publishing-now' (meta-publish diretto)
[edge] meta-publish              [cron] process-scheduled-posts
   ↓ legge image_urls da request body          ↓ legge post.image_urls dal DB
   ↓ chiama Meta Graph API con image_url       ↓ chiama publishToInstagram(image_urls)
   ↓
[Meta Graph API]
   ↓ scarica HTTP GET dell'URL → publica su Instagram
```

**Vincolo Meta**: la Meta Graph API scarica l'URL pubblicamente, senza auth. Se l'URL ha bisogno di un token (es. signed URL), DEVE essere valida nel momento del download (60s-5min).

**2 modelli possibili per `carousel-images`:**

A. **Restare pubblico** (status quo). Pro: nessun cambio codice. Contro: tutte le slide caroselli passate sono enumerabili.
- I file in `carousels/<userId>/<carouselId>/slide_N_<ts>.<ext>` contengono testi e immagini di brand kit. Privacy media: non sono foto pazienti ma comunque "creative content" di clienti diversi.
- I path includono UUID utente e UUID carosello → discreta entropy. Difficile da enumerare in modo cieco, ma ottenibile tramite ricognizione.

B. **Privatizzare** con signed URL rigenerate dentro `meta-publish` e `process-scheduled-posts` al momento della pubblicazione (TTL 1 ora). Pro: nessun leak. Contro: serve refactor: `save-slide-image` deve ritornare `{bucket, path}` invece di `publicUrl`, `published_posts.image_urls[]` diventa "image_paths[]", `meta-publish` chiama `createSignedUrl` prima di passare a Graph.
- Plus: gli URL già salvati in `published_posts.image_urls[]` esistenti vanno migrati. **Ma sono 0 record, quindi niente migrazione!**

**Raccomandazione**: vado per **opzione B**. Costo di implementazione contenuto (siamo in pre-produzione, niente migration), guadagno reale di security postura.

## 5. Bucket — destino proposto

| Bucket | Stato oggi | Destino proposto | Note |
|---|---|---|---|
| `user-photos` | public, 0 file | **private + policy folder-owner `[1]`** | App lo legge in-app via `getPublicUrl` → cambiare a `createSignedUrl(path, 3600)` in 4 callsite |
| `story-templates` | public, 0 file | **private + policy folder-owner `[1]`** | Idem: useStoryTemplates usa `getPublicUrl` → cambiare a signed |
| `brand-photos` | public, 0 file | **drop il bucket** (dead code) | Il codice non lo usa più, le foto brand vanno in `user-photos` |
| `generated-images` | public, 0 file | **drop il bucket** (dead code) | 0 ref |
| `media-uploads` | public, 0 file | **drop il bucket** (dead code) | 0 ref |
| `thumbnails` | public, 0 file | **drop il bucket** (dead code) | 0 ref |
| `workspace-logos` | public, 0 file | **drop il bucket** (dead code) | 0 ref + è collegato alle tabelle workspace fantasma |
| `media` | private, 0 file | **drop il bucket** (dead code) | 0 ref |
| `templates` | private, 0 file | **drop il bucket** (dead code) | 0 ref |
| `carousel-images` | public, 660 file | **private + signed URL alla pubblicazione** | Opzione B: refactor save-slide-image → ritorna `{bucket, path}`, refactor meta-publish + cron per generare signed URL al momento della pubblicazione |
| `viral-uploads` | private, 0 file | **già OK** | Lasciato com'è |
| (carousel-images dropping è NO) | | | |

## 6. Punti caldi codice — file da toccare (Step 3)

Quando arriveremo a Step 3 (codice: da `getPublicUrl` a `createSignedUrl`):

**Frontend in-app — sostituire `getPublicUrl` con `createSignedUrl`:**
- [src/components/TemplateUploader.tsx:236](src/components/TemplateUploader.tsx#L236) — `user-photos`
- [src/hooks/useUserPhotos.ts:63](src/hooks/useUserPhotos.ts#L63) — `user-photos`
- [src/hooks/useStoryTemplates.ts:43](src/hooks/useStoryTemplates.ts#L43) — `story-templates`
- [src/hooks/useBrandPhotos.ts:80](src/hooks/useBrandPhotos.ts#L80) — `user-photos`

**Backend — `carousel-images` pubblicazione (signed URL al momento della pubblicazione):**
- [supabase/functions/save-slide-image/index.ts:88](supabase/functions/save-slide-image/index.ts#L88) — ritorna `{bucket, path}` invece di publicUrl
- [supabase/functions/generate-carousel-images/index.ts:919](supabase/functions/generate-carousel-images/index.ts#L919) — idem
- [supabase/functions/generate-story-template/index.ts:94](supabase/functions/generate-story-template/index.ts#L94) — idem
- [supabase/functions/meta-publish/index.ts:108,121](supabase/functions/meta-publish/index.ts#L108-L121) — generare signed URL prima di passare a Graph
- [supabase/functions/process-scheduled-posts/index.ts:92-98](supabase/functions/process-scheduled-posts/index.ts#L92-L98) — idem

**Schema DB (opzionale):**
- `published_posts.image_urls[]` rinominare in `image_paths[]` (o tenere il nome ma con semantica nuova "path relativo"). Tabella ha 0 record, niente migrazione.

---

## Stop richiesto — chiedo conferma su 3 decisioni

Prima di passare allo Step 2 (policy stringere) mi serve la tua conferma:

1. **`carousel-images`: opzione A o B?**
   - **A** = lasciare pubblico (più sicuro come operazione, nessun refactor). Il rischio reale: chi scopre un URL leggibile in transit vede slide caroselli di altri clienti.
   - **B** = privatizzare + signed URL al momento pubblicazione (refactor più ampio ma una volta sola, e siamo al momento giusto: 0 record DB da migrare). Mia raccomandazione.

2. **Bucket fantasma da droppare**: `brand-photos`, `generated-images`, `media-uploads`, `thumbnails`, `workspace-logos`, `media`, `templates`. Sono 7 bucket non usati dal codice. Confermi che li droppo?

3. **`user-photos`, `story-templates` privatizzo subito**: il flip a private è zero-rischio (0 file), serve solo aggiornare `getPublicUrl → createSignedUrl` in 4 callsite. Confermi?

Quando approvi, parto subito da Step 2 (policy stringere) → Step 3 (codice signed URL) → Step 4 (flip) → Step 5 (L3 `carousel_image_logs`) → Step 6 (verifica).
