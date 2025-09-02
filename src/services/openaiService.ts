interface GenerateImageParams {
  positivePrompt: string;
  model?: string;
  numberResults?: number;
  outputFormat?: string;
  CFGScale?: number;
  strength?: number;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  imageUrl?: string;  // Per miglioramenti basati su immagine esistente
}

interface GeneratedImage {
  imageURL: string;
  positivePrompt: string;
  seed?: number;
  NSFWContent?: boolean;
}

interface GenerateTextParams {
  topic: string;
  audience?: string;
  length: string;
  tone: string;
  platform: string;
  postType: string;
  hookVariant?: string;
}

export class OpenAIService {
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateText(params: GenerateTextParams): Promise<string> {
    console.log('✍️ Generando copy con GPT-4...', params);
    
    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(params);
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.8,
          max_tokens: 1000,
        }),
      });

      console.log('📡 Risposta OpenAI GPT-4 status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Errore OpenAI GPT-4:', errorData);
        throw new Error(errorData.error?.message || 'Errore nella generazione del testo');
      }

      const data = await response.json();
      console.log('✅ Copy generato con successo');
      
      return data.choices[0]?.message?.content || 'Errore nella generazione del contenuto';
    } catch (error) {
      console.error('🚫 Errore nella generazione copy:', error);
      throw error;
    }
  }

  private buildSystemPrompt(): string {
    return `Sei un copywriter esperto con 20 anni di esperienza, sempre aggiornato sui trend più recenti dei social media.

Il tuo stile di scrittura è ispirato a Iman Gadzhi: diretto, carismatico, orientato ai risultati e sempre con un focus sul valore per l'audience.

Utilizzi le strategie di Mr.Beast e altri grandi influencer per creare contenuti virali:
- Hook potenti che catturano l'attenzione nei primi 3 secondi
- Storytelling coinvolgente con suspense
- Pattern interrupt e sorprese
- Call to action che convertono
- Linguaggio semplice ma d'impatto
- Emojis strategici per aumentare l'engagement

REGOLE FONDAMENTALI:
1. Ogni post deve iniziare con un hook irresistibile
2. Usa numeri, statistiche e fatti concreti
3. Crea curiosità e urgenza
4. Parla direttamente al lettore con "tu"
5. Includi sempre una call to action forte
6. Struttura il contenuto per massima leggibilità
7. Aggiungi emojis pertinenti ma senza esagerare

Genera contenuti che fermano lo scroll e generano engagement massimo.`;
  }

  private buildUserPrompt(params: GenerateTextParams): string {
    const { topic, audience, length, tone, platform, postType, hookVariant } = params;
    
    let prompt = `Crea un ${postType} ${length} per ${platform} su: "${topic}"`;
    
    if (audience) {
      prompt += `\nTarget audience: ${audience}`;
    }
    
    prompt += `\nTono: ${tone}`;
    
    if (hookVariant) {
      switch (hookVariant) {
        case 'verita':
          prompt += `\nUsa il pattern hook: "La verità su [topic] che nessuno ti dice"`;
          break;
        case 'stop':
          prompt += `\nUsa il pattern hook: "STOP! Stai sbagliando tutto con [topic]"`;
          break;
        case 'errori':
          prompt += `\nUsa il pattern hook: "Come [topic] mi ha cambiato la vita"`;
          break;
      }
    }
    
    if (postType === 'carosello') {
      prompt += `\n\nStruttura per carosello:
- Slide 1: Hook potente + introduzione
- Slide 2-4: Punti chiave sviluppati
- Slide finale: Riassunto + CTA forte
      
Formatta come post unico ma indica chiaramente i punti per ogni slide.`;
    }
    
    prompt += `\n\nGenera un contenuto che:
- Fermi lo scroll immediatamente
- Crei curiosità e urgenza
- Fornisca valore concreto
- Includa una CTA che converte
- Sia ottimizzato per ${platform}`;
    
    return prompt;
  }

  async generateImage(params: GenerateImageParams): Promise<GeneratedImage> {
    console.log('🎨 Generando immagine ultra-quality con DALL-E 3:', params.positivePrompt);
    
    try {
      // Enhanced prompts for photorealistic quality
      let enhancePrompt = '';
      
      if (params.imageUrl) {
        // Miglioramento immagini esistenti con qualità fotografica
        enhancePrompt = `Transform this image into a professional, photorealistic, ultra-detailed 8K quality masterpiece while maintaining EXACTLY the same subject, composition and key elements. ${params.positivePrompt}. Enhance clarity, lighting, colors, and sharpness to magazine-quality standards. The image must remain clearly recognizable as the original but with stunning photographic quality.`;
      } else {
        enhancePrompt = this.buildPhotorealisticPrompt(params.positivePrompt);
      }
      
      const response = await fetch(`${this.baseURL}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: enhancePrompt,
          n: 1,
          size: params.size || '1792x1024', // Higher resolution by default
          quality: 'hd', // Always use HD quality
          style: 'natural' // Natural style for maximum realism
        }),
      });

      console.log('📡 Risposta OpenAI status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Errore OpenAI:', errorData);
        throw new Error(errorData.error?.message || 'Errore nella generazione dell\'immagine');
      }

      const data = await response.json();
      console.log('✅ Immagine generata con successo');
      
      if (!data.data || data.data.length === 0) {
        throw new Error('Nessuna immagine generata');
      }

      return {
        imageURL: data.data[0].url,
        positivePrompt: enhancePrompt,
        seed: Math.floor(Math.random() * 1000000),
        NSFWContent: false
      };
    } catch (error) {
      console.error('🚫 Errore nella generazione immagine:', error);
      throw error;
    }
  }

  private buildPhotorealisticPrompt(prompt: string): string {
    // Remove complex instructions that might cause errors
    let cleanPrompt = prompt.replace(/IMPORTANTE:.*?\./g, '');
    
    // Keep the core prompt but enhance for photorealism
    if (cleanPrompt.length > 150) {
      cleanPrompt = cleanPrompt.substring(0, 150);
    }
    
    // Add photorealistic enhancement terms
    const photoTerms = [
      "photorealistic", "ultra-detailed", "8K resolution", "professional photography",
      "studio lighting", "sharp focus", "vibrant colors", "high contrast",
      "cinematic composition", "magazine quality", "crystal clear details"
    ];
    
    const randomPhotoTerms = photoTerms.slice(0, 4).join(", ");
    
    return `${cleanPrompt}. Professional ${randomPhotoTerms}, stunning visual impact that stops social media scrolling, award-winning photography style.`;
  }

  private cleanPromptForDallE(prompt: string): string {
    // Legacy method - now uses buildPhotorealisticPrompt
    return this.buildPhotorealisticPrompt(prompt);
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testando connessione OpenAI...');
      await this.generateText({
        topic: 'test',
        length: 'breve',
        tone: 'professionale',
        platform: 'instagram',
        postType: 'post-singolo'
      });
      console.log('✅ Connessione OpenAI funzionante');
      return true;
    } catch (error) {
      console.error('❌ Test connessione fallito:', error);
      return false;
    }
  }
}

// Istanza predefinita con la chiave API
export const defaultOpenAIService = new OpenAIService('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');
