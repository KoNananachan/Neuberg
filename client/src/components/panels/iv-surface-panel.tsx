import { useState, useMemo, useCallback } from 'react';
import { useIVSurface, type IVSurfaceData, type ExpirationData, type SkewPoint } from '../../api/hooks/use-iv-surface';
import { useT } from '../../i18n';
import { RefreshCw, Activity } from 'lucide-react';

// ── Translation helper with fallback ──

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

// ── Color helpers ──

const EXPIRY_COLORS = ['#22d3ee', '#a78bfa', '#fb923c', '#34d399', '#f87171', '#fbbf24'];

function ivToColor(iv: number, minIV: number, maxIV: number): string {
  if (maxIV <= minIV) return 'rgba(34,211,238,0.3)';
  const t = Math.min(1, Math.max(0, (iv - minIV) / (maxIV - minIV)));
  // cold cyan -> warm orange -> hot red
  if (t < 0.5) {
    const p = t * 2;
    const r = Math.round(34 + (251 - 34) * p);
    const g = Math.round(211 + (146 - 211) * p);
    const b = Math.round(238 + (60 - 238) * p);
    return `rgb(${r},${g},${b})`;
  }
  const p = (t - 0.5) * 2;
  const r = Math.round(251 + (248 - 251) * p);
  const g = Math.round(146 + (113 - 146) * p);
  const b = Math.round(60 + (113 - 60) * p);
  return `rgb(${r},${g},${b})`;
}

function pctColor(pct: number): string {
  if (pct > 70) return 'text-red-400';
  if (pct > 40) return 'text-yellow-400';
  return 'text-emerald-400';
}

