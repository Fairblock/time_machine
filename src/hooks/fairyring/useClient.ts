"use client";

import { useEffect, useState } from "react";
import { Client as FRClient } from "fairblock-fairyring-client-ts";
import { FAIRYRING_ENV } from "@/constant/env";
import { useAccount, WalletType, useOfflineSigners } from "graz";  // <<< added useOfflineSigners
import { getOffline } from "@/services/fairyring/sign";

type FairyringClient = InstanceType<typeof FRClient>;
type UseClient = FairyringClient | null;

export function useClient(): UseClient {
  const [client, setClient] = useState<UseClient>(null);

  const { data: account, isConnected, walletType } = useAccount(); // <<< single destructure; includes walletType
  const { data: offlineSignersData } = useOfflineSigners();        // <<< grab WC signer(s)
  const address = account?.bech32Address ?? "";

  useEffect(() => {
    if (!isConnected || !walletType) {
      setClient(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        let signer;
        if (walletType === WalletType.WC_KEPLR_MOBILE) {            // <<< WC Keplr path
          // Graz exposes a ready-to-use signer after WalletConnect approval.
          signer = offlineSignersData?.offlineSignerAuto;
          if (!signer) throw new Error("WC Keplr signer not ready");
        } else {
          // Existing extension / non-WC path
          signer = await getOffline(address, FAIRYRING_ENV.chainID, walletType);
        }

        if (cancelled) return;
        const inst = new FRClient(FAIRYRING_ENV, signer);
        setClient(inst);
      } catch (err) {
        console.error("Fairyring client init failed:", err);
        if (!cancelled) setClient(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isConnected, walletType, address, offlineSignersData]);       // <<< added offlineSignersData dep

  return client;
}
