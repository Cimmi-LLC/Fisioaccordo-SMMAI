import { describe, it, expect } from 'vitest';
import {
  pubblicoDelBrand, FORMATI, formatoPerId, pianoSlide, regoleMetodo, controlliMeccanici, leggiGiudizio, promptGiudice,
  CRITERI_GIUDICE,
} from '../metodoCopy';

describe('pubblicoDelBrand', () => {
  it('GestioMed: target di soli professionisti diventa B2B anche con avatar B2C di default', () => {
    expect(pubblicoDelBrand({ avatar_type: 'B2C', target_pazienti: 'Fisioterapisti, osteopati e poliambulatori' })).toBe('B2B');
  });
  it('uno studio che parla ai pazienti resta B2C', () => {
    expect(pubblicoDelBrand({ avatar_type: 'B2C', target_pazienti: 'Pazienti con dolore alla spalla, over 45' })).toBe('B2C');
  });
  it('target misto (pazienti mandati dai medici) resta B2C', () => {
    expect(pubblicoDelBrand({ avatar_type: 'B2C', target_pazienti: 'Sportivi e pazienti inviati dai medici di base' })).toBe('B2C');
  });
  it('B2B scelto nel kit vince sempre', () => {
    expect(pubblicoDelBrand({ avatar_type: 'B2B', target_pazienti: 'Persone con mal di schiena' })).toBe('B2B');
  });
  it('senza brand vale la richiesta, altrimenti B2C', () => {
    expect(pubblicoDelBrand(null, 'B2B')).toBe('B2B');
    expect(pubblicoDelBrand(null)).toBe('B2C');
  });
  it('«professionisti» generico (chi lavora al PC) non basta per B2B', () => {
    expect(pubblicoDelBrand({ target_pazienti: 'Professionisti che lavorano al PC tutto il giorno' })).toBe('B2C');
  });
});

describe('formati', () => {
  it('id unici e ogni format ha parti, segreto e copertine', () => {
    expect(new Set(FORMATI.map((f) => f.id)).size).toBe(FORMATI.length);
    for (const f of FORMATI) {
      expect(f.parti.length).toBeGreaterThan(0);
      expect(f.segreto.length).toBeGreaterThan(10);
      expect(f.copertine.length).toBeGreaterThan(0);
    }
  });
  it('formatoPerId accetta maiuscole e spazi, rifiuta id sconosciuti', () => {
    expect(formatoPerId(' Errore ')?.id).toBe('errore');
    expect(formatoPerId('hormozi')).toBeNull();
    expect(formatoPerId(undefined)).toBeNull();
  });
});

describe('pianoSlide', () => {
  const errore = formatoPerId('errore')!;
  it('copertina prima, CTA ultima, tante voci quante le slide', () => {
    for (const n of [2, 3, 5, 7, 10]) {
      const p = pianoSlide(errore, n);
      expect(p).toHaveLength(n);
      expect(p[0]).toMatch(/copertina/);
      expect(p[n - 1]).toBe('CTA');
    }
  });
  it('con poche slide le parti si fondono, senza perderne', () => {
    const p = pianoSlide(errore, 4);
    expect(p[2]).toContain(errore.parti[1]);
    expect(p[2]).toContain(errore.parti[2]);
  });
  it('con tante slide il payoff arriva prima della CTA', () => {
    const p = pianoSlide(errore, 8);
    expect(p[6]).toMatch(/payoff/);
  });
});

describe('regoleMetodo', () => {
  it('B2C sanitario: regola del terapista dentro, B2B no', () => {
    const b2c = regoleMetodo({ pubblico: 'B2C', lettori: 'pazienti', sanitario: true });
    const b2b = regoleMetodo({ pubblico: 'B2B', lettori: 'studi di fisioterapia', sanitario: true });
    expect(b2c).toMatch(/fare a meno del professionista/);
    expect(b2b).not.toMatch(/fare a meno del professionista/);
    expect(b2b).toMatch(/titolare/);
  });
  it('niente Hormozi, sì contrarian take e CTA nativa', () => {
    const r = regoleMetodo({ pubblico: 'B2C', lettori: 'pazienti', sanitario: true });
    expect(r).not.toMatch(/Hormozi/);
    expect(r).toMatch(/CONTRARIAN TAKE/);
    expect(r).toMatch(/nativa/);
  });
});

