import { describe, it, expect } from 'vitest';
import {
  groupModules, neighbours, firstUnread, countDone, searchLessons, resolveAnchor, normalize, taskId, isTaskId,
  type CourseLesson,
} from '../../course/courseNav.ts';

const L = (id: string, position: number, module_num: number | null, title: string, plain = ''): CourseLesson => ({
  id, kind: id === 'guida' ? 'intro' : 'lesson', position, module_num,
  module_title: module_num ? `Modulo ${module_num}` : null, module_label: null, module_lead: null,
  lesson_num: null, title, source: null, html: '', plain,
});

const course = [
  L('l-3-1', 4, 3, 'Algoritmo', 'come funziona l\'algoritmo'),
  L('guida', 0, null, 'Come usare la guida'),
  L('l-2-1', 1, 2, 'Panoramica', 'i 5 blocchi'),
  L('l-2-2', 2, 2, 'Competitor', 'perché i competitor contano, competitor e ancora competitor'),
  L('l-2-3', 3, 2, 'Sandcastles', 'ricerca'),
];

describe('courseNav', () => {
  it('raggruppa i moduli in ordine, senza la guida', () => {
    const mods = groupModules(course);
    expect(mods.map((m) => m.num)).toEqual([2, 3]);
    expect(mods[0].lessons.map((l) => l.id)).toEqual(['l-2-1', 'l-2-2', 'l-2-3']);
  });

  it('avanti e indietro seguono la posizione, anche tra moduli', () => {
    expect(neighbours(course, 'guida')).toMatchObject({ prev: null, next: { id: 'l-2-1' } });
    expect(neighbours(course, 'l-2-3')).toMatchObject({ prev: { id: 'l-2-2' }, next: { id: 'l-3-1' } });
    expect(neighbours(course, 'l-3-1').next).toBeNull();
  });

  it('conta le lezioni studiate e trova la prima da fare', () => {
    const done = new Set(['l-2-1', 'l-2-2', 'l-2-1#c1']);
    expect(countDone(course, done)).toEqual({ done: 2, total: 4 });
    expect(firstUnread(course, done)?.id).toBe('l-2-3');
  });

  it('la ricerca ignora maiuscole e accenti e richiede tutte le parole', () => {
    expect(normalize('Perché È')).toBe('perche e');
    const hits = searchLessons(course, 'perche competitor');
    expect(hits).toEqual([{ id: 'l-2-2', hits: 1 }]);
    expect(searchLessons(course, 'COMPETITOR')[0]).toEqual({ id: 'l-2-2', hits: 4 });
    expect(searchLessons(course, 'x')).toEqual([]);
  });

  it('traduce i link interni del corso', () => {
    expect(resolveAnchor(course, '#l-2-2')).toBe('l-2-2');
    expect(resolveAnchor(course, '#m-3')).toBe('l-3-1');
    expect(resolveAnchor(course, '#guida')).toBe('guida');
    expect(resolveAnchor(course, '#top')).toBe('guida');
    expect(resolveAnchor(course, '#m-99')).toBeNull();
    expect(resolveAnchor(course, 'https://example.com')).toBeNull();
  });

  it('gli id dei compiti si distinguono da quelli delle lezioni', () => {
    expect(taskId('l-2-6', 2)).toBe('l-2-6#c2');
    expect(isTaskId('l-2-6#c2')).toBe(true);
    expect(isTaskId('l-2-6')).toBe(false);
  });
});
