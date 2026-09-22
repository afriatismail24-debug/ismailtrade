import { X } from 'lucide-react';
import type { Trade } from '@/types';

interface Props {
  trades: Trade[];
  onClose: (id: string) => void;
}

export function PositionsTable({ trades, onClose }: Props) {
  const openTrades = trades.filter((t) => t.status === 'open');

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
      <h2 className="text-sm font-bold text-white mb-3">Active Positions</h2>
      {openTrades.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">No open positions</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="text-left py-2 px-2 font-medium">Symbol</th>
                <th className="text-right py-2 px-2 font-medium">Side</th>
                <th className="text-right py-2 px-2 font-medium">Entry</th>
                <th className="text-right py-2 px-2 font-medium">Current</th>
                <th className="text-right py-2 px-2 font-medium">Qty</th>
                <th className="text-right py-2 px-2 font-medium">TP</th>
                <th className="text-right py-2 px-2 font-medium">SL</th>
                <th className="text-right py-2 px-2 font-medium">PnL ($)</th>
                <th className="text-right py-2 px-2 font-medium">PnL (%)</th>
                <th className="text-center py-2 px-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {openTrades.map((t) => (
                <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="py-2 px-2 text-white font-medium">{t.symbol}</td>
                  <td className="py-2 px-2 text-right">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        t.side === 'long' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {t.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right text-slate-300 tabular-nums">{t.entryPrice.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right text-slate-300 tabular-nums">{t.currentPrice.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right text-slate-400 tabular-nums">{t.quantity.toFixed(6)}</td>
                  <td className="py-2 px-2 text-right text-emerald-400 tabular-nums">{t.takeProfit.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right text-rose-400 tabular-nums">{t.stopLoss.toFixed(2)}</td>
                  <td
                    className={`py-2 px-2 text-right font-bold tabular-nums ${
                      t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                  </td>
                  <td
                    className={`py-2 px-2 text-right tabular-nums ${
                      t.pnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {t.pnlPct >= 0 ? '+' : ''}{t.pnlPct.toFixed(2)}%
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      onClick={() => onClose(t.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-600/80 hover:bg-rose-500 text-white text-[10px] font-medium transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Close
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
