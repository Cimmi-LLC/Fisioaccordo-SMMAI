

## Aggiornamento UI: Unificare e correggere i componenti di connessione Instagram

### Problema attuale
La pagina mostra **due sezioni di connessione separate**:
1. "Connessione Social" (MetaConnection) - con testo "Collega con Facebook" e requisiti Facebook
2. "Collega il tuo Account Instagram Business" (InstagramConnection) - vecchio componente

Entrambi sono obsoleti rispetto al nuovo flusso OAuth Instagram Platform API.

### Modifiche

#### 1. Aggiornare `MetaConnection.tsx` - Testi e icone corretti
- Cambiare il bottone da "Collega con Facebook" a "Collega Instagram Business"
- Sostituire icona Facebook con icona Instagram (rosa/viola)
- Aggiornare la descrizione: rimuovere riferimenti a Facebook
- Aggiornare i requisiti: solo "Account Instagram Business o Creator" (la pagina Facebook non serve piu con la nuova API)
- Cambiare il gradiente del bottone da blu (Facebook) a rosa/viola (Instagram)

#### 2. Rimuovere `InstagramConnection` dalla pagina
- In `Index.tsx`: rimuovere il componente `InstagramConnection` che e duplicato e usa il vecchio servizio
- Tenere solo `MetaConnection` come unico punto di connessione

### Dettagli tecnici

**`src/components/MetaConnection.tsx`**:
- Riga 5: rimuovere import `Facebook`, tenere `Instagram`
- Riga 111: cambiare descrizione in "Collega il tuo account Instagram Business per pubblicare direttamente."
- Righe 114-125: cambiare bottone - gradiente rosa/viola, icona Instagram, testo "Collega Instagram Business"
- Righe 127-134: aggiornare requisiti - solo "Account Instagram Business o Creator"
- Righe 84-88: rimuovere sezione Facebook page name (non applicabile)

**`src/pages/Index.tsx`**:
- Rimuovere import e rendering di `InstagramConnection`
