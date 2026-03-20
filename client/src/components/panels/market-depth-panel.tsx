import { useMemo } from 'react';
import { useMarketDepth } from '../../api/hooks/use-market-depth';
import { useT, tr, TFn } from '../../i18n';

// i18n helper with fallback
// ── Types ──

interface OrderLevel {
  price: number;
  size: number;
  orders: number;
  cumulative: number;
}

interface StockDepth {
  ticker: string;
  name: string;
  price: number;
  bids: OrderLevel[];
  asks: OrderLevel[];
  spread: number;
  spreadBps: number;
  midPrice: number;
  bidDepth: number;
  askDepth: number;
  imbalance: number;
  liquidityScore: number;
  avgDailyVolume: number;
  volumeToday: number;
  vwap: number;
}

interface AggregateDepth {
  totalBids: number;
  totalAsks: number;
  netImbalance: number;
  avgSpread: number;
  medianLiquidityScore: number;
}

interface LiquidityScoreEntry {
  ticker: string;
  score: number;
  tier: string;
  avgSpread: number;
  depthRatio: number;
  resilience: number;
}

interface DepthSummary {
  mostLiquid: string;
  leastLiquid: string;
  avgImbalance: number;
  wideSpreadCount: number;
  buyPressureCount: number;
  sellPressureCount: number;
}

interface MarketDepthData {
  stocks: StockDepth[];
  aggregateDepth: AggregateDepth;
  liquidityScores: LiquidityScoreEntry[];
  summary: DepthSummary;
}

// ── Formatting ──

