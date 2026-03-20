import { useInsiderTransaction } from '../../api/hooks/use-insider-transaction';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

// -- Formatting helpers --

function fmtShares(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtValue(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtRatio(n: number): string {
  return n.toFixed(2);
}

// -- Color helpers --

function typeColor(type: string): string {
  const t = type.toUpperCase();
  if (t === 'BUY' || t === 'P' || t === 'PURCHASE') return 'text-green-400';
  if (t === 'SELL' || t === 'S' || t === 'SALE') return 'text-red-400';
  return 'text-neutral-400';
}

function typeBadge(type: string): string {
  const t = type.toUpperCase();
  if (t === 'BUY' || t === 'P' || t === 'PURCHASE')
    return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (t === 'SELL' || t === 'S' || t === 'SALE')
    return 'bg-red-400/20 text-red-400 border-red-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function sentimentColor(ratio: number): string {
  if (ratio >= 2.0) return 'text-green-400';
  if (ratio >= 1.0) return 'text-indigo-400';
  if (ratio >= 0.5) return 'text-yellow-400';
  return 'text-red-400';
}

function sentimentLabel(ratio: number): string {
  if (ratio >= 2.0) return 'STRONG BUY';
  if (ratio >= 1.0) return 'BULLISH';
  if (ratio >= 0.5) return 'NEUTRAL';
  return 'BEARISH';
}

function sentimentBadge(ratio: number): string {
  if (ratio >= 2.0) return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (ratio >= 1.0) return 'bg-indigo-400/20 text-indigo-400 border-indigo-400/30';
  if (ratio >= 0.5) return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  return 'bg-red-400/20 text-red-400 border-red-400/30';
}

function trackRecordColor(successRate: number): string {
  if (successRate >= 70) return 'text-green-400';
  if (successRate >= 50) return 'text-indigo-400';
  return 'text-red-400';
}

// -- Interfaces --

interface InsiderSentiment {
  buyCount: number;
  sellCount: number;
  buyValue: number;
  sellValue: number;
  buyRatio: number;
  netActivity: number;
}

interface RecentTransaction {
  company: string;
  ticker: string;
  insider: string;
  title: string;
  type: string;
  shares: number;
  value: number;
  date: string;
}

interface ClusterActivity {
  company: string;
  ticker: string;
  insiderCount: number;
  totalShares: number;
  totalValue: number;
  period: string;
}

interface LargestTransaction {
  company: string;
  ticker: string;
  insider: string;
  type: string;
  shares: number;
  value: number;
  date: string;
}

interface SectorSummary {
  sector: string;
  buyCount: number;
  sellCount: number;
  buyValue: number;
  sellValue: number;
  ratio: number;
}

interface NotableInsider {
  name: string;
  company: string;
  ticker: string;
  totalTrades: number;
  successRate: number;
  avgReturn: number;
  lastAction: string;
}

// -- Main Panel --

export function InsiderTransactionPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useInsiderTransaction();

  const sentiment = data?.sentiment as InsiderSentiment | undefined;
  const recentTransactions = data?.recentTransactions as RecentTransaction[] | undefined;
  const clusterBuying = data?.clusterBuying as ClusterActivity[] | undefined;
  const clusterSelling = data?.clusterSelling as ClusterActivity[] | undefined;
  const largestTransactions = data?.largestTransactions as LargestTransaction[] | undefined;
  const sectorSummary = data?.sectorSummary as SectorSummary[] | undefined;
  const notableInsiders = data?.notableInsiders as NotableInsider[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-indigo-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-indigo-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-indigo-400">
            {tr(t, 'panelInsiderTransaction', 'Insider Transaction')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-indigo-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-indigo-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'insiderNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {sentiment && <SentimentBar sentiment={sentiment} t={t} />}
            {recentTransactions && recentTransactions.length > 0 && (
              <RecentTransactionsSection transactions={recentTransactions} t={t} />
            )}
            {clusterBuying && clusterBuying.length > 0 && (
              <ClusterSection
                clusters={clusterBuying}
                t={t}
                titleKey="insiderClusterBuying"
                titleFallback="Cluster Buying"
                accentClass="text-green-400"
              />
            )}
            {clusterSelling && clusterSelling.length > 0 && (
              <ClusterSection
                clusters={clusterSelling}
                t={t}
                titleKey="insiderClusterSelling"
                titleFallback="Cluster Selling"
                accentClass="text-red-400"
              />
            )}
            {largestTransactions && largestTransactions.length > 0 && (
              <LargestTransactionsSection transactions={largestTransactions} t={t} />
            )}
            {sectorSummary && sectorSummary.length > 0 && (
              <SectorSummarySection sectors={sectorSummary} t={t} />
            )}
            {notableInsiders && notableInsiders.length > 0 && (
              <NotableInsidersSection insiders={notableInsiders} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -- Insider Sentiment Bar --

function SentimentBar({
  sentiment,
  t,
}: {
  sentiment: InsiderSentiment;
  t: ReturnType<typeof useT>;
}) {
  const buyPct = sentiment.buyCount + sentiment.sellCount > 0
    ? (sentiment.buyCount / (sentiment.buyCount + sentiment.sellCount)) * 100
    : 50;

  return (
    <div className="border-b border-indigo-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-indigo-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'insiderSentiment', 'Sentiment')}
          </div>
          <div className="mt-0.5">
            <span
              className={`inline-block px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${sentimentBadge(sentiment.buyRatio)}`}
            >
              {sentimentLabel(sentiment.buyRatio)}
            </span>
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'insiderBuySellRatio', 'Buy/Sell Ratio')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${sentimentColor(sentiment.buyRatio)}`}>
            {fmtRatio(sentiment.buyRatio)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'insiderBuys', 'Buys')}
          </div>
          <div className="text-[10px] font-mono font-bold text-green-400">
            {sentiment.buyCount}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'insiderSells', 'Sells')}
          </div>
          <div className="text-[10px] font-mono font-bold text-red-400">
            {sentiment.sellCount}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'insiderNetActivity', 'Net Activity')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtValue(sentiment.netActivity)}
          </div>
        </div>
      </div>

      {/* Buy/Sell ratio bar */}
      <div className="px-3 pb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[7px] font-mono text-green-400 w-8 text-right">
            {fmtValue(sentiment.buyValue)}
          </span>
          <div className="flex-1 h-1.5 bg-neutral-800 relative flex">
            <div
              className="h-full bg-green-400"
              style={{ width: `${buyPct}%` }}
            />
            <div
              className="h-full bg-red-400"
              style={{ width: `${100 - buyPct}%` }}
            />
          </div>
          <span className="text-[7px] font-mono text-red-400 w-8">
            {fmtValue(sentiment.sellValue)}
          </span>
        </div>
      </div>
    </div>
  );
}

// -- Recent Transactions Section --

function RecentTransactionsSection({
  transactions,
  t,
}: {
  transactions: RecentTransaction[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-indigo-400/30">
      <div className="px-3 py-1 border-b border-indigo-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'insiderRecentTxns', 'Recent Transactions')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_56px_40px_56px_56px] gap-0 px-2 py-0.5 border-b border-indigo-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'insiderCompany', 'Company')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'insiderInsider', 'Insider')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'insiderTitle', 'Title')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'insiderType', 'Type')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'insiderShares', 'Shares')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'insiderValue', 'Value')}
        </span>
      </div>

      {/* Rows */}
      {transactions.map((txn, i) => (
        <div
          key={`${txn.ticker}-${txn.insider}-${i}`}
          className="grid grid-cols-[1fr_80px_56px_40px_56px_56px] gap-0 px-2 py-[3px] border-b border-indigo-400/5 hover:bg-indigo-400/[0.02] transition-colors items-center"
        >
          <div className="flex items-center gap-1 truncate">
            <span className="text-[8px] font-mono font-bold text-indigo-400">
              {txn.ticker}
            </span>
            <span className="text-[7px] font-mono text-neutral-500 truncate">
              {txn.company}
            </span>
          </div>
          <span className="text-[8px] font-mono text-neutral-300 truncate">
            {txn.insider}
          </span>
          <span className="text-[7px] font-mono text-neutral-500 truncate">
            {txn.title}
          </span>
          <div className="text-center">
            <span
              className={`inline-block px-1 py-0 text-[7px] font-mono font-bold uppercase border ${typeBadge(txn.type)}`}
            >
              {txn.type}
            </span>
          </div>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtShares(txn.shares)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${typeColor(txn.type)}`}>
            {fmtValue(txn.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Cluster Activity Section (shared for buying/selling) --

function ClusterSection({
  clusters,
  t,
  titleKey,
  titleFallback,
  accentClass,
}: {
  clusters: ClusterActivity[];
  t: ReturnType<typeof useT>;
  titleKey: string;
  titleFallback: string;
  accentClass: string;
}) {
  return (
    <div className="border-b border-indigo-400/30">
      <div className="px-3 py-1 border-b border-indigo-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, titleKey, titleFallback)}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_64px_64px_56px] gap-0 px-2 py-0.5 border-b border-indigo-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'insiderCompany', 'Company')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'insiderInsiders', 'Insiders')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'insiderShares', 'Shares')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'insiderValue', 'Value')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'insiderPeriod', 'Period')}
        </span>
      </div>

      {/* Rows */}
      {clusters.map((c, i) => (
        <div
          key={`${c.ticker}-${i}`}
          className="grid grid-cols-[1fr_56px_64px_64px_56px] gap-0 px-2 py-[3px] border-b border-indigo-400/5 hover:bg-indigo-400/[0.02] transition-colors items-center"
        >
          <div className="flex items-center gap-1 truncate">
            <span className={`text-[8px] font-mono font-bold ${accentClass}`}>
              {c.ticker}
            </span>
            <span className="text-[7px] font-mono text-neutral-500 truncate">
              {c.company}
            </span>
          </div>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {c.insiderCount}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtShares(c.totalShares)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${accentClass}`}>
            {fmtValue(c.totalValue)}
          </span>
          <span className="text-[7px] font-mono text-neutral-500 text-right pr-2">
            {c.period}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Largest Transactions Section --

function LargestTransactionsSection({
  transactions,
  t,
}: {
  transactions: LargestTransaction[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-indigo-400/30">
      <div className="px-3 py-1 border-b border-indigo-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'insiderLargest', 'Largest Transactions')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_40px_56px_64px] gap-0 px-2 py-0.5 border-b border-indigo-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'insiderCompany', 'Company')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'insiderInsider', 'Insider')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'insiderType', 'Type')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'insiderShares', 'Shares')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'insiderValue', 'Value')}
        </span>
      </div>

      {/* Rows */}
      {transactions.map((txn, i) => (
        <div
          key={`${txn.ticker}-${txn.insider}-${i}`}
          className="grid grid-cols-[1fr_80px_40px_56px_64px] gap-0 px-2 py-[3px] border-b border-indigo-400/5 hover:bg-indigo-400/[0.02] transition-colors items-center"
        >
          <div className="flex items-center gap-1 truncate">
            <span className="text-[8px] font-mono font-bold text-indigo-400">
              {txn.ticker}
            </span>
            <span className="text-[7px] font-mono text-neutral-500 truncate">
              {txn.company}
            </span>
          </div>
          <span className="text-[8px] font-mono text-neutral-300 truncate">
            {txn.insider}
          </span>
          <div className="text-center">
            <span
              className={`inline-block px-1 py-0 text-[7px] font-mono font-bold uppercase border ${typeBadge(txn.type)}`}
            >
              {txn.type}
            </span>
          </div>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtShares(txn.shares)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${typeColor(txn.type)}`}>
            {fmtValue(txn.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Sector Summary Section --

function SectorSummarySection({
  sectors,
  t,
}: {
  sectors: SectorSummary[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-indigo-400/30">
      <div className="px-3 py-1 border-b border-indigo-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'insiderSectorSummary', 'Sector Summary')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_40px_40px_56px_56px_48px_64px] gap-0 px-2 py-0.5 border-b border-indigo-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'insiderSector', 'Sector')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'insiderBuys', 'Buys')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'insiderSells', 'Sells')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'insiderBuyVal', 'Buy Val')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'insiderSellVal', 'Sell Val')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'insiderRatio', 'Ratio')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'insiderBias', 'Bias')}
        </span>
      </div>

      {/* Rows */}
      {sectors.map((s) => {
        const buyPct = s.buyCount + s.sellCount > 0
          ? (s.buyCount / (s.buyCount + s.sellCount)) * 100
          : 50;

        return (
          <div
            key={s.sector}
            className="grid grid-cols-[1fr_40px_40px_56px_56px_48px_64px] gap-0 px-2 py-[3px] border-b border-indigo-400/5 hover:bg-indigo-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-indigo-400 truncate">
              {s.sector}
            </span>
            <span className="text-[8px] font-mono font-bold text-green-400 text-right">
              {s.buyCount}
            </span>
            <span className="text-[8px] font-mono font-bold text-red-400 text-right">
              {s.sellCount}
            </span>
            <span className="text-[8px] font-mono text-green-400 text-right">
              {fmtValue(s.buyValue)}
            </span>
            <span className="text-[8px] font-mono text-red-400 text-right">
              {fmtValue(s.sellValue)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${sentimentColor(s.ratio)}`}>
              {fmtRatio(s.ratio)}
            </span>
            {/* Bias bar */}
            <div className="flex items-center gap-1 justify-end pr-2">
              <div className="w-12 h-1.5 bg-neutral-800 relative flex">
                <div
                  className="h-full bg-green-400"
                  style={{ width: `${buyPct}%` }}
                />
                <div
                  className="h-full bg-red-400"
                  style={{ width: `${100 - buyPct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Notable Insiders Section --

function NotableInsidersSection({
  insiders,
  t,
}: {
  insiders: NotableInsider[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-indigo-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'insiderNotable', 'Notable Insiders')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_48px_56px_48px_48px] gap-0 px-2 py-0.5 border-b border-indigo-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'insiderName', 'Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'insiderCompany', 'Company')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'insiderTrades', 'Trades')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'insiderSuccessRate', 'Success %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'insiderAvgReturn', 'Avg Ret')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'insiderLastAction', 'Last')}
        </span>
      </div>

      {/* Rows */}
      {insiders.map((ins, i) => (
        <div
          key={`${ins.name}-${ins.ticker}-${i}`}
          className="grid grid-cols-[1fr_72px_48px_56px_48px_48px] gap-0 px-2 py-[3px] border-b border-indigo-400/5 hover:bg-indigo-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {ins.name}
          </span>
          <div className="flex items-center gap-1 truncate">
            <span className="text-[8px] font-mono font-bold text-indigo-400">
              {ins.ticker}
            </span>
            <span className="text-[7px] font-mono text-neutral-500 truncate">
              {ins.company}
            </span>
          </div>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {ins.totalTrades}
          </span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-8 h-1.5 bg-neutral-800 relative">
              <div
                className={`absolute top-0 left-0 h-full ${ins.successRate >= 70 ? 'bg-green-400' : ins.successRate >= 50 ? 'bg-indigo-400' : 'bg-red-400'}`}
                style={{ width: `${Math.min(ins.successRate, 100)}%` }}
              />
            </div>
            <span className={`text-[8px] font-mono font-bold ${trackRecordColor(ins.successRate)}`}>
              {fmtPct(ins.successRate)}
            </span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right ${ins.avgReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {ins.avgReturn >= 0 ? '+' : ''}{fmtPct(ins.avgReturn)}%
          </span>
          <div className="text-right pr-2">
            <span
              className={`inline-block px-1 py-0 text-[7px] font-mono font-bold uppercase border ${typeBadge(ins.lastAction)}`}
            >
              {ins.lastAction}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
