import { useState, useMemo } from 'react';
import {
  useTradeBlotter,
  type Trade,
  type TradeBlotterResponse,
  type ExecutionSummary,
} from '../../api/hooks/use-trade-blotter';
import { useT } from '../../i18n';
import { ListOrdered, RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Constants ──

const ACCENT = '#06b6d4'; // cyan-400
const GREEN = '#22c55e';
const RED = '#ef4444';
const YELLOW = '#facc15';
const ORANGE = '#fb923c';
const CYAN = '#06b6d4';
const CYAN_DIM = 'rgba(6,182,212,0.15)';

type View = 'blotter' | 'analysis' | 'tca';
type StatusFilter = 'ALL' | 'FILLED' | 'WORKING' | 'PARTIAL';
type SortKey =
  | 'executionTime'
  | 'symbol'
  | 'side'
  | 'quantity'
  | 'avgPrice'
  | 'vwap'
  | 'slippageBps'
  | 'implementationShortfall'
  | 'marketImpact'
  | 'participationRate'
  | 'algo'
  | 'venue'
  | 'qualityScore'
  | 'status';

// ── Color Helpers ──

function slippageColor(bps: number): string {
  const abs = Math.abs(bps);
  if (abs <= 0.5) return GREEN;
  if (abs <= 1.5) return YELLOW;
  if (abs <= 3) return ORANGE;
  return RED;
}

function qualityColor(score: number): string {
  if (score >= 85) return GREEN;
  if (score >= 70) return CYAN;
  if (score >= 50) return YELLOW;
  if (score >= 30) return ORANGE;
  return RED;
}

function sideColor(side: string): string {
  return side === 'BUY' ? GREEN : RED;
}

function statusColor(status: string): string {
  switch (status) {
    case 'FILLED': return GREEN;
    case 'PARTIAL': return YELLOW;
    case 'WORKING': return CYAN;
    default: return 'rgba(255,255,255,0.3)';
  }
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m${s > 0 ? `${s}s` : ''}`;
  const h = Math.floor(m / 60);
  return `${h}h${m % 60}m`;
}

function fmtQty(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtBps(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

// ── Main Panel ──

export function TradeBlotterPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useTradeBlotter();
  const [view, setView] = useState<View>('blotter');

  const views: { key: View; label: string }[] = [
    { key: 'blotter', label: tr(t, 'tbBlotter', 'BLOTTER') },
    { key: 'analysis', label: tr(t, 'tbAnalysis', 'ANALYSIS') },
    { key: 'tca', label: tr(t, 'tbTca', 'TCA') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'tbTitle', 'Trade Blotter')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <>
              <span
                className="text-[6px] font-mono font-bold px-1 py-0.5"
                style={{ color: slippageColor(data.summary.avgSlippageBps), backgroundColor: 'rgba(255,255,255,0.03)' }}
              >
                AVG SLIP {fmtBps(data.summary.avgSlippageBps)} BPS
              </span>
              <span
                className="text-[6px] font-mono font-bold px-1 py-0.5"
                style={{ color: qualityColor(data.summary.avgQualityScore), backgroundColor: 'rgba(255,255,255,0.03)' }}
              >
                QUAL {data.summary.avgQualityScore}
              </span>
            </>
          )}
          <button
            onClick={() => refetch()}
            className="p-0.5 text-white/30 hover:text-cyan-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-white/[0.06] shrink-0">
        {views.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex-1 py-1 text-[7px] font-mono font-black uppercase tracking-wider transition-colors ${
              view === key
                ? 'text-cyan-400 border-b border-cyan-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div
            className="text-center py-8 text-[9px] font-mono uppercase animate-pulse"
            style={{ color: ACCENT }}
          >
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'tbNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {view === 'blotter' && <BlotterView data={data} />}
            {view === 'analysis' && <AnalysisView summary={data.summary} trades={data.trades} />}
            {view === 'tca' && <TCAView trades={data.trades} summary={data.summary} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── BLOTTER VIEW ──

function BlotterView({ data }: { data: TradeBlotterResponse }) {
  const t = useT();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [algoFilter, setAlgoFilter] = useState<string>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('executionTime');
  const [sortAsc, setSortAsc] = useState(false);

  const algos = useMemo(() => {
    const set = new Set(data.trades.map((t) => t.algo));
    return ['ALL', ...Array.from(set).sort()];
  }, [data.trades]);

  const filtered = useMemo(() => {
    let trades = data.trades;
    if (statusFilter !== 'ALL') {
      trades = trades.filter((t) => t.status === statusFilter);
    }
    if (algoFilter !== 'ALL') {
      trades = trades.filter((t) => t.algo === algoFilter);
    }
    return trades;
  }, [data.trades, statusFilter, algoFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      const key = sortKey;
      const av = a[key];
      const bv = b[key];
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else if (typeof av === 'string' && typeof bv === 'string') {
        cmp = av.localeCompare(bv);
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const statusFilters: StatusFilter[] = ['ALL', 'FILLED', 'WORKING', 'PARTIAL'];

  const columns: { key: SortKey; label: string; width: string; align?: string }[] = [
    { key: 'executionTime', label: 'TIME', width: 'w-[52px]' },
    { key: 'symbol', label: 'SYM', width: 'w-[36px]' },
    { key: 'side', label: 'SIDE', width: 'w-[24px]' },
    { key: 'quantity', label: 'QTY', width: 'w-[36px]', align: 'text-right' },
    { key: 'avgPrice', label: 'AVG PX', width: 'w-[46px]', align: 'text-right' },
    { key: 'vwap', label: 'VWAP', width: 'w-[46px]', align: 'text-right' },
    { key: 'slippageBps', label: 'SLIP', width: 'w-[30px]', align: 'text-right' },
    { key: 'implementationShortfall', label: 'IS', width: 'w-[26px]', align: 'text-right' },
    { key: 'marketImpact', label: 'IMPACT', width: 'w-[30px]', align: 'text-right' },
    { key: 'participationRate', label: 'PART%', width: 'w-[28px]', align: 'text-right' },
    { key: 'algo', label: 'ALGO', width: 'w-[32px]' },
    { key: 'venue', label: 'VENUE', width: 'w-[36px]' },
    { key: 'qualityScore', label: 'QUAL', width: 'w-[40px]' },
    { key: 'status', label: 'STATUS', width: 'w-[36px]' },
  ];

  return (
    <div className="text-[9px] font-mono">
      {/* Filters */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-white/[0.04]">
        <div className="flex items-center gap-1">
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-1.5 py-0.5 text-[6px] font-bold uppercase transition-colors ${
                statusFilter === s
                  ? 'text-cyan-400 bg-cyan-400/[0.08]'
                  : 'text-white/25 hover:text-white/40'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="w-px h-3 bg-white/[0.06]" />
        <div className="flex items-center gap-1">
          {algos.map((a) => (
            <button
              key={a}
              onClick={() => setAlgoFilter(a)}
              className={`px-1 py-0.5 text-[6px] font-bold uppercase transition-colors ${
                algoFilter === a
                  ? 'text-cyan-400 bg-cyan-400/[0.08]'
                  : 'text-white/20 hover:text-white/35'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[6px] text-white/15">{sorted.length} {tr(t, 'tbTrades', 'trades')}</span>
      </div>

      {/* Table header */}
      <div className="flex items-center py-0.5 px-1 border-b border-white/[0.06] text-[5px] text-white/20 uppercase gap-0.5">
        {columns.map((col) => (
          <button
            key={col.key}
            onClick={() => handleSort(col.key)}
            className={`${col.width} shrink-0 ${col.align || ''} hover:text-white/40 transition-colors ${
              sortKey === col.key ? 'text-cyan-400/60' : ''
            }`}
          >
            {col.label}
            {sortKey === col.key && (sortAsc ? ' ^' : ' v')}
          </button>
        ))}
      </div>

      {/* Table rows */}
      {sorted.map((trade) => (
        <div
          key={trade.id}
          className="flex items-center py-0.5 px-1 border-b border-white/[0.02] gap-0.5 hover:bg-cyan-400/[0.02] transition-colors"
        >
          {/* Time */}
          <span className="w-[52px] shrink-0 text-white/30 text-[7px]">{fmtTime(trade.executionTime)}</span>

          {/* Symbol */}
          <span className="w-[36px] shrink-0 font-bold text-white/70">{trade.symbol}</span>

          {/* Side */}
          <span className="w-[24px] shrink-0 font-bold text-[7px]" style={{ color: sideColor(trade.side) }}>
            {trade.side}
          </span>

          {/* Qty */}
          <span className="w-[36px] shrink-0 text-right text-white/50">{fmtQty(trade.quantity)}</span>

          {/* Avg Price */}
          <span className="w-[46px] shrink-0 text-right text-white/60">{trade.avgPrice.toFixed(2)}</span>

          {/* VWAP */}
          <span className="w-[46px] shrink-0 text-right text-white/40">{trade.vwap.toFixed(2)}</span>

          {/* Slippage */}
          <span
            className="w-[30px] shrink-0 text-right font-bold text-[7px]"
            style={{ color: slippageColor(trade.slippageBps) }}
          >
            {fmtBps(trade.slippageBps)}
          </span>

          {/* IS */}
          <span
            className="w-[26px] shrink-0 text-right text-[7px]"
            style={{ color: slippageColor(trade.implementationShortfall) }}
          >
            {trade.implementationShortfall.toFixed(1)}
          </span>

          {/* Market Impact */}
          <span className="w-[30px] shrink-0 text-right text-white/35 text-[7px]">
            {trade.marketImpact.toFixed(1)}
          </span>

          {/* Participation Rate */}
          <span className="w-[28px] shrink-0 text-right text-white/35 text-[7px]">
            {trade.participationRate.toFixed(1)}%
          </span>

          {/* Algo */}
          <span className="w-[32px] shrink-0 text-white/40 text-[7px]">{trade.algo}</span>

          {/* Venue */}
          <span className="w-[36px] shrink-0 text-white/30 text-[7px]">{trade.venue}</span>

          {/* Quality bar */}
          <div className="w-[40px] shrink-0 flex items-center gap-0.5">
            <div className="flex-1 h-[4px] bg-white/[0.03] relative">
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${trade.qualityScore}%`,
                  backgroundColor: qualityColor(trade.qualityScore),
                  opacity: 0.6,
                }}
              />
            </div>
            <span className="text-[6px]" style={{ color: qualityColor(trade.qualityScore) }}>
              {trade.qualityScore}
            </span>
          </div>

          {/* Status */}
          <span
            className="w-[36px] shrink-0 text-[6px] font-bold"
            style={{ color: statusColor(trade.status) }}
          >
            {trade.status}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── ANALYSIS VIEW ──

function AnalysisView({ summary, trades }: { summary: ExecutionSummary; trades: Trade[] }) {
  const t = useT();

  return (
    <div className="text-[9px] font-mono">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-px bg-white/[0.02] border-b border-white/[0.06]">
        <StatCell
          label={tr(t, 'tbTotalTrades', 'Total Trades')}
          value={String(summary.totalTrades)}
          color="rgba(255,255,255,0.6)"
        />
        <StatCell
          label={tr(t, 'tbTotalVol', 'Total Volume')}
          value={fmtQty(summary.totalVolume)}
          color="rgba(255,255,255,0.6)"
        />
        <StatCell
          label={tr(t, 'tbAvgSlip', 'Avg Slippage')}
          value={`${fmtBps(summary.avgSlippageBps)} bps`}
          color={slippageColor(summary.avgSlippageBps)}
        />
        <StatCell
          label={tr(t, 'tbAvgQual', 'Avg Quality')}
          value={String(summary.avgQualityScore)}
          color={qualityColor(summary.avgQualityScore)}
        />
      </div>

      {/* Best / Worst */}
      <div className="flex border-b border-white/[0.06]">
        <div className="flex-1 px-2 py-1.5 border-r border-white/[0.04]">
          <div className="text-[5px] text-white/20 uppercase tracking-wider mb-0.5">
            {tr(t, 'tbBestExec', 'Best Execution')}
          </div>
          <span className="text-[8px] font-bold" style={{ color: GREEN }}>
            {summary.bestExecution.symbol}
          </span>
          <span className="text-[7px] text-white/30 ml-1">
            {fmtBps(summary.bestExecution.slippageBps)} bps
          </span>
        </div>
        <div className="flex-1 px-2 py-1.5">
          <div className="text-[5px] text-white/20 uppercase tracking-wider mb-0.5">
            {tr(t, 'tbWorstExec', 'Worst Execution')}
          </div>
          <span className="text-[8px] font-bold" style={{ color: RED }}>
            {summary.worstExecution.symbol}
          </span>
          <span className="text-[7px] text-white/30 ml-1">
            {fmtBps(summary.worstExecution.slippageBps)} bps
          </span>
        </div>
      </div>

      {/* Algo Breakdown */}
      <div className="border-b border-white/[0.06]">
        <div className="px-2 pt-1.5 pb-0.5">
          <span className="text-[6px] text-white/25 uppercase tracking-wider">
            {tr(t, 'tbAlgoBreak', 'Algo Breakdown')}
          </span>
        </div>
        <BreakdownBars
          items={summary.algoBreakdown.map((a) => ({ label: a.algo, count: a.count, avgSlippage: a.avgSlippage }))}
          total={summary.totalTrades}
        />
      </div>

      {/* Venue Breakdown */}
      <div className="border-b border-white/[0.06]">
        <div className="px-2 pt-1.5 pb-0.5">
          <span className="text-[6px] text-white/25 uppercase tracking-wider">
            {tr(t, 'tbVenueBreak', 'Venue Breakdown')}
          </span>
        </div>
        <BreakdownBars
          items={summary.venueBreakdown.map((v) => ({ label: v.venue, count: v.count, avgSlippage: v.avgSlippage }))}
          total={summary.totalTrades}
        />
      </div>

      {/* Slippage Distribution Histogram */}
      <div className="border-b border-white/[0.06]">
        <div className="px-2 pt-1.5 pb-0.5">
          <span className="text-[6px] text-white/25 uppercase tracking-wider">
            {tr(t, 'tbSlipDist', 'Slippage Distribution (bps)')}
          </span>
        </div>
        <SlippageHistogram distribution={summary.slippageDistribution} />
      </div>
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-2 py-1.5 bg-black">
      <div className="text-[5px] text-white/20 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-[10px] font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function BreakdownBars({
  items,
  total,
}: {
  items: { label: string; count: number; avgSlippage: number }[];
  total: number;
}) {
  const W = 320;
  const H = items.length * 16 + 4;
  const BAR_X = 52;
  const BAR_W = W - 100;
  const BAR_H = 8;
  const GAP = 16;
  const START_Y = 4;

  return (
    <div className="px-2 py-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
        {items.map((item, i) => {
          const y = START_Y + i * GAP;
          const pct = total > 0 ? item.count / total : 0;
          const fillW = pct * BAR_W;
          const color = slippageColor(item.avgSlippage);

          return (
            <g key={item.label}>
              <text
                x={BAR_X - 4}
                y={y + BAR_H / 2 + 1.5}
                textAnchor="end"
                fill="rgba(255,255,255,0.4)"
                fontSize={6}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {item.label}
              </text>
              <rect x={BAR_X} y={y} width={BAR_W} height={BAR_H} fill="rgba(255,255,255,0.02)" />
              <rect x={BAR_X} y={y} width={fillW} height={BAR_H} fill={CYAN} fillOpacity={0.4} />
              <text
                x={BAR_X + BAR_W + 4}
                y={y + BAR_H / 2 + 1.5}
                textAnchor="start"
                fill={color}
                fontSize={6}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {item.avgSlippage.toFixed(1)} bps
              </text>
              <text
                x={BAR_X + fillW + 3}
                y={y + BAR_H / 2 + 1}
                textAnchor="start"
                fill="rgba(255,255,255,0.2)"
                fontSize={5}
                fontFamily="monospace"
              >
                {item.count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SlippageHistogram({ distribution }: { distribution: number[] }) {
  const W = 320;
  const H = 70;
  const PAD_L = 20;
  const PAD_R = 10;
  const PAD_T = 6;
  const PAD_B = 16;
  const CHART_W = W - PAD_L - PAD_R;
  const CHART_H = H - PAD_T - PAD_B;
  const BUCKETS = distribution.length;
  const maxVal = Math.max(...distribution, 1);

  const barW = CHART_W / BUCKETS;
  const labels = ['-5', '-4', '-3', '-2', '-1', '0', '+1', '+2', '+3', '+4', '+5'];

  return (
    <div className="px-2 py-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1.0].map((pct) => {
          const y = PAD_T + CHART_H - pct * CHART_H;
          return (
            <line
              key={pct}
              x1={PAD_L}
              y1={y}
              x2={PAD_L + CHART_W}
              y2={y}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Zero line (center) */}
        <line
          x1={PAD_L + CHART_W / 2}
          y1={PAD_T}
          x2={PAD_L + CHART_W / 2}
          y2={PAD_T + CHART_H}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.5}
          strokeDasharray="2,2"
        />

        {/* Bars */}
        {distribution.map((count, i) => {
          const x = PAD_L + i * barW;
          const barH = (count / maxVal) * CHART_H;
          const y = PAD_T + CHART_H - barH;
          const isCenter = i >= 4 && i <= 5;
          const color = isCenter ? CYAN : i < 4 ? GREEN : ORANGE;

          return (
            <rect
              key={i}
              x={x + barW * 0.1}
              y={y}
              width={barW * 0.8}
              height={barH}
              fill={color}
              fillOpacity={0.5}
            />
          );
        })}

        {/* X-axis labels */}
        {labels.map((label, i) => (
          <text
            key={i}
            x={PAD_L + (i / BUCKETS) * CHART_W}
            y={H - 3}
            textAnchor="middle"
            fill="rgba(255,255,255,0.15)"
            fontSize={4.5}
            fontFamily="monospace"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ── TCA VIEW ──

function TCAView({ trades, summary }: { trades: Trade[]; summary: ExecutionSummary }) {
  const t = useT();

  const filledTrades = useMemo(() => trades.filter((t) => t.status === 'FILLED'), [trades]);

  // Summary stats
  const totalIS = useMemo(() => {
    if (filledTrades.length === 0) return 0;
    return filledTrades.reduce((s, t) => s + t.implementationShortfall, 0) / filledTrades.length;
  }, [filledTrades]);

  const avgImpact = useMemo(() => {
    if (filledTrades.length === 0) return 0;
    return filledTrades.reduce((s, t) => s + t.marketImpact, 0) / filledTrades.length;
  }, [filledTrades]);

  const avgTimingCost = useMemo(() => {
    if (filledTrades.length === 0) return 0;
    return filledTrades.reduce((s, t) => s + Math.max(0, t.implementationShortfall - t.marketImpact), 0) / filledTrades.length;
  }, [filledTrades]);

  return (
    <div className="text-[9px] font-mono">
      {/* TCA Summary */}
      <div className="grid grid-cols-3 gap-px bg-white/[0.02] border-b border-white/[0.06]">
        <StatCell
          label={tr(t, 'tbTotalIS', 'Avg Impl Shortfall')}
          value={`${totalIS.toFixed(2)} bps`}
          color={slippageColor(totalIS)}
        />
        <StatCell
          label={tr(t, 'tbAvgImpact', 'Avg Market Impact')}
          value={`${avgImpact.toFixed(2)} bps`}
          color={ORANGE}
        />
        <StatCell
          label={tr(t, 'tbAvgTiming', 'Avg Timing Cost')}
          value={`${avgTimingCost.toFixed(2)} bps`}
          color={YELLOW}
        />
      </div>

      {/* Per-trade TCA */}
      <div className="px-1">
        {/* Header */}
        <div className="flex items-center py-0.5 px-1 border-b border-white/[0.06] text-[5px] text-white/20 uppercase gap-1">
          <span className="w-[36px] shrink-0">SYM</span>
          <span className="w-[24px] shrink-0">SIDE</span>
          <span className="w-[46px] text-right shrink-0">ARRIVAL</span>
          <span className="w-[46px] text-right shrink-0">AVG PX</span>
          <span className="w-[46px] text-right shrink-0">VWAP</span>
          <span className="w-[46px] text-right shrink-0">CLOSE</span>
          <span className="flex-1 text-center">COST DECOMPOSITION</span>
        </div>

        {filledTrades.map((trade) => {
          const timingCost = Math.max(0, trade.implementationShortfall - trade.marketImpact);
          // Estimate spread cost as a small fraction
          const spreadCost = Math.max(0, timingCost * 0.3);
          const adjustedTiming = timingCost - spreadCost;
          const totalCost = trade.marketImpact + adjustedTiming + spreadCost;

          return (
            <div
              key={trade.id}
              className="flex items-center py-0.5 px-1 border-b border-white/[0.02] gap-1 hover:bg-cyan-400/[0.02] transition-colors"
            >
              {/* Symbol */}
              <span className="w-[36px] shrink-0 font-bold text-white/70">{trade.symbol}</span>

              {/* Side */}
              <span
                className="w-[24px] shrink-0 font-bold text-[7px]"
                style={{ color: sideColor(trade.side) }}
              >
                {trade.side}
              </span>

              {/* Price progression */}
              <span className="w-[46px] shrink-0 text-right text-white/40">{trade.arrivalPrice.toFixed(2)}</span>
              <span className="w-[46px] shrink-0 text-right text-white/60 font-bold">{trade.avgPrice.toFixed(2)}</span>
              <span className="w-[46px] shrink-0 text-right text-cyan-400/60">{trade.vwap.toFixed(2)}</span>
              <span className="w-[46px] shrink-0 text-right text-white/30">{trade.closePrice.toFixed(2)}</span>

              {/* Cost decomposition bar */}
              <div className="flex-1 flex items-center gap-0.5 min-w-0">
                <div className="flex-1 h-[6px] bg-white/[0.02] flex overflow-hidden">
                  {totalCost > 0 && (
                    <>
                      <div
                        style={{
                          width: `${(trade.marketImpact / totalCost) * 100}%`,
                          backgroundColor: RED,
                          opacity: 0.5,
                        }}
                        title={`Impact: ${trade.marketImpact.toFixed(1)} bps`}
                      />
                      <div
                        style={{
                          width: `${(adjustedTiming / totalCost) * 100}%`,
                          backgroundColor: ORANGE,
                          opacity: 0.5,
                        }}
                        title={`Timing: ${adjustedTiming.toFixed(1)} bps`}
                      />
                      <div
                        style={{
                          width: `${(spreadCost / totalCost) * 100}%`,
                          backgroundColor: YELLOW,
                          opacity: 0.4,
                        }}
                        title={`Spread: ${spreadCost.toFixed(1)} bps`}
                      />
                    </>
                  )}
                </div>
                <span className="text-[6px] text-white/25 w-[22px] text-right shrink-0">
                  {trade.implementationShortfall.toFixed(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-t border-white/[0.04]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2" style={{ backgroundColor: RED, opacity: 0.5 }} />
          <span className="text-[6px] text-white/25">{tr(t, 'tbImpact', 'Market Impact')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2" style={{ backgroundColor: ORANGE, opacity: 0.5 }} />
          <span className="text-[6px] text-white/25">{tr(t, 'tbTiming', 'Timing Cost')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2" style={{ backgroundColor: YELLOW, opacity: 0.4 }} />
          <span className="text-[6px] text-white/25">{tr(t, 'tbSpread', 'Spread Cost')}</span>
        </div>
      </div>
    </div>
  );
}
