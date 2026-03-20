import { useState } from 'react';
import { useTreasuryStrips } from '../../api/hooks/use-treasury-strips';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Tab definitions ──

type Tab = 'STRIPS' | 'CURVE' | 'RICH/CHEAP' | 'VOLUME';
const TABS: Tab[] = ['STRIPS', 'CURVE', 'RICH/CHEAP', 'VOLUME'];

// ── Formatting helpers ──

function fmtYield(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(3);
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(4);
}

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return `${n.toFixed(2)}%`;
}

function fmtVolume(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  return `$${n.toFixed(0)}M`;
}

function fmtDuration(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2);
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function richCheapColor(status: string | null | undefined): string {
  if (!status) return 'text-neutral-500';
  const s = status.toUpperCase();
  if (s === 'RICH') return 'text-red-400';
  if (s === 'CHEAP') return 'text-green-400';
  return 'text-neutral-400'; // FAIR
}

function richCheapBadge(status: string | null | undefined): string {
  if (!status) return 'bg-neutral-800 text-neutral-500 border-neutral-700';
  const s = status.toUpperCase();
  if (s === 'RICH') return 'bg-red-400/10 text-red-400 border-red-400/30';
  if (s === 'CHEAP') return 'bg-green-400/10 text-green-400 border-green-400/30';
  return 'bg-neutral-800/50 text-neutral-400 border-neutral-600/30'; // FAIR
}

function deviationColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 2) return 'text-red-400';
  if (n > 1) return 'text-orange-400';
  if (n < -2) return 'text-green-400';
  if (n < -1) return 'text-emerald-400';
  return 'text-neutral-400';
}

function volumeBarWidth(vol: number | null | undefined, max: number): number {
  if (vol == null || max <= 0) return 0;
  return Math.max(2, Math.round((vol / max) * 100));
}

// ── Skeleton shimmer ──

