import { TrendingUp, Activity, Grid3x3 } from 'lucide-react';
import { TIERS } from '@/lib/tradingEngine';
import type { StrategyTier } from '@/types';

interface Props {
  activeTier: StrategyTier;
  balance: number;
}

const icons: Record<string, typeof TrendingUp> = {
  tier1: Activity,
  tier2: TrendingUp,
  tier3: Grid3x3,
};

export function StrategyControlPanel({ activeTier, balance }: Props) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
      <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4 text-sky-400" />
        Strategy Control Panel
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        {TIERS.map((t) => {
          const Icon = icons[t.tier];
          const isActive = activeTier === t.tier;
          const inRange = balance >= t.min && balance < t.max;
          return (
            <div
              key={t.tier}
              className={`relative rounded-lg border p-3 transition-all ${
                isActive
                  ? 'border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/10'
                  : inRange
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-slate-700 bg-slate-800/40'
              }`}
            >
              {isActive && (
                <div className="absolute -top-2 left-3 px-2 py-0.5 rounded-full bg-sky-500 text-white text-[9px] font-bold uppercase tracking-wider">
                  Active
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive ? 'bg-sky-500/20' : 'bg-slate-700/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{t.label}</p>
                  <p className="text-[10px] text-slate-400">
                    ${t.min} – {t.max === Infinity ? '$∞' : `$${t.max}`}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-300 mb-2">{t.strategyName}</p>
              <div className="space-y-1 text-[10px] text-slate-400">
                <p>TP: +{(t.params.takeProfitPct * 100).toFixed(2)}%</p>
                <p>SL: -{(t.params.stopLossPct * 100).toFixed(2)}%</p>
                <p>Max Positions: {t.params.maxConcurrent}</p>
                {t.params.trailingStopCallbackPct && (
                  <p>Trailing: {(t.params.trailingStopCallbackPct * 100).toFixed(1)}% callback</p>
                )}
                {t.params.reinvest && <p className="text-emerald-400">Profit Reinvestment: ON</p>}
              </div>
              <p className="text-[10px] text-slate-500 mt-2 italic">{t.params.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
