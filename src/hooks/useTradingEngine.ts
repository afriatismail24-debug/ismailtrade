import { useCallback, useEffect, useRef, useState } from 'react';
import { TradingEngine } from '@/lib/tradingEngine';
import { BinanceLiveFeed, type LiveFeedStatus, type Timeframe } from '@/lib/liveFeed';
import { PriceSimulator } from '@/lib/priceSimulator';
import type { Candle, LogEntry, Trade, TradeSignal } from '@/types';

const MAX_LOGS = 200;

export function useTradingEngine(startingBalance: number) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [price, setPrice] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [balance, setBalance] = useState(startingBalance);
  const [activeTier, setActiveTier] = useState<string>('none');
  const [feedStatus, setFeedStatus] = useState<LiveFeedStatus>('disconnected');
  const [liveMode, setLiveMode] = useState(false);
  const [timeframe, setTimeframeState] = useState<Timeframe>('1m');
  const [indicators, setIndicators] = useState<{
    rsi: number;
    ema9: number;
    ema21: number;
    ema50: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
  } | null>(null);
  const [stats, setStats] = useState({
    startingBalance,
    currentBalance: startingBalance,
    equity: startingBalance,
    totalPnl: 0,
    winCount: 0,
    lossCount: 0,
    totalTrades: 0,
  });

  const engineRef = useRef<TradingEngine | null>(null);
  const feedRef = useRef<BinanceLiveFeed | null>(null);
  const simRef = useRef<PriceSimulator | null>(null);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeframeRef = useRef<Timeframe>('1m');

  // Initialize engine
  useEffect(() => {
    const engine = new TradingEngine(startingBalance, {
      onLog: (entry) => {
        setLogs((prev) => [entry, ...prev].slice(0, MAX_LOGS));
      },
      onTrade: () => {
        if (!engineRef.current) return;
        setTrades([...engineRef.current.getTrades()]);
        setBalance(engineRef.current.getBalance());
        setStats(engineRef.current.getStats());
        setActiveTier(engineRef.current.getActiveTier());
      },
      onUpdate: () => {
        if (!engineRef.current) return;
        setCandles(engineRef.current.getCandles());
        setPrice(engineRef.current.getPrice());
        setStats(engineRef.current.getStats());
        setIndicators(engineRef.current.getIndicators());
      },
      onTimeframeChange: (tf) => {
        const entry: LogEntry = {
          id: `tf-${tf}-${Date.now()}`,
          time: Date.now(),
          level: 'info',
          message: `Indicators recalculated on ${tf} candle closes. Active Timeframe: ${tf}.`,
        };
        setLogs((prev) => [entry, ...prev].slice(0, MAX_LOGS));
      },
    });
    engineRef.current = engine;
    return () => {
      engine.stop();
      feedRef.current?.stop();
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [startingBalance]);

  const startSimulator = useCallback(() => {
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    const sim = new PriceSimulator(150);
    simRef.current = sim;
    engineRef.current?.onCandle(sim.getCandles()[sim.getCandles().length - 1], true);
    simIntervalRef.current = setInterval(() => {
      if (!engineRef.current || !simRef.current) return;
      const candles = simRef.current.tick();
      const last = candles[candles.length - 1];
      engineRef.current.onCandle(last, false);
    }, 1000);
  }, []);

  const stopSimulator = useCallback(() => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    simRef.current = null;
  }, []);

  const startLiveFeed = useCallback(() => {
    feedRef.current?.stop();
    const feed = new BinanceLiveFeed(
      {
        onCandle: (candle, closed) => {
          engineRef.current?.onCandle(candle, closed);
        },
        onStatus: (status) => {
          setFeedStatus(status);
          if (status === 'connected') {
            const entry: LogEntry = {
              id: 'feed-connected',
              time: Date.now(),
              level: 'success',
              message: `Live Binance WebSocket connected. Streaming real-time BTC/USDT ${timeframeRef.current} candles.`,
            };
            setLogs((prev) => [entry, ...prev].slice(0, MAX_LOGS));
          }
          if (status === 'error') {
            const entry: LogEntry = {
              id: 'feed-error',
              time: Date.now(),
              level: 'error',
              message: 'Live feed connection failed. Check network or try simulated mode.',
            };
            setLogs((prev) => [entry, ...prev].slice(0, MAX_LOGS));
          }
        },
      },
      timeframeRef.current,
    );
    feedRef.current = feed;
    engineRef.current?.setDataMode('live');
    feed.start();
  }, []);

  const stopLiveFeed = useCallback(() => {
    feedRef.current?.stop();
    feedRef.current = null;
    setFeedStatus('disconnected');
  }, []);

  const switchToLive = useCallback(() => {
    stopSimulator();
    engineRef.current?.setDataMode('live');
    setLiveMode(true);
    startLiveFeed();
  }, [stopSimulator, startLiveFeed]);

  const switchToSimulated = useCallback(() => {
    stopLiveFeed();
    engineRef.current?.setDataMode('simulated');
    setLiveMode(false);
    setFeedStatus('disconnected');
    startSimulator();
  }, [stopLiveFeed, startSimulator]);

  const changeTimeframe = useCallback(
    (tf: Timeframe) => {
      if (timeframeRef.current === tf) return;
      timeframeRef.current = tf;
      setTimeframeState(tf);
      engineRef.current?.setTimeframe(tf);
      if (liveMode && feedRef.current) {
        feedRef.current.setInterval(tf);
      }
    },
    [liveMode],
  );

  const start = useCallback(() => {
    engineRef.current?.start();
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setRunning(false);
  }, []);

  const setBalanceValue = useCallback((b: number) => {
    engineRef.current?.setBalance(b);
    setBalance(engineRef.current?.getBalance() ?? b);
  }, []);

  const closeTrade = useCallback((id: string) => {
    engineRef.current?.closeTradeManual(id);
    setTrades(engineRef.current ? [...engineRef.current.getTrades()] : []);
    setBalance(engineRef.current?.getBalance() ?? 0);
  }, []);

  const panicSell = useCallback(() => {
    engineRef.current?.panicSellAll();
    setRunning(false);
    setTrades(engineRef.current ? [...engineRef.current.getTrades()] : []);
    setBalance(engineRef.current?.getBalance() ?? 0);
  }, []);

  const addLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => [entry, ...prev].slice(0, MAX_LOGS));
  }, []);

  const setOnSignal = useCallback((handler: (signal: TradeSignal) => void) => {
    if (engineRef.current) {
      engineRef.current.setSignalHandler(handler);
    }
  }, []);

  const setOnCloseSignal = useCallback((handler: (signal: TradeSignal) => void) => {
    if (engineRef.current) {
      engineRef.current.setCloseSignalHandler(handler);
    }
  }, []);

  return {
    candles,
    price,
    trades,
    logs,
    running,
    balance,
    activeTier,
    stats,
    indicators,
    liveMode,
    feedStatus,
    timeframe,
    start,
    stop,
    setBalance: setBalanceValue,
    closeTrade,
    panicSell,
    switchToLive,
    switchToSimulated,
    changeTimeframe,
    addLog,
    setOnSignal,
    setOnCloseSignal,
  };
}
