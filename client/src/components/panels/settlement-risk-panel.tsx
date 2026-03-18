import { useState } from 'react';
import { useSettlementRisk } from '../../api/hooks/use-settlement-risk';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n fallback helper
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const ORANGE = '#fb923c';
const GREEN = '#34d399';
const RED = '#f87171';
const YELLOW = '#fbbf24';
const AMBER = '#fbbf24';
const CYAN = '#22d3ee';

// ── Formatting helpers ──

function fmtValue(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtRate(n: number): string {
  return n.toFixed(2) + '%';
}

function fmtEfficiency(n: number): string {
  return n.toFixed(1) + '%';
}

// ── Color helpers ──

function rateColor(rate: number): string {
  if (rate >= 99) return GREEN;
  if (rate >= 97) return CYAN;
  if (rate >= 95) return YELLOW;
  if (rate >= 90) return ORANGE;
  return RED;
}

function failureColor(count: number): string {
  if (count === 0) return 'rgba(255,255,255,0.3)';
  if (count <= 5) return YELLOW;
  if (count <= 20) return ORANGE;
  return RED;
}

function efficiencyColor(pct: number): string {
  if (pct >= 95) return GREEN;
  if (pct >= 85) return CYAN;
  if (pct >= 70) return YELLOW;
  return RED;
}

function trendArrow(trend: 'improving' | 'stable' | 'deteriorating'): { arrow: string; color: string } {
  switch (trend) {
    case 'improving': return { arrow: '\u2193', color: GREEN };
    case 'deteriorating': return { arrow: '\u2191', color: RED };
    case 'stable': return { arrow: '\u2192', color: 'rgba(255,255,255,0.3)' };
  }
}

function dvpStatusColor(status: string): string {
  switch (status) {
    case 'normal': return GREEN;
    case 'elevated': return YELLOW;
    case 'stressed': return ORANGE;
    case 'critical': return RED;
    default: return 'rgba(255,255,255,0.3)';
  }
}

// ── Tab type ──

type Tab = 'pipeline' | 'cls' | 'aging' | 'dvp';

// ── Mock data types (expected from hook) ──

interface PipelineRow {
  assetClass: string;
  pendingTrades: number;
  pendingValue: number;
  failures: number;
  failureValue: number;
  settlementRate: number;
  trend: 'improving' | 'stable' | 'deteriorating';
}

interface ClsEntry {
  pair: string;
  volume: number;
  nettingEfficiency: number;
  settlementRate: number;
  avgSettleTime: string;
}

interface AgingBucket {
  bucket: string;
  count: number;
  value: number;
  trend: 'improving' | 'stable' | 'deteriorating';
  pctOfTotal: number;
}

interface DvpStat {
  label: string;
  value: string;
  status: string;
  detail: string;
}

interface SettlementRiskData {
  timestamp: string;
  overallRate: number;
  overallStatus: string;
  pipeline: PipelineRow[];
  cls: ClsEntry[];
  aging: AgingBucket[];
  dvp: DvpStat[];
  totalPending: number;
  totalFailures: number;
  totalFailureValue: number;
}

// ── Main Panel ──

export function SettlementRiskPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useSettlementRisk() as {
    data: SettlementRiskData | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  };
  const [activeTab, setActiveTab] = useState<Tab>('pipeline');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pipeline', label: tr(t, 'srPipeline', 'Pipeline') },
    { key: 'cls', label: tr(t, 'srCls', 'CLS') },
    { key: 'aging', label: tr(t, 'srAging', 'Aging') },
    { key: 'dvp', label: tr(t, 'srDvp', 'DvP') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-orange-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-orange-400">
            {tr(t, 'srTitle', 'Settlement Risk Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span
              className="text-[7px] font-black font-mono uppercase px-1.5 py-0.5"
              style={{
                color: dvpStatusColor(data.overallStatus),
                backgroundColor: data.overallStatus === 'normal'
                  ? 'rgba(52,211,153,0.1)' : data.overallStatus === 'elevated'
                    ? 'rgba(250,204,21,0.1)' : data.overallStatus === 'stressed'
                      ? 'rgba(251,146,60,0.1)' : 'rgba(248,113,113,0.12)',
              }}
            >
              {data.overallStatus}
            </span>
          )}
          {data && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-0.5 text-neutral-500 hover:text-orange-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {data && (
        <div className="flex items-center gap-3 px-3 py-1 border-b border-border/20 bg-[#030303]">
          <div>
            <span className="text-[6px] text-white/20 uppercase tracking-wider">
              {tr(t, 'srOverallRate', 'Settle Rate')}
            </span>
            <span className="ml-1 text-[9px] font-bold" style={{ color: rateColor(data.overallRate) }}>
              {fmtRate(data.overallRate)}
            </span>
          </div>
          <div className="w-px h-3 bg-border/20" />
          <div>
            <span className="text-[6px] text-white/20 uppercase tracking-wider">
              {tr(t, 'srPending', 'Pending')}
            </span>
            <span className="ml-1 text-[9px] font-bold text-white/60">
              {fmtValue(data.totalPending)}
            </span>
          </div>
          <div className="w-px h-3 bg-border/20" />
          <div>
            <span className="text-[6px] text-white/20 uppercase tracking-wider">
              {tr(t, 'srFails', 'Fails')}
            </span>
            <span className="ml-1 text-[9px] font-bold" style={{ color: failureColor(data.totalFailures) }}>
              {data.totalFailures}
            </span>
          </div>
          <div className="w-px h-3 bg-border/20" />
          <div>
            <span className="text-[6px] text-white/20 uppercase tracking-wider">
              {tr(t, 'srFailValue', 'Fail $')}
            </span>
            <span className="ml-1 text-[9px] font-bold" style={{ color: failureColor(data.totalFailures) }}>
              ${fmtValue(data.totalFailureValue)}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center border-b border-border/20 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1 text-[8px] font-black font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab.key
                ? 'text-orange-400 border-b border-orange-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-orange-400/30 border-t-orange-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        )}

        {error && !data && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-[9px] text-red-400 uppercase mb-1">
                {tr(t, 'srError', 'Failed to load data')}
              </div>
              <button
                onClick={() => refetch()}
                className="text-[8px] text-orange-400 uppercase hover:underline"
              >
                {tr(t, 'srRetry', 'Retry')}
              </button>
            </div>
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'srNoData', 'No data available')}
          </div>
        )}

        {data && activeTab === 'pipeline' && <PipelineSection data={data} t={t} />}
        {data && activeTab === 'cls' && <ClsSection entries={data.cls} t={t} />}
        {data && activeTab === 'aging' && <AgingSection buckets={data.aging} t={t} />}
        {data && activeTab === 'dvp' && <DvpSection stats={data.dvp} t={t} />}
      </div>
    </div>
  );
}

