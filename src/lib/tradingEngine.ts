import type {
  Candle,
  Indicators,
  LogEntry,
  StrategyParams,
  StrategyTier,
  Trade,
  TradeSignal,
} from '@/types';
import { ema, macd, rsi } from './indicators';

const SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
const FEE_PCT = 0.001; // 0.1% per side
const MIN_BALANCE = 5;

export interface TierDef {
  tier: StrategyTier;
  label: string;
  min: number;
  max: number;
  strategyName: string;
  params: StrategyParams;
}

export const TIERS: TierDef[] = [
  {
    tier: 'tier1',
    label: 'Tier 1 — Micro Scalper',
    min: 5,
    max: 50,
    strategyName: 'RSI Mean Reversion Scalper',
    params: {
      orderSize: 5,
      takeProfitPct: 0.015 + FEE_PCT * 2,
      stopLossPct: 0.01,
      maxConcurrent: 1,
      riskPerTradePct: 0,
      reinvest: false,
      description: 'Fixed $5 orders, TP +1.5%, SL -1.0%, 1 open trade max',
    },
  },
  {
    tier: 'tier2',
    label: 'Tier 2 — MA Crossover Trend',
    min: 50,
    max: 500,
    strategyName: 'EMA 9/21 Crossover + Trend Following',
    params: {
      orderSize: 0,
      takeProfitPct: 0.03 + FEE_PCT * 2,
      stopLossPct: 0.02,
      maxConcurrent: 3,
      riskPerTradePct: 0.02,
      reinvest: false,
      description: 'Risk 2% per trade, dynamic sizing, max 3 positions',
    },
  },
  {
    tier: 'tier3',
    label: 'Tier 3 — Confluence + Grid',
    min: 500,
    max: Infinity,
    strategyName: 'RSI + MACD + EMA Confluence + Trailing Grid',
    params: {
      orderSize: 0,
      takeProfitPct: 0.04 + FEE_PCT * 2,
      stopLossPct: 0.015,
      maxConcurrent: 5,
      riskPerTradePct: 0.01,
      reinvest: true,
      trailingStopCallbackPct: 0.005,
      description: 'Risk 1% per trade, trailing 0.5%, profit reinvestment',
    },
  },
];

export function getTier(balance: number): TierDef {
  return TIERS.find((t) => balance >= t.min && balance < t.max) ?? TIERS[0];
}

type Signal = 'long' | 'short' | 'hold';

function computeIndicators(candles: Candle[]): Indicators {
  const closes = candles.map((c) => c.close);
  const m = macd(closes);
  return {
    rsi: rsi(closes, 14),
    ema9: ema(closes, 9),
    ema21: ema(closes, 21),
    ema50: ema(closes, 50),
    macd: m.macd,
    macdSignal: m.signal,
    macdHistogram: m.histogram,
  };
}

function tier1Signal(ind: Indicators): Signal {
  if (ind.rsi < 30) return 'long';
  if (ind.rsi > 70) return 'short';
  return 'hold';
}

function tier2Signal(ind: Indicators): Signal {
  if (ind.ema9 > ind.ema21) return 'long';
  if (ind.ema9 < ind.ema21) return 'short';
  return 'hold';
}

