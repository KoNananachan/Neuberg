import { useState, useMemo } from 'react';
import { useVarianceSwapMonitor } from '../../api/hooks/use-variance-swap-monitor';
import { useT } from '../../i18n';
import { RefreshCw, Activity, TrendingUp, BarChart3 } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const PURPLE = '#c084fc';       // purple-400
const PURPLE_DIM = 'rgba(192,132,252,0.10)';
const PURPLE_GLOW = 'rgba(192,132,252,0.25)';
const GREEN = '#34d399';
const RED = '#f87171';
const AMBER = '#fbbf24';
const CYAN = '#22d3ee';
const NEUTRAL = '#a3a3a3';

type Tab = 'OVERVIEW' | 'TERM' | 'STOCKS' | 'VOL' | 'DISPERSION' | 'GEX';

// ── Color helpers ──

function changeColor(val: number): string {
  if (val > 0) return GREEN;
  if (val < 0) return RED;
  return NEUTRAL;
}

function changeCls(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function premiumColor(val: number): string {
  if (val > 3) return RED;
  if (val > 0) return GREEN;
  if (val < -3) return '#60a5fa';
  return NEUTRAL;
}

function signalBadge(signal: string): { bg: string; color: string } {
  switch (signal) {
    case 'BUY': case 'LONG': return { bg: 'rgba(52,211,153,0.15)', color: GREEN };
    case 'SELL': case 'SHORT': return { bg: 'rgba(248,113,113,0.15)', color: RED };
    case 'NEUTRAL': return { bg: 'rgba(163,163,163,0.12)', color: NEUTRAL };
    default: return { bg: PURPLE_DIM, color: PURPLE };
  }
}

function fmtNum(n: number | null | undefined, dec = 2): string {
  if (n == null) return '--';
  return n.toFixed(dec);
}

function fmtPct(n: number | null | undefined, dec = 1): string {
  if (n == null) return '--';
  return (n > 0 ? '+' : '') + n.toFixed(dec) + '%';
}

// ── Main Panel ──

export function VarianceSwapMonitorPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useVarianceSwapMonitor();
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');

  const tabs: Tab[] = ['OVERVIEW', 'TERM', 'STOCKS', 'VOL', 'DISPERSION', 'GEX'];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-purple-400">
            {tr(t, 'vsmTitle', 'Variance Swap Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-purple-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border/20 bg-[#050505] shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-1 py-1.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'text-purple-400 border-b border-purple-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-12 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'vsmNoData', 'No data available')}
          </div>
        )}

        {data && activeTab === 'OVERVIEW' && <OverviewTab data={data} t={t} />}
        {data && activeTab === 'TERM' && <TermStructureTab data={data} t={t} />}
        {data && activeTab === 'STOCKS' && <SingleStockTab data={data} t={t} />}
        {data && activeTab === 'VOL' && <VolOfVolTab data={data} t={t} />}
        {data && activeTab === 'DISPERSION' && <DispersionTab data={data} t={t} />}
        {data && activeTab === 'GEX' && <GammaExposureTab data={data} t={t} />}
      </div>
    </div>
  );
}

