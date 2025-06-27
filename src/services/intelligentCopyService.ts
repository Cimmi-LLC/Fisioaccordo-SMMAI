
import { defaultOpenAIService } from './openaiService';

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
    
    // Analisi tipo (problema vs soluzione)
    const problemKeywords = ['dolore', 'problema', 'male', 'difficoltà', 'stress', 'ansia', 'disturbo', 'patologia', 'sintomo'];
    const solutionKeywords = ['benefici', 'vantaggi', 'soluzione', 'trattamento', 'terapia', 'cura', 'miglioramento', 'risultati'];
    
    const isProblem = problemKeywords.some(keyword => lowerTopic.includes(keyword));
    const isSolution = solutionKeywords.some(keyword => lowerTopic.includes(keyword));
    
    let type: 'problem' | 'solution' | 'general' = 'general';
    if (isProblem) type = 'problem';
    else if (isSolution) type = 'solution';
    
    // Analisi categoria
    const healthKeywords = ['fisio', 'terapia', 'dolore', 'riabilitazione', 'salute', 'benessere', 'muscolare'];
    const businessKeywords = ['business', 'vendita', 'marketing', 'successo', 'guadagno', 'profitto'];
    
    let category: TopicAnalysis['category'] = 'general';
    if (healthKeywords.some(keyword => lowerTopic.includes(keyword))) category = 'health';
    else if (businessKeywords.some(keyword => lowerTopic.includes(keyword))) category = 'business';
    
    // Analisi sentiment
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
    const analysis = this.analyzeTopicSemantics(topic);
    
    // Costruisci un prompt intelligente basato sull'analisi
    const prompt = this.buildIntelligentPrompt(topic, analysis, audience, platform, tone, user);
    
    try {
      const generatedCopy = await defaultOpenAIService.generateText({
        topic: prompt,
        audience,
        length: 'medio',
        tone,
        platform,
        postType: 'carosello'
      });
      
      return generatedCopy;
    } catch (error) {
      console.error('Errore generazione AI:', error);
      return this.generateFallbackCopy(topic, analysis, user);
    }
  }

  private static buildIntelligentPrompt(
    topic: string,
    analysis: TopicAnalysis,
    audience: string,
    platform: string,
    tone: string,
    user: any
  ): string {
    const clinicName = user?.user_metadata?.clinic_name || 'il nostro studio';
    
    let hookStarter = '';
    
    // Hook intelligente basato sul tipo di topic
    if (analysis.type === 'problem') {
      hookStarter = `🚨 ATTENZIONE: Se anche tu hai problemi con ${topic}`;
    } else if (analysis.type === 'solution') {
      hookStarter = `💡 SCOPERTA: Ecco come ${topic} può trasformare la tua vita`;
    } else {
      hookStarter = `🔥 VERITÀ SU ${topic.toUpperCase()}`;
    }
    
    const contextualPrompt = `
Crea un post ${platform} super-viral per ${audience} su: "${topic}"

HOOK INIZIALE: ${hookStarter}

CONTESTO SPECIFICO:
- Tipo di contenuto: ${analysis.type}
- Categoria: ${analysis.category}
- Sentiment: ${analysis.sentiment}
- Studio: ${clinicName}

STRUTTURA RICHIESTA:
1. Hook che ferma lo scroll (già definito sopra)
2. Problema specifico che il target vive
3. Soluzione concreta offerta
4. Proof/testimonianza
5. Call to action forte con ${clinicName}

STILE: ${tone}, diretto, che converte
LUNGHEZZA: Post completo con emojis strategici
    `;
    
    return contextualPrompt;
  }

  private static generateFallbackCopy(topic: string, analysis: TopicAnalysis, user: any): string {
    const clinicName = user?.user_metadata?.clinic_name || 'Il nostro studio';
    
    let hook = '';
    if (analysis.type === 'problem') {
      hook = `🚨 STOP! Se anche tu soffri di ${topic}, questo post può cambiarti la vita!`;
    } else if (analysis.type === 'solution') {
      hook = `💡 SCOPERTA: ${topic} - ecco come funziona davvero!`;
    } else {
      hook = `🔥 LA VERITÀ SU ${topic.toUpperCase()} che nessuno ti dice!`;
    }
    
    return `${hook}

💥 IL PROBLEMA: Ogni giorno vedo persone che lottano con questo problema senza trovare la soluzione giusta.

❌ ERRORE COMUNE: La maggior parte delle persone ignora i primi segnali e si affida a rimedi temporanei.

✅ LA SOLUZIONE: Come professionista con anni di esperienza, ho sviluppato un approccio che funziona davvero:

🎯 3 PASSI SCIENTIFICI:
1️⃣ Valutazione completa della situazione
2️⃣ Protocollo personalizzato
3️⃣ Follow-up per risultati duraturi

🔥 RISULTATI GARANTITI:
• Miglioramento visibile in 7-14 giorni
• Soluzione duratura nel tempo
• Approccio 100% naturale

💬 TESTIMONIANZA: "Finalmente ho risolto un problema che avevo da mesi!" - Maria, 45 anni

🚀 VUOI RISULTATI CONCRETI?

📞 Prenota una consulenza GRATUITA
💬 Scrivici in DM "CONSULENZA"
🏢 ${clinicName}

⏰ SOLO 5 POSTI DISPONIBILI questa settimana!

#fisioterapia #salute #benessere`;
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

  static async generateViralContent(
    format: ViralFormat,
    topic: string,
    audience: string,
    user: any
  ): Promise<string> {
    const analysis = this.analyzeTopicSemantics(topic);
    const clinicName = user?.user_metadata?.clinic_name || 'il nostro studio';
    
    const prompt = `
Crea un contenuto viral usando il format "${format.name}" per il topic: "${topic}"

TARGET: ${audience}
STUDIO: ${clinicName}

TEMPLATE DA SEGUIRE:
${format.template}

ESEMPIO DI RIFERIMENTO:
${format.example}

REGOLE:
- Usa il template esatto ma personalizzalo per ${topic}
- Mantieni lo stesso livello di engagement dell'esempio
- Include sempre una CTA con ${clinicName}
- Stile: diretto, che ferma lo scroll, converte
- Lunghezza: ottimizzata per ${format.platforms.join(', ')}
    `;

    try {
      return await defaultOpenAIService.generateText({
        topic: prompt,
        audience,
        length: 'medio',
        tone: 'virale',
        platform: format.platforms[0],
        postType: 'viral-format'
      });
    } catch (error) {
      console.error('Errore generazione viral format:', error);
      return this.generateFallbackViralContent(format, topic, analysis, clinicName);
    }
  }

  private static generateFallbackViralContent(
    format: ViralFormat,
    topic: string,
    analysis: TopicAnalysis,
    clinicName: string
  ): string {
    // Fallback semplice basato sul template
    switch (format.id) {
      case 'thread-shock':
        return `🚨 La verità su ${topic} che nessuno ti dice\n\nMa quello che è successo dopo ha cambiato tutto.\n\n(Thread con dettagli che vi scioccheranno) 🧵\n\n1/5`;
      
      case 'problem-agitation':
        return `😡 Ti è mai capitato di avere problemi con ${topic}?\n\n💥 È PEGGIO di quello che pensi perché ogni giorno può peggiorare\n\n✅ Ecco come ${clinicName} può aiutarti`;
      
      default:
        return `🔥 ${topic.toUpperCase()}: la verità che cambia tutto\n\nScopri come ${clinicName} ha rivoluzionato l'approccio\n\n👉 Prenota la tua consulenza`;
    }
  }
}
