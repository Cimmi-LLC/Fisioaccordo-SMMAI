

## Analisi: cosa manca ancora per il 100% di compliance Meta

Ho confrontato il tuo setup attuale con i requisiti Meta e ho trovato **5 problemi** che i reviewer probabilmente segnaleranno.

---

### Problema 1 — Nome app diverso tra Meta e Privacy/Terms

Nello screenshot OAuth si legge **"POST PER I SOCIAL 2-IG"**, ma nelle pagine Privacy e Terms il nome e' **"FisioAccordo Social Content AI"**. I reviewer Meta confrontano questi nomi — devono corrispondere esattamente.

**Soluzione**: Aggiornare Privacy.tsx e Terms.tsx per usare il nome esatto configurato nel Meta Developer portal, oppure cambiare il nome nell'app Meta. Devo sapere da te: quale nome vuoi usare? Se vuoi mantenere "POST PER I SOCIAL 2-IG" nel portal Meta, aggiorno le pagine legal. Se preferisci cambiare il nome nel portal, non serve toccare il codice.

### Problema 2 — Permessi Meta non elencati esplicitamente nella Privacy Policy

Meta vuole che la Privacy Policy elenchi esattamente **quali permessi/scope** vengono richiesti e perche'. Attualmente la pagina dice genericamente "access tokens" ma non specifica:
- `instagram_business_basic` — per leggere username e info profilo
- `instagram_business_content_publish` — per pubblicare post

**Soluzione**: Aggiungere una sezione "Permissions We Request" nella Privacy Policy.

### Problema 3 — Email di contatto inconsistenti

- Privacy Policy: `privacy@cimmillc.com`
- Terms of Service: `support@cimmi.co`

Meta potrebbe segnalare l'incongruenza. Servono email uniformi su entrambe le pagine.

### Problema 4 — Anno copyright sbagliato

Privacy Policy ha "© 2024" hardcoded (riga 115). Footer di Index.tsx e Auth.tsx anche. Dovrebbe essere dinamico con `new Date().getFullYear()` (come gia' fatto in Terms.tsx e DeletionStatus.tsx).

### Problema 5 — Manca dichiarazione su dati dei minori (COPPA/Children's Data)

Meta richiede che la Privacy Policy dichiari esplicitamente se l'app raccoglie dati di minori di 13 anni. Serve una sezione "Children's Privacy" che dica che l'app non e' destinata a minori e non raccoglie intenzionalmente dati di utenti sotto i 13 anni.

---

### Bonus: Terms.tsx manca il link "Back to App"

La Privacy Policy ha il link "← Back to App" in alto, ma i Terms no. Per coerenza e usabilita' (e per i reviewer) conviene aggiungerlo.

---

### Riepilogo modifiche

| File | Modifica |
|------|----------|
| `src/pages/Privacy.tsx` | Aggiungere sezione permessi Meta, sezione Children's Privacy, anno dinamico, uniformare nome app |
| `src/pages/Terms.tsx` | Aggiungere link "Back to App", uniformare nome app ed email |
| `src/pages/Index.tsx` | Anno copyright dinamico |
| `src/pages/Auth.tsx` | Anno copyright dinamico |

**Prima di procedere ho bisogno di sapere**:
1. Quale nome app usare: "POST PER I SOCIAL 2-IG" o "FisioAccordo Social Content AI"?
2. Quale email di contatto usare per entrambe le pagine?

