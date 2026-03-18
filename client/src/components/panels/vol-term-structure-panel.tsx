import { useMemo } from 'react';
import {
  useVolTermStructure,
  type VolTermStructureData,
  type VolProduct,
} from '../../api/hooks/use-vol-term-structure';
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

// ── Color helpers ──

const ROSE = '#f43f5e';

function regimeColor(regime: string): string {
  switch (regime) {
    case 'low': return 'text-emerald-400';
    case 'normal': return 'text-yellow-400';
    case 'elevated': return 'text-orange-400';
    case 'high': return 'text-red-400';
    case 'extreme': return 'text-red-500';
    default: return 'text-neutral-400';
  }
}

function regimeBg(regime: string): string {
  switch (regime) {
    case 'low': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    case 'normal': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
    case 'elevated': return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
    case 'high': return 'bg-red-500/10 border-red-500/30 text-red-400';
    case 'extreme': return 'bg-red-600/10 border-red-600/30 text-red-500';
    default: return 'bg-neutral-500/10 border-neutral-500/30 text-neutral-400';
  }
}

function shapeBg(shape: string): string {
  switch (shape) {
    case 'contango': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    case 'backwardation': return 'bg-red-500/10 border-red-500/30 text-red-400';
    default: return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
  }
}

function riskColor(risk: string): string {
  switch (risk) {
    case 'low': return 'text-emerald-400';
    case 'moderate': return 'text-yellow-400';
    case 'high': return 'text-red-400';
    default: return 'text-neutral-400';
  }
}

function riskBg(risk: string): string {
  switch (risk) {
    case 'low': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    case 'moderate': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
    case 'high': return 'bg-red-500/10 border-red-500/30 text-red-400';
    default: return 'bg-neutral-500/10 border-neutral-500/30 text-neutral-400';
  }
}

function premiumColor(premium: string): string {
  switch (premium) {
    case 'high': return 'text-red-400';
    case 'low': return 'text-emerald-400';
    default: return 'text-yellow-400';
  }
}

// ── Main Panel ──

