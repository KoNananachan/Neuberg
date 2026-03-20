import { useState, useMemo } from 'react';
import { usePreciousMetals } from '../../api/hooks/use-precious-metals';
import { useT, tr, TFn } from '../../i18n';
import { Gem, RefreshCw } from 'lucide-react';

// ── Types ──

type View = 'spot' | 'structure' | 'flows';

interface SpotMetal {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  bid: number;
  ask: number;
  dayHigh: number;
  dayLow: number;
  yearHigh: number;
  yearLow: number;
}

interface LeaseRate {
  metal: string;
  tenor1M: number;
  tenor3M: number;
  tenor6M: number;
  tenor12M: number;
}

interface EtfHolding {
  ticker: string;
  metal: string;
  holdings: number;
  unit: string;
  change1D: number;
  change1W: number;
  change1M: number;
}

interface ComexInventory {
  metal: string;
  registered: number;
  eligible: number;
  total: number;
  unit: string;
  change1D: number;
}

interface ForwardPoint {
  tenor: string;
  gold: number;
  silver: number;
}

interface CentralBankPurchase {
  country: string;
  tonnes: number;
  changeYoY: number;
  totalReserves: number;
}

interface PreciousMetalsData {
  spot: SpotMetal[];
  leaseRates: LeaseRate[];
  etfHoldings: EtfHolding[];
  comexInventory: ComexInventory[];
  forwardCurve: ForwardPoint[];
  goldSilverRatio: number;
  goldSilverRatioChange: number;
  centralBankPurchases: CentralBankPurchase[];
  timestamp: string;
}

// ── Fallback mock data ──

const FALLBACK_DATA: PreciousMetalsData = {
  spot: [
    { symbol: 'XAU', name: 'Gold', price: 2051.30, change: 12.40, changePercent: 0.61, bid: 2050.80, ask: 2051.80, dayHigh: 2058.20, dayLow: 2035.60, yearHigh: 2135.40, yearLow: 1810.80 },
    { symbol: 'XAG', name: 'Silver', price: 23.52, change: -0.18, changePercent: -0.76, bid: 23.48, ask: 23.56, dayHigh: 23.95, dayLow: 23.30, yearHigh: 26.14, yearLow: 19.88 },
    { symbol: 'XPT', name: 'Platinum', price: 952.40, change: 5.60, changePercent: 0.59, bid: 950.00, ask: 954.80, dayHigh: 960.00, dayLow: 942.20, yearHigh: 1030.00, yearLow: 842.50 },
    { symbol: 'XPD', name: 'Palladium', price: 1002.80, change: -15.20, changePercent: -1.49, bid: 1000.00, ask: 1005.60, dayHigh: 1025.40, dayLow: 995.00, yearHigh: 1340.00, yearLow: 930.00 },
  ],
  leaseRates: [
    { metal: 'Gold', tenor1M: 0.12, tenor3M: 0.18, tenor6M: 0.25, tenor12M: 0.38 },
    { metal: 'Silver', tenor1M: 0.35, tenor3M: 0.48, tenor6M: 0.62, tenor12M: 0.85 },
    { metal: 'Platinum', tenor1M: 1.80, tenor3M: 2.10, tenor6M: 2.45, tenor12M: 2.90 },
    { metal: 'Palladium', tenor1M: 3.20, tenor3M: 3.80, tenor6M: 4.50, tenor12M: 5.20 },
  ],
  etfHoldings: [
    { ticker: 'GLD', metal: 'Gold', holdings: 878.3, unit: 'tonnes', change1D: -0.58, change1W: -2.31, change1M: 5.12 },
    { ticker: 'IAU', metal: 'Gold', holdings: 399.8, unit: 'tonnes', change1D: 0.12, change1W: -0.45, change1M: 2.80 },
    { ticker: 'SLV', metal: 'Silver', holdings: 13205.6, unit: 'tonnes', change1D: -12.40, change1W: -35.80, change1M: 82.50 },
    { ticker: 'PPLT', metal: 'Platinum', holdings: 15.8, unit: 'tonnes', change1D: 0.02, change1W: -0.10, change1M: -0.35 },
  ],
  comexInventory: [
    { metal: 'Gold', registered: 8420000, eligible: 9680000, total: 18100000, unit: 'oz', change1D: -42500 },
    { metal: 'Silver', registered: 112000000, eligible: 168000000, total: 280000000, unit: 'oz', change1D: 850000 },
  ],
  forwardCurve: [
    { tenor: 'Spot', gold: 2051.30, silver: 23.52 },
    { tenor: '1M', gold: 2053.80, silver: 23.58 },
    { tenor: '3M', gold: 2060.20, silver: 23.72 },
    { tenor: '6M', gold: 2072.50, silver: 23.95 },
    { tenor: '12M', gold: 2098.40, silver: 24.38 },
  ],
  goldSilverRatio: 87.2,
  goldSilverRatioChange: 1.18,
  centralBankPurchases: [
    { country: 'China', tonnes: 225, changeYoY: 18.5, totalReserves: 2235 },
    { country: 'Poland', tonnes: 130, changeYoY: 45.2, totalReserves: 358 },
    { country: 'Turkey', tonnes: 95, changeYoY: -12.8, totalReserves: 540 },
    { country: 'India', tonnes: 75, changeYoY: 22.0, totalReserves: 812 },
    { country: 'Czech Rep', tonnes: 19, changeYoY: 58.3, totalReserves: 42 },
    { country: 'Singapore', tonnes: 17, changeYoY: -5.6, totalReserves: 230 },
  ],
  timestamp: new Date().toISOString(),
};

