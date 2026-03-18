import { useMarketMicrostructure } from '../../api/hooks/use-market-microstructure';
import { useT } from '../../i18n';

// i18n helper with fallback
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Formatting ──

function fmtNum(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

// ── Main Panel ──

export function MarketMicrostructurePanel() {
  const t = useT();
  const { data, isLoading } = useMarketMicrostructure();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
          {tr(t, 'loading', 'Loading...')}
        </span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 shrink-0">
        <div className="w-0.5 h-3 bg-purple-400" />
        <span className="text-[9px] font-black uppercase tracking-wider text-purple-400">
          {tr(t, 'microTitle', 'Market Microstructure')}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin">
        {/* ── Spread Analysis ── */}
        <div className="px-3 pt-2 pb-1">
          <span className="text-[7px] font-bold uppercase tracking-wider text-purple-400/60">
            {tr(t, 'microSpreadAnalysis', 'Spread Analysis')}
          </span>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border/20 text-[7px] text-white/20 uppercase tracking-wider">
              <th className="py-1 px-3 text-left font-bold">Ticker</th>
              <th className="py-1 px-2 text-right font-bold">Bid</th>
              <th className="py-1 px-2 text-right font-bold">Ask</th>
              <th className="py-1 px-2 text-right font-bold">Spread BPS</th>
              <th className="py-1 px-2 text-right font-bold">Depth</th>
              <th className="py-1 px-2 text-right font-bold">Avg Trade Size</th>
              <th className="py-1 px-2 text-right font-bold">Trades/Min</th>
            </tr>
          </thead>
          <tbody>
            {data?.spreadAnalysis?.map((row: any, i: number) => (
              <tr key={i} className="border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors">
                <td className="py-1 px-3 text-left text-white/70 font-bold">{row.ticker}</td>
                <td className="py-1 px-2 text-right text-white/50">{row.bid?.toFixed(2)}</td>
                <td className="py-1 px-2 text-right text-white/50">{row.ask?.toFixed(2)}</td>
                <td className="py-1 px-2 text-right text-purple-400 font-bold">{row.spreadBps?.toFixed(1)}</td>
                <td className="py-1 px-2 text-right text-white/40">{row.depth != null ? fmtNum(row.depth) : '-'}</td>
                <td className="py-1 px-2 text-right text-white/40">{row.avgTradeSize != null ? fmtNum(row.avgTradeSize) : '-'}</td>
                <td className="py-1 px-2 text-right text-white/40">{row.tradesPerMin?.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Order Flow ── */}
        <div className="px-3 pt-3 pb-1">
          <span className="text-[7px] font-bold uppercase tracking-wider text-purple-400/60">
            {tr(t, 'microOrderFlow', 'Order Flow')}
          </span>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border/20 text-[7px] text-white/20 uppercase tracking-wider">
              <th className="py-1 px-3 text-left font-bold">Metric</th>
              <th className="py-1 px-2 text-right font-bold">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors">
              <td className="py-1 px-3 text-left text-white/50">Buy Volume %</td>
              <td className="py-1 px-2 text-right text-emerald-400 font-bold">{data?.orderFlow?.buyVolumePct?.toFixed(1)}%</td>
            </tr>
            <tr className="border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors">
              <td className="py-1 px-3 text-left text-white/50">Sell Volume %</td>
              <td className="py-1 px-2 text-right text-red-400 font-bold">{data?.orderFlow?.sellVolumePct?.toFixed(1)}%</td>
            </tr>
            <tr className="border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors">
              <td className="py-1 px-3 text-left text-white/50">Net Imbalance</td>
              <td className="py-1 px-2 text-right text-purple-400 font-bold">{data?.orderFlow?.netImbalance?.toFixed(2)}</td>
            </tr>
            <tr className="border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors">
              <td className="py-1 px-3 text-left text-white/50">Dark Pool %</td>
              <td className="py-1 px-2 text-right text-white/60">{data?.orderFlow?.darkPoolPct?.toFixed(1)}%</td>
            </tr>
            <tr className="border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors">
              <td className="py-1 px-3 text-left text-white/50">Lit %</td>
              <td className="py-1 px-2 text-right text-white/60">{data?.orderFlow?.litPct?.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>

        {/* ── Venue Analysis ── */}
        <div className="px-3 pt-3 pb-1">
          <span className="text-[7px] font-bold uppercase tracking-wider text-purple-400/60">
            {tr(t, 'microVenueAnalysis', 'Venue Analysis')}
          </span>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border/20 text-[7px] text-white/20 uppercase tracking-wider">
              <th className="py-1 px-3 text-left font-bold">Exchange</th>
              <th className="py-1 px-2 text-right font-bold">Market Share %</th>
              <th className="py-1 px-2 text-right font-bold">Spread</th>
              <th className="py-1 px-2 text-right font-bold">Fill Rate</th>
            </tr>
          </thead>
          <tbody>
            {data?.venueAnalysis?.map((venue: any, i: number) => (
              <tr key={i} className="border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors">
                <td className="py-1 px-3 text-left text-white/70 font-bold">{venue.exchange}</td>
                <td className="py-1 px-2 text-right text-purple-400 font-bold">{venue.marketSharePct?.toFixed(1)}%</td>
                <td className="py-1 px-2 text-right text-white/50">{venue.spread?.toFixed(2)}</td>
                <td className="py-1 px-2 text-right text-white/50">{venue.fillRate?.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
