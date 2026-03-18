import { useSecuritiesClassAction } from '../../api/hooks/use-securities-class-action';
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

function fmtMoney(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtPerShare(n: number): string {
  return `$${n.toFixed(2)}`;
}

// -- Color helpers --

function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (s === 'ACTIVE' || s === 'PENDING') return 'bg-red-400/20 text-red-400 border-red-400/30';
  if (s === 'SETTLED') return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (s === 'DISMISSED') return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
  return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
}

function concentrationBar(pct: number): string {
  if (pct >= 30) return 'bg-red-400';
  if (pct >= 20) return 'bg-yellow-400';
  return 'bg-neutral-500';
}

// -- Interfaces --

interface CaseSummary {
  totalActive: number;
  ytdFilings: number;
  avgSettlement: number;
  dismissalRate: number;
}

interface ActiveCase {
  defendant: string;
  violation: string;
  classPeriod: string;
  status: string;
  estDamages: number;
}

interface RecentFiling {
  defendant: string;
  filingDate: string;
  court: string;
  allegation: string;
  leadPlaintiff: string;
}

interface Settlement {
  defendant: string;
  amount: number;
  perShare: number;
  deadline: string;
}

interface SectorConcentration {
  sector: string;
  caseCount: number;
  pctOfTotal: number;
  avgDamages: number;
}

interface PlaintiffFirm {
  firm: string;
  activeCases: number;
  totalRecovered: number;
  winRate: number;
}

interface TriggerEvent {
  event: string;
  count: number;
  pctOfFilings: number;
  avgDamages: number;
}

// -- Main Panel --

export function SecuritiesClassActionPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSecuritiesClassAction();

  const summary = data?.summary as CaseSummary | undefined;
  const activeCases = data?.activeCases as ActiveCase[] | undefined;
  const recentFilings = data?.recentFilings as RecentFiling[] | undefined;
  const settlements = data?.settlements as Settlement[] | undefined;
  const sectorConcentration = data?.sectorConcentration as SectorConcentration[] | undefined;
  const plaintiffFirms = data?.plaintiffFirms as PlaintiffFirm[] | undefined;
  const triggerEvents = data?.triggerEvents as TriggerEvent[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-red-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-red-400">
            {tr(t, 'panelSecuritiesClassAction', 'Securities Class Action')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'scaNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} t={t} />}
            {activeCases && activeCases.length > 0 && (
              <ActiveCasesSection cases={activeCases} t={t} />
            )}
            {recentFilings && recentFilings.length > 0 && (
              <RecentFilingsSection filings={recentFilings} t={t} />
            )}
            {settlements && settlements.length > 0 && (
              <SettlementsSection settlements={settlements} t={t} />
            )}
            {sectorConcentration && sectorConcentration.length > 0 && (
              <SectorConcentrationSection sectors={sectorConcentration} t={t} />
            )}
            {plaintiffFirms && plaintiffFirms.length > 0 && (
              <PlaintiffFirmsSection firms={plaintiffFirms} t={t} />
            )}
            {triggerEvents && triggerEvents.length > 0 && (
              <TriggerEventsSection events={triggerEvents} t={t} />
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
  summary: CaseSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-red-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-red-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'scaTotalActive', 'Total Active')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {summary.totalActive}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'scaYtdFilings', 'YTD Filings')}
          </div>
          <div className="text-[10px] font-mono font-bold text-red-400">
            {summary.ytdFilings}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'scaAvgSettlement', 'Avg Settlement')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtMoney(summary.avgSettlement)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'scaDismissalRate', 'Dismissal Rate')}
          </div>
          <div className="text-[10px] font-mono font-bold text-red-400">
            {fmtPct(summary.dismissalRate)}%
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Active Cases Section --

