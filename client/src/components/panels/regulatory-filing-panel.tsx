import { useRegulatoryFiling } from '../../api/hooks/use-regulatory-filing';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

// -- Formatting helpers --

function fmtDate(d: string): string {
  return d;
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtMoney(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// -- Color helpers --

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function materialColor(material: boolean): string {
  return material
    ? 'bg-red-400/20 text-red-400 border-red-400/30'
    : 'bg-neutral-400/20 text-neutral-500 border-neutral-400/30';
}

function transactionColor(type: string): string {
  const t = type.toUpperCase();
  if (t === 'BUY' || t === 'PURCHASE' || t === 'ACQUISITION') return 'text-green-400';
  if (t === 'SELL' || t === 'SALE' || t === 'DISPOSITION') return 'text-red-400';
  return 'text-neutral-400';
}

function enforcementSeverityColor(severity: string): string {
  const s = severity.toUpperCase();
  if (s === 'HIGH' || s === 'CRITICAL') return 'bg-red-400/20 text-red-400 border-red-400/30';
  if (s === 'MEDIUM' || s === 'MODERATE') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  return 'bg-neutral-400/20 text-neutral-500 border-neutral-400/30';
}

// -- Interfaces --

interface FilingSummary {
  totalFilings24h: number;
  totalFilings7d: number;
  materialFilings: number;
  change1w: number;
  topFormType: string;
}

interface RecentFiling {
  company: string;
  ticker: string;
  formType: string;
  date: string;
  material: boolean;
  description: string;
}

interface InstitutionalFiling {
  institution: string;
  aum: number;
  topHolding: string;
  topHoldingPct: number;
  newPositions: number;
  exitedPositions: number;
  filingDate: string;
}

interface InsiderFiling {
  insider: string;
  company: string;
  ticker: string;
  transactionType: string;
  shares: number;
  pricePerShare: number;
  totalValue: number;
  date: string;
}

interface IpoPipeline {
  company: string;
  ticker: string;
  status: string;
  expectedDate: string;
  priceRange: string;
  sharesOffered: number;
  leadUnderwriter: string;
}

interface EnforcementAction {
  respondent: string;
  agency: string;
  action: string;
  penalty: number;
  severity: string;
  date: string;
}

interface ProxyFiling {
  company: string;
  ticker: string;
  meetingDate: string;
  proposals: number;
  contested: boolean;
  recordDate: string;
}

// -- Main Panel --

export function RegulatoryFilingPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useRegulatoryFiling();

  const summary = data?.summary as FilingSummary | undefined;
  const recentFilings = data?.recentFilings as RecentFiling[] | undefined;
  const institutionalFilings = data?.institutionalFilings as InstitutionalFiling[] | undefined;
  const insiderFilings = data?.insiderFilings as InsiderFiling[] | undefined;
  const ipoPipeline = data?.ipoPipeline as IpoPipeline[] | undefined;
  const enforcementActions = data?.enforcementActions as EnforcementAction[] | undefined;
  const proxyFilings = data?.proxyFilings as ProxyFiling[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-slate-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-slate-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-slate-400">
            {tr(t, 'panelRegulatoryFiling', 'Regulatory Filing')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-slate-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-slate-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'panelRegulatoryFilingNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <FilingStatisticsBar summary={summary} t={t} />}
            {recentFilings && recentFilings.length > 0 && (
              <RecentFilingsSection filings={recentFilings} t={t} />
            )}
            {institutionalFilings && institutionalFilings.length > 0 && (
              <InstitutionalFilingsSection filings={institutionalFilings} t={t} />
            )}
            {insiderFilings && insiderFilings.length > 0 && (
              <InsiderFilingsSection filings={insiderFilings} t={t} />
            )}
            {ipoPipeline && ipoPipeline.length > 0 && (
              <IpoPipelineSection filings={ipoPipeline} t={t} />
            )}
            {enforcementActions && enforcementActions.length > 0 && (
              <EnforcementActionsSection actions={enforcementActions} t={t} />
            )}
            {proxyFilings && proxyFilings.length > 0 && (
              <ProxyFilingsSection filings={proxyFilings} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -- Filing Statistics Bar --

function FilingStatisticsBar({
  summary,
  t,
}: {
  summary: FilingSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-slate-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-slate-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelRegulatoryFiling24h', 'Filings 24H')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtNum(summary.totalFilings24h)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelRegulatoryFiling7d', 'Filings 7D')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtNum(summary.totalFilings7d)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelRegulatoryFilingMaterial', 'Material')}
          </div>
          <div className="text-[10px] font-mono font-bold text-red-400">
            {fmtNum(summary.materialFilings)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelRegulatoryFiling1wChg', '1W Chg')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${changeColor(summary.change1w)}`}>
            {fmtChg(summary.change1w)}%
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelRegulatoryFilingTopForm', 'Top Form')}
          </div>
          <div className="text-[10px] font-mono font-bold text-slate-400 truncate">
            {summary.topFormType}
          </div>
        </div>
      </div>
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
    <div className="border-b border-slate-400/30">
      <div className="px-3 py-1 border-b border-slate-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelRegulatoryFilingRecent', 'Recent Filings')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_56px_48px] gap-0 px-2 py-0.5 border-b border-slate-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelRegulatoryFilingCompany', 'Company')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelRegulatoryFilingTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelRegulatoryFilingFormType', 'Form')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelRegulatoryFilingDate', 'Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelRegulatoryFilingMaterialFlag', 'Matl')}
        </span>
      </div>

      {/* Rows */}
      {filings.map((f, i) => (
        <div
          key={`${f.ticker}-${f.formType}-${i}`}
          className="grid grid-cols-[1fr_56px_56px_56px_48px] gap-0 px-2 py-[3px] border-b border-slate-400/5 hover:bg-slate-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-slate-400 truncate">
            {f.company}
          </span>
          <span className="text-[8px] font-mono text-white font-bold">
            {f.ticker}
          </span>
          <span className="text-[8px] font-mono text-neutral-400">
            {f.formType}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {fmtDate(f.date)}
          </span>
          <span className="text-[8px] font-mono text-right pr-2">
            {f.material ? (
              <span className={`inline-block px-1 py-0 text-[7px] font-mono font-bold uppercase border ${materialColor(true)}`}>
                YES
              </span>
            ) : (
              <span className="text-neutral-600">--</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- 13F Institutional Filings Section --

function InstitutionalFilingsSection({
  filings,
  t,
}: {
  filings: InstitutionalFiling[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-slate-400/30">
      <div className="px-3 py-1 border-b border-slate-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelRegulatoryFiling13F', '13F Institutional Filings')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_80px_40px_40px_56px] gap-0 px-2 py-0.5 border-b border-slate-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelRegulatoryFilingInstitution', 'Institution')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelRegulatoryFilingAum', 'AUM')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelRegulatoryFilingTopHolding', 'Top Hold')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelRegulatoryFilingNew', 'New')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelRegulatoryFilingExited', 'Exit')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelRegulatoryFilingFiled', 'Filed')}
        </span>
      </div>

      {/* Rows */}
      {filings.map((f, i) => (
        <div
          key={`${f.institution}-${i}`}
          className="grid grid-cols-[1fr_56px_80px_40px_40px_56px] gap-0 px-2 py-[3px] border-b border-slate-400/5 hover:bg-slate-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-slate-400 truncate">
            {f.institution}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtMoney(f.aum)}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-mono text-neutral-300 truncate">
              {f.topHolding}
            </span>
            <span className="text-[7px] font-mono text-neutral-500">
              {fmtPct(f.topHoldingPct)}%
            </span>
          </div>
          <span className="text-[8px] font-mono font-bold text-green-400 text-right">
            {f.newPositions}
          </span>
          <span className="text-[8px] font-mono font-bold text-red-400 text-right">
            {f.exitedPositions}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2">
            {fmtDate(f.filingDate)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Form 4 Insider Filings Section --

function InsiderFilingsSection({
  filings,
  t,
}: {
  filings: InsiderFiling[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-slate-400/30">
      <div className="px-3 py-1 border-b border-slate-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelRegulatoryFilingForm4', 'Form 4 Insider Filings')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_48px_56px_48px_56px_56px] gap-0 px-2 py-0.5 border-b border-slate-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelRegulatoryFilingInsider', 'Insider')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelRegulatoryFilingCompany', 'Company')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelRegulatoryFilingTxnType', 'Type')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelRegulatoryFilingShares', 'Shares')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelRegulatoryFilingPrice', 'Price')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelRegulatoryFilingTotalVal', 'Total')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelRegulatoryFilingDate', 'Date')}
        </span>
      </div>

      {/* Rows */}
      {filings.map((f, i) => (
        <div
          key={`${f.insider}-${f.ticker}-${i}`}
          className="grid grid-cols-[1fr_72px_48px_56px_48px_56px_56px] gap-0 px-2 py-[3px] border-b border-slate-400/5 hover:bg-slate-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-slate-400 truncate">
            {f.insider}
          </span>
          <span className="text-[8px] font-mono text-white font-bold truncate">
            {f.ticker}
          </span>
          <span className={`text-[8px] font-mono font-bold ${transactionColor(f.transactionType)}`}>
            {f.transactionType}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtNum(f.shares)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            ${f.pricePerShare.toFixed(2)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtMoney(f.totalValue)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2">
            {fmtDate(f.date)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- IPO Pipeline Section --

function IpoPipelineSection({
  filings,
  t,
}: {
  filings: IpoPipeline[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-slate-400/30">
      <div className="px-3 py-1 border-b border-slate-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelRegulatoryFilingIpo', 'IPO Pipeline (S-1)')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_56px_56px_56px_48px_80px] gap-0 px-2 py-0.5 border-b border-slate-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelRegulatoryFilingCompany', 'Company')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelRegulatoryFilingTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelRegulatoryFilingStatus', 'Status')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelRegulatoryFilingExpDate', 'Exp Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelRegulatoryFilingPriceRange', 'Price')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelRegulatoryFilingShares', 'Shares')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelRegulatoryFilingUnderwriter', 'Lead UW')}
        </span>
      </div>

      {/* Rows */}
      {filings.map((f, i) => (
        <div
          key={`${f.company}-${i}`}
          className="grid grid-cols-[1fr_48px_56px_56px_56px_48px_80px] gap-0 px-2 py-[3px] border-b border-slate-400/5 hover:bg-slate-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-slate-400 truncate">
            {f.company}
          </span>
          <span className="text-[8px] font-mono text-white font-bold">
            {f.ticker}
          </span>
          <span className="text-[8px] font-mono text-neutral-400">
            {f.status}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtDate(f.expectedDate)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {f.priceRange}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtNum(f.sharesOffered)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2 truncate">
            {f.leadUnderwriter}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Enforcement Actions Section --

function EnforcementActionsSection({
  actions,
  t,
}: {
  actions: EnforcementAction[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-slate-400/30">
      <div className="px-3 py-1 border-b border-slate-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelRegulatoryFilingEnforcement', 'Enforcement Actions')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_1fr_56px_56px_56px] gap-0 px-2 py-0.5 border-b border-slate-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelRegulatoryFilingRespondent', 'Respondent')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelRegulatoryFilingAgency', 'Agency')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelRegulatoryFilingAction', 'Action')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelRegulatoryFilingPenalty', 'Penalty')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelRegulatoryFilingSeverity', 'Severity')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelRegulatoryFilingDate', 'Date')}
        </span>
      </div>

      {/* Rows */}
      {actions.map((a, i) => (
        <div
          key={`${a.respondent}-${i}`}
          className="grid grid-cols-[1fr_48px_1fr_56px_56px_56px] gap-0 px-2 py-[3px] border-b border-slate-400/5 hover:bg-slate-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-slate-400 truncate">
            {a.respondent}
          </span>
          <span className="text-[8px] font-mono text-neutral-400">
            {a.agency}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 truncate">
            {a.action}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtMoney(a.penalty)}
          </span>
          <span className="text-[8px] font-mono text-right">
            <span className={`inline-block px-1 py-0 text-[7px] font-mono font-bold uppercase border ${enforcementSeverityColor(a.severity)}`}>
              {a.severity}
            </span>
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2">
            {fmtDate(a.date)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Proxy Filings Section --

function ProxyFilingsSection({
  filings,
  t,
}: {
  filings: ProxyFiling[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-slate-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelRegulatoryFilingProxy', 'Proxy Filings')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_56px_48px_56px_56px] gap-0 px-2 py-0.5 border-b border-slate-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelRegulatoryFilingCompany', 'Company')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelRegulatoryFilingTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelRegulatoryFilingMeetingDate', 'Meeting')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelRegulatoryFilingProposals', 'Props')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelRegulatoryFilingContested', 'Contest')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelRegulatoryFilingRecordDate', 'Record')}
        </span>
      </div>

      {/* Rows */}
      {filings.map((f, i) => (
        <div
          key={`${f.ticker}-${i}`}
          className="grid grid-cols-[1fr_48px_56px_48px_56px_56px] gap-0 px-2 py-[3px] border-b border-slate-400/5 hover:bg-slate-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-slate-400 truncate">
            {f.company}
          </span>
          <span className="text-[8px] font-mono text-white font-bold">
            {f.ticker}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtDate(f.meetingDate)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {f.proposals}
          </span>
          <span className="text-[8px] font-mono text-right">
            {f.contested ? (
              <span className="text-red-400 font-bold">YES</span>
            ) : (
              <span className="text-neutral-600">NO</span>
            )}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2">
            {fmtDate(f.recordDate)}
          </span>
        </div>
      ))}
    </div>
  );
}
