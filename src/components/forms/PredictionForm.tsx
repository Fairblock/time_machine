/* app/prediction/page.tsx */
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link  from 'next/link';
import { nanoid } from 'nanoid';

import { Button } from '@/components/ui/button';
import { Input  } from '@/components/ui/input';

import { FAIRYRING_ENV, PUBLIC_ENVIRONMENT } from '@/constant/env';
import { useClient }           from '@/hooks/fairyring/useClient';
import { useKeysharePubKey }   from '@/hooks/fairyring/useKeysharePubKey';
import { encryptSignedTx, signOfflineWithCustomNonce } from '@/services/fairyring/sign';
import { Amount } from '@/types/fairyring';
import { useAccount } from 'graz';
import { Lock, Loader2, X as CloseIcon } from 'lucide-react';
import { TxRaw, TxBody } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { MsgSubmitEncryptedTx } from '@/types/fairyring/codec/pep/tx';
import { Buffer } from 'buffer';
import { useActiveToken } from '@/hooks/useActiveToken';

/* ───────── constants ────────────────────────────────────────────── */
const MEMO      = 'price-predict';
const PER_PAGE  = 100;
const RPC       = FAIRYRING_ENV.rpcURL.replace(/^ws/, 'http');
const SHARE_URL = 'https://twitter.com/intent/tweet';

