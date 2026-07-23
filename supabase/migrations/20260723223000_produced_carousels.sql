-- Persistenza dei caroselli prodotti (slide NB2) + progresso della
-- produzione in background via Realtime.
--
-- Una riga per run di produzione: il copy completo, l'elenco slide con
-- path storage e stato per-slide (jsonb aggiornato dalla edge function
-- man mano che le slide vengono generate).

create table public.produced_carousels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  title text not null default '',
  -- CarouselData completo (copy, caption, hashtag) per riaprire il carosello
  copy jsonb not null,
  -- [{index, role, title, body, number, illustration, path, error, status}]
  slides jsonb not null default '[]'::jsonb,
  storage_bucket text not null default 'carousel-images',
  format text not null default '1:1' check (format in ('1:1', '4:5')),
  status text not null default 'producing'
    check (status in ('producing', 'ready', 'partial', 'failed')),
  ok_count integer not null default 0,
  total integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index produced_carousels_brand_idx
  on public.produced_carousels (brand_id, created_at desc);
create index produced_carousels_user_idx
  on public.produced_carousels (user_id, created_at desc);

alter table public.produced_carousels enable row level security;

create policy "produced_carousels_select_own"
  on public.produced_carousels for select
  using (auth.uid() = user_id or public.is_admin());

create policy "produced_carousels_insert_own"
  on public.produced_carousels for insert
  with check (auth.uid() = user_id or public.is_admin());

create policy "produced_carousels_update_own"
  on public.produced_carousels for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "produced_carousels_delete_own"
  on public.produced_carousels for delete
  using (auth.uid() = user_id or public.is_admin());

-- Progresso live della produzione in background
alter publication supabase_realtime add table public.produced_carousels;
