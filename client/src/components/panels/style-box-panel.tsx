import { useState, useMemo } from 'react';
import {
  useStyleBox,
  type StyleBoxResponse,
  type StyleCell,
  type RotationSignal,
} from '../../api/hooks/use-style-box';
import { useT, tr, TFn } from '../../i18n';
import { Grid3x3, RefreshCw, ArrowRight } from 'lucide-react';

// ── Constants ──

const ACCENT = '#6366f1'; // indigo-400

type View = 'GRID' | 'TABLE' | 'ROTATION';
type ReturnPeriod = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y';

const RETURN_PERIODS: ReturnPeriod[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y'];

const SIZE_LABELS = ['Large', 'Mid', 'Small'] as const;
const STYLE_LABELS = ['Value', 'Blend', 'Growth'] as const;

type SortKey =
  | 'style'
  | 'etf'
  | '1d'
  | '1w'
  | '1m'
  | '3m'
  | 'ytd'
  | '1y'
  | 'pe'
  | 'pb'
  | 'div'
  | 'mcap'
  | 'flow'
  | 'rs'
  | 'mom';

// ── Color Helpers ──

function getReturnColor(ret: number): string {
  if (ret > 0) return '#22c55e';
  if (ret < 0) return '#ef4444';
  return '#71717a';
}

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtNum(n: number, decimals: number = 1): string {
  return n.toFixed(decimals);
}

function getCellReturn(cell: StyleCell, period: ReturnPeriod): number {
  switch (period) {
    case '1D': return cell.return1d;
    case '1W': return cell.return1w;
    case '1M': return cell.return1m;
    case '3M': return cell.return3m;
    case 'YTD': return cell.returnYtd;
    case '1Y': return cell.return1y;
  }
}

function getHeatIntensity(value: number, min: number, max: number): string {
  const range = max - min;
  if (range === 0) return 'rgba(63,63,70,0.3)';

  if (value > 0) {
    const intensity = Math.min(value / (max || 1), 1);
    return `rgba(34,197,94,${0.1 + intensity * 0.6})`;
  }
  if (value < 0) {
    const intensity = Math.min(Math.abs(value) / (Math.abs(min) || 1), 1);
    return `rgba(239,68,68,${0.1 + intensity * 0.6})`;
  }
  return 'rgba(63,63,70,0.2)';
}

function styleLabelFromKey(style: string): string {
  return style
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Mini Sparkline ──

function MiniSparkline({ data, width = 36, height = 12 }: { data: number[]; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;

  const W = width;
  const H = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 2) - 1;
      return `${x},${y}`;
    })
    .join(' ');

  const lastVal = data[data.length - 1];
  const firstVal = data[0];
  const color = lastVal >= firstVal ? ACCENT : '#ef4444';

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Strength Bar ──

function StrengthBar({ value }: { value: number }) {
  const W = 60;
  const H = 6;
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.05)" />
      <rect x={0} y={0} width={(clamped / 100) * W} height={H} fill={ACCENT} opacity={0.8} />
    </svg>
  );
}

// ── Spread Bar ──

function SpreadBar({ label, value }: { label: string; value: number }) {
  const W = 120;
  const H = 10;
  const CENTER = W / 2;
  const maxSpread = 10;
  const clamped = Math.max(-maxSpread, Math.min(maxSpread, value));
  const barWidth = (Math.abs(clamped) / maxSpread) * (W / 2 - 2);
  const isPositive = clamped >= 0;
  const barX = isPositive ? CENTER : CENTER - barWidth;
  const color = isPositive ? '#22c55e' : '#ef4444';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[7px] font-mono text-neutral-500 uppercase w-[80px] text-right shrink-0">
        {label}
      </span>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.03)" />
        <line x1={CENTER} y1={0} x2={CENTER} y2={H} stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} />
        <rect x={barX} y={1} width={Math.max(barWidth, 0.5)} height={H - 2} fill={color} opacity={0.7} />
      </svg>
      <span
        className="text-[8px] font-mono font-bold tabular-nums w-[50px]"
        style={{ color }}
      >
        {fmtPct(value)}
      </span>
    </div>
  );
}

