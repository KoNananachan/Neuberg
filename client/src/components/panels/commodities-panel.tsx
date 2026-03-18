import { useState, useMemo } from 'react';
import { useCommodities, type CommodityQuote } from '../../api/hooks/use-commodities';
import { useT } from '../../i18n';
import { Flame, RefreshCw } from 'lucide-react';

type CategoryFilter = 'all' | 'energy' | 'metals' | 'agriculture';

export function CommoditiesPanel() {
  const t = useT();
  const [category, setCategory] = useState<CategoryFilter>('all');
  const { data: commodities, isLoading, refetch } = useCommodities();

  const filtered = useMemo(() => {
    if (!commodities) return [];
    if (category === 'all') return commodities;
    return commodities.filter((c) => c.category === category);
  }, [commodities, category]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-orange-400">
            {t('panelCommodities')}
          </span>
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-orange-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['all', 'energy', 'metals', 'agriculture'] as CategoryFilter[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              category === cat
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-neutral/40 hover:text-neutral'
            }`}
          >
            {t(`cmd_${cat}`)}
          </button>
        ))}
      </div>

      {/* Column header */}
      <div className="grid grid-cols-[1.2fr_0.8fr_0.6fr_0.6fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
        <span>{t('cmdName')}</span>
        <span className="text-right">{t('price')}</span>
        <span className="text-right">{t('moversChange')}</span>
        <span className="text-right">{t('cmdUnit')}</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !commodities && (
          <div className="text-center py-8 text-orange-400 text-[9px] font-mono uppercase animate-pulse">
            {t('loading')}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {t('noData')}
          </div>
        )}

        {filtered.map((c) => (
          <CommodityRow key={c.symbol} commodity={c} />
        ))}
      </div>

      {/* Summary bar */}
      {commodities && commodities.length > 0 && (
        <SummaryBar commodities={commodities} />
      )}
    </div>
  );
}

function CommodityRow({ commodity: c }: { commodity: CommodityQuote }) {
  const isPositive = c.changePercent >= 0;
  const pctAbs = Math.abs(c.changePercent);
  // Heat intensity for background
  const heat = Math.min(pctAbs / 5, 1); // max heat at 5%

  return (
    <div
      className="grid grid-cols-[1.2fr_0.8fr_0.6fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors relative"
    >
      {/* Heat background */}
      <div
        className={`absolute inset-0 ${isPositive ? 'bg-bullish' : 'bg-bearish'}`}
        style={{ opacity: heat * 0.06 }}
      />
      <div className="relative z-10">
        <div className="text-[10px] font-mono font-bold text-white">{c.name}</div>
        <div className="text-[7px] font-mono text-neutral/30">{c.symbol.replace('=F', '')}</div>
      </div>
      <span className="text-[10px] font-mono text-white text-right self-center relative z-10">
        {fmtPrice(c.price)}
      </span>
      <span className={`text-[10px] font-mono font-bold text-right self-center relative z-10 ${
        isPositive ? 'text-bullish' : 'text-bearish'
      }`}>
        {isPositive ? '+' : ''}{c.changePercent.toFixed(2)}%
      </span>
      <span className="text-[8px] font-mono text-neutral/40 text-right self-center relative z-10">
        {c.unit}
      </span>
    </div>
  );
}

function SummaryBar({ commodities }: { commodities: CommodityQuote[] }) {
  const up = commodities.filter((c) => c.changePercent > 0).length;
  const down = commodities.filter((c) => c.changePercent < 0).length;
  const flat = commodities.length - up - down;

  return (
    <div className="px-3 py-1.5 border-t border-border/30 bg-[#050505] shrink-0 flex items-center gap-3 text-[8px] font-mono">
      <span className="text-bullish">{up} up</span>
      <span className="text-bearish">{down} down</span>
      {flat > 0 && <span className="text-neutral/30">{flat} flat</span>}
      <span className="ml-auto text-neutral/25">{commodities.length} contracts</span>
    </div>
  );
}

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(4);
}
