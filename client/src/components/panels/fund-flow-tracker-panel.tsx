import { useFundFlowTracker } from '../../api/hooks/use-fund-flow-tracker';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// -- Formatting helpers --

function fmtFlow(n: number): string {
  return n.toFixed(1);
}

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtBn(n: number): string {
  return n.toFixed(2);
}

// -- Color helpers --

function flowColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function trendArrow(n: number): string {
  if (n > 0) return '\u25B2';
  if (n < 0) return '\u25BC';
  return '\u25C6';
}

function momentumColor(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function momentumBar(score: number): string {
  if (score >= 70) return 'bg-green-400';
  if (score >= 40) return 'bg-yellow-400';
  return 'bg-red-400';
}

function sentimentColor(sentiment: string): string {
  const s = sentiment.toUpperCase();
  if (s === 'BULLISH') return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (s === 'BEARISH') return 'bg-red-400/20 text-red-400 border-red-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

// -- Interfaces --

interface FlowSummary {
  totalWeeklyFlows: number;
  equityFlows: number;
  bondFlows: number;
  moneyMarketFlows: number;
  topCategory: string;
}

interface CategoryFlow {
  category: string;
  flow1w: number;
  flow1m: number;
  flow3m: number;
  flowYtd: number;
  aum: number;
}

interface TopFlow {
  name: string;
  ticker: string;
  flow1w: number;
  flowPctAum: number;
  aum: number;
  category: string;
}

interface EtfCreationRedemption {
  ticker: string;
  name: string;
  sharesCreated: number;
  sharesRedeemed: number;
  netShares: number;
  flowBn: number;
}

interface SectorRotation {
  sector: string;
  flow1w: number;
  flow1m: number;
  relativeFlow: number;
  trend: number;
}

interface GeoFlow {
  region: string;
  flow1w: number;
  flow1m: number;
  flowPctAum: number;
  trend: number;
}

interface FlowMomentum {
  category: string;
  score: number;
  streak: number;
  zScore: number;
  signal: string;
}

interface LeveragedSentiment {
  category: string;
  leveragedFlow: number;
  inverseFlow: number;
  ratio: number;
  sentiment: string;
}

// -- Main Panel --

export function FundFlowTrackerPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useFundFlowTracker();

  const summary = data?.summary as FlowSummary | undefined;
  const categoryFlows = data?.categoryFlows as CategoryFlow[] | undefined;
  const topInflows = data?.topInflows as TopFlow[] | undefined;
  const topOutflows = data?.topOutflows as TopFlow[] | undefined;
  const etfCreationRedemption = data?.etfCreationRedemption as EtfCreationRedemption[] | undefined;
  const sectorRotation = data?.sectorRotation as SectorRotation[] | undefined;
  const geoFlows = data?.geoFlows as GeoFlow[] | undefined;
  const flowMomentum = data?.flowMomentum as FlowMomentum[] | undefined;
  const leveragedSentiment = data?.leveragedSentiment as LeveragedSentiment[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-green-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-green-400">
            {tr(t, 'panelFundFlowTracker', 'Fund Flow Tracker')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-green-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-green-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'panelFundFlowTrackerNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} t={t} />}
            {categoryFlows && categoryFlows.length > 0 && (
              <CategoryFlowsSection flows={categoryFlows} t={t} />
            )}
            {topInflows && topInflows.length > 0 && (
              <TopFlowsSection flows={topInflows} t={t} direction="inflow" />
            )}
            {topOutflows && topOutflows.length > 0 && (
              <TopFlowsSection flows={topOutflows} t={t} direction="outflow" />
            )}
            {etfCreationRedemption && etfCreationRedemption.length > 0 && (
              <EtfCreationRedemptionSection entries={etfCreationRedemption} t={t} />
            )}
            {sectorRotation && sectorRotation.length > 0 && (
              <SectorRotationSection sectors={sectorRotation} t={t} />
            )}
            {geoFlows && geoFlows.length > 0 && (
              <GeoFlowsSection flows={geoFlows} t={t} />
            )}
            {flowMomentum && flowMomentum.length > 0 && (
              <FlowMomentumSection items={flowMomentum} t={t} />
            )}
            {leveragedSentiment && leveragedSentiment.length > 0 && (
              <LeveragedSentimentSection items={leveragedSentiment} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -- Summary Bar --

function SummaryBar({
  summary,
  t,
}: {
  summary: FlowSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-green-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-green-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelFundFlowTrackerWeeklyTotal', 'Weekly Total ($B)')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${flowColor(summary.totalWeeklyFlows)}`}>
            {fmtChg(summary.totalWeeklyFlows)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelFundFlowTrackerEquity', 'Equity ($B)')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${flowColor(summary.equityFlows)}`}>
            {fmtChg(summary.equityFlows)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelFundFlowTrackerBond', 'Bond ($B)')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${flowColor(summary.bondFlows)}`}>
            {fmtChg(summary.bondFlows)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelFundFlowTrackerMMkt', 'Money Mkt ($B)')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${flowColor(summary.moneyMarketFlows)}`}>
            {fmtChg(summary.moneyMarketFlows)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelFundFlowTrackerTopCat', 'Top Category')}
          </div>
          <div className="text-[10px] font-mono font-bold text-green-400 truncate">
            {summary.topCategory}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Weekly Flows by Category (1W/1M/3M/YTD) --

function CategoryFlowsSection({
  flows,
  t,
}: {
  flows: CategoryFlow[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-green-400/30">
      <div className="px-3 py-1 border-b border-green-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelFundFlowTrackerCategoryFlows', 'Flows by Category')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_56px_56px_64px] gap-0 px-2 py-0.5 border-b border-green-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelFundFlowTrackerCategory', 'Category')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTracker1W', '1W $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTracker1M', '1M $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTracker3M', '3M $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTrackerYTD', 'YTD $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelFundFlowTrackerAUM', 'AUM $B')}
        </span>
      </div>

      {/* Rows */}
      {flows.map((flow) => (
        <div
          key={flow.category}
          className="grid grid-cols-[1fr_56px_56px_56px_56px_64px] gap-0 px-2 py-[3px] border-b border-green-400/5 hover:bg-green-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-green-400 truncate">
            {flow.category}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(flow.flow1w)}`}>
            {fmtChg(flow.flow1w)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(flow.flow1m)}`}>
            {fmtChg(flow.flow1m)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(flow.flow3m)}`}>
            {fmtChg(flow.flow3m)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(flow.flowYtd)}`}>
            {fmtChg(flow.flowYtd)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right pr-2">
            {fmtBn(flow.aum)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Top Inflows / Top Outflows Table --

function TopFlowsSection({
  flows,
  t,
  direction,
}: {
  flows: TopFlow[];
  t: ReturnType<typeof useT>;
  direction: 'inflow' | 'outflow';
}) {
  const isInflow = direction === 'inflow';
  const titleKey = isInflow ? 'panelFundFlowTrackerTopInflows' : 'panelFundFlowTrackerTopOutflows';
  const titleFallback = isInflow ? 'Top Inflows' : 'Top Outflows';

  return (
    <div className="border-b border-green-400/30">
      <div className="px-3 py-1 border-b border-green-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, titleKey, titleFallback)}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_56px_48px_56px_64px] gap-0 px-2 py-0.5 border-b border-green-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelFundFlowTrackerName', 'Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTrackerTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTrackerFlow1W', '1W $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTrackerFlowPct', '% AUM')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTrackerAUM', 'AUM $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelFundFlowTrackerCat', 'Category')}
        </span>
      </div>

      {/* Rows */}
      {flows.map((flow, i) => (
        <div
          key={`${flow.ticker}-${i}`}
          className="grid grid-cols-[1fr_48px_56px_48px_56px_64px] gap-0 px-2 py-[3px] border-b border-green-400/5 hover:bg-green-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {flow.name}
          </span>
          <span className="text-[8px] font-mono font-bold text-green-400 text-right">
            {flow.ticker}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(flow.flow1w)}`}>
            {fmtChg(flow.flow1w)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(flow.flowPctAum)}`}>
            {fmtChg(flow.flowPctAum)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtBn(flow.aum)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2 truncate">
            {flow.category}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- ETF Creation / Redemption --

function EtfCreationRedemptionSection({
  entries,
  t,
}: {
  entries: EtfCreationRedemption[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-green-400/30">
      <div className="px-3 py-1 border-b border-green-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelFundFlowTrackerEtfCreation', 'ETF Creation / Redemption')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[48px_1fr_56px_56px_56px_56px] gap-0 px-2 py-0.5 border-b border-green-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelFundFlowTrackerTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelFundFlowTrackerName', 'Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTrackerCreated', 'Created')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTrackerRedeemed', 'Redeemed')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTrackerNet', 'Net')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelFundFlowTrackerFlowBn', 'Flow $B')}
        </span>
      </div>

      {/* Rows */}
      {entries.map((entry, i) => (
        <div
          key={`${entry.ticker}-${i}`}
          className="grid grid-cols-[48px_1fr_56px_56px_56px_56px] gap-0 px-2 py-[3px] border-b border-green-400/5 hover:bg-green-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-green-400">
            {entry.ticker}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {entry.name}
          </span>
          <span className="text-[8px] font-mono text-green-400 text-right">
            {fmtFlow(entry.sharesCreated)}
          </span>
          <span className="text-[8px] font-mono text-red-400 text-right">
            {fmtFlow(entry.sharesRedeemed)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(entry.netShares)}`}>
            {fmtChg(entry.netShares)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${flowColor(entry.flowBn)}`}>
            {fmtChg(entry.flowBn)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Sector Rotation Flows --

function SectorRotationSection({
  sectors,
  t,
}: {
  sectors: SectorRotation[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-green-400/30">
      <div className="px-3 py-1 border-b border-green-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelFundFlowTrackerSectorRotation', 'Sector Rotation')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_64px_32px] gap-0 px-2 py-0.5 border-b border-green-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelFundFlowTrackerSector', 'Sector')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTracker1W', '1W $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTracker1M', '1M $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTrackerRelFlow', 'Rel Flow')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelFundFlowTrackerTrend', 'Trend')}
        </span>
      </div>

      {/* Rows */}
      {sectors.map((sector) => (
        <div
          key={sector.sector}
          className="grid grid-cols-[1fr_56px_56px_64px_32px] gap-0 px-2 py-[3px] border-b border-green-400/5 hover:bg-green-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-green-400 truncate">
            {sector.sector}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(sector.flow1w)}`}>
            {fmtChg(sector.flow1w)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(sector.flow1m)}`}>
            {fmtChg(sector.flow1m)}
          </span>
          {/* Relative flow bar */}
          <div className="flex items-center gap-1 justify-end">
            <div className="w-12 h-1.5 bg-neutral-800 relative">
              <div
                className={`absolute top-0 h-full ${sector.relativeFlow >= 0 ? 'bg-green-400' : 'bg-red-400'}`}
                style={{
                  width: `${Math.min(Math.abs(sector.relativeFlow), 100)}%`,
                  left: sector.relativeFlow >= 0 ? '50%' : undefined,
                  right: sector.relativeFlow < 0 ? '50%' : undefined,
                }}
              />
              <div className="absolute top-0 left-1/2 w-[1px] h-full bg-neutral-600" />
            </div>
            <span className={`text-[8px] font-mono font-bold w-8 text-right ${flowColor(sector.relativeFlow)}`}>
              {fmtChg(sector.relativeFlow)}
            </span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${flowColor(sector.trend)}`}>
            {trendArrow(sector.trend)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Geographic Flows --

function GeoFlowsSection({
  flows,
  t,
}: {
  flows: GeoFlow[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-green-400/30">
      <div className="px-3 py-1 border-b border-green-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelFundFlowTrackerGeoFlows', 'Geographic Flows')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_48px_32px] gap-0 px-2 py-0.5 border-b border-green-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelFundFlowTrackerRegion', 'Region')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTracker1W', '1W $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTracker1M', '1M $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTrackerFlowPct', '% AUM')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelFundFlowTrackerTrend', 'Trend')}
        </span>
      </div>

      {/* Rows */}
      {flows.map((flow) => (
        <div
          key={flow.region}
          className="grid grid-cols-[1fr_56px_56px_48px_32px] gap-0 px-2 py-[3px] border-b border-green-400/5 hover:bg-green-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-green-400 truncate">
            {flow.region}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(flow.flow1w)}`}>
            {fmtChg(flow.flow1w)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(flow.flow1m)}`}>
            {fmtChg(flow.flow1m)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(flow.flowPctAum)}`}>
            {fmtChg(flow.flowPctAum)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${flowColor(flow.trend)}`}>
            {trendArrow(flow.trend)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Flow Momentum --

function FlowMomentumSection({
  items,
  t,
}: {
  items: FlowMomentum[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-green-400/30">
      <div className="px-3 py-1 border-b border-green-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelFundFlowTrackerMomentum', 'Flow Momentum')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_48px_48px_64px] gap-0 px-2 py-0.5 border-b border-green-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelFundFlowTrackerCategory', 'Category')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTrackerScore', 'Score')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTrackerStreak', 'Streak')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTrackerZScore', 'Z-Score')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelFundFlowTrackerSignal', 'Signal')}
        </span>
      </div>

      {/* Rows */}
      {items.map((item) => (
        <div
          key={item.category}
          className="grid grid-cols-[1fr_48px_48px_48px_64px] gap-0 px-2 py-[3px] border-b border-green-400/5 hover:bg-green-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-green-400 truncate">
            {item.category}
          </span>
          {/* Score with bar */}
          <div className="flex items-center gap-1 justify-end">
            <div className="w-8 h-1.5 bg-neutral-800 relative">
              <div
                className={`absolute top-0 left-0 h-full ${momentumBar(item.score)}`}
                style={{ width: `${Math.min(item.score, 100)}%` }}
              />
            </div>
            <span className={`text-[8px] font-mono font-bold ${momentumColor(item.score)}`}>
              {item.score}
            </span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(item.streak)}`}>
            {fmtChg(item.streak)}w
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(item.zScore)}`}>
            {fmtChg(item.zScore)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right pr-2 uppercase">
            {item.signal}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Leveraged / Inverse Sentiment --

function LeveragedSentimentSection({
  items,
  t,
}: {
  items: LeveragedSentiment[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-green-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelFundFlowTrackerLevInverse', 'Leveraged / Inverse Sentiment')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_48px_64px] gap-0 px-2 py-0.5 border-b border-green-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelFundFlowTrackerCategory', 'Category')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTrackerLevFlow', 'Lev $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTrackerInvFlow', 'Inv $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelFundFlowTrackerRatio', 'Ratio')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelFundFlowTrackerSentiment', 'Sentiment')}
        </span>
      </div>

      {/* Rows */}
      {items.map((item) => (
        <div
          key={item.category}
          className="grid grid-cols-[1fr_56px_56px_48px_64px] gap-0 px-2 py-[3px] border-b border-green-400/5 hover:bg-green-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-green-400 truncate">
            {item.category}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(item.leveragedFlow)}`}>
            {fmtChg(item.leveragedFlow)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(item.inverseFlow)}`}>
            {fmtChg(item.inverseFlow)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(item.ratio)}x
          </span>
          <span className="text-right pr-2">
            <span
              className={`inline-block px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${sentimentColor(item.sentiment)}`}
            >
              {item.sentiment}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
