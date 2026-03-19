import { useState } from 'react';
import { useGlobalFoodPrice } from '../../api/hooks/use-global-food-price';
import { useT } from '../../i18n';
import { RefreshCw, Wheat } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Fallback Data ──

const FALLBACK_DATA = {
  timestamp: new Date().toISOString(),
  faoIndex: {
    overall: 124.3,
    momChange: 1.2,
    yoyChange: -3.8,
    meat: 118.6,
    meatChange: 0.4,
    dairy: 131.2,
    dairyChange: 2.8,
    cereals: 115.8,
    cerealsChange: -0.6,
    oils: 138.4,
    oilsChange: 3.1,
    sugar: 142.7,
    sugarChange: -2.4,
  },
  commodityPrices: [
    { commodity: 'Wheat (CBOT)', price: 642.50, unit: 'USc/bu', dailyChange: 1.24, monthChange: 3.8, yearChange: -8.2, low52w: 548.25, high52w: 748.00 },
    { commodity: 'Corn (CBOT)', price: 458.75, unit: 'USc/bu', dailyChange: -0.68, monthChange: 2.1, yearChange: -12.4, low52w: 388.50, high52w: 532.00 },
    { commodity: 'Soybeans (CBOT)', price: 1142.00, unit: 'USc/bu', dailyChange: 0.32, monthChange: -1.4, yearChange: -6.8, low52w: 985.00, high52w: 1285.50 },
    { commodity: 'Rice (CBOT)', price: 18.24, unit: '$/cwt', dailyChange: -0.42, monthChange: -3.2, yearChange: 14.6, low52w: 14.80, high52w: 21.50 },
    { commodity: 'Sugar #11', price: 22.86, unit: 'USc/lb', dailyChange: 2.18, monthChange: 8.4, yearChange: -5.2, low52w: 17.40, high52w: 27.80 },
    { commodity: 'Coffee (Arabica)', price: 248.35, unit: 'USc/lb', dailyChange: 1.56, monthChange: 12.3, yearChange: 42.8, low52w: 158.20, high52w: 268.40 },
    { commodity: 'Cocoa (ICE)', price: 8420, unit: '$/t', dailyChange: 3.42, monthChange: 18.6, yearChange: 85.2, low52w: 3860, high52w: 9240 },
    { commodity: 'Cotton #2', price: 78.60, unit: 'USc/lb', dailyChange: -0.84, monthChange: -2.6, yearChange: -14.8, low52w: 68.40, high52w: 98.20 },
    { commodity: 'Palm Oil (MYX)', price: 4128, unit: 'MYR/t', dailyChange: 0.92, monthChange: 5.4, yearChange: 8.6, low52w: 3420, high52w: 4580 },
    { commodity: 'Lean Hogs (CME)', price: 88.45, unit: 'USc/lb', dailyChange: -1.12, monthChange: 4.2, yearChange: 6.8, low52w: 72.30, high52w: 106.80 },
    { commodity: 'Live Cattle (CME)', price: 198.20, unit: 'USc/lb', dailyChange: 0.28, monthChange: 2.8, yearChange: 12.4, low52w: 168.40, high52w: 204.60 },
    { commodity: 'Orange Juice (ICE)', price: 485.60, unit: 'USc/lb', dailyChange: -2.34, monthChange: -6.8, yearChange: 32.4, low52w: 312.00, high52w: 528.40 },
  ],
  foodInflation: [
    { country: 'United States', foodInflation: 2.8, coreInflation: 3.2, foodShareCPI: 13.4, trend: 'declining' },
    { country: 'Eurozone', foodInflation: 3.4, coreInflation: 2.8, foodShareCPI: 16.2, trend: 'stable' },
    { country: 'United Kingdom', foodInflation: 4.2, coreInflation: 3.6, foodShareCPI: 11.8, trend: 'declining' },
    { country: 'Japan', foodInflation: 5.8, coreInflation: 2.4, foodShareCPI: 26.4, trend: 'rising' },
    { country: 'China', foodInflation: -1.2, coreInflation: 0.8, foodShareCPI: 28.6, trend: 'declining' },
    { country: 'India', foodInflation: 8.6, coreInflation: 4.2, foodShareCPI: 39.1, trend: 'rising' },
    { country: 'Brazil', foodInflation: 6.4, coreInflation: 4.8, foodShareCPI: 21.8, trend: 'stable' },
    { country: 'Turkey', foodInflation: 42.8, coreInflation: 38.6, foodShareCPI: 24.5, trend: 'rising' },
    { country: 'Nigeria', foodInflation: 34.2, coreInflation: 22.4, foodShareCPI: 51.8, trend: 'rising' },
    { country: 'Egypt', foodInflation: 28.6, coreInflation: 18.2, foodShareCPI: 36.4, trend: 'declining' },
    { country: 'Argentina', foodInflation: 52.4, coreInflation: 48.2, foodShareCPI: 28.2, trend: 'declining' },
    { country: 'Indonesia', foodInflation: 4.8, coreInflation: 2.6, foodShareCPI: 32.4, trend: 'stable' },
  ],
  supplyDemand: [
    { commodity: 'Wheat', production: 798.2, consumption: 800.6, endingStocks: 258.4, stocksToUse: 32.3, yoyChange: -2.4 },
    { commodity: 'Corn', production: 1228.4, consumption: 1212.8, endingStocks: 312.6, stocksToUse: 25.8, yoyChange: 1.8 },
    { commodity: 'Rice', production: 523.8, consumption: 520.4, endingStocks: 172.2, stocksToUse: 33.1, yoyChange: 0.6 },
    { commodity: 'Soybeans', production: 398.6, consumption: 392.4, endingStocks: 112.8, stocksToUse: 28.8, yoyChange: 3.2 },
    { commodity: 'Sugar', production: 186.4, consumption: 180.2, endingStocks: 42.6, stocksToUse: 23.6, yoyChange: -1.4 },
    { commodity: 'Palm Oil', production: 78.2, consumption: 76.8, endingStocks: 10.4, stocksToUse: 13.5, yoyChange: -4.2 },
    { commodity: 'Cotton', production: 25.8, consumption: 26.4, endingStocks: 18.2, stocksToUse: 68.9, yoyChange: 2.8 },
    { commodity: 'Coffee', production: 172.6, consumption: 178.4, endingStocks: 28.2, stocksToUse: 15.8, yoyChange: -6.4 },
  ],
  tradeFlows: [
    {
      commodity: 'Wheat',
      exporters: [
        { country: 'Russia', volume: 48.2, marketShare: 24.1 },
        { country: 'EU', volume: 36.8, marketShare: 18.4 },
        { country: 'Australia', volume: 28.4, marketShare: 14.2 },
        { country: 'Canada', volume: 24.6, marketShare: 12.3 },
        { country: 'United States', volume: 22.8, marketShare: 11.4 },
      ],
      importers: [
        { country: 'Egypt', volume: 13.8, marketShare: 6.9 },
        { country: 'Indonesia', volume: 11.2, marketShare: 5.6 },
        { country: 'Algeria', volume: 8.4, marketShare: 4.2 },
        { country: 'Turkey', volume: 8.2, marketShare: 4.1 },
        { country: 'China', volume: 7.8, marketShare: 3.9 },
      ],
    },
    {
      commodity: 'Corn',
      exporters: [
        { country: 'United States', volume: 56.4, marketShare: 28.2 },
        { country: 'Brazil', volume: 48.6, marketShare: 24.3 },
        { country: 'Argentina', volume: 36.2, marketShare: 18.1 },
        { country: 'Ukraine', volume: 22.4, marketShare: 11.2 },
        { country: 'EU', volume: 6.8, marketShare: 3.4 },
      ],
      importers: [
        { country: 'China', volume: 18.6, marketShare: 9.3 },
        { country: 'Japan', volume: 15.2, marketShare: 7.6 },
        { country: 'Mexico', volume: 14.8, marketShare: 7.4 },
        { country: 'South Korea', volume: 11.4, marketShare: 5.7 },
        { country: 'EU', volume: 18.2, marketShare: 9.1 },
      ],
    },
    {
      commodity: 'Soybeans',
      exporters: [
        { country: 'Brazil', volume: 98.4, marketShare: 52.8 },
        { country: 'United States', volume: 52.6, marketShare: 28.2 },
        { country: 'Argentina', volume: 6.2, marketShare: 3.3 },
        { country: 'Paraguay', volume: 6.8, marketShare: 3.6 },
        { country: 'Canada', volume: 5.4, marketShare: 2.9 },
      ],
      importers: [
        { country: 'China', volume: 102.4, marketShare: 54.9 },
        { country: 'EU', volume: 14.8, marketShare: 7.9 },
        { country: 'Japan', volume: 3.4, marketShare: 1.8 },
        { country: 'Mexico', volume: 6.2, marketShare: 3.3 },
        { country: 'Thailand', volume: 4.8, marketShare: 2.6 },
      ],
    },
    {
      commodity: 'Rice',
      exporters: [
        { country: 'India', volume: 22.4, marketShare: 38.6 },
        { country: 'Thailand', volume: 8.2, marketShare: 14.1 },
        { country: 'Vietnam', volume: 7.8, marketShare: 13.4 },
        { country: 'Pakistan', volume: 4.6, marketShare: 7.9 },
        { country: 'United States', volume: 2.8, marketShare: 4.8 },
      ],
      importers: [
        { country: 'Philippines', volume: 4.2, marketShare: 7.2 },
        { country: 'China', volume: 3.8, marketShare: 6.6 },
        { country: 'Nigeria', volume: 2.6, marketShare: 4.5 },
        { country: 'Saudi Arabia', volume: 1.8, marketShare: 3.1 },
        { country: 'Ivory Coast', volume: 1.6, marketShare: 2.8 },
      ],
    },
  ],
  foodSecurity: [
    { region: 'East Africa (Horn)', alertLevel: 'EMERGENCY', populationAffected: 28.4, drivers: 'Drought, conflict, displacement' },
    { region: 'Sudan', alertLevel: 'FAMINE', populationAffected: 18.2, drivers: 'Civil war, crop failure, aid blockade' },
    { region: 'Gaza Strip', alertLevel: 'FAMINE', populationAffected: 2.1, drivers: 'Conflict, siege, aid restriction' },
    { region: 'Haiti', alertLevel: 'CRISIS', populationAffected: 4.8, drivers: 'Gang violence, economic collapse' },
    { region: 'Yemen', alertLevel: 'EMERGENCY', populationAffected: 16.4, drivers: 'Conflict, import dependency, currency' },
    { region: 'Afghanistan', alertLevel: 'EMERGENCY', populationAffected: 14.2, drivers: 'Economic crisis, drought, displacement' },
    { region: 'South Sudan', alertLevel: 'EMERGENCY', populationAffected: 7.8, drivers: 'Flooding, conflict, displacement' },
    { region: 'Sahel Region', alertLevel: 'CRISIS', populationAffected: 12.6, drivers: 'Conflict, climate shock, displacement' },
    { region: 'Myanmar', alertLevel: 'CRISIS', populationAffected: 6.4, drivers: 'Conflict, economic disruption' },
    { region: 'Pakistan (South)', alertLevel: 'WATCH', populationAffected: 8.2, drivers: 'Post-flood recovery, inflation' },
    { region: 'Central America', alertLevel: 'WATCH', populationAffected: 5.6, drivers: 'El Nino impact, food inflation' },
    { region: 'Madagascar', alertLevel: 'WATCH', populationAffected: 2.4, drivers: 'Drought, cyclone damage, poverty' },
  ],
};

