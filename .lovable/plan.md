

## Fix definitivo: Token short-lived e connessione scaduta

### Causa radice

Il problema principale NON e' il formato della richiesta (gia' fixato con form-urlencoded). Il problema e':

1. **Lo scambio long-lived token usa GET invece di POST** in `meta-auth/index.ts` (riga 66-68). L'API Instagram richiede POST per `ig_exchange_token`. Il GET fallisce silenziosamente, il sistema usa il token short-lived (1 ora), che scade subito.

2. **La connessione scaduta `dff701c2` e' ancora `is_active: true`** nel database. Anche se il filtro client-side dovrebbe escluderla, e' meglio pulirla.

3. **L'utente dovra' ricollegarsi** dopo il fix per ottenere un token long-lived (60 giorni).

### Modifiche tecniche

**File 1: `supabase/functions/meta-auth/index.ts`**

Cambiare lo scambio long-lived token da GET a POST (riga 65-68):

```
// PRIMA (fallisce):
const longLivedRes = await fetch(
  `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`
)

// DOPO (corretto):
const longLivedRes = await fetch('https://graph.instagram.com/access_token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: appSecret,
    access_token: shortLivedToken
  })
})
```

**File 2: Pulizia database**

Disattivare la connessione scaduta `dff701c2` direttamente:
```sql
UPDATE meta_connections SET is_active = false WHERE id = 'dff701c2-c866-4b4e-9dd5-e5608705d176';
```

**File 3: `supabase/functions/meta-publish/index.ts`**

Aggiungere un controllo server-side per token scaduti (non fidarsi solo del client):

```
// Dopo aver recuperato la connessione, verificare scadenza token
if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
  return errorResponse('Token scaduto. Riconnetti Instagram dalle impostazioni.', 401)
}
```

**Deploy e ri-deploy**: Entrambe le edge functions `meta-auth` e `meta-publish` verranno deployate.

### Dopo il fix

L'utente dovra':
1. Scollegare Instagram dalle impostazioni
2. Ricollegare Instagram — questa volta ottenendo un token long-lived (60 giorni)
3. Provare a pubblicare

### Risultato

- Token long-lived (60 giorni invece di 1 ora)
- Connessioni scadute bloccate sia lato client che server
- La pubblicazione funzionera' stabilmente

