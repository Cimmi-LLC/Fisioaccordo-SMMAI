

## Fix: Generazione contenuto (errore 402) + Collegamento Instagram

### Problema 1: Generazione contenuto - Errore 402 (Crediti AI esauriti)

I log mostrano che TUTTE le chiamate a `generate-content` restituiscono **402 (Payment Required)**. I crediti AI del workspace Lovable sono esauriti.

Il codice nell'edge function gestisce correttamente il 402, ma il frontend in `useContentGeneration.ts` ha un bug: quando `supabase.functions.invoke()` riceve una risposta non-2xx, mette l'errore generico "Edge Function returned a non-2xx status code" in `error`, mentre il messaggio reale ("Crediti AI esauriti") finisce in `data.error`. Il codice attuale controlla `error` PRIMA di `data.error`, quindi mostra sempre il messaggio generico.

**Fix in `useContentGeneration.ts`**: Controllare `data?.error` PRIMA di `error`, in modo da mostrare il messaggio specifico (es. "Crediti AI esauriti. Aggiungi crediti al workspace.").

```text
// Prima (bug - mostra errore generico):
if (error) throw new Error(error.message || 'Errore nella chiamata AI');
if (data?.error) throw new Error(data.error);

// Dopo (fix - mostra messaggio specifico):
if (data?.error) throw new Error(data.error);
if (error && !data) throw new Error(error.message || 'Errore nella chiamata AI');
```

Stesso fix in `useCarouselSlides.ts` per la gestione errori delle slide.

---

### Problema 2: Collegamento Instagram non funziona

I log di `meta-auth` mostrano un errore chiaro:

```
Long-lived token error: { message: "Unsupported request - method type: get", type: "IGApiException" }
```

Il problema e' nella funzione `meta-auth/index.ts` linea 59-61. Lo scambio del token short-lived per long-lived usa una richiesta **GET**, ma la nuova Instagram Business Login API (con scope `instagram_business_basic`) richiede una richiesta **POST**.

L'utente approva tutto su Instagram, il codice riceve il token short-lived correttamente, ma poi fallisce allo step 2 (scambio per long-lived token) con errore 400. La connessione non viene mai salvata nel database.

**Fix in `meta-auth/index.ts`**: Cambiare la richiesta di scambio long-lived token da GET a POST con i parametri nel body.

```text
// Prima (bug - GET non supportato):
const longLivedRes = await fetch(
  `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`
)

// Dopo (fix - POST come richiesto dalla nuova API):
const longLivedRes = await fetch('https://graph.instagram.com/access_token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: appSecret,
    access_token: shortLivedToken,
  }),
})
```

Aggiungere anche logging migliore per diagnostica futura.

---

### Riepilogo modifiche

| File | Cosa cambia |
|------|-------------|
| `supabase/functions/meta-auth/index.ts` | Cambio da GET a POST per long-lived token exchange |
| `src/hooks/useContentGeneration.ts` | Fix ordine controllo errori per mostrare messaggio specifico |
| `src/hooks/useCarouselSlides.ts` | Stesso fix ordine errori per le slide |

### Nota importante

L'errore "Edge Function returned a non-2xx status code" nella generazione contenuto e' causato da **crediti AI esauriti** (402). Anche dopo il fix del messaggio, la generazione non funzionera' finche' non vengono aggiunti crediti al workspace Lovable. Il fix serve a mostrare il messaggio corretto ("Crediti AI esauriti") invece di uno generico.

