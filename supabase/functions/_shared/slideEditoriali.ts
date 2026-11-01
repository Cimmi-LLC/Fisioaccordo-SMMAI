// Slide «editoriali» del pilota scoperte, disegnate dal server.
//
// Niente modello delle immagini per il testo: Satori impagina (flexbox) e
// Resvg fa il PNG, così il testo esce esatto, senza refusi né sovrapposizioni.
// È il template approvato da Attilio il 01/11/2026 sul carosello del laser
// per Terapista Stellato: fondo scuro, accento a fascia sulle parole chiave,
// Inter 900 maiuscolo, numeri grandi, foto vera in copertina e nei passi.

import satori from "npm:satori@0.12.2";
import { Resvg, initWasm } from "npm:@resvg/resvg-wasm@2.6.2";
import { segmenti, testoPiano, type Segmento, type SlideEditoriale } from "./brand/scoperte.ts";

export const LARGHEZZA = 1080;
export const ALTEZZA = 1350;
const MARGINE = 80;
const CONTENUTO = LARGHEZZA - 2 * MARGINE;

export type Colori = { sfondo: string; accento: string; testo: string };
export type Immagine = { src: string; w: number; h: number };
export type OpzioniSlide = {
  indice: number;
  totale: number;
  etichetta: string;
  colori: Colori;
  logo: Immagine | null;
  /** Foto della slide (copertina o passi), data URL; null = layout senza foto. */
  foto: string | null;
  /** «Rivista, anno» per la citazione e la chiusura. */
  fonte: string;
};

type Nodo = { type: string; props: Record<string, unknown> };
type Figlio = Nodo | string | null | false;

function el(type: string, style: Record<string, unknown>, ...figli: Figlio[]): Nodo {
  const children = figli.filter((f): f is Nodo | string => f !== null && f !== false && f !== "");
  return { type, props: { style, children: children.length === 0 ? undefined : children.length === 1 ? children[0] : children } };
}

function img(src: string, w: number, h: number, style: Record<string, unknown> = {}): Nodo {
  return { type: "img", props: { src, width: w, height: h, style: { width: w, height: h, ...style } } };
}

// ── Font e motore, caricati una volta per istanza ──
const INTER = "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin";
let pronti: Promise<Array<{ name: string; data: ArrayBuffer; weight: 500 | 600 | 800 | 900; style: "normal" }>> | null = null;

function prepara() {
  if (!pronti) {
    pronti = (async () => {
      await initWasm(fetch("https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm"));
      return await Promise.all(([500, 600, 800, 900] as const).map(async (weight) => {
        const r = await fetch(`${INTER}-${weight}-normal.woff`);
        if (!r.ok) throw new Error(`Font Inter ${weight}: ${r.status}`);
        return { name: "Inter", data: await r.arrayBuffer(), weight, style: "normal" as const };
      }));
    })();
    pronti.catch(() => { pronti = null; });
  }
  return pronti;
}

/** Larghezza e altezza di un PNG o di un JPEG (servono a Satori per il logo). */
export function dimensioniImmagine(b: Uint8Array): { w: number; h: number } | null {
  if (b[0] === 0x89 && b[1] === 0x50) {
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return { w: v.getUint32(16), h: v.getUint32(20) };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      const len = (b[i + 2] << 8) | b[i + 3];
      if (m >= 0xc0 && m <= 0xc3) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
      i += 2 + len;
    }
  }
  return null;
}

/** Corpo del titolo: il più grande che sta nella larghezza e nel numero di righe. */
export function corpoTitolo(testo: string, base: number, maxRighe: number, larghezza = CONTENUTO): number {
  const parole = testoPiano(testo).toUpperCase().split(/\s+/).filter(Boolean);
  const piuLunga = Math.max(1, ...parole.map((p) => p.length));
  // Inter 900 maiuscolo: circa 0,68 em per lettera.
  let corpo = Math.min(base, Math.floor(larghezza / (piuLunga * 0.68)));
  const righe = (c: number) => {
    let n = 1, riga = 0;
    for (const p of parole) {
      const w = p.length * 0.68 * c + 0.28 * c;
      if (riga > 0 && riga + w > larghezza) { n++; riga = 0; }
      riga += w;
    }
    return n;
  };
  while (corpo > 40 && righe(corpo) > maxRighe) corpo -= 4;
  return corpo;
}

