import { useMemo } from 'react';
import { useBondLadder } from '../../api/hooks/use-bond-ladder';
import { useT } from '../../i18n';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Types ──

interface Bond {
  isin: string;
  issuer: string;
  coupon: number;
  maturity: string;
  yearsToMaturity: number;
  rating: string;
  sector: string;
  price: number;
  yield: number;
  spread: number;
  faceValue: number;
  marketValue: number;
  duration: number;
  convexity: number;
  annualIncome: number;
  nextCouponDate: string;
}

interface CashFlow {
  year: number;
  couponIncome: number;
  principalReturn: number;
  totalCashFlow: number;
  cumulativeCashFlow: number;
}

interface MaturityBucket {
  bucket: string;
  count: number;
  faceValue: number;
  weight: number;
  avgYield: number;
  avgRating: string;
}

interface LadderMetrics {
  totalFaceValue: number;
  totalMarketValue: number;
  weightedAvgYield: number;
  weightedAvgDuration: number;
  weightedAvgRating: string;
  totalAnnualIncome: number;
  yieldToWorst: number;
}

interface LadderSummary {
  totalInvestment: number;
  annualIncome: number;
  avgYield: number;
  avgDuration: number;
  shortestMaturity: string;
  longestMaturity: string;
}

interface BondLadderData {
  bonds: Bond[];
  cashFlows: CashFlow[];
  maturityDistribution: MaturityBucket[];
  metrics: LadderMetrics;
  summary: LadderSummary;
}

// ── Formatting helpers ──

function fmtNum(n: number, decimals = 2): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtK(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtPct(n: number): string {
  return n.toFixed(3) + '%';
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: '2-digit', month: '2-digit', day: '2-digit' });
}

// ── Color helpers ──

function ratingColor(rating: string): string {
  const upper = rating.toUpperCase();
  if (upper.startsWith('AAA') || upper.startsWith('AA')) return 'text-green-400';
  if (upper.startsWith('A')) return 'text-yellow-400';
  if (upper.startsWith('BBB')) return 'text-orange-400';
  return 'text-neutral-400';
}

// ── Main Panel ──

