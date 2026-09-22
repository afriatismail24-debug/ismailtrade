import { Zap, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-sky-400" />
        <h3 className="text-sm font-bold text-white">MT5 Auto-Copy</h3>
        {copySignals && connected && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Status row */}
      <div className="flex items-center gap-2 text-[11px]">
        {copySignals && connected ? (
          <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 w-full">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            Auto-copying every trade to MT5 account {mt5Config.accountId.slice(0, 8)}...
          </span>
        ) : copySignals && !connected ? (
          <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5 w-full">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Waiting for MT5 connection — set up credentials in API Config
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-slate-400 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 w-full">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Auto-copy is OFF — enable it in API Config
          </span>
        )}
      </div>

      {/* Recent copy events */}
      {recentEvents.length > 0 ? (
        <div className="space-y-1.5 pt-1 border-t border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider pt-1.5">Recent Auto-Copies</p>
          {recentEvents.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center gap-2 text-[10px] bg-slate-800/50 rounded-md px-2 py-1.5"
            >
              {ev.action === 'BUY' ? (
                <ArrowUpRight className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-rose-400 flex-shrink-0" />
              )}
              <span className={ev.action === 'BUY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {ev.action}
              </span>
              <span className="text-slate-300">{ev.volume} lots {ev.symbol}</span>
              <span className={ev.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}>
                {ev.status === 'success' ? 'OK' : 'FAIL'}
              </span>
              <span className="text-slate-500 ml-auto">
                {new Date(ev.time).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      ) : copySignals && connected ? (
        <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-800 pt-2">
          No trades copied yet. When the engine opens or closes a position, it will appear here automatically.
        </p>
      ) : null}
    </div>
  );
}
