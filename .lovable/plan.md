

# Filtrare Template per Tipo di Post

## Problema attuale
Quando scegli un template visivo, vedi TUTTI i template indistintamente. Ma ogni template ha una **categoria** (carosello, post singolo, storia, reel) -- quella che imposti quando li carichi.

## Soluzione
Collegare il campo "Tipo di Post" del form al selettore template, mostrando solo i template della categoria corrispondente.

## Modifiche

### 1. `CanvaTemplateSelector.tsx`
- Aggiungere prop `postType` (string) al componente
- Filtrare i template visualizzati in base alla categoria che corrisponde al `postType` selezionato
- Mappatura: `carosello` -> `carosello`, `post-singolo` -> `post`, `storia` -> `storia`, `reel` -> `reel`
- Mostrare un messaggio "Nessun template per questo formato" se non ci sono template per quella categoria
- Il conteggio template si aggiorna in base ai filtrati

### 2. `ContentForm.tsx`
- Passare `formData.postType` come prop a `CanvaTemplateSelector`

### 3. `TemplateUploader.tsx`
- Allineare i valori delle categorie con quelli del postType nel form:
  - `carosello` (gia ok)
  - `post` (cambiare da `post` a `post-singolo` oppure vice versa -- allineare)
  - `storia` (gia ok)
  - `reel` (gia ok)
- Aggiungere opzione "Tutti i formati" (`all`) per template universali che appaiono sempre

## Dettagli tecnici

### Mapping categorie
| PostType nel form | Categoria template |
|---|---|
| `carosello` | `carosello` |
| `post-singolo` | `post` |
| `storia` | `storia` |
| `reel` | `reel` |

I template con categoria `all` appariranno sempre, indipendentemente dal tipo di post selezionato.

### File modificati
- `src/components/CanvaTemplateSelector.tsx` -- aggiungere prop `postType` e logica filtro
- `src/components/ContentForm.tsx` -- passare `postType` al selettore
- `src/components/TemplateUploader.tsx` -- aggiungere opzione categoria "Tutti i formati"

