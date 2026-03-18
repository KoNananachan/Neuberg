import { useFiscalPolicy } from '../../api/hooks/use-fiscal-policy';
import { useT } from '../../i18n';
import { RefreshCw, Landmark } from 'lucide-react';

// i18n fallback helper
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Types (matching server response) ──

interface CountryFiscalData {
  country: string;
  rating: string;
  debtToGdp: number;
  fiscalBalance: number;
  primaryBalance: number;
  interestToGdp: number;
  spendingToGdp: number;
  outlook: 'POSITIVE' | 'STABLE' | 'NEGATIVE' | 'WATCH';
}

interface FiscalEvent {
  date: string;
  country: string;
  event: string;
  expectedImpact: string;
  significance: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface DebtSustainability {
  country: string;
  debtToGdp: number;
  growthRate: number;
  interestRate: number;
  primaryBalanceNeeded: number;
  yearsToTarget: number;
  score: number;
}

interface FiscalSummary {
  avgG7DebtToGdp: number;
  avgEmDebtToGdp: number;
  highestDeficitCountry: string;
  mostFiscalSpaceCountry: string;
}

interface FiscalPolicyData {
  summary: FiscalSummary;
  countries: CountryFiscalData[];
  events: FiscalEvent[];
  debtSustainability: DebtSustainability[];
}

// ── Color helpers ──

function outlookBadge(outlook: string): { color: string; bg: string } {
  switch (outlook) {
    case 'POSITIVE':
      return { color: 'text-emerald-400', bg: 'bg-emerald-400/15' };
    case 'NEGATIVE':
      return { color: 'text-red-400', bg: 'bg-red-400/15' };
    case 'WATCH':
      return { color: 'text-orange-400', bg: 'bg-orange-400/15' };
    default:
      return { color: 'text-yellow-400', bg: 'bg-yellow-400/15' };
  }
}

function significanceBadge(level: string): { color: string; bg: string } {
  switch (level) {
    case 'HIGH':
      return { color: 'text-red-400', bg: 'bg-red-400/15' };
    case 'MEDIUM':
      return { color: 'text-yellow-400', bg: 'bg-yellow-400/15' };
    default:
      return { color: 'text-emerald-400', bg: 'bg-emerald-400/15' };
  }
}

function debtGdpColor(value: number): string {
  if (value > 120) return 'text-red-400';
  if (value > 90) return 'text-orange-400';
  if (value > 60) return 'text-yellow-400';
  return 'text-emerald-400';
}

function balanceColor(value: number): string {
  if (value < -5) return 'text-red-400';
  if (value < -3) return 'text-orange-400';
  if (value < 0) return 'text-yellow-400';
  return 'text-emerald-400';
}

function sustainabilityScoreColor(score: number): string {
  if (score >= 80) return '#34d399'; // green
  if (score >= 60) return '#fbbf24'; // yellow
  if (score >= 40) return '#fb923c'; // orange
  return '#f87171'; // red
}

function sustainabilityScoreTextColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-cyan-400/30">
      <div className="w-1 h-1 shrink-0 bg-cyan-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-cyan-400">
        {title}
      </span>
    </div>
  );
}

// ── Table header cell ──

