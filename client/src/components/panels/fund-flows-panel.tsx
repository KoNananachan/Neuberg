import { useState } from 'react';
import { useFundFlows, type FundFlowCategory, type FundFlowEtf } from '../../api/hooks/use-fund-flows';
import { useT } from '../../i18n';
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

// i18n helper with fallback
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

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

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtVol(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

// ── Color helpers ──

const TEAL = '#14b8a6';
const GREEN = '#34d399';
const RED = '#f87171';

function flowColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

function trendBadge(trend: 'inflow' | 'outflow' | 'neutral'): { text: string; color: string; bg: string } {
  switch (trend) {
    case 'inflow': return { text: 'INFLOW', color: GREEN, bg: 'rgba(52,211,153,0.1)' };
    case 'outflow': return { text: 'OUTFLOW', color: RED, bg: 'rgba(248,113,113,0.1)' };
    default: return { text: 'NEUTRAL', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.03)' };
  }
}

function riskBadge(risk: 'risk_on' | 'risk_off' | 'neutral'): { text: string; color: string; bg: string } {
  switch (risk) {
    case 'risk_on': return { text: 'RISK ON', color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'risk_off': return { text: 'RISK OFF', color: RED, bg: 'rgba(248,113,113,0.12)' };
    default: return { text: 'NEUTRAL', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' };
  }
}

// ── Sparkline (SVG) ──

function Sparkline({ data, width = 60, height = 16 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;

  const maxAbs = Math.max(...data.map(Math.abs), 0.01);
  const midY = height / 2;
  const scaleY = (midY - 1) / maxAbs;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => `${i * stepX},${midY - v * scaleY}`).join(' ');

  // Fill area: split into positive (green) and negative (red) by drawing from zero line
  const positivePath: string[] = [];
  const negativePath: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const x = i * stepX;
    const y = midY - data[i] * scaleY;
    if (data[i] >= 0) {
      positivePath.push(`${x},${midY} ${x},${y}`);
    } else {
      negativePath.push(`${x},${midY} ${x},${y}`);
    }
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      {/* Zero line */}
      <line x1={0} y1={midY} x2={width} y2={midY} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
      {/* Bars for each day */}
      {data.map((v, i) => {
        const x = i * stepX;
        const barH = Math.abs(v) * scaleY;
        const y = v >= 0 ? midY - barH : midY;
        const color = v >= 0 ? 'rgba(52,211,153,0.5)' : 'rgba(248,113,113,0.5)';
        return <rect key={i} x={x - stepX * 0.3} y={y} width={stepX * 0.6} height={Math.max(barH, 0.5)} fill={color} />;
      })}
      {/* Line */}
      <polyline points={points} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={0.7} />
    </svg>
  );
}

// ── Category Flow Summary Box ──

function CategoryFlowBox({ name, flow5d, trend }: { name: string; flow5d: number; trend: 'inflow' | 'outflow' | 'neutral' }) {
  const color = flowColor(flow5d);
  const arrow = flow5d > 0 ? '\u2191' : flow5d < 0 ? '\u2193' : '\u2192';
  return (
    <div className="flex-1 px-2 py-1.5 border border-white/[0.06] bg-white/[0.01]">
      <div className="text-[7px] font-mono text-white/30 uppercase tracking-wider mb-0.5">{name}</div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-mono font-black" style={{ color }}>{arrow}</span>
        <span className="text-[9px] font-mono font-bold" style={{ color }}>{fmtFlowSigned(flow5d)}</span>
      </div>
      <div className="text-[6px] font-mono uppercase mt-0.5" style={{ color }}>{trend}</div>
    </div>
  );
}

// ── Stacked Waterfall Chart (SVG) ──

const CATEGORY_COLORS: Record<string, { pos: string; neg: string }> = {
  'Equity': { pos: 'rgba(52,211,153,0.7)', neg: 'rgba(248,113,113,0.7)' },
  'Fixed Income': { pos: 'rgba(96,165,250,0.7)', neg: 'rgba(251,146,60,0.7)' },
  'Commodities': { pos: 'rgba(251,191,36,0.7)', neg: 'rgba(168,85,247,0.7)' },
  'Sector': { pos: 'rgba(20,184,166,0.7)', neg: 'rgba(244,63,94,0.7)' },
};

function WaterfallChart({ categories }: { categories: FundFlowCategory[] }) {
  // Build daily net flows per category (last 20 days)
  // Aggregate etf flowHistory within each category
  const DAYS = 20;
  const categoryDailyFlows = categories.map(cat => {
    const daily = new Array(DAYS).fill(0);
    for (const etf of cat.etfs) {
      for (let d = 0; d < DAYS && d < etf.flowHistory.length; d++) {
        daily[d] += etf.flowHistory[d];
      }
    }
    return { name: cat.name, daily };
  });

  // Compute stacked values per day
  const W = 320;
  const H = 100;
  const PADDING_L = 32;
  const PADDING_R = 4;
  const PADDING_T = 4;
  const PADDING_B = 14;
  const chartW = W - PADDING_L - PADDING_R;
  const chartH = H - PADDING_T - PADDING_B;
  const barW = chartW / DAYS;

  // For each day, compute total positive and negative stacked bars
  type StackSegment = { catName: string; y0: number; y1: number };
  const posStacks: StackSegment[][] = [];
  const negStacks: StackSegment[][] = [];
  let maxPos = 0;
  let maxNeg = 0;

  for (let d = 0; d < DAYS; d++) {
    let posAccum = 0;
    let negAccum = 0;
    const dayPos: StackSegment[] = [];
    const dayNeg: StackSegment[] = [];

    for (const cat of categoryDailyFlows) {
      const v = cat.daily[d];
      if (v >= 0) {
        dayPos.push({ catName: cat.name, y0: posAccum, y1: posAccum + v });
        posAccum += v;
      } else {
        dayNeg.push({ catName: cat.name, y0: negAccum, y1: negAccum + Math.abs(v) });
        negAccum += Math.abs(v);
      }
    }

    maxPos = Math.max(maxPos, posAccum);
    maxNeg = Math.max(maxNeg, negAccum);
    posStacks.push(dayPos);
    negStacks.push(dayNeg);
  }

  const maxVal = Math.max(maxPos, maxNeg, 1);
  const zeroY = PADDING_T + chartH * (maxPos / (maxPos + maxNeg || 1));
  const scalePos = maxPos > 0 ? (zeroY - PADDING_T) / maxPos : 0;
  const scaleNeg = maxNeg > 0 ? (PADDING_T + chartH - zeroY) / maxNeg : 0;

  // Y-axis labels
  const yLabels = [
    { value: maxPos, y: PADDING_T },
    { value: 0, y: zeroY },
    { value: -maxNeg, y: PADDING_T + chartH },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
      {/* Grid lines */}
      <line x1={PADDING_L} y1={zeroY} x2={W - PADDING_R} y2={zeroY} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
      <line x1={PADDING_L} y1={PADDING_T} x2={W - PADDING_R} y2={PADDING_T} stroke="rgba(255,255,255,0.03)" strokeWidth={0.3} strokeDasharray="2,2" />
      <line x1={PADDING_L} y1={PADDING_T + chartH} x2={W - PADDING_R} y2={PADDING_T + chartH} stroke="rgba(255,255,255,0.03)" strokeWidth={0.3} strokeDasharray="2,2" />

      {/* Y-axis labels */}
      {yLabels.map((l, i) => (
        <text key={i} x={PADDING_L - 2} y={l.y + 2.5} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={5} fontFamily="monospace">
          {l.value >= 0 ? '+' : ''}{Math.round(l.value)}M
        </text>
      ))}

      {/* Stacked bars */}
      {posStacks.map((daySegs, d) => {
        const x = PADDING_L + d * barW + barW * 0.1;
        const w = barW * 0.8;
        return daySegs.map((seg, si) => {
          const h = (seg.y1 - seg.y0) * scalePos;
          const y = zeroY - seg.y1 * scalePos;
          const colors = CATEGORY_COLORS[seg.catName] || CATEGORY_COLORS['Equity'];
          return <rect key={`p${d}-${si}`} x={x} y={y} width={w} height={Math.max(h, 0.3)} fill={colors.pos} />;
        });
      })}
      {negStacks.map((daySegs, d) => {
        const x = PADDING_L + d * barW + barW * 0.1;
        const w = barW * 0.8;
        return daySegs.map((seg, si) => {
          const y = zeroY + seg.y0 * scaleNeg;
          const h = (seg.y1 - seg.y0) * scaleNeg;
          const colors = CATEGORY_COLORS[seg.catName] || CATEGORY_COLORS['Equity'];
          return <rect key={`n${d}-${si}`} x={x} y={y} width={w} height={Math.max(h, 0.3)} fill={colors.neg} />;
        });
      })}

      {/* X-axis day labels (every 5th) */}
      {[0, 5, 10, 15, 19].map(d => (
        <text key={d} x={PADDING_L + d * barW + barW / 2} y={H - 2} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">
          {d === 0 ? '-20d' : d === 19 ? 'now' : `-${20 - d}d`}
        </text>
      ))}

      {/* Legend */}
      {Object.entries(CATEGORY_COLORS).map(([name, colors], i) => (
        <g key={name} transform={`translate(${PADDING_L + i * 70}, ${H - 8})`}>
          <rect x={0} y={-3} width={5} height={3} fill={colors.pos} />
          <text x={7} y={0} fill="rgba(255,255,255,0.3)" fontSize={4} fontFamily="monospace">{name}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Flow Bar (horizontal bar proportional to flow magnitude) ──

function FlowBar({ value, maxAbs }: { value: number; maxAbs: number }) {
  const pct = maxAbs > 0 ? Math.min(Math.abs(value) / maxAbs * 100, 100) : 0;
  const color = value >= 0 ? GREEN : RED;
  return (
    <div className="w-14 h-1.5 bg-white/[0.03] overflow-hidden relative">
      <div className="h-full absolute" style={{
        width: `${pct}%`,
        backgroundColor: color,
        opacity: 0.6,
        [value >= 0 ? 'left' : 'right']: 0,
      }} />
    </div>
  );
}

// ── ETF Table Row ──

function EtfRow({ etf, maxAbs }: { etf: FundFlowEtf; maxAbs: number }) {
  const changeColor = etf.changePct >= 0 ? 'text-emerald-400' : 'text-red-400';
  return (
    <div className="flex items-center py-0.5 border-b border-white/[0.03] text-[8px] font-mono gap-1">
      <span className="w-10 font-bold text-white/80 shrink-0">{etf.symbol}</span>
      <span className="w-20 text-white/30 truncate shrink-0">{etf.name}</span>
      <span className="w-14 text-right text-white/60 shrink-0">${fmtPrice(etf.price)}</span>
      <span className={`w-12 text-right font-bold shrink-0 ${changeColor}`}>{fmtPct(etf.changePct)}</span>
      <span className="w-14 text-right font-bold shrink-0" style={{ color: flowColor(etf.flow5d) }}>
        {fmtFlowSigned(etf.flow5d)}
      </span>
      <span className="w-14 text-right font-bold shrink-0" style={{ color: flowColor(etf.flow20d) }}>
        {fmtFlowSigned(etf.flow20d)}
      </span>
      <div className="w-[60px] shrink-0 flex justify-end">
        <Sparkline data={etf.flowHistory} width={56} height={14} />
      </div>
    </div>
  );
}

// ── Collapsible Category Section ──

function CategorySection({ category }: { category: FundFlowCategory }) {
  const [expanded, setExpanded] = useState(true);
  const badge = trendBadge(category.trend);
  const maxAbs = Math.max(...category.etfs.map(e => Math.abs(e.flow5d)), 1);

  return (
    <div className="border-b border-white/[0.06]">
      {/* Category header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-2 py-1 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-1.5">
          {expanded
            ? <ChevronDown className="w-2.5 h-2.5 text-white/30" />
            : <ChevronRight className="w-2.5 h-2.5 text-white/30" />}
          <span className="text-[8px] font-black font-mono uppercase text-white/70">{category.name}</span>
          <span
            className="text-[6px] font-black font-mono uppercase px-1 py-0.5"
            style={{ color: badge.color, backgroundColor: badge.bg }}
          >
            {badge.text}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-mono text-white/30">5D:</span>
          <span className="text-[8px] font-mono font-bold" style={{ color: flowColor(category.totalFlow5d) }}>
            {fmtFlowSigned(category.totalFlow5d)}
          </span>
          <span className="text-[7px] font-mono text-white/30">20D:</span>
          <span className="text-[8px] font-mono font-bold" style={{ color: flowColor(category.totalFlow20d) }}>
            {fmtFlowSigned(category.totalFlow20d)}
          </span>
        </div>
      </button>

      {/* ETF table */}
      {expanded && (
        <div className="px-2 pb-1">
          {/* Table header */}
          <div className="flex items-center py-0.5 border-b border-white/[0.06] text-[6px] font-mono text-white/25 uppercase gap-1">
            <span className="w-10 shrink-0">SYM</span>
            <span className="w-20 shrink-0">NAME</span>
            <span className="w-14 text-right shrink-0">PRICE</span>
            <span className="w-12 text-right shrink-0">CHG%</span>
            <span className="w-14 text-right shrink-0">5D FLOW</span>
            <span className="w-14 text-right shrink-0">20D FLOW</span>
            <span className="w-[60px] text-right shrink-0">FLOW</span>
          </div>
          {category.etfs.map(etf => (
            <EtfRow key={etf.symbol} etf={etf} maxAbs={maxAbs} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Panel ──

export function FundFlowsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useFundFlows();

  const summary = data?.summary;
  const risk = summary ? riskBadge(summary.riskAppetite) : null;

  // Get the 3 summary categories for top bar
  const equityCat = data?.categories.find(c => c.name === 'Equity');
  const bondCat = data?.categories.find(c => c.name === 'Fixed Income');
  const commodityCat = data?.categories.find(c => c.name === 'Commodities');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <path d="M2 14V8l3-4 3 4V5l3-3 3 3v9" fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: TEAL }}>
            {tr(t, 'ffTitle', 'Fund Flows')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {summary && (
            <>
              <span className="text-[7px] text-white/25 truncate max-w-[100px]">
                {summary.rotationSignal}
              </span>
              {risk && (
                <span
                  className="text-[6px] font-black uppercase px-1.5 py-0.5"
                  style={{ color: risk.color, backgroundColor: risk.bg }}
                >
                  {risk.text}
                </span>
              )}
            </>
          )}
          {data && (
            <span className="text-[7px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-white/30 hover:text-teal-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Category flow summary bar */}
            <div className="flex gap-0 border-b border-white/[0.06]">
              {equityCat && <CategoryFlowBox name="Equity" flow5d={equityCat.totalFlow5d} trend={equityCat.trend} />}
              {bondCat && <CategoryFlowBox name="Fixed Income" flow5d={bondCat.totalFlow5d} trend={bondCat.trend} />}
              {commodityCat && <CategoryFlowBox name="Commodities" flow5d={commodityCat.totalFlow5d} trend={commodityCat.trend} />}
            </div>

            {/* Waterfall chart */}
            <div className="px-2 py-1.5 border-b border-white/[0.06]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[7px] text-white/30 uppercase tracking-wider">
                  {tr(t, 'ffDailyFlows', 'Daily Net Flows (20D)')}
                </span>
              </div>
              <WaterfallChart categories={data.categories} />
            </div>

            {/* ETF flow table by category */}
            <div>
              {data.categories.map(cat => (
                <CategorySection key={cat.name} category={cat} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'ffNoData', 'No data available')}
          </div>
        )}
      </div>
    </div>
  );
}
