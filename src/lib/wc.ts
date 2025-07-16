import SignClient from "@walletconnect/sign-client";

export async function newWcSession(requiredChains: string[]) {
  const client = await SignClient.init({ projectId: "cbfcaf564ee9293b0d9d25bbdac11ea3" });
  const { uri, approval } = await client.connect({
    requiredNamespaces: {
      cosmos: {
        chains: requiredChains,
        methods: ["cosmos_signDirect", "cosmos_signAmino"],   // Leap‑supported :contentReference[oaicite:1]{index=1}
        events: ["accountsChanged"],
      },
    },
  });
  return { uri, approval };
}
