import { useState } from 'react';
import { useTradeRecap } from '../../api/hooks/use-trade-recap';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, BarChart3 } from 'lucide-react';

// i18n helper with fallback
// ── Constants ──

const ACCENT = '#fbbf24'; // amber-400
const ACCENT_DIM = 'rgba(251,191,36,0.08)';
const GREEN = '#22c55e';
const RED = '#ef4444';
const YELLOW = '#facc15';
const ORANGE = '#fb923c';
const DIM = 'rgba(255,255,255,0.3)';

type Tab = 'summary' | 'topTrades' | 'execution' | 'venues' | 'activity';

// ── Helpers ──

function plColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return DIM;
}

function slipColor(n: number): string {
  if (n < 0) return GREEN;
  if (n === 0) return DIM;
  if (n <= 1) return YELLOW;
  if (n <= 3) return ORANGE;
  return RED;
}

function fmtNum(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(2);
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtBps(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)} bps`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtMs(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`;
  return `${n.toFixed(0)}ms`;
}

// ── Main Panel ──

export function TradeRecapPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useTradeRecap();
  const [tab, setTab] = useState<Tab>('summary');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'summary', label: 'SUMMARY' },
    { key: 'topTrades', label: 'TOP TRADES' },
    { key: 'execution', label: 'EXECUTION' },
    { key: 'venues', label: 'VENUES' },
    { key: 'activity', label: 'ACTIVITY' },
  ];

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black">
        <RefreshCw className="w-4 h-4 animate-spin mb-2" style={{ color: ACCENT }} />
        <div
          className="text-[9px] font-mono uppercase tracking-widest animate-pulse"
          style={{ color: ACCENT }}
        >
          LOADING TRADE DATA...
        </div>
      </div>
    );
  }

  // Error state
  if (error || (!data && !isLoading)) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-2">
        <div className="text-[9px] font-mono uppercase tracking-widest text-red-500">
          FAILED TO LOAD
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-wider border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
        >
          RETRY
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'trTitle', 'Trade Recap')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-0.5 text-white/30 hover:text-amber-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map((tb: any) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className="px-3 py-1.5 text-[7px] font-mono font-black uppercase tracking-wider transition-colors"
            style={{
              color: tab === tb.key ? ACCENT : 'rgba(255,255,255,0.35)',
              borderBottom: tab === tb.key ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: tab === tb.key ? ACCENT_DIM : 'transparent',
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'summary' && <SummaryTab data={data} />}
        {tab === 'topTrades' && <TopTradesTab data={data} />}
        {tab === 'execution' && <ExecutionTab data={data} />}
        {tab === 'venues' && <VenuesTab data={data} />}
        {tab === 'activity' && <ActivityTab data={data} />}
      </div>
    </div>
  );
}

// ── SUMMARY TAB ──

