// Storie e recensioni: impaginazione (funzioni pure, provate nei test) e
// disegno su canvas.
//
// Prova del reparto social del 18/11/2026: il testo delle storie non era
// centrato nel riquadro. Il contenuto partiva sempre dall'alto (12% della
// storia, 25% con un template caricato) e scendeva: un quiz o una domanda
// corta lasciavano vuota la metà di sotto, su tutti e tre gli sfondi pronti.
// Nelle recensioni stelle, testo e nome erano allineati a sinistra e la card
// singola restava attaccata in alto. Ora il blocco si misura prima, poi si
// mette al centro della zona libera del template; ogni riga è centrata in
// orizzontale sulla metà della storia.

/** Larghezza di un testo con un certo font (in pratica ctx.measureText). */
export type Misura = (testo: string, font: string) => number;

export type Elemento =
  | { tipo: 'testo'; testo: string; x: number; y: number; font: string; colore: string; alfa?: number; ombra?: boolean }
  | { tipo: 'pillola'; x: number; y: number; w: number; h: number; riempi?: string; alfaRiempi?: number; bordo?: string; alfaBordo?: number }
  | { tipo: 'linea'; x1: number; x2: number; y: number; colore: string; spessore: number; alfa: number; sfumata: boolean }
  | { tipo: 'foto'; x: number; y: number; w: number; h: number; raggio: number }
  | { tipo: 'card'; x: number; y: number; w: number; h: number; sfondo: string; barra: [string, string]; barraW: number };

export type Impaginato = {
  elementi: Elemento[];
  /** Zona libera del template (dove può stare il testo). */
  zona: { alto: number; basso: number };
  /** Dove sta davvero il blocco disegnato. */
  blocco: { alto: number; basso: number };
};

/** Parte sotto la riga di base occupata dalle lettere (g, p, q). */
const DISCESA = 0.25;

/**
 * Manda a capo un testo dentro una larghezza. Gli a capo scritti restano;
 * spazi doppi e spazi in fondo non contano (spostavano la riga a sinistra).
 */
export function aCapo(testo: string, maxW: number, font: string, misura: Misura): string[] {
  const righe: string[] = [];
  for (const paragrafo of String(testo || '').split('\n')) {
    const parole = paragrafo.split(/\s+/).filter(Boolean);
    let riga = '';
    for (const p of parole) {
      const prova = riga ? riga + ' ' + p : p;
      if (riga && misura(prova, font) > maxW) { righe.push(riga); riga = p; } else riga = prova;
    }
    if (riga) righe.push(riga);
  }
  return righe;
}

/** Luminosità relativa (0 nero, 1 bianco) di un #rrggbb; 0.5 se non si legge. */
export function luminanza(hex: string): number {
  const h = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(h)) return 0.5;
  const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(parseInt(h.slice(0, 2), 16)) + 0.7152 * lin(parseInt(h.slice(2, 4), 16)) + 0.0722 * lin(parseInt(h.slice(4, 6), 16));
}

/** Sposta in verticale tutti gli elementi. */
function sposta(elementi: Elemento[], dy: number): Elemento[] {
  return elementi.map((e) => ({ ...e, y: e.y + dy }));
}

/** Inizio del blocco: al centro della zona, mai sopra il suo bordo alto. */
export function inizioCentrato(altezza: number, alto: number, basso: number): number {
  return alto + Math.max(0, (basso - alto - altezza) / 2);
}

export type StoriaDaImpaginare = {
  typeLabel?: string | null;
  emoji?: string | null;
  headline?: string | null;
  text?: string | null;
  cardType?: string | null;
};

export type OpzioniStoria = {
  W: number;
  H: number;
  /** C'è un template caricato (logo in alto): zona libera fra 25% e 88%. */
  conTemplate: boolean;
  /** Famiglia del font, es. "'Montserrat', sans-serif". */
  font: string;
  primary: string;
  secondary: string;
  conFoto: boolean;
  misura: Misura;
};

