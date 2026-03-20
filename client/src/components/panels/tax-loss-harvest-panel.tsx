import { useTaxLossHarvest } from '../../api/hooks/use-tax-loss-harvest';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

// -- Formatting helpers --

function fmtDollar(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

// -- Color helpers --

function lossColor(n: number): string {
  if (n <= -20) return 'text-red-400';
  if (n <= -10) return 'text-yellow-400';
  if (n < 0) return 'text-neutral-400';
  return 'text-green-400';
}

function riskColor(risk: string): string {
  const r = risk.toUpperCase();
  if (r === 'HIGH') return 'bg-red-400/20 text-red-400 border-red-400/30';
  if (r === 'MEDIUM' || r === 'MODERATE') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  if (r === 'LOW') return 'bg-green-400/20 text-green-400 border-green-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function savingsColor(n: number): string {
  if (n >= 5000) return 'text-emerald-400';
  if (n >= 1000) return 'text-emerald-400/80';
  return 'text-neutral-400';
}

function exposureChangeColor(n: number): string {
  if (Math.abs(n) > 5) return 'text-yellow-400';
  if (Math.abs(n) > 2) return 'text-neutral-400';
  return 'text-green-400';
}

// -- Interfaces --

interface ProjectionSummary {
  totalUnrealizedLoss: number;
  totalUnrealizedGain: number;
  netGainLoss: number;
  estimatedTaxSavings: number;
  harvestableCount: number;
}

interface HarvestCandidate {
  ticker: string;
  lossPct: number;
  lossDollar: number;
  holdingPeriod: string;
  washSaleRisk: string;
}

interface TopOpportunity {
  ticker: string;
  estimatedSavings: number;
  lossAmount: number;
  taxRate: number;
  rank: number;
}

interface ReplacementPair {
  sellTicker: string;
  buyTicker: string;
  correlation: number;
  expenseRatioDiff: number;
  trackingError: number;
}

interface WashSaleDate {
  ticker: string;
  soldDate: string;
  washSaleEnd: string;
  daysRemaining: number;
  status: string;
}

interface CapitalGainsOffset {
  category: string;
  shortTermGains: number;
  longTermGains: number;
  harvestableOffset: number;
  netAfterHarvest: number;
}

interface SectorExposure {
  sector: string;
  currentWeight: number;
  postHarvestWeight: number;
  change: number;
  targetWeight: number;
}

// -- Main Panel --

export function TaxLossHarvestPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useTaxLossHarvest();

  const summary = data?.summary as ProjectionSummary | undefined;
  const candidates = data?.candidates as HarvestCandidate[] | undefined;
  const opportunities = data?.opportunities as TopOpportunity[] | undefined;
  const replacements = data?.replacements as ReplacementPair[] | undefined;
  const washSaleDates = data?.washSaleDates as WashSaleDate[] | undefined;
  const capitalGains = data?.capitalGains as CapitalGainsOffset[] | undefined;
  const sectorExposure = data?.sectorExposure as SectorExposure[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-emerald-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-emerald-400">
            {tr(t, 'panelTaxLossHarvest', 'Tax Loss Harvest')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-emerald-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'panelTaxLossHarvestNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} t={t} />}
            {candidates && candidates.length > 0 && (
              <CandidatesSection candidates={candidates} t={t} />
            )}
            {opportunities && opportunities.length > 0 && (
              <OpportunitiesSection opportunities={opportunities} t={t} />
            )}
            {replacements && replacements.length > 0 && (
              <ReplacementsSection replacements={replacements} t={t} />
            )}
            {washSaleDates && washSaleDates.length > 0 && (
              <WashSaleCalendarSection dates={washSaleDates} t={t} />
            )}
            {capitalGains && capitalGains.length > 0 && (
              <CapitalGainsSection gains={capitalGains} t={t} />
            )}
            {sectorExposure && sectorExposure.length > 0 && (
              <SectorExposureSection sectors={sectorExposure} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -- Year-End Projection Summary Bar --

function SummaryBar({
  summary,
  t,
}: {
  summary: ProjectionSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-emerald-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-emerald-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelTaxLossHarvestUnrealizedLoss', 'Unrealized Loss')}
          </div>
          <div className="text-[10px] font-mono font-bold text-red-400">
            {fmtDollar(summary.totalUnrealizedLoss)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelTaxLossHarvestUnrealizedGain', 'Unrealized Gain')}
          </div>
          <div className="text-[10px] font-mono font-bold text-green-400">
            {fmtDollar(summary.totalUnrealizedGain)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelTaxLossHarvestNetGL', 'Net G/L')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${summary.netGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmtDollar(summary.netGainLoss)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelTaxLossHarvestEstSavings', 'Est. Tax Savings')}
          </div>
          <div className="text-[10px] font-mono font-bold text-emerald-400">
            {fmtDollar(summary.estimatedTaxSavings)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelTaxLossHarvestCandidates', 'Candidates')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {summary.harvestableCount}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Harvest Candidates Section --

function CandidatesSection({
  candidates,
  t,
}: {
  candidates: HarvestCandidate[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-emerald-400/30">
      <div className="px-3 py-1 border-b border-emerald-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelTaxLossHarvestCandidatesTable', 'Harvest Candidates')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_72px_72px_64px] gap-0 px-2 py-0.5 border-b border-emerald-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelTaxLossHarvestTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelTaxLossHarvestLossPct', 'Loss %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelTaxLossHarvestLossDollar', 'Loss $')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelTaxLossHarvestHolding', 'Holding')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelTaxLossHarvestWashRisk', 'Wash Risk')}
        </span>
      </div>

      {/* Rows */}
      {candidates.map((c, i) => (
        <div
          key={`${c.ticker}-${i}`}
          className="grid grid-cols-[1fr_56px_72px_72px_64px] gap-0 px-2 py-[3px] border-b border-emerald-400/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-emerald-400 truncate">
            {c.ticker}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${lossColor(c.lossPct)}`}>
            {fmtChg(c.lossPct)}%
          </span>
          <span className="text-[8px] font-mono font-bold text-red-400 text-right">
            {fmtDollar(c.lossDollar)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {c.holdingPeriod}
          </span>
          <span className="text-right pr-2">
            <span
              className={`inline-block px-1 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${riskColor(c.washSaleRisk)}`}
            >
              {c.washSaleRisk}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Top Opportunities Section --

function OpportunitiesSection({
  opportunities,
  t,
}: {
  opportunities: TopOpportunity[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-emerald-400/30">
      <div className="px-3 py-1 border-b border-emerald-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelTaxLossHarvestTopOpps', 'Top Opportunities')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[32px_1fr_72px_72px_48px] gap-0 px-2 py-0.5 border-b border-emerald-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelTaxLossHarvestRank', '#')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelTaxLossHarvestTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelTaxLossHarvestSavings', 'Savings')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelTaxLossHarvestLossAmt', 'Loss Amt')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelTaxLossHarvestTaxRate', 'Tax %')}
        </span>
      </div>

      {/* Rows */}
      {opportunities.map((o, i) => (
        <div
          key={`${o.ticker}-${i}`}
          className="grid grid-cols-[32px_1fr_72px_72px_48px] gap-0 px-2 py-[3px] border-b border-emerald-400/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-neutral-500">
            {o.rank}
          </span>
          <span className="text-[8px] font-mono font-bold text-emerald-400 truncate">
            {o.ticker}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${savingsColor(o.estimatedSavings)}`}>
            {fmtDollar(o.estimatedSavings)}
          </span>
          <span className="text-[8px] font-mono font-bold text-red-400 text-right">
            {fmtDollar(o.lossAmount)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right pr-2">
            {fmtPct(o.taxRate)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Replacement Pairs Section --

function ReplacementsSection({
  replacements,
  t,
}: {
  replacements: ReplacementPair[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-emerald-400/30">
      <div className="px-3 py-1 border-b border-emerald-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelTaxLossHarvestReplacements', 'Replacement Pairs')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_1fr_56px_64px_56px] gap-0 px-2 py-0.5 border-b border-emerald-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelTaxLossHarvestSell', 'Sell')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelTaxLossHarvestBuy', 'Buy')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelTaxLossHarvestCorr', 'Corr')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelTaxLossHarvestERDiff', 'ER Diff')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelTaxLossHarvestTE', 'TE')}
        </span>
      </div>

      {/* Rows */}
      {replacements.map((r, i) => (
        <div
          key={`${r.sellTicker}-${r.buyTicker}-${i}`}
          className="grid grid-cols-[1fr_1fr_56px_64px_56px] gap-0 px-2 py-[3px] border-b border-emerald-400/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-red-400 truncate">
            {r.sellTicker}
          </span>
          <span className="text-[8px] font-mono font-bold text-emerald-400 truncate">
            {r.buyTicker}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(r.correlation)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtChg(r.expenseRatioDiff)}bp
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right pr-2">
            {fmtPct(r.trackingError)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Wash Sale Calendar Section --

function WashSaleCalendarSection({
  dates,
  t,
}: {
  dates: WashSaleDate[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-emerald-400/30">
      <div className="px-3 py-1 border-b border-emerald-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelTaxLossHarvestWashCalendar', 'Wash Sale Calendar')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_72px_48px_56px] gap-0 px-2 py-0.5 border-b border-emerald-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelTaxLossHarvestTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelTaxLossHarvestSoldDate', 'Sold')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelTaxLossHarvestWashEnd', 'Wash End')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelTaxLossHarvestDaysRem', 'Days')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelTaxLossHarvestStatus', 'Status')}
        </span>
      </div>

      {/* Rows */}
      {dates.map((d, i) => (
        <div
          key={`${d.ticker}-${d.soldDate}-${i}`}
          className="grid grid-cols-[1fr_72px_72px_48px_56px] gap-0 px-2 py-[3px] border-b border-emerald-400/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-emerald-400 truncate">
            {d.ticker}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {d.soldDate}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {d.washSaleEnd}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${d.daysRemaining <= 5 ? 'text-red-400' : d.daysRemaining <= 15 ? 'text-yellow-400' : 'text-neutral-400'}`}>
            {d.daysRemaining}
          </span>
          <span className="text-right pr-2">
            <span
              className={`inline-block px-1 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${d.status.toUpperCase() === 'CLEAR' ? 'bg-green-400/20 text-green-400 border-green-400/30' : d.status.toUpperCase() === 'ACTIVE' ? 'bg-red-400/20 text-red-400 border-red-400/30' : 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30'}`}
            >
              {d.status}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Capital Gains Offset Section --

function CapitalGainsSection({
  gains,
  t,
}: {
  gains: CapitalGainsOffset[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-emerald-400/30">
      <div className="px-3 py-1 border-b border-emerald-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelTaxLossHarvestCapGains', 'Capital Gains Offset')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_64px_72px_72px] gap-0 px-2 py-0.5 border-b border-emerald-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelTaxLossHarvestCategory', 'Category')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelTaxLossHarvestSTGains', 'ST Gains')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelTaxLossHarvestLTGains', 'LT Gains')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelTaxLossHarvestOffset', 'Offset')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelTaxLossHarvestNetAfter', 'Net After')}
        </span>
      </div>

      {/* Rows */}
      {gains.map((g, i) => (
        <div
          key={`${g.category}-${i}`}
          className="grid grid-cols-[1fr_64px_64px_72px_72px] gap-0 px-2 py-[3px] border-b border-emerald-400/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {g.category}
          </span>
          <span className="text-[8px] font-mono font-bold text-green-400 text-right">
            {fmtDollar(g.shortTermGains)}
          </span>
          <span className="text-[8px] font-mono font-bold text-green-400 text-right">
            {fmtDollar(g.longTermGains)}
          </span>
          <span className="text-[8px] font-mono font-bold text-emerald-400 text-right">
            {fmtDollar(g.harvestableOffset)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${g.netAfterHarvest >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmtDollar(g.netAfterHarvest)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Sector Exposure Impact Section --

function SectorExposureSection({
  sectors,
  t,
}: {
  sectors: SectorExposure[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-emerald-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelTaxLossHarvestSectorExposure', 'Sector Exposure Impact')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_48px_56px_64px] gap-0 px-2 py-0.5 border-b border-emerald-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelTaxLossHarvestSector', 'Sector')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelTaxLossHarvestCurrent', 'Current')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelTaxLossHarvestPost', 'Post')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelTaxLossHarvestChg', 'Chg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelTaxLossHarvestTarget', 'Target')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelTaxLossHarvestDrift', 'Drift')}
        </span>
      </div>

      {/* Rows */}
      {sectors.map((s, i) => {
        const drift = s.postHarvestWeight - s.targetWeight;
        return (
          <div
            key={`${s.sector}-${i}`}
            className="grid grid-cols-[1fr_56px_56px_48px_56px_64px] gap-0 px-2 py-[3px] border-b border-emerald-400/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">
              {s.sector}
            </span>
            <span className="text-[8px] font-mono font-bold text-white text-right">
              {fmtPct(s.currentWeight)}%
            </span>
            <span className="text-[8px] font-mono font-bold text-white text-right">
              {fmtPct(s.postHarvestWeight)}%
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${exposureChangeColor(s.change)}`}>
              {fmtChg(s.change)}
            </span>
            <span className="text-[8px] font-mono text-neutral-500 text-right">
              {fmtPct(s.targetWeight)}%
            </span>
            {/* Drift bar */}
            <div className="flex items-center gap-1 justify-end pr-2">
              <div className="w-12 h-1.5 bg-neutral-800 relative">
                <div
                  className={`absolute top-0 h-full ${Math.abs(drift) > 3 ? 'bg-yellow-400' : 'bg-emerald-400'}`}
                  style={{
                    left: drift < 0 ? `${50 + (drift / 10) * 50}%` : '50%',
                    width: `${Math.min(Math.abs(drift) / 10 * 50, 50)}%`,
                  }}
                />
                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-neutral-600" />
              </div>
              <span className={`text-[7px] font-mono font-bold w-8 text-right ${Math.abs(drift) > 3 ? 'text-yellow-400' : 'text-neutral-500'}`}>
                {fmtChg(drift)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