function SummaryTab({ data }: { data: any }) {
  const t = useT();
  const s = data.summary ?? data;

  const totalTrades = s.totalTrades ?? 0;
  const totalVolume = s.totalVolume ?? 0;
  const buyCount = s.buyCount ?? 0;
  const sellCount = s.sellCount ?? 0;
  const grossPnl = s.grossPnl ?? 0;
  const netPnl = s.netPnl ?? 0;
  const commissions = s.commissions ?? 0;
  const winRate = s.winRate ?? 0;
  const profitFactor = s.profitFactor ?? 0;

  const metrics: { label: string; value: string; color: string }[] = [
    { label: 'Total Trades', value: String(totalTrades), color: 'rgba(255,255,255,0.7)' },
    { label: 'Volume', value: fmtNum(totalVolume), color: 'rgba(255,255,255,0.7)' },
    { label: 'Buys', value: String(buyCount), color: GREEN },
    { label: 'Sells', value: String(sellCount), color: RED },
    { label: 'Gross P&L', value: fmtNum(grossPnl), color: plColor(grossPnl) },
    { label: 'Net P&L', value: fmtNum(netPnl), color: plColor(netPnl) },
    { label: 'Commissions', value: fmtNum(commissions), color: ORANGE },
    { label: 'Win Rate', value: fmtPct(winRate), color: winRate >= 50 ? GREEN : RED },
    { label: 'Profit Factor', value: profitFactor.toFixed(2), color: profitFactor >= 1 ? GREEN : RED },
  ];

  const assetBreakdown: any[] = s.assetBreakdown ?? s.assetClasses ?? [];

  return (
    <div className="text-[9px] font-mono">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-px bg-white/[0.02] border-b border-border/20">
        {metrics.map((m: any) => (
          <div key={m.label} className="px-2 py-1.5 bg-black">
            <div className="text-[7px] font-black uppercase tracking-wider text-white/20 mb-0.5">{m.label}</div>
            <div className="text-[11px] font-bold" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Asset Class Breakdown */}
      {assetBreakdown.length > 0 && (
        <div className="border-t border-border/20">
          <div className="px-2 pt-2 pb-1">
            <span className="text-[7px] font-black uppercase tracking-wider text-white/25">
              Asset Class Breakdown
            </span>
          </div>

          {/* Table header */}
          <div className="flex items-center px-2 py-1 border-b border-border/20 text-[7px] font-black uppercase tracking-wider text-white/20 gap-2">
            <span className="w-[72px] shrink-0">Asset</span>
            <span className="w-[48px] shrink-0 text-right">Trades</span>
            <span className="w-[56px] shrink-0 text-right">Volume</span>
            <span className="w-[56px] shrink-0 text-right">P&L</span>
            <span className="flex-1 text-right">Win Rate</span>
          </div>

          {assetBreakdown.map((ac: any) => (
            <div
              key={ac.name ?? ac.assetClass ?? ac.asset}
              className="flex items-center px-2 py-1 border-b border-white/[0.02] gap-2 hover:bg-amber-400/[0.02] transition-colors"
            >
              <span className="w-[72px] shrink-0 font-bold text-white/60">
                {ac.name ?? ac.assetClass ?? ac.asset}
              </span>
              <span className="w-[48px] shrink-0 text-right text-white/40">
                {ac.trades ?? ac.count ?? 0}
              </span>
              <span className="w-[56px] shrink-0 text-right text-white/40">
                {fmtNum(ac.volume ?? 0)}
              </span>
              <span
                className="w-[56px] shrink-0 text-right font-bold"
                style={{ color: plColor(ac.pnl ?? ac.netPnl ?? 0) }}
              >
                {fmtNum(ac.pnl ?? ac.netPnl ?? 0)}
              </span>
              <span
                className="flex-1 text-right"
                style={{ color: (ac.winRate ?? 0) >= 50 ? GREEN : RED }}
              >
                {fmtPct(ac.winRate ?? 0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TOP TRADES TAB ──

function TopTradesTab({ data }: { data: any }) {
  const trades: any[] = data.topTrades ?? data.trades ?? [];

  const columns = [
    { label: 'TIME', width: 'w-[56px]' },
    { label: 'SYMBOL', width: 'w-[48px]' },
    { label: 'SIDE', width: 'w-[32px]' },
    { label: 'QTY', width: 'w-[44px]', align: 'text-right' },
    { label: 'PRICE', width: 'w-[52px]', align: 'text-right' },
    { label: 'NOTIONAL', width: 'w-[56px]', align: 'text-right' },
    { label: 'P&L', width: 'w-[52px]', align: 'text-right' },
    { label: 'VENUE', width: 'w-[44px]' },
    { label: 'TYPE', width: 'w-[40px]' },
  ];

  return (
    <div className="text-[9px] font-mono">
      {/* Table header */}
      <div className="flex items-center px-1 py-1 border-b border-border/20 text-[7px] font-black uppercase tracking-wider text-white/20 gap-0.5">
        {columns.map((col: any) => (
          <span key={col.label} className={`${col.width} shrink-0 ${col.align ?? ''}`}>
            {col.label}
          </span>
        ))}
      </div>

      {/* Rows */}
      {trades.map((trade: any, idx: number) => {
        const side = (trade.side ?? '').toUpperCase();
        const isBuy = side === 'BUY';
        const pnl = trade.pnl ?? trade.realizedPnl ?? 0;
        const notional = trade.notional ?? (trade.quantity ?? 0) * (trade.price ?? 0);

        return (
          <div
            key={trade.id ?? idx}
            className="flex items-center px-1 py-0.5 border-b border-white/[0.02] gap-0.5 hover:bg-amber-400/[0.02] transition-colors"
          >
            {/* Time */}
            <span className="w-[56px] shrink-0 text-white/30 text-[7px]">
              {trade.time ?? trade.timestamp ?? trade.executionTime
                ? fmtTime(trade.time ?? trade.timestamp ?? trade.executionTime)
                : '--'}
            </span>

            {/* Symbol */}
            <span className="w-[48px] shrink-0 font-bold text-white/70">
              {trade.symbol ?? '--'}
            </span>

            {/* Side badge */}
            <span className="w-[32px] shrink-0">
              <span
                className="px-1 py-0.5 text-[6px] font-black uppercase"
                style={{
                  color: isBuy ? GREEN : RED,
                  backgroundColor: isBuy ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                }}
              >
                {side || '--'}
              </span>
            </span>

            {/* Qty */}
            <span className="w-[44px] shrink-0 text-right text-white/50">
              {fmtNum(trade.quantity ?? trade.qty ?? 0)}
            </span>

            {/* Price */}
            <span className="w-[52px] shrink-0 text-right text-white/60">
              {(trade.price ?? trade.avgPrice ?? 0).toFixed(2)}
            </span>

            {/* Notional */}
            <span className="w-[56px] shrink-0 text-right text-white/40">
              {fmtNum(notional)}
            </span>

            {/* P&L */}
            <span
              className="w-[52px] shrink-0 text-right font-bold"
              style={{ color: plColor(pnl) }}
            >
              {fmtNum(pnl)}
            </span>

            {/* Venue */}
            <span className="w-[44px] shrink-0 text-white/30 text-[7px]">
              {trade.venue ?? '--'}
            </span>

            {/* Order Type */}
            <span className="w-[40px] shrink-0 text-white/25 text-[7px]">
              {trade.orderType ?? trade.type ?? '--'}
            </span>
          </div>
        );
      })}

      {trades.length === 0 && (
        <div className="text-center py-6 text-white/20 text-[8px] uppercase tracking-wider">
          No trades available
        </div>
      )}
    </div>
  );
}

// ── EXECUTION TAB ──

function ExecutionTab({ data }: { data: any }) {
  const exec = data.execution ?? data.executionQuality ?? {};

  const avgSlippage = exec.avgSlippage ?? exec.avgSlippageBps ?? 0;
  const implShortfall = exec.implementationShortfall ?? exec.implShortfall ?? 0;
  const vwapPerf = exec.vwapPerformance ?? exec.vwapPerfBps ?? 0;
  const participationRate = exec.participationRate ?? 0;
  const avgFillTime = exec.avgFillTime ?? exec.avgFillTimeMs ?? 0;
  const rejectRate = exec.rejectRate ?? 0;

  const metrics: { label: string; value: string; detail: string; color: string }[] = [
    {
      label: 'Avg Slippage',
      value: fmtBps(avgSlippage),
      detail: avgSlippage < 0 ? 'FAVORABLE' : avgSlippage === 0 ? 'NEUTRAL' : 'ADVERSE',
      color: slipColor(avgSlippage),
    },
    {
      label: 'Impl Shortfall',
      value: fmtBps(implShortfall),
      detail: 'VS ARRIVAL PRICE',
      color: slipColor(implShortfall),
    },
    {
      label: 'VWAP Performance',
      value: fmtBps(vwapPerf),
      detail: vwapPerf < 0 ? 'BEAT VWAP' : 'MISSED VWAP',
      color: slipColor(vwapPerf),
    },
    {
      label: 'Participation Rate',
      value: fmtPct(participationRate),
      detail: 'OF MARKET VOLUME',
      color: participationRate <= 15 ? GREEN : participationRate <= 30 ? YELLOW : RED,
    },
    {
      label: 'Avg Fill Time',
      value: fmtMs(avgFillTime),
      detail: 'ORDER TO FILL',
      color: avgFillTime <= 200 ? GREEN : avgFillTime <= 500 ? YELLOW : RED,
    },
    {
      label: 'Reject Rate',
      value: fmtPct(rejectRate),
      detail: 'OF TOTAL ORDERS',
      color: rejectRate <= 1 ? GREEN : rejectRate <= 5 ? YELLOW : RED,
    },
  ];

  return (
    <div className="text-[9px] font-mono">
      {/* Execution quality header */}
      <div className="px-2 pt-2 pb-1 border-b border-border/20">
        <span className="text-[7px] font-black uppercase tracking-wider text-white/25">
          Execution Quality Metrics
        </span>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-2 gap-px bg-white/[0.02]">
        {metrics.map((m: any) => (
          <div key={m.label} className="px-3 py-2.5 bg-black hover:bg-amber-400/[0.02] transition-colors">
            <div className="text-[7px] font-black uppercase tracking-wider text-white/20 mb-1">
              {m.label}
            </div>
            <div className="text-[13px] font-bold mb-0.5" style={{ color: m.color }}>
              {m.value}
            </div>
            <div className="text-[6px] uppercase tracking-wider" style={{ color: m.color, opacity: 0.6 }}>
              {m.detail}
            </div>
          </div>
        ))}
      </div>

      {/* Quality gauge bar */}
      <div className="px-3 py-2 border-t border-border/20">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[7px] font-black uppercase tracking-wider text-white/25">
            Overall Execution Score
          </span>
          <span className="text-[8px] font-bold" style={{ color: ACCENT }}>
            {exec.overallScore ?? exec.qualityScore ?? '--'}
          </span>
        </div>
        <div className="w-full h-[4px] bg-white/[0.04] relative">
          <div
            className="absolute inset-y-0 left-0 transition-all"
            style={{
              width: `${Math.min(100, exec.overallScore ?? exec.qualityScore ?? 0)}%`,
              backgroundColor: ACCENT,
              opacity: 0.7,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── VENUES TAB ──

function VenuesTab({ data }: { data: any }) {
  const venues: any[] = data.venues ?? data.venueBreakdown ?? [];

  return (
    <div className="text-[9px] font-mono">
      {/* Header */}
      <div className="px-2 pt-2 pb-1 border-b border-border/20">
        <span className="text-[7px] font-black uppercase tracking-wider text-white/25">
          Venue Performance
        </span>
      </div>

      {/* Table header */}
      <div className="flex items-center px-2 py-1 border-b border-border/20 text-[7px] font-black uppercase tracking-wider text-white/20 gap-1">
        <span className="w-[56px] shrink-0">Venue</span>
        <span className="w-[40px] shrink-0 text-right">Trades</span>
        <span className="w-[52px] shrink-0 text-right">Volume</span>
        <span className="w-[44px] shrink-0 text-right">Spread</span>
        <span className="flex-1">Fill Rate</span>
        <span className="w-[44px] shrink-0 text-right">Latency</span>
      </div>

      {/* Rows */}
      {venues.map((v: any) => {
        const fillRate = v.fillRate ?? v.fillPct ?? 0;
        const fillColor = fillRate >= 95 ? GREEN : fillRate >= 80 ? YELLOW : RED;

        return (
          <div
            key={v.name ?? v.venue}
            className="flex items-center px-2 py-1 border-b border-white/[0.02] gap-1 hover:bg-amber-400/[0.02] transition-colors"
          >
            {/* Venue name */}
            <span className="w-[56px] shrink-0 font-bold text-white/60">
              {v.name ?? v.venue}
            </span>

            {/* Trade count */}
            <span className="w-[40px] shrink-0 text-right text-white/40">
              {v.tradeCount ?? v.trades ?? v.count ?? 0}
            </span>

            {/* Volume */}
            <span className="w-[52px] shrink-0 text-right text-white/40">
              {fmtNum(v.volume ?? 0)}
            </span>

            {/* Avg Spread */}
            <span className="w-[44px] shrink-0 text-right text-white/35">
              {(v.avgSpread ?? v.spread ?? 0).toFixed(2)}
            </span>

            {/* Fill Rate bar */}
            <div className="flex-1 flex items-center gap-1 min-w-0">
              <div className="flex-1 h-[4px] bg-white/[0.04] relative">
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${Math.min(100, fillRate)}%`,
                    backgroundColor: fillColor,
                    opacity: 0.6,
                  }}
                />
              </div>
              <span className="text-[6px] w-[24px] text-right shrink-0" style={{ color: fillColor }}>
                {fmtPct(fillRate)}
              </span>
            </div>

            {/* Latency */}
            <span className="w-[44px] shrink-0 text-right text-white/30">
              {fmtMs(v.avgLatency ?? v.latency ?? v.avgLatencyMs ?? 0)}
            </span>
          </div>
        );
      })}

      {venues.length === 0 && (
        <div className="text-center py-6 text-white/20 text-[8px] uppercase tracking-wider">
          No venue data available
        </div>
      )}
    </div>
  );
}

// ── ACTIVITY TAB ──

function ActivityTab({ data }: { data: any }) {
  const hourlyData: any[] = data.hourlyActivity ?? data.activity ?? data.hourly ?? [];

  // If no data, generate representative U-curve placeholder labels
  const hours = hourlyData.length > 0
    ? hourlyData
    : Array.from({ length: 13 }, (_: any, i: number) => ({
        hour: 9 + Math.floor(i / 2),
        label: `${9 + Math.floor(i / 2)}:${i % 2 === 0 ? '00' : '30'}`,
        volume: 0,
        pnl: 0,
      }));

  const maxVolume = Math.max(...hours.map((h: any) => Math.abs(h.volume ?? h.trades ?? 0)), 1);
  const maxPnl = Math.max(...hours.map((h: any) => Math.abs(h.pnl ?? 0)), 1);

  const BAR_MAX_W = 120;

  return (
    <div className="text-[9px] font-mono">
      {/* Header */}
      <div className="px-2 pt-2 pb-1 border-b border-border/20">
        <span className="text-[7px] font-black uppercase tracking-wider text-white/25">
          Intraday Activity (Volume / P&L)
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-2 py-1 border-b border-white/[0.04]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-1" style={{ backgroundColor: ACCENT, opacity: 0.7 }} />
          <span className="text-[6px] text-white/25">VOLUME</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-1" style={{ backgroundColor: GREEN, opacity: 0.5 }} />
          <span className="text-[6px] text-white/25">P&L (+)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-1" style={{ backgroundColor: RED, opacity: 0.5 }} />
          <span className="text-[6px] text-white/25">P&L (-)</span>
        </div>
      </div>

      {/* Bar chart rows */}
      <div className="px-2 py-1">
        {hours.map((h: any, idx: number) => {
          const vol = h.volume ?? h.trades ?? 0;
          const pnl = h.pnl ?? 0;
          const volWidth = maxVolume > 0 ? (Math.abs(vol) / maxVolume) * BAR_MAX_W : 0;
          const pnlWidth = maxPnl > 0 ? (Math.abs(pnl) / maxPnl) * BAR_MAX_W * 0.5 : 0;
          const hourLabel = h.label ?? h.hour ?? idx;

          return (
            <div
              key={idx}
              className="flex items-center py-0.5 gap-1 hover:bg-amber-400/[0.02] transition-colors"
            >
              {/* Hour label */}
              <span className="w-[32px] shrink-0 text-[7px] text-white/30 text-right">
                {hourLabel}
              </span>

              {/* Volume bar */}
              <div className="flex-1 flex items-center gap-1 min-w-0">
                <div className="flex items-center gap-0.5" style={{ width: BAR_MAX_W }}>
                  <div
                    className="h-[6px]"
                    style={{
                      width: `${volWidth}px`,
                      backgroundColor: ACCENT,
                      opacity: 0.6,
                      minWidth: vol > 0 ? '2px' : '0px',
                    }}
                  />
                </div>
                <span className="text-[6px] text-white/25 w-[36px] shrink-0">
                  {vol > 0 ? fmtNum(vol) : ''}
                </span>

                {/* P&L bar */}
                <div className="flex items-center gap-0.5" style={{ width: BAR_MAX_W * 0.5 }}>
                  <div
                    className="h-[4px]"
                    style={{
                      width: `${pnlWidth}px`,
                      backgroundColor: pnl >= 0 ? GREEN : RED,
                      opacity: 0.5,
                      minWidth: pnl !== 0 ? '1px' : '0px',
                    }}
                  />
                </div>
                <span
                  className="text-[6px] w-[36px] shrink-0"
                  style={{ color: plColor(pnl) }}
                >
                  {pnl !== 0 ? fmtNum(pnl) : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      {hourlyData.length > 0 && (
        <div className="flex items-center gap-4 px-2 py-1.5 border-t border-border/20">
          <div>
            <span className="text-[6px] text-white/20 uppercase">Peak Hour</span>
            <span className="ml-1 text-[7px] font-bold" style={{ color: ACCENT }}>
              {hours.reduce((max: any, h: any) =>
                (h.volume ?? h.trades ?? 0) > (max.volume ?? max.trades ?? 0) ? h : max, hours[0]
              ).label ?? '--'}
            </span>
          </div>
          <div>
            <span className="text-[6px] text-white/20 uppercase">Best Hour</span>
            <span className="ml-1 text-[7px] font-bold" style={{ color: GREEN }}>
              {hours.reduce((max: any, h: any) =>
                (h.pnl ?? 0) > (max.pnl ?? 0) ? h : max, hours[0]
              ).label ?? '--'}
            </span>
          </div>
          <div>
            <span className="text-[6px] text-white/20 uppercase">Worst Hour</span>
            <span className="ml-1 text-[7px] font-bold" style={{ color: RED }}>
              {hours.reduce((min: any, h: any) =>
                (h.pnl ?? 0) < (min.pnl ?? 0) ? h : min, hours[0]
              ).label ?? '--'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
