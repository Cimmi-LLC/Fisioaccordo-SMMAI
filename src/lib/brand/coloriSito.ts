// Colori del brand letti dal sito. Funzioni pure, specchiate in
// supabase/functions/_shared/brand (lo controlla mirrorSync.test.ts): le usa
// scrape-website, e i test girano qui.

// Colori che compaiono nel codice di quasi ogni sito ma non sono del brand:
// editor e admin di WordPress, palette predefinita di Gutenberg, default di
// Elementor e Bootstrap. Esempio reale: resetposturale.it risultava viola
// (#7a00df = --wp-block-synced-color) e blu (#007cba = --wp-admin-theme-color)
// mentre il sito e giallo #feca57 e corallo #ff6b6b.
export const FRAMEWORK_COLORS = new Set([
  // WordPress editor/admin
  "#7a00df", "#007cba", "#006ba1", "#005a87", "#3858e9", "#2271b1", "#135e96", "#32373c", "#1e1e1e", "#757575", "#cc1818", "#4ab866", "#f0b849", "#d94f4f",
  // Palette e gradienti predefiniti di Gutenberg
  "#abb8c3", "#f78da7", "#cf2e2e", "#ff6900", "#fcb900", "#7bdcb5", "#00d084", "#8ed1fc", "#0693e3", "#9b51e0",
  "#7adcb4", "#00d082", "#ffcb70", "#c751c0", "#4158d0", "#caf880", "#71ce7e", "#020381", "#2874fc", "#4aeadc", "#9778d1", "#cf2aba", "#ee2c82", "#fb6962", "#fef84c",
  "#ffceec", "#9896f0", "#fecda5", "#fe2d2d", "#6b003e", "#fff5cb", "#b6e3d4", "#33a7b5", "#a9b8c3", "#34e2e4", "#4721fb", "#ab1dfe", "#faaca8", "#fad0c4",
  // Elementor (colori globali di default, se il sito non li ha cambiati)
  "#6ec1e4", "#54595f", "#7a7a7a", "#61ce70",
  // Bootstrap 4/5 (variabili --bs-* e componenti di default)
  "#007bff", "#6c757d", "#28a745", "#dc3545", "#ffc107", "#17a2b8", "#343a40", "#f8f9fa", "#0d6efd", "#6610f2", "#6f42c1", "#d63384", "#fd7e14", "#198754", "#20c997", "#0dcaf0", "#adb5bd", "#495057", "#212529", "#e9ecef", "#dee2e6", "#ced4da",
]);

export function normHex(raw: string): string | null {
  let h = raw.trim().toLowerCase().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/.test(h)) h = h.split("").map((c) => c + c).join("");
  if (/^[0-9a-f]{8}$/.test(h)) h = h.slice(0, 6); // ignora l'alpha
  return /^[0-9a-f]{6}$/.test(h) ? "#" + h : null;
}

export function hexInfo(hex: string): { lum: number; sat: number } {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const sat = max === min ? 0 : (l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min));
  return { lum: 0.2126 * r + 0.7152 * g + 0.0722 * b, sat };
}

/** Toglie dal codice i blocchi di stile e le variabili di WordPress/Bootstrap che non sono del brand. */
export function stripFrameworkCss(css: string): string {
  return css
    .replace(/<style[^>]*id=["'](?:wp-block-library|global-styles|wp-emoji-styles|classic-theme-styles|core-block-supports|wp-img-auto-sizes-contain|wp-block-[a-z-]+)[^"']*["'][^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/--(?:wp|bs)[-a-z0-9]*\s*:\s*[^;}]+/gi, " ");
}

// Colori dei social: stanno nelle icone di header e footer di quasi ogni sito
// (il gradiente di Instagram, il blu di Facebook, il verde di WhatsApp) e non
// sono del brand. Revisione del reparto social, 09/11/2026: il secondario di
// cervicalevertigini.it era #f09433, l'arancione del gradiente di Instagram,
// e finiva nelle risposte dei quiz delle storie. Stesso errore del fucsia su
// fisiompt.
export const COLORI_SOCIAL = new Set([
  // Instagram (gradiente e varianti)
  "#f09433", "#e6683c", "#dc2743", "#cc2366", "#bc1888", "#833ab4", "#fd1d1d", "#fcb045", "#c13584", "#e1306c",
  "#405de6", "#5851db", "#f77737", "#ffdc80", "#fccc63", "#feda75", "#fa7e1e", "#d62976", "#962fbf", "#4f5bd5",
  // Facebook e Messenger
  "#1877f2", "#3b5998", "#4267b2", "#0866ff", "#0084ff", "#00b2ff",
  // WhatsApp
  "#25d366", "#128c7e", "#075e54", "#34b7f1",
  // YouTube
  "#ff0000", "#c4302b", "#cd201f",
  // LinkedIn
  "#0077b5", "#0a66c2", "#0e76a8",
  // X / Twitter
  "#1da1f2", "#55acee", "#1d9bf0",
  // TikTok
  "#69c9d0", "#ee1d52", "#25f4ee", "#fe2c55",
  // Telegram, Pinterest, Spotify, Trustpilot
  "#0088cc", "#229ed9", "#26a5e4", "#e60023", "#bd081c", "#1db954", "#00b67a",
  // Google (logo e recensioni)
  "#4285f4", "#ea4335", "#fbbc05", "#34a853", "#db4437", "#0f9d58", "#f4b400",
]);

