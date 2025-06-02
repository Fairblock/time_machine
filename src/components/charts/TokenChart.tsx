/* components/charts/TokenChart.tsx */
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
import {
  CandlestickController,
  CandlestickElement,
} from 'chartjs-chart-financial';
import 'chartjs-adapter-date-fns';
import { Chart } from 'react-chartjs-2';

import { getLastFridayStart, getOHLC } from '@/lib/utils';
import { useActiveToken } from '@/hooks/useActiveToken';
import type { IPriceCandle } from '@/types/global';

/* one‑time registry */
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
  const { data: token, isLoading: tokenLoading, isError: tokenErr } =
    useActiveToken();

  const {
    data: candles,
    isLoading: priceLoading,
    isError: priceErr,
  } = useQuery<IPriceCandle[]>({
    enabled: !!token,
    queryKey: ['candles', token?.coingecko_id],
    queryFn: async () => {
      const from = getLastFridayStart().getTime();
      const to = Date.now();
      const ohlc = await getOHLC(from, to, token!.coingecko_id);
      return ohlc.map(([ts, o, h, l, c]) => ({ x: ts, o, h, l, c }));
    },
  });

  if (tokenLoading || priceLoading) {
    return <p className="text-sm text-gray-500">Loading price chart…</p>;
  }
  if (tokenErr || priceErr || !candles?.length) {
    return <p className="text-sm text-gray-500">Loading price chart…</p>;
  }

  const data = {
    datasets: [
      {
        label: `${token!.symbol} Price (USD)`,
        data: candles,
        color: {
          up: '#16a34a',
          down: '#dc2626',
          unchanged: '#6b7280',
        },
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,          // let the wrapper dictate size
    layout: { padding: 8 },              // keep wicks off the border
    plugins: { legend: { position: 'top' as const } },
    scales: {
      x: { type: 'time' as const, time: { unit: 'hour' } },
      y: {
        ticks: { callback: (v: number) => `$${v.toFixed(2)}` },
        beginAtZero: false,
      },
    },
  };

  return (
    <div className="w-full h-full">
      <Chart
        type="candlestick"
        data={data}
        options={options}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