// ── Section 1: Settlement Pipeline ──

function PipelineSection({ data, t }: { data: SettlementRiskData; t: ReturnType<typeof useT> }) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'srSettlementPipeline', 'Settlement Pipeline by Asset Class')}
        </span>
      </div>

      {/* Table header */}
      <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] text-[6px] font-mono text-white/20 uppercase tracking-wider">
        <span className="w-[60px] shrink-0">Asset</span>
        <span className="w-[44px] text-right shrink-0">Pend #</span>
        <span className="w-[52px] text-right shrink-0">Pend $</span>
        <span className="w-[36px] text-right shrink-0">Fails</span>
        <span className="w-[48px] text-right shrink-0">Fail $</span>
        <span className="w-[44px] text-right shrink-0">Rate</span>
        <span className="w-[24px] text-center shrink-0">Trd</span>
      </div>

      {/* Rows */}
      {data.pipeline.map((row) => {
        const trend = trendArrow(row.trend);
        return (
          <div
            key={row.assetClass}
            className="flex items-center px-2 py-0.5 border-b border-white/[0.02] hover:bg-orange-400/[0.02] transition-colors"
          >
            <span className="w-[60px] shrink-0 text-[7px] font-bold text-white/60 truncate">
              {row.assetClass}
            </span>
            <span className="w-[44px] text-right shrink-0 text-[7px] text-white/50">
              {fmtValue(row.pendingTrades)}
            </span>
            <span className="w-[52px] text-right shrink-0 text-[7px] text-white/50">
              ${fmtValue(row.pendingValue)}
            </span>
            <span
              className="w-[36px] text-right shrink-0 text-[7px] font-bold"
              style={{ color: failureColor(row.failures) }}
            >
              {row.failures}
            </span>
            <span
              className="w-[48px] text-right shrink-0 text-[7px] font-bold"
              style={{ color: failureColor(row.failures) }}
            >
              ${fmtValue(row.failureValue)}
            </span>
            <span
              className="w-[44px] text-right shrink-0 text-[7px] font-bold"
              style={{ color: rateColor(row.settlementRate) }}
            >
              {fmtRate(row.settlementRate)}
            </span>
            <span
              className="w-[24px] text-center shrink-0 text-[8px] font-bold"
              style={{ color: trend.color }}
            >
              {trend.arrow}
            </span>
          </div>
        );
      })}

      {/* Settlement rate bar chart */}
      <div className="px-3 py-2 border-t border-border/10">
        <div className="text-[6px] text-white/20 uppercase tracking-wider mb-1">
          {tr(t, 'srRateByClass', 'Settlement Rate by Asset Class')}
        </div>
        <div className="space-y-1">
          {data.pipeline.map((row) => (
            <div key={row.assetClass + '-bar'} className="flex items-center gap-2">
              <span className="w-[50px] text-[6px] text-white/30 text-right shrink-0 truncate">
                {row.assetClass}
              </span>
              <div className="flex-1 h-1.5 bg-white/[0.03] relative">
                <div
                  className="absolute top-0 left-0 h-full"
                  style={{
                    width: `${Math.min(row.settlementRate, 100)}%`,
                    backgroundColor: rateColor(row.settlementRate),
                    opacity: 0.6,
                  }}
                />
              </div>
              <span
                className="text-[6px] font-bold w-[34px] text-right shrink-0"
                style={{ color: rateColor(row.settlementRate) }}
              >
                {fmtRate(row.settlementRate)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Section 2: CLS Settlement ──

function ClsSection({ entries, t }: { entries: ClsEntry[]; t: ReturnType<typeof useT> }) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'srClsSettlement', 'CLS Settlement — Currency Pairs')}
        </span>
      </div>

      {/* Grid of currency pairs */}
      <div className="grid grid-cols-3 gap-px bg-border/10">
        {entries.map((entry) => (
          <ClsCard key={entry.pair} entry={entry} />
        ))}
      </div>

      {/* Netting efficiency summary */}
      <div className="px-3 py-2 border-t border-border/10">
        <div className="text-[6px] text-white/20 uppercase tracking-wider mb-1.5">
          {tr(t, 'srNettingEfficiency', 'Netting Efficiency')}
        </div>
        <div className="space-y-1">
          {entries.map((entry) => (
            <div key={entry.pair + '-eff'} className="flex items-center gap-2">
              <span className="w-[46px] text-[6px] text-white/40 font-bold shrink-0">
                {entry.pair}
              </span>
              <div className="flex-1 h-1.5 bg-white/[0.03] relative">
                <div
                  className="absolute top-0 left-0 h-full"
                  style={{
                    width: `${Math.min(entry.nettingEfficiency, 100)}%`,
                    backgroundColor: efficiencyColor(entry.nettingEfficiency),
                    opacity: 0.5,
                  }}
                />
              </div>
              <span
                className="text-[6px] font-bold w-[34px] text-right shrink-0"
                style={{ color: efficiencyColor(entry.nettingEfficiency) }}
              >
                {fmtEfficiency(entry.nettingEfficiency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClsCard({ entry }: { entry: ClsEntry }) {
  return (
    <div className="bg-black px-2 py-1.5 hover:bg-orange-400/[0.02] transition-colors">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[8px] font-mono font-bold text-white">{entry.pair}</span>
        <span
          className="text-[6px] font-mono font-bold px-1 py-px"
          style={{
            color: rateColor(entry.settlementRate),
            backgroundColor: entry.settlementRate >= 99
              ? 'rgba(52,211,153,0.1)' : entry.settlementRate >= 95
                ? 'rgba(250,204,21,0.08)' : 'rgba(248,113,113,0.1)',
          }}
        >
          {fmtRate(entry.settlementRate)}
        </span>
      </div>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[6px] text-white/20 uppercase">Volume</div>
          <div className="text-[9px] font-bold text-white/60">${fmtValue(entry.volume)}</div>
        </div>
        <div className="text-right">
          <div className="text-[6px] text-white/20 uppercase">Netting</div>
          <div
            className="text-[9px] font-bold"
            style={{ color: efficiencyColor(entry.nettingEfficiency) }}
          >
            {fmtEfficiency(entry.nettingEfficiency)}
          </div>
        </div>
      </div>
      <div className="mt-0.5 text-[6px] text-white/20">
        Avg: {entry.avgSettleTime}
      </div>
    </div>
  );
}

// ── Section 3: Failed Trades Aging ──

function AgingSection({ buckets, t }: { buckets: AgingBucket[]; t: ReturnType<typeof useT> }) {
  const totalCount = buckets.reduce((sum, b) => sum + b.count, 0);
  const totalValue = buckets.reduce((sum, b) => sum + b.value, 0);

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'srFailedTradesAging', 'Failed Trades Aging')}
        </span>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border/10 bg-[#030303]">
        <div>
          <span className="text-[6px] text-white/20 uppercase tracking-wider">Total Fails</span>
          <div className="text-[10px] font-bold" style={{ color: failureColor(totalCount) }}>
            {totalCount}
          </div>
        </div>
        <div className="w-px h-4 bg-border/20" />
        <div>
          <span className="text-[6px] text-white/20 uppercase tracking-wider">Total Value</span>
          <div className="text-[10px] font-bold text-white/60">
            ${fmtValue(totalValue)}
          </div>
        </div>
      </div>

      {/* Aging table */}
      <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] text-[6px] font-mono text-white/20 uppercase tracking-wider">
        <span className="w-[60px] shrink-0">Bucket</span>
        <span className="w-[40px] text-right shrink-0">Count</span>
        <span className="w-[52px] text-right shrink-0">Value</span>
        <span className="w-[40px] text-right shrink-0">% Tot</span>
        <span className="w-[24px] text-center shrink-0">Trd</span>
        <span className="flex-1 text-right">Distribution</span>
      </div>

      {buckets.map((bucket) => {
        const trend = trendArrow(bucket.trend);
        const barWidth = totalCount > 0 ? (bucket.count / totalCount) * 100 : 0;
        const bucketSeverity = bucket.bucket.includes('30') || bucket.bucket.includes('60') || bucket.bucket.includes('90')
          ? RED : bucket.bucket.includes('7') || bucket.bucket.includes('14')
            ? ORANGE : YELLOW;

        return (
          <div
            key={bucket.bucket}
            className="flex items-center px-2 py-1 border-b border-white/[0.02] hover:bg-orange-400/[0.02] transition-colors"
          >
            <span className="w-[60px] shrink-0 text-[7px] font-bold text-white/50">
              {bucket.bucket}
            </span>
            <span
              className="w-[40px] text-right shrink-0 text-[8px] font-bold"
              style={{ color: failureColor(bucket.count) }}
            >
              {bucket.count}
            </span>
            <span className="w-[52px] text-right shrink-0 text-[7px] text-white/50">
              ${fmtValue(bucket.value)}
            </span>
            <span className="w-[40px] text-right shrink-0 text-[7px] text-white/40">
              {fmtPct(bucket.pctOfTotal)}
            </span>
            <span
              className="w-[24px] text-center shrink-0 text-[8px] font-bold"
              style={{ color: trend.color }}
            >
              {trend.arrow}
            </span>
            <div className="flex-1 pl-2">
              <div className="h-1.5 bg-white/[0.03] relative">
                <div
                  className="absolute top-0 left-0 h-full"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: bucketSeverity,
                    opacity: 0.5,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Aging distribution SVG bar chart */}
      <AgingChart buckets={buckets} totalCount={totalCount} />
    </div>
  );
}

function AgingChart({ buckets, totalCount }: { buckets: AgingBucket[]; totalCount: number }) {
  if (buckets.length === 0) return null;

  const W = 300;
  const H = 70;
  const PAD_L = 10;
  const PAD_R = 10;
  const PAD_T = 8;
  const PAD_B = 16;
  const CHART_W = W - PAD_L - PAD_R;
  const CHART_H = H - PAD_T - PAD_B;
  const BAR_GAP = 4;
  const barWidth = (CHART_W - BAR_GAP * (buckets.length - 1)) / buckets.length;
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="px-3 py-2 border-t border-border/10">
      <div className="text-[6px] text-white/20 uppercase tracking-wider mb-1">
        Aging Distribution
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 70 }}>
        {buckets.map((bucket, i) => {
          const barH = (bucket.count / maxCount) * CHART_H;
          const x = PAD_L + i * (barWidth + BAR_GAP);
          const y = PAD_T + CHART_H - barH;
          const severity = bucket.bucket.includes('30') || bucket.bucket.includes('60') || bucket.bucket.includes('90')
            ? RED : bucket.bucket.includes('7') || bucket.bucket.includes('14')
              ? ORANGE : YELLOW;

          return (
            <g key={bucket.bucket}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                fill={severity}
                fillOpacity={0.5}
              />
              {/* Count label */}
              {bucket.count > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 2}
                  textAnchor="middle"
                  fill={severity}
                  fontSize={5}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {bucket.count}
                </text>
              )}
              {/* Bucket label */}
              <text
                x={x + barWidth / 2}
                y={H - 3}
                textAnchor="middle"
                fill="rgba(255,255,255,0.25)"
                fontSize={4.5}
                fontFamily="monospace"
              >
                {bucket.bucket}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Section 4: DvP Analysis ──

function DvpSection({ stats, t }: { stats: DvpStat[]; t: ReturnType<typeof useT> }) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'srDvpAnalysis', 'Delivery vs Payment Analysis')}
        </span>
      </div>

      {/* Stat cards grid */}
      <div className="grid grid-cols-2 gap-px bg-border/10">
        {stats.map((stat) => (
          <DvpCard key={stat.label} stat={stat} />
        ))}
      </div>

      {/* DvP risk matrix */}
      <div className="px-3 py-2 border-t border-border/10">
        <div className="text-[6px] text-white/20 uppercase tracking-wider mb-1.5">
          {tr(t, 'srDvpRiskMatrix', 'DvP Risk Status')}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {stats.map((stat) => {
            const statusCol = dvpStatusColor(stat.status);
            return (
              <div key={stat.label + '-badge'} className="text-center">
                <div
                  className="w-full h-1.5 mb-0.5"
                  style={{
                    backgroundColor: statusCol,
                    opacity: 0.5,
                  }}
                />
                <div className="text-[5px] text-white/25 uppercase truncate">{stat.label}</div>
                <div className="text-[7px] font-bold" style={{ color: statusCol }}>
                  {stat.status.toUpperCase()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DvpCard({ stat }: { stat: DvpStat }) {
  const statusCol = dvpStatusColor(stat.status);

  return (
    <div className="bg-black px-2.5 py-2 hover:bg-orange-400/[0.02] transition-colors">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[6px] font-mono text-white/25 uppercase tracking-wider">
          {stat.label}
        </span>
        <span
          className="text-[6px] font-black font-mono uppercase px-1 py-px"
          style={{
            color: statusCol,
            backgroundColor: stat.status === 'normal'
              ? 'rgba(52,211,153,0.08)' : stat.status === 'elevated'
                ? 'rgba(250,204,21,0.08)' : stat.status === 'stressed'
                  ? 'rgba(251,146,60,0.08)' : 'rgba(248,113,113,0.1)',
          }}
        >
          {stat.status}
        </span>
      </div>
      <div className="text-[12px] font-black font-mono text-white" style={{ color: statusCol }}>
        {stat.value}
      </div>
      <div className="text-[6px] text-white/20 mt-0.5">
        {stat.detail}
      </div>
    </div>
  );
}