function tier3Signal(ind: Indicators): Signal {
  const rsiBull = ind.rsi > 50 && ind.rsi < 70;
  const macdBull = ind.macd > ind.macdSignal && ind.macdHistogram > 0;
  const emaBull = ind.ema9 > ind.ema21 && ind.ema21 > ind.ema50;
  const rsiBear = ind.rsi < 50 && ind.rsi > 30;
  const macdBear = ind.macd < ind.macdSignal && ind.macdHistogram < 0;
  const emaBear = ind.ema9 < ind.ema21 && ind.ema21 < ind.ema50;
  if (rsiBull && macdBull && emaBull) return 'long';
  if (rsiBear && macdBear && emaBear) return 'short';
  return 'hold';
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function calcPnl(t: Trade, currentPrice: number): { pnl: number; pnlPct: number } {
  const direction = t.side === 'long' ? 1 : -1;
  const gross = (currentPrice - t.entryPrice) * t.quantity * direction;
  const fees = t.entryPrice * t.quantity * FEE_PCT + currentPrice * t.quantity * FEE_PCT;
  const pnl = gross - fees;
  const cost = t.entryPrice * t.quantity;
  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
  return { pnl, pnlPct };
}

export interface EngineCallbacks {
  onLog: (entry: LogEntry) => void;
  onTrade: (trade: Trade) => void;
  onUpdate: () => void;
  onTimeframeChange?: (tf: string) => void;
  onSignal?: (signal: TradeSignal) => void;
  onCloseSignal?: (signal: TradeSignal) => void;
}

export class TradingEngine {
  private candles: Candle[] = [];
  private currentPrice = 0;
  private balance: number;
  private startingBalance: number;
  private trades: Trade[] = [];
  private running = false;
  private cb: EngineCallbacks;
  private activeTier: StrategyTier = 'none';
  private winCount = 0;
  private lossCount = 0;
  private entryCooldown: Record<string, number> = {};
  private dataMode: 'live' | 'simulated' = 'simulated';
  private timeframe: string = '1m';

  constructor(startingBalance: number, cb: EngineCallbacks) {
    this.balance = startingBalance;
    this.startingBalance = startingBalance;
    this.cb = cb;
  }

  setDataMode(mode: 'live' | 'simulated') {
    if (this.dataMode === mode) return;
    this.dataMode = mode;
    if (mode === 'live') {
      this.candles = [];
      this.log('info', 'Switched to LIVE market data feed (Binance WebSocket).');
    } else {
      this.log('info', 'Switched to simulated data feed.');
    }
  }

  setTimeframe(tf: string) {
    if (this.timeframe === tf) return;
    this.timeframe = tf;
    this.candles = [];
    this.log('info', `Timeframe switched to ${tf}. Clearing chart data and recalculating indicators...`);
    this.cb.onTimeframeChange?.(tf);
  }

  getTimeframe(): string {
    return this.timeframe;
  }

  getDataMode(): 'live' | 'simulated' {
    return this.dataMode;
  }

  private signalHandler: ((signal: TradeSignal) => void) | null = null;
  private closeSignalHandler: ((signal: TradeSignal) => void) | null = null;

  setSignalHandler(handler: (signal: TradeSignal) => void) {
    this.signalHandler = handler;
  }

  setCloseSignalHandler(handler: (signal: TradeSignal) => void) {
    this.closeSignalHandler = handler;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.log('info', `Engine started. Monitoring balance and routing strategies... [${this.dataMode.toUpperCase()} DATA]`);
  }

  stop() {
    this.running = false;
    this.log('warn', 'Engine stopped.');
  }

  isRunning(): boolean {
    return this.running;
  }

  setBalance(b: number) {
    this.balance = b;
    this.log('info', `Balance set to $${b.toFixed(2)}`);
  }

  getBalance(): number {
    return this.balance;
  }

  getStartingBalance(): number {
    return this.startingBalance;
  }

  getTrades(): Trade[] {
    return [...this.trades];
  }

  getOpenTrades(): Trade[] {
    return this.trades.filter((t) => t.status === 'open');
  }

  getClosedTrades(): Trade[] {
    return this.trades.filter((t) => t.status === 'closed');
  }

  getActiveTier(): StrategyTier {
    return this.activeTier;
  }

  getStats() {
    return {
      startingBalance: this.startingBalance,
      currentBalance: this.balance,
      equity: this.balance + this.getOpenTrades().reduce((s, t) => s + t.pnl, 0),
      totalPnl: this.balance - this.startingBalance,
      winCount: this.winCount,
      lossCount: this.lossCount,
      totalTrades: this.winCount + this.lossCount,
    };
  }

  getCandles(): Candle[] {
    return [...this.candles];
  }

  getPrice(): number {
    return this.currentPrice;
  }

  getIndicators(): Indicators | null {
    if (this.candles.length < 26) return null;
    return computeIndicators(this.candles);
  }

  private log(level: LogEntry['level'], message: string) {
    this.cb.onLog({ id: uid(), time: Date.now(), level, message });
  }

  onCandle(candle: Candle, closed: boolean) {
    // If this candle's time is older than our last (e.g. history bootstrap after timeframe switch),
    // rebuild from scratch. If it matches the last, update in place. Otherwise append.
    const last = this.candles[this.candles.length - 1];
    if (last && candle.time < last.time) {
      // Older candle arriving during history fetch — start fresh list
      this.candles = [candle];
    } else if (last && last.time === candle.time) {
      this.candles[this.candles.length - 1] = candle;
    } else {
      this.candles.push(candle);
      if (this.candles.length > 250) this.candles.shift();
    }
    this.currentPrice = candle.close;

    if (this.running) {
      this.evaluate(candle.close);
      if (closed) {
        this.onCandleClose(candle.close);
      }
    }
    this.cb.onUpdate();
  }

  private evaluate(price: number) {
    const tier = getTier(this.balance);
    if (tier.tier !== this.activeTier) {
      this.activeTier = tier.tier;
      this.log('info', `[BALANCE DETECTED: $${this.balance.toFixed(2)}] -> Routing to ${tier.label} -> ${tier.strategyName}`);
    }
    this.updateOpenTrades(price);
  }

  private onCandleClose(price: number) {
    if (this.balance < MIN_BALANCE) {
      if (this.getOpenTrades().length === 0) {
        this.log('warn', `Balance $${this.balance.toFixed(2)} below $${MIN_BALANCE} minimum. Trading paused.`);
      }
      return;
    }
    const tier = getTier(this.balance);
    this.tryOpenTrade(this.candles, tier, price);
  }

  private updateOpenTrades(price: number) {
    for (const t of this.trades) {
      if (t.status !== 'open') continue;
      const { pnl, pnlPct } = calcPnl(t, price);
      t.currentPrice = price;
      t.pnl = pnl;
      t.pnlPct = pnlPct;

      if (t.tier === 'tier3' && t.trailingStopCallbackPct) {
        if (t.side === 'long') {
          if (price > (t.trailingHigh ?? t.entryPrice)) {
            t.trailingHigh = price;
            const trail = price * (1 - t.trailingStopCallbackPct);
            t.trailingStop = Math.max(t.trailingStop ?? 0, trail);
          }
        } else {
          if (price < (t.trailingHigh ?? t.entryPrice)) {
            t.trailingHigh = price;
            const trail = price * (1 + t.trailingStopCallbackPct);
            t.trailingStop = Math.min(t.trailingStop ?? Infinity, trail);
          }
        }
      }

      const tpHit = t.side === 'long' ? price >= t.takeProfit : price <= t.takeProfit;
      const slHit = t.side === 'long' ? price <= t.stopLoss : price >= t.stopLoss;
      const trailHit = t.trailingStop !== undefined
        ? t.side === 'long' ? price <= t.trailingStop : price >= t.trailingStop
        : false;

      if (tpHit) {
        this.closeTrade(t, 'take_profit', price);
      } else if (slHit || trailHit) {
        this.closeTrade(t, 'stop_loss', price);
      }

      this.cb.onTrade({ ...t });
    }
  }

  private tryOpenTrade(candles: Candle[], tier: TierDef, price: number) {
    const openCount = this.getOpenTrades().length;
    if (openCount >= tier.params.maxConcurrent) return;
    if (candles.length < 26) return;

    const ind = computeIndicators(candles);
    let signal: Signal = 'hold';
    if (tier.tier === 'tier1') signal = tier1Signal(ind);
    else if (tier.tier === 'tier2') signal = tier2Signal(ind);
    else if (tier.tier === 'tier3') signal = tier3Signal(ind);

    if (signal === 'hold') return;

    const symbol = SYMBOLS[openCount % SYMBOLS.length];
    const now = Date.now();
    if (this.entryCooldown[symbol] && now - this.entryCooldown[symbol] < 5000) return;
    this.entryCooldown[symbol] = now;

    const side = signal;
    let qty: number;
    if (tier.tier === 'tier1') {
      qty = tier.params.orderSize / price;
    } else {
      const riskAmount = this.balance * tier.params.riskPerTradePct;
      const slDist = price * tier.params.stopLossPct;
      qty = slDist > 0 ? riskAmount / slDist : 0;
    }
    if (qty <= 0) return;

    const cost = qty * price;
    if (cost > this.balance) return;

    const tp = side === 'long'
      ? price * (1 + tier.params.takeProfitPct)
      : price * (1 - tier.params.takeProfitPct);
    const sl = side === 'long'
      ? price * (1 - tier.params.stopLossPct)
      : price * (1 + tier.params.stopLossPct);

    const trade: Trade = {
      id: uid(),
      symbol,
      side,
      entryPrice: price,
      currentPrice: price,
      quantity: qty,
      takeProfit: tp,
      stopLoss: sl,
      pnl: 0,
      pnlPct: 0,
      status: 'open',
      openedAt: now,
      tier: tier.tier,
      trailingStopCallbackPct: tier.params.trailingStopCallbackPct,
      trailingHigh: price,
    };

    this.trades.push(trade);
    this.balance -= cost * (1 + FEE_PCT);

    this.log('trade', `[${tier.label}] ${side.toUpperCase()} ${symbol} @ ${price.toFixed(2)} | Qty: ${qty.toFixed(6)} | TP: ${tp.toFixed(2)} | SL: ${sl.toFixed(2)}`);

    // Emit trade signal for MT5 copy
    const tradeSignal: TradeSignal = {
      symbol: symbol.replace('/', ''),
      action: side === 'long' ? 'BUY' : 'SELL',
      volume: parseFloat(qty.toFixed(2)),
      takeProfit: parseFloat(tp.toFixed(2)),
      stopLoss: parseFloat(sl.toFixed(2)),
    };
    this.signalHandler?.(tradeSignal);
    if (tier.tier === 'tier1') this.log('info', `Scanning RSI (${ind.rsi.toFixed(1)})... Signal: ${signal.toUpperCase()}`);
    if (tier.tier === 'tier2') this.log('info', `EMA9 ${ind.ema9.toFixed(2)} vs EMA21 ${ind.ema21.toFixed(2)}... Signal: ${signal.toUpperCase()}`);
    if (tier.tier === 'tier3') this.log('info', `RSI ${ind.rsi.toFixed(1)} MACD-H ${ind.macdHistogram.toFixed(2)} EMA-trend... Signal: ${signal.toUpperCase()}`);

    this.cb.onTrade({ ...trade });
  }

  closeTrade(t: Trade, reason: Trade['closeReason'], price?: number) {
    const p = price ?? this.currentPrice;
    const { pnl } = calcPnl(t, p);
    t.status = 'closed';
    t.closedAt = Date.now();
    t.closeReason = reason;
    t.currentPrice = p;
    t.pnl = pnl;

    this.balance += t.entryPrice * t.quantity + pnl;

    // Emit close signal for MT5 auto-copy
    const closeSignal: TradeSignal = {
      symbol: t.symbol.replace('/', ''),
      action: t.side === 'long' ? 'SELL' : 'BUY',
      volume: parseFloat(t.quantity.toFixed(2)),
    };
    this.closeSignalHandler?.(closeSignal);

    if (pnl > 0) {
      this.winCount++;
      this.log('success', `[CLOSED ${t.symbol}] ${reason?.toUpperCase()} | PnL: +$${pnl.toFixed(2)}`);
    } else {
      this.lossCount++;
      this.log('error', `[CLOSED ${t.symbol}] ${reason?.toUpperCase()} | PnL: -$${Math.abs(pnl).toFixed(2)}`);
    }

    if (t.tier === 'tier3' && pnl > 0) {
      this.log('info', `[TIER 3] Profit $${pnl.toFixed(2)} reinvested. New balance: $${this.balance.toFixed(2)}`);
    }
  }

  closeTradeManual(id: string) {
    const t = this.trades.find((x) => x.id === id && x.status === 'open');
    if (t) this.closeTrade(t, 'manual');
  }

  panicSellAll() {
    this.log('error', 'PANIC SELL ALL triggered. Closing all open positions immediately.');
    for (const t of this.trades) {
      if (t.status === 'open') this.closeTrade(t, 'panic');
    }
    this.stop();
    this.log('warn', 'Engine halted after panic sell.');
  }
}
