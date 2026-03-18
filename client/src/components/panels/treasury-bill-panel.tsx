import { useMemo } from 'react';
import { useTreasuryBill } from '../../api/hooks/use-treasury-bill';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TreasuryBillData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KeyRate = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TBillRate = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MoneyMarketRate = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuctionResult = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UpcomingAuction = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FundFlow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YieldCurvePoint = any;

// ── Formatting helpers ──

function fmtRate(n: number | undefined | null): string {
  if (n == null) return '--';
  return n.toFixed(3) + '%';
}

function fmtPrice(n: number | undefined | null): string {
  if (n == null) return '--';
  return n.toFixed(4);
}

function fmtBps(n: number | undefined | null): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}bp`;
}

function fmtPct(n: number | undefined | null): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtRatio(n: number | undefined | null): string {
  if (n == null) return '--';
  return n.toFixed(2) + 'x';
}

function fmtBillions(n: number | undefined | null): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  if (Math.abs(n) >= 1000) return `${sign}${(n / 1000).toFixed(1)}T`;
  return `${sign}${n.toFixed(1)}B`;
}

// ── Color helpers ──

function changeColor(n: number | undefined | null): string {
  if (n == null) return 'text-neutral-600';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function flowColor(n: number | undefined | null): string {
  if (n == null) return 'text-neutral-600';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Main Panel ──

export function TreasuryBillPanel() {
  const t = useT();
  const { data, isLoading, error } = useTreasuryBill();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {t('panelTreasuryBill')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          )}
          <RefreshCw className={`w-3 h-3 text-neutral-500 ${isLoading ? 'animate-spin' : ''}`} />
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-cyan-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'error', 'Error loading data')}
          </div>
        )}

        {data && (
          <>
            <KeyRatesSummary rates={data.keyRates} t={t} />
            <TBillRatesTable rates={data.tbillRates} t={t} />
            <MoneyMarketRatesGrid rates={data.moneyMarketRates} t={t} />
            <AuctionResultsTable auctions={data.auctionResults} t={t} />
            <UpcomingAuctionsCalendar auctions={data.upcomingAuctions} t={t} />
            <MoneyMarketFundFlows flows={data.fundFlows} t={t} />
            <ShortTermYieldCurve points={data.yieldCurve} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Section 1: Key Rates Summary Cards ──

function KeyRatesSummary({
  rates,
  t,
}: {
  rates: KeyRate[] | undefined;
  t: ReturnType<typeof useT>;
}) {
  if (!rates?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-cyan-400/60">
          {tr(t, 'tbKeyRates', 'Key Rates')}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-px bg-border/10">
        {rates.map((rate: KeyRate) => (
          <div key={rate?.name} className="px-2 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider truncate">
              {rate?.name}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-[12px] font-mono font-black text-white">
                {fmtRate(rate?.rate)}
              </span>
              {rate?.change != null && (
                <span className={`text-[8px] font-mono font-bold ${changeColor(rate.change)}`}>
                  {fmtBps(rate.change)}
                </span>
              )}
            </div>
            {rate?.effectiveDate && (
              <div className="text-[6px] font-mono text-neutral-700 mt-0.5">
                {rate.effectiveDate}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 2: T-Bill Rates Table ──

function TBillRatesTable({
  rates,
  t,
}: {
  rates: TBillRate[] | undefined;
  t: ReturnType<typeof useT>;
}) {
  if (!rates?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-cyan-400/60">
          {tr(t, 'tbTBillRates', 'T-Bill Rates')}
        </span>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[0.6fr_0.8fr_0.8fr_0.7fr_0.6fr_0.6fr_0.6fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>Term</span>
        <span className="text-right">Disc Rate</span>
        <span className="text-right">Inv Rate</span>
        <span className="text-right">Price</span>
        <span className="text-right">1D</span>
        <span className="text-right">1W</span>
        <span className="text-right">1M</span>
      </div>

      {rates.map((bill: TBillRate, i: number) => (
        <div
          key={bill?.term ?? i}
          className={`grid grid-cols-[0.6fr_0.8fr_0.8fr_0.7fr_0.6fr_0.6fr_0.6fr] px-3 py-1 border-b border-border/10 hover:bg-cyan-400/[0.02] transition-colors ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-cyan-300">
            {bill?.term}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {fmtRate(bill?.discountRate)}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {fmtRate(bill?.investmentRate)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {fmtPrice(bill?.price)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(bill?.change1d)}`}>
            {fmtBps(bill?.change1d)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(bill?.change1w)}`}>
            {fmtBps(bill?.change1w)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(bill?.change1m)}`}>
            {fmtBps(bill?.change1m)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section 3: Money Market Rates Grid ──

function MoneyMarketRatesGrid({
  rates,
  t,
}: {
  rates: MoneyMarketRate[] | undefined;
  t: ReturnType<typeof useT>;
}) {
  if (!rates?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-cyan-400/60">
          {tr(t, 'tbMoneyMarket', 'Money Market Rates')}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-px bg-border/10">
        {rates.map((rate: MoneyMarketRate) => (
          <div key={rate?.name} className="px-2 py-1.5 bg-black hover:bg-cyan-400/[0.02] transition-colors">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider truncate">
              {rate?.name}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-[10px] font-mono font-bold text-white">
                {fmtRate(rate?.current)}
              </span>
              {rate?.change != null && (
                <span className={`text-[8px] font-mono font-bold ${changeColor(rate.change)}`}>
                  {fmtBps(rate.change)}
                </span>
              )}
            </div>
            {rate?.category && (
              <div className="text-[6px] font-mono text-neutral-700 mt-0.5 uppercase">
                {rate.category}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 4: Auction Results Table ──

function AuctionResultsTable({
  auctions,
  t,
}: {
  auctions: AuctionResult[] | undefined;
  t: ReturnType<typeof useT>;
}) {
  if (!auctions?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-cyan-400/60">
          {tr(t, 'tbAuctionResults', 'Recent Auction Results')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[0.8fr_0.5fr_0.7fr_0.6fr_0.6fr_0.6fr_0.6fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>CUSIP</span>
        <span>Term</span>
        <span className="text-right">High Rate</span>
        <span className="text-right">B/C</span>
        <span className="text-right">Direct</span>
        <span className="text-right">Indirect</span>
        <span className="text-right">Dealer</span>
      </div>

      {auctions.map((auction: AuctionResult, i: number) => (
        <div
          key={auction?.cusip ?? i}
          className={`grid grid-cols-[0.8fr_0.5fr_0.7fr_0.6fr_0.6fr_0.6fr_0.6fr] px-3 py-1 border-b border-border/10 hover:bg-cyan-400/[0.02] transition-colors ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[8px] font-mono text-neutral-400">
            {auction?.cusip}
          </span>
          <span className="text-[9px] font-mono font-bold text-cyan-300">
            {auction?.term}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {fmtRate(auction?.highRate)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${
            (auction?.bidToCover ?? 0) >= 3.0 ? 'text-green-400' : (auction?.bidToCover ?? 0) >= 2.5 ? 'text-yellow-400' : 'text-neutral-400'
          }`}>
            {fmtRatio(auction?.bidToCover)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {auction?.directPct != null ? auction.directPct.toFixed(1) + '%' : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {auction?.indirectPct != null ? auction.indirectPct.toFixed(1) + '%' : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {auction?.dealerPct != null ? auction.dealerPct.toFixed(1) + '%' : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section 5: Upcoming Auctions Calendar ──

function UpcomingAuctionsCalendar({
  auctions,
  t,
}: {
  auctions: UpcomingAuction[] | undefined;
  t: ReturnType<typeof useT>;
}) {
  if (!auctions?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-cyan-400/60">
          {tr(t, 'tbUpcomingAuctions', 'Upcoming Auctions')}
        </span>
      </div>

      <div className="grid grid-cols-[0.8fr_0.6fr_0.8fr_0.6fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>Date</span>
        <span>Term</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Status</span>
      </div>

      {auctions.map((auction: UpcomingAuction, i: number) => {
        const isToday = auction?.date === new Date().toISOString().slice(0, 10);
        return (
          <div
            key={`${auction?.date}-${auction?.term}-${i}`}
            className={`grid grid-cols-[0.8fr_0.6fr_0.8fr_0.6fr] px-3 py-1 border-b border-border/10 hover:bg-cyan-400/[0.02] transition-colors ${
              isToday ? 'bg-cyan-400/[0.04]' : i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <div className="flex items-center gap-1">
              {isToday && <div className="w-1 h-1 bg-cyan-400 animate-pulse" />}
              <span className={`text-[9px] font-mono ${isToday ? 'text-cyan-300 font-bold' : 'text-neutral-400'}`}>
                {auction?.date}
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold text-white">
              {auction?.term}
            </span>
            <span className="text-[9px] font-mono text-neutral-400 text-right">
              {auction?.amount ? fmtBillions(auction.amount) : '--'}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right uppercase ${
              auction?.status === 'announced' ? 'text-yellow-400' :
              auction?.status === 'scheduled' ? 'text-neutral-500' :
              auction?.status === 'complete' ? 'text-green-400' :
              'text-neutral-600'
            }`}>
              {auction?.status ?? '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section 6: Money Market Fund Flows ──

function MoneyMarketFundFlows({
  flows,
  t,
}: {
  flows: FundFlow[] | undefined;
  t: ReturnType<typeof useT>;
}) {
  if (!flows?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-cyan-400/60">
          {tr(t, 'tbFundFlows', 'Money Market Fund Flows (Weekly)')}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>Category</span>
        <span className="text-right">AUM ($B)</span>
        <span className="text-right">Flow</span>
        <span className="text-right">% Chg</span>
      </div>

      {flows.map((flow: FundFlow, i: number) => (
        <div
          key={flow?.category ?? i}
          className={`grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/10 hover:bg-cyan-400/[0.02] transition-colors ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono text-white truncate">
            {flow?.category}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {flow?.aum != null ? `$${flow.aum.toFixed(0)}B` : '--'}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${flowColor(flow?.weeklyFlow)}`}>
            {flow?.weeklyFlow != null ? fmtBillions(flow.weeklyFlow) : '--'}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(flow?.weeklyPctChange)}`}>
            {fmtPct(flow?.weeklyPctChange)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section 7: Short-Term Yield Curve (Text-Based) ──

function ShortTermYieldCurve({
  points,
  t,
}: {
  points: YieldCurvePoint[] | undefined;
  t: ReturnType<typeof useT>;
}) {
  if (!points?.length) return null;

  const curveData = useMemo(() => {
    const values = points
      .map((p: YieldCurvePoint) => p?.rate)
      .filter((v: number | undefined | null) => v != null) as number[];
    if (values.length === 0) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 0.01;

    const CHART_W = 40; // character width for the bar

    return points.map((p: YieldCurvePoint) => {
      const rate = p?.rate ?? 0;
      const normalized = (rate - min) / range;
      const barLen = Math.max(1, Math.round(normalized * CHART_W));
      return {
        term: p?.term ?? '',
        rate,
        bar: barLen,
        maxBar: CHART_W,
      };
    });
  }, [points]);

  if (!curveData) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-cyan-400/60">
          {tr(t, 'tbYieldCurve', 'Short-Term Yield Curve (O/N to 12M)')}
        </span>
      </div>

      <div className="px-3 py-2">
        {curveData.map((item) => (
          <div key={item.term} className="flex items-center gap-2 py-px hover:bg-cyan-400/[0.02]">
            <span className="text-[8px] font-mono text-neutral-500 w-6 text-right shrink-0">
              {item.term}
            </span>
            <div className="flex-1 flex items-center gap-1">
              <div className="flex-1 h-[6px] bg-neutral-900 relative">
                <div
                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                  style={{ width: `${(item.bar / item.maxBar) * 100}%` }}
                />
              </div>
              <span className="text-[8px] font-mono font-bold text-cyan-300 w-14 text-right shrink-0">
                {fmtRate(item.rate)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-1 border-t border-border/10">
        <span className="text-[6px] font-mono text-neutral-700 uppercase tracking-wider">
          BTMM &lt;GO&gt; U.S. Treasury Bill &amp; Money Market Monitor
        </span>
      </div>
    </div>
  );
}
