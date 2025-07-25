import { createClient } from '@supabase/supabase-js'

import { FAIRYRING_ENV } from '@/constant/env';
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
/* ── Supabase admin client ──────────────────────────────────────────────── */
export const supabase = createClient(
  FAIRYRING_ENV.supabase!,
  FAIRYRING_ENV.supabaseKey!
);