
## Traduzione completa del sito in italiano

Tutti i file UI contengono testo in inglese (alcuni misti inglese/italiano). Ecco il piano completo.

### File da modificare

| File | Cosa tradurre |
|------|--------------|
| `src/pages/Auth.tsx` | "Access the Platform", "Login", "Sign Up", "Remember me", "Forgot password?", "Sign In", "Create Account", "Reset Password", messaggi toast, footer |
| `src/components/AppHeader.tsx` | "Hi,", "Log Out", "Copy AI Pro", "Hide" |
| `src/components/MainContent.tsx` | "Generate", "Photos", "AI Memory", "Viral", "Trends", "Post Configuration", "Content Preview", "Trend selected!", "Error", "Wait", toast messaggi |
| `src/components/IdeaGenerator.tsx` | "Need inspiration?", placeholder, "Find Ideas", array ideas |
| `src/components/ContentForm.tsx` | "Create Your Content", "Describe Your Post", "Define Your Audience", "Length", "Tone", "Platform", "Post Type", "Number of Slides", "Number of Images", "Publishing Platforms", "Schedule Publication", "Generate Content", tutti i SelectItem |
| `src/components/PreviewSection.tsx` | "Preview", "Post Image", "Story Image", "Reel Image", "Carousel Slides", "Regenerate Images", "Applied hook:", "Save", "Copy", "Your generated content will appear here", toast messaggi |
| `src/components/SmartCopyActions.tsx` | "Publish Your Content", "Automatic publishing", "Publish Now on Instagram/Facebook", "Manual method", "Copy Text", "Download Images", "Open Instagram/Facebook", pipeline steps labels, toast messaggi |
| `src/components/MetaConnection.tsx` | "Social Connection", "Connected", "Disconnect", "Connect Instagram Business", "Requirements:", consent text, username warning, toast messaggi |
| `src/components/PersonalAccountGuide.tsx` | Tutto il contenuto del dialog |
| `src/components/PhotoUpload.tsx` | "Carica una foto base" → già in italiano, "Foto caricata" → già italiano; aggiustare il mix |
| `src/components/PhotoLibrary.tsx` | "Le Mie Foto" → ok; "Carica", "Tutte", "Nessuna foto" → già italiano; uniformare |
| `src/components/FeedbackWidget.tsx` | "How does it look?", "What would you improve?", "Feedback saved!" |
| `src/components/ImageFeedbackWidget.tsx` | "How do the images look?", "Image feedback saved!" |
| `src/components/AIMemoryPanel.tsx` | "memorie", "correzioni", "preferenze" → già italiano; MEMORY_TYPES già in italiano; uniformare |
| `src/pages/ResetPassword.tsx` | Già in italiano — nessuna modifica necessaria |

### Traduzioni chiave

**Auth.tsx:**
- "Access the Platform" → "Accedi alla Piattaforma"
- "Login" → "Accedi" | "Sign Up" → "Registrati"  
- "Remember me" → "Ricordami"
- "Forgot password?" → "Password dimenticata?"
- "Sign In" → "Accedi" | "Create Account" → "Crea Account"
- "Reset Password" → "Reimposta Password"
- "Generate professional content for your social media" → "Genera contenuti professionali per i tuoi social media"
- "AI copywriting + automatically generated images" → "Copywriting AI + immagini generate automaticamente"

**ContentForm.tsx:**
- "Create Your Content" → "Crea il Tuo Contenuto"
- "Describe Your Post" → "Descrivi il Tuo Post"
- "Define Your Audience" → "Definisci il Tuo Pubblico"
- "Length" → "Lunghezza" | Short/Medium/Long → Corto/Medio/Lungo
- "Tone" → "Tono" | Professional/Casual/Fun/Motivational → Professionale/Informale/Divertente/Motivazionale
- "Post Type" → "Tipo di Post" | Carousel/Single Post/Story/Reel → Carosello/Post Singolo/Storia/Reel
- "Number of Slides/Images" → "Numero di Slide/Immagini"
- "Publishing Platforms" → "Piattaforme di Pubblicazione"
- "Schedule Publication" → "Pianifica Pubblicazione"
- "Generate Content" → "Genera Contenuto"

**SmartCopyActions.tsx:**
- "Publish Your Content" → "Pubblica il Tuo Contenuto"
- "Automatic publishing" → "Pubblicazione automatica"
- "Publish Now on Instagram/Facebook" → "Pubblica ora su Instagram/Facebook"
- "Manual method (copy & paste)" → "Metodo manuale (copia & incolla)"
- Pipeline steps → in italiano

**AppHeader.tsx:**
- "Hi," → "Ciao,"
- "Log Out" → "Esci"
- "Copy AI Pro" → "Copy AI Pro" (lasciare invariato — è il nome del prodotto)
- "Hide" → "Nascondi"

**MainContent.tsx:**
- Tab "Generate" → "Genera" | "Photos" → "Foto" | "Trends" → "Trend"
- "Post Configuration" → "Configurazione Post"
- "Content Preview" → "Anteprima Contenuto"
- "Trend selected!" → "🔥 Trend selezionato!"
- Toast errors in italiano

**MetaConnection.tsx:**
- "Social Connection" → "Connessione Social"
- "Connected" → "Connesso"
- "Connect Instagram Business" → invariato (nome proprio)
- "Requirements:" → "Requisiti:"
- Consent text e instructions in italiano

**PersonalAccountGuide.tsx:**
- Tutto il contenuto in italiano

### Approccio
Modifica diretta di tutti i file — solo i testi visibili all'utente, senza toccare la logica, i valori delle variabili (es. `value="corto"`), o i nomi dei componenti.
