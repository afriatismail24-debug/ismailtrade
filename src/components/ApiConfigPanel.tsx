import { useState } from 'react';
import {
  Key,
  Eye,
  EyeOff,
  Shield,
  Save,
  FlaskConical,
  Server,
  Link2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { ApiConfig, Exchange, Mode, MT5Config, MT5AccountInfo } from '@/types';
import { testMT5Connection } from '@/lib/mt5Service';

interface Props {
  config: ApiConfig;
  onSave: (config: ApiConfig) => void;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  mt5Config: MT5Config;
  onSaveMT5: (config: MT5Config) => void;
  copySignals: boolean;
  onCopySignalsChange: (enabled: boolean) => void;
}

const exchanges: Exchange[] = ['Binance', 'OKX', 'Kraken', 'MetaTrader5'];

export function ApiConfigPanel({
  config,
  onSave,
  mode,
  onModeChange,
  mt5Config,
  onSaveMT5,
  copySignals,
  onCopySignalsChange,
}: Props) {
  const [local, setLocal] = useState<ApiConfig>(config);
  const [mt5, setMt5] = useState<MT5Config>(mt5Config);
  const [showPublic, setShowPublic] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showMt5Pass, setShowMt5Pass] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mt5Saved, setMt5Saved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: boolean; info?: MT5AccountInfo; error?: string } | null
  >(null);

  const handleSave = () => {
    onSave(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveMT5 = () => {
    onSaveMT5(mt5);
    setMt5Saved(true);
    setTimeout(() => setMt5Saved(false), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testMT5Connection(mt5);
    setTestResult({ ok: result.success, info: result.info, error: result.error });
    if (result.success && result.accountId) {
      setMt5({ ...mt5, accountId: result.accountId });
      onSaveMT5({ ...mt5, accountId: result.accountId });
    }
    setTesting(false);
  };

  const isMT5 = local.exchange === 'MetaTrader5';

  return (
    <div className="space-y-5">
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-bold text-white">API Configuration</h2>
        </div>

        {/* Mode selector */}
        <div>
          <label className="text-[11px] text-slate-400 uppercase tracking-wider mb-2 block">
            Trading Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['paper', 'testnet', 'live'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all border ${
                  mode === m
                    ? m === 'paper'
                      ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                      : m === 'testnet'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-rose-500 bg-rose-500/10 text-rose-300'
                    : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                }`}
              >
                {m === 'paper' && <FlaskConical className="w-3.5 h-3.5 inline mr-1" />}
                {m === 'testnet' && <Shield className="w-3.5 h-3.5 inline mr-1" />}
                {m === 'live' && <Key className="w-3.5 h-3.5 inline mr-1" />}
                {m}
              </button>
            ))}
          </div>
          {mode === 'paper' && (
            <p className="text-[10px] text-sky-300 mt-1.5">
              Paper Trading Simulator — simulate trades without real API keys.
            </p>
          )}
        </div>

        {/* Exchange selection */}
        <div>
          <label className="text-[11px] text-slate-400 uppercase tracking-wider mb-2 block">
            Exchange / Broker
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {exchanges.map((ex) => (
              <button
                key={ex}
                onClick={() => setLocal({ ...local, exchange: ex })}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                  local.exchange === ex
                    ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                    : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                }`}
              >
                {ex === 'MetaTrader5' ? 'MT5' : ex}
              </button>
            ))}
          </div>
        </div>

        {/* Standard API keys (hidden for MT5) */}
        {!isMT5 && (
          <>
            <div>
              <label className="text-[11px] text-slate-400 uppercase tracking-wider mb-2 block">
                Public Key
              </label>
              <div className="relative">
                <input
                  type={showPublic ? 'text' : 'password'}
                  value={local.publicKey}
                  onChange={(e) => setLocal({ ...local, publicKey: e.target.value })}
                  placeholder="Enter public API key"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none transition-colors"
                />
                <button
                  onClick={() => setShowPublic(!showPublic)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPublic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 uppercase tracking-wider mb-2 block">
                Secret Key
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={local.secretKey}
                  onChange={(e) => setLocal({ ...local, secretKey: e.target.value })}
                  placeholder="Enter secret API key"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none transition-colors"
                />
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2.5 border border-slate-700">
              <div>
                <p className="text-sm text-white font-medium">Sandbox / Testnet Mode</p>
                <p className="text-[10px] text-slate-400">
                  Route orders to exchange testnet (recommended)
                </p>
              </div>
              <button
                onClick={() => setLocal({ ...local, sandbox: !local.sandbox })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  local.sandbox ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    local.sandbox ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
          </>
        )}

        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold transition-colors"
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Configuration'}
        </button>
      </div>

      {/* MT5 Configuration Section */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white">MetaTrader 5 (MT5) Broker Connection</h2>
        </div>

        <p className="text-[10px] text-slate-400">
          Connect your MT5 account via MetaApi cloud proxy. Trades and signals are sent
          through the proxy to your broker server.
        </p>

        {/* MT5 Server */}
        <div>
          <label className="text-[11px] text-slate-400 uppercase tracking-wider mb-2 block">
            MT5 Server
          </label>
          <input
            type="text"
            value={mt5.server}
            onChange={(e) => setMt5({ ...mt5, server: e.target.value })}
            placeholder="e.g. MetaQuotes-Demo, ICMarkets-Live"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors"
          />
        </div>

        {/* MT5 Login */}
        <div>
          <label className="text-[11px] text-slate-400 uppercase tracking-wider mb-2 block">
            MT5 Account / Login Number
          </label>
          <input
            type="text"
            value={mt5.login}
            onChange={(e) => setMt5({ ...mt5, login: e.target.value })}
            placeholder="e.g. 12345678"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors"
          />
        </div>

        {/* MT5 Password */}
        <div>
          <label className="text-[11px] text-slate-400 uppercase tracking-wider mb-2 block">
            MT5 Password
          </label>
          <div className="relative">
            <input
              type={showMt5Pass ? 'text' : 'password'}
              value={mt5.password}
              onChange={(e) => setMt5({ ...mt5, password: e.target.value })}
              placeholder="MT5 account password"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors"
            />
            <button
              onClick={() => setShowMt5Pass(!showMt5Pass)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showMt5Pass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* MetaApi Token */}
        <div>
          <label className="text-[11px] text-slate-400 uppercase tracking-wider mb-2 block">
            MetaApi Cloud Token
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={mt5.metaapiToken}
              onChange={(e) => setMt5({ ...mt5, metaapiToken: e.target.value })}
              placeholder="MetaApi API token"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors"
            />
            <button
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Get your token at metaapi.cloud → API tokens
          </p>
        </div>

        {/* Connection test result */}
        {testResult && (
          <div
            className={`rounded-lg px-3 py-3 border text-xs ${
              testResult.ok
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {testResult.ok && testResult.info ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  MT5 Connection Successful
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">Balance:</span>{' '}
                    <span className="font-bold tabular-nums">
                      {testResult.info.currency} {testResult.info.balance?.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Equity:</span>{' '}
                    <span className="font-bold tabular-nums">
                      {testResult.info.equity?.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Margin:</span>{' '}
                    <span className="font-bold tabular-nums">
                      {testResult.info.margin?.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400">
                  Server: {testResult.info.server} | Login: {testResult.info.login}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{testResult.error ?? 'Connection failed'}</span>
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleTestConnection}
            disabled={testing || !mt5.metaapiToken}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold transition-colors"
          >
            {testing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5" />
                Test Connection
              </>
            )}
          </button>
          <button
            onClick={handleSaveMT5}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {mt5Saved ? 'Saved!' : 'Save MT5'}
          </button>
        </div>

        {/* Copy Signals toggle */}
        <div className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2.5 border border-slate-700">
          <div>
            <p className="text-sm text-white font-medium">Copy Signals to MT5</p>
            <p className="text-[10px] text-slate-400">
              Auto-forward strategy trade signals to your MT5 account
            </p>
          </div>
          <button
            onClick={() => onCopySignalsChange(!copySignals)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              copySignals ? 'bg-emerald-500' : 'bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                copySignals ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        {mt5.accountId && (
          <p className="text-[10px] text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" />
            MT5 account provisioned: {mt5.accountId}
          </p>
        )}
      </div>
    </div>
  );
}
