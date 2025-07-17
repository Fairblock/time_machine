import { supabase } from "@/lib/supabaseClient";

/**
 * Inserts or updates a (wallet,token) row in the proofs table.
 * Throws on Supabase error.
 */
export async function upsertProofUnchecked(
  wallet: string,
  token: string,
): Promise<{ ok: true }> {
  const { error } = await supabase
    .from("proofs")
    .upsert({ wallet, token }, { onConflict: "wallet,token" });

  if (error) throw new Error(error.message);
  return { ok: true };
}
