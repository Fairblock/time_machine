import { Web3Modal } from "@web3modal/standalone";

export const wcModal = new Web3Modal({
  projectId: "cbfcaf564ee9293b0d9d25bbdac11ea3",
  walletConnectVersion: 2,
  themeVariables: { "--w3m-z-index": "10000" },
  // show wallets known to support CosmosHub (Leap does); we don't propose FairyRing yet
  standaloneChains: ["cosmos:cosmoshub-4"],
});
