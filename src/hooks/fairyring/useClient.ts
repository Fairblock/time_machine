"use client";

import { useEffect, useState } from "react";
import { Client as FRClient } from "fairyring-client-ts";
import { FAIRYRING_ENV } from "@/constant/env";
import { useAccount, WalletType } from "graz";
import { getOffline } from "@/services/fairyring/sign";

type FairyringClient = InstanceType<typeof FRClient>;
type UseClient = FairyringClient | null;

export function useClient(): UseClient {
  const [client, setClient] = useState<UseClient>(null);

  const { data: account, isConnected } = useAccount();
  const address     = account?.bech32Address ?? "";
  const { walletType } = useAccount();

  useEffect(() => {
    if (!isConnected || !walletType) { setClient(null); return; } // no wallet

    let cancelled = false;

    (async () => {
      try {
        const signer  = await getOffline(address, FAIRYRING_ENV.chainID, walletType);
        if (cancelled) return;
        const inst    = new FRClient(FAIRYRING_ENV, signer);
        setClient(inst);
      } catch (err) {
        // silent — caller components already know to handle null
        console.error("Fairyring client init failed:", err);
        if (!cancelled) setClient(null);
      }
    })();

    return () => { cancelled = true; };
  }, [isConnected, walletType, address]);

  return client;
}
