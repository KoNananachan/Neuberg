import { useTradeCostAnalysis } from '../../api/hooks/use-trade-cost-analysis';
import { useT } from '../../i18n';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Constants ──

const PURPLE = '#c084fc'; // purple-400
const GREEN = '#22c55e';
const RED = '#ef4444';
const YELLOW = '#facc15';
const ORANGE = '#fb923c';
const DIM_WHITE = 'rgba(255,255,255,0.4)';

// ── Formatting helpers ──

function fmtBps(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtNotional(n: number): string {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n.toFixed(0);
}

function fmtQty(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── Color helpers ──

function costColor(bps: number): string {
  if (bps <= -0.5) return GREEN;
  if (bps <= 0.5) return DIM_WHITE;
  if (bps <= 2) return YELLOW;
  if (bps <= 5) return ORANGE;
  return RED;
}

function slippageColor(bps: number): string {
  if (bps <= 0) return GREEN;
  if (bps <= 1) return YELLOW;
  if (bps <= 3) return ORANGE;
  return RED;
}

function toxicityColor(score: number): string {
  if (score <= 0.3) return GREEN;
  if (score <= 0.5) return YELLOW;
  if (score <= 0.7) return ORANGE;
  return RED;
}

function sideColor(side: string): string {
  return side === 'BUY' ? GREEN : RED;
}

// ── Main Panel ──

export function TradeCostAnalysisPanel() {
  const t = useT();
  const { data, isLoading, error } = useTradeCostAnalysis();
  const d = data as any;

  if (isLoading && !d) {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="flex items-center px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter" style={{ color: PURPLE }}>
            {tr(t, 'tcaTitle', 'Trade Cost Analysis')}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono uppercase animate-pulse" style={{ color: PURPLE }}>
            {t('loading')}
          </span>
        </div>
      </div>
    );
  }

  if (error || !d) {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="flex items-center px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter" style={{ color: PURPLE }}>
            {tr(t, 'tcaTitle', 'Trade Cost Analysis')}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono uppercase text-red-400">FAILED TO LOAD</span>
        </div>
      </div>
    );
  }

  const summary = d.executionSummary ?? {};
  const benchmarks = d.benchmarkComparison ?? {};
  const slippageBuckets = d.slippageAnalysis ?? [];
  const venues = d.venueAnalysis ?? [];
  const costBreakdown = d.costBreakdown ?? {};
  const recentTrades = d.recentTrades ?? [];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <span className="text-[9px] font-black font-mono uppercase tracking-tighter" style={{ color: PURPLE }}>
          {tr(t, 'tcaTitle', 'Trade Cost Analysis')}
        </span>
        {summary.totalOrders != null && (
          <span className="text-[6px] font-mono text-white/20 uppercase">
            {summary.totalOrders} ORDERS
          </span>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* ── 1. EXECUTION SUMMARY ── */}
        <SectionHeader label="EXECUTION SUMMARY" />
        <div className="grid grid-cols-4 gap-px bg-white/[0.02]">
          <MetricCell label="TOTAL ORDERS" value={String(summary.totalOrders ?? '-')} />
          <MetricCell label="NOTIONAL" value={fmtNotional(summary.totalNotional ?? 0)} />
          <MetricCell
            label="AVG SLIPPAGE"
            value={`${fmtBps(summary.avgSlippageBps ?? 0)} bps`}
            color={slippageColor(summary.avgSlippageBps ?? 0)}
          />
          <MetricCell
            label="IMPL SHORTFALL"
            value={`${fmtBps(summary.implementationShortfall ?? 0)} bps`}
            color={costColor(summary.implementationShortfall ?? 0)}
          />
        </div>
        <div className="grid grid-cols-3 gap-px bg-white/[0.02] border-b border-border/20">
          <MetricCell label="PARTICIPATION" value={fmtPct(summary.participationRate ?? 0)} />
          <MetricCell label="FILL RATE" value={fmtPct(summary.fillRate ?? 0)} color={GREEN} />
          <MetricCell
            label="BENCHMARK BEAT"
            value={fmtPct(summary.benchmarkBeatRate ?? 0)}
            color={(summary.benchmarkBeatRate ?? 0) >= 50 ? GREEN : RED}
          />
        </div>

        {/* ── 2. BENCHMARK COMPARISON ── */}
        <SectionHeader label="BENCHMARK COMPARISON" />
        <div className="border-b border-border/20">
          {/* Benchmark header row */}
          <div className="flex items-center px-2 py-0.5 text-[5px] font-mono uppercase tracking-wider text-white/15 border-b border-white/[0.04]">
            <span className="w-[60px] shrink-0">BENCHMARK</span>
            <span className="w-[56px] shrink-0 text-right">AVG DEV (bps)</span>
            <span className="w-[50px] shrink-0 text-right">STD DEV</span>
            <span className="w-[42px] shrink-0 text-right">% BEAT</span>
            <span className="flex-1 text-right">BEST / WORST</span>
          </div>
          {(benchmarks.items ?? []).map((bm: any, i: number) => (
            <div
              key={i}
              className="flex items-center px-2 py-0.5 text-[9px] font-mono border-b border-white/[0.02] hover:bg-purple-400/[0.02] transition-colors"
            >
              <span className="w-[60px] shrink-0 text-white/50 font-bold uppercase text-[7px]">{bm.name}</span>
              <span
                className="w-[56px] shrink-0 text-right font-bold"
                style={{ color: costColor(bm.avgDeviation ?? 0) }}
              >
                {fmtBps(bm.avgDeviation ?? 0)}
              </span>
              <span className="w-[50px] shrink-0 text-right text-white/30">
                {(bm.stdDev ?? 0).toFixed(2)}
              </span>
              <span
                className="w-[42px] shrink-0 text-right font-bold"
                style={{ color: (bm.beatPct ?? 0) >= 50 ? GREEN : RED }}
              >
                {fmtPct(bm.beatPct ?? 0)}
              </span>
              <div className="flex-1 flex justify-end gap-2 text-[7px]">
                <span style={{ color: GREEN }}>{bm.bestExecution ?? '-'}</span>
                <span style={{ color: RED }}>{bm.worstExecution ?? '-'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── 3. SLIPPAGE ANALYSIS ── */}
        <SectionHeader label="SLIPPAGE ANALYSIS" />
        <div className="border-b border-border/20">
          {/* Slippage header row */}
          <div className="flex items-center px-2 py-0.5 text-[5px] font-mono uppercase tracking-wider text-white/15 border-b border-white/[0.04]">
            <span className="w-[56px] shrink-0">SIZE BUCKET</span>
            <span className="w-[32px] shrink-0 text-right">COUNT</span>
            <span className="w-[52px] shrink-0 text-right">AVG SLIP</span>
            <span className="w-[46px] shrink-0 text-right">IMPACT</span>
            <span className="w-[46px] shrink-0 text-right">SPREAD</span>
            <span className="w-[46px] shrink-0 text-right">TIMING</span>
            <span className="flex-1" />
          </div>
          {slippageBuckets.map((bucket: any, i: number) => {
            const maxSlip = Math.max(
              ...slippageBuckets.map((b: any) => Math.abs(b.avgSlippage ?? 0)),
              1
            );
            const barPct = Math.min(100, (Math.abs(bucket.avgSlippage ?? 0) / maxSlip) * 100);
            return (
              <div
                key={i}
                className="flex items-center px-2 py-0.5 text-[9px] font-mono border-b border-white/[0.02] hover:bg-purple-400/[0.02] transition-colors"
              >
                <span className="w-[56px] shrink-0 text-white/50 font-bold text-[7px]">{bucket.label}</span>
                <span className="w-[32px] shrink-0 text-right text-white/30">{bucket.orderCount ?? 0}</span>
                <span
                  className="w-[52px] shrink-0 text-right font-bold"
                  style={{ color: slippageColor(bucket.avgSlippage ?? 0) }}
                >
                  {fmtBps(bucket.avgSlippage ?? 0)}
                </span>
                <span className="w-[46px] shrink-0 text-right text-white/35">
                  {fmtBps(bucket.marketImpact ?? 0)}
                </span>
                <span className="w-[46px] shrink-0 text-right text-white/35">
                  {fmtBps(bucket.spreadCost ?? 0)}
                </span>
                <span className="w-[46px] shrink-0 text-right text-white/35">
                  {fmtBps(bucket.timingCost ?? 0)}
                </span>
                {/* Horizontal bar */}
                <div className="flex-1 pl-2">
                  <div className="h-[5px] bg-white/[0.03] w-full">
                    <div
                      className="h-full"
                      style={{
                        width: `${barPct}%`,
                        backgroundColor: slippageColor(bucket.avgSlippage ?? 0),
                        opacity: 0.5,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 4. VENUE ANALYSIS ── */}
        <SectionHeader label="VENUE ANALYSIS" />
        <div className="border-b border-border/20">
          {/* Venue header row */}
          <div className="flex items-center px-2 py-0.5 text-[5px] font-mono uppercase tracking-wider text-white/15 border-b border-white/[0.04]">
            <span className="w-[56px] shrink-0">VENUE</span>
            <span className="w-[42px] shrink-0 text-right">FILL %</span>
            <span className="w-[52px] shrink-0 text-right">PX IMPROV</span>
            <span className="w-[48px] shrink-0 text-right">FILL TIME</span>
            <span className="w-[42px] shrink-0 text-right">ORD %</span>
            <span className="w-[48px] shrink-0 text-right">TOXICITY</span>
          </div>
          {venues.map((venue: any, i: number) => (
            <div
              key={i}
              className="flex items-center px-2 py-0.5 text-[9px] font-mono border-b border-white/[0.02] hover:bg-purple-400/[0.02] transition-colors"
            >
              <span className="w-[56px] shrink-0 text-white/60 font-bold text-[7px]">{venue.name}</span>
              <span className="w-[42px] shrink-0 text-right text-white/50">
                {fmtPct(venue.fillRate ?? 0)}
              </span>
              <span
                className="w-[52px] shrink-0 text-right font-bold"
                style={{ color: (venue.priceImprovement ?? 0) > 0 ? GREEN : RED }}
              >
                {fmtBps(venue.priceImprovement ?? 0)}
              </span>
              <span className="w-[48px] shrink-0 text-right text-white/35">
                {fmtMs(venue.avgFillTimeMs ?? 0)}
              </span>
              <span className="w-[42px] shrink-0 text-right text-white/35">
                {fmtPct(venue.orderPct ?? 0)}
              </span>
              <span
                className="w-[48px] shrink-0 text-right font-bold"
                style={{ color: toxicityColor(venue.toxicityScore ?? 0) }}
              >
                {(venue.toxicityScore ?? 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* ── 5. COST BREAKDOWN ── */}
        <SectionHeader label="COST BREAKDOWN" />
        <CostWaterfall breakdown={costBreakdown} />

        {/* ── 6. RECENT TRADES ── */}
        <SectionHeader label="RECENT TRADES" />
        <div>
          {/* Recent trades header row */}
          <div className="flex items-center px-2 py-0.5 text-[5px] font-mono uppercase tracking-wider text-white/15 border-b border-white/[0.04]">
            <span className="w-[36px] shrink-0">TICKER</span>
            <span className="w-[24px] shrink-0">SIDE</span>
            <span className="w-[36px] shrink-0 text-right">QTY</span>
            <span className="w-[46px] shrink-0 text-right">PRICE</span>
            <span className="w-[46px] shrink-0 text-right">BENCH</span>
            <span className="w-[46px] shrink-0 text-right">SLIP (bps)</span>
            <span className="w-[44px] shrink-0">VENUE</span>
            <span className="flex-1 text-right">TIME</span>
          </div>
          {recentTrades.map((trade: any, i: number) => (
            <div
              key={i}
              className="flex items-center px-2 py-0.5 text-[9px] font-mono border-b border-white/[0.02] hover:bg-purple-400/[0.02] transition-colors"
            >
              <span className="w-[36px] shrink-0 text-white/70 font-bold">{trade.ticker}</span>
              <span
                className="w-[24px] shrink-0 font-bold text-[7px]"
                style={{ color: sideColor(trade.side) }}
              >
                {trade.side}
              </span>
              <span className="w-[36px] shrink-0 text-right text-white/50">{fmtQty(trade.qty ?? 0)}</span>
              <span className="w-[46px] shrink-0 text-right text-white/60">
                {(trade.price ?? 0).toFixed(2)}
              </span>
              <span className="w-[46px] shrink-0 text-right text-white/40">
                {(trade.benchmark ?? 0).toFixed(2)}
              </span>
              <span
                className="w-[46px] shrink-0 text-right font-bold"
                style={{ color: slippageColor(trade.slippageBps ?? 0) }}
              >
                {fmtBps(trade.slippageBps ?? 0)}
              </span>
              <span className="w-[44px] shrink-0 text-white/30 text-[7px]">{trade.venue}</span>
              <span className="flex-1 text-right text-white/25 text-[7px]">
                {trade.time ? fmtTime(trade.time) : '-'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Section Header ──

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-2 py-1 border-b border-border/20 bg-white/[0.01]">
      <span className="text-[6px] font-mono font-bold uppercase tracking-wider" style={{ color: PURPLE }}>
        {label}
      </span>
    </div>
  );
}

// ── Metric Cell ──

function MetricCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="px-2 py-1.5 bg-black">
      <div className="text-[5px] text-white/20 font-mono uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-[10px] font-mono font-bold" style={{ color: color ?? 'rgba(255,255,255,0.6)' }}>
        {value}
      </div>
    </div>
  );
}

// ── Cost Waterfall ──

function CostWaterfall({ breakdown }: { breakdown: any }) {
  const items = [
    { label: 'COMMISSION', value: breakdown.commission ?? 0 },
    { label: 'SPREAD', value: breakdown.spread ?? 0 },
    { label: 'IMPACT', value: breakdown.impact ?? 0 },
    { label: 'TIMING', value: breakdown.timing ?? 0 },
    { label: 'OPPORTUNITY', value: breakdown.opportunity ?? 0 },
  ];
  const totalIS = breakdown.totalIS ?? items.reduce((s, it) => s + it.value, 0);

  const maxVal = Math.max(...items.map((it) => Math.abs(it.value)), Math.abs(totalIS), 1);

  const W = 320;
  const ROW_H = 18;
  const ROWS = items.length + 1; // +1 for total
  const H = ROWS * ROW_H + 8;
  const LABEL_W = 72;
  const BAR_AREA = W - LABEL_W - 52;
  const BAR_X = LABEL_W;

  return (
    <div className="px-2 py-1 border-b border-border/20">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
        {/* Cost items */}
        {items.map((item, i) => {
          const y = 4 + i * ROW_H;
          const barW = (Math.abs(item.value) / maxVal) * BAR_AREA;
          const isNegative = item.value < 0;
          const color = isNegative ? GREEN : RED;

          return (
            <g key={item.label}>
              <text
                x={LABEL_W - 6}
                y={y + ROW_H / 2 + 1}
                textAnchor="end"
                fill="rgba(255,255,255,0.35)"
                fontSize={6}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {item.label}
              </text>
              <rect
                x={BAR_X}
                y={y + 3}
                width={barW}
                height={ROW_H - 6}
                fill={color}
                fillOpacity={0.45}
              />
              <text
                x={BAR_X + barW + 4}
                y={y + ROW_H / 2 + 1}
                textAnchor="start"
                fill={color}
                fontSize={7}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {fmtBps(item.value)} bps
              </text>
            </g>
          );
        })}
        {/* Divider line */}
        <line
          x1={BAR_X}
          y1={4 + items.length * ROW_H}
          x2={W - 10}
          y2={4 + items.length * ROW_H}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.5}
        />
        {/* Total IS */}
        {(() => {
          const y = 4 + items.length * ROW_H;
          const barW = (Math.abs(totalIS) / maxVal) * BAR_AREA;
          const color = totalIS <= 0 ? GREEN : RED;
          return (
            <g>
              <text
                x={LABEL_W - 6}
                y={y + ROW_H / 2 + 1}
                textAnchor="end"
                fill={PURPLE}
                fontSize={6.5}
                fontFamily="monospace"
                fontWeight="bold"
              >
                TOTAL IS
              </text>
              <rect
                x={BAR_X}
                y={y + 3}
                width={barW}
                height={ROW_H - 6}
                fill={color}
                fillOpacity={0.6}
              />
              <text
                x={BAR_X + barW + 4}
                y={y + ROW_H / 2 + 1}
                textAnchor="start"
                fill={color}
                fontSize={7.5}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {fmtBps(totalIS)} bps
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
