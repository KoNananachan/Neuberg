import {
  useSentimentDashboard,
  type SentimentDashboardData,
  type SentimentIndicator,
  type SentimentLevel,
} from '../../api/hooks/use-sentiment-dashboard';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
// ── Color Helpers ──

function getLevelColor(level: SentimentLevel): { text: string; fill: string; bg: string; stroke: string } {
  switch (level) {
    case 'extreme_fear': return { text: 'text-red-400', fill: '#f87171', bg: 'rgba(248,113,113,0.08)', stroke: '#ef4444' };
    case 'fear': return { text: 'text-orange-400', fill: '#fb923c', bg: 'rgba(251,146,60,0.08)', stroke: '#f97316' };
    case 'neutral': return { text: 'text-yellow-400', fill: '#facc15', bg: 'rgba(250,204,21,0.08)', stroke: '#eab308' };
    case 'greed': return { text: 'text-green-400', fill: '#4ade80', bg: 'rgba(74,222,128,0.08)', stroke: '#22c55e' };
    case 'extreme_greed': return { text: 'text-emerald-400', fill: '#34d399', bg: 'rgba(52,211,153,0.08)', stroke: '#10b981' };
  }
}

function getScoreColor(score: number): string {
  if (score < 20) return '#ef4444';
  if (score < 40) return '#f97316';
  if (score < 60) return '#eab308';
  if (score < 80) return '#22c55e';
  return '#10b981';
}

function getLevelLabel(level: SentimentLevel): string {
  switch (level) {
    case 'extreme_fear': return 'EXTREME FEAR';
    case 'fear': return 'FEAR';
    case 'neutral': return 'NEUTRAL';
    case 'greed': return 'GREED';
    case 'extreme_greed': return 'EXTREME GREED';
  }
}

// ── Main Panel ──

