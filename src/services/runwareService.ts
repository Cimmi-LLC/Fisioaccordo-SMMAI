
import { toast } from "@/hooks/use-toast";

const API_ENDPOINT = "wss://ws-api.runware.ai/v1";

// Add your Runware API key here
const DEFAULT_API_KEY = "IldlzHOyHClcoD5UsnD1uDNd0X5U0wah"; // Your actual Runware API key

export interface GenerateImageParams {
  positivePrompt: string;
  model?: string;
  numberResults?: number;
  outputFormat?: string;
  CFGScale?: number;
  scheduler?: string;
  strength?: number;
  promptWeighting?: "compel" | "sdEmbeds";
  seed?: number | null;
  lora?: string[];
}

export interface GeneratedImage {
  imageURL: string;
  positivePrompt: string;
  seed: number;
  NSFWContent: boolean;
}

export class RunwareService {
  private ws: WebSocket | null = null;
  private apiKey: string | null = null;
  private connectionSessionUUID: string | null = null;
  private messageCallbacks: Map<string, (data: any) => void> = new Map();
  private isAuthenticated: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || DEFAULT_API_KEY;
    this.connectionPromise = this.connect();
  }

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log("Tentativo di connessione WebSocket...");
      this.ws = new WebSocket(API_ENDPOINT);
      
      this.ws.onopen = () => {
        console.log("WebSocket connesso con successo");
        this.reconnectAttempts = 0;
        this.authenticate().then(resolve).catch(reject);
      };

      this.ws.onmessage = (event) => {
        console.log("Messaggio WebSocket ricevuto:", event.data);
        const response = JSON.parse(event.data);
        
        if (response.error || response.errors) {
          console.error("Errore WebSocket:", response);
          const errorMessage = response.errorMessage || response.errors?.[0]?.message || "Si è verificato un errore";
          
          if (errorMessage.includes("Invalid API key") || errorMessage.includes("Unauthorized")) {
            toast({
              title: "Errore API Key",
              description: "La chiave API Runware non è valida. Verifica le tue credenziali.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Errore",
              description: errorMessage,
              variant: "destructive"
            });
          }
          return;
        }

        if (response.data) {
          response.data.forEach((item: any) => {
            if (item.taskType === "authentication") {
              console.log("Autenticazione riuscita, UUID sessione:", item.connectionSessionUUID);
              this.connectionSessionUUID = item.connectionSessionUUID;
              this.isAuthenticated = true;
            } else {
              const callback = this.messageCallbacks.get(item.taskUUID);
              if (callback) {
                callback(item);
                this.messageCallbacks.delete(item.taskUUID);
              }
            }
          });
        }
      };

      this.ws.onerror = (error) => {
        console.error("Errore WebSocket:", error);
        toast({
          title: "Errore di connessione",
          description: "Impossibile connettersi al servizio. Riprova tra poco.",
          variant: "destructive"
        });
        reject(error);
      };

      this.ws.onclose = (event) => {
        console.log("WebSocket chiuso:", event.code, event.reason);
        this.isAuthenticated = false;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Tentativo di riconnessione ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
          setTimeout(() => {
            this.connectionPromise = this.connect();
          }, 2000 * this.reconnectAttempts);
        } else {
          toast({
            title: "Connessione persa",
            description: "Impossibile ristabilire la connessione. Ricarica la pagina.",
            variant: "destructive"
          });
        }
      };
    });
  }

  private authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket non pronto per l'autenticazione"));
        return;
      }
      
      const authMessage = [{
        taskType: "authentication",
        apiKey: this.apiKey,
        ...(this.connectionSessionUUID && { connectionSessionUUID: this.connectionSessionUUID }),
      }];
      
      console.log("Invio messaggio di autenticazione");
      
      const authCallback = (event: MessageEvent) => {
        const response = JSON.parse(event.data);
        if (response.data?.[0]?.taskType === "authentication") {
          this.ws?.removeEventListener("message", authCallback);
          resolve();
        }
      };
      
      this.ws.addEventListener("message", authCallback);
      this.ws.send(JSON.stringify(authMessage));
    });
  }

  async generateImage(params: GenerateImageParams): Promise<GeneratedImage> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageInference",
        taskUUID,
        model: params.model || "runware:100@1",
        width: 1024,
        height: 1024,
        numberResults: params.numberResults || 1,
        outputFormat: params.outputFormat || "WEBP",
        steps: 4,
        CFGScale: params.CFGScale || 1,
        scheduler: params.scheduler || "FlowMatchEulerDiscreteScheduler",
        strength: params.strength || 0.8,
        lora: params.lora || [],
        ...params,
      }];

      if (!params.seed) {
        delete message[0].seed;
      }

      if (message[0].model === "runware:100@1") {
        delete message[0].promptWeighting;
      }

      console.log("Invio richiesta generazione immagine:", message);

      const timeout = setTimeout(() => {
        this.messageCallbacks.delete(taskUUID);
        reject(new Error("Timeout durante la generazione dell'immagine"));
      }, 30000);

      this.messageCallbacks.set(taskUUID, (data) => {
        clearTimeout(timeout);
        if (data.error) {
          reject(new Error(data.errorMessage || "Errore durante la generazione"));
        } else {
          resolve(data);
        }
      });

      this.ws!.send(JSON.stringify(message));
    });
  }

  async generateMultipleImages(prompts: string[]): Promise<GeneratedImage[]> {
    const images: GeneratedImage[] = [];
    
    for (const prompt of prompts) {
      try {
        const image = await this.generateImage({ positivePrompt: prompt });
        images.push(image);
        // Piccola pausa tra le generazioni per evitare rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Errore generazione immagine per prompt "${prompt}":`, error);
        toast({
          title: "Avviso",
          description: `Impossibile generare una delle immagini. Continuando con le altre.`,
          variant: "destructive"
        });
      }
    }
    
    return images;
  }
}

// Export a default instance with the pre-configured API key
export const defaultRunwareService = new RunwareService();
