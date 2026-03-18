import { useDividendCapture } from '../../api/hooks/use-dividend-capture';
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

function fmtPct(n: number): string {
  return n.toFixed(2);
}

function fmtDiv(n: number): string {
  return n.toFixed(4);
}

function fmtRatio(n: number): string {
  return n.toFixed(1);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

// -- Color helpers --

function yieldColor(y: number): string {
  if (y >= 5) return 'text-green-400';
  if (y >= 3) return 'text-yellow-400';
  return 'text-neutral-400';
}

function riskColor(level: string): string {
  const l = level.toUpperCase();
  if (l === 'LOW') return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (l === 'MODERATE') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  if (l === 'HIGH') return 'bg-red-400/20 text-red-400 border-red-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// -- Interfaces --

interface DividendSummary {
  avgYield: number;
  upcomingCount: number;
  specialCount: number;
  aristocratCount: number;
  topSector: string;
}

interface UpcomingExDate {
  ticker: string;
  exDate: string;
  divAmount: number;
  yield: number;
}

interface HighYieldOpportunity {
  ticker: string;
  yield: number;
  exDate: string;
  payoutRatio: number;
  sector: string;
}

interface SpecialDividend {
  ticker: string;
  amount: number;
  exDate: string;
  type: string;
  yield: number;
}

interface DividendAristocrat {
  ticker: string;
  consecutiveYears: number;
  yield: number;
  payoutRatio: number;
}

interface SectorYield {
  sector: string;
  avgYield: number;
  medianYield: number;
  topTicker: string;
  topYield: number;
}

interface CalendarEntry {
  date: string;
  ticker: string;
  event: string;
  amount: number;
}

interface RiskMetric {
  ticker: string;
  cutRisk: string;
  payoutRatio: number;
  debtToEquity: number;
  fcfCoverage: number;
}

// -- Main Panel --

export function DividendCapturePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useDividendCapture();

  const summary = data?.summary as DividendSummary | undefined;
  const upcomingExDates = data?.upcomingExDates as UpcomingExDate[] | undefined;
  const highYield = data?.highYield as HighYieldOpportunity[] | undefined;
  const specialDividends = data?.specialDividends as SpecialDividend[] | undefined;
  const aristocrats = data?.aristocrats as DividendAristocrat[] | undefined;
  const sectorYields = data?.sectorYields as SectorYield[] | undefined;
  const calendar = data?.calendar as CalendarEntry[] | undefined;
  const riskMetrics = data?.riskMetrics as RiskMetric[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-yellow-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-yellow-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-yellow-400">
            {tr(t, 'panelDividendCapture', 'Dividend Capture')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-yellow-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-yellow-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'panelDividendCaptureNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} t={t} />}
            {upcomingExDates && upcomingExDates.length > 0 && (
              <UpcomingExDatesSection exDates={upcomingExDates} t={t} />
            )}
            {highYield && highYield.length > 0 && (
              <HighYieldSection opportunities={highYield} t={t} />
            )}
            {specialDividends && specialDividends.length > 0 && (
              <SpecialDividendsSection specials={specialDividends} t={t} />
            )}
            {aristocrats && aristocrats.length > 0 && (
              <AristocratsSection aristocrats={aristocrats} t={t} />
            )}
            {sectorYields && sectorYields.length > 0 && (
              <SectorYieldsSection sectors={sectorYields} t={t} />
            )}
            {calendar && calendar.length > 0 && (
              <CaptureCalendarSection calendar={calendar} t={t} />
            )}
            {riskMetrics && riskMetrics.length > 0 && (
              <RiskMetricsSection metrics={riskMetrics} t={t} />
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
  summary: DividendSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-yellow-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-yellow-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelDividendCaptureAvgYield', 'Avg Yield')}
          </div>
          <div className="text-[10px] font-mono font-bold text-yellow-400">
            {fmtPct(summary.avgYield)}%
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelDividendCaptureUpcoming', 'Upcoming')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {summary.upcomingCount}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelDividendCaptureSpecials', 'Specials')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {summary.specialCount}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelDividendCaptureAristocrats', 'Aristocrats')}
          </div>
          <div className="text-[10px] font-mono font-bold text-yellow-400">
            {summary.aristocratCount}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelDividendCaptureTopSector', 'Top Sector')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white truncate">
            {summary.topSector}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Upcoming Ex-Dates Section --

function UpcomingExDatesSection({
  exDates,
  t,
}: {
  exDates: UpcomingExDate[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-yellow-400/30">
      <div className="px-3 py-1 border-b border-yellow-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelDividendCaptureExDates', 'Upcoming Ex-Dates')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_64px_56px] gap-0 px-2 py-0.5 border-b border-yellow-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelDividendCaptureTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelDividendCaptureExDate', 'Ex-Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelDividendCaptureDivAmt', 'Div Amt')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelDividendCaptureYield', 'Yield')}
        </span>
      </div>

      {/* Rows */}
      {exDates.map((item, i) => (
        <div
          key={`${item.ticker}-${item.exDate}-${i}`}
          className="grid grid-cols-[1fr_72px_64px_56px] gap-0 px-2 py-[3px] border-b border-yellow-400/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-yellow-400 truncate">
            {item.ticker}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {item.exDate}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            ${fmtDiv(item.divAmount)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${yieldColor(item.yield)}`}>
            {fmtPct(item.yield)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- High Yield Opportunities Section --

function HighYieldSection({
  opportunities,
  t,
}: {
  opportunities: HighYieldOpportunity[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-yellow-400/30">
      <div className="px-3 py-1 border-b border-yellow-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelDividendCaptureHighYield', 'High Yield Opportunities')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_72px_56px_72px] gap-0 px-2 py-0.5 border-b border-yellow-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelDividendCaptureTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelDividendCaptureYield', 'Yield')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelDividendCaptureExDate', 'Ex-Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelDividendCapturePayout', 'Payout')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelDividendCaptureSector', 'Sector')}
        </span>
      </div>

      {/* Rows */}
      {opportunities.map((opp, i) => (
        <div
          key={`${opp.ticker}-${i}`}
          className="grid grid-cols-[1fr_56px_72px_56px_72px] gap-0 px-2 py-[3px] border-b border-yellow-400/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-yellow-400 truncate">
            {opp.ticker}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${yieldColor(opp.yield)}`}>
            {fmtPct(opp.yield)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {opp.exDate}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtRatio(opp.payoutRatio)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2 truncate">
            {opp.sector}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Special Dividends Section --

function SpecialDividendsSection({
  specials,
  t,
}: {
  specials: SpecialDividend[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-yellow-400/30">
      <div className="px-3 py-1 border-b border-yellow-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelDividendCaptureSpecialDiv', 'Special Dividends')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_72px_56px_56px] gap-0 px-2 py-0.5 border-b border-yellow-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelDividendCaptureTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelDividendCaptureAmount', 'Amount')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelDividendCaptureExDate', 'Ex-Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelDividendCaptureType', 'Type')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelDividendCaptureYield', 'Yield')}
        </span>
      </div>

      {/* Rows */}
      {specials.map((s, i) => (
        <div
          key={`${s.ticker}-${s.exDate}-${i}`}
          className="grid grid-cols-[1fr_64px_72px_56px_56px] gap-0 px-2 py-[3px] border-b border-yellow-400/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-yellow-400 truncate">
            {s.ticker}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            ${fmtDiv(s.amount)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {s.exDate}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right uppercase">
            {s.type}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${yieldColor(s.yield)}`}>
            {fmtPct(s.yield)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Dividend Aristocrats Section --

function AristocratsSection({
  aristocrats,
  t,
}: {
  aristocrats: DividendAristocrat[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-yellow-400/30">
      <div className="px-3 py-1 border-b border-yellow-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelDividendCaptureAristocratsTable', 'Dividend Aristocrats')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_64px] gap-0 px-2 py-0.5 border-b border-yellow-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelDividendCaptureTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelDividendCaptureYears', 'Years')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelDividendCaptureYield', 'Yield')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelDividendCapturePayout', 'Payout')}
        </span>
      </div>

      {/* Rows */}
      {aristocrats.map((a, i) => (
        <div
          key={`${a.ticker}-${i}`}
          className="grid grid-cols-[1fr_56px_56px_64px] gap-0 px-2 py-[3px] border-b border-yellow-400/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-yellow-400 truncate">
            {a.ticker}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {a.consecutiveYears}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${yieldColor(a.yield)}`}>
            {fmtPct(a.yield)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right pr-2">
            {fmtRatio(a.payoutRatio)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Sector Yields Section --

function SectorYieldsSection({
  sectors,
  t,
}: {
  sectors: SectorYield[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-yellow-400/30">
      <div className="px-3 py-1 border-b border-yellow-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelDividendCaptureSectorYields', 'Sector Yields')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_64px_56px] gap-0 px-2 py-0.5 border-b border-yellow-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelDividendCaptureSector', 'Sector')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelDividendCaptureAvgYld', 'Avg Yld')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelDividendCaptureMedYld', 'Med Yld')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelDividendCaptureTopName', 'Top Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelDividendCaptureTopYld', 'Top Yld')}
        </span>
      </div>

      {/* Rows */}
      {sectors.map((sec, i) => (
        <div
          key={`${sec.sector}-${i}`}
          className="grid grid-cols-[1fr_56px_56px_64px_56px] gap-0 px-2 py-[3px] border-b border-yellow-400/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-yellow-400 truncate">
            {sec.sector}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${yieldColor(sec.avgYield)}`}>
            {fmtPct(sec.avgYield)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPct(sec.medianYield)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right truncate">
            {sec.topTicker}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${yieldColor(sec.topYield)}`}>
            {fmtPct(sec.topYield)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Capture Calendar Section --

function CaptureCalendarSection({
  calendar,
  t,
}: {
  calendar: CalendarEntry[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-yellow-400/30">
      <div className="px-3 py-1 border-b border-yellow-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelDividendCaptureCalendar', 'Capture Calendar')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[72px_1fr_72px_64px] gap-0 px-2 py-0.5 border-b border-yellow-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelDividendCaptureDate', 'Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelDividendCaptureTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelDividendCaptureEvent', 'Event')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelDividendCaptureAmount', 'Amount')}
        </span>
      </div>

      {/* Rows */}
      {calendar.map((entry, i) => (
        <div
          key={`${entry.date}-${entry.ticker}-${i}`}
          className="grid grid-cols-[72px_1fr_72px_64px] gap-0 px-2 py-[3px] border-b border-yellow-400/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono text-neutral-400">
            {entry.date}
          </span>
          <span className="text-[8px] font-mono font-bold text-yellow-400 truncate">
            {entry.ticker}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 uppercase">
            {entry.event}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right pr-2">
            ${fmtDiv(entry.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Risk Metrics Section --

function RiskMetricsSection({
  metrics,
  t,
}: {
  metrics: RiskMetric[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-yellow-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelDividendCaptureRisk', 'Risk Metrics')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_56px_56px_56px] gap-0 px-2 py-0.5 border-b border-yellow-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelDividendCaptureTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelDividendCaptureCutRisk', 'Cut Risk')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelDividendCapturePayout', 'Payout')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelDividendCaptureDebt', 'D/E')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelDividendCaptureFcf', 'FCF Cov')}
        </span>
      </div>

      {/* Rows */}
      {metrics.map((m, i) => (
        <div
          key={`${m.ticker}-${i}`}
          className="grid grid-cols-[1fr_64px_56px_56px_56px] gap-0 px-2 py-[3px] border-b border-yellow-400/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-yellow-400 truncate">
            {m.ticker}
          </span>
          <div className="flex justify-end">
            <span
              className={`inline-block px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${riskColor(m.cutRisk)}`}
            >
              {m.cutRisk}
            </span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right ${m.payoutRatio > 80 ? 'text-red-400' : m.payoutRatio > 60 ? 'text-yellow-400' : 'text-neutral-300'}`}>
            {fmtRatio(m.payoutRatio)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(-m.debtToEquity + 1)}`}>
            {fmtRatio(m.debtToEquity)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${m.fcfCoverage >= 1.5 ? 'text-green-400' : m.fcfCoverage >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
            {fmtRatio(m.fcfCoverage)}x
          </span>
        </div>
      ))}
    </div>
  );
}
