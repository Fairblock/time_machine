import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabaseClient';

const getTweetId = (urlStr: string) => {
  try {
    const u = new URL(urlStr);
    const id = u.pathname.split('/').filter(Boolean).pop();
    return id && /^\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const Schema = z.object({
    wallet: z.string(),
    token: z.string(),
    url: z.string().url(),
  });
  const parse = Schema.safeParse(body);
  if (!parse.success)
    return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const { wallet, token, url } = parse.data;

  /* 1️⃣ pending row */
  const { data: proof, error } = await supabase
    .from('proofs')
    .select('*')
    .eq('wallet', wallet)
    .eq('token', token)
    .eq('used', false)
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!proof)
    return NextResponse.json({ error: 'not found' }, { status: 404 });

  /* 2️⃣ unauthenticated tweet scrape */
  const tweetId = getTweetId(url);
  if (!tweetId)
    return NextResponse.json({ error: 'bad URL' }, { status: 400 });

  const endpoints = [
    `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en`,
    `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`,
  ];

  let text = '';
  for (const ep of endpoints) {
    try {
      const r = await fetch(ep);
      if (!r.ok) continue;
      const js = await r.json().catch(() => null);
      if (js?.text) {
        text = js.text;
        break;
      }
      if (typeof js?.html === 'string') {
        text = js.html.replace(/<[^>]+>/g, ' ');
        break;
      }
    } catch {
      /* ignore and try next */
    }
  }
  if (!text.includes(token))
    return NextResponse.json({ error: 'token not in tweet' }, { status: 422 });

  /* 3️⃣ mark used */
  const { error: upErr } = await supabase
    .from('proofs')
    .update({ used: true, tweet_id: tweetId })
    .eq('id', proof.id);

  if (upErr)
    return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
