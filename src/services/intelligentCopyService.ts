
import { supabase } from "@/integrations/supabase/client";

export interface TopicAnalysis {
  type: 'problem' | 'solution' | 'general';
  category: 'health' | 'business' | 'lifestyle' | 'education' | 'general';
  sentiment: 'positive' | 'negative' | 'neutral';
  keywords: string[];
}

export interface ViralFormat {
  id: string;
  name: string;
  description: string;
  template: string;
  example: string;
  effectiveness: number;
  platforms: string[];
}

export class IntelligentCopyService {
  
  static analyzeTopicSemantics(topic: string): TopicAnalysis {
    const lowerTopic = topic.toLowerCase();
    
    const problemKeywords = ['dolore', 'problema', 'male', 'difficoltà', 'stress', 'ansia', 'disturbo', 'patologia', 'sintomo'];
    const solutionKeywords = ['benefici', 'vantaggi', 'soluzione', 'trattamento', 'terapia', 'cura', 'miglioramento', 'risultati'];
    
    const isProblem = problemKeywords.some(keyword => lowerTopic.includes(keyword));
    const isSolution = solutionKeywords.some(keyword => lowerTopic.includes(keyword));
    
    let type: 'problem' | 'solution' | 'general' = 'general';
    if (isProblem) type = 'problem';
    else if (isSolution) type = 'solution';
    
    const healthKeywords = ['fisio', 'terapia', 'dolore', 'riabilitazione', 'salute', 'benessere', 'muscolare'];
    const businessKeywords = ['business', 'vendita', 'marketing', 'successo', 'guadagno', 'profitto'];
    
    let category: TopicAnalysis['category'] = 'general';
    if (healthKeywords.some(keyword => lowerTopic.includes(keyword))) category = 'health';
    else if (businessKeywords.some(keyword => lowerTopic.includes(keyword))) category = 'business';
    
    const positiveKeywords = ['benefici', 'vantaggi', 'successo', 'miglioramento', 'risultati', 'efficace'];
    const negativeKeywords = ['dolore', 'problema', 'difficoltà', 'stress', 'male'];
    
    let sentiment: TopicAnalysis['sentiment'] = 'neutral';
    if (positiveKeywords.some(keyword => lowerTopic.includes(keyword))) sentiment = 'positive';
    else if (negativeKeywords.some(keyword => lowerTopic.includes(keyword))) sentiment = 'negative';
    
    return {
      type,
      category,
      sentiment,
      keywords: lowerTopic.split(' ').filter(word => word.length > 3)
    };
  }

