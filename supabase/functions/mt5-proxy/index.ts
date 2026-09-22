import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MT5Request {
  action: "test_connection" | "send_signal" | "provision_account" | "close_position";
  metaapiToken: string;
  mt5Server?: string;
  mt5Login?: string;
  mt5Password?: string;
  accountId?: string;
  signal?: {
    symbol: string;
    action: "BUY" | "SELL";
    volume: number;
    takeProfit?: number;
    stopLoss?: number;
  };
}

const META_API_BASE = "https://api.metaapi.cloud";

async function provisionAccount(token: string, server: string, login: string, password: string) {
  const res = await fetch(`${META_API_BASE}/provisioning/provisioning-profiles`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MetaApi auth check failed (${res.status}): ${text}`);
  }
  const profiles = await res.json();

  const existing = profiles.find(
    (p: any) => p.login === login && p.serverName === server,
  );

  if (existing) {
    return { accountId: existing.id, provisioned: false };
  }

  const createRes = await fetch(`${META_API_BASE}/provisioning/provisioning-profiles`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `bolt-${login}`,
      login,
      password,
      serverName: server,
      type: "MT5",
      region: "new-york",
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Account provisioning failed (${createRes.status}): ${text}`);
  }

  const created = await createRes.json();
  return { accountId: created.id, provisioned: true };
}

async function getAccountInfo(token: string, accountId: string) {
  const res = await fetch(`${META_API_BASE}/users/current/accounts/${accountId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Account info fetch failed (${res.status}): ${text}`);
  }

  const account = await res.json();
  return {
    balance: account.balance,
    equity: account.equity,
    margin: account.margin,
    currency: account.currency,
    server: account.server,
    login: account.login,
  };
}

async function sendTradeSignal(
  token: string,
  accountId: string,
  signal: NonNullable<MT5Request["signal"]>,
) {
  const side = signal.action === "BUY" ? "BUY" : "SELL";

  const body: Record<string, unknown> = {
    actionType: "ORDER_TYPE_MARKET",
    symbol: signal.symbol,
    volume: signal.volume,
    orderType: side === "BUY" ? "ORDER_TYPE_BUY" : "ORDER_TYPE_SELL",
  };

  if (signal.takeProfit !== undefined && signal.takeProfit > 0) {
    body.takeProfit = signal.takeProfit;
  }
  if (signal.stopLoss !== undefined && signal.stopLoss > 0) {
    body.stopLoss = signal.stopLoss;
  }

  const res = await fetch(
    `${META_API_BASE}/users/current/accounts/${accountId}/trade`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trade signal failed (${res.status}): ${text}`);
  }

  const result = await res.json();
  return { success: true, orderId: result.orderId ?? result.id ?? "unknown" };
}

async function closePosition(
  token: string,
  accountId: string,
  signal: NonNullable<MT5Request["signal"]>,
) {
  const side = signal.action === "BUY" ? "SELL" : "BUY";

  const body: Record<string, unknown> = {
    actionType: "ORDER_TYPE_MARKET",
    symbol: signal.symbol,
    volume: signal.volume,
    orderType: side === "BUY" ? "ORDER_TYPE_BUY" : "ORDER_TYPE_SELL",
  };

  const res = await fetch(
    `${META_API_BASE}/users/current/accounts/${accountId}/trade`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Close position failed (${res.status}): ${text}`);
  }

  const result = await res.json();
  return { success: true, orderId: result.orderId ?? result.id ?? "unknown" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as MT5Request;

    if (!body.metaapiToken) {
      return new Response(
        JSON.stringify({ error: "MetaApi token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let accountId = body.accountId ?? "";

    if (body.action === "provision_account" && body.mt5Server && body.mt5Login && body.mt5Password) {
      const result = await provisionAccount(
        body.metaapiToken,
        body.mt5Server,
        body.mt5Login,
        body.mt5Password,
      );
      accountId = result.accountId;
      return new Response(
        JSON.stringify({ success: true, accountId, provisioned: result.provisioned }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.action === "test_connection") {
      if (!accountId && body.mt5Server && body.mt5Login && body.mt5Password) {
        const provisioned = await provisionAccount(
          body.metaapiToken,
          body.mt5Server,
          body.mt5Login,
          body.mt5Password,
        );
        accountId = provisioned.accountId;
      }
      if (!accountId) {
        return new Response(
          JSON.stringify({ error: "No account ID. Provision account first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const info = await getAccountInfo(body.metaapiToken, accountId);
      return new Response(
        JSON.stringify({ success: true, accountId, ...info }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.action === "send_signal") {
      if (!accountId) {
        return new Response(
          JSON.stringify({ error: "No account ID configured. Test connection first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!body.signal) {
        return new Response(
          JSON.stringify({ error: "Signal payload is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const result = await sendTradeSignal(body.metaapiToken, accountId, body.signal);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.action === "close_position") {
      if (!accountId) {
        return new Response(
          JSON.stringify({ error: "No account ID configured. Test connection first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!body.signal) {
        return new Response(
          JSON.stringify({ error: "Signal payload is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const result = await closePosition(body.metaapiToken, accountId, body.signal);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
