import SignClient from "@walletconnect/sign-client";

export async function newWcSession(requiredChains: string[]) {
  const client = await SignClient.init({ projectId: "cbfcaf564ee9293b0d9d25bbdac11ea3",   metadata: {
    name:        'FairyRing',
    description: 'Encrypt predictions on Fairblock',
    url:         'https://timemachine.fairblock.network',
    icons:       ['https://timemachine.fairblock.network/icon.png'],
    redirect: {
      universal: 'https://timemachine.fairblock.network/', // opens in default browser
      // native:  'fairyring://'                      // optional custom scheme
    }
  } });
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
