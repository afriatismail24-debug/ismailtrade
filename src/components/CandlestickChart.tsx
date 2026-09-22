import { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type Time,
} from 'lightweight-charts';
import type { Candle, Trade } from '@/types';

interface Props {
  candles: Candle[];
  liveMode: boolean;
  trades: Trade[];
}

export function CandlestickChart({ candles, liveMode, trades }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const lastTimeRef = useRef<number>(0);
  const priceLinesRef = useRef<Map<string, IPriceLine[]>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#334155', width: 1, style: 3 },
        horzLine: { color: '#334155', width: 1, style: 3 },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      borderVisible: false,
    });

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    volumeRef.current = volume;

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      priceLinesRef.current.clear();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !volumeRef.current || candles.length === 0) return;

    const lastCandle = candles[candles.length - 1];
    const isUpdate = lastCandle.time === lastTimeRef.current;

    const candleData = {
      time: lastCandle.time as Time,
      open: lastCandle.open,
      high: lastCandle.high,
      low: lastCandle.low,
      close: lastCandle.close,
    };

    const volData = {
      time: lastCandle.time as Time,
      value: lastCandle.volume,
      color: lastCandle.close >= lastCandle.open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
    };

    if (isUpdate) {
      seriesRef.current.update(candleData);
      volumeRef.current.update(volData);
    } else {
      const allCandles = candles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      const allVolumes = candles.map((c) => ({
        time: c.time as Time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
      }));
      seriesRef.current.setData(allCandles);
      volumeRef.current.setData(allVolumes);
      lastTimeRef.current = lastCandle.time;
      chartRef.current?.timeScale().fitContent();
    }

    if (!isUpdate) {
      lastTimeRef.current = lastCandle.time;
    }
  }, [candles]);

  // Sync price lines with open trades
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    const openTradeIds = new Set(trades.filter((t) => t.status === 'open').map((t) => t.id));
    const linesMap = priceLinesRef.current;

    // Remove lines for trades that are no longer open
    for (const [tradeId, lines] of linesMap) {
      if (!openTradeIds.has(tradeId)) {
        for (const line of lines) {
          series.removePriceLine(line);
        }
        linesMap.delete(tradeId);
      }
    }

    // Add or update lines for open trades
    for (const trade of trades) {
      if (trade.status !== 'open') continue;

      const existing = linesMap.get(trade.id);
      if (existing) {
        // Already has lines — update prices in place
        existing[0].applyOptions({
          price: trade.entryPrice,
          title: `ENTRY $${trade.entryPrice.toFixed(2)}`,
        });
        existing[1].applyOptions({
          price: trade.takeProfit,
          title: `TP $${trade.takeProfit.toFixed(2)}`,
        });
        existing[2].applyOptions({
          price: trade.stopLoss,
          title: `SL $${trade.stopLoss.toFixed(2)}`,
        });
        continue;
      }

      // Create three price lines for a newly opened trade
      const entryLine = series.createPriceLine({
        price: trade.entryPrice,
        color: '#3B82F6',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `ENTRY $${trade.entryPrice.toFixed(2)}`,
      });

      const tpLine = series.createPriceLine({
        price: trade.takeProfit,
        color: '#22C55E',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `TP $${trade.takeProfit.toFixed(2)}`,
      });

      const slLine = series.createPriceLine({
        price: trade.stopLoss,
        color: '#EF4444',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `SL $${trade.stopLoss.toFixed(2)}`,
      });

      linesMap.set(trade.id, [entryLine, tpLine, slLine]);
    }
  }, [trades]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
      <div className="absolute top-2 left-3 flex items-center gap-2 pointer-events-none">
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            liveMode
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-slate-700/50 text-slate-400 border border-slate-600/40'
          }`}
        >
          {liveMode ? 'LIVE BINANCE FEED' : 'SIMULATED'}
        </span>
        <span className="text-xs text-slate-400 font-medium">BTC/USDT</span>
      </div>
      {/* Legend for price lines */}
      <div className="absolute bottom-2 left-3 flex items-center gap-3 pointer-events-none text-[10px]">
        <span className="flex items-center gap-1 text-slate-400">
          <span className="w-4 h-0.5 bg-blue-500" /> Entry
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <span className="w-4 h-0.5 border-t border-dashed border-emerald-500" /> Take Profit
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <span className="w-4 h-0.5 border-t border-dashed border-rose-500" /> Stop Loss
        </span>
      </div>
    </div>
  );
}
