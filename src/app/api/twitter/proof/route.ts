import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const Schema = z.object({ wallet: z.string(), token: z.string() });
  const parse  = Schema.safeParse(body);
  if (!parse.success)
    return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const { wallet, token } = parse.data;
  const { error } = await supabase
    .from('proofs')
    .upsert({ wallet, token }, { onConflict: 'wallet,token' });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
