/* app/actions/verifyTweet.ts */
"use server";

import { verifyTweetUnchecked } from "@/lib/verifyTweet";

export async function verifyTweet(
  wallet: string,
  token: string,
  url: string,
) {
  return await verifyTweetUnchecked(wallet, token, url);
}