/* ───────── component ────────────────────────────────────────────── */
export default function PredictionForm() {
  /* form / tx state */
  const [prediction,   setPrediction]   = useState('');
  const [submitted,    setSubmitted]    = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [isSending,    setIsSending]    = useState(false);
  const [isChecking,   setIsChecking]   = useState(true);
  const [targetHeight, setTargetHeight] = useState<number | null>(null);

  /* UX states */
  const [proofToken, setProofToken] = useState('');
  const [formError,  setFormError]  = useState<string|null>(null);      // ← NEW

  /* hooks */
  const { data: activeToken } = useActiveToken();
  const client                = useClient();
  const { data: account }     = useAccount();
  const address               = account?.bech32Address;
  const { data: pubkey }      = useKeysharePubKey();

  /* ─ upcoming deadline ─ */
  useEffect(() => {
    fetch('/api/deadline/next')
      .then(r => r.json())
      .then(({ nextDeadline }) =>
        nextDeadline?.target_block && setTargetHeight(+nextDeadline.target_block)
      )
      .catch(console.error);
  }, []);

  /* ─ did I already submit for this deadline? ─ */
  useEffect(() => {
    setSubmitted(false);
    if (!address || targetHeight == null) { setIsChecking(false); return; }
    setIsChecking(true);

    let cancelled = false;
    (async () => {
      const last  = await fetch('/api/deadline/last').then(r => r.json());
      const lastH = Number(last?.lastDeadline?.target_block);
      if (!lastH) return;

      const q = encodeURIComponent(
        `tx.height>${lastH} AND message.action='/fairyring.pep.MsgSubmitEncryptedTx'`
      );

      let page = 1;
      while (!cancelled) {
        const res = await fetch(
          `${RPC}/tx_search?query=%22${q}%22&order_by=%22desc%22&per_page=${PER_PAGE}&page=${page}`
        ).then(r => r.json());

        for (const row of res.result?.txs ?? []) {
          const raw  = TxRaw.decode(Buffer.from(row.tx, 'base64'));
          const body = TxBody.decode(raw.bodyBytes);

          const anyMsg = body.messages.find(
            m => m.typeUrl === '/fairyring.pep.MsgSubmitEncryptedTx'
          );
          if (!anyMsg) continue;

          const msg = MsgSubmitEncryptedTx.decode(new Uint8Array(anyMsg.value));
          if (msg.targetBlockHeight === targetHeight && msg.creator === address) {
            setSubmitted(true);
            return;
          }
        }
        if ((res.result?.txs ?? []).length < PER_PAGE) break;
        page += 1;
      }
    })().finally(() => !cancelled && setIsChecking(false));

    return () => { cancelled = true };
  }, [address, targetHeight]);

  /* ─ submit encrypted tx ─ */
  async function submitOnChain(pred: number) {
    if (!address || targetHeight == null) return;
    setIsSending(true);
    setFormError(null);
  
    try {
      /* nonce helper (unchanged) */
      const { data: { pepNonce } } = await client.FairyringPep.query.queryPepNonce(address);
      let sent = 0;
      const { data: { encryptedTxArray } } = await client.FairyringPep.query.queryEncryptedTxAll();
      encryptedTxArray?.forEach(txs =>
        txs.encryptedTx?.forEach(tx => tx.creator === address && sent++)
      );
      const nonce = pepNonce?.nonce ? +pepNonce.nonce + sent : sent;
  
      /* build send‑msg */
      const amount: Amount[] = [{ denom: 'ufairy', amount: '1' }];
      const payload = { amount, fromAddress: address,
                        toAddress: PUBLIC_ENVIRONMENT.NEXT_PUBLIC_FAUCET_ADDRESS! };
      const memo    = JSON.stringify({ tag: MEMO, memo: { prediction: pred }, payload });
      const sendMsg = client.CosmosBankV1Beta1.tx.msgSend({ value: payload });
  
      /* ──────────────────────────────────────────────────────
         1️⃣  GAS ESTIMATION
         The Ignite SDK sometimes exposes CosmosTxV1Beta1.query.simulate,
         but to stay type‑safe we access it dynamically and fall back to
         a default if it’s missing or the RPC errors out.
      ────────────────────────────────────────────────────── */
      let estimatedGas = 500_000;      // sane default
      try {
        const sim = (client as any).CosmosTxV1Beta1?.query?.simulate;
        if (typeof sim === 'function') {
          const res = await sim({
            // the exact field names depend on the proto; this works for
            // most generated clients
            tx: {
              body: { messages: [sendMsg], memo },
              signatures: [],
            },
          });
          if (res?.gasInfo?.gasUsed) {
            estimatedGas = Math.round(Number(res.gasInfo.gasUsed) * 1.3); // 30 % buffer
          }
        }
      } catch (e) {
        console.warn('gas simulation failed, using default', e);
      }
  
      /* 2️⃣  sign with estimated gas */
      const signed = await signOfflineWithCustomNonce(
        address,
        FAIRYRING_ENV.rpcURL,
        FAIRYRING_ENV.chainID,
        [sendMsg],
        { amount: [{ denom: 'ufairy', amount: '0' }], gas: String(estimatedGas) },
        memo,
        nonce
      );
  
      /* encrypt & broadcast */
      const key = (pubkey as any).activePubKey?.publicKey ??
                  (pubkey as any).queuedPubKey.publicKey;
      const encryptedHex = await encryptSignedTx(key, targetHeight, signed);
      const txResult = await client.FairyringPep.tx.sendMsgSubmitEncryptedTx({
        value: { creator: address, data: encryptedHex, targetBlockHeight: targetHeight },
        fee  : { amount: [{ denom: 'ufairy', amount: '0' }], gas: String(estimatedGas) },
        memo : MEMO,
      });
      if (txResult.code) throw new Error(txResult.rawLog);
  
      /* proof‑token (unchanged) */
      const newToken = nanoid(8);
      const res = await fetch('/api/twitter/proof', {
        method : 'POST',
        headers: { 'Content-Type':'application/json' },
        body   : JSON.stringify({ wallet: address, token: newToken })
      });
      if (!res.ok) throw new Error('failed to create proof‑token');
  
      setProofToken(newToken);
      setSubmitted(true);
      setShowModal(true);
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (/insufficien/i.test(msg) || /does not exist on chain/i.test(msg)) {
        setFormError('Insufficient testnet tokens, get some from the faucet.');
      } else {
        setFormError('Transaction failed. Please try again.');
      }
      console.error('Submission failed:', err);
      setSubmitted(false);
    } finally {
      setIsSending(false);
    }
  }

  /* ─ form handler ─ */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitOnChain(parseFloat(prediction));
  };

  /* ─ tweet modal ─ */
  const tweetText = encodeURIComponent(
    `I just encrypted my ${activeToken?.symbol ?? ''} price prediction on @0xfairblock. ` +
    `Proof→${proofToken}  Join the weekly game and earn points!`
  );
  const tweetUrl = `${SHARE_URL}?text=${tweetText}&url=${encodeURIComponent('https://timemachine.fairblock.network')}`;

  const Modal = () => (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40"
         onClick={() => setShowModal(false)}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-lg px-10 py-12 w-[90%] max-w-md text-center space-y-8"
      >
        <button onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <CloseIcon size={18} />
        </button>

        <div className="absolute inset-0 pointer-events-none
                        bg-[url('/stars.png')] bg-contain bg-center" />

        <div className="relative z-10">
          <Image src="/x-logo.png" alt="X logo"
                 width={160} height={160} className="mx-auto" />
        </div>

        <div className="relative z-10 space-y-2">
          <p className="text-lg font-medium">Prediction encrypted</p>
          <p className="text-xl">
            Share on&nbsp;<span className="font-bold">X</span>&nbsp;to&nbsp;
            <span className="font-bold text-indigo-600">earn 200&nbsp;points!</span>
          </p>
          <p className="text-sm text-gray-600">
            Your proof‑token:&nbsp;
            <code className="px-1 bg-gray-100 rounded">{proofToken}</code>
          </p>
        </div>

        <Link
          href={tweetUrl}
          target="_blank"
          className="relative z-10 inline-block bg-black text-white
                     px-8 py-3 rounded-md font-semibold hover:bg-gray-900
                     transition-colors"
        >
          Share on X
        </Link>
      </div>
    </div>
  );

  /* ─ render ─ */
  return (
    <div className="relative">
      {formError && (
        <div className="text-red-600 text-center mb-4">{formError}</div>
      )}

      {submitted ? (
        <div className="text-green-600 text-center">Prediction submitted!</div>
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
            placeholder="Eg: 168"
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

      {(isChecking || isSending) && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#F2F4F3]">
          <Loader2 className="h-10 w-10 animate-spin text-gray-600" />
        </div>
      )}

      {showModal && <Modal />}
    </div>
  );
}
