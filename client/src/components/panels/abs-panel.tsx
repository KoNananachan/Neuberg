import { useState } from 'react';
import { useABS } from '../../api/hooks/use-abs';
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

const ACCENT = '#facc15'; // yellow-400
const DIM = 'rgba(250,204,21,0.12)';

// ── Formatting helpers ──

function fmtB(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return `${n.toFixed(0)}bp`;
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '--';
  return `${n.toFixed(decimals)}%`;
}

function fmtCpn(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return `${n.toFixed(3)}%`;
}

// ── Color helpers ──

function spreadColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 200) return 'text-red-400';
  if (n > 100) return 'text-orange-400';
  if (n > 50) return 'text-yellow-400';
  return 'text-green-400';
}

function delinquencyColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 10) return 'text-red-400';
  if (n >= 5) return 'text-orange-400';
  if (n >= 2) return 'text-yellow-400';
  return 'text-green-400';
}

function lossColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 5) return 'text-red-400';
  if (n >= 2) return 'text-orange-400';
  if (n >= 1) return 'text-yellow-400';
  return 'text-green-400';
}

function recoveryColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 70) return 'text-green-400';
  if (n >= 50) return 'text-yellow-400';
  if (n >= 30) return 'text-orange-400';
  return 'text-red-400';
}

function riskColor(level: string | null | undefined): string {
  const l = level?.toUpperCase() ?? '';
  if (l === 'LOW') return 'text-green-400';
  if (l === 'MODERATE' || l === 'MEDIUM') return 'text-yellow-400';
  if (l === 'ELEVATED') return 'text-orange-400';
  if (l === 'HIGH') return 'text-red-400';
  return 'text-neutral-400';
}

function riskBg(level: string | null | undefined): string {
  const l = level?.toUpperCase() ?? '';
  if (l === 'LOW') return 'bg-green-500/10 border-green-500/30';
  if (l === 'MODERATE' || l === 'MEDIUM') return 'bg-yellow-500/10 border-yellow-500/30';
  if (l === 'ELEVATED') return 'bg-orange-500/10 border-orange-500/30';
  if (l === 'HIGH') return 'bg-red-500/10 border-red-500/30';
  return 'bg-neutral-500/10 border-neutral-500/30';
}

function trendBadge(trend: string | null | undefined): { text: string; bg: string } {
  const s = trend?.toLowerCase() ?? '';
  if (s === 'improving' || s === 'tightening' || s === 'decreasing')
    return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
  if (s === 'deteriorating' || s === 'widening' || s === 'increasing')
    return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  if (s === 'stable' || s === 'flat')
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30' };
}

// ── Tab type ──

type Tab = 'OVERVIEW' | 'SECTORS' | 'DEALS' | 'PERFORMANCE';

// ── SVG Icon (stacked layers motif) ──

function ABSIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <rect x="2" y="2" width="12" height="2.5" rx="0.5" fill="#facc15" opacity="0.9" />
      <rect x="3" y="5.5" width="10" height="2.5" rx="0.5" fill="#facc15" opacity="0.6" />
      <rect x="4" y="9" width="8" height="2.5" rx="0.5" fill="#facc15" opacity="0.35" />
      <rect x="5" y="12.5" width="6" height="2" rx="0.5" fill="#facc15" opacity="0.2" />
    </svg>
  );
}

// ── Main Panel ──

export function ABSPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useABS();
  const [tab, setTab] = useState<Tab>('OVERVIEW');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <ABSIcon />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-yellow-400">
            {tr(t, 'absMonitor', 'ABS Monitor')}
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
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['OVERVIEW', 'SECTORS', 'DEALS', 'PERFORMANCE'] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t_
                ? 'border-yellow-400 text-yellow-400'
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
          <div className="text-center py-8 text-yellow-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'absNoData', 'No data available')}
          </div>
        )}

        {data && tab === 'OVERVIEW' && <OverviewTab data={data} t={t} />}
        {data && tab === 'SECTORS' && <SectorsTab data={data} t={t} />}
        {data && tab === 'DEALS' && <DealsTab data={data} t={t} />}
        {data && tab === 'PERFORMANCE' && <PerformanceTab data={data} t={t} />}
      </div>
    </div>
  );
}

