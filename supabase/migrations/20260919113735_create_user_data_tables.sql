/*
# Create user data tables for cloud persistence

## Summary
Creates three tables to persist per-user data across devices:
- `user_settings`: stores paper trading balance, API/exchange config, MT5 broker config, copy-signals toggle, and strategy preferences.
- `trade_history`: stores closed trade records for each user.
- `mt5_connections`: stores MetaTrader 5 / MetaApi connection parameters and last-known account info.

## New Tables

### user_settings
- `id` (uuid, primary key)
- `user_id` (uuid, not null, defaults to auth.uid(), references auth.users)
- `balance` (numeric, default 25) — paper trading balance
- `starting_balance` (numeric, default 25)
- `exchange` (text, default 'Binance')
- `public_key` (text, default '')
- `secret_key` (text, default '')
- `sandbox` (boolean, default true)
- `mt5_server` (text, default '')
- `mt5_login` (text, default '')
- `mt5_password` (text, default '')
- `metaapi_token` (text, default '')
- `copy_signals` (boolean, default false)
- `active_timeframe` (text, default '1m')
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### trade_history
- `id` (uuid, primary key)
- `user_id` (uuid, not null, defaults to auth.uid(), references auth.users)
- `symbol` (text)
- `side` (text) — 'long' or 'short'
- `entry_price` (numeric)
- `exit_price` (numeric)
- `quantity` (numeric)
- `take_profit` (numeric)
- `stop_loss` (numeric)
- `pnl` (numeric)
- `pnl_pct` (numeric)
- `tier` (text)
- `close_reason` (text)
- `opened_at` (bigint) — epoch ms
- `closed_at` (bigint) — epoch ms
- `created_at` (timestamptz)

### mt5_connections
- `id` (uuid, primary key)
- `user_id` (uuid, not null, defaults to auth.uid(), references auth.users, unique)
- `server` (text)
- `login` (text)
- `password` (text)
- `metaapi_token` (text)
- `account_id` (text) — MetaApi provisioning account ID
- `last_balance` (numeric)
- `last_equity` (numeric)
- `last_margin` (numeric)
- `connected_at` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## Security
- RLS enabled on all three tables.
- Owner-scoped CRUD policies (4 per table) using auth.uid() = user_id.
- No public/anon access — authenticated only.
*/

CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 25,
  starting_balance numeric NOT NULL DEFAULT 25,
  exchange text NOT NULL DEFAULT 'Binance',
  public_key text NOT NULL DEFAULT '',
  secret_key text NOT NULL DEFAULT '',
  sandbox boolean NOT NULL DEFAULT true,
  mt5_server text NOT NULL DEFAULT '',
  mt5_login text NOT NULL DEFAULT '',
  mt5_password text NOT NULL DEFAULT '',
  metaapi_token text NOT NULL DEFAULT '',
  copy_signals boolean NOT NULL DEFAULT false,
  active_timeframe text NOT NULL DEFAULT '1m',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON user_settings;
CREATE POLICY "select_own_settings" ON user_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_settings" ON user_settings;
CREATE POLICY "insert_own_settings" ON user_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_settings" ON user_settings;
CREATE POLICY "update_own_settings" ON user_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_settings" ON user_settings;
CREATE POLICY "delete_own_settings" ON user_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS trade_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  side text NOT NULL,
  entry_price numeric NOT NULL,
  exit_price numeric NOT NULL,
  quantity numeric NOT NULL,
  take_profit numeric NOT NULL,
  stop_loss numeric NOT NULL,
  pnl numeric NOT NULL,
  pnl_pct numeric NOT NULL,
  tier text NOT NULL,
  close_reason text,
  opened_at bigint NOT NULL,
  closed_at bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_trades" ON trade_history;
CREATE POLICY "select_own_trades" ON trade_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_trades" ON trade_history;
CREATE POLICY "insert_own_trades" ON trade_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_trades" ON trade_history;
CREATE POLICY "update_own_trades" ON trade_history FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_trades" ON trade_history;
CREATE POLICY "delete_own_trades" ON trade_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS mt5_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  server text NOT NULL DEFAULT '',
  login text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  metaapi_token text NOT NULL DEFAULT '',
  account_id text NOT NULL DEFAULT '',
  last_balance numeric,
  last_equity numeric,
  last_margin numeric,
  connected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE mt5_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_mt5" ON mt5_connections;
CREATE POLICY "select_own_mt5" ON mt5_connections FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_mt5" ON mt5_connections;
CREATE POLICY "insert_own_mt5" ON mt5_connections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_mt5" ON mt5_connections;
CREATE POLICY "update_own_mt5" ON mt5_connections FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_mt5" ON mt5_connections;
CREATE POLICY "delete_own_mt5" ON mt5_connections FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trade_history_user_id ON trade_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_mt5_connections_user_id ON mt5_connections(user_id);