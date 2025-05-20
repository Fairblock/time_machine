'use client';
import Header from '@/components/header/Header';
import Image from 'next/image';
import SOLChart from '@/components/charts/SOLChart';
import CountdownTimer from '@/components/countdown-timer/CountdownTimer';
import PredictionForm from '@/components/forms/PredictionForm';
import { Button } from '@/components/ui/button';
import WinnerDisplay from '@/components/winner-display/WinnerDisplay';
import { fairyring } from '@/constant/chains';
import { PUBLIC_ENVIRONMENT } from '@/constant/env';
import {
  useAccount,
  useConnect,
  useSuggestChainAndConnect,
  WalletType,
} from 'graz';
import { useEffect } from 'react';
import { Copy } from 'lucide-react';


export default function Home() {
  const { isConnected, isConnecting } = useAccount();

  // wrap everything in a div so font-sans cascades
  return (
    <div className="font-sans">

      {!isConnecting && (
        <>
          <Header />

          <main className="flex flex-col items-center p-8 max-w-4xl mx-auto space-y-10 bg-gray-50">
            {/* Title (faded to 50%) */}
            <h1 className="text-4xl font-bold uppercase gradient-text">
              Predict the price of Solana
            </h1>

            {/* Chart Card */}
            <div className="bg-white rounded-2xl shadow p-6 w-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Image
                    src="/solana.png"
                    alt="Solana"
                    width={58}
                    height={58}
                  />
                  <span className="text-xl font-semibold">SOLANA</span>
                </div>
                <span className="text-gray-600">Current Price Chart</span>
              </div>
              <SOLChart />
            </div>

            {/* Prediction Form */}
            <PredictionForm
              label="Your prediction in USD"
              placeholder="Eg: $168"
              buttonText="Encrypt Now"
            />

            {/* Winner Display */}
            <CountdownTimer />
          </main>
        </>
      )}
    </div>
  );
}
