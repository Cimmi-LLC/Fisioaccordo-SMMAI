

## Piano: Privacy Policy Page + Traduzione completa interfaccia in inglese

### Problema 1 — Privacy Policy (PRIORITA' MASSIMA)

Creare una pagina `/privacy` pubblica (accessibile senza login) che soddisfi i requisiti Meta.

**Nuovo file: `src/pages/Privacy.tsx`**

Pagina statica con:
- Nome app: "FisioAccordo Social Content AI"
- Sviluppatore: Cimmi LLC
- Dati raccolti: Instagram username, access token, contenuti pubblicati tramite l'app
- Uso dei dati: esclusivamente per pubblicare post su Instagram/Facebook per conto dell'utente
- Conservazione: dati salvati su Supabase (infrastruttura cloud sicura)
- Cancellazione: l'utente puo' disconnettere l'account in qualsiasi momento dall'app, oppure contattare via email per richiedere la cancellazione completa
- Contatto email per richieste privacy
- Design pulito, responsive, accessibile senza autenticazione

**Modifica: `src/App.tsx`**

Aggiungere la route `/privacy` PRIMA del catch-all `*`.

**Modifica: `src/pages/Index.tsx`** (footer)

Aggiungere link "Privacy Policy" nel footer che punta a `/privacy`.

---

### Problema 2 — Traduzione completa interfaccia in inglese

Per il video screencast Meta, tutta l'interfaccia visibile deve essere in inglese. Attualmente solo i bottoni sono tradotti, ma titoli, descrizioni, tab, placeholder e toast sono ancora in italiano.

**File da modificare:**

1. **`src/components/AppHeader.tsx`** — "Generatore di Post Social" -> "Social Post Generator", "Ciao, {name}" -> "Hi, {name}"

2. **`src/components/MainContent.tsx`** — Titolo principale, descrizione, nomi tab ("Genera" -> "Generate", "Foto" -> "Photos", "Virale" -> "Viral"), label delle card, tutti i toast messages

3. **`src/pages/Index.tsx`** — "Caricamento in corso..." -> "Loading...", toast messages, footer text (copyright notice)

4. **`src/components/ContentForm.tsx`** — Label dei campi form, placeholder, opzioni select (tono, piattaforma, tipo post, lunghezza)

5. **`src/components/PreviewSection.tsx`** — Titoli sezioni, testo placeholder

6. **`src/components/MetaConnection.tsx`** — Titolo card, badge "Collegato" -> "Connected", requisiti, descrizioni

7. **`src/components/IdeaGenerator.tsx`** — Titolo, placeholder, descrizioni

8. **`src/components/SavedContents.tsx`** — Titolo sezione, label, stati vuoti

9. **`src/components/SmartCopyActions.tsx`** — Label sezioni, descrizioni metodi

10. **`src/components/PersonalAccountGuide.tsx`** — Tutto il contenuto del tutorial (gia' rilevante per il video screencast)

11. **`src/pages/Auth.tsx`** — Pagina login/signup se visibile nel video

12. **`src/components/HookGenerator.tsx`** — Titoli e label

13. **`src/components/FeedbackWidget.tsx`** / **`src/components/ImageFeedbackWidget.tsx`** — Label e placeholder

---

### Ordine di implementazione

1. Creare la pagina Privacy Policy (`/privacy`)
2. Aggiungere la route e il link nel footer
3. Tradurre tutti i componenti UI in inglese (circa 13 file)

### Note tecniche

- La pagina Privacy deve essere accessibile SENZA autenticazione (nessun redirect a `/auth`)
- Circa 13 file da modificare per la traduzione
- Nessuna dipendenza aggiuntiva necessaria
- Le stringhe hardcoded verranno sostituite direttamente (no i18n framework, troppo overhead per questo caso)

