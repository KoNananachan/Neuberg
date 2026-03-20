import { useMemo } from 'react';
import {
  useMacroHeatmap,
  type MacroRegion,
  type MacroIndicator,
  type MacroSignal,
  type RegionSentiment,
  type GlobalSentiment,
} from '../../api/hooks/use-macro-heatmap';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, Globe } from 'lucide-react';

// ── i18n helper with fallback ──

// ── Constants ──

const ACCENT = '#0ea5e9'; // sky-400

const SIGNAL_COLORS: Record<MacroSignal, string> = {
  strong_up: '#22c55e',
  up: '#86efac',
  flat: '#3f3f46',
  down: '#fca5a5',
  strong_down: '#ef4444',
};

const SIGNAL_TEXT_COLORS: Record<MacroSignal, string> = {
  strong_up: '#fff',
  up: '#052e16',
  flat: '#a1a1aa',
  down: '#450a0a',
  strong_down: '#fff',
};

// ── Helpers ──

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function abbreviateSymbol(symbol: string): string {
  return symbol
    .replace('^', '')
    .replace('=F', '')
    .replace('-USD', '')
    .replace('.NYB', '')
    .replace('DX-Y', 'DXY');
}

function sentimentLabel(s: RegionSentiment): string {
  if (s === 'bullish') return 'BULL';
  if (s === 'bearish') return 'BEAR';
  return 'NEUT';
}

function sentimentColor(s: RegionSentiment): string {
  if (s === 'bullish') return '#22c55e';
  if (s === 'bearish') return '#ef4444';
  return '#a1a1aa';
}

function globalSentimentLabel(s: GlobalSentiment): string {
  if (s === 'risk_on') return 'RISK ON';
  if (s === 'risk_off') return 'RISK OFF';
  return 'MIXED';
}

function globalSentimentColor(s: GlobalSentiment): string {
  if (s === 'risk_on') return '#22c55e';
  if (s === 'risk_off') return '#ef4444';
  return '#eab308';
}

// ── Risk Score Bar (SVG) ──

