
interface CopyTemplate {
  id: string;
  name: string;
  category: 'hook' | 'storytelling' | 'cta' | 'problem-solution' | 'social-proof';
  template: string;
  variables: string[];
  description: string;
  effectiveness_score?: number;
  use_cases: string[];
}

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  examples: string[];
  effectiveness_rating: number;
}

interface CopyAnalysis {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  hook_rating: number;
  emotion_rating: number;
  clarity_rating: number;
  cta_rating: number;
}

export class CopyService {
  // Template predefiniti basati su strategie avanzate
  private static readonly ADVANCED_TEMPLATES: CopyTemplate[] = [
    {
      id: 'truth-reveal',
      name: 'Rivelazione della Verità',
      category: 'hook',
      template: '🚨 VERITÀ SCIOCCANTE: La maggior parte delle persone con {problema} non sa che {verità_nascosta}. Ecco cosa {autorità} non ti dice mai...',
      variables: ['problema', 'verità_nascosta', 'autorità'],
      description: 'Hook potentissimo che crea curiosità e autorità',
      effectiveness_score: 95,
      use_cases: ['salute', 'business', 'relazioni', 'finanza']
    },
    {
      id: 'mistake-pattern',
      name: 'Pattern degli Errori',
      category: 'hook',
      template: '❌ ERRORE FATALE: Se hai {problema}, probabilmente stai commettendo questi 3 errori che peggiorano tutto. Errore #1: {errore_comune}...',
      variables: ['problema', 'errore_comune'],
      description: 'Pattern che identifica errori comuni e crea urgenza',
      effectiveness_score: 92,
      use_cases: ['educativo', 'problem-solving', 'guide']
    },
    {
      id: 'transformation-story',
      name: 'Storia di Trasformazione',
      category: 'storytelling',
      template: 'Da {situazione_prima} a {risultato_dopo} in soli {tempo}. Ecco esattamente cosa ho fatto (e cosa NON devi mai fare)...',
      variables: ['situazione_prima', 'risultato_dopo', 'tempo'],
      description: 'Storytelling potente con trasformazione credibile',
      effectiveness_score: 88,
      use_cases: ['testimonial', 'case-study', 'motivazionale']
    },
    {
      id: 'urgency-scarcity',
      name: 'Urgenza + Scarsità',
      category: 'cta',
      template: '⏰ ULTIMO GIORNO: Solo {numero} posti rimasti per {offerta}. Dopo mezzanotte il prezzo raddoppia. Non dire che non ti avevo avvisato...',
      variables: ['numero', 'offerta'],
      description: 'CTA con urgenza e scarsità psicologica',
      effectiveness_score: 85,
      use_cases: ['vendita', 'promozioni', 'eventi']
    },
    {
      id: 'social-proof-authority',
      name: 'Prova Sociale + Autorità',
      category: 'social-proof',
      template: '{numero_clienti}+ persone hanno già risolto {problema} con questo metodo. Anche {autorità_famosa} lo raccomanda. Vuoi essere il prossimo?',
      variables: ['numero_clienti', 'problema', 'autorità_famosa'],
      description: 'Combina numeri impressionanti con autorità riconosciuta',
      effectiveness_score: 90,
      use_cases: ['vendita', 'credibilità', 'conversione']
    }
  ];

  // Knowledge base con strategie avanzate
  private static readonly KNOWLEDGE_BASE: KnowledgeEntry[] = [
    {
      id: 'hook-psychology',
      title: 'Psicologia degli Hook Vincenti',
      content: 'Un hook efficace deve attivare almeno 3 trigger psicologici: curiosità, urgenza e rilevanza personale. La formula segreta è: PROBLEMA + PROMESSA + PROVA in 10 parole o meno.',
      category: 'hook-strategies',
      tags: ['psicologia', 'hook', 'attenzione', 'curiosità'],
      examples: [
        '🚨 ATTENZIONE: Se soffri di mal di schiena, questo post può cambiarti la vita!',
        '❌ ERRORE: Il 90% delle diete fallisce per questo motivo nascosto...',
        '💡 SCOPERTA: Il segreto che i nutrizionisti non vogliono che tu sappia'
      ],
      effectiveness_rating: 95
    },
    {
      id: 'storytelling-framework',
      title: 'Framework di Storytelling Virale',
      content: 'Usa la struttura: AGGANCIO → CONFLITTO → LOTTA → RISOLUZIONE → LEZIONE. Ogni storia deve avere un momento di "tutto sembrava perduto" seguito da una svolta drammatica.',
      category: 'storytelling',
      tags: ['storytelling', 'engagement', 'emozioni', 'struttura'],
      examples: [
        'Tre anni fa ero sul punto di chiudere la mia azienda...',
        'Il dottore mi disse che non c\'era più niente da fare...',
        'Quella notte ho preso la decisione che ha cambiato tutto...'
      ],
      effectiveness_rating: 92
    },
    {
      id: 'cta-conversion',
      title: 'CTA ad Alta Conversione',
      content: 'Le CTA migliori combinano: urgenza temporale + beneficio specifico + barriera bassa. Mai usare "clicca qui" - sempre usare verbi d\'azione con beneficio.',
      category: 'conversion',
      tags: ['cta', 'conversione', 'azione', 'urgenza'],
      examples: [
        'Prenota la tua consulenza GRATUITA (ultimi 3 posti)',
        'Scarica la guida PRIMA che sparisca',
        'Inizia la trasformazione OGGI (5 minuti)'
      ],
      effectiveness_rating: 88
    }
  ];

