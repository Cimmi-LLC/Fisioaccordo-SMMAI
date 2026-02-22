

## Miglioramento Pulsanti "Apri Instagram" e "Apri Facebook"

### Limitazione tecnica
Instagram e Facebook **non permettono** di aprire direttamente la schermata di creazione post con testo e immagini pre-compilati da un sito web esterno. Nessuna app o sito puo' farlo - e' una limitazione delle piattaforme stesse.

### Soluzione pratica
Quando clicchi "Apri Instagram" o "Apri Facebook", il sistema fara' **automaticamente tutto in sequenza**:

1. **Copia il testo negli appunti** (pronto per incollare)
2. **Scarica tutte le immagini** del carosello sul dispositivo
3. **Apre Instagram/Facebook**

Cosi' devi solo: aprire "Nuovo Post" > selezionare le immagini scaricate > incollare il testo.

### Dettagli tecnici

**File da modificare:** `src/components/SmartCopyActions.tsx`

- Modificare `handleOpenInstagram`: prima copia il testo, poi scarica le immagini, poi apre Instagram
- Modificare `handleOpenFacebook`: prima copia il testo, poi apre Facebook
- Aggiungere feedback toast che spiega cosa e' stato fatto ("Testo copiato e immagini scaricate! Ora incolla e seleziona le foto")
- Rinominare i pulsanti per essere piu' chiari: "Pubblica su Instagram" e "Pubblica su Facebook"

