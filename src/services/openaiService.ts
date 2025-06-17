
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
}

interface GeneratedImage {
  imageURL: string;
  positivePrompt: string;
  seed?: number;
  NSFWContent?: boolean;
}

export class OpenAIService {
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(params: GenerateImageParams): Promise<GeneratedImage> {
    console.log('🎨 Generando immagine con DALL-E 3:', params.positivePrompt);
    
    try {
      // Semplifichiamo il prompt per evitare errori
      const cleanPrompt = this.cleanPromptForDallE(params.positivePrompt);
      
      const response = await fetch(`${this.baseURL}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: cleanPrompt,
          n: 1,
          size: params.size || '1024x1024',
          quality: params.quality || 'standard',
          style: params.style || 'natural'
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
        positivePrompt: cleanPrompt,
        seed: Math.floor(Math.random() * 1000000),
        NSFWContent: false
      };
    } catch (error) {
      console.error('🚫 Errore nella generazione immagine:', error);
      throw error;
    }
  }

  private cleanPromptForDallE(prompt: string): string {
    // Rimuoviamo istruzioni complesse che potrebbero causare errori
    let cleanPrompt = prompt.replace(/IMPORTANTE:.*?\./g, '');
    
    // Manteniamo il prompt semplice e diretto
    if (cleanPrompt.length > 200) {
      cleanPrompt = cleanPrompt.substring(0, 200) + '...';
    }
    
    // Aggiungiamo solo una nota semplice per l'italiano
    return `${cleanPrompt}. Immagine professionale di alta qualità.`;
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testando connessione DALL-E 3...');
      await this.generateImage({
        positivePrompt: 'Un semplice cerchio blu'
      });
      console.log('✅ Connessione DALL-E 3 funzionante');
      return true;
    } catch (error) {
      console.error('❌ Test connessione fallito:', error);
      return false;
    }
  }
}

// Istanza predefinita con la chiave API
export const defaultOpenAIService = new OpenAIService('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');
