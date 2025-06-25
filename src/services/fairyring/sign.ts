import type { EncodeObject, OfflineSigner } from "@cosmjs/proto-signing";
import { type StdFee, SigningStargateClient } from "@cosmjs/stargate";
import { TxRaw } from "fairblock-fairyring-client-ts/cosmos.tx.v1beta1/module";
import { timelockEncrypt } from "ts-ibe";
import { WalletType } from "graz";

import { FAIRYRING_ENV } from "@/constant/env";

async function getWalletSigner(
  wallet: WalletType,
  chainID: string
): Promise<OfflineSigner> {
  if (wallet === WalletType.KEPLR) {
    if (!window.keplr) throw new Error("Keplr extension not found");
    await window.keplr.enable(chainID);
    return window.keplr.getOfflineSignerAuto(chainID) as unknown as OfflineSigner;
  }

  if (wallet === WalletType.LEAP) {
    if (!window.leap) throw new Error("Leap extension not found");
    await window.leap.enable(chainID);
    return window.leap.getOfflineSigner(chainID);
  }

  throw new Error(`Unsupported wallet: ${wallet}`);
}

export const signOfflineWithCustomNonce = async (
  signerAddress: string,
  endpoint: string,
  chainID: string,
  messages: readonly EncodeObject[],
  fee: StdFee,
  memo: string,
  sequence: number,
  walletType: WalletType
): Promise<Buffer> => {
  const offlineSigner = await getWalletSigner(walletType, chainID);

  const accounts = await offlineSigner.getAccounts();
  const match    = accounts.find((a) => a.address === signerAddress);
  if (!match) {
    throw new Error(
      `Active ${walletType} account does not match ${signerAddress}`
    );
  }

  const client        = await SigningStargateClient.connectWithSigner(
    endpoint,
    offlineSigner
  );
  const { accountNumber } = await client.getSequence(signerAddress);

  const signed = await client.sign(
    signerAddress,
    messages,
    fee,
    memo,
    { accountNumber, sequence, chainId: chainID }
  );

  return Buffer.from(TxRaw.encode(signed).finish());
};

export const encryptSignedTx = async (
  pubKeyHex: string,
  targetHeight: number,
  signedBuf: Buffer
): Promise<string> =>
  timelockEncrypt(targetHeight.toString(), pubKeyHex, signedBuf);

export const getOffline = async (
  signerAddress: string,
  chainID: string,
  walletType: WalletType
): Promise<OfflineSigner> => getWalletSigner(walletType, chainID);

