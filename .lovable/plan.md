

## Blocco account Instagram personali + guida conversione

### Cosa cambia

Quando un utente prova a collegare un account Instagram **personale** (non Business/Creator), il sistema:
1. Rileva il tipo di account dalla risposta API (`account_type`)
2. Blocca il salvataggio della connessione
3. Mostra un messaggio chiaro con istruzioni per convertire l'account

### Modifiche tecniche

**File 1: `supabase/functions/meta-auth/index.ts`**

Dopo lo Step 3 (profilo), aggiungere un controllo sul tipo di account:

```text
// Dopo aver ottenuto accountType (riga ~109)
if (accountType === 'PERSONAL') {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Account Instagram personale non supportato. Converti il tuo account in Business o Creator dalle impostazioni di Instagram, poi riprova.',
      error_type: 'PERSONAL_ACCOUNT'
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

Se il profilo non e' raggiungibile (errore API), il sistema continuera' a salvare come oggi (fallback sicuro per Business/Creator che hanno permessi corretti).

**File 2: `src/components/MetaConnection.tsx`**

Migliorare la sezione "Requisiti" con una guida chiara:

```text
<div className="text-xs text-muted-foreground space-y-1">
  <p className="font-medium">Requisiti:</p>
  <ol className="list-decimal list-inside space-y-0.5">
    <li>Account Instagram Business o Creator</li>
    <li>Se hai un account personale, convertilo:
      Impostazioni > Account > Passa a un account professionale</li>
  </ol>
</div>
```

**File 3: `src/pages/InstagramCallback.tsx`**

Gestire il nuovo `error_type: 'PERSONAL_ACCOUNT'` per mostrare un toast specifico con istruzioni di conversione, invece del messaggio di errore generico.

### Risultato

- Account personali: errore chiaro con istruzioni di conversione
- Account Business/Creator: funzionano normalmente
- Se l'API non risponde: fallback al comportamento attuale (nessun blocco)

