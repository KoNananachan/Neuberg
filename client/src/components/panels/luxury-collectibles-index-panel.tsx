import { useState } from 'react';
import { useLuxuryCollectiblesIndex } from '../../api/hooks/use-luxury-collectibles-index';
import { RefreshCw, Gem } from 'lucide-react';

type Tab = 'indices' | 'auctions' | 'wine' | 'watches';

const TABS: Tab[] = ['indices', 'auctions', 'wine', 'watches'];

const TAB_LABELS: Record<Tab, string> = {
  indices: 'INDICES',
  auctions: 'AUCTIONS',
  wine: 'WINE',
  watches: 'WATCHES',
};

/* ---------- Formatters ---------- */

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '$' + n.toFixed(0);
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '--';
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(1) + '%';
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2);
}

function fmtIndex(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtRatio(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2) + 'x';
}

function pctColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  return n >= 0 ? 'text-emerald-400' : 'text-red-400';
}

function premiumColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  return n >= 0 ? 'text-emerald-400' : 'text-red-400';
}

/* ---------- Main Panel ---------- */

export function LuxuryCollectiblesIndexPanel() {
  const [tab, setTab] = useState<Tab>('indices');
  const { data, isLoading, refetch } = useLuxuryCollectiblesIndex();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-yellow-500/30 shrink-0">
        <div className="flex items-center gap-2">
          <Gem className="w-4 h-4 text-yellow-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-yellow-400">
            LUXURY & COLLECTIBLES INDEX
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-yellow-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 bg-black/40 shrink-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-wider border-b-2 transition-colors ${
              tab === t
                ? 'text-yellow-400 border-yellow-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex items-center justify-center py-8">
            <span className="text-[9px] font-mono text-yellow-400 uppercase tracking-wider animate-pulse">
              LOADING COLLECTIBLES DATA...
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
            FAILED TO LOAD COLLECTIBLES DATA
          </div>
        )}

        {data && tab === 'indices' && <IndicesTab data={data} />}
        {data && tab === 'auctions' && <AuctionsTab data={data} />}
        {data && tab === 'wine' && <WineTab data={data} />}
        {data && tab === 'watches' && <WatchesTab data={data} />}
      </div>
    </div>
  );
}

/* ---------- Indices Tab ---------- */