export type BrandColor = { hex: string; count: number; source: "dichiarato" | "frequenza" };

/**
 * I colori del brand dal codice della pagina e dai fogli di stile del tema,
 * in ordine di importanza. Funzione pura: il download dei fogli di stile lo fa
 * scrape-website.
 */
/**
 * Toglie le regole CSS dei pulsanti social (`.btn-instagram { … }`,
 * `a.btn-twitter { … }`): ogni tema li colora a modo suo, spesso con tinte
 * che non stanno in nessun elenco (su cervicalevertigini.it #45629f per
 * Facebook e #5eb2ef per Twitter).
 */
const REGOLA_SOCIAL = /[^{}]*(?:facebook|twitter|instagram|whatsapp|youtube|linkedin|tiktok|telegram|pinterest|messenger|trustpilot|google-?plus|gplus)[^{}]*\{[^{}]*\}/gi;

export function senzaRegoleSocial(css: string): string {
  return css.replace(REGOLA_SOCIAL, ' ');
}

export function coloriDelSito(html: string, cssEsterno: string): BrandColor[] {
  const pageCss = senzaRegoleSocial(stripFrameworkCss(html));
  const themeCss = senzaRegoleSocial(stripFrameworkCss(cssEsterno));

  // Colori dichiarati come colori del brand (meta theme-color, colori globali
  // di Elementor, variabili --primary/--brand...): piccolo bonus, non priorita
  // assoluta, perche spesso sono i default del tema e il sito non li usa.
  const declared = new Set<string>();
  const themeColor = html.match(/<meta[^>]+name=["']theme-color["'][^>]*content=["']([^"']+)["']/i)?.[1];
  if (themeColor) { const h = normHex(themeColor); if (h) declared.add(h); }
  const declPatterns = [
    /--e-global-color-[a-z0-9]+\s*:\s*(#[0-9a-fA-F]{3,8})/gi,
    /--(?:color-)?(?:primary|secondary|accent|brand|main)(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})/gi,
  ];
  for (const re of declPatterns) for (const m of (pageCss + "\n" + themeCss).matchAll(re)) { const h = normHex(m[1]); if (h) declared.add(h); }

  // Frequenza: i colori scritti nella pagina (cio che il visitatore vede)
  // pesano 3, quelli dei fogli di stile del tema pesano 1.
  const score = new Map<string, number>();
  const uses = new Map<string, number>();
  const count = (text: string, weight: number) => {
    const add = (h: string | null) => {
      if (!h) return;
      score.set(h, (score.get(h) || 0) + weight);
      uses.set(h, (uses.get(h) || 0) + 1);
    };
    for (const m of text.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g)) add(normHex(m[1]));
    for (const m of text.matchAll(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi)) {
      add("#" + [m[1], m[2], m[3]].map((n) => Math.min(255, parseInt(n)).toString(16).padStart(2, "0")).join(""));
    }
  };
  count(pageCss, 3);
  count(themeCss, 1);
  for (const h of declared) if (!score.has(h)) { score.set(h, 0); uses.set(h, 0); }

  const usable = (h: string) => {
    if (FRAMEWORK_COLORS.has(h)) return false;
    // Il colore di un social è del social, non del brand, a meno che il sito
    // lo dichiari come suo (theme-color, --primary, colori globali).
    if (COLORI_SOCIAL.has(h) && !declared.has(h)) return false;
    const { lum } = hexInfo(h);
    return lum < 0.93 && lum > 0.02; // via bianchi e neri quasi puri
  };

  return [...score.entries()]
    .filter(([h]) => usable(h))
    // i grigi raramente sono il colore del brand: a parita di uso vincono i saturi
    .map(([h, sc]) => ({ hex: h, rank: sc + (declared.has(h) ? 4 : 0) + hexInfo(h).sat * 3 }))
    .sort((x, y) => y.rank - x.rank)
    .slice(0, 12)
    .map(({ hex }) => ({ hex, count: uses.get(hex) || 0, source: declared.has(hex) ? "dichiarato" as const : "frequenza" as const }));
}