function ActiveCasesSection({
  cases,
  t,
}: {
  cases: ActiveCase[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-red-400/30">
      <div className="px-3 py-1 border-b border-red-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scaActiveCases', 'Active Cases')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_80px_56px_64px] gap-0 px-2 py-0.5 border-b border-red-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'scaDefendant', 'Defendant')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'scaViolation', 'Violation')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'scaClassPeriod', 'Class Period')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'scaStatus', 'Status')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'scaEstDamages', 'Est Dmg')}
        </span>
      </div>

      {/* Rows */}
      {cases.map((c, i) => (
        <div
          key={`${c.defendant}-${i}`}
          className="grid grid-cols-[1fr_80px_80px_56px_64px] gap-0 px-2 py-[3px] border-b border-red-400/5 hover:bg-red-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-red-400 truncate">
            {c.defendant}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {c.violation}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 truncate">
            {c.classPeriod}
          </span>
          <span className="text-center">
            <span
              className={`inline-block px-1 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${statusColor(c.status)}`}
            >
              {c.status}
            </span>
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right pr-2">
            {fmtMoney(c.estDamages)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Recent Filings Section --

function RecentFilingsSection({
  filings,
  t,
}: {
  filings: RecentFiling[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-red-400/30">
      <div className="px-3 py-1 border-b border-red-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scaRecentFilings', 'Recent Filings')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_80px_1fr_80px] gap-0 px-2 py-0.5 border-b border-red-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'scaDefendant', 'Defendant')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'scaFilingDate', 'Filed')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'scaCourt', 'Court')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'scaAllegation', 'Allegation')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'scaLeadPlaintiff', 'Lead Plaintiff')}
        </span>
      </div>

      {/* Rows */}
      {filings.map((f, i) => (
        <div
          key={`${f.defendant}-${i}`}
          className="grid grid-cols-[1fr_64px_80px_1fr_80px] gap-0 px-2 py-[3px] border-b border-red-400/5 hover:bg-red-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-red-400 truncate">
            {f.defendant}
          </span>
          <span className="text-[8px] font-mono text-neutral-400">
            {f.filingDate}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 truncate">
            {f.court}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {f.allegation}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2 truncate">
            {f.leadPlaintiff}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Settlements Section --

function SettlementsSection({
  settlements,
  t,
}: {
  settlements: Settlement[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-red-400/30">
      <div className="px-3 py-1 border-b border-red-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scaSettlements', 'Settlements')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_56px_72px] gap-0 px-2 py-0.5 border-b border-red-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'scaDefendant', 'Defendant')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scaAmount', 'Amount')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scaPerShare', 'Per Share')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'scaDeadline', 'Deadline')}
        </span>
      </div>

      {/* Rows */}
      {settlements.map((s, i) => (
        <div
          key={`${s.defendant}-${i}`}
          className="grid grid-cols-[1fr_72px_56px_72px] gap-0 px-2 py-[3px] border-b border-red-400/5 hover:bg-red-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-red-400 truncate">
            {s.defendant}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtMoney(s.amount)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPerShare(s.perShare)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right pr-2">
            {s.deadline}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Sector Concentration Section --

function SectorConcentrationSection({
  sectors,
  t,
}: {
  sectors: SectorConcentration[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-red-400/30">
      <div className="px-3 py-1 border-b border-red-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scaSectorConcentration', 'Sector Concentration')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_80px_64px] gap-0 px-2 py-0.5 border-b border-red-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'scaSector', 'Sector')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scaCases', 'Cases')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scaPctTotal', '% of Total')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'scaAvgDmg', 'Avg Dmg')}
        </span>
      </div>

      {/* Rows */}
      {sectors.map((s) => (
        <div
          key={s.sector}
          className="grid grid-cols-[1fr_48px_80px_64px] gap-0 px-2 py-[3px] border-b border-red-400/5 hover:bg-red-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-red-400 truncate">
            {s.sector}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {s.caseCount}
          </span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-12 h-1.5 bg-neutral-800 relative">
              <div
                className={`absolute top-0 left-0 h-full ${concentrationBar(s.pctOfTotal)}`}
                style={{ width: `${Math.min(s.pctOfTotal, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono font-bold text-white w-8 text-right">
              {fmtPct(s.pctOfTotal)}
            </span>
          </div>
          <span className="text-[8px] font-mono text-neutral-300 text-right pr-2">
            {fmtMoney(s.avgDamages)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Top Plaintiff Firms Section --

function PlaintiffFirmsSection({
  firms,
  t,
}: {
  firms: PlaintiffFirm[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-red-400/30">
      <div className="px-3 py-1 border-b border-red-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scaTopPlaintiffFirms', 'Top Plaintiff Firms')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_64px_56px] gap-0 px-2 py-0.5 border-b border-red-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'scaFirm', 'Firm')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scaActive', 'Active')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scaRecovered', 'Recovered')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'scaWinRate', 'Win %')}
        </span>
      </div>

      {/* Rows */}
      {firms.map((f) => (
        <div
          key={f.firm}
          className="grid grid-cols-[1fr_48px_64px_56px] gap-0 px-2 py-[3px] border-b border-red-400/5 hover:bg-red-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-red-400 truncate">
            {f.firm}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {f.activeCases}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtMoney(f.totalRecovered)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right pr-2">
            {fmtPct(f.winRate)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Trigger Events Section --

function TriggerEventsSection({
  events,
  t,
}: {
  events: TriggerEvent[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-red-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scaTriggerEvents', 'Trigger Events')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_80px_64px] gap-0 px-2 py-0.5 border-b border-red-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'scaEvent', 'Event')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scaCount', 'Count')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scaPctFilings', '% Filings')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'scaAvgDmg', 'Avg Dmg')}
        </span>
      </div>

      {/* Rows */}
      {events.map((e) => (
        <div
          key={e.event}
          className="grid grid-cols-[1fr_48px_80px_64px] gap-0 px-2 py-[3px] border-b border-red-400/5 hover:bg-red-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {e.event}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {e.count}
          </span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-12 h-1.5 bg-neutral-800 relative">
              <div
                className="absolute top-0 left-0 h-full bg-red-400"
                style={{ width: `${Math.min(e.pctOfFilings, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono font-bold text-white w-8 text-right">
              {fmtPct(e.pctOfFilings)}
            </span>
          </div>
          <span className="text-[8px] font-mono text-neutral-300 text-right pr-2">
            {fmtMoney(e.avgDamages)}
          </span>
        </div>
      ))}
    </div>
  );
}
