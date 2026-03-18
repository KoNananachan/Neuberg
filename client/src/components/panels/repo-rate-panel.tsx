import { useRepoRate } from '../../api/hooks/use-repo-rate';
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

function fmtRate(n: number): string {
  return n.toFixed(3);
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(3)}`;
}

// ── Color helpers ──

/** For repo rates: rates up = red, rates down = green (bond convention) */
function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function percentileColor(pct: number): string {
  if (pct >= 90) return 'text-red-400';
  if (pct >= 75) return 'text-yellow-400';
  if (pct <= 10) return 'text-green-400';
  if (pct <= 25) return 'text-teal-400';
  return 'text-neutral-400';
}

function percentileBar(pct: number): string {
  if (pct >= 90) return 'bg-red-400';
  if (pct >= 75) return 'bg-yellow-400';
  if (pct <= 10) return 'bg-green-400';
  if (pct <= 25) return 'bg-teal-400';
  return 'bg-neutral-500';
}

function stressColor(level: string): string {
  const l = level.toUpperCase();
  if (l === 'LOW') return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (l === 'MODERATE') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  if (l === 'ELEVATED') return 'bg-red-400/20 text-red-400 border-red-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function spreadColor(n: number): string {
  if (n < -50) return 'text-red-400';
  if (n < -20) return 'text-yellow-400';
  if (n < 0) return 'text-neutral-400';
  return 'text-neutral-500';
}

// ── Interfaces ──

interface RepoRateSummary {
  sofrRate: number;
  sofrChange1d: number;
  avgTermPremium: number;
  specialsCount: number;
  marketStress: string;
}

interface OvernightRate {
  name: string;
  rate: number;
  change1d: number;
  change1w: number;
  percentile90d: number;
}

interface TermRepoRate {
  tenor: string;
  treasuryRate: number;
  treasurySpreadToON: number;
  treasuryChange1d: number;
  mbsRate: number;
  mbsSpreadToON: number;
  mbsChange1d: number;
}

interface RepoSpecial {
  cusip: string;
  maturity: string;
  type: string;
  specialRate: number;
  gcRate: number;
  spreadBps: number;
  reason: string;
}

// ── Main Panel ──

export function RepoRatePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useRepoRate();

  const summary = data?.summary as RepoRateSummary | undefined;
  const overnightRates = data?.overnightRates as OvernightRate[] | undefined;
  const termRates = data?.termRates as TermRepoRate[] | undefined;
  const specials = data?.specials as RepoSpecial[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-teal-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-teal-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-teal-400">
            {tr(t, 'repoRateTitle', 'Repo Rate Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-teal-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-teal-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'repoRateNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} t={t} />}
            {overnightRates && overnightRates.length > 0 && (
              <OvernightRatesSection rates={overnightRates} t={t} />
            )}
            {termRates && termRates.length > 0 && (
              <TermRepoSection rates={termRates} t={t} />
            )}
            {specials && specials.length > 0 && (
              <SpecialsSection specials={specials} t={t} />
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
  summary: RepoRateSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-teal-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-teal-400/10">
        {/* SOFR Rate (large) */}
        <div className="flex-1 px-3 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'repoSofr', 'SOFR')}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[13px] font-mono font-bold text-white">
              {fmtRate(summary.sofrRate)}%
            </span>
            <span className={`text-[8px] font-mono font-bold ${changeColor(summary.sofrChange1d)}`}>
              {fmtBps(summary.sofrChange1d)}bp
            </span>
          </div>
        </div>

        {/* 1D Change */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'repo1dChg', '1D Chg')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${changeColor(summary.sofrChange1d)}`}>
            {fmtBps(summary.sofrChange1d)}bp
          </div>
        </div>

        {/* Avg Term Premium */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'repoAvgTermPrem', 'Avg Term Prem')}
          </div>
          <div className="text-[10px] font-mono font-bold text-teal-400">
            {fmtBps(summary.avgTermPremium)}bp
          </div>
        </div>

        {/* Specials Count */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'repoSpecials', 'Specials')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {summary.specialsCount}
          </div>
        </div>

        {/* Market Stress */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'repoStress', 'Stress')}
          </div>
          <div className="mt-0.5">
            <span
              className={`inline-block px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${stressColor(summary.marketStress)}`}
            >
              {summary.marketStress}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Overnight Rates Section ──

