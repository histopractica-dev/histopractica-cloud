-- HistoPráctica: fotos de perfil visibles en el ranking.
-- Ejecuta este archivo una sola vez (es idempotente) en Supabase > SQL Editor.
-- Las fotos son públicas para que otros estudiantes puedan verlas en el ranking;
-- cada usuario solo puede subir, cambiar o borrar su propia foto.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 8388608, array['image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.profile_avatars (
  user_id uuid primary key references auth.users(id) on delete cascade,
  alias text not null default 'Estudiante',
  avatar_url text not null,
  updated_at timestamptz not null default now()
);

alter table public.profile_avatars enable row level security;
grant select, insert, update, delete on public.profile_avatars to authenticated;

drop policy if exists profile_avatars_read_authenticated on public.profile_avatars;
create policy profile_avatars_read_authenticated
  on public.profile_avatars for select to authenticated
  using (true);

drop policy if exists profile_avatars_insert_own on public.profile_avatars;
create policy profile_avatars_insert_own
  on public.profile_avatars for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists profile_avatars_update_own on public.profile_avatars;
create policy profile_avatars_update_own
  on public.profile_avatars for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists profile_avatars_delete_own on public.profile_avatars;
create policy profile_avatars_delete_own
  on public.profile_avatars for delete to authenticated
  using (user_id = (select auth.uid()));

-- Lectura pública de los archivos de avatar, necesaria para los enlaces públicos.
drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read
  on storage.objects for select to public
  using (bucket_id = 'avatars');

-- Cada cuenta solo puede operar sobre archivos dentro de su carpeta UUID.
drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Importa fotos que ya estuvieran guardadas en los metadatos de Supabase Auth.
-- No se copian correos ni otros datos privados.
insert into public.profile_avatars (user_id, alias, avatar_url, updated_at)
select
  u.id,
  coalesce(
    nullif(trim(p.display_name), ''),
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Estudiante'
  ),
  u.raw_user_meta_data ->> 'avatar_url',
  now()
from auth.users as u
left join public.profiles as p on p.id = u.id
where (u.raw_user_meta_data ->> 'avatar_url') ~* '^https://'
on conflict (user_id) do update
set alias = excluded.alias,
    avatar_url = excluded.avatar_url,
    updated_at = now();
