
## Redesign estetico completo — Piano di implementazione

### Obiettivo
Sostituire il design system attuale (dark mode blu/viola/verde) con il nuovo sistema cromatico bianco/rosa/viola richiesto, applicando Montserrat, nuove variabili CSS, e tutti gli stili componente per componente. Nessuna modifica alla logica.

### File da modificare (in ordine)

**1. `src/index.css`** — cuore del redesign
- Sostituire tutte le variabili CSS `:root` con le nuove (--rosa, --viola, --ink, --bg, --surface, etc.)
- Mappare le variabili Tailwind (--primary → rosa, --secondary → viola, --background → --bg, etc.)
- Rimuovere dark mode o renderla uguale a light (l'app userà solo light)
- Aggiungere utility classes: `.label-field`, `.panel-card`, `.tab-underline`
- Rimuovere `.shadow-enhanced` (sostituire con ombra leggera max `0 2px 12px rgba(85,70,151,0.07)`)
- Rimuovere `.gradient-text` e `.glow-effect`
- Aggiungere font Montserrat come font base del body

**2. `index.html`** — già ha Montserrat importato, verificare pesi 400-900 ✓

**3. `tailwind.config.ts`** — aggiornare colori custom fisio con nuovi valori hex

**4. `src/components/AppHeader.tsx`**
- `bg-gray-900/90` → `bg-white border-b border-[var(--line)]` h-[58px]
- Logo: aggiungere box viola `bg-[#554697] rounded-lg p-1`
- Brand name: `font-extrabold text-[var(--ink)]`
- Separatore verticale `w-px h-6 bg-[var(--line)]`
- Bottone Pro: `bg-[#e6007e] text-white uppercase font-black text-xs rounded-[7px]`
- Bottone Esci: `border border-[var(--line)] text-[var(--ink3)] bg-transparent`
- Rimuovere icone emoji (già rimosso in traduzione)

**5. `src/components/MainContent.tsx`**
- Hero section: padding-top 52px, eyebrow pill viola-dim, titolo 38px/900/--ink, keyword rosa
- Tabs: stile underline (rimuovere pillola), tab attivo pseudo-after rosa, nessuna emoji, font 11px/700/uppercase
- Rimuovere emoji dai TabsTrigger (già fatto in traduzione — verificare)
- Bottone "Mostra Formati Virali": restyling link viola

**6. `src/components/IdeaGenerator.tsx`**
- Card: bg viola-dim, border var(--line), border-radius 12px
- Label: 10px/800/--viola/uppercase
- Input: bg white, border var(--line), radius 8px
- Bottone: bg #554697, hover #3d3270, testo bianco 11px/800

**7. `src/components/ContentForm.tsx`**
- Card: white, border var(--line), radius 16px
- Tutte le Label: 10px/800/uppercase/--ink2, dot rosa
- Input/Textarea/Select: bg #f9f8fc, border var(--line), radius 9px, 12px/500/--ink, focus border rosa
- Chip piattaforme: stato attivo border rosa, bg rosa-dim, testo rosa
- Bottone Genera: bg #18152e, testo white 12px/800, radius 10px, barra sinistra 3px rosa

**8. `src/components/PreviewSection.tsx`**
- Card: white, border var(--line), radius 16px
- Header: bottoni "Copia"/"Esporta" outline var(--line) testo --ink3; "Salva" bg rosa
- Stato vuoto: icona in box border var(--line) radius 14px, testo --ink2/13px/700
- Nessuna emoji nei testi

**9. `src/components/SmartCopyActions.tsx`**
- Container: bg white, border var(--line), radius 16px
- Titolo: --ink/13px/800
- Bottone Instagram: bg #e6007e (non gradient)
- Bottone Facebook: bg #554697 (non gradient blu)
- Bottone metodo manuale: outline var(--line), testo --ink3
- Rimuovere emoji

**10. `src/components/MetaConnection.tsx`**
- Card: white, border var(--line), radius 16px
- Badge connesso: verde sobrio, no emoji
- Bottone connetti: bg #e6007e (no gradient), testo white

**11. `src/pages/Auth.tsx`**
- Background: bg-[var(--bg)] no gradient overlay
- Card: white, border var(--line), shadow leggera
- Tabs: stile underline come nelle tab principali
- Bottoni: bg #e6007e per azioni primarie
- Input: stesso stile form (bg #f9f8fc)

**12. `src/pages/Index.tsx`**
- Footer: border var(--line), bg white, testo --ink3, rimuovere emoji, tradurre in italiano

**13. `src/components/ui/card.tsx`** — aggiornare classi default per matchare nuovo design

**14. `src/components/FeedbackWidget.tsx`** — rimuovere emoji dal testo

### Variabili CSS da definire in `:root`

```css
--rosa: #e6007e;
--viola: #554697;
--viola-deep: #3d3270;
--rosa-dim: rgba(230,0,126,0.08);
--viola-dim: rgba(85,70,151,0.07);
--ink: #18152e;
--ink2: #5a5478;
--ink3: #a099c0;
--line: rgba(85,70,151,0.12);
--bg: #f9f8fc;
--surface: #ffffff;
```

Mappatura variabili Tailwind:
- `--background` → #f9f8fc (bg)
- `--foreground` → #18152e (ink)
- `--card` → #ffffff (surface)
- `--primary` → #e6007e (rosa)
- `--secondary` → #554697 (viola)
- `--border` → rgba(85,70,151,0.12) (line)
- `--input` → #f9f8fc
- `--muted` → rgba(85,70,151,0.07)
- `--muted-foreground` → #a099c0 (ink3)

### Note implementative
- Rimuovere classe `dark` — il tema è solo light
- Tutti i box-shadow: max `0 2px 12px rgba(85,70,151,0.07)`
- `font-family: 'Montserrat', sans-serif` sul body
- Nessun `background-clip: text` / gradient su testo
- Bottoni primari uniformi: `bg-[#e6007e]` ovunque tranne bottone Genera (`bg-[#18152e]`) e viola dove specificato
- Tab attive: pseudo-elemento `::after` 2px rosa — implementato via CSS custom class + inline style override dove necessario
