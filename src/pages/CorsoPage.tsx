import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, List, Loader2, Settings2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { useToast } from '@/hooks/use-toast';
import { listLessons, listProgress, setProgress } from '@/services/course';
import { neighbours, firstUnread, resolveAnchor, INTRO_ID, type CourseLesson } from '@/lib/course/courseNav';
import CourseIndex from '@/components/corso/CourseIndex';
import LessonContent from '@/components/corso/LessonContent';
import AdvicePanel from '@/components/corso/AdvicePanel';
import CourseImport from '@/components/corso/CourseImport';
import '@/components/corso/corso.css';

const CorsoPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const { brands, activeBrandId } = useActiveBrand();
  const { toast } = useToast();

  const [lessons, setLessons] = useState<CourseLesson[] | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [indexOpen, setIndexOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoadError(null);
    try {
      const [ls, pr] = await Promise.all([listLessons(), listProgress(user.id)]);
      setLessons(ls);
      setDone(pr);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Errore di caricamento');
      setLessons([]);
    }
  }, [user]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  // /corso senza lezione: si riparte dalla prima non studiata (o dalla guida).
  useEffect(() => {
    if (!lessons?.length || lessonId) return;
    const next = done.size ? firstUnread(lessons, done) : null;
    navigate(`/corso/${next ? next.id : INTRO_ID}`, { replace: true });
  }, [lessons, lessonId, done, navigate]);

  const lesson = useMemo(() => lessons?.find((l) => l.id === lessonId) || null, [lessons, lessonId]);
  const { prev, next } = useMemo(() => (lessons && lessonId ? neighbours(lessons, lessonId) : { prev: null, next: null }), [lessons, lessonId]);

  useEffect(() => { window.scrollTo({ top: 0 }); setIndexOpen(false); }, [lessonId]);

  const open = (id: string) => navigate(`/corso/${id}`);

  const toggle = async (itemId: string) => {
    if (!user) return;
    const on = !done.has(itemId);
    setDone((d) => { const n = new Set(d); if (on) n.add(itemId); else n.delete(itemId); return n; });
    try {
      await setProgress(user.id, itemId, on);
    } catch {
      setDone((d) => { const n = new Set(d); if (on) n.delete(itemId); else n.add(itemId); return n; });
      toast({ title: 'Spunta non salvata', description: 'Il server non ha risposto: riprova.', variant: 'destructive' });
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto p-6 pt-16 text-center">
        <h1 className="text-2xl font-black" style={{ color: 'var(--ink)' }}>Corso per andare virali</h1>
        <p className="mt-3" style={{ color: 'var(--ink)', opacity: 0.7 }}>Questa sezione è riservata agli amministratori.</p>
      </div>
    );
  }

  if (!lessons) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--viola)' }} /></div>;
  }

  if (!lessons.length) {
    return (
      <div className="max-w-xl mx-auto p-6 pt-12 space-y-4">
        <h1 className="text-2xl font-black" style={{ color: 'var(--ink)' }}>Corso per andare virali</h1>
        {loadError && <p className="text-sm" style={{ color: '#ae2418' }}>Non riesco a leggere il corso: {loadError}</p>}
        <CourseImport hasCourse={false} onImported={load} />
      </div>
    );
  }

  const lessonDone = lesson ? done.has(lesson.id) : false;

  return (
    <div className="corso max-w-7xl mx-auto px-4 md:px-6 pb-24">
      <header className="flex flex-wrap items-center gap-3 justify-between pt-6 pb-4 pl-12 md:pl-0">
        <h1 className="text-2xl font-black" style={{ color: 'var(--ink)', letterSpacing: '-0.5px' }}>Corso per andare virali</h1>
        <div className="flex gap-2">
          <button onClick={() => setIndexOpen((v) => !v)} className="lg:hidden inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg"
            style={{ border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }} aria-expanded={indexOpen}>
            <List className="h-4 w-4" /> Indice
          </button>
          <button onClick={() => setShowImport((v) => !v)} className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg"
            style={{ border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }} title="Aggiorna il testo del corso">
            <Settings2 className="h-4 w-4" /> <span className="hidden sm:inline">Aggiorna corso</span>
          </button>
        </div>
      </header>

      {showImport && <div className="mb-6"><CourseImport hasCourse onImported={() => { setShowImport(false); load(); }} /></div>}

      <div className="lg:grid gap-8" style={{ gridTemplateColumns: '300px minmax(0, 1fr)' }}>
        <aside className={`${indexOpen ? 'block' : 'hidden'} lg:block mb-6 lg:mb-0`}>
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-auto rounded-2xl p-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', overscrollBehavior: 'contain' }}>
            <CourseIndex lessons={lessons} done={done} currentId={lessonId || ''} query={query} onQuery={setQuery} onOpen={open} />
          </div>
        </aside>

        <main className="min-w-0">
          {!lesson ? (
            <p style={{ color: 'var(--ink)' }}>Lezione non trovata. Sceglila dall'indice.</p>
          ) : (
            <article className="max-w-3xl">
              <div className="pb-4 mb-5" style={{ borderBottom: '1px solid var(--line)' }}>
                {lesson.kind === 'lesson' && (
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--rosa)' }}>
                    Modulo {String(lesson.module_num).padStart(2, '0')} · {lesson.module_title} · Lezione {lesson.lesson_num}
                  </p>
                )}
                <h2 className="text-2xl md:text-3xl font-black mt-1.5" style={{ color: 'var(--ink)', letterSpacing: '-0.5px', lineHeight: 1.15 }}>{lesson.title}</h2>
                {lesson.source && <p className="text-xs mt-1.5 font-mono" style={{ color: 'var(--ink)', opacity: 0.5 }}>Fonte: {lesson.source}</p>}
                {lesson.kind === 'lesson' && (
                  <DoneButton done={lessonDone} onClick={() => toggle(lesson.id)} />
                )}
              </div>

              <LessonContent
                key={`${lesson.id}|${query}`}
                lessonId={lesson.id}
                html={lesson.html}
                done={done}
                highlight={query}
                onToggleTask={toggle}
                onAnchor={(href) => { const id = resolveAnchor(lessons, href); if (id) open(id); }}
              />

              <nav className="mt-12 pt-6 flex flex-col sm:flex-row gap-3 justify-between" style={{ borderTop: '1px solid var(--line)' }} aria-label="Lezione precedente e successiva">
                {prev ? (
                  <button onClick={() => open(prev.id)} className="text-left rounded-xl px-4 py-3 sm:max-w-[48%]" style={{ border: '1px solid var(--line)', background: 'var(--surface)' }}>
                    <span className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--viola)' }}><ArrowLeft className="h-3.5 w-3.5" /> Indietro</span>
                    <span className="block text-sm font-semibold mt-0.5" style={{ color: 'var(--ink)' }}>{prev.lesson_num ? `${prev.lesson_num} · ` : ''}{prev.title}</span>
                  </button>
                ) : <span />}
                {next && (
                  <button
                    onClick={() => { if (lesson.kind === 'lesson' && !lessonDone) toggle(lesson.id); open(next.id); }}
                    className="text-right rounded-xl px-4 py-3 sm:max-w-[48%] sm:ml-auto text-white"
                    style={{ background: 'var(--rosa)' }}
                  >
                    <span className="text-xs font-bold flex items-center justify-end gap-1">
                      {lesson.kind === 'lesson' && !lessonDone ? 'Studiata, avanti' : 'Avanti'} <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                    <span className="block text-sm font-semibold mt-0.5">{next.lesson_num ? `${next.lesson_num} · ` : ''}{next.title}</span>
                  </button>
                )}
              </nav>

              {lesson.kind === 'lesson' && user && (
                <AdvicePanel userId={user.id} lessonId={lesson.id} lessonTitle={lesson.title} brands={brands} activeBrandId={activeBrandId} />
              )}
            </article>
          )}
        </main>
      </div>
    </div>
  );
};

const DoneButton: React.FC<{ done: boolean; onClick: () => void }> = ({ done, onClick }) => (
  <button
    onClick={onClick}
    aria-pressed={done}
    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold rounded-full py-1.5 pl-2 pr-3.5"
    style={{
      border: `1px solid ${done ? '#c2e0ce' : 'var(--line)'}`,
      background: done ? '#edf6f1' : 'var(--surface)',
      color: done ? '#1f7346' : 'var(--ink)',
    }}
  >
    <span className="inline-grid place-items-center h-4 w-4 rounded" style={{ border: `1.5px solid ${done ? '#1f7346' : 'var(--ink)'}`, background: done ? '#1f7346' : 'transparent' }}>
      {done && <Check className="h-3 w-3 text-white" />}
    </span>
    {done ? 'Studiata' : 'Segna come studiata'}
  </button>
);

export default CorsoPage;
