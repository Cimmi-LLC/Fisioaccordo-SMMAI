# AUDIT RLS — Fase 1 Sprint 1

Data: 2026-06-07
Scope: stato reale a runtime del database `cktdoqvyyvjlkpahbjyi` (production)
Sorgenti: `pg_tables.rowsecurity`, `pg_policies`, `storage.buckets`, `storage.objects` policies + analisi statica di `supabase/migrations/`

---

## TL;DR — Tre falle aperte da chiudere SUBITO

| # | Cosa | Impatto reale | Gravità |
|---|---|---|---|
| L1 | **Bucket Storage `user-photos`, `brand-photos`, `story-templates`, `generated-images`, `media-uploads`, `thumbnails`, `workspace-logos` configurati `public=true`** | URL prevedibili: chiunque (senza login) può scaricare foto pazienti, foto del brand di TUTTI i clienti, immagini generate, ecc. di tutti i clienti dell'agenzia. **Esposizione massa**. | 🔴 CRITICA |
| L2 | **Policy SELECT su `user-photos`/`brand-photos`/`story-templates` non filtra per folder owner** | Anche se il bucket fosse privato, qualsiasi utente *autenticato* potrebbe scaricare i file di TUTTI gli altri utenti perché la `USING` controlla solo `bucket_id`, non `(storage.foldername(name))[1] = auth.uid()::text`. **Leak cross-customer**. | 🔴 CRITICA |
| L3 | **`carousel_image_logs` INSERT con `WITH CHECK: true`** | Qualsiasi utente autenticato può inserire log con `user_id` arbitrario (data poisoning, falsificazione attività). Non è data leak ma è data integrity. | 🟡 MEDIA |

Tutto il resto è OK o cosmetico. Niente policy `USING (true)` sulle tabelle dati e tutte le 27 tabelle hanno RLS attiva.

---

## 1. Mappa completa — tutte le 27 tabelle in `public`

Stato RLS verificato a runtime. Tutte le tabelle hanno `rowsecurity = true`. **Nessuna tabella con RLS spenta**.

### Tabelle CORE (effettivamente usate dal codice)

| Tabella | Tenancy column | Policy count | SELECT policy | INSERT policy | UPDATE policy | DELETE policy | Permissiva? | Rischio |
|---|---|---|---|---|---|---|---|---|
| `brands` | user_id | 4 | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | No | 🟢 Basso |
| `brand_photos` | user_id + brand_id | 4 | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | No | 🟢 Basso |
| `meta_connections` | user_id | 4 | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | No | 🟢 Basso |
| `instagram_connections` | user_id | 4 | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | No | 🟢 Basso (vecchia, sostituita da meta_connections) |
| `published_posts` | user_id | **3** | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | **❌ MANCA** | No | 🟡 Medio (UX: utenti non possono cancellare i propri post) |
| `generated_contents` | user_id | 4 | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | No | 🟢 Basso |
| `generated_story_batches` | user_id + brand_id | **3** | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | ❌ Manca (intenzionale?) | `auth.uid() = user_id` ✅ | No | 🟢 Basso |
| `generation_history` | user_id + brand_id | **2** | `auth.uid() = user_id` ✅ | ❌ Manca (service_role only) | ❌ Manca | `auth.uid() = user_id` ✅ | No | 🟢 Basso (insert via edge fn con service_role — voluto) |
| `competitor_analysis` | user_id | **3** | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | ❌ Manca (intenzionale?) | `auth.uid() = user_id` ✅ | No | 🟢 Basso |
| `viral_analysis` | user_id | **3** | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | ❌ Manca (intenzionale?) | `auth.uid() = user_id` ✅ | No | 🟢 Basso |
| `trending_topics` | user_id | **3** | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | ❌ Manca (intenzionale?) | `auth.uid() = user_id` ✅ | No | 🟢 Basso |
| `user_photos` | user_id | 4 | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | No | 🟢 Basso |
| `user_settings` | user_id | **3** | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | ❌ Manca | No | 🟢 Basso (delete=cascade da auth.users) |
| `canva_templates` | user_id | 5 | `auth.uid() = user_id` OR `is_default = true` ⚠️ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | OK (la condizione `is_default` è voluta per template pubblici) | 🟢 Basso |
| `google_calendar_connections` | user_id | 4 | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | `auth.uid() = user_id` ✅ | No | 🟢 Basso |
| `api_rate_limits` | user_id | **0** | RLS attivo + 0 policy = blocco totale per utenti | ❌ | ❌ | ❌ | No | 🟢 Basso (solo service_role la usa — voluto) |
| `carousel_image_logs` | user_id | **2** | `auth.uid() = user_id` ✅ | **`WITH CHECK: true`** 🔴 | ❌ Manca | ❌ Manca | **SÌ (insert poison)** | 🟡 Medio |
| `profiles` | id = user_id | **3** | `auth.uid() = id` ✅ | `auth.uid() = id` (policy *erroneamente* chiamata "Users can update own profile") ⚠️ | `auth.uid() = id` ✅ | ❌ Manca | No | 🟢 Basso (cosmetico: rinominare policy) |

