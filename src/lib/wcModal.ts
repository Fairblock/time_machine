// lib/wcModal.ts
import { Web3Modal } from "@web3modal/standalone";

export const wcModal = new Web3Modal({
  // --- WalletConnect cloud project – required ---
  projectId: "cbfcaf564ee9293b0d9d25bbdac11ea3",

  // --- Tell the SDK you’re using WC‑v2 (Leap, Keplr, etc.) ---
  walletConnectVersion: 2,        // <── missing property

  // --- Optional look‑and‑feel tweaks (note the w3m‑ prefix) ---
  themeVariables: {
    "--w3m-z-index": "10000"      // keeps the blue sheet on top
  },

  // --- Filter the picker to Cosmos wallets that support FairyRing
  standaloneChains: ["cosmos:fairyring-testnet-3"]
});
