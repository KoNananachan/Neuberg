import { useEnergyTransition } from '../../api/hooks/use-energy-transition';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const EMERALD = '#34d399';
const GREEN = '#34d399';
const RED = '#f87171';
const AMBER = '#fbbf24';

// ── Formatting helpers ──

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtChange(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2);
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

function changeClass(n: number): string {
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-amber-400';
}

function impactColor(impact: string): string {
  if (impact === 'positive') return GREEN;
  if (impact === 'negative') return RED;
  return AMBER;
}

function impactClass(impact: string): string {
  if (impact === 'positive') return 'text-emerald-400';
  if (impact === 'negative') return 'text-red-400';
  return 'text-amber-400';
}

function impactBg(impact: string): string {
  if (impact === 'positive') return 'rgba(52,211,153,0.1)';
  if (impact === 'negative') return 'rgba(248,113,113,0.1)';
  return 'rgba(251,191,36,0.08)';
}

function policyTypeBadge(type: string): { color: string; bg: string } {
  switch (type) {
    case 'subsidy': return { color: GREEN, bg: 'rgba(52,211,153,0.1)' };
    case 'tax': return { color: AMBER, bg: 'rgba(251,191,36,0.08)' };
    case 'mandate': return { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' };
    default: return { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.03)' };
  }
}

function sectorBadge(sector: string): { color: string; bg: string } {
  switch (sector) {
    case 'Solar': return { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' };
    case 'Wind': return { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' };
    case 'EV': return { color: GREEN, bg: 'rgba(52,211,153,0.1)' };
    case 'Hydrogen': return { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' };
    case 'Battery': return { color: '#f472b6', bg: 'rgba(244,114,182,0.1)' };
    default: return { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.03)' };
  }
}

function greenCategoryBadge(cat: string): { color: string; bg: string } {
  switch (cat) {
    case 'renewable': return { color: GREEN, bg: 'rgba(52,211,153,0.1)' };
    case 'efficiency': return { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' };
    case 'transport': return { color: AMBER, bg: 'rgba(251,191,36,0.08)' };
    default: return { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.03)' };
  }
}

// ── Fallback mock data matching server route structure ──

const FALLBACK_DATA = {
  cleanEnergyStocks: [
    { ticker: 'ENPH', name: 'Enphase Energy', price: 128.45, change: 2.34, changePercent: 1.86, marketCap: '15.2B', sector: 'Solar' as const },
    { ticker: 'SEDG', name: 'SolarEdge Technologies', price: 68.92, change: -1.15, changePercent: -1.64, marketCap: '4.1B', sector: 'Solar' as const },
    { ticker: 'FSLR', name: 'First Solar', price: 185.30, change: 3.72, changePercent: 2.05, marketCap: '18.5B', sector: 'Solar' as const },
    { ticker: 'NEE', name: 'NextEra Energy', price: 72.18, change: 0.45, changePercent: 0.63, marketCap: '142.8B', sector: 'Wind' as const },
    { ticker: 'PLUG', name: 'Plug Power', price: 4.28, change: -0.18, changePercent: -4.04, marketCap: '2.3B', sector: 'Hydrogen' as const },
    { ticker: 'RIVN', name: 'Rivian Automotive', price: 12.56, change: 0.32, changePercent: 2.61, marketCap: '11.4B', sector: 'EV' as const },
    { ticker: 'TSLA', name: 'Tesla Inc', price: 218.45, change: 5.60, changePercent: 2.63, marketCap: '595.0B', sector: 'EV' as const },
    { ticker: 'BEP', name: 'Brookfield Renewable', price: 27.30, change: -0.22, changePercent: -0.80, marketCap: '17.2B', sector: 'Wind' as const },
    { ticker: 'RUN', name: 'Sunrun Inc', price: 14.85, change: 0.68, changePercent: 4.80, marketCap: '2.8B', sector: 'Solar' as const },
    { ticker: 'CHPT', name: 'ChargePoint Holdings', price: 1.92, change: -0.08, changePercent: -4.00, marketCap: '0.7B', sector: 'Battery' as const },
  ],
  cleanEnergyETFs: [
    { ticker: 'ICLN', name: 'iShares Global Clean Energy', price: 14.52, change: 0.18, aum: '3.0B', ytdReturn: 8.45, flows1m: '+120.5M' },
    { ticker: 'TAN', name: 'Invesco Solar ETF', price: 38.70, change: 0.85, aum: '1.6B', ytdReturn: 12.30, flows1m: '+85.2M' },
    { ticker: 'FAN', name: 'First Trust Global Wind Energy', price: 15.22, change: -0.12, aum: '0.26B', ytdReturn: 5.10, flows1m: '-15.8M' },
    { ticker: 'QCLN', name: 'First Trust NASDAQ Clean Edge', price: 32.45, change: 0.52, aum: '1.0B', ytdReturn: 10.85, flows1m: '+42.0M' },
    { ticker: 'LIT', name: 'Global X Lithium & Battery', price: 42.18, change: -0.35, aum: '2.2B', ytdReturn: -3.20, flows1m: '-68.4M' },
    { ticker: 'DRIV', name: 'Global X Autonomous & EV', price: 25.60, change: 0.40, aum: '0.88B', ytdReturn: 14.50, flows1m: '+35.0M' },
  ],
  capacityAdditions: [
    { type: 'Solar', capacityGW: 398.5, changeYoY: 22.4, investmentBn: 295.0, region: 'Global' },
    { type: 'Onshore Wind', capacityGW: 104.2, changeYoY: 12.8, investmentBn: 112.5, region: 'Global' },
    { type: 'Offshore Wind', capacityGW: 16.8, changeYoY: 18.5, investmentBn: 51.2, region: 'Europe/Asia' },
    { type: 'Battery Storage', capacityGW: 42.0, changeYoY: 28.6, investmentBn: 38.4, region: 'Global' },
    { type: 'Hydrogen', capacityGW: 3.0, changeYoY: 15.2, investmentBn: 16.8, region: 'Europe/Middle East' },
  ],
  evAdoption: [
    { market: 'China', evSalesM: 9.12, marketSharePct: 36.5, yoyGrowthPct: 20.8, topBrand: 'BYD' },
    { market: 'Europe', evSalesM: 3.05, marketSharePct: 22.8, yoyGrowthPct: 11.5, topBrand: 'Tesla' },
    { market: 'US', evSalesM: 1.72, marketSharePct: 9.5, yoyGrowthPct: 16.2, topBrand: 'Tesla' },
    { market: 'Global', evSalesM: 15.80, marketSharePct: 19.2, yoyGrowthPct: 18.0, topBrand: 'BYD' },
  ],
  greenBondMarket: [
    { issuer: 'European Investment Bank', size: 4.8, coupon: 3.15, tenor: '10Y', greenCategory: 'renewable' as const, spread: 42 },
    { issuer: 'Republic of France', size: 8.2, coupon: 2.72, tenor: '20Y', greenCategory: 'efficiency' as const, spread: 35 },
    { issuer: 'Apple Inc', size: 1.9, coupon: 3.48, tenor: '7Y', greenCategory: 'efficiency' as const, spread: 52 },
    { issuer: 'Iberdrola', size: 1.4, coupon: 4.05, tenor: '5Y', greenCategory: 'renewable' as const, spread: 68 },
    { issuer: 'Toyota Motor', size: 2.8, coupon: 2.95, tenor: '10Y', greenCategory: 'transport' as const, spread: 48 },
    { issuer: 'World Bank', size: 3.8, coupon: 2.45, tenor: '15Y', greenCategory: 'renewable' as const, spread: 28 },
  ],
  policyTracker: [
    { country: 'United States', policy: 'Inflation Reduction Act Extension', type: 'subsidy' as const, impact: 'positive' as const, effectiveDate: '2026-01-01' },
    { country: 'European Union', policy: 'Carbon Border Adjustment Mechanism Phase 2', type: 'tax' as const, impact: 'positive' as const, effectiveDate: '2026-01-01' },
    { country: 'China', policy: 'New Energy Vehicle Purchase Tax Exemption', type: 'subsidy' as const, impact: 'positive' as const, effectiveDate: '2025-12-31' },
    { country: 'India', policy: 'Green Hydrogen Mission Mandate', type: 'mandate' as const, impact: 'positive' as const, effectiveDate: '2026-03-01' },
    { country: 'United Kingdom', policy: 'Zero Emission Vehicle Mandate 2035', type: 'mandate' as const, impact: 'positive' as const, effectiveDate: '2025-06-01' },
    { country: 'Germany', policy: 'Renewable Energy Surcharge Reform', type: 'subsidy' as const, impact: 'positive' as const, effectiveDate: '2026-04-01' },
    { country: 'Japan', policy: 'Green Transformation Bonds', type: 'subsidy' as const, impact: 'positive' as const, effectiveDate: '2025-10-01' },
    { country: 'Australia', policy: 'Safeguard Mechanism Carbon Cap', type: 'mandate' as const, impact: 'negative' as const, effectiveDate: '2025-07-01' },
  ],
  generatedAt: new Date().toISOString(),
};

// ── Main Panel ──

export function EnergyTransitionPanel() {
  const t = useT();
  const { data: apiData, isLoading, refetch } = useEnergyTransition();

  const data = apiData || FALLBACK_DATA;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <circle cx="8" cy="8" r="5" fill="none" stroke={EMERALD} strokeWidth="1" />
            <path d="M8 4V8L10.5 10" fill="none" stroke={EMERALD} strokeWidth="1" strokeLinecap="round" />
            <path d="M5 2L8 0.5L11 2" fill="none" stroke={EMERALD} strokeWidth="0.8" opacity="0.5" />
            <path d="M12 5.5L14 8L12 10.5" fill="none" stroke={EMERALD} strokeWidth="0.8" opacity="0.5" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-400">
            {tr(t, 'etTitle', 'Energy Transition Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data.generatedAt && (
            <span className="text-[6px] text-white/20">
              {new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-0.5 text-white/30 hover:text-emerald-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !apiData ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="text-[10px] text-amber-400 uppercase tracking-widest animate-pulse">
                {tr(t, 'loading', 'Loading...')}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Clean Energy Stocks */}
            <CleanEnergyStocksSection stocks={data.cleanEnergyStocks} t={t} />

            {/* Clean Energy ETFs */}
            <CleanEnergyETFsSection etfs={data.cleanEnergyETFs} t={t} />

            {/* Capacity Additions */}
            <CapacityAdditionsSection capacity={data.capacityAdditions} t={t} />

            {/* EV Adoption */}
            <EVAdoptionSection evData={data.evAdoption} t={t} />

            {/* Green Bond Market */}
            <GreenBondSection bonds={data.greenBondMarket} t={t} />

            {/* Policy Tracker */}
            <PolicyTrackerSection policies={data.policyTracker} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Section: Clean Energy Stocks ──

interface StockEntry {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
  sector: string;
}

function CleanEnergyStocksSection({ stocks, t }: { stocks: StockEntry[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-white/25">
          {tr(t, 'etCleanEnergyStocks', 'Clean Energy Stocks')}
        </span>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] text-[6px] font-mono text-white/20 uppercase tracking-wider gap-1">
        <span className="w-10 shrink-0">Ticker</span>
        <span className="w-[72px] shrink-0">Name</span>
        <span className="w-8 shrink-0 text-right">Sect</span>
        <span className="w-14 shrink-0 text-right">Price</span>
        <span className="w-12 shrink-0 text-right">Chg</span>
        <span className="w-12 shrink-0 text-right">Chg%</span>
        <span className="flex-1 text-right">MCap</span>
      </div>

      {stocks.map(stock => {
        const badge = sectorBadge(stock.sector);
        return (
          <div
            key={stock.ticker}
            className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-emerald-400/[0.02] transition-colors gap-1"
          >
            <span className="w-10 text-[8px] font-bold text-white/80 shrink-0">{stock.ticker}</span>
            <span className="w-[72px] text-[7px] text-white/30 truncate shrink-0">{stock.name}</span>
            <span
              className="w-8 text-[5px] font-black uppercase text-right shrink-0 px-0.5"
              style={{ color: badge.color }}
            >
              {stock.sector}
            </span>
            <span className="w-14 text-[8px] text-white/60 text-right shrink-0">${fmtPrice(stock.price)}</span>
            <span
              className="w-12 text-[8px] font-bold text-right shrink-0"
              style={{ color: changeColor(stock.change) }}
            >
              {fmtChange(stock.change)}
            </span>
            <span className={`w-12 text-[8px] font-bold text-right shrink-0 ${changeClass(stock.changePercent)}`}>
              {fmtPct(stock.changePercent)}
            </span>
            <span className="flex-1 text-[7px] text-white/30 text-right">{stock.marketCap}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section: Clean Energy ETFs ──

interface ETFEntry {
  ticker: string;
  name: string;
  price: number;
  change: number;
  aum: string;
  ytdReturn: number;
  flows1m: string;
}

function CleanEnergyETFsSection({ etfs, t }: { etfs: ETFEntry[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-white/25">
          {tr(t, 'etCleanEnergyETFs', 'Clean Energy ETFs')}
        </span>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] text-[6px] font-mono text-white/20 uppercase tracking-wider gap-1">
        <span className="w-10 shrink-0">Ticker</span>
        <span className="w-[80px] shrink-0">Name</span>
        <span className="w-14 shrink-0 text-right">Price</span>
        <span className="w-12 shrink-0 text-right">Chg</span>
        <span className="w-12 shrink-0 text-right">AUM</span>
        <span className="w-14 shrink-0 text-right">YTD</span>
        <span className="flex-1 text-right">1M Flow</span>
      </div>

      {etfs.map(etf => (
        <div
          key={etf.ticker}
          className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-emerald-400/[0.02] transition-colors gap-1"
        >
          <span className="w-10 text-[8px] font-bold text-white/80 shrink-0">{etf.ticker}</span>
          <span className="w-[80px] text-[7px] text-white/30 truncate shrink-0">{etf.name}</span>
          <span className="w-14 text-[8px] text-white/60 text-right shrink-0">${fmtPrice(etf.price)}</span>
          <span
            className="w-12 text-[8px] font-bold text-right shrink-0"
            style={{ color: changeColor(etf.change) }}
          >
            {fmtChange(etf.change)}
          </span>
          <span className="w-12 text-[7px] text-white/30 text-right shrink-0">{etf.aum}</span>
          <span className={`w-14 text-[8px] font-bold text-right shrink-0 ${changeClass(etf.ytdReturn)}`}>
            {fmtPct(etf.ytdReturn)}
          </span>
          <span
            className="flex-1 text-[7px] font-bold text-right"
            style={{ color: etf.flows1m.startsWith('+') ? GREEN : etf.flows1m.startsWith('-') ? RED : AMBER }}
          >
            {etf.flows1m}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section: Capacity Additions ──

interface CapacityEntry {
  type: string;
  capacityGW: number;
  changeYoY: number;
  investmentBn: number;
  region: string;
}

function CapacityAdditionsSection({ capacity, t }: { capacity: CapacityEntry[]; t: ReturnType<typeof useT> }) {
  const maxCapacity = Math.max(...capacity.map(c => c.capacityGW), 1);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-white/25">
          {tr(t, 'etCapacityAdditions', 'Capacity Additions (Annual)')}
        </span>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] text-[6px] font-mono text-white/20 uppercase tracking-wider gap-1">
        <span className="w-20 shrink-0">Type</span>
        <span className="w-14 shrink-0 text-right">GW</span>
        <span className="flex-1 px-1">Bar</span>
        <span className="w-12 shrink-0 text-right">YoY%</span>
        <span className="w-14 shrink-0 text-right">Invest</span>
        <span className="w-[60px] shrink-0 text-right">Region</span>
      </div>

      {capacity.map(c => {
        const barPct = Math.min((c.capacityGW / maxCapacity) * 100, 100);
        return (
          <div
            key={c.type}
            className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-emerald-400/[0.02] transition-colors gap-1"
          >
            <span className="w-20 text-[8px] font-bold text-white/70 shrink-0">{c.type}</span>
            <span className="w-14 text-[8px] text-white/60 text-right shrink-0">{c.capacityGW.toFixed(1)}</span>
            <div className="flex-1 h-1.5 bg-white/[0.03] overflow-hidden mx-1">
              <div
                className="h-full"
                style={{ width: `${barPct}%`, backgroundColor: EMERALD, opacity: 0.5 }}
              />
            </div>
            <span className="w-12 text-[8px] font-bold text-emerald-400 text-right shrink-0">
              +{c.changeYoY.toFixed(1)}%
            </span>
            <span className="w-14 text-[7px] text-white/40 text-right shrink-0">${c.investmentBn.toFixed(0)}B</span>
            <span className="w-[60px] text-[6px] text-white/25 text-right shrink-0 truncate">{c.region}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section: EV Adoption ──

interface EVEntry {
  market: string;
  evSalesM: number;
  marketSharePct: number;
  yoyGrowthPct: number;
  topBrand: string;
}

function EVAdoptionSection({ evData, t }: { evData: EVEntry[]; t: ReturnType<typeof useT> }) {
  const maxShare = Math.max(...evData.map(e => e.marketSharePct), 1);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-white/25">
          {tr(t, 'etEVAdoption', 'EV Adoption')}
        </span>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] text-[6px] font-mono text-white/20 uppercase tracking-wider gap-1">
        <span className="w-14 shrink-0">Market</span>
        <span className="w-14 shrink-0 text-right">Sales(M)</span>
        <span className="w-14 shrink-0 text-right">Share%</span>
        <span className="flex-1 px-1">Penetration</span>
        <span className="w-14 shrink-0 text-right">YoY%</span>
        <span className="w-12 shrink-0 text-right">Top</span>
      </div>

      {evData.map(ev => {
        const sharePct = Math.min((ev.marketSharePct / maxShare) * 100, 100);
        return (
          <div
            key={ev.market}
            className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-emerald-400/[0.02] transition-colors gap-1"
          >
            <span className="w-14 text-[8px] font-bold text-white/70 shrink-0">{ev.market}</span>
            <span className="w-14 text-[8px] text-white/60 text-right shrink-0">{ev.evSalesM.toFixed(2)}</span>
            <span className="w-14 text-[8px] font-bold text-emerald-400 text-right shrink-0">{ev.marketSharePct.toFixed(1)}%</span>
            <div className="flex-1 h-1.5 bg-white/[0.03] overflow-hidden mx-1">
              <div
                className="h-full"
                style={{ width: `${sharePct}%`, backgroundColor: EMERALD, opacity: 0.45 }}
              />
            </div>
            <span className="w-14 text-[8px] font-bold text-emerald-400 text-right shrink-0">
              +{ev.yoyGrowthPct.toFixed(1)}%
            </span>
            <span className="w-12 text-[7px] text-white/40 text-right shrink-0">{ev.topBrand}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section: Green Bond Market ──

interface BondEntry {
  issuer: string;
  size: number;
  coupon: number;
  tenor: string;
  greenCategory: string;
  spread: number;
}

function GreenBondSection({ bonds, t }: { bonds: BondEntry[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-white/25">
          {tr(t, 'etGreenBondMarket', 'Green Bond Market')}
        </span>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] text-[6px] font-mono text-white/20 uppercase tracking-wider gap-1">
        <span className="w-[80px] shrink-0">Issuer</span>
        <span className="w-12 shrink-0 text-right">Size</span>
        <span className="w-12 shrink-0 text-right">Cpn%</span>
        <span className="w-8 shrink-0 text-right">Tnr</span>
        <span className="w-16 shrink-0 text-right">Category</span>
        <span className="flex-1 text-right">Sprd</span>
      </div>

      {bonds.map(bond => {
        const catBadge = greenCategoryBadge(bond.greenCategory);
        return (
          <div
            key={bond.issuer}
            className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-emerald-400/[0.02] transition-colors gap-1"
          >
            <span className="w-[80px] text-[7px] text-white/60 truncate shrink-0">{bond.issuer}</span>
            <span className="w-12 text-[8px] text-white/50 text-right shrink-0">${bond.size.toFixed(1)}B</span>
            <span className="w-12 text-[8px] text-emerald-400 text-right shrink-0">{bond.coupon.toFixed(2)}%</span>
            <span className="w-8 text-[7px] text-white/30 text-right shrink-0">{bond.tenor}</span>
            <span
              className="w-16 text-[5px] font-black uppercase text-right shrink-0 px-0.5 py-0"
              style={{ color: catBadge.color, backgroundColor: catBadge.bg }}
            >
              {bond.greenCategory}
            </span>
            <span className="flex-1 text-[8px] text-amber-400 text-right font-bold">{bond.spread}bp</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section: Policy Tracker ──

interface PolicyEntry {
  country: string;
  policy: string;
  type: string;
  impact: string;
  effectiveDate: string;
}

function PolicyTrackerSection({ policies, t }: { policies: PolicyEntry[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-white/25">
          {tr(t, 'etPolicyTracker', 'Policy Tracker')}
        </span>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] text-[6px] font-mono text-white/20 uppercase tracking-wider gap-1">
        <span className="w-16 shrink-0">Country</span>
        <span className="flex-1">Policy</span>
        <span className="w-14 shrink-0 text-right">Type</span>
        <span className="w-14 shrink-0 text-right">Impact</span>
        <span className="w-16 shrink-0 text-right">Eff. Date</span>
      </div>

      {policies.map((policy, idx) => {
        const typeBadge = policyTypeBadge(policy.type);
        return (
          <div
            key={`${policy.country}-${idx}`}
            className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-emerald-400/[0.02] transition-colors gap-1"
          >
            <span className="w-16 text-[7px] font-bold text-white/60 shrink-0 truncate">{policy.country}</span>
            <span className="flex-1 text-[7px] text-white/40 truncate">{policy.policy}</span>
            <span
              className="w-14 text-[5px] font-black uppercase text-right shrink-0 px-1 py-0"
              style={{ color: typeBadge.color, backgroundColor: typeBadge.bg }}
            >
              {policy.type}
            </span>
            <span
              className="w-14 text-[6px] font-black uppercase text-right shrink-0 px-1 py-0"
              style={{ color: impactColor(policy.impact), backgroundColor: impactBg(policy.impact) }}
            >
              {policy.impact}
            </span>
            <span className="w-16 text-[7px] text-white/25 text-right shrink-0">{policy.effectiveDate}</span>
          </div>
        );
      })}
    </div>
  );
}
