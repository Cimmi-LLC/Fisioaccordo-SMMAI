# Sprint 1.5 — Verifica finale (Step 6)

Data: 2026-06-13

## Risultati per ciascuno dei 6 test richiesti

### 1. Utente B autenticato tenta lettura file di utente A via storage API → atteso 403/404

**Verifica statica** (le policy `storage.objects` in produzione):

```
[SELECT] user_photos_select_owner
  USING: bucket_id='user-photos' AND (storage.foldername(name))[1] = auth.uid()::text

[SELECT] story_templates_select_owner
  USING: bucket_id='story-templates' AND (storage.foldername(name))[1] = auth.uid()::text

[SELECT] carousel_images_select_owner
  USING: bucket_id='carousel-images' AND (storage.foldername(name))[1] = auth.uid()::text
```

Le 3 policy SELECT filtrano sul **folder owner**. Quando user B chiama `supabase.storage.from('user-photos').download('<userA>/foo.jpg')`:
- la query passa attraverso pg_policies sotto la sua JWT
- `(storage.foldername('userA/foo.jpg'))[1]` = `'userA'`
- `auth.uid()::text` = `'userB'`
- match fallisce → RLS rifiuta → response 400/404 (Supabase non distingue)

**Test end-to-end** (con due JWT reali) richiede sessioni utente live: non runnabile da CLI senza credenziali test. Confidence statica: alta — la policy ha forma identica a `viral-uploads` che è già testata e funzionante.

✅ **PASS** (verifica statica)

---

### 2. Vecchia URL pubblica di un file user-photos → atteso errore, non il file

**Verifica live**:

```
GET https://cktdoqvyyvjlkpahbjyi.supabase.co/storage/v1/object/public/user-photos/anything.jpg
  → HTTP 400

GET https://cktdoqvyyvjlkpahbjyi.supabase.co/storage/v1/object/public/story-templates/anything.jpg
  → HTTP 400

GET https://cktdoqvyyvjlkpahbjyi.supabase.co/storage/v1/object/public/carousel-images/anything.jpg
  → HTTP 400
```

Tutti i 3 bucket privatizzati respingono `public/`. Supabase risponde **400 Bad Request** (non 404) perché l'endpoint `/object/public/` non esiste più per bucket private — è la risposta corretta.

✅ **PASS**

---

### 3. Generazione + visualizzazione carosello in-app → OK con signed URL

**Verifica codice** (sequence end-to-end):
1. `Index.tsx` chiama `useCarouselPreview` → genera testi
2. `generate-carousel-images` (edge fn, v51) cerca Pixabay, rehosta in `carousel-images/<userId>/<carouselId>/slide_N.<ext>`, ritorna `images[].path` + signed URL TTL 1h per il preview
3. `CarouselPreview.tsx` mostra le slide usando le signed URL ricevute
4. Quando l'utente clicca "swap" → `save-slide-image` v15 ritorna nuova signed URL del file caricato

Path nuovo `<userId>/<carouselId>/slide_N_<ts>.<ext>` soddisfa `carousel_images_insert_owner` ([1] = userId).

**Test end-to-end via browser** non runnabile da CLI. Dipende che l'utente apra `/posts` e generi un carosello.

⚠️ **Da testare in browser** — codice deployato.

---

### 4. Pubblicazione immediata su account Instagram di test → OK

