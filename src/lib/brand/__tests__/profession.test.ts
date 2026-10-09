import { describe, it, expect } from 'vitest';
import {
  PROFESSIONS,
  PROFESSION_IDS,
  DEFAULT_PROFESSION_ID,
  detectProfession,
  resolveProfession,
  professionPromptBlock,
  placeholderCopyFor,
  categorieOptionsFor,
  isProfessionId,
} from '../profession.ts';

describe('registro professioni', () => {
  it('ogni professione ha i campi che finiscono nei prompt', () => {
    for (const p of PROFESSIONS) {
      expect(p.label.length).toBeGreaterThan(2);
      expect(p.settore.length).toBeGreaterThan(2);
      expect(p.kicker).toBe(p.kicker.toUpperCase());
      expect(p.cliente.length).toBeGreaterThan(2);
      expect(p.promptContext.length).toBeGreaterThan(40);
      expect(p.imageScene.length).toBeGreaterThan(20);
      expect(p.stockFallbackQuery.split(' ').length).toBeGreaterThanOrEqual(2);
      expect(p.temiEsempio.length).toBeGreaterThanOrEqual(1);
      expect(p.placeholder.cover.title.length).toBeGreaterThan(10);
      expect(p.placeholder.content.body.length).toBeLessThanOrEqual(160);
    }
  });

  it('gli slug sono unici e "altro" chiude la lista', () => {
    expect(new Set(PROFESSION_IDS).size).toBe(PROFESSION_IDS.length);
    expect(PROFESSION_IDS[PROFESSION_IDS.length - 1]).toBe('altro');
    expect(isProfessionId('nutrizionista')).toBe(true);
    expect(isProfessionId('idraulico')).toBe(false);
  });

  it('il default resta il fisioterapista (brand esistenti invariati)', () => {
    expect(DEFAULT_PROFESSION_ID).toBe('fisioterapista');
    const r = resolveProfession({ nome_business: 'Studio Rossi', descrizione: '' });
    expect(r.id).toBe('fisioterapista');
    expect(r.source).toBe('default');
  });
});

describe('detectProfession', () => {
  it('riconosce un nutrizionista dal nome e dai servizi', () => {
    const d = detectProfession({
      nome_business: 'Dott.ssa Bianchi Nutrizionista',
      servizi: ['Piani alimentari personalizzati', 'Bioimpedenziometria'],
    });
    expect(d?.id).toBe('nutrizionista');
    expect(d?.confidence).toBe('alta');
  });

  it('riconosce un personal trainer dalla descrizione', () => {
    const d = detectProfession({
      nome_business: 'Marco Verdi',
      descrizione: 'Personal trainer certificato: allenamento funzionale e preparazione atletica in palestra e a domicilio.',
    });
    expect(d?.id).toBe('personal_trainer');
  });

  it('riconosce psicologo, dentista, ostetrica e poliambulatorio', () => {
    expect(detectProfession({ nome_business: 'Studio di Psicologia Neri' })?.id).toBe('psicologo');
    expect(detectProfession({ nome_business: 'Studio Dentistico Gialli', servizi: ['Igiene orale'] })?.id).toBe('dentista');
    expect(detectProfession({ nome_business: 'Ostetrica Lucia', servizi: ['Corso preparto', 'Pavimento pelvico'] })?.id).toBe('ostetrica');
    expect(detectProfession({ nome_business: 'Centro Medico San Marco', categorie: ['Poliambulatorio'] })?.id).toBe('poliambulatorio');
  });

  it('riconosce la professione anche dal solo topic', () => {
    expect(detectProfession('5 ricette per una colazione bilanciata, piano alimentare settimanale')?.id).toBe('nutrizionista');
    expect(detectProfession('Scheda di allenamento in palestra per la forza')?.id).toBe('personal_trainer');
  });

  it('non decide quando due professioni sono alla pari o non ci sono indizi', () => {
    expect(detectProfession({ nome_business: 'Studio di Fisioterapia e Osteopatia Rossi' })).toBeNull();
    expect(detectProfession({ nome_business: 'Studio Rossi', descrizione: 'Dal 1998 al vostro servizio.' })).toBeNull();
    expect(detectProfession('')).toBeNull();
  });
});

