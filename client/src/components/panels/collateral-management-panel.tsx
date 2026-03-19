import { useCollateralManagement } from '../../api/hooks/use-collateral-management';
import { useT } from '../../i18n';
import { RefreshCw, ShieldCheck, Layers, Users, Zap, Clock, Scale } from 'lucide-react';

// -- i18n fallback helper --

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// -- Formatting helpers --

function fmtAmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(1);
}

function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals) + '%';
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(0) + 'bp';
}

function fmtSigned(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return sign + fmtAmt(n);
}

// -- Color helpers --

function surplusColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function marginCallStatusBadge(status: string | null | undefined): string {
  const s = (status ?? '').toUpperCase();
  if (s === 'SETTLED' || s === 'MET' || s === 'RESOLVED') return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (s === 'PENDING' || s === 'OPEN') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  if (s === 'DISPUTED' || s === 'OVERDUE' || s === 'BREACH') return 'bg-red-400/20 text-red-400 border-red-400/30';
  if (s === 'PARTIAL') return 'bg-orange-400/20 text-orange-400 border-orange-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function complianceColor(compliant: boolean | null | undefined): string {
  if (compliant == null) return 'text-neutral-500';
  return compliant ? 'text-green-400' : 'text-red-400';
}

function haircutBarColor(pct: number): string {
  if (pct >= 25) return '#f43f5e';
  if (pct >= 15) return '#facc15';
  if (pct >= 8) return '#a78bfa';
  return '#4ade80';
}

// -- Interfaces --

interface PoolSummary {
  totalPool: number;
  totalPledged: number;
  excessCollateral: number;
  haircutAdjustedValue: number;
}

interface AssetClassBreakdown {
  assetClass: string;
  value: number;
  allocation: number;
  haircut: number;
  haircutAdjusted: number;
}

interface CounterpartyExposure {
  name: string;
  pledged: number;
  received: number;
  netExposure: number;
  marginCallStatus: string;
}

interface OptimizationMetrics {
  ctdSavings: number;
  substitutionCount: number;
  reuseRate: number;
  efficiencyScore: number;
}

interface MarginCall {
  id: string;
  counterparty: string;
  amount: number;
  direction: string;
  deadline: string;
  status: string;
  type: string;
}

interface RegulatoryImVm {
  metric: string;
  value: number;
  requirement: number;
  compliant: boolean;
  category: string;
}

// -- SVG Horizontal Bar --

function HorizontalBar({ value, max, color, width = 64, height = 6 }: {
  value: number;
  max: number;
  color: string;
  width?: number;
  height?: number;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <svg width={width} height={height} className="inline-block">
      <rect x={0} y={0} width={width} height={height} fill="#262626" rx={0} />
      <rect x={0} y={0} width={(pct / 100) * width} height={height} fill={color} rx={0} />
    </svg>
  );
}

// -- SVG Pool Donut --

function PoolDonut({ pledged, excess, total }: { pledged: number; excess: number; total: number }) {
  if (total <= 0) return null;
  const size = 48;
  const cx = size / 2;
  const cy = size / 2;
  const r = 18;
  const circumference = 2 * Math.PI * r;
  const pledgedPct = Math.min(pledged / total, 1);
  const excessPct = Math.min(excess / total, 1 - pledgedPct);
  const pledgedLen = pledgedPct * circumference;
  const excessLen = excessPct * circumference;

  return (
    <svg width={size} height={size} className="inline-block">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#262626" strokeWidth={5} />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="#a78bfa"
        strokeWidth={5}
        strokeDasharray={`${pledgedLen} ${circumference - pledgedLen}`}
        strokeDashoffset={circumference * 0.25}
        strokeLinecap="butt"
      />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="#4ade80"
        strokeWidth={5}
        strokeDasharray={`${excessLen} ${circumference - excessLen}`}
        strokeDashoffset={circumference * 0.25 - pledgedLen}
        strokeLinecap="butt"
      />
    </svg>
  );
}

// -- SVG Margin Call Timeline --

