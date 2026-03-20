import { useState } from 'react';
import { useEquityCapitalMarkets } from '../../api/hooks/use-equity-capital-markets';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtCompact(n: number | null | undefined): string {
  if (n == null) return '--';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '--';
  return '$' + n.toFixed(2);
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function fmtDealSize(n: number | null | undefined): string {
  if (n == null) return '--';
  return '$' + fmtCompact(n);
}

// ── Color helpers ──

function returnColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function discountColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 5) return 'text-red-400';
  if (n > 2) return 'text-orange-400';
  return 'text-neutral-500';
}

// ── Status badge ──

function statusStyle(status: string): { text: string; bg: string } {
  switch (status.toLowerCase()) {
    case 'filed':
      return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/20' };
    case 'roadshow':
      return { text: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/20' };
    case 'priced':
      return { text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10 border border-fuchsia-500/20' };
    case 'trading':
      return { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/20' };
    case 'withdrawn':
      return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/20' };
    default:
      return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/20' };
  }
}

// ── Window status indicator ──

function windowStatusStyle(status: string): { text: string; bg: string; label: string } {
  switch (status.toLowerCase()) {
    case 'open':
      return { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/30', label: 'WINDOW OPEN' };
    case 'cautious':
      return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30', label: 'CAUTIOUS' };
    case 'closed':
      return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30', label: 'WINDOW SHUT' };
    default:
      return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/30', label: status.toUpperCase() };
  }
}

// ── Tabs ──

type TabKey = 'pipeline' | 'secondary' | 'blocks' | 'summary';

// ── Main Panel ──

export function EquityCapitalMarketsPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useEquityCapitalMarkets();
  const [activeTab, setActiveTab] = useState<TabKey>('pipeline');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'pipeline', label: tr(t, 'ecmIpoPipeline', 'IPO Pipeline') },
    { key: 'secondary', label: tr(t, 'ecmSecondary', 'Secondary') },
    { key: 'blocks', label: tr(t, 'ecmBlocks', 'Block Trades') },
    { key: 'summary', label: tr(t, 'ecmSummary', 'Summary') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-fuchsia-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-fuchsia-400">
            {tr(t, 'ecmTitle', 'Equity Capital Markets')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.summary?.windowStatus && (
            <WindowStatusBadge status={data.summary.windowStatus} />
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-fuchsia-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 px-3 py-1 border-b border-border/20 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab.key
                ? 'bg-fuchsia-500/20 text-fuchsia-400 font-bold'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-fuchsia-400/[0.02]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <div className="w-5 h-5 border-2 border-fuchsia-400/30 border-t-fuchsia-400 animate-spin" />
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <span className="text-[10px] font-mono text-red-400/60 uppercase tracking-widest">
              {tr(t, 'ecmLoadFailed', 'Failed to load ECM data')}
            </span>
            <button
              onClick={() => refetch()}
              className="text-[9px] font-mono text-fuchsia-400 hover:text-white border border-fuchsia-400/30 px-2 py-0.5 transition-colors"
            >
              {tr(t, 'retry', 'Retry')}
            </button>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-32 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            {tr(t, 'ecmNoData', 'No data available')}
          </div>
        ) : (
          <>
            {activeTab === 'pipeline' && <IpoPipelineTab data={data} t={t} />}
            {activeTab === 'secondary' && <SecondaryTab data={data} t={t} />}
            {activeTab === 'blocks' && <BlockTradesTab data={data} t={t} />}
            {activeTab === 'summary' && <MarketSummaryTab data={data} t={t} />}
          </>
        )}
      </div>

      {/* Status bar */}
      {data && (
        <div className="flex items-center gap-4 px-3 py-1 border-t border-border/10 text-[7px] font-mono text-neutral-600 bg-[#050505] shrink-0">
          <span>
            Pipeline: {data.ipoPipeline?.length ?? 0} deals
          </span>
          <span>
            YTD Vol: {fmtDealSize(data.summary?.ytdVolume ?? null)}
          </span>
          <span className="ml-auto">
            {data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Window Status Badge ──

function WindowStatusBadge({ status }: { status: string }) {
  const style = windowStatusStyle(status);
  return (
    <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider ${style.text} ${style.bg}`}>
      {style.label}
    </span>
  );
}

// ── Tab: IPO Pipeline ──

function IpoPipelineTab({
  data,
  t,
}: {
  data: ReturnType<typeof useEquityCapitalMarkets>['data'] & object;
  t: ReturnType<typeof useT>;
}) {
  const pipeline = data.ipoPipeline ?? [];

  if (pipeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
        {tr(t, 'ecmNoPipeline', 'No IPOs in pipeline')}
      </div>
    );
  }

  return (
    <>
      {/* Table header */}
      <div className="sticky top-0 z-10 bg-black/95 grid grid-cols-[1fr_50px_60px_45px_55px_60px_65px_50px_50px] text-[7px] font-mono text-neutral-500 uppercase tracking-wider px-3 py-1 border-b border-border/10">
        <span>{tr(t, 'company', 'Company')}</span>
        <span>{tr(t, 'ticker', 'Ticker')}</span>
        <span>{tr(t, 'sector', 'Sector')}</span>
        <span>{tr(t, 'exchange', 'Exch')}</span>
        <span>{tr(t, 'date', 'Date')}</span>
        <span className="text-right">{tr(t, 'ecmPriceRange', 'Range')}</span>
        <span className="text-right">{tr(t, 'ecmDealSize', 'Deal Size')}</span>
        <span className="text-center">{tr(t, 'status', 'Status')}</span>
        <span className="text-right">{tr(t, 'ecmFirstDay', '1st Day')}</span>
      </div>

      {/* Rows */}
      {pipeline.map((ipo: any, i: number) => {
        const style = statusStyle(ipo.status ?? '');
        return (
          <div
            key={`${ipo.ticker ?? ipo.company}-${i}`}
            className="grid grid-cols-[1fr_50px_60px_45px_55px_60px_65px_50px_50px] text-[9px] font-mono px-3 py-1.5 border-b border-border/5 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
          >
            <span className="text-gray-300 truncate pr-1">{ipo.company}</span>
            <span className="font-bold text-fuchsia-400">{ipo.ticker ?? '--'}</span>
            <span className="text-neutral-500 truncate">{ipo.sector ?? '--'}</span>
            <span className="text-neutral-500">{ipo.exchange ?? '--'}</span>
            <span className="text-neutral-500">{fmtDate(ipo.date)}</span>
            <span className="text-right text-gray-400">
              {ipo.priceLow != null && ipo.priceHigh != null
                ? `$${ipo.priceLow}-${ipo.priceHigh}`
                : fmtPrice(ipo.priceActual)}
            </span>
            <span className="text-right text-gray-300 font-bold">{fmtDealSize(ipo.dealSize)}</span>
            <span className="text-center">
              <span className={`px-1 py-px text-[7px] font-bold uppercase ${style.text} ${style.bg}`}>
                {ipo.status ?? '--'}
              </span>
            </span>
            <span className={`text-right font-bold tabular-nums ${returnColor(ipo.firstDayReturn)}`}>
              {fmtPct(ipo.firstDayReturn)}
            </span>
          </div>
        );
      })}
    </>
  );
}

// ── Tab: Secondary Offerings ──

function SecondaryTab({
  data,
  t,
}: {
  data: ReturnType<typeof useEquityCapitalMarkets>['data'] & object;
  t: ReturnType<typeof useT>;
}) {
  const offerings = data.secondaryOfferings ?? [];

  if (offerings.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
        {tr(t, 'ecmNoSecondary', 'No secondary offerings')}
      </div>
    );
  }

  return (
    <>
      {/* Table header */}
      <div className="sticky top-0 z-10 bg-black/95 grid grid-cols-[50px_1fr_60px_65px_55px_55px_55px] text-[7px] font-mono text-neutral-500 uppercase tracking-wider px-3 py-1 border-b border-border/10">
        <span>{tr(t, 'symbol', 'Symbol')}</span>
        <span>{tr(t, 'company', 'Company')}</span>
        <span>{tr(t, 'ecmOfferType', 'Type')}</span>
        <span className="text-right">{tr(t, 'ecmDealSize', 'Size')}</span>
        <span className="text-right">{tr(t, 'ecmOfferPrice', 'Price')}</span>
        <span className="text-right">{tr(t, 'ecmDiscount', 'Disc%')}</span>
        <span className="text-right">{tr(t, 'ecmPostPerf', 'Post%')}</span>
      </div>

      {/* Rows */}
      {offerings.map((offer: any, i: number) => (
        <div
          key={`${offer.symbol}-${i}`}
          className="grid grid-cols-[50px_1fr_60px_65px_55px_55px_55px] text-[9px] font-mono px-3 py-1.5 border-b border-border/5 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
        >
          <span className="font-bold text-fuchsia-400">{offer.symbol}</span>
          <span className="text-gray-300 truncate pr-1">{offer.company ?? '--'}</span>
          <span className="text-neutral-500">
            <span className={`px-1 py-px text-[7px] font-bold uppercase ${
              offer.type === 'follow-on' ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20'
              : offer.type === 'block' ? 'text-orange-400 bg-orange-500/10 border border-orange-500/20'
              : 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/20'
            }`}>
              {offer.type ?? '--'}
            </span>
          </span>
          <span className="text-right text-gray-300 font-bold">{fmtDealSize(offer.dealSize)}</span>
          <span className="text-right text-gray-400">{fmtPrice(offer.offerPrice)}</span>
          <span className={`text-right font-bold tabular-nums ${discountColor(offer.discount)}`}>
            {offer.discount != null ? `-${offer.discount.toFixed(1)}%` : '--'}
          </span>
          <span className={`text-right font-bold tabular-nums ${returnColor(offer.postPricingPerf)}`}>
            {fmtPct(offer.postPricingPerf)}
          </span>
        </div>
      ))}
    </>
  );
}

// ── Tab: Block Trades ──

function BlockTradesTab({
  data,
  t,
}: {
  data: ReturnType<typeof useEquityCapitalMarkets>['data'] & object;
  t: ReturnType<typeof useT>;
}) {
  const blocks = data.blockTrades ?? [];

  if (blocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
        {tr(t, 'ecmNoBlocks', 'No block trades')}
      </div>
    );
  }

  return (
    <>
      {/* Table header */}
      <div className="sticky top-0 z-10 bg-black/95 grid grid-cols-[50px_1fr_65px_55px_55px_55px_55px] text-[7px] font-mono text-neutral-500 uppercase tracking-wider px-3 py-1 border-b border-border/10">
        <span>{tr(t, 'symbol', 'Symbol')}</span>
        <span>{tr(t, 'ecmSeller', 'Seller')}</span>
        <span className="text-right">{tr(t, 'ecmBlockSize', 'Size')}</span>
        <span className="text-right">{tr(t, 'ecmBlockPrice', 'Price')}</span>
        <span className="text-right">{tr(t, 'ecmDiscount', 'Disc%')}</span>
        <span className="text-right">{tr(t, 'ecmPriceImpact', 'Impact')}</span>
        <span>{tr(t, 'date', 'Date')}</span>
      </div>

      {/* Rows */}
      {blocks.map((block: any, i: number) => (
        <div
          key={`${block.symbol}-${i}`}
          className="grid grid-cols-[50px_1fr_65px_55px_55px_55px_55px] text-[9px] font-mono px-3 py-1.5 border-b border-border/5 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
        >
          <span className="font-bold text-fuchsia-400">{block.symbol}</span>
          <span className="text-gray-300 truncate pr-1">{block.seller ?? '--'}</span>
          <span className="text-right text-gray-300 font-bold">{fmtDealSize(block.blockSize)}</span>
          <span className="text-right text-gray-400">{fmtPrice(block.price)}</span>
          <span className={`text-right font-bold tabular-nums ${discountColor(block.discount)}`}>
            {block.discount != null ? `-${block.discount.toFixed(1)}%` : '--'}
          </span>
          <span className={`text-right font-bold tabular-nums ${returnColor(block.priceImpact)}`}>
            {fmtPct(block.priceImpact)}
          </span>
          <span className="text-neutral-500">{fmtDate(block.date)}</span>
        </div>
      ))}
    </>
  );
}

// ── Tab: Market Summary ──

function MarketSummaryTab({
  data,
  t,
}: {
  data: ReturnType<typeof useEquityCapitalMarkets>['data'] & object;
  t: ReturnType<typeof useT>;
}) {
  const summary = data.summary;
  if (!summary) {
    return (
      <div className="flex items-center justify-center h-32 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
        {tr(t, 'ecmNoSummary', 'No summary data')}
      </div>
    );
  }

  const sectorBreakdown = summary.sectorBreakdown ?? [];

  return (
    <div className="p-3 space-y-3">
      {/* YTD Stats */}
      <div>
        <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1.5 border-b border-border/10 pb-1">
          {tr(t, 'ecmYtdStats', 'YTD Statistics')}
        </div>
        <div className="grid grid-cols-4 gap-2">
          <StatBox
            label={tr(t, 'ecmYtdVolume', 'YTD Volume')}
            value={fmtDealSize(summary.ytdVolume)}
            color="text-fuchsia-400"
          />
          <StatBox
            label={tr(t, 'ecmYtdDeals', 'YTD Deals')}
            value={String(summary.ytdDeals ?? '--')}
            color="text-fuchsia-400"
          />
          <StatBox
            label={tr(t, 'ecmAvgFirstDay', 'Avg 1st Day')}
            value={fmtPct(summary.avgFirstDayReturn)}
            color={returnColor(summary.avgFirstDayReturn)}
          />
          <StatBox
            label={tr(t, 'ecmAvgDealSize', 'Avg Deal')}
            value={fmtDealSize(summary.avgDealSize)}
            color="text-gray-300"
          />
        </div>
      </div>

      {/* Pipeline Stats */}
      <div>
        <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1.5 border-b border-border/10 pb-1">
          {tr(t, 'ecmPipelineStats', 'Pipeline')}
        </div>
        <div className="grid grid-cols-4 gap-2">
          <StatBox
            label={tr(t, 'ecmPipelineValue', 'Pipeline Value')}
            value={fmtDealSize(summary.pipelineValue)}
            color="text-fuchsia-400"
          />
          <StatBox
            label={tr(t, 'ecmFiled', 'Filed')}
            value={String(summary.filedCount ?? '--')}
            color="text-yellow-400"
          />
          <StatBox
            label={tr(t, 'ecmRoadshow', 'Roadshow')}
            value={String(summary.roadshowCount ?? '--')}
            color="text-blue-400"
          />
          <StatBox
            label={tr(t, 'ecmPriced', 'Priced')}
            value={String(summary.pricedCount ?? '--')}
            color="text-emerald-400"
          />
        </div>
      </div>

      {/* Window Status */}
      {summary.windowStatus && (
        <div>
          <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1.5 border-b border-border/10 pb-1">
            {tr(t, 'ecmIssuanceWindow', 'Issuance Window')}
          </div>
          <div className="flex items-center gap-3">
            <WindowStatusBadge status={summary.windowStatus} />
            {summary.windowNote && (
              <span className="text-[8px] font-mono text-neutral-500">{summary.windowNote}</span>
            )}
          </div>
        </div>
      )}

      {/* Sector Breakdown */}
      {sectorBreakdown.length > 0 && (
        <div>
          <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1.5 border-b border-border/10 pb-1">
            {tr(t, 'ecmSectorBreakdown', 'Sector Breakdown')}
          </div>
          <div className="space-y-1">
            {sectorBreakdown.map((sector: any) => {
              const pct = summary.ytdVolume && summary.ytdVolume > 0
                ? (sector.volume / summary.ytdVolume) * 100
                : 0;
              return (
                <div key={sector.name} className="flex items-center gap-2">
                  <span className="w-20 text-[8px] font-mono text-gray-400 truncate">{sector.name}</span>
                  <div className="flex-1 h-1.5 bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-fuchsia-400/60"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-[8px] font-mono text-neutral-500">{pct.toFixed(0)}%</span>
                  <span className="w-14 text-right text-[8px] font-mono text-gray-400">{fmtDealSize(sector.volume)}</span>
                  <span className="w-8 text-right text-[8px] font-mono text-neutral-600">{sector.deals}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timestamp */}
      <div className="pt-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'ecmLastUpdate', 'Last update')}: {data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '--'}
        </span>
      </div>
    </div>
  );
}

// ── Stat Box ──

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-2 py-1.5 border border-border/10 bg-white/[0.01]">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className={`text-[10px] font-mono font-bold ${color}`}>{value}</div>
    </div>
  );
}