/** Ricuce le frasi che il modello spezza con un a capo a metà. */
export function ricuciFrasi(testo: string): string {
  if (!testo) return testo;
  const out: string[] = [];
  for (const riga of testo.split('\n')) {
    const cur = riga.trim();
    if (!cur) continue;
    if (out.length > 0) {
      const prev = out[out.length - 1];
      const fineFrase = /[.!?:;…)]$/.test(prev);
      const voceElenco = /^([A-C][.)]|\d+[.)]|[-•])\s/.test(cur);
      if (!fineFrase && !voceElenco) { out[out.length - 1] = prev + ' ' + cur; continue; }
    }
    out.push(cur);
  }
  return out.join('\n');
}

/** Impagina una storia (quiz, curiosità, consiglio, mito, domanda...): badge, foto o emoji, titolo, testo. */
export function impaginaStoria(storia: StoriaDaImpaginare, o: OpzioniStoria): Impaginato {
  const { W, H, font: fn, primary, secondary, misura } = o;
  const alto = o.conTemplate ? Math.round(H * 0.25) : Math.round(H * 0.12);
  const basso = o.conTemplate ? Math.round(H * 0.88) : Math.round(H * 0.92);
  const PAD = 90, cW = W - PAD * 2, cx = W / 2;
  const isAnswer = storia.cardType === 'quiz_risposta';
  const el: Elemento[] = [];
  let cy = 0;
  let fondo = 0;

  // Badge della tipologia
  const bTxt = String(storia.typeLabel || '').toUpperCase();
  const bFont = '700 30px ' + fn;
  const bw = misura(bTxt, bFont) + 56, bh = 52;
  el.push({ tipo: 'pillola', x: (W - bw) / 2, y: cy, w: bw, h: bh, riempi: primary, alfaRiempi: 0.14, bordo: primary, alfaBordo: 0.35 });
  el.push({ tipo: 'testo', testo: bTxt, x: cx, y: cy + 35, font: bFont, colore: primary });
  fondo = cy + bh;
  cy += bh + 28;

  // Foto (riquadro centrato) oppure emoji
  if (o.conFoto) {
    const imgW = Math.round(W * 0.66), imgH = Math.round(imgW * 0.62);
    el.push({ tipo: 'foto', x: (W - imgW) / 2, y: cy, w: imgW, h: imgH, raggio: 32 });
    fondo = cy + imgH;
    cy += imgH + 32;
  } else if (storia.emoji) {
    el.push({ tipo: 'testo', testo: storia.emoji, x: cx, y: cy + 86, font: '96px serif', colore: primary });
    fondo = cy + 86 + 96 * DISCESA;
    cy += 120;
  }

  // Titolo
  const hlFs = isAnswer ? 62 : 72, hlLh = hlFs * 1.25;
  const hlFont = '900 ' + hlFs + 'px ' + fn;
  const titolo = aCapo(storia.headline || '', cW, hlFont, misura);
  titolo.forEach((r, k) => {
    const y = cy + hlFs + k * hlLh;
    el.push({ tipo: 'testo', testo: r, x: cx, y, font: hlFont, colore: secondary, ombra: luminanza(secondary) > 0.55 });
    fondo = y + hlFs * DISCESA;
  });
  cy += hlFs + titolo.length * hlLh + 18;

  // Separatore
  el.push({ tipo: 'linea', x1: W * 0.25, x2: W * 0.75, y: cy, colore: secondary, spessore: 2.5, alfa: 0.6, sfumata: true });
  fondo = Math.max(fondo, cy);
  cy += 28;

  // Testo: paragrafi; le opzioni del quiz (A. B. C.) più grandi e colorate
  const paragrafi = ricuciFrasi(storia.text || '').split('\n').map((p) => p.trim()).filter(Boolean);
  for (const p of paragrafi) {
    const isOpt = /^[A-C][.) ]/.test(p);
    const fs = isOpt ? 46 : 42, lh = fs * 1.2;
    const f = (isOpt ? '700' : '400') + ' ' + fs + 'px ' + fn;
    const colore = isOpt ? secondary : primary;
    const righe = aCapo(p, cW, f, misura);
    righe.forEach((r, k) => {
      const y = cy + fs + k * lh;
      el.push({ tipo: 'testo', testo: r, x: cx, y, font: f, colore, ombra: luminanza(colore) > 0.55 });
      fondo = y + fs * DISCESA;
    });
    cy += fs + righe.length * lh + (isOpt ? 8 : 10);
    if (cy > basso - alto) break;
  }

  // Invito alla risposta (quiz)
  if (storia.cardType === 'quiz_domanda') {
    cy += 20;
    el.push({ tipo: 'testo', testo: '👉 Risposta nella prossima storia!', x: cx, y: cy, font: 'italic 500 34px ' + fn, colore: secondary, alfa: 0.75 });
    fondo = cy + 34 * DISCESA;
  }

  const inizio = inizioCentrato(fondo, alto, basso);
  return { elementi: sposta(el, inizio), zona: { alto, basso }, blocco: { alto: inizio, basso: inizio + fondo } };
}