  static getTemplatesByCategory(category?: string): CopyTemplate[] {
    if (!category) return this.ADVANCED_TEMPLATES;
    return this.ADVANCED_TEMPLATES.filter(t => t.category === category);
  }

  static getKnowledgeByCategory(category?: string): KnowledgeEntry[] {
    if (!category) return this.KNOWLEDGE_BASE;
    return this.KNOWLEDGE_BASE.filter(k => k.category === category);
  }

  static analyzeCopy(text: string): CopyAnalysis {
    const analysis: CopyAnalysis = {
      score: 0,
      strengths: [],
      weaknesses: [],
      suggestions: [],
      hook_rating: 0,
      emotion_rating: 0,
      clarity_rating: 0,
      cta_rating: 0
    };

    // Analisi Hook (primi 100 caratteri)
    const hook = text.substring(0, 100);
    const hookScore = this.analyzeHook(hook);
    analysis.hook_rating = hookScore;

    // Analisi Emotiva
    const emotionScore = this.analyzeEmotion(text);
    analysis.emotion_rating = emotionScore;

    // Analisi Chiarezza
    const clarityScore = this.analyzeClarity(text);
    analysis.clarity_rating = clarityScore;

    // Analisi CTA
    const ctaScore = this.analyzeCTA(text);
    analysis.cta_rating = ctaScore;

    // Score totale
    analysis.score = Math.round((hookScore + emotionScore + clarityScore + ctaScore) / 4);

    // Suggerimenti basati sull'analisi
    analysis.suggestions = this.generateSuggestions(analysis);

    return analysis;
  }

  private static analyzeHook(hook: string): number {
    let score = 0;
    
    // Controlla trigger words
    const triggerWords = ['attenzione', 'errore', 'segreto', 'verità', 'scoperta', 'shock', 'rivelazione'];
    if (triggerWords.some(word => hook.toLowerCase().includes(word))) score += 25;
    
    // Controlla emoji/simboli
    if (/[🚨❌💡🔥⚡🎯]/g.test(hook)) score += 20;
    
    // Controlla domande o curiosità
    if (hook.includes('?') || hook.includes('...')) score += 15;
    
    // Controlla numeri specifici
    if (/\d+/.test(hook)) score += 15;
    
    // Controlla urgenza
    if (['ultimo', 'ora', 'subito', 'oggi'].some(word => hook.toLowerCase().includes(word))) score += 25;

    return Math.min(score, 100);
  }

  private static analyzeEmotion(text: string): number {
    let score = 0;
    
    const emotionalWords = {
      high: ['incredibile', 'shock', 'devastante', 'rivoluzionario', 'magico', 'miracoloso'],
      medium: ['sorprendente', 'interessante', 'utile', 'importante', 'efficace'],
      low: ['normale', 'standard', 'comune', 'tipico']
    };
    
    const textLower = text.toLowerCase();
    
    if (emotionalWords.high.some(word => textLower.includes(word))) score += 40;
    if (emotionalWords.medium.some(word => textLower.includes(word))) score += 20;
    if (emotionalWords.low.some(word => textLower.includes(word))) score -= 10;
    
    // Controlla storie personali
    if (['io', 'mio', 'mia', 'ho', 'sono'].some(word => textLower.includes(word))) score += 20;
    
    // Controlla call emotivi
    if (['dolore', 'frustrazione', 'gioia', 'felicità', 'paura'].some(word => textLower.includes(word))) score += 20;

    return Math.max(0, Math.min(score, 100));
  }

