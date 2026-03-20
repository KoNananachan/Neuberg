import { useMemo } from 'react';
import { useTradeBlotter } from '../../api/hooks/use-trade-blotter';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, BarChart3 } from 'lucide-react';

// ── Constants ──

const AMBER = '#fbbf24';
const GREEN = '#4ade80';
const RED = '#f87171';
const DIM = 'rgba(255,255,255,0.25)';

const ASSET_COLORS: Record<string, string> = {
  equities: '#fbbf24',
  'fixed income': '#38bdf8',
  fx: '#a78bfa',
  commodities: '#fb923c',
  crypto: '#34d399',
  options: '#f472b6',
  futures: '#60a5fa',
};

const VENUE_COLORS = [
  '#fbbf24', '#38bdf8', '#a78bfa', '#fb923c', '#34d399',
  '#f472b6', '#60a5fa', '#facc15', '#f87171', '#818cf8',
];

// ── Formatting ──

function fmtComma(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

function fmtNotional(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return sign + '$' + (abs / 1_000_000_000).toFixed(2) + 'B';
  if (abs >= 1_000_000) return sign + '$' + (abs / 1_000_000).toFixed(2) + 'M';
  if (abs >= 1_000) return sign + '$' + (abs / 1_000).toFixed(1) + 'K';
  return sign + '$' + abs.toFixed(2);
}

function fmtVol(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtBps(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)} bps`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtMs(n: number): string {
  if (n >= 60_000) return (n / 60_000).toFixed(1) + 'm';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 's';
  return `${Math.round(n)}ms`;
}

function pnlColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return '#71717a';
}

// ── Status Badge ──

function StatusBadge({ status }: { status: string }) {
  const s = (status ?? '').toUpperCase();
  let bg = 'rgba(255,255,255,0.06)';
  let color = 'rgba(255,255,255,0.4)';
  if (s === 'FILLED' || s === 'COMPLETE' || s === 'DONE') {
    bg = 'rgba(74,222,128,0.1)';
    color = GREEN;
  } else if (s === 'PARTIAL' || s === 'PARTIALLY FILLED') {
    bg = 'rgba(251,191,36,0.1)';
    color = AMBER;
  } else if (s === 'REJECTED' || s === 'CANCELLED' || s === 'CANCELED' || s === 'FAILED') {
    bg = 'rgba(248,113,113,0.1)';
    color = RED;
  } else if (s === 'PENDING' || s === 'WORKING' || s === 'OPEN') {
    bg = 'rgba(56,189,248,0.1)';
    color = '#38bdf8';
  }
  return (
    <span
      className="inline-block px-1.5 py-[1px] text-[6px] font-black uppercase tracking-wider"
      style={{ background: bg, color }}
    >
      {s || '--'}
    </span>
  );
}

// ── Order Flow Bar Chart (SVG) ──

function OrderFlowChart({ trades }: { trades: any[] }) {
  const assetData = useMemo(() => {
    const map: Record<string, { buy: number; sell: number }> = {};
    for (const t of trades) {
      const cls = (t.assetClass ?? t.asset_class ?? 'equities').toLowerCase();
      if (!map[cls]) map[cls] = { buy: 0, sell: 0 };
      const side = (t.side ?? '').toUpperCase();
      const notional = t.notional ?? (t.quantity ?? t.qty ?? 0) * (t.avgPrice ?? t.price ?? 0);
      if (side === 'BUY') map[cls].buy += notional;
      else map[cls].sell += notional;
    }
    return Object.entries(map)
      .map(([cls, v]) => ({ cls, buy: v.buy, sell: v.sell }))
      .sort((a, b) => (b.buy + b.sell) - (a.buy + a.sell));
  }, [trades]);

  if (assetData.length === 0) return null;

  const W = 320;
  const H = 100;
  const LABEL_W = 60;
  const BAR_H = 12;
  const GAP = 3;
  const chartW = W - LABEL_W - 10;
  const maxVal = Math.max(...assetData.map(d => Math.max(d.buy, d.sell)), 1);
  const totalH = assetData.length * (BAR_H * 2 + GAP) + 4;

  return (
    <svg viewBox={`0 0 ${W} ${Math.max(H, totalH)}`} className="w-full" style={{ maxHeight: 140 }}>
      {assetData.map((d, i) => {
        const y = i * (BAR_H * 2 + GAP) + 2;
        const buyW = (d.buy / maxVal) * chartW;
        const sellW = (d.sell / maxVal) * chartW;
        const clsColor = ASSET_COLORS[d.cls] ?? '#fbbf24';
        return (
          <g key={d.cls}>
            <text
              x={LABEL_W - 4}
              y={y + BAR_H}
              textAnchor="end"
              fill={DIM}
              fontSize="7"
              fontFamily="monospace"
            >
              {d.cls.toUpperCase()}
            </text>
            {/* Buy bar */}
            <rect x={LABEL_W} y={y} width={Math.max(buyW, 1)} height={BAR_H} fill={GREEN} opacity={0.8} />
            <text
              x={LABEL_W + buyW + 3}
              y={y + BAR_H - 2}
              fill={GREEN}
              fontSize="6"
              fontFamily="monospace"
              opacity={0.7}
            >
              {fmtNotional(d.buy)}
            </text>
            {/* Sell bar */}
            <rect
              x={LABEL_W}
              y={y + BAR_H + 1}
              width={Math.max(sellW, 1)}
              height={BAR_H}
              fill={RED}
              opacity={0.8}
            />
            <text
              x={LABEL_W + sellW + 3}
              y={y + BAR_H * 2 - 1}
              fill={RED}
              fontSize="6"
              fontFamily="monospace"
              opacity={0.7}
            >
              {fmtNotional(d.sell)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Venue Donut Chart (SVG) ──

function VenueDonutChart({ trades }: { trades: any[] }) {
  const venueData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of trades) {
      const venue = t.venue ?? t.exchange ?? 'OTHER';
      map[venue] = (map[venue] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [trades]);

  if (venueData.length === 0) return null;

  const total = venueData.reduce((s, d) => s + d.count, 0);
  const cx = 60;
  const cy = 55;
  const R = 42;
  const r = 26;

  let cumAngle = -Math.PI / 2;
  const arcs = venueData.map((d, i) => {
    const fraction = d.count / total;
    const startAngle = cumAngle;
    const endAngle = cumAngle + fraction * Math.PI * 2;
    cumAngle = endAngle;

    const x1o = cx + R * Math.cos(startAngle);
    const y1o = cy + R * Math.sin(startAngle);
    const x2o = cx + R * Math.cos(endAngle);
    const y2o = cy + R * Math.sin(endAngle);
    const x1i = cx + r * Math.cos(endAngle);
    const y1i = cy + r * Math.sin(endAngle);
    const x2i = cx + r * Math.cos(startAngle);
    const y2i = cy + r * Math.sin(startAngle);
    const largeArc = fraction > 0.5 ? 1 : 0;
    const color = VENUE_COLORS[i % VENUE_COLORS.length];

    const path = [
      `M ${x1o} ${y1o}`,
      `A ${R} ${R} 0 ${largeArc} 1 ${x2o} ${y2o}`,
      `L ${x1i} ${y1i}`,
      `A ${r} ${r} 0 ${largeArc} 0 ${x2i} ${y2i}`,
      'Z',
    ].join(' ');

    return { path, color, name: d.name, count: d.count, pct: fraction * 100 };
  });

  return (
    <div className="flex items-start gap-2">
      <svg viewBox="0 0 120 110" className="w-[100px] h-[90px] shrink-0">
        {arcs.map((arc, i) => (
          <path key={i} d={arc.path} fill={arc.color} opacity={0.85} />
        ))}
        <text x={cx} y={cy - 3} textAnchor="middle" fill="white" fontSize="9" fontFamily="monospace" fontWeight="900">
          {total}
        </text>
        <text x={cx} y={cy + 7} textAnchor="middle" fill={DIM} fontSize="6" fontFamily="monospace">
          TRADES
        </text>
      </svg>
      <div className="flex-1 flex flex-col gap-[2px] py-1">
        {arcs.map((arc, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[7px] font-mono">
            <div className="w-[6px] h-[6px] shrink-0" style={{ background: arc.color }} />
            <span className="text-white/50 truncate flex-1">{arc.name}</span>
            <span className="text-white/30">{arc.count}</span>
            <span style={{ color: arc.color }} className="w-[28px] text-right font-bold">
              {arc.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Panel ──

export function TradeBlotterPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useTradeBlotter();

  const trades = useMemo(() => data?.trades ?? [], [data]);

  // Compute derived data
  const stats = useMemo(() => {
    const buyTrades = trades.filter((tr: any) => (tr.side ?? '').toUpperCase() === 'BUY');
    const sellTrades = trades.filter((tr: any) => (tr.side ?? '').toUpperCase() === 'SELL');
    const totalVolume = trades.reduce((s: number, tr: any) => s + (tr.quantity ?? tr.qty ?? 0), 0);
    const totalNotional = trades.reduce((s: number, tr: any) => {
      const qty = tr.quantity ?? tr.qty ?? 0;
      const px = tr.avgPrice ?? tr.price ?? 0;
      return s + (tr.notional ?? qty * px);
    }, 0);

    return { buyTrades, sellTrades, totalVolume, totalNotional };
  }, [trades]);

  const executionQuality = useMemo(() => {
    const eq = data?.executionQuality ?? data?.summary ?? {};
    const vwapSlippage = eq.vwapSlippageBps ?? eq.avgSlippageBps ?? null;
    const fillRate = eq.fillRate ?? eq.avgFillRate ?? null;
    const avgTimeToFill = eq.avgTimeToFill ?? eq.avgExecutionTime ?? null;
    return { vwapSlippage, fillRate, avgTimeToFill };
  }, [data]);

  const largestTrades = useMemo(() => {
    return [...trades]
      .sort((a: any, b: any) => {
        const na = a.notional ?? (a.quantity ?? a.qty ?? 0) * (a.avgPrice ?? a.price ?? 0);
        const nb = b.notional ?? (b.quantity ?? b.qty ?? 0) * (b.avgPrice ?? b.price ?? 0);
        return nb - na;
      })
      .slice(0, 5);
  }, [trades]);

  const pnl = useMemo(() => {
    const p = data?.pnl ?? data?.summary?.pnl ?? {};
    return {
      realized: p.realized ?? p.realizedPnl ?? null,
      unrealized: p.unrealized ?? p.unrealizedPnl ?? null,
      total: p.total ?? p.totalPnl ?? null,
      fees: p.fees ?? p.totalFees ?? null,
      net: p.net ?? p.netPnl ?? null,
    };
  }, [data]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <RefreshCw className="w-3 h-3 text-amber-400/40 animate-spin" />
        <span className="ml-2 text-[9px] font-mono text-amber-400/40 uppercase tracking-widest">
          {tr(t, 'loading', 'Loading...')}
        </span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-black text-[9px] font-mono uppercase">
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-2 py-1.5 border-b border-border/20">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-black text-amber-400 tracking-wider">
            {tr(t, 'tbTitle', 'TRADE BLOTTER')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* ── Trade List Table ── */}
        <div className="border-b border-border/20">
          <div className="px-2 py-1 border-b border-border/20">
            <span className="text-[7px] text-amber-400/60 tracking-wider font-bold">
              {tr(t, 'tbTrades', 'TRADE LOG')}
            </span>
            <span className="ml-2 text-[7px] text-white/20">
              {trades.length} {tr(t, 'tbEntries', 'ENTRIES')}
            </span>
          </div>

          {/* Table Header */}
          <div className="sticky top-0 z-10 bg-black flex items-center px-1 py-1 border-b border-border/30 text-[7px] text-white/20 tracking-wider">
            <span className="w-[56px] shrink-0">TIME</span>
            <span className="w-[48px] shrink-0">INSTR</span>
            <span className="w-[30px] shrink-0">SIDE</span>
            <span className="w-[40px] shrink-0 text-right">QTY</span>
            <span className="w-[48px] shrink-0 text-right">PRICE</span>
            <span className="w-[54px] shrink-0 text-right">NOTIONAL</span>
            <span className="w-[36px] shrink-0 text-center">VENUE</span>
            <span className="flex-1 text-right">STATUS</span>
          </div>

          {/* Trade Rows */}
          {trades.map((trade: any, idx: number) => {
            const side = (trade.side ?? '').toUpperCase();
            const isBuy = side === 'BUY';
            const qty = trade.quantity ?? trade.qty ?? 0;
            const price = trade.avgPrice ?? trade.price ?? 0;
            const notional = trade.notional ?? qty * price;

            return (
              <div
                key={trade.id ?? idx}
                className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-amber-400/[0.02] transition-colors"
              >
                <span className="w-[56px] shrink-0 text-[7px] text-white/30">
                  {trade.executionTime ?? trade.timestamp ?? trade.time
                    ? fmtTime(trade.executionTime ?? trade.timestamp ?? trade.time)
                    : '--'}
                </span>
                <span className="w-[48px] shrink-0 text-[8px] font-bold text-amber-400 truncate">
                  {trade.symbol ?? trade.instrument ?? '--'}
                </span>
                <span
                  className="w-[30px] shrink-0 text-[7px] font-bold"
                  style={{ color: isBuy ? GREEN : RED }}
                >
                  {side || '--'}
                </span>
                <span className="w-[40px] shrink-0 text-right text-white/50">
                  {fmtComma(qty)}
                </span>
                <span className="w-[48px] shrink-0 text-right text-white/60">
                  {fmtPrice(price)}
                </span>
                <span className="w-[54px] shrink-0 text-right text-white/40">
                  {fmtNotional(notional)}
                </span>
                <span className="w-[36px] shrink-0 text-center text-white/30 text-[7px] truncate">
                  {trade.venue ?? trade.exchange ?? '--'}
                </span>
                <span className="flex-1 text-right">
                  <StatusBadge status={trade.status ?? ''} />
                </span>
              </div>
            );
          })}

          {trades.length === 0 && (
            <div className="text-center py-6 text-white/20 text-[8px] tracking-wider">
              {tr(t, 'tbNoTrades', 'NO TRADES')}
            </div>
          )}
        </div>

        {/* ── Execution Quality Summary ── */}
        <div className="border-b border-border/20">
          <div className="px-2 py-1 border-b border-border/20">
            <span className="text-[7px] text-amber-400/60 tracking-wider font-bold">
              {tr(t, 'tbExecQuality', 'EXECUTION QUALITY')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-px bg-amber-400/[0.04]">
            <div className="bg-black px-2 py-2">
              <div className="text-[6px] text-white/20 tracking-wider mb-0.5">VWAP SLIPPAGE</div>
              <div className="text-[12px] font-black" style={{ color: AMBER }}>
                {executionQuality.vwapSlippage != null
                  ? fmtBps(executionQuality.vwapSlippage)
                  : '--'}
              </div>
            </div>
            <div className="bg-black px-2 py-2">
              <div className="text-[6px] text-white/20 tracking-wider mb-0.5">FILL RATE</div>
              <div className="text-[12px] font-black" style={{ color: AMBER }}>
                {executionQuality.fillRate != null
                  ? fmtPct(executionQuality.fillRate)
                  : '--'}
              </div>
            </div>
            <div className="bg-black px-2 py-2">
              <div className="text-[6px] text-white/20 tracking-wider mb-0.5">AVG TIME-TO-FILL</div>
              <div className="text-[12px] font-black" style={{ color: AMBER }}>
                {executionQuality.avgTimeToFill != null
                  ? fmtMs(executionQuality.avgTimeToFill)
                  : '--'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Order Flow by Asset Class ── */}
        {trades.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-2 py-1 border-b border-border/20">
              <span className="text-[7px] text-amber-400/60 tracking-wider font-bold">
                {tr(t, 'tbOrderFlow', 'ORDER FLOW BY ASSET CLASS')}
              </span>
              <span className="ml-2 text-[7px]">
                <span style={{ color: GREEN }}>BUY</span>
                <span className="text-white/20 mx-1">/</span>
                <span style={{ color: RED }}>SELL</span>
              </span>
            </div>
            <div className="px-2 py-2">
              <OrderFlowChart trades={trades} />
            </div>
          </div>
        )}

        {/* ── Venue Breakdown ── */}
        {trades.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-2 py-1 border-b border-border/20">
              <span className="text-[7px] text-amber-400/60 tracking-wider font-bold">
                {tr(t, 'tbVenueBreakdown', 'VENUE BREAKDOWN')}
              </span>
            </div>
            <div className="px-2 py-2">
              <VenueDonutChart trades={trades} />
            </div>
          </div>
        )}

        {/* ── Largest Trades ── */}
        {largestTrades.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-2 py-1 border-b border-border/20">
              <span className="text-[7px] text-amber-400/60 tracking-wider font-bold">
                {tr(t, 'tbLargest', 'LARGEST TRADES')}
              </span>
            </div>
            <div className="px-1">
              {largestTrades.map((trade: any, idx: number) => {
                const side = (trade.side ?? '').toUpperCase();
                const isBuy = side === 'BUY';
                const qty = trade.quantity ?? trade.qty ?? 0;
                const price = trade.avgPrice ?? trade.price ?? 0;
                const notional = trade.notional ?? qty * price;
                const maxNotional = (() => {
                  const first = largestTrades[0];
                  const fq = first.quantity ?? first.qty ?? 0;
                  const fp = first.avgPrice ?? first.price ?? 0;
                  return first.notional ?? fq * fp;
                })();
                const barPct = maxNotional > 0 ? (notional / maxNotional) * 100 : 0;

                return (
                  <div
                    key={trade.id ?? idx}
                    className="relative flex items-center gap-2 px-1 py-1.5 border-b border-white/[0.02]"
                  >
                    {/* Background bar */}
                    <div
                      className="absolute left-0 top-0 h-full opacity-[0.04]"
                      style={{
                        width: `${barPct}%`,
                        background: isBuy ? GREEN : RED,
                      }}
                    />
                    <span className="relative text-[7px] text-white/30 w-[12px] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="relative text-[8px] font-bold text-amber-400 w-[44px] shrink-0 truncate">
                      {trade.symbol ?? trade.instrument ?? '--'}
                    </span>
                    <span
                      className="relative text-[7px] font-bold w-[26px] shrink-0"
                      style={{ color: isBuy ? GREEN : RED }}
                    >
                      {side}
                    </span>
                    <span className="relative text-white/50 w-[36px] shrink-0 text-right text-[7px]">
                      {fmtVol(qty)}
                    </span>
                    <span className="relative text-white/60 w-[44px] shrink-0 text-right">
                      {fmtPrice(price)}
                    </span>
                    <span className="relative flex-1 text-right font-bold text-white/70">
                      {fmtNotional(notional)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── P&L Summary ── */}
        <div className="border-b border-border/20">
          <div className="px-2 py-1 border-b border-border/20">
            <span className="text-[7px] text-amber-400/60 tracking-wider font-bold">
              {tr(t, 'tbPnl', 'P&L SUMMARY')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-amber-400/[0.04]">
            <div className="bg-black px-2 py-2">
              <div className="text-[6px] text-white/20 tracking-wider mb-0.5">REALIZED P&L</div>
              <div
                className="text-[12px] font-black"
                style={{ color: pnl.realized != null ? pnlColor(pnl.realized) : '#71717a' }}
              >
                {pnl.realized != null ? fmtNotional(pnl.realized) : '--'}
              </div>
            </div>
            <div className="bg-black px-2 py-2">
              <div className="text-[6px] text-white/20 tracking-wider mb-0.5">UNREALIZED P&L</div>
              <div
                className="text-[12px] font-black"
                style={{ color: pnl.unrealized != null ? pnlColor(pnl.unrealized) : '#71717a' }}
              >
                {pnl.unrealized != null ? fmtNotional(pnl.unrealized) : '--'}
              </div>
            </div>
            <div className="bg-black px-2 py-2">
              <div className="text-[6px] text-white/20 tracking-wider mb-0.5">TOTAL P&L</div>
              <div
                className="text-[12px] font-black"
                style={{ color: pnl.total != null ? pnlColor(pnl.total) : '#71717a' }}
              >
                {pnl.total != null ? fmtNotional(pnl.total) : '--'}
              </div>
            </div>
            <div className="bg-black px-2 py-2">
              <div className="text-[6px] text-white/20 tracking-wider mb-0.5">FEES / COMMISSIONS</div>
              <div className="text-[12px] font-black text-white/50">
                {pnl.fees != null ? fmtNotional(pnl.fees) : '--'}
              </div>
            </div>
          </div>
          {pnl.net != null && (
            <div className="bg-black px-2 py-2 border-t border-border/20">
              <div className="flex items-center justify-between">
                <span className="text-[7px] text-white/30 tracking-wider font-bold">NET P&L</span>
                <span
                  className="text-[14px] font-black"
                  style={{ color: pnlColor(pnl.net) }}
                >
                  {fmtNotional(pnl.net)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom Summary Bar ── */}
        <div className="shrink-0">
          <div className="grid grid-cols-4 gap-px bg-amber-400/[0.04]">
            <div className="bg-black px-2 py-1.5">
              <div className="text-[6px] text-white/20 tracking-wider">TOTAL TRADES</div>
              <div className="text-[11px] font-black text-amber-400">
                {data?.summary?.totalTrades ?? trades.length}
              </div>
            </div>
            <div className="bg-black px-2 py-1.5">
              <div className="text-[6px] text-white/20 tracking-wider">VOLUME</div>
              <div className="text-[11px] font-black text-white/60">
                {fmtVol(stats.totalVolume)}
              </div>
            </div>
            <div className="bg-black px-2 py-1.5">
              <div className="text-[6px] text-white/20 tracking-wider">NOTIONAL</div>
              <div className="text-[11px] font-black text-white/60">
                {fmtNotional(stats.totalNotional)}
              </div>
            </div>
            <div className="bg-black px-2 py-1.5">
              <div className="text-[6px] text-white/20 tracking-wider">BUY / SELL</div>
              <div className="text-[11px] font-black">
                <span style={{ color: GREEN }}>{stats.buyTrades.length}</span>
                <span className="text-white/20 mx-0.5">/</span>
                <span style={{ color: RED }}>{stats.sellTrades.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