function MarginCallTimeline({ calls }: { calls: MarginCall[] }) {
  if (calls.length === 0) return null;
  const barH = 12;
  const gap = 3;
  const labelW = 72;
  const chartW = 160;
  const totalH = calls.length * (barH + gap);
  const maxAmt = Math.max(...calls.map(c => Math.abs(c.amount ?? 0)), 1);

  return (
    <svg width={labelW + chartW + 4} height={totalH} className="block">
      {calls.map((call, i) => {
        const y = i * (barH + gap);
        const w = (Math.abs(call.amount ?? 0) / maxAmt) * chartW;
        const fill = call.direction === 'RECEIVED' || call.direction === 'IN' ? '#4ade80' : '#a78bfa';
        return (
          <g key={call.id ?? i}>
            <text x={0} y={y + barH - 2} fill="#737373" fontSize={7} fontFamily="monospace" textAnchor="start">
              {(call.counterparty ?? '-').slice(0, 12)}
            </text>
            <rect x={labelW} y={y} width={Math.max(w, 2)} height={barH} fill={fill} rx={0} />
            <text
              x={labelW + Math.max(w, 2) + 3}
              y={y + barH - 2}
              fill="#d4d4d4"
              fontSize={7}
              fontFamily="monospace"
            >
              {fmtAmt(call.amount)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// -- Main Panel --

export function CollateralManagementPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCollateralManagement();

  const poolSummary = data?.poolSummary as PoolSummary | undefined;
  const assetBreakdown = (data?.assetClassBreakdown ?? data?.assetBreakdown ?? []) as AssetClassBreakdown[];
  const counterpartyExposures = (data?.counterpartyExposures ?? data?.counterparties ?? []) as CounterpartyExposure[];
  const optimization = data?.optimizationMetrics as OptimizationMetrics | undefined;
  const marginCalls = (data?.marginCalls ?? data?.marginCallTimeline ?? []) as MarginCall[];
  const regulatoryImVm = (data?.regulatoryImVm ?? data?.regulatoryMetrics ?? []) as RegulatoryImVm[];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-violet-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3 h-3 text-violet-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-violet-400">
            {tr(t, 'panelCollateralManagement', 'Collateral Management')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-violet-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data ? (
          <div className="text-center py-8 text-violet-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        ) : !data && !isLoading ? (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        ) : data ? (
          <>
            {poolSummary && <PoolSummarySection summary={poolSummary} />}
            {assetBreakdown.length > 0 && <AssetClassBreakdownSection items={assetBreakdown} />}
            {counterpartyExposures.length > 0 && <CounterpartyExposureSection items={counterpartyExposures} />}
            {optimization && <OptimizationSection metrics={optimization} />}
            {marginCalls.length > 0 && <MarginCallSection calls={marginCalls} />}
            {regulatoryImVm.length > 0 && <RegulatorySection items={regulatoryImVm} />}
          </>
        ) : null}
      </div>
    </div>
  );
}

// -- Pool Summary Cards --

function PoolSummarySection({ summary }: { summary: PoolSummary }) {
  return (
    <div className="border-b border-border/20">
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-violet-400/10 bg-[#030303]">
        <Layers className="w-2.5 h-2.5 text-violet-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Collateral Pool Summary
        </span>
      </div>
      <div className="flex items-center gap-0">
        <div className="px-3 py-2 flex items-center justify-center shrink-0">
          <PoolDonut
            pledged={summary.totalPledged ?? 0}
            excess={summary.excessCollateral ?? 0}
            total={summary.totalPool ?? 1}
          />
        </div>
        <div className="flex-1 grid grid-cols-4 gap-0 divide-x divide-border/10">
          <div className="px-2.5 py-2 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Total Pool</div>
            <div className="text-[11px] font-mono font-black text-violet-400 tabular-nums">{fmtAmt(summary.totalPool)}</div>
          </div>
          <div className="px-2.5 py-2 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Pledged</div>
            <div className="text-[11px] font-mono font-black text-white/80 tabular-nums">{fmtAmt(summary.totalPledged)}</div>
          </div>
          <div className="px-2.5 py-2 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Excess</div>
            <div className={`text-[11px] font-mono font-black tabular-nums ${surplusColor(summary.excessCollateral)}`}>
              {fmtSigned(summary.excessCollateral)}
            </div>
          </div>
          <div className="px-2.5 py-2 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Haircut-Adj</div>
            <div className="text-[11px] font-mono font-black text-white/80 tabular-nums">{fmtAmt(summary.haircutAdjustedValue)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Asset Class Breakdown with Horizontal Bars --

function AssetClassBreakdownSection({ items }: { items: AssetClassBreakdown[] }) {
  const maxVal = Math.max(...items.map(i => i.value ?? 0), 1);

  return (
    <div className="border-b border-border/20">
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-violet-400/10 bg-[#030303]">
        <Layers className="w-2.5 h-2.5 text-violet-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Asset Class Breakdown
        </span>
      </div>

      <div className="grid grid-cols-[1fr_72px_48px_48px_64px] gap-0 px-2 py-0.5 border-b border-violet-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Asset Class</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Value</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Alloc %</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Haircut</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">Bar</span>
      </div>

      {items.map((item, i) => (
        <div
          key={item.assetClass ?? i}
          className="grid grid-cols-[1fr_72px_48px_48px_64px] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-violet-400 truncate">{item.assetClass ?? '-'}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right tabular-nums">{fmtAmt(item.value)}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">{fmtPct(item.allocation)}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">{fmtPct(item.haircut)}</span>
          <div className="flex justify-end pr-2">
            <HorizontalBar value={item.value ?? 0} max={maxVal} color={haircutBarColor(item.haircut ?? 0)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Counterparty Exposure Table --

function CounterpartyExposureSection({ items }: { items: CounterpartyExposure[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-violet-400/10 bg-[#030303]">
        <Users className="w-2.5 h-2.5 text-violet-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Counterparty Exposure
        </span>
      </div>

      <div className="grid grid-cols-[1fr_64px_64px_64px_56px] gap-0 px-2 py-0.5 border-b border-violet-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Name</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Pledged</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Received</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Net</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">MC Stat</span>
      </div>

      {items.map((item, i) => (
        <div
          key={item.name ?? i}
          className="grid grid-cols-[1fr_64px_64px_64px_56px] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-violet-400 truncate">{item.name ?? '-'}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right tabular-nums">{fmtAmt(item.pledged)}</span>
          <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">{fmtAmt(item.received)}</span>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${surplusColor(item.netExposure)}`}>
            {fmtSigned(item.netExposure)}
          </span>
          <div className="flex justify-end pr-2">
            {item.marginCallStatus ? (
              <span className={`inline-block px-1 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${marginCallStatusBadge(item.marginCallStatus)}`}>
                {item.marginCallStatus}
              </span>
            ) : (
              <span className="text-neutral-600 text-[7px]">-</span>
            )}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="px-2 py-3 text-center text-neutral-600 text-[8px] font-mono uppercase tracking-wider">
          No data
        </div>
      )}
    </div>
  );
}

// -- Optimization Metrics --

function OptimizationSection({ metrics }: { metrics: OptimizationMetrics }) {
  return (
    <div className="border-b border-border/20">
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-violet-400/10 bg-[#030303]">
        <Zap className="w-2.5 h-2.5 text-violet-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Optimization Metrics
        </span>
      </div>

      <div className="grid grid-cols-4 gap-0 divide-x divide-border/10">
        <div className="px-2.5 py-2 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">CTD Savings</div>
          <div className="text-[11px] font-mono font-black text-green-400 tabular-nums">{fmtAmt(metrics.ctdSavings)}</div>
        </div>
        <div className="px-2.5 py-2 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Substitutions</div>
          <div className="text-[11px] font-mono font-black text-white/80 tabular-nums">{metrics.substitutionCount ?? '-'}</div>
        </div>
        <div className="px-2.5 py-2 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Reuse Rate</div>
          <div className="text-[11px] font-mono font-black text-violet-400 tabular-nums">{fmtPct(metrics.reuseRate)}</div>
        </div>
        <div className="px-2.5 py-2 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Efficiency</div>
          <div className="text-[11px] font-mono font-black text-white/80 tabular-nums">{fmtPct(metrics.efficiencyScore)}</div>
        </div>
      </div>

      {/* Mini SVG bar comparing CTD savings */}
      <div className="px-3 py-1.5 border-t border-border/10">
        <svg width="100%" height={10} className="block">
          <rect x={0} y={0} width="100%" height={10} fill="#171717" rx={0} />
          <rect
            x={0}
            y={0}
            width={`${Math.min((metrics.efficiencyScore ?? 0), 100)}%`}
            height={10}
            fill="#a78bfa"
            rx={0}
            opacity={0.4}
          />
          <text
            x="50%"
            y={8}
            fill="#a3a3a3"
            fontSize={7}
            fontFamily="monospace"
            textAnchor="middle"
          >
            EFFICIENCY {fmtPct(metrics.efficiencyScore)}
          </text>
        </svg>
      </div>
    </div>
  );
}

// -- Margin Call Timeline / List --

function MarginCallSection({ calls }: { calls: MarginCall[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-violet-400/10 bg-[#030303]">
        <Clock className="w-2.5 h-2.5 text-violet-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Margin Calls
        </span>
        <span className="text-[7px] font-mono text-neutral-600 ml-auto">{calls.length} ACTIVE</span>
      </div>

      {/* SVG Timeline visualization */}
      <div className="px-3 py-2 border-b border-border/10">
        <MarginCallTimeline calls={calls} />
      </div>

      {/* Detailed list */}
      <div className="grid grid-cols-[1fr_56px_48px_56px_48px] gap-0 px-2 py-0.5 border-b border-violet-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Counterparty</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Amount</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Type</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Deadline</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">Status</span>
      </div>

      {calls.map((call, i) => (
        <div
          key={call.id ?? i}
          className="grid grid-cols-[1fr_56px_48px_56px_48px] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-violet-400 truncate">{call.counterparty ?? '-'}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right tabular-nums">{fmtAmt(call.amount)}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right truncate">{call.type ?? '-'}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right truncate">{call.deadline ?? '-'}</span>
          <div className="flex justify-end pr-2">
            <span className={`inline-block px-1 py-0.5 text-[7px] font-mono font-bold uppercase border ${marginCallStatusBadge(call.status)}`}>
              {call.status ?? '-'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Regulatory IM/VM Summary --

function RegulatorySection({ items }: { items: RegulatoryImVm[] }) {
  const imItems = items.filter(i => (i.category ?? '').toUpperCase() === 'IM' || (i.metric ?? '').toUpperCase().includes('IM'));
  const vmItems = items.filter(i => (i.category ?? '').toUpperCase() === 'VM' || (i.metric ?? '').toUpperCase().includes('VM'));
  const otherItems = items.filter(i => !imItems.includes(i) && !vmItems.includes(i));

  const renderGroup = (label: string, group: RegulatoryImVm[]) => {
    if (group.length === 0) return null;
    return (
      <div className="border-b border-border/10">
        <div className="px-3 py-0.5 bg-[#020202]">
          <span className="text-[7px] font-mono font-bold text-violet-400/60 uppercase tracking-widest">{label}</span>
        </div>
        {group.map((item, i) => (
          <div
            key={item.metric ?? i}
            className="grid grid-cols-[1fr_72px_72px_48px] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">{item.metric ?? '-'}</span>
            <span className="text-[8px] font-mono font-bold text-white text-right tabular-nums">{fmtAmt(item.value)}</span>
            <span className="text-[8px] font-mono text-neutral-500 text-right tabular-nums">{fmtAmt(item.requirement)}</span>
            <div className="flex justify-end pr-2">
              <span className={`text-[8px] font-mono font-bold ${complianceColor(item.compliant)}`}>
                {item.compliant ? 'PASS' : 'FAIL'}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // SVG summary bar
  const totalItems = items.length;
  const passCount = items.filter(i => i.compliant).length;
  const failCount = totalItems - passCount;

  return (
    <div className="border-b border-border/20">
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-violet-400/10 bg-[#030303]">
        <Scale className="w-2.5 h-2.5 text-violet-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Regulatory IM / VM Summary
        </span>
        <span className="text-[7px] font-mono ml-auto">
          <span className="text-green-400">{passCount} PASS</span>
          {failCount > 0 && <span className="text-red-400 ml-2">{failCount} FAIL</span>}
        </span>
      </div>

      {/* Compliance SVG bar */}
      {totalItems > 0 && (
        <div className="px-3 py-1.5 border-b border-border/10">
          <svg width="100%" height={8} className="block">
            <rect x={0} y={0} width="100%" height={8} fill="#171717" rx={0} />
            <rect
              x={0}
              y={0}
              width={`${(passCount / totalItems) * 100}%`}
              height={8}
              fill="#4ade80"
              rx={0}
              opacity={0.5}
            />
            {failCount > 0 && (
              <rect
                x={`${(passCount / totalItems) * 100}%`}
                y={0}
                width={`${(failCount / totalItems) * 100}%`}
                height={8}
                fill="#f43f5e"
                rx={0}
                opacity={0.5}
              />
            )}
          </svg>
        </div>
      )}

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_72px_48px] gap-0 px-2 py-0.5 border-b border-violet-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Metric</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Value</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Requirement</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">Status</span>
      </div>

      {imItems.length > 0 || vmItems.length > 0 ? (
        <>
          {renderGroup('Initial Margin (IM)', imItems)}
          {renderGroup('Variation Margin (VM)', vmItems)}
          {renderGroup('Other', otherItems)}
        </>
      ) : (
        items.map((item, i) => (
          <div
            key={item.metric ?? i}
            className="grid grid-cols-[1fr_72px_72px_48px] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">{item.metric ?? '-'}</span>
            <span className="text-[8px] font-mono font-bold text-white text-right tabular-nums">{fmtAmt(item.value)}</span>
            <span className="text-[8px] font-mono text-neutral-500 text-right tabular-nums">{fmtAmt(item.requirement)}</span>
            <div className="flex justify-end pr-2">
              <span className={`text-[8px] font-mono font-bold ${complianceColor(item.compliant)}`}>
                {item.compliant ? 'PASS' : 'FAIL'}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
