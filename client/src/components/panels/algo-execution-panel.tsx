import { useAlgoExecution } from '../../api/hooks/use-algo-execution';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

// -- Formatting helpers --

function fmtPct(n: number): string {
  return n.toFixed(2);
}

function fmtBps(n: number): string {
  return n.toFixed(1);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtLatency(n: number): string {
  return n.toFixed(1);
}

function fmtSize(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

// -- Color helpers --

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function slippageColor(n: number): string {
  if (n <= 0) return 'text-green-400';
  if (n < 1) return 'text-yellow-400';
  return 'text-red-400';
}

function fillColor(n: number): string {
  if (n >= 95) return 'text-green-400';
  if (n >= 80) return 'text-yellow-400';
  return 'text-red-400';
}

function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (s === 'FILLED' || s === 'COMPLETE') return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (s === 'PARTIAL' || s === 'WORKING') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  if (s === 'CANCELLED' || s === 'REJECTED') return 'bg-red-400/20 text-red-400 border-red-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function latencyColor(ms: number): string {
  if (ms < 5) return 'text-green-400';
  if (ms < 20) return 'text-yellow-400';
  return 'text-red-400';
}

// -- Interfaces --

interface AlgoSummary {
  totalOrders: number;
  avgFillRate: number;
  avgSlippage: number;
  totalVolume: number;
  bestAlgo: string;
}

interface AlgoStrategy {
  name: string;
  orderCount: number;
  avgSlippage: number;
  fillRate: number;
  avgDuration: string;
  participationRate: number;
}

interface VenueBreakdown {
  venue: string;
  fillRate: number;
  volume: number;
  avgLatency: number;
  rebate: number;
  marketShare: number;
}

interface TcaMetric {
  metric: string;
  value: number;
  unit: string;
  benchmark: number;
  delta: number;
}

interface RecentOrder {
  orderId: string;
  symbol: string;
  algo: string;
  side: string;
  status: string;
  fillPct: number;
  slippage: number;
  avgPrice: number;
  quantity: number;
}

interface BenchmarkComparison {
  benchmark: string;
  algoReturn: number;
  benchmarkReturn: number;
  alpha: number;
  trackingError: number;
}

interface LatencyMetric {
  component: string;
  p50: number;
  p95: number;
  p99: number;
  trend: number;
}

interface SorStat {
  metric: string;
  value: string;
  change: number;
}

// -- Main Panel --

export function AlgoExecutionPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useAlgoExecution();

  const summary = data?.summary as AlgoSummary | undefined;
  const strategies = data?.strategies as AlgoStrategy[] | undefined;
  const venues = data?.venues as VenueBreakdown[] | undefined;
  const tcaMetrics = data?.tcaMetrics as TcaMetric[] | undefined;
  const recentOrders = data?.recentOrders as RecentOrder[] | undefined;
  const benchmarks = data?.benchmarks as BenchmarkComparison[] | undefined;
  const latencies = data?.latencies as LatencyMetric[] | undefined;
  const sorStats = data?.sorStats as SorStat[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-sky-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-sky-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-sky-400">
            {tr(t, 'panelAlgoExecution', 'Algo Execution')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-sky-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-sky-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} />}
            {strategies && strategies.length > 0 && (
              <AlgoPerformanceSection strategies={strategies} />
            )}
            {venues && venues.length > 0 && (
              <VenueAnalysisSection venues={venues} />
            )}
            {tcaMetrics && tcaMetrics.length > 0 && (
              <TcaMetricsSection metrics={tcaMetrics} />
            )}
            {recentOrders && recentOrders.length > 0 && (
              <RecentOrdersSection orders={recentOrders} />
            )}
            {benchmarks && benchmarks.length > 0 && (
              <BenchmarkComparisonSection benchmarks={benchmarks} />
            )}
            {latencies && latencies.length > 0 && (
              <LatencyMetricsSection latencies={latencies} />
            )}
            {sorStats && sorStats.length > 0 && (
              <SmartOrderRoutingSection stats={sorStats} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -- Summary Bar --

function SummaryBar({ summary }: { summary: AlgoSummary }) {
  return (
    <div className="border-b border-sky-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-sky-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Total Orders
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {summary.totalOrders.toLocaleString()}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Avg Fill Rate
          </div>
          <div className={`text-[10px] font-mono font-bold ${fillColor(summary.avgFillRate)}`}>
            {fmtPct(summary.avgFillRate)}%
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Avg Slippage
          </div>
          <div className={`text-[10px] font-mono font-bold ${slippageColor(summary.avgSlippage)}`}>
            {fmtBps(summary.avgSlippage)}bp
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Volume
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtSize(summary.totalVolume)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Best Algo
          </div>
          <div className="text-[10px] font-mono font-bold text-sky-400 truncate">
            {summary.bestAlgo}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Algo Performance Section --

function AlgoPerformanceSection({ strategies }: { strategies: AlgoStrategy[] }) {
  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Algo Performance
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_56px_48px_56px_56px] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Strategy
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Orders
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Slippage
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Fill %
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Avg Dur
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Part %
        </span>
      </div>

      {/* Rows */}
      {strategies.map((s, i) => (
        <div
          key={`${s.name}-${i}`}
          className="grid grid-cols-[1fr_48px_56px_48px_56px_56px] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-sky-400 truncate">
            {s.name}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {s.orderCount.toLocaleString()}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${slippageColor(s.avgSlippage)}`}>
            {fmtBps(s.avgSlippage)}bp
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${fillColor(s.fillRate)}`}>
            {fmtPct(s.fillRate)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {s.avgDuration}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right pr-2">
            {fmtPct(s.participationRate)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Venue Analysis Section --

function VenueAnalysisSection({ venues }: { venues: VenueBreakdown[] }) {
  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Venue Analysis
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_56px_48px_48px_64px] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Venue
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Fill %
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Volume
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Lat ms
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Rebate
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Mkt Share
        </span>
      </div>

      {/* Rows */}
      {venues.map((v, i) => (
        <div
          key={`${v.venue}-${i}`}
          className="grid grid-cols-[1fr_48px_56px_48px_48px_64px] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-sky-400 truncate">
            {v.venue}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${fillColor(v.fillRate)}`}>
            {fmtPct(v.fillRate)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtSize(v.volume)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${latencyColor(v.avgLatency)}`}>
            {fmtLatency(v.avgLatency)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(v.rebate)}`}>
            {fmtChg(v.rebate)}
          </span>
          {/* Market share bar */}
          <div className="flex items-center gap-1 justify-end pr-2">
            <div className="w-12 h-1.5 bg-neutral-800 relative">
              <div
                className="absolute top-0 left-0 h-full bg-sky-400"
                style={{ width: `${Math.min(v.marketShare, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono font-bold text-white w-8 text-right">
              {fmtPct(v.marketShare)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// -- TCA Metrics Section --

function TcaMetricsSection({ metrics }: { metrics: TcaMetric[] }) {
  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          TCA Metrics
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_40px_64px_48px] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Metric
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Value
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Unit
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Benchmark
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Delta
        </span>
      </div>

      {/* Rows */}
      {metrics.map((m, i) => (
        <div
          key={`${m.metric}-${i}`}
          className="grid grid-cols-[1fr_64px_40px_64px_48px] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {m.metric}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtBps(m.value)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {m.unit}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtBps(m.benchmark)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(-m.delta)}`}>
            {fmtChg(m.delta)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Recent Orders Section --

function RecentOrdersSection({ orders }: { orders: RecentOrder[] }) {
  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Real-time Orders
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_48px_48px_32px_48px_48px_48px_56px] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Order ID
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Symbol
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Algo
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Side
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          Status
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Fill %
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Slip bp
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Qty
        </span>
      </div>

      {/* Rows */}
      {orders.map((o, i) => (
        <div
          key={`${o.orderId}-${i}`}
          className="grid grid-cols-[56px_48px_48px_32px_48px_48px_48px_56px] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono text-neutral-500 truncate">
            {o.orderId}
          </span>
          <span className="text-[8px] font-mono font-bold text-sky-400 truncate">
            {o.symbol}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {o.algo}
          </span>
          <span className={`text-[8px] font-mono font-bold ${o.side.toUpperCase() === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
            {o.side.toUpperCase().charAt(0)}
          </span>
          <span className="text-center">
            <span
              className={`inline-block px-1 py-0 text-[7px] font-mono font-bold uppercase tracking-wider border ${statusColor(o.status)}`}
            >
              {o.status}
            </span>
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${fillColor(o.fillPct)}`}>
            {fmtPct(o.fillPct)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${slippageColor(o.slippage)}`}>
            {fmtBps(o.slippage)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right pr-2">
            {fmtSize(o.quantity)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Benchmark Comparison Section --

function BenchmarkComparisonSection({ benchmarks }: { benchmarks: BenchmarkComparison[] }) {
  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Benchmark Comparison
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_64px_56px_56px] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Benchmark
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Algo Ret
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Bench Ret
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Alpha
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          TE
        </span>
      </div>

      {/* Rows */}
      {benchmarks.map((b, i) => (
        <div
          key={`${b.benchmark}-${i}`}
          className="grid grid-cols-[1fr_64px_64px_56px_56px] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-sky-400 truncate">
            {b.benchmark}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(b.algoReturn)}`}>
            {fmtChg(b.algoReturn)}bp
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(b.benchmarkReturn)}`}>
            {fmtChg(b.benchmarkReturn)}bp
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(b.alpha)}`}>
            {fmtChg(b.alpha)}bp
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right pr-2">
            {fmtBps(b.trackingError)}bp
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Latency Metrics Section --

function LatencyMetricsSection({ latencies }: { latencies: LatencyMetric[] }) {
  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Latency Metrics
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_56px_32px] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Component
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          P50 ms
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          P95 ms
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          P99 ms
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Trend
        </span>
      </div>

      {/* Rows */}
      {latencies.map((l, i) => (
        <div
          key={`${l.component}-${i}`}
          className="grid grid-cols-[1fr_56px_56px_56px_32px] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {l.component}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${latencyColor(l.p50)}`}>
            {fmtLatency(l.p50)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${latencyColor(l.p95)}`}>
            {fmtLatency(l.p95)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${latencyColor(l.p99)}`}>
            {fmtLatency(l.p99)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(-l.trend)}`}>
            {l.trend > 0 ? '\u25B2' : l.trend < 0 ? '\u25BC' : '\u25C6'}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Smart Order Routing Section --

function SmartOrderRoutingSection({ stats }: { stats: SorStat[] }) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Smart Order Routing
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_48px] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Metric
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Value
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Chg
        </span>
      </div>

      {/* Rows */}
      {stats.map((s, i) => (
        <div
          key={`${s.metric}-${i}`}
          className="grid grid-cols-[1fr_72px_48px] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {s.metric}
          </span>
          <span className="text-[8px] font-mono font-bold text-sky-400 text-right">
            {s.value}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(s.change)}`}>
            {fmtChg(s.change)}%
          </span>
        </div>
      ))}
    </div>
  );
}
