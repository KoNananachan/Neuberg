import { useMemo } from 'react';
import { useGlobalMarkets, type MarketItem } from '../../api/hooks/use-global-markets';
import { useT } from '../../i18n';
import { Globe2, RefreshCw } from 'lucide-react';

const CATEGORY_ORDER = ['indices', 'bonds', 'volatility', 'commodities', 'fx', 'crypto'];

export function GlobalDashboardPanel() {
  const t = useT();
  const { data: items, isLoading, refetch } = useGlobalMarkets();

  const grouped = useMemo(() => {
    if (!items) return new Map<string, MarketItem[]>();
    const map = new Map<string, MarketItem[]>();
    for (const item of items) {
      const arr = map.get(item.category) ?? [];
      arr.push(item);
      map.set(item.category, arr);
    }
    return map;
  }, [items]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (!items || items.length === 0) return null;
    const indices = items.filter((i) => i.category === 'indices');
    const up = indices.filter((i) => i.changePercent > 0).length;
    const vix = items.find((i) => i.symbol === '^VIX');
    return { indicesUp: up, indicesTotal: indices.length, vix };
  }, [items]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-blue-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-blue-400">
            {t('panelGlobalDashboard')}
          </span>
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-blue-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary bar */}
      {stats && (
        <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border/20 bg-black/60 shrink-0 text-[8px] font-mono">
          <span className="text-neutral/40">
            {t('gdIndices')}: <span className="text-bullish">{stats.indicesUp}</span>
            /<span className="text-bearish">{stats.indicesTotal - stats.indicesUp}</span>
          </span>
          {stats.vix && (
            <span className="text-neutral/40">
              VIX: <span className={stats.vix.price > 20 ? 'text-bearish font-bold' : 'text-bullish font-bold'}>
                {stats.vix.price.toFixed(2)}
              </span>
              <span className={`ml-1 ${stats.vix.changePercent >= 0 ? 'text-bearish' : 'text-bullish'}`}>
                {stats.vix.changePercent >= 0 ? '+' : ''}{stats.vix.changePercent.toFixed(1)}%
              </span>
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !items && (
          <div className="text-center py-8 text-blue-400 text-[9px] font-mono uppercase animate-pulse">
            {t('loading')}
          </div>
        )}

        {CATEGORY_ORDER.map((cat) => {
          const catItems = grouped.get(cat);
          if (!catItems || catItems.length === 0) return null;
          return (
            <div key={cat}>
              <div className="px-3 py-1 bg-white/[0.02] border-b border-border/20">
                <span className="text-[7px] font-black uppercase tracking-[0.15em] text-blue-400/60">
                  {t(`gd_${cat}` as any)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border/5">
                {catItems.map((item) => (
                  <MarketTile key={item.symbol} item={item} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MarketTile({ item }: { item: MarketItem }) {
  const isPositive = item.changePercent >= 0;
  const heat = Math.min(Math.abs(item.changePercent) / 3, 1);

  return (
    <div className="px-3 py-2 bg-black relative overflow-hidden hover:bg-white/[0.02] transition-colors">
      {/* Heat background */}
      <div
        className={`absolute inset-0 ${isPositive ? 'bg-bullish' : 'bg-bearish'}`}
        style={{ opacity: heat * 0.08 }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono text-neutral/50 uppercase">{item.name}</span>
          <span className={`text-[9px] font-mono font-bold ${isPositive ? 'text-bullish' : 'text-bearish'}`}>
            {isPositive ? '+' : ''}{item.changePercent.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-[14px] font-mono font-black text-white">
            {fmtPrice(item.price, item.category)}
          </span>
          <span className={`text-[8px] font-mono ${isPositive ? 'text-bullish/60' : 'text-bearish/60'}`}>
            {isPositive ? '+' : ''}{item.change.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

function fmtPrice(n: number, category: string): string {
  if (category === 'fx' && n < 200) return n.toFixed(4);
  if (category === 'bonds') return n.toFixed(3) + '%';
  if (category === 'crypto' && n >= 1000) return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (n >= 10000) return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (n >= 100) return n.toFixed(2);
  return n.toFixed(2);
}
