import { useState, useMemo } from 'react';
import { useSwapValuation } from '../../api/hooks/use-swap-valuation';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Types ──

interface SwapPosition {
  id: string;
  type: string;        // e.g. 'IRS', 'Basis', 'OIS', 'CCS'
  notional: number;
  fixedRate: number;
  floatingIndex: string; // e.g. 'SOFR', 'EURIBOR', 'TONAR'
  mtm: number;
  dv01: number;
  maturity: string;
  direction: 'pay' | 'receive';
}

interface PV01Bucket {
  tenor: string;
  pv01: number;
  notional: number;
  pctOfTotal: number;
}

interface DiscountCurvePoint {
  tenor: string;
  discountFactor: number;
  zeroRate: number;
  forwardRate: number;
  dailyChange: number;
}

interface GreeksSummary {
  totalDV01: number;
  gamma: number;
  theta: number;
  totalMTM: number;
  dailyPnL: number;
  positionCount: number;
  totalNotional: number;
  weightedFixedRate: number;
}

interface SwapValuationData {
  positions: SwapPosition[];
  pv01Ladder: PV01Bucket[];
  discountCurve: DiscountCurvePoint[];
  greeks: GreeksSummary;
  timestamp: string;
}

// ── Formatting helpers ──

function fmtNum(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return sign + (abs / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return sign + (abs / 1e3).toFixed(0) + 'K';
  return n.toFixed(0);
}

function fmtCurrency(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
  return (n < 0 ? '-$' : '$') + abs.toFixed(2);
}

function fmtPnL(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return sign + fmtCurrency(n);
}

// ── Color helpers ──

function pnlColor(n: number): string {
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Tabs ──

type Tab = 'positions' | 'pv01' | 'curve' | 'greeks';

// ── Main Panel ──

export function SwapValuationPanel() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('positions');
  const { data: rawData, isLoading, error, refetch } = useSwapValuation();
  const data = rawData as SwapValuationData | undefined;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'positions', label: tr(t, 'svPositions', 'Positions') },
    { key: 'pv01', label: tr(t, 'svPV01', 'PV01 Ladder') },
    { key: 'curve', label: tr(t, 'svCurve', 'Discount Curve') },
    { key: 'greeks', label: tr(t, 'svGreeks', 'Greeks') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {tr(t, 'svTitle', 'Swap Valuation')}
          </span>
          {data && (
            <span className="text-[7px] font-mono text-neutral-600">
              {data.greeks.positionCount} {tr(t, 'svSwaps', 'swaps')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className={`text-[8px] font-mono font-bold ${pnlColor(data.greeks.totalMTM)}`}>
              MTM {fmtPnL(data.greeks.totalMTM)}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-cyan-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === tb.key
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-neutral/40 hover:text-neutral'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-cyan-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'svError', 'Failed to load swap data')}
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'svNoData', 'No data available')}
          </div>
        )}

        {data && tab === 'positions' && <PositionsView positions={data.positions} t={t} />}
        {data && tab === 'pv01' && <PV01LadderView buckets={data.pv01Ladder} t={t} />}
        {data && tab === 'curve' && <DiscountCurveView curve={data.discountCurve} t={t} />}
        {data && tab === 'greeks' && <GreeksSummaryView greeks={data.greeks} positions={data.positions} t={t} />}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// 1. Portfolio Valuation (Positions)
// ────────────────────────────────────────────────────

function PositionsView({
  positions,
  t,
}: {
  positions: SwapPosition[];
  t: ReturnType<typeof useT>;
}) {
  const totalMTM = useMemo(() => positions.reduce((sum, p) => sum + p.mtm, 0), [positions]);
  const totalDV01 = useMemo(() => positions.reduce((sum, p) => sum + p.dv01, 0), [positions]);

  return (
    <div>
      {/* Summary strip */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 bg-[#030303]">
        <div className="flex gap-4">
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
              {tr(t, 'svTotalMTM', 'Total MTM')}
            </div>
            <div className={`text-[11px] font-mono font-black ${pnlColor(totalMTM)}`}>
              {fmtPnL(totalMTM)}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
              {tr(t, 'svTotalDV01', 'Total DV01')}
            </div>
            <div className="text-[11px] font-mono font-black text-cyan-400">
              {fmtCurrency(totalDV01)}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
              {tr(t, 'svPositionCount', 'Positions')}
            </div>
            <div className="text-[11px] font-mono font-black text-white">
              {positions.length}
            </div>
          </div>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[0.6fr_0.8fr_1fr_0.7fr_0.8fr_0.9fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
        <span>{tr(t, 'svType', 'Type')}</span>
        <span>{tr(t, 'svDirection', 'Dir')}</span>
        <span className="text-right">{tr(t, 'svNotional', 'Notional')}</span>
        <span className="text-right">{tr(t, 'svFixedRate', 'Fixed')}</span>
        <span>{tr(t, 'svFloatingIdx', 'Float Idx')}</span>
        <span className="text-right">{tr(t, 'svMTM', 'MTM')}</span>
        <span className="text-right">{tr(t, 'svDV01', 'DV01')}</span>
      </div>

      {/* Position rows */}
      {positions.map((pos, i) => (
        <div
          key={pos.id}
          className={`grid grid-cols-[0.6fr_0.8fr_1fr_0.7fr_0.8fr_0.9fr_0.7fr] px-3 py-1.5 border-b border-border/10 transition-colors hover:bg-cyan-400/[0.02] ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-white">{pos.type}</span>
          <span className={`text-[9px] font-mono font-bold ${pos.direction === 'pay' ? 'text-red-400' : 'text-emerald-400'}`}>
            {pos.direction === 'pay' ? 'PAY' : 'RCV'}
          </span>
          <span className="text-[9px] font-mono text-white text-right">{fmtCompact(pos.notional)}</span>
          <span className="text-[9px] font-mono text-cyan-300 text-right">{fmtNum(pos.fixedRate, 3)}%</span>
          <span className="text-[8px] font-mono text-neutral-400">{pos.floatingIndex}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${pnlColor(pos.mtm)}`}>
            {fmtCurrency(pos.mtm)}
          </span>
          <span className="text-[9px] font-mono text-cyan-400/70 text-right">{fmtCurrency(pos.dv01)}</span>
        </div>
      ))}

      {positions.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          {tr(t, 'svNoPositions', 'No swap positions')}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────
// 2. PV01 Ladder
// ────────────────────────────────────────────────────

function PV01LadderView({
  buckets,
  t,
}: {
  buckets: PV01Bucket[];
  t: ReturnType<typeof useT>;
}) {
  const maxAbsPV01 = useMemo(
    () => Math.max(...buckets.map((b) => Math.abs(b.pv01)), 1),
    [buckets],
  );

  const totalPV01 = useMemo(
    () => buckets.reduce((sum, b) => sum + b.pv01, 0),
    [buckets],
  );

  return (
    <div>
      {/* Summary strip */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 bg-[#030303]">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
            {tr(t, 'svNetPV01', 'Net PV01')}
          </div>
          <div className={`text-[11px] font-mono font-black ${pnlColor(totalPV01)}`}>
            {fmtCurrency(totalPV01)}
          </div>
        </div>
        <div className="text-[7px] font-mono text-neutral/30 uppercase">
          {tr(t, 'svRiskDistribution', 'Risk Distribution by Tenor')}
        </div>
      </div>

      {/* SVG bar chart */}
      <div className="px-3 pt-3 pb-1 border-b border-border/20">
        <PV01BarChart buckets={buckets} maxAbsPV01={maxAbsPV01} />
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_1.2fr_1fr_0.8fr_2fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
        <span>{tr(t, 'svTenor', 'Tenor')}</span>
        <span className="text-right">{tr(t, 'svPV01Val', 'PV01')}</span>
        <span className="text-right">{tr(t, 'svNotional', 'Notional')}</span>
        <span className="text-right">{tr(t, 'svPctTotal', '% Total')}</span>
        <span className="text-right">{tr(t, 'svBar', 'Distribution')}</span>
      </div>

      {/* Bucket rows */}
      {buckets.map((bucket, i) => {
        const barWidth = Math.abs(bucket.pv01) / maxAbsPV01;
        const isPositive = bucket.pv01 >= 0;

        return (
          <div
            key={bucket.tenor}
            className={`grid grid-cols-[1fr_1.2fr_1fr_0.8fr_2fr] px-3 py-1.5 border-b border-border/10 transition-colors hover:bg-cyan-400/[0.02] ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <span className="text-[9px] font-mono font-bold text-white">{bucket.tenor}</span>
            <span className={`text-[9px] font-mono font-bold text-right ${pnlColor(bucket.pv01)}`}>
              {fmtCurrency(bucket.pv01)}
            </span>
            <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtCompact(bucket.notional)}</span>
            <span className="text-[9px] font-mono text-neutral-500 text-right">{fmtNum(bucket.pctOfTotal, 1)}%</span>
            <div className="flex items-center justify-end gap-1">
              <div className="w-full h-3 bg-white/[0.02] relative">
                <div
                  className="absolute top-0 h-full"
                  style={{
                    width: `${(barWidth * 100).toFixed(1)}%`,
                    left: isPositive ? '50%' : undefined,
                    right: isPositive ? undefined : '50%',
                    background: isPositive
                      ? 'rgba(34,211,238,0.25)'
                      : 'rgba(248,113,113,0.25)',
                  }}
                />
                <div
                  className="absolute top-0 h-full w-px bg-neutral-600"
                  style={{ left: '50%' }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── PV01 Bar Chart (SVG) ──

function PV01BarChart({
  buckets,
  maxAbsPV01,
}: {
  buckets: PV01Bucket[];
  maxAbsPV01: number;
}) {
  const W = 380;
  const H = 120;
  const PAD_L = 40;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 24;

  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const barW = Math.min(innerW / buckets.length - 2, 28);
  const midY = PAD_T + innerH / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
      {/* Zero line */}
      <line
        x1={PAD_L}
        y1={midY}
        x2={W - PAD_R}
        y2={midY}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="0.5"
      />

      {/* Y-axis label */}
      <text x={PAD_L - 4} y={PAD_T + 3} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace">
        +{fmtCompact(maxAbsPV01)}
      </text>
      <text x={PAD_L - 4} y={PAD_T + innerH + 3} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace">
        -{fmtCompact(maxAbsPV01)}
      </text>

      {/* Bars */}
      {buckets.map((b, i) => {
        const x = PAD_L + (i / buckets.length) * innerW + (innerW / buckets.length - barW) / 2;
        const barH = (Math.abs(b.pv01) / maxAbsPV01) * (innerH / 2);
        const isPos = b.pv01 >= 0;
        const barY = isPos ? midY - barH : midY;

        return (
          <g key={b.tenor}>
            <rect
              x={x}
              y={barY}
              width={barW}
              height={Math.max(barH, 1)}
              fill={isPos ? 'rgba(34,211,238,0.4)' : 'rgba(248,113,113,0.4)'}
              stroke={isPos ? '#22d3ee' : '#f87171'}
              strokeWidth={0.5}
            />
            {/* Tenor label */}
            <text
              x={x + barW / 2}
              y={H - PAD_B + 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize={7}
              fontFamily="monospace"
            >
              {b.tenor}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ────────────────────────────────────────────────────
// 3. Discount Curve
// ────────────────────────────────────────────────────

function DiscountCurveView({
  curve,
  t,
}: {
  curve: DiscountCurvePoint[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      {/* Mini SVG chart of zero rates */}
      <div className="px-3 pt-3 pb-1 border-b border-border/20">
        <DiscountCurveChart curve={curve} />
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[0.8fr_1fr_1fr_1fr_0.8fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
        <span>{tr(t, 'svTenor', 'Tenor')}</span>
        <span className="text-right">{tr(t, 'svDiscountFactor', 'DF')}</span>
        <span className="text-right">{tr(t, 'svZeroRate', 'Zero Rate')}</span>
        <span className="text-right">{tr(t, 'svForwardRate', 'Fwd Rate')}</span>
        <span className="text-right">{tr(t, 'svDailyChg', 'Chg')}</span>
      </div>

      {/* Curve rows */}
      {curve.map((pt, i) => (
        <div
          key={pt.tenor}
          className={`grid grid-cols-[0.8fr_1fr_1fr_1fr_0.8fr] px-3 py-1.5 border-b border-border/10 transition-colors hover:bg-cyan-400/[0.02] ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-white">{pt.tenor}</span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">{fmtNum(pt.discountFactor, 6)}</span>
          <span className="text-[9px] font-mono text-cyan-300 text-right">{fmtNum(pt.zeroRate, 4)}%</span>
          <span className="text-[9px] font-mono text-cyan-400/70 text-right">{fmtNum(pt.forwardRate, 4)}%</span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(pt.dailyChange)}`}>
            {pt.dailyChange >= 0 ? '+' : ''}{fmtNum(pt.dailyChange, 2)}bp
          </span>
        </div>
      ))}

      {curve.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          {tr(t, 'svNoCurveData', 'No curve data')}
        </div>
      )}
    </div>
  );
}

// ── Discount Curve SVG Chart ──

function DiscountCurveChart({ curve }: { curve: DiscountCurvePoint[] }) {
  const chart = useMemo(() => {
    if (curve.length < 2) return null;

    const W = 380;
    const H = 130;
    const PAD_L = 38;
    const PAD_R = 12;
    const PAD_T = 14;
    const PAD_B = 24;

    const zeroRates = curve.map((c) => c.zeroRate);
    const fwdRates = curve.map((c) => c.forwardRate);
    const allRates = [...zeroRates, ...fwdRates];
    const minR = Math.min(...allRates) - 0.1;
    const maxR = Math.max(...allRates) + 0.1;

    const scaleX = (i: number) => PAD_L + (i / (curve.length - 1)) * (W - PAD_L - PAD_R);
    const scaleY = (r: number) => PAD_T + ((maxR - r) / (maxR - minR)) * (H - PAD_T - PAD_B);

    const zeroPath = curve
      .map((c, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(c.zeroRate).toFixed(1)}`)
      .join(' ');

    const fwdPath = curve
      .map((c, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(c.forwardRate).toFixed(1)}`)
      .join(' ');

    // Y ticks
    const yRange = maxR - minR;
    const yStep = yRange > 2 ? 0.5 : yRange > 1 ? 0.25 : 0.1;
    const yTicks: number[] = [];
    for (let v = Math.ceil(minR / yStep) * yStep; v <= maxR; v += yStep) {
      yTicks.push(Math.round(v * 1000) / 1000);
    }

    const points = curve.map((c, i) => ({
      x: scaleX(i),
      zY: scaleY(c.zeroRate),
      fY: scaleY(c.forwardRate),
      tenor: c.tenor,
    }));

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, zeroPath, fwdPath, yTicks, scaleY, points };
  }, [curve]);

  if (!chart) return null;

  const { W, H, PAD_L, PAD_R, PAD_B, zeroPath, fwdPath, yTicks, scaleY, points } = chart;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 150 }}>
      {/* Y grid + labels */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PAD_L} y1={scaleY(v)} x2={W - PAD_R} y2={scaleY(v)}
            stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3"
          />
          <text
            x={PAD_L - 4} y={scaleY(v) + 3}
            textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace"
          >
            {v.toFixed(2)}
          </text>
        </g>
      ))}

      {/* X baseline */}
      <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="rgba(255,255,255,0.08)" />

      {/* Forward rate line (dimmer) */}
      <path d={fwdPath} fill="none" stroke="rgba(251,191,36,0.5)" strokeWidth={1.5} strokeDasharray="4,2" />

      {/* Zero rate line (bright) */}
      <path d={zeroPath} fill="none" stroke="#22d3ee" strokeWidth={2} />

      {/* Data points + labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.zY} r={2} fill="#22d3ee" />
          <circle cx={p.x} cy={p.fY} r={1.5} fill="#fbbf24" opacity={0.6} />
          <text
            x={p.x} y={H - PAD_B + 12}
            textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={7} fontFamily="monospace"
          >
            {p.tenor}
          </text>
        </g>
      ))}

      {/* Legend */}
      <line x1={W - PAD_R - 80} y1={8} x2={W - PAD_R - 66} y2={8} stroke="#22d3ee" strokeWidth={1.5} />
      <text x={W - PAD_R - 63} y={11} fill="rgba(255,255,255,0.4)" fontSize={7} fontFamily="monospace">Zero</text>
      <line x1={W - PAD_R - 40} y1={8} x2={W - PAD_R - 26} y2={8} stroke="rgba(251,191,36,0.5)" strokeWidth={1.5} strokeDasharray="4,2" />
      <text x={W - PAD_R - 23} y={11} fill="rgba(255,255,255,0.4)" fontSize={7} fontFamily="monospace">Fwd</text>
    </svg>
  );
}

// ────────────────────────────────────────────────────
// 4. Greeks Summary
// ────────────────────────────────────────────────────

function GreeksSummaryView({
  greeks,
  positions,
  t,
}: {
  greeks: GreeksSummary;
  positions: SwapPosition[];
  t: ReturnType<typeof useT>;
}) {
  // Compute pay vs receive breakdown
  const payPositions = useMemo(() => positions.filter((p) => p.direction === 'pay'), [positions]);
  const rcvPositions = useMemo(() => positions.filter((p) => p.direction === 'receive'), [positions]);

  const payNotional = useMemo(() => payPositions.reduce((s, p) => s + p.notional, 0), [payPositions]);
  const rcvNotional = useMemo(() => rcvPositions.reduce((s, p) => s + p.notional, 0), [rcvPositions]);
  const payMTM = useMemo(() => payPositions.reduce((s, p) => s + p.mtm, 0), [payPositions]);
  const rcvMTM = useMemo(() => rcvPositions.reduce((s, p) => s + p.mtm, 0), [rcvPositions]);

  const metrics = [
    { label: tr(t, 'svTotalDV01', 'Total DV01'), value: fmtCurrency(greeks.totalDV01), color: 'text-cyan-400' },
    { label: tr(t, 'svGamma', 'Gamma'), value: fmtCurrency(greeks.gamma), color: 'text-purple-400' },
    { label: tr(t, 'svTheta', 'Theta'), value: fmtCurrency(greeks.theta) + '/d', color: 'text-amber-400' },
    { label: tr(t, 'svTotalMTM', 'Total MTM'), value: fmtPnL(greeks.totalMTM), color: pnlColor(greeks.totalMTM) },
    { label: tr(t, 'svDailyPnL', 'Daily P&L'), value: fmtPnL(greeks.dailyPnL), color: pnlColor(greeks.dailyPnL) },
    { label: tr(t, 'svTotalNotional', 'Total Notional'), value: fmtCompact(greeks.totalNotional), color: 'text-white' },
  ];

  return (
    <div>
      {/* Primary Greek Cards */}
      <div className="grid grid-cols-3 gap-px bg-border/10">
        {metrics.map((m) => (
          <div key={m.label} className="bg-black px-3 py-2">
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">{m.label}</div>
            <div className={`text-[13px] font-mono font-black ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Weighted Fixed Rate */}
      <div className="px-3 py-2 border-t border-border/20 border-b border-border/20 bg-[#030303]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
              {tr(t, 'svWeightedFixed', 'Wtd Avg Fixed Rate')}
            </div>
            <div className="text-[12px] font-mono font-black text-cyan-300">
              {fmtNum(greeks.weightedFixedRate, 4)}%
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
              {tr(t, 'svPositionCount', 'Positions')}
            </div>
            <div className="text-[12px] font-mono font-black text-white">
              {greeks.positionCount}
            </div>
          </div>
        </div>
      </div>

      {/* Pay vs Receive Breakdown */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'svPayRecvBreakdown', 'Pay / Receive Breakdown')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-px bg-border/10">
          {/* Pay side */}
          <div className="bg-black px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1 h-1 bg-red-400" />
              <span className="text-[8px] font-mono font-bold text-red-400 uppercase tracking-wider">
                {tr(t, 'svPayFixed', 'Pay Fixed')}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[8px] font-mono text-neutral-500">Count</span>
                <span className="text-[9px] font-mono text-white">{payPositions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[8px] font-mono text-neutral-500">Notional</span>
                <span className="text-[9px] font-mono text-white">{fmtCompact(payNotional)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[8px] font-mono text-neutral-500">MTM</span>
                <span className={`text-[9px] font-mono font-bold ${pnlColor(payMTM)}`}>{fmtPnL(payMTM)}</span>
              </div>
            </div>
          </div>

          {/* Receive side */}
          <div className="bg-black px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1 h-1 bg-emerald-400" />
              <span className="text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                {tr(t, 'svReceiveFixed', 'Receive Fixed')}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[8px] font-mono text-neutral-500">Count</span>
                <span className="text-[9px] font-mono text-white">{rcvPositions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[8px] font-mono text-neutral-500">Notional</span>
                <span className="text-[9px] font-mono text-white">{fmtCompact(rcvNotional)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[8px] font-mono text-neutral-500">MTM</span>
                <span className={`text-[9px] font-mono font-bold ${pnlColor(rcvMTM)}`}>{fmtPnL(rcvMTM)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Net Exposure Bar */}
      <div className="px-3 py-2">
        <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-1">
          {tr(t, 'svNetExposure', 'Net Directional Exposure')}
        </div>
        <div className="h-4 bg-white/[0.02] relative overflow-hidden">
          {payNotional + rcvNotional > 0 && (
            <>
              <div
                className="absolute top-0 left-0 h-full bg-red-400/20 border-r border-red-400/40"
                style={{ width: `${((payNotional / (payNotional + rcvNotional)) * 100).toFixed(1)}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[8px] font-mono font-bold text-white">
                  PAY {((payNotional / (payNotional + rcvNotional)) * 100).toFixed(0)}%
                  {' / '}
                  RCV {((rcvNotional / (payNotional + rcvNotional)) * 100).toFixed(0)}%
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
