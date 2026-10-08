import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Zap, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import type { MT5Config } from '@/types';

interface CopyEvent {
  id: string;
  time: number;
  action: 'BUY' | 'SELL';
  symbol: string;
  volume: number;
  status: 'success' | 'error';
  message: string;
}

interface Props {
  mt5Config: MT5Config;
  copySignals: boolean;
  copyEvents: CopyEvent[];
}

export function AutoCopyStatusPanel({ mt5Config, copySignals, copyEvents }: Props) {
  const connected = !!(mt5Config.metaapiToken && mt5Config.accountId);
  const recentEvents = copyEvents.slice(0, 5);

  return (
    <View className="bg-slate-900 rounded-xl border border-slate-800 p-4 gap-3">
      <View className="flex-row items-center gap-2">
        <Zap size={16} color="#38bdf8" />
        <Text className="text-sm font-bold text-white">MT5 Auto-Copy</Text>
        {copySignals && connected && (
          <View className="flex-row items-center gap-1 ml-auto">
            <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <Text className="text-[10px] text-emerald-400 font-medium">LIVE</Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center gap-2">
        {copySignals && connected ? (
          <View className="flex-row items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 flex-1">
            <CheckCircle2 size={14} color="#22c55e" />
            <Text className="text-[11px] text-emerald-400 flex-1">
              Auto-copying to MT5 {mt5Config.accountId.slice(0, 8)}...
            </Text>
          </View>
        ) : copySignals && !connected ? (
          <View className="flex-row items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5 flex-1">
            <AlertCircle size={14} color="#f59e0b" />
            <Text className="text-[11px] text-amber-400 flex-1">
              Waiting for MT5 connection — set up in API Config
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 flex-1">
            <AlertCircle size={14} color="#64748b" />
            <Text className="text-[11px] text-slate-400 flex-1">
              Auto-copy is OFF — enable in API Config
            </Text>
          </View>
        )}
      </View>

      {recentEvents.length > 0 ? (
        <View className="gap-1.5 pt-1 border-t border-slate-800">
          <Text className="text-[10px] text-slate-500 uppercase tracking-wider pt-1.5">Recent Auto-Copies</Text>
          {recentEvents.map((ev) => (
            <View key={ev.id} className="bg-slate-800/50 rounded-md px-2 py-1.5">
              <View className="flex-row items-center gap-2">
                {ev.action === 'BUY' ? (
                  <ArrowUpRight size={12} color="#22c55e" />
                ) : (
                  <ArrowDownRight size={12} color="#f43f5e" />
                )}
                <Text className={`text-[10px] font-bold ${ev.action === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {ev.action}
                </Text>
                <Text className="text-slate-300 text-[10px]">{ev.volume} lots {ev.symbol}</Text>
                <Text className={`text-[10px] ${ev.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {ev.status === 'success' ? 'OK' : 'FAIL'}
                </Text>
                <Text className="text-slate-500 text-[10px] ml-auto">
                  {new Date(ev.time).toLocaleTimeString()}
                </Text>
              </View>
              {ev.status === 'error' && ev.message && (
                <Text className="text-rose-400 text-[9px] leading-tight pl-5 mt-0.5">{ev.message}</Text>
              )}
            </View>
          ))}
        </View>
      ) : copySignals && connected ? (
        <Text className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
          No trades copied yet. When the engine opens or closes a position, it will appear here.
        </Text>
      ) : null}
    </View>
  );
}
