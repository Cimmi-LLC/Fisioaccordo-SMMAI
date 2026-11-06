// Periodo della dashboard Performance e lettura delle righe di post_metrics.
//
// Le righe dei post non hanno lo stesso significato su tutti i canali:
// - Instagram (Meta e Apify) salva a ogni giro i TOTALI del post (like,
//   copertura… da quando è uscito). Sommarle sul periodo contava lo stesso
//   post una volta per ogni giro: più lungo il periodo, più gonfi i numeri.
// - TikTok e YouTube salvano già l'AUMENTO del giorno (planPostSnapshot).
// toIncrements porta Instagram allo stesso formato, così la dashboard
// somma aumenti su tutti i canali.

export type RangeId = 7 | 28 | 90 | 'custom';

export interface PeriodWindow {
  from: string;      // YYYY-MM-DD incluso
  to: string;        // YYYY-MM-DD incluso
  days: number;
  prevFrom: string;  // periodo precedente, stessa durata
  prevTo: string;
}

const DAY = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDay(s: string | null | undefined): s is string {
  return !!s && DAY_RE.test(s) && !isNaN(Date.parse(s));
}

/** Oggi nel fuso del browser (Italia/Dubai), non in UTC. */
export function localToday(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function shiftDays(day: string, n: number): string {
  return new Date(Date.parse(day) + n * DAY).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1;
}

/**
 * Periodo scelto + periodo precedente di uguale durata.
 * Personalizzato: date vuote o sbagliate tornano agli ultimi 28 giorni,
 * date invertite si scambiano, niente oltre oggi.
 */
export function resolveWindow(range: RangeId, customFrom: string, customTo: string, today: string): PeriodWindow {
  let from: string;
  let to: string;
  if (range === 'custom') {
    from = isDay(customFrom) ? customFrom : shiftDays(today, -27);
    to = isDay(customTo) ? customTo : today;
    if (to > today) to = today;
    if (from > to) [from, to] = [to, from];
  } else {
    to = today;
    from = shiftDays(today, -range + 1);
  }
  const days = daysBetween(from, to);
  return { from, to, days, prevFrom: shiftDays(from, -days), prevTo: shiftDays(from, -1) };
}

/** Campi sommabili: su Instagram sono totali del post, da trasformare in aumenti. */
export const CUMULATIVE_KEYS = [
  'reach', 'impressions', 'engagement', 'likes', 'comments', 'saves', 'shares', 'video_views', 'watch_minutes',
] as const;

type Cumulative = (typeof CUMULATIVE_KEYS)[number];

export interface SnapshotRow {
  snapshot_date: string;
  external_post_id: string;
  is_account_level: boolean;
}

/**
 * Totali per post → aumento rispetto al giro precedente dello stesso post.
 * Il primo giro di un post vale per intero (post nuovo o primo giro in assoluto).
 * Valori negativi (Apify scrive -1 quando i like sono nascosti) contano come
 * mancanti; un totale che scende non toglie nulla.
 * Le righe account restano come sono.
 */
export function toIncrements<T extends SnapshotRow>(rows: T[]): T[] {
  const sorted = [...rows].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
  const last = new Map<string, Partial<Record<Cumulative, number>>>();
  return sorted.map((row) => {
    if (row.is_account_level) return row;
    const prev = last.get(row.external_post_id);
    const seen: Partial<Record<Cumulative, number>> = { ...(prev || {}) };
    const out: any = { ...row };
    for (const k of CUMULATIVE_KEYS) {
      const raw = (row as any)[k];
      const v = raw == null || isNaN(Number(raw)) || Number(raw) < 0 ? null : Number(raw);
      if (v == null) { out[k] = null; continue; }
      const before = prev?.[k];
      out[k] = before == null ? v : Math.max(0, v - before);
      seen[k] = Math.max(v, before ?? 0);
    }
    last.set(row.external_post_id, seen);
    return out as T;
  });
}

export function inWindow<T extends { snapshot_date: string }>(rows: T[], from: string, to: string): T[] {
  return rows.filter((r) => r.snapshot_date >= from && r.snapshot_date <= to);
}

/** «05 nov» da una data YYYY-MM-DD, senza passare dal fuso orario. */
export function dayLabel(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}