// ── OVERVIEW TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OverviewTab({ data, t }: { data: any; t: TFn }) {
  const market = data?.marketOverview;
  const risk = data?.riskIndicators;
  const spreadCurve = data?.spreadCurve;

  return (
    <div>
      {/* Market Overview */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'absMarketOverview', 'Market Overview')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-px bg-border/10">
          <MetricCard
            label={tr(t, 'absTotalOutstanding', 'Total Outstanding')}
            value={fmtB(market?.totalOutstanding)}
          />
          <MetricCard
            label={tr(t, 'absIssuanceYtd', 'Issuance YTD')}
            value={fmtB(market?.issuanceYtd)}
          />
          <MetricCard
            label={tr(t, 'absAaaSpread', 'AAA Spread')}
            value={market?.aaaSpread != null ? fmtBps(market.aaaSpread) : '--'}
            change={market?.aaaSpreadChange}
          />
          <MetricCard
            label={tr(t, 'absASpread', 'A Spread')}
            value={market?.aSpread != null ? fmtBps(market.aSpread) : '--'}
            change={market?.aSpreadChange}
          />
          <MetricCard
            label={tr(t, 'absBbbSpread', 'BBB Spread')}
            value={market?.bbbSpread != null ? fmtBps(market.bbbSpread) : '--'}
            change={market?.bbbSpreadChange}
          />
          <MetricCard
            label={tr(t, 'absPrepaySpeed', 'Prepayment Speed')}
            value={market?.prepaymentSpeed != null ? fmtPct(market.prepaymentSpeed) : '--'}
            suffix="CPR"
          />
        </div>
      </div>

      {/* Risk Indicators */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'absRiskIndicators', 'Risk Indicators')}
            </span>
            {risk?.overallRisk && (
              <span
                className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider border ${riskColor(risk.overallRisk)} ${riskBg(risk.overallRisk)}`}
              >
                {risk.overallRisk}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border/10">
          {(risk?.indicators ?? []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (ind: any, i: number) => (
              <div key={i} className={`flex items-center justify-between px-2 py-1.5 bg-black hover:bg-yellow-400/[0.02]`}>
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

      {/* Spread Curve Table (1Y-5Y by sector) */}
      {spreadCurve && spreadCurve.length > 0 && (
        <div>
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'absSpreadCurve', 'Spread Curve (bp)')}
            </span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Sector</th>
                <th className="px-2 py-1.5 text-right font-bold">1Y</th>
                <th className="px-2 py-1.5 text-right font-bold">2Y</th>
                <th className="px-2 py-1.5 text-right font-bold">3Y</th>
                <th className="px-2 py-1.5 text-right font-bold">5Y</th>
                <th className="px-2 py-1.5 text-right font-bold">Chg</th>
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {spreadCurve.map((r: any, i: number) => (
                <tr key={`${r?.sector}-${i}`} className="border-b border-border/5 hover:bg-yellow-400/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r?.sector ?? '--'}</td>
                  <td className={`px-2 py-1.5 text-right ${spreadColor(r?.y1)}`}>{fmtBps(r?.y1)}</td>
                  <td className={`px-2 py-1.5 text-right ${spreadColor(r?.y2)}`}>{fmtBps(r?.y2)}</td>
                  <td className={`px-2 py-1.5 text-right ${spreadColor(r?.y3)}`}>{fmtBps(r?.y3)}</td>
                  <td className={`px-2 py-1.5 text-right ${spreadColor(r?.y5)}`}>{fmtBps(r?.y5)}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${r?.change != null && r.change > 0 ? 'text-red-400' : r?.change != null && r.change < 0 ? 'text-green-400' : 'text-neutral-500'}`}>
                    {r?.change != null ? `${r.change >= 0 ? '+' : ''}${r.change.toFixed(0)}bp` : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Timestamp */}
      {data?.timestamp && (
        <div className="px-3 py-1 border-t border-border/10">
          <span className="text-[7px] font-mono text-neutral-700">
            {tr(t, 'absLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}

// ── SECTORS TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectorsTab({ data, t }: { data: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectors: any[] = data?.sectors ?? [];

  if (sectors.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'absNoSectors', 'No sector data')}
      </div>
    );
  }

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'absSectorBreakdown', 'Sector Breakdown')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Sector</th>
            <th className="px-2 py-1.5 text-right font-bold">Outstd</th>
            <th className="px-2 py-1.5 text-right font-bold">Issuance</th>
            <th className="px-2 py-1.5 text-right font-bold">Avg Spd</th>
            <th className="px-2 py-1.5 text-right font-bold">DQ Rate</th>
            <th className="px-2 py-1.5 text-right font-bold">Loss Rt</th>
            <th className="px-2 py-1.5 text-center font-bold">Trend</th>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {sectors.map((s: any, i: number) => {
            const badge = trendBadge(s?.trend);
            return (
              <tr key={`${s?.name}-${i}`} className="border-b border-border/5 hover:bg-yellow-400/[0.02]">
                <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{s?.name ?? '--'}</td>
                <td className="px-2 py-1.5 text-right text-white/80">{fmtB(s?.outstanding)}</td>
                <td className="px-2 py-1.5 text-right text-white/70">{fmtB(s?.issuance)}</td>
                <td className={`px-2 py-1.5 text-right ${spreadColor(s?.avgSpread)}`}>
                  {fmtBps(s?.avgSpread)}
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${delinquencyColor(s?.delinquencyRate)}`}>
                  {fmtPct(s?.delinquencyRate)}
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${lossColor(s?.lossRate)}`}>
                  {fmtPct(s?.lossRate)}
                </td>
                <td className="px-2 py-1.5 text-center">
                  <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 uppercase border ${badge.text} ${badge.bg}`}>
                    {s?.trend ?? '--'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── DEALS TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DealsTab({ data, t }: { data: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deals: any[] = data?.deals ?? [];

  if (deals.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'absNoDeals', 'No deal data')}
      </div>
    );
  }

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'absRecentDeals', 'Recent Deals')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Issuer</th>
            <th className="px-2 py-1.5 text-left font-bold">Deal</th>
            <th className="px-2 py-1.5 text-left font-bold">Collat</th>
            <th className="px-2 py-1.5 text-right font-bold">Size</th>
            <th className="px-2 py-1.5 text-right font-bold">AAA Spd</th>
            <th className="px-2 py-1.5 text-right font-bold">Subord</th>
            <th className="px-2 py-1.5 text-right font-bold">Coupon</th>
            <th className="px-2 py-1.5 text-right font-bold">Close</th>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {deals.map((d: any, i: number) => (
            <tr key={`${d?.dealName}-${i}`} className="border-b border-border/5 hover:bg-yellow-400/[0.02]">
              <td className="px-2 py-1.5 font-bold text-white/90 truncate max-w-[80px]">{d?.issuer ?? '--'}</td>
              <td className="px-2 py-1.5 font-bold truncate max-w-[100px]" style={{ color: ACCENT }}>{d?.dealName ?? '--'}</td>
              <td className="px-2 py-1.5 text-neutral-400 truncate max-w-[70px]">{d?.collateral ?? '--'}</td>
              <td className="px-2 py-1.5 text-right text-white/80">{fmtB(d?.size)}</td>
              <td className={`px-2 py-1.5 text-right ${spreadColor(d?.aaaSpread)}`}>
                {fmtBps(d?.aaaSpread)}
              </td>
              <td className="px-2 py-1.5 text-right text-white/70">
                {fmtPct(d?.subordination)}
              </td>
              <td className="px-2 py-1.5 text-right text-white/70">
                {fmtCpn(d?.coupon)}
              </td>
              <td className="px-2 py-1.5 text-right text-neutral-400">
                {d?.closingDate ?? '--'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      {deals.length > 0 && (
        <div className="px-3 py-2 border-t border-border/10">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[7px] font-mono text-neutral-600 uppercase">Total Deals</span>
              <span className="text-[9px] font-mono font-bold text-white ml-1.5">{deals.length}</span>
            </div>
            <div>
              <span className="text-[7px] font-mono text-neutral-600 uppercase">Total Volume</span>
              <span className="text-[9px] font-mono font-bold text-white ml-1.5">
                {fmtB(
                  deals.reduce(
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

// ── PERFORMANCE TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PerformanceTab({ data, t }: { data: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const performance: any[] = data?.performance ?? [];

  if (performance.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'absNoPerformance', 'No performance data')}
      </div>
    );
  }

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'absPerformanceMetrics', 'Performance Metrics')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Sector</th>
            <th className="px-2 py-1.5 text-right font-bold">30D DQ</th>
            <th className="px-2 py-1.5 text-right font-bold">60D DQ</th>
            <th className="px-2 py-1.5 text-right font-bold">90D DQ</th>
            <th className="px-2 py-1.5 text-right font-bold">Cum Loss</th>
            <th className="px-2 py-1.5 text-right font-bold">Recovery</th>
            <th className="px-2 py-1.5 text-right font-bold">CPR</th>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {performance.map((p: any, i: number) => (
            <tr key={`${p?.sector}-${i}`} className="border-b border-border/5 hover:bg-yellow-400/[0.02]">
              <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{p?.sector ?? '--'}</td>
              <td className={`px-2 py-1.5 text-right ${delinquencyColor(p?.dq30d)}`}>
                {fmtPct(p?.dq30d)}
              </td>
              <td className={`px-2 py-1.5 text-right ${delinquencyColor(p?.dq60d)}`}>
                {fmtPct(p?.dq60d)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${delinquencyColor(p?.dq90d)}`}>
                {fmtPct(p?.dq90d)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${lossColor(p?.cumulativeLoss)}`}>
                {fmtPct(p?.cumulativeLoss)}
              </td>
              <td className={`px-2 py-1.5 text-right ${recoveryColor(p?.recoveryRate)}`}>
                {fmtPct(p?.recoveryRate)}
              </td>
              <td className="px-2 py-1.5 text-right text-white/70">
                {fmtPct(p?.prepaymentCPR)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Aggregate summary row */}
      {data?.performanceSummary && (
        <div className="border-t border-border/20" style={{ backgroundColor: DIM }}>
          <div className="grid grid-cols-7 px-2 py-1.5">
            <span className="text-[8px] font-mono font-black text-yellow-400 uppercase">Aggregate</span>
            <span className={`text-[8px] font-mono font-bold text-right ${delinquencyColor(data.performanceSummary?.avgDq30d)}`}>
              {fmtPct(data.performanceSummary?.avgDq30d)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${delinquencyColor(data.performanceSummary?.avgDq60d)}`}>
              {fmtPct(data.performanceSummary?.avgDq60d)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${delinquencyColor(data.performanceSummary?.avgDq90d)}`}>
              {fmtPct(data.performanceSummary?.avgDq90d)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${lossColor(data.performanceSummary?.avgCumulativeLoss)}`}>
              {fmtPct(data.performanceSummary?.avgCumulativeLoss)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${recoveryColor(data.performanceSummary?.avgRecoveryRate)}`}>
              {fmtPct(data.performanceSummary?.avgRecoveryRate)}
            </span>
            <span className="text-[8px] font-mono font-bold text-right text-white/70">
              {fmtPct(data.performanceSummary?.avgCPR)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Metric Card ──

function MetricCard({
  label,
  value,
  change,
  suffix,
  warning,
}: {
  label: string;
  value: string;
  change?: number;
  suffix?: string;
  warning?: boolean;
}) {
  return (
    <div className="px-2 py-1.5 bg-black hover:bg-yellow-400/[0.02]">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        {label}
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className={`text-[10px] font-mono font-bold ${warning ? 'text-red-400' : 'text-white'}`}>
          {value}
        </span>
        {change != null && (
          <span className={`text-[8px] font-mono font-bold ${change > 0 ? 'text-red-400' : change < 0 ? 'text-green-400' : 'text-neutral-500'}`}>
            {`${change >= 0 ? '+' : ''}${change.toFixed(0)}bp`}
          </span>
        )}
        {suffix && (
          <span className="text-[7px] font-mono text-neutral-600">{suffix}</span>
        )}
      </div>
    </div>
  );
}
