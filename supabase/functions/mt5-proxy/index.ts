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

const META_API_BASE = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";
const META_API_CLIENT_BASE = "https://mt-client-api-v1.new-york.agiliumtrade.ai";

async function provisionAccount(token: string, server: string, login: string, password: string) {
  const res = await fetch(`${META_API_BASE}/users/current/accounts`, {
    method: "GET",
    headers: {
      "auth-token": token,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MetaApi auth check failed (${res.status}): ${text}`);
  }
  const accounts = await res.json();

  const existing = accounts.find(
    (account: any) => String(account.login) === login && account.server === server,
  );

  if (existing) {
    const existingId = existing.id ?? existing._id;
    if (!existingId) {
      throw new Error(`Existing account found but has no id. Response: ${JSON.stringify(existing)}`);
    }
    return { accountId: existingId, provisioned: false };
  }

  const createRes = await fetch(`${META_API_BASE}/users/current/accounts`, {
    method: "POST",
    headers: {
      "auth-token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `bolt-${login}`,
      login,
      password,
      server,
      platform: "mt5",
      magic: 0,
      region: "new-york",
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Account provisioning failed (${createRes.status}): ${text}`);
  }

  const created = await createRes.json();
  const newAccountId = created.id ?? created.accountId ?? created._id;
  if (!newAccountId) {
    throw new Error(`Provisioning succeeded but no account id in response: ${JSON.stringify(created)}`);
  }
  return { accountId: newAccountId, provisioned: true };
}

async function getAccountInfo(token: string, accountId: string) {
  const res = await fetch(
    `${META_API_CLIENT_BASE}/users/current/accounts/${accountId}/account-information`,
    {
    method: "GET",
    headers: {
      "auth-token": token,
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

async function getAccountState(token: string, accountId: string): Promise<{ state: string; connectionStatus: string }> {
  const res = await fetch(
    `${META_API_BASE}/users/current/accounts/${accountId}`,
    {
      method: "GET",
      headers: {
        "auth-token": token,
        "Content-Type": "application/json",
      },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Account state fetch failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return {
    state: data.state ?? "UNKNOWN",
    connectionStatus: data.connectionStatus ?? "UNKNOWN",
  };
}

async function deployAccount(token: string, accountId: string) {
  const res = await fetch(
    `${META_API_BASE}/users/current/accounts/${accountId}/deploy`,
    {
      method: "POST",
      headers: {
        "auth-token": token,
        "Content-Type": "application/json",
      },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Account deploy failed (${res.status}): ${text}`);
  }
}

async function waitForConnection(
  token: string,
  accountId: string,
  maxWaitMs = 30000,
): Promise<{ state: string; connectionStatus: string }> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const status = await getAccountState(token, accountId);
    if (status.connectionStatus === "DEPLOYED" || status.state === "DEPLOYED") {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  const last = await getAccountState(token, accountId);
  return last;
}

async function ensureAccountReady(token: string, accountId: string) {
  const status = await getAccountState(token, accountId);
  if (status.state !== "DEPLOYED" && status.connectionStatus !== "DEPLOYED") {
    await deployAccount(token, accountId);
    await waitForConnection(token, accountId);
  }
}

async function sendTradeSignal(
  token: string,
  accountId: string,
  signal: NonNullable<MT5Request["signal"]>,
) {
  const body: Record<string, unknown> = {
    actionType: signal.action === "BUY" ? "ORDER_TYPE_BUY" : "ORDER_TYPE_SELL",
    symbol: signal.symbol,
    volume: signal.volume,
  };

  if (signal.takeProfit !== undefined && signal.takeProfit > 0) {
    body.takeProfit = signal.takeProfit;
  }
  if (signal.stopLoss !== undefined && signal.stopLoss > 0) {
    body.stopLoss = signal.stopLoss;
  }

  const res = await fetch(
    `${META_API_CLIENT_BASE}/users/current/accounts/${accountId}/trade`,
    {
      method: "POST",
      headers: {
        "auth-token": token,
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
  const body: Record<string, unknown> = {
    actionType: signal.action === "BUY" ? "ORDER_TYPE_SELL" : "ORDER_TYPE_BUY",
    symbol: signal.symbol,
    volume: signal.volume,
  };

  const res = await fetch(
    `${META_API_CLIENT_BASE}/users/current/accounts/${accountId}/trade`,
    {
      method: "POST",
      headers: {
        "auth-token": token,
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
      await ensureAccountReady(body.metaapiToken, accountId);
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
      await ensureAccountReady(body.metaapiToken, accountId);
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
      await ensureAccountReady(body.metaapiToken, accountId);
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
