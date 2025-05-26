/* hooks/fairyring/useClient.ts */
'use client';

import { useEffect, useState } from 'react';
import { Client as FRClient }  from 'fairyring-client-ts';
import { FAIRYRING_ENV }       from '@/constant/env';

/* derive the *instance* type from the constructor value */
type FairyringClient = InstanceType<typeof FRClient>;

type UseClient = FairyringClient | null;

/**
 * Returns a Fairyring `Client` after the wallet extension (Keplr/Leap...)
 * injects `window.getOfflineSigner`.  While the signer is still missing it
 * returns `null` — your component will re‑render automatically once the
 * client becomes available, so the rest of your original code keeps working.
 */
export function useClient(): UseClient {
  const [client, setClient] = useState<FairyringClient | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;            // ⛔ SSR

    let cancelled = false;

    async function init() {
      /* wait up to 2 s for the wallet to inject the signer */
      const start = Date.now();
      while (!cancelled && Date.now() - start < 2000) {
        const signerFn = (window as any).getOfflineSigner;
        if (typeof signerFn === 'function') {
          try {
            const inst = new FRClient(
              FAIRYRING_ENV,
              await signerFn(FAIRYRING_ENV.chainID)
            );
            if (!cancelled) setClient(inst);
          } catch (err) {
            // swallow – component can retry on next mount or user refresh
          }
          return;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      /* signer never appeared → leave client as null (UI handles this) */
    }

    init();
    return () => { cancelled = true; };
  }, []);

  return client;
}
