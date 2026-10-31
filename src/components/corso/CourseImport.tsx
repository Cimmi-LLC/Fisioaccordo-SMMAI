import React, { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { parseCourse } from '@/lib/course/parseCourse';
import { replaceCourse } from '@/services/course';

interface Props {
  hasCourse: boolean;
  onImported: () => void;
}

// Importa il corso dal file HTML dell'artifact. Il testo va dal file al
// database (leggibile solo dagli admin) senza passare dal repo, che è pubblico.
// Si può rifare quando il corso cambia: sostituisce le lezioni, i progressi restano.
const CourseImport: React.FC<Props> = ({ hasCourse, onImported }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const onFile = async (file: File) => {
    setBusy(true);
    setMsg(null);
    try {
      const doc = new DOMParser().parseFromString(await file.text(), 'text/html');
      const parsed = parseCourse(doc);
      const lessons = parsed.lessons.filter((l) => l.kind === 'lesson').length;
      if (!lessons) throw new Error('Nel file non ho trovato lezioni. Scegli il file HTML del corso.');
      const saved = await replaceCourse(parsed.lessons);
      if (saved !== parsed.lessons.length) throw new Error(`Salvate ${saved} parti su ${parsed.lessons.length}: riprova.`);
      setMsg({ ok: true, text: `Importato e verificato: ${parsed.modules} moduli, ${lessons} lezioni, ${parsed.tasks} compiti.` });
      onImported();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Importazione non riuscita.' });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <p className="font-bold" style={{ color: 'var(--ink)' }}>{hasCourse ? 'Aggiorna il corso' : 'Carica il corso'}</p>
      <p className="text-sm mt-1" style={{ color: 'var(--ink)', opacity: 0.7 }}>
        Scegli il file HTML del corso. {hasCourse ? 'Sostituisce le lezioni; le tue spunte restano.' : 'Lo vedono solo gli amministratori.'}
      </p>
      <input ref={input} type="file" accept=".html,text/html" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <button onClick={() => input.current?.click()} disabled={busy}
        className="mt-3 inline-flex items-center gap-2 font-semibold px-4 py-2 rounded-lg text-white" style={{ background: 'var(--rosa)', opacity: busy ? 0.7 : 1 }}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? 'Importo…' : 'Scegli il file'}
      </button>
      {msg && <p className="text-sm mt-3" style={{ color: msg.ok ? '#1f7346' : '#ae2418' }}>{msg.text}</p>}
    </div>
  );
};

export default CourseImport;
