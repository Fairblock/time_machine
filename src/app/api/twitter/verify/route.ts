import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabaseClient';

const getTweetId = (urlStr: string) => {
  try {
    const u = new URL(urlStr);
    const id = u.pathname.split('/').filter(Boolean).pop();
    return id && /^\d+$/.test(id) ? id : null;
  } catch { return null; }
};

export async function POST(req: Request) {
  /* ---------- validate body ---------- */
  const body   = await req.json().catch(() => null);
  const Schema = z.object({
    wallet: z.string(),
    token : z.string(),
    url   : z.string().url(),
  });
  const parse = Schema.safeParse(body);
  if (!parse.success)
    return NextResponse.json({ error:'bad request' }, { status:400 });

  const { wallet, token, url } = parse.data;

  /* ---------- 1) pending proof ---------- */
  const { data: proof, error: pfErr } = await supabase
    .from('proofs')
    .select('*')
    .eq('wallet', wallet)
    .eq('token',  token)
    .eq('used',   false)
    .maybeSingle();

  if (pfErr)  return NextResponse.json({ error:pfErr.message }, { status:500 });
  if (!proof) return NextResponse.json({ error:'not found'    }, { status:404 });

  /* ---------- 2) scrape tweet ---------- */
  const tweetId = getTweetId(url);
  if (!tweetId) return NextResponse.json({ error:'bad URL' }, { status:400 });

  const endpoints = [
    `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en`,
    `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`,
  ];
  let text = '';
  for (const ep of endpoints) {
    try {
      const r = await fetch(ep); if (!r.ok) continue;
      const js = await r.json().catch(()=>null);
      if (js?.text) { text = js.text; break; }
      if (typeof js?.html === 'string') {
        text = js.html.replace(/<[^>]+>/g,' '); break;
      }
    } catch {/* try next */}
  }
  if (!text.includes(token))
    return NextResponse.json({ error:'token not in tweet' }, { status:422 });

  /* ---------- 3) credit 200 pts & upsert participant ---------- */
  const { data: participant } = await supabase
    .from('participants')
    .select('total_score,tweet_points')
    .eq('address', wallet)
    .maybeSingle();

  if (participant) {
    await supabase.from('participants').update({
      total_score : (participant.total_score  ?? 0) + 200,
      tweet_points: (participant.tweet_points ?? 0) + 200,
      last_tweet_at : new Date().toISOString(),
    }).eq('address', wallet);
  } else {
    await supabase.from('participants').insert({
      address      : wallet,
      total_score  : 200,
      tweet_points : 200,
      last_tweet_at : new Date().toISOString(),
    });
  }

  /* ---------- 4) mark proof used & delete ---------------------- */
  await supabase
    .from('proofs')
    .delete()
    .eq('id', proof.id);

  return NextResponse.json({ ok:true });
}
