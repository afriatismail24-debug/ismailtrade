export type Exchange = 'Binance' | 'OKX' | 'Kraken' | 'MetaTrader5';
export type Mode = 'testnet' | 'live' | 'paper';

export type StrategyTier = 'tier1' | 'tier2' | 'tier3' | 'none';

export interface ApiConfig {
  exchange: Exchange;
  publicKey: string;
  secretKey: string;
  sandbox: boolean;
}

export interface MT5Config {
  server: string;
  login: string;
  password: string;
  metaapiToken: string;
  accountId: string;
}

export interface MT5AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  currency: string;
  server: string;
  login: string;
}

export interface TradeSignal {
  symbol: string;
  action: 'BUY' | 'SELL';
  volume: number;
  takeProfit?: number;
  stopLoss?: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicators {
  rsi: number;
  ema9: number;
  ema21: number;
  ema50: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
}

export interface StrategyParams {
  orderSize: number;
  takeProfitPct: number;
  stopLossPct: number;
  maxConcurrent: number;
  riskPerTradePct: number;
  trailingStopCallbackPct?: number;
  reinvest: boolean;
  description: string;
}

export type TradeStatus = 'open' | 'closed';

export interface Trade {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  takeProfit: number;
  stopLoss: number;
  pnl: number;
  pnlPct: number;
  status: TradeStatus;
  openedAt: number;
  closedAt?: number;
  closeReason?: 'take_profit' | 'stop_loss' | 'manual' | 'panic';
  tier: StrategyTier;
  trailingHigh?: number;
  trailingStop?: number;
  trailingStopCallbackPct?: number;
}

export interface LogEntry {
  id: string;
  time: number;
  level: 'info' | 'success' | 'warn' | 'error' | 'trade';
  message: string;
}

export interface BalanceStats {
  startingBalance: number;
  currentBalance: number;
  equity: number;
  totalPnl: number;
  winCount: number;
  lossCount: number;
  totalTrades: number;
}
