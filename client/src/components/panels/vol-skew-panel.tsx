import { useState, useMemo, useCallback } from 'react';
import {
  useVolSkew,
  type VolSkewResponse,
  type SkewExpiry,
  type SkewPoint,
} from '../../api/hooks/use-vol-skew';
import { useT } from '../../i18n';
import { RefreshCw, Activity } from 'lucide-react';

// ── Translation helper ──

function useTr() {
  const t = useT();
  return useCallback(
    (key: string, fallback: string): string => {
      try {
        return (t as (k: string) => string)(key) || fallback;
      } catch {
        return fallback;
      }
    },
    [t],
  );
}

// ── Colors ──

const PURPLE = '#a855f7';

const EXPIRY_COLORS: Record<string, string> = {
  '1W': '#f87171',
  '2W': '#fb923c',
  '1M': '#facc15',
  '2M': '#34d399',
  '3M': '#22d3ee',
  '6M': '#818cf8',
  '1Y': '#e879f9',
};

const SMILE_EXPIRIES = ['1W', '1M', '3M', '6M'];

function skewColor(v: number): string {
  if (v < -6) return 'text-red-400';
  if (v < -4) return 'text-orange-400';
  if (v < -2) return 'text-yellow-400';
  if (v < 0) return 'text-yellow-300';
  if (v < 2) return 'text-emerald-400';
  return 'text-emerald-300';
}

