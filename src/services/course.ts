// Accesso al database per il "Corso per andare virali".
// Le tabelle course_* non sono ancora nei tipi generati: si passa da `any`.

import { supabase } from '@/integrations/supabase/client';
import type { CourseLesson } from '@/lib/course/courseNav';

const db = supabase as any;

export async function listLessons(): Promise<CourseLesson[]> {
  const { data, error } = await db.from('course_lessons').select('*').order('position', { ascending: true });
  if (error) throw error;
  return (data || []) as CourseLesson[];
}

/** Sostituisce tutto il corso con quello importato. Ritorna quante righe risultano poi nel database. */
export async function replaceCourse(lessons: CourseLesson[]): Promise<number> {
  const ids = lessons.map((l) => l.id);
  for (let i = 0; i < lessons.length; i += 8) {
    const batch = lessons.slice(i, i + 8).map((l) => ({ ...l, imported_at: new Date().toISOString() }));
    const { error } = await db.from('course_lessons').upsert(batch, { onConflict: 'id' });
    if (error) throw error;
  }
  // Via le lezioni che non esistono più nel file nuovo.
  const { data: existing, error: listErr } = await db.from('course_lessons').select('id');
  if (listErr) throw listErr;
  const stale = (existing || []).map((r: { id: string }) => r.id).filter((id: string) => !ids.includes(id));
  if (stale.length) {
    const { error } = await db.from('course_lessons').delete().in('id', stale);
    if (error) throw error;
  }
  const { count, error: countErr } = await db.from('course_lessons').select('id', { count: 'exact', head: true });
  if (countErr) throw countErr;
  return count ?? 0;
}

export async function listProgress(userId: string): Promise<Set<string>> {
  const { data, error } = await db.from('course_progress').select('item_id').eq('user_id', userId);
  if (error) throw error;
  return new Set((data || []).map((r: { item_id: string }) => r.item_id));
}

export async function setProgress(userId: string, itemId: string, done: boolean): Promise<void> {
  const q = done
    ? db.from('course_progress').upsert({ user_id: userId, item_id: itemId }, { onConflict: 'user_id,item_id' })
    : db.from('course_progress').delete().eq('user_id', userId).eq('item_id', itemId);
  const { error } = await q;
  if (error) throw error;
}

export interface AdviceItem { titolo: string; cosa_fare: string; perche: string }
export interface AdviceResult {
  id?: string;
  advice: { consigli: AdviceItem[]; nota_dati?: string };
  stats: Record<string, unknown> | null;
  created_at: string;
}

export async function latestAdvice(userId: string, brandId: string, lessonId: string): Promise<AdviceResult | null> {
  const { data, error } = await db
    .from('course_advice')
    .select('id, advice, stats, created_at')
    .eq('user_id', userId).eq('brand_id', brandId).eq('lesson_id', lessonId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as AdviceResult | null;
}

export async function generateAdvice(brandId: string, lessonId: string): Promise<AdviceResult> {
  const { data, error } = await supabase.functions.invoke('course-advice', { body: { brandId, lessonId } });
  if (error) {
    let msg = error.message;
    try { msg = (await (error as any).context?.json())?.error || msg; } catch { /* corpo non JSON */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as AdviceResult;
}