function pctBarColor(pct: number): string {
  if (pct > 70) return 'bg-red-500';
  if (pct > 40) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

// ── Main Panel ──

export function IVSurfacePanel() {
  const tr = useTr();
  const [symbol, setSymbol] = useState('SPY');
  const [inputVal, setInputVal] = useState('SPY');
  const [activeTab, setActiveTab] = useState<'surface' | 'skew' | 'term'>(
    'surface',
  );
  const { data, isLoading, refetch } = useIVSurface(symbol);

  const handleSubmit = useCallback(() => {
    const s = inputVal.trim().toUpperCase();
    if (s && s !== symbol) setSymbol(s);
  }, [inputVal, symbol]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {tr('panelIVSurface', 'IV SURFACE')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex items-center gap-1"
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value.toUpperCase())}
              className="w-16 bg-white/[0.04] border border-border/20 px-1.5 py-0.5 text-[9px] font-mono text-white uppercase outline-none focus:border-cyan-500/40"
              placeholder="SYMBOL"
            />
            <button
              type="submit"
              className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-[8px] font-mono font-bold text-cyan-400 uppercase tracking-wider hover:bg-cyan-500/20 transition-colors"
            >
              GO
            </button>
          </form>
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral/40 hover:text-cyan-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary badges */}
      {data && <SummaryRow data={data} tr={tr} />}

      {/* Tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {(
          [
            ['surface', tr('ivSurface', 'Surface')],
            ['skew', tr('ivSkew', 'Skew')],
            ['term', tr('ivTermStructure', 'Term Structure')],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as 'surface' | 'skew' | 'term')}
            className={`flex-1 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
              activeTab === key
                ? 'text-cyan-400 border-b border-cyan-400 bg-cyan-500/5'
                : 'text-neutral/40 hover:text-neutral/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-cyan-400 text-[9px] font-mono uppercase animate-pulse">
            {tr('loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {tr('ivNoData', 'No IV data available')}
          </div>
        )}

        {data && (
          <>
            {activeTab === 'surface' && <VolSurface data={data} tr={tr} />}
            {activeTab === 'skew' && <SkewCurves data={data} tr={tr} />}
            {activeTab === 'term' && <TermStructureChart data={data} tr={tr} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Row ──

function SummaryRow({
  data,
  tr,
}: {
  data: IVSurfaceData;
  tr: (key: string, fallback: string) => string;
}) {
  const atmDisplay = data.atmIV !== null ? (data.atmIV * 100).toFixed(1) + '%' : '--';
  const hvDisplay = data.historicalVol !== null ? data.historicalVol.toFixed(1) + '%' : '--';
  const ivHvRatio =
    data.atmIV !== null && data.historicalVol !== null && data.historicalVol > 0
      ? (data.atmIV * 100 / data.historicalVol).toFixed(2)
      : '--';

  // 25-delta skew: difference between OTM put IV and OTM call IV near ~0.9 and ~1.1 moneyness
  const skew25d = useMemo(() => {
    if (data.expirations.length === 0) return '--';
    const nearest = data.expirations[0];
    const putSide = nearest.skew.find(
      (s) => s.moneyness >= 0.9 && s.moneyness <= 0.95 && s.putIV !== null,
    );
    const callSide = nearest.skew.find(
      (s) => s.moneyness >= 1.05 && s.moneyness <= 1.1 && s.callIV !== null,
    );
    if (putSide?.putIV != null && callSide?.callIV != null) {
      return ((putSide.putIV - callSide.callIV) * 100).toFixed(1) + '%';
    }
    return '--';
  }, [data]);

  // Put/Call IV spread at ATM
  const pcSpread = useMemo(() => {
    if (data.expirations.length === 0) return '--';
    const nearest = data.expirations[0];
    const atm = nearest.skew.reduce<SkewPoint | null>((best, s) => {
      if (!best) return s;
      return Math.abs(s.moneyness - 1) < Math.abs(best.moneyness - 1) ? s : best;
    }, null);
    if (atm && atm.putIV !== null && atm.callIV !== null) {
      return ((atm.putIV - atm.callIV) * 100).toFixed(2) + '%';
    }
    return '--';
  }, [data]);

  return (
    <div className="border-b border-border/20">
      {/* Top row: symbol and main badges */}
      <div className="px-3 py-2 flex items-center gap-3 flex-wrap">
        <div>
          <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">
            {tr('ivSpotPrice', 'Spot')}
          </div>
          <div className="text-[14px] font-black font-mono text-white leading-none">
            {data.symbol}{' '}
            <span className="text-cyan-400">${data.spotPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* ATM IV badge */}
        <div className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20">
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
            ATM IV
          </div>
          <div className="text-[11px] font-mono font-black text-cyan-400">
            {atmDisplay}
          </div>
        </div>

        {/* IV Percentile badge */}
        <div className="px-2 py-1 bg-white/[0.02] border border-border/20">
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
            {tr('ivPercentile', 'IV Percentile')}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-2 bg-white/[0.03] overflow-hidden">
              <div
                className={`h-full ${pctBarColor(data.ivPercentile)}`}
                style={{ width: `${data.ivPercentile}%` }}
              />
            </div>
            <span className={`text-[10px] font-mono font-black ${pctColor(data.ivPercentile)}`}>
              {data.ivPercentile}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div className="px-3 pb-2 flex items-center gap-4 flex-wrap">
        {[
          { label: 'IV/HV', value: ivHvRatio },
          { label: tr('ivSkew25d', 'Skew 25d'), value: skew25d },
          { label: tr('ivPCSpread', 'P/C Spread'), value: pcSpread },
          { label: 'HV', value: hvDisplay },
        ].map((m) => (
          <div key={m.label} className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
              {m.label}
            </span>
            <span className="text-[9px] font-mono font-bold text-white">{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab 1: Volatility Surface (Heatmap) ──

function VolSurface({
  data,
  tr,
}: {
  data: IVSurfaceData;
  tr: (key: string, fallback: string) => string;
}) {
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    iv: number;
    strike: number;
    dte: number;
  } | null>(null);

  // Build unified moneyness grid
  const { grid, moneynessSteps, allIVs } = useMemo(() => {
    const steps = new Set<number>();
    for (const exp of data.expirations) {
      for (const s of exp.skew) {
        steps.add(s.moneyness);
      }
    }
    const sorted = [...steps].sort((a, b) => a - b);

    // Build grid: [expIdx][moneynessIdx] = avgIV
    const g: (number | null)[][] = [];
    const ivs: number[] = [];

    for (let ei = 0; ei < data.expirations.length; ei++) {
      const row: (number | null)[] = [];
      const exp = data.expirations[ei];
      const skewMap = new Map<number, number>();
      for (const s of exp.skew) {
        const avg =
          s.callIV !== null && s.putIV !== null
            ? (s.callIV + s.putIV) / 2
            : s.callIV ?? s.putIV;
        if (avg !== null) skewMap.set(s.moneyness, avg);
      }

      for (const m of sorted) {
        const iv = skewMap.get(m) ?? null;
        row.push(iv);
        if (iv !== null) ivs.push(iv);
      }
      g.push(row);
    }

    return { grid: g, moneynessSteps: sorted, allIVs: ivs };
  }, [data]);

  if (data.expirations.length === 0 || moneynessSteps.length === 0) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        {tr('ivNoData', 'No IV data available')}
      </div>
    );
  }

  const minIV = allIVs.length > 0 ? Math.min(...allIVs) : 0;
  const maxIV = allIVs.length > 0 ? Math.max(...allIVs) : 1;

  const W = 400;
  const H = 200;
  const PAD_L = 55;
  const PAD_R = 15;
  const PAD_T = 15;
  const PAD_B = 30;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const cols = moneynessSteps.length;
  const rows = data.expirations.length;
  const cellW = plotW / cols;
  const cellH = plotH / rows;

  // X labels: show ~8 moneyness labels
  const xLabelStep = Math.max(1, Math.floor(cols / 8));

  return (
    <div className="px-3 py-3">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr('ivVolSurface', 'Implied Volatility Surface')}
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ maxHeight: 240 }}
          onMouseLeave={() => setHover(null)}
        >
          {/* Heatmap cells */}
          {grid.map((row, ei) =>
            row.map((iv, mi) => {
              if (iv === null) return null;
              const x = PAD_L + mi * cellW;
              const y = PAD_T + ei * cellH;
              return (
                <rect
                  key={`${ei}-${mi}`}
                  x={x}
                  y={y}
                  width={cellW + 0.5}
                  height={cellH + 0.5}
                  fill={ivToColor(iv, minIV, maxIV)}
                  opacity={0.85}
                  onMouseEnter={() =>
                    setHover({
                      x: x + cellW / 2,
                      y: y,
                      iv,
                      strike: Math.round(moneynessSteps[mi] * data.spotPrice * 100) / 100,
                      dte: data.expirations[ei].daysToExpiry,
                    })
                  }
                />
              );
            }),
          )}

          {/* ATM vertical line */}
          {(() => {
            const atmIdx = moneynessSteps.findIndex((m) => m >= 1.0);
            if (atmIdx < 0) return null;
            const x = PAD_L + atmIdx * cellW;
            return (
              <line
                x1={x}
                y1={PAD_T}
                x2={x}
                y2={PAD_T + plotH}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={1}
                strokeDasharray="3,2"
              />
            );
          })()}

          {/* Y-axis labels (DTE) */}
          {data.expirations.map((exp, i) => (
            <text
              key={i}
              x={PAD_L - 4}
              y={PAD_T + i * cellH + cellH / 2 + 3}
              textAnchor="end"
              fill="rgba(255,255,255,0.35)"
              fontSize={7}
              fontFamily="monospace"
            >
              {exp.daysToExpiry}d
            </text>
          ))}

          {/* X-axis labels (moneyness) */}
          {moneynessSteps.map((m, i) => {
            if (i % xLabelStep !== 0 && i !== cols - 1) return null;
            return (
              <text
                key={i}
                x={PAD_L + i * cellW + cellW / 2}
                y={H - 8}
                textAnchor="middle"
                fill="rgba(255,255,255,0.35)"
                fontSize={6.5}
                fontFamily="monospace"
              >
                {m.toFixed(2)}
              </text>
            );
          })}

          {/* Axis labels */}
          <text
            x={PAD_L - 4}
            y={8}
            textAnchor="end"
            fill="rgba(255,255,255,0.25)"
            fontSize={6}
            fontFamily="monospace"
          >
            DTE
          </text>
          <text
            x={W / 2}
            y={H - 1}
            textAnchor="middle"
            fill="rgba(255,255,255,0.25)"
            fontSize={6}
            fontFamily="monospace"
          >
            {tr('ivMoneyness', 'MONEYNESS (K/S)')}
          </text>

          {/* Hover tooltip */}
          {hover && (
            <g>
              <rect
                x={Math.min(hover.x, W - 80)}
                y={Math.max(hover.y - 28, 2)}
                width={75}
                height={24}
                fill="rgba(0,0,0,0.9)"
                stroke="rgba(34,211,238,0.4)"
                strokeWidth={0.5}
              />
              <text
                x={Math.min(hover.x, W - 80) + 4}
                y={Math.max(hover.y - 28, 2) + 10}
                fill="#22d3ee"
                fontSize={7}
                fontFamily="monospace"
                fontWeight="bold"
              >
                IV: {(hover.iv * 100).toFixed(1)}%
              </text>
              <text
                x={Math.min(hover.x, W - 80) + 4}
                y={Math.max(hover.y - 28, 2) + 20}
                fill="rgba(255,255,255,0.5)"
                fontSize={6}
                fontFamily="monospace"
              >
                K=${hover.strike} {hover.dte}d
              </text>
            </g>
          )}
        </svg>

        {/* Color legend */}
        <div className="flex items-center gap-1 mt-1.5 justify-center">
          <span className="text-[7px] font-mono text-neutral/30">
            {(minIV * 100).toFixed(0)}%
          </span>
          <div
            className="w-24 h-2"
            style={{
              background: `linear-gradient(to right, ${ivToColor(minIV, minIV, maxIV)}, ${ivToColor((minIV + maxIV) / 2, minIV, maxIV)}, ${ivToColor(maxIV, minIV, maxIV)})`,
            }}
          />
          <span className="text-[7px] font-mono text-neutral/30">
            {(maxIV * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Skew Curves ──

function SkewCurves({
  data,
  tr,
}: {
  data: IVSurfaceData;
  tr: (key: string, fallback: string) => string;
}) {
  const [hoveredExp, setHoveredExp] = useState<number | null>(null);

  const { allPoints, minY, maxY, minX, maxX } = useMemo(() => {
    let yMin = Infinity;
    let yMax = -Infinity;
    let xMin = Infinity;
    let xMax = -Infinity;

    const pts: Array<{
      expIdx: number;
      moneyness: number;
      iv: number;
    }>[] = [];

    for (let ei = 0; ei < data.expirations.length; ei++) {
      const exp = data.expirations[ei];
      const line: Array<{ expIdx: number; moneyness: number; iv: number }> = [];
      for (const s of exp.skew) {
        const avg =
          s.callIV !== null && s.putIV !== null
            ? (s.callIV + s.putIV) / 2
            : s.callIV ?? s.putIV;
        if (avg === null) continue;
        line.push({ expIdx: ei, moneyness: s.moneyness, iv: avg });
        if (avg < yMin) yMin = avg;
        if (avg > yMax) yMax = avg;
        if (s.moneyness < xMin) xMin = s.moneyness;
        if (s.moneyness > xMax) xMax = s.moneyness;
      }
      pts.push(line);
    }

    // Add padding
    const pad = (yMax - yMin) * 0.1 || 0.01;
    return {
      allPoints: pts,
      minY: yMin - pad,
      maxY: yMax + pad,
      minX: Math.max(0.8, xMin - 0.01),
      maxX: Math.min(1.2, xMax + 0.01),
    };
  }, [data]);

  if (allPoints.every((p) => p.length === 0)) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        {tr('ivNoData', 'No IV data available')}
      </div>
    );
  }

  const W = 400;
  const H = 200;
  const PAD_L = 45;
  const PAD_R = 15;
  const PAD_T = 15;
  const PAD_B = 25;

  const scaleX = (m: number) =>
    PAD_L + ((m - minX) / (maxX - minX)) * (W - PAD_L - PAD_R);
  const scaleY = (iv: number) =>
    PAD_T + ((maxY - iv) / (maxY - minY)) * (H - PAD_T - PAD_B);

  // Y-axis ticks
  const yRange = maxY - minY;
  const yStep = yRange > 0.2 ? 0.05 : yRange > 0.1 ? 0.02 : 0.01;
  const yTicks: number[] = [];
  for (let v = Math.ceil(minY / yStep) * yStep; v <= maxY; v += yStep) {
    yTicks.push(v);
  }

  // X-axis ticks
  const xTicks: number[] = [];
  for (let v = Math.ceil(minX * 20) / 20; v <= maxX; v += 0.05) {
    xTicks.push(Math.round(v * 100) / 100);
  }

  return (
    <div className="px-3 py-3">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr('ivSkewCurves', 'IV Skew Curves by Expiration')}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 240 }}
      >
        {/* Grid */}
        {yTicks.map((v, i) => (
          <g key={`y-${i}`}>
            <line
              x1={PAD_L}
              y1={scaleY(v)}
              x2={W - PAD_R}
              y2={scaleY(v)}
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="2,2"
            />
            <text
              x={PAD_L - 4}
              y={scaleY(v) + 3}
              textAnchor="end"
              fill="rgba(255,255,255,0.25)"
              fontSize={6.5}
              fontFamily="monospace"
            >
              {(v * 100).toFixed(0)}%
            </text>
          </g>
        ))}
        {xTicks.map((v, i) => (
          <g key={`x-${i}`}>
            <line
              x1={scaleX(v)}
              y1={PAD_T}
              x2={scaleX(v)}
              y2={H - PAD_B}
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="2,2"
            />
            <text
              x={scaleX(v)}
              y={H - 8}
              textAnchor="middle"
              fill="rgba(255,255,255,0.25)"
              fontSize={6.5}
              fontFamily="monospace"
            >
              {v.toFixed(2)}
            </text>
          </g>
        ))}

        {/* ATM vertical line */}
        <line
          x1={scaleX(1.0)}
          y1={PAD_T}
          x2={scaleX(1.0)}
          y2={H - PAD_B}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1}
          strokeDasharray="4,2"
        />
        <text
          x={scaleX(1.0)}
          y={PAD_T - 4}
          textAnchor="middle"
          fill="rgba(255,255,255,0.3)"
          fontSize={6}
          fontFamily="monospace"
        >
          ATM
        </text>

        {/* Skew lines */}
        {allPoints.map((line, ei) => {
          if (line.length < 2) return null;
          const color = EXPIRY_COLORS[ei % EXPIRY_COLORS.length];
          const pathD = line
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.moneyness)},${scaleY(p.iv)}`)
            .join(' ');
          const isHovered = hoveredExp === ei;
          return (
            <g key={ei}>
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={isHovered ? 2.5 : 1.5}
                opacity={hoveredExp === null || isHovered ? 0.85 : 0.25}
              />
              {/* Data points */}
              {line.map((p, pi) => (
                <circle
                  key={pi}
                  cx={scaleX(p.moneyness)}
                  cy={scaleY(p.iv)}
                  r={isHovered ? 2.5 : 1.5}
                  fill={color}
                  opacity={hoveredExp === null || isHovered ? 1 : 0.3}
                />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 px-1">
        {data.expirations.map((exp, i) => (
          <button
            key={i}
            className="flex items-center gap-1 transition-opacity"
            style={{
              opacity: hoveredExp === null || hoveredExp === i ? 1 : 0.3,
            }}
            onMouseEnter={() => setHoveredExp(i)}
            onMouseLeave={() => setHoveredExp(null)}
          >
            <div
              className="w-2.5 h-1"
              style={{ backgroundColor: EXPIRY_COLORS[i % EXPIRY_COLORS.length] }}
            />
            <span className="text-[7px] font-mono text-neutral/50">
              {exp.date} ({exp.daysToExpiry}d)
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Tab 3: Term Structure ──

function TermStructureChart({
  data,
  tr,
}: {
  data: IVSurfaceData;
  tr: (key: string, fallback: string) => string;
}) {
  const { termStructure, historicalVol } = data;

  if (termStructure.length < 2) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        {tr('ivNoTermData', 'Insufficient term structure data')}
      </div>
    );
  }

  const W = 400;
  const H = 180;
  const PAD_L = 45;
  const PAD_R = 20;
  const PAD_T = 20;
  const PAD_B = 30;

  const values = termStructure.map((p) => p.atmIV);
  const allVals = historicalVol !== null ? [...values, historicalVol / 100] : values;
  const minY = Math.max(0, Math.min(...allVals) - 0.02);
  const maxY = Math.max(...allVals) + 0.02;

  const minX = termStructure[0].daysToExpiry;
  const maxX = termStructure[termStructure.length - 1].daysToExpiry;
  const xRange = maxX - minX || 1;

  const scaleX = (d: number) =>
    PAD_L + ((d - minX) / xRange) * (W - PAD_L - PAD_R);
  const scaleY = (v: number) =>
    PAD_T + ((maxY - v) / (maxY - minY)) * (H - PAD_T - PAD_B);

  const points = termStructure.map((p) => ({
    x: scaleX(p.daysToExpiry),
    y: scaleY(p.atmIV),
    ...p,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`)
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x},${H - PAD_B} L ${points[0].x},${H - PAD_B} Z`;

  // Contango check
  const isContango =
    termStructure.length >= 2 &&
    termStructure[termStructure.length - 1].atmIV >
      termStructure[0].atmIV;
  const lineColor = isContango ? '#22d3ee' : '#f87171';
  const areaFill = isContango ? 'rgba(34,211,238,0.08)' : 'rgba(248,113,113,0.08)';

  // Y ticks
  const yStep = (maxY - minY) > 0.1 ? 0.05 : 0.02;
  const yTicks: number[] = [];
  for (let v = Math.ceil(minY / yStep) * yStep; v <= maxY; v += yStep) {
    yTicks.push(v);
  }

  return (
    <div className="px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40">
          {tr('ivATMTermStructure', 'ATM IV Term Structure')}
        </div>
        <span
          className={`text-[8px] font-mono font-bold px-1.5 py-0.5 border ${
            isContango
              ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
              : 'text-red-400 bg-red-500/10 border-red-500/20'
          }`}
        >
          {isContango
            ? tr('ivContango', 'CONTANGO')
            : tr('ivBackwardation', 'BACKWARDATION')}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 220 }}
      >
        {/* Grid */}
        {yTicks.map((v, i) => (
          <g key={`y-${i}`}>
            <line
              x1={PAD_L}
              y1={scaleY(v)}
              x2={W - PAD_R}
              y2={scaleY(v)}
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="2,2"
            />
            <text
              x={PAD_L - 4}
              y={scaleY(v) + 3}
              textAnchor="end"
              fill="rgba(255,255,255,0.25)"
              fontSize={6.5}
              fontFamily="monospace"
            >
              {(v * 100).toFixed(0)}%
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaD} fill={areaFill} />

        {/* IV line */}
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth={2} />

        {/* HV line overlay */}
        {historicalVol !== null && (
          <>
            <line
              x1={PAD_L}
              y1={scaleY(historicalVol / 100)}
              x2={W - PAD_R}
              y2={scaleY(historicalVol / 100)}
              stroke="#a78bfa"
              strokeWidth={1}
              strokeDasharray="4,3"
              opacity={0.6}
            />
            <text
              x={W - PAD_R + 2}
              y={scaleY(historicalVol / 100) + 3}
              fill="#a78bfa"
              fontSize={6}
              fontFamily="monospace"
              opacity={0.7}
            >
              HV
            </text>
          </>
        )}

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill={lineColor} />
            <circle cx={p.x} cy={p.y} r={2} fill="#000" />
            {/* Value label */}
            <text
              x={p.x}
              y={p.y - 7}
              textAnchor="middle"
              fill="rgba(255,255,255,0.7)"
              fontSize={7}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {(p.atmIV * 100).toFixed(1)}%
            </text>
            {/* DTE label */}
            <text
              x={p.x}
              y={H - 10}
              textAnchor="middle"
              fill="rgba(255,255,255,0.35)"
              fontSize={7}
              fontFamily="monospace"
            >
              {p.daysToExpiry}d
            </text>
          </g>
        ))}
      </svg>

      {/* Annotation */}
      <div className="mt-2 px-1">
        <div className="text-[7px] font-mono text-neutral/30">
          {isContango
            ? tr(
                'ivContangoNote',
                'Normal term structure (upward slope) indicates stable conditions.',
              )
            : tr(
                'ivBackwardationNote',
                'Inverted term structure may indicate upcoming event or elevated near-term risk.',
              )}
        </div>
      </div>

      {/* Expiration details table */}
      <div className="mt-3">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-1">
          {tr('ivExpirationDetails', 'Expiration Details')}
        </div>
        <div className="grid grid-cols-[1fr_0.6fr_0.8fr_0.8fr] px-0 py-0.5 border-b border-border/10 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
          <span>{tr('ivDate', 'Date')}</span>
          <span className="text-right">DTE</span>
          <span className="text-right">ATM IV</span>
          <span className="text-right">{tr('ivStrikes', 'Strikes')}</span>
        </div>
        {data.expirations.map((exp, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_0.6fr_0.8fr_0.8fr] px-0 py-1 border-b border-border/10 hover:bg-white/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono text-white">{exp.date}</span>
            <span className="text-[9px] font-mono text-neutral/50 text-right">
              {exp.daysToExpiry}
            </span>
            <span className="text-[9px] font-mono font-bold text-cyan-400 text-right">
              {exp.atmIV !== null ? (exp.atmIV * 100).toFixed(1) + '%' : '--'}
            </span>
            <span className="text-[9px] font-mono text-neutral/50 text-right">
              {exp.skew.length}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
