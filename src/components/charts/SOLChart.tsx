'use client';

import { useQuery } from '@tanstack/react-query';
import { Chart as ChartJS, CategoryScale, LinearScale, TimeScale, Tooltip, Legend } from 'chart.js';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import 'chartjs-adapter-date-fns';
import { Chart } from 'react-chartjs-2';
import { getLastFridayStart, getOHLC } from '@/lib/utils'; // assume getOHLC gives you [ts, o, h, l, c][]
import { IPriceCandle } from '@/types/global';           // define this type below

// register the controllers & scales
ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  CandlestickController,
  CandlestickElement
);

// shape of each candle


export default function SOLChart() {
  const { data: raw, isLoading, isError } = useQuery<IPriceCandle[]>({
    queryKey: ['sol-candles'],
    queryFn: async () => {
      const from = getLastFridayStart().getTime();
      const to = Date.now();
      // your OHLC fetch; returns [[ts, open, high, low, close], ...]
      const ohlc = await getOHLC(from, to, 'solana');
      return ohlc.map(([ts, o, h, l, c]) => ({ x: ts, o, h, l, c }));
    },
  });

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading price chart…</div>;
  }
  if (isError || !raw?.length) {
    return <div className="text-sm text-red-500">Failed to load chart data</div>;
  }

  const data = {
    datasets: [
      {
        label: 'SOL Price (USD)',
        data: raw,
        // you can customize colors here
        color: { up: '#16a34a', down: '#dc2626', unchanged: '#6b7280' },
      },
    ],
  };

  const options = {
    plugins: {
      legend: { position: 'top' as const },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: { unit: 'hour' },
        adapters: { date: { locale: undefined } },
      },
      y: {
        beginAtZero: false,
        ticks: { callback: (v: number) => `$${v.toFixed(2)}` },
      },
    },
  };

  return <Chart type="candlestick" data={data} options={options} />;
}
