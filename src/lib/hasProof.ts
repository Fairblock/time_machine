import { supabase } from "@/lib/supabaseClient";


export async function hasProofUnchecked(wallet: string): Promise<boolean> {

  const { data, error } = await supabase
    .from("proofs")
    .select("id")
    .eq("wallet", wallet)
    .limit(1)
    .maybeSingle();          // returns null if no row

  if (error) throw error;    // bubble up – the caller will handle UI
  return !!data;
}
