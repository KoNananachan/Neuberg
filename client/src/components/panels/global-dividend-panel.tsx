import { useMemo } from 'react';
import { GlassCard } from '../common/glass-card';
import { useGlobalDividend } from '../../api/hooks/use-global-dividend';
import { useT } from '../../i18n';

// ── Types ──

interface DividendStock {
  ticker: string;
  name: string;
  exchange: string;
  region: string;
  price: number;
  dividendPerShare: number;
  dividendYield: number;
  exDivDate: string | null;
  payDate: string | null;
  frequency: string;
  payoutRatio: number | null;
  dividendGrowth5Y: number | null;
  consecutiveYears: number | null;
  sector: string;
  currency: string;
}

interface UpcomingDividend {
  ticker: string;
  name: string;
  exDivDate: string;
  amount: number;
  yield: number;
}

interface DividendSummary {
  avgYield: number;
  highestYield: number;
  totalDividendsPaid: number;
  avgPayoutRatio: number;
  avgGrowth5Y: number;
  stocksExDivThisWeek: number;
}

interface GlobalDividendData {
  stocks: DividendStock[];
  upcoming: UpcomingDividend[];
  summary: DividendSummary;
}

// ── Helpers ──

function fmtDate(d: string | null): string {
  if (!d) return '--';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function yieldColor(y: number | null): string {
  if (y == null) return 'text-neutral/40';
  if (y >= 5) return 'text-emerald-400 font-bold';
  if (y >= 3) return 'text-emerald-400/80';
  return 'text-neutral/50';
}

function growthColor(g: number | null): string {
  if (g == null) return 'text-neutral/40';
  if (g > 0) return 'text-emerald-400';
  if (g < 0) return 'text-red-400';
  return 'text-neutral/50';
}

// ── Component ──

export function GlobalDividendPanel() {
  const t = useT();
  const { data, isLoading } = useGlobalDividend();

  const typedData = data as GlobalDividendData | undefined;

  const stocks = useMemo(() => {
    const items = typedData?.stocks ?? [];
    return [...items].sort((a, b) => (b.dividendYield ?? 0) - (a.dividendYield ?? 0));
  }, [typedData?.stocks]);

  const upcoming = useMemo(() => {
    return (typedData?.upcoming ?? []).slice(0, 10);
  }, [typedData?.upcoming]);

  const summary = typedData?.summary;

  if (isLoading) {
    return (
      <GlassCard className="flex flex-col h-full bg-black text-[9px] font-mono">
        <div className="flex items-center justify-center h-full">
          <span className="text-emerald-400/60 uppercase tracking-widest font-bold">
            LOADING...
          </span>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="flex flex-col h-full bg-black text-[9px] font-mono">
      {/* ── Header ── */}
      <div className="px-3 py-1.5 border-b border-emerald-400/30 shrink-0">
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
          {t('panelGlobalDividend' as never) || 'GLOBAL DIVIDEND TRACKER'}
        </span>
      </div>

      {/* ── Summary Bar ── */}
      {summary && (
        <div className="grid grid-cols-5 gap-px px-3 py-1.5 border-b border-emerald-400/30 bg-black shrink-0">
          <div className="flex flex-col">
            <span className="text-[7px] text-neutral/40 uppercase tracking-wider">AVG YIELD</span>
            <span className="text-emerald-400 font-bold">{summary.avgYield.toFixed(2)}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[7px] text-neutral/40 uppercase tracking-wider">HIGH YIELD</span>
            <span className="text-emerald-400 font-bold">{summary.highestYield.toFixed(2)}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[7px] text-neutral/40 uppercase tracking-wider">AVG PAYOUT</span>
            <span className="text-neutral/70 font-bold">{summary.avgPayoutRatio.toFixed(1)}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[7px] text-neutral/40 uppercase tracking-wider">AVG 5Y GRWTH</span>
            <span className={`font-bold ${growthColor(summary.avgGrowth5Y)}`}>
              {summary.avgGrowth5Y >= 0 ? '+' : ''}{summary.avgGrowth5Y.toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[7px] text-neutral/40 uppercase tracking-wider">EX-DIV WK</span>
            <span className="text-neutral/70 font-bold">{summary.stocksExDivThisWeek}</span>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto min-h-0">
        {/* ── Upcoming Ex-Dividends ── */}
        {upcoming.length > 0 && (
          <div className="shrink-0">
            <div className="sticky top-0 z-20 px-3 py-1 border-b border-emerald-400/30 bg-black">
              <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">
                UPCOMING EX-DIVIDENDS
              </span>
            </div>
            <div className="grid grid-cols-[60px_1fr_70px_50px_50px] text-[7px] font-bold text-neutral/40 uppercase tracking-wider px-3 py-0.5 border-b border-emerald-400/30 bg-black">
              <span>TICKER</span>
              <span>NAME</span>
              <span className="text-right">EX-DATE</span>
              <span className="text-right">AMOUNT</span>
              <span className="text-right">YIELD</span>
            </div>
            {upcoming.map((item, i) => (
              <div
                key={`${item.ticker}-${i}`}
                className="grid grid-cols-[60px_1fr_70px_50px_50px] px-3 py-1 border-b border-neutral/10 hover:bg-emerald-400/[0.02] transition-colors"
              >
                <span className="text-emerald-400 font-bold truncate">{item.ticker}</span>
                <span className="text-neutral/50 truncate">{item.name}</span>
                <span className="text-right text-neutral/60">{fmtDate(item.exDivDate)}</span>
                <span className="text-right text-neutral/70">${item.amount.toFixed(2)}</span>
                <span className={`text-right ${yieldColor(item.yield)}`}>
                  {item.yield.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Global Dividend Stocks ── */}
        <div>
          <div className="sticky top-0 z-20 px-3 py-1 border-b border-emerald-400/30 bg-black">
            <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">
              GLOBAL DIVIDEND STOCKS
            </span>
          </div>

          {/* Table Header */}
          <div className="sticky top-[22px] z-10 grid grid-cols-[48px_1fr_42px_42px_42px_44px_58px_58px_28px_42px_48px_32px_60px] text-[7px] font-bold text-neutral/40 uppercase tracking-wider px-2 py-0.5 border-b border-emerald-400/30 bg-black">
            <span>TICKER</span>
            <span>NAME</span>
            <span>EXCH</span>
            <span className="text-right">YIELD</span>
            <span className="text-right">DPS</span>
            <span className="text-right">PRICE</span>
            <span className="text-right">EX-DIV</span>
            <span className="text-right">PAY DATE</span>
            <span className="text-center">FREQ</span>
            <span className="text-right">PAYOUT%</span>
            <span className="text-right">5Y GRWTH</span>
            <span className="text-right">YRS</span>
            <span className="text-right">SECTOR</span>
          </div>

          {/* Table Rows */}
          {stocks.map((stock, i) => (
            <div
              key={`${stock.ticker}-${i}`}
              className="grid grid-cols-[48px_1fr_42px_42px_42px_44px_58px_58px_28px_42px_48px_32px_60px] px-2 py-1 border-b border-neutral/10 hover:bg-emerald-400/[0.02] transition-colors items-center"
            >
              <span className="text-emerald-400 font-bold truncate">{stock.ticker}</span>
              <span className="text-neutral/50 truncate">{stock.name}</span>
              <span className="text-neutral/40 truncate">{stock.exchange}</span>
              <span className={`text-right ${yieldColor(stock.dividendYield)}`}>
                {stock.dividendYield.toFixed(2)}%
              </span>
              <span className="text-right text-neutral/60">
                {stock.dividendPerShare.toFixed(2)}
              </span>
              <span className="text-right text-neutral/70">
                {stock.currency !== 'USD' ? stock.currency + ' ' : '$'}{stock.price.toFixed(2)}
              </span>
              <span className="text-right text-neutral/60">{fmtDate(stock.exDivDate)}</span>
              <span className="text-right text-neutral/50">{fmtDate(stock.payDate)}</span>
              <span className="text-center text-neutral/40">{stock.frequency}</span>
              <span className="text-right text-neutral/50">
                {stock.payoutRatio != null ? stock.payoutRatio.toFixed(0) + '%' : '--'}
              </span>
              <span className={`text-right ${growthColor(stock.dividendGrowth5Y)}`}>
                {stock.dividendGrowth5Y != null
                  ? `${stock.dividendGrowth5Y >= 0 ? '+' : ''}${stock.dividendGrowth5Y.toFixed(1)}%`
                  : '--'}
              </span>
              <span className="text-right">
                {stock.consecutiveYears != null ? (
                  stock.consecutiveYears > 25 ? (
                    <span className="text-yellow-400 font-bold" title={`${stock.consecutiveYears} years`}>
                      {stock.consecutiveYears}
                      <span className="ml-0.5 text-[6px] text-yellow-400/80 bg-yellow-400/10 border border-yellow-400/30 px-0.5">
                        A
                      </span>
                    </span>
                  ) : (
                    <span className="text-neutral/50">{stock.consecutiveYears}</span>
                  )
                ) : (
                  '--'
                )}
              </span>
              <span className="text-right text-neutral/40 truncate text-[8px]">{stock.sector}</span>
            </div>
          ))}

          {stocks.length === 0 && (
            <div className="flex items-center justify-center py-8 text-neutral/30 uppercase tracking-widest">
              NO DIVIDEND DATA
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
