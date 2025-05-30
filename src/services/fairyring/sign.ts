// services/fairyring/sign.ts

import type { EncodeObject } from '@cosmjs/proto-signing';
import { type StdFee, SigningStargateClient } from '@cosmjs/stargate';
import { TxRaw } from 'fairyring-client-ts/cosmos.tx.v1beta1/module';
import { timelockEncrypt } from 'ts-ibe';

import { FAIRYRING_ENV } from '@/constant/env';
import { off } from 'process';

export const signOfflineWithCustomNonce = async (
  signerAddress: string,
  endpoint: string,
  chainID: string,
  messages: readonly EncodeObject[],
  fee: StdFee,
  memo: string,
  sequence: number,
): Promise<Buffer> => {
  // 1️⃣ Ensure the wallet is enabled on this chain
  if (typeof window !== 'undefined') {
    if ((window as any).keplr?.enable) {
      await (window as any).keplr.enable(chainID);
    } else if ((window as any).leap?.enable) {
      await (window as any).leap.enable(chainID);
    }
  }

  // 2️⃣ Grab the right offline signer (Keplr, Leap or fallback)
  let offlineSigner: any;
  if (typeof window === 'undefined') {
    throw new Error('Window is undefined');
  }
  if ((window as any).keplr?.getOfflineSigner) {
    offlineSigner = (window as any).keplr.getOfflineSigner(chainID);
  } else if ((window as any).leap?.getOfflineSigner) {
    offlineSigner = (window as any).leap.getOfflineSigner(chainID);
  } else if ((window as any).getOfflineSigner) {
    offlineSigner = (window as any).getOfflineSigner(chainID);
  } else {
    throw new Error('No offline signer available—install Keplr or Leap');
  }

  // 3️⃣ Check that the desired address is among the signer's accounts
  const accounts = await offlineSigner.getAccounts();
  const matching = accounts.find((a: any) => a.address === signerAddress);
  if (!matching) {
    offlineSigner = (window as any).leap.getOfflineSigner(chainID);
  }

  // 4️⃣ Connect and sign
  const client = await SigningStargateClient.connectWithSigner(endpoint, offlineSigner);
  const { accountNumber } = await client.getSequence(signerAddress);
  const signed = await client.sign(
    signerAddress,
    messages,
    fee,
    memo,
    { accountNumber, sequence, chainId: chainID },
  );

  // 5️⃣ Return the raw bytes
  const rawBytes = TxRaw.encode(signed).finish();
  return Buffer.from(rawBytes);
};

export const encryptSignedTx = async (
  pubKeyHex: string,
  targetHeight: number,
  signedBuf: Buffer
): Promise<string> => {
  return timelockEncrypt(targetHeight.toString(), pubKeyHex, signedBuf);
};

export const getOffline = async (
  signerAddress: string,
  chainID: string,

): Promise<any> => {
  // 1️⃣ Ensure the wallet is enabled on this chain
  if (typeof window !== 'undefined') {
    if ((window as any).keplr?.enable) {
      await (window as any).keplr.enable(chainID);
    } else if ((window as any).leap?.enable) {
      await (window as any).leap.enable(chainID);
    }
  }

  // 2️⃣ Grab the right offline signer (Keplr, Leap or fallback)
  let offlineSigner: any;

  if (typeof window === 'undefined') {
    throw new Error('Window is undefined');
  }
  if ((window as any).keplr?.getOfflineSigner) {
    offlineSigner = (window as any).keplr.getOfflineSigner(chainID);
  } else if ((window as any).leap?.getOfflineSigner) {
    offlineSigner = (window as any).leap.getOfflineSigner(chainID);
  } else if ((window as any).getOfflineSigner) {
    offlineSigner = (window as any).getOfflineSigner(chainID);
  } else {
    throw new Error('No offline signer available—install Keplr or Leap');
  }

  // 3️⃣ Check that the desired address is among the signer's accounts
  const accounts = await offlineSigner.getAccounts();
  const matching = accounts.find((a: any) => a.address === signerAddress);
  if (!matching) {
    offlineSigner = (window as any).leap.getOfflineSigner(chainID);
  }
  return offlineSigner;
};
