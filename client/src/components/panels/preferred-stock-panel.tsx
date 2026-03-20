import { useState } from 'react';
import { usePreferredStock } from '../../api/hooks/use-preferred-stock';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtPrice(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtBps(n: number): string {
  return `${n.toFixed(0)}bp`;
}

function fmtB(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

// ── Color helpers ──

const PAR = 25;

function priceVsParColor(price: number): string {
  if (price > PAR + 0.5) return 'text-green-400';
  if (price > PAR - 0.5) return 'text-neutral-300';
  if (price > PAR - 2) return 'text-yellow-400';
  return 'text-red-400';
}

function yieldColor(yld: number, avg?: number): string {
  if (avg == null) {
    if (yld >= 8) return 'text-green-400';
    if (yld >= 6) return 'text-emerald-400';
    if (yld >= 4) return 'text-yellow-400';
    return 'text-neutral-400';
  }
  if (yld > avg + 0.5) return 'text-green-400';
  if (yld > avg - 0.5) return 'text-neutral-300';
  return 'text-red-400';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function ratingColor(rating: string): string {
  const r = rating?.toUpperCase() ?? '';
  if (r.startsWith('AA')) return 'text-green-400';
  if (r.startsWith('A')) return 'text-emerald-400';
  if (r.startsWith('BBB')) return 'text-yellow-400';
  if (r.startsWith('BB')) return 'text-orange-400';
  return 'text-red-400';
}

function ratingBg(rating: string): string {
  const r = rating?.toUpperCase() ?? '';
  if (r.startsWith('AA')) return 'bg-green-500/10 border-green-500/30';
  if (r.startsWith('A')) return 'bg-emerald-500/10 border-emerald-500/30';
  if (r.startsWith('BBB')) return 'bg-yellow-500/10 border-yellow-500/30';
  if (r.startsWith('BB')) return 'bg-orange-500/10 border-orange-500/30';
  return 'bg-red-500/10 border-red-500/30';
}

function callStatusBadge(status: string): { text: string; cls: string } {
  const s = status?.toUpperCase() ?? '';
  if (s === 'CALLABLE' || s === 'IMMINENT')
    return { text: s, cls: 'bg-red-500/10 text-red-400 border border-red-500/30' };
  if (s === 'PROTECTED' || s === 'NON-CALL')
    return { text: s, cls: 'bg-green-500/10 text-green-400 border border-green-500/30' };
  if (s === 'UPCOMING')
    return { text: s, cls: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' };
  return { text: status ?? '--', cls: 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/30' };
}

// ── Tab type ──

type Tab = 'SECURITIES' | 'SECTORS' | 'NEW ISSUES' | 'CALL SCHEDULE';

// ── SVG Icon ──

function PrefStockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <rect x="2" y="4" width="5" height="8" fill="#a78bfa" opacity="0.4" />
      <rect x="9" y="2" width="5" height="10" fill="#a78bfa" opacity="0.25" />
      <path d="M2 8H14" stroke="#a78bfa" strokeWidth="0.8" opacity="0.6" />
      <circle cx="4.5" cy="6" r="1.5" fill="#a78bfa" opacity="0.8" />
      <circle cx="11.5" cy="5" r="1.5" fill="#a78bfa" opacity="0.6" />
      <path d="M3 11L7 9L10 10L13 7" stroke="#a78bfa" strokeWidth="1" opacity="0.9" />
    </svg>
  );
}

// ── Shimmer / Skeleton loading ──

function Shimmer({ w, h }: { w?: string; h?: string }) {
  return (
    <div
      className="bg-violet-400/[0.06] animate-pulse"
      style={{ width: w ?? '100%', height: h ?? '10px' }}
    />
  );
}

function SkeletonRows({ rows, cols }: { rows: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="flex gap-3 px-2 py-1.5 border-b border-border/10">
          {Array.from({ length: cols }).map((_, ci) => (
            <Shimmer key={ci} w={ci === 0 ? '80px' : '50px'} h="8px" />
          ))}
        </div>
      ))}
    </>
  );
}