function OvernightRatesSection({
  rates,
  t,
}: {
  rates: OvernightRate[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-teal-400/30">
      <div className="px-3 py-1 border-b border-teal-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'repoOvernightRates', 'Overnight Rates')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_48px_48px_48px_64px] gap-0 px-2 py-0.5 border-b border-teal-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'repoRateName', 'Rate Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoRate', 'Rate %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repo1D', '\u03941D')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repo1W', '\u03941W')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repo90D', '90D %ile')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'repoRange', 'Range')}
        </span>
      </div>

      {/* Rows */}
      {rates.map((rate) => (
        <OvernightRateRow key={rate.name} rate={rate} />
      ))}
    </div>
  );
}

function OvernightRateRow({ rate }: { rate: OvernightRate }) {
  return (
    <div className="grid grid-cols-[1fr_56px_48px_48px_48px_64px] gap-0 px-2 py-[3px] border-b border-teal-400/5 hover:bg-teal-400/[0.02] transition-colors items-center">
      <span className="text-[8px] font-mono font-bold text-teal-400">{rate.name}</span>
      <span className="text-[8px] font-mono font-bold text-white text-right">
        {fmtRate(rate.rate)}
      </span>
      <span className={`text-[8px] font-mono font-bold text-right ${changeColor(rate.change1d)}`}>
        {fmtBps(rate.change1d)}
      </span>
      <span className={`text-[8px] font-mono font-bold text-right ${changeColor(rate.change1w)}`}>
        {fmtBps(rate.change1w)}
      </span>
      <span className={`text-[8px] font-mono font-bold text-right ${percentileColor(rate.percentile90d)}`}>
        {rate.percentile90d}
      </span>
      <div className="flex items-center gap-1 justify-end pr-2">
        <div className="w-16 h-1.5 bg-neutral-800 relative">
          <div
            className={`absolute top-0 left-0 h-full ${percentileBar(rate.percentile90d)}`}
            style={{ width: `${Math.min(rate.percentile90d, 100)}%` }}
          />
          <div
            className="absolute top-[-1px] w-[2px] h-[8px] bg-white"
            style={{ left: `${Math.min(rate.percentile90d, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Term Repo Rates Section ──

function TermRepoSection({
  rates,
  t,
}: {
  rates: TermRepoRate[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-teal-400/30">
      <div className="px-3 py-1 border-b border-teal-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'repoTermRates', 'Term Repo Rates')}
        </span>
      </div>

      {/* Two-level header: Tenor | Treasury | MBS */}
      <div className="grid grid-cols-[56px_1fr_1fr] gap-0 border-b border-teal-400/10 bg-[#030303]">
        <div className="px-2 py-0.5" />
        <div className="text-center border-l border-teal-400/10 px-2 py-0.5">
          <span className="text-[7px] font-mono font-bold text-teal-400 uppercase tracking-wider">
            {tr(t, 'repoTreasury', 'Treasury')}
          </span>
        </div>
        <div className="text-center border-l border-teal-400/10 px-2 py-0.5">
          <span className="text-[7px] font-mono font-bold text-teal-400 uppercase tracking-wider">
            {tr(t, 'repoMbs', 'MBS')}
          </span>
        </div>
      </div>

      {/* Sub-header */}
      <div className="grid grid-cols-[56px_1fr_1fr] gap-0 border-b border-teal-400/5 bg-[#030303]">
        <div className="px-2 py-0.5">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'repoTenor', 'Tenor')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-0 border-l border-teal-400/10">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right px-2 py-0.5">
            {tr(t, 'repoRate', 'Rate')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right px-2 py-0.5">
            {tr(t, 'repoSprdON', 'Sprd ON')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right px-2 py-0.5">
            {tr(t, 'repo1D', '\u03941D')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-0 border-l border-teal-400/10">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right px-2 py-0.5">
            {tr(t, 'repoRate', 'Rate')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right px-2 py-0.5">
            {tr(t, 'repoSprdON', 'Sprd ON')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right px-2 py-0.5">
            {tr(t, 'repo1D', '\u03941D')}
          </span>
        </div>
      </div>

      {/* Rows */}
      {rates.map((rate) => (
        <TermRepoRow key={rate.tenor} rate={rate} />
      ))}
    </div>
  );
}

function TermRepoRow({ rate }: { rate: TermRepoRate }) {
  return (
    <div className="grid grid-cols-[56px_1fr_1fr] gap-0 border-b border-teal-400/5 hover:bg-teal-400/[0.02] transition-colors items-center">
      <span className="text-[8px] font-mono font-bold text-white px-2 py-[3px]">
        {rate.tenor}
      </span>

      {/* Treasury columns */}
      <div className="grid grid-cols-3 gap-0 border-l border-teal-400/10">
        <span className="text-[8px] font-mono font-bold text-white text-right px-2 py-[3px]">
          {fmtRate(rate.treasuryRate)}
        </span>
        <span className={`text-[8px] font-mono font-bold text-right px-2 py-[3px] ${changeColor(rate.treasurySpreadToON)}`}>
          {fmtBps(rate.treasurySpreadToON)}
        </span>
        <span className={`text-[8px] font-mono font-bold text-right px-2 py-[3px] ${changeColor(rate.treasuryChange1d)}`}>
          {fmtChange(rate.treasuryChange1d)}
        </span>
      </div>

      {/* MBS columns */}
      <div className="grid grid-cols-3 gap-0 border-l border-teal-400/10">
        <span className="text-[8px] font-mono font-bold text-white text-right px-2 py-[3px]">
          {fmtRate(rate.mbsRate)}
        </span>
        <span className={`text-[8px] font-mono font-bold text-right px-2 py-[3px] ${changeColor(rate.mbsSpreadToON)}`}>
          {fmtBps(rate.mbsSpreadToON)}
        </span>
        <span className={`text-[8px] font-mono font-bold text-right px-2 py-[3px] ${changeColor(rate.mbsChange1d)}`}>
          {fmtChange(rate.mbsChange1d)}
        </span>
      </div>
    </div>
  );
}

// ── Repo Specials Section ──

function SpecialsSection({
  specials,
  t,
}: {
  specials: RepoSpecial[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-teal-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'repoSpecialsTable', 'Repo Specials')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-teal-400/10">
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'repoCusip', 'CUSIP')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'repoMaturity', 'Maturity')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'repoType', 'Type')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'repoSpecialRate', 'Spcl Rate')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'repoGcRate', 'GC Rate')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'repoSpreadBps', 'Spread')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'repoReason', 'Reason')}</th>
            </tr>
          </thead>
          <tbody>
            {specials.map((s, i) => (
              <tr
                key={`${s.cusip}-${i}`}
                className="border-b border-neutral-900 hover:bg-teal-400/[0.02]"
              >
                <td className="px-2 py-1 text-teal-400 font-bold">{s.cusip}</td>
                <td className="px-2 py-1 text-neutral-400">{s.maturity}</td>
                <td className="px-2 py-1 text-neutral-500">{s.type}</td>
                <td className="px-2 py-1 text-right text-white font-bold">
                  {fmtRate(s.specialRate)}
                </td>
                <td className="px-2 py-1 text-right text-neutral-400">
                  {fmtRate(s.gcRate)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${spreadColor(s.spreadBps)}`}>
                  {s.spreadBps.toFixed(0)}
                </td>
                <td className="px-2 py-1 text-neutral-500 truncate max-w-[120px]">
                  {s.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
