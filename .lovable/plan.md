
## Problema identificato

L'account è confermato e attivo (ultimo accesso 23/03). La password inserita (`germain2002`) è semplicemente errata. Il problema UX è che il toast sparisce in 3 secondi e l'utente non vede l'invito a usare "Password dimenticata?".

## Fix

**`src/pages/Auth.tsx`** — sostituire il toast di errore con un banner inline persistente che:
- Mostra il messaggio di errore direttamente sotto i campi (non scompare)
- Include un bottone "Reimposta Password" che apre direttamente il dialog "Password dimenticata"
- Include anche un link secondario "Reinvia email di conferma" per coprire l'altro caso

### Stato aggiunto
```ts
const [loginError, setLoginError] = useState<'invalid_credentials' | 'email_not_confirmed' | null>(null);
```

### Logica `handleSignIn` aggiornata
- Invece di `toast(...)` per `invalid_credentials` → `setLoginError('invalid_credentials')`
- Reset `loginError` quando l'utente modifica email/password
- Il banner persiste finché l'utente non riprova o modifica i campi

### Banner inline (tra il bottone login e i link inferiori)
```
┌─────────────────────────────────────────┐
│  Password non corretta                  │
│  [Reimposta Password →]                 │
│  Oppure: Reinvia email di conferma      │
└─────────────────────────────────────────┘
```
- Background `var(--rosa-dim)`, border `rgba(230,0,126,0.2)`
- Bottone "Reimposta Password" apre direttamente il dialog forgot password
- Link "Reinvia email di conferma" chiama `supabase.auth.resend`

### File modificati
- `src/pages/Auth.tsx` — sostituire toast con banner inline + auto-open forgot password