export function BondLadderPanel() {
  const t = useT();
  const { data: rawData, isLoading } = useBondLadder();

  const data = rawData as BondLadderData | undefined;

  const sortedBonds = useMemo(() => {
    if (!data?.bonds) return [];
    return [...data.bonds].sort((a, b) => a.yearsToMaturity - b.yearsToMaturity);
  }, [data?.bonds]);

  // ── Loading state ──
  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col bg-black font-mono">
        <div className="flex items-center px-3 py-1.5 border-b border-blue-400/30">
          <div className="w-1.5 h-1.5 bg-blue-400" />
          <span className="ml-2 text-[9px] font-black uppercase tracking-wider text-blue-400">
            {tr(t, 'blTitle', 'Bond Ladder Builder')}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-blue-400/60 uppercase tracking-widest animate-pulse">
            LOADING...
          </span>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics;
  const summary = data?.summary;
  const cashFlows = data?.cashFlows ?? [];
  const distribution = data?.maturityDistribution ?? [];

  return (
    <div className="h-full flex flex-col bg-black font-mono overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black border-b border-blue-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-400" />
          <span className="text-[9px] font-black uppercase tracking-wider text-blue-400">
            {tr(t, 'blTitle', 'Bond Ladder Builder')}
          </span>
        </div>
        {summary && (
          <span className="text-[7px] text-neutral-600">
            {fmtDateShort(summary.shortestMaturity)} &mdash; {fmtDateShort(summary.longestMaturity)}
          </span>
        )}
      </div>

      {/* ── Metrics Bar ── */}
      {(metrics || summary) && (
        <div className="grid grid-cols-5 border-b border-blue-400/30 shrink-0">
          <MetricCell
            label={tr(t, 'blTotalInvestment', 'Total Investment')}
            value={summary ? `$${fmtK(summary.totalInvestment)}` : '--'}
          />
          <MetricCell
            label={tr(t, 'blAnnualIncome', 'Annual Income')}
            value={summary ? `$${fmtK(summary.annualIncome)}` : '--'}
            accent
          />
          <MetricCell
            label={tr(t, 'blAvgYield', 'Avg Yield')}
            value={summary ? fmtPct(summary.avgYield) : '--'}
          />
          <MetricCell
            label={tr(t, 'blAvgDuration', 'Avg Duration')}
            value={summary ? `${summary.avgDuration.toFixed(2)}y` : '--'}
          />
          <MetricCell
            label={tr(t, 'blYTW', 'Yield to Worst')}
            value={metrics ? fmtPct(metrics.yieldToWorst) : '--'}
          />
        </div>
      )}

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* ── Bond Ladder Table ── */}
        {sortedBonds.length > 0 && (
          <div>
            <div className="px-3 py-1 bg-black border-b border-blue-400/20">
              <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
                {tr(t, 'blBondLadder', 'Bond Ladder')}
              </span>
              <span className="ml-2 text-[7px] text-neutral-600">{sortedBonds.length} {tr(t, 'blBonds', 'bonds')}</span>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[1fr_36px_42px_62px_44px_40px_44px_40px_56px_52px] text-[7px] text-neutral-500 uppercase tracking-wider px-3 py-1 border-b border-blue-400/20 bg-black">
              <span>{tr(t, 'blIssuer', 'Issuer')}</span>
              <span className="text-center">{tr(t, 'blRating', 'Rtg')}</span>
              <span className="text-right">{tr(t, 'blCoupon', 'Cpn')}</span>
              <span className="text-right">{tr(t, 'blMaturity', 'Maturity')}</span>
              <span className="text-right">{tr(t, 'blYTM', 'YTM')}</span>
              <span className="text-right">{tr(t, 'blSpread', 'Sprd')}</span>
              <span className="text-right">{tr(t, 'blPrice', 'Price')}</span>
              <span className="text-right">{tr(t, 'blDuration', 'Dur')}</span>
              <span className="text-right">{tr(t, 'blFaceValue', 'Face Val')}</span>
              <span className="text-right">{tr(t, 'blAnnIncome', 'Ann Inc')}</span>
            </div>

            {/* Bond rows */}
            {sortedBonds.map((bond) => (
              <div
                key={bond.isin}
                className="grid grid-cols-[1fr_36px_42px_62px_44px_40px_44px_40px_56px_52px] text-[9px] px-3 py-1 border-b border-white/[0.04] hover:bg-blue-400/[0.02] transition-colors items-center"
              >
                <span className="text-white/80 truncate pr-1">{bond.issuer}</span>
                <span className={`text-center font-bold ${ratingColor(bond.rating)}`}>
                  {bond.rating}
                </span>
                <span className="text-right text-blue-300/80">{bond.coupon.toFixed(2)}%</span>
                <span className="text-right text-neutral-400">{fmtDate(bond.maturity)}</span>
                <span className="text-right text-green-400 font-bold">{fmtPct(bond.yield)}</span>
                <span className="text-right text-neutral-500">+{bond.spread}</span>
                <span className="text-right text-white/70">{fmtNum(bond.price)}</span>
                <span className="text-right text-neutral-400">{bond.duration.toFixed(2)}</span>
                <span className="text-right text-white/60">${fmtK(bond.faceValue)}</span>
                <span className="text-right text-blue-400">${fmtK(bond.annualIncome)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Maturity Distribution ── */}
        {distribution.length > 0 && (
          <div className="border-t border-blue-400/20">
            <div className="px-3 py-1 bg-black border-b border-blue-400/20">
              <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
                {tr(t, 'blMaturityDist', 'Maturity Distribution')}
              </span>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-px bg-white/[0.03]">
              {distribution.map((bucket) => (
                <div key={bucket.bucket} className="bg-black px-2 py-1.5">
                  <div className="text-[8px] font-bold text-blue-400 uppercase tracking-wider">
                    {bucket.bucket}
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <span className="text-[9px] text-white/70">{bucket.count} {tr(t, 'blBonds', 'bonds')}</span>
                    <span className="text-[8px] text-neutral-500">{(bucket.weight * 100).toFixed(1)}%</span>
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <span className="text-[8px] text-neutral-500">${fmtK(bucket.faceValue)}</span>
                    <span className="text-[8px] text-green-400">{fmtPct(bucket.avgYield)}</span>
                  </div>
                  {/* Weight bar */}
                  <div className="mt-1 h-1 bg-white/[0.04] w-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400/40"
                      style={{ width: `${Math.min(bucket.weight * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Cash Flow Projection ── */}
        {cashFlows.length > 0 && (
          <div className="border-t border-blue-400/20">
            <div className="px-3 py-1 bg-black border-b border-blue-400/20">
              <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
                {tr(t, 'blCashFlowProjection', 'Cash Flow Projection')}
              </span>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[48px_1fr_1fr_1fr_1fr] text-[7px] text-neutral-500 uppercase tracking-wider px-3 py-1 border-b border-blue-400/20 bg-black">
              <span>{tr(t, 'blYear', 'Year')}</span>
              <span className="text-right">{tr(t, 'blCouponIncome', 'Coupon')}</span>
              <span className="text-right">{tr(t, 'blPrincipal', 'Principal')}</span>
              <span className="text-right">{tr(t, 'blTotalCF', 'Total CF')}</span>
              <span className="text-right">{tr(t, 'blCumulative', 'Cumulative')}</span>
            </div>

            {/* Cash flow rows */}
            {cashFlows.map((cf) => (
              <div
                key={cf.year}
                className="grid grid-cols-[48px_1fr_1fr_1fr_1fr] text-[9px] px-3 py-1 border-b border-white/[0.04] hover:bg-blue-400/[0.02] transition-colors items-center"
              >
                <span className="text-white/60 font-bold">{cf.year}</span>
                <span className="text-right text-blue-300/70">${fmtK(cf.couponIncome)}</span>
                <span className={`text-right ${cf.principalReturn > 0 ? 'text-amber-400' : 'text-neutral-600'}`}>
                  {cf.principalReturn > 0 ? `$${fmtK(cf.principalReturn)}` : '\u2014'}
                </span>
                <span className="text-right text-white/70">${fmtK(cf.totalCashFlow)}</span>
                <span className="text-right text-green-400 font-bold">${fmtK(cf.cumulativeCashFlow)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!data && !isLoading && (
          <div className="flex items-center justify-center py-8">
            <span className="text-[9px] text-neutral-600 uppercase tracking-widest">
              {tr(t, 'blNoData', 'No bond ladder data available')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Metric Cell ──

function MetricCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="px-2 py-1.5 border-r border-blue-400/10 last:border-r-0 bg-black">
      <div className="text-[7px] text-neutral-600 uppercase tracking-wider truncate">{label}</div>
      <div className={`text-[11px] font-bold ${accent ? 'text-blue-400' : 'text-white/80'}`}>
        {value}
      </div>
    </div>
  );
}
