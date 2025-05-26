/* hooks/fairyring/useClient.ts */
'use client';

import { useEffect, useState } from 'react';
import { Client as FRClient }  from 'fairyring-client-ts';
import { FAIRYRING_ENV }       from '@/constant/env';

/* ── derive the *instance* type from the constructor ──────────────── */
type FairyringClient = InstanceType<typeof FRClient>;

type UseClient = {
  client: FairyringClient | null;
  error : string | null;
};

/**
 * Creates (once) and returns a Fairyring `Client`.
 * – Does nothing during SSR.
 * – Shows a friendly error if Keplr / compatible wallet is missing.
 */
export function useClient(): UseClient {
  const [client, setClient] = useState<FairyringClient | null>(null);
  const [error,  setError ] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;                // ⛔ SSR

    const getOfflineSigner = (window as any).getOfflineSigner;
    if (typeof getOfflineSigner !== 'function') {
      setError('Keplr (or compatible Cosmos wallet) not detected.');
      return;
    }

    (async () => {
      try {
        const signer = await getOfflineSigner(FAIRYRING_ENV.chainID);
        setClient(new FRClient(FAIRYRING_ENV, signer));
      } catch (err: any) {
        setError(err?.message ?? String(err));
      }
    })();
  }, []);

  return { client, error };
}
