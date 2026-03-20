import { useState } from 'react';
import {
  useCapitalFlows,
  type CapitalFlowRegion,
  type CapitalFlowMapEntry,
  type CapitalFlowSummary,
} from '../../api/hooks/use-capital-flows';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

// i18n helper with fallback
// ── Constants ──

const EMERALD = '#10b981';
const GREEN = '#34d399';
const RED = '#f87171';
const YELLOW = '#fbbf24';

// ── Number formatting ──

function fmtFlow(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'T';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'B';
  return n.toFixed(1) + 'M';
}

function fmtFlowSigned(n: number): string {
  const prefix = n > 0 ? '+' : n < 0 ? '-' : '';
  return prefix + '$' + fmtFlow(Math.abs(n));
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

// ── Color helpers ──

function flowColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

type TrendType = 'strong_inflow' | 'inflow' | 'neutral' | 'outflow' | 'strong_outflow';

function trendBadge(trend: TrendType): { text: string; color: string; bg: string } {
  switch (trend) {
    case 'strong_inflow': return { text: 'STRONG INFLOW', color: GREEN, bg: 'rgba(52,211,153,0.15)' };
    case 'inflow': return { text: 'INFLOW', color: GREEN, bg: 'rgba(52,211,153,0.1)' };
    case 'outflow': return { text: 'OUTFLOW', color: RED, bg: 'rgba(248,113,113,0.1)' };
    case 'strong_outflow': return { text: 'STRONG OUTFLOW', color: RED, bg: 'rgba(248,113,113,0.15)' };
    default: return { text: 'NEUTRAL', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.03)' };
  }
}

function dmEmBadge(v: 'dm_favored' | 'em_favored' | 'balanced'): { text: string; color: string; bg: string } {
  switch (v) {
    case 'dm_favored': return { text: 'DM FAVORED', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' };
    case 'em_favored': return { text: 'EM FAVORED', color: EMERALD, bg: 'rgba(16,185,129,0.12)' };
    default: return { text: 'DM/EM BALANCED', color: YELLOW, bg: 'rgba(251,191,36,0.1)' };
  }
}

function riskBadge(v: 'risk_on' | 'risk_off' | 'neutral'): { text: string; color: string; bg: string } {
  switch (v) {
    case 'risk_on': return { text: 'RISK ON', color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'risk_off': return { text: 'RISK OFF', color: RED, bg: 'rgba(248,113,113,0.12)' };
    default: return { text: 'NEUTRAL', color: YELLOW, bg: 'rgba(251,191,36,0.1)' };
  }
}

// ── Region node positions for flow visualization ──

const REGION_POSITIONS: Record<string, { x: number; y: number }> = {
  'US':          { x: 80,  y: 50 },
  'Europe':      { x: 200, y: 30 },
  'Japan':       { x: 310, y: 45 },
  'China':       { x: 280, y: 100 },
  'EM ex-China': { x: 190, y: 130 },
  'EM Asia':     { x: 310, y: 140 },
  'EM Latin':    { x: 80,  y: 130 },
  'Frontier':    { x: 140, y: 80 },
  'Safe Haven':  { x: 30,  y: 85 },
};

// ── Flow Direction Arrow SVG Visualization ──

function FlowDirectionMap({
  regions,
  flowMap,
}: {
  regions: CapitalFlowRegion[];
  flowMap: CapitalFlowMapEntry[];
}) {
  const W = 360;
  const H = 170;

  // Build region data map
  const regionDataMap = new Map(regions.map(r => [r.name, r]));
  const maxAbsFlow = Math.max(...regions.map(r => Math.abs(r.flow5d)), 1);

  // Arrowhead marker
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 170 }}>
      <defs>
        <marker id="cfArrowGreen" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <path d="M0,0 L6,2 L0,4 Z" fill={GREEN} fillOpacity="0.6" />
        </marker>
        <marker id="cfArrowRed" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <path d="M0,0 L6,2 L0,4 Z" fill={RED} fillOpacity="0.6" />
        </marker>
      </defs>

      {/* Flow arrows */}
      {flowMap.slice(0, 6).map((flow, i) => {
        const fromPos = REGION_POSITIONS[flow.from];
        const toPos = REGION_POSITIONS[flow.to];
        if (!fromPos || !toPos) return null;

        const thickness = Math.max(0.5, flow.magnitude * 0.3);
        const opacity = 0.15 + flow.magnitude * 0.06;

        // Offset the line slightly to avoid overlap with node circles
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return null;
        const nx = dx / dist;
        const ny = dy / dist;
        const startX = fromPos.x + nx * 14;
        const startY = fromPos.y + ny * 14;
        const endX = toPos.x - nx * 14;
        const endY = toPos.y - ny * 14;

        return (
          <line
            key={`flow-${i}`}
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke={GREEN}
            strokeWidth={thickness}
            strokeOpacity={opacity}
            markerEnd="url(#cfArrowGreen)"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="20"
              to="0"
              dur={`${3 - flow.magnitude * 0.2}s`}
              repeatCount="indefinite"
            />
          </line>
        );
      })}

      {/* Region nodes */}
      {regions.map(region => {
        const pos = REGION_POSITIONS[region.name];
        if (!pos) return null;

        const flow = region.flow5d;
        const radius = 8 + Math.min(Math.abs(flow) / maxAbsFlow * 6, 6);
        const color = flow > 0 ? GREEN : flow < 0 ? RED : 'rgba(255,255,255,0.3)';
        const bgOpacity = 0.08 + Math.min(Math.abs(flow) / maxAbsFlow * 0.12, 0.12);

        return (
          <g key={region.name}>
            {/* Node background circle */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={radius}
              fill={color}
              fillOpacity={bgOpacity}
              stroke={color}
              strokeWidth={0.5}
              strokeOpacity={0.3}
            />
            {/* Flow indicator dot */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={2}
              fill={color}
              fillOpacity={0.7}
            />
            {/* Region label */}
            <text
              x={pos.x}
              y={pos.y - radius - 3}
              textAnchor="middle"
              fill="rgba(255,255,255,0.5)"
              fontSize={5.5}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {region.name}
            </text>
            {/* Flow value */}
            <text
              x={pos.x}
              y={pos.y + radius + 7}
              textAnchor="middle"
              fill={color}
              fontSize={5}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {fmtFlowSigned(flow)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Sparkline (SVG bar chart) ──

function Sparkline({ data, width = 56, height = 14 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;

  const maxAbs = Math.max(...data.map(Math.abs), 0.01);
  const midY = height / 2;
  const scaleY = (midY - 1) / maxAbs;
  const stepX = width / data.length;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <line x1={0} y1={midY} x2={width} y2={midY} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
      {data.map((v, i) => {
        const x = i * stepX;
        const barH = Math.abs(v) * scaleY;
        const y = v >= 0 ? midY - barH : midY;
        const color = v >= 0 ? 'rgba(52,211,153,0.5)' : 'rgba(248,113,113,0.5)';
        return <rect key={i} x={x + stepX * 0.1} y={y} width={stepX * 0.8} height={Math.max(barH, 0.3)} fill={color} />;
      })}
    </svg>
  );
}

// ── Horizontal Region Flow Bar ──

function RegionFlowBar({ region, maxAbs }: { region: CapitalFlowRegion; maxAbs: number }) {
  const badge = trendBadge(region.trend);
  const pct = maxAbs > 0 ? Math.min(Math.abs(region.flow5d) / maxAbs * 100, 100) : 0;
  const color = flowColor(region.flow5d);

  return (
    <div className="flex items-center gap-1 py-0.5 px-2 border-b border-white/[0.03]">
      <span className="w-16 text-[7px] font-mono font-bold text-white/60 truncate shrink-0">{region.name}</span>
      <span
        className="text-[5px] font-mono font-black uppercase px-1 py-0 shrink-0"
        style={{ color: badge.color, backgroundColor: badge.bg }}
      >
        {badge.text}
      </span>
      <div className="flex-1 h-2 bg-white/[0.02] relative overflow-hidden">
        <div
          className="absolute top-0 h-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            opacity: 0.5,
            left: region.flow5d >= 0 ? 0 : undefined,
            right: region.flow5d < 0 ? 0 : undefined,
          }}
        />
      </div>
      <span className="w-16 text-[7px] font-mono font-bold text-right shrink-0" style={{ color }}>
        {fmtFlowSigned(region.flow5d)}
      </span>
      <span className={`w-10 text-[7px] font-mono text-right shrink-0 ${region.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {fmtPct(region.changePct)}
      </span>
    </div>
  );
}

// ── Expandable Region Section ──

function RegionSection({ region }: { region: CapitalFlowRegion }) {
  const [expanded, setExpanded] = useState(false);
  const badge = trendBadge(region.trend);
  const color = flowColor(region.flow5d);

  return (
    <div className="border-b border-white/[0.04]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-2 py-1 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-1">
          {expanded
            ? <ChevronDown className="w-2.5 h-2.5 text-white/30" />
            : <ChevronRight className="w-2.5 h-2.5 text-white/30" />}
          <span className="text-[7px] font-black font-mono uppercase text-white/60">{region.name}</span>
          <span
            className="text-[5px] font-black font-mono uppercase px-1 py-0"
            style={{ color: badge.color, backgroundColor: badge.bg }}
          >
            {badge.text}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[6px] font-mono text-white/25">5D:</span>
          <span className="text-[7px] font-mono font-bold" style={{ color }}>{fmtFlowSigned(region.flow5d)}</span>
          <span className="text-[6px] font-mono text-white/25">20D:</span>
          <span className="text-[7px] font-mono font-bold" style={{ color: flowColor(region.flow20d) }}>{fmtFlowSigned(region.flow20d)}</span>
        </div>
      </button>

      {expanded && region.etfs.length > 0 && (
        <div className="px-2 pb-1">
          <div className="flex items-center py-0.5 border-b border-white/[0.06] text-[5px] font-mono text-white/20 uppercase gap-1">
            <span className="w-10 shrink-0">SYM</span>
            <span className="w-20 shrink-0">NAME</span>
            <span className="w-12 text-right shrink-0">PRICE</span>
            <span className="w-10 text-right shrink-0">CHG%</span>
            <span className="w-14 text-right shrink-0">5D FLOW</span>
            <span className="w-[56px] text-right shrink-0">HIST</span>
          </div>
          {region.etfs.map(etf => (
            <div key={etf.symbol} className="flex items-center py-0.5 border-b border-white/[0.02] text-[7px] font-mono gap-1">
              <span className="w-10 font-bold text-white/70 shrink-0">{etf.symbol}</span>
              <span className="w-20 text-white/30 truncate shrink-0">{etf.name}</span>
              <span className="w-12 text-right text-white/50 shrink-0">${etf.price.toFixed(2)}</span>
              <span className={`w-10 text-right font-bold shrink-0 ${etf.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtPct(etf.changePct)}
              </span>
              <span className="w-14 text-right font-bold shrink-0" style={{ color: flowColor(etf.flow5d) }}>
                {fmtFlowSigned(etf.flow5d)}
              </span>
              <div className="w-[56px] shrink-0 flex justify-end">
                <Sparkline data={etf.flowHistory} width={52} height={12} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Flow Narrative ──

function FlowNarrative({ summary }: { summary: CapitalFlowSummary }) {
  const carry = summary.carryTradeSignal;
  const carryColor = carry === 'active' ? GREEN : carry === 'unwinding' ? RED : 'rgba(255,255,255,0.4)';
  const carryText = carry === 'active' ? 'CARRY ACTIVE' : carry === 'unwinding' ? 'CARRY UNWIND' : 'CARRY NEUTRAL';

  return (
    <div className="px-2 py-1.5 border-t border-white/[0.06]">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[6px] font-mono text-white/25 uppercase tracking-wider">Signals</span>
        <span
          className="text-[5px] font-black font-mono uppercase px-1 py-0"
          style={{ color: carryColor, backgroundColor: carry === 'active' ? 'rgba(52,211,153,0.1)' : carry === 'unwinding' ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.03)' }}
        >
          {carryText}
        </span>
        <span className="text-[6px] font-mono text-white/25">|</span>
        <span className="text-[5px] font-mono text-white/30">
          Top In: <span className="text-emerald-400 font-bold">{summary.topInflow}</span>
        </span>
        <span className="text-[5px] font-mono text-white/30">
          Top Out: <span className="text-red-400 font-bold">{summary.topOutflow}</span>
        </span>
      </div>
      <p className="text-[7px] font-mono text-white/35 leading-relaxed">
        {summary.narrative}
      </p>
    </div>
  );
}

// ── Main Panel ──

export function CapitalFlowsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCapitalFlows();

  const summary = data?.summary;
  const dmEm = summary ? dmEmBadge(summary.dmVsEm) : null;
  const risk = summary ? riskBadge(summary.riskRotation) : null;

  // Sort regions by flow magnitude for bar chart
  const sortedRegions = data?.regions
    ? [...data.regions].sort((a, b) => b.flow5d - a.flow5d)
    : [];
  const maxAbsFlow = sortedRegions.length > 0
    ? Math.max(...sortedRegions.map(r => Math.abs(r.flow5d)), 1)
    : 1;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <circle cx="5" cy="8" r="3" fill="none" stroke={EMERALD} strokeWidth="1" />
            <circle cx="11" cy="8" r="3" fill="none" stroke={EMERALD} strokeWidth="1" />
            <path d="M8 6.5L8 9.5" stroke={EMERALD} strokeWidth="0.8" />
            <path d="M6.5 7L9.5 9" stroke={EMERALD} strokeWidth="0.6" opacity="0.5" />
            <path d="M6.5 9L9.5 7" stroke={EMERALD} strokeWidth="0.6" opacity="0.5" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: EMERALD }}>
            {tr(t, 'cfTitle', 'Global Capital Flows')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {dmEm && (
            <span
              className="text-[5px] font-black uppercase px-1 py-0.5"
              style={{ color: dmEm.color, backgroundColor: dmEm.bg }}
            >
              {dmEm.text}
            </span>
          )}
          {risk && (
            <span
              className="text-[5px] font-black uppercase px-1 py-0.5"
              style={{ color: risk.color, backgroundColor: risk.bg }}
            >
              {risk.text}
            </span>
          )}
          {data && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-0.5 text-white/30 hover:text-emerald-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Flow Direction Map */}
            <div className="px-2 py-1 border-b border-white/[0.06]">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[6px] text-white/25 uppercase tracking-wider">
                  {tr(t, 'cfFlowMap', 'Capital Flow Direction')}
                </span>
                <span className="text-[5px] text-white/15">5-day net flows</span>
              </div>
              <FlowDirectionMap regions={data.regions} flowMap={data.flowMap} />
            </div>

            {/* Region Flow Bars (sorted by magnitude) */}
            <div className="border-b border-white/[0.06]">
              <div className="flex items-center justify-between px-2 py-0.5">
                <span className="text-[6px] text-white/25 uppercase tracking-wider">
                  {tr(t, 'cfRegionFlows', 'Regional Flow Ranking')}
                </span>
                <div className="flex items-center gap-2 text-[5px] font-mono text-white/15">
                  <span>REGION</span>
                  <span>TREND</span>
                  <span>FLOW BAR</span>
                  <span>5D FLOW</span>
                  <span>CHG%</span>
                </div>
              </div>
              {sortedRegions.map(region => (
                <RegionFlowBar key={region.name} region={region} maxAbs={maxAbsFlow} />
              ))}
            </div>

            {/* Expandable Region Details */}
            <div>
              <div className="px-2 py-0.5">
                <span className="text-[6px] text-white/25 uppercase tracking-wider">
                  {tr(t, 'cfRegionDetail', 'Region Details')}
                </span>
              </div>
              {data.regions.map(region => (
                <RegionSection key={region.name} region={region} />
              ))}
            </div>

            {/* Flow Narrative */}
            {summary && <FlowNarrative summary={summary} />}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'cfNoData', 'No data available')}
          </div>
        )}
      </div>
    </div>
  );
}