  static async generatePersonalizedCopy(
    topic: string,
    audience: string,
    platform: string,
    tone: string,
    user: any
  ): Promise<string> {
    const { data, error } = await supabase.functions.invoke('generate-content', {
      body: {
        topic,
        audience,
        platform,
        tone,
        postType: 'carosello',
        numSlides: 5
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Errore generazione contenuto');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data?.content || 'Errore nella generazione del contenuto';
  }

  static async generateViralContent(
    format: ViralFormat,
    topic: string,
    audience: string,
    user: any
  ): Promise<string> {
    // Use the same edge function with format context in the topic
    const enhancedTopic = `[Format: ${format.name}] ${topic}. Segui questo template: ${format.template}`;
    
    const { data, error } = await supabase.functions.invoke('generate-content', {
      body: {
        topic: enhancedTopic,
        audience,
        platform: format.platforms[0] || 'instagram',
        tone: 'virale',
        postType: 'viral-format',
        numSlides: 1
      }
    });

    if (error || data?.error) {
      console.error('Viral content error:', error || data?.error);
      return `🔥 ${topic.toUpperCase()}: la verità che cambia tutto\n\nScopri di più 👇`;
    }

    return data?.content || '';
  }

  static getViralFormats(): ViralFormat[] {
    return [
      {
        id: 'thread-shock',
        name: '🧵 Thread Shock',
        description: 'Thread Twitter/X che sciocca e genera engagement',
        template: '🚨 {HOOK_SCIOCCANTE}\n\nMa quello che è successo dopo ha cambiato tutto.\n\n(Thread con dettagli che vi scioccheranno) 🧵\n\n1/{NUMERO_THREAD}',
        example: '🚨 Ho perso 15kg in 30 giorni mangiando SOLO pizza\n\nMa quello che è successo dopo ha cambiato tutto.\n\n(Thread con dettagli che vi scioccheranno) 🧵\n\n1/7',
        effectiveness: 98,
        platforms: ['twitter', 'linkedin', 'instagram']
      },
      {
        id: 'carousel-reveal',
        name: '📱 Carousel Reveal',
        description: 'Carosello Instagram con rivelazione graduale',
        template: 'Slide 1: {TEASER_MISTERIOSO}\nSlide 2-4: {SVILUPPO_GRADUALE}\nSlide 5: {RIVELAZIONE_FINALE}',
        example: 'Slide 1: "Il segreto che i dottori non vogliono che tu sappia"\nSlide 2: "Dopo 10 anni di ricerca..."\nSlide 5: "Ecco la verità"',
        effectiveness: 95,
        platforms: ['instagram', 'linkedin']
      },
      {
        id: 'problem-agitation',
        name: '💢 Problem Agitation',
        description: 'Agita il problema prima di dare la soluzione',
        template: '😡 Ti è mai capitato di {PROBLEMA_COMUNE}?\n\n💥 È PEGGIO di quello che pensi perché {AGGRAVAMENTO}\n\n✅ Ecco come risolvere: {SOLUZIONE}',
        example: '😡 Ti è mai capitato di svegliarti con mal di schiena?\n\n💥 È PEGGIO di quello che pensi perché ogni giorno peggiora\n\n✅ Ecco come risolvere: 3 esercizi da 2 minuti',
        effectiveness: 92,
        platforms: ['instagram', 'facebook', 'linkedin']
      },
      {
        id: 'before-after-bridge',
        name: '🌉 Before After Bridge',
        description: 'Mostra trasformazione con ponte emotivo',
        template: '📉 PRIMA: {SITUAZIONE_NEGATIVA}\n\n📈 DOPO: {SITUAZIONE_POSITIVA}\n\n🌉 IL PONTE: {COME_CI_SONO_ARRIVATO}',
        example: '📉 PRIMA: Dolore cronico da 5 anni\n\n📈 DOPO: Vita normale senza farmaci\n\n🌉 IL PONTE: 1 tecnica che ha cambiato tutto',
        effectiveness: 94,
        platforms: ['instagram', 'facebook', 'tiktok']
      },
      {
        id: 'authority-crusher',
        name: '👑 Authority Crusher',
        description: 'Costruisce autorità demolendo credenze comuni',
        template: '🔥 TUTTI ti dicono {CREDENZA_COMUNE}\n\n❌ È FALSO. Ecco perché: {SPIEGAZIONE}\n\n✅ La VERITÀ è: {VERITA_ALTERNATIVA}',
        example: '🔥 TUTTI ti dicono di riposare quando hai mal di schiena\n\n❌ È FALSO. Ecco perché: il riposo peggiora\n\n✅ La VERITÀ è: movimento specifico guarisce',
        effectiveness: 96,
        platforms: ['linkedin', 'instagram', 'twitter']
      },
      {
        id: 'story-transformation',
        name: '📖 Story Transformation',
        description: 'Storia personale di trasformazione',
        template: '{TEMPO_FA} ero {SITUAZIONE_NEGATIVA}\n\nOggi sono {SITUAZIONE_POSITIVA}\n\nEcco cosa è cambiato: {MOMENTO_SVOLTA}',
        example: '2 anni fa ero sempre stanco e demotivato\n\nOggi aiuto 100+ persone al mese\n\nEcco cosa è cambiato: ho scoperto la vera causa',
        effectiveness: 90,
        platforms: ['instagram', 'facebook', 'linkedin']
      }
    ];
  }
}
