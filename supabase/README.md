# Supabase setup

1. Open the Supabase SQL editor for `https://qzwwrvmooyjkghwgtvad.supabase.co`.
2. Run `schema.sql` once to create the tables, indexes, and public RLS policies.
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
