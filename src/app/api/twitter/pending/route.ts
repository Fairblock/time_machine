import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');
  if (!wallet) return NextResponse.json({}, { status: 400 });

  const { data, error } = await supabase
    .from('proofs')
    .select('token, created_at')
    .eq('wallet', wallet)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  /* return {} when nothing pending so front‑end gets valid JSON */
  return NextResponse.json(data ?? {});
}
