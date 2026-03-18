import { useState, useMemo } from 'react';
import { useScanner, type TechSignal, type SignalType } from '../../api/hooks/use-scanner';
import { useAppStore } from '../../stores/use-app-store';
import { useT } from '../../i18n';
import { ScanLine, RefreshCw } from 'lucide-react';

type FilterMode = 'all' | 'bullish' | 'bearish';

const BULLISH_SIGNALS: Set<SignalType> = new Set(['golden_cross', 'rsi_oversold', 'macd_bullish', 'near_52w_low', 'volume_breakout']);
const BEARISH_SIGNALS: Set<SignalType> = new Set(['death_cross', 'rsi_overbought', 'macd_bearish', 'near_52w_high']);

const SIGNAL_COLORS: Record<SignalType, string> = {
  golden_cross: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  death_cross: 'text-red-400 bg-red-400/10 border-red-400/30',
  rsi_overbought: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  rsi_oversold: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  macd_bullish: 'text-green-400 bg-green-400/10 border-green-400/30',
  macd_bearish: 'text-rose-400 bg-rose-400/10 border-rose-400/30',
  volume_breakout: 'text-violet-400 bg-violet-400/10 border-violet-400/30',
  near_52w_high: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  near_52w_low: 'text-teal-400 bg-teal-400/10 border-teal-400/30',
};

const SIGNAL_LABELS: Record<SignalType, string> = {
  golden_cross: 'Golden Cross',
  death_cross: 'Death Cross',
  rsi_overbought: 'RSI Overbought',
  rsi_oversold: 'RSI Oversold',
  macd_bullish: 'MACD Bullish',
  macd_bearish: 'MACD Bearish',
  volume_breakout: 'Volume Breakout',
  near_52w_high: '52W High',
  near_52w_low: '52W Low',
};

export function ScannerPanel() {
  const t = useT();
  const [filter, setFilter] = useState<FilterMode>('all');
  const { data: signals, isLoading, refetch } = useScanner();
  const setSelectedSymbol = useAppStore((s) => s.setSelectedSymbol);

  const filtered = useMemo(() => {
    if (!signals) return [];
    if (filter === 'all') return signals;
    if (filter === 'bullish') return signals.filter((s) => BULLISH_SIGNALS.has(s.signal));
    return signals.filter((s) => BEARISH_SIGNALS.has(s.signal));
  }, [signals, filter]);

  // Count by type
  const counts = useMemo(() => {
    if (!signals) return { bullish: 0, bearish: 0 };
    return {
      bullish: signals.filter((s) => BULLISH_SIGNALS.has(s.signal)).length,
      bearish: signals.filter((s) => BEARISH_SIGNALS.has(s.signal)).length,
    };
  }, [signals]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-violet-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-violet-400">
            {t('panelScanner')}
          </span>
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-violet-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter + summary */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 bg-black/60 shrink-0">
        <div className="flex gap-1">
          {(['all', 'bullish', 'bearish'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-wider border transition-colors ${
                filter === mode
                  ? mode === 'bullish'
                    ? 'border-bullish/40 text-bullish bg-bullish/10'
                    : mode === 'bearish'
                      ? 'border-bearish/40 text-bearish bg-bearish/10'
                      : 'border-violet-400/40 text-violet-400 bg-violet-400/10'
                  : 'border-border/20 text-neutral/30 hover:text-neutral/60'
              }`}
            >
              {t(`scan_${mode}`)}
            </button>
          ))}
        </div>
        <div className="text-[8px] font-mono text-neutral/40">
          <span className="text-bullish">{counts.bullish}</span>
          {' / '}
          <span className="text-bearish">{counts.bearish}</span>
          {' '}signals
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !signals && (
          <div className="text-center py-8">
            <div className="text-violet-400 text-[9px] font-mono uppercase animate-pulse mb-1">
              {t('scannerScanning')}
            </div>
            <div className="text-[7px] font-mono text-neutral/30">
              {t('scannerScanDesc')}
            </div>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {t('scannerNoSignals')}
          </div>
        )}

        {filtered.map((sig, i) => (
          <button
            key={`${sig.symbol}-${sig.signal}-${i}`}
            onClick={() => setSelectedSymbol(sig.symbol)}
            className="w-full text-left px-3 py-2 border-b border-border/10 hover:bg-white/[0.02] transition-colors group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-white group-hover:text-violet-300">
                  {sig.symbol}
                </span>
                <span className={`text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 border ${SIGNAL_COLORS[sig.signal]}`}>
                  {SIGNAL_LABELS[sig.signal]}
                </span>
              </div>
              <span className={`text-[9px] font-mono font-bold ${sig.changePercent >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                {sig.changePercent >= 0 ? '+' : ''}{sig.changePercent.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-neutral/40">{sig.description}</span>
              <span className="text-[9px] font-mono text-neutral/50">${sig.price.toFixed(2)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