/** Testo con le parole in fascia o in accento; ogni parola va a capo da sola. */
function ricco(testo: string, corpo: number, peso: number, colori: Colori, extra: Record<string, unknown> = {}, maiuscolo = false): Nodo {
  const pezzo = (s: Segmento) => {
    const t = maiuscolo ? s.testo.toLocaleUpperCase("it") : s.testo;
    if (s.stile === "fascia") {
      return el("span", { backgroundColor: colori.accento, color: colori.sfondo, padding: `0 ${Math.round(corpo * 0.12)}px` }, t);
    }
    if (s.stile === "accento") return el("span", { color: colori.accento, fontWeight: Math.max(peso, 800) }, t);
    return el("span", {}, t);
  };
  // Pezzi attaccati (es. «spento» + «.») stanno nello stesso blocco: vanno a capo insieme.
  const gruppi: Segmento[][] = [];
  for (const s of segmenti(testo)) {
    if (s.attacca && gruppi.length > 0) gruppi[gruppi.length - 1].push(s);
    else gruppi.push([s]);
  }
  const parole = gruppi.map((g) => g.length === 1 ? pezzo(g[0]) : el("div", { display: "flex" }, ...g.map(pezzo)));
  return el("div", {
    display: "flex", flexWrap: "wrap", columnGap: Math.round(corpo * 0.26), rowGap: Math.round(corpo * 0.06),
    fontSize: corpo, fontWeight: peso, lineHeight: 1.04, ...extra,
  }, ...parole);
}

function titolo(testo: string, base: number, maxRighe: number, colori: Colori, extra: Record<string, unknown> = {}): Nodo {
  return ricco(testo, corpoTitolo(testo, base, maxRighe), 900, colori, { letterSpacing: -1, ...extra }, true);
}

function testo(t: string, corpo: number, colori: Colori, extra: Record<string, unknown> = {}): Nodo {
  return ricco(t, corpo, 500, colori, { lineHeight: 1.3, color: "#e9e9e9", ...extra });
}

function citazione(t: string, sotto: string, colori: Colori): Nodo {
  return el("div", { display: "flex", flexDirection: "column", borderLeft: `8px solid ${colori.accento}`, paddingLeft: 36 },
    el("div", { display: "flex", fontSize: 44, fontWeight: 800, lineHeight: 1.2 }, `«${testoPiano(t).replace(/^«|»$/g, "")}»`),
    sotto ? el("div", { display: "flex", fontSize: 24, color: "#8a8a8a", marginTop: 18 }, sotto) : null);
}