// ── GRID View ──

function GridView({ data, period }: { data: StyleBoxResponse; period: ReturnPeriod }) {
  const { cells } = data;

  // Build 3x3 grid
  const grid: (StyleCell | undefined)[][] = [
    [undefined, undefined, undefined],
    [undefined, undefined, undefined],
    [undefined, undefined, undefined],
  ];

  const styleToGrid: Record<string, [number, number]> = {
    'large-value': [0, 0],
    'large-blend': [0, 1],
    'large-growth': [0, 2],
    'mid-value': [1, 0],
    'mid-blend': [1, 1],
    'mid-growth': [1, 2],
    'small-value': [2, 0],
    'small-blend': [2, 1],
    'small-growth': [2, 2],
  };

  for (const cell of cells) {
    const pos = styleToGrid[cell.style];
    if (pos) grid[pos[0]][pos[1]] = cell;
  }

  // Get min/max for heat coloring
  const allReturns = cells.map((c) => getCellReturn(c, period));
  const minRet = Math.min(...allReturns);
  const maxRet = Math.max(...allReturns);

  return (
    <div className="flex-1 overflow-auto no-scrollbar px-2 py-2">
      {/* Top axis: Value / Blend / Growth */}
      <div className="grid grid-cols-[32px_1fr_1fr_1fr] gap-0 mb-0.5">
        <div />
        {STYLE_LABELS.map((label) => (
          <div key={label} className="text-center">
            <span className="text-[7px] font-mono font-black uppercase tracking-widest text-neutral-600">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Grid rows */}
      {SIZE_LABELS.map((sizeLabel, rowIdx) => (
        <div key={sizeLabel} className="grid grid-cols-[32px_1fr_1fr_1fr] gap-0">
          {/* Left axis label */}
          <div className="flex items-center justify-end pr-1.5">
            <span className="text-[7px] font-mono font-black uppercase tracking-wider text-neutral-600 [writing-mode:horizontal-tb]">
              {sizeLabel}
            </span>
          </div>

          {/* 3 cells */}
          {[0, 1, 2].map((colIdx) => {
            const cell = grid[rowIdx][colIdx];
            if (!cell) return <div key={colIdx} className="aspect-square border border-border/20 bg-black/50" />;

            const ret = getCellReturn(cell, period);
            const bg = getHeatIntensity(ret, minRet, maxRet);

            return (
              <div
                key={colIdx}
                className="aspect-square border border-border/20 p-1.5 flex flex-col justify-between hover:bg-indigo-400/[0.02] transition-colors"
                style={{ backgroundColor: bg }}
              >
                <div className="flex flex-col">
                  <span className="text-[7px] font-mono font-bold text-neutral-300 uppercase leading-tight">
                    {cell.label}
                  </span>
                  <span className="text-[6px] font-mono text-neutral-500">{cell.etf}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span
                    className="text-[10px] font-mono font-black tabular-nums"
                    style={{ color: getReturnColor(ret) }}
                  >
                    {fmtPct(ret)}
                  </span>
                  <div className="mt-0.5">
                    <MiniSparkline data={cell.history} width={32} height={10} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Bottom spreads */}
      <div className="mt-3 flex flex-col gap-1.5 px-1">
        <SpreadBar label="Val vs Grw" value={data.valueVsGrowth} />
        <SpreadBar label="Sml vs Lrg" value={data.smallVsLarge} />
      </div>
    </div>
  );
}

// ── TABLE View ──

function TableView({ data }: { data: StyleBoxResponse }) {
  const [sortKey, setSortKey] = useState<SortKey>('ytd');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...data.cells];
    const getSortValue = (c: StyleCell): number | string => {
      switch (sortKey) {
        case 'style': return c.label;
        case 'etf': return c.etf;
        case '1d': return c.return1d;
        case '1w': return c.return1w;
        case '1m': return c.return1m;
        case '3m': return c.return3m;
        case 'ytd': return c.returnYtd;
        case '1y': return c.return1y;
        case 'pe': return c.peRatio;
        case 'pb': return c.pbRatio;
        case 'div': return c.dividendYield;
        case 'mcap': return c.avgMarketCap;
        case 'flow': return c.flow1m;
        case 'rs': return c.relativeStrength;
        case 'mom': return c.momentum;
        default: return 0;
      }
    };
    arr.sort((a, b) => {
      const va = getSortValue(a);
      const vb = getSortValue(b);
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return arr;
  }, [data.cells, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const headers: { key: SortKey; label: string; align?: string }[] = [
    { key: 'style', label: 'STYLE' },
    { key: 'etf', label: 'ETF' },
    { key: '1d', label: '1D', align: 'right' },
    { key: '1w', label: '1W', align: 'right' },
    { key: '1m', label: '1M', align: 'right' },
    { key: '3m', label: '3M', align: 'right' },
    { key: 'ytd', label: 'YTD', align: 'right' },
    { key: '1y', label: '1Y', align: 'right' },
    { key: 'pe', label: 'P/E', align: 'right' },
    { key: 'pb', label: 'P/B', align: 'right' },
    { key: 'div', label: 'DIV%', align: 'right' },
    { key: 'mcap', label: 'MCAP', align: 'right' },
    { key: 'flow', label: 'FLOW', align: 'right' },
    { key: 'rs', label: 'RS', align: 'right' },
    { key: 'mom', label: 'MOM', align: 'right' },
  ];

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      <table className="w-full text-[7px] font-mono">
        <thead>
          <tr className="border-b border-border/30 sticky top-0 bg-black z-10">
            {headers.map((h) => (
              <th
                key={h.key}
                className={`px-1.5 py-1 font-black uppercase tracking-wider text-neutral-600 cursor-pointer hover:text-neutral-400 transition-colors whitespace-nowrap ${
                  h.align === 'right' ? 'text-right' : 'text-left'
                } ${sortKey === h.key ? 'text-indigo-400' : ''}`}
                onClick={() => handleSort(h.key)}
              >
                {h.label}
                {sortKey === h.key && (
                  <span className="ml-0.5">{sortAsc ? '\u25B2' : '\u25BC'}</span>
                )}
              </th>
            ))}
            <th className="px-1.5 py-1 font-black uppercase tracking-wider text-neutral-600 text-center whitespace-nowrap">
              SPARK
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((cell) => (
            <tr
              key={cell.style}
              className="border-b border-border/10 hover:bg-indigo-400/[0.02] transition-colors"
            >
              <td className="px-1.5 py-[3px] text-neutral-300 font-bold whitespace-nowrap">{cell.label}</td>
              <td className="px-1.5 py-[3px] text-neutral-500 whitespace-nowrap">{cell.etf}</td>
              <td className="px-1.5 py-[3px] text-right tabular-nums font-bold" style={{ color: getReturnColor(cell.return1d) }}>
                {fmtPct(cell.return1d)}
              </td>
              <td className="px-1.5 py-[3px] text-right tabular-nums font-bold" style={{ color: getReturnColor(cell.return1w) }}>
                {fmtPct(cell.return1w)}
              </td>
              <td className="px-1.5 py-[3px] text-right tabular-nums font-bold" style={{ color: getReturnColor(cell.return1m) }}>
                {fmtPct(cell.return1m)}
              </td>
              <td className="px-1.5 py-[3px] text-right tabular-nums font-bold" style={{ color: getReturnColor(cell.return3m) }}>
                {fmtPct(cell.return3m)}
              </td>
              <td className="px-1.5 py-[3px] text-right tabular-nums font-bold" style={{ color: getReturnColor(cell.returnYtd) }}>
                {fmtPct(cell.returnYtd)}
              </td>
              <td className="px-1.5 py-[3px] text-right tabular-nums font-bold" style={{ color: getReturnColor(cell.return1y) }}>
                {fmtPct(cell.return1y)}
              </td>
              <td className="px-1.5 py-[3px] text-right tabular-nums text-neutral-400">{fmtNum(cell.peRatio)}</td>
              <td className="px-1.5 py-[3px] text-right tabular-nums text-neutral-400">{fmtNum(cell.pbRatio)}</td>
              <td className="px-1.5 py-[3px] text-right tabular-nums text-neutral-400">{fmtNum(cell.dividendYield)}%</td>
              <td className="px-1.5 py-[3px] text-right tabular-nums text-neutral-400">{fmtNum(cell.avgMarketCap, 0)}B</td>
              <td className="px-1.5 py-[3px] text-right tabular-nums" style={{ color: getReturnColor(cell.flow1m) }}>
                {cell.flow1m > 0 ? '+' : ''}{fmtNum(cell.flow1m, 0)}M
              </td>
              <td className="px-1.5 py-[3px] text-right tabular-nums" style={{ color: getReturnColor(cell.relativeStrength) }}>
                {fmtPct(cell.relativeStrength)}
              </td>
              <td className="px-1.5 py-[3px] text-right tabular-nums text-neutral-400">{cell.momentum}</td>
              <td className="px-1.5 py-[3px] text-center">
                <MiniSparkline data={cell.history} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── ROTATION View ──

function RotationView({ data }: { data: StyleBoxResponse }) {
  const t = useT();

  return (
    <div className="flex-1 overflow-auto no-scrollbar px-2 py-2">
      {/* Rotation Signals */}
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'sbRotationSignals', 'Rotation Signals')}
      </div>

      {data.rotation.length === 0 ? (
        <div className="text-center py-4 text-[9px] font-mono text-neutral-600 uppercase">
          {tr(t, 'sbNoRotation', 'No significant rotation detected')}
        </div>
      ) : (
        <div className="flex flex-col gap-1 mb-3">
          {data.rotation.map((signal, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1.5 border border-border/20 hover:bg-indigo-400/[0.02] transition-colors"
            >
              {/* From -> To */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[8px] font-mono font-bold text-red-400 uppercase">
                  {styleLabelFromKey(signal.from)}
                </span>
                <ArrowRight className="w-3 h-3 text-neutral-600" />
                <span className="text-[8px] font-mono font-bold text-green-400 uppercase">
                  {styleLabelFromKey(signal.to)}
                </span>
              </div>

              {/* Strength bar */}
              <div className="shrink-0">
                <StrengthBar value={signal.strength} />
              </div>

              {/* Strength label */}
              <span className="text-[7px] font-mono font-bold tabular-nums shrink-0" style={{ color: ACCENT }}>
                {signal.strength.toFixed(0)}
              </span>

              {/* Description */}
              <span className="text-[7px] font-mono text-neutral-500 truncate flex-1">
                {signal.description}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Spread Charts */}
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1 mt-3">
        {tr(t, 'sbStyleSpreads', 'Style Spreads (YTD)')}
      </div>

      <div className="flex flex-col gap-2 px-1">
        <SpreadBar label="Value vs Growth" value={data.valueVsGrowth} />
        <SpreadBar label="Small vs Large" value={data.smallVsLarge} />
      </div>

      {/* Style performance ranking */}
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1 mt-4">
        {tr(t, 'sbYtdRanking', 'YTD Performance Ranking')}
      </div>

      <RankingBars cells={data.cells} />

      {/* Timestamp */}
      <div className="mt-3 text-[6px] font-mono text-neutral-700 uppercase px-1">
        {tr(t, 'sbUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

// ── Ranking Bars (SVG) ──

function RankingBars({ cells }: { cells: StyleCell[] }) {
  const sorted = useMemo(
    () => [...cells].sort((a, b) => b.returnYtd - a.returnYtd),
    [cells],
  );

  const maxAbs = useMemo(
    () => Math.max(...sorted.map((c) => Math.abs(c.returnYtd)), 0.01),
    [sorted],
  );

  const ROW_H = 16;
  const PAD_LEFT = 75;
  const PAD_RIGHT = 50;
  const W = 340;
  const CENTER_X = PAD_LEFT + (W - PAD_LEFT - PAD_RIGHT) / 2;
  const BAR_HALF = (W - PAD_LEFT - PAD_RIGHT) / 2;
  const H = sorted.length * ROW_H + 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: sorted.length * 20 }}>
      <line
        x1={CENTER_X}
        y1={0}
        x2={CENTER_X}
        y2={H}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={0.5}
      />

      {sorted.map((cell, i) => {
        const y = i * ROW_H + 2;
        const barWidth = (Math.abs(cell.returnYtd) / maxAbs) * BAR_HALF;
        const isPositive = cell.returnYtd >= 0;
        const barX = isPositive ? CENTER_X : CENTER_X - barWidth;
        const barColor = getReturnColor(cell.returnYtd);

        return (
          <g key={cell.style}>
            <text
              x={PAD_LEFT - 4}
              y={y + ROW_H / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#a1a1aa"
              fontSize={6.5}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {cell.label}
            </text>
            <rect
              x={barX}
              y={y + 3}
              width={Math.max(barWidth, 1)}
              height={ROW_H - 6}
              fill={barColor}
              opacity={0.7}
            />
            <text
              x={W - PAD_RIGHT + 4}
              y={y + ROW_H / 2}
              textAnchor="start"
              dominantBaseline="middle"
              fill={barColor}
              fontSize={6.5}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {fmtPct(cell.returnYtd)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Main Panel ──

export function StyleBoxPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useStyleBox();
  const [view, setView] = useState<View>('GRID');
  const [period, setPeriod] = useState<ReturnPeriod>('YTD');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Grid3x3 className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'sbTitle', 'Equity Style Box')}
          </span>

          {/* Best / Worst badges */}
          {data && (
            <>
              <span className="text-[6px] font-mono font-black uppercase px-1 py-[1px] bg-green-500/20 text-green-400">
                {styleLabelFromKey(data.bestStyle)}
              </span>
              <span className="text-[6px] font-mono font-black uppercase px-1 py-[1px] bg-red-500/20 text-red-400">
                {styleLabelFromKey(data.worstStyle)}
              </span>
            </>
          )}
        </div>

        <button
          onClick={() => refetch()}
          className="p-1 text-neutral/40 hover:text-indigo-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Controls */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-1 border-b border-border/20 bg-[#050505]">
        {/* View toggle */}
        <div className="flex items-center gap-0.5">
          {(['GRID', 'TABLE', 'ROTATION'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2 py-0.5 text-[8px] font-mono font-black uppercase transition-all ${
                view === v
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'text-neutral-600 hover:text-white'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Period selector (for GRID view) */}
        {view === 'GRID' && (
          <div className="flex items-center gap-0.5">
            {RETURN_PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-1.5 py-0.5 text-[7px] font-mono font-black transition-all ${
                  period === p
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'text-neutral-600 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading && !data && (
        <div
          className="flex-1 flex items-center justify-center text-[9px] font-mono uppercase animate-pulse"
          style={{ color: ACCENT }}
        >
          {tr(t, 'loading', 'Loading...')}
        </div>
      )}

      {!data && !isLoading && (
        <div className="flex-1 flex items-center justify-center text-neutral-600 text-[9px] font-mono uppercase">
          {tr(t, 'sbNoData', 'No data available')}
        </div>
      )}

      {data && view === 'GRID' && <GridView data={data} period={period} />}
      {data && view === 'TABLE' && <TableView data={data} />}
      {data && view === 'ROTATION' && <RotationView data={data} />}
    </div>
  );
}
