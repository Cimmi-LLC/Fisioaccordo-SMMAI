
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
      // Miglioriamo il prompt per garantire testo sempre in italiano
      const enhancedPrompt = this.enhancePromptForItalian(params.positivePrompt);
      
      const response = await fetch(`${this.baseURL}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: enhancedPrompt,
          n: 1,
          size: params.size || '1024x1024',
          quality: params.quality || 'hd',
          style: params.style || 'vivid'
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
        positivePrompt: enhancedPrompt,
        seed: Math.floor(Math.random() * 1000000),
        NSFWContent: false
      };
    } catch (error) {
      console.error('🚫 Errore nella generazione immagine:', error);
      throw error;
    }
  }

  private enhancePromptForItalian(prompt: string): string {
    // Miglioriamo il prompt per garantire testo sempre in italiano perfetto
    const italianEnhancement = "IMPORTANTE: Qualsiasi testo visibile nell'immagine deve essere scritto ESCLUSIVAMENTE in italiano perfetto, con grammatica e ortografia corrette. ";
    
    // Aggiungiamo specifiche per diversi tipi di contenuto
    if (prompt.includes('carosello') || prompt.includes('social')) {
      return `${italianEnhancement}${prompt}. Stile moderno e accattivante per social media, colori vibranti, layout professionale.`;
    } else if (prompt.includes('pubblicitario') || prompt.includes('marketing')) {
      return `${italianEnhancement}${prompt}. Design pubblicitario di alta qualità, call-to-action efficace, branding forte.`;
    } else if (prompt.includes('infografica')) {
      return `${italianEnhancement}${prompt}. Layout chiaro e organizzato, icone moderne, gerarchia visiva ottimale.`;
    }
    
    return `${italianEnhancement}${prompt}. Alta qualità, dettagli nitidi, composizione professionale.`;
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testando connessione DALL-E 3...');
      await this.generateImage({
        positivePrompt: 'Test di connessione: un semplice cerchio blu su sfondo bianco'
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
