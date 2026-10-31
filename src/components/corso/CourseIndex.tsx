import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { groupModules, countDone, searchLessons, INTRO_ID, type CourseLesson } from '@/lib/course/courseNav';

interface Props {
  lessons: CourseLesson[];
  done: Set<string>;
  currentId: string;
  query: string;
  onQuery: (q: string) => void;
  onOpen: (id: string) => void;
}

const CourseIndex: React.FC<Props> = ({ lessons, done, currentId, query, onQuery, onOpen }) => {
  const modules = useMemo(() => groupModules(lessons), [lessons]);
  const overall = countDone(lessons, done);
  const hits = useMemo(() => searchLessons(lessons, query), [lessons, query]);
  const hitMap = useMemo(() => new Map(hits.map((h) => [h.id, h.hits])), [hits]);
  const searching = query.trim().length >= 2;
  const currentModule = lessons.find((l) => l.id === currentId)?.module_num ?? null;
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const isOpen = (num: number) => searching || (open[num] ?? num === currentModule);
  const pct = overall.total ? Math.round((overall.done / overall.total) * 100) : 0;

  return (
    <nav aria-label="Indice del corso" className="text-sm">
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--ink)', opacity: 0.45 }} />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Cerca nel corso"
          aria-label="Cerca nel corso"
          className="w-full rounded-lg pl-8 pr-8 py-2 text-sm outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)' }}
        />
        {query && (
          <button onClick={() => onQuery('')} aria-label="Cancella la ricerca" className="absolute right-2 top-1/2 -translate-y-1/2 p-1">
            <X className="h-3.5 w-3.5" style={{ color: 'var(--ink)', opacity: 0.6 }} />
          </button>
        )}
      </div>
      {searching && (
        <p className="text-xs mb-2 px-1" style={{ color: 'var(--ink)', opacity: 0.65 }} aria-live="polite">
          {hits.length ? `Trovata in ${hits.length} ${hits.length === 1 ? 'lezione' : 'lezioni'}` : 'Nessuna lezione contiene queste parole'}
        </p>
      )}

      <div className="px-1 pb-3">
        <div className="flex justify-between text-xs" style={{ color: 'var(--ink)', opacity: 0.7 }}>
          <span>{overall.done} di {overall.total} lezioni studiate</span><span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: 'var(--line)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--rosa)' }} />
        </div>
      </div>

      {lessons.some((l) => l.id === INTRO_ID) && (!searching || hitMap.has(INTRO_ID)) && (
        <button
          onClick={() => onOpen(INTRO_ID)}
          className="w-full text-left px-2 py-2 rounded-lg font-semibold"
          style={{ color: 'var(--ink)', background: currentId === INTRO_ID ? 'var(--viola-dim)' : 'transparent' }}
        >
          Come usare la guida e glossario
        </button>
      )}

      {modules.map((m) => {
        const items = searching ? m.lessons.filter((l) => hitMap.has(l.id)) : m.lessons;
        if (searching && !items.length) return null;
        const c = countDone(m.lessons, done);
        const full = c.done === c.total;
        return (
          <div key={m.num} style={{ borderTop: '1px solid var(--line)' }}>
            <button
              onClick={() => setOpen((o) => ({ ...o, [m.num]: !isOpen(m.num) }))}
              aria-expanded={isOpen(m.num)}
              className="w-full grid items-baseline gap-1.5 px-2 py-2.5 text-left font-bold"
              style={{ gridTemplateColumns: '16px 26px 1fr auto', color: 'var(--ink)' }}
            >
              {isOpen(m.num) ? <ChevronDown className="h-3.5 w-3.5 self-center" /> : <ChevronRight className="h-3.5 w-3.5 self-center" />}
              <span className="text-xs font-mono" style={{ color: 'var(--rosa)' }}>{String(m.num).padStart(2, '0')}</span>
              <span>{m.title}</span>
              <span className="text-[11px] font-mono font-normal" style={{ color: full ? '#1f7346' : 'var(--ink)', opacity: full ? 1 : 0.55 }}>
                {c.done}/{c.total}
              </span>
            </button>
            {isOpen(m.num) && (
              <div className="pb-2">
                {items.map((l) => {
                  const isDone = done.has(l.id);
                  const current = l.id === currentId;
                  return (
                    <button
                      key={l.id}
                      onClick={() => onOpen(l.id)}
                      aria-current={current ? 'page' : undefined}
                      className="w-full grid gap-1 text-left rounded-md py-1.5 pr-2 pl-2 ml-3"
                      style={{
                        gridTemplateColumns: '38px 1fr auto',
                        width: 'calc(100% - 0.75rem)',
                        background: current ? 'var(--viola-dim)' : 'transparent',
                        boxShadow: current ? 'inset 2px 0 0 var(--rosa)' : 'none',
                        color: 'var(--ink)',
                      }}
                    >
                      <span className="text-[11.5px] font-mono flex items-center gap-0.5" style={{ opacity: 0.6 }}>
                        {isDone && <Check className="h-3 w-3" style={{ color: '#1f7346' }} />}{l.lesson_num}
                      </span>
                      <span style={{ opacity: isDone ? 0.6 : 1 }}>{l.title}</span>
                      {searching && <span className="text-[11px] font-mono" style={{ color: 'var(--rosa)' }}>{hitMap.get(l.id)}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default CourseIndex;
