import { useTradeBlotter } from '../../api/hooks/use-trade-blotter';
import { useT } from '../../i18n';

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

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

function fmtNotional(n: number): string {
  if (n >= 1_000_000_000) return '$' + (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
}

function fmtVol(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ── Main Panel ──

export function TradeBlotterPanel() {
  const t = useT();
  const { data, isLoading } = useTradeBlotter();

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-orange-400/40 uppercase tracking-widest">
          {tr(t, 'loading', 'Loading...')}
        </span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-black text-[9px] font-mono">
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center gap-2 px-2 py-1.5 border-b border-border/20">
        <div className="w-[3px] h-3 bg-orange-400" />
        <span className="text-[10px] font-black text-orange-400 uppercase tracking-wider">
          {tr(t, 'tbTitle', 'TRADE BLOTTER')}
        </span>
      </div>

      {/* ── Trade Log ── */}
      <div className="flex-1 overflow-auto">
        {/* Table Header */}
        <div className="sticky top-0 z-10 bg-black flex items-center px-1 py-1 border-b border-border/20 text-[7px] text-white/20 uppercase tracking-wider">
          <span className="w-[56px] shrink-0">TIME</span>
          <span className="w-[44px] shrink-0">TICKER</span>
          <span className="w-[32px] shrink-0">SIDE</span>
          <span className="w-[44px] shrink-0 text-right">QTY</span>
          <span className="w-[52px] shrink-0 text-right">PRICE</span>
          <span className="w-[56px] shrink-0 text-right">NOTIONAL</span>
          <span className="w-[40px] shrink-0 text-center">EXCH</span>
          <span className="w-[40px] shrink-0 text-center">TYPE</span>
          <span className="flex-1 text-right">STATUS</span>
        </div>

        {/* Trade Rows */}
        {(data?.trades ?? []).map((trade: any, idx: number) => {
          const side = (trade.side ?? '').toUpperCase();
          const isBuy = side === 'BUY';
          const qty = trade.quantity ?? trade.qty ?? 0;
          const price = trade.avgPrice ?? trade.price ?? 0;
          const notional = trade.notional ?? qty * price;

          return (
            <div
              key={trade.id ?? idx}
              className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-orange-400/[0.02] transition-colors"
            >
              <span className="w-[56px] shrink-0 text-[7px] text-white/30">
                {trade.executionTime ?? trade.timestamp ?? trade.time
                  ? fmtTime(trade.executionTime ?? trade.timestamp ?? trade.time)
                  : '--'}
              </span>
              <span className="w-[44px] shrink-0 text-[8px] font-bold text-orange-400">
                {trade.symbol ?? '--'}
              </span>
              <span
                className="w-[32px] shrink-0 text-[7px] font-bold"
                style={{ color: isBuy ? '#4ade80' : '#f87171' }}
              >
                {side || '--'}
              </span>
              <span className="w-[44px] shrink-0 text-right text-white/50">
                {fmtComma(qty)}
              </span>
              <span className="w-[52px] shrink-0 text-right text-white/60">
                {fmtPrice(price)}
              </span>
              <span className="w-[56px] shrink-0 text-right text-white/40">
                {fmtNotional(notional)}
              </span>
              <span className="w-[40px] shrink-0 text-center text-white/30 text-[7px]">
                {trade.venue ?? trade.exchange ?? '--'}
              </span>
              <span className="w-[40px] shrink-0 text-center text-white/30 text-[7px]">
                {trade.algo ?? trade.orderType ?? trade.type ?? '--'}
              </span>
              <span className="flex-1 text-right text-white/30 text-[7px]">
                {trade.status ?? '--'}
              </span>
            </div>
          );
        })}

        {(!data?.trades || data.trades.length === 0) && !isLoading && (
          <div className="text-center py-6 text-white/20 text-[8px] uppercase tracking-wider">
            {tr(t, 'tbNoTrades', 'No trades')}
          </div>
        )}
      </div>

      {/* ── Summary Stats ── */}
      <div className="shrink-0 border-t border-border/20">
        <div className="px-1 py-1 border-b border-border/20">
          <span className="text-[7px] text-orange-400/60 uppercase tracking-wider font-bold">
            SUMMARY
          </span>
        </div>
        <div className="grid grid-cols-4 gap-px bg-orange-400/[0.04]">
          <div className="bg-black px-2 py-1.5">
            <div className="text-[6px] text-white/20 uppercase tracking-wider">TOTAL TRADES</div>
            <div className="text-[11px] font-black text-orange-400">
              {data?.summary?.totalTrades ?? data?.trades?.length ?? 0}
            </div>
          </div>
          <div className="bg-black px-2 py-1.5">
            <div className="text-[6px] text-white/20 uppercase tracking-wider">VOLUME</div>
            <div className="text-[11px] font-black text-white/60">
              {fmtVol(data?.summary?.totalVolume ?? (data?.trades ?? []).reduce((s: number, t: any) => s + (t.quantity ?? t.qty ?? 0), 0))}
            </div>
          </div>
          <div className="bg-black px-2 py-1.5">
            <div className="text-[6px] text-white/20 uppercase tracking-wider">NOTIONAL</div>
            <div className="text-[11px] font-black text-white/60">
              {fmtNotional(
                data?.summary?.totalNotional ??
                (data?.trades ?? []).reduce(
                  (s: number, t: any) => s + (t.notional ?? (t.quantity ?? t.qty ?? 0) * (t.avgPrice ?? t.price ?? 0)),
                  0,
                )
              )}
            </div>
          </div>
          <div className="bg-black px-2 py-1.5">
            <div className="text-[6px] text-white/20 uppercase tracking-wider">BUY/SELL</div>
            {(() => {
              const trades = data?.trades ?? [];
              const buyCount = trades.filter((t: any) => (t.side ?? '').toUpperCase() === 'BUY').length;
              const sellCount = trades.filter((t: any) => (t.side ?? '').toUpperCase() === 'SELL').length;
              const ratio = sellCount > 0 ? (buyCount / sellCount).toFixed(2) : buyCount > 0 ? buyCount.toFixed(2) : '0.00';
              const isPositive = buyCount >= sellCount;
              return (
                <div
                  className="text-[11px] font-black"
                  style={{ color: isPositive ? '#4ade80' : '#f87171' }}
                >
                  {ratio}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── Execution Quality ── */}
      <div className="shrink-0 border-t border-border/20">
        <div className="px-1 py-1 border-b border-border/20">
          <span className="text-[7px] text-orange-400/60 uppercase tracking-wider font-bold">
            EXECUTION QUALITY
          </span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-orange-400/[0.04]">
          <div className="bg-black px-2 py-1.5">
            <div className="text-[6px] text-white/20 uppercase tracking-wider">FILL RATE</div>
            <div className="text-[11px] font-black text-orange-400">
              {(() => {
                const fillRate = data?.summary?.avgFillRate ?? data?.executionQuality?.fillRate ?? data?.fillRate;
                return fillRate != null ? fillRate.toFixed(1) + '%' : '--';
              })()}
            </div>
          </div>
          <div className="bg-black px-2 py-1.5">
            <div className="text-[6px] text-white/20 uppercase tracking-wider">AVG SLIPPAGE</div>
            <div className="text-[11px] font-black text-orange-400">
              {(() => {
                const slippage = data?.summary?.avgSlippageBps ?? data?.executionQuality?.avgSlippageBps ?? data?.avgSlippageBps;
                return slippage != null ? slippage.toFixed(2) + ' bps' : '--';
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
