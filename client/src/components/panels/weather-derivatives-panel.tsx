import { useWeatherDerivatives } from '../../api/hooks/use-weather-derivatives';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Fallback Mock Data ──

const FALLBACK_DATA = {
  marketSummary: {
    totalNotional: 2.84,
    totalNotionalUnit: 'B USD',
    activeContracts: 36200,
    avgVolatility: 14.3,
    dominantSeason: 'Heating' as const,
    mostActiveCity: 'Chicago',
    yoyGrowth: 15.2,
    yoyGrowthUnit: '%',
  },
  hddCddContracts: [
    { city: 'New York', type: 'HDD', month: 'Jan 2026', strike: 930, last: 958, change: 12.4, changePercent: 1.31, volume: 1340, openInterest: 4820, impliedTemp: 34.1 },
    { city: 'Chicago', type: 'HDD', month: 'Jan 2026', strike: 1170, last: 1195, change: -8.2, changePercent: -0.68, volume: 1580, openInterest: 5210, impliedTemp: 26.4 },
    { city: 'London', type: 'HDD', month: 'Jan 2026', strike: 750, last: 738, change: 5.6, changePercent: 0.76, volume: 980, openInterest: 3640, impliedTemp: 41.2 },
    { city: 'Tokyo', type: 'HDD', month: 'Jan 2026', strike: 720, last: 705, change: -3.1, changePercent: -0.44, volume: 860, openInterest: 3180, impliedTemp: 42.3 },
    { city: 'Frankfurt', type: 'HDD', month: 'Jan 2026', strike: 930, last: 945, change: 7.8, changePercent: 0.83, volume: 1120, openInterest: 4050, impliedTemp: 34.5 },
    { city: 'Sydney', type: 'CDD', month: 'Jan 2026', strike: 210, last: 225, change: 4.2, changePercent: 1.90, volume: 640, openInterest: 2180, impliedTemp: 72.3 },
    { city: 'Toronto', type: 'HDD', month: 'Jan 2026', strike: 1260, last: 1285, change: -11.5, changePercent: -0.89, volume: 1420, openInterest: 4980, impliedTemp: 23.5 },
    { city: 'Houston', type: 'HDD', month: 'Jan 2026', strike: 390, last: 402, change: 6.1, changePercent: 1.54, volume: 750, openInterest: 2840, impliedTemp: 52.0 },
  ],
  seasonalPatterns: [
    { month: 'Jan', avgHDD: 1050, avgCDD: 0, maxDeviation: 185, currentDeviation: 42.3, percentile: 62 },
    { month: 'Feb', avgHDD: 920, avgCDD: 0, maxDeviation: 170, currentDeviation: -28.5, percentile: 38 },
    { month: 'Mar', avgHDD: 680, avgCDD: 0, maxDeviation: 140, currentDeviation: 15.8, percentile: 55 },
    { month: 'Apr', avgHDD: 350, avgCDD: 20, maxDeviation: 95, currentDeviation: -12.4, percentile: 44 },
    { month: 'May', avgHDD: 100, avgCDD: 120, maxDeviation: 60, currentDeviation: 8.6, percentile: 58 },
    { month: 'Jun', avgHDD: 0, avgCDD: 310, maxDeviation: 85, currentDeviation: 22.1, percentile: 67 },
    { month: 'Jul', avgHDD: 0, avgCDD: 450, maxDeviation: 110, currentDeviation: -18.3, percentile: 41 },
    { month: 'Aug', avgHDD: 0, avgCDD: 420, maxDeviation: 105, currentDeviation: 31.7, percentile: 72 },
    { month: 'Sep', avgHDD: 40, avgCDD: 240, maxDeviation: 75, currentDeviation: -5.9, percentile: 48 },
    { month: 'Oct', avgHDD: 280, avgCDD: 60, maxDeviation: 80, currentDeviation: 14.2, percentile: 61 },
    { month: 'Nov', avgHDD: 620, avgCDD: 0, maxDeviation: 120, currentDeviation: -35.6, percentile: 32 },
    { month: 'Dec', avgHDD: 950, avgCDD: 0, maxDeviation: 175, currentDeviation: 27.4, percentile: 59 },
  ],
  cityPricing: [
    { city: 'New York', currentTemp: 35.2, normalTemp: 33.0, deviation: 2.2, hddPremium: 0.145, cddPremium: 0.112, volatility: 18.2, correlation: 0.68 },
    { city: 'Chicago', currentTemp: 22.8, normalTemp: 26.0, deviation: -3.2, hddPremium: 0.178, cddPremium: 0.098, volatility: 20.5, correlation: 0.74 },
    { city: 'London', currentTemp: 42.1, normalTemp: 40.0, deviation: 2.1, hddPremium: 0.132, cddPremium: 0.105, volatility: 15.8, correlation: 0.62 },
    { city: 'Tokyo', currentTemp: 39.5, normalTemp: 41.0, deviation: -1.5, hddPremium: 0.125, cddPremium: 0.118, volatility: 14.2, correlation: 0.48 },
    { city: 'Frankfurt', currentTemp: 31.8, normalTemp: 34.0, deviation: -2.2, hddPremium: 0.152, cddPremium: 0.108, volatility: 17.1, correlation: 0.65 },
    { city: 'Sydney', currentTemp: 74.6, normalTemp: 72.0, deviation: 2.6, hddPremium: 0.098, cddPremium: 0.135, volatility: 12.4, correlation: 0.31 },
    { city: 'Toronto', currentTemp: 19.4, normalTemp: 23.0, deviation: -3.6, hddPremium: 0.185, cddPremium: 0.092, volatility: 21.8, correlation: 0.76 },
    { city: 'Houston', currentTemp: 55.3, normalTemp: 52.0, deviation: 3.3, hddPremium: 0.115, cddPremium: 0.142, volatility: 13.6, correlation: 0.42 },
  ],
  hedgingStrategies: [
    { strategy: 'HDD Collar', notional: 5200000, premium: 128000, maxPayout: 18200000, breakeven: 125, daysToExpiry: 62, status: 'Active' },
    { strategy: 'CDD Swap', notional: 7800000, premium: 142000, maxPayout: 21800000, breakeven: 155, daysToExpiry: 98, status: 'Active' },
    { strategy: 'Seasonal Strip', notional: 11500000, premium: 368000, maxPayout: 46000000, breakeven: 180, daysToExpiry: 145, status: 'Quoted' },
    { strategy: 'Basis Swap', notional: 3800000, premium: 57000, maxPayout: 8360000, breakeven: 108, daysToExpiry: 0, status: 'Expired' },
    { strategy: 'Temperature Put', notional: 6400000, premium: 179000, maxPayout: 19200000, breakeven: 142, daysToExpiry: 34, status: 'Active' },
    { strategy: 'Dual-Trigger', notional: 10800000, premium: 454000, maxPayout: 59400000, breakeven: 210, daysToExpiry: 78, status: 'Quoted' },
  ],
  generatedAt: new Date().toISOString(),
};

