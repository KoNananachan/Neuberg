import { useMarketMaking } from '../../api/hooks/use-market-making';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting helpers ──

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtVol(n: number): string {
  return n.toFixed(1);
}

function fmtSpread(n: number): string {
  return n.toFixed(2);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtInt(n: number): string {
  return n.toLocaleString();
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function trendArrow(n: number): string {
  if (n > 0) return '\u25B2';
  if (n < 0) return '\u25BC';
  return '\u25C6';
}

function qualityColor(score: number): string {
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-violet-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

function qualityBar(score: number): string {
  if (score >= 90) return 'bg-green-400';
  if (score >= 70) return 'bg-violet-400';
  if (score >= 50) return 'bg-yellow-400';
  return 'bg-red-400';
}

function regimeColor(regime: string): string {
  const r = regime.toUpperCase();
  if (r === 'LOW') return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (r === 'NORMAL') return 'bg-violet-400/20 text-violet-400 border-violet-400/30';
  if (r === 'HIGH') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  if (r === 'EXTREME') return 'bg-red-400/20 text-red-400 border-red-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function complianceColor(status: string): string {
  const s = status.toUpperCase();
  if (s === 'COMPLIANT' || s === 'PASS') return 'text-green-400';
  if (s === 'WARNING') return 'text-yellow-400';
  if (s === 'VIOLATION' || s === 'FAIL') return 'text-red-400';
  return 'text-neutral-500';
}

// ── Interfaces ──

interface MarketMakingSummary {
  totalMarketMakers: number;
  avgMarketSpread: number;
  totalDailyVolume: number;
  avgQuoteQuality: number;
  topMaker: string;
}

interface TopMarketMaker {
  name: string;
  rank: number;
  marketShare: number;
  dailyVolume: number;
  avgSpread: number;
  change1w: number;
}

interface SpreadAnalysis {
  assetClass: string;
  bidAskSpread: number;
  effectiveSpread: number;
  realizedSpread: number;
  change1d: number;
  percentile90d: number;
}

interface DepthLevel {
  level: number;
  bidSize: number;
  askSize: number;
  bidPrice: number;
  askPrice: number;
  cumulativeBid: number;
  cumulativeAsk: number;
}

interface QuoteQualityMetric {
  metric: string;
  value: number;
  unit: string;
  benchmark: number;
  trend: number;
}

interface DesignatedMM {
  maker: string;
  security: string;
  obligation: string;
  maxSpread: number;
  actualSpread: number;
  compliance: string;
}

interface VolatilityRegime {
  regime: string;
  spreadImpact: number;
  depthImpact: number;
  quoteFrequency: number;
  inventoryRisk: number;
}

interface RegulatoryMetric {
  metric: string;
  value: string;
  threshold: string;
  status: string;
  lastCheck: string;
}

// ── Main Panel ──

export function MarketMakingPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useMarketMaking();

  const summary = data?.summary as MarketMakingSummary | undefined;
  const topMakers = data?.topMakers as TopMarketMaker[] | undefined;
  const spreadAnalysis = data?.spreadAnalysis as SpreadAnalysis[] | undefined;
  const depthOfBook = data?.depthOfBook as DepthLevel[] | undefined;
  const quoteQuality = data?.quoteQuality as QuoteQualityMetric[] | undefined;
  const designatedMMs = data?.designatedMMs as DesignatedMM[] | undefined;
  const volatilityRegimes = data?.volatilityRegimes as VolatilityRegime[] | undefined;
  const regulatoryMetrics = data?.regulatoryMetrics as RegulatoryMetric[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-violet-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-violet-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-violet-400">
            {tr(t, 'panelMarketMaking', 'Market Making')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-violet-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-violet-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'panelMarketMakingNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} t={t} />}
            {topMakers && topMakers.length > 0 && (
              <TopMakersSection makers={topMakers} t={t} />
            )}
            {spreadAnalysis && spreadAnalysis.length > 0 && (
              <SpreadAnalysisSection spreads={spreadAnalysis} t={t} />
            )}
            {depthOfBook && depthOfBook.length > 0 && (
              <DepthOfBookSection levels={depthOfBook} t={t} />
            )}
            {quoteQuality && quoteQuality.length > 0 && (
              <QuoteQualitySection metrics={quoteQuality} t={t} />
            )}
            {designatedMMs && designatedMMs.length > 0 && (
              <DesignatedMMSection assignments={designatedMMs} t={t} />
            )}
            {volatilityRegimes && volatilityRegimes.length > 0 && (
              <VolatilityRegimeSection regimes={volatilityRegimes} t={t} />
            )}
            {regulatoryMetrics && regulatoryMetrics.length > 0 && (
              <RegulatoryMetricsSection metrics={regulatoryMetrics} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({
  summary,
  t,
}: {
  summary: MarketMakingSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-violet-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-violet-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelMarketMakingTotalMMs', 'Total MMs')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {summary.totalMarketMakers}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelMarketMakingAvgSpread', 'Avg Spread')}
          </div>
          <div className="text-[10px] font-mono font-bold text-violet-400">
            {fmtSpread(summary.avgMarketSpread)}bp
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelMarketMakingDailyVol', 'Daily Vol ($B)')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtVol(summary.totalDailyVolume)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelMarketMakingQuoteQual', 'Quote Quality')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${qualityColor(summary.avgQuoteQuality)}`}>
            {fmtPct(summary.avgQuoteQuality)}%
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelMarketMakingTopMaker', 'Top Maker')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white truncate">
            {summary.topMaker}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Top Market Makers Section ──

function TopMakersSection({
  makers,
  t,
}: {
  makers: TopMarketMaker[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-violet-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelMarketMakingTopMakers', 'Top Market Makers')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[24px_1fr_56px_64px_56px_48px] gap-0 px-2 py-0.5 border-b border-violet-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMarketMakingRank', '#')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMarketMakingName', 'Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMarketMakingMktShare', 'Mkt %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMarketMakingVolB', 'Vol $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMarketMakingSpread', 'Spread')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelMarketMaking1wChg', '1W Chg')}
        </span>
      </div>

      {/* Rows */}
      {makers.map((maker, i) => (
        <div
          key={`${maker.name}-${i}`}
          className="grid grid-cols-[24px_1fr_56px_64px_56px_48px] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono text-neutral-500">
            {maker.rank}
          </span>
          <span className="text-[8px] font-mono font-bold text-violet-400 truncate">
            {maker.name}
          </span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-10 h-1.5 bg-neutral-800 relative">
              <div
                className="absolute top-0 left-0 h-full bg-violet-400"
                style={{ width: `${Math.min(maker.marketShare, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono font-bold text-white w-8 text-right">
              {fmtPct(maker.marketShare)}
            </span>
          </div>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtVol(maker.dailyVolume)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtSpread(maker.avgSpread)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(maker.change1w)}`}>
            {fmtChg(maker.change1w)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Spread Analysis Section ──

function SpreadAnalysisSection({
  spreads,
  t,
}: {
  spreads: SpreadAnalysis[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-violet-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelMarketMakingSpreadAnalysis', 'Spread Analysis')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_56px_48px_48px_56px] gap-0 px-2 py-0.5 border-b border-violet-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMarketMakingAssetClass', 'Asset Class')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMarketMakingBidAsk', 'Bid-Ask')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMarketMakingEffective', 'Effective')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMarketMakingRealized', 'Realized')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMarketMaking1dChg', '\u03941D')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMarketMaking90dPctl', '90D %ile')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelMarketMakingRange', 'Range')}
        </span>
      </div>

      {/* Rows */}
      {spreads.map((s) => (
        <div
          key={s.assetClass}
          className="grid grid-cols-[1fr_56px_56px_56px_48px_48px_56px] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-violet-400 truncate">
            {s.assetClass}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtSpread(s.bidAskSpread)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtSpread(s.effectiveSpread)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtSpread(s.realizedSpread)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s.change1d)}`}>
            {fmtChg(s.change1d)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${qualityColor(100 - s.percentile90d)}`}>
            {s.percentile90d}
          </span>
          <div className="flex items-center gap-1 justify-end pr-2">
            <div className="w-14 h-1.5 bg-neutral-800 relative">
              <div
                className={`absolute top-0 left-0 h-full ${qualityBar(100 - s.percentile90d)}`}
                style={{ width: `${Math.min(s.percentile90d, 100)}%` }}
              />
              <div
                className="absolute top-[-1px] w-[2px] h-[8px] bg-white"
                style={{ left: `${Math.min(s.percentile90d, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Depth of Book Section ──

function DepthOfBookSection({
  levels,
  t,
}: {
  levels: DepthLevel[];
  t: ReturnType<typeof useT>;
}) {
  const maxCumulative = Math.max(
    ...levels.map((l) => Math.max(l.cumulativeBid, l.cumulativeAsk)),
    1,
  );

  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-violet-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelMarketMakingDepthOfBook', 'Depth of Book')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[32px_1fr_56px_56px_1fr] gap-0 px-2 py-0.5 border-b border-violet-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMarketMakingLevel', 'Lvl')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMarketMakingBidSide', 'Bid')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'panelMarketMakingBidPx', 'Bid Px')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'panelMarketMakingAskPx', 'Ask Px')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMarketMakingAskSide', 'Ask')}
        </span>
      </div>

      {/* Rows */}
      {levels.map((level) => {
        const bidPct = (level.cumulativeBid / maxCumulative) * 100;
        const askPct = (level.cumulativeAsk / maxCumulative) * 100;
        return (
          <div
            key={level.level}
            className="grid grid-cols-[32px_1fr_56px_56px_1fr] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono text-neutral-500">
              {level.level}
            </span>
            {/* Bid depth bar (right-aligned) */}
            <div className="flex items-center gap-1 justify-end">
              <span className="text-[7px] font-mono text-neutral-500">
                {fmtInt(level.bidSize)}
              </span>
              <div className="w-full max-w-[80px] h-2 bg-neutral-900 relative">
                <div
                  className="absolute top-0 right-0 h-full bg-green-400/40"
                  style={{ width: `${bidPct}%` }}
                />
              </div>
            </div>
            <span className="text-[8px] font-mono font-bold text-green-400 text-center">
              {level.bidPrice.toFixed(2)}
            </span>
            <span className="text-[8px] font-mono font-bold text-red-400 text-center">
              {level.askPrice.toFixed(2)}
            </span>
            {/* Ask depth bar (left-aligned) */}
            <div className="flex items-center gap-1">
              <div className="w-full max-w-[80px] h-2 bg-neutral-900 relative">
                <div
                  className="absolute top-0 left-0 h-full bg-red-400/40"
                  style={{ width: `${askPct}%` }}
                />
              </div>
              <span className="text-[7px] font-mono text-neutral-500">
                {fmtInt(level.askSize)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Quote Quality Section ──

function QuoteQualitySection({
  metrics,
  t,
}: {
  metrics: QuoteQualityMetric[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-violet-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelMarketMakingQuoteQuality', 'Quote Quality Metrics')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_40px_64px_32px] gap-0 px-2 py-0.5 border-b border-violet-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMarketMakingMetric', 'Metric')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMarketMakingValue', 'Value')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMarketMakingUnit', 'Unit')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMarketMakingBenchmark', 'Benchmark')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelMarketMakingTrend', 'Trend')}
        </span>
      </div>

      {/* Rows */}
      {metrics.map((m, i) => (
        <div
          key={`${m.metric}-${i}`}
          className="grid grid-cols-[1fr_64px_40px_64px_32px] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {m.metric}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${qualityColor(m.value)}`}>
            {fmtPct(m.value)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {m.unit}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtPct(m.benchmark)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(m.trend)}`}>
            {trendArrow(m.trend)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Designated Market Maker Assignments Section ──

function DesignatedMMSection({
  assignments,
  t,
}: {
  assignments: DesignatedMM[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-violet-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelMarketMakingDesignatedMM', 'Designated MM Assignments')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-violet-400/10">
              <th className="text-left px-2 py-1 font-normal text-[7px]">
                {tr(t, 'panelMarketMakingMaker', 'Maker')}
              </th>
              <th className="text-left px-2 py-1 font-normal text-[7px]">
                {tr(t, 'panelMarketMakingSecurity', 'Security')}
              </th>
              <th className="text-left px-2 py-1 font-normal text-[7px]">
                {tr(t, 'panelMarketMakingObligation', 'Obligation')}
              </th>
              <th className="text-right px-2 py-1 font-normal text-[7px]">
                {tr(t, 'panelMarketMakingMaxSpread', 'Max Sprd')}
              </th>
              <th className="text-right px-2 py-1 font-normal text-[7px]">
                {tr(t, 'panelMarketMakingActualSpread', 'Actual')}
              </th>
              <th className="text-right px-2 py-1 font-normal text-[7px]">
                {tr(t, 'panelMarketMakingCompliance', 'Status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a, i) => (
              <tr
                key={`${a.maker}-${a.security}-${i}`}
                className="border-b border-neutral-900 hover:bg-violet-400/[0.02]"
              >
                <td className="px-2 py-1 text-violet-400 font-bold">{a.maker}</td>
                <td className="px-2 py-1 text-neutral-400">{a.security}</td>
                <td className="px-2 py-1 text-neutral-500">{a.obligation}</td>
                <td className="px-2 py-1 text-right text-neutral-400">
                  {fmtSpread(a.maxSpread)}
                </td>
                <td className="px-2 py-1 text-right text-white font-bold">
                  {fmtSpread(a.actualSpread)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${complianceColor(a.compliance)}`}>
                  {a.compliance}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Volatility Regime Impact Section ──

function VolatilityRegimeSection({
  regimes,
  t,
}: {
  regimes: VolatilityRegime[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-violet-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelMarketMakingVolRegime', 'Volatility Regime Impact')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[72px_56px_56px_64px_56px] gap-0 px-2 py-0.5 border-b border-violet-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMarketMakingRegime', 'Regime')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMarketMakingSpreadImpact', 'Sprd Imp')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMarketMakingDepthImpact', 'Depth Imp')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMarketMakingQuoteFreq', 'Quote Freq')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelMarketMakingInvRisk', 'Inv Risk')}
        </span>
      </div>

      {/* Rows */}
      {regimes.map((r) => (
        <div
          key={r.regime}
          className="grid grid-cols-[72px_56px_56px_64px_56px] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="py-0.5">
            <span
              className={`inline-block px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${regimeColor(r.regime)}`}
            >
              {r.regime}
            </span>
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(r.spreadImpact)}`}>
            {fmtChg(r.spreadImpact)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(-r.depthImpact)}`}>
            {fmtChg(r.depthImpact)}%
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtInt(r.quoteFrequency)}/s
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(r.inventoryRisk)}`}>
            {fmtPct(r.inventoryRisk)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Regulatory Metrics Section ──

function RegulatoryMetricsSection({
  metrics,
  t,
}: {
  metrics: RegulatoryMetric[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-violet-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelMarketMakingRegulatory', 'Regulatory Metrics')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-violet-400/10">
              <th className="text-left px-2 py-1 font-normal text-[7px]">
                {tr(t, 'panelMarketMakingRegMetric', 'Metric')}
              </th>
              <th className="text-right px-2 py-1 font-normal text-[7px]">
                {tr(t, 'panelMarketMakingRegValue', 'Value')}
              </th>
              <th className="text-right px-2 py-1 font-normal text-[7px]">
                {tr(t, 'panelMarketMakingRegThreshold', 'Threshold')}
              </th>
              <th className="text-right px-2 py-1 font-normal text-[7px]">
                {tr(t, 'panelMarketMakingRegStatus', 'Status')}
              </th>
              <th className="text-right px-2 py-1 font-normal text-[7px]">
                {tr(t, 'panelMarketMakingRegLastCheck', 'Last Check')}
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => (
              <tr
                key={`${m.metric}-${i}`}
                className="border-b border-neutral-900 hover:bg-violet-400/[0.02]"
              >
                <td className="px-2 py-1 text-white font-bold">{m.metric}</td>
                <td className="px-2 py-1 text-right text-white font-bold">{m.value}</td>
                <td className="px-2 py-1 text-right text-neutral-400">{m.threshold}</td>
                <td className={`px-2 py-1 text-right font-bold ${complianceColor(m.status)}`}>
                  {m.status}
                </td>
                <td className="px-2 py-1 text-right text-neutral-500">{m.lastCheck}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
