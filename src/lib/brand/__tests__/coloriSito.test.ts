import { describe, expect, it } from 'vitest';
import { COLORI_SOCIAL, coloriDelSito } from '../coloriSito';
import { siteGroundedColors } from '../../siteColors';

// Un sito come quello del test del 09/11: blu del brand, pulsanti verdi, e
// nel piede le icone dei social col gradiente di Instagram ripetuto.
const iconaInstagram = '<a href="https://instagram.com/studio"><svg><linearGradient><stop stop-color="#f09433"/><stop stop-color="#e6683c"/><stop stop-color="#dc2743"/><stop stop-color="#cc2366"/><stop stop-color="#bc1888"/></linearGradient></svg></a>';
const sito = `<html><head><style>
  h1,h2,a{color:#00539e} .menu{background:#00539e} .hero{border-color:#00539e}
  .btn{background:#2e9e5b} .btn:hover{background:#2e9e5b} .badge{color:#2e9e5b}
  body{color:#3c4043}
</style></head><body>
  <a style="background:#1877f2" href="https://facebook.com/studio">f</a>
  <a style="background:#25d366" href="https://wa.me/39">w</a>
  ${iconaInstagram}${iconaInstagram}${iconaInstagram}${iconaInstagram}
</body></html>`;

describe('coloriDelSito', () => {
  const colori = coloriDelSito(sito, '').map((c) => c.hex);

  it('trova il blu del brand e il verde dei pulsanti', () => {
    expect(colori).toContain('#00539e');
    expect(colori).toContain('#2e9e5b');
  });

  it('caso del 09/11: l\'arancione del gradiente di Instagram non è un colore del brand', () => {
    expect(colori).not.toContain('#f09433');
    for (const c of colori) expect(COLORI_SOCIAL.has(c), c).toBe(false);
  });

  it('il secondario del kit diventa il verde dei pulsanti, non l\'arancione proposto dall\'analisi', () => {
    const kit = siteGroundedColors(
      { colore_primario: '#00539e', colore_secondario: '#f09433', colore_terziario: '#3c4043' },
      colori,
      { primario: '#554697', secondario: '#e6007e', terziario: '#1a1a2e' },
    );
    expect(kit.colore_primario).toBe('#00539e');
    expect(kit.colore_secondario).toBe('#2e9e5b');
  });

  it('un colore «da social» resta se il sito lo dichiara come suo', () => {
    const rosso = coloriDelSito('<head><meta name="theme-color" content="#ff0000"><style>h1{color:#ff0000} a{color:#ff0000}</style></head>', '').map((c) => c.hex);
    expect(rosso).toContain('#ff0000');
    const nonDichiarato = coloriDelSito('<head><style>h1{color:#ff0000} a{color:#ff0000} p{color:#114477}</style></head>', '').map((c) => c.hex);
    expect(nonDichiarato).not.toContain('#ff0000');
    expect(nonDichiarato).toContain('#114477');
  });

  it('i colori di WordPress e Bootstrap restano fuori come prima', () => {
    const wp = coloriDelSito('<style>a{color:#007cba} b{color:#0d6efd} h1{color:#feca57} h2{color:#feca57}</style>', '').map((c) => c.hex);
    expect(wp).toEqual(['#feca57']);
  });

  it('i pulsanti social del tema non contano, anche con tinte fuori elenco (sito vero del test)', () => {
    const tema = `a.btn-facebook, .btn-facebook { background: #45629f; } a.btn-twitter, .btn-twitter { background: #5eb2ef; }
      a.btn-instagram { background: #f09433; background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%); }
      .btn-orange, a.btn-orange { background: #f0853d; } .bg-orange { background: #f0853d; } .text-orange { color: #f0853d; }
      h1, h2 { color: #00539e; } a { color: #00539e; } .menu { background: #00539e; }`;
    const c = coloriDelSito('<html></html>', tema).map((x) => x.hex);
    expect(c).toEqual(expect.arrayContaining(['#00539e', '#f0853d']));
    for (const no of ['#45629f', '#5eb2ef', '#f09433', '#e6683c']) expect(c).not.toContain(no);
  });
});
