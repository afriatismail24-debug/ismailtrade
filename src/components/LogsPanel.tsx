import { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
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

const levelPrefix: Record<LogEntry['level'], string> = {
  info: '',
  success: '',
  warn: '',
  error: '',
  trade: '',
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
}

export function LogsPanel({ logs }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col h-full">
      <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Terminal className="w-4 h-4 text-emerald-400" />
        Trade History &amp; Logs
      </h2>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-[11px] space-y-0.5 pr-1"
        style={{ maxHeight: '380px' }}
      >
        {logs.length === 0 ? (
          <p className="text-slate-600 italic">Waiting for engine output...</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-2 leading-relaxed">
              <span className="text-slate-600 shrink-0">{formatTime(log.time)}</span>
              <span className={levelColors[log.level]}>
                {levelPrefix[log.level]}{log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
