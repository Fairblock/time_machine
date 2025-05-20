// app/api/deadline/last/route.ts
import { NextResponse } from 'next/server'
import { supabase }     from '@/lib/supabaseClient'

export async function GET() {
  // 1️⃣ Query deadlines before “now”, order newest-first, take the top one
  const { data, error } = await supabase
    .from('deadlines')
    .select('deadline_date, target_block')
    .lt('deadline_date', new Date().toISOString())
    .order('deadline_date', { ascending: false })
    .limit(1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 2️⃣ If there’s no past deadline yet, return null
  const last = data?.[0] || null
  return NextResponse.json({ lastDeadline: last })
}
