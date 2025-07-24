"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { nanoid } from "nanoid";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { FAIRYRING_ENV, PUBLIC_ENVIRONMENT } from "@/constant/env";
import { useClient } from "@/hooks/fairyring/useClient";
import { useKeysharePubKey } from "@/hooks/fairyring/useKeysharePubKey";
import {
  encryptSignedTx,
  signOfflineWithCustomNonce,
} from "@/services/fairyring/sign";
import { Amount } from "@/types/fairyring";
import { useAccount, WalletType, useOfflineSigners } from "graz";
import { Lock, Loader2, CircleX } from "lucide-react";
import { TxRaw, TxBody } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { MsgSubmitEncryptedTx } from "@/types/fairyring/codec/pep/tx";
import { Buffer } from "buffer";
import { useActiveToken } from "@/hooks/useActiveToken";
import { SigningStargateClient, StdFee } from "@cosmjs/stargate";
import { upsertProofAction } from "@/app/actions/upsertProof";

/* ───────── constants ────────────────────────────────────────────── */
const MEMO = "price-predict";
const PER_PAGE = 100;
const RPC = FAIRYRING_ENV.rpcURL.replace(/^ws/, "http");
const SHARE_URL = "https://twitter.com/intent/tweet";
const WRITE_PER_BYTE_GAS = 900;
const FALLBACK_GAS = 50_000_000;
const GAS_BUMP_FACTOR   = 1.5;
const GAS_BUMP_MIN_ADD  = 2_000_000;
const GAS_MAX_HARD_CAP  = 500_000_000;
const GAS_MAX_ATTEMPTS  = 10;
const LOW_GAS_PRICE_UFAIRY = 0.01;
const makeLowFee = (gas: number): StdFee => {
  const amt = Math.ceil(gas * LOW_GAS_PRICE_UFAIRY);
  return {
    amount: [{ denom: "ufairy", amount: String(amt) }],
    gas: String(gas),
  };
};
/* ───────── component ────────────────────────────────────────────── */

function isOutOfGas(rawLog?: string | null): boolean {
  if (!rawLog) return false;
  // cover common SDK strings
  return /out\s*of\s*gas/i.test(rawLog) ||
         /insufficient\s+gas/i.test(rawLog) ||
         /gas\s+wanted/i.test(rawLog) && /gas\s+used/i.test(rawLog);
}

