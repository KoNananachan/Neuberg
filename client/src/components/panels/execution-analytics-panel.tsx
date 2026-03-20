import { useState } from 'react';
import { useExecutionAnalytics } from '../../api/hooks/use-execution-analytics';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, Activity } from 'lucide-react';

// i18n helper with fallback
// ── Constants ──

const ACCENT = '#38bdf8'; // sky-400
const GREEN = '#22c55e';
const RED = '#ef4444';
const YELLOW = '#facc15';
const ORANGE = '#fb923c';
const DIM = 'rgba(255,255,255,0.3)';

type Tab = 'tca' | 'venues' | 'algos' | 'daily';

// ── Color helpers ──

function valColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return '#71717a';
}

function slippageColor(bps: number): string {
  const abs = Math.abs(bps);
  if (abs <= 0.5) return GREEN;
  if (abs <= 2) return YELLOW;
  if (abs <= 5) return ORANGE;
  return RED;
}

function scoreColor(score: number): string {
  if (score >= 90) return GREEN;
  if (score >= 75) return ACCENT;
  if (score >= 60) return YELLOW;
  if (score >= 40) return ORANGE;
  return RED;
}

function fmtBps(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtMs(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`;
  return `${n.toFixed(0)}ms`;
}

function fmtVol(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

// ── TCA Summary Tab ──

function TcaSummaryTab({ orders }: { orders: Array<{
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  avgFillPrice: number;
  arrivalPrice: number;
  slippageBps: number;
  algo: string;
  fillRate: number;
  executionTime: number;
  venue: string;
  timestamp: string;
}> }) {
  const t = useT();

  return (
    <div className="px-1 py-1">
      {/* Header */}
      <div className="grid grid-cols-[44px_32px_36px_44px_44px_44px_48px_36px_36px_44px] gap-0 px-1 py-1 border-b border-border/20">
        {[
          tr(t, 'eaSymbol', 'Symbol'),
          tr(t, 'eaSide', 'Side'),
          tr(t, 'eaQty', 'Qty'),
          tr(t, 'eaArrival', 'Arrival'),
          tr(t, 'eaFill', 'Fill Px'),
          tr(t, 'eaSlip', 'Slip bps'),
          tr(t, 'eaAlgo', 'Algo'),
          tr(t, 'eaFillR', 'Fill%'),
          tr(t, 'eaTime', 'Time'),
          tr(t, 'eaVenue', 'Venue'),
        ].map((h, i) => (
          <span key={i} className={`text-[6px] font-mono text-neutral-600 uppercase tracking-wider ${i >= 3 ? 'text-right' : ''}`}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {orders.map((order) => (
        <div
          key={order.orderId}
          className="grid grid-cols-[44px_32px_36px_44px_44px_44px_48px_36px_36px_44px] gap-0 px-1 py-[3px] hover:bg-sky-400/[0.02] border-b border-border/10 items-center"
        >
          <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">{order.symbol}</span>
          <span
            className="text-[7px] font-mono font-black uppercase"
            style={{ color: order.side === 'buy' ? ACCENT : RED }}
          >
            {order.side === 'buy' ? 'BUY' : 'SELL'}
          </span>
          <span className="text-[7px] font-mono tabular-nums text-neutral-400">{fmtVol(order.qty)}</span>
          <span className="text-[7px] font-mono tabular-nums text-right text-neutral-400">{order.arrivalPrice.toFixed(2)}</span>
          <span className="text-[7px] font-mono tabular-nums text-right font-bold text-neutral-200">{order.avgFillPrice.toFixed(2)}</span>
          <span
            className="text-[7px] font-mono font-bold tabular-nums text-right"
            style={{ color: slippageColor(order.slippageBps) }}
          >
            {fmtBps(order.slippageBps)}
          </span>
          <span className="text-[7px] font-mono text-right text-sky-400/70 truncate">{order.algo}</span>
          <span
            className="text-[7px] font-mono font-bold tabular-nums text-right"
            style={{ color: order.fillRate >= 99 ? GREEN : order.fillRate >= 90 ? YELLOW : RED }}
          >
            {fmtPct(order.fillRate)}
          </span>
          <span className="text-[7px] font-mono tabular-nums text-right text-neutral-500">{fmtMs(order.executionTime)}</span>
          <span className="text-[7px] font-mono text-right text-neutral-500 truncate">{order.venue}</span>
        </div>
      ))}

      {orders.length === 0 && (
        <div className="text-center py-4 text-[8px] font-mono text-neutral-600 uppercase">
          {tr(t, 'eaNoOrders', 'No recent orders')}
        </div>
      )}
    </div>
  );
}

// ── Venue Analysis Tab ──

function VenueAnalysisTab({ venues }: { venues: Array<{
  venue: string;
  fillPct: number;
  avgLatencyMs: number;
  priceImprovementBps: number;
  rejectRate: number;
  volume: number;
  score: number;
}> }) {
  const t = useT();

  return (
    <div className="px-1 py-1">
      {/* Header */}
      <div className="grid grid-cols-[1fr_44px_44px_52px_40px_48px_36px] gap-0 px-1 py-1 border-b border-border/20">
        {[
          tr(t, 'eaVenueName', 'Venue'),
          tr(t, 'eaFillPct', 'Fill%'),
          tr(t, 'eaLatency', 'Latency'),
          tr(t, 'eaPriceImp', 'Price Imp'),
          tr(t, 'eaReject', 'Reject'),
          tr(t, 'eaVolume', 'Volume'),
          tr(t, 'eaScore', 'Score'),
        ].map((h, i) => (
          <span key={i} className={`text-[6px] font-mono text-neutral-600 uppercase tracking-wider ${i > 0 ? 'text-right' : ''}`}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {venues.map((v) => (
        <div
          key={v.venue}
          className="grid grid-cols-[1fr_44px_44px_52px_40px_48px_36px] gap-0 px-1 py-[4px] hover:bg-sky-400/[0.02] border-b border-border/10 items-center"
        >
          <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">{v.venue}</span>
          <span
            className="text-[7px] font-mono font-bold tabular-nums text-right"
            style={{ color: v.fillPct >= 95 ? GREEN : v.fillPct >= 85 ? YELLOW : RED }}
          >
            {fmtPct(v.fillPct)}
          </span>
          <span
            className="text-[7px] font-mono tabular-nums text-right"
            style={{ color: v.avgLatencyMs <= 5 ? GREEN : v.avgLatencyMs <= 20 ? YELLOW : RED }}
          >
            {fmtMs(v.avgLatencyMs)}
          </span>
          <span
            className="text-[7px] font-mono font-bold tabular-nums text-right"
            style={{ color: valColor(v.priceImprovementBps) }}
          >
            {fmtBps(v.priceImprovementBps)} bps
          </span>
          <span
            className="text-[7px] font-mono tabular-nums text-right"
            style={{ color: v.rejectRate <= 1 ? GREEN : v.rejectRate <= 5 ? YELLOW : RED }}
          >
            {fmtPct(v.rejectRate)}
          </span>
          <span className="text-[7px] font-mono tabular-nums text-right text-neutral-400">{fmtVol(v.volume)}</span>
          <div className="flex items-center justify-end gap-1">
            <span
              className="text-[8px] font-mono font-black tabular-nums"
              style={{ color: scoreColor(v.score) }}
            >
              {v.score}
            </span>
          </div>
        </div>
      ))}

      {/* Score bar visualization */}
      {venues.length > 0 && (
        <div className="px-2 py-2 border-t border-border/20">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'eaVenueScores', 'Venue Scores')}
          </span>
          <div className="mt-1 flex flex-col gap-1">
            {venues.map((v) => (
              <div key={v.venue} className="flex items-center gap-2">
                <span className="text-[7px] font-mono text-neutral-400 w-[60px] truncate">{v.venue}</span>
                <div className="flex-1 h-[5px] bg-white/[0.03] relative">
                  <div
                    className="absolute left-0 top-0 h-full transition-all"
                    style={{ width: `${v.score}%`, backgroundColor: scoreColor(v.score), opacity: 0.6 }}
                  />
                </div>
                <span className="text-[7px] font-mono font-bold w-[20px] text-right" style={{ color: scoreColor(v.score) }}>
                  {v.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Algo Performance Tab ──

function AlgoPerformanceTab({ algos }: { algos: Array<{
  algo: string;
  orderCount: number;
  avgSlippageBps: number;
  hitRate: number;
  avgFillTime: number;
  avgFillRate: number;
  bestUseCase: string;
  participationRate: number;
}> }) {
  const t = useT();

  return (
    <div className="px-1 py-1">
      {/* Header */}
      <div className="grid grid-cols-[1fr_36px_48px_40px_40px_40px_40px_72px] gap-0 px-1 py-1 border-b border-border/20">
        {[
          tr(t, 'eaAlgoName', 'Algorithm'),
          tr(t, 'eaOrders', '#Ord'),
          tr(t, 'eaAvgSlip', 'Avg Slip'),
          tr(t, 'eaHitRate', 'Hit%'),
          tr(t, 'eaFillTm', 'Fill Tm'),
          tr(t, 'eaFillRt', 'Fill%'),
          tr(t, 'eaPartic', 'Part%'),
          tr(t, 'eaBestUse', 'Best Use'),
        ].map((h, i) => (
          <span key={i} className={`text-[6px] font-mono text-neutral-600 uppercase tracking-wider ${i > 0 ? 'text-right' : ''} ${i === 7 ? 'text-center' : ''}`}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {algos.map((a) => (
        <div
          key={a.algo}
          className="grid grid-cols-[1fr_36px_48px_40px_40px_40px_40px_72px] gap-0 px-1 py-[4px] hover:bg-sky-400/[0.02] border-b border-border/10 items-center"
        >
          <span className="text-[8px] font-mono font-bold text-sky-400/80 truncate">{a.algo}</span>
          <span className="text-[7px] font-mono tabular-nums text-right text-neutral-400">{a.orderCount}</span>
          <span
            className="text-[7px] font-mono font-bold tabular-nums text-right"
            style={{ color: slippageColor(a.avgSlippageBps) }}
          >
            {fmtBps(a.avgSlippageBps)} bps
          </span>
          <span
            className="text-[7px] font-mono font-bold tabular-nums text-right"
            style={{ color: a.hitRate >= 80 ? GREEN : a.hitRate >= 60 ? YELLOW : RED }}
          >
            {fmtPct(a.hitRate)}
          </span>
          <span className="text-[7px] font-mono tabular-nums text-right text-neutral-500">{fmtMs(a.avgFillTime)}</span>
          <span
            className="text-[7px] font-mono font-bold tabular-nums text-right"
            style={{ color: a.avgFillRate >= 98 ? GREEN : a.avgFillRate >= 90 ? YELLOW : RED }}
          >
            {fmtPct(a.avgFillRate)}
          </span>
          <span className="text-[7px] font-mono tabular-nums text-right text-neutral-500">{fmtPct(a.participationRate)}</span>
          <span className="text-[6px] font-mono text-center text-neutral-500 truncate">{a.bestUseCase}</span>
        </div>
      ))}

      {/* Algo comparison mini chart */}
      {algos.length > 0 && (
        <div className="px-2 py-2 border-t border-border/20">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'eaSlipComparison', 'Avg Slippage Comparison (bps)')}
          </span>
          <AlgoSlippageChart algos={algos} />
        </div>
      )}
    </div>
  );
}

function AlgoSlippageChart({ algos }: { algos: Array<{ algo: string; avgSlippageBps: number }> }) {
  const W = 340;
  const H = algos.length * 16 + 8;
  const BAR_X = 80;
  const BAR_W = W - 100;
  const BAR_H = 8;
  const GAP = 16;

  const maxAbsSlip = Math.max(...algos.map(a => Math.abs(a.avgSlippageBps)), 1);

  return (
    <div className="mt-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
        {/* Zero line */}
        <line
          x1={BAR_X + BAR_W / 2}
          y1={0}
          x2={BAR_X + BAR_W / 2}
          y2={H}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.5}
        />

        {algos.map((a, i) => {
          const y = 4 + i * GAP;
          const center = BAR_X + BAR_W / 2;
          const barLen = (Math.abs(a.avgSlippageBps) / maxAbsSlip) * (BAR_W / 2);
          const isNeg = a.avgSlippageBps < 0;
          const barX = isNeg ? center - barLen : center;
          const color = slippageColor(a.avgSlippageBps);

          return (
            <g key={a.algo}>
              <text
                x={BAR_X - 4}
                y={y + BAR_H / 2 + 1.5}
                textAnchor="end"
                fill="rgba(255,255,255,0.45)"
                fontSize={6}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {a.algo}
              </text>
              <rect x={BAR_X} y={y} width={BAR_W} height={BAR_H} fill="rgba(255,255,255,0.02)" />
              <rect x={barX} y={y} width={Math.max(barLen, 0.5)} height={BAR_H} fill={color} opacity={0.6} />
              <text
                x={isNeg ? barX - 3 : barX + barLen + 3}
                y={y + BAR_H / 2 + 1.5}
                textAnchor={isNeg ? 'end' : 'start'}
                fill={color}
                fontSize={5.5}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {fmtBps(a.avgSlippageBps)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Daily Stats Tab ──

function DailyStatsTab({ daily }: { daily: {
  totalOrders: number;
  totalVolume: number;
  avgSlippageBps: number;
  avgFillRate: number;
  avgLatencyMs: number;
  priceImprovementBps: number;
  vwapSlippageBps: number;
  implementationShortfallBps: number;
  participationRate: number;
  revertRate: number;
  marketImpactBps: number;
  timingCostBps: number;
  costBreakdown: Array<{ label: string; bps: number }>;
} }) {
  const t = useT();

  const primaryStats = [
    { label: tr(t, 'eaTotalOrd', 'Total Orders'), value: String(daily.totalOrders), color: ACCENT },
    { label: tr(t, 'eaTotalVol', 'Total Volume'), value: fmtVol(daily.totalVolume), color: ACCENT },
    { label: tr(t, 'eaAvgSlippage', 'Avg Slippage'), value: `${fmtBps(daily.avgSlippageBps)} bps`, color: slippageColor(daily.avgSlippageBps) },
    { label: tr(t, 'eaAvgFillRate', 'Avg Fill Rate'), value: fmtPct(daily.avgFillRate), color: daily.avgFillRate >= 95 ? GREEN : YELLOW },
    { label: tr(t, 'eaAvgLatency', 'Avg Latency'), value: fmtMs(daily.avgLatencyMs), color: daily.avgLatencyMs <= 10 ? GREEN : YELLOW },
    { label: tr(t, 'eaPriceImp', 'Price Imp'), value: `${fmtBps(daily.priceImprovementBps)} bps`, color: valColor(daily.priceImprovementBps) },
  ];

  const advancedStats = [
    { label: tr(t, 'eaVwapSlip', 'VWAP Slippage'), value: `${fmtBps(daily.vwapSlippageBps)} bps`, color: slippageColor(daily.vwapSlippageBps) },
    { label: tr(t, 'eaIS', 'Impl Shortfall'), value: `${fmtBps(daily.implementationShortfallBps)} bps`, color: slippageColor(daily.implementationShortfallBps) },
    { label: tr(t, 'eaParticRate', 'Participation'), value: fmtPct(daily.participationRate), color: DIM },
    { label: tr(t, 'eaRevertRate', 'Revert Rate'), value: fmtPct(daily.revertRate), color: daily.revertRate <= 10 ? GREEN : YELLOW },
    { label: tr(t, 'eaMktImpact', 'Market Impact'), value: `${fmtBps(daily.marketImpactBps)} bps`, color: slippageColor(daily.marketImpactBps) },
    { label: tr(t, 'eaTimingCost', 'Timing Cost'), value: `${fmtBps(daily.timingCostBps)} bps`, color: slippageColor(daily.timingCostBps) },
  ];

  return (
    <div className="flex flex-col">
      {/* Primary stats grid */}
      <div className="grid grid-cols-3 gap-px bg-border/10 border-b border-border/20">
        {primaryStats.map(({ label, value, color }) => (
          <div key={label} className="bg-[#050505] px-2 py-2 flex flex-col items-center">
            <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">{label}</span>
            <span className="text-[10px] font-mono font-black tabular-nums" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Advanced metrics */}
      <div className="px-2 py-1.5 border-b border-border/20">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'eaAdvMetrics', 'Advanced Metrics')}
        </span>
        <div className="grid grid-cols-3 gap-px mt-1 bg-border/10">
          {advancedStats.map(({ label, value, color }) => (
            <div key={label} className="bg-[#050505] px-2 py-1.5 flex flex-col items-center">
              <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">{label}</span>
              <span className="text-[9px] font-mono font-bold tabular-nums" style={{ color }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cost breakdown */}
      {daily.costBreakdown.length > 0 && (
        <div className="px-2 py-1.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'eaCostBreakdown', 'Execution Cost Breakdown (bps)')}
          </span>
          <CostBreakdownChart items={daily.costBreakdown} />
        </div>
      )}
    </div>
  );
}

function CostBreakdownChart({ items }: { items: Array<{ label: string; bps: number }> }) {
  const W = 340;
  const H = items.length * 16 + 4;
  const BAR_X = 90;
  const BAR_W = W - 110;
  const BAR_H = 8;
  const GAP = 16;

  const maxBps = Math.max(...items.map(i => Math.abs(i.bps)), 0.1);

  return (
    <div className="mt-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
        {items.map((item, i) => {
          const y = 2 + i * GAP;
          const barLen = (Math.abs(item.bps) / maxBps) * BAR_W;
          const color = item.bps > 0 ? RED : GREEN;

          return (
            <g key={item.label}>
              <text
                x={BAR_X - 4}
                y={y + BAR_H / 2 + 1.5}
                textAnchor="end"
                fill="rgba(255,255,255,0.4)"
                fontSize={6}
                fontFamily="monospace"
              >
                {item.label}
              </text>
              <rect x={BAR_X} y={y} width={BAR_W} height={BAR_H} fill="rgba(255,255,255,0.02)" />
              <rect x={BAR_X} y={y} width={Math.max(barLen, 0.5)} height={BAR_H} fill={color} opacity={0.5} />
              <text
                x={BAR_X + barLen + 4}
                y={y + BAR_H / 2 + 1.5}
                textAnchor="start"
                fill={color}
                fontSize={6}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {fmtBps(item.bps)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Main Panel ──

export function ExecutionAnalyticsPanel() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('tca');
  const { data, isLoading, error, refetch } = useExecutionAnalytics();

  const tabs: { key: Tab; label: string }[] = [
    { key: 'tca', label: tr(t, 'eaTca', 'TCA') },
    { key: 'venues', label: tr(t, 'eaVenues', 'VENUES') },
    { key: 'algos', label: tr(t, 'eaAlgos', 'ALGOS') },
    { key: 'daily', label: tr(t, 'eaDaily', 'DAILY') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'eaTitle', 'Execution Analytics')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[6px] font-mono text-neutral-600">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-sky-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-1 text-[7px] font-mono font-black uppercase tracking-wider transition-colors ${
              tab === key
                ? 'text-sky-400 border-b border-sky-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar text-[9px] font-mono">
        {/* Loading state */}
        {isLoading && !data && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-sky-400/30 border-t-sky-400 animate-spin" />
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !data && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2 px-4">
              <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider">
                {tr(t, 'eaError', 'Error loading data')}
              </span>
              <span className="text-[8px] font-mono text-neutral-600 text-center">
                {error instanceof Error ? error.message : String(error)}
              </span>
              <button
                onClick={() => refetch()}
                className="mt-1 px-2 py-0.5 text-[8px] font-mono font-bold text-sky-400 border border-sky-400/30 hover:bg-sky-400/[0.05] transition-colors"
              >
                {tr(t, 'eaRetry', 'RETRY')}
              </button>
            </div>
          </div>
        )}

        {/* No data state */}
        {!data && !isLoading && !error && (
          <div className="flex items-center justify-center h-full text-[10px] font-mono text-neutral-500 uppercase">
            {tr(t, 'eaNoData', 'No data available')}
          </div>
        )}

        {/* Data */}
        {data && (
          <>
            {tab === 'tca' && <TcaSummaryTab orders={data.orders} />}
            {tab === 'venues' && <VenueAnalysisTab venues={data.venues} />}
            {tab === 'algos' && <AlgoPerformanceTab algos={data.algos} />}
            {tab === 'daily' && <DailyStatsTab daily={data.daily} />}
          </>
        )}
      </div>
    </div>
  );
}
