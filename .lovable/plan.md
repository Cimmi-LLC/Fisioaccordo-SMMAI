
# Fix Redirect URI Meta OAuth

## Problema
Il codice usa `window.location.origin` per costruire il redirect URI. Quando si testa dalla preview di Lovable, l'origin e' l'URL di preview (diverso da quello configurato su Meta), causando l'errore "URL bloccato".

## Soluzione
Hardcodare il redirect URI nel `metaService.ts` con l'URL pubblicato, che corrisponde a quello configurato nelle impostazioni di Facebook Login.

## Modifiche

### 1. `src/services/metaService.ts`
- Cambiare la riga `REDIRECT_URI` da:
  `window.location.origin + '/auth/instagram/callback'`
  a:
  `'https://social-generator-fisioaccordo.lovable.app/auth/instagram/callback'`

### Dettagli tecnici
- Solo 1 file da modificare
- Nessuna dipendenza aggiuntiva
- Il redirect URI sara' fisso e corrispondera' sempre a quello configurato su Meta
