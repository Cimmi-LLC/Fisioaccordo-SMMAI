import { describe, it, expect } from 'vitest';
import {
  contaParole, frasiInsicure, gancioPerVariante, hashtagControllati, parolePerDurata, tempiDaParole, TIPI_GANCIO,
} from '../copioneReel';

// Lo script di riferimento del reparto social (note revisione v3, 18/11/2026).
const RIFERIMENTO = [
  'Mal di testa che parte dal collo e gli antidolorifici non bastano mai?',
  'Non è strano: la pastiglia copre il dolore, ma il dolore non nasce lì. Nasce dai muscoli e dalle articolazioni alla base del cranio, che quando sono rigidi irritano i nervi che salgono verso le tempie. È un falso allarme: la testa fa male, ma il problema è sotto.',
  'Prova questo domattina: prima di alzarti, gira piano la testa a destra e a sinistra. Se da un lato arrivi meno, o senti tirare alla base della nuca, quel mal di testa probabilmente parte da lì.',
  'Se ti riconosci, scrivimi collo nei commenti e ti dico cosa guardare.',
];

describe('parole e tempi', () => {
  it('a 2,5 parole al secondo: 45 secondi sono al massimo 113 parole', () => {
    expect(parolePerDurata(45)).toEqual({ min: 96, max: 113 });
    expect(parolePerDurata(30).max).toBe(75);
    expect(parolePerDurata(60).max).toBe(150);
  });

  it('conta le parole senza contare la punteggiatura staccata', () => {
    expect(contaParole('Prova questo — domattina: gira la testa.')).toBe(6);
    expect(contaParole('')).toBe(0);
  });

  it('lo script di riferimento sta nei 45 secondi e il gancio finisce entro il quinto', () => {
    const { tempi, secondi } = tempiDaParole(RIFERIMENTO);
    expect(secondi).toBeGreaterThanOrEqual(40);
    expect(secondi).toBeLessThanOrEqual(46);
    expect(Number(tempi[0].split('-')[1])).toBeLessThanOrEqual(5);
    // Ogni sezione parte dove finisce la precedente.
    for (let i = 1; i < tempi.length; i++) {
      expect(tempi[i].split('-')[0]).toBe(tempi[i - 1].split('-')[1]);
    }
  });

  it('un gancio di 19 parole non sta in 3 secondi: il tempo lo dice', () => {
    const gancio = 'Ti è mai capitato di avere un mal di testa che parte dal collo e non passa con niente?';
    const { tempi } = tempiDaParole([gancio]);
    expect(tempi[0]).toBe('0-8');
  });
});

describe('ganci diversi', () => {
  it('ogni variante ha un tipo di gancio diverso, poi si ricomincia', () => {
    const tipi = TIPI_GANCIO.map((_, i) => gancioPerVariante(i).id);
    expect(new Set(tipi).size).toBe(TIPI_GANCIO.length);
    expect(gancioPerVariante(TIPI_GANCIO.length).id).toBe(tipi[0]);
  });

  it('senza variante parte dalla domanda', () => {
    expect(gancioPerVariante(undefined).id).toBe('domanda');
  });
});

describe('frasi insicure', () => {
  it('trova le frasi segnate il 18/11', () => {
    const t = 'Forse ci dici che hai provato di tutto. Magari senti il collo rigido. Noi capiamo bene questa frustrazione.';
    const f = frasiInsicure(t);
    expect(f).toHaveLength(3);
    expect(f[0]).toMatch(/^Forse ci dici/);
    expect(f[2]).toMatch(/^Noi capiamo bene/);
  });

  it('lascia stare lo script di riferimento', () => {
    expect(frasiInsicure(RIFERIMENTO.join(' '))).toEqual([]);
  });

  it('lascia stare un «forse» che non chiede permesso', () => {
    expect(frasiInsicure('Il tuo mal di testa forse non nasce nella testa.')).toEqual([]);
  });
});

describe('hashtag controllati', () => {
  const testi = ['mal di testa dal collo', ...RIFERIMENTO, 'Studio di fisioterapia cervicale'];

  it('toglie i refusi del test e il CamelCase', () => {
    const h = hashtagControllati(
      ['#malotesta', '#maliditesta', '#studiodefisioterapia', 'MalDiTesta', 'Cervicale', '#fisioterapia', 'collo'],
      testi,
    );
    expect(h).toEqual(['malditesta', 'cervicale', 'fisioterapia', 'collo']);
  });

  it('niente doppioni e al massimo 8', () => {
    const h = hashtagControllati(['collo', 'Collo', 'testa', 'nuca', 'cranio', 'tempie', 'nervi', 'muscoli', 'articolazioni', 'dolore'], testi);
    expect(h).toHaveLength(8);
    expect(new Set(h).size).toBe(8);
  });

  it('se ne restano meno di 3 aggiunge le parole del tema', () => {
    const h = hashtagControllati(['#malotesta'], testi, { tema: 'Mal di testa che parte dal collo: perché gli antidolorifici non bastano' });
    expect(h).toContain('antidolorifici');
    expect(h).not.toContain('bastano');
  });
});
