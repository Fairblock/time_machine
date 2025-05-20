import { getCurrentBlockInfo } from '@/services/fairyring/block'
import { supabaseAdmin }      from '../lib/supabaseClient'
import { getNextFridayDeadline } from '../lib/utils'
import { ethers }             from 'ethers'


// average seconds per block on your chain
const AVERAGE_BLOCK_TIME = 1.5

async function run() {
  // 1️⃣ figure out the exact date/time of the upcoming Friday deadline
  const deadlineDate = getNextFridayDeadline()            // e.g. “2025-05-16T23:59:00”
  
  // 2️⃣ grab the latest block so our math is anchored
  const latestBlock = await getCurrentBlockInfo()
  const anchorHeight = latestBlock.height
  const anchorTs     = Math.floor(latestBlock.timestamp.getTime() / 1_000)

  // 3️⃣ compute how many seconds until the deadline
  const targetTs = Math.floor(deadlineDate.getTime() / 1_000)
  const diffSec  = targetTs - anchorTs

  // 4️⃣ convert that to a block offset
  const offsetBlocks = Math.ceil(diffSec / AVERAGE_BLOCK_TIME)

  // 5️⃣ final “target” block
  const targetBlock = anchorHeight + offsetBlocks

  // 6️⃣ upsert into your deadlines table
  const { error } = await supabaseAdmin
    .from('deadlines')
    .upsert(
      { deadline_date: deadlineDate.toISOString(), target_block: targetBlock },
      { onConflict: 'deadline_date' }
    )
  if (error) throw error

  console.log(`Upserted Friday ${deadlineDate.toISOString()} → block ${targetBlock}`)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
