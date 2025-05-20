import type { EncodeObject } from '@cosmjs/proto-signing';
import { type StdFee, SigningStargateClient } from '@cosmjs/stargate';
import { TxRaw } from 'fairyring-client-ts/cosmos.tx.v1beta1/module';
import { timelockEncrypt } from 'ts-ibe';

import { FAIRYRING_ENV } from '@/constant/env';

export const signOfflineWithCustomNonce = async (
  signerAddress: string,
  endpoint: string,
  chainID: string,
  messages: readonly EncodeObject[],
  fee: StdFee,
  memo: string,
  sequence: number,
): Promise<Buffer> => {
  if (!window.getOfflineSigner) {
    throw new Error("can't get window offline signer...");
  }

  const offlineSigner = window.getOfflineSigner(chainID);

  const signer = await SigningStargateClient.connectWithSigner(endpoint, offlineSigner);
  const { accountNumber } = await signer.getSequence(signerAddress);
  const offlineSignerAccount = (await offlineSigner.getAccounts()).find((account) => account.address === signerAddress);

  if (offlineSignerAccount == null) {
    throw new Error('Offline Signer Account is null...');
  }

  const signedTxRaw = await signer.sign(signerAddress, messages, fee, memo, {
    accountNumber: accountNumber,
    sequence: sequence,
    chainId: FAIRYRING_ENV.chainID,
  });
  const signedRawByte = TxRaw.encode(signedTxRaw).finish();
  return Buffer.from(signedRawByte);
};

export const encryptSignedTx = async (pubKeyHex: string, targetHeight: number, signedBuf: Buffer): Promise<string> => {
  return await timelockEncrypt(targetHeight.toString(), pubKeyHex, signedBuf);
};
