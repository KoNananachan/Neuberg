import { useState } from 'react';
import { useDispersion, type DispersionData, type DispersionStock } from '../../api/hooks/use-dispersion';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback for keys not yet in translations
// ── Color helpers ──

const VIOLET = '#8b5cf6';
const VIOLET_DIM = 'rgba(139,92,246,0.15)';
const ORANGE = '#f97316';

function getLevelBadge(level: DispersionData['level']): { text: string; bg: string; color: string } {
  switch (level) {
    case 'high_corr':
      return { text: 'HIGH CORRELATION', bg: 'rgba(239,68,68,0.15)', color: '#f87171' };
    case 'high_dispersion':
      return { text: 'HIGH DISPERSION', bg: 'rgba(251,146,60,0.15)', color: '#fb923c' };
    default:
      return { text: 'NORMAL', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
  }
}

function getBetaColor(beta: number): string {
  if (beta > 1.2) return 'text-red-400';
  if (beta < 0.8) return 'text-blue-400';
  return 'text-neutral-400';
}

function getChangeColor(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function heatmapColor(value: number): string {
  // blue (negative) -> white (zero) -> red (high positive)
  if (value >= 0) {
    const intensity = Math.min(value, 1);
    const r = Math.round(220 + 35 * intensity);
    const g = Math.round(220 - 152 * intensity);
    const b = Math.round(220 - 152 * intensity);
    return `rgb(${r},${g},${b})`;
  } else {
    const intensity = Math.min(Math.abs(value), 1);
    const r = Math.round(220 - 161 * intensity);
    const g = Math.round(220 - 90 * intensity);
    const b = Math.round(220 + 35 * intensity);
    return `rgb(${r},${g},${b})`;
  }
}

// ── Main Panel ──

export function DispersionPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useDispersion();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <circle cx="5" cy="5" r="3" stroke={VIOLET} strokeWidth="1.2" fill="none" />
            <circle cx="11" cy="5" r="3" stroke={VIOLET} strokeWidth="1.2" fill="none" />
            <circle cx="8" cy="11" r="3" stroke={VIOLET} strokeWidth="1.2" fill="none" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter" style={{ color: VIOLET }}>
            {tr(t, 'dispersionTitle', 'Dispersion Monitor')}
          </span>
          {data && (() => {
            const badge = getLevelBadge(data.level);
            return (
              <span
                className="text-[7px] font-mono font-black uppercase px-1.5 py-[1px] ml-1"
                style={{ background: badge.bg, color: badge.color }}
              >
                {badge.text}
              </span>
            );
          })()}
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-violet-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-12 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'dispersionNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <KeyMetrics data={data} />
            <HistoryChart data={data} />
            <HeatmapSection data={data} />
            <StockTable data={data} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Key Metrics Row ──

function KeyMetrics({ data }: { data: DispersionData }) {
  const t = useT();

  const metrics = [
    {
      label: tr(t, 'dispersionAvgCorr', 'Avg Corr (20d)'),
      value: data.avgCorrelation20d.toFixed(3),
      sub: `60d: ${data.avgCorrelation60d.toFixed(3)}`,
      color: data.avgCorrelation20d > 0.6 ? '#f87171' : data.avgCorrelation20d < 0.3 ? '#34d399' : VIOLET,
    },
    {
      label: tr(t, 'dispersionRatio', 'Dispersion Ratio'),
      value: data.dispersionRatio.toFixed(2),
      sub: data.dispersionRatio > 1.5 ? 'HIGH' : data.dispersionRatio > 1.0 ? 'ELEVATED' : 'LOW',
      color: data.dispersionRatio > 1.5 ? ORANGE : data.dispersionRatio > 1.0 ? '#fbbf24' : '#34d399',
    },
    {
      label: tr(t, 'dispersionIndexVol', 'Index Vol (20d)'),
      value: `${data.indexVol20d.toFixed(1)}%`,
      sub: `Avg stk: ${data.avgStockVol20d.toFixed(1)}%`,
      color: data.indexVol20d > 20 ? '#f87171' : data.indexVol20d > 15 ? '#fbbf24' : VIOLET,
    },
    {
      label: tr(t, 'dispersionConcentration', 'Concentration'),
      value: `${data.concentrationPct}%`,
      sub: 'Top 5 variance',
      color: data.concentrationPct > 50 ? '#f87171' : VIOLET,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-0 border-b border-border/20">
      {metrics.map((m) => (
        <div key={m.label} className="px-2 py-2 border-r border-border/10 last:border-r-0">
          <div className="text-[6px] font-mono font-bold uppercase tracking-wider text-neutral-600 mb-1">
            {m.label}
          </div>
          <div className="text-[14px] font-black font-mono tabular-nums" style={{ color: m.color }}>
            {m.value}
          </div>
          <div className="text-[7px] font-mono text-neutral-600 mt-0.5">{m.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── 2. History Chart (SVG dual-axis) ──

function HistoryChart({ data }: { data: DispersionData }) {
  const t = useT();
  const history = data.history;
  if (history.length < 2) return null;

  const W = 400;
  const H = 120;
  const PAD_L = 32;
  const PAD_R = 35;
  const PAD_T = 14;
  const PAD_B = 18;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  // Correlation axis: 0.0 - 1.0
  const corrMin = 0;
  const corrMax = 1;

  // Dispersion axis: auto-scale
  const drValues = history.map((h) => h.dispersionRatio);
  const drMin = Math.floor(Math.min(...drValues) * 10) / 10;
  const drMax = Math.ceil(Math.max(...drValues) * 10) / 10 + 0.1;

  function xPos(i: number): number {
    return PAD_L + (i / (history.length - 1)) * plotW;
  }
  function yCorrPos(v: number): number {
    return PAD_T + plotH - ((v - corrMin) / (corrMax - corrMin)) * plotH;
  }
  function yDrPos(v: number): number {
    return PAD_T + plotH - ((v - drMin) / (drMax - drMin)) * plotH;
  }

  // Build SVG path strings
  const corrPath = history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)},${yCorrPos(h.avgCorrelation).toFixed(1)}`).join(' ');
  const drPath = history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)},${yDrPos(h.dispersionRatio).toFixed(1)}`).join(' ');

  // Shaded normal correlation band (0.2 - 0.5)
  const bandTop = yCorrPos(0.5);
  const bandBot = yCorrPos(0.2);

  // Date labels
  const firstDate = history[0]?.date?.slice(5) ?? '';
  const midDate = history[Math.floor(history.length / 2)]?.date?.slice(5) ?? '';
  const lastDate = history[history.length - 1]?.date?.slice(5) ?? '';

  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1 px-1">
        {tr(t, 'dispersionHistory', 'Correlation & Dispersion History (20d Rolling)')}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
        {/* Normal band */}
        <rect x={PAD_L} y={bandTop} width={plotW} height={bandBot - bandTop} fill="rgba(139,92,246,0.06)" />

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1.0].map((v) => (
          <g key={v}>
            <line
              x1={PAD_L} y1={yCorrPos(v)} x2={PAD_L + plotW} y2={yCorrPos(v)}
              stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"
            />
            <text x={PAD_L - 3} y={yCorrPos(v) + 2.5} textAnchor="end" fill={VIOLET} fontSize={6} fontFamily="monospace" opacity={0.5}>
              {v.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Right axis labels */}
        {[drMin, (drMin + drMax) / 2, drMax].map((v) => (
          <text key={v} x={PAD_L + plotW + 3} y={yDrPos(v) + 2.5} textAnchor="start" fill={ORANGE} fontSize={6} fontFamily="monospace" opacity={0.5}>
            {v.toFixed(1)}
          </text>
        ))}

        {/* Correlation line */}
        <path d={corrPath} fill="none" stroke={VIOLET} strokeWidth="1.5" />

        {/* Dispersion ratio line */}
        <path d={drPath} fill="none" stroke={ORANGE} strokeWidth="1.2" strokeDasharray="3,2" />

        {/* Date labels */}
        <text x={xPos(0)} y={H - 2} textAnchor="start" fill="rgba(255,255,255,0.25)" fontSize={6} fontFamily="monospace">{firstDate}</text>
        <text x={xPos(Math.floor(history.length / 2))} y={H - 2} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={6} fontFamily="monospace">{midDate}</text>
        <text x={xPos(history.length - 1)} y={H - 2} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={6} fontFamily="monospace">{lastDate}</text>

        {/* Legend */}
        <line x1={PAD_L} y1={6} x2={PAD_L + 14} y2={6} stroke={VIOLET} strokeWidth="1.5" />
        <text x={PAD_L + 17} y={8} fill={VIOLET} fontSize={6} fontFamily="monospace" opacity={0.7}>Corr</text>
        <line x1={PAD_L + 45} y1={6} x2={PAD_L + 59} y2={6} stroke={ORANGE} strokeWidth="1.2" strokeDasharray="3,2" />
        <text x={PAD_L + 62} y={8} fill={ORANGE} fontSize={6} fontFamily="monospace" opacity={0.7}>Disp</text>
      </svg>
    </div>
  );
}

// ── 3. Correlation Heatmap ──

function HeatmapSection({ data }: { data: DispersionData }) {
  const t = useT();
  const [hoveredCell, setHoveredCell] = useState<{ i: number; j: number } | null>(null);
  const { symbols, values } = data.correlationMatrix;
  const n = symbols.length;

  const CELL = 14;
  const LABEL_W = 30;
  const LABEL_H = 30;
  const W = LABEL_W + n * CELL;
  const H = LABEL_H + n * CELL;

  // Short symbol names (remove ^ prefix)
  const shortNames = symbols.map((s) => s.replace('^', '').slice(0, 4));

  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1 px-1">
        {tr(t, 'dispersionHeatmap', 'Pairwise Correlation Matrix (20d)')}
      </div>
      <div className="overflow-auto no-scrollbar">
        <svg
          viewBox={`0 0 ${W + 8} ${H + 8}`}
          className="w-full"
          style={{ maxHeight: 280, minWidth: 260 }}
        >
          {/* Column labels (top) */}
          {shortNames.map((name, j) => (
            <text
              key={`col-${j}`}
              x={LABEL_W + j * CELL + CELL / 2}
              y={LABEL_H - 3}
              textAnchor="middle"
              fill="rgba(255,255,255,0.4)"
              fontSize={5.5}
              fontFamily="monospace"
              fontWeight="bold"
              transform={`rotate(-45, ${LABEL_W + j * CELL + CELL / 2}, ${LABEL_H - 3})`}
            >
              {name}
            </text>
          ))}

          {/* Row labels (left) */}
          {shortNames.map((name, i) => (
            <text
              key={`row-${i}`}
              x={LABEL_W - 3}
              y={LABEL_H + i * CELL + CELL / 2 + 2}
              textAnchor="end"
              fill="rgba(255,255,255,0.4)"
              fontSize={5.5}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {name}
            </text>
          ))}

          {/* Cells */}
          {values.map((row, i) =>
            row.map((val, j) => {
              const isHovered = hoveredCell?.i === i && hoveredCell?.j === j;
              return (
                <g key={`${i}-${j}`}>
                  <rect
                    x={LABEL_W + j * CELL}
                    y={LABEL_H + i * CELL}
                    width={CELL}
                    height={CELL}
                    fill={i === j ? 'rgba(63,63,70,0.3)' : heatmapColor(val)}
                    stroke={isHovered ? '#fff' : 'rgba(0,0,0,0.3)'}
                    strokeWidth={isHovered ? 1 : 0.3}
                    onMouseEnter={() => setHoveredCell({ i, j })}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={{ cursor: 'crosshair' }}
                  />
                  {CELL >= 14 && i !== j && (
                    <text
                      x={LABEL_W + j * CELL + CELL / 2}
                      y={LABEL_H + i * CELL + CELL / 2 + 2}
                      textAnchor="middle"
                      fill={Math.abs(val) > 0.5 ? '#000' : 'rgba(0,0,0,0.6)'}
                      fontSize={4.5}
                      fontFamily="monospace"
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      {val.toFixed(1)}
                    </text>
                  )}
                </g>
              );
            }),
          )}

          {/* Hover tooltip */}
          {hoveredCell && (() => {
            const { i, j } = hoveredCell;
            const val = values[i][j];
            const tx = LABEL_W + j * CELL + CELL / 2;
            const ty = LABEL_H + i * CELL - 4;
            return (
              <g>
                <rect
                  x={tx - 28} y={ty - 9} width={56} height={12} rx={1}
                  fill="rgba(0,0,0,0.85)" stroke="rgba(139,92,246,0.4)" strokeWidth={0.5}
                />
                <text x={tx} y={ty - 1} textAnchor="middle" fill="#e4e4e7" fontSize={6} fontFamily="monospace">
                  {symbols[i]}/{symbols[j]}: {val.toFixed(3)}
                </text>
              </g>
            );
          })()}

          {/* Color scale legend */}
          {[
            { val: -0.5, label: '-0.5' },
            { val: 0, label: '0' },
            { val: 0.5, label: '0.5' },
            { val: 1.0, label: '1.0' },
          ].map((item, idx) => (
            <g key={`legend-${idx}`}>
              <rect
                x={LABEL_W + idx * 18}
                y={H + 2}
                width={12}
                height={5}
                fill={heatmapColor(item.val)}
              />
              <text
                x={LABEL_W + idx * 18 + 6}
                y={H + 12}
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

// ── 4. Stock Table ──

function StockTable({ data }: { data: DispersionData }) {
  const t = useT();

  return (
    <div className="px-1 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'dispersionConstituents', 'Constituent Metrics')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[42px_50px_38px_32px_34px_34px_1fr] gap-0 px-1 mb-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Symbol</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Price</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Chg%</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Beta</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Vol</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Corr</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right pr-1">20d</span>
      </div>

      {/* Rows */}
      {data.stocks.map((stock) => (
        <StockRow key={stock.symbol} stock={stock} />
      ))}
    </div>
  );
}

function StockRow({ stock }: { stock: DispersionStock }) {
  const sparkW = 40;
  const sparkH = 12;

  // Build sparkline path
  const points = stock.sparkline;
  const sparkPath = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * sparkW;
      const y = sparkH - v * sparkH;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const corrBarWidth = Math.abs(stock.corrToIndex) * 28;
  const corrColor = stock.corrToIndex > 0.7 ? VIOLET : stock.corrToIndex > 0.4 ? '#a78bfa' : '#6b7280';

  return (
    <div className="grid grid-cols-[42px_50px_38px_32px_34px_34px_1fr] gap-0 px-1 py-[3px] hover:bg-white/[0.02] border-b border-border/10 items-center">
      {/* Symbol */}
      <div className="flex flex-col min-w-0">
        <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">{stock.symbol}</span>
        <span className="text-[6px] font-mono text-neutral-600 truncate">{stock.name}</span>
      </div>

      {/* Price */}
      <span className="text-[8px] font-mono font-bold text-neutral-300 text-right tabular-nums">
        {stock.price >= 1000 ? stock.price.toFixed(0) : stock.price.toFixed(2)}
      </span>

      {/* Change % */}
      <span className={`text-[7.5px] font-mono font-bold text-right tabular-nums ${getChangeColor(stock.changePct)}`}>
        {stock.changePct > 0 ? '+' : ''}{stock.changePct.toFixed(1)}%
      </span>

      {/* Beta */}
      <span className={`text-[7.5px] font-mono font-bold text-right tabular-nums ${getBetaColor(stock.beta)}`}>
        {stock.beta.toFixed(2)}
      </span>

      {/* Vol */}
      <span className="text-[7.5px] font-mono text-right tabular-nums text-neutral-400">
        {stock.realizedVol.toFixed(1)}
      </span>

      {/* Correlation to index with mini bar */}
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[7.5px] font-mono font-bold tabular-nums" style={{ color: corrColor }}>
          {stock.corrToIndex.toFixed(2)}
        </span>
        <div className="w-7 h-[2px] bg-neutral-800">
          <div className="h-full" style={{ width: `${corrBarWidth}px`, background: corrColor }} />
        </div>
      </div>

      {/* Sparkline */}
      <div className="flex justify-end pr-1">
        <svg viewBox={`0 0 ${sparkW} ${sparkH}`} width={sparkW} height={sparkH}>
          <path d={sparkPath} fill="none" stroke={VIOLET} strokeWidth="1" opacity="0.7" />
        </svg>
      </div>
    </div>
  );
}
