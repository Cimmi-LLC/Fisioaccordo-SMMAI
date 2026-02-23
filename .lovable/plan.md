

## Tutorial post-errore per account personali Instagram

### Obiettivo

Quando un utente prova a collegare un account Instagram personale e riceve l'errore, invece di un semplice toast, mostrare un **dialog/modal tutorial** con:
- Rassicurazione che non perdono nulla (follower, post, messaggi restano)
- Possono tornare a personale quando vogliono
- Devono anche avere il **profilo pubblico**
- Passaggi chiari step-by-step con icone

### Modifiche

**File 1: Nuovo componente `src/components/PersonalAccountGuide.tsx`**

Un dialog modale che si apre automaticamente quando viene rilevato un account personale. Contiene:

- Titolo rassicurante ("Non preoccuparti, e' facilissimo!")
- Sezione "Cosa NON cambia": follower, post, messaggi, bio - tutto resta uguale
- Sezione "Puoi tornare indietro": si puo' riconvertire a personale in qualsiasi momento
- **Guida step-by-step**:
  1. Apri Instagram → Impostazioni
  2. Account → Passa a un account professionale
  3. Scegli "Business" o "Creator"
  4. Vai su Privacy → Imposta il profilo come **Pubblico**
  5. Torna qui e riprova il collegamento
- Bottone "Ho capito, vado a convertire" che chiude il dialog

**File 2: `src/components/MetaConnection.tsx`**

- Aggiungere uno state `showPersonalGuide` (default `false`)
- Ascoltare il `postMessage` dall'iframe/popup: se riceve `meta-auth-error` con errore "personale non supportato", settare `showPersonalGuide = true`
- Rendere il componente `PersonalAccountGuide` nel JSX, controllato dallo state
- Aggiornare la sezione Requisiti per includere "Profilo pubblico (non privato)"

**File 3: `src/pages/InstagramCallback.tsx`**

- Mantenere il toast attuale come feedback immediato nel popup
- Aggiungere `error_type: 'PERSONAL_ACCOUNT'` nel `postMessage` inviato al parent, cosi' il componente MetaConnection puo' reagire e aprire il tutorial

### Contenuto del tutorial

```
"Non preoccuparti! Convertire il tuo account e' gratuito,
ci vogliono 30 secondi e non perdi nulla."

- I tuoi follower restano
- I tuoi post e storie restano
- I tuoi messaggi restano
- La tua bio e foto profilo restano

"Puoi tornare a un account personale in qualsiasi momento
dalle stesse impostazioni."

Passaggi:
1. Apri Instagram e vai su Impostazioni (icona ingranaggio)
2. Tocca "Account" → "Passa a un account professionale"
3. Scegli "Creator" o "Business" (consigliamo Creator)
4. Vai su Impostazioni → Privacy → disattiva "Account privato"
5. Torna qui e clicca "Collega Instagram Business"
```

### Dettagli tecnici

- Il dialog usa i componenti `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` gia' presenti nel progetto
- Icone da `lucide-react`: `Shield`, `Users`, `Image`, `MessageCircle`, `ArrowRight`, `CheckCircle`
- Il componente e' controllato via prop `open` / `onOpenChange`
- Nessuna dipendenza aggiuntiva necessaria

