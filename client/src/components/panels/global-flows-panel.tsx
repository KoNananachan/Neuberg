import { useState, useMemo } from 'react';
import {
  useGlobalFlows,
  type RegionalFlow,
  type TopETF,
  type SentimentIndicators,
} from '../../api/hooks/use-global-flows';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// ── Constants ──

const CYAN = '#22d3ee';
const GREEN = '#34d399';
const RED = '#f87171';
const YELLOW = '#fbbf24';

type ViewMode = 'REGIONS' | 'ETFS' | 'SENTIMENT';
type CategoryFilter = 'ALL' | 'EQUITY' | 'FIXED INCOME' | 'COMMODITY' | 'ALTERNATIVE';
type SortKey = 'name' | 'flow1d' | 'flow1w' | 'flow1m' | 'flow3m' | 'flowYtd' | 'aum' | 'flowPctAum';
type SortDir = 'asc' | 'desc';

// ── Number formatting ──

function fmtB(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return (n / 1000).toFixed(1) + 'T';
  if (abs >= 1) return n.toFixed(1) + 'B';
  return (n * 1000).toFixed(0) + 'M';
}

function fmtSigned(n: number): string {
  const prefix = n > 0 ? '+' : '';
  return prefix + '$' + fmtB(n);
}

function fmtAum(n: number): string {
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'T';
  return '$' + n.toFixed(0) + 'B';
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

function flowBg(n: number): string {
  if (n > 0) return 'rgba(52,211,153,0.08)';
  if (n < 0) return 'rgba(248,113,113,0.08)';
  return 'transparent';
}

function riskColor(score: number): string {
  if (score > 30) return GREEN;
  if (score < -30) return RED;
  return YELLOW;
}

function riskLabel(score: number): string {
  if (score > 50) return 'STRONG RISK-ON';
  if (score > 20) return 'RISK-ON';
  if (score < -50) return 'STRONG RISK-OFF';
  if (score < -20) return 'RISK-OFF';
  return 'NEUTRAL';
}

function signalBadge(sig: 'bullish' | 'bearish' | 'neutral'): { text: string; color: string; bg: string } {
  switch (sig) {
    case 'bullish': return { text: 'BULLISH', color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'bearish': return { text: 'BEARISH', color: RED, bg: 'rgba(248,113,113,0.12)' };
    default: return { text: 'NEUTRAL', color: YELLOW, bg: 'rgba(251,191,36,0.1)' };
  }
}

// ── Category filter mapping ──

const CATEGORY_MAP: Record<CategoryFilter, string | null> = {
  ALL: null,
  EQUITY: 'equity',
  'FIXED INCOME': 'fixed-income',
  COMMODITY: 'commodity',
  ALTERNATIVE: 'alternative',
};

// ── Flow Bar (inline proportional bar) ──

function FlowBar({ value, maxAbs }: { value: number; maxAbs: number }) {
  const pct = maxAbs > 0 ? Math.min(Math.abs(value) / maxAbs, 1) * 100 : 0;
  const color = flowColor(value);

  return (
    <div className="w-full h-[6px] bg-white/[0.02] relative overflow-hidden">
      {value >= 0 ? (
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.45 }}
        />
      ) : (
        <div
          className="absolute top-0 right-0 h-full"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.45 }}
        />
      )}
    </div>
  );
}

// ── Streak indicator ──