// ── Main Panel ──

export function PreferredStockPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = usePreferredStock();
  const [tab, setTab] = useState<Tab>('SECURITIES');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <PrefStockIcon />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-violet-400">
            {tr(t, 'psPreferredStockMonitor', 'Preferred Stock Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-violet-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['SECURITIES', 'SECTORS', 'NEW ISSUES', 'CALL SCHEDULE'] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t_
                ? 'border-violet-400 text-violet-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {t_}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Error state */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <span className="text-[9px] font-mono text-red-400 uppercase tracking-wider">
              {tr(t, 'psError', 'Failed to load preferred stock data')}
            </span>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-wider text-violet-400 border border-violet-400/30 hover:bg-violet-400/10 transition-colors"
            >
              {tr(t, 'psRetry', 'Retry')}
            </button>
          </div>
        ) : isLoading && !data ? (
          /* Loading state with shimmer */
          <div>
            <div className="px-3 py-1 border-b border-border/10">
              <Shimmer w="140px" h="8px" />
            </div>
            <div className="grid grid-cols-4 gap-px bg-border/10 border-b border-border/20">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-black px-2 py-2 space-y-1.5">
                  <Shimmer w="60px" h="6px" />
                  <Shimmer w="45px" h="10px" />
                </div>
              ))}
            </div>
            <SkeletonRows rows={8} cols={6} />
          </div>
        ) : !data ? (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'psNoData', 'No data available')}
          </div>
        ) : (
          <>
            {tab === 'SECURITIES' && <SecuritiesTab data={data} t={t} />}
            {tab === 'SECTORS' && <SectorsTab data={data} t={t} />}
            {tab === 'NEW ISSUES' && <NewIssuesTab data={data} t={t} />}
            {tab === 'CALL SCHEDULE' && <CallScheduleTab data={data} t={t} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Metric Card ──

function MetricCard({
  label,
  value,
  change,
  sub,
}: {
  label: string;
  value: string;
  change?: number;
  sub?: string;
}) {
  return (
    <div className="bg-black px-2 py-1.5">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider leading-tight">
        {label}
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-[10px] font-mono font-bold text-white">{value}</span>
        {change != null ? (
          <span className={`text-[8px] font-mono font-bold ${changeColor(change)}`}>
            {change >= 0 ? '+' : ''}
            {change.toFixed(2)}
          </span>
        ) : null}
      </div>
      {sub ? (
        <div className="text-[7px] font-mono text-neutral-600 mt-0.5 leading-tight">{sub}</div>
      ) : null}
    </div>
  );
}

// ── SECURITIES TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SecuritiesTab({ data, t }: { data: any; t: TFn }) {
  const securities = data?.securities;

  // Compute avg yield for relative coloring
  let avgYield = 0;
  if (securities && securities.length > 0) {
    const ylds = securities
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((s: any) => s?.currentYield != null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((s: any) => s.currentYield);
    avgYield = ylds.length > 0 ? ylds.reduce((a: number, b: number) => a + b, 0) / ylds.length : 0;
  }

  return (
    <div>
      {/* Summary metrics */}
      {securities && securities.length > 0 ? (
        <>
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/10">
              <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'psMarketSummary', 'Market Summary')}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-px bg-border/10">
              <MetricCard
                label={tr(t, 'psTotalSecurities', 'Total Issues')}
                value={String(securities.length)}
              />
              <MetricCard
                label={tr(t, 'psAvgPrice', 'Avg Price')}
                value={
                  (() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const prices = securities.filter((s: any) => s?.price != null).map((s: any) => s.price);
                    return prices.length > 0
                      ? fmtPrice(prices.reduce((a: number, b: number) => a + b, 0) / prices.length)
                      : '--';
                  })()
                }
              />
              <MetricCard
                label={tr(t, 'psAvgYield', 'Avg Yield')}
                value={avgYield > 0 ? fmtPct(avgYield) : '--'}
              />
              <MetricCard
                label={tr(t, 'psParReference', 'Par Value')}
                value={fmtPrice(PAR)}
                sub="REFERENCE"
              />
            </div>
          </div>

          {/* Securities table */}
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/10">
              <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'psSecuritiesTable', 'Securities')}
              </span>
            </div>
            <div className="min-w-[800px]">
              {/* Header */}
              <div className="grid grid-cols-[minmax(100px,1.5fr)_55px_50px_50px_50px_50px_55px_55px_55px] px-2 py-1 border-b border-border/20 sticky top-0 bg-black z-10">
                <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
                  {tr(t, 'psTicker', 'Ticker / Issuer')}
                </span>
                <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                  {tr(t, 'psPrice', 'Price')}
                </span>
                <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                  {tr(t, 'psChg', 'Chg')}
                </span>
                <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                  {tr(t, 'psCoupon', 'Coupon')}
                </span>
                <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                  {tr(t, 'psYield', 'Yield')}
                </span>
                <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                  {tr(t, 'psSpread', 'Spread')}
                </span>
                <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-center">
                  {tr(t, 'psRating', 'Rating')}
                </span>
                <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                  {tr(t, 'psCallDate', 'Call Date')}
                </span>
                <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-center">
                  {tr(t, 'psVsPar', 'vs Par')}
                </span>
              </div>
              {/* Rows */}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {securities.map((s: any, i: number) => {
                const price = s?.price;
                const parDiff = price != null ? price - PAR : null;

                return (
                  <div
                    key={s?.ticker ? String(s.ticker) : i}
                    className="grid grid-cols-[minmax(100px,1.5fr)_55px_50px_50px_50px_50px_55px_55px_55px] px-2 py-1 border-b border-border/10 hover:bg-violet-400/[0.02] transition-colors items-center"
                  >
                    {/* Ticker / Issuer */}
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono font-bold text-white truncate block">
                        {s?.ticker ? String(s.ticker) : '--'}
                      </span>
                      {s?.issuer ? (
                        <span className="text-[7px] font-mono text-neutral-600 truncate block">
                          {String(s.issuer)}
                        </span>
                      ) : null}
                    </div>
                    {/* Price */}
                    <span className={`text-[9px] font-mono font-bold text-right ${price != null ? priceVsParColor(price) : 'text-neutral-500'}`}>
                      {price != null ? fmtPrice(price) : '--'}
                    </span>
                    {/* Change */}
                    <span className={`text-[9px] font-mono font-bold text-right ${s?.change != null ? changeColor(s.change) : 'text-neutral-500'}`}>
                      {s?.change != null ? `${s.change >= 0 ? '+' : ''}${Number(s.change).toFixed(2)}` : '--'}
                    </span>
                    {/* Coupon */}
                    <span className="text-[9px] font-mono text-neutral-400 text-right">
                      {s?.coupon != null ? fmtPct(s.coupon) : '--'}
                    </span>
                    {/* Current Yield */}
                    <span className={`text-[9px] font-mono font-bold text-right ${s?.currentYield != null ? yieldColor(s.currentYield, avgYield) : 'text-neutral-500'}`}>
                      {s?.currentYield != null ? fmtPct(s.currentYield) : '--'}
                    </span>
                    {/* Spread */}
                    <span className="text-[9px] font-mono text-neutral-400 text-right">
                      {s?.spread != null ? fmtBps(s.spread) : '--'}
                    </span>
                    {/* Rating */}
                    <div className="flex justify-center">
                      {s?.rating ? (
                        <span className={`px-1 py-0 text-[7px] font-mono font-bold uppercase border ${ratingBg(String(s.rating))} ${ratingColor(String(s.rating))}`}>
                          {String(s.rating)}
                        </span>
                      ) : (
                        <span className="text-[7px] font-mono text-neutral-600">--</span>
                      )}
                    </div>
                    {/* Call Date */}
                    <span className="text-[8px] font-mono text-neutral-500 text-right">
                      {s?.callDate ? String(s.callDate) : '--'}
                    </span>
                    {/* vs Par indicator */}
                    <div className="flex justify-center">
                      {parDiff != null ? (
                        <span className={`px-1 py-0 text-[7px] font-mono font-bold ${parDiff >= 0 ? 'text-green-400 bg-green-500/10 border border-green-500/30' : 'text-red-400 bg-red-500/10 border border-red-500/30'}`}>
                          {parDiff >= 0 ? '+' : ''}{parDiff.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[7px] font-mono text-neutral-600">--</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'psNoSecurities', 'No securities data available')}
        </div>
      )}
    </div>
  );
}

// ── SECTORS TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectorsTab({ data, t }: { data: any; t: TFn }) {
  const sectors = data?.sectors;
  const ratingDist = data?.ratingDistribution;

  return (
    <div>
      {/* Sector Breakdown */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'psSectorBreakdown', 'Sector Breakdown')}
          </span>
        </div>
        {sectors && sectors.length > 0 ? (
          <div>
            {/* Header */}
            <div className="grid grid-cols-[1fr_55px_55px_55px_55px_65px] px-2 py-1 border-b border-border/20">
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'psSector', 'Sector')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'psCount', 'Count')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'psAvgPx', 'Avg Px')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'psAvgYld', 'Avg Yld')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'psAvgSprd', 'Avg Sprd')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'psWeight', 'Weight')}
              </span>
            </div>
            {/* Rows */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {sectors.map((sec: any, i: number) => (
              <div
                key={sec?.name ? String(sec.name) : i}
                className="grid grid-cols-[1fr_55px_55px_55px_55px_65px] px-2 py-1 border-b border-border/10 hover:bg-violet-400/[0.02] transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="w-1 h-3 shrink-0"
                    style={{ backgroundColor: `rgba(167,139,250,${0.3 + i * 0.08})` }}
                  />
                  <span className="text-[9px] font-mono font-bold text-white truncate">
                    {sec?.name ? String(sec.name) : '--'}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-neutral-400 text-right">
                  {sec?.count != null ? String(sec.count) : '--'}
                </span>
                <span className={`text-[9px] font-mono text-right ${sec?.avgPrice != null ? priceVsParColor(sec.avgPrice) : 'text-neutral-400'}`}>
                  {sec?.avgPrice != null ? fmtPrice(sec.avgPrice) : '--'}
                </span>
                <span className={`text-[9px] font-mono font-bold text-right ${sec?.avgYield != null ? yieldColor(sec.avgYield) : 'text-neutral-400'}`}>
                  {sec?.avgYield != null ? fmtPct(sec.avgYield) : '--'}
                </span>
                <span className="text-[9px] font-mono text-neutral-400 text-right">
                  {sec?.avgSpread != null ? fmtBps(sec.avgSpread) : '--'}
                </span>
                <div className="flex items-center justify-end gap-1">
                  <div className="w-8 h-[4px] bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${sec?.weight != null ? Math.min(sec.weight, 100) : 0}%`,
                        backgroundColor: '#a78bfa',
                        opacity: 0.6,
                      }}
                    />
                  </div>
                  <span className="text-[8px] font-mono text-violet-400">
                    {sec?.weight != null ? fmtPct(sec.weight) : '--'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'psNoSectors', 'No sector data')}
          </div>
        )}
      </div>

      {/* Rating Distribution */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'psRatingDistribution', 'Rating Distribution')}
          </span>
        </div>
        {ratingDist && ratingDist.length > 0 ? (
          <div className="px-3 py-2">
            {/* Bar chart */}
            <div className="flex items-end gap-[3px] h-16 mb-1">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {ratingDist.map((rd: any, i: number) => {
                const maxCount = Math.max(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ...ratingDist.map((r: any) => r?.count ?? 0),
                  1
                );
                const pct = rd?.count != null ? (rd.count / maxCount) * 100 : 0;
                const ratingStr = rd?.rating ? String(rd.rating) : '';

                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <span className="text-[6px] font-mono text-neutral-500 mb-0.5">
                      {rd?.count != null ? String(rd.count) : '0'}
                    </span>
                    <div
                      className="w-full transition-all"
                      style={{
                        height: `${Math.max(pct * 0.6, 2)}px`,
                        backgroundColor: '#a78bfa',
                        opacity: 0.3 + i * 0.08,
                      }}
                    />
                    <span className={`text-[7px] font-mono font-bold mt-0.5 ${ratingStr ? ratingColor(ratingStr) : 'text-neutral-600'}`}>
                      {ratingStr || '--'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'psNoRatings', 'No rating data')}
          </div>
        )}
      </div>
    </div>
  );
}