describe('resolveProfession', () => {
  it('la scelta esplicita vince sul rilevamento', () => {
    const r = resolveProfession({ professione: 'personal_trainer', nome_business: 'Nutrizionista Rossi' });
    expect(r.id).toBe('personal_trainer');
    expect(r.source).toBe('scelta');
  });

  it('"altro" usa l\'etichetta scritta dall\'utente anche nel kicker', () => {
    const r = resolveProfession({ professione: 'altro', professione_custom: 'Terapista occupazionale' });
    expect(r.id).toBe('altro');
    expect(r.label).toBe('Terapista occupazionale');
    expect(r.kicker).toBe('TERAPISTA');
    expect(placeholderCopyFor(r).cover.kicker).toBe('TERAPISTA');
    expect(professionPromptBlock(r)).toContain('TERAPISTA OCCUPAZIONALE');
  });

  it('uno slug sconosciuto ricade sul rilevamento', () => {
    const r = resolveProfession({ professione: 'idraulico', nome_business: 'Dietista Bianchi' });
    expect(r.id).toBe('nutrizionista');
    expect(r.source).toBe('rilevata');
  });

  it('usa la professione trovata dall\'analisi del sito quando l\'utente non ha scelto', () => {
    const r = resolveProfession({ nome_business: 'Studio Rossi', raw_analysis: { professione: 'dentista' } });
    expect(r.id).toBe('dentista');
    expect(r.source).toBe('rilevata');
  });

  it('il topic fa da spia quando il brand non dice nulla, ma solo se e netto', () => {
    const r = resolveProfession({ nome_business: 'Studio Rossi' }, 'Scheda di allenamento in palestra per la forza');
    expect(r.id).toBe('personal_trainer');
    expect(r.detectedFrom).toBe('topic');
    // Un accenno debole non cambia mestiere: resta il default.
    const debole = resolveProfession({ nome_business: 'Studio Rossi' }, 'Alimentazione e dolore alle articolazioni');
    expect(debole.id).toBe('fisioterapista');
    expect(debole.source).toBe('default');
    // Il topic non puo riscrivere un brand gia riconoscibile.
    const fisio = resolveProfession({ nome_business: 'Studio Rossi', categorie: ['Fisioterapia'] }, '5 ricette light, piano alimentare settimanale e dieta');
    expect(fisio.id).toBe('fisioterapista');
    expect(fisio.detectedFrom).toBe('brand');
  });

  it('il blocco prompt parla la lingua della professione', () => {
    const block = professionPromptBlock(resolveProfession({ professione: 'nutrizionista' }));
    expect(block).toContain('NUTRIZIONISTA');
    expect(block).toContain('"paziente"');
    expect(block).toContain('Non parlare di fisioterapia');
    const physio = professionPromptBlock(resolveProfession({ professione: 'fisioterapista' }));
    expect(physio).not.toContain('Non parlare di fisioterapia');
    // Intuita dal solo topic: niente divieti, il mestiere non e certo.
    const soloTopic = professionPromptBlock(resolveProfession({ nome_business: 'Studio Rossi' }, 'Scheda di allenamento in palestra per la forza'));
    expect(soloTopic).toContain('PERSONAL TRAINER');
    expect(soloTopic).not.toContain('Non parlare di fisioterapia');
  });
});

describe('categorieOptionsFor', () => {
  it('propone le categorie della professione piu quelle comuni e quelle gia scelte', () => {
    const opts = categorieOptionsFor('nutrizionista', ['Fisioterapia']);
    expect(opts).toContain('Nutrizione');
    expect(opts).toContain('Salute e Benessere');
    expect(opts).toContain('Fisioterapia');
    expect(new Set(opts).size).toBe(opts.length);
  });
});