export function VolTermStructurePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useVolTermStructure();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-rose-400">
            {tr(t, 'volTermStructureTitle', 'Vol Term Structure')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {data && (
            <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider border ${regimeBg(data.spot.regime)}`}>
              {data.spot.regime}
            </span>
          )}
          {data && (
            <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider border ${shapeBg(data.termStructure.shape)}`}>
              {data.termStructure.shape}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-rose-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'volTsNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <KeyMetricsRow data={data} t={t} />
            <TermStructureChart data={data} t={t} />
            <VixHistoryChart data={data} t={t} />
            <VolProductsTable products={data.products} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Key Metrics Row ──

function KeyMetricsRow({
  data,
  t,
}: {
  data: VolTermStructureData;
  t: ReturnType<typeof useT>;
}) {
  const { spot, termStructure, realizedVsImplied, signals } = data;
  const isUp = spot.changePct >= 0;

  return (
    <div className="border-b border-border/20">
      <div className="grid grid-cols-4 gap-px bg-border/10">
        {/* VIX Spot */}
        <div className="bg-black px-2 py-2">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'volTsVixSpot', 'VIX Spot')}
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-[18px] font-black font-mono leading-none ${regimeColor(spot.regime)}`}>
              {spot.vix.toFixed(2)}
            </span>
          </div>
          <div className={`text-[8px] font-mono font-bold ${isUp ? 'text-red-400' : 'text-emerald-400'}`}>
            {isUp ? '+' : ''}{spot.changePct.toFixed(2)}%
          </div>
          <div className="text-[7px] font-mono text-neutral-600 mt-0.5">
            {tr(t, 'volTsPercentile', 'P60D')}: {spot.percentile60d}%
          </div>
        </div>

        {/* Contango Spread */}
        <div className="bg-black px-2 py-2">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'volTsContangoSpread', 'Contango Spread')}
          </div>
          <div className={`text-[18px] font-black font-mono leading-none mt-0.5 ${
            termStructure.spread > 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {termStructure.spread > 0 ? '+' : ''}{termStructure.spread.toFixed(1)}%
          </div>
          <div className="text-[8px] font-mono text-neutral-500 mt-0.5">
            {tr(t, 'volTsRatio', 'Ratio')}: {termStructure.ratio.toFixed(3)}
          </div>
          <div className="text-[7px] font-mono text-neutral-600">
            {tr(t, 'volTsSteepness', 'Steepness')}: {termStructure.steepness.toFixed(1)}/10
          </div>
        </div>

        {/* IV vs RV Spread */}
        <div className="bg-black px-2 py-2">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'volTsIvRvSpread', 'IV-RV Spread')}
          </div>
          <div className={`text-[18px] font-black font-mono leading-none mt-0.5 ${premiumColor(realizedVsImplied.premium)}`}>
            {realizedVsImplied.spread > 0 ? '+' : ''}{realizedVsImplied.spread.toFixed(1)}
          </div>
          <div className="text-[8px] font-mono text-neutral-500 mt-0.5">
            IV: {realizedVsImplied.impliedVol.toFixed(1)} / RV: {realizedVsImplied.realizedVol20d.toFixed(1)}
          </div>
          <div className={`text-[7px] font-mono font-bold ${premiumColor(realizedVsImplied.premium)}`}>
            {realizedVsImplied.premium.toUpperCase()} {tr(t, 'volTsPremium', 'PREMIUM')}
          </div>
        </div>

        {/* Spike Risk */}
        <div className="bg-black px-2 py-2">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'volTsSpikeRisk', 'Spike Risk')}
          </div>
          <div className={`text-[14px] font-black font-mono leading-none mt-0.5 ${riskColor(signals.spikeRisk)}`}>
            {signals.spikeRisk.toUpperCase()}
          </div>
          <div className="text-[8px] font-mono text-neutral-500 mt-0.5">
            SMA20: {signals.vixSma20.toFixed(1)}
          </div>
          <div className={`text-[7px] font-mono font-bold ${
            signals.meanReversion === 'overbought' ? 'text-red-400' :
            signals.meanReversion === 'oversold' ? 'text-emerald-400' : 'text-neutral-500'
          }`}>
            {signals.meanReversion.toUpperCase()} ({signals.vixSma20Deviation > 0 ? '+' : ''}{signals.vixSma20Deviation.toFixed(1)}%)
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Term Structure Chart (SVG) ──

