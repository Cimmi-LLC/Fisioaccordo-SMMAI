/**
 * Italian Text Validator - Ensures perfect accent and typography rendering
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
  correctedText: string;
}

export class ItalianTextValidator {
  // Italian accented characters mapping
  private static readonly ACCENT_MAP = {
    'a\'': 'à',
    'e\'': 'è',
    'e`': 'è',
    'i\'': 'ì',
    'o\'': 'ò',
    'u\'': 'ù',
    'A\'': 'À',
    'E\'': 'È',
    'E`': 'È',
    'I\'': 'Ì',
    'O\'': 'Ò',
    'U\'': 'Ù'
  };

  // Common Italian words that require accents
  private static readonly ACCENT_WORDS = {
    'perche': 'perché',
    'piu': 'più',
    'cioe': 'cioè',
    'giu': 'giù',
    'su': 'sù',
    'gia': 'già',
    'ne': 'né',
    'si': 'sì',
    'la': 'là',
    'li': 'lì',
    'caffe': 'caffè',
    'te': 'tè',
    'citta': 'città',
    'papa': 'papà',
    'qualita': 'qualità',
    'liberta': 'libertà',
    'verita': 'verità',
    'eta': 'età',
    'universita': 'università',
    'attivita': 'attività',
    'facilita': 'facilità',
    'possibilita': 'possibilità',
    'societa': 'società',
    'realta': 'realtà',
    'novita': 'novità',
    'identita': 'identità',
    'autorita': 'autorità',
    'integrita': 'integrità',
    'sicurezza': 'sicurezza',
    'bellezza': 'bellezza',
    'ricchezza': 'ricchezza'
  };

  // Italian typography rules
  private static readonly TYPOGRAPHY_RULES = {
    // Quotes
    '"([^"]*)"': '«$1»',
    // Dashes
    ' - ': ' – ',
    // Ellipsis
    '\\.\\.\\.': '…'
  };

  /**
   * Validates and corrects Italian text
   */
  static validate(text: string): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let correctedText = text;

    // 1. Fix accent mapping
    Object.entries(this.ACCENT_MAP).forEach(([wrong, correct]) => {
      if (correctedText.includes(wrong)) {
        correctedText = correctedText.replace(new RegExp(wrong, 'g'), correct);
        suggestions.push(`Sostituito "${wrong}" con "${correct}"`);
      }
    });

    // 2. Fix common words with missing accents
    Object.entries(this.ACCENT_WORDS).forEach(([wrong, correct]) => {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      if (regex.test(correctedText)) {
        correctedText = correctedText.replace(regex, correct);
        suggestions.push(`Aggiunto accento: "${wrong}" → "${correct}"`);
      }
    });

    // 3. Apply typography rules
    Object.entries(this.TYPOGRAPHY_RULES).forEach(([pattern, replacement]) => {
      const regex = new RegExp(pattern, 'g');
      if (regex.test(correctedText)) {
        correctedText = correctedText.replace(regex, replacement);
        suggestions.push(`Migliorata tipografia: ${pattern}`);
      }
    });

    // 4. Check for remaining issues
    if (correctedText.includes('perche') && !correctedText.includes('perché')) {
      errors.push('Possibile "perché" senza accento');
    }

    if (correctedText.includes('piu') && !correctedText.includes('più')) {
      errors.push('Possibile "più" senza accento');
    }

    // 5. Check for double spaces and formatting
    if (correctedText.includes('  ')) {
      correctedText = correctedText.replace(/\s+/g, ' ');
      suggestions.push('Rimossi spazi doppi');
    }

    // 6. Capitalize sentences properly
    correctedText = correctedText.replace(/([.!?]\s*)([a-z])/g, (match, punctuation, letter) => {
      return punctuation + letter.toUpperCase();
    });

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      suggestions,
      correctedText: correctedText.trim()
    };
  }

  /**
   * Get optimal font for Italian text rendering
   */
  static getOptimalFont(text: string): string {
    const hasAccents = /[àèéìíîòóùú]/i.test(text);
    const isDisplayText = text.length < 50;
    
    if (hasAccents && isDisplayText) {
      return 'Montserrat'; // Best for accented display text
    } else if (hasAccents) {
      return 'Inter'; // Best for accented body text
    } else if (isDisplayText) {
      return 'Playfair Display'; // Elegant for titles
    }
    
    return 'Poppins'; // Default fallback
  }

  /**
   * Check if text is readable against background
   */
  static checkContrast(textColor: string, backgroundColor: string): number {
    // Simplified contrast calculation
    const getLuminance = (color: string): number => {
      // Convert hex to RGB and calculate luminance
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };

    const textLum = getLuminance(textColor);
    const bgLum = getLuminance(backgroundColor);
    
    const brightest = Math.max(textLum, bgLum);
    const darkest = Math.min(textLum, bgLum);
    
    return (brightest + 0.05) / (darkest + 0.05);
  }
}