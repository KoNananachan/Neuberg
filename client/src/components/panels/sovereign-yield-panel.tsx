import { useState, useMemo } from 'react';
import { useSovereignYield } from '../../api/hooks/use-sovereign-yield';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Types ──

type Tab = 'benchmark' | 'curve' | 'spreads' | 'real' | 'auction';

interface BenchmarkYield {
  country: string;
  ticker: string;
  yield10y: number;
  change1d: number;
  change1w: number;
  change1m: number;
  high52w: number;
  low52w: number;
}

interface CurvePoint {
  tenor: string;
  months: number;
  yield: number;
  change: number;
}

interface CurveSpread {
  name: string;
  value: number;
  change: number;
}

interface SovereignSpread {
  country: string;
  spread: number;
  change1d: number;
  change1w: number;
  rating: string;
}

interface RealYield {
  country: string;
  nominal: number;
  breakeven: number;
  realYield: number;
  change: number;
}

interface AuctionEntry {
  date: string;
  country: string;
  tenor: string;
  size: string;
  coupon: number | null;
  status: 'upcoming' | 'completed' | 'today';
  bidCover?: number;
  tailBps?: number;
}

// ── Fallback data ──

const FALLBACK_BENCHMARKS: BenchmarkYield[] = [
  { country: 'US', ticker: 'UST', yield10y: 4.452, change1d: -0.023, change1w: -0.048, change1m: 0.112, high52w: 4.739, low52w: 3.621 },
  { country: 'DE', ticker: 'DBR', yield10y: 2.447, change1d: -0.018, change1w: -0.032, change1m: 0.067, high52w: 2.774, low52w: 2.024 },
  { country: 'GB', ticker: 'UKT', yield10y: 4.581, change1d: -0.011, change1w: 0.023, change1m: 0.094, high52w: 4.821, low52w: 3.732 },
  { country: 'JP', ticker: 'JGB', yield10y: 1.312, change1d: 0.008, change1w: 0.024, change1m: 0.087, high52w: 1.455, low52w: 0.605 },
  { country: 'FR', ticker: 'OAT', yield10y: 3.241, change1d: -0.014, change1w: -0.019, change1m: 0.053, high52w: 3.456, low52w: 2.681 },
  { country: 'IT', ticker: 'BTP', yield10y: 3.712, change1d: -0.009, change1w: -0.007, change1m: 0.041, high52w: 4.122, low52w: 3.198 },
  { country: 'ES', ticker: 'SPGB', yield10y: 3.187, change1d: -0.012, change1w: -0.015, change1m: 0.038, high52w: 3.521, low52w: 2.874 },
  { country: 'CA', ticker: 'CAN', yield10y: 3.421, change1d: -0.019, change1w: -0.041, change1m: 0.078, high52w: 3.812, low52w: 2.984 },
  { country: 'AU', ticker: 'ACGB', yield10y: 4.287, change1d: -0.015, change1w: -0.028, change1m: 0.064, high52w: 4.612, low52w: 3.741 },
  { country: 'CN', ticker: 'CGB', yield10y: 1.721, change1d: 0.003, change1w: -0.011, change1m: -0.034, high52w: 2.301, low52w: 1.582 },
  { country: 'KR', ticker: 'KTB', yield10y: 2.841, change1d: -0.007, change1w: 0.014, change1m: 0.041, high52w: 3.241, low52w: 2.521 },
  { country: 'CH', ticker: 'CONF', yield10y: 0.542, change1d: -0.004, change1w: -0.008, change1m: 0.012, high52w: 0.891, low52w: 0.387 },
];

const FALLBACK_CURVE: CurvePoint[] = [
  { tenor: '1M', months: 1, yield: 5.341, change: -0.002 },
  { tenor: '3M', months: 3, yield: 5.297, change: -0.004 },
  { tenor: '6M', months: 6, yield: 5.102, change: -0.008 },
  { tenor: '1Y', months: 12, yield: 4.821, change: -0.014 },
  { tenor: '2Y', months: 24, yield: 4.612, change: -0.021 },
  { tenor: '3Y', months: 36, yield: 4.491, change: -0.019 },
  { tenor: '5Y', months: 60, yield: 4.387, change: -0.018 },
  { tenor: '7Y', months: 84, yield: 4.412, change: -0.016 },
  { tenor: '10Y', months: 120, yield: 4.452, change: -0.023 },
  { tenor: '20Y', months: 240, yield: 4.721, change: -0.014 },
  { tenor: '30Y', months: 360, yield: 4.612, change: -0.011 },
];