// ── Formatting helpers ──

function fmtPrice(n: number): string {
  if (n >= 10000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(3);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function fmtVol(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return n.toFixed(1);
}

// ── Color helpers ──

function inflationColor(n: number): string {
  if (n >= 30) return 'text-red-500';
  if (n >= 15) return 'text-red-400';
  if (n >= 8) return 'text-orange-400';
  if (n >= 5) return 'text-yellow-400';
  if (n >= 0) return 'text-green-400';
  return 'text-blue-400';
}

function stocksToUseColor(ratio: number): string {
  if (ratio < 15) return 'text-red-400';
  if (ratio < 20) return 'text-orange-400';
  if (ratio > 25) return 'text-green-400';
  return 'text-white';
}

function stocksToUseBg(ratio: number): string {
  if (ratio < 15) return 'bg-red-500';
  if (ratio < 20) return 'bg-orange-500';
  if (ratio > 25) return 'bg-green-500';
  return 'bg-white/50';
}

function alertBadge(level: string): { label: string; cls: string } {
  switch (level) {
    case 'FAMINE':
      return { label: 'FAMINE', cls: 'text-red-200 bg-red-900/80 border border-red-700/60' };
    case 'EMERGENCY':
      return { label: 'EMERGENCY', cls: 'text-red-400 bg-red-500/15 border border-red-500/30' };
    case 'CRISIS':
      return { label: 'CRISIS', cls: 'text-orange-400 bg-orange-500/15 border border-orange-500/30' };
    case 'WATCH':
      return { label: 'WATCH', cls: 'text-yellow-400 bg-yellow-500/15 border border-yellow-500/30' };
    default:
      return { label: level, cls: 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30' };
  }
}

function trendBadge(trend: string): { label: string; cls: string } {
  switch (trend) {
    case 'rising':
      return { label: 'RISING', cls: 'text-red-400 bg-red-500/10' };
    case 'declining':
      return { label: 'DECLINING', cls: 'text-green-400 bg-green-500/10' };
    case 'stable':
      return { label: 'STABLE', cls: 'text-neutral-400 bg-neutral-500/10' };
    default:
      return { label: trend.toUpperCase(), cls: 'text-neutral-400 bg-neutral-500/10' };
  }
}

// ── Section Header ──

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-3 py-1 border-b border-amber-400/30 flex items-center gap-2">
      <div className="w-1 h-1 bg-amber-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-amber-400">
        {label}
      </span>
    </div>
  );
}

// ── 1. FAO Sub-Indices Section ──

function FaoIndicesSection({ fao, t }: { fao: any; t: ReturnType<typeof useT> }) {
  const indices = [
    { label: tr(t, 'gfpOverall', 'Overall'), value: fao.overall, change: fao.momChange },
    { label: tr(t, 'gfpMeat', 'Meat'), value: fao.meat, change: fao.meatChange },
    { label: tr(t, 'gfpDairy', 'Dairy'), value: fao.dairy, change: fao.dairyChange },
    { label: tr(t, 'gfpCereals', 'Cereals'), value: fao.cereals, change: fao.cerealsChange },
    { label: tr(t, 'gfpOils', 'Oils'), value: fao.oils, change: fao.oilsChange },
    { label: tr(t, 'gfpSugar', 'Sugar'), value: fao.sugar, change: fao.sugarChange },
  ];

  return (
    <div className="border-b border-amber-400/30">
      <SectionHeader label={tr(t, 'gfpFaoIndices', 'FAO Price Indices')} />
      <div className="grid grid-cols-6 gap-px bg-border/10">
        {indices.map((idx: any) => (
          <div key={idx.label} className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {idx.label}
            </div>
            <div className="text-[10px] font-mono font-bold text-white tabular-nums">
              {idx.value.toFixed(1)}
            </div>
            <div className={`text-[8px] font-mono font-bold tabular-nums ${idx.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtPct(idx.change)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 2. Commodity Prices Section ──

function CommodityPricesSection({ commodities, t }: { commodities: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-amber-400/30">
      <SectionHeader label={tr(t, 'gfpCommodityPrices', 'Commodity Prices')} />
      <div className="grid grid-cols-[1.4fr_0.7fr_0.5fr_0.5fr_0.5fr_0.5fr_0.8fr] px-3 py-0.5 border-b border-border/20 text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
        <span>{tr(t, 'gfpCommodity', 'Commodity')}</span>
        <span className="text-right">{tr(t, 'gfpPrice', 'Price')}</span>
        <span className="text-right">{tr(t, 'gfp1d', '1D')}</span>
        <span className="text-right">{tr(t, 'gfp1m', '1M')}</span>
        <span className="text-right">{tr(t, 'gfp1y', '1Y')}</span>
        <span className="text-right" />
        <span className="text-right">{tr(t, 'gfp52w', '52W Range')}</span>
      </div>
      {commodities.map((c: any) => {
        const range52w = c.high52w - c.low52w;
        const rangePct = range52w > 0 ? ((c.price - c.low52w) / range52w) * 100 : 50;

        return (
          <div
            key={c.commodity}
            className="grid grid-cols-[1.4fr_0.7fr_0.5fr_0.5fr_0.5fr_0.5fr_0.8fr] px-3 py-1 border-b border-border/20 hover:bg-amber-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">{c.commodity}</span>
            <div className="text-right">
              <span className="text-[8px] font-mono font-bold text-white tabular-nums">{fmtPrice(c.price)}</span>
              <span className="text-[6px] font-mono text-neutral-600 ml-0.5">{c.unit}</span>
            </div>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${c.dailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtPct(c.dailyChange)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${c.monthChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtPct(c.monthChange)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${c.yearChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtPct(c.yearChange)}
            </span>
            <span />
            <div className="flex items-center gap-1">
              <span className="text-[6px] font-mono text-neutral-600 tabular-nums">{fmtPrice(c.low52w)}</span>
              <div className="flex-1 h-1.5 bg-white/[0.04] relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-amber-400/40"
                  style={{ width: `${Math.min(Math.max(rangePct, 2), 100)}%` }}
                />
              </div>
              <span className="text-[6px] font-mono text-neutral-600 tabular-nums">{fmtPrice(c.high52w)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 3. Food Inflation by Country Section ──

function FoodInflationSection({ countries, t }: { countries: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-amber-400/30">
      <SectionHeader label={tr(t, 'gfpInflation', 'Food Inflation by Country')} />
      <div className="grid grid-cols-[1fr_0.6fr_0.6fr_0.6fr_0.5fr] px-3 py-0.5 border-b border-border/20 text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
        <span>{tr(t, 'gfpCountry', 'Country')}</span>
        <span className="text-right">{tr(t, 'gfpFoodCPI', 'Food CPI')}</span>
        <span className="text-right">{tr(t, 'gfpCoreCPI', 'Core CPI')}</span>
        <span className="text-right">{tr(t, 'gfpFoodShare', 'Food Share')}</span>
        <span className="text-center">{tr(t, 'gfpTrend', 'Trend')}</span>
      </div>
      {countries.map((c: any) => {
        const trend = trendBadge(c.trend);
        return (
          <div
            key={c.country}
            className="grid grid-cols-[1fr_0.6fr_0.6fr_0.6fr_0.5fr] px-3 py-1 border-b border-border/20 hover:bg-amber-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white">{c.country}</span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${inflationColor(c.foodInflation)}`}>
              {c.foodInflation >= 0 ? '+' : ''}{c.foodInflation.toFixed(1)}%
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
              {c.coreInflation >= 0 ? '+' : ''}{c.coreInflation.toFixed(1)}%
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
              {c.foodShareCPI.toFixed(1)}%
            </span>
            <div className="flex justify-center">
              <span className={`text-[6px] font-black font-mono uppercase px-1 py-0 ${trend.cls}`}>
                {trend.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 4. Supply & Demand Section ──

function SupplyDemandSection({ items, t }: { items: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-amber-400/30">
      <SectionHeader label={tr(t, 'gfpSupplyDemand', 'Supply & Demand (MMT)')} />
      <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr_0.7fr_0.5fr] px-3 py-0.5 border-b border-border/20 text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
        <span>{tr(t, 'gfpCommodity', 'Commodity')}</span>
        <span className="text-right">{tr(t, 'gfpProduction', 'Production')}</span>
        <span className="text-right">{tr(t, 'gfpConsumption', 'Consumption')}</span>
        <span className="text-right">{tr(t, 'gfpEndStocks', 'End Stocks')}</span>
        <span className="text-right">{tr(t, 'gfpStocksUse', 'Stk/Use')}</span>
        <span className="text-right">{tr(t, 'gfpYoY', 'YoY')}</span>
      </div>
      {items.map((s: any) => (
        <div
          key={s.commodity}
          className="grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr_0.7fr_0.5fr] px-3 py-1 border-b border-border/20 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white">{s.commodity}</span>
          <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
            {fmtVol(s.production)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
            {fmtVol(s.consumption)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
            {fmtVol(s.endingStocks)}
          </span>
          <div className="flex items-center justify-end gap-1">
            <div className="w-8 h-1.5 bg-white/[0.04] overflow-hidden">
              <div
                className={`h-full ${stocksToUseBg(s.stocksToUse)}`}
                style={{ width: `${Math.min(s.stocksToUse * 2, 100)}%`, opacity: 0.6 }}
              />
            </div>
            <span className={`text-[8px] font-mono font-bold tabular-nums ${stocksToUseColor(s.stocksToUse)}`}>
              {s.stocksToUse.toFixed(1)}%
            </span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${s.yoyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmtPct(s.yoyChange)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 5. Trade Flows Section ──

function TradeFlowsSection({ flows, t }: { flows: any[]; t: ReturnType<typeof useT> }) {
  const [activeTab, setActiveTab] = useState(0);
  const activeFlow = flows[activeTab];
  if (!activeFlow) return null;

  const maxExportVol = Math.max(...activeFlow.exporters.map((e: any) => e.volume), 1);
  const maxImportVol = Math.max(...activeFlow.importers.map((i: any) => i.volume), 1);

  return (
    <div className="border-b border-amber-400/30">
      <SectionHeader label={tr(t, 'gfpTradeFlows', 'Global Trade Flows')} />
      {/* Commodity tabs */}
      <div className="flex border-b border-border/20 bg-black/40">
        {flows.map((f: any, idx: any) => (
          <button
            key={f.commodity}
            onClick={() => setActiveTab(idx)}
            className={`flex-1 py-1 text-[7px] font-black font-mono uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === idx
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {f.commodity}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-px bg-border/10">
        {/* Exporters */}
        <div className="bg-black">
          <div className="px-2 py-0.5 text-[6px] font-black font-mono text-neutral-600 uppercase tracking-wider border-b border-border/20">
            {tr(t, 'gfpExporters', 'Top Exporters (MMT)')}
          </div>
          {activeFlow.exporters.map((e: any) => (
            <div
              key={e.country}
              className="flex items-center gap-1 px-2 py-0.5 border-b border-border/20 hover:bg-amber-400/[0.02]"
            >
              <span className="text-[7px] font-mono font-bold text-white w-16 truncate shrink-0">{e.country}</span>
              <div className="flex-1 h-2 bg-white/[0.03] overflow-hidden">
                <div
                  className="h-full bg-amber-400/50"
                  style={{ width: `${(e.volume / maxExportVol) * 100}%` }}
                />
              </div>
              <span className="text-[7px] font-mono text-neutral-300 tabular-nums w-8 text-right shrink-0">
                {e.volume.toFixed(1)}
              </span>
              <span className="text-[6px] font-mono text-neutral-600 tabular-nums w-8 text-right shrink-0">
                {e.marketShare.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>

        {/* Importers */}
        <div className="bg-black">
          <div className="px-2 py-0.5 text-[6px] font-black font-mono text-neutral-600 uppercase tracking-wider border-b border-border/20">
            {tr(t, 'gfpImporters', 'Top Importers (MMT)')}
          </div>
          {activeFlow.importers.map((i: any) => (
            <div
              key={i.country}
              className="flex items-center gap-1 px-2 py-0.5 border-b border-border/20 hover:bg-amber-400/[0.02]"
            >
              <span className="text-[7px] font-mono font-bold text-white w-16 truncate shrink-0">{i.country}</span>
              <div className="flex-1 h-2 bg-white/[0.03] overflow-hidden">
                <div
                  className="h-full bg-blue-400/50"
                  style={{ width: `${(i.volume / maxImportVol) * 100}%` }}
                />
              </div>
              <span className="text-[7px] font-mono text-neutral-300 tabular-nums w-8 text-right shrink-0">
                {i.volume.toFixed(1)}
              </span>
              <span className="text-[6px] font-mono text-neutral-600 tabular-nums w-8 text-right shrink-0">
                {i.marketShare.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 6. Food Security Alerts Section ──

function FoodSecuritySection({ alerts, t }: { alerts: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-amber-400/30">
      <SectionHeader label={tr(t, 'gfpFoodSecurity', 'Food Security Alerts')} />
      <div className="grid grid-cols-[1fr_0.6fr_0.6fr_1.4fr] px-3 py-0.5 border-b border-border/20 text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
        <span>{tr(t, 'gfpRegion', 'Region')}</span>
        <span className="text-center">{tr(t, 'gfpAlert', 'Alert')}</span>
        <span className="text-right">{tr(t, 'gfpPopulation', 'Pop. (M)')}</span>
        <span>{tr(t, 'gfpDrivers', 'Key Drivers')}</span>
      </div>
      {alerts.map((a: any) => {
        const badge = alertBadge(a.alertLevel);
        return (
          <div
            key={a.region}
            className="grid grid-cols-[1fr_0.6fr_0.6fr_1.4fr] px-3 py-1 border-b border-border/20 hover:bg-amber-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">{a.region}</span>
            <div className="flex justify-center">
              <span className={`text-[6px] font-black font-mono uppercase px-1 py-0 ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
            <span className="text-[8px] font-mono font-bold text-white text-right tabular-nums">
              {a.populationAffected.toFixed(1)}
            </span>
            <span className="text-[7px] font-mono text-neutral-500 truncate">{a.drivers}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function GlobalFoodPricePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useGlobalFoodPrice();

  const d = data || FALLBACK_DATA;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-amber-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Wheat className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {tr(t, 'gfpTitle', 'Global Food Price')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-mono text-neutral-500">FAO</span>
          <span className="text-[9px] font-mono font-bold text-white tabular-nums">
            {d.faoIndex.overall.toFixed(1)}
          </span>
          <span className={`text-[7px] font-mono font-bold tabular-nums ${d.faoIndex.momChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            MoM {fmtPct(d.faoIndex.momChange)}
          </span>
          <span className={`text-[7px] font-mono font-bold tabular-nums ${d.faoIndex.yoyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            YoY {fmtPct(d.faoIndex.yoyChange)}
          </span>
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral-500 hover:text-amber-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : (
          <>
            <FaoIndicesSection fao={d.faoIndex} t={t} />
            <CommodityPricesSection commodities={d.commodityPrices} t={t} />
            <FoodInflationSection countries={d.foodInflation} t={t} />
            <SupplyDemandSection items={d.supplyDemand} t={t} />
            <TradeFlowsSection flows={d.tradeFlows} t={t} />
            <FoodSecuritySection alerts={d.foodSecurity} t={t} />
          </>
        )}
      </div>
    </div>
  );
}
