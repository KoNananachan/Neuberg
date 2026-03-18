import { useDividendForecast } from '../../api/hooks/use-dividend-forecast';
import { useT } from '../../i18n';

// ── Helpers ──

function fmtDate(d: string | null | undefined): string {
  if (!d) return '--';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '--';
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '--';
  return `$${n.toFixed(2)}`;
}

function growthColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 5) return 'text-green-400';
  if (n > 0) return 'text-green-400/70';
  if (n === 0) return 'text-neutral-500';
  return 'text-red-400';
}

function yieldColor(y: number | null | undefined): string {
  if (y == null) return 'text-neutral-500';
  if (y >= 4) return 'text-green-400';
  if (y >= 2) return 'text-green-400/70';
  return 'text-neutral-400';
}

// ── Main Panel ──

export function DividendForecastPanel() {
  const t = useT();
  const { data, isLoading } = useDividendForecast();

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-black font-mono text-[9px]">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20">
          <div className="w-1 h-3 bg-green-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-green-400">
            DIVIDEND FORECAST
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-neutral-500 uppercase tracking-wider">Loading...</span>
        </div>
      </div>
    );
  }

  const upcoming = data?.upcoming ?? [];
  const growthHistory = data?.growthHistory ?? [];
  const sectorYields = data?.sectorYields ?? [];

  return (
    <div className="h-full flex flex-col bg-black font-mono text-[9px] overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 shrink-0">
        <div className="w-1 h-3 bg-green-400" />
        <span className="text-[10px] font-black uppercase tracking-wider text-green-400">
          DIVIDEND FORECAST
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {/* ── Section 1: Upcoming Dividends ── */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/20 bg-black">
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              UPCOMING DIVIDENDS
            </span>
          </div>

          {/* Table header */}
          <div className="sticky top-0 z-10 grid grid-cols-[52px_60px_60px_48px_44px_50px] text-[7px] font-black text-neutral-600 uppercase tracking-wider px-2 py-0.5 border-b border-border/20 bg-black">
            <span>TICKER</span>
            <span className="text-right">EX-DATE</span>
            <span className="text-right">PAY DATE</span>
            <span className="text-right">AMOUNT</span>
            <span className="text-right">YIELD</span>
            <span className="text-right">PAYOUT</span>
          </div>

          {/* Table rows */}
          {upcoming.map((item: any, i: number) => (
            <div
              key={`${item?.ticker}-${i}`}
              className="grid grid-cols-[52px_60px_60px_48px_44px_50px] px-2 py-1 border-b border-border/20 hover:bg-green-400/[0.02] transition-colors items-center"
            >
              <span className="text-green-400 font-black truncate">{item?.ticker ?? '--'}</span>
              <span className="text-right text-neutral-500">{fmtDate(item?.exDate)}</span>
              <span className="text-right text-neutral-500">{fmtDate(item?.payDate)}</span>
              <span className="text-right text-neutral-400">{fmtMoney(item?.amount)}</span>
              <span className={`text-right font-bold ${yieldColor(item?.yield)}`}>
                {item?.yield != null ? item.yield.toFixed(2) + '%' : '--'}
              </span>
              <span className="text-right text-neutral-500">
                {item?.payoutRatio != null ? item.payoutRatio.toFixed(0) + '%' : '--'}
              </span>
            </div>
          ))}

          {upcoming.length === 0 && (
            <div className="flex items-center justify-center py-4 text-neutral-600 uppercase tracking-wider">
              NO UPCOMING DIVIDENDS
            </div>
          )}
        </div>

        {/* ── Section 2: Growth History ── */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/20 bg-black">
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              GROWTH HISTORY
            </span>
          </div>

          {/* Table header */}
          <div className="sticky top-0 z-10 grid grid-cols-[52px_48px_48px_48px_48px_44px] text-[7px] font-black text-neutral-600 uppercase tracking-wider px-2 py-0.5 border-b border-border/20 bg-black">
            <span>TICKER</span>
            <span className="text-right">1Y CAGR</span>
            <span className="text-right">3Y CAGR</span>
            <span className="text-right">5Y CAGR</span>
            <span className="text-right">10Y CAGR</span>
            <span className="text-right">YRS</span>
          </div>

          {/* Table rows */}
          {growthHistory.map((item: any, i: number) => (
            <div
              key={`${item?.ticker}-${i}`}
              className="grid grid-cols-[52px_48px_48px_48px_48px_44px] px-2 py-1 border-b border-border/20 hover:bg-green-400/[0.02] transition-colors items-center"
            >
              <span className="text-green-400 font-black truncate">{item?.ticker ?? '--'}</span>
              <span className={`text-right font-bold ${growthColor(item?.cagr1Y)}`}>
                {fmtPct(item?.cagr1Y)}
              </span>
              <span className={`text-right font-bold ${growthColor(item?.cagr3Y)}`}>
                {fmtPct(item?.cagr3Y)}
              </span>
              <span className={`text-right font-bold ${growthColor(item?.cagr5Y)}`}>
                {fmtPct(item?.cagr5Y)}
              </span>
              <span className={`text-right font-bold ${growthColor(item?.cagr10Y)}`}>
                {fmtPct(item?.cagr10Y)}
              </span>
              <span className="text-right text-neutral-400">
                {item?.consecutiveYears ?? '--'}
              </span>
            </div>
          ))}

          {growthHistory.length === 0 && (
            <div className="flex items-center justify-center py-4 text-neutral-600 uppercase tracking-wider">
              NO GROWTH DATA
            </div>
          )}
        </div>

        {/* ── Section 3: Sector Yields Comparison ── */}
        <div>
          <div className="px-3 py-1 border-b border-border/20 bg-black">
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              SECTOR YIELDS COMPARISON
            </span>
          </div>

          {sectorYields.map((sector: any, i: number) => {
            const barWidth = sector?.avgYield != null ? Math.min((sector.avgYield / 8) * 100, 100) : 0;
            return (
              <div
                key={`${sector?.sector}-${i}`}
                className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 hover:bg-green-400/[0.02] transition-colors"
              >
                <span className="text-neutral-400 w-24 shrink-0 truncate uppercase tracking-wider text-[8px]">
                  {sector?.sector ?? '--'}
                </span>
                <div className="flex-1 h-1.5 bg-neutral-900 relative">
                  <div
                    className="h-full bg-green-400/60"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className={`w-12 text-right font-bold shrink-0 ${yieldColor(sector?.avgYield)}`}>
                  {sector?.avgYield != null ? sector.avgYield.toFixed(2) + '%' : '--'}
                </span>
              </div>
            );
          })}

          {sectorYields.length === 0 && (
            <div className="flex items-center justify-center py-4 text-neutral-600 uppercase tracking-wider">
              NO SECTOR DATA
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
