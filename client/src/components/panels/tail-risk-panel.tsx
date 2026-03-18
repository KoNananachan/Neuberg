import { useTailRisk, type TailRiskData, type TailRiskIndicator } from '../../api/hooks/use-tail-risk';
import { useT } from '../../i18n';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// i18n fallback helper
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  return (t as (k: string) => string)(key) || fallback;
};

// ── Color Helpers ──

type RiskLevel = TailRiskData['level'];
type AlertLevel = TailRiskIndicator['alertLevel'];
type Category = TailRiskIndicator['category'];

function getLevelColor(level: RiskLevel): { text: string; fill: string; bg: string; glow: string } {
  switch (level) {
    case 'complacent':
      return { text: 'text-cyan-400', fill: '#22d3ee', bg: 'rgba(34,211,238,0.08)', glow: 'rgba(34,211,238,0.3)' };
    case 'normal':
      return { text: 'text-emerald-400', fill: '#34d399', bg: 'rgba(52,211,153,0.08)', glow: 'rgba(52,211,153,0.3)' };
    case 'elevated':
      return { text: 'text-amber-400', fill: '#fbbf24', bg: 'rgba(251,191,36,0.08)', glow: 'rgba(251,191,36,0.3)' };
    case 'high':
      return { text: 'text-orange-400', fill: '#fb923c', bg: 'rgba(251,146,60,0.08)', glow: 'rgba(251,146,60,0.3)' };
    case 'extreme':
      return { text: 'text-red-400', fill: '#f87171', bg: 'rgba(248,113,113,0.08)', glow: 'rgba(248,113,113,0.4)' };
  }
}

function getAlertDotColor(alert: AlertLevel): string {
  switch (alert) {
    case 'normal': return '#525252';
    case 'watch': return '#fbbf24';
    case 'warning': return '#fb923c';
    case 'critical': return '#ef4444';
  }
}

function getCategoryBadge(cat: Category): { label: string; color: string } {
  switch (cat) {
    case 'volatility': return { label: 'VOL', color: 'text-orange-400 bg-orange-400/10' };
    case 'credit': return { label: 'CRD', color: 'text-blue-400 bg-blue-400/10' };
    case 'flight_to_safety': return { label: 'FTS', color: 'text-amber-400 bg-amber-400/10' };
    case 'contagion': return { label: 'CTG', color: 'text-purple-400 bg-purple-400/10' };
    case 'speculative': return { label: 'SPC', color: 'text-pink-400 bg-pink-400/10' };
  }
}

