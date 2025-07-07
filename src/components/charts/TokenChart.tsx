/* components/charts/TokenChart.tsx */
"use client";

import { useEffect, useRef } from "react";
import { useActiveToken } from "@/hooks/useActiveToken";

const TV_SYMBOL: Record<string, string> = {
  BTC: "COINBASE:BTCUSD",
  ETH: "COINBASE:ETHUSD",
  SOL: "COINBASE:SOLUSD",
  ARB: "COINBASE:ARBUSD",
};

export default function TokenChart() {
  const { data: token, isLoading } = useActiveToken();
  const holderRef = useRef<HTMLDivElement>(null);
  const CONTAINER_ID = "tvchart";

  useEffect(() => {
    if (!token) return;

    if (holderRef.current) holderRef.current.innerHTML = "";

    const load = () =>
      new Promise<void>((done) => {
        if ((window as any).TradingView) return done();
        const s = document.createElement("script");
        s.src = "https://s3.tradingview.com/tv.js";
        s.onload = () => done();
        document.head.appendChild(s);
      });

    load().then(() => {
      const symbol = TV_SYMBOL[token.symbol] ?? "COINBASE:BTCUSD";

      const to   = Math.floor(Date.now() / 1000);
      const from = to - 7 * 24 * 60 * 60;             // now − 7 days

      // @ts-ignore – TV global injected by tv.js
      new window.TradingView.widget({
        container_id: CONTAINER_ID,
        symbol,
        interval: "60",                              // 2-hour candles
        timezone: "Etc/UTC",
        autosize: true,
        theme: "light",
        style: "1",

        timeframe: { from, to },

        /* ────── KEY TWEAK ────── */
        time_scale: { min_bar_spacing: 8 },           // ~82 bars ⇒ 7 days

        withdateranges: false,
        allow_symbol_change: false,
        save_image: false,

        disabled_features: [
          "chart_scroll",
          "chart_zoom",
          "mouse_wheel_scroll",
          "mouse_wheel_scale",
          "pressed_mouse_move_scroll",
          "horz_touch_drag_scroll",
          "pinch_scale",
          "timeframes_toolbar",
          "header_resolutions",
          "header_interval_dialog_button",
          "legend_inplace_edit",
          "show_interval_dialog_on_key_press",
        ],

        overrides: {
          "mainSeriesProperties.candleStyle.upColor":   "#16a34a",
          "mainSeriesProperties.candleStyle.downColor": "#dc2626",
          "mainSeriesProperties.candleStyle.borderUpColor":   "#16a34a",
          "mainSeriesProperties.candleStyle.borderDownColor": "#dc2626",
          "mainSeriesProperties.candleStyle.wickUpColor":     "#16a34a",
          "mainSeriesProperties.candleStyle.wickDownColor":   "#dc2626",
          "paneProperties.backgroundType": "solid",
          "paneProperties.background": "#ffffff",
          "paneProperties.vertGridProperties.color": "rgba(0,0,0,0.05)",
          "paneProperties.horzGridProperties.color": "rgba(0,0,0,0.05)",
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

  return <div ref={holderRef} id={CONTAINER_ID} className="w-full h-full" />;
}
