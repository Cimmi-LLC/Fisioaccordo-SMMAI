

# Fix Upload Template + Template Owner Visibili a Tutti

## Problema 1: Upload fallisce
Il percorso di upload e `templates/{user_id}/file.png` ma la policy RLS dello storage richiede che la **prima cartella** sia l'ID utente: `{user_id}/file.png`. Quindi l'upload viene bloccato silenziosamente.

**Fix:** Cambiare il percorso da `templates/${user.id}/...` a `${user.id}/templates/...`

## Problema 2: I tuoi template non sono visibili a tutti
Quando carichi un template, viene salvato con `is_default = false`. Per renderlo visibile a tutti gli utenti, deve essere `is_default = true`.

**Fix:** Aggiungere un toggle "Rendi disponibile a tutti" nel `TemplateUploader`. Per identificare te come owner, useremo il tuo user ID hardcoded oppure un campo `account_type` dal profilo.

## Problema 3: Distinguere Owner da Utente normale
Dalla tabella `profiles` vedo che esiste il campo `account_type` con valore `'mother'`. Useremo questo: se l'utente ha `account_type = 'mother'`, puo scegliere di rendere i template di default (visibili a tutti).

## Modifiche

### 1. `TemplateUploader.tsx`
- Correggere il percorso storage: `${user.id}/templates/${timestamp}.png` (invece di `templates/${user.id}/...`)
- Aggiungere toggle "Rendi disponibile a tutti gli utenti" (visibile solo per account mother)
- Se il toggle e attivo, salvare con `is_default = true` e `user_id = null` (cosi la policy RLS "Anyone can view default templates" funziona)
- Verificare il tipo account con una query a `profiles`

### 2. `CanvaTemplateSelector.tsx`
- Nessuna modifica necessaria: gia carica template con `is_default = true` (per tutti) + template con `user_id = auth.uid()` (personali)

### File modificati
- `src/components/TemplateUploader.tsx` -- fix path storage + toggle owner

