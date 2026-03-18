import { useFlowOfFunds } from '../../api/hooks/use-flow-of-funds';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n fallback helper
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Types (matching server response) ──

interface SectorFlow {
  sector: string;
  totalAssets: number;
  liabilities: number;
  netWorth: number;
  change1Q: number;
  change1Y: number;
  equityAlloc: number;
  debtAlloc: number;
}

interface CreditMarketInstrument {
  instrument: string;
  outstanding: number;
  netIssuanceQ: number;
  netIssuanceY: number;
  pctGdp: number;
}

interface HouseholdAsset {
  name: string;
  value: number;
  pctTotal: number;
  change1Q: number;
}

interface HouseholdLiability {
  name: string;
  value: number;
  pctTotal: number;
  change1Q: number;
}

interface HouseholdBalanceSheet {
  assets: HouseholdAsset[];
  liabilities: HouseholdLiability[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  savingsRate: number;
  debtServiceRatio: number;
}

interface FlowOfFundsSummary {
  householdNetWorth: number;
  corporateDebt: number;
  govtDebt: number;
  totalCreditMarket: number;
  quarterlyChange: number;
}

interface FlowOfFundsData {
  summary: FlowOfFundsSummary;
  sectorFlows: SectorFlow[];
  creditMarket: CreditMarketInstrument[];
  householdBalance: HouseholdBalanceSheet;
}

// ── Color helpers ──

function changeColor(value: number): string {
  if (value > 0) return 'text-emerald-400';
  if (value < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function fmtChange(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function fmtTrillion(value: number): string {
  return value.toFixed(2);
}

function fmtBillion(value: number): string {
  return value.toFixed(1);
}

function fmtPct(value: number): string {
  return value.toFixed(1) + '%';
}

function allocColor(value: number): string {
  if (value > 60) return 'text-indigo-400';
  if (value > 40) return 'text-indigo-300';
  return 'text-neutral-400';
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-indigo-400/30">
      <div className="w-1 h-1 shrink-0 bg-indigo-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-indigo-400">
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

function SummaryBar({ summary }: { summary: FlowOfFundsSummary }) {
  const metrics = [
    {
      label: 'HH Net Worth',
      value: `$${fmtTrillion(summary.householdNetWorth)}T`,
      color: 'text-indigo-400',
    },
    {
      label: 'Corp Debt',
      value: `$${fmtTrillion(summary.corporateDebt)}T`,
      color: 'text-neutral-300',
    },
    {
      label: 'Govt Debt',
      value: `$${fmtTrillion(summary.govtDebt)}T`,
      color: summary.govtDebt > 30 ? 'text-red-400' : 'text-neutral-300',
    },
    {
      label: 'Total Credit',
      value: `$${fmtTrillion(summary.totalCreditMarket)}T`,
      color: 'text-neutral-300',
    },
    {
      label: 'Q/Q Change',
      value: fmtChange(summary.quarterlyChange),
      color: changeColor(summary.quarterlyChange),
    },
  ];

  return (
    <div className="grid grid-cols-5 border-b border-indigo-400/30 bg-black">
      {metrics.map((m, i) => (
        <div key={m.label} className={`px-2 py-1.5 ${i < 4 ? 'border-r border-indigo-400/10' : ''}`}>
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

// ── Sector Flows Table ──

function SectorFlowsTable({ sectors }: { sectors: SectorFlow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Sector" align="left" />
            <ThCell label="Total Assets ($T)" align="right" />
            <ThCell label="Liabilities ($T)" align="right" />
            <ThCell label="Net Worth ($T)" align="right" />
            <ThCell label="1Q Chg (%)" align="right" />
            <ThCell label="1Y Chg (%)" align="right" />
            <ThCell label="Equity Alloc" align="right" />
            <ThCell label="Debt Alloc" align="right" />
          </tr>
        </thead>
        <tbody>
          {sectors.map((s) => (
            <tr key={s.sector} className="border-b border-border/10 hover:bg-indigo-400/[0.02] transition-colors">
              <td className="px-1.5 py-1 whitespace-nowrap text-left text-white font-bold">
                {s.sector}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                {fmtTrillion(s.totalAssets)}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                {fmtTrillion(s.liabilities)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${s.netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtTrillion(s.netWorth)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${changeColor(s.change1Q)}`}>
                {fmtChange(s.change1Q)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${changeColor(s.change1Y)}`}>
                {fmtChange(s.change1Y)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right ${allocColor(s.equityAlloc)}`}>
                {fmtPct(s.equityAlloc)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right ${allocColor(s.debtAlloc)}`}>
                {fmtPct(s.debtAlloc)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Credit Market Table ──

function CreditMarketTable({ instruments }: { instruments: CreditMarketInstrument[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Instrument" align="left" />
            <ThCell label="Outstanding ($T)" align="right" />
            <ThCell label="Net Issuance Q ($B)" align="right" />
            <ThCell label="Net Issuance Y ($B)" align="right" />
            <ThCell label="% GDP" align="right" />
          </tr>
        </thead>
        <tbody>
          {instruments.map((inst) => (
            <tr key={inst.instrument} className="border-b border-border/10 hover:bg-indigo-400/[0.02] transition-colors">
              <td className="px-1.5 py-1 whitespace-nowrap text-left text-white font-bold">
                {inst.instrument}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                {fmtTrillion(inst.outstanding)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${changeColor(inst.netIssuanceQ)}`}>
                {fmtBillion(inst.netIssuanceQ)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${changeColor(inst.netIssuanceY)}`}>
                {fmtBillion(inst.netIssuanceY)}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                {fmtPct(inst.pctGdp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Household Balance Sheet ──

function HouseholdBalanceSheetSection({ balance }: { balance: HouseholdBalanceSheet }) {
  return (
    <div className="px-2 py-1.5">
      {/* Key metrics bar */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        <div>
          <div className="text-[6px] font-mono uppercase tracking-wider text-neutral-600">Total Assets</div>
          <div className="text-[9px] font-mono font-bold text-indigo-400">${fmtTrillion(balance.totalAssets)}T</div>
        </div>
        <div>
          <div className="text-[6px] font-mono uppercase tracking-wider text-neutral-600">Total Liabilities</div>
          <div className="text-[9px] font-mono font-bold text-red-400">${fmtTrillion(balance.totalLiabilities)}T</div>
        </div>
        <div>
          <div className="text-[6px] font-mono uppercase tracking-wider text-neutral-600">Savings Rate</div>
          <div className={`text-[9px] font-mono font-bold ${balance.savingsRate > 5 ? 'text-emerald-400' : balance.savingsRate > 2 ? 'text-yellow-400' : 'text-red-400'}`}>
            {fmtPct(balance.savingsRate)}
          </div>
        </div>
        <div>
          <div className="text-[6px] font-mono uppercase tracking-wider text-neutral-600">Debt Service</div>
          <div className={`text-[9px] font-mono font-bold ${balance.debtServiceRatio > 12 ? 'text-red-400' : balance.debtServiceRatio > 9 ? 'text-yellow-400' : 'text-emerald-400'}`}>
            {fmtPct(balance.debtServiceRatio)}
          </div>
        </div>
      </div>

      {/* 2-column layout: assets vs liabilities */}
      <div className="grid grid-cols-2 gap-2">
        {/* Assets column */}
        <div>
          <div className="flex items-center gap-1 mb-1 pb-0.5 border-b border-indigo-400/20">
            <div className="w-1 h-1 bg-indigo-400" />
            <span className="text-[7px] font-mono font-black uppercase tracking-wider text-indigo-400">Assets</span>
            <span className="text-[7px] font-mono font-bold text-indigo-400 ml-auto">${fmtTrillion(balance.totalAssets)}T</span>
          </div>
          {balance.assets.map((a) => (
            <div key={a.name} className="flex items-center justify-between py-0.5 hover:bg-indigo-400/[0.02]">
              <span className="text-[7px] font-mono text-neutral-400 truncate mr-1">{a.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[7px] font-mono text-neutral-600 tabular-nums">{fmtPct(a.pctTotal)}</span>
                <span className={`text-[7px] font-mono font-bold tabular-nums ${changeColor(a.change1Q)}`}>
                  {fmtChange(a.change1Q)}
                </span>
                <span className="text-[7px] font-mono font-bold text-white tabular-nums w-[42px] text-right">
                  ${fmtTrillion(a.value)}T
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Liabilities column */}
        <div>
          <div className="flex items-center gap-1 mb-1 pb-0.5 border-b border-red-400/20">
            <div className="w-1 h-1 bg-red-400" />
            <span className="text-[7px] font-mono font-black uppercase tracking-wider text-red-400">Liabilities</span>
            <span className="text-[7px] font-mono font-bold text-red-400 ml-auto">${fmtTrillion(balance.totalLiabilities)}T</span>
          </div>
          {balance.liabilities.map((l) => (
            <div key={l.name} className="flex items-center justify-between py-0.5 hover:bg-indigo-400/[0.02]">
              <span className="text-[7px] font-mono text-neutral-400 truncate mr-1">{l.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[7px] font-mono text-neutral-600 tabular-nums">{fmtPct(l.pctTotal)}</span>
                <span className={`text-[7px] font-mono font-bold tabular-nums ${changeColor(l.change1Q)}`}>
                  {fmtChange(l.change1Q)}
                </span>
                <span className="text-[7px] font-mono font-bold text-white tabular-nums w-[42px] text-right">
                  ${fmtTrillion(l.value)}T
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Net worth footer */}
      <div className="flex items-center justify-between mt-2 pt-1 border-t border-indigo-400/20">
        <span className="text-[7px] font-mono font-black uppercase tracking-wider text-neutral-500">Household Net Worth</span>
        <span className="text-[10px] font-mono font-black text-indigo-400 tabular-nums">
          ${fmtTrillion(balance.netWorth)}T
        </span>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function FlowOfFundsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useFlowOfFunds();

  const fundsData = data as FlowOfFundsData | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-indigo-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
            <circle cx="7" cy="7" r="5.5" fill="none" stroke="#818cf8" strokeWidth="1" />
            <path d="M4 7h6M7 4v6" stroke="#818cf8" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-indigo-400">
            {tr(t, 'fofTitle', 'Flow of Funds')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {fundsData?.summary && (
            <span className="text-[8px] font-mono font-black tabular-nums text-indigo-400">
              ${fmtTrillion(fundsData.summary.totalCreditMarket)}T
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral-600 hover:text-indigo-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && !fundsData && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider animate-pulse">
            LOADING...
          </span>
        </div>
      )}

      {/* No data */}
      {!fundsData && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            {tr(t, 'noData', 'No data')}
          </span>
        </div>
      )}

      {/* Scrollable content */}
      {fundsData && (
        <div className="flex-1 overflow-auto no-scrollbar">
          {/* Summary bar */}
          {fundsData.summary && (
            <SummaryBar summary={fundsData.summary} />
          )}

          {/* Sector Flows */}
          {fundsData.sectorFlows && fundsData.sectorFlows.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'fofSectorFlows', 'Sector Flows')} />
              <SectorFlowsTable sectors={fundsData.sectorFlows} />
            </>
          )}

          {/* Credit Market */}
          {fundsData.creditMarket && fundsData.creditMarket.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'fofCreditMarket', 'Credit Market')} />
              <CreditMarketTable instruments={fundsData.creditMarket} />
            </>
          )}

          {/* Household Balance Sheet */}
          {fundsData.householdBalance && (
            <>
              <SectionHeader title={tr(t, 'fofHouseholdBalance', 'Household Balance Sheet')} />
              <HouseholdBalanceSheetSection balance={fundsData.householdBalance} />
            </>
          )}

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
