// Legge il file HTML del corso (l'artifact "Short Form Academy in italiano")
// e lo trasforma nelle righe di course_lessons. Gira nel browser, al momento
// dell'importazione: il testo passa dal file dell'admin al database senza
// finire nel repo, che è pubblico.

import type { CourseLesson } from './courseNav';
import { INTRO_ID } from './courseNav';

const DROP_TAGS = 'script, style, iframe, object, embed, link, meta, form, input, button';

/** Toglie tutto ciò che può eseguire codice: tag attivi, attributi on*, link javascript:. */
export function sanitizeFragment(root: Element): void {
  root.querySelectorAll(DROP_TAGS).forEach((el) => el.remove());
  root.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      else if ((name === 'href' || name === 'src') && value.startsWith('javascript:')) el.removeAttribute(attr.name);
    }
  });
}

const text = (el: Element | null | undefined) => (el?.textContent || '').replace(/\s+/g, ' ').trim();

function cleanHtml(el: Element): { html: string; plain: string } {
  const copy = el.cloneNode(true) as Element;
  sanitizeFragment(copy);
  return { html: copy.innerHTML.trim(), plain: text(copy) };
}

export interface ParsedCourse {
  lessons: CourseLesson[];
  modules: number;
  tasks: number;
}

export function parseCourse(doc: Document): ParsedCourse {
  const lessons: CourseLesson[] = [];
  let position = 0;

  const intro = doc.querySelector('section#guida');
  if (intro) {
    const hero = doc.querySelector('header.hero');
    const wrapper = doc.createElement('div');
    if (hero) wrapper.appendChild(hero.cloneNode(true));
    wrapper.appendChild(intro.cloneNode(true));
    const { html, plain } = cleanHtml(wrapper);
    lessons.push({
      id: INTRO_ID, kind: 'intro', position: position++, module_num: null, module_title: null,
      module_label: null, module_lead: null, lesson_num: null, title: 'Come usare la guida e glossario',
      source: null, html, plain,
    });
  }

  const modules = Array.from(doc.querySelectorAll('section.module'));
  let tasks = 0;
  for (const mod of modules) {
    const num = Number((/^m-(\d+)$/.exec(mod.id) || [])[1]);
    if (!num) continue;
    const kicker = mod.querySelector('.mod-kicker');
    const moduleTitle = text(mod.querySelector('.mod-head h2')) || `Modulo ${num}`;
    const moduleLabel = text(kicker?.querySelector('span')) || null;
    const moduleLead = text(mod.querySelector('.mod-head .lead')) || null;

    for (const art of Array.from(mod.querySelectorAll('article.lesson'))) {
      const body = art.querySelector('.lesson-body');
      if (!art.id || !body) continue;
      const { html, plain } = cleanHtml(body);
      tasks += body.querySelectorAll('.hw').length;
      lessons.push({
        id: art.id,
        kind: 'lesson',
        position: position++,
        module_num: num,
        module_title: moduleTitle,
        module_label: moduleLabel,
        module_lead: moduleLead,
        lesson_num: text(art.querySelector('.lesson-kicker')).replace(/^Lezione\s*/i, '') || null,
        title: text(art.querySelector('h3')) || art.id,
        source: text(art.querySelector('.lesson-src')).replace(/^Fonte:\s*/i, '') || null,
        html,
        plain,
      });
    }
  }

  return { lessons, modules: modules.length, tasks };
}