function IndicesTab({ data }: { data: any }) {
  const indices = data.indices ?? data.categories ?? [];
  if (!indices || indices.length === 0) return <EmptyState />;

  return (
    <div>
      {/* Section Header */}
      <div className="px-3 py-1.5 border-b border-yellow-500/30 bg-yellow-500/[0.03]">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 bg-yellow-400" />
          <span className="text-[7px] font-black uppercase tracking-widest text-yellow-400">
            Asset Category Performance
          </span>
        </div>
      </div>

      {/* Table Header */}
      <div className="px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider grid grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr_0.6fr_0.6fr_0.5fr_0.5fr_0.5fr]">
        <span>CATEGORY</span>
        <span className="text-right">INDEX LEVEL</span>
        <span className="text-right">YTD</span>
        <span className="text-right">1Y</span>
        <span className="text-right">5Y</span>
        <span className="text-right">10Y</span>
        <span className="text-right">VOL</span>
        <span className="text-right">SHARPE</span>
        <span className="text-right">CORR</span>
      </div>

      {indices.map((idx: any, i: number) => (
        <div
          key={idx.category ?? idx.name ?? i}
          className={`grid grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr_0.6fr_0.6fr_0.5fr_0.5fr_0.5fr] px-3 py-1.5 border-b border-border/20 hover:bg-yellow-400/[0.02] transition-colors items-center ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-yellow-400 truncate">
            {idx.category ?? idx.name}
          </span>
          <span className="text-[9px] font-mono font-bold text-white text-right tabular-nums">
            {fmtIndex(idx.indexLevel ?? idx.level ?? idx.value)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right tabular-nums ${pctColor(idx.ytd ?? idx.ytdReturn)}`}>
            {fmtPct(idx.ytd ?? idx.ytdReturn)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right tabular-nums ${pctColor(idx.oneYear ?? idx.return1Y)}`}>
            {fmtPct(idx.oneYear ?? idx.return1Y)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right tabular-nums ${pctColor(idx.fiveYear ?? idx.return5Y)}`}>
            {fmtPct(idx.fiveYear ?? idx.return5Y)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right tabular-nums ${pctColor(idx.tenYear ?? idx.return10Y)}`}>
            {fmtPct(idx.tenYear ?? idx.return10Y)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right tabular-nums">
            {idx.volatility != null ? fmtNum(idx.volatility) : '--'}
          </span>
          <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">
            {idx.sharpe != null ? fmtNum(idx.sharpe) : '--'}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right tabular-nums">
            {idx.correlation != null ? fmtNum(idx.correlation) : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Auctions Tab ---------- */

function AuctionsTab({ data }: { data: any }) {
  const auctions = data.auctions ?? data.recentAuctions ?? [];
  if (!auctions || auctions.length === 0) return <EmptyState />;

  return (
    <div>
      {/* Section Header */}
      <div className="px-3 py-1.5 border-b border-yellow-500/30 bg-yellow-500/[0.03]">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 bg-yellow-400" />
          <span className="text-[7px] font-black uppercase tracking-widest text-yellow-400">
            Recent Auction Results
          </span>
        </div>
      </div>

      {/* Table Header */}
      <div className="px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider grid grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_0.5fr_0.7fr]">
        <span>ITEM</span>
        <span>HOUSE</span>
        <span className="text-right">PRICE</span>
        <span className="text-right">ESTIMATE</span>
        <span className="text-right">HAMMER</span>
        <span>CATEGORY</span>
      </div>

      {auctions.map((a: any, i: number) => (
        <div
          key={a.item ?? a.title ?? a.id ?? i}
          className={`grid grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_0.5fr_0.7fr] px-3 py-1.5 border-b border-border/20 hover:bg-yellow-400/[0.02] transition-colors items-center ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-yellow-400 truncate">
            {a.item ?? a.title ?? a.name}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {a.house ?? a.auctionHouse ?? '--'}
          </span>
          <span className="text-[9px] font-mono font-bold text-white text-right tabular-nums">
            {fmtMoney(a.price ?? a.hammerPrice ?? a.soldPrice)}
          </span>
          <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">
            {fmtMoney(a.estimate ?? a.highEstimate)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right tabular-nums ${
            (a.hammerRatio ?? a.ratio) != null
              ? (a.hammerRatio ?? a.ratio) >= 1 ? 'text-emerald-400' : 'text-red-400'
              : 'text-neutral-500'
          }`}>
            {fmtRatio(a.hammerRatio ?? a.ratio)}
          </span>
          <span className="text-[7px] font-mono font-bold uppercase px-1 py-0.5 bg-yellow-500/10 text-yellow-400/70 border border-yellow-500/20 text-center whitespace-nowrap truncate">
            {a.category ?? a.type ?? '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Wine Tab ---------- */

function WineTab({ data }: { data: any }) {
  const wines = data.wine ?? data.wines ?? data.wineMarket ?? [];
  if (!wines || wines.length === 0) return <EmptyState />;

  return (
    <div>
      {/* Section Header */}
      <div className="px-3 py-1.5 border-b border-yellow-500/30 bg-yellow-500/[0.03]">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 bg-yellow-400" />
          <span className="text-[7px] font-black uppercase tracking-widest text-yellow-400">
            Fine Wine Market
          </span>
        </div>
      </div>

      {/* Table Header */}
      <div className="px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider grid grid-cols-[1.4fr_0.4fr_0.7fr_0.4fr_0.7fr_0.6fr]">
        <span>NAME</span>
        <span className="text-right">VINTAGE</span>
        <span>REGION</span>
        <span className="text-right">SCORE</span>
        <span className="text-right">PRICE/CASE</span>
        <span className="text-right">12MO CHG</span>
      </div>

      {wines.map((w: any, i: number) => (
        <div
          key={w.name ?? w.wine ?? i}
          className={`grid grid-cols-[1.4fr_0.4fr_0.7fr_0.4fr_0.7fr_0.6fr] px-3 py-1.5 border-b border-border/20 hover:bg-yellow-400/[0.02] transition-colors items-center ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-yellow-400 truncate">
            {w.name ?? w.wine}
          </span>
          <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">
            {w.vintage ?? '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {w.region ?? '--'}
          </span>
          <span className="text-[9px] font-mono font-bold text-white text-right tabular-nums">
            {w.score ?? w.rating ?? '--'}
          </span>
          <span className="text-[9px] font-mono font-bold text-white text-right tabular-nums">
            {fmtPrice(w.pricePerCase ?? w.price)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right tabular-nums ${pctColor(w.change12m ?? w.twelveMonthChange ?? w.change)}`}>
            {fmtPct(w.change12m ?? w.twelveMonthChange ?? w.change)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Watches Tab ---------- */

function WatchesTab({ data }: { data: any }) {
  const watches = data.watches ?? data.watchMarket ?? [];
  if (!watches || watches.length === 0) return <EmptyState />;

  return (
    <div>
      {/* Section Header */}
      <div className="px-3 py-1.5 border-b border-yellow-500/30 bg-yellow-500/[0.03]">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 bg-yellow-400" />
          <span className="text-[7px] font-black uppercase tracking-widest text-yellow-400">
            Luxury Watch Market
          </span>
        </div>
      </div>

      {/* Table Header */}
      <div className="px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider grid grid-cols-[0.7fr_1.1fr_0.7fr_0.7fr_0.6fr]">
        <span>BRAND</span>
        <span>MODEL</span>
        <span className="text-right">RETAIL</span>
        <span className="text-right">MARKET</span>
        <span className="text-right">PREM/DISC</span>
      </div>

      {watches.map((w: any, i: number) => {
        const premium = w.premium ?? w.premiumDiscount ?? w.premiumPct;
        return (
          <div
            key={`${w.brand ?? ''}-${w.model ?? ''}-${i}`}
            className={`grid grid-cols-[0.7fr_1.1fr_0.7fr_0.7fr_0.6fr] px-3 py-1.5 border-b border-border/20 hover:bg-yellow-400/[0.02] transition-colors items-center ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <span className="text-[9px] font-mono font-bold text-yellow-400 truncate">
              {w.brand ?? '--'}
            </span>
            <span className="text-[8px] font-mono text-neutral-300 truncate">
              {w.model ?? w.reference ?? '--'}
            </span>
            <span className="text-[9px] font-mono text-neutral-400 text-right tabular-nums">
              {fmtPrice(w.retail ?? w.retailPrice)}
            </span>
            <span className="text-[9px] font-mono font-bold text-white text-right tabular-nums">
              {fmtPrice(w.market ?? w.marketPrice)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right tabular-nums ${premiumColor(premium)}`}>
              {premium != null ? fmtPct(premium) : '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Shared Components ---------- */

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
      NO DATA AVAILABLE
    </div>
  );
}
