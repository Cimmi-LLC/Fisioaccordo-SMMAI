import React, { useEffect, useRef } from 'react';
import { normalize, taskId } from '@/lib/course/courseNav';

interface Props {
  lessonId: string;
  html: string;
  done: Set<string>;
  highlight: string;
  onToggleTask: (id: string) => void;
  onAnchor: (href: string) => void;
}

// Il testo arriva da course_lessons (scritto solo dall'admin e già ripulito
// all'importazione). Qui si aggiungono i comandi che nell'artifact faceva lo
// script: "Copia" sui prompt e la spunta "Fatto" su ogni compito.
const LessonContent: React.FC<Props> = ({ lessonId, html, done, highlight, onToggleTask, onAnchor }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Comandi aggiunti una volta per lezione (e per ricerca, che rimonta il componente).
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    root.querySelectorAll('pre.prompt').forEach((pre) => {
      if (pre.parentElement?.classList.contains('prompt-wrap')) return;
      const wrap = document.createElement('div');
      wrap.className = 'prompt-wrap';
      pre.replaceWith(wrap);
      const label = document.createElement('span');
      label.className = 'prompt-label';
      label.textContent = 'Prompt';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.textContent = 'Copia';
      wrap.append(label, btn, pre);
    });

    root.querySelectorAll('.hw').forEach((box, i) => {
      if (box.querySelector('.hw-done')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hw-done';
      btn.dataset.task = taskId(lessonId, i + 1);
      btn.innerHTML = '<span class="box" aria-hidden="true"></span><span class="lbl">Segna come fatto</span>';
      box.appendChild(btn);
    });

    if (highlight.trim()) markWords(root, highlight);
  }, [lessonId, html, highlight]);

  // Stato delle spunte, ogni volta che cambiano i progressi.
  useEffect(() => {
    ref.current?.querySelectorAll<HTMLButtonElement>('.hw-done').forEach((btn) => {
      const on = done.has(btn.dataset.task || '');
      btn.setAttribute('aria-pressed', String(on));
      const lbl = btn.querySelector('.lbl');
      if (lbl) lbl.textContent = on ? 'Fatto' : 'Segna come fatto';
    });
  }, [done, html, highlight]);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const copy = target.closest('.copy-btn') as HTMLButtonElement | null;
    if (copy) {
      const pre = copy.parentElement?.querySelector('pre');
      if (pre) {
        navigator.clipboard?.writeText(pre.textContent || '').then(() => {
          copy.textContent = 'Copiato';
          setTimeout(() => { copy.textContent = 'Copia'; }, 1500);
        });
      }
      return;
    }
    const task = target.closest('.hw-done') as HTMLButtonElement | null;
    if (task?.dataset.task) {
      onToggleTask(task.dataset.task);
      return;
    }
    const link = target.closest('a') as HTMLAnchorElement | null;
    const href = link?.getAttribute('href') || '';
    if (link && href.startsWith('#')) {
      e.preventDefault();
      onAnchor(href);
    } else if (link && /^https?:/i.test(href)) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  };

  return <div ref={ref} className="lesson-body" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
};

/** Evidenzia le parole cercate (senza badare ad accenti e maiuscole) e porta la prima in vista. */
function markWords(root: HTMLElement, query: string) {
  const words = normalize(query).split(/\s+/).filter((w) => w.length >= 2);
  if (!words.length) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  let first: HTMLElement | null = null;
  for (const node of nodes) {
    const raw = node.data;
    const norm = normalize(raw);
    // normalize() toglie solo i segni diacritici: per l'italiano la lunghezza resta uguale.
    if (norm.length !== raw.length) continue;
    const ranges: [number, number][] = [];
    for (const w of words) {
      let i = norm.indexOf(w);
      while (i >= 0) { ranges.push([i, i + w.length]); i = norm.indexOf(w, i + w.length); }
    }
    if (!ranges.length) continue;
    ranges.sort((a, b) => a[0] - b[0]);
    const frag = document.createDocumentFragment();
    let pos = 0;
    for (const [s, e] of ranges) {
      if (s < pos) continue;
      frag.append(raw.slice(pos, s));
      const m = document.createElement('mark');
      m.textContent = raw.slice(s, e);
      if (!first) first = m;
      frag.append(m);
      pos = e;
    }
    frag.append(raw.slice(pos));
    node.replaceWith(frag);
  }
  first?.scrollIntoView({ block: 'center' });
}

export default LessonContent;