function getDirectionArrow(dir: TailRiskIndicator['direction']): { arrow: string; color: string } {
  switch (dir) {
    case 'rising': return { arrow: '\u2191', color: 'text-red-400' };
    case 'falling': return { arrow: '\u2193', color: 'text-emerald-400' };
    case 'stable': return { arrow: '\u2192', color: 'text-neutral-500' };
  }
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Math.abs(v) >= 100) return v.toFixed(1);
  if (Math.abs(v) >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

// ── Main Panel ──

export function TailRiskPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useTailRisk();

  const levelColor = data ? getLevelColor(data.level) : null;
  const shouldPulse = data && (data.level === 'elevated' || data.level === 'high' || data.level === 'extreme');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-red-500">
            {tr(t, 'tailRiskTitle', 'Tail Risk Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && levelColor && (
            <span
              className={`text-[8px] font-black font-mono uppercase px-1.5 py-0.5 ${levelColor.text}`}
              style={{
                background: levelColor.bg,
                boxShadow: shouldPulse ? `0 0 8px ${levelColor.glow}` : 'none',
                animation: shouldPulse ? 'tail-risk-pulse 2s ease-in-out infinite' : 'none',
              }}
            >
              {data.level}
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-red-500 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Pulse animation style */}
      <style>{`
        @keyframes tail-risk-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes tail-risk-glow {
          0%, 100% { box-shadow: 0 0 4px rgba(239,68,68,0.3); }
          50% { box-shadow: 0 0 12px rgba(239,68,68,0.6); }
        }
      `}</style>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-red-500 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {tr(t, 'tailRiskNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <RiskGauge data={data} />
            {data.alerts.length > 0 && <ActiveAlerts alerts={data.alerts} />}
            <IndicatorGrid indicators={data.indicators} />
            <CompositeHistoryChart data={data} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Risk Gauge (SVG semi-circle) ──

function RiskGauge({ data }: { data: TailRiskData }) {
  const { compositeScore, level } = data;
  const levelColor = getLevelColor(level);

  const CX = 100;
  const CY = 85;
  const R = 65;
  const STROKE_W = 12;

  const startAngle = Math.PI; // left
  const totalAngle = Math.PI;

  // Needle angle
  const needleAngle = startAngle - (compositeScore / 100) * totalAngle;
  const needleX = CX + (R - 8) * Math.cos(needleAngle);
  const needleY = CY - (R - 8) * Math.sin(needleAngle);

  // Zone arcs
  const zones = [
    { from: 0, to: 20, color: '#22d3ee' },   // Complacent - cyan
    { from: 20, to: 40, color: '#34d399' },   // Normal - green
    { from: 40, to: 60, color: '#fbbf24' },   // Elevated - amber
    { from: 60, to: 80, color: '#fb923c' },   // High - orange
    { from: 80, to: 100, color: '#ef4444' },  // Extreme - red
  ];

  function arcPath(fromPct: number, toPct: number): string {
    const a1 = startAngle - (fromPct / 100) * totalAngle;
    const a2 = startAngle - (toPct / 100) * totalAngle;
    const x1 = CX + R * Math.cos(a1);
    const y1 = CY - R * Math.sin(a1);
    const x2 = CX + R * Math.cos(a2);
    const y2 = CY - R * Math.sin(a2);
    const largeArc = (toPct - fromPct) > 50 ? 1 : 0;
    return `M ${x1},${y1} A ${R},${R} 0 ${largeArc} 0 ${x2},${y2}`;
  }

  return (
    <div className="px-3 py-3 border-b border-border/20 flex flex-col items-center">
      <svg viewBox="0 0 200 105" className="w-full" style={{ maxWidth: 260, maxHeight: 150 }}>
        {/* Background track */}
        <path
          d={arcPath(0, 100)}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
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
            opacity={0.4}
          />
        ))}

        {/* Active zone highlight */}
        {zones.map((z) => {
          if (compositeScore < z.from || compositeScore > z.to) return null;
          return (
            <path
              key={`active-${z.from}`}
              d={arcPath(z.from, Math.min(compositeScore, z.to))}
              fill="none"
              stroke={z.color}
              strokeWidth={STROKE_W + 2}
              strokeLinecap="butt"
              opacity={0.8}
            />
          );
        })}

        {/* Needle */}
        <line
          x1={CX}
          y1={CY}
          x2={needleX}
          y2={needleY}
          stroke={levelColor.fill}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={3.5} fill={levelColor.fill} />
        <circle cx={CX} cy={CY} r={1.5} fill="#000" />

        {/* Score text */}
        <text
          x={CX}
          y={CY + 2}
          textAnchor="middle"
          fill={levelColor.fill}
          fontSize={26}
          fontFamily="monospace"
          fontWeight="900"
          dominantBaseline="hanging"
        >
          {compositeScore}
        </text>

        {/* End labels */}
        <text x={CX - R - 8} y={CY + 8} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">0</text>
        <text x={CX + R + 8} y={CY + 8} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">100</text>

        {/* Zone labels at top */}
        <text x={CX - R + 5} y={CY - R + 5} textAnchor="start" fill="rgba(255,255,255,0.15)" fontSize={5} fontFamily="monospace">SAFE</text>
        <text x={CX + R - 5} y={CY - R + 5} textAnchor="end" fill="rgba(255,255,255,0.15)" fontSize={5} fontFamily="monospace">CRISIS</text>
      </svg>

      <span className={`text-[10px] font-black font-mono uppercase tracking-wider -mt-1 ${levelColor.text}`}>
        {level}
      </span>
    </div>
  );
}

// ── Active Alerts ──

function ActiveAlerts({ alerts }: { alerts: string[] }) {
  return (
    <div className="px-3 py-2 border-b border-border/20 space-y-1.5">
      {alerts.map((alert, i) => {
        const isCritical = alert.startsWith('CRITICAL');
        return (
          <div
            key={i}
            className="flex items-start gap-1.5 px-2 py-1.5 border"
            style={{
              borderColor: isCritical ? 'rgba(239,68,68,0.5)' : 'rgba(251,146,60,0.3)',
              background: isCritical ? 'rgba(239,68,68,0.06)' : 'rgba(251,146,60,0.04)',
              animation: isCritical ? 'tail-risk-glow 2s ease-in-out infinite' : 'none',
            }}
          >
            <AlertTriangle
              className="w-3 h-3 shrink-0 mt-0.5"
              style={{ color: isCritical ? '#ef4444' : '#fb923c' }}
            />
            <span className="text-[8px] font-mono text-neutral-300 leading-tight">
              {alert}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Indicator Grid ──

function IndicatorGrid({ indicators }: { indicators: TailRiskIndicator[] }) {
  const t = useT();

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr(t, 'tailRiskIndicators', 'Risk Indicators')}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {indicators.map((ind) => (
          <IndicatorCard key={ind.name} indicator={ind} />
        ))}
      </div>
    </div>
  );
}

function IndicatorCard({ indicator }: { indicator: TailRiskIndicator }) {
  const { name, category, currentValue, zScore, percentile, direction, alertLevel, sparkline } = indicator;
  const catBadge = getCategoryBadge(category);
  const dirInfo = getDirectionArrow(direction);
  const dotColor = getAlertDotColor(alertLevel);

  return (
    <div
      className="p-1.5 border border-border/20 bg-[#060606]"
      style={{
        borderColor: alertLevel === 'critical' ? 'rgba(239,68,68,0.4)' : alertLevel === 'warning' ? 'rgba(251,146,60,0.25)' : undefined,
      }}
    >
      {/* Name row */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 min-w-0">
          {/* Alert dot */}
          <div
            className="w-1.5 h-1.5 shrink-0"
            style={{
              backgroundColor: dotColor,
              borderRadius: '50%',
              boxShadow: alertLevel === 'critical' ? `0 0 4px ${dotColor}` : 'none',
            }}
          />
          <span className="text-[7px] font-mono font-bold text-neutral-300 truncate">
            {name}
          </span>
        </div>
        <span className={`text-[6px] font-mono font-bold px-1 py-0.5 ${catBadge.color}`}>
          {catBadge.label}
        </span>
      </div>

      {/* Value + direction */}
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-[11px] font-mono font-black text-white">
          {formatValue(currentValue)}
        </span>
        <span className={`text-[9px] font-mono font-bold ${dirInfo.color}`}>
          {dirInfo.arrow}
        </span>
      </div>

      {/* Z-score bar */}
      <div className="mb-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[6px] font-mono text-neutral-600">Z-SCORE</span>
          <span className={`text-[6px] font-mono font-bold ${zScore > 1.5 ? 'text-red-400' : zScore < -1.5 ? 'text-emerald-400' : 'text-neutral-400'}`}>
            {zScore > 0 ? '+' : ''}{zScore.toFixed(2)}
          </span>
        </div>
        <div className="h-1 bg-neutral-900 relative">
          {/* Center line */}
          <div className="absolute left-1/2 top-0 w-px h-full bg-neutral-700" />
          {/* Z-score bar (centered at 0, clamped to -3..+3) */}
          {(() => {
            const clampedZ = Math.max(-3, Math.min(3, zScore));
            const centerPct = 50;
            const barWidthPct = Math.abs(clampedZ) / 3 * 50;
            const barLeft = clampedZ >= 0 ? centerPct : centerPct - barWidthPct;
            const barColor = clampedZ > 1.5 ? '#ef4444' : clampedZ < -1.5 ? '#34d399' : '#a3a3a3';
            return (
              <div
                className="absolute top-0 h-full"
                style={{
                  left: `${barLeft}%`,
                  width: `${barWidthPct}%`,
                  backgroundColor: barColor,
                  opacity: 0.7,
                }}
              />
            );
          })()}
        </div>
      </div>

      {/* Percentile bar */}
      <div className="mb-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[6px] font-mono text-neutral-600">PCTL</span>
          <span className="text-[6px] font-mono text-neutral-400">{percentile}%</span>
        </div>
        <div className="h-1 bg-neutral-900 relative">
          <div
            className="absolute top-0 left-0 h-full"
            style={{
              width: `${percentile}%`,
              backgroundColor: percentile > 80 ? '#ef4444' : percentile > 60 ? '#fb923c' : percentile < 20 ? '#34d399' : '#525252',
              opacity: 0.6,
            }}
          />
        </div>
      </div>

      {/* Mini sparkline */}
      <MiniSparkline values={sparkline} alertLevel={alertLevel} />
    </div>
  );
}

function MiniSparkline({ values, alertLevel }: { values: number[]; alertLevel: AlertLevel }) {
  const W = 60;
  const H = 12;
  const PADDING = 1;

  if (values.length < 2) return null;

  const points = values.map((v, i) => ({
    x: PADDING + (i / (values.length - 1)) * (W - PADDING * 2),
    y: PADDING + (1 - v) * (H - PADDING * 2),
  }));

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
  const strokeColor = alertLevel === 'critical' ? '#ef4444' : alertLevel === 'warning' ? '#fb923c' : alertLevel === 'watch' ? '#fbbf24' : '#525252';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 12 }}>
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.7} />
      {/* Current point */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={1.5}
        fill={strokeColor}
      />
    </svg>
  );
}

// ── Composite History Chart ──

function CompositeHistoryChart({ data }: { data: TailRiskData }) {
  const t = useT();
  const history = data.history;

  if (history.length < 2) return null;

  const W = 300;
  const H = 140;
  const PAD_X = 30;
  const PAD_Y = 10;
  const PAD_BOTTOM = 18;

  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y - PAD_BOTTOM;

  const scaleX = (i: number) => PAD_X + (i / (history.length - 1)) * chartW;
  const scaleY = (v: number) => PAD_Y + ((100 - v) / 100) * chartH;

  // Color zone bands
  const zoneBands = [
    { from: 0, to: 20, color: 'rgba(34,211,238,0.04)', label: 'Complacent' },
    { from: 20, to: 40, color: 'rgba(52,211,153,0.04)', label: 'Normal' },
    { from: 40, to: 60, color: 'rgba(251,191,36,0.04)', label: 'Elevated' },
    { from: 60, to: 80, color: 'rgba(251,146,60,0.04)', label: 'High' },
    { from: 80, to: 100, color: 'rgba(239,68,68,0.05)', label: 'Extreme' },
  ];

  const zoneLines = [
    { y: 20, color: 'rgba(34,211,238,0.15)' },
    { y: 40, color: 'rgba(52,211,153,0.15)' },
    { y: 60, color: 'rgba(251,191,36,0.15)' },
    { y: 80, color: 'rgba(251,146,60,0.15)' },
  ];

  const points = history.map((h, i) => ({
    x: scaleX(i),
    y: scaleY(h.compositeScore),
    score: h.compositeScore,
    date: h.date,
  }));

  // Build line path
  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');

  // Area fill
  const areaD = `${pathD} L ${points[points.length - 1].x},${H - PAD_BOTTOM} L ${points[0].x},${H - PAD_BOTTOM} Z`;

  // Gradient-like coloring for the line: use the score of the last point
  const lastScore = points[points.length - 1].score;
  const lineColor = lastScore >= 80 ? '#ef4444' : lastScore >= 60 ? '#fb923c' : lastScore >= 40 ? '#fbbf24' : lastScore >= 20 ? '#34d399' : '#22d3ee';

  // Y-axis ticks
  const yTicks = [0, 20, 40, 60, 80, 100];

  return (
    <div className="px-3 py-2">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr(t, 'tailRiskHistory', 'Composite Score History (40d)')}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 170 }}>
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

        {/* Area fill */}
        <path d={areaD} fill={lineColor} opacity={0.06} />

        {/* Line */}
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth={1.5} opacity={0.8} />

        {/* Current position dot */}
        {points.length > 0 && (
          <g>
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r={3}
              fill={lineColor}
              opacity={0.9}
            />
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r={1.5}
              fill="#000"
            />
            {/* Score label */}
            <text
              x={points[points.length - 1].x - 3}
              y={points[points.length - 1].y - 6}
              textAnchor="end"
              fill={lineColor}
              fontSize={7}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {points[points.length - 1].score}
            </text>
          </g>
        )}

        {/* Start label */}
        {points.length > 0 && (
          <text
            x={points[0].x + 2}
            y={points[0].y - 5}
            textAnchor="start"
            fill="rgba(255,255,255,0.4)"
            fontSize={6}
            fontFamily="monospace"
          >
            {points[0].score}
          </text>
        )}

        {/* X-axis date labels */}
        {points.map((p, i) => {
          if (i !== 0 && i !== points.length - 1 && i !== Math.floor(points.length / 2)) return null;
          const dateLabel = p.date.slice(5); // MM-DD
          return (
            <text
              key={`x-${i}`}
              x={p.x}
              y={H - 4}
              textAnchor="middle"
              fill="rgba(255,255,255,0.2)"
              fontSize={6}
              fontFamily="monospace"
            >
              {dateLabel}
            </text>
          );
        })}

        {/* Zone labels on right side */}
        {zoneBands.map((z) => (
          <text
            key={`label-${z.from}`}
            x={W - PAD_X + 3}
            y={(scaleY(z.to) + scaleY(z.from)) / 2 + 2}
            textAnchor="start"
            fill="rgba(255,255,255,0.1)"
            fontSize={4.5}
            fontFamily="monospace"
          >
            {z.label.slice(0, 3).toUpperCase()}
          </text>
        ))}
      </svg>
    </div>
  );
}
