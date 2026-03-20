import { useMemo } from 'react';
import { useMarketMicrostructure } from '../../api/hooks/use-market-microstructure';
import { useT, tr, TFn } from '../../i18n';

// i18n helper with fallback
// ── Formatting ──

function fmtNum(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtNumSigned(n: number): string {
  return (n > 0 ? '+' : '') + fmtNum(n);
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

// ── Liquidity quality color ──

function liquidityColor(quality: string): string {
  switch (quality?.toLowerCase()) {
    case 'excellent': return '#4ade80';
    case 'good': return '#60a5fa';
    case 'fair': case 'moderate': return '#facc15';
    case 'poor': case 'thin': return '#f87171';
    default: return 'rgba(255,255,255,0.4)';
  }
}

function liquidityBg(quality: string): string {
  switch (quality?.toLowerCase()) {
    case 'excellent': return 'rgba(74,222,128,0.10)';
    case 'good': return 'rgba(96,165,250,0.10)';
    case 'fair': case 'moderate': return 'rgba(250,204,21,0.08)';
    case 'poor': case 'thin': return 'rgba(248,113,113,0.10)';
    default: return 'rgba(255,255,255,0.03)';
  }
}

// ── HFT Metrics Banner ──

function HftBanner({ data }: { data: any }) {
  if (!data?.hftMetrics) return null;
  const m = data.hftMetrics;
  const items = [
    { label: 'MSG RATE', value: m.messageRate != null ? fmtNum(m.messageRate) + '/s' : '-', accent: true },
    { label: 'ORDER/TRADE', value: m.orderToTradeRatio != null ? m.orderToTradeRatio.toFixed(1) + 'x' : '-' },
    { label: 'CANCEL RATE', value: m.cancelRate != null ? fmtPct(m.cancelRate) : '-' },
    { label: 'AVG LATENCY', value: m.avgLatency != null ? m.avgLatency.toFixed(1) + 'ms' : '-' },
    { label: 'MAKER/TAKER', value: m.makerTakerSplit != null ? m.makerTakerSplit : '-' },
  ];

  return (
    <div className="grid grid-cols-5 gap-0 border-b border-border/20 shrink-0">
      {items.map((item, i) => (
        <div key={i} className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">{item.label}</div>
          <div className={`text-[10px] font-black ${item.accent ? 'text-violet-400' : 'text-white/70'}`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Spread Data Table ──

function SpreadTable({ data }: { data: any }) {
  if (!data?.spreadData?.length) return null;

  return (
    <div>
      <div className="px-3 pt-2 pb-1">
        <span className="text-[7px] font-bold uppercase tracking-wider text-violet-400/60">
          SPREAD DATA
        </span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border/20 text-[7px] text-white/20 uppercase tracking-wider">
            <th className="py-1 px-3 text-left font-bold">TICKER</th>
            <th className="py-1 px-2 text-right font-bold">BID-ASK (c)</th>
            <th className="py-1 px-2 text-right font-bold">SPREAD (BPS)</th>
            <th className="py-1 px-2 text-right font-bold">AVG DLY VOL</th>
            <th className="py-1 px-2 text-right font-bold">AVG TRD SIZE</th>
            <th className="py-1 px-2 text-right font-bold">TICK SIZE</th>
          </tr>
        </thead>
        <tbody>
          {data.spreadData.map((row: any, i: number) => (
            <tr key={i} className="border-b border-border/20 hover:bg-violet-400/[0.02] transition-colors">
              <td className="py-1 px-3 text-left text-white/70 font-bold">{row.ticker}</td>
              <td className="py-1 px-2 text-right text-violet-400 font-bold">
                {row.bidAskCents != null ? row.bidAskCents.toFixed(2) : '-'}
              </td>
              <td className="py-1 px-2 text-right text-violet-400 font-bold">
                {row.spreadBps != null ? row.spreadBps.toFixed(1) : '-'}
              </td>
              <td className="py-1 px-2 text-right text-white/40">
                {row.avgDailyVolume != null ? fmtNum(row.avgDailyVolume) : '-'}
              </td>
              <td className="py-1 px-2 text-right text-white/40">
                {row.avgTradeSize != null ? fmtNum(row.avgTradeSize) : '-'}
              </td>
              <td className="py-1 px-2 text-right text-white/30">
                {row.tickSize != null ? '$' + row.tickSize.toFixed(2) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Dark Pool Activity ──

function DarkPoolActivity({ data }: { data: any }) {
  if (!data?.darkPoolActivity) return null;
  const dp = data.darkPoolActivity;
  const darkPct = dp.darkPct ?? 0;
  const litPct = dp.litPct ?? (100 - darkPct);

  return (
    <div>
      <div className="px-3 pt-3 pb-1">
        <span className="text-[7px] font-bold uppercase tracking-wider text-violet-400/60">
          DARK POOL ACTIVITY
        </span>
      </div>
      {/* Dark/Lit split bar */}
      <div className="px-3 py-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[7px] font-mono font-bold text-violet-400">
            DARK {fmtPct(darkPct)}
          </span>
          <span className="text-[7px] font-mono font-bold text-white/40">
            LIT {fmtPct(litPct)}
          </span>
        </div>
        <div className="flex h-2 overflow-hidden bg-white/5">
          <div
            className="h-full transition-all"
            style={{ width: `${darkPct}%`, backgroundColor: 'rgba(167,139,250,0.6)' }}
          />
          <div
            className="h-full transition-all"
            style={{ width: `${litPct}%`, backgroundColor: 'rgba(255,255,255,0.1)' }}
          />
        </div>
      </div>
      {/* Venue breakdown */}
      {dp.venues?.length > 0 && (
        <div className="px-3 pb-2 space-y-1">
          {dp.venues.map((venue: any, i: number) => {
            const sharePct = venue.sharePct ?? 0;
            return (
              <div key={i} className="flex items-center gap-2 hover:bg-violet-400/[0.02] py-0.5 px-0">
                <span className="text-[8px] font-mono font-bold text-white/50 w-[80px] truncate">
                  {venue.name}
                </span>
                <div className="flex-1 h-1.5 bg-white/5 overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.min(sharePct, 100)}%`,
                      backgroundColor: 'rgba(167,139,250,0.5)',
                    }}
                  />
                </div>
                <span className="text-[7px] font-mono text-violet-400 font-bold w-[36px] text-right">
                  {fmtPct(sharePct)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Order Flow by Sector ──

function OrderFlowSection({ data }: { data: any }) {
  if (!data?.orderFlow?.length) return null;

  return (
    <div>
      <div className="px-3 pt-3 pb-1">
        <span className="text-[7px] font-bold uppercase tracking-wider text-violet-400/60">
          ORDER FLOW
        </span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border/20 text-[7px] text-white/20 uppercase tracking-wider">
            <th className="py-1 px-3 text-left font-bold">SECTOR</th>
            <th className="py-1 px-2 text-right font-bold">NET FLOW</th>
            <th className="py-1 px-2 text-right font-bold">BUY RATIO</th>
            <th className="py-1 px-2 text-right font-bold">BLOCKS</th>
            <th className="py-1 px-2 text-right font-bold">AVG BLK SIZE</th>
          </tr>
        </thead>
        <tbody>
          {data.orderFlow.map((row: any, i: number) => {
            const netFlow = row.netFlow ?? 0;
            const isBuy = netFlow >= 0;
            return (
              <tr key={i} className="border-b border-border/20 hover:bg-violet-400/[0.02] transition-colors">
                <td className="py-1 px-3 text-left text-white/60 font-bold">{row.sector}</td>
                <td className={`py-1 px-2 text-right font-bold ${isBuy ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmtNumSigned(netFlow)}
                </td>
                <td className="py-1 px-2 text-right text-white/50">
                  {row.buyRatio != null ? fmtPct(row.buyRatio) : '-'}
                </td>
                <td className="py-1 px-2 text-right text-white/40">
                  {row.blockCount ?? '-'}
                </td>
                <td className="py-1 px-2 text-right text-white/40">
                  {row.avgBlockSize != null ? fmtNum(row.avgBlockSize) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Market Depth (SPY) ──

function MarketDepthLadder({ data }: { data: any }) {
  const depth = data?.marketDepth;
  if (!depth) return null;

  const bids: any[] = depth.bids?.slice(0, 5) ?? [];
  const asks: any[] = depth.asks?.slice(0, 5) ?? [];

  const maxSize = useMemo(() => {
    const bidMax = bids.reduce((m: number, b: any) => Math.max(m, b.size ?? 0), 0);
    const askMax = asks.reduce((m: number, a: any) => Math.max(m, a.size ?? 0), 0);
    return Math.max(bidMax, askMax, 1);
  }, [bids, asks]);

  const imbalance = depth.imbalance ?? 0;
  const imbalanceColor = imbalance > 0 ? '#4ade80' : imbalance < 0 ? '#f87171' : 'rgba(255,255,255,0.4)';
  const imbalanceLabel = imbalance > 0 ? 'BUY HEAVY' : imbalance < 0 ? 'SELL HEAVY' : 'BALANCED';

  return (
    <div>
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[7px] font-bold uppercase tracking-wider text-violet-400/60">
          MARKET DEPTH &mdash; SPY
        </span>
        <span
          className="text-[7px] font-mono font-black uppercase px-1.5 py-0.5"
          style={{ color: imbalanceColor, backgroundColor: imbalance !== 0 ? (imbalance > 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)') : 'rgba(255,255,255,0.03)' }}
        >
          {imbalanceLabel} {imbalance !== 0 ? `(${(Math.abs(imbalance) * 100).toFixed(1)}%)` : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-0 mx-3 mb-2 border border-border/10">
        {/* Bids */}
        <div className="border-r border-border/10">
          <div className="flex items-center justify-between px-2 py-0.5 border-b border-border/10">
            <span className="text-[6px] font-mono text-emerald-400/60 uppercase tracking-wider">BIDS</span>
            <span className="text-[6px] font-mono text-white/20">SIZE</span>
          </div>
          {bids.map((bid: any, i: number) => {
            const barW = ((bid.size ?? 0) / maxSize) * 100;
            return (
              <div key={i} className="relative flex items-center justify-between px-2 py-[2px] hover:bg-violet-400/[0.02]">
                <div
                  className="absolute left-0 top-0 h-full"
                  style={{ width: `${barW}%`, backgroundColor: 'rgba(52,211,153,0.08)' }}
                />
                <span className="relative text-[8px] font-mono font-bold text-emerald-400/80">
                  {bid.price != null ? bid.price.toFixed(2) : '-'}
                </span>
                <span className="relative text-[8px] font-mono font-bold text-white/50">
                  {bid.size != null ? fmtNum(bid.size) : '-'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Asks */}
        <div>
          <div className="flex items-center justify-between px-2 py-0.5 border-b border-border/10">
            <span className="text-[6px] font-mono text-red-400/60 uppercase tracking-wider">ASKS</span>
            <span className="text-[6px] font-mono text-white/20">SIZE</span>
          </div>
          {asks.map((ask: any, i: number) => {
            const barW = ((ask.size ?? 0) / maxSize) * 100;
            return (
              <div key={i} className="relative flex items-center justify-between px-2 py-[2px] hover:bg-violet-400/[0.02]">
                <div
                  className="absolute right-0 top-0 h-full"
                  style={{ width: `${barW}%`, backgroundColor: 'rgba(248,113,113,0.08)' }}
                />
                <span className="relative text-[8px] font-mono font-bold text-red-400/80">
                  {ask.price != null ? ask.price.toFixed(2) : '-'}
                </span>
                <span className="relative text-[8px] font-mono font-bold text-white/50">
                  {ask.size != null ? fmtNum(ask.size) : '-'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Liquidity Metrics ──

function LiquidityMetrics({ data }: { data: any }) {
  if (!data?.liquidityMetrics?.length) return null;

  return (
    <div>
      <div className="px-3 pt-3 pb-1">
        <span className="text-[7px] font-bold uppercase tracking-wider text-violet-400/60">
          LIQUIDITY METRICS
        </span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border/20 text-[7px] text-white/20 uppercase tracking-wider">
            <th className="py-1 px-3 text-left font-bold">INDEX</th>
            <th className="py-1 px-2 text-right font-bold">AMIHUD</th>
            <th className="py-1 px-2 text-right font-bold">EFF SPREAD</th>
            <th className="py-1 px-2 text-right font-bold">PRICE IMPACT</th>
            <th className="py-1 px-2 text-center font-bold">QUALITY</th>
          </tr>
        </thead>
        <tbody>
          {data.liquidityMetrics.map((row: any, i: number) => (
            <tr key={i} className="border-b border-border/20 hover:bg-violet-400/[0.02] transition-colors">
              <td className="py-1 px-3 text-left text-white/70 font-bold">{row.index}</td>
              <td className="py-1 px-2 text-right text-white/50">
                {row.amihudRatio != null ? row.amihudRatio.toFixed(4) : '-'}
              </td>
              <td className="py-1 px-2 text-right text-white/50">
                {row.effectiveSpread != null ? row.effectiveSpread.toFixed(2) + 'bp' : '-'}
              </td>
              <td className="py-1 px-2 text-right text-white/50">
                {row.priceImpact != null ? row.priceImpact.toFixed(2) + 'bp' : '-'}
              </td>
              <td className="py-1 px-2 text-center">
                <span
                  className="text-[7px] font-mono font-black uppercase px-1.5 py-0.5"
                  style={{
                    color: liquidityColor(row.quality),
                    backgroundColor: liquidityBg(row.quality),
                  }}
                >
                  {row.quality ?? '-'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Venue Stats ──

function VenueStats({ data }: { data: any }) {
  if (!data?.venueStats?.length) return null;

  return (
    <div>
      <div className="px-3 pt-3 pb-1">
        <span className="text-[7px] font-bold uppercase tracking-wider text-violet-400/60">
          VENUE STATISTICS
        </span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border/20 text-[7px] text-white/20 uppercase tracking-wider">
            <th className="py-1 px-3 text-left font-bold">EXCHANGE</th>
            <th className="py-1 px-2 text-right font-bold">MKT SHARE%</th>
            <th className="py-1 px-2 text-right font-bold">AVG SPREAD</th>
            <th className="py-1 px-2 text-right font-bold">AVG LATENCY</th>
            <th className="py-1 px-2 text-right font-bold">MATCH RATE%</th>
          </tr>
        </thead>
        <tbody>
          {data.venueStats.map((venue: any, i: number) => (
            <tr key={i} className="border-b border-border/20 hover:bg-violet-400/[0.02] transition-colors">
              <td className="py-1 px-3 text-left text-white/70 font-bold">{venue.exchange}</td>
              <td className="py-1 px-2 text-right text-violet-400 font-bold">
                {venue.marketSharePct != null ? fmtPct(venue.marketSharePct) : '-'}
              </td>
              <td className="py-1 px-2 text-right text-white/50">
                {venue.avgSpread != null ? venue.avgSpread.toFixed(2) + 'bp' : '-'}
              </td>
              <td className="py-1 px-2 text-right text-white/50">
                {venue.avgLatency != null ? venue.avgLatency.toFixed(1) + 'ms' : '-'}
              </td>
              <td className="py-1 px-2 text-right text-white/50">
                {venue.matchRate != null ? fmtPct(venue.matchRate) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Panel ──

export function MarketMicrostructurePanel() {
  const t = useT();
  const { data, isLoading } = useMarketMicrostructure();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-violet-400/40 uppercase tracking-widest animate-pulse">
          LOADING MICROSTRUCTURE DATA...
        </span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 shrink-0">
        <div className="w-0.5 h-3 bg-violet-400" />
        <span className="text-[9px] font-black uppercase tracking-wider text-violet-400">
          {tr(t, 'panelMarketMicrostructure', 'MARKET MICROSTRUCTURE')}
        </span>
      </div>

      {/* HFT Metrics Banner */}
      <HftBanner data={data} />

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin">
        {/* Spread Data Table */}
        <SpreadTable data={data} />

        {/* Dark Pool Activity */}
        <DarkPoolActivity data={data} />

        {/* Order Flow by Sector */}
        <OrderFlowSection data={data} />

        {/* Market Depth - SPY */}
        <MarketDepthLadder data={data} />

        {/* Liquidity Metrics */}
        <LiquidityMetrics data={data} />

        {/* Venue Statistics */}
        <VenueStats data={data} />
      </div>
    </div>
  );
}