function StreakBadge({ streak }: { streak: number }) {
  const abs = Math.abs(streak);
  const color = streak > 0 ? GREEN : RED;
  const icon = streak > 0 ? '+' : '-';
  const opacity = Math.min(0.3 + abs * 0.1, 1);

  return (
    <span
      className="text-[7px] font-mono font-black px-1 py-0"
      style={{ color, opacity, backgroundColor: streak > 0 ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)' }}
    >
      {icon}{abs}D
    </span>
  );
}

// ── Risk Gauge (SVG arc) ──

function RiskGauge({ score }: { score: number }) {
  const W = 180;
  const H = 100;
  const cx = W / 2;
  const cy = H - 10;
  const r = 65;
  // Arc from -100 to +100 maps to 180deg to 0deg
  const startAngle = Math.PI;
  const endAngle = 0;
  const normalized = (score + 100) / 200; // 0 to 1
  const angle = startAngle - normalized * Math.PI;

  // Needle endpoint
  const nx = cx + r * 0.85 * Math.cos(angle);
  const ny = cy - r * 0.85 * Math.abs(Math.sin(angle));

  // Arc path helper
  const arcPoint = (a: number, radius: number) => ({
    x: cx + radius * Math.cos(a),
    y: cy - radius * Math.abs(Math.sin(a)),
  });

  // Gradient arc segments
  const segments = 40;
  const arcPaths: { d: string; color: string }[] = [];
  for (let i = 0; i < segments; i++) {
    const a1 = startAngle - (i / segments) * Math.PI;
    const a2 = startAngle - ((i + 1) / segments) * Math.PI;
    const p1 = arcPoint(a1, r);
    const p2 = arcPoint(a2, r);
    const p3 = arcPoint(a2, r - 6);
    const p4 = arcPoint(a1, r - 6);
    const t = i / segments;
    let color: string;
    if (t < 0.35) color = RED;
    else if (t < 0.65) color = YELLOW;
    else color = GREEN;
    const opacity = 0.25 + (i === Math.floor(normalized * segments) ? 0.4 : 0);
    arcPaths.push({
      d: `M${p1.x},${p1.y} A${r},${r} 0 0,1 ${p2.x},${p2.y} L${p3.x},${p3.y} A${r - 6},${r - 6} 0 0,0 ${p4.x},${p4.y} Z`,
      color: `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    });
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
      {/* Arc segments */}
      {arcPaths.map((seg, i) => (
        <path key={i} d={seg.d} fill={seg.color} />
      ))}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={riskColor(score)} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={3} fill={riskColor(score)} />
      {/* Labels */}
      <text x={cx - r - 8} y={cy + 2} fill={RED} fontSize={6} fontFamily="monospace" textAnchor="end" opacity={0.6}>-100</text>
      <text x={cx + r + 8} y={cy + 2} fill={GREEN} fontSize={6} fontFamily="monospace" textAnchor="start" opacity={0.6}>+100</text>
      <text x={cx} y={cy - r + 4} fill="rgba(255,255,255,0.3)" fontSize={5} fontFamily="monospace" textAnchor="middle">0</text>
      {/* Score */}
      <text x={cx} y={cy - 18} fill={riskColor(score)} fontSize={18} fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        {score > 0 ? '+' : ''}{score}
      </text>
      <text x={cx} y={cy - 6} fill="rgba(255,255,255,0.4)" fontSize={6} fontFamily="monospace" textAnchor="middle">
        {riskLabel(score)}
      </text>
    </svg>
  );
}

// ── Momentum Bar (horizontal comparison) ──

function MomentumBar({ label, value, maxAbs }: { label: string; value: number; maxAbs: number }) {
  const pct = maxAbs > 0 ? Math.min(Math.abs(value) / maxAbs, 1) * 50 : 0;
  const color = flowColor(value);

  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className="w-16 text-[7px] font-mono text-white/40 shrink-0">{label}</span>
      <div className="flex-1 h-[8px] bg-white/[0.02] relative">
        <div className="absolute top-0 left-1/2 w-px h-full bg-white/[0.06]" />
        {value >= 0 ? (
          <div
            className="absolute top-0 h-full"
            style={{ left: '50%', width: `${pct}%`, backgroundColor: color, opacity: 0.5 }}
          />
        ) : (
          <div
            className="absolute top-0 h-full"
            style={{ right: '50%', width: `${pct}%`, backgroundColor: color, opacity: 0.5 }}
          />
        )}
      </div>
      <span className="w-14 text-[7px] font-mono font-bold text-right shrink-0" style={{ color }}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)} bps
      </span>
    </div>
  );
}

// ── Sort header helper ──

function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = currentSort === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`text-[5px] font-mono uppercase tracking-wider ${align === 'right' ? 'text-right' : 'text-left'} ${active ? 'text-cyan-400' : 'text-white/20'} hover:text-cyan-400/60 transition-colors`}
    >
      {label}{active ? (currentDir === 'desc' ? ' \u25BC' : ' \u25B2') : ''}
    </button>
  );
}

// ── REGIONS View ──

function RegionsView({ data, filter }: { data: RegionalFlow[]; filter: CategoryFilter }) {
  const [sortKey, setSortKey] = useState<SortKey>('flow1d');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filtered = useMemo(() => {
    const cat = CATEGORY_MAP[filter];
    const items = cat ? data.filter(r => r.category === cat) : data;
    return [...items].sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      if (sortKey === 'name') {
        return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number);
    });
  }, [data, filter, sortKey, sortDir]);

  const maxAbs1d = Math.max(...filtered.map(r => Math.abs(r.flow1d)), 0.01);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div>
      {/* Column headers */}
      <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] gap-1">
        <div className="w-[88px] shrink-0">
          <SortHeader label="NAME" sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
        </div>
        <div className="w-[44px] shrink-0 text-right">
          <SortHeader label="1D" sortKey="flow1d" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
        </div>
        <div className="w-[44px] shrink-0 text-right">
          <SortHeader label="1W" sortKey="flow1w" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
        </div>
        <div className="w-[44px] shrink-0 text-right">
          <SortHeader label="1M" sortKey="flow1m" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
        </div>
        <div className="w-[44px] shrink-0 text-right">
          <SortHeader label="3M" sortKey="flow3m" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
        </div>
        <div className="w-[44px] shrink-0 text-right">
          <SortHeader label="YTD" sortKey="flowYtd" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
        </div>
        <div className="w-[50px] shrink-0 text-right">
          <SortHeader label="AUM" sortKey="aum" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
        </div>
        <div className="w-[36px] shrink-0 text-right">
          <SortHeader label="F/A%" sortKey="flowPctAum" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
        </div>
        <div className="flex-1 text-[5px] font-mono text-white/15 text-center">FLOW</div>
      </div>

      {/* Rows */}
      {filtered.map(r => (
        <div
          key={r.name}
          className="flex items-center px-2 py-[3px] border-b border-white/[0.02] gap-1 hover:bg-cyan-400/[0.02] transition-colors"
        >
          <div className="w-[88px] shrink-0 flex items-center gap-1">
            <span className="text-[7px] font-mono font-bold text-white/60 truncate">{r.name}</span>
          </div>
          <span className="w-[44px] shrink-0 text-[7px] font-mono font-bold text-right" style={{ color: flowColor(r.flow1d) }}>
            {fmtSigned(r.flow1d)}
          </span>
          <span className="w-[44px] shrink-0 text-[7px] font-mono font-bold text-right" style={{ color: flowColor(r.flow1w) }}>
            {fmtSigned(r.flow1w)}
          </span>
          <span className="w-[44px] shrink-0 text-[7px] font-mono font-bold text-right" style={{ color: flowColor(r.flow1m) }}>
            {fmtSigned(r.flow1m)}
          </span>
          <span className="w-[44px] shrink-0 text-[7px] font-mono font-bold text-right" style={{ color: flowColor(r.flow3m) }}>
            {fmtSigned(r.flow3m)}
          </span>
          <span className="w-[44px] shrink-0 text-[7px] font-mono font-bold text-right" style={{ color: flowColor(r.flowYtd) }}>
            {fmtSigned(r.flowYtd)}
          </span>
          <span className="w-[50px] shrink-0 text-[7px] font-mono text-white/40 text-right">
            {fmtAum(r.aum)}
          </span>
          <span
            className="w-[36px] shrink-0 text-[7px] font-mono font-bold text-right"
            style={{ color: flowColor(r.flowPctAum), backgroundColor: flowBg(r.flowPctAum) }}
          >
            {fmtPct(r.flowPctAum)}
          </span>
          <div className="flex-1">
            <FlowBar value={r.flow1d} maxAbs={maxAbs1d} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── ETFS View ──

function ETFsView({ data }: { data: TopETF[] }) {
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => Math.abs(b.flow1d) - Math.abs(a.flow1d));
  }, [data]);

  const maxAbs = Math.max(...sorted.map(e => Math.abs(e.flow1d)), 0.01);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] gap-1 text-[5px] font-mono text-white/20 uppercase tracking-wider">
        <span className="w-[30px] shrink-0">#</span>
        <span className="w-[36px] shrink-0">TICKER</span>
        <span className="w-[100px] shrink-0">NAME</span>
        <span className="w-[50px] shrink-0 text-right">1D FLOW</span>
        <span className="w-[50px] shrink-0 text-right">1W FLOW</span>
        <span className="w-[50px] shrink-0 text-right">1M FLOW</span>
        <span className="w-[50px] shrink-0 text-right">AUM</span>
        <span className="w-[34px] shrink-0 text-center">STREAK</span>
        <span className="flex-1 text-center">FLOW</span>
      </div>

      {/* Rows */}
      {sorted.map((etf, i) => (
        <div
          key={etf.ticker}
          className="flex items-center px-2 py-[3px] border-b border-white/[0.02] gap-1 hover:bg-cyan-400/[0.02] transition-colors"
        >
          <span className="w-[30px] shrink-0 text-[7px] font-mono text-white/15">{i + 1}</span>
          <span className="w-[36px] shrink-0 text-[8px] font-mono font-black text-cyan-400/80">{etf.ticker}</span>
          <span className="w-[100px] shrink-0 text-[7px] font-mono text-white/35 truncate">{etf.name}</span>
          <span className="w-[50px] shrink-0 text-[7px] font-mono font-bold text-right" style={{ color: flowColor(etf.flow1d) }}>
            {fmtSigned(etf.flow1d)}
          </span>
          <span className="w-[50px] shrink-0 text-[7px] font-mono font-bold text-right" style={{ color: flowColor(etf.flow1w) }}>
            {fmtSigned(etf.flow1w)}
          </span>
          <span className="w-[50px] shrink-0 text-[7px] font-mono font-bold text-right" style={{ color: flowColor(etf.flow1m) }}>
            {fmtSigned(etf.flow1m)}
          </span>
          <span className="w-[50px] shrink-0 text-[7px] font-mono text-white/40 text-right">
            {fmtAum(etf.aum)}
          </span>
          <div className="w-[34px] shrink-0 flex justify-center">
            <StreakBadge streak={etf.flowStreak} />
          </div>
          <div className="flex-1">
            <FlowBar value={etf.flow1d} maxAbs={maxAbs} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SENTIMENT View ──

function SentimentView({ sentiment, regional }: { sentiment: SentimentIndicators; regional: RegionalFlow[] }) {
  const sig = signalBadge(sentiment.contraindicatorSignal);
  const maxMomentum = Math.max(
    Math.abs(sentiment.equityFlowMomentum),
    Math.abs(sentiment.bondFlowMomentum),
    0.01,
  );

  // Calculate total equity vs bond flows for context
  const eqFlows = regional.filter(r => r.category === 'equity');
  const bdFlows = regional.filter(r => r.category === 'fixed-income');
  const totalEqFlow1w = eqFlows.reduce((s, r) => s + r.flow1w, 0);
  const totalBdFlow1w = bdFlows.reduce((s, r) => s + r.flow1w, 0);

  return (
    <div className="px-2 py-1.5 space-y-3">
      {/* Risk-On/Off Gauge */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[6px] font-mono text-white/25 uppercase tracking-wider">Risk-On / Risk-Off Score</span>
          <span
            className="text-[6px] font-mono font-black px-1.5 py-0.5"
            style={{ color: riskColor(sentiment.riskOnOffScore), backgroundColor: riskColor(sentiment.riskOnOffScore) + '15' }}
          >
            {riskLabel(sentiment.riskOnOffScore)}
          </span>
        </div>
        <RiskGauge score={sentiment.riskOnOffScore} />
      </div>

      {/* Flow Momentum */}
      <div>
        <span className="text-[6px] font-mono text-white/25 uppercase tracking-wider block mb-1">Flow Momentum (bps of AUM)</span>
        <MomentumBar label="EQUITY" value={sentiment.equityFlowMomentum} maxAbs={maxMomentum} />
        <MomentumBar label="BONDS" value={sentiment.bondFlowMomentum} maxAbs={maxMomentum} />
      </div>

      {/* Equity vs Bond Flow Summary */}
      <div className="border border-white/[0.04] p-2">
        <span className="text-[6px] font-mono text-white/25 uppercase tracking-wider block mb-1.5">Weekly Flow Comparison</span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[5px] font-mono text-white/20 block">EQUITY NET 1W</span>
            <span className="text-[12px] font-mono font-black block" style={{ color: flowColor(totalEqFlow1w) }}>
              {fmtSigned(totalEqFlow1w)}
            </span>
          </div>
          <div>
            <span className="text-[5px] font-mono text-white/20 block">BOND NET 1W</span>
            <span className="text-[12px] font-mono font-black block" style={{ color: flowColor(totalBdFlow1w) }}>
              {fmtSigned(totalBdFlow1w)}
            </span>
          </div>
        </div>
        <div className="mt-1.5 h-[6px] bg-white/[0.02] flex overflow-hidden">
          {totalEqFlow1w !== 0 || totalBdFlow1w !== 0 ? (
            <>
              <div
                className="h-full"
                style={{
                  width: `${Math.max(5, Math.abs(totalEqFlow1w) / (Math.abs(totalEqFlow1w) + Math.abs(totalBdFlow1w)) * 100)}%`,
                  backgroundColor: totalEqFlow1w >= 0 ? GREEN : RED,
                  opacity: 0.5,
                }}
              />
              <div
                className="h-full"
                style={{
                  width: `${Math.max(5, Math.abs(totalBdFlow1w) / (Math.abs(totalEqFlow1w) + Math.abs(totalBdFlow1w)) * 100)}%`,
                  backgroundColor: totalBdFlow1w >= 0 ? '#60a5fa' : RED,
                  opacity: 0.5,
                }}
              />
            </>
          ) : null}
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[5px] font-mono text-white/15">EQUITY</span>
          <span className="text-[5px] font-mono text-white/15">BONDS</span>
        </div>
      </div>

      {/* Cash Allocation & Contrarian */}
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-white/[0.04] p-2">
          <span className="text-[5px] font-mono text-white/20 uppercase block mb-1">Cash / MM Allocation</span>
          <span className="text-[14px] font-mono font-black text-white/70 block">
            {sentiment.cashAllocation.toFixed(1)}%
          </span>
          <div className="mt-1 h-[4px] bg-white/[0.03] overflow-hidden">
            <div
              className="h-full"
              style={{
                width: `${Math.min(sentiment.cashAllocation, 100)}%`,
                backgroundColor: CYAN,
                opacity: 0.4,
              }}
            />
          </div>
        </div>
        <div className="border border-white/[0.04] p-2">
          <span className="text-[5px] font-mono text-white/20 uppercase block mb-1">Contrarian Signal</span>
          <span
            className="text-[12px] font-mono font-black block"
            style={{ color: sig.color }}
          >
            {sig.text}
          </span>
          <span className="text-[5px] font-mono text-white/15 block mt-0.5">
            {sentiment.contraindicatorSignal === 'bullish'
              ? 'High cash = money on sidelines'
              : sentiment.contraindicatorSignal === 'bearish'
              ? 'Low cash = fully invested'
              : 'Neutral positioning'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function GlobalFlowsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useGlobalFlows();
  const [view, setView] = useState<ViewMode>('REGIONS');
  const [filter, setFilter] = useState<CategoryFilter>('ALL');

  // Compute total net flow across all regional items
  const totalNetFlow = useMemo(() => {
    if (!data?.regional) return 0;
    return data.regional.reduce((s, r) => s + r.flow1d, 0);
  }, [data]);

  const riskScore = data?.sentiment.riskOnOffScore ?? 0;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <path d="M2 12L2 4L6 8L10 5L14 9" fill="none" stroke={CYAN} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="3" cy="11" r="1.5" fill="none" stroke={CYAN} strokeWidth="0.8" opacity="0.5" />
            <circle cx="13" cy="8" r="1.5" fill="none" stroke={CYAN} strokeWidth="0.8" opacity="0.5" />
            <path d="M7 12L7 10" stroke={CYAN} strokeWidth="0.6" opacity="0.4" />
            <path d="M10 12L10 9" stroke={CYAN} strokeWidth="0.6" opacity="0.4" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: CYAN }}>
            {tr(t, 'gfTitle', 'Global Flow Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Total net flow badge */}
          {data && (
            <span
              className="text-[6px] font-black font-mono px-1.5 py-0.5 flex items-center gap-0.5"
              style={{ color: flowColor(totalNetFlow), backgroundColor: flowBg(totalNetFlow) }}
            >
              {totalNetFlow >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              NET {fmtSigned(totalNetFlow)}
            </span>
          )}
          {/* Risk-on/off indicator */}
          {data && (
            <span
              className="text-[5px] font-black uppercase px-1 py-0.5"
              style={{
                color: riskColor(riskScore),
                backgroundColor: riskColor(riskScore) + '15',
              }}
            >
              {riskLabel(riskScore)}
            </span>
          )}
          {data && (
            <span className="text-[6px] text-white/20">
              {new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-0.5 text-white/30 hover:text-cyan-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] shrink-0 gap-0">
        {(['REGIONS', 'ETFS', 'SENTIMENT'] as ViewMode[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-2 py-0.5 text-[7px] font-mono font-black uppercase tracking-wider transition-colors ${
              view === v
                ? 'text-cyan-400 border-b border-cyan-400'
                : 'text-white/25 hover:text-white/40'
            }`}
          >
            {v}
          </button>
        ))}
        <div className="flex-1" />
        {/* Category filters (only for REGIONS view) */}
        {view === 'REGIONS' && (
          <div className="flex items-center gap-0">
            {(['ALL', 'EQUITY', 'FIXED INCOME', 'COMMODITY', 'ALTERNATIVE'] as CategoryFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-1.5 py-0.5 text-[5px] font-mono font-bold uppercase tracking-wider transition-colors ${
                  filter === f
                    ? 'text-cyan-400 bg-cyan-400/[0.06]'
                    : 'text-white/15 hover:text-white/30'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : data ? (
          <>
            {view === 'REGIONS' && <RegionsView data={data.regional} filter={filter} />}
            {view === 'ETFS' && <ETFsView data={data.topETFs} />}
            {view === 'SENTIMENT' && <SentimentView sentiment={data.sentiment} regional={data.regional} />}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'gfNoData', 'No data available')}
          </div>
        )}
      </div>
    </div>
  );
}
