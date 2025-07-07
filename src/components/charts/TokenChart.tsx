/* components/charts/TokenChart.tsx */
"use client";

import { useEffect, useRef } from "react";
import { useActiveToken } from "@/hooks/useActiveToken";

/* Map your token symbols → TradingView symbols */
const TV_SYMBOL: Record<string, string> = {
    BTC: "COINBASE:BTCUSD",  
    ETH: "COINBASE:ETHUSD",
    SOL: "COINBASE:SOLUSD",
    ARB: "COINBASE:ARBUSD",  
  };

export default function TokenChart() {
  const { data: token, isLoading } = useActiveToken();
  const id = "tvchart";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;

    /** Ensure tv.js is loaded only once */
    const ensureScript = () =>
      new Promise<void>((resolve) => {
        if ((window as any).TradingView) return resolve();
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/tv.js";
        script.onload = () => resolve();
        document.head.appendChild(script);
      });

    /** Initialise the widget */
    ensureScript().then(() => {
      const symbol = TV_SYMBOL[token.symbol] ?? "COINBASE:BTCUSD";

      // @ts-ignore TradingView injected globally by tv.js
      new window.TradingView.widget({
        container_id: id,
        symbol,
        interval: "60",
        timezone: "Etc/UTC",
        autosize: true,
        theme: "light",
        style: "1",                // candlesticks
        /* Toolbars & logo bar are kept (default = visible) */
        withdateranges: false,
        allow_symbol_change: false,
        save_image: false,

        overrides: {
          /* --- match your palette --- */
          "mainSeriesProperties.candleStyle.upColor": "#16a34a",
          "mainSeriesProperties.candleStyle.downColor": "#dc2626",
          "mainSeriesProperties.candleStyle.borderUpColor": "#16a34a",
          "mainSeriesProperties.candleStyle.borderDownColor": "#dc2626",
          "mainSeriesProperties.candleStyle.wickUpColor": "#16a34a",
          "mainSeriesProperties.candleStyle.wickDownColor": "#dc2626",
          /* --- background & subtle grid --- */
          "paneProperties.backgroundType": "solid",
          "paneProperties.background": "#ffffff",
          "paneProperties.vertGridProperties.color": "rgba(0,0,0,0.05)",
          "paneProperties.horzGridProperties.color": "rgba(0,0,0,0.05)",
          /* Less noisy legend */
          "paneProperties.legendProperties.showSeriesOHLC": false,
          "paneProperties.legendProperties.showVolume": false,
          "mainSeriesProperties.statusViewStyle.showInterval": false,
        },
      });
    });
  }, [token]);

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading price chart…</p>;
  }

  return <div ref={ref} id={id} className="w-full h-full" />;
}