export function SentimentDashboardPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSentimentDashboard();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-fuchsia-400" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 8L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="8" r="1.2" fill="currentColor" />
            <path d="M4 12L6 10" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
            <path d="M12 12L10 10" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-fuchsia-400">
            {tr(t, 'sdTitle', 'Sentiment Dashboard')}
          </span>
          {data && (
            <span className={`text-[7px] font-mono font-black uppercase px-1.5 py-[1px] ${getLevelColor(data.level).text}`}
              style={{ background: getLevelColor(data.level).bg }}>
              {getLevelLabel(data.level)}
            </span>
          )}
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-fuchsia-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-fuchsia-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {tr(t, 'sdNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <MainGauge data={data} />
            <SubGaugeRow data={data} />
            <HistoryChart data={data} />
            <IndicatorGrid data={data} />
            <ContrarianSignal data={data} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Main Sentiment Gauge (Semi-circular speedometer) ──

function MainGauge({ data }: { data: SentimentDashboardData }) {
  const t = useT();
  const { compositeScore, level, previousClose } = data;
  const color = getLevelColor(level);
  const delta = Math.round((compositeScore - previousClose) * 10) / 10;

  const CX = 120;
  const CY = 100;
  const R = 80;
  const STROKE_W = 12;
  const startAngle = Math.PI;
  const totalAngle = Math.PI;

  const needleAngle = startAngle - (compositeScore / 100) * totalAngle;
  const needleX = CX + (R - 6) * Math.cos(needleAngle);
  const needleY = CY - (R - 6) * Math.sin(needleAngle);

  // Gradient zones
  const zones = [
    { from: 0, to: 20, color: '#ef4444' },
    { from: 20, to: 40, color: '#f97316' },
    { from: 40, to: 60, color: '#eab308' },
    { from: 60, to: 80, color: '#22c55e' },
    { from: 80, to: 100, color: '#10b981' },
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
    <div className="px-3 pt-3 pb-1 border-b border-border/20 flex flex-col items-center" style={{ background: color.bg }}>
      <svg viewBox="0 0 240 125" className="w-full" style={{ maxWidth: 320, maxHeight: 165 }}>
        {/* Background track */}
        <path d={arcPath(0, 100)} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={STROKE_W} strokeLinecap="round" />

        {/* Zone arcs */}
        {zones.map((z) => (
          <path key={z.from} d={arcPath(z.from, z.to)} fill="none" stroke={z.color} strokeWidth={STROKE_W} strokeLinecap="butt" opacity={0.5} />
        ))}

        {/* Filled progress arc */}
        <path d={arcPath(0, compositeScore)} fill="none" stroke={color.fill} strokeWidth={STROKE_W + 2} strokeLinecap="round" opacity={0.3} />

        {/* Needle */}
        <line x1={CX} y1={CY} x2={needleX} y2={needleY} stroke={color.fill} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={5} fill={color.fill} />
        <circle cx={CX} cy={CY} r={2.5} fill="#000" />

        {/* Score text */}
        <text x={CX} y={CY + 5} textAnchor="middle" fill="white" fontSize={32} fontFamily="monospace" fontWeight="900" dominantBaseline="hanging">
          {Math.round(compositeScore)}
        </text>

        {/* End labels */}
        <text x={CX - R - 6} y={CY + 12} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={7} fontFamily="monospace">0</text>
        <text x={CX + R + 6} y={CY + 12} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={7} fontFamily="monospace">100</text>

        {/* Bottom corner labels */}
        <text x={CX - R + 10} y={CY + 22} textAnchor="middle" fill="#f87171" fontSize={5.5} fontFamily="monospace" opacity={0.5}>FEAR</text>
        <text x={CX + R - 10} y={CY + 22} textAnchor="middle" fill="#34d399" fontSize={5.5} fontFamily="monospace" opacity={0.5}>GREED</text>
      </svg>

      {/* Level and delta */}
      <div className="flex flex-col items-center gap-0.5 -mt-1 mb-1">
        <span className={`text-[11px] font-black font-mono uppercase tracking-wider ${color.text}`}>
          {getLevelLabel(level)}
        </span>
        <span className={`text-[8px] font-mono font-bold ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-neutral-500'}`}>
          {delta > 0 ? '+' : ''}{delta} {tr(t, 'sdVsPrev', 'vs yesterday')}
        </span>
      </div>
    </div>
  );
}

// ── 2. Sub-Gauge Row (Fear/Greed + Positioning) ──

function SubGaugeRow({ data }: { data: SentimentDashboardData }) {
  const t = useT();

  // Calculate sub-indices
  const fgIndicators = data.indicators.filter((ind) => ind.category === 'fear_greed');
  const posIndicators = data.indicators.filter((ind) => ind.category === 'positioning');

  const fgAvg = fgIndicators.length > 0
    ? Math.round(fgIndicators.reduce((s, i) => s + i.score, 0) / fgIndicators.length * 10) / 10
    : 50;
  const posAvg = posIndicators.length > 0
    ? Math.round(posIndicators.reduce((s, i) => s + i.score, 0) / posIndicators.length * 10) / 10
    : 50;

  return (
    <div className="px-3 py-2 border-b border-border/20 grid grid-cols-2 gap-3">
      <MiniHorizontalGauge label={tr(t, 'sdFearGreed', 'Fear/Greed')} score={fgAvg} />
      <MiniHorizontalGauge label={tr(t, 'sdPositioning', 'Positioning')} score={posAvg} />
    </div>
  );
}

function MiniHorizontalGauge({ label, score }: { label: string; score: number }) {
  const W = 140;
  const H = 28;
  const BAR_Y = 14;
  const BAR_H = 8;
  const PAD = 4;
  const barW = W - PAD * 2;

  const zones = [
    { from: 0, to: 20, color: '#ef4444' },
    { from: 20, to: 40, color: '#f97316' },
    { from: 40, to: 60, color: '#eab308' },
    { from: 60, to: 80, color: '#22c55e' },
    { from: 80, to: 100, color: '#10b981' },
  ];

  const markerX = PAD + (score / 100) * barW;

  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-500 font-mono">{label}</span>
        <span className="text-[9px] font-black font-mono" style={{ color: getScoreColor(score) }}>
          {Math.round(score)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 28 }}>
        {/* Zone bars */}
        {zones.map((z) => {
          const x = PAD + (z.from / 100) * barW;
          const w = ((z.to - z.from) / 100) * barW;
          return (
            <rect key={z.from} x={x} y={BAR_Y} width={w} height={BAR_H} fill={z.color} opacity={0.25} />
          );
        })}

        {/* Filled portion */}
        <rect x={PAD} y={BAR_Y} width={Math.max(0, markerX - PAD)} height={BAR_H} fill={getScoreColor(score)} opacity={0.5} />

        {/* Marker line */}
        <line x1={markerX} y1={BAR_Y - 2} x2={markerX} y2={BAR_Y + BAR_H + 2} stroke="white" strokeWidth={2} />

        {/* End labels */}
        <text x={PAD} y={BAR_Y - 2} fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">0</text>
        <text x={W - PAD} y={BAR_Y - 2} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">100</text>
      </svg>
    </div>
  );
}

