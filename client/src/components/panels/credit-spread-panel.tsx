import { useCreditSpread } from '../../api/hooks/use-credit-spread';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting helpers ──

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(0);
}

function fmtChange(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2) + '%';
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2);
}

function fmtYield(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2) + '%';
}

function fmtDuration(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1);
}

function fmtSize(n: number | null | undefined): string {
  if (n == null) return '--';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(0) + 'M';
  return n.toFixed(0);
}

function fmtRatio(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2) + 'x';
}

function fmtLife(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1) + 'y';
}

// ── Color helpers ──

/** Spread widening (positive change) = red, tightening (negative) = green */
function spreadChangeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function ratingColor(rating: string): string {
  if (rating.startsWith('AAA')) return 'text-green-400';
  if (rating.startsWith('AA')) return 'text-emerald-400';
  if (rating.startsWith('A')) return 'text-teal-400';
  if (rating.startsWith('BBB')) return 'text-yellow-400';
  if (rating.startsWith('BB')) return 'text-orange-400';
  if (rating.startsWith('B') && !rating.startsWith('BB')) return 'text-red-400';
  if (rating.startsWith('CCC') || rating.startsWith('CC') || rating.startsWith('C') || rating === 'D') return 'text-red-500';
  return 'text-neutral-400';
}

function probColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 50) return 'text-orange-400';
  if (n >= 25) return 'text-yellow-400';
  return 'text-neutral-400';
}

// ── Main Panel ──

