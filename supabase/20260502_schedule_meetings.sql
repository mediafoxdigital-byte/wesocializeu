-- Add scheduled-meeting submissions for the homepage form.
-- Run this once in the Supabase SQL editor for existing projects.

begin;

create table if not exists public.schedule_meetings (
  id bigserial primary key,
  audience_type text not null,
  name text not null,
  email text not null,
  phone text,
  service text,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists schedule_meetings_created_at_idx
on public.schedule_meetings (created_at desc);

alter table public.schedule_meetings enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on public.schedule_meetings to anon, authenticated;
grant select, update, delete on public.schedule_meetings to authenticated;
grant usage, select on sequence public.schedule_meetings_id_seq to anon, authenticated;

drop policy if exists "public schedule meetings insert" on public.schedule_meetings;
create policy "public schedule meetings insert"
on public.schedule_meetings for insert to anon
with check (
  status = 'new'
  and created_at >= now() - interval '5 minutes'
  and created_at <= now() + interval '5 minutes'
  and audience_type in ('creator', 'brand')
  and name is not null
  and char_length(btrim(name)) between 2 and 120
  and email is not null
  and char_length(email) <= 254
  and email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]{2,}$'
  and (
    phone is null
    or phone = ''
    or phone ~ '^[+]?[0-9]{10,15}$'
  )
  and char_length(coalesce(service, '')) <= 200
  and char_length(coalesce(message, '')) <= 1000
);

commit;