export type Recensione = { name?: string | null; text?: string | null; stars?: number | null };

export type OpzioniRecensioni = {
  W: number;
  H: number;
  conTemplate: boolean;
  font: string;
  misura: Misura;
  colori: {
    titolo: string; autore: string; testo: string;
    p1: string; p2: string;
    card: string; stellaVuota: string; pillolaTitolo: string;
  };
  /** Nome da scrivere quando la recensione non ne ha uno. */
  senzaNome?: string;
};

/** Impagina una storia di recensioni: titolo «Cosa dicono di noi:» e da 1 a 3 card. */
export function impaginaRecensioni(lista: Recensione[], o: OpzioniRecensioni): Impaginato {
  const { W, H, font: fn, misura, colori } = o;
  const n = Math.max(1, lista.length);
  const SAFE_TOP = o.conTemplate ? Math.round(H * 0.25) : 120;
  const SAFE_BOT = H - 60;
  const AVAIL = SAFE_BOT - SAFE_TOP;
  const PAD = 56, CARD_W = W - PAD * 2, cx = W / 2;
  const TITLE_FS = 52;
  const STAR_FS = n === 1 ? 44 : n === 2 ? 38 : 32;
  const TEXT_FS = n === 1 ? 38 : n === 2 ? 34 : 28;
  const NAME_FS = n === 1 ? 34 : n === 2 ? 30 : 26;
  const LH = TEXT_FS * 1.6, INNER_H = 36, INNER_W = 36, BAR_W = 8;
  // Testo centrato sulla card: stessa distanza dai due bordi (barra compresa).
  const MAX_TEXT_W = CARD_W - (BAR_W + INNER_W) * 2;
  const textFont = '400 ' + TEXT_FS + 'px ' + fn;
  const NAME_AREA = 18 + 1 + 16 + NAME_FS + INNER_H;

  const righeDi = (r: Recensione) => aCapo(r.text || '', MAX_TEXT_W, textFont, misura);
  const naturale = lista.map((r) => INNER_H + STAR_FS + 14 + Math.ceil(Math.max(1, righeDi(r).length) * LH) + NAME_AREA);

  const TITLE_BLOCK = TITLE_FS + 32;
  const cardsAvail = AVAIL - TITLE_BLOCK;
  const totNat = naturale.reduce((a, b) => a + b, 0);
  const gaps = lista.length - 1;
  const GAP = Math.min(48, Math.max(14, gaps > 0 ? (cardsAvail - totNat) / gaps : 0));
  const altezze = totNat + GAP * gaps <= cardsAvail
    ? naturale
    : naturale.map((h) => Math.max(120, Math.floor(h * (cardsAvail / (totNat + 14 * gaps)))));

  // Blocco intero (pillola del titolo + card) al centro della zona libera.
  const zonaAlto = SAFE_TOP - TITLE_FS + 2;
  const altezzaBlocco = (TITLE_FS - 2) + TITLE_BLOCK + altezze.reduce((a, b) => a + b, 0) + GAP * gaps;
  const inizio = inizioCentrato(altezzaBlocco, zonaAlto, SAFE_BOT);
  const titleY = inizio + TITLE_FS - 2;

  const el: Elemento[] = [];
  const titolo = 'Cosa dicono di noi:';
  const tFont = '900 ' + TITLE_FS + 'px ' + fn;
  const tW = misura(titolo, tFont), pillPad = 28, pillH = TITLE_FS + 20;
  el.push({ tipo: 'pillola', x: (W - tW) / 2 - pillPad, y: titleY - TITLE_FS + 2, w: tW + pillPad * 2, h: pillH, riempi: colori.pillolaTitolo });
  el.push({ tipo: 'testo', testo: titolo, x: cx, y: titleY, font: tFont, colore: colori.titolo });
  el.push({ tipo: 'linea', x1: W * 0.3, x2: W * 0.7, y: titleY + 16, colore: colori.titolo, spessore: 2.5, alfa: 0.67, sfumata: true });

  let cy = titleY + TITLE_BLOCK;
  lista.forEach((rev, ri) => {
    const cH = altezze[ri];
    const stelle = Math.min(5, Math.max(1, Number(rev.stars) || 5));
    const nome = String(rev.name || '').trim() || o.senzaNome || 'Paziente';
    el.push({ tipo: 'card', x: PAD, y: cy, w: CARD_W, h: cH, sfondo: colori.card, barra: [colori.p1, colori.p2], barraW: BAR_W });

    let iy = cy + INNER_H;
    // Stelle centrate: la terza sta sulla metà della storia.
    for (let i = 0; i < 5; i++) {
      el.push({ tipo: 'testo', testo: '★', x: cx + (i - 2) * (STAR_FS + 2), y: iy + STAR_FS, font: STAR_FS + 'px serif', colore: i < stelle ? colori.p2 : colori.stellaVuota });
    }
    iy += STAR_FS + 14;

    const textAreaH = cH - INNER_H - STAR_FS - 14 - NAME_AREA;
    const maxLines = Math.max(2, Math.floor(textAreaH / LH));
    const righe = righeDi(rev);
    const mostrate = righe.slice(0, maxLines);
    if (righe.length > maxLines) mostrate[mostrate.length - 1] += '...';
    for (const r of mostrate) {
      el.push({ tipo: 'testo', testo: r, x: cx, y: iy + TEXT_FS, font: textFont, colore: colori.testo });
      iy += LH;
    }

    iy += 18;
    el.push({ tipo: 'linea', x1: cx - MAX_TEXT_W / 2, x2: cx + MAX_TEXT_W / 2, y: iy, colore: colori.p1, spessore: 1, alfa: 0.15, sfumata: false });
    iy += 16;
    el.push({ tipo: 'testo', testo: '- ' + nome, x: cx, y: iy + NAME_FS, font: '700 ' + NAME_FS + 'px ' + fn, colore: colori.autore });

    cy += cH + (ri < lista.length - 1 ? GAP : 0);
  });

  return { elementi: el, zona: { alto: zonaAlto, basso: SAFE_BOT }, blocco: { alto: inizio, basso: inizio + altezzaBlocco } };
}