// ── 3. 30-Day History Chart ──

function HistoryChart({ data }: { data: SentimentDashboardData }) {
  const t = useT();
  const history = data.history;
  if (history.length < 2) return null;

  const W = 320;
  const H = 140;
  const PAD_X = 28;
  const PAD_Y = 10;
  const PAD_BOTTOM = 18;

  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y - PAD_BOTTOM;

  const scaleX = (i: number) => PAD_X + (i / (history.length - 1)) * chartW;
  const scaleY = (v: number) => PAD_Y + ((100 - v) / 100) * chartH;

  // Zone background bands
  const zoneBands = [
    { from: 0, to: 20, color: 'rgba(239,68,68,0.06)' },
    { from: 20, to: 40, color: 'rgba(249,115,22,0.04)' },
    { from: 40, to: 60, color: 'rgba(128,128,128,0.03)' },
    { from: 60, to: 80, color: 'rgba(74,222,128,0.04)' },
    { from: 80, to: 100, color: 'rgba(52,211,153,0.06)' },
  ];

  const zoneLines = [
    { y: 20, color: 'rgba(239,68,68,0.15)' },
    { y: 40, color: 'rgba(249,115,22,0.12)' },
    { y: 60, color: 'rgba(74,222,128,0.12)' },
    { y: 80, color: 'rgba(52,211,153,0.15)' },
  ];

  // Composite line
  const compositePoints = history.map((h, i) => ({ x: scaleX(i), y: scaleY(h.composite) }));
  const compositePath = compositePoints.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
  const areaPath = `${compositePath} L ${compositePoints[compositePoints.length - 1].x},${H - PAD_BOTTOM} L ${compositePoints[0].x},${H - PAD_BOTTOM} Z`;

  // Sub-index lines
  const fgPoints = history.map((h, i) => ({ x: scaleX(i), y: scaleY(h.fearGreed) }));
  const fgPath = fgPoints.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');

  const posPoints = history.map((h, i) => ({ x: scaleX(i), y: scaleY(h.positioning) }));
  const posPath = posPoints.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');

  const yTicks = [0, 20, 40, 60, 80, 100];

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-500 font-mono">
          {tr(t, 'sdHistory', '30-Day History')}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-[2px]" style={{ background: '#d946ef' }} />
            <span className="text-[6px] font-mono text-neutral-500">Composite</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-[1px]" style={{ background: '#fb923c', opacity: 0.6 }} />
            <span className="text-[6px] font-mono text-neutral-500">F/G</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-[1px]" style={{ background: '#60a5fa', opacity: 0.6 }} />
            <span className="text-[6px] font-mono text-neutral-500">Pos</span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
        {/* Zone bands */}
        {zoneBands.map((z) => (
          <rect key={z.from} x={PAD_X} y={scaleY(z.to)} width={chartW} height={scaleY(z.from) - scaleY(z.to)} fill={z.color} />
        ))}

        {/* Zone boundary lines */}
        {zoneLines.map((z) => (
          <line key={z.y} x1={PAD_X} y1={scaleY(z.y)} x2={W - PAD_X} y2={scaleY(z.y)} stroke={z.color} strokeDasharray="3,3" />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((v) => (
          <text key={v} x={PAD_X - 4} y={scaleY(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">
            {v}
          </text>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="rgba(217,70,239,0.08)" />

        {/* Sub-index lines */}
        <path d={fgPath} fill="none" stroke="#fb923c" strokeWidth={0.8} opacity={0.5} />
        <path d={posPath} fill="none" stroke="#60a5fa" strokeWidth={0.8} opacity={0.5} />

        {/* Main composite line */}
        <path d={compositePath} fill="none" stroke="#d946ef" strokeWidth={1.8} opacity={0.9} />

        {/* Endpoint dot */}
        {compositePoints.length > 0 && (
          <circle
            cx={compositePoints[compositePoints.length - 1].x}
            cy={compositePoints[compositePoints.length - 1].y}
            r={3}
            fill="#d946ef"
            opacity={0.9}
          />
        )}

        {/* Start/end value labels */}
        {compositePoints.length > 0 && (
          <>
            <text
              x={compositePoints[0].x}
              y={compositePoints[0].y - 6}
              textAnchor="start"
              fill="rgba(255,255,255,0.4)"
              fontSize={7}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {Math.round(history[0].composite)}
            </text>
            <text
              x={compositePoints[compositePoints.length - 1].x}
              y={compositePoints[compositePoints.length - 1].y - 6}
              textAnchor="end"
              fill="rgba(255,255,255,0.7)"
              fontSize={7}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {Math.round(history[history.length - 1].composite)}
            </text>
          </>
        )}

        {/* X-axis date labels */}
        {history.map((h, i) => {
          if (i !== 0 && i !== history.length - 1 && i !== Math.floor(history.length / 2)) return null;
          return (
            <text key={`x-${i}`} x={scaleX(i)} y={H - 3} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">
              {h.date.slice(5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ── 4. Individual Indicator Grid (2 columns) ──

function IndicatorGrid({ data }: { data: SentimentDashboardData }) {
  const t = useT();

  // Sort by extremity (distance from 50)
  const sorted = [...data.indicators].sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50));

  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1 font-mono">
        {tr(t, 'sdIndicators', 'Individual Indicators')}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {sorted.map((ind) => (
          <IndicatorCard key={ind.name} indicator={ind} />
        ))}
      </div>
    </div>
  );
}

function IndicatorCard({ indicator }: { indicator: SentimentIndicator }) {
  const color = getLevelColor(indicator.level);
  const barWidth = Math.max(0, Math.min(100, indicator.score));

  return (
    <div className="px-1.5 py-1.5 border border-border/10 hover:border-border/20 transition-colors" style={{ background: 'rgba(255,255,255,0.01)' }}>
      {/* Name + category */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[7.5px] font-mono font-bold text-neutral-300 truncate">{indicator.name}</span>
        <span className={`text-[5.5px] font-mono font-bold uppercase px-1 py-[0.5px] ${
          indicator.category === 'fear_greed' ? 'text-amber-400 bg-amber-400/10' : 'text-blue-400 bg-blue-400/10'
        }`}>
          {indicator.category === 'fear_greed' ? 'F/G' : 'POS'}
        </span>
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`text-[10px] font-black font-mono tabular-nums ${color.text}`} style={{ minWidth: 22 }}>
          {Math.round(indicator.score)}
        </span>
        <div className="flex-1 h-[5px] bg-white/[0.04] relative">
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: `${barWidth}%`, background: color.fill, opacity: 0.6 }}
          />
        </div>
      </div>

      {/* Raw value + sparkline */}
      <div className="flex items-center justify-between">
        <span className="text-[6.5px] font-mono text-neutral-500">
          {indicator.value.toFixed(indicator.value < 1 ? 4 : 2)}
        </span>
        {indicator.sparkline.length > 1 && (
          <MiniSparkline data={indicator.sparkline} color={color.fill} />
        )}
      </div>
    </div>
  );
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const W = 50;
  const H = 14;
  const PAD = 1;

  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + ((max - v) / range) * (H - PAD * 2);
    return { x, y };
  });

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={50} height={14}>
      <path d={pathD} fill="none" stroke={color} strokeWidth={1} opacity={0.7} />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={1.5} fill={color} />
    </svg>
  );
}

// ── 5. Contrarian Signal ──

function ContrarianSignal({ data }: { data: SentimentDashboardData }) {
  const t = useT();
  const { contrarian } = data;

  const signalColor = contrarian.signal === 'buy'
    ? { text: 'text-emerald-400', fill: '#34d399', bg: 'rgba(52,211,153,0.06)' }
    : contrarian.signal === 'sell'
      ? { text: 'text-red-400', fill: '#f87171', bg: 'rgba(248,113,113,0.06)' }
      : { text: 'text-neutral-400', fill: '#a3a3a3', bg: 'rgba(163,163,163,0.04)' };

  const signalLabel = contrarian.signal === 'buy'
    ? tr(t, 'sdContrarianBuy', 'Contrarian BUY Signal')
    : contrarian.signal === 'sell'
      ? tr(t, 'sdContrarianSell', 'Contrarian SELL Signal')
      : tr(t, 'sdContrarianNeutral', 'No Contrarian Signal');

  return (
    <div className="px-3 py-2" style={{ background: signalColor.bg }}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[9px] font-black font-mono uppercase tracking-tight ${signalColor.text}`}>
          {signalLabel}
        </span>
        <span className={`text-[8px] font-mono font-bold ${signalColor.text}`}>
          {contrarian.confidence}%
        </span>
      </div>

      {/* Confidence bar */}
      <div className="h-[4px] bg-white/[0.04] mb-1.5 relative">
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: `${contrarian.confidence}%`, background: signalColor.fill, opacity: 0.6 }}
        />
      </div>

      <p className="text-[7px] font-mono text-neutral-500 leading-relaxed">
        {contrarian.description}
      </p>
    </div>
  );
}