describe('controlliMeccanici', () => {
  const carosello = (testo: string, caption = '') => ({
    slides: [{ tipo: 'cover', hook: 'Spalla bloccata?' }, { tipo: 'content', titolo: 'Il punto', testo }],
    caption_instagram: caption,
  });
  it('trova «sbloccare» e le lineette lunghe', () => {
    const p = controlliMeccanici(carosello('Ti aiutiamo a sbloccare la spalla — subito.'), '');
    expect(p.some((x) => x.includes('sbloccare'))).toBe(true);
    expect(p.some((x) => x.includes('lineetta'))).toBe(true);
  });
  it('numeri-prova inventati sì, quelli del brand no', () => {
    const fonti = 'Abbiamo seguito oltre 300 pazienti';
    const p = controlliMeccanici(carosello('Il 70% dei pazienti migliora. Ne abbiamo seguiti 300 pazienti.'), fonti);
    expect(p).toContain('numero non presente nei dati del brand: «70%»');
    expect(p.some((x) => x.includes('300'))).toBe(false);
  });
  it('un numero d\'ordine («3 errori») non è una prova', () => {
    expect(controlliMeccanici(carosello('Ecco 3 errori che fai ogni mattina.'), '')).toEqual([]);
  });
  it('parole bandite dal brand, senza badare alle maiuscole', () => {
    const p = controlliMeccanici(carosello('Un approccio Olistico al dolore.'), '', ['olistico']);
    expect(p).toContain('parola bandita dal brand: «olistico»');
  });
});

describe('giudice', () => {
  const voti = (v: number) => Object.fromEntries(CRITERI_GIUDICE.map(([k]) => [k, v]));
  it('promosso solo se tutti i voti sono almeno 4', () => {
    expect(leggiGiudizio(JSON.stringify({ voti: voti(4), problemi: [] }))?.promosso).toBe(true);
    const bocciato = leggiGiudizio(JSON.stringify({ voti: { ...voti(5), non_ovvio: 3 }, problemi: ['slide 2 ovvia'] }));
    expect(bocciato?.promosso).toBe(false);
    expect(bocciato?.minimo).toBe(3);
    expect(bocciato?.problemi).toEqual(['slide 2 ovvia']);
  });
  it('JSON rotto o voti mancanti → null', () => {
    expect(leggiGiudizio('non json')).toBeNull();
    expect(leggiGiudizio(JSON.stringify({ voti: { bersaglio: 4 } }))).toBeNull();
    expect(leggiGiudizio(JSON.stringify({ voti: voti(7) }))).toBeNull();
  });
  it('il prompt del giudice nomina il pubblico e tutti i criteri', () => {
    const p = promptGiudice({ slides: [] }, { pubblico: 'B2B', lettori: 'studi', sanitario: false }, 'agenda piena');
    expect(p).toMatch(/titolari/);
    for (const [k] of CRITERI_GIUDICE) expect(p).toContain(`"${k}"`);
  });
});

describe('testi di riserva del template', () => {
  it('GestioMed riceve la riserva per i titolari, uno studio quella della professione', async () => {
    const { testiDiRiserva, TESTI_PROVA_B2B } = await import('../layoutCopy');
    const copy = {
      cover: { kicker: 'SALUTE', title: 'PERCHÉ RIMANDI SEMPRE QUEL CONTROLLO' },
      content: { number: '02', label: 'IL METODO', title: 'PICCOLI SEGNALI', body: 'Testo.' },
      cta: { title: 'PRENOTA', body: 'Scrivici.' },
    };
    expect(testiDiRiserva({ target_pazienti: 'Fisioterapisti, osteopati e poliambulatori' }, copy as never)).toBe(TESTI_PROVA_B2B);
    expect(testiDiRiserva({ target_pazienti: 'Pazienti con mal di schiena' }, copy as never).copertina.titolo).toBe('Perché rimandi sempre quel controllo');
  });
});

describe('collaudo del 07/11', () => {
  it('appunti del giudice scritti come oggetti diventano frasi', () => {
    const g = leggiGiudizio(JSON.stringify({
      voti: Object.fromEntries(CRITERI_GIUDICE.map(([k]) => [k, k === 'fedele' ? 1 : 5])),
      problemi: [{ slide: 3, problema: 'termine inventato', correzione: 'toglilo' }],
    }));
    expect(g?.problemi).toEqual(['3: termine inventato: toglilo']);
  });
  it('formatoPerId accetta anche il nome del format', () => {
    expect(formatoPerId('Errore comune')?.id).toBe('errore');
  });
  it('una guida promessa senza guida nel brand è un problema', () => {
    const c = { slides: [{ tipo: 'cta', testo_cta: 'Commenta COLLO per una guida gratuita sui primi passi' }] };
    expect(controlliMeccanici(c, 'Studio di fisioterapia').some((p) => p.includes('guida'))).toBe(true);
    expect(controlliMeccanici(c, 'Regaliamo la guida agli esercizi del collo').some((p) => p.includes('guida'))).toBe(false);
    const senza = { slides: [{ tipo: 'cta', testo_cta: 'Commenta COLLO e ti rispondiamo sul tuo caso' }] };
    expect(controlliMeccanici(senza, '')).toEqual([]);
  });
});

