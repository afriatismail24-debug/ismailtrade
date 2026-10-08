import { useEffect, useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Terminal } from 'lucide-react-native';
import type { LogEntry } from '@/types';

interface Props {
  logs: LogEntry[];
}

const levelColors: Record<LogEntry['level'], string> = {
  info: 'text-slate-400',
  success: 'text-emerald-400',
  warn: 'text-amber-400',
  error: 'text-rose-400',
  trade: 'text-sky-300',
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
}

export function LogsPanel({ logs }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [logs]);

  return (
    <View className="bg-slate-900 rounded-xl border border-slate-800 p-4 h-full">
      <View className="flex-row items-center gap-2 mb-3">
        <Terminal size={16} color="#22c55e" />
        <Text className="text-sm font-bold text-white">Trade History & Logs</Text>
      </View>
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        style={{ maxHeight: 350 }}
      >
        {logs.length === 0 ? (
          <Text className="text-slate-600 italic text-[11px]">Waiting for engine output...</Text>
        ) : (
          logs.map((log) => (
            <View key={log.id} className="flex-row gap-2 leading-relaxed py-0.5">
              <Text className="text-slate-600 text-[11px]">{formatTime(log.time)}</Text>
              <Text className={`${levelColors[log.level]} text-[11px] flex-1`}>{log.message}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
