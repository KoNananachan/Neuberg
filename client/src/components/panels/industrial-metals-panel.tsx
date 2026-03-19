import { useState, useMemo } from 'react';
import { useIndustrialMetals } from '../../api/hooks/use-industrial-metals';
import { RefreshCw } from 'lucide-react';

// ── Types ──

type TabKey = 'overview' | 'inventory' | 'forwards' | 'premiums' | 'spreads';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'forwards', label: 'Forwards' },
  { key: 'premiums', label: 'Premiums' },
  { key: 'spreads', label: 'Spreads' },
];

interface MetalOverview {
  symbol: string;
  name: string;
  spot: number;
  price3M: number;
  change: number;
  changePct: number;
  low52W: number;
  high52W: number;
  volume: number;
  openInterest: number;
}

interface WarehouseStock {
  metal: string;
  exchange: string;
  stock: number;
  unit: string;
  cancelledWarrants: number;
  cancelledPct: number;
  change1D: number;
  change1W: number;
  direction: 'up' | 'down' | 'flat';
}

interface ForwardPoint {
  tenor: string;
  price: number;
  spread: number;
}

interface RegionalPremium {
  metal: string;
  region: string;
  premium: number;
  change: number;
  unit: string;
}

interface ScrapSpread {
  metal: string;
  spread: number;
  change: number;
  unit: string;
}

interface SpreadData {
  metal: string;
  cash3M: number;
  cash3MPct: number;
  structure: 'contango' | 'backwardation' | 'flat';
  tom3M: number;
  annualizedBasis: number;
}

interface TcRcCharge {
  metal: string;
  tc: number;
  rc: number;
  unit: string;
  change: number;
}

interface IndustrialMetalsData {
  overview: MetalOverview[];
  inventory: WarehouseStock[];
  forwards: Record<string, ForwardPoint[]>;
  premiums: RegionalPremium[];
  scrapSpreads: ScrapSpread[];
  spreads: SpreadData[];
  tcRc: TcRcCharge[];
  timestamp: string;
}

// ── Fallback Data ──

