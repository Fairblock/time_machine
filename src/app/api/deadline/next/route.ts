// app/api/deadline/next/route.ts
import { NextResponse } from 'next/server'
import { supabase }     from '@/lib/supabaseClient'

export async function GET() {
  const { data, error } = await supabase
    .from('deadlines')
    .select('deadline_date, target_block')
    .gt('deadline_date', new Date().toISOString())
    .order('deadline_date', { ascending: true })
    .limit(1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const next = data?.[0] || null
  return NextResponse.json({ nextDeadline: next })
}