function fmtNum(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtPrice(n: number): string {
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function fmtBps(n: number): string {
  return n.toFixed(1) + 'bp';
}

// ── Tier colors ──

function tierColor(tier: string): string {
  switch (tier) {
    case 'Ultra-Liquid': return '#4ade80';
    case 'Liquid': return '#60a5fa';
    case 'Moderate': return '#facc15';
    case 'Thin': return '#f87171';
    default: return 'rgba(255,255,255,0.4)';
  }
}

function tierBg(tier: string): string {
  switch (tier) {
    case 'Ultra-Liquid': return 'rgba(74,222,128,0.12)';
    case 'Liquid': return 'rgba(96,165,250,0.12)';
    case 'Moderate': return 'rgba(250,204,21,0.10)';
    case 'Thin': return 'rgba(248,113,113,0.12)';
    default: return 'rgba(255,255,255,0.03)';
  }
}

// ── Order Book for a single stock ──

function StockOrderBook({ stock }: { stock: StockDepth }) {
  const maxSize = useMemo(() => {
    const bidMax = stock.bids.reduce((m, b) => Math.max(m, b.size), 0);
    const askMax = stock.asks.reduce((m, a) => Math.max(m, a.size), 0);
    return Math.max(bidMax, askMax, 1);
  }, [stock.bids, stock.asks]);

  const imbalanceColor = stock.imbalance > 0 ? '#4ade80' : stock.imbalance < 0 ? '#f87171' : 'rgba(255,255,255,0.4)';

  return (
    <div className="border-b border-green-400/10">
      {/* Stock header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-green-400/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono font-black text-green-400">{stock.ticker}</span>
          <span className="text-[7px] font-mono text-white/25 truncate max-w-[80px]">{stock.name}</span>
          <span className="text-[8px] font-mono font-bold text-white/60">${fmtPrice(stock.price)}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[6px] font-mono text-white/20 uppercase">SPRD</span>
            <span className="text-[7px] font-mono font-bold text-white/50">{fmtBps(stock.spreadBps)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[6px] font-mono text-white/20 uppercase">IMB</span>
            <span className="text-[7px] font-mono font-bold" style={{ color: imbalanceColor }}>{fmtPct(stock.imbalance * 100)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[6px] font-mono text-white/20 uppercase">LIQ</span>
            <span className="text-[7px] font-mono font-bold text-green-400">{stock.liquidityScore.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Order book grid */}
      <div className="grid grid-cols-2 gap-0">
        {/* Bids (left) */}
        <div className="border-r border-green-400/[0.06]">
          <div className="flex items-center justify-between px-2 py-0.5 border-b border-green-400/[0.04]">
            <span className="text-[6px] font-mono text-green-400/50 uppercase tracking-wider">BIDS</span>
            <span className="text-[6px] font-mono text-white/20">{fmtNum(stock.bidDepth)}</span>
          </div>
          {stock.bids.slice(0, 5).map((bid, i) => {
            const barWidth = (bid.size / maxSize) * 100;
            return (
              <div key={i} className="relative flex items-center justify-between px-2 py-[1px] hover:bg-green-400/[0.02]">
                <div
                  className="absolute left-0 top-0 h-full"
                  style={{ width: `${barWidth}%`, backgroundColor: 'rgba(74,222,128,0.08)' }}
                />
                <div className="relative flex items-center gap-2">
                  <span className="text-[8px] font-mono font-bold text-green-400/80">{fmtPrice(bid.price)}</span>
                  <span className="text-[7px] font-mono text-white/30">{bid.orders}</span>
                </div>
                <span className="relative text-[8px] font-mono font-bold text-white/50">{fmtNum(bid.size)}</span>
              </div>
            );
          })}
        </div>

        {/* Asks (right) */}
        <div>
          <div className="flex items-center justify-between px-2 py-0.5 border-b border-green-400/[0.04]">
            <span className="text-[6px] font-mono text-red-400/50 uppercase tracking-wider">ASKS</span>
            <span className="text-[6px] font-mono text-white/20">{fmtNum(stock.askDepth)}</span>
          </div>
          {stock.asks.slice(0, 5).map((ask, i) => {
            const barWidth = (ask.size / maxSize) * 100;
            return (
              <div key={i} className="relative flex items-center justify-between px-2 py-[1px] hover:bg-green-400/[0.02]">
                <div
                  className="absolute right-0 top-0 h-full"
                  style={{ width: `${barWidth}%`, backgroundColor: 'rgba(248,113,113,0.08)' }}
                />
                <div className="relative flex items-center gap-2">
                  <span className="text-[8px] font-mono font-bold text-red-400/80">{fmtPrice(ask.price)}</span>
                  <span className="text-[7px] font-mono text-white/30">{ask.orders}</span>
                </div>
                <span className="relative text-[8px] font-mono font-bold text-white/50">{fmtNum(ask.size)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Liquidity Ranking Table ──

function LiquidityRankingTable({ scores }: { scores: LiquidityScoreEntry[] }) {
  const sorted = useMemo(() => [...scores].sort((a, b) => b.score - a.score), [scores]);

  return (
    <div>
      <div className="px-2 py-1 border-b border-green-400/[0.06]">
        <span className="text-[7px] font-mono text-green-400/50 uppercase tracking-wider">LIQUIDITY RANKING</span>
      </div>
      {/* Header row */}
      <div className="flex items-center px-2 py-0.5 border-b border-green-400/[0.04] text-[6px] font-mono text-white/20 uppercase tracking-wider">
        <span className="w-[14px] shrink-0">#</span>
        <span className="w-[48px] shrink-0">TICKER</span>
        <span className="w-[36px] text-right shrink-0">SCORE</span>
        <span className="w-[64px] text-center shrink-0">TIER</span>
        <span className="w-[44px] text-right shrink-0">SPREAD</span>
        <span className="w-[44px] text-right shrink-0">DEPTH R</span>
        <span className="flex-1 text-right">RESIL</span>
      </div>
      {sorted.map((entry, i) => (
        <div
          key={entry.ticker}
          className="flex items-center px-2 py-[2px] border-b border-green-400/[0.02] hover:bg-green-400/[0.02]"
        >
          <span className="w-[14px] shrink-0 text-[7px] font-mono text-white/20">{i + 1}</span>
          <span className="w-[48px] shrink-0 text-[8px] font-mono font-bold text-green-400">{entry.ticker}</span>
          <span className="w-[36px] text-right shrink-0 text-[8px] font-mono font-bold text-white/70">{entry.score.toFixed(0)}</span>
          <span className="w-[64px] text-center shrink-0">
            <span
              className="text-[6px] font-mono font-black uppercase px-1 py-[1px]"
              style={{ color: tierColor(entry.tier), backgroundColor: tierBg(entry.tier) }}
            >
              {entry.tier}
            </span>
          </span>
          <span className="w-[44px] text-right shrink-0 text-[7px] font-mono text-white/40">{fmtBps(entry.avgSpread)}</span>
          <span className="w-[44px] text-right shrink-0 text-[7px] font-mono text-white/40">{entry.depthRatio.toFixed(2)}</span>
          <span className="flex-1 text-right text-[7px] font-mono text-white/40">{entry.resilience.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ──

export function MarketDepthPanel() {
  const t = useT();
  const { data, isLoading } = useMarketDepth();

  const depth = data as MarketDepthData | undefined;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-green-400/40 uppercase tracking-widest animate-pulse">
          {tr(t, 'loading', 'LOADING...')}
        </span>
      </div>
    );
  }

  if (!depth?.stocks) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          {tr(t, 'mdNoData', 'No data available')}
        </span>
      </div>
    );
  }

  const agg = depth.aggregateDepth;
  const summary = depth.summary;
  const imbalanceColor = agg.netImbalance > 0 ? '#4ade80' : agg.netImbalance < 0 ? '#f87171' : 'rgba(255,255,255,0.4)';

  return (
    <div className="h-full flex flex-col bg-black text-[9px] font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-green-400/30 shrink-0">
        <span className="text-[9px] font-black uppercase tracking-wider text-green-400">
          {tr(t, 'mdTitle', 'MARKET DEPTH ANALYSIS')}
        </span>
        <span className="text-[7px] text-white/20">{depth.stocks.length} SYMBOLS</span>
      </div>

      {/* Aggregate summary */}
      <div className="grid grid-cols-5 gap-0 border-b border-green-400/10 shrink-0">
        <div className="px-2 py-1.5 border-r border-green-400/[0.06]">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">TOTAL BIDS</div>
          <div className="text-[10px] font-black text-green-400">{fmtNum(agg.totalBids)}</div>
        </div>
        <div className="px-2 py-1.5 border-r border-green-400/[0.06]">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">TOTAL ASKS</div>
          <div className="text-[10px] font-black text-red-400">{fmtNum(agg.totalAsks)}</div>
        </div>
        <div className="px-2 py-1.5 border-r border-green-400/[0.06]">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">NET IMBALANCE</div>
          <div className="text-[10px] font-black" style={{ color: imbalanceColor }}>{fmtPct(agg.netImbalance * 100)}</div>
        </div>
        <div className="px-2 py-1.5 border-r border-green-400/[0.06]">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">AVG SPREAD</div>
          <div className="text-[10px] font-black text-white/60">{fmtBps(agg.avgSpread)}</div>
        </div>
        <div className="px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">MED LIQUIDITY</div>
          <div className="text-[10px] font-black text-green-400">{agg.medianLiquidityScore.toFixed(0)}</div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Per-stock order books */}
        {depth.stocks.map(stock => (
          <StockOrderBook key={stock.ticker} stock={stock} />
        ))}

        {/* Liquidity ranking */}
        {depth.liquidityScores && depth.liquidityScores.length > 0 && (
          <LiquidityRankingTable scores={depth.liquidityScores} />
        )}

        {/* Summary footer */}
        {summary && (
          <div className="border-t border-green-400/10 px-2 py-1.5">
            <div className="text-[7px] font-mono text-green-400/50 uppercase tracking-wider mb-1">SUMMARY</div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1">
              <div>
                <span className="text-[6px] text-white/20 uppercase">MOST LIQUID</span>
                <div className="text-[8px] font-bold text-green-400">{summary.mostLiquid}</div>
              </div>
              <div>
                <span className="text-[6px] text-white/20 uppercase">LEAST LIQUID</span>
                <div className="text-[8px] font-bold text-red-400">{summary.leastLiquid}</div>
              </div>
              <div>
                <span className="text-[6px] text-white/20 uppercase">AVG IMBALANCE</span>
                <div className="text-[8px] font-bold text-white/50">{fmtPct(summary.avgImbalance * 100)}</div>
              </div>
              <div>
                <span className="text-[6px] text-white/20 uppercase">WIDE SPREADS</span>
                <div className="text-[8px] font-bold text-yellow-400">{summary.wideSpreadCount}</div>
              </div>
              <div>
                <span className="text-[6px] text-white/20 uppercase">BUY PRESSURE</span>
                <div className="text-[8px] font-bold text-green-400">{summary.buyPressureCount}</div>
              </div>
              <div>
                <span className="text-[6px] text-white/20 uppercase">SELL PRESSURE</span>
                <div className="text-[8px] font-bold text-red-400">{summary.sellPressureCount}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