const FALLBACK_DATA: IndustrialMetalsData = {
  overview: [
    { symbol: 'HG', name: 'Copper', spot: 9285.50, price3M: 9342.00, change: 78.50, changePct: 0.85, low52W: 7856.00, high52W: 9620.00, volume: 18420, openInterest: 312500 },
    { symbol: 'LA', name: 'Aluminium', spot: 2468.00, price3M: 2502.50, change: -12.00, changePct: -0.48, low52W: 2085.00, high52W: 2680.00, volume: 24850, openInterest: 845200 },
    { symbol: 'LZ', name: 'Zinc', spot: 2842.00, price3M: 2878.50, change: 34.00, changePct: 1.21, low52W: 2280.00, high52W: 3120.00, volume: 9620, openInterest: 218400 },
    { symbol: 'LN', name: 'Nickel', spot: 16380.00, price3M: 16520.00, change: -185.00, changePct: -1.12, low52W: 14250.00, high52W: 18960.00, volume: 6840, openInterest: 142800 },
    { symbol: 'LP', name: 'Lead', spot: 2125.00, price3M: 2148.00, change: 8.50, changePct: 0.40, low52W: 1928.00, high52W: 2340.00, volume: 4280, openInterest: 128600 },
    { symbol: 'LT', name: 'Tin', spot: 28450.00, price3M: 28680.00, change: 420.00, changePct: 1.50, low52W: 22800.00, high52W: 32150.00, volume: 2150, openInterest: 38200 },
  ],
  inventory: [
    { metal: 'Copper', exchange: 'LME', stock: 152400, unit: 'mt', cancelledWarrants: 28950, cancelledPct: 19.0, change1D: -2875, change1W: -8420, direction: 'down' },
    { metal: 'Copper', exchange: 'SHFE', stock: 68250, unit: 'mt', cancelledWarrants: 0, cancelledPct: 0, change1D: 1240, change1W: 3680, direction: 'up' },
    { metal: 'Aluminium', exchange: 'LME', stock: 438200, unit: 'mt', cancelledWarrants: 62400, cancelledPct: 14.2, change1D: -5120, change1W: -18950, direction: 'down' },
    { metal: 'Aluminium', exchange: 'SHFE', stock: 248600, unit: 'mt', cancelledWarrants: 0, cancelledPct: 0, change1D: -3240, change1W: -12800, direction: 'down' },
    { metal: 'Zinc', exchange: 'LME', stock: 82450, unit: 'mt', cancelledWarrants: 18200, cancelledPct: 22.1, change1D: -1580, change1W: -6240, direction: 'down' },
    { metal: 'Zinc', exchange: 'SHFE', stock: 45800, unit: 'mt', cancelledWarrants: 0, cancelledPct: 0, change1D: 820, change1W: 2150, direction: 'up' },
    { metal: 'Nickel', exchange: 'LME', stock: 38600, unit: 'mt', cancelledWarrants: 9800, cancelledPct: 25.4, change1D: -420, change1W: -2850, direction: 'down' },
    { metal: 'Lead', exchange: 'LME', stock: 198400, unit: 'mt', cancelledWarrants: 14200, cancelledPct: 7.2, change1D: 3400, change1W: 8200, direction: 'up' },
    { metal: 'Tin', exchange: 'LME', stock: 4250, unit: 'mt', cancelledWarrants: 1850, cancelledPct: 43.5, change1D: -125, change1W: -680, direction: 'down' },
  ],
  forwards: {
    Copper: [
      { tenor: 'Spot', price: 9285.50, spread: 0 },
      { tenor: 'Cash', price: 9280.00, spread: -5.50 },
      { tenor: '3M', price: 9342.00, spread: 56.50 },
      { tenor: '6M', price: 9405.00, spread: 119.50 },
      { tenor: '12M', price: 9498.00, spread: 212.50 },
      { tenor: '15M', price: 9535.00, spread: 249.50 },
      { tenor: '2Y', price: 9580.00, spread: 294.50 },
    ],
    Aluminium: [
      { tenor: 'Spot', price: 2468.00, spread: 0 },
      { tenor: 'Cash', price: 2465.00, spread: -3.00 },
      { tenor: '3M', price: 2502.50, spread: 34.50 },
      { tenor: '6M', price: 2538.00, spread: 70.00 },
      { tenor: '12M', price: 2595.00, spread: 127.00 },
      { tenor: '15M', price: 2618.00, spread: 150.00 },
      { tenor: '2Y', price: 2645.00, spread: 177.00 },
    ],
    Zinc: [
      { tenor: 'Spot', price: 2842.00, spread: 0 },
      { tenor: 'Cash', price: 2848.00, spread: 6.00 },
      { tenor: '3M', price: 2878.50, spread: 36.50 },
      { tenor: '6M', price: 2905.00, spread: 63.00 },
      { tenor: '12M', price: 2948.00, spread: 106.00 },
      { tenor: '15M', price: 2965.00, spread: 123.00 },
      { tenor: '2Y', price: 2985.00, spread: 143.00 },
    ],
    Nickel: [
      { tenor: 'Spot', price: 16380.00, spread: 0 },
      { tenor: 'Cash', price: 16350.00, spread: -30.00 },
      { tenor: '3M', price: 16520.00, spread: 140.00 },
      { tenor: '6M', price: 16680.00, spread: 300.00 },
      { tenor: '12M', price: 16920.00, spread: 540.00 },
      { tenor: '15M', price: 17020.00, spread: 640.00 },
      { tenor: '2Y', price: 17150.00, spread: 770.00 },
    ],
    Lead: [
      { tenor: 'Spot', price: 2125.00, spread: 0 },
      { tenor: 'Cash', price: 2128.00, spread: 3.00 },
      { tenor: '3M', price: 2148.00, spread: 23.00 },
      { tenor: '6M', price: 2165.00, spread: 40.00 },
      { tenor: '12M', price: 2192.00, spread: 67.00 },
      { tenor: '15M', price: 2205.00, spread: 80.00 },
      { tenor: '2Y', price: 2220.00, spread: 95.00 },
    ],
    Tin: [
      { tenor: 'Spot', price: 28450.00, spread: 0 },
      { tenor: 'Cash', price: 28520.00, spread: 70.00 },
      { tenor: '3M', price: 28680.00, spread: 230.00 },
      { tenor: '6M', price: 28850.00, spread: 400.00 },
      { tenor: '12M', price: 29100.00, spread: 650.00 },
      { tenor: '15M', price: 29220.00, spread: 770.00 },
      { tenor: '2Y', price: 29380.00, spread: 930.00 },
    ],
  },
  premiums: [
    { metal: 'Copper', region: 'US Midwest', premium: 148.50, change: 3.20, unit: '$/mt' },
    { metal: 'Copper', region: 'EU Rotterdam', premium: 72.00, change: -1.50, unit: '$/mt' },
    { metal: 'Copper', region: 'Japan CIF', premium: 88.00, change: 2.00, unit: '$/mt' },
    { metal: 'Copper', region: 'China Yangshan', premium: -28.50, change: -4.20, unit: '$/mt' },
    { metal: 'Aluminium', region: 'US Midwest', premium: 425.00, change: 12.00, unit: '$/mt' },
    { metal: 'Aluminium', region: 'EU Duty Paid', premium: 285.00, change: -5.00, unit: '$/mt' },
    { metal: 'Aluminium', region: 'Japan CIF', premium: 148.00, change: 3.50, unit: '$/mt' },
    { metal: 'Aluminium', region: 'China SHFE', premium: 62.00, change: 1.80, unit: '$/mt' },
    { metal: 'Zinc', region: 'US Special High Grade', premium: 185.00, change: 8.00, unit: '$/mt' },
    { metal: 'Zinc', region: 'EU SHG', premium: 165.00, change: -2.50, unit: '$/mt' },
    { metal: 'Nickel', region: 'US Full Plate', premium: 920.00, change: 15.00, unit: '$/mt' },
    { metal: 'Nickel', region: 'EU Briquette', premium: 680.00, change: -10.00, unit: '$/mt' },
  ],
  scrapSpreads: [
    { metal: 'Copper (#2 Scrap)', spread: -485.00, change: 12.00, unit: '$/mt vs LME' },
    { metal: 'Aluminium (6063 Extr)', spread: -320.00, change: -8.00, unit: '$/mt vs LME' },
    { metal: 'Zinc (Old Die-Cast)', spread: -580.00, change: 5.00, unit: '$/mt vs LME' },
    { metal: 'Nickel (SS 304 Scrap)', spread: -2450.00, change: -35.00, unit: '$/mt vs LME' },
    { metal: 'Lead (Battery Scrap)', spread: -195.00, change: 3.00, unit: '$/mt vs LME' },
  ],
  spreads: [
    { metal: 'Copper', cash3M: -62.00, cash3MPct: -0.67, structure: 'contango', tom3M: -58.50, annualizedBasis: -2.68 },
    { metal: 'Aluminium', cash3M: -37.50, cash3MPct: -1.52, structure: 'contango', tom3M: -35.00, annualizedBasis: -6.08 },
    { metal: 'Zinc', cash3M: -36.50, cash3MPct: -1.28, structure: 'contango', tom3M: -34.00, annualizedBasis: -5.14 },
    { metal: 'Nickel', cash3M: -170.00, cash3MPct: -1.04, structure: 'contango', tom3M: -160.00, annualizedBasis: -4.15 },
    { metal: 'Lead', cash3M: -23.00, cash3MPct: -1.08, structure: 'contango', tom3M: -21.00, annualizedBasis: -4.33 },
    { metal: 'Tin', cash3M: -160.00, cash3MPct: -0.56, structure: 'contango', tom3M: -148.00, annualizedBasis: -2.25 },
  ],
  tcRc: [
    { metal: 'Copper Conc.', tc: 80.00, rc: 8.00, unit: '$/mt & c/lb', change: -2.50 },
    { metal: 'Zinc Conc.', tc: 165.00, rc: 0, unit: '$/mt', change: 5.00 },
    { metal: 'Lead Conc.', tc: 45.00, rc: 0, unit: '$/mt', change: -1.00 },
    { metal: 'Tin Conc.', tc: 850.00, rc: 0, unit: '$/mt', change: 20.00 },
    { metal: 'Nickel Matte', tc: 0, rc: 0, unit: 'premium basis', change: 0 },
  ],
  timestamp: new Date().toISOString(),
};

