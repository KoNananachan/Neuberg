import { useState, useMemo, useCallback } from 'react';
import { useCommodityCurve } from '../../api/hooks/use-commodity-curve';
import { useT } from '../../i18n';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Safe translation helper with fallback
function useTr() {
  const t = useT();
  return (key: string, fallback: string) => {
    try {
      return (t as (k: string) => string)(key) || fallback;
    } catch {
      return fallback;
    }
  };
}

// -- Formatting helpers --

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  if (n >= 1000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toLocaleString();
}

function fmtSigned(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

// -- Color helpers --

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral/40';
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral/40';
}

function structureLabel(s: string | null | undefined): string {
  const v = (s ?? '').toLowerCase();
  if (v.includes('contango')) return 'CONTANGO';
  if (v.includes('backwardation') || v.includes('backw')) return 'BACKW';
  return 'FLAT';
}

function structureColor(s: string | null | undefined): {
  text: string;
  bg: string;
  border: string;
} {
  const v = (s ?? '').toLowerCase();
  if (v.includes('contango'))
    return {
      text: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
    };
  if (v.includes('backwardation') || v.includes('backw'))
    return {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
    };
  return {
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
  };
}

// ────────────────────────────────────────────────────
// Main Panel
// ────────────────────────────────────────────────────

