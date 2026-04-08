import { useState } from 'react';
import { useMarketMovers, type MoverQuote } from '../../api/hooks/use-market-movers';
import { useAppStore } from '../../stores/use-app-store';
import { useT } from '../../i18n';
import { TrendingUp, TrendingDown, BarChart3, RefreshCw } from 'lucide-react';

type Tab = 'gainers' | 'losers' | 'actives';

export function MarketMoversPanel() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('gainers');
  const { data, isLoading, refetch } = useMarketMovers();
  const setSelectedSymbol = useAppStore((s) => s.setSelectedSymbol);

  const list: MoverQuote[] = data?.[tab] ?? [];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['gainers', 'losers', 'actives'] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t_
                ? t_ === 'gainers'
                  ? 'border-bullish text-bullish'
                  : t_ === 'losers'
                    ? 'border-bearish text-bearish'
                    : 'border-violet-400 text-violet-400'
                : 'border-transparent text-neutral/40 hover:text-neutral'
            }`}
          >
            {t_ === 'gainers' && <TrendingUp className="w-2.5 h-2.5" />}
            {t_ === 'losers' && <TrendingDown className="w-2.5 h-2.5" />}
            {t_ === 'actives' && <BarChart3 className="w-2.5 h-2.5" />}
            {t(`movers_${t_}`)}
          </button>
        ))}
      </div>

      {/* Column header */}
      <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
        <span>{t('symbol')}</span>
        <span className="text-right">{t('price')}</span>
        <span className="text-right">{t('moversChange')}</span>
        <span className="text-right">{t('moversVolume')}</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-emerald-400 text-[9px] font-mono uppercase animate-pulse">
            {t('loading')}
          </div>
        )}

        {!isLoading && list.length === 0 && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {t('noData')}
          </div>
        )}

        {list.map((q, i) => (
          <button
            key={q.symbol}
            onClick={() => setSelectedSymbol(q.symbol)}
            className="w-full grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors text-left group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[8px] font-mono text-neutral/25 w-4 shrink-0">{i + 1}</span>
              <div className="min-w-0">
                <div className="text-[10px] font-mono font-bold text-white group-hover:text-emerald-300 truncate">
                  {q.symbol}
                </div>
                <div className="text-[7px] font-mono text-neutral/30 truncate">{q.name}</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-white text-right self-center">
              ${q.price.toFixed(2)}
            </span>
            <span className={`text-[10px] font-mono font-bold text-right self-center ${
              q.changePercent >= 0 ? 'text-bullish' : 'text-bearish'
            }`}>
              {q.changePercent >= 0 ? '+' : ''}{q.changePercent.toFixed(2)}%
            </span>
            <span className="text-[9px] font-mono text-neutral/50 text-right self-center">
              {fmtVolume(q.volume)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function fmtVolume(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}