function contenuto(s: SlideEditoriale, op: OpzioniSlide): Nodo[] {
  const c = op.colori;
  const colonna = (style: Record<string, unknown>, ...figli: Figlio[]) =>
    el("div", { display: "flex", flexDirection: "column", ...style }, ...figli);
  switch (s.tipo) {
    case "copertina":
      return [
        op.foto ? img(op.foto, LARGHEZZA, 790, { position: "absolute", left: 0, top: 560, objectFit: "cover" }) : null,
        op.foto ? el("div", {
          display: "flex", position: "absolute", left: 0, top: 0, width: LARGHEZZA, height: ALTEZZA,
          backgroundImage: `linear-gradient(180deg, ${c.sfondo} 0%, ${c.sfondo} 44%, rgba(0,0,0,0) 60%, rgba(0,0,0,0) 86%, rgba(0,0,0,0.7) 100%)`,
        }) : null,
        colonna({ position: "absolute", left: MARGINE, top: 140, width: CONTENUTO },
          s.sopra ? el("div", { display: "flex", fontSize: 38, fontWeight: 600, color: "#e9e9e9", marginBottom: 22 }, s.sopra) : null,
          titolo(s.titolo, 112, 5, c)),
      ].filter(Boolean) as Nodo[];
    case "riconosci":
      return [colonna({ position: "absolute", left: MARGINE, top: 150, width: CONTENUTO },
        titolo(s.titolo, 96, 2, c),
        colonna({ marginTop: 110, gap: 44 }, ...s.righe.map((r) => testo(r, 54, c, { color: c.testo, fontWeight: 600 }))),
        s.chiusa ? testo(s.chiusa, 40, c, { color: "#9a9a9a", marginTop: 56 }) : null)];
    case "confronto": {
      const box = (lato: { numero: string; etichetta: string }, forte: boolean) =>
        colonna({ flex: 1, border: `3px solid ${forte ? c.accento : "#3a3a3a"}`, borderRadius: 28, padding: "40px 36px" },
          el("div", { display: "flex", fontSize: corpoTitolo(lato.numero, 150, 1, 360), fontWeight: 900, color: forte ? c.accento : "#6d6d6d", lineHeight: 1 }, lato.numero),
          el("div", { display: "flex", fontSize: 32, fontWeight: 800, marginTop: 14, color: forte ? c.testo : "#bdbdbd" }, lato.etichetta.toLocaleUpperCase("it")));
      return [colonna({ position: "absolute", left: MARGINE, top: 150, width: CONTENUTO },
        titolo(s.titolo, 84, 3, c),
        s.testo ? testo(s.testo, 38, c, { marginTop: 30, color: "#dcdcdc" }) : null,
        el("div", { display: "flex", gap: 28, marginTop: 50 }, box(s.a, true), box(s.b, false)),
        s.nota ? testo(s.nota, 40, c, { marginTop: 56, fontWeight: 700, color: c.testo }) : null)];
    }
    case "numero": {
      const valore = parseFloat(s.numero.replace(",", ".").replace(/[^\d.]/g, ""));
      const quota = s.scala && Number.isFinite(valore) ? Math.max(0.02, Math.min(1, valore / s.scala)) : null;
      return [colonna({ position: "absolute", left: MARGINE, top: 150, width: CONTENUTO },
        titolo(s.titolo, 84, 3, c),
        el("div", { display: "flex", alignItems: "flex-end", marginTop: 20 },
          el("div", { display: "flex", fontSize: corpoTitolo(s.numero, 300, 1, 700), fontWeight: 900, color: c.accento, lineHeight: 0.95, letterSpacing: -6 }, s.numero),
          s.unita ? el("div", { display: "flex", fontSize: 52, fontWeight: 800, marginLeft: 22, marginBottom: 30 }, s.unita) : null),
        quota !== null ? colonna({ marginTop: 50 },
          el("div", { display: "flex", height: 34, borderRadius: 17, backgroundColor: "#262626" },
            el("div", { display: "flex", width: Math.round(CONTENUTO * quota), height: 34, borderRadius: 17, backgroundColor: c.accento })),
          el("div", { display: "flex", justifyContent: "space-between", fontSize: 26, color: "#8a8a8a", fontWeight: 600, marginTop: 12 },
            el("span", {}, "0"), el("span", {}, "scala"), el("span", {}, String(s.scala)))) : null,
        s.testo ? testo(s.testo, 44, c, { marginTop: 56 }) : null)];
    }
    case "punto":
      return [
        colonna({ position: "absolute", left: MARGINE, top: 150, width: CONTENUTO },
          titolo(s.titolo, 96, 4, c),
          s.testo ? testo(s.testo, 40, c, { marginTop: 40 }) : null),
        s.citazione ? colonna({ position: "absolute", left: MARGINE, top: 860, width: CONTENUTO },
          citazione(s.citazione, `Conclusione dello studio · ${op.fonte}`, c)) : null,
      ].filter(Boolean) as Nodo[];
    case "passi": {
      const passi = s.passi.map((p, i) => el("div", { display: "flex", gap: 24, alignItems: "flex-start" },
        el("div", {
          display: "flex", flexShrink: 0, width: 56, height: 56, borderRadius: 28, backgroundColor: c.accento, color: c.sfondo,
          fontWeight: 900, fontSize: 32, alignItems: "center", justifyContent: "center",
        }, String(i + 1)),
        testo(p, op.foto ? 34 : 42, c, { color: c.testo, flex: 1 })));
      return [colonna({ position: "absolute", left: MARGINE, top: 150, width: CONTENUTO },
        titolo(s.titolo, 72, 2, c),
        s.sottotitolo ? testo(s.sottotitolo, 32, c, { color: "#9a9a9a", marginTop: 18 }) : null,
        op.foto ? img(op.foto, CONTENUTO, 380, { objectFit: "cover", borderRadius: 28, marginTop: 40 }) : null,
        colonna({ marginTop: op.foto ? 40 : 70, gap: op.foto ? 20 : 36 }, ...passi))];
    }
    case "domanda":
      return [
        colonna({ position: "absolute", left: MARGINE, top: 150, width: CONTENUTO },
          titolo(s.titolo, 76, 3, c),
          ricco(s.domanda, corpoTitolo(s.domanda, 84, 4), 900, c, { color: c.accento, lineHeight: 1.05, marginTop: 36 })),
        s.nota ? colonna({ position: "absolute", left: MARGINE, top: 900, width: CONTENUTO, borderLeft: `8px solid ${c.accento}`, paddingLeft: 36 },
          testo(s.nota, 40, c)) : null,
      ].filter(Boolean) as Nodo[];
    case "cta":
      return [
        colonna({ position: "absolute", left: MARGINE, top: 150, width: CONTENUTO },
          titolo(s.titolo, 104, 5, c),
          s.testo ? testo(s.testo, 40, c, { marginTop: 40 }) : null),
        op.fonte ? el("div", { position: "absolute", left: MARGINE, top: 1060, width: CONTENUTO, display: "flex", fontSize: 24, color: "#8a8a8a" },
          `Fonte: ${op.fonte}.`) : null,
      ].filter(Boolean) as Nodo[];
  }
}

