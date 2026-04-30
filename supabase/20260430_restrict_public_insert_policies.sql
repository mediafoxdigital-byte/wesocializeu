-- Tighten public insert RLS policies for existing Supabase projects.
-- Run this in the Supabase SQL editor if schema.sql was already applied.

drop policy if exists "public leads insert" on public.leads;
create policy "public leads insert"
on public.leads for insert to anon
with check (
  status = 'new'
  and created_at >= now() - interval '5 minutes'
  and created_at <= now() + interval '5 minutes'
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
  and char_length(coalesce(message, '')) <= 2000
  and char_length(coalesce(company, '')) <= 160
  and (
    coalesce(website, '') = ''
    or (
      char_length(website) <= 500
      and website ~* '^https?://[^[:space:]@/]+[.][^[:space:]]+$'
    )
  )
);

drop policy if exists "public creator leads insert" on public.creator_leads;
create policy "public creator leads insert"
on public.creator_leads for insert to anon
with check (
  created_at >= now() - interval '5 minutes'
  and created_at <= now() + interval '5 minutes'
  and name is not null
  and char_length(btrim(name)) between 2 and 120
  and email is not null
  and char_length(email) <= 254
  and email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]{2,}$'
  and phone is not null
  and phone ~ '^[+]?[0-9]{10,15}$'
  and char_length(coalesce(dob, '')) <= 30
  and char_length(coalesce(gender, '')) <= 30
  and char_length(coalesce(pincode, '')) <= 20
  and category is not null
  and char_length(btrim(category)) between 2 and 80
  and char_length(coalesce(language, '')) <= 80
  and has_instagram in ('Yes', 'No')
  and has_youtube in ('Yes', 'No')
  and (
    has_instagram = 'Yes'
    or has_youtube = 'Yes'
  )
  and (
    (
      has_instagram = 'Yes'
      and char_length(coalesce(instagram_url, '')) <= 500
      and instagram_url ~* '^https?://([^/?#@]+[.])?instagram[.]com([/:?#].*)?$'
    )
    or (
      has_instagram = 'No'
      and coalesce(instagram_url, '') = ''
    )
  )
  and (
    (
      has_youtube = 'Yes'
      and char_length(coalesce(youtube_url, '')) <= 500
      and youtube_url ~* '^https?://([^/?#@]+[.])?(youtube[.]com|youtu[.]be)([/:?#].*)?$'
    )
    or (
      has_youtube = 'No'
      and coalesce(youtube_url, '') = ''
    )
  )
);
