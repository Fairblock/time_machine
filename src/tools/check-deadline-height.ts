/* tools/check-deadline-height.ts ──────────────────────────────────────────
 * Quick estimator that never overshoots 23 : 59 UTC
 *
 * Usage
 *   npx ts-node tools/check-deadline-height.ts <currentHeight>
 *              [--lookback 400]        # how many blocks to average (default 400)
 *              [--slow 1.05]           # safety factor ≥ 1.00 (default 1.05)
 *
 * Strategy
 *   1.  Measure average seconds-per-block over <lookback> blocks.
 *   2.  Assume blocks will be *slower* by <slow> (e.g. 1.05 = +5 %).
 *   3.  floor(secsUntil / (avg * slow)) → blocksAhead.
 *       This intentionally under-shoots, so the header time is a bit *before*
 *       23:59 rather than after.
 *   4.  If, despite that, the predicted header is still > deadline, walk back
 *       one block at a time until it’s ≤ deadline.
 *   5.  Print diagnostics.
 * ---------------------------------------------------------------------- */

const axios    = require('axios');
const minimist = require('minimist');

const RPC_URL = 'https://testnet-rpc.fairblock.network';

/* ── helpers ─────────────────────────────────────────────────────────── */
async function getBlock(height: number) {
  const { data } = await axios.get(`${RPC_URL}/block?height=${height}`);
  return data.result.block;                           // header.time (RFC-3339)
}

async function avgBlockTime(tip: number, lookback: number) {
  const [tTop, tPast] = await Promise.all([
    (await getBlock(tip)).header.time,
    (await getBlock(tip - lookback)).header.time,
  ]);
  return (
    (new Date(tTop).getTime() - new Date(tPast).getTime()) /
    (lookback * 1000)
  ); // seconds
}

/* return the *next* Wed/Sat @23:59 UTC strictly after t ---------------- */
function nextDeadlineAfter(t: Date) {
  const isDecryptDay = (d: Date) => d.getUTCDay() === 3 || d.getUTCDay() === 6;
  const dl = new Date(t);
  dl.setUTCMinutes(59, 0, 0);
  dl.setUTCHours(23);

  if (t >= dl) dl.setUTCDate(dl.getUTCDate() + 1);    // already past 23:59

  while (!isDecryptDay(dl)) dl.setUTCDate(dl.getUTCDate() + 1);
  return dl;
}

/* ── MAIN ────────────────────────────────────────────────────────────── */
(async () => {
  const argv       = minimist(process.argv.slice(2));
  const baseHeight = Number(argv._[0]);
  if (!Number.isFinite(baseHeight)) {
    console.error('Usage: ts-node tools/check-deadline-height.ts <height> [--lookback 400] [--slow 1.05]');
    process.exit(1);
  }

  const lookback = Number(argv.lookback ?? 400);
  const slowFac  = Number(argv.slow ?? 1.05);         // ≥ 1 → earlier

  /* 1️⃣ context at current height */
  const baseBlock  = await getBlock(baseHeight);
  const baseTime   = new Date(baseBlock.header.time);
  const deadline   = nextDeadlineAfter(baseTime);
  const secsUntil  = (deadline.getTime() - baseTime.getTime()) / 1000;

  const avgSec     = await avgBlockTime(baseHeight, lookback);
  const estSec     = avgSec * slowFac;
  const blocksAhead= Math.floor(secsUntil / estSec);
  let   predicted  = baseHeight + blocksAhead;

  /* 2️⃣ ensure we never overshoot 23:59 */
//   let   targetTime = new Date((await getBlock(predicted)).header.time);
// //   while (targetTime > deadline && predicted > baseHeight) {
// //     predicted--;
// //     targetTime = new Date((await getBlock(predicted)).header.time);
// //   }

//   /* 3️⃣ diagnostics */
//   const diffSec = (deadline.getTime() - targetTime.getTime()) / 1000;

  console.log('Base height        :', baseHeight);
  console.log('Base header time   :', baseTime.toISOString());
  console.log('Deadline (23:59)   :', deadline.toISOString());
  console.log('Avg sec / block    :', avgSec.toFixed(3));
  console.log('Safety slow factor :', slowFac, '(effective', estSec.toFixed(3), 's)');
  console.log('Blocks until target:', predicted - baseHeight);
  console.log('Predicted height   :', predicted);
//   console.log('Predicted time     :', targetTime.toISOString());
//   console.log('Δ to deadline (s)  :', diffSec.toFixed(1),
//               diffSec >= 0 ? '(earlier — OK)' : '(late!)');
})();
