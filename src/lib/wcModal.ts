import { Web3Modal } from "@web3modal/standalone";

export const wcModal = new Web3Modal({
  projectId: "cbfcaf564ee9293b0d9d25bbdac11ea3",
  walletConnectVersion: 2,                        // WC‑v2 is required :contentReference[oaicite:1]{index=1}
  themeVariables: { "--w3m-z-index": "10000" },   // correct prefix 

  // show ONLY wallets that can handle Cosmos Hub (Leap, Keplr, Cosmostation…)
  standaloneChains: ["cosmos:cosmoshub-4"]        // a chain Leap ships with :contentReference[oaicite:3]{index=3}
});