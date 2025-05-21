'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import 'chartjs-adapter-date-fns';
import { Chart } from 'react-chartjs-2';

import { getLastFridayStart, getOHLC } from '@/lib/utils';
import { useActiveToken } from '@/hooks/useActiveToken';
import { IPriceCandle } from '@/types/global';

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  CandlestickController,
  CandlestickElement
);

export default function TokenChart() {
  /* Which token are we working with? */
  const { data: token, isLoading: tokenLoading, isError: tokenErr } = useActiveToken();

  /* Price candles for that token */
  const {
    data: raw,
    isLoading: priceLoading,
    isError : priceErr,
  } = useQuery<IPriceCandle[]>({
    enabled  : !!token,                           // wait for token first
    queryKey : ['candles', token?.coingecko_id],
    queryFn  : async () => {
      const from  = getLastFridayStart().getTime();
      const to    = Date.now();
      const ohlc  = await getOHLC(from, to, token!.coingecko_id);
      return ohlc.map(([ts, o, h, l, c]) => ({ x: ts, o, h, l, c }));
    },
  });

  /* Loading / error states */
  if (tokenLoading || priceLoading) {
    return <p className="text-sm text-gray-500">Loading price chart…</p>;
  }
  if (tokenErr || priceErr || !raw?.length) {
    return <p className="text-sm text-red-500">Failed to load chart data</p>;
  }

  /* Normal render */
  const data = {
    datasets: [
      {
        label : `${token!.symbol} Price (USD)`,
        data  : raw,
        color : { up: '#16a34a', down: '#dc2626', unchanged: '#6b7280' },
      },
    ],
  };
  const options = {
    plugins: { legend: { position: 'top' as const } },
    scales : {
      x: { type: 'time' as const, time: { unit: 'hour' } },
      y: {
        ticks: { callback: (v: number) => `$${v.toFixed(2)}` },
        beginAtZero: false,
      },
    },
  };

  return <Chart type="candlestick" data={data} options={options} />;
}