export function CommodityCurvePanel() {
  const tr = useTr();
  const { data, isLoading, error, refetch } = useCommodityCurve();
  const [selected, setSelected] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commodities: any[] = data?.commodities ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inventory: any[] = data?.inventory ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seasonal: any[] = data?.seasonal ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openInterest: any[] = data?.openInterest ?? [];
  const structureSummary = data?.structureSummary;

  const selectedCommodity = useMemo(() => {
    if (commodities.length === 0) return null;
    return (
      commodities.find(
        (c: { id?: string; symbol?: string }) =>
          (c.id ?? c.symbol) === selected
      ) || commodities[0]
    );
  }, [commodities, selected]);

  const summaryStats = useMemo(() => {
    if (structureSummary) {
      return {
        contango: structureSummary.contango ?? 0,
        backwardation: structureSummary.backwardation ?? 0,
        flat: structureSummary.flat ?? 0,
      };
    }
    let contango = 0;
    let backwardation = 0;
    let flat = 0;
    for (const c of commodities) {
      const s = (c.structure ?? '').toLowerCase();
      if (s.includes('contango')) contango++;
      else if (s.includes('backwardation') || s.includes('backw'))
        backwardation++;
      else flat++;
    }
    return { contango, backwardation, flat };
  }, [commodities, structureSummary]);

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col bg-black overflow-hidden">
        <Header tr={tr} isLoading={true} onRefresh={() => refetch()} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[9px] font-mono text-orange-400 uppercase tracking-widest animate-pulse">
            LOADING COMMODITY CURVE DATA...
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="h-full flex flex-col bg-black overflow-hidden">
        <Header tr={tr} isLoading={false} onRefresh={() => refetch()} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
            {tr('error', 'FAILED TO LOAD COMMODITY CURVE DATA')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <Header
        tr={tr}
        isLoading={isLoading}
        onRefresh={() => refetch()}
      />

      {/* Structure summary bar */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border/20 bg-[#030303] shrink-0 text-[8px] font-mono">
        <span className="text-red-400">
          {summaryStats.contango} CONTANGO
        </span>
        <span className="text-emerald-400">
          {summaryStats.backwardation} BACKW
        </span>
        {summaryStats.flat > 0 && (
          <span className="text-yellow-400">
            {summaryStats.flat} FLAT
          </span>
        )}
        <span className="ml-auto text-neutral/25">
          {commodities.length} commodities
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Commodity overview table */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/20">
            <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">
              CURVE OVERVIEW
            </span>
          </div>
          <div className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
            <span>COMMODITY</span>
            <span className="text-right">SPOT</span>
            <span className="text-center">STRUCTURE</span>
            <span className="text-right">ROLL YLD</span>
            <span className="text-right">CAL SPREAD</span>
          </div>

          {commodities.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c: any, i: number) => {
              const id = c.id ?? c.symbol ?? `c-${i}`;
              const isSelected = (selectedCommodity?.id ?? selectedCommodity?.symbol) === id;
              const sc = structureColor(c.structure);

              return (
                <div
                  key={id}
                  onClick={() => setSelected(id)}
                  className={`grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_0.7fr] px-3 py-1.5 border-b border-border/10 transition-colors cursor-pointer hover:bg-orange-400/[0.02] ${
                    isSelected
                      ? 'bg-orange-400/[0.04]'
                      : i % 2 === 0
                        ? 'bg-black'
                        : 'bg-white/[0.01]'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono font-bold text-orange-400">
                      {c.id ?? c.symbol}
                    </span>
                    <span className="text-[7px] font-mono text-neutral/30">
                      {c.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-white text-right self-center">
                    {fmtPrice(c.spotPrice ?? c.spot)}
                  </span>
                  <div className="flex items-center justify-center self-center">
                    <span
                      className={`text-[7px] font-mono font-black px-1.5 py-0.5 uppercase border ${sc.text} ${sc.bg} ${sc.border}`}
                    >
                      {structureLabel(c.structure)}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-mono font-bold text-right self-center ${changeColor(c.annualizedRoll ?? c.rollYield)}`}
                  >
                    {fmtPct(c.annualizedRoll ?? c.rollYield)}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold text-right self-center ${changeColor(c.calendarSpread ?? c.spread12 ?? c.spreadFrontBack)}`}
                  >
                    {fmtSigned(
                      c.calendarSpread ?? c.spread12 ?? c.spreadFrontBack
                    )}
                  </span>
                </div>
              );
            }
          )}
        </div>

        {/* Selected commodity detail: term structure chart */}
        {selectedCommodity && selectedCommodity.curve && selectedCommodity.curve.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/20 flex items-center gap-2">
              <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">
                TERM STRUCTURE
              </span>
              <span className="text-[8px] font-mono font-bold text-orange-400">
                {selectedCommodity.id ?? selectedCommodity.symbol}
              </span>
              {(() => {
                const sc = structureColor(selectedCommodity.structure);
                return (
                  <span
                    className={`text-[7px] font-mono font-black px-1 py-px uppercase border ${sc.text} ${sc.bg} ${sc.border}`}
                  >
                    {structureLabel(selectedCommodity.structure)}
                  </span>
                );
              })()}
            </div>
            <div className="px-3 pt-3 pb-1">
              <TermStructureChart
                curve={selectedCommodity.curve}
                spotPrice={selectedCommodity.spotPrice ?? selectedCommodity.spot}
                structure={selectedCommodity.structure}
              />
            </div>
          </div>
        )}

        {/* Inventory data section */}
        {inventory.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/20">
              <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">
                INVENTORY DATA
              </span>
            </div>
            <div className="grid grid-cols-[1.2fr_0.8fr_0.6fr_0.8fr_1fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
              <span>COMMODITY</span>
              <span className="text-right">CURRENT</span>
              <span className="text-right">CHG</span>
              <span className="text-right">5YR AVG</span>
              <span className="text-right">PERCENTILE</span>
            </div>

            {inventory.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (inv: any, i: number) => {
                const pct = inv.percentile ?? 0;
                return (
                  <div
                    key={inv.commodity ?? inv.id ?? i}
                    className={`grid grid-cols-[1.2fr_0.8fr_0.6fr_0.8fr_1fr] px-3 py-1.5 border-b border-border/10 transition-colors hover:bg-orange-400/[0.02] ${
                      i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
                    }`}
                  >
                    <span className="text-[9px] font-mono font-bold text-orange-400 self-center">
                      {inv.commodity ?? inv.id}
                    </span>
                    <span className="text-[9px] font-mono text-white/80 text-right self-center">
                      {fmtNum(inv.current ?? inv.level)}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold text-right self-center ${changeColor(inv.change)}`}
                    >
                      {fmtPct(inv.change)}
                    </span>
                    <span className="text-[9px] font-mono text-neutral/50 text-right self-center">
                      {fmtNum(inv.fiveYearAvg ?? inv.avg5yr)}
                    </span>
                    <div className="flex items-center gap-1.5 justify-end self-center">
                      <div className="w-16 h-1.5 bg-white/[0.04] relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-orange-400/50"
                          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                        />
                      </div>
                      <span className="text-[8px] font-mono text-orange-300/70 w-8 text-right">
                        {pct != null ? `${Math.round(pct)}%` : '-'}
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}

        {/* Seasonal patterns section */}
        {seasonal.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/20">
              <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">
                SEASONAL PATTERNS
              </span>
            </div>
            <div className="grid grid-cols-[1.2fr_0.6fr_0.6fr_0.8fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
              <span>COMMODITY</span>
              <span className="text-center">TYP HIGH</span>
              <span className="text-center">TYP LOW</span>
              <span className="text-right">VS SEASONAL</span>
            </div>

            {seasonal.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (s: any, i: number) => (
                <div
                  key={s.commodity ?? s.id ?? i}
                  className={`grid grid-cols-[1.2fr_0.6fr_0.6fr_0.8fr] px-3 py-1.5 border-b border-border/10 transition-colors hover:bg-orange-400/[0.02] ${
                    i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
                  }`}
                >
                  <span className="text-[9px] font-mono font-bold text-orange-400 self-center">
                    {s.commodity ?? s.id}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400/70 text-center self-center">
                    {s.typicalHigh ?? s.highMonth ?? '-'}
                  </span>
                  <span className="text-[9px] font-mono text-red-400/70 text-center self-center">
                    {s.typicalLow ?? s.lowMonth ?? '-'}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold text-right self-center ${changeColor(s.deviation ?? s.vsSeasonalAvg)}`}
                  >
                    {fmtPct(s.deviation ?? s.vsSeasonalAvg)}
                  </span>
                </div>
              )
            )}
          </div>
        )}

        {/* Open interest trend */}
        {openInterest.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/20">
              <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">
                OPEN INTEREST TREND
              </span>
            </div>

            {openInterest.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (oi: any, i: number) => (
                <div
                  key={oi.commodity ?? oi.id ?? i}
                  className={`px-3 py-2 border-b border-border/10 transition-colors hover:bg-orange-400/[0.02] ${
                    i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono font-bold text-orange-400">
                      {oi.commodity ?? oi.id}
                    </span>
                    <span className="text-[8px] font-mono text-neutral/40">
                      {fmtNum(oi.current ?? oi.latest)} contracts
                    </span>
                  </div>
                  {oi.history && oi.history.length > 1 && (
                    <OpenInterestMiniChart data={oi.history} />
                  )}
                </div>
              )
            )}
          </div>
        )}

        {/* Updated timestamp */}
        {data.updatedAt && (
          <div className="px-3 py-1.5 text-[7px] font-mono text-neutral/25 text-right">
            {new Date(data.updatedAt).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Header
// ────────────────────────────────────────────────────

function Header({
  tr,
  isLoading,
  onRefresh,
}: {
  tr: (key: string, fallback: string) => string;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-orange-400" />
        <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-orange-400">
          {tr('panelCommodityCurve', 'COMMODITY CURVES')}
        </span>
      </div>
      <button
        onClick={onRefresh}
        className="p-1 text-neutral/40 hover:text-orange-400 transition-colors"
      >
        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Term Structure SVG Chart (mini line chart)
// ────────────────────────────────────────────────────

function TermStructureChart({
  curve,
  spotPrice,
  structure,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  curve: any[];
  spotPrice?: number | null;
  structure?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (curve.length < 2) return null;

    const W = 400;
    const H = 160;
    const PAD_L = 44;
    const PAD_R = 14;
    const PAD_T = 18;
    const PAD_B = 28;

    const prices = curve.map((c) => c.price ?? c.value ?? 0);
    const allPrices =
      spotPrice != null ? [spotPrice, ...prices] : prices;
    const minP = Math.min(...allPrices);
    const maxP = Math.max(...allPrices);
    const padding = (maxP - minP) * 0.12 || 1;
    const yMin = minP - padding;
    const yMax = maxP + padding;

    const scaleX = (i: number) =>
      PAD_L + (i / (curve.length - 1)) * (W - PAD_L - PAD_R);
    const scaleY = (price: number) =>
      PAD_T + ((yMax - price) / (yMax - yMin)) * (H - PAD_T - PAD_B);

    const points = curve.map((c, i) => ({
      x: scaleX(i),
      y: scaleY(c.price ?? c.value ?? 0),
      data: c,
    }));

    // Cardinal spline
    const tension = 0.3;
    let pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
      const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
      const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
      const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;

      pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    // Area fill
    const fillPath = `${pathD} L ${points[points.length - 1].x},${H - PAD_B} L ${points[0].x},${H - PAD_B} Z`;

    // Y-axis ticks
    const yRange = yMax - yMin;
    const rawStep = yRange / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / mag;
    let yStep: number;
    if (normalized <= 1.5) yStep = mag;
    else if (normalized <= 3.5) yStep = 2 * mag;
    else if (normalized <= 7.5) yStep = 5 * mag;
    else yStep = 10 * mag;

    const yTicks: number[] = [];
    for (
      let v = Math.ceil(yMin / yStep) * yStep;
      v <= yMax;
      v += yStep
    ) {
      yTicks.push(Math.round(v * 100) / 100);
    }

    // Spot Y
    const spotY = spotPrice != null ? scaleY(spotPrice) : null;

    return {
      W,
      H,
      PAD_L,
      PAD_R,
      PAD_T,
      PAD_B,
      points,
      pathD,
      fillPath,
      yTicks,
      scaleY,
      spotY,
    };
  }, [curve, spotPrice]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!chart) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX =
        ((e.clientX - rect.left) / rect.width) * chart.W;
      let nearest = 0;
      let minDist = Infinity;
      for (let i = 0; i < chart.points.length; i++) {
        const d = Math.abs(chart.points[i].x - mouseX);
        if (d < minDist) {
          minDist = d;
          nearest = i;
        }
      }
      setHovered(nearest);
    },
    [chart]
  );

  if (!chart) return null;

  const {
    W,
    H,
    PAD_L,
    PAD_R,
    PAD_T,
    PAD_B,
    points,
    pathD,
    fillPath,
    yTicks,
    scaleY,
    spotY,
  } = chart;

  const isBackward =
    (structure ?? '').toLowerCase().includes('backwardation') ||
    (structure ?? '').toLowerCase().includes('backw');
  const gradientId = isBackward ? 'cc-fill-green' : 'cc-fill-orange';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ maxHeight: 180 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)}
    >
      <defs>
        <linearGradient id="cc-fill-orange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
        </linearGradient>
        <linearGradient id="cc-fill-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
        </linearGradient>
        <linearGradient id="cc-line-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>

      {/* Y-axis grid lines and labels */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PAD_L}
            y1={scaleY(v)}
            x2={W - PAD_R}
            y2={scaleY(v)}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="2,3"
          />
          <text
            x={PAD_L - 4}
            y={scaleY(v) + 3}
            textAnchor="end"
            fill="rgba(255,255,255,0.25)"
            fontSize={7}
            fontFamily="monospace"
          >
            {v.toFixed(2)}
          </text>
        </g>
      ))}

      {/* X-axis baseline */}
      <line
        x1={PAD_L}
        y1={H - PAD_B}
        x2={W - PAD_R}
        y2={H - PAD_B}
        stroke="rgba(255,255,255,0.08)"
      />

      {/* Spot price reference line */}
      {spotY != null && spotY >= PAD_T && spotY <= H - PAD_B && (
        <g>
          <line
            x1={PAD_L}
            y1={spotY}
            x2={W - PAD_R}
            y2={spotY}
            stroke="rgba(249,115,22,0.3)"
            strokeDasharray="4,3"
          />
          <text
            x={W - PAD_R + 2}
            y={spotY + 3}
            fill="rgba(249,115,22,0.5)"
            fontSize={6}
            fontFamily="monospace"
          >
            SPOT
          </text>
        </g>
      )}

      {/* Gradient fill */}
      <path d={fillPath} fill={`url(#${gradientId})`} />

      {/* Main curve line */}
      <path
        d={pathD}
        fill="none"
        stroke="url(#cc-line-grad)"
        strokeWidth={2}
      />

      {/* Data points and X-axis labels */}
      {points.map((p, i) => {
        const label =
          p.data.month ??
          p.data.contract ??
          p.data.label ??
          `M${i + 1}`;
        const shortLabel =
          typeof label === 'string' && label.length > 5
            ? label.slice(0, 5)
            : label;
        return (
          <g key={i}>
            <text
              x={p.x}
              y={H - PAD_B + 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize={6.5}
              fontFamily="monospace"
            >
              {shortLabel}
            </text>
            <line
              x1={p.x}
              y1={H - PAD_B}
              x2={p.x}
              y2={H - PAD_B + 3}
              stroke="rgba(255,255,255,0.15)"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={hovered === i ? 4 : 2.5}
              fill={hovered === i ? '#fb923c' : '#f97316'}
              stroke={hovered === i ? '#fff' : 'none'}
              strokeWidth={1}
            />
            {(i === 0 || i === points.length - 1) && hovered !== i && (
              <text
                x={p.x}
                y={p.y - 7}
                textAnchor="middle"
                fill="rgba(251,146,60,0.6)"
                fontSize={7}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {(p.data.price ?? p.data.value ?? 0).toFixed(2)}
              </text>
            )}
          </g>
        );
      })}

      {/* Hover tooltip */}
      {hovered !== null && points[hovered] && (
        <g>
          <line
            x1={points[hovered].x}
            y1={PAD_T}
            x2={points[hovered].x}
            y2={H - PAD_B}
            stroke="rgba(249,115,22,0.3)"
            strokeDasharray="3,3"
          />
          <rect
            x={Math.min(points[hovered].x - 36, W - PAD_R - 76)}
            y={Math.max(points[hovered].y - 30, PAD_T)}
            width={72}
            height={24}
            fill="rgba(0,0,0,0.9)"
            stroke="rgba(249,115,22,0.5)"
            strokeWidth={0.5}
          />
          <text
            x={Math.min(points[hovered].x, W - PAD_R - 40)}
            y={Math.max(points[hovered].y - 15, PAD_T + 11)}
            textAnchor="middle"
            fill="#fb923c"
            fontSize={8}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {points[hovered].data.month ??
              points[hovered].data.contract ??
              points[hovered].data.label ??
              `M${hovered + 1}`}
          </text>
          <text
            x={Math.min(points[hovered].x, W - PAD_R - 40)}
            y={Math.max(points[hovered].y - 6, PAD_T + 20)}
            textAnchor="middle"
            fill="#fdba74"
            fontSize={9}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {(
              points[hovered].data.price ??
              points[hovered].data.value ??
              0
            ).toFixed(2)}
          </text>
        </g>
      )}
    </svg>
  );
}

