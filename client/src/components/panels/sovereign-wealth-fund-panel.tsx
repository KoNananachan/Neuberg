import { useSovereignWealthFund } from '../../api/hooks/use-sovereign-wealth-fund';
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

function fmtB(n: number): string {
  return n.toFixed(1);
}

function fmtM(n: number): string {
  return n.toFixed(0);
}

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtReturn(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function trendArrow(n: number): string {
  if (n > 0) return '\u25B2';
  if (n < 0) return '\u25BC';
  return '\u25C6';
}

function transparencyColor(score: number): string {
  if (score >= 8) return 'bg-green-400';
  if (score >= 5) return 'bg-yellow-400';
  return 'bg-red-400';
}

function actionColor(action: string): string {
  const a = action.toUpperCase();
  if (a === 'BUY' || a === 'INCREASE') return 'text-green-400';
  if (a === 'SELL' || a === 'DECREASE') return 'text-red-400';
  return 'text-neutral-400';
}

function actionBg(action: string): string {
  const a = action.toUpperCase();
  if (a === 'BUY' || a === 'INCREASE') return 'bg-green-400/10';
  if (a === 'SELL' || a === 'DECREASE') return 'bg-red-400/10';
  return 'bg-neutral-400/10';
}

// ── Interfaces ──

interface SwfSummary {
  totalAum: number;
  activeFunds: number;
  avgYtdReturn: number;
  largestFund: string;
  netFlows1m: number;
}

interface SwfFund {
  rank: number;
  name: string;
  country: string;
  aumB: number;
  sourceType: string;
  transparency: number;
  ytdReturn: number;
}

interface SwfTransaction {
  fund: string;
  action: string;
  asset: string;
  sector: string;
  sizeM: number;
  date: string;
}

interface SwfAllocation {
  fund: string;
  equity: number;
  fixedIncome: number;
  realEstate: number;
  alternatives: number;
  infrastructure: number;
  cash: number;
}

interface SwfGeography {
  region: string;
  avgAllocation: number;
  change1y: number;
  topFund: string;
}

interface SwfPerformance {
  fund: string;
  ytd: number;
  oneYear: number;
  threeYear: number;
  fiveYear: number;
  tenYear: number;
}

interface SwfMarketImpact {
  sector: string;
  netFlowB: number;
  change1m: number;
  topBuyer: string;
  topSeller: string;
}

interface SwfPolicyChange {
  fund: string;
  date: string;
  type: string;
  description: string;
  impact: string;
}

// ── Main Panel ──

export function SovereignWealthFundPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSovereignWealthFund();

  const summary = data?.summary as SwfSummary | undefined;
  const funds = data?.funds as SwfFund[] | undefined;
  const transactions = data?.transactions as SwfTransaction[] | undefined;
  const allocations = data?.allocations as SwfAllocation[] | undefined;
  const geography = data?.geography as SwfGeography[] | undefined;
  const performance = data?.performance as SwfPerformance[] | undefined;
  const marketImpact = data?.marketImpact as SwfMarketImpact[] | undefined;
  const policyChanges = data?.policyChanges as SwfPolicyChange[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-teal-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-teal-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-teal-400">
            {tr(t, 'panelSovereignWealthFund', 'Sovereign Wealth Fund Monitor')}
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
            No data available
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} />}
            {funds && funds.length > 0 && <FundOverviewSection funds={funds} />}
            {transactions && transactions.length > 0 && (
              <RecentTransactionsSection transactions={transactions} />
            )}
            {allocations && allocations.length > 0 && (
              <AssetAllocationSection allocations={allocations} />
            )}
            {geography && geography.length > 0 && (
              <GeographicExposureSection geography={geography} />
            )}
            {performance && performance.length > 0 && (
              <PerformanceReturnsSection performance={performance} />
            )}
            {marketImpact && marketImpact.length > 0 && (
              <MarketImpactSection impacts={marketImpact} />
            )}
            {policyChanges && policyChanges.length > 0 && (
              <PolicyChangesSection changes={policyChanges} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({ summary }: { summary: SwfSummary }) {
  return (
    <div className="border-b border-teal-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-teal-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Total AUM ($T)
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {(summary.totalAum / 1000).toFixed(2)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Active Funds
          </div>
          <div className="text-[10px] font-mono font-bold text-teal-400">
            {summary.activeFunds}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Avg YTD Return
          </div>
          <div className={`text-[10px] font-mono font-bold ${changeColor(summary.avgYtdReturn)}`}>
            {fmtReturn(summary.avgYtdReturn)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Largest Fund
          </div>
          <div className="text-[10px] font-mono font-bold text-white truncate">
            {summary.largestFund}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Net Flows 1M ($B)
          </div>
          <div className={`text-[10px] font-mono font-bold ${changeColor(summary.netFlows1m)}`}>
            {fmtChg(summary.netFlows1m)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Fund Overview Section ──

function FundOverviewSection({ funds }: { funds: SwfFund[] }) {
  return (
    <div className="border-b border-teal-400/30">
      <div className="px-3 py-1 border-b border-teal-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Fund Overview
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[24px_1fr_56px_64px_56px_48px_48px] gap-0 px-2 py-0.5 border-b border-teal-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          #
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Fund Name
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Country
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          AUM ($B)
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Source
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          Transp
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          YTD
        </span>
      </div>

      {/* Rows */}
      {funds.map((fund, i) => (
        <div
          key={`${fund.name}-${i}`}
          className="grid grid-cols-[24px_1fr_56px_64px_56px_48px_48px] gap-0 px-2 py-[3px] border-b border-teal-400/5 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono text-neutral-600">
            {fund.rank}
          </span>
          <span className="text-[8px] font-mono font-bold text-teal-400 truncate">
            {fund.name}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {fund.country}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtB(fund.aumB)}
          </span>
          <span className="text-[7px] font-mono text-neutral-500 truncate">
            {fund.sourceType}
          </span>
          {/* Transparency bar */}
          <div className="flex items-center justify-center">
            <div className="w-8 h-1.5 bg-neutral-800 relative">
              <div
                className={`absolute top-0 left-0 h-full ${transparencyColor(fund.transparency)}`}
                style={{ width: `${Math.min(fund.transparency * 10, 100)}%` }}
              />
            </div>
            <span className="text-[7px] font-mono text-neutral-500 ml-1">
              {fund.transparency}
            </span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(fund.ytdReturn)}`}>
            {fmtReturn(fund.ytdReturn)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Recent Transactions Section ──

function RecentTransactionsSection({ transactions }: { transactions: SwfTransaction[] }) {
  return (
    <div className="border-b border-teal-400/30">
      <div className="px-3 py-1 border-b border-teal-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Recent Transactions
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_80px_64px_56px_56px] gap-0 px-2 py-0.5 border-b border-teal-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Fund
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          Action
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Asset
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Sector
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Size ($M)
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Date
        </span>
      </div>

      {/* Rows */}
      {transactions.map((tx, i) => (
        <div
          key={`${tx.fund}-${tx.asset}-${i}`}
          className="grid grid-cols-[1fr_48px_80px_64px_56px_56px] gap-0 px-2 py-[3px] border-b border-teal-400/5 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-teal-400 truncate">
            {tx.fund}
          </span>
          <span className="flex items-center justify-center">
            <span
              className={`px-1 py-0.5 text-[6px] font-mono font-bold uppercase tracking-wider ${actionColor(tx.action)} ${actionBg(tx.action)}`}
            >
              {tx.action}
            </span>
          </span>
          <span className="text-[8px] font-mono text-neutral-300 truncate">
            {tx.asset}
          </span>
          <span className="text-[7px] font-mono text-neutral-500 truncate">
            {tx.sector}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtM(tx.sizeM)}
          </span>
          <span className="text-[7px] font-mono text-neutral-500 text-right pr-2">
            {tx.date}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Asset Allocation Section ──

function AssetAllocationSection({ allocations }: { allocations: SwfAllocation[] }) {
  return (
    <div className="border-b border-teal-400/30">
      <div className="px-3 py-1 border-b border-teal-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Asset Allocation
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_40px_40px_40px_40px_40px_40px] gap-0 px-2 py-0.5 border-b border-teal-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Fund
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Equity
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          FI
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          RE
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Alts
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Infra
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Cash
        </span>
      </div>

      {/* Rows */}
      {allocations.map((alloc, i) => (
        <div
          key={`${alloc.fund}-${i}`}
          className="grid grid-cols-[1fr_40px_40px_40px_40px_40px_40px] gap-0 px-2 py-[3px] border-b border-teal-400/5 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-teal-400 truncate">
            {alloc.fund}
          </span>
          <span className="text-[8px] font-mono text-white text-right">
            {fmtPct(alloc.equity)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPct(alloc.fixedIncome)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPct(alloc.realEstate)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPct(alloc.alternatives)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPct(alloc.infrastructure)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2">
            {fmtPct(alloc.cash)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Geographic Exposure Section ──

function GeographicExposureSection({ geography }: { geography: SwfGeography[] }) {
  const maxPct = Math.max(...geography.map((g) => g.avgAllocation), 1);

  return (
    <div className="border-b border-teal-400/30">
      <div className="px-3 py-1 border-b border-teal-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Geographic Exposure
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_80px_48px_72px] gap-0 px-2 py-0.5 border-b border-teal-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Region
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Avg %
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          Allocation
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          1Y Chg
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Top Fund
        </span>
      </div>

      {/* Rows */}
      {geography.map((geo) => {
        const barWidth = maxPct > 0 ? Math.min((geo.avgAllocation / maxPct) * 100, 100) : 0;
        return (
          <div
            key={geo.region}
            className="grid grid-cols-[1fr_48px_80px_48px_72px] gap-0 px-2 py-[3px] border-b border-teal-400/5 hover:bg-teal-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-teal-400 truncate">
              {geo.region}
            </span>
            <span className="text-[8px] font-mono font-bold text-white text-right">
              {fmtPct(geo.avgAllocation)}
            </span>
            <div className="px-1">
              <div className="w-full h-1.5 bg-neutral-800 relative">
                <div
                  className="absolute top-0 left-0 h-full bg-teal-400"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(geo.change1y)}`}>
              {fmtChg(geo.change1y)}
            </span>
            <span className="text-[7px] font-mono text-neutral-500 text-right pr-2 truncate">
              {geo.topFund}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Performance Returns Section ──

function PerformanceReturnsSection({ performance }: { performance: SwfPerformance[] }) {
  return (
    <div className="border-b border-teal-400/30">
      <div className="px-3 py-1 border-b border-teal-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Performance Returns
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_48px_48px_48px_48px] gap-0 px-2 py-0.5 border-b border-teal-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Fund
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          YTD
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          1Y
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          3Y
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          5Y
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          10Y
        </span>
      </div>

      {/* Rows */}
      {performance.map((perf, i) => (
        <div
          key={`${perf.fund}-${i}`}
          className="grid grid-cols-[1fr_48px_48px_48px_48px_48px] gap-0 px-2 py-[3px] border-b border-teal-400/5 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-teal-400 truncate">
            {perf.fund}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(perf.ytd)}`}>
            {fmtReturn(perf.ytd)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(perf.oneYear)}`}>
            {fmtReturn(perf.oneYear)}
          </span>
          <span className={`text-[8px] font-mono text-right ${changeColor(perf.threeYear)}`}>
            {fmtReturn(perf.threeYear)}
          </span>
          <span className={`text-[8px] font-mono text-right ${changeColor(perf.fiveYear)}`}>
            {fmtReturn(perf.fiveYear)}
          </span>
          <span className={`text-[8px] font-mono text-right pr-2 ${changeColor(perf.tenYear)}`}>
            {fmtReturn(perf.tenYear)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Market Impact Section ──

function MarketImpactSection({ impacts }: { impacts: SwfMarketImpact[] }) {
  return (
    <div className="border-b border-teal-400/30">
      <div className="px-3 py-1 border-b border-teal-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Market Impact Flows
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_48px_32px_72px_72px] gap-0 px-2 py-0.5 border-b border-teal-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Sector
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Net ($B)
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          1M Chg
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Trend
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Top Buyer
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Top Seller
        </span>
      </div>

      {/* Rows */}
      {impacts.map((impact, i) => (
        <div
          key={`${impact.sector}-${i}`}
          className="grid grid-cols-[1fr_56px_48px_32px_72px_72px] gap-0 px-2 py-[3px] border-b border-teal-400/5 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {impact.sector}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(impact.netFlowB)}`}>
            {fmtChg(impact.netFlowB)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(impact.change1m)}`}>
            {fmtChg(impact.change1m)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(impact.netFlowB)}`}>
            {trendArrow(impact.netFlowB)}
          </span>
          <span className="text-[7px] font-mono text-teal-400 text-right truncate">
            {impact.topBuyer}
          </span>
          <span className="text-[7px] font-mono text-neutral-500 text-right pr-2 truncate">
            {impact.topSeller}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Policy Changes Section ──

function PolicyChangesSection({ changes }: { changes: SwfPolicyChange[] }) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-teal-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Policy Changes
        </span>
      </div>

      {/* Rows */}
      {changes.map((change, i) => (
        <div
          key={`${change.fund}-${change.date}-${i}`}
          className="px-2 py-[4px] border-b border-teal-400/5 hover:bg-teal-400/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono font-bold text-teal-400 shrink-0">
              {change.fund}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 shrink-0">
              {change.date}
            </span>
            <span className="px-1 py-0.5 text-[6px] font-mono font-bold uppercase tracking-wider text-teal-400 bg-teal-400/10 shrink-0">
              {change.type}
            </span>
          </div>
          <div className="mt-0.5 flex items-start gap-2">
            <span className="text-[8px] font-mono text-neutral-300 flex-1">
              {change.description}
            </span>
            <span className={`text-[7px] font-mono font-bold shrink-0 ${
              change.impact.toUpperCase() === 'POSITIVE' ? 'text-green-400' :
              change.impact.toUpperCase() === 'NEGATIVE' ? 'text-red-400' :
              'text-neutral-500'
            }`}>
              {change.impact}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
