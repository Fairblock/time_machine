// lib/wc.ts
import SignClient from "@walletconnect/sign-client";

export async function initSignClient() {
  return SignClient.init({ projectId: "cbfcaf564ee9293b0d9d25bbdac11ea3" });
}
