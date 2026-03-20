import { useBlockTrade } from '../../api/hooks/use-block-trade';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

// -- Formatting helpers --

function fmtShares(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function fmtValue(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtDiscount(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

// -- Color helpers --

function sideColor(side: string): string {
  const s = side.toUpperCase();
  if (s === 'BUY') return 'text-green-400';
  if (s === 'SELL') return 'text-red-400';
  return 'text-neutral-500';
}

function discountColor(n: number): string {
  if (n < -3) return 'text-red-400';
  if (n < -1) return 'text-yellow-400';
  if (n < 0) return 'text-neutral-400';
  if (n > 0) return 'text-green-400';
  return 'text-neutral-500';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function impactColor(level: string): string {
  const l = level.toUpperCase();
  if (l === 'HIGH') return 'bg-red-400/20 text-red-400 border-red-400/30';
  if (l === 'MODERATE') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  if (l === 'LOW') return 'bg-green-400/20 text-green-400 border-green-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

// -- Interfaces --

interface BlockTradeSummary {
  totalBlockVolume: number;
  totalBlockValue: number;
  avgDiscount: number;
  blockCount: number;
  topSector: string;
}

interface RecentBlock {
  ticker: string;
  side: string;
  shares: number;
  value: number;
  pctAdv: number;
  discount: number;
  broker: string;
}

interface LargestBlock {
  ticker: string;
  value: number;
  shares: number;
  pctAdv: number;
  discount: number;
  time: string;
}

interface SectorActivity {
  sector: string;
  blockCount: number;
  totalValue: number;
  avgDiscount: number;
  netFlow: string;
}

interface SecondaryOffering {
  ticker: string;
  offeringSize: number;
  discount: number;
  lockUpDays: number;
  underwriter: string;
  status: string;
}

interface LockUpExpiration {
  ticker: string;
  expirationDate: string;
  sharesUnlocked: number;
  pctFloat: number;
  ipoDate: string;
  priceVsIpo: number;
}

interface DarkPoolPrint {
  ticker: string;
  shares: number;
  price: number;
  value: number;
  venue: string;
  time: string;
}

interface MarketImpact {
  metric: string;
  value: string;
  change: number;
  impact: string;
}

// -- Main Panel --

export function BlockTradePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useBlockTrade();

  const summary = data?.summary as BlockTradeSummary | undefined;
  const recentBlocks = data?.recentBlocks as RecentBlock[] | undefined;
  const largestBlocks = data?.largestBlocks as LargestBlock[] | undefined;
  const sectorActivity = data?.sectorActivity as SectorActivity[] | undefined;
  const secondaryOfferings = data?.secondaryOfferings as SecondaryOffering[] | undefined;
  const lockUpExpirations = data?.lockUpExpirations as LockUpExpiration[] | undefined;
  const darkPoolPrints = data?.darkPoolPrints as DarkPoolPrint[] | undefined;
  const marketImpact = data?.marketImpact as MarketImpact[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-pink-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-pink-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-pink-400">
            {tr(t, 'panelBlockTradeTitle', 'Block Trade')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-pink-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-pink-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'panelBlockTradeNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} t={t} />}
            {recentBlocks && recentBlocks.length > 0 && (
              <RecentBlocksSection blocks={recentBlocks} t={t} />
            )}
            {largestBlocks && largestBlocks.length > 0 && (
              <LargestBlocksSection blocks={largestBlocks} t={t} />
            )}
            {sectorActivity && sectorActivity.length > 0 && (
              <SectorActivitySection sectors={sectorActivity} t={t} />
            )}
            {secondaryOfferings && secondaryOfferings.length > 0 && (
              <SecondaryOfferingsSection offerings={secondaryOfferings} t={t} />
            )}
            {lockUpExpirations && lockUpExpirations.length > 0 && (
              <LockUpExpirationsSection expirations={lockUpExpirations} t={t} />
            )}
            {darkPoolPrints && darkPoolPrints.length > 0 && (
              <DarkPoolPrintsSection prints={darkPoolPrints} t={t} />
            )}
            {marketImpact && marketImpact.length > 0 && (
              <MarketImpactSection impacts={marketImpact} t={t} />
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
  summary: BlockTradeSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-pink-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-pink-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelBlockTradeVolume', 'Block Vol')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtShares(summary.totalBlockVolume)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelBlockTradeValue', 'Total Value')}
          </div>
          <div className="text-[10px] font-mono font-bold text-pink-400">
            {fmtValue(summary.totalBlockValue)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelBlockTradeAvgDisc', 'Avg Discount')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${discountColor(summary.avgDiscount)}`}>
            {fmtDiscount(summary.avgDiscount)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelBlockTradeCount', 'Blocks')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {summary.blockCount}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelBlockTradeTopSector', 'Top Sector')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white truncate">
            {summary.topSector}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Recent Blocks Section --

function RecentBlocksSection({
  blocks,
  t,
}: {
  blocks: RecentBlock[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-pink-400/30">
      <div className="px-3 py-1 border-b border-pink-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelBlockTradeRecent', 'Recent Blocks')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[64px_40px_56px_64px_44px_52px_72px] gap-0 px-2 py-0.5 border-b border-pink-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelBlockTradeTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelBlockTradeSide', 'Side')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeShares', 'Shares')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeVal', 'Value')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeAdv', '% ADV')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeDisc', 'Disc %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelBlockTradeBroker', 'Broker')}
        </span>
      </div>

      {/* Rows */}
      {blocks.map((block, i) => (
        <div
          key={`${block.ticker}-${i}`}
          className="grid grid-cols-[64px_40px_56px_64px_44px_52px_72px] gap-0 px-2 py-[3px] border-b border-pink-400/5 hover:bg-pink-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-pink-400 truncate">
            {block.ticker}
          </span>
          <span className={`text-[8px] font-mono font-bold ${sideColor(block.side)}`}>
            {block.side}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtShares(block.shares)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtValue(block.value)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(block.pctAdv)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${discountColor(block.discount)}`}>
            {fmtDiscount(block.discount)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2 truncate">
            {block.broker}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Largest Blocks Section --

function LargestBlocksSection({
  blocks,
  t,
}: {
  blocks: LargestBlock[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-pink-400/30">
      <div className="px-3 py-1 border-b border-pink-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelBlockTradeLargest', 'Largest Blocks')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[64px_64px_56px_44px_52px_56px] gap-0 px-2 py-0.5 border-b border-pink-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelBlockTradeTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeVal', 'Value')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeShares', 'Shares')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeAdv', '% ADV')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeDisc', 'Disc %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelBlockTradeTime', 'Time')}
        </span>
      </div>

      {/* Rows */}
      {blocks.map((block, i) => (
        <div
          key={`${block.ticker}-${i}`}
          className="grid grid-cols-[64px_64px_56px_44px_52px_56px] gap-0 px-2 py-[3px] border-b border-pink-400/5 hover:bg-pink-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-pink-400 truncate">
            {block.ticker}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtValue(block.value)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtShares(block.shares)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(block.pctAdv)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${discountColor(block.discount)}`}>
            {fmtDiscount(block.discount)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2">
            {block.time}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Sector Activity Section --

function SectorActivitySection({
  sectors,
  t,
}: {
  sectors: SectorActivity[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-pink-400/30">
      <div className="px-3 py-1 border-b border-pink-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelBlockTradeSector', 'Sector Activity')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_64px_52px_56px] gap-0 px-2 py-0.5 border-b border-pink-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelBlockTradeSectorName', 'Sector')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeBlocks', 'Blocks')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeTotalVal', 'Total Val')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeAvgDisc', 'Avg Disc')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelBlockTradeNetFlow', 'Net Flow')}
        </span>
      </div>

      {/* Rows */}
      {sectors.map((sector) => (
        <div
          key={sector.sector}
          className="grid grid-cols-[1fr_48px_64px_52px_56px] gap-0 px-2 py-[3px] border-b border-pink-400/5 hover:bg-pink-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-pink-400 truncate">
            {sector.sector}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {sector.blockCount}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtValue(sector.totalValue)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${discountColor(sector.avgDiscount)}`}>
            {fmtDiscount(sector.avgDiscount)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${sector.netFlow.toUpperCase() === 'INFLOW' ? 'text-green-400' : sector.netFlow.toUpperCase() === 'OUTFLOW' ? 'text-red-400' : 'text-neutral-500'}`}>
            {sector.netFlow}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Secondary Offerings Section --

function SecondaryOfferingsSection({
  offerings,
  t,
}: {
  offerings: SecondaryOffering[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-pink-400/30">
      <div className="px-3 py-1 border-b border-pink-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelBlockTradeSecondary', 'Secondary Offerings')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-pink-400/10">
              <th className="text-left px-2 py-1 font-normal text-[7px]">{tr(t, 'panelBlockTradeTicker', 'Ticker')}</th>
              <th className="text-right px-2 py-1 font-normal text-[7px]">{tr(t, 'panelBlockTradeOfferSize', 'Size')}</th>
              <th className="text-right px-2 py-1 font-normal text-[7px]">{tr(t, 'panelBlockTradeDisc', 'Disc %')}</th>
              <th className="text-right px-2 py-1 font-normal text-[7px]">{tr(t, 'panelBlockTradeLockUp', 'Lock-Up')}</th>
              <th className="text-left px-2 py-1 font-normal text-[7px]">{tr(t, 'panelBlockTradeUW', 'Underwriter')}</th>
              <th className="text-left px-2 py-1 font-normal text-[7px]">{tr(t, 'panelBlockTradeStatus', 'Status')}</th>
            </tr>
          </thead>
          <tbody>
            {offerings.map((o, i) => (
              <tr
                key={`${o.ticker}-${i}`}
                className="border-b border-neutral-900 hover:bg-pink-400/[0.02]"
              >
                <td className="px-2 py-1 text-pink-400 font-bold">{o.ticker}</td>
                <td className="px-2 py-1 text-right text-white font-bold">{fmtValue(o.offeringSize)}</td>
                <td className={`px-2 py-1 text-right font-bold ${discountColor(o.discount)}`}>
                  {fmtDiscount(o.discount)}
                </td>
                <td className="px-2 py-1 text-right text-neutral-400">{o.lockUpDays}d</td>
                <td className="px-2 py-1 text-neutral-500 truncate max-w-[80px]">{o.underwriter}</td>
                <td className="px-2 py-1">
                  <span className={`inline-block px-1 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${
                    o.status.toUpperCase() === 'PRICED' ? 'bg-green-400/20 text-green-400 border-green-400/30' :
                    o.status.toUpperCase() === 'FILED' ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30' :
                    o.status.toUpperCase() === 'PENDING' ? 'bg-pink-400/20 text-pink-400 border-pink-400/30' :
                    'bg-neutral-400/20 text-neutral-400 border-neutral-400/30'
                  }`}>
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -- Lock-Up Expirations Section --

function LockUpExpirationsSection({
  expirations,
  t,
}: {
  expirations: LockUpExpiration[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-pink-400/30">
      <div className="px-3 py-1 border-b border-pink-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelBlockTradeLockUpExp', 'Lock-Up Expirations')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_64px_56px_44px_56px_52px] gap-0 px-2 py-0.5 border-b border-pink-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelBlockTradeTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeExpDate', 'Exp Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeUnlocked', 'Unlocked')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeFloat', '% Float')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeIpoDate', 'IPO Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelBlockTradePxVsIpo', 'Px vs IPO')}
        </span>
      </div>

      {/* Rows */}
      {expirations.map((exp, i) => (
        <div
          key={`${exp.ticker}-${i}`}
          className="grid grid-cols-[56px_64px_56px_44px_56px_52px] gap-0 px-2 py-[3px] border-b border-pink-400/5 hover:bg-pink-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-pink-400 truncate">
            {exp.ticker}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {exp.expirationDate}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtShares(exp.sharesUnlocked)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(exp.pctFloat)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {exp.ipoDate}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(exp.priceVsIpo)}`}>
            {fmtBps(exp.priceVsIpo)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Dark Pool Prints Section --

function DarkPoolPrintsSection({
  prints,
  t,
}: {
  prints: DarkPoolPrint[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-pink-400/30">
      <div className="px-3 py-1 border-b border-pink-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelBlockTradeDarkPool', 'Dark Pool Prints')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_56px_52px_64px_64px_48px] gap-0 px-2 py-0.5 border-b border-pink-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelBlockTradeTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeShares', 'Shares')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradePrice', 'Price')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeVal', 'Value')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeVenue', 'Venue')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelBlockTradeTime', 'Time')}
        </span>
      </div>

      {/* Rows */}
      {prints.map((p, i) => (
        <div
          key={`${p.ticker}-${p.time}-${i}`}
          className="grid grid-cols-[56px_56px_52px_64px_64px_48px] gap-0 px-2 py-[3px] border-b border-pink-400/5 hover:bg-pink-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-pink-400 truncate">
            {p.ticker}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtShares(p.shares)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            ${p.price.toFixed(2)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtValue(p.value)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right truncate">
            {p.venue}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2">
            {p.time}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Market Impact Section --

function MarketImpactSection({
  impacts,
  t,
}: {
  impacts: MarketImpact[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-pink-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelBlockTradeImpact', 'Market Impact')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_56px_56px] gap-0 px-2 py-0.5 border-b border-pink-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelBlockTradeMetric', 'Metric')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeMetricVal', 'Value')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelBlockTradeChange', 'Change')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelBlockTradeImpactLvl', 'Impact')}
        </span>
      </div>

      {/* Rows */}
      {impacts.map((m, i) => (
        <div
          key={`${m.metric}-${i}`}
          className="grid grid-cols-[1fr_72px_56px_56px] gap-0 px-2 py-[3px] border-b border-pink-400/5 hover:bg-pink-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {m.metric}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {m.value}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(m.change)}`}>
            {fmtBps(m.change)}%
          </span>
          <span className="text-right pr-2">
            <span className={`inline-block px-1 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${impactColor(m.impact)}`}>
              {m.impact}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