// ── NEW ISSUES TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NewIssuesTab({ data, t }: { data: any; t: TFn }) {
  const issues = data?.newIssues;

  return (
    <div>
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'psNewIssues', 'Recent New Issues')}
          </span>
        </div>
        {issues && issues.length > 0 ? (
          <div className="min-w-[750px]">
            {/* Header */}
            <div className="grid grid-cols-[minmax(90px,1.2fr)_60px_55px_55px_55px_55px_65px_55px] px-2 py-1 border-b border-border/20 sticky top-0 bg-black z-10">
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'psIssuer', 'Issuer')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'psSize', 'Size')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'psCpn', 'Coupon')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'psIssuePx', 'Issue Px')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'psCurrentPx', 'Cur Px')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'psYieldH', 'Yield')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-center">
                {tr(t, 'psRatingH', 'Rating')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'psDate', 'Date')}
              </span>
            </div>
            {/* Rows */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {issues.map((iss: any, i: number) => {
              const issuePrice = iss?.issuePrice;
              const currentPrice = iss?.currentPrice;
              const priceDiff =
                issuePrice != null && currentPrice != null ? currentPrice - issuePrice : null;

              return (
                <div
                  key={iss?.issuer ? String(iss.issuer) + i : i}
                  className="grid grid-cols-[minmax(90px,1.2fr)_60px_55px_55px_55px_55px_65px_55px] px-2 py-1.5 border-b border-border/10 hover:bg-violet-400/[0.02] transition-colors items-center"
                >
                  {/* Issuer */}
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono font-bold text-white truncate block">
                      {iss?.issuer ? String(iss.issuer) : '--'}
                    </span>
                    {iss?.ticker ? (
                      <span className="text-[7px] font-mono text-violet-400/60">
                        {String(iss.ticker)}
                      </span>
                    ) : null}
                  </div>
                  {/* Size */}
                  <span className="text-[9px] font-mono font-bold text-white text-right">
                    {iss?.size != null ? fmtB(iss.size) : '--'}
                  </span>
                  {/* Coupon */}
                  <span className="text-[9px] font-mono text-violet-400 text-right">
                    {iss?.coupon != null ? fmtPct(iss.coupon) : '--'}
                  </span>
                  {/* Issue Price */}
                  <span className="text-[9px] font-mono text-neutral-400 text-right">
                    {issuePrice != null ? fmtPrice(issuePrice) : '--'}
                  </span>
                  {/* Current Price */}
                  <span className={`text-[9px] font-mono font-bold text-right ${currentPrice != null ? priceVsParColor(currentPrice) : 'text-neutral-500'}`}>
                    {currentPrice != null ? fmtPrice(currentPrice) : '--'}
                  </span>
                  {/* Yield */}
                  <span className={`text-[9px] font-mono font-bold text-right ${iss?.currentYield != null ? yieldColor(iss.currentYield) : 'text-neutral-400'}`}>
                    {iss?.currentYield != null ? fmtPct(iss.currentYield) : '--'}
                  </span>
                  {/* Rating */}
                  <div className="flex justify-center">
                    {iss?.rating ? (
                      <span className={`px-1 py-0 text-[7px] font-mono font-bold uppercase border ${ratingBg(String(iss.rating))} ${ratingColor(String(iss.rating))}`}>
                        {String(iss.rating)}
                      </span>
                    ) : (
                      <span className="text-[7px] font-mono text-neutral-600">--</span>
                    )}
                  </div>
                  {/* Date */}
                  <div className="text-right">
                    <span className="text-[8px] font-mono text-neutral-500">
                      {iss?.date ? String(iss.date) : '--'}
                    </span>
                    {priceDiff != null ? (
                      <span className={`block text-[7px] font-mono font-bold ${changeColor(priceDiff)}`}>
                        {priceDiff >= 0 ? '+' : ''}{priceDiff.toFixed(2)}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'psNoNewIssues', 'No recent new issues')}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CALL SCHEDULE TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CallScheduleTab({ data, t }: { data: any; t: TFn }) {
  const schedule = data?.callSchedule;

  return (
    <div>
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'psCallSchedule', 'Call Schedule')}
          </span>
        </div>
        {schedule && schedule.length > 0 ? (
          <div className="min-w-[700px]">
            {/* Header */}
            <div className="grid grid-cols-[minmax(90px,1.2fr)_60px_55px_55px_55px_55px_65px] px-2 py-1 border-b border-border/20 sticky top-0 bg-black z-10">
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'csTicker', 'Ticker / Issuer')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'csCallDate', 'Call Date')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'csCallPx', 'Call Px')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'csCurPx', 'Cur Px')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'csCoupon', 'Coupon')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'csYtc', 'YTC')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-center">
                {tr(t, 'csStatus', 'Status')}
              </span>
            </div>
            {/* Rows */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {schedule.map((item: any, i: number) => {
              const badge = callStatusBadge(item?.status);
              const callPx = item?.callPrice;
              const curPx = item?.currentPrice;
              const callPremium = callPx != null && curPx != null ? callPx - curPx : null;

              return (
                <div
                  key={item?.ticker ? String(item.ticker) + i : i}
                  className="grid grid-cols-[minmax(90px,1.2fr)_60px_55px_55px_55px_55px_65px] px-2 py-1.5 border-b border-border/10 hover:bg-violet-400/[0.02] transition-colors items-center"
                >
                  {/* Ticker / Issuer */}
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono font-bold text-white truncate block">
                      {item?.ticker ? String(item.ticker) : '--'}
                    </span>
                    {item?.issuer ? (
                      <span className="text-[7px] font-mono text-neutral-600 truncate block">
                        {String(item.issuer)}
                      </span>
                    ) : null}
                  </div>
                  {/* Call Date */}
                  <span className="text-[8px] font-mono text-violet-400 text-right">
                    {item?.callDate ? String(item.callDate) : '--'}
                  </span>
                  {/* Call Price */}
                  <span className="text-[9px] font-mono text-neutral-400 text-right">
                    {callPx != null ? fmtPrice(callPx) : '--'}
                  </span>
                  {/* Current Price */}
                  <span className={`text-[9px] font-mono font-bold text-right ${curPx != null ? priceVsParColor(curPx) : 'text-neutral-500'}`}>
                    {curPx != null ? fmtPrice(curPx) : '--'}
                  </span>
                  {/* Coupon */}
                  <span className="text-[9px] font-mono text-neutral-400 text-right">
                    {item?.coupon != null ? fmtPct(item.coupon) : '--'}
                  </span>
                  {/* Yield to Call */}
                  <div className="text-right">
                    <span className={`text-[9px] font-mono font-bold ${item?.yieldToCall != null ? yieldColor(item.yieldToCall) : 'text-neutral-400'}`}>
                      {item?.yieldToCall != null ? fmtPct(item.yieldToCall) : '--'}
                    </span>
                    {callPremium != null ? (
                      <span className={`block text-[7px] font-mono ${changeColor(callPremium)}`}>
                        {callPremium >= 0 ? '+' : ''}{callPremium.toFixed(2)} to call
                      </span>
                    ) : null}
                  </div>
                  {/* Status Badge */}
                  <div className="flex justify-center">
                    <span
                      className={`px-1 py-0 text-[6px] font-mono font-bold uppercase tracking-wider ${badge.cls}`}
                    >
                      {badge.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'psNoCallSchedule', 'No call schedule data')}
          </div>
        )}
      </div>
    </div>
  );
}
