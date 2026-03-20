import { useRiskScenarioAnalysis } from '../../api/hooks/use-risk-scenario-analysis';
import { useT, tr, TFn } from '../../i18n';
import { ShieldAlert, RefreshCw } from 'lucide-react';

// i18n fallback helper
// ── Color / formatting helpers ──

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtDollar(n: number | null | undefined): string {
  if (n == null) return '-';
  const sign = n >= 0 ? '+' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${sign}$${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(n / 1_000).toFixed(1)}K`;
  return `${sign}$${n.toFixed(0)}`;
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  return n.toFixed(decimals);
}

function impactColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n < 0) return 'text-red-400';
  if (n > 0) return 'text-emerald-400';
  return 'text-neutral-500';
}

function severityBadge(severity: string | null | undefined): { text: string; bg: string; color: string } {
  switch (severity) {
    case 'low':
      return { text: 'LOW', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'moderate':
      return { text: 'MODERATE', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
    case 'high':
      return { text: 'HIGH', bg: 'rgba(251,146,60,0.15)', color: '#fb923c' };
    case 'severe':
      return { text: 'SEVERE', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    case 'critical':
      return { text: 'CRITICAL', bg: 'rgba(239,68,68,0.25)', color: '#ef4444' };
    default:
      return { text: (severity ?? 'N/A').toUpperCase(), bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

function heatmapBg(value: number, max: number): string {
  if (max === 0) return 'rgba(255,255,255,0.03)';
  const normalized = Math.max(-1, Math.min(1, value / max));
  if (normalized >= 0) {
    return `rgba(239,68,68,${0.06 + normalized * 0.45})`;
  } else {
    return `rgba(59,130,246,${0.06 + Math.abs(normalized) * 0.45})`;
  }
}

function heatmapText(value: number, max: number): string {
  if (max === 0) return '#a1a1aa';
  const a = Math.abs(value / max);
  if (a > 0.7) return '#ffffff';
  if (a > 0.4) return '#d4d4d8';
  return '#a1a1aa';
}

function corrHeatmapBg(value: number): string {
  const v = Math.max(-1, Math.min(1, value));
  if (v >= 0) {
    return `rgba(239,68,68,${0.06 + v * 0.50})`;
  } else {
    return `rgba(59,130,246,${0.06 + Math.abs(v) * 0.50})`;
  }
}

function corrHeatmapText(value: number): string {
  const a = Math.abs(value);
  if (a > 0.7) return '#ffffff';
  if (a > 0.4) return '#d4d4d8';
  return '#a1a1aa';
}

// ── Main Panel ──

export function RiskScenarioAnalysisPanel() {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, refetch } = useRiskScenarioAnalysis() as { data: any; isLoading: boolean; refetch: () => void };

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-red-400">
            {tr(t, 'riskScenarioTitle', 'Risk Scenario Analysis')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 animate-spin" />
            <span className="text-[9px] text-neutral-500 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-12 text-neutral-500 text-[9px] uppercase">
            {tr(t, 'riskScenarioNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <ScenarioImpactTable data={data} />
            <SensitivityGrid data={data} />
            <TailRiskMetrics data={data} />
            <HistoricalDrawdownChart data={data} />
            <CorrelationStressMatrix data={data} />
            <ReverseStressTests data={data} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Scenario Impact Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ScenarioImpactTable({ data }: { data: any }) {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scenarios: any[] = data?.scenarios ?? [];

  if (!scenarios.length) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maxAbsPnl = Math.max(...scenarios.map((s: any) => Math.abs(s.pnlImpact ?? 0)), 1);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 bg-black/40 border-b border-border/20">
        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-500">
          {tr(t, 'riskScenarioImpact', 'Scenario Impact Analysis')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1.4fr_1.2fr_0.7fr_0.7fr_0.5fr_0.5fr] px-3 py-1 border-b border-border/20 bg-black/40 sticky top-0 z-10">
        <span className="text-[7px] font-black text-neutral/40 uppercase tracking-wider">SCENARIO</span>
        <span className="text-[7px] font-black text-neutral/40 uppercase tracking-wider">P&L IMPACT</span>
        <span className="text-[7px] font-black text-neutral/40 uppercase tracking-wider text-right">VAR IMPACT</span>
        <span className="text-[7px] font-black text-neutral/40 uppercase tracking-wider text-right">PROB</span>
        <span className="text-[7px] font-black text-neutral/40 uppercase tracking-wider text-right">SEVERITY</span>
        <span className="text-[7px] font-black text-neutral/40 uppercase tracking-wider text-right" />
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {scenarios.map((s: any, i: number) => {
        const pnl = s.pnlImpact ?? 0;
        const barPct = Math.min((Math.abs(pnl) / maxAbsPnl) * 100, 100);
        const barColor = pnl < 0 ? 'bg-red-400/50' : 'bg-emerald-400/50';
        const badge = severityBadge(s.severity);

        return (
          <div
            key={s.name || i}
            className="grid grid-cols-[1.4fr_1.2fr_0.7fr_0.7fr_0.5fr_0.5fr] px-3 py-1.5 border-b border-border/10 hover:bg-red-400/[0.02] transition-colors items-center"
          >
            <div className="min-w-0">
              <div className="text-[9px] font-bold text-white truncate uppercase">{s.name}</div>
              {s.description && (
                <div className="text-[7px] text-neutral/30 truncate">{s.description}</div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1.5 bg-white/[0.04] relative">
                <div
                  className={`absolute top-0 h-full ${barColor}`}
                  style={{
                    width: `${barPct}%`,
                    left: pnl >= 0 ? '0' : undefined,
                    right: pnl < 0 ? '0' : undefined,
                  }}
                />
              </div>
              <span className={`text-[8px] font-bold tabular-nums shrink-0 w-[50px] text-right ${impactColor(pnl)}`}>
                {fmtDollar(pnl)}
              </span>
            </div>
            <span className={`text-[9px] font-bold text-right tabular-nums ${impactColor(s.varImpact)}`}>
              {fmtPct(s.varImpact)}
            </span>
            <span className="text-[9px] text-neutral/40 text-right tabular-nums">
              {s.probability != null ? `${(s.probability * 100).toFixed(0)}%` : '-'}
            </span>
            <span
              className="text-[7px] font-black uppercase px-1 py-[1px] text-right ml-auto"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.text}
            </span>
            <span />
          </div>
        );
      })}
    </div>
  );
}

// ── 2. Sensitivity Grid (Greek Heatmap) ──

const GREEKS = ['Delta', 'Gamma', 'Vega', 'Theta', 'Rho'] as const;
const ASSET_CLASSES = ['Equities', 'Fixed Income', 'FX', 'Commodities', 'Credit', 'Rates'] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SensitivityGrid({ data }: { data: any }) {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sensitivity: any = data?.sensitivity ?? {};
  const matrix: number[][] = sensitivity.matrix ??
    GREEKS.map(() => ASSET_CLASSES.map(() => 0));

  // Find max absolute value for heatmap normalization
  let maxAbs = 0;
  for (const row of matrix) {
    for (const val of row) {
      const abs = Math.abs(val);
      if (abs > maxAbs) maxAbs = abs;
    }
  }
  if (maxAbs === 0) maxAbs = 1;

  const CELL = 32;
  const LABEL_W = 55;
  const LABEL_H = 48;
  const nRows = GREEKS.length;
  const nCols = ASSET_CLASSES.length;
  const gridW = LABEL_W + nCols * CELL;
  const gridH = LABEL_H + nRows * CELL;

  return (
    <div className="border-b border-border/20 px-3 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-2">
        {tr(t, 'riskScenarioSensitivity', 'Sensitivity Grid (Greeks by Asset Class)')}
      </div>

      <div className="overflow-auto no-scrollbar">
        <svg
          viewBox={`0 0 ${gridW + 6} ${gridH + 6}`}
          className="w-full"
          style={{ maxHeight: 240, minWidth: 300 }}
        >
          {/* Column labels */}
          {ASSET_CLASSES.map((name, j) => (
            <text
              key={`col-${j}`}
              x={LABEL_W + j * CELL + CELL / 2}
              y={LABEL_H - 5}
              textAnchor="middle"
              fill="#f87171"
              fontSize={5.5}
              fontFamily="monospace"
              fontWeight="bold"
              transform={`rotate(-35, ${LABEL_W + j * CELL + CELL / 2}, ${LABEL_H - 5})`}
            >
              {name}
            </text>
          ))}

          {/* Row labels */}
          {GREEKS.map((name, i) => (
            <text
              key={`row-${i}`}
              x={LABEL_W - 4}
              y={LABEL_H + i * CELL + CELL / 2 + 2}
              textAnchor="end"
              fill="#f87171"
              fontSize={6}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {name}
            </text>
          ))}

          {/* Cells */}
          {matrix.map((row: number[], i: number) =>
            row.map((val: number, j: number) => (
              <g key={`${i}-${j}`}>
                <rect
                  x={LABEL_W + j * CELL}
                  y={LABEL_H + i * CELL}
                  width={CELL}
                  height={CELL}
                  fill={heatmapBg(val, maxAbs)}
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth={0.3}
                />
                <text
                  x={LABEL_W + j * CELL + CELL / 2}
                  y={LABEL_H + i * CELL + CELL / 2 + 2}
                  textAnchor="middle"
                  fill={heatmapText(val, maxAbs)}
                  fontSize={6}
                  fontFamily="monospace"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {val === 0 ? '0' : val > 0 ? `+${fmtNum(val)}` : fmtNum(val)}
                </text>
              </g>
            ))
          )}
        </svg>
      </div>
    </div>
  );
}

// ── 3. Tail Risk Metrics Cards ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TailRiskMetrics({ data }: { data: any }) {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tail: any = data?.tailRisk ?? {};

  const metrics = [
    { label: 'CVaR 95%', value: tail.cvar95, color: '#fb923c' },
    { label: 'CVaR 99%', value: tail.cvar99, color: '#f87171' },
    { label: 'EXPECTED SHORTFALL', value: tail.expectedShortfall, color: '#ef4444' },
    { label: 'MAX LOSS 1D', value: tail.maxLoss1d, color: '#f87171' },
    { label: 'TAIL INDEX', value: tail.tailIndex, color: '#fbbf24', isRatio: true },
  ];

  return (
    <div className="border-b border-border/20 px-3 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-2">
        {tr(t, 'riskScenarioTailRisk', 'Tail Risk Metrics')}
      </div>

      <div className="grid grid-cols-5 gap-0 border border-border/10">
        {metrics.map((m) => (
          <div key={m.label} className="px-2 py-2 border-r border-border/10 last:border-r-0 bg-[#060606]">
            <div className="text-[6px] text-neutral-600 uppercase tracking-wider mb-1">{m.label}</div>
            <div className="text-[14px] font-black tabular-nums" style={{ color: m.color }}>
              {m.value != null
                ? m.isRatio
                  ? fmtNum(m.value, 3)
                  : fmtDollar(m.value)
                : '---'}
            </div>
            {m.value != null && !m.isRatio && (
              <div className="h-1 bg-white/[0.04] mt-1 relative">
                <div
                  className="absolute top-0 left-0 h-full"
                  style={{
                    width: `${Math.min(Math.abs(m.value) / Math.abs(tail.cvar99 ?? 1) * 100, 100)}%`,
                    backgroundColor: m.color,
                    opacity: 0.5,
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 4. Historical Drawdown Comparison Chart (SVG Bar Chart) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HistoricalDrawdownChart({ data }: { data: any }) {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawdowns: any[] = data?.historicalDrawdowns ?? [];

  if (!drawdowns.length) return null;

  const W = 320;
  const H = 160;
  const PAD_LEFT = 50;
  const PAD_RIGHT = 10;
  const PAD_TOP = 10;
  const PAD_BOTTOM = 40;

  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const n = drawdowns.length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maxDd = Math.max(...drawdowns.map((d: any) => Math.abs(d.drawdown ?? 0)), 1);
  const barWidth = Math.min(chartW / n * 0.7, 30);
  const gap = (chartW - barWidth * n) / (n + 1);

  return (
    <div className="border-b border-border/20 px-3 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-2">
        {tr(t, 'riskScenarioDrawdowns', 'Historical Drawdown Comparison')}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = PAD_TOP + pct * chartH;
          const val = -(pct * maxDd);
          return (
            <g key={`grid-${pct}`}>
              <line
                x1={PAD_LEFT}
                y1={y}
                x2={W - PAD_RIGHT}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="2,2"
              />
              <text
                x={PAD_LEFT - 4}
                y={y + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.2)"
                fontSize={5.5}
                fontFamily="monospace"
              >
                {val.toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* Zero line */}
        <line
          x1={PAD_LEFT}
          y1={PAD_TOP}
          x2={W - PAD_RIGHT}
          y2={PAD_TOP}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={0.5}
        />

        {/* Bars */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {drawdowns.map((d: any, i: number) => {
          const x = PAD_LEFT + gap + i * (barWidth + gap);
          const ddAbs = Math.abs(d.drawdown ?? 0);
          const barH = (ddAbs / maxDd) * chartH;
          const y = PAD_TOP;

          // Color intensity based on severity
          const intensity = ddAbs / maxDd;
          const r = Math.round(248 - intensity * 9);
          const g = Math.round(113 - intensity * 45);
          const b = Math.round(113 - intensity * 45);
          const fillColor = `rgba(${r},${g},${b},0.7)`;

          return (
            <g key={d.event || i}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                fill={fillColor}
                stroke="rgba(248,113,113,0.3)"
                strokeWidth={0.5}
              />

              {/* Value label */}
              <text
                x={x + barWidth / 2}
                y={y + barH + 8}
                textAnchor="middle"
                fill="#f87171"
                fontSize={5.5}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {fmtPct(-(d.drawdown ?? 0), 0)}
              </text>

              {/* Event name */}
              <text
                x={x + barWidth / 2}
                y={H - PAD_BOTTOM + 10}
                textAnchor="middle"
                fill="rgba(255,255,255,0.3)"
                fontSize={4.5}
                fontFamily="monospace"
                transform={`rotate(-30, ${x + barWidth / 2}, ${H - PAD_BOTTOM + 10})`}
              >
                {(d.event ?? '').length > 12 ? (d.event ?? '').slice(0, 12) + '..' : (d.event ?? '')}
              </text>

              {/* Recovery days */}
              {d.recoveryDays != null && (
                <text
                  x={x + barWidth / 2}
                  y={y - 3}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.25)"
                  fontSize={4.5}
                  fontFamily="monospace"
                >
                  {d.recoveryDays}d
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── 5. Correlation Stress Matrix ──

const STRESS_ASSETS = ['SPX', 'UST', 'Gold', 'USD', 'Oil', 'HY', 'EM', 'VIX'] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CorrelationStressMatrix({ data }: { data: any }) {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stressCorr: any = data?.correlationStress ?? {};
  const matrix: number[][] = stressCorr.matrix ??
    STRESS_ASSETS.map((_, i) =>
      STRESS_ASSETS.map((_, j) => (i === j ? 1 : 0))
    );

  const n = STRESS_ASSETS.length;
  const CELL = 28;
  const LABEL_W = 38;
  const LABEL_H = 40;
  const gridW = LABEL_W + n * CELL;
  const gridH = LABEL_H + n * CELL;

  return (
    <div className="border-b border-border/20 px-3 py-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-500">
          {tr(t, 'riskScenarioCorrStress', 'Correlation Stress Matrix')}
        </span>
        {stressCorr.regime && (
          <span
            className="text-[7px] font-black uppercase px-1.5 py-[1px]"
            style={{
              background: stressCorr.regime === 'crisis' ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.15)',
              color: stressCorr.regime === 'crisis' ? '#ef4444' : '#fbbf24',
            }}
          >
            {stressCorr.regime}
          </span>
        )}
      </div>

      <div className="overflow-auto no-scrollbar">
        <svg
          viewBox={`0 0 ${gridW + 8} ${gridH + 20}`}
          className="w-full"
          style={{ maxHeight: 320, minWidth: 280 }}
        >
          {/* Column labels */}
          {STRESS_ASSETS.map((name, j) => (
            <text
              key={`col-${j}`}
              x={LABEL_W + j * CELL + CELL / 2}
              y={LABEL_H - 4}
              textAnchor="middle"
              fill="#f87171"
              fontSize={5.5}
              fontFamily="monospace"
              fontWeight="bold"
              transform={`rotate(-45, ${LABEL_W + j * CELL + CELL / 2}, ${LABEL_H - 4})`}
            >
              {name}
            </text>
          ))}

          {/* Row labels */}
          {STRESS_ASSETS.map((name, i) => (
            <text
              key={`row-${i}`}
              x={LABEL_W - 3}
              y={LABEL_H + i * CELL + CELL / 2 + 2}
              textAnchor="end"
              fill="#f87171"
              fontSize={5.5}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {name}
            </text>
          ))}

          {/* Cells */}
          {matrix.map((row: number[], i: number) =>
            row.map((val: number, j: number) => {
              const isDiag = i === j;
              return (
                <g key={`${i}-${j}`}>
                  <rect
                    x={LABEL_W + j * CELL}
                    y={LABEL_H + i * CELL}
                    width={CELL}
                    height={CELL}
                    fill={isDiag ? 'rgba(63,63,70,0.15)' : corrHeatmapBg(val)}
                    stroke="rgba(0,0,0,0.4)"
                    strokeWidth={0.3}
                  />
                  <text
                    x={LABEL_W + j * CELL + CELL / 2}
                    y={LABEL_H + i * CELL + CELL / 2 + 2}
                    textAnchor="middle"
                    fill={isDiag ? 'rgba(255,255,255,0.2)' : corrHeatmapText(val)}
                    fontSize={6}
                    fontFamily="monospace"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {val.toFixed(2)}
                  </text>
                </g>
              );
            })
          )}

          {/* Color scale legend */}
          {[
            { val: -1.0, label: '-1.0' },
            { val: -0.5, label: '-0.5' },
            { val: 0, label: '0' },
            { val: 0.5, label: '+0.5' },
            { val: 1.0, label: '+1.0' },
          ].map((item, idx) => (
            <g key={`legend-${idx}`}>
              <rect
                x={LABEL_W + idx * 24}
                y={gridH + 4}
                width={18}
                height={5}
                fill={corrHeatmapBg(item.val)}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={0.3}
              />
              <text
                x={LABEL_W + idx * 24 + 9}
                y={gridH + 16}
                textAnchor="middle"
                fill="rgba(255,255,255,0.3)"
                fontSize={5}
                fontFamily="monospace"
              >
                {item.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── 6. Reverse Stress Test Results ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ReverseStressTests({ data }: { data: any }) {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tests: any[] = data?.reverseStressTests ?? [];

  if (!tests.length) return null;

  return (
    <div className="px-3 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-2">
        {tr(t, 'riskScenarioReverse', 'Reverse Stress Test Results')}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.6fr_0.8fr] px-1 py-1 border-b border-border/20 bg-black/40">
        <span className="text-[7px] font-black text-neutral/40 uppercase tracking-wider">SCENARIO</span>
        <span className="text-[7px] font-black text-neutral/40 uppercase tracking-wider text-right">THRESHOLD</span>
        <span className="text-[7px] font-black text-neutral/40 uppercase tracking-wider text-right">REQ. SHOCK</span>
        <span className="text-[7px] font-black text-neutral/40 uppercase tracking-wider text-right">PROB</span>
        <span className="text-[7px] font-black text-neutral/40 uppercase tracking-wider text-right">KEY DRIVER</span>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {tests.map((test: any, i: number) => {
        const probColor = (test.probability ?? 0) > 0.1
          ? 'text-red-400'
          : (test.probability ?? 0) > 0.05
            ? 'text-amber-400'
            : 'text-neutral/40';

        return (
          <div
            key={test.scenario || i}
            className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.6fr_0.8fr] px-1 py-1.5 border-b border-border/10 hover:bg-red-400/[0.02] transition-colors items-center"
          >
            <div className="min-w-0">
              <div className="text-[9px] font-bold text-white truncate uppercase">{test.scenario}</div>
              {test.description && (
                <div className="text-[7px] text-neutral/30 truncate">{test.description}</div>
              )}
            </div>
            <span className="text-[9px] font-bold text-red-400 text-right tabular-nums">
              {fmtDollar(test.threshold)}
            </span>
            <span className={`text-[9px] font-bold text-right tabular-nums ${impactColor(test.requiredShock != null ? -Math.abs(test.requiredShock) : null)}`}>
              {fmtPct(test.requiredShock)}
            </span>
            <span className={`text-[9px] text-right tabular-nums ${probColor}`}>
              {test.probability != null ? `${(test.probability * 100).toFixed(1)}%` : '-'}
            </span>
            <div className="text-right min-w-0">
              <span className="text-[8px] font-bold text-neutral-300 truncate">
                {test.keyDriver ?? '-'}
              </span>
            </div>
          </div>
        );
      })}

      {/* Warning footer */}
      {data?.reverseStressWarning && (
        <div className="mt-2 px-1 py-1.5 border border-red-400/20 bg-red-400/[0.04]">
          <div className="flex items-start gap-1.5">
            <ShieldAlert className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
            <span className="text-[7px] text-neutral-400 leading-tight">
              {data.reverseStressWarning}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
