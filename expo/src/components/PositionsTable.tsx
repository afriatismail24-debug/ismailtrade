import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import type { Trade } from '@/types';

interface Props {
  trades: Trade[];
  onClose: (id: string) => void;
}

export function PositionsTable({ trades, onClose }: Props) {
  const openTrades = trades.filter((t) => t.status === 'open');

  return (
    <View className="bg-slate-900 rounded-xl border border-slate-800 p-4">
      <Text className="text-sm font-bold text-white mb-3">Active Positions</Text>
      {openTrades.length === 0 ? (
        <View className="items-center py-8">
          <Text className="text-slate-500 text-sm">No open positions</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View className="flex-row border-b border-slate-800 pb-2">
              <Text className="text-slate-400 text-[10px] font-medium w-20">Symbol</Text>
              <Text className="text-slate-400 text-[10px] font-medium w-12 text-right">Side</Text>
              <Text className="text-slate-400 text-[10px] font-medium w-16 text-right">Entry</Text>
              <Text className="text-slate-400 text-[10px] font-medium w-16 text-right">Current</Text>
              <Text className="text-slate-400 text-[10px] font-medium w-16 text-right">PnL $</Text>
              <Text className="text-slate-400 text-[10px] font-medium w-16 text-right">PnL %</Text>
              <Text className="text-slate-400 text-[10px] font-medium w-14 text-center">Action</Text>
            </View>
            {openTrades.map((t) => (
              <View key={t.id} className="flex-row border-b border-slate-800/50 py-2 items-center">
                <Text className="text-white text-[11px] font-medium w-20">{t.symbol}</Text>
                <View className="w-12 items-end">
                  <View className={`px-1.5 py-0.5 rounded ${t.side === 'long' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                    <Text className={`text-[10px] font-bold ${t.side === 'long' ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {t.side.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text className="text-slate-300 text-[11px] w-16 text-right">{t.entryPrice.toFixed(2)}</Text>
                <Text className="text-slate-300 text-[11px] w-16 text-right">{t.currentPrice.toFixed(2)}</Text>
                <Text className={`text-[11px] font-bold w-16 text-right ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}
                </Text>
                <Text className={`text-[11px] w-16 text-right ${t.pnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {t.pnlPct >= 0 ? '+' : ''}{t.pnlPct.toFixed(2)}%
                </Text>
                <TouchableOpacity
                  onPress={() => onClose(t.id)}
                  className="flex-row items-center gap-1 px-2 py-1 rounded bg-rose-600/80 w-14 justify-center"
                  activeOpacity={0.8}
                >
                  <X size={12} color="white" />
                  <Text className="text-white text-[10px] font-medium">Close</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
