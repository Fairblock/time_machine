"use server";

import { hasProofUnchecked } from "@/lib/hasProof";



export async function hasProof(wallet: string): Promise<boolean> {

  return await hasProofUnchecked(wallet);
}
