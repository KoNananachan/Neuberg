import { useMemo } from 'react';
import { useFixedIncomeLadder } from '../../api/hooks/use-fixed-income-ladder';
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
  id: string;
  maturity: string;
  issuer: string;
  coupon: number;
  yield: number;
  price: number;
  par: number;
  marketValue: number;
  duration: number;
  rating: string;
}

interface CashFlow {
  year: number;
  coupon: number;
  principal: number;
  total: number;
}

interface PortfolioSummary {
  totalValue: number;
  avgCoupon: number;
  avgYield: number;
  avgDuration: number;
}

interface MaturityBucket {
  label: string;
  count: number;
  value: number;
  weight: number;
}

interface FixedIncomeLadderData {
  bonds: Bond[];
  cashFlows: CashFlow[];
  summary: PortfolioSummary;
  maturityDistribution: MaturityBucket[];
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

// ── Color helpers ──

function ratingColor(rating: string): string {
  const upper = rating.toUpperCase();
  if (upper.startsWith('AAA') || upper.startsWith('AA')) return 'text-green-400';
  if (upper.startsWith('A')) return 'text-yellow-400';
  if (upper.startsWith('BBB')) return 'text-orange-400';
  return 'text-neutral-400';
}

// ── Main Panel ──

export function FixedIncomeLadderPanel() {
  const t = useT();
  const { data: rawData, isLoading } = useFixedIncomeLadder();

  const data = rawData as FixedIncomeLadderData | undefined;

  const sortedBonds = useMemo(() => {
    if (!data?.bonds) return [];
    return [...data.bonds].sort(
      (a, b) => new Date(a.maturity).getTime() - new Date(b.maturity).getTime()
    );
  }, [data?.bonds]);

  // ── Loading state ──
  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col bg-black font-mono">
        <div className="flex items-center px-3 py-1.5 border-b border-border/20">
          <div className="w-1.5 h-1.5 bg-fuchsia-400" />
          <span className="ml-2 text-[9px] font-black uppercase tracking-wider text-fuchsia-400">
            {tr(t, 'filTitle', 'Fixed Income Ladder')}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-fuchsia-400/60 uppercase tracking-widest animate-pulse">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  const summary = data?.summary;
  const cashFlows = data?.cashFlows ?? [];
  const distribution = data?.maturityDistribution ?? [];

  return (
    <div className="h-full flex flex-col bg-black font-mono overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-fuchsia-400" />
          <span className="text-[9px] font-black uppercase tracking-wider text-fuchsia-400">
            {tr(t, 'filTitle', 'Fixed Income Ladder')}
          </span>
        </div>
        {sortedBonds.length > 0 && (
          <span className="text-[7px] text-neutral-600">
            {sortedBonds.length} {tr(t, 'filBonds', 'bonds')}
          </span>
        )}
      </div>

      {/* ── Portfolio Summary Bar ── */}
      {summary && (
        <div className="grid grid-cols-4 border-b border-border/20 shrink-0">
          <MetricCell
            label={tr(t, 'filTotalValue', 'Total Value')}
            value={`$${fmtK(summary.totalValue)}`}
          />
          <MetricCell
            label={tr(t, 'filAvgCoupon', 'Avg Coupon')}
            value={fmtPct(summary.avgCoupon)}
            accent
          />
          <MetricCell
            label={tr(t, 'filAvgYield', 'Avg Yield')}
            value={fmtPct(summary.avgYield)}
            accent
          />
          <MetricCell
            label={tr(t, 'filAvgDuration', 'Avg Duration')}
            value={`${summary.avgDuration.toFixed(2)}y`}
          />
        </div>
      )}

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* ── Bond Ladder Table ── */}
        {sortedBonds.length > 0 && (
          <div>
            <div className="px-3 py-1 bg-black border-b border-border/20">
              <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
                {tr(t, 'filBondLadder', 'Bond Ladder')}
              </span>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[62px_1fr_42px_42px_44px_48px_56px_40px_36px] text-[7px] text-neutral-500 uppercase tracking-wider px-3 py-1 border-b border-border/20 bg-black">
              <span>{tr(t, 'filMaturity', 'Maturity')}</span>
              <span>{tr(t, 'filIssuer', 'Issuer')}</span>
              <span className="text-right">{tr(t, 'filCoupon', 'Cpn')}</span>
              <span className="text-right">{tr(t, 'filYield', 'Yld')}</span>
              <span className="text-right">{tr(t, 'filPrice', 'Price')}</span>
              <span className="text-right">{tr(t, 'filPar', 'Par')}</span>
              <span className="text-right">{tr(t, 'filMktVal', 'Mkt Val')}</span>
              <span className="text-right">{tr(t, 'filDuration', 'Dur')}</span>
              <span className="text-center">{tr(t, 'filRating', 'Rtg')}</span>
            </div>

            {/* Bond rows */}
            {sortedBonds.map((bond) => (
              <div
                key={bond.id}
                className="grid grid-cols-[62px_1fr_42px_42px_44px_48px_56px_40px_36px] text-[9px] px-3 py-1 border-b border-white/[0.04] hover:bg-fuchsia-400/[0.02] transition-colors items-center"
              >
                <span className="text-neutral-400">{fmtDate(bond.maturity)}</span>
                <span className="text-white/80 truncate pr-1">{bond.issuer}</span>
                <span className="text-right text-fuchsia-300/80">{bond.coupon.toFixed(2)}%</span>
                <span className="text-right text-green-400 font-bold">{fmtPct(bond.yield)}</span>
                <span className="text-right text-white/70">{fmtNum(bond.price)}</span>
                <span className="text-right text-white/60">${fmtK(bond.par)}</span>
                <span className="text-right text-fuchsia-400">${fmtK(bond.marketValue)}</span>
                <span className="text-right text-neutral-400">{bond.duration.toFixed(2)}</span>
                <span className={`text-center font-bold ${ratingColor(bond.rating)}`}>
                  {bond.rating}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Cash Flow Schedule ── */}
        {cashFlows.length > 0 && (
          <div className="border-t border-border/20">
            <div className="px-3 py-1 bg-black border-b border-border/20">
              <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
                {tr(t, 'filCashFlowSchedule', 'Cash Flow Schedule')}
              </span>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[48px_1fr_1fr_1fr] text-[7px] text-neutral-500 uppercase tracking-wider px-3 py-1 border-b border-border/20 bg-black">
              <span>{tr(t, 'filYear', 'Year')}</span>
              <span className="text-right">{tr(t, 'filCouponCF', 'Coupon')}</span>
              <span className="text-right">{tr(t, 'filPrincipal', 'Principal')}</span>
              <span className="text-right">{tr(t, 'filTotal', 'Total')}</span>
            </div>

            {/* Cash flow rows */}
            {cashFlows.map((cf) => (
              <div
                key={cf.year}
                className="grid grid-cols-[48px_1fr_1fr_1fr] text-[9px] px-3 py-1 border-b border-white/[0.04] hover:bg-fuchsia-400/[0.02] transition-colors items-center"
              >
                <span className="text-white/60 font-bold">{cf.year}</span>
                <span className="text-right text-fuchsia-300/70">${fmtK(cf.coupon)}</span>
                <span className={`text-right ${cf.principal > 0 ? 'text-amber-400' : 'text-neutral-600'}`}>
                  {cf.principal > 0 ? `$${fmtK(cf.principal)}` : '\u2014'}
                </span>
                <span className="text-right text-white/70">${fmtK(cf.total)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Maturity Distribution ── */}
        {distribution.length > 0 && (
          <div className="border-t border-border/20">
            <div className="px-3 py-1 bg-black border-b border-border/20">
              <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
                {tr(t, 'filMaturityDist', 'Maturity Distribution')}
              </span>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-px bg-white/[0.03]">
              {distribution.map((bucket) => (
                <div key={bucket.label} className="bg-black px-2 py-1.5">
                  <div className="text-[8px] font-bold text-fuchsia-400 uppercase tracking-wider">
                    {bucket.label}
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <span className="text-[9px] text-white/70">
                      {bucket.count} {tr(t, 'filBonds', 'bonds')}
                    </span>
                    <span className="text-[8px] text-neutral-500">
                      {(bucket.weight * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-0.5">
                    <span className="text-[8px] text-neutral-500">${fmtK(bucket.value)}</span>
                  </div>
                  {/* Weight bar */}
                  <div className="mt-1 h-1 bg-white/[0.04] w-full overflow-hidden">
                    <div
                      className="h-full bg-fuchsia-400/40"
                      style={{ width: `${Math.min(bucket.weight * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!data && !isLoading && (
          <div className="flex items-center justify-center py-8">
            <span className="text-[9px] text-neutral-600 uppercase tracking-widest">
              {tr(t, 'filNoData', 'No fixed income ladder data available')}
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
    <div className="px-2 py-1.5 border-r border-border/10 last:border-r-0 bg-black">
      <div className="text-[7px] text-neutral-600 uppercase tracking-wider truncate">{label}</div>
      <div className={`text-[11px] font-bold ${accent ? 'text-fuchsia-400' : 'text-white/80'}`}>
        {value}
      </div>
    </div>
  );
}