function Shimmer({ rows = 8 }: { rows?: number }) {
  return (
    <div className="px-3 py-2 space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2 animate-pulse">
          <div className="h-2 bg-neutral-800 flex-1" />
          <div className="h-2 bg-neutral-800 w-14" />
          <div className="h-2 bg-neutral-800 w-12" />
          <div className="h-2 bg-neutral-800 w-10" />
          <div className="h-2 bg-neutral-800 w-14" />
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ──

export function TreasuryStripsPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useTreasuryStrips();
  const [activeTab, setActiveTab] = useState<Tab>('STRIPS');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-amber-400">
            {tr(t, 'panelTreasuryStrips', 'Treasury STRIPS Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {d?.summary?.asOfDate ? (
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {String(d.summary.asOfDate)}
            </span>
          ) : null}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-border/20 shrink-0 bg-[#030303]">
        <div className="flex gap-px px-2 py-1 flex-1 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'text-amber-400 bg-amber-500/10'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Loading state */}
        {isLoading && !d && <Shimmer rows={10} />}

        {/* Error state */}
        {error && !d && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <span className="text-[9px] font-mono text-red-400 uppercase tracking-wider">
              FAILED TO LOAD STRIPS DATA
            </span>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-wider text-amber-400 border border-amber-400/30 hover:bg-amber-400/10 transition-colors"
            >
              RETRY
            </button>
          </div>
        )}

        {/* Data views */}
        {d && (
          <>
            {/* Summary bar always visible */}
            {d.summary && <SummaryBar summary={d.summary} t={t} />}

            {activeTab === 'STRIPS' && <StripsView d={d} t={t} />}
            {activeTab === 'CURVE' && <CurveView d={d} t={t} />}
            {activeTab === 'RICH/CHEAP' && <RichCheapView d={d} t={t} />}
            {activeTab === 'VOLUME' && <VolumeView d={d} t={t} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SummaryBar({ summary, t }: { summary: any; t: TFn }) {
  return (
    <div className="border-b border-border/20 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-border/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'stripsCount', 'Issues')}
          </div>
          <div className="text-[11px] font-mono font-bold text-white mt-0.5">
            {summary?.totalIssues != null ? String(summary.totalIssues) : '--'}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'stripsAvgYield', 'Avg Yield')}
          </div>
          <div className="text-[11px] font-mono font-bold text-amber-400 mt-0.5">
            {summary?.avgYield != null ? `${fmtYield(summary.avgYield)}%` : '--'}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'stripsAvgDuration', 'Avg Duration')}
          </div>
          <div className="text-[11px] font-mono font-bold text-white mt-0.5">
            {summary?.avgDuration != null ? fmtDuration(summary.avgDuration) : '--'}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'stripsTotalVolume', 'Total Volume')}
          </div>
          <div className="text-[11px] font-mono font-bold text-white mt-0.5">
            {summary?.totalVolume != null ? fmtVolume(summary.totalVolume) : '--'}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'stripsYieldChg', '1D Chg')}
          </div>
          <div className={`text-[11px] font-mono font-bold mt-0.5 ${changeColor(summary?.yieldChange1d)}`}>
            {summary?.yieldChange1d != null ? `${fmtBps(summary.yieldChange1d)}bp` : '--'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── STRIPS View ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StripsView({ d, t }: { d: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const strips: any[] = d?.strips ?? [];
  if (strips.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'stripsNoData', 'No STRIPS data available')}
      </div>
    );
  }

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-amber-400/60">
          {tr(t, 'stripsPrincipalCoupon', 'Principal & Coupon STRIPS')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[0.7fr_0.5fr_0.7fr_0.7fr_0.6fr_0.5fr_0.6fr_0.5fr] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'stripsCusip', 'CUSIP')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'stripsType', 'Type')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'stripsMaturity', 'Maturity')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'stripsYield', 'Yield %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'stripsPrice', 'Price')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'stripsChg', 'Chg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'stripsDuration', 'Dur')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'stripsRichCheap', 'R/C')}
        </span>
      </div>

      {/* Table rows */}
      {strips.map((s: any, i: number) => (
        <div
          key={s?.cusip ? String(s.cusip) : `strip-${i}`}
          className={`grid grid-cols-[0.7fr_0.5fr_0.7fr_0.7fr_0.6fr_0.5fr_0.6fr_0.5fr] gap-0 px-3 py-0.5 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono text-neutral-400 truncate">
            {s?.cusip ? String(s.cusip) : '--'}
          </span>
          <span className={`text-[9px] font-mono font-bold ${
            String(s?.type ?? '').toUpperCase() === 'P' ? 'text-amber-400' : 'text-amber-400/60'
          }`}>
            {s?.type ? String(s.type) : '--'}
          </span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">
            {s?.maturity ? String(s.maturity) : '--'}
          </span>
          <span className="text-[9px] font-mono font-bold text-white text-right">
            {fmtYield(s?.yield)}%
          </span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">
            {fmtPrice(s?.price)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s?.change)}`}>
            {fmtBps(s?.change)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {fmtDuration(s?.duration)}
          </span>
          <span className="text-center">
            {s?.richCheap ? (
              <span className={`inline-block px-1 py-px text-[7px] font-mono font-bold uppercase border ${richCheapBadge(s.richCheap)}`}>
                {String(s.richCheap)}
              </span>
            ) : (
              <span className="text-[7px] font-mono text-neutral-600">--</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── CURVE View ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CurveView({ d, t }: { d: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const curve: any[] = d?.curve ?? [];
  if (curve.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'stripsNoCurve', 'No curve data available')}
      </div>
    );
  }

  // Find min/max for bar chart
  const yields = curve
    .map((p: any) => p?.yield as number | undefined)
    .filter((v): v is number => v != null);
  const minYld = yields.length > 0 ? Math.min(...yields) : 0;
  const maxYld = yields.length > 0 ? Math.max(...yields) : 1;
  const range = maxYld - minYld || 0.01;

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-amber-400/60">
          {tr(t, 'stripsCurve', 'STRIPS Yield Curve')}
        </span>
      </div>

      {/* Text-based curve chart */}
      <div className="px-3 py-2">
        {curve.map((pt: any, i: number) => {
          const yld = pt?.yield ?? 0;
          const barPct = ((yld - minYld) / range) * 100;
          return (
            <div
              key={pt?.tenor ? String(pt.tenor) : `curve-${i}`}
              className="flex items-center gap-2 py-px hover:bg-amber-400/[0.02]"
            >
              <span className="text-[8px] font-mono text-neutral-500 w-8 text-right shrink-0">
                {pt?.tenor ? String(pt.tenor) : '--'}
              </span>
              <div className="flex-1 flex items-center gap-1">
                <div className="flex-1 h-[6px] bg-neutral-900 relative">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
                    style={{ width: `${Math.max(2, barPct)}%` }}
                  />
                </div>
                <span className="text-[8px] font-mono font-bold text-amber-300 w-14 text-right shrink-0">
                  {fmtYield(yld)}%
                </span>
              </div>
              <span className={`text-[7px] font-mono font-bold w-12 text-right shrink-0 ${changeColor(pt?.change)}`}>
                {fmtBps(pt?.change)}bp
              </span>
            </div>
          );
        })}
      </div>

      {/* Curve metrics table */}
      {curve.length > 0 && (
        <div className="border-t border-border/10">
          <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-amber-400/60">
              {tr(t, 'stripsCurveMetrics', 'Curve Metrics')}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_0.6fr_0.6fr_0.6fr_0.6fr] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'stripsTenor', 'Tenor')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'stripsYield', 'Yield %')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'strips1dChg', '1D Chg')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'strips1wChg', '1W Chg')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'strips1mChg', '1M Chg')}
            </span>
          </div>
          {curve.map((pt: any, i: number) => (
            <div
              key={pt?.tenor ? `metric-${String(pt.tenor)}` : `metric-${i}`}
              className={`grid grid-cols-[1fr_0.6fr_0.6fr_0.6fr_0.6fr] gap-0 px-3 py-0.5 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors ${
                i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
              }`}
            >
              <span className="text-[9px] font-mono font-bold text-amber-400">
                {pt?.tenor ? String(pt.tenor) : '--'}
              </span>
              <span className="text-[9px] font-mono font-bold text-white text-right">
                {fmtYield(pt?.yield)}%
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${changeColor(pt?.change)}`}>
                {fmtBps(pt?.change)}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${changeColor(pt?.change1w)}`}>
                {fmtBps(pt?.change1w)}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${changeColor(pt?.change1m)}`}>
                {fmtBps(pt?.change1m)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RICH/CHEAP View ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RichCheapView({ d, t }: { d: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = d?.richCheap ?? [];
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'stripsNoRichCheap', 'No rich/cheap analysis available')}
      </div>
    );
  }

  // Separate by status for summary
  const rich = items.filter((it: any) => String(it?.status ?? '').toUpperCase() === 'RICH');
  const cheap = items.filter((it: any) => String(it?.status ?? '').toUpperCase() === 'CHEAP');
  const fair = items.filter((it: any) => String(it?.status ?? '').toUpperCase() === 'FAIR');

  return (
    <div>
      {/* Rich/Cheap summary */}
      <div className="border-b border-border/20 bg-[#030303]">
        <div className="flex items-center gap-0 divide-x divide-border/10">
          <div className="flex-1 px-3 py-1.5 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Rich</div>
            <div className="text-[13px] font-mono font-bold text-red-400 mt-0.5">
              {String(rich.length)}
            </div>
          </div>
          <div className="flex-1 px-3 py-1.5 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Fair</div>
            <div className="text-[13px] font-mono font-bold text-neutral-400 mt-0.5">
              {String(fair.length)}
            </div>
          </div>
          <div className="flex-1 px-3 py-1.5 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Cheap</div>
            <div className="text-[13px] font-mono font-bold text-green-400 mt-0.5">
              {String(cheap.length)}
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-amber-400/60">
          {tr(t, 'stripsRichCheapAnalysis', 'Rich/Cheap Analysis')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[0.6fr_0.6fr_0.7fr_0.6fr_0.6fr_0.5fr_0.5fr] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'stripsCusip', 'CUSIP')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'stripsMaturity', 'Maturity')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'stripsActYield', 'Act Yld')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'stripsFitYield', 'Fit Yld')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'stripsDevBps', 'Dev (bp)')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'stripsZScore', 'Z-Score')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'stripsStatus', 'Status')}
        </span>
      </div>

      {/* Table rows */}
      {items.map((it: any, i: number) => (
        <div
          key={it?.cusip ? String(it.cusip) : `rc-${i}`}
          className={`grid grid-cols-[0.6fr_0.6fr_0.7fr_0.6fr_0.6fr_0.5fr_0.5fr] gap-0 px-3 py-0.5 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono text-neutral-400 truncate">
            {it?.cusip ? String(it.cusip) : '--'}
          </span>
          <span className="text-[9px] font-mono text-neutral-300">
            {it?.maturity ? String(it.maturity) : '--'}
          </span>
          <span className="text-[9px] font-mono font-bold text-white text-right">
            {fmtYield(it?.actualYield)}%
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {fmtYield(it?.fittedYield)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${deviationColor(it?.deviationBps)}`}>
            {fmtBps(it?.deviationBps)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${deviationColor(it?.zScore)}`}>
            {it?.zScore != null ? (it.zScore as number).toFixed(2) : '--'}
          </span>
          <span className="text-center">
            {it?.status ? (
              <span className={`inline-block px-1 py-px text-[7px] font-mono font-bold uppercase border ${richCheapBadge(it.status)}`}>
                {String(it.status)}
              </span>
            ) : (
              <span className="text-[7px] font-mono text-neutral-600">--</span>
            )}
          </span>
        </div>
      ))}

      {/* Deviation distribution bar */}
      {items.length > 0 && (
        <div className="px-3 py-2 border-t border-border/10">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
            {tr(t, 'stripsDistribution', 'Distribution')}
          </div>
          <div className="flex h-2 overflow-hidden">
            {rich.length > 0 && (
              <div
                className="bg-red-400/60 h-full"
                style={{ width: `${(rich.length / items.length) * 100}%` }}
              />
            )}
            {fair.length > 0 && (
              <div
                className="bg-neutral-600/40 h-full"
                style={{ width: `${(fair.length / items.length) * 100}%` }}
              />
            )}
            {cheap.length > 0 && (
              <div
                className="bg-green-400/60 h-full"
                style={{ width: `${(cheap.length / items.length) * 100}%` }}
              />
            )}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[7px] font-mono text-red-400">
              RICH {fmtPct(items.length > 0 ? (rich.length / items.length) * 100 : 0)}
            </span>
            <span className="text-[7px] font-mono text-green-400">
              CHEAP {fmtPct(items.length > 0 ? (cheap.length / items.length) * 100 : 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── VOLUME View ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VolumeView({ d, t }: { d: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leaders: any[] = d?.volumeLeaders ?? [];
  if (leaders.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'stripsNoVolume', 'No volume data available')}
      </div>
    );
  }

  // Find max volume for bar scaling
  const maxVol = Math.max(
    ...leaders.map((l: any) => (l?.volume as number) ?? 0),
    1
  );

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-amber-400/60">
          {tr(t, 'stripsVolumeLeaders', 'Volume Leaders')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[0.6fr_0.5fr_0.6fr_0.6fr_0.5fr_1fr] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'stripsCusip', 'CUSIP')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'stripsType', 'Type')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'stripsMaturity', 'Maturity')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'stripsYield', 'Yield %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'stripsVolume', 'Volume')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider pl-2">
          {tr(t, 'stripsBar', '')}
        </span>
      </div>

      {/* Table rows with volume bars */}
      {leaders.map((l: any, i: number) => {
        const barW = volumeBarWidth(l?.volume, maxVol);
        return (
          <div
            key={l?.cusip ? String(l.cusip) : `vol-${i}`}
            className={`grid grid-cols-[0.6fr_0.5fr_0.6fr_0.6fr_0.5fr_1fr] gap-0 px-3 py-0.5 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <span className="text-[9px] font-mono text-neutral-400 truncate">
              {l?.cusip ? String(l.cusip) : '--'}
            </span>
            <span className={`text-[9px] font-mono font-bold ${
              String(l?.type ?? '').toUpperCase() === 'P' ? 'text-amber-400' : 'text-amber-400/60'
            }`}>
              {l?.type ? String(l.type) : '--'}
            </span>
            <span className="text-[9px] font-mono text-neutral-300 text-right">
              {l?.maturity ? String(l.maturity) : '--'}
            </span>
            <span className="text-[9px] font-mono font-bold text-white text-right">
              {fmtYield(l?.yield)}%
            </span>
            <span className="text-[8px] font-mono text-neutral-300 text-right">
              {fmtVolume(l?.volume)}
            </span>
            <div className="flex items-center pl-2">
              <div
                className="h-[5px] bg-gradient-to-r from-amber-600/80 to-amber-400"
                style={{ width: `${barW}%` }}
              />
            </div>
          </div>
        );
      })}

      {/* Volume by maturity bucket */}
      {d?.volumeByMaturity && (
        <div className="border-t border-border/10">
          <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-amber-400/60">
              {tr(t, 'stripsVolByMaturity', 'Volume by Maturity')}
            </span>
          </div>
          {(d.volumeByMaturity as any[]).map((bucket: any, i: number) => {
            const bucketMax = Math.max(
              ...(d.volumeByMaturity as any[]).map((b: any) => (b?.volume as number) ?? 0),
              1
            );
            const bW = volumeBarWidth(bucket?.volume, bucketMax);
            return (
              <div
                key={bucket?.bucket ? String(bucket.bucket) : `bucket-${i}`}
                className={`flex items-center gap-2 px-3 py-0.5 border-b border-border/10 hover:bg-amber-400/[0.02] ${
                  i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
                }`}
              >
                <span className="text-[8px] font-mono text-neutral-500 w-12 shrink-0">
                  {bucket?.bucket ? String(bucket.bucket) : '--'}
                </span>
                <div className="flex-1 flex items-center gap-1">
                  <div className="flex-1 h-[5px] bg-neutral-900 relative">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600/60 to-amber-400/80"
                      style={{ width: `${bW}%` }}
                    />
                  </div>
                </div>
                <span className="text-[8px] font-mono text-neutral-300 w-14 text-right shrink-0">
                  {fmtVolume(bucket?.volume)}
                </span>
                <span className="text-[7px] font-mono text-neutral-600 w-10 text-right shrink-0">
                  {fmtPct(bucket?.pctOfTotal)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-1 border-t border-border/10">
        <span className="text-[6px] font-mono text-neutral-700 uppercase tracking-wider">
          STRP &lt;GO&gt; U.S. Treasury STRIPS Monitor
        </span>
      </div>
    </div>
  );
}
