import { useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Line, Rect, Text as SvgText, Rect as SvgRect } from 'react-native-svg';
import type { Candle, Trade } from '@/types';

interface Props {
  candles: Candle[];
  liveMode: boolean;
  trades: Trade[];
}

const CHART_HEIGHT = 300;

export function CandlestickChart({ candles, liveMode, trades }: Props) {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32;
  const padding = { top: 20, right: 60, bottom: 20, left: 8 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = CHART_HEIGHT - padding.top - padding.bottom;

  const { minPrice, maxPrice, visibleCandles, priceLines } = useMemo(() => {
    const recent = candles.slice(-60);
    if (recent.length === 0) {
      return { minPrice: 0, maxPrice: 1, visibleCandles: [], priceLines: [] };
    }

    const openTrades = trades.filter((t) => t.status === 'open');
    const tradePrices = openTrades.flatMap((t) => [t.entryPrice, t.takeProfit, t.stopLoss]);
    const candleHighs = recent.map((c) => c.high);
    const candleLows = recent.map((c) => c.low);
    const allPrices = [...candleHighs, ...candleLows, ...tradePrices];
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const range = max - min || 1;
    const paddedMin = min - range * 0.05;
    const paddedMax = max + range * 0.05;

    const lines = openTrades.map((t) => ({
      entry: t.entryPrice,
      tp: t.takeProfit,
      sl: t.stopLoss,
      id: t.id,
    }));

    return { minPrice: paddedMin, maxPrice: paddedMax, visibleCandles: recent, priceLines: lines };
  }, [candles, trades]);

  if (visibleCandles.length === 0) {
    return (
      <View style={{ height: CHART_HEIGHT }} className="items-center justify-center">
        <Text className="text-slate-600 text-sm">Loading chart...</Text>
      </View>
    );
  }

  const candleWidth = plotWidth / visibleCandles.length;
  const bodyWidth = Math.max(2, candleWidth * 0.7);

  const priceToY = (price: number) => {
    return padding.top + ((maxPrice - price) / (maxPrice - minPrice)) * plotHeight;
  };

  const priceLabels: number[] = [];
  for (let i = 0; i <= 4; i++) {
    priceLabels.push(minPrice + (i / 4) * (maxPrice - minPrice));
  }

  return (
    <View style={{ height: CHART_HEIGHT }}>
      <View className="absolute top-2 left-3 flex-row items-center gap-2 z-10">
        <View className={`px-2 py-0.5 rounded-full ${liveMode ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-slate-700/50 border border-slate-600/40'}`}>
          <Text className={`text-[10px] font-bold ${liveMode ? 'text-emerald-300' : 'text-slate-400'}`}>
            {liveMode ? 'LIVE GOLD FEED' : 'SIMULATED'}
          </Text>
        </View>
        <Text className="text-xs text-slate-400 font-medium">XAU/USD (Gold)</Text>
      </View>

      <Svg width={chartWidth} height={CHART_HEIGHT}>
        {priceLabels.map((p, i) => {
          const y = priceToY(p);
          return (
            <View key={i}>
              <Line
                x1={padding.left}
                y1={y}
                x2={padding.left + plotWidth}
                y2={y}
                stroke="#1e293b"
                strokeWidth={1}
              />
              <SvgText
                x={chartWidth - padding.right + 4}
                y={y + 3}
                fill="#64748b"
                fontSize={9}
              >
                {p.toFixed(2)}
              </SvgText>
            </View>
          );
        })}

        {visibleCandles.map((c, i) => {
          const x = padding.left + i * candleWidth + candleWidth / 2;
          const isUp = c.close >= c.open;
          const color = isUp ? '#22c55e' : '#ef4444';
          const bodyTop = priceToY(isUp ? c.close : c.open);
          const bodyBottom = priceToY(isUp ? c.open : c.close);
          const bodyH = Math.max(1, bodyBottom - bodyTop);

          return (
            <View key={i}>
              <Line
                x1={x}
                y1={priceToY(c.high)}
                x2={x}
                y2={priceToY(c.low)}
                stroke={color}
                strokeWidth={1}
              />
              <SvgRect
                x={x - bodyWidth / 2}
                y={bodyTop}
                width={bodyWidth}
                height={bodyH}
                fill={color}
                rx={1}
              />
            </View>
          );
        })}

        {priceLines.map((pl) => {
          const entryY = priceToY(pl.entry);
          const tpY = priceToY(pl.tp);
          const slY = priceToY(pl.sl);
          return (
            <View key={pl.id}>
              <Line
                x1={padding.left}
                y1={entryY}
                x2={padding.left + plotWidth}
                y2={entryY}
                stroke="#3B82F6"
                strokeWidth={2}
              />
              <Line
                x1={padding.left}
                y1={tpY}
                x2={padding.left + plotWidth}
                y2={tpY}
                stroke="#22C55E"
                strokeWidth={1}
                strokeDasharray="4,2"
              />
              <Line
                x1={padding.left}
                y1={slY}
                x2={padding.left + plotWidth}
                y2={slY}
                stroke="#EF4444"
                strokeWidth={1}
                strokeDasharray="4,2"
              />
            </View>
          );
        })}
      </Svg>

      <View className="absolute bottom-1 left-3 flex-row items-center gap-3">
        <View className="flex-row items-center gap-1">
          <View className="w-4 h-0.5 bg-blue-500" />
          <Text className="text-slate-400 text-[10px]">Entry</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="w-4 h-0.5 bg-emerald-500" />
          <Text className="text-slate-400 text-[10px]">TP</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="w-4 h-0.5 bg-rose-500" />
          <Text className="text-slate-400 text-[10px]">SL</Text>
        </View>
      </View>
    </View>
  );
}