function TermStructureChart({
  data,
  t,
}: {
  data: VolTermStructureData;
  t: ReturnType<typeof useT>;
}) {
  const { spot, termStructure, signals } = data;

  // Build term structure points
  const points: Array<{ label: string; value: number }> = [];
  points.push({ label: 'VIX', value: spot.vix });
  if (spot.vix3m != null) points.push({ label: 'VIX3M', value: spot.vix3m });
  if (spot.vix6m != null) points.push({ label: 'VIX6M', value: spot.vix6m });

  if (points.length < 2) return null;

  const W = 300;
  const H = 120;
  const PAD_X = 40;
  const PAD_Y = 18;
  const PAD_BOTTOM = 22;

  const values = points.map((p) => p.value);
  const sma = signals.vixSma20;
  const allValues = [...values, sma].filter((v) => v > 0);
  const minY = Math.min(...allValues) - 1;
  const maxY = Math.max(...allValues) + 1;

  const scaleX = (i: number) => PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2);
  const scaleY = (v: number) => PAD_Y + ((maxY - v) / (maxY - minY)) * (H - PAD_Y - PAD_BOTTOM);

  const chartPoints = points.map((p, i) => ({ x: scaleX(i), y: scaleY(p.value), ...p }));
  const pathD = chartPoints.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');

  const lineColor = termStructure.shape === 'contango' ? '#34d399' : termStructure.shape === 'backwardation' ? '#f87171' : '#facc15';
  const fillColor = termStructure.shape === 'contango'
    ? 'rgba(52,211,153,0.08)'
    : termStructure.shape === 'backwardation'
      ? 'rgba(248,113,113,0.08)'
      : 'rgba(250,204,21,0.08)';

  // Y-axis ticks
  const yStep = (maxY - minY) > 6 ? 2 : 1;
  const yTicks: number[] = [];
  for (let v = Math.ceil(minY / yStep) * yStep; v <= maxY; v += yStep) {
    yTicks.push(v);
  }

  // SMA20 reference line
  const smaY = scaleY(sma);

  return (
    <div className="px-3 py-3 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mb-2">
        {tr(t, 'volTsTermStructure', 'Term Structure Curve')}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
        {/* Grid lines */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_X} y1={scaleY(v)} x2={W - PAD_X} y2={scaleY(v)}
              stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2"
            />
            <text
              x={PAD_X - 4} y={scaleY(v) + 3}
              textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace"
            >
              {v.toFixed(0)}
            </text>
          </g>
        ))}

        {/* SMA20 reference line */}
        {sma > 0 && smaY >= PAD_Y && smaY <= H - PAD_BOTTOM && (
          <g>
            <line
              x1={PAD_X} y1={smaY} x2={W - PAD_X} y2={smaY}
              stroke="rgba(244,63,94,0.4)" strokeDasharray="4,3" strokeWidth={1}
            />
            <text
              x={W - PAD_X + 3} y={smaY + 3}
              textAnchor="start" fill="rgba(244,63,94,0.6)" fontSize={6} fontFamily="monospace"
            >
              SMA20
            </text>
          </g>
        )}

        {/* Area fill */}
        <path
          d={`${pathD} L ${chartPoints[chartPoints.length - 1].x},${H - PAD_BOTTOM} L ${chartPoints[0].x},${H - PAD_BOTTOM} Z`}
          fill={fillColor}
        />

        {/* Line */}
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth={2} />

        {/* Data points + labels */}
        {chartPoints.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill={lineColor} />
            <circle cx={p.x} cy={p.y} r={2} fill="#000" />
            {/* Value label */}
            <text
              x={p.x} y={p.y - 8}
              textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={8} fontFamily="monospace" fontWeight="bold"
            >
              {p.value.toFixed(1)}
            </text>
            {/* Tenor label */}
            <text
              x={p.x} y={H - 6}
              textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={7} fontFamily="monospace"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── VIX History Chart (SVG) ──

function VixHistoryChart({
  data,
  t,
}: {
  data: VolTermStructureData;
  t: ReturnType<typeof useT>;
}) {
  const { history } = data;

  const chartData = useMemo(() => {
    if (history.length < 3) return null;

    const W = 300;
    const H = 150;
    const PAD_X = 35;
    const PAD_Y = 12;
    const PAD_BOTTOM = 18;
    const PAD_RIGHT = 35;

    // VIX axis (left)
    const vixValues = history.map((h) => h.vix);
    const vix3mValues = history.filter((h) => h.vix3m != null).map((h) => h.vix3m as number);
    const rvValues = history.filter((h) => h.realizedVol > 0).map((h) => h.realizedVol);
    const allVolValues = [...vixValues, ...vix3mValues, ...rvValues];
    const minVol = Math.max(Math.min(...allVolValues) - 2, 0);
    const maxVol = Math.max(...allVolValues) + 2;

    // SPX axis (right, inverted)
    const spxValues = history.filter((h) => h.spxClose > 0).map((h) => h.spxClose);
    const minSpx = spxValues.length > 0 ? Math.min(...spxValues) : 0;
    const maxSpx = spxValues.length > 0 ? Math.max(...spxValues) : 1;

    const scaleX = (i: number) => PAD_X + (i / (history.length - 1)) * (W - PAD_X - PAD_RIGHT);
    const scaleVolY = (v: number) => PAD_Y + ((maxVol - v) / (maxVol - minVol)) * (H - PAD_Y - PAD_BOTTOM);
    // Inverted SPX: higher SPX = lower on chart (to show inverse correlation)
    const scaleSpxY = (v: number) => PAD_Y + ((v - minSpx) / (maxSpx - minSpx)) * (H - PAD_Y - PAD_BOTTOM);

    // VIX line
    const vixPath = history
      .map((h, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleVolY(h.vix).toFixed(1)}`)
      .join(' ');

    // VIX area
    const vixAreaPath = `${vixPath} L ${scaleX(history.length - 1).toFixed(1)},${H - PAD_BOTTOM} L ${scaleX(0).toFixed(1)},${H - PAD_BOTTOM} Z`;

    // VIX3M dashed line (only where data exists)
    const vix3mSegments: string[] = [];
    let inSegment = false;
    history.forEach((h, i) => {
      if (h.vix3m != null) {
        vix3mSegments.push(`${inSegment ? 'L' : 'M'} ${scaleX(i).toFixed(1)},${scaleVolY(h.vix3m).toFixed(1)}`);
        inSegment = true;
      } else {
        inSegment = false;
      }
    });
    const vix3mPath = vix3mSegments.join(' ');

    // Realized vol line
    const rvSegments: string[] = [];
    let rvInSegment = false;
    history.forEach((h, i) => {
      if (h.realizedVol > 0) {
        rvSegments.push(`${rvInSegment ? 'L' : 'M'} ${scaleX(i).toFixed(1)},${scaleVolY(h.realizedVol).toFixed(1)}`);
        rvInSegment = true;
      } else {
        rvInSegment = false;
      }
    });
    const rvPath = rvSegments.join(' ');

    // SPX inverted overlay
    const spxSegments: string[] = [];
    let spxInSegment = false;
    history.forEach((h, i) => {
      if (h.spxClose > 0) {
        spxSegments.push(`${spxInSegment ? 'L' : 'M'} ${scaleX(i).toFixed(1)},${scaleSpxY(h.spxClose).toFixed(1)}`);
        spxInSegment = true;
      } else {
        spxInSegment = false;
      }
    });
    const spxPath = spxSegments.join(' ');

    // Regime band rects
    const regimeBands = [
      { min: 0, max: 15, color: 'rgba(52,211,153,0.04)' },
      { min: 15, max: 20, color: 'rgba(250,204,21,0.04)' },
      { min: 20, max: 30, color: 'rgba(249,115,22,0.04)' },
      { min: 30, max: Math.max(maxVol, 40), color: 'rgba(248,113,113,0.04)' },
    ];

    const visibleBands = regimeBands
      .filter((b) => b.max > minVol && b.min < maxVol)
      .map((b) => {
        const top = scaleVolY(Math.min(b.max, maxVol));
        const bottom = scaleVolY(Math.max(b.min, minVol));
        return {
          y: top,
          height: bottom - top,
          color: b.color,
        };
      });

    // Y-axis ticks (vol)
    const volStep = (maxVol - minVol) > 20 ? 5 : (maxVol - minVol) > 10 ? 2 : 1;
    const volTicks: number[] = [];
    for (let v = Math.ceil(minVol / volStep) * volStep; v <= maxVol; v += volStep) {
      volTicks.push(v);
    }

    // Date labels (first, middle, last)
    const dateLabels = [
      { i: 0, label: history[0].date.slice(5) },
      { i: Math.floor(history.length / 2), label: history[Math.floor(history.length / 2)].date.slice(5) },
      { i: history.length - 1, label: history[history.length - 1].date.slice(5) },
    ];

    return {
      W, H, PAD_X, PAD_Y, PAD_BOTTOM, PAD_RIGHT,
      vixPath, vixAreaPath, vix3mPath, rvPath, spxPath,
      visibleBands, volTicks, dateLabels,
      scaleX, scaleVolY,
      minSpx, maxSpx,
    };
  }, [history]);

  if (!chartData) return null;

  const {
    W, H, PAD_X, PAD_Y, PAD_BOTTOM, PAD_RIGHT,
    vixPath, vixAreaPath, vix3mPath, rvPath, spxPath,
    visibleBands, volTicks, dateLabels,
    scaleX, scaleVolY,
  } = chartData;

  return (
    <div className="px-3 py-3 border-b border-border/20">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
          {tr(t, 'volTsHistory', 'VIX History (60D)')}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-px bg-rose-400" />
            <span className="text-[6px] font-mono text-neutral-600">VIX</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-px bg-blue-400 opacity-60" style={{ borderTop: '1px dashed' }} />
            <span className="text-[6px] font-mono text-neutral-600">VIX3M</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-px bg-amber-400 opacity-40" />
            <span className="text-[6px] font-mono text-neutral-600">RV20</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-px bg-neutral-600 opacity-40" />
            <span className="text-[6px] font-mono text-neutral-600">SPX inv</span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 170 }}>
        {/* Regime background bands */}
        {visibleBands.map((b, i) => (
          <rect
            key={i}
            x={PAD_X} y={b.y}
            width={W - PAD_X - PAD_RIGHT} height={Math.max(b.height, 0)}
            fill={b.color}
          />
        ))}

        {/* Grid lines */}
        {volTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_X} y1={scaleVolY(v)} x2={W - PAD_RIGHT} y2={scaleVolY(v)}
              stroke="rgba(255,255,255,0.04)" strokeDasharray="2,2"
            />
            <text
              x={PAD_X - 3} y={scaleVolY(v) + 3}
              textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace"
            >
              {v.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Date labels */}
        {dateLabels.map((d) => (
          <text
            key={d.i}
            x={scaleX(d.i)} y={H - 3}
            textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace"
          >
            {d.label}
          </text>
        ))}

        {/* SPX inverted overlay */}
        {spxPath && (
          <path d={spxPath} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={0.8} />
        )}

        {/* Realized vol line */}
        {rvPath && (
          <path d={rvPath} fill="none" stroke="rgba(251,191,36,0.4)" strokeWidth={1} />
        )}

        {/* VIX area */}
        <path d={vixAreaPath} fill="rgba(244,63,94,0.06)" />

        {/* VIX3M dashed line */}
        {vix3mPath && (
          <path d={vix3mPath} fill="none" stroke="rgba(96,165,250,0.6)" strokeWidth={1} strokeDasharray="4,2" />
        )}

        {/* VIX solid line */}
        <path d={vixPath} fill="none" stroke={ROSE} strokeWidth={1.5} />

        {/* Current value dot */}
        {history.length > 0 && (
          <circle
            cx={scaleX(history.length - 1)}
            cy={scaleVolY(history[history.length - 1].vix)}
            r={2.5}
            fill={ROSE}
          />
        )}
      </svg>
    </div>
  );
}

// ── Vol Products Table ──

function VolProductsTable({
  products,
  t,
}: {
  products: VolProduct[];
  t: ReturnType<typeof useT>;
}) {
  if (products.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'volTsProducts', 'Vol Products')}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_0.6fr_0.6fr] px-3 py-1 border-b border-border/10 text-[7px] font-black text-neutral-600 uppercase tracking-wider">
        <span>{tr(t, 'symbol', 'Symbol')}</span>
        <span className="text-right">{tr(t, 'price', 'Price')}</span>
        <span className="text-right">{tr(t, 'moversChange', 'Change')}</span>
      </div>
      {products.map((p) => (
        <div
          key={p.symbol}
          className="grid grid-cols-[1fr_0.6fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors"
        >
          <div>
            <div className="text-[9px] font-mono font-bold text-white">{p.symbol}</div>
            <div className="text-[7px] font-mono text-neutral-600 truncate">{p.description}</div>
          </div>
          <span className="text-[9px] font-mono text-white text-right self-center">
            ${p.price.toFixed(2)}
          </span>
          <span
            className={`text-[9px] font-mono font-bold text-right self-center ${
              p.changePct >= 0 ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {p.changePct >= 0 ? '+' : ''}{p.changePct.toFixed(2)}%
          </span>
        </div>
      ))}

      {/* Timestamp */}
      <div className="px-3 py-1.5">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'volTsLastUpdate', 'Last update')}: {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
