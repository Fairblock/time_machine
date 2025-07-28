import { createClient } from '@supabase/supabase-js'

import { FAIRYRING_ENV } from '@/constant/env';
export const supabaseAdmin = createClient(
  FAIRYRING_ENV.supabase!,
  FAIRYRING_ENV.supabaseKey!
)
/* ── Supabase admin client ──────────────────────────────────────────────── */
export const supabase = createClient(
  FAIRYRING_ENV.supabase!,
  FAIRYRING_ENV.supabaseKey!
);