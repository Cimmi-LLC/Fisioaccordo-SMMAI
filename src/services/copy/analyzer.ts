
import { CopyAnalysis } from './types';

export const analyzeCopy = (text: string): CopyAnalysis => {
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
  const hookScore = analyzeHook(hook);
  analysis.hook_rating = hookScore;

  // Analisi Emotiva
  const emotionScore = analyzeEmotion(text);
  analysis.emotion_rating = emotionScore;

  // Analisi Chiarezza
  const clarityScore = analyzeClarity(text);
  analysis.clarity_rating = clarityScore;

  // Analisi CTA
  const ctaScore = analyzeCTA(text);
  analysis.cta_rating = ctaScore;

  // Score totale
  analysis.score = Math.round((hookScore + emotionScore + clarityScore + ctaScore) / 4);

  // Suggerimenti basati sull'analisi
  analysis.suggestions = generateSuggestions(analysis);

  return analysis;
};

const analyzeHook = (hook: string): number => {
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
};

const analyzeEmotion = (text: string): number => {
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
};

const analyzeClarity = (text: string): number => {
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
};

const analyzeCTA = (text: string): number => {
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
};

const generateSuggestions = (analysis: CopyAnalysis): string[] => {
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
};