// ── Formatting helpers ──

function fmtNum(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtTemp(n: number): string {
  return `${n.toFixed(1)}\u00b0F`;
}

function fmtDollars(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function deviationColor(n: number): string {
  // positive deviation = warming, negative = cooling
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function percentileColor(n: number): string {
  if (n >= 75) return 'text-red-400';
  if (n >= 60) return 'text-amber-400';
  if (n <= 25) return 'text-green-400';
  return 'text-neutral-400';
}

function statusColor(status: string): string {
  if (status === 'Active') return 'text-green-400 bg-green-500/10 border border-green-500/30';
  if (status === 'Quoted') return 'text-amber-400 bg-amber-500/10 border border-amber-500/30';
  return 'text-neutral-500 bg-neutral-500/10 border border-neutral-500/30';
}

function correlationColor(n: number): string {
  if (n >= 0.7) return 'text-teal-400';
  if (n >= 0.5) return 'text-teal-400/70';
  return 'text-neutral-500';
}

// ── Main Panel ──

export function WeatherDerivativesPanel() {
  const t = useT();
  const { data: rawData, isLoading, refetch } = useWeatherDerivatives();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (rawData as any) || FALLBACK_DATA;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-teal-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-teal-400">
            {tr(t, 'wdWeatherDerivatives', 'Weather Derivatives')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider text-teal-400 bg-teal-500/10 border border-teal-500/30">
              {data.marketSummary?.dominantSeason || 'Heating'} Season
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-teal-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !rawData && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'wdNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <MarketSummarySection data={data.marketSummary} t={t} />
            <TemperatureContractsSection contracts={data.hddCddContracts} t={t} />
            <PrecipitationContractsSection pricing={data.cityPricing} t={t} />
            <WeatherIndexSection patterns={data.seasonalPatterns} t={t} />
            <CatastropheBondsSection strategies={data.hedgingStrategies} t={t} />
            <SeasonalOutlookSection patterns={data.seasonalPatterns} pricing={data.cityPricing} t={t} />

            {/* Timestamp */}
            <div className="px-3 py-1.5 border-t border-border/10">
              <span className="text-[7px] font-mono text-neutral-700">
                {tr(t, 'wdLastUpdate', 'Last update')}: {new Date(data.generatedAt).toLocaleTimeString()}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Market Summary ──

function MarketSummarySection({
  data,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  t: ReturnType<typeof useT>;
}) {
  if (!data) return null;

  const metrics = [
    { label: tr(t, 'wdTotalNotional', 'Total Notional'), value: `${data.totalNotional}${data.totalNotionalUnit}`, color: 'text-white' },
    { label: tr(t, 'wdActiveContracts', 'Active Contracts'), value: fmtNum(data.activeContracts), color: 'text-teal-400' },
    { label: tr(t, 'wdAvgVol', 'Avg Volatility'), value: `${data.avgVolatility}%`, color: 'text-amber-400' },
    { label: tr(t, 'wdMostActive', 'Most Active'), value: data.mostActiveCity, color: 'text-white' },
    { label: tr(t, 'wdYoYGrowth', 'YoY Growth'), value: `+${data.yoyGrowth}${data.yoyGrowthUnit}`, color: 'text-green-400' },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="grid grid-cols-5 gap-px bg-border/10">
        {metrics.map((m) => (
          <div key={m.label} className="px-2 py-1.5 bg-black hover:bg-teal-400/[0.02]">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {m.label}
            </div>
            <div className={`text-[10px] font-mono font-bold ${m.color}`}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 1: Temperature Contracts (HDD/CDD) ──

function TemperatureContractsSection({
  contracts,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contracts: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!contracts?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'wdTempContracts', 'Temperature Contracts')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_40px_56px_56px_56px_52px_56px_56px_56px] px-2 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">City</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Type</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Strike</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Last</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Chg</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Chg%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Vol</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">OI</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Impl.T</span>
      </div>

      {/* Rows */}
      {contracts.map((c: {
        city: string; type: string; strike: number; last: number;
        change: number; changePercent: number; volume: number;
        openInterest: number; impliedTemp: number;
      }) => (
        <div
          key={c.city}
          className="grid grid-cols-[1fr_40px_56px_56px_56px_52px_56px_56px_56px] px-2 py-1 border-b border-border/5 hover:bg-teal-400/[0.02]"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">{c.city}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${c.type === 'HDD' ? 'text-blue-400' : 'text-orange-400'}`}>
            {c.type}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{c.strike}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">{c.last}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(c.change)}`}>
            {fmtChange(c.change)}
          </span>
          <span className={`text-[8px] font-mono text-right ${changeColor(c.changePercent)}`}>
            {fmtPct(c.changePercent)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtNum(c.volume)}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtNum(c.openInterest)}</span>
          <span className="text-[8px] font-mono text-teal-400/80 text-right">{fmtTemp(c.impliedTemp)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Section 2: Precipitation Contracts (City Pricing) ──

function PrecipitationContractsSection({
  pricing,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pricing: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!pricing?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'wdPrecipContracts', 'Precipitation Contracts')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_56px_56px_52px_52px_52px_48px_52px] px-2 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">City</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Cur.T</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Nrm.T</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Dev</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">HDD.P</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CDD.P</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Vol</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Corr</span>
      </div>

      {/* Rows */}
      {pricing.map((p: {
        city: string; currentTemp: number; normalTemp: number;
        deviation: number; hddPremium: number; cddPremium: number;
        volatility: number; correlation: number;
      }) => (
        <div
          key={p.city}
          className="grid grid-cols-[1fr_56px_56px_52px_52px_52px_48px_52px] px-2 py-1 border-b border-border/5 hover:bg-teal-400/[0.02]"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">{p.city}</span>
          <span className="text-[8px] font-mono text-white text-right">{fmtTemp(p.currentTemp)}</span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">{fmtTemp(p.normalTemp)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${deviationColor(p.deviation)}`}>
            {p.deviation >= 0 ? '+' : ''}{p.deviation.toFixed(1)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{p.hddPremium.toFixed(3)}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{p.cddPremium.toFixed(3)}</span>
          <span className="text-[8px] font-mono text-amber-400/80 text-right">{p.volatility.toFixed(1)}%</span>
          <span className={`text-[8px] font-mono text-right ${correlationColor(p.correlation)}`}>
            {p.correlation.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section 3: Weather Index (Seasonal Patterns) ──

function WeatherIndexSection({
  patterns,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patterns: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!patterns?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'wdWeatherIndex', 'Weather Index')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[44px_56px_56px_56px_64px_48px] px-2 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Month</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Avg HDD</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Avg CDD</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Max Dev</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Cur Dev</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Pctl</span>
      </div>

      {/* Rows */}
      {patterns.map((p: {
        month: string; avgHDD: number; avgCDD: number;
        maxDeviation: number; currentDeviation: number; percentile: number;
      }) => (
        <div
          key={p.month}
          className="grid grid-cols-[44px_56px_56px_56px_64px_48px] px-2 py-1 border-b border-border/5 hover:bg-teal-400/[0.02]"
        >
          <span className="text-[8px] font-mono font-bold text-teal-400/80">{p.month}</span>
          <span className="text-[8px] font-mono text-blue-400/70 text-right">{p.avgHDD || '-'}</span>
          <span className="text-[8px] font-mono text-orange-400/70 text-right">{p.avgCDD || '-'}</span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">{p.maxDeviation}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${deviationColor(p.currentDeviation)}`}>
            {p.currentDeviation >= 0 ? '+' : ''}{p.currentDeviation.toFixed(1)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${percentileColor(p.percentile)}`}>
            {p.percentile}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section 4: Catastrophe Bonds (Hedging Strategies) ──

function CatastropheBondsSection({
  strategies,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  strategies: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!strategies?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'wdCatBonds', 'Catastrophe Bonds')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_64px_56px_64px_52px_48px_52px] px-2 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Strategy</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Notional</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Premium</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Max Pay</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">B/E DD</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">DTE</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Status</span>
      </div>

      {/* Rows */}
      {strategies.map((s: {
        strategy: string; notional: number; premium: number;
        maxPayout: number; breakeven: number; daysToExpiry: number; status: string;
      }) => (
        <div
          key={s.strategy}
          className="grid grid-cols-[1fr_64px_56px_64px_52px_48px_52px] px-2 py-1 border-b border-border/5 hover:bg-teal-400/[0.02]"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">{s.strategy}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtDollars(s.notional)}</span>
          <span className="text-[8px] font-mono text-amber-400/80 text-right">{fmtDollars(s.premium)}</span>
          <span className="text-[8px] font-mono text-teal-400/80 text-right">{fmtDollars(s.maxPayout)}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{s.breakeven}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${s.daysToExpiry <= 30 ? 'text-red-400' : s.daysToExpiry <= 60 ? 'text-amber-400' : 'text-neutral-400'}`}>
            {s.daysToExpiry}
          </span>
          <span className={`text-[7px] font-mono font-bold px-1 py-0.5 text-right ${statusColor(s.status)}`}>
            {s.status.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section 5: Seasonal Outlook ──

function SeasonalOutlookSection({
  patterns,
  pricing,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patterns: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pricing: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!patterns?.length || !pricing?.length) return null;

  // Compute outlook metrics from the data
  const avgDeviation = patterns.reduce(
    (sum: number, p: { currentDeviation: number }) => sum + p.currentDeviation, 0,
  ) / patterns.length;
  const warmingCities = pricing.filter((p: { deviation: number }) => p.deviation > 0).length;
  const coolingCities = pricing.filter((p: { deviation: number }) => p.deviation < 0).length;
  const maxDevCity = pricing.reduce(
    (max: { city: string; deviation: number }, p: { city: string; deviation: number }) =>
      Math.abs(p.deviation) > Math.abs(max.deviation) ? p : max,
    pricing[0],
  );
  const avgCorrelation = pricing.reduce(
    (sum: number, p: { correlation: number }) => sum + p.correlation, 0,
  ) / pricing.length;

  // Determine overall outlook
  const outlook = avgDeviation > 1 ? 'WARMING' : avgDeviation < -1 ? 'COOLING' : 'NEUTRAL';
  const outlookColor = outlook === 'WARMING' ? 'text-red-400' : outlook === 'COOLING' ? 'text-green-400' : 'text-amber-400';
  const outlookBg = outlook === 'WARMING'
    ? 'bg-red-500/10 border border-red-500/30'
    : outlook === 'COOLING'
      ? 'bg-green-500/10 border border-green-500/30'
      : 'bg-amber-500/10 border border-amber-500/30';

  const outlookMetrics = [
    { label: tr(t, 'wdOverallTrend', 'Overall Trend'), value: outlook, color: outlookColor },
    { label: tr(t, 'wdAvgDeviation', 'Avg Deviation'), value: `${avgDeviation >= 0 ? '+' : ''}${avgDeviation.toFixed(1)} DD`, color: deviationColor(avgDeviation) },
    { label: tr(t, 'wdWarmingCities', 'Warming'), value: `${warmingCities} cities`, color: 'text-red-400' },
    { label: tr(t, 'wdCoolingCities', 'Cooling'), value: `${coolingCities} cities`, color: 'text-green-400' },
    { label: tr(t, 'wdMaxDeviation', 'Max Dev'), value: `${maxDevCity.city} ${maxDevCity.deviation >= 0 ? '+' : ''}${maxDevCity.deviation.toFixed(1)}\u00b0F`, color: deviationColor(maxDevCity.deviation) },
    { label: tr(t, 'wdNatGasCorr', 'Nat Gas Corr'), value: avgCorrelation.toFixed(2), color: correlationColor(avgCorrelation) },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center justify-between">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'wdSeasonalOutlook', 'Seasonal Outlook')}
        </span>
        <span className={`text-[7px] font-black font-mono uppercase px-1.5 py-0.5 ${outlookColor} ${outlookBg}`}>
          {outlook}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-px bg-border/10">
        {outlookMetrics.map((m) => (
          <div key={m.label} className="px-2 py-1.5 bg-black hover:bg-teal-400/[0.02]">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {m.label}
            </div>
            <div className={`text-[9px] font-mono font-bold ${m.color}`}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