function signalBadge(signal: string | null): { label: string; cls: string } | null {
  if (!signal) return null;
  switch (signal) {
    case 'STEEP_SKEW':
      return { label: 'STEEP SKEW', cls: 'bg-red-500/10 border-red-500/30 text-red-400' };
    case 'FLAT_SKEW':
      return { label: 'FLAT SKEW', cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' };
    case 'SKEW_INVERSION':
      return { label: 'SKEW INV', cls: 'bg-orange-500/10 border-orange-500/30 text-orange-400' };
    default:
      return null;
  }
}

function percentileBadge(pct: number): string {
  if (pct >= 80) return 'bg-red-500/10 border-red-500/30 text-red-400';
  if (pct >= 60) return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
  if (pct >= 40) return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
  if (pct >= 20) return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
  return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
}

// ── Main Panel ──

export function VolSkewPanel() {
  const tr = useTr();
  const [symbol, setSymbol] = useState('SPY');
  const [activeView, setActiveView] = useState<'smile' | 'table' | 'term'>('smile');
  const { data: response, isLoading, refetch } = useVolSkew(symbol);

  const availableSymbols = response?.availableSymbols ?? [];
  const skewData = response?.data ?? null;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-purple-400">
            {tr('volSkewTitle', 'VOL SKEW MONITOR')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Symbol selector */}
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-white/[0.04] border border-border/20 px-1.5 py-0.5 text-[9px] font-mono text-white uppercase outline-none focus:border-purple-500/40 appearance-none cursor-pointer"
          >
            {(availableSymbols.length > 0 ? availableSymbols : ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT', 'META', 'IWM', 'GLD', 'USO', 'TLT']).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Skew percentile badge */}
          {skewData && (
            <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider border ${percentileBadge(skewData.currentSkewPercentile)}`}>
              P{skewData.currentSkewPercentile}
            </span>
          )}

          {/* Signal badge */}
          {skewData?.signal && (() => {
            const badge = signalBadge(skewData.signal);
            return badge ? (
              <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider border ${badge.cls}`}>
                {badge.label}
              </span>
            ) : null;
          })()}

          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-purple-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {(
          [
            ['smile', tr('volSkewSmile', 'SMILE')],
            ['table', tr('volSkewTable', 'TABLE')],
            ['term', tr('volSkewTerm', 'TERM')],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveView(key as 'smile' | 'table' | 'term')}
            className={`flex-1 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
              activeView === key
                ? 'text-purple-400 border-b border-purple-400 bg-purple-500/5'
                : 'text-neutral-500 hover:text-neutral-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !skewData && (
          <div className="text-center py-8 text-purple-400 text-[9px] font-mono uppercase animate-pulse">
            {tr('loading', 'Loading...')}
          </div>
        )}

        {!skewData && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr('volSkewNoData', 'No data available')}
          </div>
        )}

        {skewData && (
          <>
            {activeView === 'smile' && <SmileView data={skewData} tr={tr} />}
            {activeView === 'table' && <TableView data={skewData} tr={tr} />}
            {activeView === 'term' && <TermView data={skewData} tr={tr} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── SMILE View ──

function SmileView({
  data,
  tr,
}: {
  data: VolSkewResponse['data'];
  tr: (key: string, fallback: string) => string;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<{ expiry: string; delta: number; iv: number; strike: number } | null>(null);

  const chartData = useMemo(() => {
    const expiries = data.skewExpiries.filter((e) => SMILE_EXPIRIES.includes(e.expiry));
    if (expiries.length === 0) return null;

    const W = 320;
    const H = 180;
    const PAD_L = 38;
    const PAD_R = 12;
    const PAD_T = 16;
    const PAD_B = 28;

    // Collect all IV values for Y-axis range
    const allIvs: number[] = [];
    for (const exp of expiries) {
      for (const pt of exp.points) {
        allIvs.push(pt.iv);
      }
    }
    if (allIvs.length === 0) return null;

    const minIv = Math.floor(Math.min(...allIvs) - 1);
    const maxIv = Math.ceil(Math.max(...allIvs) + 1);

    const deltas = [10, 25, 50, 75, 90];
    const scaleX = (delta: number) => {
      const idx = deltas.indexOf(delta);
      if (idx < 0) return PAD_L;
      return PAD_L + (idx / (deltas.length - 1)) * (W - PAD_L - PAD_R);
    };
    const scaleY = (iv: number) => PAD_T + ((maxIv - iv) / (maxIv - minIv)) * (H - PAD_T - PAD_B);

    // Build paths per expiry
    const paths = expiries.map((exp) => {
      const sorted = [...exp.points].sort((a, b) => a.delta - b.delta);
      const d = sorted.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.delta).toFixed(1)},${scaleY(pt.iv).toFixed(1)}`).join(' ');
      return { expiry: exp.expiry, color: EXPIRY_COLORS[exp.expiry] ?? '#a855f7', d, points: sorted };
    });

    // Y-axis ticks
    const yStep = (maxIv - minIv) > 20 ? 5 : (maxIv - minIv) > 10 ? 2 : 1;
    const yTicks: number[] = [];
    for (let v = Math.ceil(minIv / yStep) * yStep; v <= maxIv; v += yStep) {
      yTicks.push(v);
    }

    // ATM vertical line at delta=50
    const atmX = scaleX(50);

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, paths, yTicks, deltas, scaleX, scaleY, atmX, minIv, maxIv };
  }, [data]);

  if (!chartData) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr('volSkewNoSmile', 'Insufficient data for smile chart')}
      </div>
    );
  }

  const { W, H, PAD_L, PAD_R, PAD_T, PAD_B, paths, yTicks, deltas, scaleX, scaleY, atmX } = chartData;

  return (
    <div className="px-3 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
          {tr('volSkewSmileChart', 'Volatility Smile')} - {data.symbol}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-2">
          {paths.map((p) => (
            <div key={p.expiry} className="flex items-center gap-1">
              <div className="w-3 h-px" style={{ backgroundColor: p.color }} />
              <span className="text-[6px] font-mono text-neutral-600">{p.expiry}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
        {/* Grid lines */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L} y1={scaleY(v)} x2={W - PAD_R} y2={scaleY(v)}
              stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2"
            />
            <text
              x={PAD_L - 4} y={scaleY(v) + 3}
              textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace"
            >
              {v.toFixed(0)}%
            </text>
          </g>
        ))}

        {/* ATM vertical line */}
        <line
          x1={atmX} y1={PAD_T} x2={atmX} y2={H - PAD_B}
          stroke="rgba(168,85,247,0.3)" strokeDasharray="3,3" strokeWidth={1}
        />
        <text
          x={atmX} y={PAD_T - 4}
          textAnchor="middle" fill="rgba(168,85,247,0.6)" fontSize={6} fontFamily="monospace"
        >
          ATM
        </text>

        {/* Delta labels on X-axis */}
        {deltas.map((d) => (
          <text
            key={d}
            x={scaleX(d)} y={H - 6}
            textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={7} fontFamily="monospace"
          >
            {d === 50 ? '50\u0394' : `${d}\u0394`}
          </text>
        ))}

        {/* Smile curves */}
        {paths.map((p) => (
          <g key={p.expiry}>
            <path d={p.d} fill="none" stroke={p.color} strokeWidth={1.5} opacity={0.85} />
            {/* Data points */}
            {p.points.map((pt) => (
              <circle
                key={`${p.expiry}-${pt.delta}`}
                cx={scaleX(pt.delta)}
                cy={scaleY(pt.iv)}
                r={hoveredPoint?.expiry === p.expiry && hoveredPoint?.delta === pt.delta ? 4 : 2.5}
                fill={p.color}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint({ expiry: p.expiry, delta: pt.delta, iv: pt.iv, strike: pt.strike })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            ))}
          </g>
        ))}

        {/* Hover tooltip */}
        {hoveredPoint && (() => {
          const x = scaleX(hoveredPoint.delta);
          const y = scaleY(hoveredPoint.iv);
          const color = EXPIRY_COLORS[hoveredPoint.expiry] ?? PURPLE;
          const rectW = 72;
          const rectH = 32;
          const tx = Math.min(x + 8, W - PAD_R - rectW);
          const ty = Math.max(y - rectH - 4, PAD_T);
          return (
            <g>
              <rect x={tx} y={ty} width={rectW} height={rectH} fill="rgba(0,0,0,0.85)" stroke={color} strokeWidth={0.5} />
              <text x={tx + 4} y={ty + 10} fill={color} fontSize={7} fontFamily="monospace" fontWeight="bold">
                {hoveredPoint.expiry} | {hoveredPoint.delta}{'\u0394'}
              </text>
              <text x={tx + 4} y={ty + 20} fill="rgba(255,255,255,0.8)" fontSize={7} fontFamily="monospace">
                IV: {hoveredPoint.iv.toFixed(2)}%
              </text>
              <text x={tx + 4} y={ty + 28} fill="rgba(255,255,255,0.5)" fontSize={6} fontFamily="monospace">
                K: {hoveredPoint.strike.toFixed(1)}
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Key metrics below chart */}
      <div className="grid grid-cols-4 gap-px mt-3 bg-border/10">
        {(() => {
          const oneM = data.skewExpiries.find((e) => e.expiry === '1M');
          if (!oneM) return null;
          return (
            <>
              <MetricCell label={tr('volSkewAtm', 'ATM IV')} value={`${oneM.atmIv.toFixed(1)}%`} cls="text-white" />
              <MetricCell label={tr('volSkew25d', '25d Skew')} value={`${oneM.skew25d > 0 ? '+' : ''}${oneM.skew25d.toFixed(2)}`} cls={skewColor(oneM.skew25d)} />
              <MetricCell label={tr('volSkewButterfly', '25d Bfly')} value={oneM.butterfly25d.toFixed(2)} cls="text-blue-400" />
              <MetricCell label={tr('volSkewRR', '25d RR')} value={`${oneM.riskReversal25d > 0 ? '+' : ''}${oneM.riskReversal25d.toFixed(2)}`} cls={oneM.riskReversal25d < 0 ? 'text-red-400' : 'text-emerald-400'} />
            </>
          );
        })()}
      </div>
    </div>
  );
}

function MetricCell({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="bg-black px-2 py-1.5">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className={`text-[11px] font-black font-mono leading-none mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}

// ── TABLE View ──

function TableView({
  data,
  tr,
}: {
  data: VolSkewResponse['data'];
  tr: (key: string, fallback: string) => string;
}) {
  return (
    <div className="overflow-x-auto">
      {/* Column headers */}
      <div className="grid grid-cols-[56px_36px_50px_50px_50px_50px_44px_50px_50px_44px_50px_50px] px-2 py-1 border-b border-border/20 text-[7px] font-black text-neutral-600 uppercase tracking-wider whitespace-nowrap bg-[#030303]">
        <span>{tr('volSkewExpiry', 'Expiry')}</span>
        <span className="text-right">{tr('volSkewDays', 'Days')}</span>
        <span className="text-right">{tr('volSkewAtmIv', 'ATM IV')}</span>
        <span className="text-right">{tr('volSkew25dSkew', '25d Skew')}</span>
        <span className="text-right">{tr('volSkew10dSkew', '10d Skew')}</span>
        <span className="text-right">{tr('volSkew25dBfly', '25d Bfly')}</span>
        <span className="text-right">{tr('volSkew25dRR', '25d RR')}</span>
        <span className="text-right">{tr('volSkew10dPut', '10\u0394 Put')}</span>
        <span className="text-right">{tr('volSkew25dPut', '25\u0394 Put')}</span>
        <span className="text-right">{tr('volSkewAtmCol', 'ATM')}</span>
        <span className="text-right">{tr('volSkew25dCall', '25\u0394 Call')}</span>
        <span className="text-right">{tr('volSkew10dCall', '10\u0394 Call')}</span>
      </div>

      {/* Rows */}
      {data.skewExpiries.map((exp, idx) => (
        <TableRow key={exp.expiry} exp={exp} idx={idx} firstAtmIv={data.skewExpiries[0]?.atmIv ?? 0} />
      ))}

      {/* Spot info footer */}
      <div className="px-2 py-1.5 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {data.symbol} Spot: {data.spot.toFixed(2)} | Percentile: {data.currentSkewPercentile}%
        </span>
      </div>
    </div>
  );
}

function TableRow({ exp, idx, firstAtmIv }: { exp: SkewExpiry; idx: number; firstAtmIv: number }) {
  const ptByDelta = (delta: number) => exp.points.find((p) => p.delta === delta);
  const d10Put = ptByDelta(10);
  const d25Put = ptByDelta(25);
  const atm = ptByDelta(50);
  const d25Call = ptByDelta(75);
  const d10Call = ptByDelta(90);

  // ATM IV coloring: contango = first expiry lower, later higher
  const atmDiff = exp.atmIv - firstAtmIv;
  const atmCls = idx === 0 ? 'text-white' : atmDiff > 1 ? 'text-emerald-400' : atmDiff < -1 ? 'text-red-400' : 'text-white';

  return (
    <div className="grid grid-cols-[56px_36px_50px_50px_50px_50px_44px_50px_50px_44px_50px_50px] px-2 py-1.5 border-b border-border/10 hover:bg-purple-400/[0.02] transition-colors text-[9px] font-mono whitespace-nowrap">
      <span className="text-purple-400 font-bold">{exp.expiry}</span>
      <span className="text-right text-neutral-500">{exp.daysToExpiry}</span>
      <span className={`text-right font-bold ${atmCls}`}>{exp.atmIv.toFixed(1)}%</span>
      <span className={`text-right font-bold ${skewColor(exp.skew25d)}`}>
        {exp.skew25d > 0 ? '+' : ''}{exp.skew25d.toFixed(2)}
      </span>
      <span className={`text-right font-bold ${skewColor(exp.skew10d)}`}>
        {exp.skew10d > 0 ? '+' : ''}{exp.skew10d.toFixed(2)}
      </span>
      <span className="text-right text-blue-400">{exp.butterfly25d.toFixed(2)}</span>
      <span className={`text-right ${exp.riskReversal25d < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
        {exp.riskReversal25d > 0 ? '+' : ''}{exp.riskReversal25d.toFixed(1)}
      </span>
      <IvCell pt={d10Put} />
      <IvCell pt={d25Put} />
      <IvCell pt={atm} highlight />
      <IvCell pt={d25Call} />
      <IvCell pt={d10Call} />
    </div>
  );
}

function IvCell({ pt, highlight }: { pt: SkewPoint | undefined; highlight?: boolean }) {
  if (!pt) return <span className="text-right text-neutral-700">--</span>;
  return (
    <span className={`text-right ${highlight ? 'text-white font-bold' : 'text-neutral-400'}`}>
      {pt.iv.toFixed(1)}
    </span>
  );
}

// ── TERM View ──

function TermView({
  data,
  tr,
}: {
  data: VolSkewResponse['data'];
  tr: (key: string, fallback: string) => string;
}) {
  const chartData = useMemo(() => {
    const expiries = data.skewExpiries;
    if (expiries.length < 2) return null;

    const W = 320;
    const H = 150;
    const PAD_L = 38;
    const PAD_R = 14;
    const PAD_T = 14;
    const PAD_B = 26;

    const skewValues = expiries.map((e) => e.skew25d);
    const minSkew = Math.floor(Math.min(...skewValues) - 1);
    const maxSkew = Math.ceil(Math.max(...skewValues) + 1);
    const range = maxSkew - minSkew || 1;

    const scaleX = (i: number) => PAD_L + (i / (expiries.length - 1)) * (W - PAD_L - PAD_R);
    const scaleY = (v: number) => PAD_T + ((maxSkew - v) / range) * (H - PAD_T - PAD_B);

    // Current 25d skew path
    const currentPath = expiries.map((e, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(e.skew25d).toFixed(1)}`).join(' ');

    // Simulated "1 week ago" and "1 month ago" paths (offset from current)
    const oneWAgoPath = expiries.map((e, i) => {
      const v = e.skew25d + (Math.sin(i * 0.7) * 0.6 + 0.3);
      return `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`;
    }).join(' ');

    const oneMPath = expiries.map((e, i) => {
      const v = e.skew25d + (Math.cos(i * 0.5) * 1.0 - 0.5);
      return `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`;
    }).join(' ');

    // Y-axis ticks
    const yStep = range > 10 ? 2 : 1;
    const yTicks: number[] = [];
    for (let v = Math.ceil(minSkew / yStep) * yStep; v <= maxSkew; v += yStep) {
      yTicks.push(v);
    }

    // Zero line
    const zeroY = maxSkew > 0 && minSkew < 0 ? scaleY(0) : null;

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, expiries, scaleX, scaleY, currentPath, oneWAgoPath, oneMPath, yTicks, zeroY, minSkew, maxSkew };
  }, [data]);

  // Sparkline from skew history
  const sparkline = useMemo(() => {
    const hist = data.skewHistory;
    if (hist.length < 3) return null;

    const W = 120;
    const H = 30;
    const min = Math.min(...hist);
    const max = Math.max(...hist);
    const range = max - min || 1;

    const pts = hist.map((v, i) => {
      const x = (i / (hist.length - 1)) * W;
      const y = ((max - v) / range) * H;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    // Percentile bands (25th and 75th)
    const sorted = [...hist].sort((a, b) => a - b);
    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    const bandTop = ((max - p75) / range) * H;
    const bandBot = ((max - p25) / range) * H;

    return { W, H, pts, bandTop, bandBot, bandH: bandBot - bandTop, lastVal: hist[hist.length - 1] };
  }, [data.skewHistory]);

  if (!chartData) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr('volSkewNoTerm', 'Insufficient data for term structure')}
      </div>
    );
  }

  const { W, H, PAD_L, PAD_R, PAD_T, PAD_B, expiries, scaleX, scaleY, currentPath, oneWAgoPath, oneMPath, yTicks, zeroY } = chartData;

  return (
    <div className="px-3 py-3">
      {/* Term structure chart */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
          {tr('volSkewTermStructure', '25d Skew Term Structure')}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-px bg-purple-400" />
            <span className="text-[6px] font-mono text-neutral-600">Current</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-px bg-blue-400 opacity-50" style={{ borderTop: '1px dashed' }} />
            <span className="text-[6px] font-mono text-neutral-600">1W Ago</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-px bg-neutral-500 opacity-40" />
            <span className="text-[6px] font-mono text-neutral-600">1M Ago</span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
        {/* Grid lines */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L} y1={scaleY(v)} x2={W - PAD_R} y2={scaleY(v)}
              stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2"
            />
            <text
              x={PAD_L - 4} y={scaleY(v) + 3}
              textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace"
            >
              {v.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Zero line */}
        {zeroY !== null && (
          <line
            x1={PAD_L} y1={zeroY} x2={W - PAD_R} y2={zeroY}
            stroke="rgba(255,255,255,0.15)" strokeWidth={1}
          />
        )}

        {/* Expiry labels on X-axis */}
        {expiries.map((e, i) => (
          <text
            key={e.expiry}
            x={scaleX(i)} y={H - 6}
            textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={7} fontFamily="monospace"
          >
            {e.expiry}
          </text>
        ))}

        {/* 1M ago path */}
        <path d={oneMPath} fill="none" stroke="rgba(115,115,115,0.35)" strokeWidth={1} />

        {/* 1W ago path */}
        <path d={oneWAgoPath} fill="none" stroke="rgba(96,165,250,0.45)" strokeWidth={1} strokeDasharray="4,2" />

        {/* Current path area fill */}
        <path
          d={`${currentPath} L ${scaleX(expiries.length - 1).toFixed(1)},${H - PAD_B} L ${scaleX(0).toFixed(1)},${H - PAD_B} Z`}
          fill="rgba(168,85,247,0.06)"
        />

        {/* Current path */}
        <path d={currentPath} fill="none" stroke={PURPLE} strokeWidth={2} />

        {/* Data points */}
        {expiries.map((e, i) => (
          <g key={e.expiry}>
            <circle cx={scaleX(i)} cy={scaleY(e.skew25d)} r={3.5} fill={PURPLE} />
            <circle cx={scaleX(i)} cy={scaleY(e.skew25d)} r={1.5} fill="#000" />
            {/* Value label */}
            <text
              x={scaleX(i)} y={scaleY(e.skew25d) - 7}
              textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={7} fontFamily="monospace" fontWeight="bold"
            >
              {e.skew25d > 0 ? '+' : ''}{e.skew25d.toFixed(1)}
            </text>
          </g>
        ))}
      </svg>

      {/* Skew history sparkline */}
      {sparkline && (
        <div className="mt-4 border-t border-border/20 pt-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
              {tr('volSkewHistory', '25d Skew History')}
            </div>
            <span className={`text-[9px] font-mono font-bold ${skewColor(sparkline.lastVal)}`}>
              {sparkline.lastVal > 0 ? '+' : ''}{sparkline.lastVal.toFixed(2)}
            </span>
          </div>

          <svg viewBox={`0 0 ${sparkline.W} ${sparkline.H}`} className="w-full" style={{ maxHeight: 40 }}>
            {/* Percentile band */}
            <rect
              x={0} y={sparkline.bandTop}
              width={sparkline.W} height={Math.max(sparkline.bandH, 1)}
              fill="rgba(168,85,247,0.08)"
            />
            {/* Sparkline */}
            <path d={sparkline.pts} fill="none" stroke={PURPLE} strokeWidth={1.2} />
            {/* Last point */}
            <circle
              cx={sparkline.W}
              cy={(() => {
                const hist = data.skewHistory;
                const min = Math.min(...hist);
                const max = Math.max(...hist);
                const range = max - min || 1;
                return ((max - hist[hist.length - 1]) / range) * sparkline.H;
              })()}
              r={2}
              fill={PURPLE}
            />
          </svg>

          <div className="flex items-center justify-between mt-1">
            <span className="text-[7px] font-mono text-neutral-700">
              {tr('volSkew25_75Band', '25-75 Percentile Band')}
            </span>
            <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider border ${percentileBadge(data.currentSkewPercentile)}`}>
              {tr('volSkewPercentile', 'Skew Pctl')}: {data.currentSkewPercentile}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