function bumpGas(prev: number): number {
  const bumped = Math.ceil(prev * GAS_BUMP_FACTOR + GAS_BUMP_MIN_ADD);
  return Math.min(bumped, GAS_MAX_HARD_CAP);
}
export default function PredictionForm() {
  /* form / tx state */
  const [prediction, setPrediction] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [targetHeight, setTargetHeight] = useState<number | null>(null);
  const [encryptLockIcon, setEncryptLockIcon] = useState<boolean>(false);

  /* UX states */
  const [proofToken, setProofToken] = useState("");
  const [formError, setFormError] = useState<string | React.ReactNode | null>(null);
  // ─── TX lifecycle stages ─────────────────────────
  const [stage, setStage] = useState<
    | "idle"
    | "approve"
    | "sign"
    | "submit"
  >("idle");

  /* hooks */
  const { data: activeToken } = useActiveToken();
  const client = useClient();
  const { data: account, walletType, isConnected } = useAccount();
  const { data: offlineSignersData } = useOfflineSigners();
  const address = account?.bech32Address;
  const { data: pubkey } = useKeysharePubKey();

  /* ─── clear error when wallet changes ──────────────────────────── */
  useEffect(() => {
    setFormError(null);
  }, [address]);

  /* ─ upcoming deadline ─ */
  useEffect(() => {
    fetch("/api/deadline/next")
      .then((r) => r.json())
      .then(
        ({ nextDeadline }) =>
          nextDeadline?.target_block &&
          setTargetHeight(+nextDeadline.target_block)
      )
      .catch(console.error);
  }, []);

  /* ─ did I already submit for this deadline? ─ */
  useEffect(() => {
    setSubmitted(false);
    if (!address || targetHeight == null) {
      setIsChecking(false);
      return;
    }
    setIsChecking(true);

    let cancelled = false;
    (async () => {
      const last = await fetch("/api/deadline/last").then((r) => r.json());
      let lastH = Number(last?.lastDeadline?.target_block);
      if (!lastH) lastH = 333333;

      const q = encodeURIComponent(
        `tx.height>${lastH} AND message.action='/fairyring.pep.MsgSubmitEncryptedTx'`
      );

      let page = 1;
      while (!cancelled) {
        const res = await fetch(
          `${RPC}/tx_search?query=%22${q}%22&order_by=%22desc%22&per_page=${PER_PAGE}&page=${page}`
        ).then((r) => r.json());

        for (const row of res.result?.txs ?? []) {
          const raw = TxRaw.decode(Buffer.from(row.tx, "base64"));
            const body = TxBody.decode(raw.bodyBytes);

          const anyMsg = body.messages.find(
            (m) => m.typeUrl === "/fairyring.pep.MsgSubmitEncryptedTx"
          );
          if (!anyMsg) continue;

          const msg = MsgSubmitEncryptedTx.decode(new Uint8Array(anyMsg.value));
                  const txTarget = Number(
                      // `Long` → number (safe while heights < 2^53)
                      // fallback to `parseInt` covers string builds
                      (msg as any).targetBlockHeight ?? 0
                    );
            
            if (txTarget === targetHeight && msg.creator === address) {
            setSubmitted(true);
            return;
          }
        }
        if ((res.result?.txs ?? []).length < PER_PAGE) break;
        page += 1;
      }
    })().finally(() => !cancelled && setIsChecking(false));

    return () => {
      cancelled = true;
    };
  }, [address, targetHeight]);

  /* ─ submit encrypted tx ─ */
  async function submitOnChain(pred: number) {
    if (!address || !isConnected) {
      window.dispatchEvent(new Event("open-wallet-modal"));
      return;
    }
    if (typeof window !== "undefined" && (window as any).keplr) {
      const k = (window as any).keplr;
      k.defaultOptions = {
        ...(k.defaultOptions ?? {}),
        sign: {
          ...(k.defaultOptions?.sign ?? {}),
          preferNoSetFee: true,
          preferNoSetMemo: true,
        },
      };
    }
    if (targetHeight == null) return;

    setIsSending(true);
    
    setFormError(null);
    async function waitForWcSigner(timeoutMs = 10000): Promise<any> {
      const start = Date.now();
      while (true) {
        const signer = offlineSignersData?.offlineSignerAuto;
        if (signer) return signer;
        if (Date.now() - start > timeoutMs) {
          throw new Error("WC Keplr signer not ready");
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    
    try {
      const {
        data: { pep_nonce },
      } = await client.FairyringPep.query.queryPepNonce(address);
      let sent = 0;
      const {
        data: { encrypted_tx_array },
      } = await client.FairyringPep.query.queryEncryptedTxAll();
      encrypted_tx_array?.forEach((txs) =>
        txs.encrypted_txs?.forEach((tx) => tx.creator === address && sent++)
      );
      const nonce = pep_nonce?.nonce ? +pep_nonce.nonce + sent : sent;

      const amount: Amount[] = [{ denom: "ufairy", amount: "1" }];
      const payload = {
        amount,
        fromAddress: address,
        toAddress: PUBLIC_ENVIRONMENT.NEXT_PUBLIC_FAUCET_ADDRESS!,
      };
      const memo = JSON.stringify({
        tag: MEMO,
        memo: { prediction: pred },
        payload,
      });
      const sendMsg = client.CosmosBankV1Beta1.tx.msgSend({ value: payload });

      let estimatedGas = FALLBACK_GAS;
      try {
        const sim = (client as any).CosmosTxV1Beta1?.query?.simulate;
        if (typeof sim === "function") {
          const res = await sim({
            tx: { body: { messages: [sendMsg], memo }, signatures: [] },
          });
          if (res?.gasInfo?.gasUsed) {
            estimatedGas = Math.ceil(Number(res.gasInfo.gasUsed) * 1.3);
          }
        }
      } catch (e) {
        console.warn("gas simulation failed, using fallback", e);
      }

      setStage("approve");
      const isWcKeplr = walletType === WalletType.WC_KEPLR_MOBILE;
      let signed: Buffer;
      if (isWcKeplr) {
        const offlineSigner = await waitForWcSigner();   // waits up to ~10s
      const fee: StdFee = makeLowFee(estimatedGas);

      const sc = await SigningStargateClient.connectWithSigner(
        FAIRYRING_ENV.rpcURL,
        offlineSigner
      );

      const signedTxRaw = await sc.sign(address, [sendMsg], fee, memo);
     signed = Buffer.from(TxRaw.encode(signedTxRaw).finish());
      } else {
        signed = await signOfflineWithCustomNonce(
          address,
          FAIRYRING_ENV.rpcURL,
          FAIRYRING_ENV.chainID,
          [sendMsg],
          makeLowFee(estimatedGas),
          memo,
          nonce,
          walletType!
        );
      }
      setStage("sign");
      let key = (pubkey as any).active_pubkey?.public_key;
      if (targetHeight > Number((pubkey as any).active_pubkey?.expiry)) {
        key = (pubkey as any).queued_pubkey?.public_key;
      }
      console.log("key:", key, "target height:", targetHeight, signed);
      const encryptedHex = await encryptSignedTx(key, targetHeight, signed);

      const bytesToWrite = encryptedHex.length / 2;
      const submitGas = Math.max(
        estimatedGas,
        Math.ceil((bytesToWrite * WRITE_PER_BYTE_GAS + 200_000)*2)
      );

      
      const txResult = await client.FairyringPep.tx.sendMsgSubmitEncryptedTx({
        value: {
          creator: address,
          data: encryptedHex,
          targetBlockHeight: targetHeight,
        },
        fee: makeLowFee(submitGas),
        memo: MEMO,
      });
      setStage("submit");
     // Auto gas-bump retry loop ------------------------------------------
let attempt = 1;
let gasToUse = submitGas;
let lastErr: any = null;

while (true) {
  console.info(`[submitEncryptedTx] attempt ${attempt} gas=${gasToUse}`);
  const res = attempt === 1
    ? txResult // we already did first network call above
    : await client.FairyringPep.tx.sendMsgSubmitEncryptedTx({
        value: {
          creator: address,
          data: encryptedHex,
          targetBlockHeight: targetHeight,
        },
        fee: makeLowFee(gasToUse),
        memo: MEMO,
      });

  if (!res.code || res.code === 0) {
    // success!
    setFormError(null);
    break;
  }

  if (!isOutOfGas(res.rawLog)) {
    // hard failure — not gas related
    lastErr = new Error(res.rawLog);
    break;
  }

        // Look for `gasWanted:` in raw log and jump straight there (+15 %)
        console.warn(res.rawLog);
        const mW = /gasWanted:\s*"?(\d+)/i.exec(res.rawLog ?? "");
        const mU = /gasUsed:\s*"?(\d+)/i.exec(res.rawLog ?? "");
        const wanted = mW ? Number(mW[1]) : null;
        const used   = mU ? Number(mU[1]) : null;
        
        let nextGas = bumpGas(gasToUse);        // default fallback
        const base  = Math.max(wanted ?? 0, used ?? 0);
        if (base && base > gasToUse) {
          // jump straight to 30 % above the larger of gasUsed / gasWanted
          nextGas = Math.ceil(base * 1.05);
        }

        if (nextGas === gasToUse || attempt >= GAS_MAX_ATTEMPTS) {
          lastErr = new Error(
            `Out of gas after ${attempt} attempts (last gas=${gasToUse}). RawLog: ${res.rawLog}`
          );
          break;
        }

        console.warn(
          `[submitEncryptedTx] out of gas; bumping to ${nextGas}…`
        );
        setFormError(
          `Busy network, automatically retrying with higher gas limit…`
        );
        gasToUse = nextGas;
        attempt += 1;
        continue;
      }

      if (lastErr) {
        throw lastErr;
      }

      const newToken = nanoid(8);
      const res = await upsertProofAction({
        wallet: address,
        token: newToken,
      });

      if (!res.ok) throw new Error(res.reason ?? "failed to create proof‑token");

      setProofToken(newToken);
      setSubmitted(true);
      setShowModal(true);
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (/invalid target block height/i.test(msg)) {
        setFormError("Deadline block height is already reached. Please wait for the next token.");
      } else if (/insufficien/i.test(msg) || /does not exist on chain/i.test(msg)) {
        setFormError(
          <p className="text-red-500">
            Insufficient testnet tokens, get some from the{" "}
            <a
              href="https://testnet-faucet.fairblock.network/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              faucet
            </a>
            .
          </p>
        );
      } else {
        if (isOutOfGas(msg)) 
          {
            setFormError("Transaction failed due to insufficient gas. Please try again with a higher gas limit.");
          }
        
      else if (/Transaction declined/i.test(msg)) {
        setFormError("Transaction declined. Please try again in a few seconds.");
      }
      else 
        setFormError("Transaction failed. Please try again.");
      }
      console.error("Submission failed:", err);
      setSubmitted(false);
    } finally {
      setIsSending(false);
      setStage("idle");
    }
  }

  /* ─ form handler ─ */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitOnChain(parseFloat(prediction));
  };

  /* ─ tweet modal ─ */
  const tweetText = encodeURIComponent(
    `BREAKING: Man time travels to 2026, returns with ${activeToken?.symbol ?? ""} price, and encrypts it so no one can copy him.
Is this legal? Is this alpha? Who knows.
Try free time travelling before they patch the glitch: https://timemachine.fairblock.network/

Proof → ${proofToken}`
  );
  const tweetUrl = `${SHARE_URL}?text=${tweetText}`;

  const Modal = () => (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40"
      onClick={() => setShowModal(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-xl px-10 py-12 w-[90%] max-w-md text-center space-y-8"
      >
        <button
          onClick={() => setShowModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <CircleX size={22} />
        </button>

        <div
          className="absolute inset-0 pointer-events-none
                        bg-[url('/stars.png')] bg-contain bg-center filter grayscale"
        />

        <div className="relative z-10">
          <Image
            src="/x-logo.png"
            alt="X logo"
            width={160}
            height={160}
            className="mx-auto"
          />
        </div>

        <div className="relative z-10 space-y-2">
          <p className="text-lg font-medium">Prediction encrypted</p>
          <p className="text-xl">
            Share on&nbsp;<span className="font-bold">X</span>&nbsp;to&nbsp;
            <span className="font-bold text-black">earn 200&nbsp;points!</span>
          </p>
          <p className="text-sm text-gray-600">
            Your proof‑token:&nbsp;
            <code className="px-1 bg-gray-100 rounded">{proofToken}</code>
          </p>
        </div>

        <Link
          href={tweetUrl}
          target="_blank"
          className="relative z-10 inline-block bg-black text-white px-8 py-3 rounded-xl font-medium hover:bg-gray-900 transition-colors"
        >
          Share on X
        </Link>
      </div>
    </div>
  );

  /* ─ render ─ */
  return (
    <div className="relative min-w-64">
      {formError && (
        <div className="text-red-600 text-center mb-4">{formError}</div>
      )}

      {submitted ? (
        <div className="bg-[#686363] cursor-not-allowed flex gap-3 items-center justify-center py-2 rounded-xl text-white text-sm text-center">
          <img
            className="relative -top-[1px] w-4"
            src="/prediction-locked.png"
            alt=""
          />{" "}
          Prediction Encrypted!
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md mx-auto flex flex-col items-center space-y-4"
        >
          <Input
            id="prediction"
            type="text"
            pattern="[0-9]*[.]?[0-9]*"
            inputMode="decimal"
            value={prediction}
            onChange={(e) => setPrediction(e.target.value)}
            placeholder="E.g. 168.50"
            className="w-full"
            min={0}
          />
          {!isSending && (
          <Button
            type="submit"
            disabled={address ? !prediction : false}
            onClick={() => setStage("approve")}
            className="w-full flex items-center justify-center space-x-2"
          >
            {address && isSending && encryptLockIcon ? (
              <img className="w-4" src="/prediction-locked.png" alt="" />
            ) : (
              <img className="w-4" src="/prediction-unlocked.png" alt="" />
            )}
            <span>
              {address
                ? isSending
                  ? stage === "approve"
                    ? "Approve Transaction"
                    : stage === "sign"
                    ? "Sign Transaction"
                    : stage === "submit"
                    ? "Submitting..."
                    : "Submitting..."
                  : "Encrypt Now"
                : "Connect Wallet"}
            </span>
          </Button>
          )}
        </form>
      )}

      {(isChecking || isSending) && (
        <div className="absolute cursor-not-allowed inset-0 z-10 flex gap-2 items-center justify-center border border-neutral-200 bg-[#686363] w-full h-10 rounded-xl top-12 text-white text-sm">
          <Loader2 className="h-5 w-5 animate-spin" />{" "}
          {stage === "approve"
            ? "Approve Transaction"
            : stage === "sign"
            ? "Sign Transaction"
            : stage === "submit"
            ? "Submitting..."
            : "Running security checks..."}
        </div>
      )}
      {showModal && <Modal />}
    </div>
  );
}