export function CreditSpreadPanel() {
  const t = useT();
  const { data, isLoading, isError, error, refetch } = useCreditSpread();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-orange-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-orange-400">
            {tr(t, 'cspCreditSpreadMonitor', 'Credit Spread Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-orange-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-orange-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {isError && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'cspError', 'Error loading data')}: {(error as Error)?.message || 'Unknown error'}
          </div>
        )}

        {!data && !isLoading && !isError && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cspNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <SummaryBar data={data} t={t} />
            <IndexMetrics data={data} t={t} />
            {data.investmentGrade?.length > 0 && (
              <RatingTable
                title={tr(t, 'cspInvestmentGrade', 'Investment Grade')}
                rows={data.investmentGrade}
                t={t}
              />
            )}
            {data.highYield?.length > 0 && (
              <RatingTable
                title={tr(t, 'cspHighYield', 'High Yield')}
                rows={data.highYield}
                t={t}
              />
            )}
            {data.sectorSpreads?.length > 0 && (
              <SectorSpreadsTable rows={data.sectorSpreads} t={t} />
            )}
            {data.newIssues?.length > 0 && (
              <NewIssuesTable rows={data.newIssues} t={t} />
            )}
            {data.distressedDebt?.length > 0 && (
              <DistressedDebtTable rows={data.distressedDebt} t={t} />
            )}
            {data.crossoverWatch?.length > 0 && (
              <CrossoverWatchTable rows={data.crossoverWatch} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const summary = data.summary;
  if (!summary) return null;

  const items = [
    { label: tr(t, 'cspIgAvg', 'IG Avg'), value: fmtBps(summary.igAvgSpread), unit: 'bps' },
    { label: tr(t, 'cspHyAvg', 'HY Avg'), value: fmtBps(summary.hyAvgSpread), unit: 'bps' },
    { label: tr(t, 'cspIgHyRatio', 'IG/HY Ratio'), value: fmtRatio(summary.igHyRatio), unit: '' },
    { label: tr(t, 'cspEmSpread', 'EM Spread'), value: fmtBps(summary.emSpread), unit: 'bps' },
    { label: tr(t, 'cspDistressed', 'Distressed'), value: summary.distressedCount?.toString() ?? '--', unit: '' },
    { label: tr(t, 'cspDefaultRate', 'Default Rate'), value: fmtPct(summary.defaultRate), unit: '' },
    { label: tr(t, 'cspRecoveryRate', 'Recovery'), value: fmtPct(summary.recoveryRate), unit: '' },
  ];

  return (
    <div className="border-b border-border/20 bg-[#050505]">
      <div className="grid grid-cols-7 divide-x divide-border/10">
        {items.map((item) => (
          <div key={item.label} className="px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {item.label}
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[10px] font-mono font-bold text-white">
                {item.value}
              </span>
              {item.unit && (
                <span className="text-[7px] font-mono text-neutral-600">{item.unit}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Index Metrics ──

function IndexMetrics({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const indices = data.indexMetrics;
  if (!indices) return null;

  const sections = [
    { key: 'ig', label: tr(t, 'cspIgIndex', 'IG Index'), data: indices.ig },
    { key: 'hy', label: tr(t, 'cspHyIndex', 'HY Index'), data: indices.hy },
    { key: 'em', label: tr(t, 'cspEmIndex', 'EM Index'), data: indices.em },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cspIndexMetrics', 'Index Metrics')}
        </span>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border/10">
        {sections.map((sec) => {
          const d = sec.data;
          if (!d) return <div key={sec.key} />;
          return (
            <div key={sec.key} className="px-2 py-1.5">
              <div className="text-[8px] font-mono font-bold text-orange-400 uppercase tracking-wider mb-1">
                {sec.label}
              </div>
              <div className="grid grid-cols-3 gap-1">
                <div>
                  <div className="text-[7px] font-mono text-neutral-600 uppercase">OAS</div>
                  <div className="text-[9px] font-mono font-bold text-white">{fmtBps(d.oas)}</div>
                  <div className={`text-[7px] font-mono font-bold ${spreadChangeColor(d.oasChange)}`}>
                    {fmtChange(d.oasChange)}
                  </div>
                </div>
                <div>
                  <div className="text-[7px] font-mono text-neutral-600 uppercase">Duration</div>
                  <div className="text-[9px] font-mono font-bold text-white">{fmtDuration(d.duration)}</div>
                  <div className={`text-[7px] font-mono font-bold ${spreadChangeColor(d.durationChange)}`}>
                    {fmtChange(d.durationChange)}
                  </div>
                </div>
                <div>
                  <div className="text-[7px] font-mono text-neutral-600 uppercase">YTW</div>
                  <div className="text-[9px] font-mono font-bold text-white">{fmtYield(d.ytw)}</div>
                  <div className={`text-[7px] font-mono font-bold ${spreadChangeColor(d.ytwChange)}`}>
                    {fmtChange(d.ytwChange)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Rating Spread Table (IG / HY) ──

function RatingTable({
  title,
  rows,
  t,
}: {
  title: string;
  rows: any[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {title}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
              <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                {tr(t, 'cspRating', 'Rating')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspSpread', 'Spread')}
              </th>
              <th className="text-right px-2 py-1 font-normal">1D</th>
              <th className="text-right px-2 py-1 font-normal">1W</th>
              <th className="text-right px-2 py-1 font-normal">1M</th>
              <th className="text-right px-2 py-1 font-normal">YTD</th>
              <th className="text-center px-2 py-1 font-normal">
                {tr(t, 'csp52wRange', '52W Range')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspAvgLife', 'Avg Life')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => {
              const rangeLow = r.range52wLow ?? 0;
              const rangeHigh = r.range52wHigh ?? 1;
              const rangeSpan = rangeHigh - rangeLow || 1;
              const currentPos = ((r.spread ?? rangeLow) - rangeLow) / rangeSpan;
              const clampedPos = Math.max(0, Math.min(1, currentPos));

              return (
                <tr
                  key={r.rating ?? i}
                  className="border-b border-neutral-900 hover:bg-orange-400/[0.02]"
                >
                  <td className={`px-2 py-1 font-bold sticky left-0 bg-black z-10 ${ratingColor(r.rating ?? '')}`}>
                    {r.rating}
                  </td>
                  <td className="px-2 py-1 text-right text-white font-bold">
                    {fmtBps(r.spread)}
                  </td>
                  <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.change1d)}`}>
                    {fmtChange(r.change1d)}
                  </td>
                  <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.change1w)}`}>
                    {fmtChange(r.change1w)}
                  </td>
                  <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.change1m)}`}>
                    {fmtChange(r.change1m)}
                  </td>
                  <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.changeYtd)}`}>
                    {fmtChange(r.changeYtd)}
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[7px] text-neutral-600 w-6 text-right">{fmtBps(rangeLow)}</span>
                      <div className="flex-1 h-1.5 bg-neutral-900 relative">
                        <div
                          className="absolute top-0 h-full bg-orange-400/30"
                          style={{ left: 0, width: '100%' }}
                        />
                        <div
                          className="absolute top-0 w-px h-full bg-orange-400"
                          style={{ left: `${clampedPos * 100}%` }}
                        />
                      </div>
                      <span className="text-[7px] text-neutral-600 w-6 text-left">{fmtBps(rangeHigh)}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1 text-right text-neutral-400">
                    {fmtLife(r.avgLife)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Sector Spreads Table ──

function SectorSpreadsTable({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cspSectorSpreads', 'Sector Spreads')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
              <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                {tr(t, 'cspSector', 'Sector')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspIgSpd', 'IG Spd')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspHySpd', 'HY Spd')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspIgChg', 'IG Chg')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspHyChg', 'HY Chg')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspTightest', 'Tightest')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspWidest', 'Widest')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr
                key={r.sector ?? i}
                className="border-b border-neutral-900 hover:bg-orange-400/[0.02]"
              >
                <td className="px-2 py-1 text-white font-bold truncate max-w-[120px] sticky left-0 bg-black z-10">
                  {r.sector}
                </td>
                <td className="px-2 py-1 text-right text-white font-bold">
                  {fmtBps(r.igSpread)}
                </td>
                <td className="px-2 py-1 text-right text-white font-bold">
                  {fmtBps(r.hySpread)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.igChange)}`}>
                  {fmtChange(r.igChange)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.hyChange)}`}>
                  {fmtChange(r.hyChange)}
                </td>
                <td className="px-2 py-1 text-right text-green-400">
                  {fmtBps(r.tightest)}
                </td>
                <td className="px-2 py-1 text-right text-red-400">
                  {fmtBps(r.widest)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── New Issues Table ──

function NewIssuesTable({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cspNewIssues', 'New Issues')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
              <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                {tr(t, 'cspIssuer', 'Issuer')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspSize', 'Size')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspCoupon', 'Coupon')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspTenor', 'Tenor')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspSpread', 'Spread')}
              </th>
              <th className="text-center px-2 py-1 font-normal">
                {tr(t, 'cspRating', 'Rating')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspBookSize', 'Book')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr
                key={r.issuer ?? i}
                className="border-b border-neutral-900 hover:bg-orange-400/[0.02]"
              >
                <td className="px-2 py-1 text-white font-bold truncate max-w-[140px] sticky left-0 bg-black z-10">
                  {r.issuer}
                </td>
                <td className="px-2 py-1 text-right text-neutral-400">
                  {fmtSize(r.size)}
                </td>
                <td className="px-2 py-1 text-right text-white">
                  {fmtPct(r.coupon)}
                </td>
                <td className="px-2 py-1 text-right text-neutral-400">
                  {r.tenor ?? '--'}
                </td>
                <td className="px-2 py-1 text-right text-white font-bold">
                  {fmtBps(r.spread)}
                </td>
                <td className="px-2 py-1 text-center">
                  <span className={`px-1 py-px text-[7px] font-bold ${ratingColor(r.rating ?? '')}`}>
                    {r.rating ?? '--'}
                  </span>
                </td>
                <td className="px-2 py-1 text-right text-neutral-400">
                  {fmtSize(r.bookSize)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Distressed Debt Table ──

function DistressedDebtTable({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cspDistressedDebt', 'Distressed Debt')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
              <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                {tr(t, 'cspIssuer', 'Issuer')}
              </th>
              <th className="text-left px-2 py-1 font-normal">
                {tr(t, 'cspTicker', 'Ticker')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspCoupon', 'Coupon')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspMaturity', 'Maturity')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspPrice', 'Price')}
              </th>
              <th className="text-right px-2 py-1 font-normal">YTW</th>
              <th className="text-right px-2 py-1 font-normal">OAS</th>
              <th className="text-center px-2 py-1 font-normal">
                {tr(t, 'cspRating', 'Rating')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr
                key={r.issuer ?? i}
                className="border-b border-neutral-900 hover:bg-orange-400/[0.02]"
              >
                <td className="px-2 py-1 text-white font-bold truncate max-w-[120px] sticky left-0 bg-black z-10">
                  {r.issuer}
                </td>
                <td className="px-2 py-1 text-orange-400 font-bold">
                  {r.ticker ?? '--'}
                </td>
                <td className="px-2 py-1 text-right text-neutral-400">
                  {fmtPct(r.coupon)}
                </td>
                <td className="px-2 py-1 text-right text-neutral-400">
                  {r.maturity ?? '--'}
                </td>
                <td className="px-2 py-1 text-right text-white font-bold">
                  {fmtPrice(r.price)}
                </td>
                <td className="px-2 py-1 text-right text-red-400 font-bold">
                  {fmtYield(r.ytw)}
                </td>
                <td className="px-2 py-1 text-right text-white">
                  {fmtBps(r.oas)}
                </td>
                <td className="px-2 py-1 text-center">
                  <span className={`px-1 py-px text-[7px] font-bold ${ratingColor(r.rating ?? '')}`}>
                    {r.rating ?? '--'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Crossover Watch Table ──

function CrossoverWatchTable({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cspCrossoverWatch', 'Crossover Watch')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
              <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                {tr(t, 'cspIssuer', 'Issuer')}
              </th>
              <th className="text-center px-2 py-1 font-normal">
                {tr(t, 'cspCurrentRating', 'Current')}
              </th>
              <th className="text-center px-2 py-1 font-normal">
                {tr(t, 'cspDirection', 'Direction')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspUpgradeProb', 'Upgrade %')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspDowngradeProb', 'Downgrade %')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspSpread', 'Spread')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cspSpreadChg', 'Chg')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => {
              const isUpgrade = (r.upgradeProb ?? 0) > (r.downgradeProb ?? 0);
              const directionColor = isUpgrade ? 'text-green-400' : 'text-red-400';
              const directionLabel = isUpgrade ? 'UPGRADE' : 'DOWNGRADE';
              const directionBg = isUpgrade
                ? 'bg-green-500/10 border border-green-500/30'
                : 'bg-red-500/10 border border-red-500/30';

              return (
                <tr
                  key={r.issuer ?? i}
                  className="border-b border-neutral-900 hover:bg-orange-400/[0.02]"
                >
                  <td className="px-2 py-1 text-white font-bold truncate max-w-[140px] sticky left-0 bg-black z-10">
                    {r.issuer}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <span className={`px-1 py-px text-[7px] font-bold ${ratingColor(r.currentRating ?? '')}`}>
                      {r.currentRating ?? '--'}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-center">
                    <span className={`px-1 py-px text-[7px] font-bold uppercase ${directionColor} ${directionBg}`}>
                      {directionLabel}
                    </span>
                  </td>
                  <td className={`px-2 py-1 text-right font-bold ${probColor(r.upgradeProb)}`}>
                    {r.upgradeProb != null ? r.upgradeProb.toFixed(1) + '%' : '--'}
                  </td>
                  <td className={`px-2 py-1 text-right font-bold ${probColor(r.downgradeProb)}`}>
                    {r.downgradeProb != null ? r.downgradeProb.toFixed(1) + '%' : '--'}
                  </td>
                  <td className="px-2 py-1 text-right text-white font-bold">
                    {fmtBps(r.spread)}
                  </td>
                  <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.spreadChange)}`}>
                    {fmtChange(r.spreadChange)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
