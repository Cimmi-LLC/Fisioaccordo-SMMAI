

## Chiarimento e Miglioramento UX Pulsanti Pubblicazione

### Limitazione tecnica importante
Instagram e Facebook **non permettono** a nessun sito web esterno di aprire direttamente la schermata "Nuovo Post" con immagini e testo gia' inseriti. Questa e' una limitazione delle piattaforme stesse, non del nostro sistema. Nessuna app al mondo puo' farlo.

### Cosa faremo

Ci sono **due modi** per pubblicare, e li rendiamo piu' chiari:

**Modo 1 - Pubblicazione Diretta (automatica, via API)**
I pulsanti viola "Pubblica su Instagram" e "Pubblica su Facebook" pubblicano direttamente il post sul tuo account collegato tramite le API di Meta. Non devi fare nulla: il post appare direttamente sul tuo profilo Instagram.

**Modo 2 - Manuale (copia e incolla)**
I pulsanti "Apri Instagram" / "Apri Facebook" copiano il testo, scaricano le immagini e aprono il sito. Poi devi manualmente creare il post.

### Modifiche previste

**File: `src/components/SmartCopyActions.tsx`**

1. Rendere i pulsanti di pubblicazione diretta (API) molto piu' prominenti e chiari, con icone e testo esplicito tipo "Pubblica Ora su Instagram (automatico)"
2. Spostare i pulsanti manuali (Apri Instagram/Facebook) in una sezione separata e meno prominente, etichettata chiaramente come "Metodo manuale"
3. Aggiungere una nota esplicativa che dice: "Il pulsante 'Pubblica Ora' pubblica automaticamente sul tuo profilo. I pulsanti sotto sono per chi preferisce copiare e incollare manualmente."
4. Rimuovere i pulsanti "Apri Instagram" e "Apri Facebook" se la connessione Meta e' attiva (dato che il metodo diretto e' superiore), oppure nasconderli in un collapsible "Metodo manuale"

### Dettagli tecnici

- Sezione primaria: pulsanti grandi e colorati per pubblicazione diretta API (solo se `onPublishDirect` e' presente)
- Sezione secondaria collassabile: pulsanti outline per copia testo, scarica immagini, apri manualmente
- Testo guida chiaro per l'utente non tecnico
