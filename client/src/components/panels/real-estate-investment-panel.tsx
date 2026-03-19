import { useRealEstateInvestment } from '../../api/hooks/use-real-estate-investment';
import { Building2, RefreshCw } from 'lucide-react';

// ── Fallback Data ──

const FALLBACK_DATA = {
  overview: {
    transactionVolume: 482.6,
    volumeYoY: -8.4,
    avgCapRate: 5.72,
    capRateChange: 0.34,
    spreadOverTreasury: 1.48,
    vacancyRate: 12.8,
    priceIndex: 214.3,
    priceIndexChange: -2.1,
  },
  reits: [
    { name: 'Prologis', ticker: 'PLD', sector: 'Industrial', marketCap: 112.4, divYield: 2.84, priceChange: 3.21, ffo: 5.48, occupancy: 97.2, leverage: 22.1 },
    { name: 'American Tower', ticker: 'AMT', sector: 'Infrastructure', marketCap: 94.8, divYield: 3.12, priceChange: -1.45, ffo: 10.72, occupancy: 98.5, leverage: 38.4 },
    { name: 'Equinix', ticker: 'EQIX', sector: 'Data Center', marketCap: 82.1, divYield: 1.92, priceChange: 5.67, ffo: 32.18, occupancy: 94.8, leverage: 28.6 },
    { name: 'Simon Property', ticker: 'SPG', sector: 'Retail', marketCap: 52.6, divYield: 5.24, priceChange: -2.38, ffo: 12.34, occupancy: 95.1, leverage: 34.2 },
    { name: 'Realty Income', ticker: 'O', sector: 'Net Lease', marketCap: 46.2, divYield: 5.48, priceChange: 0.82, ffo: 4.18, occupancy: 98.7, leverage: 32.8 },
    { name: 'Public Storage', ticker: 'PSA', sector: 'Self Storage', marketCap: 53.4, divYield: 4.15, priceChange: -0.94, ffo: 16.82, occupancy: 92.4, leverage: 14.8 },
    { name: 'Welltower', ticker: 'WELL', sector: 'Healthcare', marketCap: 48.9, divYield: 2.48, priceChange: 4.12, ffo: 4.06, occupancy: 85.6, leverage: 30.1 },
    { name: 'Digital Realty', ticker: 'DLR', sector: 'Data Center', marketCap: 44.7, divYield: 3.36, priceChange: 6.84, ffo: 6.92, occupancy: 96.2, leverage: 35.7 },
    { name: 'AvalonBay', ticker: 'AVB', sector: 'Residential', marketCap: 31.2, divYield: 3.18, priceChange: 1.56, ffo: 10.84, occupancy: 96.1, leverage: 26.4 },
    { name: 'Ventas', ticker: 'VTR', sector: 'Healthcare', marketCap: 24.8, divYield: 3.64, priceChange: -1.22, ffo: 3.18, occupancy: 83.2, leverage: 40.2 },
  ],
  capRates: [
    { sector: 'Multifamily', us: 5.10, eu: 3.80, apac: 3.40, trend: 'rising' },
    { sector: 'Industrial', us: 5.40, eu: 4.20, apac: 3.90, trend: 'stable' },
    { sector: 'Office (CBD)', us: 6.80, eu: 4.60, apac: 3.60, trend: 'rising' },
    { sector: 'Office (Suburban)', us: 7.50, eu: 5.40, apac: 4.80, trend: 'rising' },
    { sector: 'Retail (Mall)', us: 6.20, eu: 5.10, apac: 4.50, trend: 'stable' },
    { sector: 'Retail (Strip)', us: 6.50, eu: 5.30, apac: 4.70, trend: 'falling' },
    { sector: 'Data Center', us: 5.00, eu: 4.40, apac: 4.10, trend: 'falling' },
    { sector: 'Self Storage', us: 5.30, eu: 4.80, apac: 5.20, trend: 'stable' },
    { sector: 'Healthcare', us: 6.40, eu: 5.00, apac: 4.60, trend: 'rising' },
    { sector: 'Hospitality', us: 7.80, eu: 5.80, apac: 5.10, trend: 'falling' },
  ],
  transactions: [
    { property: 'One Vanderbilt Tower', location: 'New York, NY', buyer: 'Brookfield Asset Mgmt', seller: 'SL Green Realty', price: 3200, priceSqft: 1842, capRate: 4.90, dealType: 'Core' },
    { property: 'Prologis Park Grande', location: 'Los Angeles, CA', buyer: 'GIC', seller: 'Prologis', price: 1850, priceSqft: 312, capRate: 4.20, dealType: 'Core-Plus' },
    { property: 'Hudson Yards Tower C', location: 'New York, NY', buyer: 'Abu Dhabi Investment', seller: 'Related Companies', price: 2400, priceSqft: 1520, capRate: 5.10, dealType: 'Core' },
    { property: 'The Wharf Phase III', location: 'Washington, DC', buyer: 'Mitsui Fudosan', seller: 'Hoffman & Associates', price: 980, priceSqft: 685, capRate: 5.80, dealType: 'Value-Add' },
    { property: 'Aria Resort Portfolio', location: 'Las Vegas, NV', buyer: 'Blackstone RE', seller: 'MGM Growth Prop', price: 4100, priceSqft: 428, capRate: 6.20, dealType: 'Opportunistic' },
    { property: 'Samsung SDS Campus', location: 'Seoul, KR', buyer: 'ADIA', seller: 'Samsung C&T', price: 1620, priceSqft: 892, capRate: 3.80, dealType: 'Core' },
    { property: 'Canary Wharf Block E', location: 'London, UK', buyer: 'Qatar Investment', seller: 'British Land', price: 1340, priceSqft: 1125, capRate: 4.50, dealType: 'Core-Plus' },
    { property: 'Logicor Portfolio DE', location: 'Frankfurt, DE', buyer: 'CPPIB', seller: 'CIC Capital', price: 2100, priceSqft: 245, capRate: 4.10, dealType: 'Core' },
  ],
  regionalVacancy: [
    { market: 'New York', officeVacancy: 18.4, industrialVacancy: 4.2, retailVacancy: 8.6, officeRent: 78.50, rentChange: -3.2 },
    { market: 'San Francisco', officeVacancy: 24.8, industrialVacancy: 5.8, retailVacancy: 9.1, officeRent: 72.40, rentChange: -6.8 },
    { market: 'Los Angeles', officeVacancy: 20.2, industrialVacancy: 3.4, retailVacancy: 7.2, officeRent: 48.60, rentChange: -2.4 },
    { market: 'Chicago', officeVacancy: 21.6, industrialVacancy: 5.2, retailVacancy: 10.4, officeRent: 38.20, rentChange: -4.1 },
    { market: 'Miami', officeVacancy: 14.2, industrialVacancy: 3.8, retailVacancy: 5.4, officeRent: 52.80, rentChange: 2.6 },
    { market: 'Dallas', officeVacancy: 22.4, industrialVacancy: 6.8, retailVacancy: 6.8, officeRent: 32.40, rentChange: -1.8 },
    { market: 'London', officeVacancy: 10.6, industrialVacancy: 3.2, retailVacancy: 11.8, officeRent: 82.30, rentChange: 1.4 },
    { market: 'Tokyo', officeVacancy: 5.8, industrialVacancy: 2.4, retailVacancy: 4.6, officeRent: 94.20, rentChange: 0.8 },
    { market: 'Singapore', officeVacancy: 8.4, industrialVacancy: 6.2, retailVacancy: 7.8, officeRent: 68.40, rentChange: 3.2 },
    { market: 'Sydney', officeVacancy: 12.8, industrialVacancy: 2.8, retailVacancy: 6.4, officeRent: 56.80, rentChange: -0.6 },
  ],
  debtMarket: {
    cmbsSpreads: { aaa: 82, aa: 115, a: 168, bbb: 245, bb: 420 },
    avgLTV: 58.4,
    avgDSCR: 1.72,
    lendingVolume: 128.4,
    lendingVolumeChange: -14.2,
    delinquencyRate: 4.86,
    delinquencyChange: 0.42,
    maturingLoans12m: 186.2,
    maturingLoans24m: 312.8,
  },
};

