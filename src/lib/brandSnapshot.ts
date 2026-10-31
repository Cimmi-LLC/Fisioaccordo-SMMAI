// Istantanee del Brand Kit (per lo storico versioni e per "Annulla").
// Funzioni pure: niente rete. Le foto (gallery/location) restano fuori perche
// possono essere immagini incorporate da megabyte; il template e il genoma
// del wizard pure, perche hanno il loro ciclo di approvazione.

export const SNAPSHOT_FIELDS = [
  'nome_business', 'professione', 'professione_custom', 'website_url', 'descrizione', 'categorie',
  'servizi', 'target_pazienti', 'citta', 'tono_voce', 'persona_scrittura', 'vantaggi_competitivi',
  'mission', 'identita_core', 'temi_chiave', 'cta_suggerite', 'parole_da_evitare',
  'colore_primario', 'colore_secondario', 'colore_terziario', 'font_intestazioni', 'font_body',
  'logo_url', 'post_template_id',
] as const;

export type SnapshotField = typeof SNAPSHOT_FIELDS[number];
export type BrandSnapshot = Partial<Record<SnapshotField, unknown>>;

export const FIELD_LABELS: Record<SnapshotField, string> = {
  nome_business: 'Nome', professione: 'Professione', professione_custom: 'Professione (testo)',
  website_url: 'Sito principale', descrizione: 'Descrizione', categorie: 'Categorie', servizi: 'Servizi',
  target_pazienti: 'Target', citta: 'Città', tono_voce: 'Tono di voce', persona_scrittura: 'Persona',
  vantaggi_competitivi: 'Vantaggi competitivi', mission: 'Mission', identita_core: 'Identità core',
  temi_chiave: 'Temi chiave', cta_suggerite: 'Call to action', parole_da_evitare: 'Parole da evitare',
  colore_primario: 'Colore primario', colore_secondario: 'Colore secondario', colore_terziario: 'Colore terziario',
  font_intestazioni: 'Font titoli', font_body: 'Font testo', logo_url: 'Logo', post_template_id: 'Sfondo post',
};

const norm = (v: unknown): unknown => {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.trim();
  return v;
};

/** Copia dei soli campi del Brand Kit da conservare. */
export function pickSnapshot(brand: Record<string, unknown>): BrandSnapshot {
  const out: BrandSnapshot = {};
  for (const f of SNAPSHOT_FIELDS) {
    const v = brand[f];
    out[f] = Array.isArray(v) ? [...v] : v ?? null;
  }
  return out;
}

/** Campi diversi tra due istantanee (ordine stabile, quello di SNAPSHOT_FIELDS). */
export function diffSnapshot(a: BrandSnapshot, b: BrandSnapshot): SnapshotField[] {
  return SNAPSHOT_FIELDS.filter((f) => JSON.stringify(norm(a[f])) !== JSON.stringify(norm(b[f])));
}

/** Valore leggibile e corto per le liste e i confronti. */
export function preview(v: unknown, max = 90): string {
  const n = norm(v);
  const s = Array.isArray(n) ? n.join(' · ') : String(n);
  if (!s) return '—';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
