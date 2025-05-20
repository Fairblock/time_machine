// app/api/cron/update-deadline/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import { FAIRYRING_ENV } from '@/constant/env'

const SUPABASE_URL = FAIRYRING_ENV.supabase
const SUPABASE_SERVICE_ROLE_KEY = FAIRYRING_ENV.supabaseKey
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables')
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const RPC_URL = FAIRYRING_ENV.rpcURL ?? 'https://testnet-rpc.fairblock.network'

async function getCurrentBlockHeight(): Promise<number> {
  const res = await axios.get(`${RPC_URL}/status`)
  return parseInt(res.data.result.sync_info.latest_block_height, 10)
}

function getNextFridayDeadline(now = new Date()): Date {
  const day = now.getUTCDay()            // Sunday=0 … Saturday=6 in UTC
  const daysUntilFriday = ((5 + 7 - day) % 7) || 7
  const next = new Date(now)
  next.setUTCDate(now.getUTCDate() + daysUntilFriday)
  next.setUTCHours(0, 0, 0, 0)
  return next
}

export async function GET() {
  try {
    console.log('Running deadline update…')
    const now = new Date()
    const deadlineTime = getNextFridayDeadline(now)
    const currentHeight = await getCurrentBlockHeight()

    // Estimate block offset assuming ~1.5s per block
    const secondsUntil = Math.ceil((deadlineTime.getTime() - now.getTime()) / 1000)
    const targetBlock = currentHeight + Math.ceil(secondsUntil / 1.5)

    const { error } = await supabase
      .from('deadlines')
      .upsert(
        {
          deadline_date: deadlineTime.toISOString(),
          target_block:  targetBlock,
        },
        { onConflict: ['deadline_date'] }
      )

    if (error) {
      console.error('❌ Supabase upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`✅ Upserted ${deadlineTime.toISOString()} → block ${targetBlock}`)
    return NextResponse.json({
      success: true,
      deadline: deadlineTime.toISOString(),
      targetBlock,
    })
  } catch (err: any) {
    console.error('❌ Error updating deadline:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