/** Una slide completa come albero per Satori (esportata per i test). */
export function alberoSlide(s: SlideEditoriale, op: OpzioniSlide): Nodo {
  const c = op.colori;
  const ultima = op.indice === op.totale - 1;
  const logoH = 64;
  return el("div", {
    display: "flex", position: "relative", width: LARGHEZZA, height: ALTEZZA, backgroundColor: c.sfondo,
    color: c.testo, fontFamily: "Inter",
  },
    ...contenuto(s, op),
    el("div", {
      position: "absolute", top: 64, left: MARGINE, width: CONTENUTO, display: "flex", justifyContent: "space-between",
      fontSize: 26, fontWeight: 600, letterSpacing: 3.6, color: c.accento,
    }, el("span", {}, op.etichetta), el("span", { color: "#8a8a8a" }, `${op.indice + 1}/${op.totale}`)),
    el("div", {
      position: "absolute", bottom: 64, left: MARGINE, width: CONTENUTO, display: "flex", justifyContent: "space-between", alignItems: "center",
    },
      op.logo ? img(op.logo.src, Math.round(op.logo.w * logoH / op.logo.h), logoH) : el("span", {}, " "),
      ultima ? null : el("span", { fontSize: 26, fontWeight: 600, letterSpacing: 3, color: c.testo }, "SCORRI ›")),
  );
}

/** PNG 1080×1350 della slide. */
export async function disegnaSlideEditoriale(s: SlideEditoriale, op: OpzioniSlide): Promise<Uint8Array> {
  const fonts = await prepara();
  // deno-lint-ignore no-explicit-any
  const svg = await satori(alberoSlide(s, op) as any, { width: LARGHEZZA, height: ALTEZZA, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: LARGHEZZA } }).render().asPng();
}
