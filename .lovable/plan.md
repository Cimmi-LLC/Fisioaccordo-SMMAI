

## Fix: Generazione immagini reali per Instagram

### Problema attuale
Le immagini NON sono reali. Ci sono due bug:

1. **La risposta API non viene letta correttamente**: il codice cerca `message.parts` (formato Google), ma il gateway Lovable restituisce `message.images` (formato OpenAI). Le immagini generate vengono ignorate.
2. **Instagram non accetta base64**: anche correggendo il parsing, Instagram richiede URL pubblici (`https://...`), non stringhe base64. Le immagini devono essere caricate su Supabase Storage.

### Soluzione in 2 step

**Step 1 - Fix parsing risposta API**
File: `supabase/functions/generate-carousel-images/index.ts`

- Aggiungere `"modalities": ["image", "text"]` nel body della richiesta al modello (richiesto per generare immagini)
- Leggere le immagini da `data.choices[0].message.images[0].image_url.url` (formato corretto del gateway Lovable)
- Mantenere il fallback per `parts` e `content` come backup

**Step 2 - Upload su Supabase Storage per Instagram**
File: `supabase/functions/generate-carousel-images/index.ts`

- Dopo aver ottenuto l'immagine base64, convertirla in un file binario
- Caricarla su Supabase Storage (bucket `carousel-images`)
- Restituire l'URL pubblico dello storage invece del base64
- Questo URL funziona sia per l'anteprima che per la pubblicazione Instagram

### Dettagli tecnici

**Parsing corretto della risposta (Step 1):**
```text
// Aggiungere modalities nella richiesta
body: JSON.stringify({
  model: "google/gemini-2.5-flash-image",
  messages: [{ role: "user", content: prompt }],
  modalities: ["image", "text"]  // <-- AGGIUNGERE QUESTO
})

// Leggere dal formato corretto
const images = data.choices?.[0]?.message?.images;
if (images && images.length > 0) {
  const base64Url = images[0].image_url.url;
  // ... upload to storage
}
```

**Upload su Storage (Step 2):**
```text
// Convertire base64 in blob
const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, '');
const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

// Upload su Supabase Storage
const fileName = `slide_${Date.now()}_${index}.png`;
const { data: uploadData } = await supabaseClient.storage
  .from('carousel-images')
  .upload(fileName, imageBytes, { contentType: 'image/png' });

// Ottenere URL pubblico
const { data: urlData } = supabaseClient.storage
  .from('carousel-images')
  .getPublicUrl(fileName);

return { index, url: urlData.publicUrl, error: null };
```

**Creazione bucket Storage:**
- Creare il bucket `carousel-images` come pubblico tramite migration SQL

### Risultato finale
- Le immagini vengono generate dall'AI come immagini reali (PNG)
- Vengono caricate su Supabase Storage con URL pubblico
- L'anteprima mostra immagini reali
- Instagram accetta le immagini per la pubblicazione diretta

