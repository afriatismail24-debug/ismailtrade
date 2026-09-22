import { Radio, AlertTriangle } from 'lucide-react';
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
  tier2: 'Tier 2 MA Crossover Trend',
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
    <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 py-3 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">AutoTrade Bot</h1>
            <p className="text-[10px] text-slate-400 leading-tight">Automated Strategy Router</p>
          </div>
        </div>

        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${modeColor}`}>
          <span className={`w-2 h-2 rounded-full ${running ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          {modeLabel} {running ? 'CONNECTED' : 'OFFLINE'}
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-sky-500/40 bg-sky-500/10 text-xs font-semibold text-sky-300">
          Active Strategy: {tierLabels[activeTier] ?? 'Idle'}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Balance</p>
          <p className="text-lg font-bold text-white tabular-nums">${balance.toFixed(2)}</p>
        </div>
        <div className="text-right border-l border-slate-700 pl-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Equity</p>
          <p className="text-lg font-bold text-emerald-400 tabular-nums">${equity.toFixed(2)}</p>
        </div>
        <button
          onClick={panicSell}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors shadow-lg shadow-rose-600/30"
        >
          <AlertTriangle className="w-4 h-4" />
          PANIC SELL ALL &amp; STOP
        </button>
      </div>
    </header>
  );
}
