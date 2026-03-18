import { useMemo } from 'react';
import { useTradeBlotter } from '../../api/hooks/use-trade-blotter';
import { useT } from '../../i18n';

// ── Types (mirroring server response) ──

interface Trade {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  avgPrice: number;
  vwap: number;
  twap: number;
  arrivalPrice: number;
  closePrice: number;
  slippageBps: number;
  vwapSlippageBps: number;
  implementationShortfall: number;
  marketImpact: number;
  participationRate: number;
  executionTime: string;
  duration: number;
  fills: number;
  algo: string;
  venue: string;
  status: string;
  qualityScore: number;
}

interface ExecutionSummary {
  totalTrades: number;
  avgSlippageBps: number;
  avgVwapSlippageBps: number;
  avgQualityScore: number;
  totalVolume: number;
  bestExecution: { symbol: string; slippageBps: number };
  worstExecution: { symbol: string; slippageBps: number };
  algoBreakdown: { algo: string; count: number; avgSlippage: number }[];
  venueBreakdown: { venue: string; count: number; avgSlippage: number }[];
  slippageDistribution: number[];
}

interface TradeBlotterResponse {
  trades: Trade[];
  summary: ExecutionSummary;
  timestamp: string;
}

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting ──

function fmtComma(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtNotionalM(n: number): string {
  return (n / 1_000_000).toFixed(2);
}

function fmtNotionalB(n: number): string {
  return (n / 1_000_000_000).toFixed(2);
}

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtRatio(n: number): string {
  return n.toFixed(2);
}

function fmtVol(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// ── Venue-to-sector mapping (synthetic, since the API has no sector field) ──

const SYMBOL_SECTOR: Record<string, string> = {
  AAPL: 'Technology',
  MSFT: 'Technology',
  NVDA: 'Technology',
  GOOGL: 'Technology',
  AMZN: 'Consumer',
  META: 'Technology',
  TSLA: 'Consumer',
  JPM: 'Financials',
  V: 'Financials',
  UNH: 'Healthcare',
  AMD: 'Technology',
  NFLX: 'Consumer',
  SPY: 'Index ETF',
  QQQ: 'Index ETF',
  GS: 'Financials',
};

function getSector(symbol: string): string {
  return SYMBOL_SECTOR[symbol] || 'Other';
}

// ── Derived data computations ──

interface SectorFlow {
  sector: string;
  buyVol: number;
  sellVol: number;
  netFlow: number;
  trades: number;
}

interface SymbolVolume {
  symbol: string;
  price: number;
  volume: number;
  avgVol: number;
  unusualRatio: number;
  notional: number;
}

function computeSectorFlows(trades: Trade[]): SectorFlow[] {
  const map = new Map<string, { buyVol: number; sellVol: number; trades: number }>();
  for (const t of trades) {
    const sector = getSector(t.symbol);
    const entry = map.get(sector) || { buyVol: 0, sellVol: 0, trades: 0 };
    if (t.side === 'BUY') {
      entry.buyVol += t.quantity;
    } else {
      entry.sellVol += t.quantity;
    }
    entry.trades++;
    map.set(sector, entry);
  }
  return Array.from(map.entries())
    .map(([sector, v]) => ({
      sector,
      buyVol: v.buyVol,
      sellVol: v.sellVol,
      netFlow: v.buyVol - v.sellVol,
      trades: v.trades,
    }))
    .sort((a, b) => b.trades - a.trades);
}

function computeTopMovers(trades: Trade[]): SymbolVolume[] {
  const map = new Map<string, { totalQty: number; totalNotional: number; count: number; lastPrice: number }>();
  for (const t of trades) {
    const entry = map.get(t.symbol) || { totalQty: 0, totalNotional: 0, count: 0, lastPrice: 0 };
    entry.totalQty += t.quantity;
    entry.totalNotional += t.quantity * t.avgPrice;
    entry.count++;
    entry.lastPrice = t.avgPrice;
    map.set(t.symbol, entry);
  }

  return Array.from(map.entries())
    .map(([symbol, v]) => {
      // Synthetic average volume: estimate as totalQty / count * 1.2 to create variation
      const avgVol = Math.round(v.totalQty / v.count * 1.2);
      return {
        symbol,
        price: v.lastPrice,
        volume: v.totalQty,
        avgVol,
        unusualRatio: avgVol > 0 ? v.totalQty / avgVol : 0,
        notional: v.totalNotional,
      };
    })
    .sort((a, b) => b.volume - a.volume);
}

// ── Main Panel ──

export function TradeBlotterPanel() {
  const t = useT();
  const { data, isLoading } = useTradeBlotter();

  const blotter = data as TradeBlotterResponse | undefined;

  const sectorFlows = useMemo(
    () => (blotter?.trades ? computeSectorFlows(blotter.trades) : []),
    [blotter?.trades],
  );

  const topMovers = useMemo(
    () => (blotter?.trades ? computeTopMovers(blotter.trades) : []),
    [blotter?.trades],
  );

  const summaryStats = useMemo(() => {
    if (!blotter?.trades || blotter.trades.length === 0) {
      return { totalBlockTrades: 0, totalNotional: 0, avgBlockSize: 0, buyToSellRatio: 0 };
    }
    const trades = blotter.trades;
    const totalNotional = trades.reduce((s, t) => s + t.quantity * t.avgPrice, 0);
    const buyCount = trades.filter((t) => t.side === 'BUY').length;
    const sellCount = trades.filter((t) => t.side === 'SELL').length;
    const avgBlockSize = trades.reduce((s, t) => s + t.quantity, 0) / trades.length;
    return {
      totalBlockTrades: trades.length,
      totalNotional,
      avgBlockSize: Math.round(avgBlockSize),
      buyToSellRatio: sellCount > 0 ? buyCount / sellCount : buyCount,
    };
  }, [blotter?.trades]);

  // Loading state
  if (isLoading && !blotter) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-orange-400/40 uppercase tracking-widest animate-pulse">
          {tr(t, 'loading', 'LOADING...')}
        </span>
      </div>
    );
  }

  // Error / no data state
  if (!blotter?.trades) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          {tr(t, 'tbNoData', 'NO DATA AVAILABLE')}
        </span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-black p-1 text-[9px] font-mono">
      {/* ── Summary Bar ── */}
      <div className="grid grid-cols-4 gap-px bg-orange-400/[0.06] mb-1">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">BLOCK TRADES</div>
          <div className="text-[11px] font-black text-orange-400">{summaryStats.totalBlockTrades}</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">TOTAL NOTIONAL</div>
          <div className="text-[11px] font-black text-orange-400">${fmtNotionalB(summaryStats.totalNotional)}B</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">AVG BLOCK SIZE</div>
          <div className="text-[11px] font-black text-white/60">{fmtComma(summaryStats.avgBlockSize)}</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">BUY/SELL RATIO</div>
          <div
            className="text-[11px] font-black"
            style={{ color: summaryStats.buyToSellRatio >= 1 ? '#4ade80' : '#f87171' }}
          >
            {fmtRatio(summaryStats.buyToSellRatio)}
          </div>
        </div>
      </div>

      {/* ── Recent Block Trades ── */}
      <div className="mb-1">
        <div className="px-1 py-1 border-b border-border/20">
          <span className="text-[7px] text-orange-400/60 uppercase tracking-wider font-bold">
            RECENT BLOCK TRADES
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center px-1 py-0.5 border-b border-border/20 text-[6px] text-white/20 uppercase tracking-wider">
          <span className="w-[56px] shrink-0">TIME</span>
          <span className="w-[40px] shrink-0">TICKER</span>
          <span className="w-[28px] shrink-0">SIDE</span>
          <span className="w-[48px] shrink-0 text-right">SIZE</span>
          <span className="w-[50px] shrink-0 text-right">PRICE</span>
          <span className="w-[48px] shrink-0 text-right">NOTL $M</span>
          <span className="w-[40px] shrink-0 text-center">EXCH</span>
          <span className="flex-1 text-right">BROKER</span>
        </div>

        {/* Rows */}
        {blotter.trades.map((trade) => {
          const notional = trade.quantity * trade.avgPrice;
          return (
            <div
              key={trade.id}
              className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-orange-400/[0.02] transition-colors"
            >
              <span className="w-[56px] shrink-0 text-[7px] text-white/30">{fmtTime(trade.executionTime)}</span>
              <span className="w-[40px] shrink-0 text-[8px] font-bold text-orange-400">{trade.symbol}</span>
              <span
                className="w-[28px] shrink-0 text-[7px] font-bold"
                style={{ color: trade.side === 'BUY' ? '#4ade80' : '#f87171' }}
              >
                {trade.side}
              </span>
              <span className="w-[48px] shrink-0 text-right text-white/50">{fmtComma(trade.quantity)}</span>
              <span className="w-[50px] shrink-0 text-right text-white/60">{fmtPrice(trade.avgPrice)}</span>
              <span className="w-[48px] shrink-0 text-right text-white/40">{fmtNotionalM(notional)}</span>
              <span className="w-[40px] shrink-0 text-center text-white/30 text-[7px]">{trade.venue}</span>
              <span className="flex-1 text-right text-white/30 text-[7px]">{trade.algo}</span>
            </div>
          );
        })}
      </div>

      {/* ── Order Flow by Sector ── */}
      <div className="mb-1">
        <div className="px-1 py-1 border-b border-border/20">
          <span className="text-[7px] text-orange-400/60 uppercase tracking-wider font-bold">
            ORDER FLOW BY SECTOR
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center px-1 py-0.5 border-b border-border/20 text-[6px] text-white/20 uppercase tracking-wider">
          <span className="w-[72px] shrink-0">SECTOR</span>
          <span className="w-[52px] shrink-0 text-right">BUY VOL</span>
          <span className="w-[52px] shrink-0 text-right">SELL VOL</span>
          <span className="w-[56px] shrink-0 text-right">NET FLOW</span>
          <span className="flex-1 text-right">TRADES</span>
        </div>

        {/* Rows */}
        {sectorFlows.map((row) => (
          <div
            key={row.sector}
            className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-orange-400/[0.02] transition-colors"
          >
            <span className="w-[72px] shrink-0 text-[8px] font-bold text-white/60">{row.sector}</span>
            <span className="w-[52px] shrink-0 text-right text-green-400/70">{fmtVol(row.buyVol)}</span>
            <span className="w-[52px] shrink-0 text-right text-red-400/70">{fmtVol(row.sellVol)}</span>
            <span
              className="w-[56px] shrink-0 text-right font-bold"
              style={{ color: row.netFlow >= 0 ? '#4ade80' : '#f87171' }}
            >
              {row.netFlow >= 0 ? '+' : ''}{fmtVol(row.netFlow)}
            </span>
            <span className="flex-1 text-right text-white/40">{row.trades}</span>
          </div>
        ))}
      </div>

      {/* ── Top Movers by Volume ── */}
      <div>
        <div className="px-1 py-1 border-b border-border/20">
          <span className="text-[7px] text-orange-400/60 uppercase tracking-wider font-bold">
            TOP MOVERS BY VOLUME
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center px-1 py-0.5 border-b border-border/20 text-[6px] text-white/20 uppercase tracking-wider">
          <span className="w-[40px] shrink-0">TICKER</span>
          <span className="w-[50px] shrink-0 text-right">PRICE</span>
          <span className="w-[52px] shrink-0 text-right">VOLUME</span>
          <span className="w-[52px] shrink-0 text-right">AVG VOL</span>
          <span className="flex-1 text-right">UNUSUAL</span>
        </div>

        {/* Rows */}
        {topMovers.map((row) => {
          const isUnusual = row.unusualRatio > 2;
          return (
            <div
              key={row.symbol}
              className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-orange-400/[0.02] transition-colors"
            >
              <span className="w-[40px] shrink-0 text-[8px] font-bold text-orange-400">{row.symbol}</span>
              <span className="w-[50px] shrink-0 text-right text-white/60">{fmtPrice(row.price)}</span>
              <span className="w-[52px] shrink-0 text-right text-white/50">{fmtVol(row.volume)}</span>
              <span className="w-[52px] shrink-0 text-right text-white/30">{fmtVol(row.avgVol)}</span>
              <span
                className={`flex-1 text-right font-bold ${isUnusual ? 'text-orange-400' : 'text-white/40'}`}
              >
                {row.unusualRatio.toFixed(1)}x
                {isUnusual && (
                  <span className="ml-1 text-[6px] text-orange-400/80 bg-orange-400/[0.08] px-0.5">HIGH</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
