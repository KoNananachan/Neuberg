import { useBasisTrade } from '../../api/hooks/use-basis-trade';
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

function fmtPrice(n: number): string {
  return n.toFixed(4);
}

function fmt32nds(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtRate(n: number): string {
  return n.toFixed(3);
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtDv01(n: number): string {
  return n.toFixed(2);
}

function fmtBillions(n: number): string {
  return n.toFixed(0);
}

// ── Color helpers ──

function basisColor(n: number): string {
  if (n > 2) return 'text-green-400';
  if (n > 0) return 'text-neutral-300';
  if (n < -2) return 'text-red-400';
  return 'text-neutral-500';
}

function repoColor(impliedRepo: number, sofr: number): string {
  const spread = impliedRepo - sofr;
  if (spread > 10) return 'text-green-400';
  if (spread > 0) return 'text-neutral-300';
  if (spread < -10) return 'text-red-400';
  return 'text-yellow-400';
}

function statusBadge(status: string): string {
  const s = status.toUpperCase();
  if (s === 'RICH') return 'bg-red-400/20 text-red-400 border-red-400/30';
  if (s === 'CHEAP') return 'bg-green-400/20 text-green-400 border-green-400/30';
  return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Interfaces ──

interface BasisTradeSummary {
  avg10yBasis: number;
  avgImpliedRepo: number;
  sofrRate: number;
  basisStatus: string;
  leveragedBasisEstimate: number;
}

interface TreasuryBasis {
  contract: string;
  tenor: string;
  cashPrice: number;
  futuresPrice: number;
  basis32nds: number;
  netBasis: number;
  impliedRepo: number;
  dv01: number;
}

interface CtdAnalysis {
  cusip: string;
  coupon: number;
  maturity: string;
  convFactor: number;
  grossBasis: number;
  netBasis: number;
  impliedRepo: number;
  switchBps: number;
  isCTD: boolean;
}

interface BasisHistory {
  date: string;
  grossBasis: number;
  netBasis: number;
  impliedRepo: number;
  fundingCost: number;
  carry: number;
}

// ── Main Panel ──

export function BasisTradePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useBasisTrade();

  const summary = data?.summary as BasisTradeSummary | undefined;
  const treasuryBasis = data?.treasuryBasis as TreasuryBasis[] | undefined;
  const ctdAnalysis = data?.ctdAnalysis as CtdAnalysis[] | undefined;
  const basisHistory = data?.basisHistory as BasisHistory[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-yellow-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-yellow-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-yellow-400">
            {tr(t, 'basisTradeTitle', 'Treasury Basis Trade Monitor')}
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
            {tr(t, 'basisTradeNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} t={t} />}
            {treasuryBasis && treasuryBasis.length > 0 && (
              <TreasuryBasisSection basis={treasuryBasis} t={t} sofrRate={summary?.sofrRate ?? 0} />
            )}
            {ctdAnalysis && ctdAnalysis.length > 0 && (
              <CtdAnalysisSection ctd={ctdAnalysis} t={t} />
            )}
            {basisHistory && basisHistory.length > 0 && (
              <BasisHistorySection history={basisHistory} t={t} />
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
  summary: BasisTradeSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-yellow-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-yellow-400/10">
        {/* Avg 10Y Basis */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'basisAvg10y', 'Avg 10Y Basis')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${basisColor(summary.avg10yBasis)}`}>
            {fmt32nds(summary.avg10yBasis)}<span className="text-[7px] text-neutral-600">/32</span>
          </div>
        </div>

        {/* Avg Implied Repo */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'basisImplRepo', 'Avg Impl Repo')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtRate(summary.avgImpliedRepo)}%
          </div>
        </div>

        {/* SOFR Rate */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'basisSofr', 'SOFR')}
          </div>
          <div className="text-[10px] font-mono font-bold text-yellow-400">
            {fmtRate(summary.sofrRate)}%
          </div>
        </div>

        {/* Basis Status */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'basisStatus', 'Basis')}
          </div>
          <div className="mt-0.5">
            <span
              className={`inline-block px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${statusBadge(summary.basisStatus)}`}
            >
              {summary.basisStatus}
            </span>
          </div>
        </div>

        {/* Leveraged Basis Estimate */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'basisLeverage', 'Lev Basis Est')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            ${fmtBillions(summary.leveragedBasisEstimate)}B
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Treasury Basis Section ──

function TreasuryBasisSection({
  basis,
  t,
  sofrRate,
}: {
  basis: TreasuryBasis[];
  t: ReturnType<typeof useT>;
  sofrRate: number;
}) {
  return (
    <div className="border-b border-yellow-400/30">
      <div className="px-3 py-1 border-b border-yellow-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'basisTreasuryBasis', 'Treasury Basis')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[72px_40px_64px_64px_52px_52px_56px_48px] gap-0 px-2 py-0.5 border-b border-yellow-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'basisContract', 'Contract')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'basisTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'basisCash', 'Cash Px')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'basisFutures', 'Fut Px')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'basisBasis32', 'Basis')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'basisNetBasis', 'Net Bas')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'basisImpliedRepo', 'Impl Rp%')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'basisDv01', 'DV01')}
        </span>
      </div>

      {/* Rows */}
      {basis.map((b) => (
        <div
          key={`${b.contract}-${b.tenor}`}
          className="grid grid-cols-[72px_40px_64px_64px_52px_52px_56px_48px] gap-0 px-2 py-[3px] border-b border-yellow-400/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-yellow-400">{b.contract}</span>
          <span className="text-[8px] font-mono text-neutral-400">{b.tenor}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPrice(b.cashPrice)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPrice(b.futuresPrice)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${basisColor(b.basis32nds)}`}>
            {fmt32nds(b.basis32nds)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${basisColor(b.netBasis)}`}>
            {fmt32nds(b.netBasis)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${repoColor(b.impliedRepo, sofrRate)}`}>
            {fmtRate(b.impliedRepo)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtDv01(b.dv01)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── CTD Analysis Section ──

function CtdAnalysisSection({
  ctd,
  t,
}: {
  ctd: CtdAnalysis[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-yellow-400/30">
      <div className="px-3 py-1 border-b border-yellow-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'basisCtdAnalysis', 'CTD Analysis')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-yellow-400/10">
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'basisCusip', 'CUSIP')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'basisCoupon', 'Cpn')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'basisMaturity', 'Maturity')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'basisConvFactor', 'CF')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'basisGrossBasis', 'Gross')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'basisNetBasisCtd', 'Net')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'basisImplRepoCtd', 'Impl Rp%')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'basisSwitch', 'Switch')}</th>
              <th className="text-center px-2 py-1 font-normal">{tr(t, 'basisCtd', 'CTD')}</th>
            </tr>
          </thead>
          <tbody>
            {ctd.map((c, i) => (
              <tr
                key={`${c.cusip}-${i}`}
                className="border-b border-neutral-900 hover:bg-yellow-400/[0.02]"
              >
                <td className="px-2 py-1 text-yellow-400 font-bold">{c.cusip}</td>
                <td className="px-2 py-1 text-right text-white">{c.coupon.toFixed(3)}%</td>
                <td className="px-2 py-1 text-neutral-400">{c.maturity}</td>
                <td className="px-2 py-1 text-right text-neutral-300">{c.convFactor.toFixed(4)}</td>
                <td className={`px-2 py-1 text-right font-bold ${basisColor(c.grossBasis)}`}>
                  {fmt32nds(c.grossBasis)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${basisColor(c.netBasis)}`}>
                  {fmt32nds(c.netBasis)}
                </td>
                <td className="px-2 py-1 text-right text-white font-bold">
                  {fmtRate(c.impliedRepo)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${changeColor(c.switchBps)}`}>
                  {fmtBps(c.switchBps)}
                </td>
                <td className="px-2 py-1 text-center">
                  {c.isCTD ? (
                    <span className="text-green-400 font-bold">&#10003;</span>
                  ) : (
                    <span className="text-neutral-700">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Basis History Section ──

function BasisHistorySection({
  history,
  t,
}: {
  history: BasisHistory[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-yellow-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'basisHistory', 'Basis History')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[72px_56px_56px_56px_56px_56px] gap-0 px-2 py-0.5 border-b border-yellow-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'basisDate', 'Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'basisGross', 'Gross')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'basisNet', 'Net')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'basisImplRp', 'Impl Rp%')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'basisFunding', 'Funding')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'basisCarry', 'Carry')}
        </span>
      </div>

      {/* Rows */}
      {history.map((h, i) => (
        <div
          key={`${h.date}-${i}`}
          className="grid grid-cols-[72px_56px_56px_56px_56px_56px] gap-0 px-2 py-[3px] border-b border-yellow-400/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono text-neutral-400">{h.date}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${basisColor(h.grossBasis)}`}>
            {fmt32nds(h.grossBasis)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${basisColor(h.netBasis)}`}>
            {fmt32nds(h.netBasis)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(h.impliedRepo)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtRate(h.fundingCost)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(h.carry)}`}>
            {fmtBps(h.carry)}
          </span>
        </div>
      ))}
    </div>
  );
}
