import { CandlestickChart } from './CandlestickChart';
import { Header } from './Header';
import { StrategyControlPanel } from './StrategyControlPanel';
import { PositionsTable } from './PositionsTable';
import { LogsPanel } from './LogsPanel';
import { ApiConfigPanel } from './ApiConfigPanel';
import { SignInScreen } from './SignInScreen';
import { AutoCopyStatusPanel } from './AutoCopyStatusPanel';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { useAuth } from '@/hooks/useAuth';
import { useCloudSync, type CloudSettings } from '@/hooks/useCloudSync';
import { sendSignalToMT5, closePositionOnMT5, provisionMT5Account } from '@/lib/mt5Service';
import {
  Play,
  Square,
  Settings,
  Gauge,
  BookOpen,
  Wifi,
  WifiOff,
  Activity,
  Clock,
  LogOut,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiConfig, Mode, MT5Config, TradeSignal } from '@/types';
import { TIMEFRAMES } from '@/lib/liveFeed';

type Tab = 'dashboard' | 'settings';

export function Dashboard() {
  const { user, loading, signInWithEmail, signUpWithEmail, signOut, authError, clearAuthError } = useAuth();

  const [tab, setTab] = useState<Tab>('dashboard');
  const [mode, setMode] = useState<Mode>('paper');
  const [config, setConfig] = useState<ApiConfig>({
    exchange: 'Binance',
    publicKey: '',
    secretKey: '',
    sandbox: true,
  });
  const [mt5Config, setMt5Config] = useState<MT5Config>({
    server: '',
    login: '',
    password: '',
    metaapiToken: '',
    accountId: '',
  });
  const [copySignals, setCopySignals] = useState(false);
  const [copyEvents, setCopyEvents] = useState<
    { id: string; time: number; action: 'BUY' | 'SELL'; symbol: string; volume: number; status: 'success' | 'error'; message: string }[]
  >([]);

  const startingBalance = 25;
  const engine = useTradingEngine(startingBalance);
  const [balanceInput, setBalanceInput] = useState(startingBalance);

  const closedTrades = engine.trades.filter((t) => t.status === 'closed');

  // Cloud sync — load saved settings when user logs in
  const handleDataLoaded = useCallback(
    (settings: CloudSettings) => {
      setConfig(settings.config);
      setMt5Config({
        server: settings.mt5.server,
        login: settings.mt5.login,
        password: settings.mt5.password,
        metaapiToken: settings.mt5.metaapiToken,
        accountId: '',
      });
      setCopySignals(settings.copySignals);
      setBalanceInput(settings.balance);
      engine.setBalance(settings.balance);
      if (settings.activeTimeframe && settings.activeTimeframe !== '1m') {
        engine.changeTimeframe(settings.activeTimeframe as any);
      }
    },
    [engine],
  );

  const cloudSync = useCloudSync(user?.id ?? null, handleDataLoaded);

  // Auto-save settings to cloud when they change (debounced via ref)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      cloudSync.saveToCloud({
        balance: engine.balance,
        startingBalance,
        config,
        copySignals,
        activeTimeframe: engine.timeframe,
        mt5: {
          server: mt5Config.server,
          login: mt5Config.login,
          password: mt5Config.password,
          metaapiToken: mt5Config.metaapiToken,
        },
      });
    }, 1500);
  }, [user, config, copySignals, mt5Config, engine.balance, engine.timeframe, startingBalance, cloudSync]);

  // Save closed trades to cloud
  const lastTradeCountRef = useRef(0);
  useEffect(() => {
    if (!user) return;
    const closedCount = engine.trades.filter((t) => t.status === 'closed').length;
    if (closedCount > lastTradeCountRef.current) {
      cloudSync.saveTradesToCloud(engine.trades);
    }
    lastTradeCountRef.current = closedCount;
  }, [engine.trades, user, cloudSync]);

  // Auto-provision MT5 accountId when copy is enabled and credentials are set but accountId is missing
  const provisionRef = useRef(false);
  useEffect(() => {
    if (!copySignals) return;
    if (mt5Config.accountId) { provisionRef.current = false; return; }
    if (!mt5Config.metaapiToken || !mt5Config.server || !mt5Config.login || !mt5Config.password) return;
    if (provisionRef.current) return;
    provisionRef.current = true;
    (async () => {
      engine.addLog({
        id: `prov-${Date.now()}`,
        time: Date.now(),
        level: 'info',
        message: '[MT5] Auto-provisioning MetaApi account...',
      });
      const result = await provisionMT5Account(mt5Config);
      if (result.success && result.accountId) {
        setMt5Config((prev) => ({ ...prev, accountId: result.accountId! }));
        engine.addLog({
          id: `prov-ok-${Date.now()}`,
          time: Date.now(),
          level: 'success',
          message: `[MT5] Account provisioned. ID: ${result.accountId}`,
        });
      } else {
        engine.addLog({
          id: `prov-err-${Date.now()}`,
          time: Date.now(),
          level: 'error',
          message: `[MT5] Provisioning failed: ${result.error}`,
        });
        provisionRef.current = false;
      }
    })();
  }, [copySignals, mt5Config, engine]);
  // Signal copying — when engine opens a position and copy is enabled, send to MT5
  const handleSignal = useCallback(
    async (signal: TradeSignal) => {
      if (!copySignals || !mt5Config.metaapiToken || !mt5Config.accountId) return;
      engine.addLog({
        id: `sig-${Date.now()}`,
        time: Date.now(),
        level: 'info',
        message: `[MT5 COPY] Sending ${signal.action} ${signal.volume} lots ${signal.symbol} to MT5...`,
      });
      const result = await sendSignalToMT5(mt5Config, signal);
      const status: 'success' | 'error' = result.success ? 'success' : 'error';
      const message = result.success ? `Order ID: ${result.orderId}` : result.error ?? 'Unknown error';
      setCopyEvents((prev) => [{
        id: `ev-${Date.now()}`,
        time: Date.now(),
        action: signal.action,
        symbol: signal.symbol,
        volume: signal.volume,
        status,
        message,
      }, ...prev].slice(0, 20));
      engine.addLog({
        id: `sig-${status}-${Date.now()}`,
        time: Date.now(),
        level: result.success ? 'success' : 'error',
        message: result.success
          ? `[MT5 COPY] Open order accepted. ID: ${result.orderId}`
          : `[MT5 COPY] Failed: ${result.error}`,
      });
    },
    [copySignals, mt5Config, engine],
  );

  // Signal copying — when engine closes a position, send close order to MT5
  const handleCloseSignal = useCallback(
    async (signal: TradeSignal) => {
      if (!copySignals || !mt5Config.metaapiToken || !mt5Config.accountId) return;
      engine.addLog({
        id: `cls-${Date.now()}`,
        time: Date.now(),
        level: 'info',
        message: `[MT5 COPY] Closing ${signal.symbol} (${signal.volume} lots) on MT5...`,
      });
      const result = await closePositionOnMT5(mt5Config, signal);
      const status: 'success' | 'error' = result.success ? 'success' : 'error';
      const message = result.success ? `Close ID: ${result.orderId}` : result.error ?? 'Unknown error';
      setCopyEvents((prev) => [{
        id: `ev-${Date.now()}`,
        time: Date.now(),
        action: signal.action,
        symbol: signal.symbol,
        volume: signal.volume,
        status,
        message,
      }, ...prev].slice(0, 20));
      engine.addLog({
        id: `cls-${status}-${Date.now()}`,
        time: Date.now(),
        level: result.success ? 'success' : 'error',
        message: result.success
          ? `[MT5 COPY] Close order accepted. ID: ${result.orderId}`
          : `[MT5 COPY] Close failed: ${result.error}`,
      });
    },
    [copySignals, mt5Config, engine],
  );

  useEffect(() => {
    engine.setOnSignal(handleSignal);
  }, [handleSignal, engine]);

  useEffect(() => {
    engine.setOnCloseSignal(handleCloseSignal);
  }, [handleCloseSignal, engine]);

  const handleBalanceChange = (val: number) => {
    setBalanceInput(val);
    engine.setBalance(val);
  };

  const feedStatusColor =
    engine.feedStatus === 'connected'
      ? 'text-emerald-400'
      : engine.feedStatus === 'connecting' || engine.feedStatus === 'reconnecting'
      ? 'text-amber-400'
      : 'text-slate-500';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <SignInScreen
        onSignIn={signInWithEmail}
        onSignUp={signUpWithEmail}
        authError={authError}
        onDismissError={clearAuthError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header
        mode={mode}
        running={engine.running}
        balance={engine.balance}
        equity={engine.stats.equity}
        activeTier={engine.activeTier}
        panicSell={engine.panicSell}
      />

      {/* Tab bar + user info */}
      <div className="flex items-center justify-between px-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-1">
          <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={Gauge} label="Dashboard" />
          <TabButton active={tab === 'settings'} onClick={() => setTab('settings')} icon={Settings} label="API Config" />
        </div>
        <div className="flex items-center gap-3">
          {copySignals && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <Copy className="w-3 h-3" />
              Signal Copy: ON
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            {user.email}
          </span>
          <button
            onClick={signOut}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {tab === 'dashboard' ? (
        <div className="p-4 space-y-4 max-w-[1600px] mx-auto">
          {/* Engine controls + Balance slider + Live toggle */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-3">
              {!engine.running ? (
                <button
                  onClick={engine.start}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start Engine
                </button>
              ) : (
                <button
                  onClick={engine.stop}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Stop Engine
                </button>
              )}
            </div>

            {/* Live / Simulated data toggle */}
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button
                onClick={engine.switchToLive}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  engine.liveMode
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                Live Binance
              </button>
              <button
                onClick={engine.switchToSimulated}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  !engine.liveMode
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <WifiOff className="w-3.5 h-3.5" />
                Simulated
              </button>
            </div>

            <div className={`flex items-center gap-1.5 text-[10px] font-medium ${feedStatusColor}`}>
              <span className={`w-2 h-2 rounded-full ${
                engine.feedStatus === 'connected' ? 'bg-emerald-400 animate-pulse' :
                engine.feedStatus === 'connecting' || engine.feedStatus === 'reconnecting' ? 'bg-amber-400 animate-pulse' :
                'bg-slate-600'
              }`} />
              <span className="uppercase tracking-wider">{engine.feedStatus}</span>
            </div>

            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-slate-400 uppercase tracking-wider">
                  {mode === 'paper' ? 'Paper Balance (USDT)' : 'Account Balance (USDT)'}
                </label>
                <span className="text-sm font-bold text-sky-300 tabular-nums">${balanceInput.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2000"
                step="1"
                value={balanceInput}
                onChange={(e) => handleBalanceChange(parseFloat(e.target.value))}
                className="w-full accent-sky-500"
              />
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>$0</span>
                <span className="text-emerald-400">$5</span>
                <span>T1: $5–50</span>
                <span>T2: $50–500</span>
                <span>T3: $500+</span>
                <span>$2000</span>
              </div>
            </div>

            <div className="flex gap-4 text-center">
              <Stat label="Wins" value={engine.stats.winCount} color="text-emerald-400" />
              <Stat label="Losses" value={engine.stats.lossCount} color="text-rose-400" />
              <Stat
                label="Total PnL"
                value={`$${engine.stats.totalPnl.toFixed(2)}`}
                color={engine.stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}
              />
            </div>
          </div>

          {/* Live indicator readout */}
          {engine.indicators && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                Live Indicators:
              </span>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-300 font-semibold">
                <Clock className="w-3 h-3" />
                Active Timeframe: {engine.timeframe}
              </span>
              <IndicatorChip label="RSI(14)" value={engine.indicators.rsi.toFixed(1)} />
              <IndicatorChip label="EMA 9" value={engine.indicators.ema9.toFixed(2)} />
              <IndicatorChip label="EMA 21" value={engine.indicators.ema21.toFixed(2)} />
              <IndicatorChip label="EMA 50" value={engine.indicators.ema50.toFixed(2)} />
              <IndicatorChip label="MACD" value={engine.indicators.macd.toFixed(2)} />
              <IndicatorChip label="MACD-H" value={engine.indicators.macdHistogram.toFixed(2)} />
              {copySignals && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  MT5 Copy Active
                </span>
              )}
            </div>
          )}

          {/* Chart + Strategy + Signal Copier */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-4">
              {/* Timeframe selector + chart header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-bold text-white">BTC/USDT — Live Chart</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                    {TIMEFRAMES.map((tf) => {
                      const tfActive = engine.timeframe === tf;
                      return (
                        <button
                          key={tf}
                          onClick={() => engine.changeTimeframe(tf)}
                          className={
                            'px-2 py-1 rounded text-[11px] font-bold transition-colors ' +
                            (tfActive
                              ? 'bg-sky-600 text-white'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50')
                          }
                        >
                          {tf}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Price:</span>
                    <span className="text-sm font-bold text-sky-300 tabular-nums">${engine.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div style={{ height: '380px' }}>
                <CandlestickChart candles={engine.candles} liveMode={engine.liveMode} trades={engine.trades} />
              </div>
            </div>

            <div className="space-y-4">
              <StrategyControlPanel activeTier={engine.activeTier as any} balance={engine.balance} />
              <AutoCopyStatusPanel mt5Config={mt5Config} copySignals={copySignals} copyEvents={copyEvents} />
            </div>
          </div>

          {/* Positions + Logs */}
          <div className="grid gap-4 lg:grid-cols-2">
            <PositionsTable trades={engine.trades} onClose={engine.closeTrade} />
            <LogsPanel logs={engine.logs} />
          </div>

          {/* Closed trades history */}
          {closedTrades.length > 0 && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-400" />
                Closed Trade History
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="text-left py-2 px-2 font-medium">Symbol</th>
                      <th className="text-left py-2 px-2 font-medium">Side</th>
                      <th className="text-right py-2 px-2 font-medium">Entry</th>
                      <th className="text-right py-2 px-2 font-medium">Exit</th>
                      <th className="text-right py-2 px-2 font-medium">PnL ($)</th>
                      <th className="text-right py-2 px-2 font-medium">PnL (%)</th>
                      <th className="text-left py-2 px-2 font-medium">Reason</th>
                      <th className="text-left py-2 px-2 font-medium">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...closedTrades].reverse().slice(0, 20).map((t) => (
                      <tr key={t.id} className="border-b border-slate-800/30">
                        <td className="py-2 px-2 text-white">{t.symbol}</td>
                        <td className="py-2 px-2">
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
                        <td className="py-2 px-2 text-slate-400 capitalize text-[10px]">
                          {t.closeReason?.replace('_', ' ')}
                        </td>
                        <td className="py-2 px-2 text-slate-400 capitalize text-[10px]">{t.tier}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 max-w-2xl mx-auto">
          <ApiConfigPanel
            config={config}
            onSave={setConfig}
            mode={mode}
            onModeChange={setMode}
            mt5Config={mt5Config}
            onSaveMT5={setMt5Config}
            copySignals={copySignals}
            onCopySignalsChange={setCopySignals}
          />
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Gauge;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function IndicatorChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-800/60 rounded-md px-2 py-1 border border-slate-700/50">
      <span className="text-slate-400 text-[10px]">{label}</span>
      <span className="text-sky-300 font-semibold tabular-nums">{value}</span>
    </div>
  );
}
