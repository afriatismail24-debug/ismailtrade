import { View, Text } from 'react-native';
import { Activity, TrendingUp, Grid3x3 } from 'lucide-react-native';
import { TIERS } from '@/lib/tradingEngine';
import type { StrategyTier } from '@/types';

interface Props {
  activeTier: StrategyTier;
  balance: number;
}

export function StrategyControlPanel({ activeTier, balance }: Props) {
  return (
    <View className="bg-slate-900 rounded-xl border border-slate-800 p-4">
      <View className="flex-row items-center gap-2 mb-3">
        <Activity size={16} color="#38bdf8" />
        <Text className="text-sm font-bold text-white">Strategy Control Panel</Text>
      </View>
      <View className="gap-3">
        {TIERS.map((t) => {
          const isActive = activeTier === t.tier;
          const inRange = balance >= t.min && balance < t.max;

          let Icon = TrendingUp;
          if (t.tier === 'tier1') Icon = Activity;
          if (t.tier === 'tier3') Icon = Grid3x3;

          return (
            <View
              key={t.tier}
              className={`rounded-lg border p-3 ${
                isActive
                  ? 'border-sky-500 bg-sky-500/10'
                  : inRange
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-slate-700 bg-slate-800/40'
              }`}
            >
              {isActive && (
                <View className="absolute -top-2 left-3 px-2 py-0.5 rounded-full bg-sky-500">
                  <Text className="text-white text-[9px] font-bold uppercase tracking-wider">Active</Text>
                </View>
              )}
              <View className="flex-row items-center gap-2 mb-2">
                <View
                  className={`w-8 h-8 rounded-lg items-center justify-center ${
                    isActive ? 'bg-sky-500/20' : 'bg-slate-700/50'
                  }`}
                >
                  <Icon size={16} color={isActive ? '#38bdf8' : '#94a3b8'} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-white">{t.label}</Text>
                  <Text className="text-[10px] text-slate-400">
                    ${t.min} – {t.max === Infinity ? '$∞' : `$${t.max}`}
                  </Text>
                </View>
              </View>
              <Text className="text-[11px] text-slate-300 mb-2">{t.strategyName}</Text>
              <View className="gap-1">
                <Text className="text-[10px] text-slate-400">TP: +{(t.params.takeProfitPct * 100).toFixed(2)}%</Text>
                <Text className="text-[10px] text-slate-400">SL: -{(t.params.stopLossPct * 100).toFixed(2)}%</Text>
                <Text className="text-[10px] text-slate-400">Max Positions: {t.params.maxConcurrent}</Text>
                {t.params.trailingStopCallbackPct && (
                  <Text className="text-[10px] text-slate-400">Trailing: {(t.params.trailingStopCallbackPct * 100).toFixed(1)}% callback</Text>
                )}
                {t.params.reinvest && <Text className="text-[10px] text-emerald-400">Profit Reinvestment: ON</Text>}
              </View>
              <Text className="text-[10px] text-slate-500 mt-2 italic">{t.params.description}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