// ── Disegno ─────────────────────────────────────────────────────────────

/** Rettangolo con gli angoli tondi (solo il tracciato). */
export function rettangoloTondo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}

const alfaHex = (a: number) => Math.round(Math.min(1, Math.max(0, a)) * 255).toString(16).padStart(2, '0');

type Immagine = CanvasImageSource & { width: number; height: number };

/** Disegna gli elementi impaginati. Tutti i testi sono centrati sulla loro x. */
export function dipingi(ctx: CanvasRenderingContext2D, elementi: Elemento[], foto?: Immagine | null): void {
  for (const e of elementi) {
    ctx.save();
    if (e.tipo === 'testo') {
      ctx.font = e.font; ctx.fillStyle = e.colore; ctx.textAlign = 'center';
      if (e.alfa !== undefined) ctx.globalAlpha = e.alfa;
      if (e.ombra) { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 10; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 1; }
      ctx.fillText(e.testo, e.x, e.y);
    } else if (e.tipo === 'pillola') {
      if (e.riempi) {
        ctx.globalAlpha = e.alfaRiempi ?? 1; ctx.fillStyle = e.riempi;
        rettangoloTondo(ctx, e.x, e.y, e.w, e.h, e.h / 2); ctx.fill();
      }
      if (e.bordo) {
        ctx.globalAlpha = e.alfaBordo ?? 1; ctx.strokeStyle = e.bordo; ctx.lineWidth = 1.5;
        rettangoloTondo(ctx, e.x, e.y, e.w, e.h, e.h / 2); ctx.stroke();
      }
    } else if (e.tipo === 'linea') {
      if (e.sfumata && /^#[0-9a-f]{6}$/i.test(e.colore)) {
        const g = ctx.createLinearGradient(e.x1, 0, e.x2, 0);
        g.addColorStop(0, e.colore + '00'); g.addColorStop(0.5, e.colore + alfaHex(e.alfa)); g.addColorStop(1, e.colore + '00');
        ctx.strokeStyle = g;
      } else {
        ctx.strokeStyle = e.colore; ctx.globalAlpha = e.alfa;
      }
      ctx.lineWidth = e.spessore;
      ctx.beginPath(); ctx.moveTo(e.x1, e.y); ctx.lineTo(e.x2, e.y); ctx.stroke();
    } else if (e.tipo === 'foto') {
      if (foto && foto.width && foto.height) {
        // Ritaglio «cover» della foto dentro il riquadro.
        const sR = foto.width / foto.height, dR = e.w / e.h;
        let sx = 0, sy = 0, sw = foto.width, sh = foto.height;
        if (sR > dR) { sw = foto.height * dR; sx = (foto.width - sw) / 2; } else { sh = foto.width / dR; sy = (foto.height - sh) / 2; }
        rettangoloTondo(ctx, e.x, e.y, e.w, e.h, e.raggio); ctx.clip();
        ctx.drawImage(foto, sx, sy, sw, sh, e.x, e.y, e.w, e.h);
      }
    } else if (e.tipo === 'card') {
      ctx.shadowColor = 'rgba(0,0,0,0.13)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 5;
      ctx.fillStyle = e.sfondo; rettangoloTondo(ctx, e.x, e.y, e.w, e.h, 32); ctx.fill();
      ctx.restore(); ctx.save();
      const g = ctx.createLinearGradient(0, e.y, 0, e.y + e.h);
      g.addColorStop(0, e.barra[0]); g.addColorStop(1, e.barra[1]);
      ctx.fillStyle = g; rettangoloTondo(ctx, e.x, e.y, e.barraW, e.h, 4); ctx.fill();
    }
    ctx.restore();
  }
}