const FALLBACK_CURVE_SPREADS: CurveSpread[] = [
  { name: '2s10s', value: -16.0, change: -2.1 },
  { name: '2s30s', value: 0.0, change: -1.4 },
  { name: '5s30s', value: 22.5, change: 0.8 },
  { name: '3m10y', value: -84.5, change: -1.9 },
  { name: '2s5s', value: -22.5, change: 0.3 },
  { name: '10s30s', value: 16.0, change: 0.5 },
];

const FALLBACK_SOV_SPREADS: SovereignSpread[] = [
  { country: 'Germany (Bund)', spread: -200.5, change1d: 0.5, change1w: 1.6, rating: 'AAA' },
  { country: 'UK (Gilt)', spread: 12.9, change1d: 1.2, change1w: 7.1, rating: 'AA' },
  { country: 'Japan (JGB)', spread: -314.0, change1d: 3.1, change1w: 7.2, rating: 'A+' },
  { country: 'France (OAT)', spread: -121.1, change1d: 0.9, change1w: 2.9, rating: 'AA-' },
  { country: 'Italy (BTP)', spread: -74.0, change1d: 1.4, change1w: 4.1, rating: 'BBB' },
  { country: 'Spain (SPGB)', spread: -126.5, change1d: 1.1, change1w: 2.3, rating: 'A' },
  { country: 'Canada', spread: -103.1, change1d: 0.4, change1w: 0.7, rating: 'AAA' },
  { country: 'Australia', spread: -16.5, change1d: 0.8, change1w: 2.0, rating: 'AAA' },
  { country: 'China (CGB)', spread: -273.1, change1d: 2.6, change1w: 3.7, rating: 'A+' },
];

const FALLBACK_REAL_YIELDS: RealYield[] = [
  { country: 'US 10Y', nominal: 4.452, breakeven: 2.341, realYield: 2.111, change: -0.018 },
  { country: 'US 5Y', nominal: 4.387, breakeven: 2.412, realYield: 1.975, change: -0.014 },
  { country: 'US 30Y', nominal: 4.612, breakeven: 2.287, realYield: 2.325, change: -0.009 },
  { country: 'DE 10Y', nominal: 2.447, breakeven: 2.112, realYield: 0.335, change: -0.012 },
  { country: 'UK 10Y', nominal: 4.581, breakeven: 3.647, realYield: 0.934, change: 0.005 },
  { country: 'JP 10Y', nominal: 1.312, breakeven: 1.241, realYield: 0.071, change: 0.011 },
];

const FALLBACK_AUCTIONS: AuctionEntry[] = [
  { date: '2026-03-19', country: 'US', tenor: '20Y Bond', size: '$16B', coupon: 4.625, status: 'today', bidCover: 2.41, tailBps: 0.3 },
  { date: '2026-03-20', country: 'US', tenor: '10Y TIPS', size: '$18B', coupon: null, status: 'upcoming' },
  { date: '2026-03-20', country: 'DE', tenor: '10Y Bund', size: '\u20AC4B', coupon: 2.50, status: 'upcoming' },
  { date: '2026-03-21', country: 'JP', tenor: '20Y JGB', size: '\u00A51.1T', coupon: 1.90, status: 'upcoming' },
  { date: '2026-03-24', country: 'US', tenor: '2Y Note', size: '$69B', coupon: null, status: 'upcoming' },
  { date: '2026-03-25', country: 'US', tenor: '5Y Note', size: '$70B', coupon: null, status: 'upcoming' },
  { date: '2026-03-25', country: 'GB', tenor: '30Y Gilt', size: '\u00A32.5B', coupon: 4.375, status: 'upcoming' },
  { date: '2026-03-26', country: 'US', tenor: '7Y Note', size: '$44B', coupon: null, status: 'upcoming' },
  { date: '2026-03-18', country: 'US', tenor: '3M Bill', size: '$76B', coupon: null, status: 'completed', bidCover: 2.87, tailBps: 0.0 },
  { date: '2026-03-18', country: 'US', tenor: '6M Bill', size: '$68B', coupon: null, status: 'completed', bidCover: 2.74, tailBps: 0.1 },
];

// ── Formatting ──

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtYield(n: number): string {
  return n.toFixed(3);
}

// ── Color helpers (bond convention: falling = green, rising = red) ──

function yieldChangeColor(n: number): string {
  if (n < 0) return 'text-green-400';
  if (n > 0) return 'text-red-400';
  return 'text-amber-400';
}

