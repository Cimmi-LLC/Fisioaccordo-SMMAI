
import { CopyTemplate } from './types';

export const ADVANCED_TEMPLATES: CopyTemplate[] = [
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
  },
  // NUOVI TEMPLATE VIRALI
  {
    id: 'viral-controversy',
    name: 'Controversia Virale',
    category: 'hook',
    template: '🔥 OPINIONE IMPOPOLARE: {opinione_controversa} e tutti mi odiano per averlo detto. Ma dopo 3 anni di ricerche, ho la prova che ho ragione...',
    variables: ['opinione_controversa'],
    description: 'Crea dibattito e engagement attraverso opinioni polarizzanti',
    effectiveness_score: 98,
    use_cases: ['dibattito', 'engagement', 'discussione']
  },
  {
    id: 'viral-secret-method',
    name: 'Metodo Segreto',
    category: 'hook',
    template: '🤫 SEGRETO: Ho scoperto come {risultato_desiderato} in {tempo_record}. Il trucco che NESSUNO conosce (thread)...',
    variables: ['risultato_desiderato', 'tempo_record'],
    description: 'Promette informazioni esclusive e non disponibili altrove',
    effectiveness_score: 96,
    use_cases: ['tips', 'tutorial', 'strategie']
  },
  {
    id: 'viral-behind-scenes',
    name: 'Dietro le Quinte',
    category: 'storytelling',
    template: '📹 DIETRO LE QUINTE: Quello che è successo REALMENTE quando {evento_importante}. La verità che non vedrete mai sui giornali...',
    variables: ['evento_importante'],
    description: 'Rivela informazioni interne e crea curiosità morbosa',
    effectiveness_score: 94,
    use_cases: ['storytelling', 'trasparenza', 'autenticità']
  },
  {
    id: 'viral-before-after',
    name: 'Prima vs Dopo Drammatico',
    category: 'social-proof',
    template: '😱 PRIMA vs DOPO: {situazione_drammatica_prima} ➡️ {risultato_incredibile_dopo}. La trasformazione che ha scioccato tutti (con foto)...',
    variables: ['situazione_drammatica_prima', 'risultato_incredibile_dopo'],
    description: 'Trasformazioni visive che fermano lo scroll',
    effectiveness_score: 97,
    use_cases: ['trasformazioni', 'risultati', 'case-study']
  },
  {
    id: 'viral-industry-expose',
    name: 'Scandalo del Settore',
    category: 'hook',
    template: '💣 SCANDALO: Lavorando nel settore {settore} per {anni} anni, ho visto cose che vi scioccherebbero. Ecco la verità che {industria} non vuole che sappiate...',
    variables: ['settore', 'anni', 'industria'],
    description: 'Espone i segreti di un settore specifico',
    effectiveness_score: 95,
    use_cases: ['esposizione', 'verità', 'industria']
  },
  {
    id: 'viral-challenge-accepted',
    name: 'Sfida Accettata',
    category: 'hook',
    template: '🎯 SFIDA ACCETTATA: Mi hanno sfidato a {obiettivo_impossibile} in {tempo_limitato}. Giorno 1: ecco cosa è successo (thread di aggiornamenti quotidiani)...',
    variables: ['obiettivo_impossibile', 'tempo_limitato'],
    description: 'Crea una serie di contenuti seguendo una sfida in tempo reale',
    effectiveness_score: 93,
    use_cases: ['serie', 'sfide', 'journey']
  },
  {
    id: 'viral-mistake-cost',
    name: 'Errore Costoso',
    category: 'hook',
    template: '💸 ERRORE da {costo_errore}: Ho commesso il più grande errore della mia vita con {argomento}. Mi è costato {conseguenze}. Imparate dai miei sbagli...',
    variables: ['costo_errore', 'argomento', 'conseguenze'],
    description: 'Condivide errori costosi per educare altri',
    effectiveness_score: 91,
    use_cases: ['educativo', 'lezioni', 'esperienze']
  },
  {
    id: 'viral-prediction-proven',
    name: 'Predizione Realizzata',
    category: 'hook',
    template: '🔮 VI AVEVO AVVERTITI: {tempo_fa} avevo previsto che {predizione}. Tutti mi hanno dato del pazzo. Oggi eccoci qui... Thread di come ho fatto a saperlo:',
    variables: ['tempo_fa', 'predizione'],
    description: 'Rivendica predizioni passate che si sono avverate',
    effectiveness_score: 89,
    use_cases: ['autorevolezza', 'predizioni', 'analisi']
  },
  {
    id: 'viral-zero-to-hero',
    name: 'Da Zero a Eroe',
    category: 'storytelling',
    template: '📈 DA 0 A {risultato_finale}: La mia storia completa in {numero_punti} punti. Da {situazione_partenza} a {situazione_arrivo}. Thread con tutti i dettagli:',
    variables: ['risultato_finale', 'numero_punti', 'situazione_partenza', 'situazione_arrivo'],
    description: 'Racconta una trasformazione completa passo dopo passo',
    effectiveness_score: 92,
    use_cases: ['ispirazione', 'journey', 'motivazione']
  },
  {
    id: 'viral-data-shock',
    name: 'Dati Scioccanti',
    category: 'hook',
    template: '📊 DATI SCIOCCANTI: Ho analizzato {numero_campioni} {tipo_dati} e quello che ho scoperto vi lascerà senza parole. Il {percentuale}% di voi sta facendo questo errore...',
    variables: ['numero_campioni', 'tipo_dati', 'percentuale'],
    description: 'Presenta ricerche e dati in modo coinvolgente',
    effectiveness_score: 88,
    use_cases: ['ricerca', 'dati', 'statistiche']
  }
];

export const getTemplatesByCategory = (category?: string): CopyTemplate[] => {
  if (!category) return ADVANCED_TEMPLATES;
  return ADVANCED_TEMPLATES.filter(t => t.category === category);
};
