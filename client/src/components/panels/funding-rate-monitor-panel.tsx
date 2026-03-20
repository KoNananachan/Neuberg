import { useFundingRateMonitor } from '../../api/hooks/use-funding-rate-monitor';
import { useT, tr, TFn } from '../../i18n';
import { Loader2 } from 'lucide-react';

// ── Formatting helpers ──

function fmtRate(n: number): string {
  return n.toFixed(2);
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtBn(n: number): string {
  return `$${n.toFixed(1)}B`;
}

function fmtTn(n: number): string {
  return `$${n.toFixed(2)}T`;
}

function fmtDays(n: number): string {
  return `${n.toFixed(0)}d`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function flowColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Main Panel ──

export function FundingRateMonitorPanel() {
  const t = useT();
  const { data, isLoading, error } = useFundingRateMonitor();

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-green-400" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-red-400 text-[9px] font-mono">
          {tr(t, 'frmError', 'Failed to load funding rate data')}
        </span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono text-[9px]">
      <div className="flex-1 overflow-y-auto">
        {/* Market Summary Bar */}
        <MarketSummaryBar summary={data.marketSummary} t={t} />

        {/* Overnight Rates Table */}
        <OvernightRatesTable rates={data.overnightRates} t={t} />

        {/* Term Rates Table */}
        <TermRatesTable rates={data.termRates} t={t} />

        {/* Fed Funds Implied Table */}
        <FedFundsImpliedTable meetings={data.fedFundsImplied} t={t} />

        {/* Money Market Flows Table */}
        <MoneyMarketFlowsTable flows={data.moneyMarketFlows} t={t} />
      </div>
    </div>
  );
}

// ── Market Summary Bar ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MarketSummaryBar({ summary, t }: { summary: any; t: TFn }) {
  return (
    <div className="grid grid-cols-7 border-b border-border/20">
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'frmSofr', 'SOFR')}
        </div>
        <div className="text-[10px] font-bold text-white">
          {fmtRate(summary.sofrRate)}%
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'frmEffr', 'EFFR')}
        </div>
        <div className="text-[10px] font-bold text-white">
          {fmtRate(summary.effrRate)}%
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'frmSofrVol', 'SOFR Vol')}
        </div>
        <div className="text-[10px] font-bold text-white">
          {fmtBn(summary.sofrVolume)}
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'frmRrp', 'RRP Usage')}
        </div>
        <div className="text-[10px] font-bold text-white">
          {fmtBn(summary.rrpUsage)}
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'frmFfTarget', 'FF Target')}
        </div>
        <div className="text-[10px] font-bold text-white">
          {summary.fedFundsTarget}
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'frmNextFomc', 'Next FOMC')}
        </div>
        <div className="text-[10px] font-bold text-white">
          {summary.nextFOMC}
        </div>
      </div>
      <div className="px-2 py-1.5">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'frmImpliedCuts', 'Implied Cuts')}
        </div>
        <div className="text-[10px] font-bold text-green-400">
          {summary.impliedCuts}
        </div>
      </div>
    </div>
  );
}

// ── Overnight Rates Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OvernightRatesTable({ rates, t }: { rates: any[]; t: TFn }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-2 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-green-400">
          {tr(t, 'frmOvernightRates', 'Overnight Rates')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_52px_52px_52px_52px_52px_44px_44px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Rate</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Current</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Prior Day</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Chg</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Wk Avg</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Mo Avg</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">High</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Low</span>
      </div>

      {/* Rows */}
      {rates.map((row: any) => (
        <div
          key={row.rate}
          className="grid grid-cols-[1fr_52px_52px_52px_52px_52px_44px_44px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-green-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white truncate">{row.rate}</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtRate(row.current)}%</span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtRate(row.priorDay)}%</span>
          <span className={`text-[8px] font-bold text-right ${changeColor(row.change)}`}>
            {fmtChange(row.change)}
          </span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtRate(row.weekAvg)}%</span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtRate(row.monthAvg)}%</span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtRate(row.high)}%</span>
          <span className="text-[8px] text-neutral-400 text-right pr-1">{fmtRate(row.low)}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Term Rates Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TermRatesTable({ rates, t }: { rates: any[]; t: TFn }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-2 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-green-400">
          {tr(t, 'frmTermRates', 'Term Rates')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[56px_52px_52px_52px_60px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Tenor</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Rate</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Chg</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Wk Chg</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Sprd to ON</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">%ile</span>
      </div>

      {/* Rows */}
      {rates.map((row: any) => (
        <div
          key={row.tenor}
          className="grid grid-cols-[56px_52px_52px_52px_60px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-green-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white">{row.tenor}</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtRate(row.rate)}%</span>
          <span className={`text-[8px] font-bold text-right ${changeColor(row.change)}`}>
            {fmtChange(row.change)}
          </span>
          <span className={`text-[8px] font-bold text-right ${changeColor(row.weekChange)}`}>
            {fmtChange(row.weekChange)}
          </span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtChange(row.spreadToON)} bp</span>
          <span className="text-[8px] text-neutral-300 text-right pr-1">{fmtPct(row.percentile)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Fed Funds Implied Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FedFundsImpliedTable({ meetings, t }: { meetings: any[]; t: TFn }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-2 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-green-400">
          {tr(t, 'frmFedFundsImplied', 'Fed Funds Implied')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[72px_56px_56px_48px_48px_48px_48px_1fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Meeting</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Implied</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Chg Cur</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Hold</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">-25bp</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">-50bp</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">+25bp</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Pricing</span>
      </div>

      {/* Rows */}
      {meetings.map((row: any) => (
        <div
          key={row.meeting}
          className="grid grid-cols-[72px_56px_56px_48px_48px_48px_48px_1fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-green-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white truncate">{row.meeting}</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtRate(row.impliedRate)}%</span>
          <span className={`text-[8px] font-bold text-right ${changeColor(row.changeFromCurrent)}`}>
            {fmtChange(row.changeFromCurrent)}
          </span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtPct(row.holdProb)}</span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtPct(row.cutProb25)}</span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtPct(row.cutProb50)}</span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtPct(row.hikProb25)}</span>
          <span className="text-[8px] text-neutral-300 text-right pr-1 truncate">{row.marketPricing}</span>
        </div>
      ))}
    </div>
  );
}

// ── Money Market Flows Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MoneyMarketFlowsTable({ flows, t }: { flows: any[]; t: TFn }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-2 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-green-400">
          {tr(t, 'frmMoneyMarketFlows', 'Money Market Flows')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_56px_60px_60px_48px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Category</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">AUM</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Wk Flow</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Mo Flow</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Yield</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Avg Mat</span>
      </div>

      {/* Rows */}
      {flows.map((row: any) => (
        <div
          key={row.category}
          className="grid grid-cols-[1fr_56px_60px_60px_48px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-green-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white truncate">{row.category}</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtTn(row.totalAUM)}</span>
          <span className={`text-[8px] font-bold text-right ${flowColor(row.weeklyFlow)}`}>
            {row.weeklyFlow >= 0 ? '+' : ''}{fmtBn(row.weeklyFlow)}
          </span>
          <span className="text-[8px] text-neutral-400 text-right">
            {row.monthlyFlow >= 0 ? '+' : ''}{fmtBn(row.monthlyFlow)}
          </span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtRate(row.yield)}%</span>
          <span className="text-[8px] text-neutral-400 text-right pr-1">{fmtDays(row.avgMaturity)}</span>
        </div>
      ))}
    </div>
  );
}