  private static analyzeClarity(text: string): number {
    let score = 100;
    
    const sentences = text.split('.').filter(s => s.trim().length > 0);
    
    // Penalizza frasi troppo lunghe
    sentences.forEach(sentence => {
      if (sentence.length > 100) score -= 10;
    });
    
    // Controlla parole complesse
    const complexWords = ['utilizzare', 'implementare', 'ottimizzare', 'massimizzare'];
    if (complexWords.some(word => text.toLowerCase().includes(word))) score -= 15;
    
    // Premia struttura chiara
    if (text.includes('1.') || text.includes('•') || text.includes('-')) score += 10;
    
    return Math.max(0, Math.min(score, 100));
  }

  private static analyzeCTA(text: string): number {
    let score = 0;
    
    const ctaWords = ['prenota', 'scarica', 'inizia', 'scopri', 'ottieni', 'clicca', 'leggi'];
    if (ctaWords.some(word => text.toLowerCase().includes(word))) score += 30;
    
    // Controlla urgenza nella CTA
    if (['ora', 'subito', 'oggi', 'ultimo'].some(word => text.toLowerCase().includes(word))) score += 25;
    
    // Controlla beneficio nella CTA
    if (['gratuito', 'gratis', 'bonus', 'regalo'].some(word => text.toLowerCase().includes(word))) score += 25;
    
    // Controlla barriera bassa
    if (['5 minuti', 'veloce', 'facile', 'semplice'].some(word => text.toLowerCase().includes(word))) score += 20;

    return Math.min(score, 100);
  }

  private static generateSuggestions(analysis: CopyAnalysis): string[] {
    const suggestions: string[] = [];
    
    if (analysis.hook_rating < 70) {
      suggestions.push('🎯 Migliora l\'hook: aggiungi un trigger word forte come "ATTENZIONE" o "ERRORE"');
      suggestions.push('🔥 Usa emoji strategici per fermare lo scroll');
    }
    
    if (analysis.emotion_rating < 60) {
      suggestions.push('💭 Racconta una storia personale per creare connessione emotiva');
      suggestions.push('😮 Usa parole più emotivamente cariche');
    }
    
    if (analysis.clarity_rating < 70) {
      suggestions.push('📝 Semplifica il linguaggio: usa frasi più corte');
      suggestions.push('📋 Struttura meglio il contenuto con elenchi puntati');
    }
    
    if (analysis.cta_rating < 50) {
      suggestions.push('🎯 Aggiungi una call-to-action chiara e specifica');
      suggestions.push('⏰ Crea urgenza nella tua CTA');
    }

    return suggestions;
  }

  static generateImprovedCopy(originalText: string, selectedTemplates: string[]): string {
    const analysis = this.analyzeCopy(originalText);
    
    // Trova il template più adatto
    const bestTemplate = this.ADVANCED_TEMPLATES.find(t => 
      selectedTemplates.includes(t.id) || 
      (analysis.hook_rating < 70 && t.category === 'hook')
    );
    
    if (!bestTemplate) return originalText;
    
    // Estrai variabili dal testo originale
    const extractedVars = this.extractVariables(originalText, bestTemplate.variables);
    
    // Applica il template
    let improvedCopy = bestTemplate.template;
    Object.entries(extractedVars).forEach(([key, value]) => {
      improvedCopy = improvedCopy.replace(`{${key}}`, value);
    });
    
    return improvedCopy;
  }

  private static extractVariables(text: string, variables: string[]): Record<string, string> {
    const extracted: Record<string, string> = {};
    
    // Logica semplificata per estrarre variabili dal testo
    // In un sistema reale, useresti NLP più avanzato
    variables.forEach(variable => {
      switch (variable) {
        case 'problema':
          const problemMatch = text.match(/(mal di \w+|stress|ansia|dolore|difficoltà)/i);
          extracted[variable] = problemMatch ? problemMatch[0] : 'il tuo problema';
          break;
        case 'soluzione':
          extracted[variable] = 'la soluzione che cerchi';
          break;
        case 'tempo':
          const timeMatch = text.match(/(\d+\s*(giorni?|settimane?|mesi?))/i);
          extracted[variable] = timeMatch ? timeMatch[0] : '30 giorni';
          break;
        default:
          extracted[variable] = `[${variable}]`;
      }
    });
    
    return extracted;
  }
}
