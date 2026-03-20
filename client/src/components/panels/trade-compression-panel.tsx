import { useState, useMemo } from 'react';
import { useTradeCompression } from '../../api/hooks/use-trade-compression';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtNotional(n: number): string {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n.toFixed(0);
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtRatio(n: number): string {
  return n.toFixed(2) + 'x';
}

function fmtDv01(n: number): string {
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

// ── Color helpers ──

function statusStyle(status: string): { text: string; bg: string } {
  if (status === 'completed') return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
  if (status === 'in_progress') return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
  if (status === 'pending') return { text: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' };
  if (status === 'failed') return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  return { text: 'text-neutral-500', bg: 'bg-neutral-500/15 border-neutral-500/30' };
}

function statusLabel(status: string): string {
  if (status === 'completed') return 'DONE';
  if (status === 'in_progress') return 'RUNNING';
  if (status === 'pending') return 'QUEUED';
  if (status === 'failed') return 'FAIL';
  return status.toUpperCase();
}

function ratioColor(ratio: number): string {
  if (ratio >= 0.5) return 'text-green-400';
  if (ratio >= 0.3) return 'text-yellow-400';
  return 'text-red-400';
}

function savingsColor(pct: number): string {
  if (pct >= 20) return 'text-green-400';
  if (pct >= 10) return 'text-yellow-400';
  return 'text-neutral-400';
}

// ── Tab type ──

type Tab = 'cycles' | 'portfolio' | 'netting' | 'efficiency';

// ── Main Panel ──

export function TradeCompressionPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useTradeCompression();
  const [activeTab, setActiveTab] = useState<Tab>('cycles');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'cycles', label: tr(t, 'tcCycles', 'Cycles') },
    { key: 'portfolio', label: tr(t, 'tcPortfolio', 'Portfolio') },
    { key: 'netting', label: tr(t, 'tcNetting', 'Netting') },
    { key: 'efficiency', label: tr(t, 'tcEfficiency', 'Efficiency') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-violet-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-violet-400">
            {tr(t, 'tcTitle', 'Trade Compression')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider text-violet-400 bg-violet-500/10 border border-violet-500/30">
              {data.cycles.length} {tr(t, 'tcCyclesCount', 'Cycles')}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-violet-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 shrink-0 bg-[#030303]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab.key
                ? 'text-violet-400 border-b border-violet-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-violet-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'tcNoData', 'No data available')}
          </div>
        )}

        {data && activeTab === 'cycles' && <CyclesSection data={data} t={t} />}
        {data && activeTab === 'portfolio' && <PortfolioSection data={data} t={t} />}
        {data && activeTab === 'netting' && <NettingSection data={data} t={t} />}
        {data && activeTab === 'efficiency' && <EfficiencySection data={data} t={t} />}
      </div>
    </div>
  );
}

// ── Types (matching hook data shape) ──

interface CompressionCycle {
  id: string;
  date: string;
  product: string;
  submittedNotional: number;
  eliminatedNotional: number;
  compressionRatio: number;
  status: string;
  counterpartiesInvolved: number;
  tradeCount: number;
}

interface PortfolioBucket {
  product: string;
  grossNotional: number;
  netNotional: number;
  tradeCount: number;
  dv01: number;
}

interface CounterpartyNetting {
  name: string;
  grossExposure: number;
  netExposure: number;
  nettingRatio: number;
  tradeCount: number;
}

interface EfficiencyMetric {
  metric: string;
  preCompression: number;
  postCompression: number;
  savings: number;
  savingsPct: number;
}

interface TradeCompressionData {
  timestamp: string;
  cycles: CompressionCycle[];
  portfolio: PortfolioBucket[];
  counterparties: CounterpartyNetting[];
  efficiency: EfficiencyMetric[];
  totalSubmitted: number;
  totalEliminated: number;
  overallRatio: number;
}

// ── Section 1: Compression Cycles ──

function CyclesSection({
  data,
  t,
}: {
  data: TradeCompressionData;
  t: ReturnType<typeof useT>;
}) {
  const sortedCycles = useMemo(
    () => [...data.cycles].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [data.cycles],
  );

  return (
    <div>
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-px bg-border/10 border-b border-border/20">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'tcTotalSubmitted', 'Total Submitted')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtNotional(data.totalSubmitted)}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'tcTotalEliminated', 'Eliminated')}
          </div>
          <div className="text-[10px] font-mono font-bold text-green-400">
            {fmtNotional(data.totalEliminated)}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'tcOverallRatio', 'Overall Ratio')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${ratioColor(data.overallRatio)}`}>
            {fmtPct(data.overallRatio * 100)}
          </div>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[64px_72px_80px_80px_48px_48px_44px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'tcDate', 'Date')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'tcProduct', 'Product')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'tcSubmitted', 'Submitted')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'tcEliminated', 'Eliminated')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'tcRatio', 'Ratio')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'tcTrades', 'Trades')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">{tr(t, 'tcStatus', 'Status')}</span>
      </div>

      {/* Rows */}
      {sortedCycles.map((cycle) => {
        const style = statusStyle(cycle.status);
        return (
          <div
            key={cycle.id}
            className="grid grid-cols-[64px_72px_80px_80px_48px_48px_44px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-violet-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono text-neutral-400">
              {new Date(cycle.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <span className="text-[8px] font-mono font-bold text-white truncate">
              {cycle.product}
            </span>
            <span className="text-[8px] font-mono text-white text-right">
              {fmtNotional(cycle.submittedNotional)}
            </span>
            <span className="text-[8px] font-mono text-green-400 text-right">
              {fmtNotional(cycle.eliminatedNotional)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${ratioColor(cycle.compressionRatio)}`}>
              {fmtPct(cycle.compressionRatio * 100)}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">
              {cycle.tradeCount}
            </span>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${style.text} ${style.bg}`}>
                {statusLabel(cycle.status)}
              </span>
            </div>
          </div>
        );
      })}

      {/* Timestamp */}
      <div className="px-3 py-2 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'tcLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ── Section 2: Portfolio Summary ──

function PortfolioSection({
  data,
  t,
}: {
  data: TradeCompressionData;
  t: ReturnType<typeof useT>;
}) {
  const totals = useMemo(() => {
    const gross = data.portfolio.reduce((s, b) => s + b.grossNotional, 0);
    const net = data.portfolio.reduce((s, b) => s + b.netNotional, 0);
    const trades = data.portfolio.reduce((s, b) => s + b.tradeCount, 0);
    const dv01 = data.portfolio.reduce((s, b) => s + b.dv01, 0);
    return { gross, net, trades, dv01 };
  }, [data.portfolio]);

  const maxGross = useMemo(
    () => Math.max(...data.portfolio.map((b) => b.grossNotional), 1),
    [data.portfolio],
  );

  return (
    <div>
      {/* Totals grid */}
      <div className="grid grid-cols-4 gap-px bg-border/10 border-b border-border/20">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'tcGrossNotional', 'Gross Notional')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtNotional(totals.gross)}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'tcNetNotional', 'Net Notional')}
          </div>
          <div className="text-[10px] font-mono font-bold text-violet-400">
            {fmtNotional(totals.net)}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'tcTradeCount', 'Trade Count')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {totals.trades.toLocaleString()}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'tcTotalDv01', 'Total DV01')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtDv01(totals.dv01)}
          </div>
        </div>
      </div>

      {/* Section label */}
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'tcByProduct', 'By Product Bucket')}
        </span>
      </div>

      {/* Product rows */}
      {data.portfolio.map((bucket) => {
        const barWidth = (bucket.grossNotional / maxGross) * 100;
        const netBarWidth = (bucket.netNotional / maxGross) * 100;

        return (
          <div
            key={bucket.product}
            className="px-3 py-1.5 border-b border-border/5 hover:bg-violet-400/[0.02] transition-colors"
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[8px] font-mono font-bold text-white">{bucket.product}</span>
              <div className="flex items-center gap-3">
                <span className="text-[7px] font-mono text-neutral-500">
                  {bucket.tradeCount} {tr(t, 'tcTradesLower', 'trades')}
                </span>
                <span className="text-[7px] font-mono text-neutral-500">
                  DV01 {fmtDv01(bucket.dv01)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-[6px] bg-neutral-900 relative">
                <div
                  className="absolute left-0 top-0 h-full bg-violet-400/20"
                  style={{ width: `${barWidth}%` }}
                />
                <div
                  className="absolute left-0 top-0 h-full bg-violet-400"
                  style={{ width: `${netBarWidth}%` }}
                />
              </div>
              <div className="flex items-center gap-2 w-40 shrink-0 justify-end">
                <span className="text-[7px] font-mono text-neutral-500">G</span>
                <span className="text-[8px] font-mono text-white w-16 text-right">
                  {fmtNotional(bucket.grossNotional)}
                </span>
                <span className="text-[7px] font-mono text-violet-400">N</span>
                <span className="text-[8px] font-mono text-violet-400 w-16 text-right">
                  {fmtNotional(bucket.netNotional)}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Timestamp */}
      <div className="px-3 py-2 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'tcLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ── Section 3: Counterparty Netting ──

function NettingSection({
  data,
  t,
}: {
  data: TradeCompressionData;
  t: ReturnType<typeof useT>;
}) {
  const sorted = useMemo(
    () => [...data.counterparties].sort((a, b) => b.grossExposure - a.grossExposure),
    [data.counterparties],
  );

  const maxGross = useMemo(
    () => Math.max(...sorted.map((c) => c.grossExposure), 1),
    [sorted],
  );

  return (
    <div>
      {/* Section label */}
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'tcTopCounterparties', 'Top Counterparties')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_80px_56px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'tcCounterparty', 'Counterparty')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'tcGross', 'Gross')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'tcNet', 'Net')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'tcNettingRatio', 'Netting')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'tcTrades', 'Trades')}</span>
      </div>

      {/* Rows */}
      {sorted.map((cp) => {
        const barWidth = (cp.grossExposure / maxGross) * 100;
        const netBarPct = cp.grossExposure > 0 ? (cp.netExposure / cp.grossExposure) * 100 : 0;

        return (
          <div
            key={cp.name}
            className="border-b border-border/5 hover:bg-violet-400/[0.02] transition-colors"
          >
            <div className="grid grid-cols-[1fr_80px_80px_56px_48px] gap-0 px-2 py-[3px] items-center">
              <span className="text-[8px] font-mono font-bold text-white truncate">
                {cp.name}
              </span>
              <span className="text-[8px] font-mono text-white text-right">
                {fmtNotional(cp.grossExposure)}
              </span>
              <span className="text-[8px] font-mono text-violet-400 text-right">
                {fmtNotional(cp.netExposure)}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${ratioColor(cp.nettingRatio)}`}>
                {fmtPct(cp.nettingRatio * 100)}
              </span>
              <span className="text-[8px] font-mono text-neutral-400 text-right">
                {cp.tradeCount}
              </span>
            </div>
            {/* Netting ratio bar */}
            <div className="px-2 pb-1">
              <div className="h-[3px] bg-neutral-900 relative w-full">
                <div
                  className="absolute left-0 top-0 h-full bg-violet-400/30"
                  style={{ width: `${barWidth}%` }}
                />
                <div
                  className="absolute left-0 top-0 h-full bg-violet-400"
                  style={{ width: `${Math.max(barWidth - netBarPct, 0)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Timestamp */}
      <div className="px-3 py-2 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'tcLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ── Section 4: Efficiency Metrics ──

function EfficiencySection({
  data,
  t,
}: {
  data: TradeCompressionData;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      {/* Section label */}
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'tcPrePostComparison', 'Pre/Post Compression Comparison')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_80px_80px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'tcMetric', 'Metric')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'tcPre', 'Pre')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'tcPost', 'Post')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'tcSavings', 'Savings')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'tcSavingsPct', '%')}</span>
      </div>

      {/* Rows */}
      {data.efficiency.map((m) => (
        <div
          key={m.metric}
          className="grid grid-cols-[1fr_80px_80px_80px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white">
            {m.metric}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtNotional(m.preCompression)}
          </span>
          <span className="text-[8px] font-mono text-white text-right">
            {fmtNotional(m.postCompression)}
          </span>
          <span className="text-[8px] font-mono text-green-400 text-right">
            {fmtNotional(m.savings)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${savingsColor(m.savingsPct)}`}>
            {fmtPct(m.savingsPct)}
          </span>
        </div>
      ))}

      {/* Visual savings breakdown */}
      <div className="px-3 py-2 border-t border-border/10">
        <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
          {tr(t, 'tcSavingsBreakdown', 'Savings Breakdown')}
        </div>
        <div className="grid grid-cols-2 gap-px bg-border/10">
          {data.efficiency.map((m) => {
            const barWidth = Math.min(m.savingsPct, 100);
            return (
              <div key={m.metric} className="bg-black px-2 py-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[7px] font-mono text-neutral-500 uppercase truncate">
                    {m.metric}
                  </span>
                  <span className={`text-[8px] font-mono font-bold ${savingsColor(m.savingsPct)}`}>
                    {fmtPct(m.savingsPct)}
                  </span>
                </div>
                <div className="h-[4px] bg-neutral-900 relative">
                  <div
                    className="absolute left-0 top-0 h-full bg-violet-400 transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[7px] font-mono text-neutral-600">
                    {fmtNotional(m.preCompression)}
                  </span>
                  <span className="text-[7px] font-mono text-green-400">
                    -{fmtNotional(m.savings)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timestamp */}
      <div className="px-3 py-2 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'tcLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
