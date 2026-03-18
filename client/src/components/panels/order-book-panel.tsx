import { useState, useMemo } from 'react';
import { useOrderBook } from '../../api/hooks/use-order-book';
import { useT } from '../../i18n';

// i18n helper with fallback
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Types ──

interface OrderLevel {
  price: number;
  size: number;
  orders: number;
  cumulative: number;
}

interface SymbolBook {
  ticker: string;
  name: string;
  price: number;
  bids: OrderLevel[];
  asks: OrderLevel[];
  midPrice: number;
  spread: number;
  spreadBps: number;
  imbalance: number;
  bidDepth: number;
  askDepth: number;
  totalOrders: number;
  avgBidSize: number;
  avgAskSize: number;
}

interface DepthStats {
  totalBidDepth: number;
  totalAskDepth: number;
  avgSpreadBps: number;
  avgImbalance: number;
  deepestBook: string;
  thinBook: string;
  widestSpread: string;
  tightestSpread: string;
}

interface OrderBookData {
  symbols: SymbolBook[];
  depthStats: DepthStats;
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
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtBps(n: number): string {
  return n.toFixed(1) + 'bp';
}

// ── L2 Book Row ──

function BookRow({
  level,
  maxSize,
  side,
}: {
  level: OrderLevel;
  maxSize: number;
  side: 'bid' | 'ask';
}) {
  const barWidth = maxSize > 0 ? (level.size / maxSize) * 100 : 0;
  const isBid = side === 'bid';
  const barColor = isBid ? 'rgba(74,222,128,0.10)' : 'rgba(248,113,113,0.10)';
  const priceColor = isBid ? 'text-green-400/80' : 'text-red-400/80';

  return (
    <div className="relative flex items-center px-2 py-[1px] hover:bg-sky-400/[0.02]">
      <div
        className="absolute top-0 h-full"
        style={{
          width: `${barWidth}%`,
          backgroundColor: barColor,
          [isBid ? 'right' : 'left']: 0,
        }}
      />
      {isBid ? (
        <>
          <span className="relative w-[52px] text-right text-[8px] font-mono text-white/30 tabular-nums">{fmtNum(level.cumulative)}</span>
          <span className="relative w-[36px] text-right text-[8px] font-mono text-white/25 tabular-nums ml-1">{level.orders}</span>
          <span className="relative w-[52px] text-right text-[8px] font-mono font-bold text-white/50 tabular-nums ml-1">{fmtNum(level.size)}</span>
          <span className={`relative flex-1 text-right text-[8px] font-mono font-bold tabular-nums ml-1 ${priceColor}`}>{fmtPrice(level.price)}</span>
        </>
      ) : (
        <>
          <span className={`relative flex-1 text-left text-[8px] font-mono font-bold tabular-nums mr-1 ${priceColor}`}>{fmtPrice(level.price)}</span>
          <span className="relative w-[52px] text-left text-[8px] font-mono font-bold text-white/50 tabular-nums mr-1">{fmtNum(level.size)}</span>
          <span className="relative w-[36px] text-left text-[8px] font-mono text-white/25 tabular-nums mr-1">{level.orders}</span>
          <span className="relative w-[52px] text-left text-[8px] font-mono text-white/30 tabular-nums">{fmtNum(level.cumulative)}</span>
        </>
      )}
    </div>
  );
}

// ── L2 Book Display ──

function L2BookDisplay({ book }: { book: SymbolBook }) {
  const maxSize = useMemo(() => {
    const bidMax = book.bids.reduce((m, b) => Math.max(m, b.size), 0);
    const askMax = book.asks.reduce((m, a) => Math.max(m, a.size), 0);
    return Math.max(bidMax, askMax, 1);
  }, [book.bids, book.asks]);

  const imbalanceColor = book.imbalance > 0.05
    ? '#4ade80'
    : book.imbalance < -0.05
      ? '#f87171'
      : 'rgba(255,255,255,0.4)';

  return (
    <div className="flex flex-col">
      {/* Column headers */}
      <div className="grid grid-cols-2 gap-0 border-b border-border/20">
        {/* Bid header */}
        <div className="flex items-center px-2 py-1 border-r border-border/20">
          <span className="w-[52px] text-right text-[6px] font-mono text-white/20 uppercase tracking-wider">CUM</span>
          <span className="w-[36px] text-right text-[6px] font-mono text-white/20 uppercase tracking-wider ml-1">ORDS</span>
          <span className="w-[52px] text-right text-[6px] font-mono text-white/20 uppercase tracking-wider ml-1">SIZE</span>
          <span className="flex-1 text-right text-[6px] font-mono text-green-400/40 uppercase tracking-wider ml-1">BID</span>
        </div>
        {/* Ask header */}
        <div className="flex items-center px-2 py-1">
          <span className="flex-1 text-left text-[6px] font-mono text-red-400/40 uppercase tracking-wider mr-1">ASK</span>
          <span className="w-[52px] text-left text-[6px] font-mono text-white/20 uppercase tracking-wider mr-1">SIZE</span>
          <span className="w-[36px] text-left text-[6px] font-mono text-white/20 uppercase tracking-wider mr-1">ORDS</span>
          <span className="w-[52px] text-left text-[6px] font-mono text-white/20 uppercase tracking-wider">CUM</span>
        </div>
      </div>

      {/* L2 rows - bid left, ask right */}
      <div className="grid grid-cols-2 gap-0">
        {/* Bid side */}
        <div className="border-r border-border/20">
          {book.bids.map((bid, i) => (
            <BookRow key={i} level={bid} maxSize={maxSize} side="bid" />
          ))}
        </div>
        {/* Ask side */}
        <div>
          {book.asks.map((ask, i) => (
            <BookRow key={i} level={ask} maxSize={maxSize} side="ask" />
          ))}
        </div>
      </div>

      {/* Book summary bar */}
      <div className="flex items-center justify-between px-2 py-1.5 border-t border-border/20 bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[6px] font-mono text-white/20 uppercase tracking-wider">MID</span>
            <span className="text-[8px] font-mono font-bold text-sky-400">{fmtPrice(book.midPrice)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[6px] font-mono text-white/20 uppercase tracking-wider">SPREAD</span>
            <span className="text-[8px] font-mono font-bold text-white/50">{fmtPrice(book.spread)}</span>
            <span className="text-[7px] font-mono text-white/25">({fmtBps(book.spreadBps)})</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[6px] font-mono text-white/20 uppercase tracking-wider">IMBALANCE</span>
          <span className="text-[8px] font-mono font-bold" style={{ color: imbalanceColor }}>
            {fmtPct(book.imbalance * 100)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Market Depth Stats ──

function MarketDepthStats({ stats }: { stats: DepthStats }) {
  const t = useT();
  const imbalanceColor = stats.avgImbalance > 0
    ? '#4ade80'
    : stats.avgImbalance < 0
      ? '#f87171'
      : 'rgba(255,255,255,0.4)';

  return (
    <div className="border-t border-border/20 px-2 py-1.5">
      <div className="text-[7px] font-mono text-sky-400/50 uppercase tracking-wider mb-1">
        {tr(t, 'obDepthStats', 'MARKET DEPTH STATS')}
      </div>
      <div className="grid grid-cols-4 gap-x-3 gap-y-1.5">
        <div>
          <div className="text-[6px] font-mono text-white/20 uppercase tracking-wider">TOTAL BID DEPTH</div>
          <div className="text-[9px] font-mono font-black text-green-400">{fmtNum(stats.totalBidDepth)}</div>
        </div>
        <div>
          <div className="text-[6px] font-mono text-white/20 uppercase tracking-wider">TOTAL ASK DEPTH</div>
          <div className="text-[9px] font-mono font-black text-red-400">{fmtNum(stats.totalAskDepth)}</div>
        </div>
        <div>
          <div className="text-[6px] font-mono text-white/20 uppercase tracking-wider">AVG SPREAD</div>
          <div className="text-[9px] font-mono font-black text-white/60">{fmtBps(stats.avgSpreadBps)}</div>
        </div>
        <div>
          <div className="text-[6px] font-mono text-white/20 uppercase tracking-wider">AVG IMBALANCE</div>
          <div className="text-[9px] font-mono font-black" style={{ color: imbalanceColor }}>{fmtPct(stats.avgImbalance * 100)}</div>
        </div>
        <div>
          <div className="text-[6px] font-mono text-white/20 uppercase tracking-wider">DEEPEST BOOK</div>
          <div className="text-[8px] font-mono font-bold text-sky-400">{stats.deepestBook}</div>
        </div>
        <div>
          <div className="text-[6px] font-mono text-white/20 uppercase tracking-wider">THINNEST BOOK</div>
          <div className="text-[8px] font-mono font-bold text-yellow-400">{stats.thinBook}</div>
        </div>
        <div>
          <div className="text-[6px] font-mono text-white/20 uppercase tracking-wider">WIDEST SPREAD</div>
          <div className="text-[8px] font-mono font-bold text-red-400/70">{stats.widestSpread}</div>
        </div>
        <div>
          <div className="text-[6px] font-mono text-white/20 uppercase tracking-wider">TIGHTEST SPREAD</div>
          <div className="text-[8px] font-mono font-bold text-green-400/70">{stats.tightestSpread}</div>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function OrderBookPanel() {
  const t = useT();
  const { data, isLoading } = useOrderBook();
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const book = data as OrderBookData | undefined;
  const symbols = book?.symbols ?? [];
  const activeTicker = selectedTicker ?? symbols[0]?.ticker ?? null;
  const activeBook = useMemo(
    () => symbols.find(s => s.ticker === activeTicker) ?? symbols[0] ?? null,
    [symbols, activeTicker],
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-sky-400/40 uppercase tracking-widest animate-pulse">
          {tr(t, 'loading', 'Loading...')}
        </span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-[9px] font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/20 shrink-0">
        <div className="w-[3px] h-3 bg-sky-400 shrink-0" />
        <span className="text-[9px] font-black uppercase tracking-wider text-sky-400">
          {tr(t, 'obTitle', 'ORDER BOOK')}
        </span>
        {activeBook && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[8px] font-mono font-bold text-white/60">${fmtPrice(activeBook.price)}</span>
            <span className="text-[7px] font-mono text-white/20">{activeBook.totalOrders} ORDERS</span>
          </div>
        )}
      </div>

      {/* Symbol selector */}
      {symbols.length > 0 && (
        <div className="flex items-center gap-0 px-1 py-1 border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
          {symbols.map(s => {
            const isActive = s.ticker === activeTicker;
            return (
              <button
                key={s.ticker}
                onClick={() => setSelectedTicker(s.ticker)}
                className={`px-2 py-0.5 text-[8px] font-mono font-black uppercase tracking-wider transition-colors shrink-0 ${
                  isActive
                    ? 'text-sky-400 bg-sky-400/10'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                {s.ticker}
              </button>
            );
          })}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeBook ? (
          <>
            {/* Symbol info bar */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-border/20 bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-black text-sky-400">{activeBook.ticker}</span>
                <span className="text-[7px] font-mono text-white/20 truncate max-w-[100px]">{activeBook.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-[6px] font-mono text-white/20 uppercase tracking-wider">BID DEPTH</span>
                  <span className="text-[7px] font-mono font-bold text-green-400">{fmtNum(activeBook.bidDepth)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[6px] font-mono text-white/20 uppercase tracking-wider">ASK DEPTH</span>
                  <span className="text-[7px] font-mono font-bold text-red-400">{fmtNum(activeBook.askDepth)}</span>
                </div>
              </div>
            </div>

            {/* L2 Book Display */}
            <L2BookDisplay book={activeBook} />

            {/* Depth visualization bar */}
            <div className="px-2 py-1.5 border-t border-border/20">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[7px] font-mono font-bold text-green-400">
                  BID {((activeBook.bidDepth / (activeBook.bidDepth + activeBook.askDepth || 1)) * 100).toFixed(1)}%
                </span>
                <span className="text-[7px] font-mono font-bold text-red-400">
                  ASK {((activeBook.askDepth / (activeBook.bidDepth + activeBook.askDepth || 1)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex h-1.5 overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${(activeBook.bidDepth / (activeBook.bidDepth + activeBook.askDepth || 1)) * 100}%`,
                    backgroundColor: 'rgba(74,222,128,0.5)',
                  }}
                />
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${(activeBook.askDepth / (activeBook.bidDepth + activeBook.askDepth || 1)) * 100}%`,
                    backgroundColor: 'rgba(248,113,113,0.4)',
                  }}
                />
              </div>
            </div>

            {/* Per-symbol stats */}
            <div className="grid grid-cols-4 gap-0 border-t border-border/20">
              <div className="px-2 py-1.5 border-r border-border/[0.08]">
                <div className="text-[6px] text-white/20 uppercase tracking-wider">AVG BID SIZE</div>
                <div className="text-[9px] font-black text-green-400/80">{fmtNum(activeBook.avgBidSize)}</div>
              </div>
              <div className="px-2 py-1.5 border-r border-border/[0.08]">
                <div className="text-[6px] text-white/20 uppercase tracking-wider">AVG ASK SIZE</div>
                <div className="text-[9px] font-black text-red-400/80">{fmtNum(activeBook.avgAskSize)}</div>
              </div>
              <div className="px-2 py-1.5 border-r border-border/[0.08]">
                <div className="text-[6px] text-white/20 uppercase tracking-wider">BID LEVELS</div>
                <div className="text-[9px] font-black text-white/60">{activeBook.bids.length}</div>
              </div>
              <div className="px-2 py-1.5">
                <div className="text-[6px] text-white/20 uppercase tracking-wider">ASK LEVELS</div>
                <div className="text-[9px] font-black text-white/60">{activeBook.asks.length}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">
              {tr(t, 'obNoData', 'No data available')}
            </span>
          </div>
        )}

        {/* Market depth stats */}
        {book?.depthStats && <MarketDepthStats stats={book.depthStats} />}
      </div>
    </div>
  );
}
