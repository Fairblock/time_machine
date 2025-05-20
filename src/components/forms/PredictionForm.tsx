'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FAIRYRING_ENV, PUBLIC_ENVIRONMENT } from '@/constant/env';
import { useClient } from '@/hooks/fairyring/useClient';
import { useKeysharePubKey } from '@/hooks/fairyring/useKeysharePubKey';
import { getCurrentBlockHeight } from '@/services/fairyring/block';
import { encryptSignedTx, signOfflineWithCustomNonce } from '@/services/fairyring/sign';
import { Amount } from '@/types/fairyring';
import { useAccount } from 'graz';
import { Lock, Loader2 } from 'lucide-react';

import { TxRaw, TxBody } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { MsgSubmitEncryptedTx } from '@/types/fairyring/codec/pep/tx';
import { Buffer } from 'buffer';

const MEMO = 'price-predict';
const PER_PAGE = 100;
const RPC = FAIRYRING_ENV.rpcURL.replace(/^ws/, 'http');

export default function PredictionForm() {
  const [prediction, setPrediction] = useState('');
  const [submitted, setSubmitted]   = useState(false);
  const [isSending, setIsSending]   = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [targetHeight, setTargetHeight] = useState<number | null>(null);

  const client = useClient();
  const { data: account } = useAccount();
  const address = account?.bech32Address;
  const { data: pubkey }  = useKeysharePubKey();

  // 1️⃣ Fetch the upcoming auction’s target block
  useEffect(() => {
    async function fetchTarget() {
      try {
        const res = await fetch('/api/deadline/next');
        if (!res.ok) throw new Error('Failed to fetch next deadline');
        const { nextDeadline } = await res.json();
        if (nextDeadline?.target_block != null) {
          setTargetHeight(Number(nextDeadline.target_block));
        }
      } catch (err) {
        console.error('Error fetching next deadline:', err);
      }
    }
    fetchTarget();
  }, []);

  // 2️⃣ Scan on-chain for a matching submission whenever wallet or target changes
  useEffect(() => {
    setSubmitted(false);
    if (!address || targetHeight == null) {
      setIsChecking(false);
      return;
    }
    setIsChecking(true);
    let cancelled = false;

    async function scanTxs() {
      try {
        // fetch the previous auction’s block to know where to stop
        const lastRes = await fetch('/api/deadline/last').then(r => r.json());
        const cutoffBlock = Number(lastRes.lastDeadline?.target_block ?? 0);

        const actionTag = "message.action='/fairyring.pep.MsgSubmitEncryptedTx'";
        const query     = `%22${encodeURIComponent(actionTag)}%22`;
        let page = 1;

        while (!cancelled) {
          const url = `${RPC}/tx_search?query=${query}` +
                      `&order_by=%22desc%22&per_page=${PER_PAGE}&page=${page}`;
          const res = await fetch(url).then(r => r.json());
          const txs = res.result?.txs || [];

          for (const row of txs) {
            const height = Number(row.height);

            // stop as soon as we hit blocks at-or-before the last auction
            if (height <= cutoffBlock) {
              return;
            }

            // decode and filter
            const raw  = TxRaw.decode(Buffer.from(row.tx, 'base64'));
            const body = TxBody.decode(raw.bodyBytes);
            if (body.memo !== MEMO) continue;

            const anyMsg = body.messages.find(
              m => m.typeUrl === '/fairyring.pep.MsgSubmitEncryptedTx'
            );
            if (!anyMsg) continue;

            const msg = MsgSubmitEncryptedTx.decode(new Uint8Array(anyMsg.value));
            if (
              Number(msg.targetBlockHeight) === targetHeight &&
              msg.creator === address
            ) {
              setSubmitted(true);
              return;
            }
          }

          if (txs.length < PER_PAGE) break;
          page++;
        }
      } catch (err) {
        console.error('Error scanning txs:', err);
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    }

    scanTxs();
    return () => { cancelled = true; };
  }, [address, targetHeight]);

  // 3️⃣ Submit a new prediction on-chain
  const submitOnChain = async (request: { prediction: number; startBlock: number }) => {
    if (!address || targetHeight == null) {
      console.error('Missing account or targetHeight');
      return;
    }

    setIsSending(true);
    try {
      // compute a fresh nonce
      const { data: { pepNonce } } =
        await client.FairyringPep.query.queryPepNonce(address);
      let userSent = 0;
      const { data: { encryptedTxArray } } =
        await client.FairyringPep.query.queryEncryptedTxAll();
      if (encryptedTxArray) {
        for (const txs of encryptedTxArray) {
          if (txs.encryptedTx) {
            for (const tx of txs.encryptedTx) {
              if (tx.creator === address) userSent++;
            }
          }
        }
      }
      const nonceUsing = pepNonce?.nonce
        ? parseInt(pepNonce.nonce) + userSent
        : userSent;

      // build the bank send, sign, and encrypt
      const amount: Amount[] = [{ amount: '1', denom: 'ufairy' }];
      const payload = { amount, toAddress: PUBLIC_ENVIRONMENT.NEXT_PUBLIC_FAUCET_ADDRESS!, fromAddress: address };
      const memo    = JSON.stringify({ tag: MEMO, memo: request, payload });
      const sendMsg = client.CosmosBankV1Beta1.tx.msgSend({ value: payload });

      const signed = await signOfflineWithCustomNonce(
        address,
        FAIRYRING_ENV.rpcURL,
        FAIRYRING_ENV.chainID,
        [sendMsg],
        { amount: [{ denom: 'ufairy', amount: '0' }], gas: '500000' },
        memo,
        nonceUsing,
      );

      const obPub = pubkey as any;
      const expiry = obPub.activePubKey?.expiry;
      const key = expiry && (Number(expiry) - targetHeight > 0)
        ? obPub.activePubKey.publicKey
        : obPub.queuedPubKey.publicKey;

      const encryptedHex = await encryptSignedTx(key, targetHeight, signed);
      const txResult = await client.FairyringPep.tx.sendMsgSubmitEncryptedTx({
        value: { creator: address, data: encryptedHex, targetBlockHeight: targetHeight },
        fee:   { amount: [{ denom: 'ufairy', amount: '0' }], gas: '543210' },
        memo: MEMO,
      });
      if (txResult.code) throw new Error(txResult.rawLog);

      setSubmitted(true);
    } catch (err) {
      console.error('Submission failed:', err);
      setSubmitted(false);
    } finally {
      setIsSending(false);
    }
  };

  // 4️⃣ Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitOnChain({ prediction: parseFloat(prediction), startBlock: 0 });
  };

  // 5️⃣ Render
  return (
    <div className="relative min-h-[200px]">
      {submitted ? (
        <div className="text-green-600">✅ Prediction submitted!</div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md mx-auto flex flex-col items-center space-y-4"
        >
          <label htmlFor="prediction" className="text-lg font-medium">
            Your prediction in USD
          </label>
          <Input
            id="prediction"
            type="number"
            value={prediction}
            onChange={(e) => setPrediction(e.target.value)}
            placeholder="Eg: $168"
            className="w-full"
          />
          <Button
            type="submit"
            disabled={!prediction || isSending}
            className="w-full flex items-center justify-center space-x-2"
          >
            <Lock size={16} />
            <span>{isSending ? 'Encrypting…' : 'Encrypt Now'}</span>
          </Button>
        </form>
      )}

      {/* Loading overlay */}
      {(isChecking || isSending) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white bg-opacity-50 backdrop-blur-sm">
          <Loader2 className="animate-spin h-12 w-12" />
        </div>
      )}
    </div>
  );
}
