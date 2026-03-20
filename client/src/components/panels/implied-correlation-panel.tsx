import { useState, useMemo } from 'react';
import {
  useImpliedCorrelation,
  type ImpliedCorrelationData,
  type SectorCorrelation,
} from '../../api/hooks/use-implied-correlation';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Constants ──

const INDIGO = '#818cf8';
const INDIGO_DIM = 'rgba(129,140,248,0.15)';

const ASSETS = [
  'SPY', 'QQQ', 'IWM', 'EFA', 'EEM', 'TLT', 'GLD', 'USO', 'UUP', 'HYG', 'VIX', 'BTC-USD',
];

type ViewMode = 'MATRIX' | 'INDEX' | 'SECTORS';
type CorrMode = 'implied' | 'realized30d' | 'realized90d';

// ── Color helpers ──

function heatmapColor(value: number): string {
  // deep blue (-1) -> white (0) -> deep red (+1)
  const clamped = Math.max(-1, Math.min(1, value));
  if (clamped >= 0) {
    const t = clamped;
    const r = Math.round(255);
    const g = Math.round(255 - 180 * t);
    const b = Math.round(255 - 180 * t);
    return `rgb(${r},${g},${b})`;
  } else {
    const t = -clamped;
    const r = Math.round(255 - 180 * t);
    const g = Math.round(255 - 180 * t);
    const b = Math.round(255);
    return `rgb(${r},${g},${b})`;
  }
}

function getChangeColor(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function getChangeSign(val: number): string {
  return val > 0 ? '+' : '';
}

function percentileColor(pct: number): string {
  if (pct >= 80) return '#f87171';
  if (pct >= 60) return '#fbbf24';
  if (pct >= 40) return '#818cf8';
  if (pct >= 20) return '#34d399';
  return '#60a5fa';
}

function zscoreLabel(z: number): { text: string; color: string } {
  if (z >= 2) return { text: 'EXTREME HIGH', color: '#f87171' };
  if (z >= 1) return { text: 'ELEVATED', color: '#fbbf24' };
  if (z <= -2) return { text: 'EXTREME LOW', color: '#60a5fa' };
  if (z <= -1) return { text: 'DEPRESSED', color: '#34d399' };
  return { text: 'NORMAL', color: '#818cf8' };
}

// ── Main Panel ──

export function ImpliedCorrelationPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useImpliedCorrelation();
  const [view, setView] = useState<ViewMode>('MATRIX');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="5" height="5" stroke={INDIGO} strokeWidth="1.2" fill="none" />
            <rect x="10" y="1" width="5" height="5" stroke={INDIGO} strokeWidth="1.2" fill="none" />
            <rect x="1" y="10" width="5" height="5" stroke={INDIGO} strokeWidth="1.2" fill="none" />
            <rect x="10" y="10" width="5" height="5" stroke={INDIGO} strokeWidth="1.2" fill="none" />
            <line x1="6" y1="3.5" x2="10" y2="3.5" stroke={INDIGO} strokeWidth="0.8" opacity="0.5" />
            <line x1="3.5" y1="6" x2="3.5" y2="10" stroke={INDIGO} strokeWidth="0.8" opacity="0.5" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter" style={{ color: INDIGO }}>
            {tr(t, 'impliedCorrTitle', 'Implied Correlation')}
          </span>

          {/* ICJ badge */}
          {data && (
            <span
              className="text-[7px] font-mono font-black uppercase px-1.5 py-[1px] ml-1"
              style={{ background: INDIGO_DIM, color: INDIGO }}
            >
              ICJ {data.icj.current.toFixed(1)}
            </span>
          )}

          {/* Dispersion indicator */}
          {data && (() => {
            const zs = zscoreLabel(data.dispersion.zscore);
            return (
              <span
                className="text-[7px] font-mono font-black uppercase px-1.5 py-[1px]"
                style={{ background: `${zs.color}15`, color: zs.color }}
              >
                DISP {zs.text}
              </span>
            );
          })()}
        </div>

        <div className="flex items-center gap-1">
          {/* View tabs */}
          {(['MATRIX', 'INDEX', 'SECTORS'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 transition-colors"
              style={{
                background: view === v ? INDIGO_DIM : 'transparent',
                color: view === v ? INDIGO : '#737373',
              }}
            >
              {v}
            </button>
          ))}

          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-indigo-400 transition-colors ml-1">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-12 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'impliedCorrNoData', 'No data available')}
          </div>
        )}

        {data && view === 'MATRIX' && <MatrixView data={data} />}
        {data && view === 'INDEX' && <IndexView data={data} />}
        {data && view === 'SECTORS' && <SectorsView data={data} />}
      </div>
    </div>
  );
}

