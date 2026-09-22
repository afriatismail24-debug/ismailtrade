import type { Candle } from '@/types';

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M';

export const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'];

export interface BinanceKlineMessage {
  e: string;
  E: number;
  s: string;
  k: {
    t: number;
    T: number;
    s: string;
    i: string;
    o: string;
    c: string;
    h: string;
    l: string;
    v: string;
    x: boolean;
    q: string;
  };
}

export interface LiveFeedCallbacks {
  onCandle: (candle: Candle, closed: boolean) => void;
  onStatus: (status: LiveFeedStatus) => void;
}

export type LiveFeedStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

const MAX_RECONNECT = 10;

function wsUrl(interval: Timeframe): string {
  return `wss://stream.binance.com:9443/ws/btcusdt@kline_${interval}`;
}

function restUrl(interval: Timeframe): string {
  return `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=200`;
}

export class BinanceLiveFeed {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private running = false;
  private cb: LiveFeedCallbacks;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private interval: Timeframe = '1m';

  constructor(cb: LiveFeedCallbacks, interval: Timeframe = '1m') {
    this.cb = cb;
    this.interval = interval;
  }

  getInterval(): Timeframe {
    return this.interval;
  }

  async start() {
    if (this.running) return;
    this.running = true;
    await this.fetchHistory();
    this.connect();
  }

  stop() {
    this.running = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cb.onStatus('disconnected');
  }

  isRunning(): boolean {
    return this.running;
  }

  async setInterval(interval: Timeframe) {
    if (this.interval === interval) return;
    this.interval = interval;
    if (!this.running) return;

    // Close existing WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Fetch new history (this also resets the candle buffer in the engine via onCandle)
    await this.fetchHistory();

    // Reconnect with new interval
    this.reconnectAttempts = 0;
    this.connect();
  }

  private async fetchHistory(): Promise<void> {
    try {
      const res = await fetch(restUrl(this.interval));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows: unknown[][] = await res.json();
      for (const row of rows) {
        const candle: Candle = {
          time: Math.floor((row[0] as number) / 1000),
          open: parseFloat(row[1] as string),
          high: parseFloat(row[2] as string),
          low: parseFloat(row[3] as string),
          close: parseFloat(row[4] as string),
          volume: parseFloat(row[5] as string),
        };
        this.cb.onCandle(candle, true);
      }
    } catch {
      // History fetch failed; live WebSocket will still provide updates
    }
  }

  private connect() {
    if (!this.running) return;
    this.cb.onStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    try {
      this.ws = new WebSocket(wsUrl(this.interval));
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.cb.onStatus('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as BinanceKlineMessage;
        if (msg.k) {
          const candle: Candle = {
            time: Math.floor(msg.k.t / 1000),
            open: parseFloat(msg.k.o),
            high: parseFloat(msg.k.h),
            low: parseFloat(msg.k.l),
            close: parseFloat(msg.k.c),
            volume: parseFloat(msg.k.v),
          };
          this.cb.onCandle(candle, msg.k.x);
        }
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onerror = () => {
      this.cb.onStatus('error');
    };

    this.ws.onclose = () => {
      if (this.running) {
        this.scheduleReconnect();
      } else {
        this.cb.onStatus('disconnected');
      }
    };
  }

  private scheduleReconnect() {
    if (!this.running) return;
    if (this.reconnectAttempts >= MAX_RECONNECT) {
      this.cb.onStatus('error');
      return;
    }
    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}
