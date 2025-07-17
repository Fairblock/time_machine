// app/actions/getPendingProof.ts
"use server";

import { z } from "zod";
import { getPendingProofUnchecked } from "@/lib/getPendingProof";

type PendingProof = { token: string; createdAt: string }; // keep camelCase

export async function getPendingProofAction(wallet: unknown): Promise<{
  ok: boolean;
  data: PendingProof | null;
  reason?: string;
}> {
  const w = z.string().safeParse(wallet);
  if (!w.success) return { ok: false, data: null, reason: "bad wallet" };

  try {
    const row = await getPendingProofUnchecked(w.data); // row?.created_at
    return row
      ? { ok: true, data: { token: row.token, createdAt: row.created_at } }
      : { ok: true, data: null };
  } catch (e: any) {
    return { ok: false, data: null, reason: e.message };
  }
}
