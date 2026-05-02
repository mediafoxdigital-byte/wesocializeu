# Supabase setup

1. Open the Supabase SQL editor for `https://qzwwrvmooyjkghwgtvad.supabase.co`.
2. Run `schema.sql` once to create the tables, indexes, and public RLS policies.
   If the project already exists, run `20260430_restrict_public_insert_policies.sql`
   to replace the older permissive public insert policies.
   If public pages are loading empty Supabase data, run
   `20260430_restore_live_public_content.sql` to restore policies and content rows.
   If the schedule meeting form is being added to an existing project, run
   `20260502_schedule_meetings.sql` before deploying the updated site.
3. Set these environment variables in Vercel and in `server/.env` for local work:

```env
SUPABASE_URL=https://qzwwrvmooyjkghwgtvad.supabase.co
SUPABASE_KEY=sb_publishable_jJxa-CNPWxdh3T84-oiUfw_cGYBE3gd
```

For secure admin dashboard reads/writes, also set:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The publishable key is enough for public reads and form inserts under the included RLS policies. The service role key should stay server-side only.