### Tabelle FANTASMA (non usate dal codice — 0 referenze in `src/` e `supabase/functions/`)

Queste 9 tabelle esistono nel DB ma **non hanno alcun riferimento nel codice**. Probabilmente create da una piattaforma low-code (es. Lovable) o esperimenti mai integrati. Espandono inutilmente la superficie d'attacco e i costi di backup.

| Tabella | Tenancy | Policy presenti | Filtro davvero per utente? | Permissiva? | Rischio | Note |
|---|---|---|---|---|---|---|
| `workspaces` | owner_id | 4 (S/I/U/D) | Sì: `owner_id = auth.uid()` per CRUD, SELECT include `is_workspace_member(id)` ✅ | No | 🟢 Basso ma inutile | Tabella fantasma |
| `workspace_members` | user_id + workspace_id | 4 (S/I/U/D) | Sì: `is_workspace_admin(workspace_id)` per writes, `is_workspace_member(workspace_id)` per read | No | 🟢 Basso ma inutile | Tabella fantasma |
| `content_items` | workspace_id | 4 (S/I/U/D) | Sì: `is_workspace_member(workspace_id)` per S/I/U, `is_workspace_admin` per D | No | 🟢 Basso ma inutile | Tabella fantasma |
| `editorial_plans` | workspace_id | 4 | Idem | No | 🟢 Basso ma inutile | Tabella fantasma |
| `ai_generations_log` | workspace_id | 2 (S/I) | `is_workspace_member(workspace_id)` per S/I | No | 🟢 Basso ma inutile | Tabella fantasma |
| `strategies` | workspace_id | 4 | Idem | No | 🟢 Basso ma inutile | Tabella fantasma |
| `video_scripts` | workspace_id | 4 | Idem | No | 🟢 Basso ma inutile | Tabella fantasma |
| `graphic_concepts` | workspace_id | 4 | Idem | No | 🟢 Basso ma inutile | Tabella fantasma |
| `graphic_templates` | workspace_id | 4 | `is_global = true` OR membership ⚠️ | No (la branca `is_global` è voluta) | 🟢 Basso ma inutile | Tabella fantasma |

**Funzioni helper `is_workspace_member` / `is_workspace_admin`** — verificate live: sono `SECURITY DEFINER` e fanno correttamente `auth.uid()` lookup su `workspace_members`/`workspaces.owner_id`. Non hanno bug logici. Quindi le tabelle "workspace" sono ben isolate, semplicemente **inutilizzate**.

---

## 2. STORAGE buckets — 🔴 ECCO LA FALLA VERA

Il database tabellare è ben fatto. Il vero problema è negli **storage buckets**.

### 2.1 Buckets configurati `public=true`

| Bucket | Public? | Contenuto | Rischio |
|---|---|---|---|
| `user-photos` | **🔴 TRUE** | Foto caricate dagli utenti (potenzialmente foto pazienti, anche se la procedura prevede di non caricarne) | 🔴 CRITICO |
| `brand-photos` | **🔴 TRUE** | Foto dello studio del cliente (interni, staff, attrezzature) | 🔴 CRITICO |
| `story-templates` | **🔴 TRUE** | Template storie caricate dagli utenti | 🔴 ALTO |
| `generated-images` | **🔴 TRUE** | Immagini generate dall'AI per i caroselli/storie | 🟡 MEDIO (sono asset usciti, ma indicizzabili pubblicamente) |
| `media-uploads` | **🔴 TRUE** | Upload media vari | 🟡 MEDIO |
| `thumbnails` | **🔴 TRUE** | Thumbnail | 🟡 MEDIO |
| `workspace-logos` | **🔴 TRUE** | Logo dei clienti | 🟡 MEDIO (logo solitamente è pubblico ma su URL prevedibile = problematico) |
| `carousel-images` | **🟢 TRUE** | Immagini Pixabay scaricate per i caroselli | ✅ OK (sono già pubbliche su Pixabay) |
| `media` | 🟢 FALSE | Media privati | ✅ OK |
| `templates` | 🟢 FALSE | Template privati | ✅ OK |
| `viral-uploads` | 🟢 FALSE | Video reel caricati per analisi viral | ✅ OK (creato da me oggi) |
| `brand-photos` | duplicato sopra | | |