// ── Formatting Helpers ──

function fmtB(n: number): string {
  if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(1) + 'T';
  return '$' + n.toFixed(1) + 'B';
}

function fmtM(n: number): string {
  if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(1) + 'B';
  return '$' + n.toFixed(0) + 'M';
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtSqft(n: number): string {
  return '$' + n.toLocaleString();
}

// ── Color Helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function sectorBadgeStyle(sector: string): { color: string; bg: string } {
  switch (sector) {
    case 'Industrial': return { color: '#818cf8', bg: 'rgba(129,140,248,0.12)' };
    case 'Infrastructure': return { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' };
    case 'Data Center': return { color: '#34d399', bg: 'rgba(52,211,153,0.12)' };
    case 'Retail': return { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' };
    case 'Net Lease': return { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' };
    case 'Self Storage': return { color: '#f472b6', bg: 'rgba(244,114,182,0.12)' };
    case 'Healthcare': return { color: '#fb923c', bg: 'rgba(251,146,60,0.12)' };
    case 'Residential': return { color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)' };
    default: return { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
  }
}

function dealTypeBadgeStyle(dealType: string): { color: string; bg: string } {
  switch (dealType) {
    case 'Core': return { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' };
    case 'Core-Plus': return { color: '#818cf8', bg: 'rgba(129,140,248,0.12)' };
    case 'Value-Add': return { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' };
    case 'Opportunistic': return { color: '#f87171', bg: 'rgba(248,113,113,0.12)' };
    default: return { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
  }
}

function trendArrow(trend: string): { text: string; color: string } {
  if (trend === 'rising') return { text: '\u2191', color: 'text-red-400' };
  if (trend === 'falling') return { text: '\u2193', color: 'text-green-400' };
  return { text: '\u2192', color: 'text-neutral-500' };
}

function vacancyColor(v: number): string {
  if (v <= 5) return 'text-green-400';
  if (v <= 10) return 'text-yellow-400';
  if (v <= 15) return 'text-orange-400';
  return 'text-red-400';
}

// ── Main Panel ──

export function RealEstateInvestmentPanel() {
  const { data: rawData, isLoading, refetch } = useRealEstateInvestment();
  const data = rawData || FALLBACK_DATA;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-indigo-400">
            Real Estate Investment
          </span>
          <span className="text-[7px] text-neutral-600 uppercase tracking-wider">
            Vol {fmtB(data.overview.transactionVolume)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-bold text-indigo-400/70 uppercase px-1.5 py-0.5 bg-indigo-400/10 border border-indigo-400/30">
            Cap Rate {data.overview.avgCapRate.toFixed(2)}%
          </span>
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-indigo-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !rawData && (
          <div className="text-center py-8 text-indigo-400 text-[9px] font-mono uppercase animate-pulse">
            Loading...
          </div>
        )}

        {!isLoading && !rawData && !data && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && (
          <>
            <OverviewStats overview={data.overview} />
            <ReitPerformanceTable reits={data.reits} />
            <CapRatesBySector capRates={data.capRates} />
            <RecentTransactions transactions={data.transactions} />
            <RegionalVacancyRents regions={data.regionalVacancy} />
            <DebtMarketSection debtMarket={data.debtMarket} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Overview Stats ──

function OverviewStats({ overview }: { overview: any }) {
  return (
    <div className="border-b border-indigo-400/30">
      <div className="grid grid-cols-6 divide-x divide-border/20">
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono text-indigo-400 uppercase tracking-widest font-black">
            Transaction Vol
          </div>
          <div className="text-[13px] font-mono font-black text-white tabular-nums mt-0.5">
            {fmtB(overview.transactionVolume)}
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-widest font-black">
            YoY Change
          </div>
          <div className={`text-[13px] font-mono font-black tabular-nums mt-0.5 ${changeColor(overview.volumeYoY)}`}>
            {fmtPct(overview.volumeYoY)}
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-widest font-black">
            Avg Cap Rate
          </div>
          <div className="text-[13px] font-mono font-black text-white tabular-nums mt-0.5">
            {overview.avgCapRate.toFixed(2)}%
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-widest font-black">
            Spread / Treasury
          </div>
          <div className="text-[13px] font-mono font-black text-white tabular-nums mt-0.5">
            {overview.spreadOverTreasury.toFixed(0)}bp
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-widest font-black">
            Vacancy Rate
          </div>
          <div className={`text-[13px] font-mono font-black tabular-nums mt-0.5 ${vacancyColor(overview.vacancyRate)}`}>
            {overview.vacancyRate.toFixed(1)}%
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-widest font-black">
            Price Index
          </div>
          <div className="text-[13px] font-mono font-black text-white tabular-nums mt-0.5">
            {overview.priceIndex.toFixed(1)}
            <span className={`text-[8px] ml-1 ${changeColor(overview.priceIndexChange)}`}>
              {fmtPct(overview.priceIndexChange)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── REIT Performance Table ──

function ReitPerformanceTable({ reits }: { reits: any[] }) {
  return (
    <div className="border-b border-indigo-400/30">
      <div className="px-3 py-1 border-b border-border/20 flex items-center gap-1.5">
        <div className="w-1 h-1 bg-indigo-400" />
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-indigo-400">
          REIT Performance
        </span>
        <span className="text-[7px] font-mono text-neutral-700 ml-auto">
          {reits.length} REITs
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_70px_65px_55px_60px_55px_60px_50px] px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">Name</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Sector</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Mkt Cap</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Div %</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Price Chg</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">FFO</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Occ %</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Lev %</span>
      </div>

      {/* Table Rows */}
      {reits.map((reit: any) => {
        const badge = sectorBadgeStyle(reit.sector);
        return (
          <div
            key={reit.ticker}
            className="grid grid-cols-[1fr_70px_65px_55px_60px_55px_60px_50px] px-3 py-1 border-b border-border/20 hover:bg-indigo-400/[0.02]"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[9px] font-mono font-bold text-white truncate">{reit.name}</span>
              <span className="text-[7px] font-mono text-neutral-600">{reit.ticker}</span>
            </div>
            <div className="flex justify-end">
              <span
                className="text-[6px] font-mono font-black uppercase px-1 py-0.5"
                style={{ color: badge.color, backgroundColor: badge.bg }}
              >
                {reit.sector}
              </span>
            </div>
            <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">
              ${reit.marketCap.toFixed(1)}B
            </span>
            <span className="text-[9px] font-mono text-indigo-400 text-right tabular-nums font-bold">
              {reit.divYield.toFixed(2)}%
            </span>
            <span className={`text-[9px] font-mono text-right tabular-nums font-bold ${changeColor(reit.priceChange)}`}>
              {fmtPct(reit.priceChange)}
            </span>
            <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">
              ${reit.ffo.toFixed(2)}
            </span>
            <span className={`text-[9px] font-mono text-right tabular-nums ${reit.occupancy >= 95 ? 'text-green-400' : reit.occupancy >= 90 ? 'text-yellow-400' : 'text-orange-400'}`}>
              {reit.occupancy.toFixed(1)}%
            </span>
            <span className={`text-[9px] font-mono text-right tabular-nums ${reit.leverage <= 25 ? 'text-green-400' : reit.leverage <= 35 ? 'text-neutral-300' : 'text-orange-400'}`}>
              {reit.leverage.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Cap Rates by Sector ──

function CapRatesBySector({ capRates }: { capRates: any[] }) {
  return (
    <div className="border-b border-indigo-400/30">
      <div className="px-3 py-1 border-b border-border/20 flex items-center gap-1.5">
        <div className="w-1 h-1 bg-indigo-400" />
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-indigo-400">
          Cap Rates by Sector
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_65px_65px_65px_50px] px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">Sector</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">US</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">EU</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">APAC</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Trend</span>
      </div>

      {/* Table Rows */}
      {capRates.map((row: any) => {
        const trend = trendArrow(row.trend);
        return (
          <div
            key={row.sector}
            className="grid grid-cols-[1fr_65px_65px_65px_50px] px-3 py-1 border-b border-border/20 hover:bg-indigo-400/[0.02]"
          >
            <span className="text-[9px] font-mono font-bold text-neutral-300">{row.sector}</span>
            <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">{row.us.toFixed(2)}%</span>
            <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">{row.eu.toFixed(2)}%</span>
            <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">{row.apac.toFixed(2)}%</span>
            <div className="flex justify-end items-center gap-1">
              <span className={`text-[9px] font-mono font-bold ${trend.color}`}>{trend.text}</span>
              <span
                className={`text-[6px] font-mono font-black uppercase px-1 py-0.5 ${
                  row.trend === 'rising'
                    ? 'text-red-400 bg-red-500/10'
                    : row.trend === 'falling'
                      ? 'text-green-400 bg-green-500/10'
                      : 'text-neutral-500 bg-neutral-500/10'
                }`}
              >
                {row.trend}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Recent Transactions ──

function RecentTransactions({ transactions }: { transactions: any[] }) {
  return (
    <div className="border-b border-indigo-400/30">
      <div className="px-3 py-1 border-b border-border/20 flex items-center gap-1.5">
        <div className="w-1 h-1 bg-indigo-400" />
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-indigo-400">
          Recent Transactions
        </span>
        <span className="text-[7px] font-mono text-neutral-700 ml-auto">
          {transactions.length} deals
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_90px_110px_65px_65px_55px_70px] px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">Property</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">Location</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">Buyer / Seller</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Price</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">$/sqft</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Cap</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Type</span>
      </div>

      {/* Table Rows */}
      {transactions.map((txn: any, idx: number) => {
        const dealBadge = dealTypeBadgeStyle(txn.dealType);
        return (
          <div
            key={idx}
            className="grid grid-cols-[1fr_90px_110px_65px_65px_55px_70px] px-3 py-1 border-b border-border/20 hover:bg-indigo-400/[0.02]"
          >
            <span className="text-[9px] font-mono font-bold text-white truncate">{txn.property}</span>
            <span className="text-[8px] font-mono text-neutral-500 truncate">{txn.location}</span>
            <div className="flex items-center gap-0.5 min-w-0">
              <span className="text-[8px] font-mono text-green-400 truncate">{txn.buyer}</span>
              <span className="text-[7px] font-mono text-neutral-600 shrink-0">{'\u2192'}</span>
              <span className="text-[8px] font-mono text-red-400 truncate">{txn.seller}</span>
            </div>
            <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">
              {fmtM(txn.price)}
            </span>
            <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">
              {fmtSqft(txn.priceSqft)}
            </span>
            <span className="text-[9px] font-mono text-indigo-400 text-right tabular-nums font-bold">
              {txn.capRate.toFixed(1)}%
            </span>
            <div className="flex justify-end">
              <span
                className="text-[6px] font-mono font-black uppercase px-1 py-0.5"
                style={{ color: dealBadge.color, backgroundColor: dealBadge.bg }}
              >
                {txn.dealType}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Regional Vacancy & Rents ──

function RegionalVacancyRents({ regions }: { regions: any[] }) {
  return (
    <div className="border-b border-indigo-400/30">
      <div className="px-3 py-1 border-b border-border/20 flex items-center gap-1.5">
        <div className="w-1 h-1 bg-indigo-400" />
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-indigo-400">
          Regional Vacancy & Rents
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[80px_60px_60px_60px_65px_55px] px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">Market</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Office</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Indust.</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Retail</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Rent $/sf</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Rent Chg</span>
      </div>

      {/* Table Rows */}
      {regions.map((region: any) => (
        <div
          key={region.market}
          className="grid grid-cols-[80px_60px_60px_60px_65px_55px] px-3 py-1 border-b border-border/20 hover:bg-indigo-400/[0.02]"
        >
          <span className="text-[9px] font-mono font-bold text-neutral-300">{region.market}</span>
          <span className={`text-[9px] font-mono text-right tabular-nums ${vacancyColor(region.officeVacancy)}`}>
            {region.officeVacancy.toFixed(1)}%
          </span>
          <span className={`text-[9px] font-mono text-right tabular-nums ${vacancyColor(region.industrialVacancy)}`}>
            {region.industrialVacancy.toFixed(1)}%
          </span>
          <span className={`text-[9px] font-mono text-right tabular-nums ${vacancyColor(region.retailVacancy)}`}>
            {region.retailVacancy.toFixed(1)}%
          </span>
          <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">
            ${region.officeRent.toFixed(2)}
          </span>
          <span className={`text-[9px] font-mono text-right tabular-nums font-bold ${changeColor(region.rentChange)}`}>
            {fmtPct(region.rentChange)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Debt Market Section ──

function DebtMarketSection({ debtMarket }: { debtMarket: any }) {
  return (
    <div className="border-b border-indigo-400/30">
      <div className="px-3 py-1 border-b border-border/20 flex items-center gap-1.5">
        <div className="w-1 h-1 bg-indigo-400" />
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-indigo-400">
          Debt Market
        </span>
      </div>

      {/* CMBS Spreads */}
      <div className="px-3 py-2 border-b border-border/20">
        <div className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
          CMBS Spreads (bps over Treasury)
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'AAA', value: debtMarket.cmbsSpreads.aaa },
            { label: 'AA', value: debtMarket.cmbsSpreads.aa },
            { label: 'A', value: debtMarket.cmbsSpreads.a },
            { label: 'BBB', value: debtMarket.cmbsSpreads.bbb },
            { label: 'BB', value: debtMarket.cmbsSpreads.bb },
          ].map((item: any) => (
            <div key={item.label} className="text-center">
              <div className="text-[7px] font-mono text-neutral-500 font-bold">{item.label}</div>
              <div className={`text-[11px] font-mono font-black tabular-nums mt-0.5 ${
                item.value <= 100 ? 'text-green-400' : item.value <= 200 ? 'text-yellow-400' : item.value <= 300 ? 'text-orange-400' : 'text-red-400'
              }`}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Debt Metrics Grid */}
      <div className="grid grid-cols-3 divide-x divide-border/20">
        <div className="px-3 py-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-neutral-500">Avg LTV</span>
              <span className={`text-[9px] font-mono font-bold tabular-nums ${
                debtMarket.avgLTV <= 55 ? 'text-green-400' : debtMarket.avgLTV <= 65 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {debtMarket.avgLTV.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-neutral-500">Avg DSCR</span>
              <span className={`text-[9px] font-mono font-bold tabular-nums ${
                debtMarket.avgDSCR >= 1.5 ? 'text-green-400' : debtMarket.avgDSCR >= 1.2 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {debtMarket.avgDSCR.toFixed(2)}x
              </span>
            </div>
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-neutral-500">Lending Vol</span>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono font-bold text-neutral-300 tabular-nums">
                  {fmtB(debtMarket.lendingVolume)}
                </span>
                <span className={`text-[7px] font-mono tabular-nums ${changeColor(debtMarket.lendingVolumeChange)}`}>
                  {fmtPct(debtMarket.lendingVolumeChange)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-neutral-500">Delinquency</span>
              <div className="flex items-center gap-1">
                <span className={`text-[9px] font-mono font-bold tabular-nums ${
                  debtMarket.delinquencyRate <= 3 ? 'text-green-400' : debtMarket.delinquencyRate <= 5 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {debtMarket.delinquencyRate.toFixed(2)}%
                </span>
                <span className={`text-[7px] font-mono tabular-nums ${changeColor(debtMarket.delinquencyChange)}`}>
                  +{debtMarket.delinquencyChange.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-neutral-500">Maturing 12M</span>
              <span className="text-[9px] font-mono font-bold text-orange-400 tabular-nums">
                {fmtB(debtMarket.maturingLoans12m)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-neutral-500">Maturing 24M</span>
              <span className="text-[9px] font-mono font-bold text-red-400 tabular-nums">
                {fmtB(debtMarket.maturingLoans24m)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
