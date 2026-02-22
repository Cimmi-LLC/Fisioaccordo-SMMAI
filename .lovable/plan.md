

## Fix: Rendere il profile fetch (Step 3) non bloccante

### Il problema (confermato dallo screenshot)

L'errore "Edge Function returned a non-2xx status code" arriva perche' le righe 92-98 di `meta-auth/index.ts` trattano il fallimento del profile fetch come errore fatale, restituendo status 400. La connessione non viene mai salvata nel database.

### La modifica

**File: `supabase/functions/meta-auth/index.ts`** (righe 86-101)

Wrappare lo Step 3 in un try/catch e usare valori di default se fallisce:

```text
// Step 3: Get Instagram user profile (best effort - non-blocking)
let igUsername = null
let igBusinessId = instagramUserId  // dal Step 1, sempre disponibile
let accountType = 'BUSINESS'

try {
  const profileRes = await fetch(
    `https://graph.instagram.com/v21.0/me?fields=user_id,username,account_type,name&access_token=${finalToken}`
  )
  const profileData = await profileRes.json()

  if (profileData.error) {
    console.warn('Profile fetch fallito, salvo senza username:', profileData.error.message)
  } else {
    igUsername = profileData.username || null
    igBusinessId = instagramUserId || profileData.user_id?.toString() || profileData.id
    accountType = profileData.account_type || 'BUSINESS'
    console.log('Profilo ottenuto:', igUsername, accountType)
  }
} catch (e) {
  console.warn('Profile fetch exception, salvo senza username:', e.message)
}

// Step 4 procede SEMPRE con igBusinessId e igUsername (anche se null)
```

Il resto del codice (Step 4, salvataggio DB) resta identico, usa `igBusinessId` e `igUsername` gia' definiti sopra.

Aggiornare anche la risposta finale per includere `accountType`:

```text
return new Response(
  JSON.stringify({
    success: true,
    instagram_username: igUsername,
    account_type: accountType,
    token_type: tokenType
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
)
```

### Risultato

- La connessione viene salvata SEMPRE (con o senza username)
- L'utente vede "Collegato" nell'app
- La pubblicazione funziona perche' il token e' valido
- Se il profilo non viene caricato, l'username sara' null (mostra solo "Collegato" senza @username)
