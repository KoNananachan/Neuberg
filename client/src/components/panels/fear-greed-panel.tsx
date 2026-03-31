import { useFearGreed, type FearGreedData } from '../../api/hooks/use-fear-greed';
import { useT } from '../../i18n';
import { Gauge, RefreshCw } from 'lucide-react';

// i18n keys don't exist yet — cast t to accept arbitrary strings
const t_ = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  return (t as (k: string) => string)(key) || fallback;
};

export function FearGreedPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useFearGreed();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {t_(t, 'fgTitle', 'Crypto Fear & Greed')}
          </span>
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-amber-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {t_(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {t_(t, 'fgNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <GaugeDisplay data={data} />
            <HistoryChart data={data} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Color helpers ──

function getZoneColor(value: number): { text: string; fill: string; stroke: string; bg: string; label: string } {
  if (value <= 25) return { text: 'text-red-400', fill: '#f87171', stroke: '#ef4444', bg: 'rgba(248,113,113,0.1)', label: 'Extreme Fear' };
  if (value <= 45) return { text: 'text-orange-400', fill: '#fb923c', stroke: '#f97316', bg: 'rgba(251,146,60,0.1)', label: 'Fear' };
  if (value <= 55) return { text: 'text-yellow-400', fill: '#facc15', stroke: '#eab308', bg: 'rgba(250,204,21,0.1)', label: 'Neutral' };
  if (value <= 75) return { text: 'text-green-400', fill: '#4ade80', stroke: '#22c55e', bg: 'rgba(74,222,128,0.1)', label: 'Greed' };
  return { text: 'text-emerald-400', fill: '#34d399', stroke: '#10b981', bg: 'rgba(52,211,153,0.1)', label: 'Extreme Greed' };
}

// ── Gauge Display ──

function GaugeDisplay({ data }: { data: FearGreedData }) {
  const t = useT();
  const { value, classification } = data.current;
  const zone = getZoneColor(value);

  // SVG arc gauge: 180-degree semicircle (centered in viewBox)
  const CX = 100;
  const CY = 80;
  const R = 55;
  const STROKE_W = 8;

  // Arc from 180deg (left) to 0deg (right) = PI to 0
  const startAngle = Math.PI; // left
  const endAngle = 0; // right
  const totalAngle = Math.PI;

  // Needle angle based on value (0=left, 100=right)
  const needleAngle = startAngle - (value / 100) * totalAngle;
  const needleX = CX + (R - 5) * Math.cos(needleAngle);
  const needleY = CY - (R - 5) * Math.sin(needleAngle);

  // Zone arcs (draw colored segments)
  const zones = [
    { from: 0, to: 25, color: '#ef4444' },   // Extreme Fear - red
    { from: 25, to: 45, color: '#f97316' },   // Fear - orange
    { from: 45, to: 55, color: '#eab308' },   // Neutral - yellow
    { from: 55, to: 75, color: '#22c55e' },   // Greed - green
    { from: 75, to: 100, color: '#10b981' },  // Extreme Greed - emerald
  ];

  function arcPath(fromPct: number, toPct: number): string {
    const a1 = startAngle - (fromPct / 100) * totalAngle;
    const a2 = startAngle - (toPct / 100) * totalAngle;
    const x1 = CX + R * Math.cos(a1);
    const y1 = CY - R * Math.sin(a1);
    const x2 = CX + R * Math.cos(a2);
    const y2 = CY - R * Math.sin(a2);
    const largeArc = (toPct - fromPct) > 50 ? 1 : 0;
    return `M ${x1},${y1} A ${R},${R} 0 ${largeArc} 1 ${x2},${y2}`;
  }

  // Previous day delta
  const prevValue = data.history.length > 1 ? data.history[1].value : null;
  const delta = prevValue !== null ? value - prevValue : null;

  // Tick marks around the arc
  const ticks = [];
  for (let i = 0; i <= 20; i++) {
    const pct = (i / 20) * 100;
    const angle = startAngle - (pct / 100) * totalAngle;
    const isMajor = i % 5 === 0;
    const outerR = R + STROKE_W / 2 + 1;
    const innerR = R + STROKE_W / 2 - (isMajor ? 6 : 3);
    ticks.push({
      x1: CX + outerR * Math.cos(angle),
      y1: CY - outerR * Math.sin(angle),
      x2: CX + innerR * Math.cos(angle),
      y2: CY - innerR * Math.sin(angle),
      major: isMajor,
    });
  }

  return (
    <div className="px-3 py-3 border-b border-border/20 flex flex-col items-center">
      <svg viewBox="0 0 200 105" className="w-full" style={{ maxWidth: 200 }}>
        {/* Background track */}
        <path
          d={arcPath(0, 100)}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={STROKE_W}
          strokeLinecap="round"
        />

        {/* Zone arcs */}
        {zones.map((z) => (
          <path
            key={z.from}
            d={arcPath(z.from, z.to)}
            fill="none"
            stroke={z.color}
            strokeWidth={STROKE_W}
            strokeLinecap="butt"
            opacity={0.6}
          />
        ))}

        {/* Tick marks */}
        {ticks.map((tick, i) => (
          <line
            key={i}
            x1={tick.x1} y1={tick.y1}
            x2={tick.x2} y2={tick.y2}
            stroke={tick.major ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}
            strokeWidth={tick.major ? 1.2 : 0.6}
          />
        ))}

        {/* Needle - tapered triangle */}
        <polygon
          points={`${CX + 3 * Math.cos(needleAngle + Math.PI / 2)},${CY - 3 * Math.sin(needleAngle + Math.PI / 2)} ${CX + 3 * Math.cos(needleAngle - Math.PI / 2)},${CY - 3 * Math.sin(needleAngle - Math.PI / 2)} ${needleX},${needleY}`}
          fill={zone.fill}
          opacity={0.9}
        />
        {/* Center dot */}
        <circle cx={CX} cy={CY} r={3} fill={zone.fill} />
        <circle cx={CX} cy={CY} r={1.5} fill="#111" />

        {/* Value text */}
        <text
          x={CX}
          y={CY + 4}
          textAnchor="middle"
          fill="white"
          fontSize={26}
          fontFamily="monospace"
          fontWeight="900"
          dominantBaseline="hanging"
        >
          {value}
        </text>

        {/* Labels at ends */}
        <text x={CX - R - 8} y={CY + 10} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace">0</text>
        <text x={CX + R + 8} y={CY + 10} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace">100</text>
      </svg>

      {/* Classification + delta */}
      <div className="flex flex-col items-center gap-1 -mt-1">
        <span className={`text-[11px] font-black font-mono uppercase tracking-wider ${zone.text}`}>
          {classification}
        </span>
        {delta !== null && (
          <span className={`text-[8px] font-mono font-bold ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-neutral/40'}`}>
            {delta > 0 ? '+' : ''}{delta} {t_(t, 'fgVsPrev', 'vs yesterday')}
          </span>
        )}
      </div>
    </div>
  );
}

// ── 30-Day History Chart ──

function HistoryChart({ data }: { data: FearGreedData }) {
  const t = useT();
  const history = [...data.history].reverse(); // oldest first

  if (history.length < 2) return null;

  const W = 300;
  const H = 130;
  const PAD_X = 30;
  const PAD_Y = 12;
  const PAD_BOTTOM = 18;

  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y - PAD_BOTTOM;

  const scaleX = (i: number) => PAD_X + (i / (history.length - 1)) * chartW;
  const scaleY = (v: number) => PAD_Y + ((100 - v) / 100) * chartH;

  // Build line path
  const points = history.map((h, i) => ({ x: scaleX(i), y: scaleY(h.value), value: h.value, date: h.date }));
  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');

  // Area fill
  const areaD = `${pathD} L ${points[points.length - 1].x},${H - PAD_BOTTOM} L ${points[0].x},${H - PAD_BOTTOM} Z`;

  // Color zone boundaries
  const zoneLines = [
    { y: 25, color: 'rgba(239,68,68,0.15)', label: '25' },
    { y: 45, color: 'rgba(249,115,22,0.12)', label: '45' },
    { y: 55, color: 'rgba(234,179,8,0.1)', label: '55' },
    { y: 75, color: 'rgba(34,197,94,0.1)', label: '75' },
  ];

  // Zone background rects
  const zoneBands = [
    { from: 0, to: 25, color: 'rgba(239,68,68,0.04)' },
    { from: 25, to: 45, color: 'rgba(249,115,22,0.03)' },
    { from: 45, to: 55, color: 'rgba(234,179,8,0.03)' },
    { from: 55, to: 75, color: 'rgba(34,197,94,0.03)' },
    { from: 75, to: 100, color: 'rgba(16,185,129,0.04)' },
  ];

  // Y-axis ticks
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <div className="px-3 py-3">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {t_(t, 'fgHistory', '30-Day History')}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
        {/* Zone background bands */}
        {zoneBands.map((z) => (
          <rect
            key={z.from}
            x={PAD_X}
            y={scaleY(z.to)}
            width={chartW}
            height={scaleY(z.from) - scaleY(z.to)}
            fill={z.color}
          />
        ))}

        {/* Zone boundary lines */}
        {zoneLines.map((z) => (
          <line
            key={z.y}
            x1={PAD_X}
            y1={scaleY(z.y)}
            x2={W - PAD_X}
            y2={scaleY(z.y)}
            stroke={z.color}
            strokeDasharray="3,3"
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((v) => (
          <text
            key={v}
            x={PAD_X - 4}
            y={scaleY(v) + 3}
            textAnchor="end"
            fill="rgba(255,255,255,0.2)"
            fontSize={6}
            fontFamily="monospace"
          >
            {v}
          </text>
        ))}

        {/* Area fill with gradient feel */}
        <path d={areaD} fill="rgba(251,191,36,0.08)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#fbbf24" strokeWidth={1.5} opacity={0.8} />

        {/* Data point dots — show every 5th + first/last */}
        {points.map((p, i) => {
          if (i !== 0 && i !== points.length - 1 && i % 5 !== 0) return null;
          const dotColor = getZoneColor(p.value).fill;
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={2.5} fill={dotColor} opacity={0.8} />
              <circle cx={p.x} cy={p.y} r={1.2} fill="#000" />
            </g>
          );
        })}

        {/* Start/end value labels */}
        {points.length > 0 && (
          <>
            <text
              x={points[0].x}
              y={points[0].y - 6}
              textAnchor="start"
              fill="rgba(255,255,255,0.5)"
              fontSize={7}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {points[0].value}
            </text>
            <text
              x={points[points.length - 1].x}
              y={points[points.length - 1].y - 6}
              textAnchor="end"
              fill="rgba(255,255,255,0.7)"
              fontSize={7}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {points[points.length - 1].value}
            </text>
          </>
        )}

        {/* X-axis date labels — show a few */}
        {points.map((p, i) => {
          // Show first, last, and middle
          if (i !== 0 && i !== points.length - 1 && i !== Math.floor(points.length / 2)) return null;
          const dateLabel = p.date.slice(5); // MM-DD
          return (
            <text
              key={`x-${i}`}
              x={p.x}
              y={H - 4}
              textAnchor="middle"
              fill="rgba(255,255,255,0.25)"
              fontSize={6}
              fontFamily="monospace"
            >
              {dateLabel}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
