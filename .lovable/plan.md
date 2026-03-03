

## Checklist completo per approvazione Meta

### Stato attuale

| Elemento | Stato |
|----------|-------|
| Privacy Policy page (`/privacy`) | Codice OK, ma NON pubblicata |
| UI in inglese | Completata |
| Data Deletion Callback URL | MANCANTE |
| Terms of Service page | MANCANTE |

---

### Cosa serve fare

#### 1. RIPUBBLICARE L'APP (urgente, 0 codice)

La pagina `/privacy` esiste nel codice ma il sito pubblicato non e' stato aggiornato. Per questo Meta vede un 404.

**Azione**: Clicca il pulsante "Publish" -> "Update" in alto a destra nell'editor Lovable. Dopo la pubblicazione, verifica che `https://social-generator-fisioaccordo.lovable.app/privacy` funzioni in una finestra in incognito.

#### 2. Creare Data Deletion Callback endpoint

Meta richiede obbligatoriamente un endpoint che gestisca le richieste di cancellazione dati degli utenti. Quando un utente rimuove la tua app dalle impostazioni Facebook, Meta chiama questo URL.

**Nuovo file: `supabase/functions/meta-data-deletion/index.ts`**

Edge function che:
- Riceve la richiesta di cancellazione firmata da Meta
- Verifica la firma HMAC con l'App Secret
- Cancella i dati dell'utente dalla tabella `meta_connections`
- Restituisce un JSON con `url` (link di conferma) e `confirmation_code`

**Nuova pagina: `src/pages/DeletionStatus.tsx`**

Pagina semplice che mostra lo stato della richiesta di cancellazione (Meta richiede un URL di conferma visibile all'utente).

**Modifica: `src/App.tsx`**

Aggiungere route `/deletion-status` prima del catch-all.

#### 3. Creare pagina Terms of Service

Meta richiede anche un link ai Terms of Service nelle impostazioni dell'app.

**Nuovo file: `src/pages/Terms.tsx`**

Pagina statica con termini d'uso base:
- Descrizione del servizio
- Requisiti per l'uso (account Instagram Business)
- Limitazioni di responsabilita'
- Proprieta' intellettuale (Cimmi LLC)

**Modifica: `src/App.tsx`**

Aggiungere route `/terms`.

**Modifica: footer** (Index.tsx e Auth.tsx)

Aggiungere link "Terms of Service" accanto a "Privacy Policy".

---

### Dopo le modifiche al codice

1. **Ripubblicare** l'app
2. **Nelle impostazioni Meta Developer**:
   - Privacy Policy URL: `https://social-generator-fisioaccordo.lovable.app/privacy`
   - Terms of Service URL: `https://social-generator-fisioaccordo.lovable.app/terms`
   - Data Deletion Request URL: `https://<supabase-project-url>/functions/v1/meta-data-deletion`
3. Verificare tutti gli URL in incognito
4. Registrare il nuovo screencast con i 5 passaggi richiesti
5. Risubmettere

### Dettagli tecnici

**Data Deletion Callback** (formato richiesto da Meta):

La funzione deve restituire:
```text
{
  "url": "https://social-generator-fisioaccordo.lovable.app/deletion-status?id=abc123",
  "confirmation_code": "abc123"
}
```

Meta invia un POST con `signed_request` (base64url encoded, firmato HMAC-SHA256 con App Secret). La funzione deve decodificare e verificare prima di procedere.

**Riepilogo file**:
- 1 nuova edge function (`meta-data-deletion`)
- 2 nuove pagine (`Terms.tsx`, `DeletionStatus.tsx`)
- 3 file modificati (`App.tsx`, `Index.tsx` footer, `Auth.tsx` footer)

