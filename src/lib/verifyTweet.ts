import { z } from "zod";
import { supabase } from "@/lib/supabaseClient";

const getTweetId = (urlStr: string) => {
  try {
    const u = new URL(urlStr);
    const id = u.pathname.split("/").filter(Boolean).pop();
    return id && /^\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
};

/*  Schema for the caller to validate before invoking  */
export const VerifyTweetInput = z.object({
  wallet: z.string(),
  token: z.string(),
  url: z.string().url(),
});

/*  Main library function  */
export async function verifyTweetUnchecked(
  wallet: string,
  token: string,
  url: string,
) {
  /* 1️⃣ pending proof -------------------------------------------------- */
  const { data: proof, error: pfErr } = await supabase
    .from("proofs")
    .select("*")
    .eq("wallet", wallet)
    .eq("token", token)
    .eq("used", false)
    .maybeSingle();

  if (pfErr) throw new Error(pfErr.message);
  if (!proof) return { ok: false, reason: "not found" };

  /* 2️⃣ scrape tweet ---------------------------------------------------- */
  const tweetId = getTweetId(url);
  if (!tweetId) return { ok: false, reason: "bad URL" };

  const endpoints = [
    `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en`,
    `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`,
  ];

  let text = "";
  for (const ep of endpoints) {
    try {
      const r = await fetch(ep);
      if (!r.ok) continue;
      const js: any = await r.json().catch(() => null);
      if (js?.text) {
        text = js.text;
        break;
      }
      if (typeof js?.html === "string") {
        text = js.html.replace(/<[^>]+>/g, " ");
        break;
      }
    } catch {
      /* try next */
    }
  }

  if (!text.includes(token))
    return { ok: false, reason: "token not in tweet" };

  /* 3️⃣ credit 200 pts & upsert participant ---------------------------- */
  // const { data: participant } = await supabase
  //   .from("participants")
  //   .select("total_score,tweet_points")
  //   .eq("address", wallet)
  //   .maybeSingle();

  // if (participant) {
  //   await supabase
  //     .from("participants")
  //     .update({
  //       total_score: (participant.total_score ?? 0) + 200,
  //       tweet_points: (participant.tweet_points ?? 0) + 200,
  //       last_tweet_at: new Date().toISOString(),
  //     })
  //     .eq("address", wallet);
  // } else {
  //   await supabase.from("participants").insert({
  //     address: wallet,
  //     total_score: 200,
  //     tweet_points: 200,
  //     last_tweet_at: new Date().toISOString(),
  //   });
  // }

  /* 4️⃣ mark proof used ----------------------------------------------- */
  await supabase
  .from("proofs")
  .update({ used: true })
  .eq("id", proof.id);

  return { ok: true };
}