// ── Formatting helpers ──

function fmtPrice(n: number): string {
  if (Math.abs(n) >= 10000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (Math.abs(n) >= 100) return n.toFixed(0);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(2);
}

function fmtNum(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtChange(n: number): string {
  return (n >= 0 ? '+' : '') + fmtPrice(n);
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function structureColor(s: string): string {
  if (s === 'backwardation') return 'text-orange-400';
  if (s === 'contango') return 'text-blue-400';
  return 'text-neutral-400';
}

function structureBg(s: string): string {
  if (s === 'backwardation') return 'bg-orange-500/10 border border-orange-500/30';
  if (s === 'contango') return 'bg-blue-500/10 border border-blue-500/30';
  return 'bg-neutral-500/10 border border-neutral-500/30';
}

function inventoryWarning(stock: number, cancelledPct: number): boolean {
  return stock < 50000 || cancelledPct > 30;
}

// ── Main Panel ──

export function IndustrialMetalsPanel() {
  const { data: rawData, isLoading, refetch } = useIndustrialMetals();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [selectedMetal, setSelectedMetal] = useState<string>('Copper');

  const data: IndustrialMetalsData = rawData ?? FALLBACK_DATA;

  const metalNames = useMemo(() => {
    return data.overview.map((m) => m.name);
  }, [data]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-teal-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-teal-400">
            Industrial Metals
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-mono text-neutral-500 tabular-nums">
            LME / SHFE
          </span>
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral-500 hover:text-teal-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex border-b border-border/20 shrink-0">
        <div className="flex gap-px px-2 py-1 flex-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
                activeTab === t.key
                  ? 'text-teal-400 border-b border-teal-400'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading && !rawData ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[9px] font-mono text-teal-400 uppercase tracking-wider animate-pulse">
              Loading...
            </span>
          </div>
        ) : !data || (data.overview.length === 0) ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
              No data available
            </span>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab data={data} />}
            {activeTab === 'inventory' && <InventoryTab data={data} />}
            {activeTab === 'forwards' && (
              <ForwardsTab
                data={data}
                selectedMetal={selectedMetal}
                metalNames={metalNames}
                onSelectMetal={setSelectedMetal}
              />
            )}
            {activeTab === 'premiums' && <PremiumsTab data={data} />}
            {activeTab === 'spreads' && <SpreadsTab data={data} />}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1 border-t border-border/10 bg-[#050505] shrink-0">
        <span className="text-[7px] font-mono text-neutral-700">
          Updated: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ── OVERVIEW TAB ──

function OverviewTab({ data }: { data: IndustrialMetalsData }) {
  return (
    <div>
      {/* Section header */}
      <div className="px-2 py-1.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          All Metals
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[56px_62px_56px_52px_1fr_52px_58px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Metal</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Spot</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">3M</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Chg%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">52W Range</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Vol</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">OI</span>
      </div>

      {data.overview.map((metal) => (
        <OverviewRow key={metal.symbol} metal={metal} />
      ))}
    </div>
  );
}

function OverviewRow({ metal }: { metal: MetalOverview }) {
  const range = metal.high52W - metal.low52W;
  const pct52W = range > 0 ? ((metal.spot - metal.low52W) / range) * 100 : 50;

  return (
    <div className="grid grid-cols-[56px_62px_56px_52px_1fr_52px_58px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center">
      <div>
        <span className="text-[9px] font-mono font-bold text-white">{metal.symbol}</span>
        <div className="text-[6px] font-mono text-neutral-600">{metal.name}</div>
      </div>
      <span className="text-[9px] font-mono font-bold text-white text-right tabular-nums">
        {fmtPrice(metal.spot)}
      </span>
      <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
        {fmtPrice(metal.price3M)}
      </span>
      <div className="text-right">
        <span className={`text-[9px] font-mono font-bold ${changeColor(metal.changePct)}`}>
          {fmtPct(metal.changePct)}
        </span>
        <div className={`text-[7px] font-mono ${changeColor(metal.change)}`}>
          {fmtChange(metal.change)}
        </div>
      </div>
      <div className="flex items-center gap-1 px-1">
        <span className="text-[6px] font-mono text-neutral-600 tabular-nums">{fmtPrice(metal.low52W)}</span>
        <div className="flex-1 h-1 bg-neutral-800 relative">
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-teal-400"
            style={{ left: `${Math.min(100, Math.max(0, pct52W))}%` }}
          />
        </div>
        <span className="text-[6px] font-mono text-neutral-600 tabular-nums">{fmtPrice(metal.high52W)}</span>
      </div>
      <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
        {fmtNum(metal.volume)}
      </span>
      <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
        {fmtNum(metal.openInterest)}
      </span>
    </div>
  );
}

// ── INVENTORY TAB ──

function InventoryTab({ data }: { data: IndustrialMetalsData }) {
  return (
    <div>
      <div className="px-2 py-1.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Warehouse Stocks (LME / SHFE)
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[60px_42px_56px_48px_48px_44px_44px_28px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Metal</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Exch</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Stock</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Canc%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Canc</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">1D</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">1W</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Dir</span>
      </div>

      {data.inventory.map((item, idx) => {
        const isLow = inventoryWarning(item.stock, item.cancelledPct);
        return (
          <div
            key={`${item.metal}-${item.exchange}-${idx}`}
            className="grid grid-cols-[60px_42px_56px_48px_48px_44px_44px_28px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center"
          >
            <span className={`text-[8px] font-mono font-bold ${isLow ? 'text-amber-400' : 'text-white'}`}>
              {item.metal}
            </span>
            <span className="text-[7px] font-mono text-neutral-500">{item.exchange}</span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${isLow ? 'text-amber-400' : 'text-white'}`}>
              {fmtNum(item.stock)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${item.cancelledPct > 30 ? 'text-amber-400' : item.cancelledPct > 20 ? 'text-yellow-400' : 'text-neutral-400'}`}>
              {item.cancelledPct > 0 ? item.cancelledPct.toFixed(1) + '%' : '-'}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
              {item.cancelledWarrants > 0 ? fmtNum(item.cancelledWarrants) : '-'}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${changeColor(item.change1D)}`}>
              {fmtChange(item.change1D)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${changeColor(item.change1W)}`}>
              {fmtChange(item.change1W)}
            </span>
            <div className="flex justify-center">
              <span className={`text-[8px] font-mono font-bold ${
                item.direction === 'up' ? 'text-green-400' : item.direction === 'down' ? 'text-red-400' : 'text-neutral-500'
              }`}>
                {item.direction === 'up' ? '\u25B2' : item.direction === 'down' ? '\u25BC' : '\u25AC'}
              </span>
            </div>
          </div>
        );
      })}

      {/* Inventory bar chart */}
      <div className="px-2 py-2 border-t border-border/20">
        <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
          LME Stock Levels
        </div>
        <InventoryBarChart inventory={data.inventory.filter((i) => i.exchange === 'LME')} />
      </div>
    </div>
  );
}

function InventoryBarChart({ inventory }: { inventory: WarehouseStock[] }) {
  const maxStock = Math.max(...inventory.map((i) => i.stock), 1);

  return (
    <div className="space-y-0.5">
      {inventory.map((item, idx) => {
        const pct = (item.stock / maxStock) * 100;
        const isLow = inventoryWarning(item.stock, item.cancelledPct);
        return (
          <div key={`${item.metal}-${idx}`} className="flex items-center gap-2">
            <span className="text-[7px] font-mono text-neutral-400 w-[52px] shrink-0">{item.metal}</span>
            <div className="flex-1 h-[8px] bg-neutral-900 relative">
              <div
                className={`absolute inset-y-0 left-0 ${isLow ? 'bg-amber-400/70' : 'bg-teal-400/70'}`}
                style={{ width: `${pct}%` }}
              />
              {item.cancelledPct > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-red-500/40"
                  style={{ width: `${(item.cancelledPct / 100) * pct}%` }}
                />
              )}
            </div>
            <span className={`text-[7px] font-mono font-bold w-[40px] text-right shrink-0 tabular-nums ${isLow ? 'text-amber-400' : 'text-teal-400'}`}>
              {fmtNum(item.stock)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── FORWARDS TAB ──

function ForwardsTab({
  data,
  selectedMetal,
  metalNames,
  onSelectMetal,
}: {
  data: IndustrialMetalsData;
  selectedMetal: string;
  metalNames: string[];
  onSelectMetal: (m: string) => void;
}) {
  const forwardData = data.forwards[selectedMetal] ?? [];
  const spotPrice = forwardData.length > 0 ? forwardData[0].price : 0;
  const lastPrice = forwardData.length > 1 ? forwardData[forwardData.length - 1].price : spotPrice;
  const isContango = lastPrice > spotPrice;
  const isBackwardation = lastPrice < spotPrice;
  const structureLabel = isBackwardation ? 'Backwardation' : isContango ? 'Contango' : 'Flat';

  return (
    <div>
      {/* Metal selector */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 mr-1">
          Metal:
        </span>
        {metalNames.map((m) => (
          <button
            key={m}
            onClick={() => onSelectMetal(m)}
            className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
              selectedMetal === m
                ? 'text-teal-400 bg-teal-500/10 border border-teal-500/30'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Structure indicator */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-bold text-white">{selectedMetal} Forward Curve</span>
        <span className={`text-[6px] font-black font-mono uppercase px-1.5 py-0.5 ${
          isBackwardation ? 'text-orange-400 bg-orange-500/10 border border-orange-500/30' :
          isContango ? 'text-blue-400 bg-blue-500/10 border border-blue-500/30' :
          'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30'
        }`}>
          {structureLabel}
        </span>
      </div>

      {/* Forward curve chart */}
      {forwardData.length > 1 && (
        <div className="px-3 py-3 border-b border-border/20">
          <ForwardCurveChart data={forwardData} isBackwardation={isBackwardation} />
        </div>
      )}

      {/* Forward table */}
      <div className="grid grid-cols-[56px_80px_72px_72px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Tenor</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Price</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Spread</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Spread %</span>
      </div>

      {forwardData.map((fp) => {
        const spreadPct = spotPrice > 0 ? (fp.spread / spotPrice) * 100 : 0;
        return (
          <div
            key={fp.tenor}
            className="grid grid-cols-[56px_80px_72px_72px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors"
          >
            <span className="text-[8px] font-mono font-bold text-neutral-400">{fp.tenor}</span>
            <span className="text-[8px] font-mono font-bold text-white text-right tabular-nums">
              {fmtPrice(fp.price)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${
              fp.spread === 0 ? 'text-neutral-600' : changeColor(fp.spread)
            }`}>
              {fp.spread === 0 ? '-' : fmtChange(fp.spread)}
            </span>
            <span className={`text-[8px] font-mono text-right tabular-nums ${
              fp.spread === 0 ? 'text-neutral-600' : changeColor(fp.spread)
            }`}>
              {fp.spread === 0 ? '-' : fmtPct(spreadPct)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Forward Curve Chart (SVG) ──

function ForwardCurveChart({ data, isBackwardation }: { data: ForwardPoint[]; isBackwardation: boolean }) {
  const chart = useMemo(() => {
    if (data.length < 2) return null;

    const W = 320;
    const H = 90;
    const PAD_L = 48;
    const PAD_R = 12;
    const PAD_T = 10;
    const PAD_B = 20;

    const prices = data.map((d) => d.price);
    const minP = Math.min(...prices) - (Math.max(...prices) - Math.min(...prices)) * 0.1;
    const maxP = Math.max(...prices) + (Math.max(...prices) - Math.min(...prices)) * 0.1;

    const scaleX = (i: number) => PAD_L + (i / (data.length - 1)) * (W - PAD_L - PAD_R);
    const scaleY = (v: number) => PAD_T + ((maxP - v) / (maxP - minP)) * (H - PAD_T - PAD_B);

    const path = data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(d.price).toFixed(1)}`)
      .join(' ');

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, path, scaleX, scaleY, minP, maxP };
  }, [data]);

  if (!chart) return null;

  const lineColor = isBackwardation ? '#fb923c' : '#2dd4bf';
  const dotColor = isBackwardation ? '#fb923c' : '#2dd4bf';

  const yTicks: number[] = [];
  const range = chart.maxP - chart.minP;
  const step = range > 1000 ? 200 : range > 100 ? 50 : range > 10 ? 5 : 1;
  for (let v = Math.ceil(chart.minP / step) * step; v <= chart.maxP; v += step) {
    yTicks.push(v);
  }

  return (
    <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full" style={{ maxHeight: 110 }}>
      {/* Grid */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={chart.PAD_L} y1={chart.scaleY(v)} x2={chart.W - chart.PAD_R} y2={chart.scaleY(v)}
            stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3"
          />
          <text x={chart.PAD_L - 3} y={chart.scaleY(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace">
            {v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toFixed(0)}
          </text>
        </g>
      ))}

      {/* Curve */}
      <path d={chart.path} fill="none" stroke={lineColor} strokeWidth={1.5} />

      {/* Data points + labels */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={chart.scaleX(i)} cy={chart.scaleY(d.price)} r={2} fill={dotColor} />
          <text
            x={chart.scaleX(i)} y={chart.H - 4}
            textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={6} fontFamily="monospace"
          >
            {d.tenor}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── PREMIUMS TAB ──

function PremiumsTab({ data }: { data: IndustrialMetalsData }) {
  const metalGroups = useMemo(() => {
    const groups: Record<string, RegionalPremium[]> = {};
    for (const p of data.premiums) {
      if (!groups[p.metal]) groups[p.metal] = [];
      groups[p.metal].push(p);
    }
    return groups;
  }, [data.premiums]);

  return (
    <div>
      {/* Regional Premiums */}
      <div className="px-2 py-1.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Regional Premiums
        </span>
      </div>

      {Object.entries(metalGroups).map(([metal, premiums]) => (
        <div key={metal}>
          <div className="px-2 py-1 border-b border-border/20 bg-[#020202]">
            <span className="text-[8px] font-mono font-bold text-teal-400">{metal}</span>
          </div>

          <div className="grid grid-cols-[1fr_72px_56px_72px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Region</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Premium</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Chg</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Unit</span>
          </div>

          {premiums.map((p) => (
            <div
              key={p.region}
              className="grid grid-cols-[1fr_72px_56px_72px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors"
            >
              <span className="text-[8px] font-mono text-white">{p.region}</span>
              <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${p.premium < 0 ? 'text-red-400' : 'text-white'}`}>
                {fmtChange(p.premium)}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${changeColor(p.change)}`}>
                {fmtChange(p.change)}
              </span>
              <span className="text-[7px] font-mono text-neutral-500 text-right">{p.unit}</span>
            </div>
          ))}
        </div>
      ))}

      {/* Scrap Spreads */}
      <div className="px-2 py-1.5 border-t border-border/20 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Scrap Spreads
        </span>
      </div>

      <div className="grid grid-cols-[1fr_72px_56px_1fr] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Material</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Spread</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Chg</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Basis</span>
      </div>

      {data.scrapSpreads.map((s) => (
        <div
          key={s.metal}
          className="grid grid-cols-[1fr_72px_56px_1fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono text-white">{s.metal}</span>
          <span className="text-[8px] font-mono font-bold text-right tabular-nums text-neutral-300">
            {fmtChange(s.spread)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${changeColor(s.change)}`}>
            {fmtChange(s.change)}
          </span>
          <span className="text-[7px] font-mono text-neutral-500 text-right">{s.unit}</span>
        </div>
      ))}
    </div>
  );
}

// ── SPREADS TAB ──

function SpreadsTab({ data }: { data: IndustrialMetalsData }) {
  return (
    <div>
      {/* Cash-3M Spreads */}
      <div className="px-2 py-1.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Cash-3M Spreads
        </span>
      </div>

      <div className="grid grid-cols-[60px_64px_52px_72px_56px_64px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Metal</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">C-3M</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">C-3M%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Structure</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">T-3M</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Ann. Basis</span>
      </div>

      {data.spreads.map((s) => (
        <div
          key={s.metal}
          className="grid grid-cols-[60px_64px_52px_72px_56px_64px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white">{s.metal}</span>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${changeColor(s.cash3M)}`}>
            {fmtChange(s.cash3M)}
          </span>
          <span className={`text-[8px] font-mono text-right tabular-nums ${changeColor(s.cash3MPct)}`}>
            {fmtPct(s.cash3MPct)}
          </span>
          <div className="flex justify-center">
            <span className={`text-[6px] font-black font-mono uppercase px-1 py-0.5 ${structureColor(s.structure)} ${structureBg(s.structure)}`}>
              {s.structure === 'backwardation' ? 'BACKW' : s.structure === 'contango' ? 'CONTANGO' : 'FLAT'}
            </span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${changeColor(s.tom3M)}`}>
            {fmtChange(s.tom3M)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${changeColor(s.annualizedBasis)}`}>
            {fmtPct(s.annualizedBasis)}
          </span>
        </div>
      ))}

      {/* Contango/Backwardation visual */}
      <div className="px-2 py-2 border-t border-border/20">
        <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
          Annualized Basis
        </div>
        <SpreadBarChart spreads={data.spreads} />
      </div>

      {/* TC/RC Charges */}
      <div className="px-2 py-1.5 border-t border-border/20 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          TC/RC Charges
        </span>
      </div>

      <div className="grid grid-cols-[1fr_64px_56px_72px_52px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Material</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">TC</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">RC</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Unit</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Chg</span>
      </div>

      {data.tcRc.map((tc) => (
        <div
          key={tc.metal}
          className="grid grid-cols-[1fr_64px_56px_72px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono font-bold text-white">{tc.metal}</span>
          <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
            {tc.tc > 0 ? `$${tc.tc.toFixed(0)}` : '-'}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
            {tc.rc > 0 ? `${tc.rc.toFixed(1)}` : '-'}
          </span>
          <span className="text-[7px] font-mono text-neutral-500 text-right">{tc.unit}</span>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${changeColor(tc.change)}`}>
            {tc.change !== 0 ? fmtChange(tc.change) : '-'}
          </span>
        </div>
      ))}
    </div>
  );
}

function SpreadBarChart({ spreads }: { spreads: SpreadData[] }) {
  const maxAbs = Math.max(...spreads.map((s) => Math.abs(s.annualizedBasis)), 1);

  return (
    <div className="space-y-0.5">
      {spreads.map((s) => {
        const pct = (Math.abs(s.annualizedBasis) / maxAbs) * 50;
        const isNeg = s.annualizedBasis < 0;
        return (
          <div key={s.metal} className="flex items-center gap-2">
            <span className="text-[7px] font-mono text-neutral-400 w-[52px] shrink-0">{s.metal}</span>
            <div className="flex-1 h-[8px] bg-neutral-900 relative">
              {/* Center line */}
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-neutral-700" />
              {/* Bar */}
              <div
                className={`absolute inset-y-0 ${
                  s.structure === 'backwardation' ? 'bg-orange-400/70' : 'bg-blue-400/70'
                }`}
                style={
                  isNeg
                    ? { right: '50%', width: `${pct}%` }
                    : { left: '50%', width: `${pct}%` }
                }
              />
            </div>
            <span className={`text-[7px] font-mono font-bold w-[36px] text-right shrink-0 tabular-nums ${
              s.structure === 'backwardation' ? 'text-orange-400' : 'text-blue-400'
            }`}>
              {fmtPct(s.annualizedBasis)}
            </span>
          </div>
        );
      })}
      <div className="flex justify-between px-[52px] mt-0.5">
        <span className="text-[6px] font-mono text-orange-400/60">Backwardation</span>
        <span className="text-[6px] font-mono text-blue-400/60">Contango</span>
      </div>
    </div>
  );
}