**Cosa significa `public=true` in Supabase**:
- Le URL del tipo `https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>` **funzionano SENZA token**.
- Anche se le policy fossero strette, basta conoscere il path. Con bucket pubblico le URL sono prevedibili (`/<user_id>/<timestamp>.jpg`) e ENUMERABLE (un attaccante scarica gli ID utente da `profiles` e prova path).

**PoC d'attacco realistico**:
1. Attaccante si registra come utente normale
2. Carica una foto nel proprio bucket `user-photos` → ottiene URL `…/public/user-photos/<his_uuid>/123.jpg`
3. Sa che il pattern è `/<uuid>/<timestamp>.<ext>`
4. Itera su tutti gli UUID che riesce a trovare (da `published_posts.user_id` leakato in un altro modo, da Sentry, da log Vercel) e prova URL
5. Scarica foto di clienti altrui

### 2.2 Policy SELECT permissive sui bucket privati

Anche se mettessi `public=false` su `user-photos`, le policy attuali non basterebbero:

```sql
-- POLICY ATTUALE su user-photos:
[SELECT] "Users can view their own stored photos"
  USING: bucket_id = 'user-photos'  ❌ MANCA il filtro per folder

-- DOVREBBE ESSERE:
[SELECT] "Users can view their own stored photos"
  USING: bucket_id = 'user-photos' AND (storage.foldername(name))[1] = auth.uid()::text
```

Stesso problema su `brand-photos read public`, `story templates: read public`, e tutti i `*_select` workspace-based che fanno solo `bucket_id = '...'`.

Confronta col bucket che ho creato io oggi per `viral-uploads` (che è scritto correttamente):

```sql
[ALL] "viral_uploads_owner_all"
  USING:      bucket_id = 'viral-uploads' AND (storage.foldername(name))[1] = auth.uid()::text
  WITH CHECK: bucket_id = 'viral-uploads' AND (storage.foldername(name))[1] = auth.uid()::text
```

Questo è il pattern giusto. Va replicato su tutti gli altri bucket dati.

### 2.3 Riepilogo Storage

| Bucket | `public=true` problema? | Policy SELECT filtra per owner? | Azione richiesta |
|---|---|---|---|
| `user-photos` | 🔴 SÌ | ❌ Solo `bucket_id` | Public→false + policy folder-owner |
| `brand-photos` | 🔴 SÌ | ❌ Solo `bucket_id` | Public→false + policy folder-owner |
| `story-templates` | 🔴 SÌ | ❌ Solo `bucket_id` | Public→false + policy folder-owner |
| `generated-images` | 🟡 SÌ | ❌ Solo `bucket_id` | Valutare se pubblici (per CDN delivery dei caroselli) o privati con signed URL |
| `media-uploads` | 🟡 SÌ | ❌ Solo `bucket_id` (e `auth.uid() IS NOT NULL`) | Public→false + policy folder-owner |
| `thumbnails` | 🟡 SÌ | ❌ Solo `bucket_id` | Public→false (o tenere pubblici se sono per OG image) |
| `workspace-logos` | 🟡 SÌ | ❌ Solo `bucket_id` | Da decidere (logo del cliente è solitamente OK pubblico) |
| `carousel-images` | ✅ Voluto | ❌ Solo `bucket_id` | OK così (Pixabay già pubblico) |
| `viral-uploads` | ✅ Privato | ✅ Folder-owner | Già OK |

---

## 3. Confronto statico (migration) ↔ runtime — DIVERGENZE

Tabelle e policy che esistono **a runtime** ma **NON sono nelle migration files**:

| Categoria | Elementi | Provenienza presumibile |
|---|---|---|
| Tabelle | `ai_generations_log`, `carousel_image_logs`, `content_items`, `editorial_plans`, `google_calendar_connections`, `graphic_concepts`, `graphic_templates`, `profiles`, `strategies`, `video_scripts`, `workspace_members`, `workspaces` (12 tabelle) | Create direttamente dalla dashboard Supabase, possibilmente dalla piattaforma Lovable in passato |
| Funzioni | `is_workspace_member`, `is_workspace_admin` | Idem |
| Buckets | `media`, `media-uploads`, `templates`, `workspace-logos`, `graphic-templates`, `thumbnails`, `generated-images`, `story-templates`, `brand-photos` | Idem |
| Policy storage | 28 policy su `storage.objects` (su 33 totali) | Mix di dashboard + migration |

**Implicazione operativa**: se replichi il DB con `supabase db reset` o lo cloni in staging, **perdi tutta questa roba**. Il codice come è scritto adesso non usa le tabelle workspace, ma altre tabelle (es. `carousel_image_logs`, `google_calendar_connections`) sono effettivamente in uso. Vanno tracciate.

---

## 4. Falle aperte da chiudere — priorità

### 🔴 L1 — Buckets pubblici (CRITICO)

Cambiare `public` a `false` su:
- `user-photos`
- `brand-photos`
- `story-templates`
- `media-uploads`
- `thumbnails` (se usati per delivery dei caroselli Instagram pubblicati, lasciare pubblico ma rivedere policy SELECT)
- `generated-images` (idem)
- `workspace-logos` (idem)

**Effetto collaterale**: tutto il codice frontend che oggi usa `getPublicUrl()` smette di funzionare per quei bucket. Va sostituito con `createSignedUrl(path, 3600)`.

### 🔴 L2 — Policy SELECT permissive sui bucket privati (CRITICO)

Per ogni bucket "dati di per-user", la policy SELECT/INSERT/DELETE deve avere il pattern:

```sql
USING (bucket_id = '<name>' AND (storage.foldername(name))[1] = auth.uid()::text)
```

Bucket interessati: `user-photos`, `brand-photos`, `story-templates`, `media-uploads`, `thumbnails`, `generated-images`, `workspace-logos`.

### 🟡 L3 — `carousel_image_logs` INSERT con `WITH CHECK: true`

Cambiare la policy:
```sql
DROP POLICY "Users can insert their own logs" ON public.carousel_image_logs;
CREATE POLICY "users insert own carousel logs" ON public.carousel_image_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 🟢 L4 — Pulizia (non urgente)

- `published_posts` aggiungere policy DELETE
- `profiles` rinominare la policy "Users can update own profile" → "Users can insert own profile"
- 9 tabelle fantasma workspace: droppare o documentare l'uso futuro
- Backfill delle migration per le 12 tabelle create da dashboard

---

## Cosa NON è un problema (verificato)

- Tutte le 27 tabelle hanno RLS abilitata ✅
- Nessuna policy con `USING (true)` sui dati (solo l'INSERT problematico su `carousel_image_logs` con `WITH CHECK: true`) ✅
- Le funzioni `is_workspace_member`/`is_workspace_admin` sono ben scritte (SECURITY DEFINER + auth.uid()) ✅
- `meta_connections` (token Meta cifrati) → policy stretta su user_id ✅
- `brands` → policy stretta su user_id ✅
- Nessuna RLS spenta sul DB ✅
- `viral-uploads` bucket creato oggi → policy corretta ✅

---

## Stop richiesto

Come da brief: ho finito Fase 1. Aspetto il tuo OK prima di proporre/eseguire i fix.

Domanda operativa: prima di toccare codice mi serve confermare 2 cose con te.

1. **`public=true` sui bucket**: la mia raccomandazione è privatizzarli + signed URL. Però se i caroselli pubblicati su Instagram usano URL `getPublicUrl()` di `generated-images`, romperebbe la pubblicazione. Vediamo insieme se `generated-images` è davvero usato come URL pubblica per Instagram (probabile) o solo internamente. Posso verificarlo io grep-pando il codice quando dai OK.

2. **9 tabelle fantasma workspace**: confermi che NON le usi e posso droppare in un secondo step? Oppure preferisci che le tenga per non interrompere lavori futuri?

Quando hai validato, partiamo dalla Fase 2 (auth + rate limit) — ma direi che L1+L2 da questo audit devono andare PRIMA, perché sono leak attivi sui dati dei clienti. Più grave di chi può chiamare `analyze-brand`.