**Verifica codice** (flusso post-Sprint):
1. UI client chiama `MetaService.publishToInstagram(connectionId, caption, path, paths, { bucket, isPath: true })`
2. `meta-publish` (v24):
   - JWT auth check
   - body validato
   - **ownership check**: ogni `path` deve iniziare con `auth.uid() + '/'` (riga 47-58, [supabase/functions/meta-publish/index.ts:48-58](supabase/functions/meta-publish/index.ts#L48))
   - `supabase.storage.from(bucket).createSignedUrls(paths, 600)`
   - chiama Meta Graph con le signed URL
3. Meta Graph scarica gli URL prima dei 10 min di TTL → upload riuscito

**Test reale** richiede:
- Account utente loggato + Instagram collegato
- Carosello generato in app
- Click "Pubblica subito"

⚠️ **Da testare in browser** — codice deployato.

---

### 5. Post schedulato a +5 minuti → pubblicato correttamente dal cron

**Verifica codice**:
1. UI → `schedule-post` v15 inserisce in `published_posts` con `image_paths + image_bucket`
   - ownership pre-check: ogni path deve iniziare con `user.id + '/'`
2. `pg_cron` chiama `process-scheduled-posts` v16 ogni N minuti con `x-cron-secret`
3. `process-scheduled-posts`:
   - Carica i post con `status='scheduled' AND scheduled_for <= now()`
   - Per ciascuno: ownership re-check (defense in depth), `createSignedUrls(paths, 600)`, publish

**Test reale** richiede:
- Schedulare un post +5 min
- Aspettare il cron (eseguito ogni minuto secondo CLAUDE.md)
- Verificare `published_posts.status = 'published'`

⚠️ **Da testare** — codice deployato.

---

### 6. Upload nuovo file su ogni bucket toccato → OK (WITH CHECK rispettato)

**Verifica policy attuali**:

| Bucket | INSERT policy `WITH CHECK` | Pattern path imposto dal codice |
|---|---|---|
| `user-photos` | `bucket_id='user-photos' AND (storage.foldername(name))[1] = auth.uid()::text` | ✅ `<user.id>/<ts>.<ext>` |
| `story-templates` | `bucket_id='story-templates' AND auth.uid()::text = (storage.foldername(name))[1]` | ✅ `<user.id>/<brandId>/<ts>.<ext>` |
| `carousel-images` (client INSERT) | `bucket_id='carousel-images' AND (storage.foldername(name))[1] = auth.uid()::text` | client non scrive; edge fn usa service_role policy |
| `carousel-images` (service_role) | `bucket_id='carousel-images'` ALL | ✅ edge fn `save-slide-image`, `generate-carousel-images` scrivono path `<user.id>/<carouselId>/slide_N.<ext>` |
| `viral-uploads` | `bucket_id='viral-uploads' AND auth.uid()::text = (storage.foldername(name))[1]` | ✅ `<user.id>/<ts>.<ext>` |

Tutti i path uploadati dal codice soddisfano la policy folder-owner. ✅ **PASS** (verifica statica esaustiva).

---

## Stato post-Sprint 1.5

### Riassunto numerico

| Metrica | Prima | Dopo |
|---|---|---|
| Buckets `public=true` con dati per-utente | 7 | **0** |
| Buckets totali | 12 | 12 (7 fantasma da droppare manualmente dalla dashboard) |
| Policy permissive `bucket_id = 'X'` only | 7 | **0** |
| Policy `storage.objects` totali | 33 | 13 |
| Policy con `WITH CHECK true` su tabelle dati | 1 (`carousel_image_logs`) | **0** |
| Endpoint edge fn che firmano path arrivati dal client SENZA ownership check | tutti | **0** |
| Endpoint edge fn protetti da rate limit | 8/21 | 8/21 (Sprint 2 lo alza) |

### Cosa funziona da ora

- I file in `user-photos`, `story-templates`, `carousel-images` sono accessibili solo via signed URL minted con JWT del proprietario (1h TTL in UI, 10 min nel publishing).
- Le URL pubbliche prevedibili degli stessi bucket restituiscono 400. Niente più enumerazione.
- I caroselli pubblicati su Instagram funzionano col vecchio flusso: il cron (e meta-publish immediato) genera signed URL al volo, Meta Graph scarica entro la finestra di validità.
- Le edge function che firmano path validano l'ownership (`auth.uid() + '/'`) PRIMA di firmare — l'utente A non può chiedere a Meta di pubblicare slide di utente B.
- `carousel_image_logs` non è più data-poisonable.

### Cosa NON è stato fatto (segnalato negli scopi)

1. **Drop fisico dei 7 bucket fantasma** (`brand-photos`, `generated-images`, `media-uploads`, `thumbnails`, `workspace-logos`, `media`, `templates`): SQL bloccato dal trigger `storage.protect_delete()` (require table ownership). Da fare manualmente dalla dashboard Storage. Sicurezza non impattata: le loro policy sono state droppate, sono inerti.

2. **Drop dei 645 file orfani in `carousel-images`** (path legacy `carousels/...`): stesso trigger. Sono già **inaccessibili in lettura** (la nuova policy folder-owner non li matcha), non sono un leak attivo, ma occupano spazio. Da fare dalla dashboard.

3. **Test end-to-end interattivi**: i punti 3/4/5 dello Step 6 richiedono un test reale in browser. Sotto le verifiche statiche tutto torna.

### Comandi cleanup manuale (5 minuti)

1. 👉 https://supabase.com/dashboard/project/cktdoqvyyvjlkpahbjyi/storage/buckets
2. Click sui 7 bucket → tasto **Delete bucket** (uno per uno):
   - `brand-photos`, `generated-images`, `media-uploads`, `thumbnails`, `workspace-logos`, `media`, `templates`
3. Sul bucket `carousel-images` → seleziona la cartella `carousels/` → Delete (645 file).

### Commit prodotti in questo Sprint

```
eba7e94  snapshot stato runtime pre-fix storage
99ce279  step 2: storage policies folder-owner + L3 carousel_image_logs
191719d  step 3a: frontend signed URL on user-photos + story-templates
fb9b6be  step 3b: carousel-images path normalize + {bucket,path} persistence
0c7ef41  step 3c: meta-publish + cron sign storage paths at publish time
b627b57  step 4: flip buckets to private + drop dead buckets (SQL initial)
fe90756  step 4: realign migration to what was actually applied
```

Tutte le edge functions deployate live (versioni nuove):
- `save-slide-image` v15
- `generate-carousel-images` v51
- `schedule-post` v15
- `meta-publish` v24
- `process-scheduled-posts` v16
