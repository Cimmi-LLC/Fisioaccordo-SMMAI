
import { KnowledgeEntry } from '../types';

export const HORMOZI_LTV_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'hormozi-crazy-eight',
    title: 'Le Crazy Eight per Aumentare il LTV (Hormozi)',
    content: `8 modi per far spendere di più ogni cliente:
1) AUMENTA I PREZZI - Il pricing impatta il profitto più di qualsiasi altra cosa. Un aumento del 20% dei prezzi può TRIPLICARE il profitto in un business al 10% di margine.
2) RIDUCI I COSTI - Ottimizza la delivery senza ridurre la qualità.
3) AUMENTA FREQUENZA ACQUISTI - Falli comprare di nuovo più spesso (upsell temporale).
4) CROSS-SELL QUALCOSA DI DIVERSO - Offri un prodotto complementare.
5) VENDI DI PIÙ (Quantità) - Aumenta la quantità per ordine.
6) VENDI MEGLIO (Qualità) - Versione premium con prezzo più alto.
7) DOWNSELL QUANTITÀ - Meglio vendere meno che non vendere niente.
8) DOWNSELL QUALITÀ - Versione più economica per chi non può permettersi il premium.
"Chi riesce a rendere un cliente più prezioso della concorrenza, VINCE. Perché può spendere di più per acquisirlo."
Upsell preferito di Hormozi: "Più di - o più aiuto con - quello che hanno appena comprato... ma con risultati più veloci, meno rischio, meno sforzo, meno problemi - per più soldi."`,
    category: 'ltv-strategy',
    tags: ['hormozi', 'ltv', 'monetizzazione', 'upsell', 'pricing'],
    examples: [
      'PREZZO: Alza il prezzo del 20% ogni 10 nuovi clienti finché le vendite calano nettamente',
      'FREQUENZA: Pacchetto di mantenimento mensile dopo il percorso terapeutico',
      'CROSS-SELL: Aggiungi prodotti complementari (integratori, attrezzi, corsi online)',
      'PREMIUM: Percorso VIP con attenzione 1-a-1 a prezzo 3x'
    ],
    effectiveness_rating: 96
  },
  {
    id: 'hormozi-lead-nurture',
    title: 'I 4 Pilastri del Lead Nurture (Hormozi)',
    content: `4 pilastri che determinano quanti lead si presentano all'appuntamento:
1) DISPONIBILITÀ - Più slot aperti = più show-up. Il fattore #1 assoluto. Se i lead non possono prenotare, non si presentano.
2) VELOCITÀ - Rispondi in 42 SECONDI, non 42 ore. Il 44% dei venditori si arrende dopo il primo tentativo.
3) PERSONALIZZAZIONE - Comunicazione rilevante e specifica per ogni lead. Template generici = ignorati.
4) VOLUME - Contatta i lead 5+ volte prima di arrenderti, non 1.3 volte (media reale).
Un aumento del 20-40% nel tasso di show-up = 2x-3x il profitto del business.
"Se non si presentano, non possono comprare."`,
    category: 'lead-nurture',
    tags: ['hormozi', 'lead', 'nurture', 'appuntamenti', 'conversione'],
    examples: [
      'DISPONIBILITÀ: Offri prenotazione 7/7, anche sabato. Più slot = più prenotazioni',
      'VELOCITÀ: Rispondi al messaggio entro 5 minuti con conferma automatica',
      'PERSONALIZZAZIONE: "Ciao Marco, ho visto che hai problemi alla spalla destra..."',
      'VOLUME: Follow-up automatico: SMS dopo 1h, WhatsApp dopo 24h, chiamata dopo 48h'
    ],
    effectiveness_rating: 95
  },
  {
    id: 'hormozi-price-raise',
    title: 'Framework RAISE per Alzare i Prezzi (Hormozi)',
    content: `L'acronimo RAISE per comunicare un aumento di prezzo senza perdere clienti:
R - REMIND: Ricorda il valore che hai già fornito loro
A - ADDRESS: Affronta direttamente il cambio di prezzo
I - INVEST: Investi nel loro futuro (nuovi servizi/benefici)
S - SOFTEN: Ammorbidisci con un premio fedeltà
E - EXPLAIN: Spiega via le loro preoccupazioni
"Se devi fare una preghiera prima di alzare il prezzo di un centesimo, hai un business terribile" - Warren Buffett
Caso Trey: Prezzi a 49€/mese = clienti terribili, zero rispetto, studio in perdita.
Dopo aumento a 199€/mese = clienti migliori, più rispetto, studio profittevole.
"I prezzi bassi attraggono i clienti peggiori."`,
    category: 'pricing-strategy',
    tags: ['hormozi', 'pricing', 'aumento-prezzi', 'valore', 'comunicazione'],
    examples: [
      'R: "Negli ultimi 6 mesi ti abbiamo aiutato a [risultato specifico]"',
      'A: "Dal prossimo mese il nostro percorso passa da 150€ a 200€ a seduta"',
      'I: "Abbiamo aggiunto [nuovo servizio] che vale da solo il doppio"',
      'S: "Per i clienti fedeli come te, il nuovo prezzo parte dal prossimo trimestre"',
      'E: "Questo ci permette di continuare a investire nella qualità che meriti"'
    ],
    effectiveness_rating: 93
  }
];
