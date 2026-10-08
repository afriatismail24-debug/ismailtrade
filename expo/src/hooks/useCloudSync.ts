import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { ApiConfig, Trade } from '@/types';

export interface CloudSettings {
  balance: number;
  startingBalance: number;
  config: ApiConfig;
  copySignals: boolean;
  activeTimeframe: string;
  mt5: {
    server: string;
    login: string;
    password: string;
    metaapiToken: string;
  };
}

export function useCloudSync(
  userId: string | null,
  onDataLoaded: (settings: CloudSettings) => void,
) {
  const loadedRef = useRef(false);

  const loadFromCloud = useCallback(async () => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Cloud load error:', error.message);
      return null;
    }

    if (!data) return null;

    const settings: CloudSettings = {
      balance: Number(data.balance) || 25,
      startingBalance: Number(data.starting_balance) || 25,
      config: {
        exchange: data.exchange || 'Binance',
        publicKey: data.public_key || '',
        secretKey: data.secret_key || '',
        sandbox: data.sandbox ?? true,
      },
      copySignals: data.copy_signals ?? false,
      activeTimeframe: data.active_timeframe || '1m',
      mt5: {
        server: data.mt5_server || '',
        login: data.mt5_login || '',
        password: data.mt5_password || '',
        metaapiToken: data.metaapi_token || '',
      },
    };
    return settings;
  }, [userId]);

  const saveToCloud = useCallback(
    async (settings: CloudSettings) => {
      if (!userId) return;
      const payload = {
        user_id: userId,
        balance: settings.balance,
        starting_balance: settings.startingBalance,
        exchange: settings.config.exchange,
        public_key: settings.config.publicKey,
        secret_key: settings.config.secretKey,
        sandbox: settings.config.sandbox,
        mt5_server: settings.mt5.server,
        mt5_login: settings.mt5.login,
        mt5_password: settings.mt5.password,
        metaapi_token: settings.mt5.metaapiToken,
        copy_signals: settings.copySignals,
        active_timeframe: settings.activeTimeframe,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('user_settings').upsert(payload, {
        onConflict: 'user_id',
      });

      if (error) {
        console.error('Cloud save error:', error.message);
      }
    },
    [userId],
  );

  const saveTradesToCloud = useCallback(
    async (trades: Trade[]) => {
      if (!userId) return;
      const closedTrades = trades.filter((t) => t.status === 'closed');
      if (closedTrades.length === 0) return;

      const rows = closedTrades.map((t) => ({
        user_id: userId,
        symbol: t.symbol,
        side: t.side,
        entry_price: t.entryPrice,
        exit_price: t.currentPrice,
        quantity: t.quantity,
        take_profit: t.takeProfit,
        stop_loss: t.stopLoss,
        pnl: t.pnl,
        pnl_pct: t.pnlPct,
        tier: t.tier,
        close_reason: t.closeReason ?? null,
        opened_at: t.openedAt,
        closed_at: t.closedAt ?? Date.now(),
      }));

      const { error } = await supabase.from('trade_history').upsert(rows, {
        onConflict: 'id',
        ignoreDuplicates: true,
      });

      if (error) {
        console.error('Trade history save error:', error.message);
      }
    },
    [userId],
  );

  const loadTradeHistory = useCallback(async () => {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('trade_history')
      .select('*')
      .eq('user_id', userId)
      .order('closed_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Trade history load error:', error.message);
      return [];
    }

    return (data ?? []).map((r) => ({
      id: r.id,
      symbol: r.symbol,
      side: r.side as 'long' | 'short',
      entryPrice: Number(r.entry_price),
      currentPrice: Number(r.exit_price),
      quantity: Number(r.quantity),
      takeProfit: Number(r.take_profit),
      stopLoss: Number(r.stop_loss),
      pnl: Number(r.pnl),
      pnlPct: Number(r.pnl_pct),
      status: 'closed' as const,
      tier: r.tier,
      closeReason: r.close_reason,
      openedAt: Number(r.opened_at),
      closedAt: Number(r.closed_at),
    }));
  }, [userId]);

  useEffect(() => {
    if (!userId || loadedRef.current) return;
    loadedRef.current = true;
    loadFromCloud().then((settings) => {
      if (settings) onDataLoaded(settings);
    });
  }, [userId, loadFromCloud, onDataLoaded]);

  return { loadFromCloud, saveToCloud, saveTradesToCloud, loadTradeHistory };
}
