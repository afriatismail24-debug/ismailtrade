import type { MT5AccountInfo, MT5Config, TradeSignal } from '@/types';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mt5-proxy`;

function getAuthHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

export async function testMT5Connection(
  config: MT5Config,
): Promise<{ success: boolean; accountId?: string; info?: MT5AccountInfo; error?: string }> {
  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'test_connection',
        metaapiToken: config.metaapiToken,
        mt5Server: config.server,
        mt5Login: config.login,
        mt5Password: config.password,
        accountId: config.accountId || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { success: false, error: err.error ?? `Connection failed (${res.status})` };
    }

    const data = await res.json();
    if (data.error) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      accountId: data.accountId,
      info: {
        balance: data.balance,
        equity: data.equity,
        margin: data.margin,
        currency: data.currency,
        server: data.server,
        login: data.login,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function provisionMT5Account(
  config: MT5Config,
): Promise<{ success: boolean; accountId?: string; error?: string }> {
  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'provision_account',
        metaapiToken: config.metaapiToken,
        mt5Server: config.server,
        mt5Login: config.login,
        mt5Password: config.password,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { success: false, error: err.error ?? `Provisioning failed (${res.status})` };
    }

    const data = await res.json();
    if (data.error) {
      return { success: false, error: data.error };
    }

    return { success: true, accountId: data.accountId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function closePositionOnMT5(
  config: MT5Config,
  signal: TradeSignal,
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'close_position',
        metaapiToken: config.metaapiToken,
        accountId: config.accountId,
        signal: {
          symbol: signal.symbol,
          action: signal.action,
          volume: signal.volume,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { success: false, error: err.error ?? `Close failed (${res.status})` };
    }

    const data = await res.json();
    if (data.error) {
      return { success: false, error: data.error };
    }

    return { success: true, orderId: data.orderId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function sendSignalToMT5(
  config: MT5Config,
  signal: TradeSignal,
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'send_signal',
        metaapiToken: config.metaapiToken,
        accountId: config.accountId,
        signal: {
          symbol: signal.symbol,
          action: signal.action,
          volume: signal.volume,
          takeProfit: signal.takeProfit,
          stopLoss: signal.stopLoss,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { success: false, error: err.error ?? `Signal failed (${res.status})` };
    }

    const data = await res.json();
    if (data.error) {
      return { success: false, error: data.error };
    }

    return { success: true, orderId: data.orderId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}
