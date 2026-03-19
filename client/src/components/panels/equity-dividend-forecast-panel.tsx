import { useMemo } from 'react';
import { useEquityDividendForecast } from '../../api/hooks/use-equity-dividend-forecast';
import { useT } from '../../i18n';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  Award,
  AlertTriangle,
  Plus,
  Minus,
  BarChart3,
  Crown,
} from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting helpers ──

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '--';
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

function fmtYield(n: number | null | undefined): string {
  if (n == null) return '--';
  return `${n.toFixed(2)}%`;
}

function fmtRatio(n: number | null | undefined): string {
  if (n == null) return '--';
  return `${n.toFixed(1)}%`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '--';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtDateShort(d: string | null | undefined): string {
  if (!d) return '--';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

// ── Color helpers ──

function yieldColor(y: number | null | undefined): string {
  if (y == null) return 'text-neutral-500';
  if (y >= 5) return 'text-emerald-300';
  if (y >= 3) return 'text-emerald-400';
  if (y >= 1.5) return 'text-emerald-400/70';
  return 'text-neutral-400';
}

function growthColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 5) return 'text-emerald-400';
  if (n > 0) return 'text-emerald-400/70';
  if (n === 0) return 'text-neutral-500';
  return 'text-red-400';
}

function ratioColor(r: number | null | undefined): string {
  if (r == null) return 'text-neutral-500';
  if (r > 80) return 'text-red-400';
  if (r > 60) return 'text-yellow-400';
  return 'text-emerald-400/70';
}

function growthBarColor(val: number): string {
  if (val > 5) return '#34d399';
  if (val > 0) return '#34d39980';
  if (val === 0) return '#71717a';
  return '#f87171';
}

function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  const now = new Date();
  const target = new Date(d + 'T00:00:00');
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function daysColor(days: number | null): string {
  if (days == null) return 'text-neutral-500';
  if (days <= 3) return 'text-red-400';
  if (days <= 7) return 'text-yellow-400';
  return 'text-neutral-400';
}

// ── Main Panel ──

