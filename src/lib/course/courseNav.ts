// Logica pura del "Corso per andare virali": ordine delle lezioni, moduli,
// avanti/indietro, conteggi dei progressi, ricerca e link interni.
// Niente React e niente Supabase, così si testa da sola.

export interface CourseLesson {
  id: string;                 // 'guida' oppure 'l-2-1'
  kind: 'intro' | 'lesson';
  position: number;
  module_num: number | null;
  module_title: string | null;
  module_label: string | null;
  module_lead: string | null;
  lesson_num: string | null;
  title: string;
  source: string | null;
  html: string;
  plain: string;
}

export interface CourseModule {
  num: number;
  title: string;
  label: string | null;
  lead: string | null;
  lessons: CourseLesson[];
}

export const INTRO_ID = 'guida';

/** Id del compito n (da 1) di una lezione: 'l-2-1#c1'. */
export const taskId = (lessonId: string, n: number) => `${lessonId}#c${n}`;

export const isTaskId = (id: string) => id.includes('#c');

export function sortLessons(list: CourseLesson[]): CourseLesson[] {
  return [...list].sort((a, b) => a.position - b.position);
}

export function groupModules(list: CourseLesson[]): CourseModule[] {
  const mods: CourseModule[] = [];
  for (const l of sortLessons(list)) {
    if (l.kind !== 'lesson' || l.module_num == null) continue;
    let m = mods.find((x) => x.num === l.module_num);
    if (!m) {
      m = { num: l.module_num, title: l.module_title || `Modulo ${l.module_num}`, label: l.module_label, lead: l.module_lead, lessons: [] };
      mods.push(m);
    }
    m.lessons.push(l);
  }
  return mods;
}

/** Lezione precedente e successiva nell'ordine del corso (la guida è la prima). */
export function neighbours(list: CourseLesson[], id: string): { prev: CourseLesson | null; next: CourseLesson | null } {
  const ordered = sortLessons(list);
  const i = ordered.findIndex((l) => l.id === id);
  if (i < 0) return { prev: null, next: null };
  return { prev: ordered[i - 1] || null, next: ordered[i + 1] || null };
}

/** Prima lezione non ancora studiata, per "Riprendi da qui". */
export function firstUnread(list: CourseLesson[], done: Set<string>): CourseLesson | null {
  return sortLessons(list).find((l) => l.kind === 'lesson' && !done.has(l.id)) || null;
}

export function countDone(lessons: CourseLesson[], done: Set<string>): { done: number; total: number } {
  const ls = lessons.filter((l) => l.kind === 'lesson');
  return { done: ls.filter((l) => done.has(l.id)).length, total: ls.length };
}

/** Minuscole e senza accenti: "perché" trova "perche". */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export interface SearchHit { id: string; hits: number }

/** Lezioni che contengono tutte le parole cercate, con il numero di occorrenze della prima. */
export function searchLessons(list: CourseLesson[], query: string): SearchHit[] {
  const words = normalize(query).split(/\s+/).filter((w) => w.length >= 2);
  if (!words.length) return [];
  const out: SearchHit[] = [];
  for (const l of sortLessons(list)) {
    const text = normalize(`${l.title} ${l.plain}`);
    if (!words.every((w) => text.includes(w))) continue;
    out.push({ id: l.id, hits: text.split(words[0]).length - 1 });
  }
  return out;
}

/**
 * Traduce un link interno del corso (#l-4-2, #m-6, #guida, #top) nell'id
 * della lezione da aprire. null se il link non è del corso.
 */
export function resolveAnchor(list: CourseLesson[], href: string): string | null {
  if (!href.startsWith('#')) return null;
  const target = href.slice(1);
  if (target === INTRO_ID || target === 'top') return INTRO_ID;
  if (list.some((l) => l.id === target)) return target;
  const mod = /^m-(\d+)$/.exec(target);
  if (mod) {
    const first = sortLessons(list).find((l) => l.module_num === Number(mod[1]));
    return first ? first.id : null;
  }
  return null;
}