// ── Formatting helpers ──

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtTonnes(n: number): string {
  if (n >= 10000) return fmtNumber(n);
  return n.toFixed(1);
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function changeSign(n: number): string {
  return n > 0 ? '+' : '';
}

// ── Main Panel ──

export function PreciousMetalsPanel() {
  const t = useT();
  const { data: rawData, isLoading, refetch } = usePreciousMetals();
  const [activeView, setActiveView] = useState<View>('spot');

  const data: PreciousMetalsData = rawData ?? FALLBACK_DATA;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Gem className="w-3 h-3 text-yellow-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-yellow-400">
            {tr(t, 'pmTitle', 'Precious Metals Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider text-yellow-400 bg-yellow-500/10 border border-yellow-500/30">
              Au/Ag {data.goldSilverRatio.toFixed(1)}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-yellow-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View selector */}
      <div className="flex border-b border-border/20 shrink-0">
        <div className="flex gap-px px-2 py-1 flex-1">
          {(['spot', 'structure', 'flows'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
                activeView === v
                  ? 'text-yellow-400 border-b border-yellow-400'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {v === 'spot'
                ? tr(t, 'pmSpot', 'Spot Prices')
                : v === 'structure'
                  ? tr(t, 'pmStructure', 'Structure')
                  : tr(t, 'pmFlows', 'Flows')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !rawData && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {activeView === 'spot' && <SpotView data={data} t={t} />}
        {activeView === 'structure' && <StructureView data={data} t={t} />}
        {activeView === 'flows' && <FlowsView data={data} t={t} />}
      </div>

      {/* Footer */}
      <div className="px-3 py-1 border-t border-border/10 bg-[#050505] shrink-0">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'pmUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ── SPOT VIEW ──

function SpotView({ data, t }: { data: PreciousMetalsData; t: ReturnType<typeof useT> }) {
  return (
    <div>
      {/* Spot Prices */}
      <div className="px-2 py-1.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'pmSpotPrices', 'Spot Prices')}
        </span>
      </div>

      {/* Spot header */}
      <div className="grid grid-cols-[52px_68px_56px_52px_52px_68px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'pmMetal', 'Metal')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'pmPrice', 'Price')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'pmChg', 'Chg%')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'pmBid', 'Bid')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'pmAsk', 'Ask')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'pmRange', 'Day Range')}</span>
      </div>

      {data.spot.map((metal) => (
        <SpotRow key={metal.symbol} metal={metal} />
      ))}

      {/* Gold/Silver Ratio */}
      <div className="px-2 py-2 border-t border-border/10">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'pmGoldSilverRatio', 'Gold / Silver Ratio')}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[16px] font-mono font-black text-yellow-400">
              {data.goldSilverRatio.toFixed(1)}
            </span>
            <span className={`text-[9px] font-mono font-bold ${changeColor(data.goldSilverRatioChange)}`}>
              {changeSign(data.goldSilverRatioChange)}{data.goldSilverRatioChange.toFixed(2)}
            </span>
          </div>
        </div>
        <RatioBar value={data.goldSilverRatio} min={60} max={110} />
        <div className="flex justify-between mt-0.5">
          <span className="text-[7px] font-mono text-neutral-600">Silver Rich</span>
          <span className="text-[7px] font-mono text-neutral-600">Gold Rich</span>
        </div>
      </div>

      {/* Lease Rates */}
      <div className="px-2 py-1.5 border-t border-border/10 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'pmLeaseRates', 'Lease Rates (%)')}
        </span>
      </div>

      <div className="grid grid-cols-[64px_52px_52px_52px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'pmMetal', 'Metal')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">1M</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">3M</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">6M</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">12M</span>
      </div>

      {data.leaseRates.map((lr) => (
        <div
          key={lr.metal}
          className="grid grid-cols-[64px_52px_52px_52px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-yellow-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono font-bold text-white">{lr.metal}</span>
          <span className={`text-[8px] font-mono text-right ${lr.tenor1M > 1 ? 'text-amber-400' : 'text-neutral-300'}`}>
            {lr.tenor1M.toFixed(2)}
          </span>
          <span className={`text-[8px] font-mono text-right ${lr.tenor3M > 1 ? 'text-amber-400' : 'text-neutral-300'}`}>
            {lr.tenor3M.toFixed(2)}
          </span>
          <span className={`text-[8px] font-mono text-right ${lr.tenor6M > 1 ? 'text-amber-400' : 'text-neutral-300'}`}>
            {lr.tenor6M.toFixed(2)}
          </span>
          <span className={`text-[8px] font-mono text-right ${lr.tenor12M > 1 ? 'text-amber-400' : 'text-neutral-300'}`}>
            {lr.tenor12M.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

function SpotRow({ metal }: { metal: SpotMetal }) {
  const isPositive = metal.changePercent >= 0;

  return (
    <div className="grid grid-cols-[52px_68px_56px_52px_52px_68px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-yellow-400/[0.02] transition-colors items-center">
      <div>
        <span className="text-[9px] font-mono font-bold text-white">{metal.symbol}</span>
        <div className="text-[6px] font-mono text-neutral-600">{metal.name}</div>
      </div>
      <span className="text-[9px] font-mono font-bold text-white text-right">{fmtPrice(metal.price)}</span>
      <div className="text-right">
        <span className={`text-[9px] font-mono font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {changeSign(metal.changePercent)}{metal.changePercent.toFixed(2)}%
        </span>
        <div className={`text-[7px] font-mono ${isPositive ? 'text-green-400/60' : 'text-red-400/60'}`}>
          {changeSign(metal.change)}{fmtPrice(metal.change)}
        </div>
      </div>
      <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtPrice(metal.bid)}</span>
      <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtPrice(metal.ask)}</span>
      <div className="flex items-center justify-end gap-0.5">
        <span className="text-[7px] font-mono text-red-400/50">{fmtPrice(metal.dayLow)}</span>
        <DayRangeBar low={metal.dayLow} high={metal.dayHigh} current={metal.price} />
        <span className="text-[7px] font-mono text-green-400/50">{fmtPrice(metal.dayHigh)}</span>
      </div>
    </div>
  );
}

function DayRangeBar({ low, high, current }: { low: number; high: number; current: number }) {
  const range = high - low;
  const pct = range > 0 ? ((current - low) / range) * 100 : 50;

  return (
    <div className="w-6 h-1 bg-neutral-800 relative">
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-yellow-400"
        style={{ left: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function RatioBar({ value, min, max }: { value: number; min: number; max: number }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className="w-full h-1.5 bg-neutral-800 relative mt-1">
      <div
        className="absolute top-0 bottom-0 w-1.5 bg-yellow-400"
        style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
      />
      {/* Historical average marker (~68) */}
      <div
        className="absolute top-0 bottom-0 w-px bg-neutral-500"
        style={{ left: `${((68 - min) / (max - min)) * 100}%` }}
      />
    </div>
  );
}

// ── STRUCTURE VIEW ──

function StructureView({ data, t }: { data: PreciousMetalsData; t: ReturnType<typeof useT> }) {
  return (
    <div>
      {/* Forward Curves */}
      <div className="px-2 py-1.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'pmForwardCurves', 'Forward Curves')}
        </span>
      </div>

      <div className="px-3 py-3 border-b border-border/10">
        <ForwardCurveChart data={data.forwardCurve} />
      </div>

      {/* Forward table */}
      <div className="grid grid-cols-[52px_72px_72px_60px_60px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'pmTenor', 'Tenor')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'pmGold', 'Gold')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'pmSilver', 'Silver')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Au Fwd</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Ag Fwd</span>
      </div>

      {data.forwardCurve.map((fp, i) => {
        const goldBasis = i > 0 ? fp.gold - data.forwardCurve[0].gold : 0;
        const silverBasis = i > 0 ? fp.silver - data.forwardCurve[0].silver : 0;

        return (
          <div
            key={fp.tenor}
            className="grid grid-cols-[52px_72px_72px_60px_60px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-yellow-400/[0.02] transition-colors"
          >
            <span className="text-[8px] font-mono font-bold text-neutral-400">{fp.tenor}</span>
            <span className="text-[8px] font-mono font-bold text-white text-right">{fmtPrice(fp.gold)}</span>
            <span className="text-[8px] font-mono font-bold text-white text-right">{fmtPrice(fp.silver)}</span>
            <span className={`text-[8px] font-mono text-right ${i === 0 ? 'text-neutral-600' : changeColor(goldBasis)}`}>
              {i === 0 ? '-' : `${changeSign(goldBasis)}${goldBasis.toFixed(2)}`}
            </span>
            <span className={`text-[8px] font-mono text-right ${i === 0 ? 'text-neutral-600' : changeColor(silverBasis)}`}>
              {i === 0 ? '-' : `${changeSign(silverBasis)}${silverBasis.toFixed(2)}`}
            </span>
          </div>
        );
      })}

      {/* COMEX Inventory */}
      <div className="px-2 py-1.5 border-t border-border/10 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'pmComex', 'COMEX Inventory')}
        </span>
      </div>

      <div className="grid grid-cols-[56px_64px_64px_64px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'pmMetal', 'Metal')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Reg</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Elig</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Total</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Chg 1D</span>
      </div>

      {data.comexInventory.map((ci) => (
        <div
          key={ci.metal}
          className="grid grid-cols-[56px_64px_64px_64px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-yellow-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono font-bold text-white">{ci.metal}</span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">{fmtNumber(ci.registered)}</span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">{fmtNumber(ci.eligible)}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">{fmtNumber(ci.total)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(ci.change1D)}`}>
            {changeSign(ci.change1D)}{fmtNumber(ci.change1D)}
          </span>
        </div>
      ))}

      <div className="px-2 py-0.5">
        <span className="text-[6px] font-mono text-neutral-700 uppercase">{tr(t, 'pmComexUnit', 'Unit: Troy Ounces')}</span>
      </div>
    </div>
  );
}

// ── Forward Curve Chart (SVG) ──

function ForwardCurveChart({ data }: { data: ForwardPoint[] }) {
  const chart = useMemo(() => {
    if (data.length < 2) return null;

    const W = 320;
    const H = 100;
    const PAD_L = 40;
    const PAD_R = 12;
    const PAD_T = 14;
    const PAD_B = 20;

    const goldPrices = data.map((d) => d.gold);
    const silverPrices = data.map((d) => d.silver);

    const minGold = Math.min(...goldPrices) - 5;
    const maxGold = Math.max(...goldPrices) + 5;
    const minSilver = Math.min(...silverPrices) - 0.2;
    const maxSilver = Math.max(...silverPrices) + 0.2;

    const scaleX = (i: number) => PAD_L + (i / (data.length - 1)) * (W - PAD_L - PAD_R);
    const scaleYGold = (v: number) => PAD_T + ((maxGold - v) / (maxGold - minGold)) * (H - PAD_T - PAD_B);
    const scaleYSilver = (v: number) => PAD_T + ((maxSilver - v) / (maxSilver - minSilver)) * (H - PAD_T - PAD_B);

    const goldPath = data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleYGold(d.gold).toFixed(1)}`)
      .join(' ');

    const silverPath = data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleYSilver(d.silver).toFixed(1)}`)
      .join(' ');

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, goldPath, silverPath, scaleX, scaleYGold, scaleYSilver, minGold, maxGold };
  }, [data]);

  if (!chart) return null;

  // Y-axis ticks for gold
  const yTicks: number[] = [];
  const step = (chart.maxGold - chart.minGold) > 30 ? 10 : 5;
  for (let v = Math.ceil(chart.minGold / step) * step; v <= chart.maxGold; v += step) {
    yTicks.push(v);
  }

  return (
    <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full" style={{ maxHeight: 120 }}>
      {/* Grid */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={chart.PAD_L} y1={chart.scaleYGold(v)} x2={chart.W - chart.PAD_R} y2={chart.scaleYGold(v)}
            stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3"
          />
          <text x={chart.PAD_L - 3} y={chart.scaleYGold(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace">
            {v.toFixed(0)}
          </text>
        </g>
      ))}

      {/* Gold curve */}
      <path d={chart.goldPath} fill="none" stroke="#facc15" strokeWidth={1.5} />
      {/* Silver curve */}
      <path d={chart.silverPath} fill="none" stroke="#94a3b8" strokeWidth={1.5} />

      {/* Data points */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={chart.scaleX(i)} cy={chart.scaleYGold(d.gold)} r={2} fill="#facc15" />
          <circle cx={chart.scaleX(i)} cy={chart.scaleYSilver(d.silver)} r={2} fill="#94a3b8" />
          <text
            x={chart.scaleX(i)} y={chart.H - 4}
            textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={7} fontFamily="monospace"
          >
            {d.tenor}
          </text>
        </g>
      ))}

      {/* Legend */}
      <circle cx={chart.PAD_L + 4} cy={6} r={2} fill="#facc15" />
      <text x={chart.PAD_L + 10} y={9} fill="#facc15" fontSize={7} fontFamily="monospace">Gold</text>
      <circle cx={chart.PAD_L + 44} cy={6} r={2} fill="#94a3b8" />
      <text x={chart.PAD_L + 50} y={9} fill="#94a3b8" fontSize={7} fontFamily="monospace">Silver</text>
    </svg>
  );
}

// ── FLOWS VIEW ──

function FlowsView({ data, t }: { data: PreciousMetalsData; t: ReturnType<typeof useT> }) {
  return (
    <div>
      {/* ETF Holdings */}
      <div className="px-2 py-1.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'pmEtfHoldings', 'ETF Holdings')}
        </span>
      </div>

      <div className="grid grid-cols-[44px_44px_64px_48px_48px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'pmTicker', 'Ticker')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'pmMetal', 'Metal')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'pmHoldings', 'Holdings')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">1D</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">1W</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">1M</span>
      </div>

      {data.etfHoldings.map((etf) => (
        <div
          key={etf.ticker}
          className="grid grid-cols-[44px_44px_64px_48px_48px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-yellow-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono font-bold text-yellow-400">{etf.ticker}</span>
          <span className="text-[7px] font-mono text-neutral-500">{etf.metal}</span>
          <div className="text-right">
            <span className="text-[8px] font-mono font-bold text-white">{fmtTonnes(etf.holdings)}</span>
            <span className="text-[6px] font-mono text-neutral-600 ml-0.5">{etf.unit === 'tonnes' ? 't' : etf.unit}</span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(etf.change1D)}`}>
            {changeSign(etf.change1D)}{Math.abs(etf.change1D).toFixed(1)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(etf.change1W)}`}>
            {changeSign(etf.change1W)}{Math.abs(etf.change1W).toFixed(1)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(etf.change1M)}`}>
            {changeSign(etf.change1M)}{Math.abs(etf.change1M).toFixed(1)}
          </span>
        </div>
      ))}

      {/* Central Bank Purchases */}
      <div className="px-2 py-1.5 border-t border-border/10 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'pmCentralBank', 'Central Bank Gold Purchases (YTD)')}
        </span>
      </div>

      <div className="grid grid-cols-[64px_56px_56px_64px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'pmCountry', 'Country')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'pmTonnes', 'Tonnes')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'pmYoY', 'YoY %')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'pmReserves', 'Reserves')}</span>
      </div>

      {data.centralBankPurchases.map((cb) => (
        <div
          key={cb.country}
          className="grid grid-cols-[64px_56px_56px_64px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-yellow-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono font-bold text-white">{cb.country}</span>
          <span className="text-[8px] font-mono font-bold text-yellow-400 text-right">{cb.tonnes.toFixed(0)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(cb.changeYoY)}`}>
            {changeSign(cb.changeYoY)}{cb.changeYoY.toFixed(1)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtNumber(cb.totalReserves)}t</span>
        </div>
      ))}

      {/* Purchases bar chart */}
      <div className="px-3 py-2 border-t border-border/10">
        <CentralBankChart purchases={data.centralBankPurchases} />
      </div>
    </div>
  );
}

// ── Central Bank Purchases Bar Chart ──

function CentralBankChart({ purchases }: { purchases: CentralBankPurchase[] }) {
  const sorted = useMemo(
    () => [...purchases].sort((a, b) => b.tonnes - a.tonnes),
    [purchases],
  );

  const maxTonnes = Math.max(...sorted.map((p) => p.tonnes), 1);

  return (
    <div className="space-y-0.5">
      {sorted.map((cb) => {
        const pct = (cb.tonnes / maxTonnes) * 100;
        return (
          <div key={cb.country} className="flex items-center gap-2 hover:bg-yellow-400/[0.02] transition-colors">
            <span className="text-[7px] font-mono text-neutral-400 w-[52px] shrink-0">{cb.country}</span>
            <div className="flex-1 h-[8px] bg-neutral-900 relative">
              <div
                className="absolute inset-y-0 left-0 bg-yellow-400/70"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[7px] font-mono font-bold text-yellow-400 w-[32px] text-right shrink-0">{cb.tonnes}t</span>
          </div>
        );
      })}
    </div>
  );
}
