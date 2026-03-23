
## Fix Sistema Login / Registrazione

### Problemi identificati

1. **Ordine listener errato** in `AuthContext.tsx`: `onAuthStateChange` e `getSession()` vengono chiamati quasi in parallelo. Le best practice Supabase richiedono che il listener venga impostato PRIMA di chiamare `getSession()`, altrimenti eventi come `SIGNED_IN` post-conferma email possono essere persi.

2. **Nessun feedback post-registrazione**: dopo il signup, l'utente vede solo un toast "controlla la tua email" ma la UI rimane sul form. Se l'utente ricarica la pagina o chiude il browser, non sa cosa fare. Serve uno stato "email inviata" con istruzioni chiare.

3. **Sessione non persistente esplicitamente**: `createClient` usa di default `localStorage` ma senza `autoRefreshToken: true` e `persistSession: true` espliciti, in alcuni browser/contesti la sessione si perde.

4. **Nessun auto-redirect dopo conferma email**: quando l'utente clicca sul link di conferma, il `emailRedirectTo` punta a `/` ma l'`AuthContext` potrebbe non intercettare l'evento `SIGNED_IN` se il listener non è attivo nel momento giusto.

5. **Messaggio errore login generico**: `invalid_credentials` viene mostrato con un messaggio che menziona "Password dimenticata?" ma non distingue tra "email non confermata" e "password errata".

### Modifiche

**1. `src/integrations/supabase/client.ts`**
- Aggiungere `auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }` al `createClient`

**2. `src/contexts/AuthContext.tsx`**
- Correggere l'ordine: impostare `onAuthStateChange` PRIMA di chiamare `getSession()`
- Rimuovere la chiamata duplicata a `setLoading(false)` — affidarsi solo al listener
- Gestire esplicitamente gli eventi `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`

**3. `src/pages/Auth.tsx`**
- Dopo signup riuscito: mostrare uno **stato "email inviata"** inline (niente più form, solo un pannello con istruzioni e bottone "Torna al Login")
- Gestire l'errore Supabase `email_not_confirmed` con un messaggio specifico: "Email non ancora confermata. Controlla la tua casella di posta."
- Aggiungere un bottone **"Reinvia email di conferma"** se il login fallisce per email non confermata (via `supabase.auth.resend`)

### File modificati
- `src/integrations/supabase/client.ts` — persistenza sessione
- `src/contexts/AuthContext.tsx` — ordine corretto listener + getSession
- `src/pages/Auth.tsx` — stato post-signup + gestione errore email non confermata + resend