// ────────────────────────────────────────────────────
// Open Interest Mini Chart (SVG sparkline)
// ────────────────────────────────────────────────────

function OpenInterestMiniChart({
  data,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
}) {
  const chart = useMemo(() => {
    if (data.length < 2) return null;

    const W = 360;
    const H = 32;
    const PAD = 2;

    const values = data.map(
      (d) => d.value ?? d.openInterest ?? d.oi ?? 0
    );
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = maxV - minV || 1;

    const points = values.map((v, i) => ({
      x: PAD + (i / (values.length - 1)) * (W - PAD * 2),
      y: PAD + ((maxV - v) / range) * (H - PAD * 2),
    }));

    let pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x},${points[i].y}`;
    }

    const fillPath = `${pathD} L ${points[points.length - 1].x},${H} L ${points[0].x},${H} Z`;

    return { W, H, pathD, fillPath };
  }, [data]);

  if (!chart) return null;

  return (
    <svg
      viewBox={`0 0 ${chart.W} ${chart.H}`}
      className="w-full"
      style={{ maxHeight: 32 }}
    >
      <defs>
        <linearGradient id="oi-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity={0.15} />
          <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={chart.fillPath} fill="url(#oi-fill)" />
      <path
        d={chart.pathD}
        fill="none"
        stroke="#fb923c"
        strokeWidth={1.5}
        strokeOpacity={0.6}
      />
    </svg>
  );
}