function RiskScoreBar({ score }: { score: number }) {
  const barWidth = 260;
  const barHeight = 14;
  const markerX = (score / 100) * barWidth;

  return (
    <div className="flex items-center justify-center gap-2 px-3 py-1.5">
      <span className="text-[8px] font-mono text-red-400 uppercase tracking-wider w-14 text-right shrink-0">
        RISK OFF
      </span>
      <svg width={barWidth} height={barHeight + 8} className="block shrink-0">
        <defs>
          <linearGradient id="risk-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="30%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="70%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <rect x={0} y={4} width={barWidth} height={barHeight} fill="url(#risk-grad)" rx={0} />
        {/* Marker */}
        <polygon
          points={`${markerX - 4},0 ${markerX + 4},0 ${markerX},5`}
          fill="#fff"
        />
        <line
          x1={markerX}
          y1={4}
          x2={markerX}
          y2={4 + barHeight}
          stroke="#fff"
          strokeWidth={2}
        />
        {/* Score label */}
        <text
          x={markerX}
          y={barHeight + 8 + 8}
          textAnchor="middle"
          fill="#fff"
          fontSize={8}
          fontFamily="monospace"
          fontWeight="bold"
        >
          {score}
        </text>
      </svg>
      <span className="text-[8px] font-mono text-green-400 uppercase tracking-wider w-14 shrink-0">
        RISK ON
      </span>
    </div>
  );
}

// ── Heatmap Cell ──

function HeatmapCell({ indicator }: { indicator: MacroIndicator }) {
  const bg = SIGNAL_COLORS[indicator.signal];
  const fg = SIGNAL_TEXT_COLORS[indicator.signal];

  return (
    <div
      className="flex flex-col items-center justify-center font-mono"
      style={{
        backgroundColor: bg,
        color: fg,
        width: 50,
        height: 28,
        minWidth: 50,
      }}
    >
      <span className="text-[7px] font-bold leading-none truncate max-w-[48px]">
        {abbreviateSymbol(indicator.symbol)}
      </span>
      <span className="text-[7px] leading-none">
        {fmtPct(indicator.changePct)}
      </span>
    </div>
  );
}

// ── Region Row ──

function RegionRow({ region }: { region: MacroRegion }) {
  return (
    <>
      {/* Region header row */}
      <div
        className="flex items-center gap-2 px-2 py-0.5"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
      >
        <span className="text-[8px] font-mono font-bold text-white/70 uppercase tracking-wider">
          {region.name}
        </span>
        <span
          className="text-[7px] font-mono font-bold px-1"
          style={{
            color: sentimentColor(region.sentiment),
            border: `1px solid ${sentimentColor(region.sentiment)}`,
          }}
        >
          {sentimentLabel(region.sentiment)}
        </span>
        <span className="text-[8px] font-mono" style={{ color: region.avgChange >= 0 ? '#86efac' : '#fca5a5' }}>
          avg {fmtPct(region.avgChange)}
        </span>
      </div>
      {/* Indicator cells grid */}
      <div className="flex flex-wrap gap-px px-1 pb-1">
        {region.indicators.map((ind) => (
          <HeatmapCell key={ind.symbol} indicator={ind} />
        ))}
      </div>
    </>
  );
}

// ── Region Summary Bar ──

function RegionSummaryBar({ regions }: { regions: MacroRegion[] }) {
  const sorted = useMemo(
    () => [...regions].sort((a, b) => b.avgChange - a.avgChange),
    [regions],
  );

  const maxAbs = useMemo(
    () => Math.max(...sorted.map((r) => Math.abs(r.avgChange)), 0.01),
    [sorted],
  );

  return (
    <div className="px-2 py-1">
      <div className="text-[7px] font-mono text-white/30 uppercase tracking-wider mb-0.5">
        Region Performance
      </div>
      {sorted.map((region) => {
        const barPct = Math.min(Math.abs(region.avgChange) / maxAbs, 1) * 100;
        const isPositive = region.avgChange >= 0;
        const barColor = isPositive ? '#22c55e' : '#ef4444';

        return (
          <div key={region.name} className="flex items-center gap-1 py-px">
            <span className="text-[7px] font-mono text-white/50 w-16 shrink-0 text-right">
              {region.name}
            </span>
            <div className="flex-1 h-[6px] relative" style={{ backgroundColor: '#18181b' }}>
              {isPositive ? (
                <div
                  className="absolute left-1/2 top-0 h-full"
                  style={{ width: `${barPct / 2}%`, backgroundColor: barColor }}
                />
              ) : (
                <div
                  className="absolute top-0 h-full"
                  style={{
                    right: '50%',
                    width: `${barPct / 2}%`,
                    backgroundColor: barColor,
                  }}
                />
              )}
              {/* Center line */}
              <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
            </div>
            <span
              className="text-[7px] font-mono font-bold w-12 shrink-0"
              style={{ color: isPositive ? '#86efac' : '#fca5a5' }}
            >
              {fmtPct(region.avgChange)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function MacroHeatmapPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useMacroHeatmap();

  const regions = data?.regions ?? [];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-[#050505] shrink-0"
        style={{ borderBottom: `1px solid ${ACCENT}33` }}
      >
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" style={{ color: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'panelMacroHeatmap', 'GLOBAL MACRO HEATMAP')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <>
              <span
                className="text-[8px] font-mono font-bold px-1.5 py-0.5"
                style={{
                  color: globalSentimentColor(data.globalSentiment),
                  border: `1px solid ${globalSentimentColor(data.globalSentiment)}`,
                }}
              >
                {globalSentimentLabel(data.globalSentiment)}
              </span>
              <span className="text-[8px] font-mono text-white/40">
                RS: <span className="text-white/70 font-bold">{data.riskScore}</span>
              </span>
            </>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-white/30 hover:text-sky-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && !data && (
        <div className="flex flex-col items-center justify-center flex-1 gap-2">
          <div
            className="w-5 h-5 border-2 animate-spin"
            style={{ borderColor: `${ACCENT}33`, borderTopColor: ACCENT }}
          />
          <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
            {tr(t, 'loading', 'Loading...')}
          </span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && regions.length === 0 && (
        <div className="flex items-center justify-center flex-1">
          <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">
            No macro data available
          </span>
        </div>
      )}

      {/* Content */}
      {regions.length > 0 && (
        <div className="flex-1 overflow-auto no-scrollbar flex flex-col">
          {/* Risk score bar */}
          {data && (
            <div className="shrink-0" style={{ borderBottom: `1px solid ${ACCENT}15` }}>
              <RiskScoreBar score={data.riskScore} />
            </div>
          )}

          {/* Heatmap grid */}
          <div className="flex-1 overflow-auto no-scrollbar">
            {regions.map((region) => (
              <RegionRow key={region.name} region={region} />
            ))}
          </div>

          {/* Region summary bar */}
          <div className="shrink-0" style={{ borderTop: `1px solid ${ACCENT}15` }}>
            <RegionSummaryBar regions={regions} />
          </div>
        </div>
      )}
    </div>
  );
}