// ── Sfondi pronti (revisione 03/11) ─────────────────────────────────────
// Un terapista un template grafico non ce l'ha: senza upload si usano questi
// sfondi, disegnati coi colori del brand. Il logo NON è mai uno sfondo.
export const SFONDI_PRONTI = [
  { id: 'morbido', label: 'Morbido' },
  { id: 'angoli', label: 'Angoli' },
  { id: 'banda', label: 'Banda' },
] as const;

export function disegnaSfondo(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[] | null | undefined, variant?: string | null): void {
  const p1 = (colors && colors[0]) || '#554697';
  const p2 = (colors && colors[1]) || p1;
  // Base sempre chiara e leggibile.
  ctx.fillStyle = '#f7f7fa'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (variant === 'angoli') {
    ctx.globalAlpha = 0.12; ctx.fillStyle = p1;
    ctx.beginPath(); ctx.arc(0, 0, W * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.10; ctx.fillStyle = p2;
    ctx.beginPath(); ctx.arc(W, H, W * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = p1;
    ctx.fillRect(0, 0, W, 14);
  } else if (variant === 'banda') {
    ctx.globalAlpha = 0.08; ctx.fillStyle = p1;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.30); ctx.lineTo(W, H * 0.14); ctx.lineTo(W, H * 0.40); ctx.lineTo(0, H * 0.56); ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.10; ctx.fillStyle = p2;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.78); ctx.lineTo(W, H * 0.64); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = p1;
    ctx.fillRect(0, H - 14, W, 14);
  } else { // morbido
    ctx.globalAlpha = 0.10; ctx.fillStyle = p1;
    ctx.beginPath(); ctx.ellipse(W * 0.92, H * 0.10, W * 0.5, W * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.08; ctx.fillStyle = p2;
    ctx.beginPath(); ctx.ellipse(W * 0.06, H * 0.92, W * 0.55, W * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