export function EquityDividendForecastPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useEquityDividendForecast();

  const topStocks = useMemo(() => data?.topStocks ?? [], [data?.topStocks]);
  const sectorYields = useMemo(() => data?.sectorYields ?? [], [data?.sectorYields]);
  const upcomingExDates = useMemo(() => data?.upcomingExDates ?? [], [data?.upcomingExDates]);
  const indexYields = useMemo(() => data?.indexYields ?? [], [data?.indexYields]);
  const growthTrend = useMemo(() => data?.growthTrend ?? [], [data?.growthTrend]);
  const aristocrats = useMemo(() => data?.aristocrats ?? [], [data?.aristocrats]);
  const alerts = useMemo(() => data?.alerts ?? [], [data?.alerts]);

  const maxSectorYield = useMemo(
    () => Math.max(...sectorYields.map((s: any) => s?.yield ?? 0), 1),
    [sectorYields],
  );

  const maxGrowthVal = useMemo(
    () => Math.max(...growthTrend.map((g: any) => Math.abs(g?.growth ?? 0)), 1),
    [growthTrend],
  );

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-black font-mono text-[9px]">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20">
          <div className="w-1 h-3 bg-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
            EQUITY DIVIDEND FORECAST
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-emerald-400/60 uppercase tracking-widest font-bold">
            LOADING...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black font-mono text-[9px] overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 bg-emerald-400" />
          <BarChart3 className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
            {tr(t, 'panelEquityDividendForecast', 'EQUITY DIVIDEND FORECAST')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-0.5 text-neutral-600 hover:text-emerald-400 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* ── Alert Badges ── */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 py-1.5 border-b border-border/20 shrink-0">
          {alerts.map((alert: any, i: number) => {
            const isCut = alert?.type === 'CUT';
            return (
              <span
                key={`alert-${i}`}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider border ${
                  isCut
                    ? 'text-red-400 bg-red-400/10 border-red-400/30'
                    : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
                }`}
              >
                {isCut ? (
                  <Minus className="w-2 h-2" />
                ) : (
                  <Plus className="w-2 h-2" />
                )}
                <span>{alert?.ticker ?? '--'}</span>
                <span className="text-neutral-500">
                  {isCut ? 'CUT' : 'INITIATION'}
                </span>
                {alert?.change != null && (
                  <span className={isCut ? 'text-red-400' : 'text-emerald-400'}>
                    {fmtPct(alert.change)}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex-1 overflow-auto no-scrollbar">
        {/* ── Section 1: Top Dividend Stocks Table ── */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/20 bg-black">
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              TOP DIVIDEND STOCKS
            </span>
          </div>

          {/* Table header */}
          <div className="sticky top-0 z-10 grid grid-cols-[48px_40px_44px_40px_44px_56px] text-[7px] font-black text-neutral-600 uppercase tracking-wider px-2 py-0.5 border-b border-border/20 bg-black">
            <span>TICKER</span>
            <span className="text-right">YIELD</span>
            <span className="text-right">FWD YLD</span>
            <span className="text-right">PAYOUT</span>
            <span className="text-right">GROWTH</span>
            <span className="text-right">EX-DATE</span>
          </div>

          {/* Table rows */}
          {topStocks.map((stock: any, i: number) => (
            <div
              key={`stock-${stock?.ticker}-${i}`}
              className="grid grid-cols-[48px_40px_44px_40px_44px_56px] px-2 py-1 border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors items-center"
            >
              <span className="text-emerald-400 font-black truncate">
                {stock?.ticker ?? '--'}
              </span>
              <span className={`text-right font-bold ${yieldColor(stock?.yield)}`}>
                {fmtYield(stock?.yield)}
              </span>
              <span className={`text-right font-bold ${yieldColor(stock?.forwardYield)}`}>
                {fmtYield(stock?.forwardYield)}
              </span>
              <span className={`text-right ${ratioColor(stock?.payoutRatio)}`}>
                {fmtRatio(stock?.payoutRatio)}
              </span>
              <span className={`text-right font-bold ${growthColor(stock?.growthRate)}`}>
                {fmtPct(stock?.growthRate, 1)}
              </span>
              <span className="text-right text-neutral-500">
                {fmtDate(stock?.exDate)}
              </span>
            </div>
          ))}

          {topStocks.length === 0 && (
            <div className="flex items-center justify-center py-4 text-neutral-600 uppercase tracking-wider">
              NO STOCK DATA
            </div>
          )}
        </div>

        {/* ── Section 2: Sector Yield Comparison (SVG Bars) ── */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/20 bg-black">
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              SECTOR YIELD COMPARISON
            </span>
          </div>

          {sectorYields.length > 0 ? (
            <div className="px-3 py-2">
              <svg
                width="100%"
                viewBox={`0 0 280 ${sectorYields.length * 18 + 4}`}
                className="w-full"
                preserveAspectRatio="xMidYMid meet"
              >
                {sectorYields.map((sector: any, i: number) => {
                  const barWidth = ((sector?.yield ?? 0) / maxSectorYield) * 160;
                  const y = i * 18 + 2;
                  return (
                    <g key={`sector-${i}`}>
                      <text
                        x="0"
                        y={y + 10}
                        fill="#a3a3a3"
                        fontSize="7"
                        fontFamily="monospace"
                        textAnchor="start"
                      >
                        {(sector?.sector ?? '--').toUpperCase().slice(0, 14)}
                      </text>
                      <rect
                        x="88"
                        y={y + 2}
                        width={barWidth}
                        height="10"
                        fill="#34d399"
                        opacity="0.5"
                      />
                      <text
                        x={92 + barWidth}
                        y={y + 10}
                        fill="#34d399"
                        fontSize="7"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {fmtYield(sector?.yield)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="flex items-center justify-center py-4 text-neutral-600 uppercase tracking-wider">
              NO SECTOR DATA
            </div>
          )}
        </div>

        {/* ── Section 3: Upcoming Ex-Dates Calendar List ── */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/20 bg-black flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-neutral-500" />
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              UPCOMING EX-DATES
            </span>
          </div>

          {upcomingExDates.length > 0 ? (
            upcomingExDates.map((item: any, i: number) => {
              const days = daysUntil(item?.exDate);
              return (
                <div
                  key={`exdate-${i}`}
                  className="flex items-center justify-between px-3 py-1 border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-black w-12 truncate">
                      {item?.ticker ?? '--'}
                    </span>
                    <span className="text-neutral-500 truncate text-[8px] max-w-[80px]">
                      {item?.name ?? ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-neutral-400">{fmtDateShort(item?.exDate)}</span>
                    <span className={`font-bold w-10 text-right ${daysColor(days)}`}>
                      {days != null ? `${days}D` : '--'}
                    </span>
                    <span className={`w-12 text-right font-bold ${yieldColor(item?.yield)}`}>
                      {fmtYield(item?.yield)}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center py-4 text-neutral-600 uppercase tracking-wider">
              NO UPCOMING EX-DATES
            </div>
          )}
        </div>

        {/* ── Section 4: Index Dividend Yield Cards ── */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/20 bg-black">
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              INDEX DIVIDEND YIELDS
            </span>
          </div>

          {indexYields.length > 0 ? (
            <div className="grid grid-cols-3 gap-px p-2">
              {indexYields.map((idx: any, i: number) => (
                <div
                  key={`idx-${i}`}
                  className="flex flex-col items-center p-2 border border-border/20 bg-black"
                >
                  <span className="text-[7px] text-neutral-500 uppercase tracking-wider font-bold truncate w-full text-center">
                    {idx?.index ?? '--'}
                  </span>
                  <span className={`text-[11px] font-black ${yieldColor(idx?.yield)}`}>
                    {fmtYield(idx?.yield)}
                  </span>
                  {idx?.change != null && (
                    <div className="flex items-center gap-0.5">
                      {idx.change >= 0 ? (
                        <TrendingUp className="w-2 h-2 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-2 h-2 text-red-400" />
                      )}
                      <span
                        className={`text-[7px] font-bold ${
                          idx.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {fmtPct(idx.change, 1)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-4 text-neutral-600 uppercase tracking-wider">
              NO INDEX DATA
            </div>
          )}
        </div>

        {/* ── Section 5: Dividend Growth Trend Chart (SVG, 5 Years) ── */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/20 bg-black flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-neutral-500" />
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              DIVIDEND GROWTH TREND (5Y)
            </span>
          </div>

          {growthTrend.length > 0 ? (
            <div className="px-3 py-2">
              <svg
                width="100%"
                viewBox="0 0 280 80"
                className="w-full"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Zero line */}
                <line x1="30" y1="40" x2="270" y2="40" stroke="#525252" strokeWidth="0.5" strokeDasharray="2,2" />

                {growthTrend.map((yr: any, i: number) => {
                  const barCount = growthTrend.length;
                  const barSpacing = 240 / barCount;
                  const barW = Math.min(barSpacing * 0.65, 36);
                  const x = 30 + i * barSpacing + (barSpacing - barW) / 2;
                  const growth = yr?.growth ?? 0;
                  const barHeight = (Math.abs(growth) / maxGrowthVal) * 32;
                  const isPositive = growth >= 0;
                  const barY = isPositive ? 40 - barHeight : 40;

                  return (
                    <g key={`growth-${i}`}>
                      <rect
                        x={x}
                        y={barY}
                        width={barW}
                        height={barHeight}
                        fill={growthBarColor(growth)}
                      />
                      {/* Year label */}
                      <text
                        x={x + barW / 2}
                        y="72"
                        fill="#a3a3a3"
                        fontSize="7"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {yr?.year ?? ''}
                      </text>
                      {/* Value label */}
                      <text
                        x={x + barW / 2}
                        y={isPositive ? barY - 2 : barY + barHeight + 8}
                        fill={growthBarColor(growth)}
                        fontSize="6"
                        fontFamily="monospace"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {fmtPct(growth, 1)}
                      </text>
                    </g>
                  );
                })}

                {/* Y-axis labels */}
                <text x="2" y="12" fill="#525252" fontSize="6" fontFamily="monospace">
                  +{maxGrowthVal.toFixed(0)}%
                </text>
                <text x="2" y="42" fill="#525252" fontSize="6" fontFamily="monospace">
                  0%
                </text>
                <text x="2" y="72" fill="#525252" fontSize="6" fontFamily="monospace">
                  -{maxGrowthVal.toFixed(0)}%
                </text>
              </svg>
            </div>
          ) : (
            <div className="flex items-center justify-center py-4 text-neutral-600 uppercase tracking-wider">
              NO GROWTH TREND DATA
            </div>
          )}
        </div>

        {/* ── Section 6: Dividend Aristocrats Highlight ── */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/20 bg-black flex items-center gap-1.5">
            <Crown className="w-3 h-3 text-yellow-400" />
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              DIVIDEND ARISTOCRATS
            </span>
          </div>

          {aristocrats.length > 0 ? (
            <>
              <div className="grid grid-cols-[48px_40px_44px_36px_28px] text-[7px] font-black text-neutral-600 uppercase tracking-wider px-2 py-0.5 border-b border-border/20 bg-black">
                <span>TICKER</span>
                <span className="text-right">YIELD</span>
                <span className="text-right">GROWTH</span>
                <span className="text-right">YRS</span>
                <span className="text-center">
                  <Award className="w-2.5 h-2.5 inline text-yellow-400/50" />
                </span>
              </div>

              {aristocrats.map((stock: any, i: number) => {
                const yrs = stock?.consecutiveYears ?? 0;
                const isKing = yrs >= 50;
                const isAristocrat = yrs >= 25;
                return (
                  <div
                    key={`aristo-${i}`}
                    className="grid grid-cols-[48px_40px_44px_36px_28px] px-2 py-1 border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors items-center"
                  >
                    <span className="text-emerald-400 font-black truncate">
                      {stock?.ticker ?? '--'}
                    </span>
                    <span className={`text-right font-bold ${yieldColor(stock?.yield)}`}>
                      {fmtYield(stock?.yield)}
                    </span>
                    <span className={`text-right font-bold ${growthColor(stock?.growthRate)}`}>
                      {fmtPct(stock?.growthRate, 1)}
                    </span>
                    <span className="text-right text-neutral-400 font-bold">
                      {stock?.consecutiveYears ?? '--'}
                    </span>
                    <span className="text-center">
                      {isKing ? (
                        <span className="text-[6px] font-black text-yellow-300 bg-yellow-400/15 border border-yellow-400/30 px-1 py-px">
                          KING
                        </span>
                      ) : isAristocrat ? (
                        <span className="text-[6px] font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-1 py-px">
                          A
                        </span>
                      ) : (
                        <span className="text-neutral-600">--</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="flex items-center justify-center py-4 text-neutral-600 uppercase tracking-wider">
              NO ARISTOCRAT DATA
            </div>
          )}
        </div>

        {/* ── Section 7: Cut / Initiation Alerts Detail ── */}
        {alerts.length > 0 && (
          <div>
            <div className="px-3 py-1 border-b border-border/20 bg-black flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
              <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
                DIVIDEND ALERTS
              </span>
            </div>

            {alerts.map((alert: any, i: number) => {
              const isCut = alert?.type === 'CUT';
              return (
                <div
                  key={`alert-detail-${i}`}
                  className={`flex items-center justify-between px-3 py-1.5 border-b border-border/20 ${
                    isCut ? 'hover:bg-red-400/[0.02]' : 'hover:bg-emerald-400/[0.02]'
                  } transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[7px] font-black uppercase px-1 py-px border ${
                        isCut
                          ? 'text-red-400 bg-red-400/10 border-red-400/30'
                          : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
                      }`}
                    >
                      {isCut ? 'CUT' : 'NEW'}
                    </span>
                    <span className="text-emerald-400 font-black">
                      {alert?.ticker ?? '--'}
                    </span>
                    <span className="text-neutral-500 text-[8px] truncate max-w-[80px]">
                      {alert?.name ?? ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert?.previousAmount != null && alert?.newAmount != null && (
                      <span className="text-neutral-500 text-[8px]">
                        ${alert.previousAmount.toFixed(2)}
                        <span className="text-neutral-600 mx-0.5">&rarr;</span>
                        ${alert.newAmount.toFixed(2)}
                      </span>
                    )}
                    {alert?.change != null && (
                      <span
                        className={`font-bold ${isCut ? 'text-red-400' : 'text-emerald-400'}`}
                      >
                        {fmtPct(alert.change)}
                      </span>
                    )}
                    <span className="text-neutral-600 text-[8px]">
                      {fmtDate(alert?.date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