// ── MATRIX View: 12x12 correlation heatmap ──

function MatrixView({ data }: { data: ImpliedCorrelationData }) {
  const t = useT();
  const [corrMode, setCorrMode] = useState<CorrMode>('implied');
  const [hoveredCell, setHoveredCell] = useState<{ i: number; j: number } | null>(null);

  // Build NxN lookup from flat matrix
  const n = ASSETS.length;
  const corrGrid = useMemo(() => {
    const grid: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) grid[i][i] = 1;

    for (const pair of data.matrix) {
      const ai = ASSETS.indexOf(pair.asset1);
      const aj = ASSETS.indexOf(pair.asset2);
      if (ai < 0 || aj < 0) continue;

      let val = 0;
      if (corrMode === 'implied') val = pair.impliedCorr;
      else if (corrMode === 'realized30d') val = pair.realizedCorr30d;
      else val = pair.realizedCorr90d;

      grid[ai][aj] = val;
    }
    return grid;
  }, [data.matrix, corrMode]);

  const CELL = 18;
  const LABEL_W = 48;
  const LABEL_H = 48;
  const gridW = LABEL_W + n * CELL;
  const gridH = LABEL_H + n * CELL;

  const shortNames = ASSETS.map((a) => a.length > 5 ? a.slice(0, 5) : a);

  return (
    <div className="px-2 py-2">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 mb-2 px-1">
        <span className="text-[7px] font-mono text-neutral-600 uppercase mr-1">
          {tr(t, 'impliedCorrMode', 'Mode')}:
        </span>
        {([
          { key: 'implied' as CorrMode, label: 'Implied' },
          { key: 'realized30d' as CorrMode, label: 'Realized 30d' },
          { key: 'realized90d' as CorrMode, label: 'Realized 90d' },
        ]).map((m) => (
          <button
            key={m.key}
            onClick={() => setCorrMode(m.key)}
            className="text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 transition-colors"
            style={{
              background: corrMode === m.key ? INDIGO_DIM : 'transparent',
              color: corrMode === m.key ? INDIGO : '#737373',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="overflow-auto no-scrollbar">
        <svg
          viewBox={`0 0 ${gridW + 12} ${gridH + 22}`}
          className="w-full"
          style={{ maxHeight: 420, minWidth: 340 }}
        >
          {/* Column labels (top, rotated) */}
          {shortNames.map((name, j) => (
            <text
              key={`col-${j}`}
              x={LABEL_W + j * CELL + CELL / 2}
              y={LABEL_H - 4}
              textAnchor="middle"
              fill="rgba(255,255,255,0.5)"
              fontSize={5}
              fontFamily="monospace"
              fontWeight="bold"
              transform={`rotate(-55, ${LABEL_W + j * CELL + CELL / 2}, ${LABEL_H - 4})`}
            >
              {name}
            </text>
          ))}

          {/* Row labels (left) */}
          {shortNames.map((name, i) => (
            <text
              key={`row-${i}`}
              x={LABEL_W - 4}
              y={LABEL_H + i * CELL + CELL / 2 + 2}
              textAnchor="end"
              fill="rgba(255,255,255,0.5)"
              fontSize={5}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {name}
            </text>
          ))}

          {/* Cells */}
          {corrGrid.map((row, i) =>
            row.map((val, j) => {
              const isHovered = hoveredCell?.i === i && hoveredCell?.j === j;
              const isDiag = i === j;
              return (
                <g key={`${i}-${j}`}>
                  <rect
                    x={LABEL_W + j * CELL}
                    y={LABEL_H + i * CELL}
                    width={CELL}
                    height={CELL}
                    fill={isDiag ? 'rgba(63,63,70,0.2)' : heatmapColor(val)}
                    stroke={isHovered ? '#fff' : 'rgba(0,0,0,0.4)'}
                    strokeWidth={isHovered ? 1.2 : 0.3}
                    onMouseEnter={() => setHoveredCell({ i, j })}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={{ cursor: isDiag ? 'default' : 'crosshair' }}
                  />
                  {!isDiag && (
                    <text
                      x={LABEL_W + j * CELL + CELL / 2}
                      y={LABEL_H + i * CELL + CELL / 2 + 2}
                      textAnchor="middle"
                      fill={Math.abs(val) > 0.5 ? '#000' : 'rgba(0,0,0,0.7)'}
                      fontSize={4.5}
                      fontFamily="monospace"
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      {val.toFixed(2)}
                    </text>
                  )}
                  {isDiag && (
                    <text
                      x={LABEL_W + j * CELL + CELL / 2}
                      y={LABEL_H + i * CELL + CELL / 2 + 2}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.3)"
                      fontSize={4.5}
                      fontFamily="monospace"
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      1.00
                    </text>
                  )}
                </g>
              );
            }),
          )}

          {/* Hover tooltip */}
          {hoveredCell && hoveredCell.i !== hoveredCell.j && (() => {
            const { i, j } = hoveredCell;
            const val = corrGrid[i][j];
            const pair = data.matrix.find(
              (p) => p.asset1 === ASSETS[i] && p.asset2 === ASSETS[j],
            );
            const tx = Math.min(LABEL_W + j * CELL + CELL / 2, gridW - 50);
            const ty = LABEL_H + i * CELL - 5;
            const chg = pair?.change1w ?? 0;
            return (
              <g>
                <rect
                  x={tx - 45} y={ty - 10} width={90} height={14} rx={1}
                  fill="rgba(0,0,0,0.9)" stroke="rgba(129,140,248,0.5)" strokeWidth={0.5}
                />
                <text x={tx} y={ty - 1} textAnchor="middle" fill="#e4e4e7" fontSize={5.5} fontFamily="monospace">
                  {ASSETS[i]}/{ASSETS[j]}: {val.toFixed(3)} ({getChangeSign(chg)}{chg.toFixed(3)} 1w)
                </text>
              </g>
            );
          })()}

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
                x={LABEL_W + idx * 22}
                y={gridH + 4}
                width={16}
                height={5}
                fill={heatmapColor(item.val)}
              />
              <text
                x={LABEL_W + idx * 22 + 8}
                y={gridH + 16}
                textAnchor="middle"
                fill="rgba(255,255,255,0.3)"
                fontSize={4.5}
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

// ── INDEX View: ICJ tracking with percentile gauge ──

function IndexView({ data }: { data: ImpliedCorrelationData }) {
  const t = useT();
  const { icj, dispersion } = data;

  // 52w range bar positions
  const range = icj.max52w - icj.min52w;
  const currentPct = range > 0 ? ((icj.current - icj.min52w) / range) * 100 : 50;

  return (
    <div className="px-2 py-2">
      {/* Large ICJ display */}
      <div className="flex items-start gap-4 px-2 py-3 border-b border-border/20">
        <div className="flex-1">
          <div className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600 mb-1">
            {tr(t, 'impliedCorrICJ', 'CBOE Implied Correlation Index (ICJ)')}
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-[28px] font-black font-mono tabular-nums" style={{ color: INDIGO }}>
              {icj.current.toFixed(1)}
            </span>
            <div className="flex flex-col">
              <span className={`text-[9px] font-mono font-bold tabular-nums ${getChangeColor(icj.change1d)}`}>
                {getChangeSign(icj.change1d)}{icj.change1d.toFixed(2)} 1d
              </span>
              <span className={`text-[9px] font-mono font-bold tabular-nums ${getChangeColor(icj.change1w)}`}>
                {getChangeSign(icj.change1w)}{icj.change1w.toFixed(2)} 1w
              </span>
            </div>
          </div>
        </div>

        {/* Percentile gauges */}
        <div className="flex gap-3">
          <PercentileGauge label="30d Pctl" value={icj.percentile30d} />
          <PercentileGauge label="90d Pctl" value={icj.percentile90d} />
        </div>
      </div>

      {/* 52-week range bar */}
      <div className="px-2 py-3 border-b border-border/20">
        <div className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600 mb-2">
          {tr(t, 'impliedCorr52wRange', '52-Week Range')}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono text-neutral-500 tabular-nums w-8 text-right">
            {icj.min52w.toFixed(1)}
          </span>
          <div className="flex-1 relative h-3 bg-neutral-900">
            {/* Range fill */}
            <div
              className="absolute inset-y-0 left-0"
              style={{ width: `${currentPct}%`, background: 'rgba(129,140,248,0.2)' }}
            />
            {/* Current position marker */}
            <div
              className="absolute top-0 bottom-0 w-[2px]"
              style={{ left: `${currentPct}%`, background: INDIGO }}
            />
            {/* Current value label */}
            <div
              className="absolute -top-3.5"
              style={{ left: `${currentPct}%`, transform: 'translateX(-50%)' }}
            >
              <span className="text-[7px] font-mono font-bold tabular-nums" style={{ color: INDIGO }}>
                {icj.current.toFixed(1)}
              </span>
            </div>
          </div>
          <span className="text-[8px] font-mono text-neutral-500 tabular-nums w-8">
            {icj.max52w.toFixed(1)}
          </span>
        </div>
      </div>

      {/* ICJ interpretation */}
      <div className="px-2 py-3 border-b border-border/20">
        <div className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600 mb-2">
          {tr(t, 'impliedCorrInterpretation', 'Interpretation')}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: 'Regime',
              value: icj.current >= 65 ? 'HIGH CORR' : icj.current >= 45 ? 'NORMAL' : 'LOW CORR',
              color: icj.current >= 65 ? '#f87171' : icj.current >= 45 ? INDIGO : '#34d399',
            },
            {
              label: 'Signal',
              value: icj.current >= 70 ? 'RISK-OFF' : icj.current <= 40 ? 'STOCK PICKING' : 'NEUTRAL',
              color: icj.current >= 70 ? '#f87171' : icj.current <= 40 ? '#34d399' : '#737373',
            },
            {
              label: 'Dispersion Opp',
              value: icj.current >= 65 ? 'LOW' : icj.current <= 40 ? 'HIGH' : 'MODERATE',
              color: icj.current >= 65 ? '#f87171' : icj.current <= 40 ? '#34d399' : '#fbbf24',
            },
          ].map((item) => (
            <div key={item.label} className="px-2 py-1.5 bg-neutral-950 border border-border/10">
              <div className="text-[6px] font-mono text-neutral-600 uppercase">{item.label}</div>
              <div className="text-[9px] font-mono font-black" style={{ color: item.color }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dispersion summary */}
      <div className="px-2 py-3">
        <div className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600 mb-2">
          {tr(t, 'impliedCorrDispersion', 'Dispersion Analysis')}
        </div>
        <div className="grid grid-cols-4 gap-0 border border-border/10">
          {[
            { label: 'Current', value: `${dispersion.current.toFixed(1)}%`, color: INDIGO },
            { label: 'Avg 30d', value: `${dispersion.avg30d.toFixed(1)}%`, color: '#737373' },
            { label: 'Avg 90d', value: `${dispersion.avg90d.toFixed(1)}%`, color: '#737373' },
            {
              label: 'Z-Score',
              value: dispersion.zscore.toFixed(2),
              color: zscoreLabel(dispersion.zscore).color,
            },
          ].map((m) => (
            <div key={m.label} className="px-2 py-2 border-r border-border/10 last:border-r-0">
              <div className="text-[6px] font-mono text-neutral-600 uppercase">{m.label}</div>
              <div className="text-[11px] font-mono font-black tabular-nums" style={{ color: m.color }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Percentile gauge (circular-ish) ──

function PercentileGauge({ label, value }: { label: string; value: number }) {
  const W = 48;
  const H = 40;
  const cx = W / 2;
  const cy = 28;
  const r = 18;
  // Arc from -140deg to +140deg (280deg sweep)
  const startAngle = -140;
  const endAngle = 140;
  const sweepDeg = endAngle - startAngle;
  const valueDeg = startAngle + (value / 100) * sweepDeg;

  function polarToCart(angleDeg: number, radius: number): { x: number; y: number } {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  const arcStart = polarToCart(startAngle, r);
  const arcEnd = polarToCart(endAngle, r);
  const valuePoint = polarToCart(valueDeg, r);

  // Background arc
  const largeArc = sweepDeg > 180 ? 1 : 0;
  const bgPath = `M ${arcStart.x},${arcStart.y} A ${r},${r} 0 ${largeArc} 1 ${arcEnd.x},${arcEnd.y}`;

  // Value arc
  const valueSweep = (value / 100) * sweepDeg;
  const valueLargeArc = valueSweep > 180 ? 1 : 0;
  const valuePath = `M ${arcStart.x},${arcStart.y} A ${r},${r} 0 ${valueLargeArc} 1 ${valuePoint.x},${valuePoint.y}`;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        {/* Background arc */}
        <path d={bgPath} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" strokeLinecap="round" />
        {/* Value arc */}
        <path d={valuePath} fill="none" stroke={percentileColor(value)} strokeWidth="3" strokeLinecap="round" />
        {/* Value text */}
        <text x={cx} y={cy - 2} textAnchor="middle" fill={percentileColor(value)} fontSize={10} fontFamily="monospace" fontWeight="900">
          {Math.round(value)}
        </text>
        <text x={cx} y={cy + 6} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={5} fontFamily="monospace">
          pctl
        </text>
      </svg>
      <span className="text-[6px] font-mono text-neutral-600 uppercase -mt-1">{label}</span>
    </div>
  );
}

// ── SECTORS View: GICS sector correlation analysis ──

function SectorsView({ data }: { data: ImpliedCorrelationData }) {
  const t = useT();
  const { sectorCorrelations, dispersion } = data;
  const zs = zscoreLabel(dispersion.zscore);

  return (
    <div className="px-2 py-2">
      {/* Dispersion Z-Score header */}
      <div className="flex items-center justify-between px-1 py-2 border-b border-border/20 mb-2">
        <div>
          <div className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600">
            {tr(t, 'impliedCorrDispZscore', 'Dispersion Z-Score')}
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-[18px] font-black font-mono tabular-nums" style={{ color: zs.color }}>
              {dispersion.zscore.toFixed(2)}
            </span>
            <span className="text-[8px] font-mono font-black" style={{ color: zs.color }}>
              {zs.text}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[6px] font-mono text-neutral-600 uppercase">Current Dispersion</div>
          <div className="text-[11px] font-mono font-bold tabular-nums" style={{ color: INDIGO }}>
            {dispersion.current.toFixed(1)}%
          </div>
          <div className="text-[6px] font-mono text-neutral-600">
            vs 90d avg {dispersion.avg90d.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_60px_60px_1fr] gap-0 px-1 mb-1">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Sector</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Intra</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Inter</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right pr-1">Bars</span>
      </div>

      {/* Sector rows */}
      {sectorCorrelations.map((sector) => (
        <SectorRow key={sector.sector} sector={sector} />
      ))}

      {/* Legend */}
      <div className="flex items-center gap-3 px-1 pt-3 mt-1 border-t border-border/10">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2" style={{ background: INDIGO }} />
          <span className="text-[6px] font-mono text-neutral-500">Intra-sector</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2" style={{ background: '#f97316' }} />
          <span className="text-[6px] font-mono text-neutral-500">Inter-sector</span>
        </div>
        <span className="text-[6px] font-mono text-neutral-600 ml-auto">
          Higher intra vs inter = more stock-picking opportunity
        </span>
      </div>
    </div>
  );
}

function SectorRow({ sector }: { sector: SectorCorrelation }) {
  const intraPct = Math.abs(sector.intraCorr) * 100;
  const interPct = Math.abs(sector.interCorr) * 100;
  const maxBarWidth = 60; // px

  // Color: if intra >> inter, good for dispersion trades (green tint)
  const spread = sector.intraCorr - sector.interCorr;
  const spreadColor = spread > 0.25 ? '#34d399' : spread > 0.10 ? INDIGO : '#737373';

  return (
    <div className="grid grid-cols-[1fr_60px_60px_1fr] gap-0 px-1 py-[4px] hover:bg-indigo-400/[0.02] border-b border-border/10 items-center">
      {/* Sector name */}
      <div className="min-w-0">
        <span className="text-[8px] font-mono font-bold text-neutral-300 truncate block">
          {sector.sector}
        </span>
      </div>

      {/* Intra correlation value */}
      <span className="text-[8px] font-mono font-bold tabular-nums text-right" style={{ color: INDIGO }}>
        {sector.intraCorr.toFixed(3)}
      </span>

      {/* Inter correlation value */}
      <span className="text-[8px] font-mono font-bold tabular-nums text-right text-orange-400">
        {sector.interCorr.toFixed(3)}
      </span>

      {/* Dual bars */}
      <div className="flex flex-col gap-[2px] pl-2 pr-1">
        {/* Intra bar */}
        <div className="h-[3px] bg-neutral-900 relative">
          <div
            className="h-full absolute left-0 top-0"
            style={{ width: `${(intraPct / 100) * maxBarWidth}px`, maxWidth: '100%', background: INDIGO }}
          />
        </div>
        {/* Inter bar */}
        <div className="h-[3px] bg-neutral-900 relative">
          <div
            className="h-full absolute left-0 top-0"
            style={{ width: `${(interPct / 100) * maxBarWidth}px`, maxWidth: '100%', background: '#f97316' }}
          />
        </div>
      </div>
    </div>
  );
}
