import { useRealEstateAnalytics } from '../../api/hooks/use-real-estate-analytics';
import { useT } from '../../i18n';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting helpers ──

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtYield(n: number): string {
  return n.toFixed(2) + '%';
}

function fmtPrice(n: number): string {
  return '$' + n.toFixed(2);
}

function fmtDollar(n: number): string {
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n.toFixed(0);
}

function fmtBps(n: number): string {
  return n.toFixed(0) + ' bps';
}

function fmtNumber(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

// ── Color helpers ──

function returnColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function yieldColor(n: number): string {
  if (n >= 6) return 'text-green-400';
  if (n >= 4) return 'text-orange-400';
  return 'text-white';
}

function navColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function flowColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Main Panel ──

export function RealEstateAnalyticsPanel() {
  const t = useT();
  const { data, isLoading, error } = useRealEstateAnalytics();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-orange-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-orange-400">
            {tr(t, 'panelRealEstateAnalytics', 'Real Estate Analytics')}
          </span>
        </div>
        {d?.timestamp && (
          <span className="text-[7px] font-mono text-neutral-600">
            {new Date(d.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-orange-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !d && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            FAILED TO LOAD
          </div>
        )}

        {d && (
          <>
            <ReitPerformanceTable data={d} t={t} />
            <SectorMetricsTable data={d} t={t} />
            <MarketIndicators data={d} t={t} />
            <TopMarketsTable data={d} t={t} />
            <ReitFlowsTable data={d} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Section 1: REIT Performance ──

function ReitPerformanceTable({
  data,
  t,
}: {
  data: any;
  t: ReturnType<typeof useT>;
}) {
  const reits = data?.reits ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'reReitPerformance', 'REIT Performance')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.6fr_0.6fr_0.6fr_0.7fr_0.6fr] px-3 py-0.5 border-b border-border/10 bg-white/[0.01]">
        {['Ticker', 'Sector', 'Price', 'Div Yld', 'FFO', 'P/FFO', 'NAV Prem', 'YTD'].map(
          (label) => (
            <span
              key={label}
              className={`text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider ${
                label !== 'Ticker' && label !== 'Sector' ? 'text-right' : ''
              }`}
            >
              {label}
            </span>
          ),
        )}
      </div>

      {/* Rows */}
      {reits.map((reit: any, i: number) => (
        <div
          key={reit?.ticker ?? i}
          className="grid grid-cols-[1fr_0.7fr_0.7fr_0.6fr_0.6fr_0.6fr_0.7fr_0.6fr] px-3 py-0.5 border-b border-border/[0.05] hover:bg-orange-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono font-bold text-orange-400">
            {reit?.ticker ?? '—'}
          </span>
          <span className="text-[7px] font-mono text-neutral-500 truncate">
            {reit?.sector ?? '—'}
          </span>
          <span className="text-[8px] font-mono text-white text-right">
            {reit?.price != null ? fmtPrice(reit.price) : '—'}
          </span>
          <span className={`text-[8px] font-mono text-right ${yieldColor(reit?.dividendYield ?? 0)}`}>
            {reit?.dividendYield != null ? fmtYield(reit.dividendYield) : '—'}
          </span>
          <span className="text-[8px] font-mono text-white text-right">
            {reit?.ffo != null ? fmtPrice(reit.ffo) : '—'}
          </span>
          <span className="text-[8px] font-mono text-white text-right">
            {reit?.pFfo != null ? reit.pFfo.toFixed(1) + 'x' : '—'}
          </span>
          <span className={`text-[8px] font-mono text-right ${navColor(reit?.navPremium ?? 0)}`}>
            {reit?.navPremium != null ? fmtPct(reit.navPremium) : '—'}
          </span>
          <span className={`text-[8px] font-mono text-right ${returnColor(reit?.ytdReturn ?? 0)}`}>
            {reit?.ytdReturn != null ? fmtPct(reit.ytdReturn) : '—'}
          </span>
        </div>
      ))}

      {reits.length === 0 && (
        <div className="px-3 py-3 text-center text-[8px] font-mono text-neutral-600">
          NO REIT DATA
        </div>
      )}
    </div>
  );
}

// ── Section 2: Sector Metrics ──

function SectorMetricsTable({
  data,
  t,
}: {
  data: any;
  t: ReturnType<typeof useT>;
}) {
  const sectors = data?.sectorMetrics ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'reSectorMetrics', 'Sector Metrics by Property Type')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1.2fr_0.6fr_0.6fr_0.7fr_0.6fr_0.6fr_0.7fr] px-3 py-0.5 border-b border-border/10 bg-white/[0.01]">
        {['Property Type', 'Cap Rate', 'Occupancy', 'Rent Growth', 'New Supply', 'Absorption', '$/SF'].map(
          (label) => (
            <span
              key={label}
              className={`text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider ${
                label !== 'Property Type' ? 'text-right' : ''
              }`}
            >
              {label}
            </span>
          ),
        )}
      </div>

      {/* Rows */}
      {sectors.map((s: any, i: number) => (
        <div
          key={s?.propertyType ?? i}
          className="grid grid-cols-[1.2fr_0.6fr_0.6fr_0.7fr_0.6fr_0.6fr_0.7fr] px-3 py-0.5 border-b border-border/[0.05] hover:bg-orange-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono font-bold text-white">
            {s?.propertyType ?? '—'}
          </span>
          <span className="text-[8px] font-mono text-orange-400 text-right">
            {s?.capRate != null ? fmtYield(s.capRate) : '—'}
          </span>
          <span className="text-[8px] font-mono text-white text-right">
            {s?.occupancy != null ? fmtYield(s.occupancy) : '—'}
          </span>
          <span className={`text-[8px] font-mono text-right ${returnColor(s?.rentGrowth ?? 0)}`}>
            {s?.rentGrowth != null ? fmtPct(s.rentGrowth) : '—'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {s?.newSupply != null ? fmtNumber(s.newSupply) : '—'}
          </span>
          <span className={`text-[8px] font-mono text-right ${returnColor(s?.absorption ?? 0)}`}>
            {s?.absorption != null ? fmtNumber(s.absorption) : '—'}
          </span>
          <span className="text-[8px] font-mono text-white text-right">
            {s?.pricePerSF != null ? fmtDollar(s.pricePerSF) : '—'}
          </span>
        </div>
      ))}

      {sectors.length === 0 && (
        <div className="px-3 py-3 text-center text-[8px] font-mono text-neutral-600">
          NO SECTOR DATA
        </div>
      )}
    </div>
  );
}

// ── Section 3: Market Indicators ──

function MarketIndicators({
  data,
  t,
}: {
  data: any;
  t: ReturnType<typeof useT>;
}) {
  const indicators = data?.marketIndicators;
  if (!indicators) return null;

  const items = [
    {
      label: 'Case-Shiller Index',
      value: indicators?.caseShiller?.value,
      change: indicators?.caseShiller?.change,
      format: (v: number) => v.toFixed(1),
    },
    {
      label: '30Y Mortgage Rate',
      value: indicators?.mortgageRate30y?.value,
      change: indicators?.mortgageRate30y?.change,
      format: (v: number) => fmtYield(v),
    },
    {
      label: 'Housing Starts',
      value: indicators?.housingStarts?.value,
      change: indicators?.housingStarts?.change,
      format: (v: number) => fmtNumber(v) + ' K',
    },
    {
      label: 'CMBS Spreads',
      value: indicators?.cmbsSpreads?.value,
      change: indicators?.cmbsSpreads?.change,
      format: (v: number) => fmtBps(v),
    },
    {
      label: 'Delinquency Rate',
      value: indicators?.delinquencyRate?.value,
      change: indicators?.delinquencyRate?.change,
      format: (v: number) => fmtYield(v),
    },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'reMarketIndicators', 'Market Indicators')}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-px bg-border/10">
        {items.map((item) => (
          <div key={item.label} className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-0.5">
              {item.label}
            </div>
            <div className="text-[10px] font-mono font-bold text-white">
              {item.value != null ? item.format(item.value) : '—'}
            </div>
            {item.change != null && (
              <div className={`text-[8px] font-mono ${returnColor(item.change)}`}>
                {fmtPct(item.change)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 4: Top Markets ──

function TopMarketsTable({
  data,
  t,
}: {
  data: any;
  t: ReturnType<typeof useT>;
}) {
  const markets = data?.topMarkets ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'reTopMarkets', 'Top US Markets')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1.2fr_0.6fr_0.7fr_0.7fr_0.6fr_0.7fr] px-3 py-0.5 border-b border-border/10 bg-white/[0.01]">
        {['Metro', 'Vacancy', 'Avg Rent', 'Rent Growth', 'Cap Rate', 'Txn Vol'].map(
          (label) => (
            <span
              key={label}
              className={`text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider ${
                label !== 'Metro' ? 'text-right' : ''
              }`}
            >
              {label}
            </span>
          ),
        )}
      </div>

      {/* Rows */}
      {markets.map((m: any, i: number) => (
        <div
          key={m?.metro ?? i}
          className="grid grid-cols-[1.2fr_0.6fr_0.7fr_0.7fr_0.6fr_0.7fr] px-3 py-0.5 border-b border-border/[0.05] hover:bg-orange-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono font-bold text-orange-400">
            {m?.metro ?? '—'}
          </span>
          <span className="text-[8px] font-mono text-white text-right">
            {m?.vacancy != null ? fmtYield(m.vacancy) : '—'}
          </span>
          <span className="text-[8px] font-mono text-white text-right">
            {m?.avgRent != null ? fmtDollar(m.avgRent) : '—'}
          </span>
          <span className={`text-[8px] font-mono text-right ${returnColor(m?.rentGrowth ?? 0)}`}>
            {m?.rentGrowth != null ? fmtPct(m.rentGrowth) : '—'}
          </span>
          <span className="text-[8px] font-mono text-orange-400 text-right">
            {m?.capRate != null ? fmtYield(m.capRate) : '—'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {m?.transactionVolume != null ? fmtDollar(m.transactionVolume) : '—'}
          </span>
        </div>
      ))}

      {markets.length === 0 && (
        <div className="px-3 py-3 text-center text-[8px] font-mono text-neutral-600">
          NO MARKET DATA
        </div>
      )}
    </div>
  );
}

// ── Section 5: REIT Flows ──

function ReitFlowsTable({
  data,
  t,
}: {
  data: any;
  t: ReturnType<typeof useT>;
}) {
  const flows = data?.reitFlows ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'reReitFlows', 'REIT Fund / ETF Flows')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1.2fr_1fr_0.7fr_0.7fr_0.7fr] px-3 py-0.5 border-b border-border/10 bg-white/[0.01]">
        {['Fund / ETF', 'Category', 'AUM', 'Weekly Flow', 'Monthly Flow'].map(
          (label) => (
            <span
              key={label}
              className={`text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider ${
                label !== 'Fund / ETF' && label !== 'Category' ? 'text-right' : ''
              }`}
            >
              {label}
            </span>
          ),
        )}
      </div>

      {/* Rows */}
      {flows.map((f: any, i: number) => (
        <div
          key={f?.name ?? i}
          className="grid grid-cols-[1.2fr_1fr_0.7fr_0.7fr_0.7fr] px-3 py-0.5 border-b border-border/[0.05] hover:bg-orange-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono font-bold text-orange-400 truncate">
            {f?.name ?? '—'}
          </span>
          <span className="text-[7px] font-mono text-neutral-500 truncate">
            {f?.category ?? '—'}
          </span>
          <span className="text-[8px] font-mono text-white text-right">
            {f?.aum != null ? fmtDollar(f.aum) : '—'}
          </span>
          <span className={`text-[8px] font-mono text-right ${flowColor(f?.weeklyFlow ?? 0)}`}>
            {f?.weeklyFlow != null
              ? (f.weeklyFlow >= 0 ? '+' : '') + fmtDollar(f.weeklyFlow)
              : '—'}
          </span>
          <span className={`text-[8px] font-mono text-right ${flowColor(f?.monthlyFlow ?? 0)}`}>
            {f?.monthlyFlow != null
              ? (f.monthlyFlow >= 0 ? '+' : '') + fmtDollar(f.monthlyFlow)
              : '—'}
          </span>
        </div>
      ))}

      {flows.length === 0 && (
        <div className="px-3 py-3 text-center text-[8px] font-mono text-neutral-600">
          NO FLOW DATA
        </div>
      )}
    </div>
  );
}
