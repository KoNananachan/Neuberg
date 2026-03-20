import { useState, useMemo } from 'react';
import {
  usePerformanceAttribution,
  type AttributionResponse,
  type SectorAttribution,
  type FactorAttribution,
  type PeriodReturn,
} from '../../api/hooks/use-performance-attribution';
import { useT, tr, TFn } from '../../i18n';
import { PieChart, RefreshCw, ChevronDown } from 'lucide-react';

// ── Constants ──

const ACCENT = '#14b8a6'; // teal-400
const BENCHMARKS = ['SPY', 'QQQ', 'DIA', 'IWM'] as const;
type Tab = 'sectors' | 'factors' | 'returns' | 'chart';

// ── Color Helpers ──

function valColor(n: number): string {
  if (n > 0) return '#22c55e';
  if (n < 0) return '#ef4444';
  return '#71717a';
}

function fmtPct(n: number, decimals = 2): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(decimals)}%`;
}

function fmtPctRaw(n: number, decimals = 2): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtNum(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

// ── Main Panel ──

export function PerformanceAttributionPanel() {
  const t = useT();
  const [benchmark, setBenchmark] = useState<string>('SPY');
  const [tab, setTab] = useState<Tab>('sectors');
  const [bmkOpen, setBmkOpen] = useState(false);

  const { data, isLoading, refetch } = usePerformanceAttribution(benchmark);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sectors', label: tr(t, 'paSectors', 'SECTORS') },
    { key: 'factors', label: tr(t, 'paFactors', 'FACTORS') },
    { key: 'returns', label: tr(t, 'paReturns', 'RETURNS') },
    { key: 'chart', label: tr(t, 'paChart', 'CHART') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <PieChart className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'paTitle', 'Performance Attribution')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Benchmark selector */}
          <div className="relative">
            <button
              onClick={() => setBmkOpen(!bmkOpen)}
              className="flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-mono font-bold text-neutral-300 border border-border/30 hover:border-teal-400/30 transition-colors"
            >
              {benchmark}
              <ChevronDown className="w-2.5 h-2.5 text-neutral-600" />
            </button>
            {bmkOpen && (
              <div className="absolute top-full right-0 mt-0.5 z-50 bg-[#0a0a0a] border border-border/40 shadow-lg">
                {BENCHMARKS.map(b => (
                  <button
                    key={b}
                    onClick={() => { setBenchmark(b); setBmkOpen(false); }}
                    className={`block w-full text-left px-2 py-1 text-[8px] font-mono font-bold transition-colors ${
                      b === benchmark ? 'text-teal-400 bg-teal-400/[0.05]' : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.02]'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-teal-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-1 text-[7px] font-mono font-black uppercase tracking-wider transition-colors ${
              tab === key
                ? 'text-teal-400 border-b border-teal-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div
            className="text-center py-8 text-[9px] font-mono uppercase animate-pulse"
            style={{ color: ACCENT }}
          >
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'paNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <SummaryBar data={data} />
            {tab === 'sectors' && <SectorsTab sectors={data.sectors} />}
            {tab === 'factors' && <FactorsTab factors={data.factors} />}
            {tab === 'returns' && <ReturnsTab periods={data.periods} />}
            {tab === 'chart' && <ChartTab data={data} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({ data }: { data: AttributionResponse }) {
  const t = useT();
  const { summary } = data;

  const stats = [
    { label: tr(t, 'paActiveRet', 'Active Ret'), value: fmtPct(summary.totalActiveReturn), color: valColor(summary.totalActiveReturn) },
    { label: tr(t, 'paSharpe', 'Sharpe'), value: fmtNum(summary.sharpeRatio), color: valColor(summary.sharpeRatio) },
    { label: tr(t, 'paAlpha', 'Alpha'), value: fmtPct(summary.alpha), color: valColor(summary.alpha) },
    { label: tr(t, 'paBeta', 'Beta'), value: fmtNum(summary.beta), color: '#a1a1aa' },
    { label: tr(t, 'paMaxDD', 'Max DD'), value: fmtPct(summary.maxDrawdown), color: '#ef4444' },
    { label: tr(t, 'paWinRate', 'Win Rate'), value: `${(summary.winRate * 100).toFixed(1)}%`, color: summary.winRate >= 0.5 ? '#22c55e' : '#ef4444' },
  ];

  return (
    <div className="grid grid-cols-6 gap-px bg-border/10 border-b border-border/20">
      {stats.map(({ label, value, color }) => (
        <div key={label} className="bg-[#050505] px-2 py-1.5 flex flex-col items-center">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">{label}</span>
          <span className="text-[10px] font-mono font-black tabular-nums" style={{ color }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── SECTORS Tab ──

function SectorsTab({ sectors }: { sectors: SectorAttribution[] }) {
  const t = useT();
  const maxWeight = useMemo(() => Math.max(...sectors.map(s => Math.max(s.weight, s.benchmarkWeight))), [sectors]);

  return (
    <div className="px-1 py-1">
      {/* Header */}
      <div className="grid grid-cols-[1fr_52px_52px_44px_44px_44px_48px_48px_48px_80px] gap-0 px-1 py-1 border-b border-border/20">
        {[
          tr(t, 'paSector', 'Sector'),
          tr(t, 'paWeight', 'Weight'),
          tr(t, 'paBmkWt', 'Bmk Wt'),
          tr(t, 'paActWt', 'Act Wt'),
          tr(t, 'paPortRet', 'Port Ret'),
          tr(t, 'paBmkRet', 'Bmk Ret'),
          tr(t, 'paAlloc', 'Alloc'),
          tr(t, 'paSelect', 'Select'),
          tr(t, 'paTotalEff', 'Total'),
          tr(t, 'paTopBot', 'Top / Bottom'),
        ].map((h, i) => (
          <span key={i} className={`text-[6px] font-mono text-neutral-600 uppercase tracking-wider ${i > 0 ? 'text-right' : ''} ${i === 9 ? 'text-center' : ''}`}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {sectors.map(sec => (
        <div
          key={sec.sector}
          className="grid grid-cols-[1fr_52px_52px_44px_44px_44px_48px_48px_48px_80px] gap-0 px-1 py-[3px] hover:bg-teal-400/[0.02] border-b border-border/10 items-center"
        >
          {/* Sector name */}
          <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">{sec.sector}</span>

          {/* Weight with bar */}
          <div className="flex items-center justify-end gap-1">
            <div className="w-[20px] h-[4px] bg-white/[0.04] relative">
              <div
                className="absolute left-0 top-0 h-full"
                style={{ width: `${(sec.weight / maxWeight) * 100}%`, background: ACCENT, opacity: 0.6 }}
              />
            </div>
            <span className="text-[7px] font-mono tabular-nums text-neutral-300">{(sec.weight * 100).toFixed(1)}</span>
          </div>

          {/* Benchmark weight with bar */}
          <div className="flex items-center justify-end gap-1">
            <div className="w-[20px] h-[4px] bg-white/[0.04] relative">
              <div
                className="absolute left-0 top-0 h-full"
                style={{ width: `${(sec.benchmarkWeight / maxWeight) * 100}%`, background: '#71717a', opacity: 0.5 }}
              />
            </div>
            <span className="text-[7px] font-mono tabular-nums text-neutral-500">{(sec.benchmarkWeight * 100).toFixed(1)}</span>
          </div>

          {/* Active weight */}
          <span className="text-[7px] font-mono font-bold tabular-nums text-right" style={{ color: valColor(sec.activeWeight) }}>
            {fmtPct(sec.activeWeight, 1)}
          </span>

          {/* Portfolio return */}
          <span className="text-[7px] font-mono font-bold tabular-nums text-right" style={{ color: valColor(sec.portfolioReturn) }}>
            {fmtPct(sec.portfolioReturn, 1)}
          </span>

          {/* Benchmark return */}
          <span className="text-[7px] font-mono tabular-nums text-right text-neutral-500">
            {fmtPct(sec.benchmarkReturn, 1)}
          </span>

          {/* Allocation effect */}
          <span className="text-[7px] font-mono font-bold tabular-nums text-right" style={{ color: valColor(sec.allocationEffect) }}>
            {fmtPct(sec.allocationEffect, 2)}
          </span>

          {/* Selection effect */}
          <span className="text-[7px] font-mono font-bold tabular-nums text-right" style={{ color: valColor(sec.selectionEffect) }}>
            {fmtPct(sec.selectionEffect, 2)}
          </span>

          {/* Total effect */}
          <span className="text-[7px] font-mono font-black tabular-nums text-right" style={{ color: valColor(sec.totalEffect) }}>
            {fmtPct(sec.totalEffect, 2)}
          </span>

          {/* Top / Bottom */}
          <div className="flex flex-col items-center">
            <span className="text-[6px] font-mono text-green-500 truncate">{sec.topContributor}</span>
            <span className="text-[6px] font-mono text-red-500 truncate">{sec.topDetractor}</span>
          </div>
        </div>
      ))}

      {/* Totals row */}
      <SectorTotals sectors={sectors} />
    </div>
  );
}

function SectorTotals({ sectors }: { sectors: SectorAttribution[] }) {
  const t = useT();
  const totals = useMemo(() => ({
    weight: sectors.reduce((s, sec) => s + sec.weight, 0),
    bmkWeight: sectors.reduce((s, sec) => s + sec.benchmarkWeight, 0),
    allocation: sectors.reduce((s, sec) => s + sec.allocationEffect, 0),
    selection: sectors.reduce((s, sec) => s + sec.selectionEffect, 0),
    total: sectors.reduce((s, sec) => s + sec.totalEffect, 0),
  }), [sectors]);

  return (
    <div className="grid grid-cols-[1fr_52px_52px_44px_44px_44px_48px_48px_48px_80px] gap-0 px-1 py-1.5 border-t border-teal-400/20 bg-teal-400/[0.02]">
      <span className="text-[7px] font-mono font-black text-teal-400 uppercase">{tr(t, 'paTotal', 'Total')}</span>
      <span className="text-[7px] font-mono font-bold tabular-nums text-right text-neutral-300">{(totals.weight * 100).toFixed(1)}</span>
      <span className="text-[7px] font-mono tabular-nums text-right text-neutral-500">{(totals.bmkWeight * 100).toFixed(1)}</span>
      <span className="text-[7px] font-mono text-right" />
      <span className="text-[7px] font-mono text-right" />
      <span className="text-[7px] font-mono text-right" />
      <span className="text-[7px] font-mono font-black tabular-nums text-right" style={{ color: valColor(totals.allocation) }}>
        {fmtPct(totals.allocation, 2)}
      </span>
      <span className="text-[7px] font-mono font-black tabular-nums text-right" style={{ color: valColor(totals.selection) }}>
        {fmtPct(totals.selection, 2)}
      </span>
      <span className="text-[7px] font-mono font-black tabular-nums text-right" style={{ color: valColor(totals.total) }}>
        {fmtPct(totals.total, 2)}
      </span>
      <span />
    </div>
  );
}

// ── FACTORS Tab ──

function FactorsTab({ factors }: { factors: FactorAttribution[] }) {
  const t = useT();
  const maxExposure = useMemo(() => Math.max(...factors.map(f => Math.abs(f.exposure)), 0.01), [factors]);

  return (
    <div className="px-1 py-1">
      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_56px_56px_50px] gap-0 px-1 py-1 border-b border-border/20">
        {[
          tr(t, 'paFactor', 'Factor'),
          tr(t, 'paExposure', 'Exposure'),
          tr(t, 'paFactorRet', 'Factor Ret'),
          tr(t, 'paContrib', 'Contrib'),
          tr(t, 'paTStat', 't-Stat'),
        ].map((h, i) => (
          <span key={i} className={`text-[6px] font-mono text-neutral-600 uppercase tracking-wider ${i > 0 ? 'text-center' : ''}`}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {factors.map(fac => {
        const isSignificant = Math.abs(fac.tStat) >= 2;

        return (
          <div
            key={fac.factor}
            className="grid grid-cols-[1fr_80px_56px_56px_50px] gap-0 px-1 py-[4px] hover:bg-teal-400/[0.02] border-b border-border/10 items-center"
          >
            {/* Factor name */}
            <span className="text-[8px] font-mono font-bold text-neutral-200">{fac.factor}</span>

            {/* Exposure bar centered at 0 */}
            <div className="flex items-center justify-center">
              <ExposureBar value={fac.exposure} max={maxExposure} />
            </div>

            {/* Factor return */}
            <span className="text-[7px] font-mono font-bold tabular-nums text-center" style={{ color: valColor(fac.factorReturn) }}>
              {fmtPct(fac.factorReturn)}
            </span>

            {/* Contribution */}
            <span className="text-[7px] font-mono font-bold tabular-nums text-center" style={{ color: valColor(fac.contribution) }}>
              {fmtPct(fac.contribution)}
            </span>

            {/* t-Stat */}
            <span
              className={`text-[7px] font-mono font-bold tabular-nums text-center ${isSignificant ? 'text-teal-400' : 'text-neutral-500'}`}
            >
              {fmtNum(fac.tStat)}
              {isSignificant && <span className="text-[5px] ml-0.5">*</span>}
            </span>
          </div>
        );
      })}

      {/* Legend */}
      <div className="px-2 py-2 text-[6px] font-mono text-neutral-600">
        * t-Stat &ge; 2.0 indicates statistical significance at 95% confidence
      </div>
    </div>
  );
}

function ExposureBar({ value, max }: { value: number; max: number }) {
  const W = 70;
  const H = 10;
  const CENTER = W / 2;
  const barHalf = W / 2 - 2;
  const barWidth = (Math.abs(value) / max) * barHalf;
  const isPositive = value >= 0;
  const barX = isPositive ? CENTER : CENTER - barWidth;
  const color = isPositive ? '#14b8a6' : '#f97316';

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.02)" />
      <line x1={CENTER} y1={0} x2={CENTER} y2={H} stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} />
      <rect x={barX} y={2} width={Math.max(barWidth, 0.5)} height={H - 4} fill={color} opacity={0.7} />
      <text
        x={isPositive ? Math.min(barX + barWidth + 2, W - 2) : Math.max(barX - 2, 2)}
        y={H / 2 + 0.5}
        textAnchor={isPositive ? 'start' : 'end'}
        dominantBaseline="middle"
        fill={color}
        fontSize={5.5}
        fontFamily="monospace"
        fontWeight="bold"
      >
        {value > 0 ? '+' : ''}{value.toFixed(2)}
      </text>
    </svg>
  );
}

// ── RETURNS Tab ──

function ReturnsTab({ periods }: { periods: PeriodReturn[] }) {
  const t = useT();

  const rows = [
    { label: tr(t, 'paPortfolio', 'Portfolio'), key: 'portfolioReturn' as const },
    { label: tr(t, 'paBenchmark', 'Benchmark'), key: 'benchmarkReturn' as const },
    { label: tr(t, 'paActive', 'Active'), key: 'activeReturn' as const },
    { label: tr(t, 'paTE', 'Tracking Err'), key: 'trackingError' as const },
    { label: tr(t, 'paIR', 'Info Ratio'), key: 'informationRatio' as const },
  ];

  return (
    <div className="px-2 py-2">
      {/* Header row */}
      <div className="grid gap-0" style={{ gridTemplateColumns: `80px repeat(${periods.length}, 1fr)` }}>
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider" />
        {periods.map(p => (
          <span key={p.period} className="text-[7px] font-mono font-black text-center text-neutral-400 uppercase py-1">
            {p.period}
          </span>
        ))}
      </div>

      {/* Data rows */}
      {rows.map(({ label, key }) => (
        <div
          key={key}
          className="grid gap-0 border-b border-border/10 hover:bg-teal-400/[0.02]"
          style={{ gridTemplateColumns: `80px repeat(${periods.length}, 1fr)` }}
        >
          <span className="text-[7px] font-mono font-bold text-neutral-400 uppercase py-1.5 pr-2">{label}</span>
          {periods.map(p => {
            const val = p[key];
            const isActiveRow = key === 'activeReturn';
            const isRatio = key === 'informationRatio';
            const isTE = key === 'trackingError';

            let displayVal: string;
            let color: string;

            if (isRatio) {
              displayVal = fmtNum(val, 2);
              color = valColor(val);
            } else if (isTE) {
              displayVal = fmtPct(val, 1);
              color = '#a1a1aa';
            } else {
              displayVal = fmtPct(val);
              color = valColor(val);
            }

            return (
              <span
                key={p.period}
                className={`text-[7px] font-mono font-bold tabular-nums text-center py-1.5 ${
                  isActiveRow ? 'bg-teal-400/[0.03]' : ''
                }`}
                style={{ color }}
              >
                {displayVal}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── CHART Tab ──

function ChartTab({ data }: { data: AttributionResponse }) {
  const t = useT();
  const { cumulativeReturns } = data;

  const chart = useMemo(() => {
    if (!cumulativeReturns || cumulativeReturns.length < 2) return null;

    const W = 440;
    const H = 220;
    const PAD = { top: 20, right: 50, bottom: 30, left: 45 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    const allVals = cumulativeReturns.flatMap(d => [d.portfolio, d.benchmark]);
    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);
    const valRange = maxVal - minVal || 1;

    const xScale = (i: number) => PAD.left + (i / (cumulativeReturns.length - 1)) * plotW;
    const yScale = (v: number) => PAD.top + plotH - ((v - minVal) / valRange) * plotH;

    // Portfolio line
    const portPoints = cumulativeReturns.map((d, i) => `${xScale(i)},${yScale(d.portfolio)}`).join(' ');
    // Benchmark line
    const bmkPoints = cumulativeReturns.map((d, i) => `${xScale(i)},${yScale(d.benchmark)}`).join(' ');

    // Spread area (fill between portfolio and benchmark)
    const spreadPath = cumulativeReturns.map((d, i) => `${xScale(i)},${yScale(d.portfolio)}`).join(' ')
      + ' ' + [...cumulativeReturns].reverse().map((d, i) => `${xScale(cumulativeReturns.length - 1 - i)},${yScale(d.benchmark)}`).join(' ');

    // Grid lines
    const yTicks = 5;
    const gridLines: { y: number; label: string }[] = [];
    for (let i = 0; i <= yTicks; i++) {
      const val = minVal + (valRange * i) / yTicks;
      gridLines.push({ y: yScale(val), label: `${val >= 0 ? '+' : ''}${val.toFixed(1)}%` });
    }

    // X-axis labels (every ~10 points)
    const xLabels: { x: number; label: string }[] = [];
    const step = Math.max(1, Math.floor(cumulativeReturns.length / 6));
    for (let i = 0; i < cumulativeReturns.length; i += step) {
      const d = cumulativeReturns[i];
      const parts = d.date.split('-');
      xLabels.push({ x: xScale(i), label: `${parts[1]}/${parts[2]}` });
    }

    return { W, H, PAD, portPoints, bmkPoints, spreadPath, gridLines, xLabels };
  }, [cumulativeReturns]);

  if (!chart) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'paNoChart', 'No chart data')}
      </div>
    );
  }

  return (
    <div className="px-2 py-2">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-2 px-1">
        <div className="flex items-center gap-1">
          <div className="w-3 h-[2px]" style={{ background: ACCENT }} />
          <span className="text-[7px] font-mono font-bold text-teal-400">{tr(t, 'paPortfolio', 'Portfolio')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-[2px]" style={{ background: '#71717a' }} />
          <span className="text-[7px] font-mono font-bold text-neutral-500">{tr(t, 'paBenchmark', 'Benchmark')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-[4px]" style={{ background: 'rgba(20,184,166,0.1)' }} />
          <span className="text-[7px] font-mono text-neutral-600">{tr(t, 'paSpread', 'Spread')}</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full" style={{ maxHeight: 260 }}>
        {/* Grid lines */}
        {chart.gridLines.map((gl, i) => (
          <g key={i}>
            <line
              x1={chart.PAD.left}
              y1={gl.y}
              x2={chart.W - chart.PAD.right}
              y2={gl.y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={0.5}
            />
            <text
              x={chart.PAD.left - 4}
              y={gl.y + 1}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#52525b"
              fontSize={6}
              fontFamily="monospace"
            >
              {gl.label}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {chart.xLabels.map((xl, i) => (
          <text
            key={i}
            x={xl.x}
            y={chart.H - chart.PAD.bottom + 14}
            textAnchor="middle"
            fill="#52525b"
            fontSize={6}
            fontFamily="monospace"
          >
            {xl.label}
          </text>
        ))}

        {/* Spread area */}
        <polygon
          points={chart.spreadPath}
          fill="rgba(20,184,166,0.08)"
        />

        {/* Benchmark line */}
        <polyline
          points={chart.bmkPoints}
          fill="none"
          stroke="#71717a"
          strokeWidth={1}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="3,2"
        />

        {/* Portfolio line */}
        <polyline
          points={chart.portPoints}
          fill="none"
          stroke={ACCENT}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Axes */}
        <line
          x1={chart.PAD.left}
          y1={chart.PAD.top}
          x2={chart.PAD.left}
          y2={chart.H - chart.PAD.bottom}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={0.5}
        />
        <line
          x1={chart.PAD.left}
          y1={chart.H - chart.PAD.bottom}
          x2={chart.W - chart.PAD.right}
          y2={chart.H - chart.PAD.bottom}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={0.5}
        />
      </svg>

      {/* Attribution breakdown mini-bar */}
      <div className="mt-3 px-1">
        <div className="text-[6px] font-mono font-black uppercase tracking-widest text-neutral-600 mb-1">
          {tr(t, 'paAttrBreakdown', 'Attribution Breakdown')}
        </div>
        <div className="flex gap-2">
          <AttrBox label={tr(t, 'paAllocation', 'Allocation')} value={data.summary.allocationTotal} />
          <AttrBox label={tr(t, 'paSelection', 'Selection')} value={data.summary.selectionTotal} />
          <AttrBox label={tr(t, 'paInteraction', 'Interaction')} value={data.summary.interactionTotal} />
          <AttrBox label={tr(t, 'paTotalActive', 'Total Active')} value={data.summary.totalActiveReturn} accent />
        </div>
      </div>

      {/* Timestamp */}
      <div className="mt-2 text-[6px] font-mono text-neutral-700 uppercase px-1">
        {tr(t, 'paUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

function AttrBox({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className="flex-1 flex flex-col items-center px-1.5 py-1 border border-border/20"
      style={accent ? { borderTopColor: ACCENT, borderTopWidth: 2 } : undefined}
    >
      <span className="text-[6px] font-mono text-neutral-600 uppercase">{label}</span>
      <span
        className="text-[9px] font-mono font-black tabular-nums"
        style={{ color: accent ? ACCENT : valColor(value) }}
      >
        {fmtPct(value)}
      </span>
    </div>
  );
}
