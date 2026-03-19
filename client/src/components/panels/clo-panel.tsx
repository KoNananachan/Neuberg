import { useState } from 'react';
import { useCLO } from '../../api/hooks/use-clo';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting helpers ──

function fmtB(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtBps(n: number): string {
  return `${n.toFixed(0)}bp`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(0)}bp`;
}

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function spreadChangeColor(n: number): string {
  // Wider spreads = negative, tighter = positive
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function riskColor(level: string): string {
  if (level === 'LOW' || level === 'low') return 'text-green-400';
  if (level === 'MEDIUM' || level === 'medium' || level === 'MODERATE' || level === 'moderate') return 'text-yellow-400';
  if (level === 'HIGH' || level === 'high') return 'text-red-400';
  if (level === 'ELEVATED' || level === 'elevated') return 'text-orange-400';
  return 'text-neutral-400';
}

function riskBg(level: string): string {
  if (level === 'LOW' || level === 'low') return 'bg-green-500/10 border-green-500/30';
  if (level === 'MEDIUM' || level === 'medium' || level === 'MODERATE' || level === 'moderate') return 'bg-yellow-500/10 border-yellow-500/30';
  if (level === 'HIGH' || level === 'high') return 'bg-red-500/10 border-red-500/30';
  if (level === 'ELEVATED' || level === 'elevated') return 'bg-orange-500/10 border-orange-500/30';
  return 'bg-neutral-500/10 border-neutral-500/30';
}

// ── Tranche color mapping ──

function trancheColor(tranche: string): string {
  const t = tranche.toUpperCase();
  if (t === 'AAA') return 'text-blue-400';
  if (t === 'AA') return 'text-blue-300';
  if (t === 'A') return 'text-cyan-400';
  if (t === 'BBB') return 'text-yellow-400';
  if (t === 'BB') return 'text-orange-400';
  if (t === 'B') return 'text-red-400';
  if (t === 'EQUITY') return 'text-red-500';
  return 'text-neutral-400';
}

function trancheBg(tranche: string): string {
  const t = tranche.toUpperCase();
  if (t === 'AAA') return 'bg-blue-500/8';
  if (t === 'AA') return 'bg-blue-400/8';
  if (t === 'A') return 'bg-cyan-500/8';
  if (t === 'BBB') return 'bg-yellow-500/8';
  if (t === 'BB') return 'bg-orange-500/8';
  if (t === 'B') return 'bg-red-500/8';
  if (t === 'EQUITY') return 'bg-red-600/8';
  return '';
}

function perfBadge(perf: string): { text: string; bg: string } {
  const p = perf.toUpperCase();
  if (p === 'STRONG' || p === 'OUTPERFORM') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  if (p === 'AVERAGE' || p === 'INLINE') return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
  if (p === 'WEAK' || p === 'UNDERPERFORM') return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/30' };
}

// ── Tab type ──

type Tab = 'OVERVIEW' | 'TRANCHES' | 'MANAGERS' | 'ISSUANCE';

// ── SVG Icon ──

function CLOIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      {/* Stacked/layered tranche motif */}
      <rect x="2" y="2" width="12" height="3" rx="0.5" fill="#fb923c" opacity="0.9" />
      <rect x="3" y="6" width="10" height="3" rx="0.5" fill="#fb923c" opacity="0.6" />
      <rect x="4" y="10" width="8" height="3" rx="0.5" fill="#fb923c" opacity="0.35" />
    </svg>
  );
}

// ── Main Panel ──

export function CLOPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCLO();
  const [tab, setTab] = useState<Tab>('OVERVIEW');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <CLOIcon />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-orange-400">
            {tr(t, 'cloCloMonitor', 'CLO Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-orange-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['OVERVIEW', 'TRANCHES', 'MANAGERS', 'ISSUANCE'] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t_
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {t_}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-orange-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cloNoData', 'No data available')}
          </div>
        )}

        {data && tab === 'OVERVIEW' && <OverviewTab data={data} t={t} />}
        {data && tab === 'TRANCHES' && <TranchesTab data={data} t={t} />}
        {data && tab === 'MANAGERS' && <ManagersTab data={data} t={t} />}
        {data && tab === 'ISSUANCE' && <IssuanceTab data={data} t={t} />}
      </div>
    </div>
  );
}

// ── OVERVIEW TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OverviewTab({ data, t }: { data: any; t: TFn }) {
  const market = data?.market;
  const collateral = data?.collateral;
  const risk = data?.risk;

  return (
    <div>
      {/* Market Overview */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cloMarketOverview', 'Market Overview')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-px bg-border/10">
          <MetricCard
            label={tr(t, 'cloTotalOutstanding', 'Total Outstanding')}
            value={market?.totalOutstanding != null ? fmtB(market.totalOutstanding) : '--'}
          />
          <MetricCard
            label={tr(t, 'cloIssuanceYtd', 'Issuance YTD')}
            value={market?.issuanceYtd != null ? fmtB(market.issuanceYtd) : '--'}
          />
          <MetricCard
            label={tr(t, 'cloAaaSpread', 'AAA Spread')}
            value={market?.aaaSpread != null ? fmtBps(market.aaaSpread) : '--'}
            change={market?.aaaSpreadChange}
          />
          <MetricCard
            label={tr(t, 'cloBbbSpread', 'BBB Spread')}
            value={market?.bbbSpread != null ? fmtBps(market.bbbSpread) : '--'}
            change={market?.bbbSpreadChange}
          />
          <MetricCard
            label={tr(t, 'cloEquityNav', 'Equity NAV')}
            value={market?.equityNav != null ? fmtPct(market.equityNav) : '--'}
          />
          <MetricCard
            label={tr(t, 'cloDefaultRate', 'Default Rate')}
            value={market?.defaultRate != null ? fmtPct(market.defaultRate) : '--'}
            warning={market?.defaultRate != null && market.defaultRate > 2}
          />
        </div>
      </div>

      {/* Collateral Metrics */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cloCollateralMetrics', 'Collateral Metrics')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-px bg-border/10">
          <MetricCard
            label={tr(t, 'cloAvgLoanPrice', 'Avg Loan Price')}
            value={collateral?.avgLoanPrice != null ? fmtPrice(collateral.avgLoanPrice) : '--'}
          />
          <MetricCard
            label={tr(t, 'cloAvgCoupon', 'Avg Coupon')}
            value={collateral?.avgCoupon != null ? fmtPct(collateral.avgCoupon) : '--'}
          />
          <MetricCard
            label={tr(t, 'cloCccBucket', 'CCC Bucket')}
            value={collateral?.cccBucket != null ? fmtPct(collateral.cccBucket) : '--'}
            warning={collateral?.cccBucket != null && collateral.cccBucket > 7.5}
          />
          <MetricCard
            label={tr(t, 'cloWarf', 'WARF')}
            value={collateral?.warf != null ? collateral.warf.toFixed(0) : '--'}
          />
          <MetricCard
            label={tr(t, 'cloOcTestSenior', 'OC Test (Sr)')}
            value={collateral?.ocTestSenior != null ? fmtPct(collateral.ocTestSenior) : '--'}
            pass={collateral?.ocTestSeniorPass}
          />
          <MetricCard
            label={tr(t, 'cloOcTestMezz', 'OC Test (Mezz)')}
            value={collateral?.ocTestMezz != null ? fmtPct(collateral.ocTestMezz) : '--'}
            pass={collateral?.ocTestMezzPass}
          />
        </div>
      </div>

      {/* Risk Indicators */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cloRiskIndicators', 'Risk Indicators')}
          </span>
          {risk?.overallRisk && (
            <span
              className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider border ${riskColor(risk.overallRisk)} ${riskBg(risk.overallRisk)}`}
            >
              {risk.overallRisk}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(risk?.indicators ?? []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (ind: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-[rgba(251,146,60,0.04)] hover:bg-orange-400/[0.02]">
                <span className="text-[8px] font-mono text-neutral-400 uppercase">
                  {ind?.name ?? '--'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-mono font-bold text-white">
                    {ind?.value ?? '--'}
                  </span>
                  {ind?.level && (
                    <span
                      className={`text-[7px] font-mono font-bold px-1 py-px border ${riskColor(ind.level)} ${riskBg(ind.level)}`}
                    >
                      {ind.level}
                    </span>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Timestamp */}
      {data?.timestamp && (
        <div className="px-3 py-1 border-t border-border/10">
          <span className="text-[7px] font-mono text-neutral-700">
            {tr(t, 'cloLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  change,
  warning,
  pass,
}: {
  label: string;
  value: string;
  change?: number;
  warning?: boolean;
  pass?: boolean;
}) {
  return (
    <div className="px-2 py-1.5 bg-black hover:bg-orange-400/[0.02]">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        {label}
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className={`text-[10px] font-mono font-bold ${warning ? 'text-red-400' : 'text-white'}`}>
          {value}
        </span>
        {change != null && (
          <span className={`text-[8px] font-mono font-bold ${spreadChangeColor(change)}`}>
            {fmtChange(change)}
          </span>
        )}
        {pass != null && (
          <span
            className={`text-[7px] font-mono font-bold px-1 py-px border ${
              pass
                ? 'text-green-400 bg-green-500/10 border-green-500/30'
                : 'text-red-400 bg-red-500/10 border-red-500/30'
            }`}
          >
            {pass ? 'PASS' : 'FAIL'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── TRANCHES TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TranchesTab({ data, t }: { data: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tranches: any[] = data?.tranches ?? [];

  if (tranches.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'cloNoTranches', 'No tranche data')}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cloTrancheSpreadTable', 'Tranche Spreads')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-7 gap-px px-3 py-1 bg-[rgba(251,146,60,0.04)] border-b border-border/20">
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase">Tranche</span>
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase text-right">Spread</span>
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase text-right">1M Chg</span>
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase text-right">Yield</span>
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase text-right">Price</span>
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase text-right">Dur Risk</span>
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase text-right">Loss Abs</span>
      </div>

      {/* Table rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {tranches.map((tr_: any, i: number) => (
        <div
          key={i}
          className={`grid grid-cols-7 gap-px px-3 py-1.5 border-b border-border/20 hover:bg-orange-400/[0.02] ${trancheBg(tr_?.name ?? '')}`}
        >
          <div className="flex items-center gap-1">
            <div
              className={`w-1 h-3 ${
                tr_?.name?.toUpperCase() === 'AAA'
                  ? 'bg-blue-400'
                  : tr_?.name?.toUpperCase() === 'AA'
                    ? 'bg-blue-300'
                    : tr_?.name?.toUpperCase() === 'A'
                      ? 'bg-cyan-400'
                      : tr_?.name?.toUpperCase() === 'BBB'
                        ? 'bg-yellow-400'
                        : tr_?.name?.toUpperCase() === 'BB'
                          ? 'bg-orange-400'
                          : tr_?.name?.toUpperCase() === 'B'
                            ? 'bg-red-400'
                            : 'bg-red-500'
              }`}
            />
            <span className={`text-[9px] font-mono font-bold ${trancheColor(tr_?.name ?? '')}`}>
              {tr_?.name ?? '--'}
            </span>
          </div>
          <span className="text-[9px] font-mono text-white text-right">
            {tr_?.spread != null ? fmtBps(tr_.spread) : '--'}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${tr_?.change1m != null ? spreadChangeColor(tr_.change1m) : 'text-neutral-500'}`}>
            {tr_?.change1m != null ? fmtChange(tr_.change1m) : '--'}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {tr_?.yield != null ? fmtPct(tr_.yield) : '--'}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {tr_?.price != null ? fmtPrice(tr_.price) : '--'}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {tr_?.durationRisk ?? '--'}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {tr_?.lossAbsorption != null ? fmtPct(tr_.lossAbsorption) : '--'}
          </span>
        </div>
      ))}

      {/* Legend */}
      <div className="px-3 py-2 border-t border-border/10">
        <div className="flex items-center gap-3 flex-wrap">
          {['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'EQUITY'].map((label) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className={`w-2 h-2 ${
                  label === 'AAA'
                    ? 'bg-blue-400'
                    : label === 'AA'
                      ? 'bg-blue-300'
                      : label === 'A'
                        ? 'bg-cyan-400'
                        : label === 'BBB'
                          ? 'bg-yellow-400'
                          : label === 'BB'
                            ? 'bg-orange-400'
                            : label === 'B'
                              ? 'bg-red-400'
                              : 'bg-red-500'
                }`}
              />
              <span className="text-[7px] font-mono text-neutral-600">{label}</span>
            </div>
          ))}
        </div>
        <div className="text-[7px] font-mono text-neutral-700 mt-1">
          {tr(t, 'cloColorGradient', 'Safe (blue) → Risky (red)')}
        </div>
      </div>
    </div>
  );
}

// ── MANAGERS TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ManagersTab({ data, t }: { data: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const managers: any[] = data?.managers ?? [];

  if (managers.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'cloNoManagers', 'No manager data')}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cloTopManagers', 'Top CLO Managers')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-6 gap-px px-3 py-1 bg-[rgba(251,146,60,0.04)] border-b border-border/20">
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase col-span-1">Manager</span>
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase text-right">AUM</span>
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase text-right">Deals</span>
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase text-right">Perf</span>
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase text-right">Def Rate</span>
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase text-right">WC Rtg</span>
      </div>

      {/* Table rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {managers.map((mgr: any, i: number) => {
        const perf = perfBadge(mgr?.avgPerformance ?? '');
        return (
          <div
            key={i}
            className="grid grid-cols-6 gap-px px-3 py-1.5 border-b border-border/20 hover:bg-orange-400/[0.02]"
          >
            <span className="text-[9px] font-mono font-bold text-white truncate col-span-1">
              {mgr?.name ?? '--'}
            </span>
            <span className="text-[9px] font-mono text-white text-right">
              {mgr?.aum != null ? fmtB(mgr.aum) : '--'}
            </span>
            <span className="text-[9px] font-mono text-neutral-400 text-right">
              {mgr?.deals ?? '--'}
            </span>
            <div className="flex justify-end">
              <span
                className={`text-[7px] font-mono font-bold px-1 py-px ${perf.text} ${perf.bg}`}
              >
                {mgr?.avgPerformance?.toUpperCase() ?? '--'}
              </span>
            </div>
            <span className="text-[9px] font-mono text-neutral-400 text-right">
              {mgr?.defaultRate != null ? fmtPct(mgr.defaultRate) : '--'}
            </span>
            <span className="text-[9px] font-mono text-orange-400 text-right">
              {mgr?.wcRating ?? '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── ISSUANCE TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IssuanceTab({ data, t }: { data: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const issuance: any[] = data?.issuance ?? [];

  if (issuance.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'cloNoIssuance', 'No issuance data')}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cloNewIssuance', 'New Issuance')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-7 gap-px px-3 py-1 bg-[rgba(251,146,60,0.04)] border-b border-border/20">
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase col-span-1">Deal</span>
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase">Manager</span>
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase text-right">Size</span>
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase text-right">AAA Spd</span>
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase text-right">Eq Yld</span>
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase text-right">Close</span>
        <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase text-right">RI Prd</span>
      </div>

      {/* Table rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {issuance.map((deal: any, i: number) => (
        <div
          key={i}
          className="grid grid-cols-7 gap-px px-3 py-1.5 border-b border-border/20 hover:bg-orange-400/[0.02]"
        >
          <span className="text-[9px] font-mono font-bold text-orange-400 truncate col-span-1">
            {deal?.dealName ?? '--'}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 truncate">
            {deal?.manager ?? '--'}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {deal?.size != null ? fmtB(deal.size) : '--'}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {deal?.aaaSpread != null ? fmtBps(deal.aaaSpread) : '--'}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {deal?.equityYield != null ? fmtPct(deal.equityYield) : '--'}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {deal?.closingDate ?? '--'}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {deal?.reinvestPeriod ?? '--'}
          </span>
        </div>
      ))}

      {/* Summary */}
      {issuance.length > 0 && (
        <div className="px-3 py-2 border-t border-border/10">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[7px] font-mono text-neutral-600 uppercase">Total Deals</span>
              <span className="text-[9px] font-mono font-bold text-white ml-1.5">{issuance.length}</span>
            </div>
            <div>
              <span className="text-[7px] font-mono text-neutral-600 uppercase">Total Volume</span>
              <span className="text-[9px] font-mono font-bold text-white ml-1.5">
                {fmtB(
                  issuance.reduce(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (sum: number, d: any) => sum + (d?.size ?? 0),
                    0,
                  ),
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