// ── OVERVIEW Tab: Index Variance Swap Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OverviewTab({ data, t }: { data: any; t: TFn }) {
  const indices = data?.indices ?? [];

  return (
    <div>
      {/* Index Variance Swap Table */}
      <div className="px-1 py-2">
        <div className="flex items-center gap-1.5 mb-1.5 px-1">
          <BarChart3 className="w-3 h-3 text-purple-400" />
          <span className="text-[7px] font-black uppercase tracking-widest text-neutral-500">
            {tr(t, 'vsmIndexVariance', 'Index Variance Swaps')}
          </span>
        </div>

        {/* Header */}
        <div className="grid grid-cols-[56px_48px_48px_48px_36px_36px_44px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase">Index</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Strike</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Realized</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">VRP</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">1D</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">1W</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase text-right pr-1">P&L</span>
        </div>

        {indices.length === 0 && (
          <div className="text-center py-4 text-neutral-600 text-[8px] font-mono">
            {tr(t, 'vsmNoIndices', 'No index data')}
          </div>
        )}

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {indices.map((idx: any) => (
          <div
            key={idx?.underlying ?? idx?.symbol}
            className="grid grid-cols-[56px_48px_48px_48px_36px_36px_44px] gap-0 px-1 py-[3px] hover:bg-purple-400/[0.02] border-b border-border/20 items-center"
          >
            <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
              {idx?.underlying ?? idx?.symbol ?? '--'}
            </span>
            <span className="text-[8px] font-mono font-bold text-right tabular-nums" style={{ color: PURPLE }}>
              {fmtNum(idx?.strikeVol)}
            </span>
            <span className="text-[8px] font-mono text-right tabular-nums text-neutral-400">
              {fmtNum(idx?.realizedVol)}
            </span>
            <span
              className="text-[8px] font-mono font-bold text-right tabular-nums"
              style={{ color: premiumColor(idx?.vrp ?? 0) }}
            >
              {idx?.vrp != null ? (idx.vrp > 0 ? '+' : '') + idx.vrp.toFixed(2) : '--'}
            </span>
            <span className={`text-[7px] font-mono text-right tabular-nums ${changeCls(idx?.change1d ?? 0)}`}>
              {fmtPct(idx?.change1d)}
            </span>
            <span className={`text-[7px] font-mono text-right tabular-nums ${changeCls(idx?.change1w ?? 0)}`}>
              {fmtPct(idx?.change1w)}
            </span>
            <span
              className={`text-[7.5px] font-mono font-bold text-right tabular-nums pr-1 ${changeCls(idx?.pnl ?? 0)}`}
            >
              {idx?.pnl != null ? (idx.pnl > 0 ? '+' : '') + idx.pnl.toFixed(1) + 'k' : '--'}
            </span>
          </div>
        ))}
      </div>

      {/* Quick metrics summary */}
      <QuickMetrics data={data} t={t} />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function QuickMetrics({ data, t }: { data: any; t: TFn }) {
  const summary = data?.summary;
  if (!summary) return null;

  const metrics = [
    { label: tr(t, 'vsmAvgVrp', 'Avg VRP'), value: fmtNum(summary?.avgVrp), color: premiumColor(summary?.avgVrp ?? 0) },
    { label: tr(t, 'vsmImplCorr', 'Impl Corr'), value: fmtNum(summary?.impliedCorrelation, 3), color: PURPLE },
    { label: tr(t, 'vsmVvix', 'VVIX'), value: fmtNum(summary?.vvix, 1), color: (summary?.vvix ?? 0) > 100 ? RED : PURPLE },
    { label: tr(t, 'vsmSkewIdx', 'Skew Index'), value: fmtNum(summary?.skewIndex, 1), color: CYAN },
  ];

  return (
    <div className="grid grid-cols-4 gap-0 border-t border-border/20">
      {metrics.map((m) => (
        <div key={m.label} className="px-2 py-2 border-r border-border/10 last:border-r-0">
          <div className="text-[6px] font-mono font-bold uppercase tracking-wider text-neutral-600 mb-0.5">
            {m.label}
          </div>
          <div className="text-[13px] font-black font-mono tabular-nums" style={{ color: m.color }}>
            {m.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── TERM STRUCTURE Tab: SVG Term Structure Chart ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TermStructureTab({ data, t }: { data: any; t: TFn }) {
  const termStructure = data?.termStructure ?? [];

  return (
    <div className="px-1 py-2">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <TrendingUp className="w-3 h-3 text-purple-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-500">
          {tr(t, 'vsmTermStructure', 'Variance Term Structure')}
        </span>
      </div>

      {/* SVG Term Structure Chart */}
      {termStructure.length >= 2 && <TermStructureChart termStructure={termStructure} />}

      {/* Term table */}
      <div className="mt-2">
        <div className="grid grid-cols-[52px_48px_48px_48px_44px_44px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase">Tenor</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Strike</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Realized</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Premium</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Skew</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase text-right pr-1">Carry</span>
        </div>

        {termStructure.length === 0 && (
          <div className="text-center py-4 text-neutral-600 text-[8px] font-mono">
            {tr(t, 'vsmNoTermData', 'No term structure data')}
          </div>
        )}

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {termStructure.map((tenor: any) => (
          <div
            key={tenor?.tenor ?? tenor?.label}
            className="grid grid-cols-[52px_48px_48px_48px_44px_44px] gap-0 px-1 py-[3px] hover:bg-purple-400/[0.02] border-b border-border/20 items-center"
          >
            <span className="text-[8px] font-mono font-bold text-neutral-200">
              {tenor?.tenor ?? tenor?.label ?? '--'}
            </span>
            <span className="text-[8px] font-mono font-bold text-right tabular-nums" style={{ color: PURPLE }}>
              {fmtNum(tenor?.strikeVol)}
            </span>
            <span className="text-[8px] font-mono text-right tabular-nums text-neutral-400">
              {fmtNum(tenor?.realizedVol)}
            </span>
            <span
              className="text-[8px] font-mono font-bold text-right tabular-nums"
              style={{ color: premiumColor(tenor?.premium ?? 0) }}
            >
              {tenor?.premium != null ? (tenor.premium > 0 ? '+' : '') + tenor.premium.toFixed(2) : '--'}
            </span>
            <span className="text-[8px] font-mono text-right tabular-nums text-neutral-400">
              {fmtNum(tenor?.skew)}
            </span>
            <span
              className={`text-[7.5px] font-mono font-bold text-right tabular-nums pr-1 ${changeCls(tenor?.carry ?? 0)}`}
            >
              {tenor?.carry != null ? (tenor.carry > 0 ? '+' : '') + tenor.carry.toFixed(2) : '--'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TermStructureChart({ termStructure }: { termStructure: any[] }) {
  const chart = useMemo(() => {
    const W = 360;
    const H = 130;
    const PAD_L = 32;
    const PAD_R = 14;
    const PAD_T = 14;
    const PAD_B = 22;
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;

    const strikeValues = termStructure.map((t) => t?.strikeVol ?? 0);
    const realizedValues = termStructure.map((t) => t?.realizedVol ?? 0);
    const allValues = [...strikeValues, ...realizedValues].filter((v) => v > 0);
    if (allValues.length === 0) return null;

    const minY = Math.min(...allValues) - 1;
    const maxY = Math.max(...allValues) + 1;

    const scaleX = (i: number) => PAD_L + (i / Math.max(termStructure.length - 1, 1)) * plotW;
    const scaleY = (v: number) => PAD_T + ((maxY - v) / (maxY - minY)) * plotH;

    // Build filled area between strike and realized
    const strikePoints = strikeValues.map((v, i) => ({ x: scaleX(i), y: scaleY(v) }));
    const realizedPoints = realizedValues.map((v, i) => ({ x: scaleX(i), y: scaleY(v) }));

    const strikePath = strikePoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');

    const realizedPath = realizedPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');

    // Fill area between the two lines (variance risk premium area)
    const fillPath =
      strikePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ' ' +
      realizedPoints.reverse().map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ' Z';

    // Y-axis ticks
    const step = (maxY - minY) / 4;
    const yTicks = Array.from({ length: 5 }, (_, i) => minY + step * i);

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, plotW, plotH, minY, maxY, scaleX, scaleY, strikePath, realizedPath, fillPath, strikePoints: strikeValues.map((v, i) => ({ x: scaleX(i), y: scaleY(v) })), yTicks };
  }, [termStructure]);

  if (!chart) return null;
  const { W, H, PAD_L, PAD_R, scaleX, scaleY, strikePath, realizedPath, fillPath, yTicks } = chart;

  return (
    <div className="px-2 py-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 150 }}>
        {/* Grid lines */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L} y1={scaleY(v)} x2={W - PAD_R} y2={scaleY(v)}
              stroke="rgba(255,255,255,0.04)" strokeDasharray="2,2"
            />
            <text x={PAD_L - 3} y={scaleY(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">
              {v.toFixed(0)}
            </text>
          </g>
        ))}

        {/* VRP fill area */}
        <path d={fillPath} fill={PURPLE_DIM} />

        {/* Realized line (dashed) */}
        <path d={realizedPath} fill="none" stroke={NEUTRAL} strokeWidth={1} strokeDasharray="3,2" opacity={0.6} />

        {/* Strike line (solid purple) */}
        <path d={strikePath} fill="none" stroke={PURPLE} strokeWidth={1.5} />

        {/* Strike dots */}
        {chart.strikePoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={PURPLE} />
        ))}

        {/* Tenor labels */}
        {termStructure.map((tenor, i) => (
          <text
            key={i}
            x={scaleX(i)} y={H - 4}
            textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={6} fontFamily="monospace"
          >
            {tenor?.tenor ?? tenor?.label ?? ''}
          </text>
        ))}

        {/* Legend */}
        <line x1={PAD_L} y1={6} x2={PAD_L + 14} y2={6} stroke={PURPLE} strokeWidth={1.5} />
        <text x={PAD_L + 17} y={8} fill={PURPLE} fontSize={6} fontFamily="monospace" opacity={0.7}>Strike</text>
        <line x1={PAD_L + 52} y1={6} x2={PAD_L + 66} y2={6} stroke={NEUTRAL} strokeWidth={1} strokeDasharray="3,2" />
        <text x={PAD_L + 69} y={8} fill={NEUTRAL} fontSize={6} fontFamily="monospace" opacity={0.7}>Realized</text>
        <rect x={PAD_L + 110} y={2} width={10} height={6} fill={PURPLE_DIM} />
        <text x={PAD_L + 123} y={8} fill={PURPLE} fontSize={6} fontFamily="monospace" opacity={0.5}>VRP</text>
      </svg>
    </div>
  );
}

// ── STOCKS Tab: Single-Stock Variance Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SingleStockTab({ data, t }: { data: any; t: TFn }) {
  const stocks = data?.stocks ?? [];

  return (
    <div className="px-1 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'vsmSingleStock', 'Single-Stock Variance Swaps')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[44px_42px_42px_42px_40px_40px_36px] gap-0 px-1 mb-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Ticker</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Strike</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Realized</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">VRP</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Earn IV</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Vol/Vol</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right pr-1">Sig</span>
      </div>

      {stocks.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono">
          {tr(t, 'vsmNoStockData', 'No single-stock data')}
        </div>
      )}

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {stocks.map((stock: any) => {
        const signal = stock?.signal ?? 'NEUTRAL';
        const badge = signalBadge(signal);
        return (
          <div
            key={stock?.ticker ?? stock?.symbol}
            className="grid grid-cols-[44px_42px_42px_42px_40px_40px_36px] gap-0 px-1 py-[3px] hover:bg-purple-400/[0.02] border-b border-border/20 items-center"
          >
            <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
              {stock?.ticker ?? stock?.symbol ?? '--'}
            </span>
            <span className="text-[8px] font-mono font-bold text-right tabular-nums" style={{ color: PURPLE }}>
              {fmtNum(stock?.strikeVol)}
            </span>
            <span className="text-[8px] font-mono text-right tabular-nums text-neutral-400">
              {fmtNum(stock?.realizedVol)}
            </span>
            <span
              className="text-[8px] font-mono font-bold text-right tabular-nums"
              style={{ color: premiumColor(stock?.vrp ?? 0) }}
            >
              {stock?.vrp != null ? (stock.vrp > 0 ? '+' : '') + stock.vrp.toFixed(2) : '--'}
            </span>
            <span className={`text-[7.5px] font-mono text-right tabular-nums ${changeCls(stock?.earningsIV ?? 0)}`}>
              {stock?.earningsIV != null ? stock.earningsIV.toFixed(1) : '--'}
            </span>
            <span className="text-[7.5px] font-mono text-right tabular-nums text-neutral-400">
              {fmtNum(stock?.volOfVol, 1)}
            </span>
            <div className="flex justify-end pr-1">
              <span
                className="text-[6px] font-mono font-black uppercase px-1 py-[1px]"
                style={{ background: badge.bg, color: badge.color }}
              >
                {signal}
              </span>
            </div>
          </div>
        );
      })}

      {/* Inline sparkline visual for top 5 stocks by VRP */}
      {stocks.length >= 2 && <StockVRPBars stocks={stocks} />}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StockVRPBars({ stocks }: { stocks: any[] }) {
  const sorted = useMemo(() => {
    return [...stocks]
      .filter((s) => s?.vrp != null)
      .sort((a, b) => Math.abs(b.vrp) - Math.abs(a.vrp))
      .slice(0, 8);
  }, [stocks]);

  if (sorted.length === 0) return null;

  const maxAbs = Math.max(...sorted.map((s) => Math.abs(s.vrp)), 1);
  const W = 320;
  const barH = 12;
  const gap = 2;
  const labelW = 36;
  const valueW = 36;
  const barArea = W - labelW - valueW - 10;
  const H = sorted.length * (barH + gap) + 8;

  return (
    <div className="px-2 pt-3 pb-1 border-t border-border/20 mt-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
        Variance Risk Premium by Ticker
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
        {sorted.map((s, i) => {
          const y = i * (barH + gap) + 2;
          const vrp = s.vrp ?? 0;
          const barW = (Math.abs(vrp) / maxAbs) * barArea;
          const color = vrp > 0 ? PURPLE : '#60a5fa';
          return (
            <g key={s?.ticker ?? s?.symbol ?? i}>
              {/* Label */}
              <text
                x={labelW - 4} y={y + barH / 2 + 3}
                textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize={7} fontFamily="monospace" fontWeight="bold"
              >
                {(s?.ticker ?? s?.symbol ?? '--').slice(0, 5)}
              </text>
              {/* Bar */}
              <rect
                x={labelW} y={y + 1}
                width={barW} height={barH - 2}
                fill={color} opacity={0.6}
              />
              <rect
                x={labelW} y={y + 1}
                width={barW} height={barH - 2}
                fill="none" stroke={color} strokeWidth={0.5} opacity={0.8}
              />
              {/* Value */}
              <text
                x={labelW + barW + 4} y={y + barH / 2 + 3}
                textAnchor="start" fill={color} fontSize={7} fontFamily="monospace" fontWeight="bold"
              >
                {vrp > 0 ? '+' : ''}{vrp.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── VOL Tab: Vol-of-Vol Metrics Cards ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VolOfVolTab({ data, t }: { data: any; t: TFn }) {
  const vov = data?.volOfVol;
  const vovHistory = data?.volOfVol?.history ?? [];

  return (
    <div>
      {/* Vol-of-Vol Metrics Cards */}
      {vov && (
        <div className="px-2 py-2">
          <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-2 px-1">
            {tr(t, 'vsmVolOfVol', 'Volatility of Volatility')}
          </div>

          <div className="grid grid-cols-3 gap-1 mb-2">
            <MetricCard
              label="VVIX Level"
              value={fmtNum(vov?.vvixLevel, 1)}
              sub={`Pctl: ${fmtNum(vov?.vvixPercentile, 0)}%`}
              color={(vov?.vvixLevel ?? 0) > 110 ? RED : (vov?.vvixLevel ?? 0) > 90 ? AMBER : PURPLE}
            />
            <MetricCard
              label="VVIX Change"
              value={fmtPct(vov?.vvixChange)}
              sub={`5D: ${fmtPct(vov?.vvixChange5d)}`}
              color={changeColor(vov?.vvixChange ?? 0)}
            />
            <MetricCard
              label="Vol Regime"
              value={vov?.regime ?? '--'}
              sub={`Z-Score: ${fmtNum(vov?.zScore, 1)}`}
              color={vov?.regime === 'HIGH' ? RED : vov?.regime === 'LOW' ? GREEN : PURPLE}
            />
          </div>

          <div className="grid grid-cols-3 gap-1 mb-2">
            <MetricCard
              label="VIX / VIX3M"
              value={fmtNum(vov?.vixRatio, 3)}
              sub={vov?.vixRatio > 1 ? 'BACKWARDATION' : 'CONTANGO'}
              color={(vov?.vixRatio ?? 0) > 1 ? RED : GREEN}
            />
            <MetricCard
              label="Realized VoV"
              value={fmtNum(vov?.realizedVoV, 1)}
              sub="20D rolling"
              color={PURPLE}
            />
            <MetricCard
              label="Term Slope"
              value={fmtNum(vov?.termSlope, 2)}
              sub={(vov?.termSlope ?? 0) > 0 ? 'NORMAL' : 'INVERTED'}
              color={(vov?.termSlope ?? 0) > 0 ? GREEN : RED}
            />
          </div>
        </div>
      )}

      {/* VVIX History Chart */}
      {vovHistory.length >= 2 && <VVIXChart history={vovHistory} />}

      {/* Vol surface snapshot */}
      {vov?.surface && <VolSurfaceHeatmap surface={vov.surface} />}
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="border border-border/20 p-2" style={{ background: PURPLE_DIM }}>
      <div className="text-[6px] font-mono font-bold uppercase tracking-wider text-neutral-600 mb-0.5">
        {label}
      </div>
      <div className="text-[13px] font-black font-mono tabular-nums leading-tight" style={{ color }}>
        {value}
      </div>
      <div className="text-[6px] font-mono text-neutral-600 mt-0.5 uppercase">{sub}</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VVIXChart({ history }: { history: any[] }) {
  const chart = useMemo(() => {
    const W = 360;
    const H = 100;
    const PAD_L = 30;
    const PAD_R = 10;
    const PAD_T = 12;
    const PAD_B = 18;
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;

    const values = history.map((h) => h?.value ?? h?.vvix ?? 0);
    const minY = Math.min(...values) - 2;
    const maxY = Math.max(...values) + 2;

    const scaleX = (i: number) => PAD_L + (i / Math.max(history.length - 1, 1)) * plotW;
    const scaleY = (v: number) => PAD_T + ((maxY - v) / (maxY - minY)) * plotH;

    const linePath = values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');

    // Fill area under line
    const areaPath = linePath +
      ` L ${scaleX(values.length - 1).toFixed(1)},${(H - PAD_B).toFixed(1)}` +
      ` L ${scaleX(0).toFixed(1)},${(H - PAD_B).toFixed(1)} Z`;

    const yTicks = [minY, (minY + maxY) / 2, maxY];

    return { W, H, PAD_L, PAD_R, plotW, scaleX, scaleY, linePath, areaPath, yTicks, values };
  }, [history]);

  const { W, H, PAD_L, PAD_R, scaleX, scaleY, linePath, areaPath, yTicks } = chart;

  return (
    <div className="px-2 py-2 border-t border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1 px-1">
        VVIX History
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 120 }}>
        {/* Grid */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L} y1={scaleY(v)} x2={W - PAD_R} y2={scaleY(v)}
              stroke="rgba(255,255,255,0.04)" strokeDasharray="2,2"
            />
            <text x={PAD_L - 3} y={scaleY(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">
              {v.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={PURPLE_DIM} />

        {/* Line */}
        <path d={linePath} fill="none" stroke={PURPLE} strokeWidth={1.5} />

        {/* Last point */}
        <circle
          cx={scaleX(chart.values.length - 1)}
          cy={scaleY(chart.values[chart.values.length - 1])}
          r={2.5} fill={PURPLE}
        />

        {/* Date labels */}
        {history.length > 0 && (
          <>
            <text x={scaleX(0)} y={H - 3} textAnchor="start" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">
              {(history[0]?.date ?? '').slice(5)}
            </text>
            <text x={scaleX(history.length - 1)} y={H - 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">
              {(history[history.length - 1]?.date ?? '').slice(5)}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VolSurfaceHeatmap({ surface }: { surface: any }) {
  const tenors = surface?.tenors ?? [];
  const strikes = surface?.strikes ?? [];
  const values = surface?.values ?? [];

  if (tenors.length === 0 || strikes.length === 0) return null;

  const CELL = 16;
  const LABEL_W = 28;
  const LABEL_H = 24;
  const W = LABEL_W + tenors.length * CELL + 4;
  const H = LABEL_H + strikes.length * CELL + 4;

  const allVals = values.flat().filter((v: number) => v != null);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const range = maxV - minV || 1;

  function cellColor(v: number): string {
    const pct = (v - minV) / range;
    // Dark purple to bright purple gradient
    const r = Math.round(20 + 172 * pct);
    const g = Math.round(10 + 60 * pct);
    const b = Math.round(40 + 212 * pct);
    return `rgb(${r},${g},${b})`;
  }

  return (
    <div className="px-2 py-2 border-t border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1 px-1">
        Vol Surface Snapshot
      </div>
      <div className="overflow-auto no-scrollbar">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200, minWidth: 220 }}>
          {/* Tenor labels (top) */}
          {tenors.map((tenor: string, j: number) => (
            <text
              key={`t-${j}`}
              x={LABEL_W + j * CELL + CELL / 2}
              y={LABEL_H - 4}
              textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={5.5} fontFamily="monospace" fontWeight="bold"
            >
              {tenor}
            </text>
          ))}

          {/* Strike labels (left) */}
          {strikes.map((strike: string, i: number) => (
            <text
              key={`s-${i}`}
              x={LABEL_W - 3}
              y={LABEL_H + i * CELL + CELL / 2 + 2}
              textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize={5.5} fontFamily="monospace" fontWeight="bold"
            >
              {strike}
            </text>
          ))}

          {/* Cells */}
          {values.map((row: number[], i: number) =>
            row.map((val: number, j: number) => (
              <g key={`${i}-${j}`}>
                <rect
                  x={LABEL_W + j * CELL}
                  y={LABEL_H + i * CELL}
                  width={CELL}
                  height={CELL}
                  fill={cellColor(val)}
                  stroke="rgba(0,0,0,0.4)"
                  strokeWidth={0.3}
                />
                {CELL >= 14 && (
                  <text
                    x={LABEL_W + j * CELL + CELL / 2}
                    y={LABEL_H + i * CELL + CELL / 2 + 2}
                    textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={4.5} fontFamily="monospace" fontWeight="bold"
                    pointerEvents="none"
                  >
                    {val.toFixed(0)}
                  </text>
                )}
              </g>
            )),
          )}
        </svg>
      </div>
    </div>
  );
}

// ── DISPERSION Tab: Dispersion Trade Indicators ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DispersionTab({ data, t }: { data: any; t: TFn }) {
  const dispersion = data?.dispersion;
  const trades = dispersion?.trades ?? [];
  const history = dispersion?.history ?? [];

  return (
    <div>
      {/* Dispersion metrics */}
      {dispersion && (
        <div className="px-2 py-2">
          <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-2 px-1">
            {tr(t, 'vsmDispersion', 'Dispersion Trade Indicators')}
          </div>

          <div className="grid grid-cols-4 gap-1 mb-2">
            <MetricCard
              label="Impl Corr"
              value={fmtNum(dispersion?.impliedCorrelation, 3)}
              sub={`Real: ${fmtNum(dispersion?.realizedCorrelation, 3)}`}
              color={PURPLE}
            />
            <MetricCard
              label="Corr Risk Prem"
              value={fmtNum(dispersion?.correlationRP, 2)}
              sub={(dispersion?.correlationRP ?? 0) > 0 ? 'RICH' : 'CHEAP'}
              color={(dispersion?.correlationRP ?? 0) > 0 ? GREEN : RED}
            />
            <MetricCard
              label="Disp Ratio"
              value={fmtNum(dispersion?.dispersionRatio, 2)}
              sub={(dispersion?.dispersionRatio ?? 0) > 1.5 ? 'HIGH' : 'NORMAL'}
              color={(dispersion?.dispersionRatio ?? 0) > 1.5 ? AMBER : PURPLE}
            />
            <MetricCard
              label="Idx-Comp Spread"
              value={fmtNum(dispersion?.indexComponentSpread, 1)}
              sub="Vol points"
              color={CYAN}
            />
          </div>
        </div>
      )}

      {/* Dispersion History Chart */}
      {history.length >= 2 && <DispersionHistoryChart history={history} />}

      {/* Trade Signals */}
      {trades.length > 0 && (
        <div className="px-2 py-2 border-t border-border/20">
          <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-2 px-1">
            {tr(t, 'vsmTradeSignals', 'Dispersion Trade Signals')}
          </div>

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {trades.map((trade: any, i: number) => {
            const badge = signalBadge(trade?.direction ?? 'NEUTRAL');
            return (
              <div
                key={trade?.id ?? i}
                className="mb-2 border border-border/20 p-2"
                style={{ background: PURPLE_DIM }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] font-mono font-bold text-neutral-200">
                    {trade?.name ?? 'Unnamed Trade'}
                  </span>
                  <span
                    className="text-[6px] font-mono font-black uppercase px-1.5 py-[1px]"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {trade?.direction ?? 'NEUTRAL'}
                  </span>
                </div>
                <div className="text-[7px] font-mono text-neutral-500 mb-1.5 leading-relaxed">
                  {trade?.rationale ?? '--'}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-[6px] font-mono text-neutral-600 uppercase">Edge</div>
                    <div className="text-[10px] font-black font-mono tabular-nums" style={{ color: PURPLE }}>
                      {trade?.edge != null ? trade.edge.toFixed(1) + 'bps' : '--'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[6px] font-mono text-neutral-600 uppercase">Conviction</div>
                    <div className="text-[10px] font-black font-mono tabular-nums" style={{ color: (trade?.conviction ?? 0) > 7 ? GREEN : NEUTRAL }}>
                      {trade?.conviction ?? '--'}/10
                    </div>
                  </div>
                  <div>
                    <div className="text-[6px] font-mono text-neutral-600 uppercase">Horizon</div>
                    <div className="text-[10px] font-black font-mono tabular-nums text-neutral-300">
                      {trade?.horizon ?? '--'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DispersionHistoryChart({ history }: { history: any[] }) {
  const chart = useMemo(() => {
    const W = 360;
    const H = 100;
    const PAD_L = 30;
    const PAD_R = 32;
    const PAD_T = 12;
    const PAD_B = 18;
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;

    const corrValues = history.map((h) => h?.impliedCorrelation ?? h?.correlation ?? 0);
    const dispValues = history.map((h) => h?.dispersionRatio ?? h?.ratio ?? 0);

    // Correlation axis: 0-1
    const corrScaleY = (v: number) => PAD_T + ((1 - v) / 1) * plotH;

    // Dispersion axis: auto
    const dispMin = Math.min(...dispValues) - 0.1;
    const dispMax = Math.max(...dispValues) + 0.1;
    const dispScaleY = (v: number) => PAD_T + ((dispMax - v) / (dispMax - dispMin)) * plotH;

    const scaleX = (i: number) => PAD_L + (i / Math.max(history.length - 1, 1)) * plotW;

    const corrPath = corrValues
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${corrScaleY(v).toFixed(1)}`)
      .join(' ');

    const dispPath = dispValues
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${dispScaleY(v).toFixed(1)}`)
      .join(' ');

    return { W, H, PAD_L, PAD_R, plotW, scaleX, corrScaleY, dispScaleY, corrPath, dispPath, dispMin, dispMax };
  }, [history]);

  const { W, H, PAD_L, PAD_R, corrScaleY, dispScaleY, corrPath, dispPath, dispMin, dispMax } = chart;

  return (
    <div className="px-2 py-2 border-t border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1 px-1">
        Correlation & Dispersion History
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 120 }}>
        {/* Left axis grid (correlation) */}
        {[0, 0.25, 0.5, 0.75, 1.0].map((v) => (
          <g key={v}>
            <line
              x1={PAD_L} y1={corrScaleY(v)} x2={W - PAD_R} y2={corrScaleY(v)}
              stroke="rgba(255,255,255,0.04)" strokeWidth={0.5}
            />
            <text x={PAD_L - 3} y={corrScaleY(v) + 2.5} textAnchor="end" fill={PURPLE} fontSize={5.5} fontFamily="monospace" opacity={0.5}>
              {v.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Right axis labels (dispersion) */}
        {[dispMin, (dispMin + dispMax) / 2, dispMax].map((v) => (
          <text key={v} x={W - PAD_R + 3} y={dispScaleY(v) + 2.5} textAnchor="start" fill={AMBER} fontSize={5.5} fontFamily="monospace" opacity={0.5}>
            {v.toFixed(1)}
          </text>
        ))}

        {/* Correlation line */}
        <path d={corrPath} fill="none" stroke={PURPLE} strokeWidth={1.5} />

        {/* Dispersion line */}
        <path d={dispPath} fill="none" stroke={AMBER} strokeWidth={1.2} strokeDasharray="3,2" />

        {/* Legend */}
        <line x1={PAD_L} y1={6} x2={PAD_L + 14} y2={6} stroke={PURPLE} strokeWidth={1.5} />
        <text x={PAD_L + 17} y={8} fill={PURPLE} fontSize={6} fontFamily="monospace" opacity={0.7}>Impl Corr</text>
        <line x1={PAD_L + 65} y1={6} x2={PAD_L + 79} y2={6} stroke={AMBER} strokeWidth={1.2} strokeDasharray="3,2" />
        <text x={PAD_L + 82} y={8} fill={AMBER} fontSize={6} fontFamily="monospace" opacity={0.7}>Disp Ratio</text>
      </svg>
    </div>
  );
}

// ── GEX Tab: Gamma Exposure Bars ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GammaExposureTab({ data, t }: { data: any; t: TFn }) {
  const gex = data?.gammaExposure;
  const strikes = gex?.strikes ?? [];
  const summary = gex?.summary;

  return (
    <div>
      {/* GEX Summary */}
      {summary && (
        <div className="px-2 py-2">
          <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-2 px-1">
            {tr(t, 'vsmGex', 'Gamma Exposure Profile')}
          </div>

          <div className="grid grid-cols-4 gap-1 mb-2">
            <MetricCard
              label="Net Gamma"
              value={fmtGamma(summary?.netGamma ?? 0)}
              sub={summary?.regime ?? '--'}
              color={(summary?.netGamma ?? 0) >= 0 ? GREEN : RED}
            />
            <MetricCard
              label="Gamma Flip"
              value={fmtNum(summary?.gammaFlip, 0)}
              sub={`Spot: ${fmtNum(summary?.spot, 0)}`}
              color={AMBER}
            />
            <MetricCard
              label="Put Wall"
              value={fmtNum(summary?.putWall, 0)}
              sub={`${fmtPct(summary?.putWallDist)}`}
              color={RED}
            />
            <MetricCard
              label="Call Wall"
              value={fmtNum(summary?.callWall, 0)}
              sub={`${fmtPct(summary?.callWallDist)}`}
              color={GREEN}
            />
          </div>
        </div>
      )}

      {/* GEX Bar Chart */}
      {strikes.length > 0 && <GexBarChart strikes={strikes} spot={summary?.spot ?? 0} />}

      {/* GEX by expiry */}
      {gex?.expiryBreakdown && gex.expiryBreakdown.length > 0 && (
        <ExpiryBreakdownBars expiries={gex.expiryBreakdown} />
      )}
    </div>
  );
}

function fmtGamma(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return (n / 1000).toFixed(1) + 'B';
  if (abs >= 1) return n.toFixed(1) + 'M';
  return (n * 1000).toFixed(0) + 'K';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GexBarChart({ strikes, spot }: { strikes: any[]; spot: number }) {
  const chart = useMemo(() => {
    const W = 380;
    const H = 180;
    const PAD_L = 40;
    const PAD_R = 10;
    const PAD_T = 14;
    const PAD_B = 24;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;

    const gammaValues = strikes.map((s) => s?.netGamma ?? s?.gamma ?? 0);
    const maxG = Math.max(...gammaValues, 1);
    const minG = Math.min(...gammaValues, -1);
    const absMax = Math.max(Math.abs(maxG), Math.abs(minG));
    const yMax = absMax * 1.15;
    const yMin = -yMax;

    const barW = Math.max(chartW / strikes.length - 1, 2);
    const scaleX = (i: number) => PAD_L + (i / strikes.length) * chartW + barW / 2;
    const scaleY = (v: number) => PAD_T + ((yMax - v) / (yMax - yMin)) * chartH;
    const zeroY = scaleY(0);

    // Find spot index
    const spotIdx = strikes.findIndex((s) => (s?.strike ?? 0) >= spot);
    const spotX = spotIdx >= 0 ? scaleX(spotIdx) : PAD_L + chartW / 2;

    // Y-axis ticks
    const yStep = absMax > 500 ? 200 : absMax > 200 ? 100 : absMax > 50 ? 25 : 10;
    const yTicks: number[] = [];
    for (let v = -Math.floor(yMax / yStep) * yStep; v <= yMax; v += yStep) {
      yTicks.push(v);
    }

    const labelStep = Math.max(1, Math.floor(strikes.length / 8));

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, chartW, chartH, barW, yMax, yMin, scaleX, scaleY, zeroY, spotX, yTicks, labelStep, gammaValues };
  }, [strikes, spot]);

  const { W, H, PAD_L, PAD_R, PAD_T, PAD_B, barW, scaleX, scaleY, zeroY, spotX, yTicks, labelStep } = chart;

  return (
    <div className="px-2 py-2 border-t border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1 px-1">
        Net Gamma by Strike
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
        {/* Grid lines */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L} y1={scaleY(v)} x2={W - PAD_R} y2={scaleY(v)}
              stroke={v === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)'}
              strokeDasharray={v === 0 ? undefined : '2,2'}
              strokeWidth={v === 0 ? 1 : 0.5}
            />
            <text
              x={PAD_L - 4} y={scaleY(v) + 3}
              textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace"
            >
              {fmtGamma(v)}
            </text>
          </g>
        ))}

        {/* Bars */}
        {strikes.map((s, i) => {
          const gamma = s?.netGamma ?? s?.gamma ?? 0;
          const isPositive = gamma >= 0;
          const y = isPositive ? scaleY(gamma) : zeroY;
          const h = Math.abs(scaleY(gamma) - zeroY);
          return (
            <rect
              key={s?.strike ?? i}
              x={scaleX(i) - barW / 2}
              y={y}
              width={barW}
              height={Math.max(h, 0.5)}
              fill={isPositive ? PURPLE : RED}
              opacity={0.7}
            />
          );
        })}

        {/* Spot line */}
        <line
          x1={spotX} y1={PAD_T} x2={spotX} y2={H - PAD_B}
          stroke="rgba(255,255,255,0.5)" strokeDasharray="4,3" strokeWidth={1}
        />
        <text
          x={spotX} y={PAD_T - 4}
          textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={6} fontFamily="monospace" fontWeight="bold"
        >
          SPOT
        </text>

        {/* Strike labels */}
        {strikes.map((s, i) => {
          if (i % labelStep !== 0) return null;
          return (
            <text
              key={s?.strike ?? i}
              x={scaleX(i)} y={H - 6}
              textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace"
            >
              {s?.strike ?? ''}
            </text>
          );
        })}

        {/* Legend */}
        <rect x={PAD_L} y={3} width={8} height={5} fill={PURPLE} opacity={0.7} />
        <text x={PAD_L + 11} y={8} fill={PURPLE} fontSize={6} fontFamily="monospace" opacity={0.7}>Pos</text>
        <rect x={PAD_L + 32} y={3} width={8} height={5} fill={RED} opacity={0.7} />
        <text x={PAD_L + 43} y={8} fill={RED} fontSize={6} fontFamily="monospace" opacity={0.7}>Neg</text>
      </svg>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ExpiryBreakdownBars({ expiries }: { expiries: any[] }) {
  const maxAbs = Math.max(...expiries.map((e) => Math.abs(e?.gamma ?? 0)), 1);
  const W = 340;
  const barH = 14;
  const gap = 2;
  const labelW = 48;
  const H = expiries.length * (barH + gap) + 8;
  const barArea = W - labelW - 10;
  const center = labelW + barArea / 2;

  return (
    <div className="px-2 py-2 border-t border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        Gamma by Expiry
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
        {/* Center line */}
        <line x1={center} y1={0} x2={center} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />

        {expiries.map((exp, i) => {
          const y = i * (barH + gap) + 2;
          const gamma = exp?.gamma ?? 0;
          const halfBarArea = barArea / 2;
          const barW = (Math.abs(gamma) / maxAbs) * halfBarArea;
          const isPositive = gamma >= 0;
          const barX = isPositive ? center : center - barW;
          const color = isPositive ? PURPLE_GLOW : 'rgba(248,113,113,0.5)';
          const strokeColor = isPositive ? PURPLE : RED;

          return (
            <g key={exp?.expiry ?? i}>
              {/* Label */}
              <text
                x={labelW - 4} y={y + barH / 2 + 3}
                textAnchor="end" fill="rgba(255,255,255,0.45)" fontSize={7} fontFamily="monospace" fontWeight="bold"
              >
                {exp?.expiry ?? '--'}
              </text>
              {/* Bar */}
              <rect
                x={barX} y={y + 2}
                width={barW} height={barH - 4}
                fill={color}
              />
              <rect
                x={barX} y={y + 2}
                width={barW} height={barH - 4}
                fill="none" stroke={strokeColor} strokeWidth={0.5} opacity={0.6}
              />
              {/* Value */}
              <text
                x={isPositive ? center + barW + 4 : center - barW - 4}
                y={y + barH / 2 + 3}
                textAnchor={isPositive ? 'start' : 'end'}
                fill={strokeColor} fontSize={6.5} fontFamily="monospace" fontWeight="bold"
              >
                {gamma >= 0 ? '+' : ''}{fmtGamma(gamma)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
