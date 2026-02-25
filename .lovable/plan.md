

## Translate Button Labels to English

Only button text will be translated. Labels, titles, descriptions, placeholders, and other UI text stay in Italian.

### Changes by file

**`src/components/AppHeader.tsx`**
- "Nascondi" -> "Hide"
- "Esci" -> "Log Out"

**`src/components/IdeaGenerator.tsx`**
- "Trova Idee" -> "Find Ideas"

**`src/components/ContentForm.tsx`**
- "3. Genera Contenuto" -> "3. Generate Content"
- "Generando contenuto..." -> "Generating content..."

**`src/components/PreviewSection.tsx`**
- "Salva" -> "Save"
- "Copia" -> "Copy"
- "Rigenera Immagini" -> "Regenerate Images"

**`src/components/SmartCopyActions.tsx`**
- "Pubblica Ora su Instagram" -> "Publish Now on Instagram"
- "Pubblica Ora su Facebook" -> "Publish Now on Facebook"
- "Pubblicando..." -> "Publishing..."
- "Generazione immagini..." -> "Generating images..."
- "Metodo manuale (copia e incolla)" -> "Manual method (copy & paste)"
- "Copia Testo" -> "Copy Text"
- "Copiato!" -> "Copied!"
- "Scarica Immagini" -> "Download Images"
- "Apri Instagram" -> "Open Instagram"
- "Apri Facebook" -> "Open Facebook"

**`src/components/MetaConnection.tsx`**
- "Scollega" -> "Disconnect"
- "Collega Instagram Business" -> "Connect Instagram Business"
- "Salva" -> "Save"

**`src/components/PersonalAccountGuide.tsx`**
- "Ho capito, vado a convertire" -> "Got it, let me convert"

**`src/components/CopyImprover.tsx`** (tabs and buttons inside sub-components)
- Buttons in `ImproveTab.tsx`: "Genera Copy Migliorato" -> "Generate Improved Copy", "Copia Copy Migliorato" -> "Copy Improved Text"
- Buttons in `AnalysisTab.tsx`: "Analizza Copy con AI" -> "Analyze Copy with AI"
- Buttons in `TemplatesTab.tsx`: "Applica Template" -> "Apply Template", "Applicato" -> "Applied"

**`src/components/FeedbackWidget.tsx`** and **`src/components/ImageFeedbackWidget.tsx`**
- "Invia" (Send button) -> "Send"

### Technical details
- Only `Button` component text and inline button labels are changed
- No structural or logic changes
- 12 files edited, all simple string replacements

