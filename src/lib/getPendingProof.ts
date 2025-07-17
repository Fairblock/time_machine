import { supabase } from "@/lib/supabaseClient";

/**
 * Returns the newest unused proof for a wallet, or null if none exist.
 * Throws if Supabase returns an error.
 */
export async function getPendingProofUnchecked(
  wallet: string,
): Promise<{ token: string; created_at: string } | null> {
  const { data, error } = await supabase
    .from("proofs")
    .select("token, created_at")
    .eq("wallet", wallet)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}