function ThCell({ label, align }: { label: string; align: 'left' | 'right' }) {
  return (
    <th
      className={`px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {label}
    </th>
  );
}

// ── Summary Bar ──

function SummaryBar({ summary, t }: { summary: FiscalSummary; t: ReturnType<typeof useT> }) {
  const metrics = [
    {
      label: tr(t, 'fpAvgG7Debt', 'Avg G7 Debt/GDP'),
      value: `${summary.avgG7DebtToGdp.toFixed(1)}%`,
      color: debtGdpColor(summary.avgG7DebtToGdp),
    },
    {
      label: tr(t, 'fpAvgEmDebt', 'Avg EM Debt/GDP'),
      value: `${summary.avgEmDebtToGdp.toFixed(1)}%`,
      color: debtGdpColor(summary.avgEmDebtToGdp),
    },
    {
      label: tr(t, 'fpHighestDeficit', 'Highest Deficit'),
      value: summary.highestDeficitCountry,
      color: 'text-red-400',
    },
    {
      label: tr(t, 'fpMostSpace', 'Most Fiscal Space'),
      value: summary.mostFiscalSpaceCountry,
      color: 'text-emerald-400',
    },
  ];

  return (
    <div className="grid grid-cols-4 border-b border-cyan-400/30 bg-black">
      {metrics.map((m, i) => (
        <div key={m.label} className={`px-2 py-1.5 ${i < 3 ? 'border-r border-cyan-400/10' : ''}`}>
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
            {m.label}
          </div>
          <div className={`text-[10px] font-mono font-bold ${m.color}`}>
            {m.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Country Fiscal Data Table ──

function CountryFiscalTable({ countries }: { countries: CountryFiscalData[] }) {
  const sorted = [...countries].sort((a, b) => b.debtToGdp - a.debtToGdp);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Country" align="left" />
            <ThCell label="Rating" align="left" />
            <ThCell label="Debt/GDP (%)" align="right" />
            <ThCell label="Fiscal Bal (%)" align="right" />
            <ThCell label="Primary Bal (%)" align="right" />
            <ThCell label="Interest/GDP (%)" align="right" />
            <ThCell label="Spending/GDP (%)" align="right" />
            <ThCell label="Outlook" align="left" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => {
            const outlook = outlookBadge(c.outlook);
            return (
              <tr key={c.country} className="border-b border-border/10 hover:bg-cyan-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-white font-bold">
                  {c.country}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-300 font-bold">
                  {c.rating}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${debtGdpColor(c.debtToGdp)}`}>
                  {c.debtToGdp.toFixed(1)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${balanceColor(c.fiscalBalance)}`}>
                  {c.fiscalBalance > 0 ? '+' : ''}{c.fiscalBalance.toFixed(1)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${balanceColor(c.primaryBalance)}`}>
                  {c.primaryBalance > 0 ? '+' : ''}{c.primaryBalance.toFixed(1)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${c.interestToGdp > 3 ? 'text-red-400' : c.interestToGdp > 2 ? 'text-yellow-400' : 'text-neutral-300'}`}>
                  {c.interestToGdp.toFixed(1)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${c.spendingToGdp > 45 ? 'text-red-400' : c.spendingToGdp > 35 ? 'text-yellow-400' : 'text-neutral-300'}`}>
                  {c.spendingToGdp.toFixed(1)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <span className={`text-[7px] font-bold px-1 py-0.5 uppercase ${outlook.color} ${outlook.bg}`}>
                    {c.outlook}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Fiscal Events Table ──

function FiscalEventsTable({ events }: { events: FiscalEvent[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Date" align="left" />
            <ThCell label="Country" align="left" />
            <ThCell label="Event" align="left" />
            <ThCell label="Expected Impact" align="left" />
            <ThCell label="Significance" align="left" />
          </tr>
        </thead>
        <tbody>
          {events.map((ev, i) => {
            const sig = significanceBadge(ev.significance);
            return (
              <tr key={`${ev.country}-${ev.event}-${i}`} className="border-b border-border/10 hover:bg-cyan-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-400">
                  {ev.date}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-white font-bold">
                  {ev.country}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-300">
                  {ev.event}
                </td>
                <td className="px-1.5 py-1 text-left text-neutral-500 max-w-[200px] truncate">
                  {ev.expectedImpact}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <span className={`text-[7px] font-bold px-1 py-0.5 uppercase ${sig.color} ${sig.bg}`}>
                    {ev.significance}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Debt Sustainability Table ──

function DebtSustainabilityTable({ entries }: { entries: DebtSustainability[] }) {
  const sorted = [...entries].sort((a, b) => a.score - b.score);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Country" align="left" />
            <ThCell label="Debt/GDP (%)" align="right" />
            <ThCell label="Growth (%)" align="right" />
            <ThCell label="Int. Rate (%)" align="right" />
            <ThCell label="Prim. Bal Needed (%)" align="right" />
            <ThCell label="Yrs to Target" align="right" />
            <ThCell label="Score" align="left" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((d) => {
            const barColor = sustainabilityScoreColor(d.score);
            const textColor = sustainabilityScoreTextColor(d.score);
            return (
              <tr key={d.country} className="border-b border-border/10 hover:bg-cyan-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-white font-bold">
                  {d.country}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${debtGdpColor(d.debtToGdp)}`}>
                  {d.debtToGdp.toFixed(1)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${d.growthRate >= 2 ? 'text-emerald-400' : d.growthRate >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {d.growthRate.toFixed(1)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${d.interestRate > 5 ? 'text-red-400' : d.interestRate > 3 ? 'text-yellow-400' : 'text-neutral-300'}`}>
                  {d.interestRate.toFixed(1)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${d.primaryBalanceNeeded > 3 ? 'text-red-400' : d.primaryBalanceNeeded > 1 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {d.primaryBalanceNeeded > 0 ? '+' : ''}{d.primaryBalanceNeeded.toFixed(1)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${d.yearsToTarget > 20 ? 'text-red-400' : d.yearsToTarget > 10 ? 'text-yellow-400' : 'text-neutral-300'}`}>
                  {d.yearsToTarget > 99 ? '>99' : d.yearsToTarget}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-1.5 bg-neutral-900 relative">
                      <div
                        className="absolute top-0 left-0 h-full"
                        style={{ width: `${Math.min(d.score, 100)}%`, backgroundColor: barColor, opacity: 0.7 }}
                      />
                    </div>
                    <span className={`text-[8px] font-mono font-bold tabular-nums ${textColor}`}>
                      {d.score}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Panel ──

export function FiscalPolicyPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useFiscalPolicy();

  const fiscalData = data as FiscalPolicyData | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-cyan-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-cyan-400">
            {tr(t, 'fpTitle', 'Fiscal Policy Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {fiscalData?.summary && (
            <span className="text-[8px] font-mono font-black tabular-nums text-cyan-400">
              G7 {fiscalData.summary.avgG7DebtToGdp.toFixed(0)}%
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral-600 hover:text-cyan-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && !fiscalData && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider animate-pulse">
            LOADING...
          </span>
        </div>
      )}

      {/* No data */}
      {!fiscalData && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            {tr(t, 'noData', 'No data')}
          </span>
        </div>
      )}

      {/* Scrollable content */}
      {fiscalData && (
        <div className="flex-1 overflow-auto no-scrollbar">
          {/* Summary bar */}
          {fiscalData.summary && (
            <SummaryBar summary={fiscalData.summary} t={t} />
          )}

          {/* Country Fiscal Data */}
          {fiscalData.countries && fiscalData.countries.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'fpCountryData', 'Country Fiscal Data')} />
              <CountryFiscalTable countries={fiscalData.countries} />
            </>
          )}

          {/* Fiscal Events */}
          {fiscalData.events && fiscalData.events.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'fpEvents', 'Fiscal Events')} />
              <FiscalEventsTable events={fiscalData.events} />
            </>
          )}

          {/* Debt Sustainability */}
          {fiscalData.debtSustainability && fiscalData.debtSustainability.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'fpDebtSustainability', 'Debt Sustainability')} />
              <DebtSustainabilityTable entries={fiscalData.debtSustainability} />
            </>
          )}

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