function spreadChangeColor(n: number): string {
  if (n < 0) return 'text-green-400';
  if (n > 0) return 'text-red-400';
  return 'text-amber-400';
}

// ── Main Panel ──

export function SovereignYieldPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSovereignYield();
  const [activeTab, setActiveTab] = useState<Tab>('benchmark');

  const benchmarks: BenchmarkYield[] = data?.benchmarks ?? FALLBACK_BENCHMARKS;
  const curve: CurvePoint[] = data?.curve ?? FALLBACK_CURVE;
  const curveSpreads: CurveSpread[] = data?.curveSpreads ?? FALLBACK_CURVE_SPREADS;
  const sovSpreads: SovereignSpread[] = data?.sovereignSpreads ?? FALLBACK_SOV_SPREADS;
  const realYields: RealYield[] = data?.realYields ?? FALLBACK_REAL_YIELDS;
  const auctions: AuctionEntry[] = data?.auctions ?? FALLBACK_AUCTIONS;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'benchmark', label: tr(t, 'syTabBenchmark', '10Y Benchmarks') },
    { key: 'curve', label: tr(t, 'syTabCurve', 'US Curve') },
    { key: 'spreads', label: tr(t, 'syTabSpreads', 'Spreads') },
    { key: 'real', label: tr(t, 'syTabReal', 'Real Yields') },
    { key: 'auction', label: tr(t, 'syTabAuction', 'Auctions') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-indigo-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-indigo-400">
            {tr(t, 'syTitle', 'Sovereign Yield Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* UST 10Y quick badge */}
          <span className="px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/30">
            UST 10Y {fmtYield(benchmarks[0]?.yield10y ?? 4.452)}%
          </span>
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-indigo-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1 text-[8px] font-black font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab.key
                ? 'text-indigo-400 border-b border-indigo-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-indigo-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {activeTab === 'benchmark' && <BenchmarkSection benchmarks={benchmarks} t={t} />}
        {activeTab === 'curve' && <CurveSection curve={curve} spreads={curveSpreads} t={t} />}
        {activeTab === 'spreads' && <SpreadsSection sovSpreads={sovSpreads} t={t} />}
        {activeTab === 'real' && <RealYieldsSection realYields={realYields} t={t} />}
        {activeTab === 'auction' && <AuctionSection auctions={auctions} t={t} />}
      </div>
    </div>
  );
}

// ── Section: 10Y Benchmark Yields ──

function BenchmarkSection({
  benchmarks,
  t,
}: {
  benchmarks: BenchmarkYield[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      {/* Section label */}
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sy10YBenchmark', '10Y Benchmark Yields')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_40px_56px_48px_48px_48px_1fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'syCountry', 'Country')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'syTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'syYield', 'Yield')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sy1D', '1D')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sy1W', '1W')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sy1M', '1M')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'sy52W', '52W Range')}
        </span>
      </div>

      {/* Table rows */}
      {benchmarks.map((b, i) => (
        <div
          key={b.country}
          className={`grid grid-cols-[56px_40px_56px_48px_48px_48px_1fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors items-center ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[8px] font-mono font-bold text-white">{b.country}</span>
          <span className="text-[7px] font-mono text-neutral-500">{b.ticker}</span>
          <span className="text-[9px] font-mono font-bold text-indigo-300 text-right">
            {fmtYield(b.yield10y)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${yieldChangeColor(b.change1d)}`}>
            {fmtBps(b.change1d * 100)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${yieldChangeColor(b.change1w)}`}>
            {fmtBps(b.change1w * 100)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${yieldChangeColor(b.change1m)}`}>
            {fmtBps(b.change1m * 100)}
          </span>
          <div className="flex items-center gap-1 px-1">
            <span className="text-[6px] font-mono text-neutral-600 w-7 text-right">
              {b.low52w.toFixed(2)}
            </span>
            <RangeBar low={b.low52w} high={b.high52w} current={b.yield10y} />
            <span className="text-[6px] font-mono text-neutral-600 w-7">
              {b.high52w.toFixed(2)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RangeBar({ low, high, current }: { low: number; high: number; current: number }) {
  const pct = high > low ? Math.min(Math.max(((current - low) / (high - low)) * 100, 0), 100) : 50;
  return (
    <div className="flex-1 h-[3px] bg-neutral-800 relative">
      <div
        className="absolute left-0 top-0 h-full bg-indigo-500/40"
        style={{ width: `${pct}%` }}
      />
      <div
        className="absolute top-[-1px] w-[3px] h-[5px] bg-indigo-400"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

// ── Section: Yield Curves (US) ──

function CurveSection({
  curve,
  spreads,
  t,
}: {
  curve: CurvePoint[];
  spreads: CurveSpread[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      {/* Curve chart */}
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'syUSYieldCurve', 'US Treasury Yield Curve')}
        </span>
      </div>
      <div className="px-3 pt-3 pb-1 border-b border-border/20">
        <USTCurveChart curve={curve} />
      </div>

      {/* Curve table */}
      <div className="grid grid-cols-[48px_64px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'syTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'syYield', 'Yield')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'syChg', 'Chg (bp)')}
        </span>
      </div>
      {curve.map((pt, i) => (
        <div
          key={pt.tenor}
          className={`grid grid-cols-[48px_64px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors items-center ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[8px] font-mono font-bold text-white">{pt.tenor}</span>
          <span className="text-[9px] font-mono font-bold text-indigo-300 text-right">
            {fmtYield(pt.yield)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${yieldChangeColor(pt.change)}`}>
            {fmtBps(pt.change * 100)}
          </span>
        </div>
      ))}

      {/* Curve spreads */}
      <div className="px-3 py-1 border-b border-border/10 mt-0 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'syCurveSpreads', 'Curve Spreads (bp)')}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-px bg-border/10">
        {spreads.map((s) => (
          <div key={s.name} className="bg-black px-2 py-1.5 hover:bg-indigo-400/[0.02] transition-colors">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">{s.name}</div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-[11px] font-mono font-black ${s.value >= 0 ? 'text-white' : 'text-red-400'}`}>
                {s.value >= 0 ? '+' : ''}{s.value.toFixed(1)}
              </span>
              <span className={`text-[8px] font-mono font-bold ${spreadChangeColor(s.change)}`}>
                {s.change >= 0 ? '+' : ''}{s.change.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function USTCurveChart({ curve }: { curve: CurvePoint[] }) {
  const chart = useMemo(() => {
    if (curve.length < 2) return null;

    const W = 380;
    const H = 140;
    const PAD_L = 38;
    const PAD_R = 12;
    const PAD_T = 16;
    const PAD_B = 28;

    const yields = curve.map((c) => c.yield);
    const minY = Math.min(...yields) - 0.15;
    const maxY = Math.max(...yields) + 0.15;

    const maxMonth = Math.max(...curve.map((c) => c.months));
    const logScale = (months: number) => Math.log(months + 1) / Math.log(maxMonth + 1);

    const scaleX = (months: number) => PAD_L + logScale(months) * (W - PAD_L - PAD_R);
    const scaleY = (rate: number) => PAD_T + ((maxY - rate) / (maxY - minY)) * (H - PAD_T - PAD_B);

    const points = curve.map((c) => ({
      x: scaleX(c.months),
      y: scaleY(c.yield),
      data: c,
    }));

    // Smooth curve
    const tension = 0.3;
    let pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
      const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
      const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
      const cp2y = p2.y - (p3.y - p1.y) * tension / 3;
      pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    const fillPath = `${pathD} L ${points[points.length - 1].x},${H - PAD_B} L ${points[0].x},${H - PAD_B} Z`;

    const yRange = maxY - minY;
    const yStep = yRange > 2 ? 0.5 : yRange > 1 ? 0.25 : 0.1;
    const yTicks: number[] = [];
    for (let v = Math.ceil(minY / yStep) * yStep; v <= maxY; v += yStep) {
      yTicks.push(Math.round(v * 100) / 100);
    }

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, points, pathD, fillPath, yTicks, scaleY };
  }, [curve]);

  if (!chart) return null;
  const { W, H, PAD_L, PAD_R, PAD_B, points, pathD, fillPath, yTicks, scaleY } = chart;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
      <defs>
        <linearGradient id="sy-fill-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818cf8" stopOpacity={0.15} />
          <stop offset="100%" stopColor="#818cf8" stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {/* Y grid + labels */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PAD_L} y1={scaleY(v)} x2={W - PAD_R} y2={scaleY(v)}
            stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3"
          />
          <text
            x={PAD_L - 4} y={scaleY(v) + 3}
            textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace"
          >
            {v.toFixed(2)}
          </text>
        </g>
      ))}

      {/* X baseline */}
      <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="rgba(255,255,255,0.08)" />

      {/* Fill + line */}
      <path d={fillPath} fill="url(#sy-fill-grad)" />
      <path d={pathD} fill="none" stroke="#818cf8" strokeWidth={2} />

      {/* Points + labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={2.5} fill="#818cf8" />
          <text
            x={p.x} y={H - PAD_B + 12}
            textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={7} fontFamily="monospace"
          >
            {p.data.tenor}
          </text>
          <line
            x1={p.x} y1={H - PAD_B} x2={p.x} y2={H - PAD_B + 3}
            stroke="rgba(255,255,255,0.15)"
          />
        </g>
      ))}
    </svg>
  );
}

// ── Section: Sovereign Spreads vs UST ──

function SpreadsSection({
  sovSpreads,
  t,
}: {
  sovSpreads: SovereignSpread[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sySovSpreads', 'Sovereign Spreads vs UST 10Y (bp)')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_48px_48px_40px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'syCountry', 'Country')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sySpread', 'Spread')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sy1D', '1D')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sy1W', '1W')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'syRating', 'Rtg')}
        </span>
      </div>

      {sovSpreads.map((s, i) => (
        <div
          key={s.country}
          className={`grid grid-cols-[1fr_56px_48px_48px_40px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors items-center ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">{s.country}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${s.spread >= 0 ? 'text-red-400' : 'text-indigo-300'}`}>
            {s.spread >= 0 ? '+' : ''}{s.spread.toFixed(1)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadChangeColor(s.change1d)}`}>
            {fmtBps(s.change1d)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadChangeColor(s.change1w)}`}>
            {fmtBps(s.change1w)}
          </span>
          <span className="text-[7px] font-mono text-neutral-500 text-right">{s.rating}</span>
        </div>
      ))}

      {/* Visual spread chart */}
      <div className="px-3 py-2 border-t border-border/10">
        <SpreadBarChart spreads={sovSpreads} />
      </div>
    </div>
  );
}

function SpreadBarChart({ spreads }: { spreads: SovereignSpread[] }) {
  const W = 380;
  const H = 100;
  const PAD_L = 70;
  const PAD_R = 12;
  const PAD_T = 8;
  const PAD_B = 4;

  const allSpreads = spreads.map((s) => s.spread);
  const minS = Math.min(...allSpreads, 0);
  const maxS = Math.max(...allSpreads, 0);
  const range = maxS - minS || 1;

  const barH = (H - PAD_T - PAD_B) / spreads.length;
  const scaleX = (v: number) => PAD_L + ((v - minS) / range) * (W - PAD_L - PAD_R);
  const zeroX = scaleX(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 110 }}>
      {/* Zero line */}
      <line x1={zeroX} y1={PAD_T} x2={zeroX} y2={H - PAD_B} stroke="rgba(255,255,255,0.1)" />

      {spreads.map((s, i) => {
        const y = PAD_T + i * barH;
        const barX = s.spread >= 0 ? zeroX : scaleX(s.spread);
        const barW = Math.abs(scaleX(s.spread) - zeroX);
        const color = s.spread >= 0 ? 'rgba(248,113,113,0.5)' : 'rgba(129,140,248,0.5)';

        return (
          <g key={s.country}>
            <text
              x={PAD_L - 4} y={y + barH / 2 + 3}
              textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize={7} fontFamily="monospace"
            >
              {s.country.split('(')[0].trim().slice(0, 8)}
            </text>
            <rect x={barX} y={y + 1} width={Math.max(barW, 1)} height={barH - 2} fill={color} />
            <text
              x={scaleX(s.spread) + (s.spread >= 0 ? 3 : -3)}
              y={y + barH / 2 + 3}
              textAnchor={s.spread >= 0 ? 'start' : 'end'}
              fill="rgba(255,255,255,0.5)"
              fontSize={6}
              fontFamily="monospace"
            >
              {s.spread.toFixed(0)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Section: Real Yields ──

function RealYieldsSection({
  realYields,
  t,
}: {
  realYields: RealYield[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'syRealYields', 'Real Yields (TIPS-Implied)')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[80px_56px_56px_56px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'syInstrument', 'Instrument')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'syNominal', 'Nominal')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'syBreakeven', 'BEI')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'syReal', 'Real')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'syChg', 'Chg')}
        </span>
      </div>

      {realYields.map((ry, i) => (
        <div
          key={ry.country}
          className={`grid grid-cols-[80px_56px_56px_56px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors items-center ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[8px] font-mono font-bold text-white">{ry.country}</span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">
            {fmtYield(ry.nominal)}%
          </span>
          <span className="text-[9px] font-mono text-amber-400/70 text-right">
            {fmtYield(ry.breakeven)}%
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${ry.realYield >= 0 ? 'text-indigo-300' : 'text-red-400'}`}>
            {fmtYield(ry.realYield)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${yieldChangeColor(ry.change)}`}>
            {fmtBps(ry.change * 100)}
          </span>
        </div>
      ))}

      {/* Real yield visual summary */}
      <div className="px-3 py-2 border-t border-border/10">
        <div className="grid grid-cols-3 gap-3">
          {realYields.filter((ry) => ry.country.startsWith('US')).map((ry) => (
            <div key={ry.country} className="bg-[#050505] border border-border/20 px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">{ry.country}</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className={`text-[12px] font-mono font-black ${ry.realYield >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>
                  {ry.realYield >= 0 ? '+' : ''}{ry.realYield.toFixed(2)}%
                </span>
                <span className="text-[7px] font-mono text-neutral-600">REAL</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[7px] font-mono text-neutral-500">
                  N:{ry.nominal.toFixed(2)}
                </span>
                <span className="text-[7px] font-mono text-amber-400/60">
                  BEI:{ry.breakeven.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Section: Auction Calendar ──

function AuctionSection({
  auctions,
  t,
}: {
  auctions: AuctionEntry[];
  t: ReturnType<typeof useT>;
}) {
  const upcoming = auctions.filter((a) => a.status === 'upcoming' || a.status === 'today');
  const completed = auctions.filter((a) => a.status === 'completed');

  return (
    <div>
      {/* Upcoming */}
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'syUpcoming', 'Upcoming Auctions')}
        </span>
      </div>

      <div className="grid grid-cols-[64px_28px_72px_48px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'syDate', 'Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'syCtry', 'Ctry')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'syTenorAuction', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sySize', 'Size')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'syStatus', 'Status')}
        </span>
      </div>

      {upcoming.map((a, i) => (
        <div
          key={`${a.date}-${a.country}-${a.tenor}`}
          className={`grid grid-cols-[64px_28px_72px_48px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors items-center ${
            a.status === 'today' ? 'bg-indigo-500/[0.04]' : i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[8px] font-mono text-neutral-400">{a.date.slice(5)}</span>
          <span className="text-[8px] font-mono font-bold text-white">{a.country}</span>
          <span className="text-[8px] font-mono text-neutral-300 truncate">{a.tenor}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{a.size}</span>
          <div className="flex justify-center">
            {a.status === 'today' ? (
              <span className="px-1 py-px text-[6px] font-mono font-black uppercase text-amber-400 bg-amber-500/15 border border-amber-500/30">
                TODAY
              </span>
            ) : (
              <span className="px-1 py-px text-[6px] font-mono font-black uppercase text-neutral-500 bg-neutral-500/10 border border-neutral-500/30">
                SCHED
              </span>
            )}
          </div>
        </div>
      ))}

      {/* Recent results */}
      {completed.length > 0 && (
        <>
          <div className="px-3 py-1 border-b border-border/10 bg-[#030303] mt-0">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'syRecentResults', 'Recent Auction Results')}
            </span>
          </div>

          <div className="grid grid-cols-[64px_28px_72px_48px_44px_44px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'syDate', 'Date')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'syCtry', 'Ctry')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'syTenorAuction', 'Tenor')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'sySize', 'Size')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'syBidCover', 'B/C')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'syTail', 'Tail')}
            </span>
          </div>

          {completed.map((a, i) => (
            <div
              key={`${a.date}-${a.country}-${a.tenor}`}
              className={`grid grid-cols-[64px_28px_72px_48px_44px_44px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors items-center ${
                i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
              }`}
            >
              <span className="text-[8px] font-mono text-neutral-400">{a.date.slice(5)}</span>
              <span className="text-[8px] font-mono font-bold text-white">{a.country}</span>
              <span className="text-[8px] font-mono text-neutral-300 truncate">{a.tenor}</span>
              <span className="text-[8px] font-mono text-neutral-400 text-right">{a.size}</span>
              <span className={`text-[8px] font-mono font-bold text-right ${
                (a.bidCover ?? 0) >= 2.5 ? 'text-green-400' : (a.bidCover ?? 0) >= 2.0 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {a.bidCover?.toFixed(2) ?? '--'}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${
                (a.tailBps ?? 0) <= 0.5 ? 'text-green-400' : (a.tailBps ?? 0) <= 1.5 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {a.tailBps != null ? `${a.tailBps.toFixed(1)}bp` : '--'}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
