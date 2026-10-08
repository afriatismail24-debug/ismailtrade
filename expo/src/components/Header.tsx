import { View, Text, TouchableOpacity } from 'react-native';
import { Radio, AlertTriangle } from 'lucide-react-native';
import type { Mode } from '@/types';

interface Props {
  mode: Mode;
  running: boolean;
  balance: number;
  equity: number;
  activeTier: string;
  panicSell: () => void;
}

const tierLabels: Record<string, string> = {
  tier1: 'Tier 1 Micro Scalper',
  tier2: 'Tier 2 MA Crossover',
  tier3: 'Tier 3 Confluence + Grid',
  none: 'Idle',
};

export function Header({ mode, running, balance, equity, activeTier, panicSell }: Props) {
  const modeLabel = mode === 'paper' ? 'PAPER' : mode === 'testnet' ? 'TESTNET' : 'LIVE';
  const modeColor =
    mode === 'paper'
      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
      : mode === 'testnet'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

  return (
    <View className="border-b border-slate-800 bg-slate-900/80 px-4 py-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <View className="w-9 h-9 rounded-lg bg-sky-500 items-center justify-center">
            <Radio size={20} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-white">AutoTrade Bot</Text>
            <Text className="text-[10px] text-slate-400">Automated Strategy Router</Text>
          </View>
        </View>

        <View className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border ${modeColor}`}>
          <View className={`w-2 h-2 rounded-full ${running ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          <Text className="text-xs font-semibold">{modeLabel} {running ? 'ON' : 'OFF'}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mt-3">
        <View className="flex-row items-center gap-3">
          <View>
            <Text className="text-[10px] text-slate-400 uppercase tracking-wider">Balance</Text>
            <Text className="text-lg font-bold text-white">${balance.toFixed(2)}</Text>
          </View>
          <View className="border-l border-slate-700 pl-3">
            <Text className="text-[10px] text-slate-400 uppercase tracking-wider">Equity</Text>
            <Text className="text-lg font-bold text-emerald-400">${equity.toFixed(2)}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[10px] text-slate-400 uppercase tracking-wider">Strategy</Text>
            <Text className="text-xs font-semibold text-sky-300">{tierLabels[activeTier] ?? 'Idle'}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={panicSell}
          className="flex-row items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600"
          activeOpacity={0.8}
        >
          <AlertTriangle size={16} color="white" />
          <Text className="text-white text-xs font-bold">PANIC</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
