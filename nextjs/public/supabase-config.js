/* ParkPulse — Supabase project credentials.
   These two values are SAFE to expose in the browser: the "anon" key is public by
   design, and your data is protected by Row Level Security (each user can only read
   and write their own rows).

   Fill them in from your Supabase project → Settings → API:
     - Project URL        → SUPABASE_URL
     - Project API keys → anon public  → SUPABASE_ANON_KEY

   Until you fill these in, accounts stay OFF and the app works exactly as before
   (everything saved locally in the browser). */
window.SUPABASE_URL = "YOUR_SUPABASE_URL";
window.SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
