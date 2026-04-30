-- WeSocializeU Supabase schema.
-- Run this once in the Supabase SQL editor before switching production traffic.
-- Public form inserts and public content reads are allowed through RLS.
-- Admin dashboard CRUD should use SUPABASE_SERVICE_ROLE_KEY on the server.

create table if not exists public.leads (
  id bigserial primary key,
  name text not null,
  email text not null,
  phone text,
  service text,
  message text,
  status text not null default 'new',
  company text default '',
  website text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  id bigserial primary key,
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ugc_videos (
  id bigserial primary key,
  badge text,
  thumbnail_url text,
  video_url text,
  title text not null,
  category text default 'UGC',
  likes_count integer default 0,
  comments_count integer default 0,
  visit_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.creators (
  id bigserial primary key,
  name text not null,
  category text not null default 'Top Creators',
  platform text not null default 'Instagram',
  followers text,
  image_url text,
  profile_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_categories (
  id bigserial primary key,
  name text not null unique
);

create table if not exists public.creator_platforms (
  id bigserial primary key,
  name text not null unique
);

create table if not exists public.creator_leads (
  id bigserial primary key,
  name text not null,
  email text not null,
  phone text,
  dob text,
  gender text,
  pincode text,
  category text,
  language text,
  has_instagram text,
  has_youtube text,
  instagram_url text default '',
  youtube_url text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.blogs (
  id bigserial primary key,
  title text not null,
  image_url text,
  excerpt text default '',
  body text default '',
  link_url text,
  date_text text,
  is_featured integer default 0,
  order_idx integer default 99,
  created_at timestamptz not null default now()
);

create table if not exists public.case_studies (
  id bigserial primary key,
  title text not null,
  image_url text,
  link_url text,
  excerpt text default '',
  body text default '',
  is_wide integer default 0,
  order_idx integer default 99,
  created_at timestamptz not null default now()
);

create table if not exists public.service_pages (
  id bigserial primary key,
  slug text not null unique,
  title text not null,
  icon text,
  hero_title text not null,
  hero_subheading text,
  hero_gallery_images text default '[]',
  how_image_url text default '',
  what_heading text default '',
  how_heading text default '',
  how_subtitle text default '',
  diff_heading text default '',
  diff_subtitle text default '',
  use_cases_subtitle text default '',
  faq_subtitle text default '',
  cta_subtitle text default '',
  what_we_do text default '',
  how_we_do_it text default '',
  how_steps_json text default '[]',
  what_makes_us_different text default '',
  use_cases_title text default '',
  use_cases text default '',
  cta text default '',
  sort_order integer default 99,
  is_active integer default 1,
  is_customized integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists creator_leads_created_at_idx on public.creator_leads (created_at desc);
create index if not exists ugc_videos_id_idx on public.ugc_videos (id desc);
create index if not exists creators_id_idx on public.creators (id desc);
create index if not exists blogs_order_idx_idx on public.blogs (order_idx asc, id desc);
create index if not exists case_studies_order_idx_idx on public.case_studies (order_idx asc, id desc);
create index if not exists service_pages_sort_order_idx on public.service_pages (sort_order asc, id asc);

alter table public.leads enable row level security;
alter table public.admins enable row level security;
alter table public.ugc_videos enable row level security;
alter table public.creators enable row level security;
alter table public.creator_categories enable row level security;
alter table public.creator_platforms enable row level security;
alter table public.creator_leads enable row level security;
alter table public.blogs enable row level security;
alter table public.case_studies enable row level security;
alter table public.service_pages enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

drop policy if exists "public leads insert" on public.leads;
create policy "public leads insert"
on public.leads for insert to anon
with check (true);

drop policy if exists "public creator leads insert" on public.creator_leads;
create policy "public creator leads insert"
on public.creator_leads for insert to anon
with check (true);

drop policy if exists "public videos select" on public.ugc_videos;
create policy "public videos select"
on public.ugc_videos for select to anon
using (true);

drop policy if exists "public creators select" on public.creators;
create policy "public creators select"
on public.creators for select to anon
using (true);

drop policy if exists "public blogs select" on public.blogs;
create policy "public blogs select"
on public.blogs for select to anon
using (true);

drop policy if exists "public case studies select" on public.case_studies;
create policy "public case studies select"
on public.case_studies for select to anon
using (true);

drop policy if exists "public active service pages select" on public.service_pages;
create policy "public active service pages select"
on public.service_pages for select to anon
using (is_active = 1);
