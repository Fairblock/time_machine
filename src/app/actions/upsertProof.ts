"use server";

import { z } from "zod";
import { upsertProofUnchecked } from "@/lib/upsertProof";

const Input = z.object({
  wallet: z.string(),
  token: z.string(),
});

export async function upsertProofAction(input: unknown) {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "bad input" };

  const { wallet, token } = parsed.data;
  try {
    return await upsertProofUnchecked(wallet, token);
  } catch (e: any) {
    return { ok: false, reason: e.message };
  }
}
