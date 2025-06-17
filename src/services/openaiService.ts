
interface GenerateImageParams {
  positivePrompt: string;
  model?: string;
  numberResults?: number;
  outputFormat?: string;
  CFGScale?: number;
  strength?: number;
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
    try {
      const response = await fetch(`${this.baseURL}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: params.positivePrompt,
          n: 1,
          size: '1024x1024',
          quality: 'hd',
          style: 'vivid'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Errore nella generazione dell\'immagine');
      }

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        throw new Error('Nessuna immagine generata');
      }

      return {
        imageURL: data.data[0].url,
        positivePrompt: params.positivePrompt,
        seed: Math.floor(Math.random() * 1000000),
        NSFWContent: false
      };
    } catch (error) {
      console.error('Errore OpenAI:', error);
      throw error;
    }
  }
}

// Istanza predefinita con la chiave API
export const defaultOpenAIService = new OpenAIService('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');
