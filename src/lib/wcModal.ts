import { Web3Modal } from "@web3modal/standalone";


const EXPLORER_ID_KEPLR =
  "6adb6082c909901b9e7189af3a4a0223102cd6f8d5c39e39f3d49acb92b578bb";
const EXPLORER_ID_LEAP =
  "3ed8cc046c6211a798dc5ec70f1302b43e07db9639fd287de44a9aa115a21ed6";


export const wcModal = new Web3Modal({
  projectId: "cbfcaf564ee9293b0d9d25bbdac11ea3",
  walletConnectVersion: 2,
  themeVariables: { "--w3m-z-index": "10000" },

  explorerRecommendedWalletIds: [EXPLORER_ID_KEPLR, EXPLORER_ID_LEAP],
  explorerExcludedWalletIds: "ALL",

  standaloneChains: ["cosmos:fairyring-testnet-3"],
});
