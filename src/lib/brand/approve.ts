// Approvazione e lock del template.
//
// Client-side sotto RLS: l'utente e autorizzato a tutte le operazioni
// (folder-owner sullo storage, owner sulle tabelle). Il SupabaseClient
// viene iniettato per tenere questo modulo libero da import applicativi
// (il gate strict di tsconfig.genesis resta pulito).

import type { SupabaseClient } from '@supabase/supabase-js';
import { skeletonFromGenome } from './skeleton.ts';
import { validateGenome, type TemplateGenome } from './genome.ts';
import type { SlideRole } from './archetypes.ts';

type CandidateRow = {
  id: string;
  brand_id: string;
  user_id: string;
  slide_role: SlideRole;
  genome: unknown;
  storage_bucket: string | null;
  storage_path: string | null;
  status: string;
};

/**
 * Approva un candidato:
 * 1. copia il file da candidates/ a variants/ (fuori dal prefisso purgabile)
 * 2. upsert su template_variants con genoma congelato + prompt_skeleton
 * 3. candidato approved, fratelli dello stesso ruolo rejected
 * 4. se tutti e 3 i ruoli hanno un approvato: brands.genesis_status = 'locked'
 */
export async function approveTemplate(
  supabase: SupabaseClient,
  candidateId: string
): Promise<void> {
  const { data: cand, error: candErr } = await supabase
    .from('template_candidates')
    .select('id, brand_id, user_id, slide_role, genome, storage_bucket, storage_path, status')
    .eq('id', candidateId)
    .single<CandidateRow>();
  if (candErr || !cand) throw new Error('Candidato non trovato: ' + (candErr?.message || candidateId));
  if (cand.status !== 'done' && cand.status !== 'approved') {
    throw new Error('Il candidato non e in stato approvabile (stato: ' + cand.status + ')');
  }
  if (!cand.storage_bucket || !cand.storage_path) {
    throw new Error('Il candidato non ha un file generato');
  }

  const check = validateGenome(cand.genome);
  if (!check.ok) throw new Error('Genoma del candidato non valido: ' + check.errors.join('; '));
  const genome = cand.genome as TemplateGenome;

  // 1. copia storage: candidates/... -> variants/<role>.png
  const variantPath = `${cand.user_id}/${cand.brand_id}/variants/${cand.slide_role}.png`;
  // rimuovi eventuale versione precedente (ri-approvazione dopo regenerate)
  await supabase.storage.from(cand.storage_bucket).remove([variantPath]);
  const { error: copyErr } = await supabase.storage
    .from(cand.storage_bucket)
    .copy(cand.storage_path, variantPath);
  if (copyErr) throw new Error('Copia storage fallita: ' + copyErr.message);

  // 2. upsert template_variants (INSERT-only per RLS: elimina via candidato
  //    non e possibile, quindi upsert con on_conflict gestito dal DB).
  const { error: insErr } = await supabase.from('template_variants').insert({
    brand_id: cand.brand_id,
    user_id: cand.user_id,
    slide_role: cand.slide_role,
    archetype: genome.archetype,
    genome,
    storage_bucket: cand.storage_bucket,
    storage_path: variantPath,
    prompt_skeleton: skeletonFromGenome(genome, cand.slide_role),
    source_candidate_id: cand.id,
  });
  if (insErr) {
    // UNIQUE(brand_id, slide_role): la variante esiste gia. E immutabile per
    // gli utenti (nessuna policy UPDATE/DELETE): segnala chiaramente.
    if (insErr.code === '23505') {
      throw new Error(
        'Esiste gia un template approvato per il ruolo ' + cand.slide_role +
        '. Il template e immutabile: contatta l\'amministratore per sbloccarlo.'
      );
    }
    throw new Error('Salvataggio variante fallito: ' + insErr.message);
  }

  // 3. stati: approvato + fratelli rifiutati
  await supabase
    .from('template_candidates')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', cand.id);
  await supabase
    .from('template_candidates')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('brand_id', cand.brand_id)
    .eq('slide_role', cand.slide_role)
    .neq('id', cand.id)
    .in('status', ['done', 'pending', 'generating']);

  // 4. lock quando tutti e 3 i ruoli sono coperti
  const { data: variants } = await supabase
    .from('template_variants')
    .select('slide_role')
    .eq('brand_id', cand.brand_id);
  const roles = new Set(((variants || []) as Array<{ slide_role: string }>).map((v) => v.slide_role));
  if (roles.has('cover') && roles.has('content') && roles.has('cta')) {
    await supabase
      .from('brands')
      .update({ genesis_status: 'locked' })
      .eq('id', cand.brand_id);
  }
}
