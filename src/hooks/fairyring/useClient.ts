import { Client } from 'fairyring-client-ts';

import { FAIRYRING_ENV } from '@/constant/env';
// import { useOfflineSigners } from "graz";

const newClientInstance = () => {
  // const { data } = useOfflineSigners();
  if (!window.getOfflineSigner) {
    throw new Error("can't get window offline signer...");
  }
  const client = new Client(FAIRYRING_ENV, window.getOfflineSigner(FAIRYRING_ENV.chainID));
  return client;
};
let clientInstance: ReturnType<typeof newClientInstance>;

export const useClient = () => {
  if (!clientInstance) {
    clientInstance = newClientInstance();
  }
  return clientInstance;
};