describe('giudice con i dati del brand', () => {
  it('il prompt porta i dati veri e la regola sulle funzioni inventate', () => {
    const p = promptGiudice({ slides: [] }, { pubblico: 'B2B', lettori: 'studi', sanitario: false }, 'disdette', 'Servizi: Automazione WhatsApp');
    expect(p).toContain('Automazione WhatsApp');
    expect(p).toMatch(/inventato/);
  });
  it('«no-show» e «slot» sono parole inglesi da cambiare', () => {
    const c = { slides: [{ tipo: 'content', testo: 'Basta no-show e slot vuoti.' }] };
    expect(controlliMeccanici(c, '').some((p) => p.includes('inglese'))).toBe(true);
  });
});

describe('collaudo dopo l\'unione (07/11)', () => {
  const cta = (testo_cta: string, bottone_cta: string, testo = 'Il punto.') => ({
    slides: [{ tipo: 'cover', hook: 'Schiena in ufficio' }, { tipo: 'content', titolo: 'Il punto', testo }, { tipo: 'cta', titolo: 'Fallo oggi', testo_cta, bottone_cta }],
  });
  const promette = (p: string[]) => p.some((x) => x.startsWith('promette un materiale'));

  it('«Ho preparato 3 esercizi… commenta per riceverli» è una promessa', () => {
    expect(promette(controlliMeccanici(cta('Ho preparato 3 esercizi da fare alla scrivania', 'Commenta SCHIENA per riceverli'), 'Studio di fisioterapia'))).toBe(true);
  });
  it('la promessa divisa fra testo e bottone della CTA', () => {
    expect(promette(controlliMeccanici(cta('Vuoi i 3 esercizi da fare alla scrivania?', 'Commenta SCHIENA per riceverli'), ''))).toBe(true);
    expect(promette(controlliMeccanici(cta('Vuoi una schiena più libera?', 'Commenta SCHIENA e ti mando il video degli esercizi'), ''))).toBe(true);
  });
  it('esercizi fatti in studio e risposta sul caso non sono promesse', () => {
    const p = controlliMeccanici(cta('Vuoi capire se fa per te?', 'Commenta COLLO e ti rispondiamo sul tuo caso', 'In studio lavoriamo con esercizi isometrici.'), '');
    expect(p).toEqual([]);
  });
  it('il materiale regalato dal brand si può promettere', () => {
    const c = cta('Ho preparato la scheda esercizi', 'Commenta SCHIENA per riceverla');
    expect(promette(controlliMeccanici(c, 'Commenta ESERCIZI per ricevere la scheda esercizi'))).toBe(false);
  });
  it('i nomi inventati del collaudo vengono trovati', () => {
    const nomi = (testo: string, fonti = '') => controlliMeccanici(cta('Vuoi saperne di più?', 'Commenta AGENDA e ti rispondiamo', testo), fonti)
      .filter((x) => x.startsWith('nome dato'));
    expect(nomi("Si chiama 'collo di bottiglia amministrativo'.")[0]).toContain('«collo di bottiglia amministrativo»');
    expect(nomi('Si chiama debolezza posturale.')[0]).toContain('«debolezza posturale»');
    expect(nomi("Si chiama gestione attiva dell'agenda.")[0]).toContain("«gestione attiva dell'agenda»");
    expect(nomi('È il cosiddetto «effetto domino».')[0]).toContain('«effetto domino»');
  });
  it('un nome già usato dal brand o dal topic passa, «si chiama così» non è un nome', () => {
    const p = (testo: string, fonti = '') => controlliMeccanici(cta('Vuoi saperne di più?', 'Commenta COLLO e ti rispondiamo', testo), fonti);
    expect(p('Si chiama trattamento miofasciale.', 'Trattamento miofasciale per schiena e collo')).toEqual([]);
    expect(p('Si chiama così perché il muscolo si difende.')).toEqual([]);
  });
  it('il giudice controlla anche i nomi inventati', () => {
    expect(CRITERI_GIUDICE.find(([k]) => k === 'fedele')?.[1]).toMatch(/nomi di meccanismi/);
  });
  it('il format «errore» non chiede più un nome a tutti i costi', () => {
    expect(formatoPerId('errore')!.parti.join(' ')).toMatch(/solo se ne ha uno vero/);
  });
});
