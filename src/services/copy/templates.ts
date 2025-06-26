
import { CopyTemplate } from './types';

export const ADVANCED_TEMPLATES: CopyTemplate[] = [
  // TEMPLATE BASATI SU CAMPAGNE DI SUCCESSO REALI
  {
    id: 'ogilvy-classic',
    name: 'Formula Ogilvy Classica',
    category: 'hook',
    template: 'Come {target_audience} può {desiderio_specifico} senza {paura_principale} (anche se {situazione_difficile})',
    variables: ['target_audience', 'desiderio_specifico', 'paura_principale', 'situazione_difficile'],
    description: 'La formula testata da David Ogilvy per headline ad alta conversione',
    effectiveness_score: 96,
    use_cases: ['lead-generation', 'vendita', 'engagement']
  },
  {
    id: 'pas-professional',
    name: 'PAS Professionale',
    category: 'storytelling',
    template: '🚨 PROBLEMA: {problema_specifico} ti sta {conseguenza_negativa}.\n\n💥 LA VERITÀ: Ogni giorno che passa, {aggravamento_situazione}. {statistica_scioccante}% delle persone con questo problema {conseguenza_estrema}.\n\n✅ SOLUZIONE: {soluzione_unica} che {beneficio_trasformativo} in soli {tempo_specifico}.',
    variables: ['problema_specifico', 'conseguenza_negativa', 'aggravamento_situazione', 'statistica_scioccante', 'conseguenza_estrema', 'soluzione_unica', 'beneficio_trasformativo', 'tempo_specifico'],
    description: 'Framework PAS ottimizzato per massima persuasione',
    effectiveness_score: 98,
    use_cases: ['problem-solving', 'vendita', 'awareness']
  },
  {
    id: 'bab-transformation',
    name: 'Before-After-Bridge Trasformativo',
    category: 'storytelling',
    template: '📉 PRIMA: {situazione_attuale_dolorosa}\n\n📈 DOPO: {visione_futuro_desiderato}\n\n🌉 IL PONTE: {nome_soluzione} è l\'unico sistema che ti porta da dove sei ora a dove vuoi essere. {prova_sociale_potente}',
    variables: ['situazione_attuale_dolorosa', 'visione_futuro_desiderato', 'nome_soluzione', 'prova_sociale_potente'],
    description: 'Framework BAB per creare desiderio intenso attraverso contrasto',
    effectiveness_score: 95,
    use_cases: ['trasformazione', 'coaching', 'corso-online']
  },
  {
    id: 'mrbeast-retention',
    name: 'Retention Hook Mr.Beast',
    category: 'hook',
    template: '{statement_shocking} MA quello che è successo dopo ha cambiato tutto. (Thread con tutti i dettagli che vi scioccheranno) 🧵\n\n1/{numero_totale}',
    variables: ['statement_shocking', 'numero_totale'],
    description: 'Hook stile Mr.Beast per retention massima e engagement virale',
    effectiveness_score: 99,
    use_cases: ['thread', 'storytelling', 'viral-content']
  },
  {
    id: 'iman-authority',
    name: 'Authority Building Iman Style',
    category: 'hook',
    template: '{eta} anni, {risultato_specifico}. {tempo_fa} tutti mi davano del pazzo quando dicevo che {predizione_audace}. Oggi {validazione_predizione}.\n\nEcco come ho fatto (e come puoi replicarlo):',
    variables: ['eta', 'risultato_specifico', 'tempo_fa', 'predizione_audace', 'validazione_predizione'],
    description: 'Costruzione di autorità attraverso risultati + predizioni realizzate',
    effectiveness_score: 94,
    use_cases: ['personal-brand', 'autorità', 'credibilità']
  },
  {
    id: 'neuro-trigger',
    name: 'Neuro-Trigger Avanzato',
    category: 'hook',
    template: '🧠 SCOPERTA NEUROSCIENTIFICA: Il tuo cervello produce {sostanza_chimica} quando {azione_specifica}. Ecco come "hackerare" questo meccanismo per {beneficio_desiderato} (studi scientifici inclusi)',
    variables: ['sostanza_chimica', 'azione_specifica', 'beneficio_desiderato'],
    description: 'Hook basato su neuroscienze per massima credibilità',
    effectiveness_score: 92,
    use_cases: ['educativo', 'scientifico', 'autorevolezza']
  },
  {
    id: 'objection-crusher',
    name: 'Distruttore di Obiezioni',
    category: 'cta',
    template: '"Ma {obiezione_comune}..." Lo so, è quello che pensano tutti. Ma considera questo: {reframe_potente}. {call_to_action_specifica} (Garanzia: {garanzia_specifica})',
    variables: ['obiezione_comune', 'reframe_potente', 'call_to_action_specifica', 'garanzia_specifica'],
    description: 'Neutralizza obiezioni e spinge all\'azione con garanzia forte',
    effectiveness_score: 88,
    use_cases: ['vendita', 'conversione', 'closing']
  },
  {
    id: 'social-proof-stack',
    name: 'Stack di Riprova Sociale',
    category: 'social-proof',
    template: '📊 I NUMERI PARLANO CHIARO:\n• {numero_clienti}+ clienti trasformati\n• {percentuale_successo}% di successo dimostrato\n• {numero_testimonianze} testimonianze verificate\n• Raccomandato da {autorità_settore}\n\n💬 "{testimonianza_potente}" - {nome_cliente}, {risultato_specifico}',
    variables: ['numero_clienti', 'percentuale_successo', 'numero_testimonianze', 'autorità_settore', 'testimonianza_potente', 'nome_cliente', 'risultato_specifico'],
    description: 'Stack multiplo di prove sociali per credibilità massima',
    effectiveness_score: 91,
    use_cases: ['credibilità', 'vendita', 'landing-page']
  },
  {
    id: 'curiosity-gap',
    name: 'Gap di Curiosità Professionale',
    category: 'hook',
    template: 'La differenza tra chi {risultato_desiderato} e chi {risultato_indesiderato} si riduce a {elemento_misterioso}. {percentuale}% delle persone non lo sa. Tu fai parte di quel {percentuale}%? Scoprilo qui: 👇',
    variables: ['risultato_desiderato', 'risultato_indesiderato', 'elemento_misterioso', 'percentuale'],
    description: 'Crea curiosità attraverso gap di conoscenza e auto-selezione',
    effectiveness_score: 89,
    use_cases: ['engagement', 'educativo', 'lead-generation']
  },
  {
    id: 'controversial-truth',
    name: 'Verità Controversa',
    category: 'hook',
    template: '🔥 VERITÀ SCOMODA: {opinione_controversa}. L\'industria {settore} mi odierà per aver detto questo, ma dopo {anni_esperienza} anni ho il DOVERE di dirvi la verità. Thread con prove documentate: 🧵',
    variables: ['opinione_controversa', 'settore', 'anni_esperienza'],
    description: 'Controversia costruttiva per engagement esplosivo e autorità',
    effectiveness_score: 97,
    use_cases: ['viral', 'autorità', 'debate']
  },
  // TEMPLATE SPECIFICI PER SETTORI
  {
    id: 'health-transformation',
    name: 'Trasformazione Salute',
    category: 'storytelling',
    template: 'Da {condizione_prima} a {condizione_dopo} in {tempo_trasformazione}. Senza {metodo_evitato}, senza {altro_metodo_evitato}. Solo {approccio_naturale} che {meccanismo_funzionamento}.\n\n✅ RISULTATI VERIFICATI:\n{lista_benefici}\n\n👨‍⚕️ APPROVATO da {autorità_medica}',
    variables: ['condizione_prima', 'condizione_dopo', 'tempo_trasformazione', 'metodo_evitato', 'altro_metodo_evitato', 'approccio_naturale', 'meccanismo_funzionamento', 'lista_benefici', 'autorità_medica'],
    description: 'Template specifico per trasformazioni di salute con credibilità medica',
    effectiveness_score: 93,
    use_cases: ['salute', 'benessere', 'trasformazione']
  },
  {
    id: 'business-case-study',
    name: 'Case Study Business',
    category: 'social-proof',
    template: '📈 CASE STUDY: Come {nome_cliente} è passato da {situazione_iniziale} a {risultato_finale} usando {metodo_specifico}.\n\n🎯 STRATEGIA ESATTA:\n{step_1}\n{step_2}\n{step_3}\n\n💰 RISULTATI: {metriche_specifiche}\n\n🔥 Vuoi replicare questo successo?',
    variables: ['nome_cliente', 'situazione_iniziale', 'risultato_finale', 'metodo_specifico', 'step_1', 'step_2', 'step_3', 'metriche_specifiche'],
    description: 'Case study dettagliato per dimostrare efficacia del sistema',
    effectiveness_score: 90,
    use_cases: ['business', 'case-study', 'proof']
  }
];

export const getTemplatesByCategory = (category?: string): CopyTemplate[] => {
  if (!category) return ADVANCED_TEMPLATES;
  return ADVANCED_TEMPLATES.filter(t => t.category === category);
};
