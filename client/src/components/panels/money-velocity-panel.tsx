import { useState } from 'react';
import { useMoneyVelocity } from '../../api/hooks/use-money-velocity';
import { RefreshCw } from 'lucide-react';

// ── Types ──

type CountryCode = 'US' | 'EU' | 'UK' | 'JP' | 'CN' | 'CA';

interface VelocityData {
  m1Velocity: number;
  m1Trend: 'rising' | 'falling' | 'flat';
  m2Velocity: number;
  m2Trend: 'rising' | 'falling' | 'flat';
  historicalQuarters: number[];
}

interface MoneySupplyRow {
  label: string;
  value: string;
  yoyGrowth: number;
  momGrowth: number;
}

interface CentralBankBS {
  size: string;
  changeYtd: string;
  changeYtdPct: number;
  pctOfGdp: number;
}

interface CreditGrowthRow {
  label: string;
  value: number;
}

interface MoneyMultiplier {
  multiplier: number;
  reserveRatio: number;
  excessReserves: string;
}

interface InflationLink {
  cpi: number;
  ppi: number;
  moneyGrowthLag: string;
}

interface CountryData {
  code: CountryCode;
  name: string;
  velocity: VelocityData;
  moneySupply: MoneySupplyRow[];
  centralBank: CentralBankBS;
  creditGrowth: CreditGrowthRow[];
  multiplier: MoneyMultiplier;
  inflation: InflationLink;
  regime: 'expanding' | 'contracting' | 'neutral';
}

interface MoneyVelocityPayload {
  countries: CountryData[];
  globalLiquidity: string;
  globalLiquidityChange: number;
  timestamp: string;
}

// ── Fallback mock data ──

const COUNTRY_TABS: { code: CountryCode; label: string }[] = [
  { code: 'US', label: 'US' },
  { code: 'EU', label: 'EU' },
  { code: 'UK', label: 'UK' },
  { code: 'JP', label: 'JP' },
  { code: 'CN', label: 'CN' },
  { code: 'CA', label: 'CA' },
];

const MOCK_DATA: MoneyVelocityPayload = {
  globalLiquidity: '$96.4T',
  globalLiquidityChange: 2.8,
  timestamp: new Date().toISOString(),
  countries: [
    {
      code: 'US', name: 'United States',
      velocity: { m1Velocity: 1.26, m1Trend: 'falling', m2Velocity: 1.06, m2Trend: 'flat', historicalQuarters: [1.28, 1.27, 1.27, 1.26, 1.25, 1.26, 1.26, 1.26] },
      moneySupply: [
        { label: 'M0', value: '$5.47T', yoyGrowth: -1.2, momGrowth: -0.1 },
        { label: 'M1', value: '$17.96T', yoyGrowth: -2.4, momGrowth: -0.3 },
        { label: 'M2', value: '$21.72T', yoyGrowth: 3.8, momGrowth: 0.4 },
        { label: 'M3', value: '$23.14T', yoyGrowth: 4.1, momGrowth: 0.5 },
      ],
      centralBank: { size: '$7.36T', changeYtd: '-$420B', changeYtdPct: -5.4, pctOfGdp: 25.8 },
      creditGrowth: [
        { label: 'Total', value: 3.6 },
        { label: 'Household', value: 2.8 },
        { label: 'Corporate', value: 4.3 },
        { label: 'Government', value: 6.1 },
      ],
      multiplier: { multiplier: 3.97, reserveRatio: 10.2, excessReserves: '$3.21T' },
      inflation: { cpi: 2.8, ppi: 1.9, moneyGrowthLag: '12-18 mo' },
      regime: 'expanding',
    },
    {
      code: 'EU', name: 'Eurozone',
      velocity: { m1Velocity: 0.98, m1Trend: 'rising', m2Velocity: 0.82, m2Trend: 'rising', historicalQuarters: [0.92, 0.93, 0.94, 0.95, 0.96, 0.96, 0.97, 0.98] },
      moneySupply: [
        { label: 'M0', value: '€4.82T', yoyGrowth: -3.8, momGrowth: -0.4 },
        { label: 'M1', value: '€10.12T', yoyGrowth: -1.5, momGrowth: 0.1 },
        { label: 'M2', value: '€15.87T', yoyGrowth: 1.4, momGrowth: 0.2 },
        { label: 'M3', value: '€16.43T', yoyGrowth: 1.9, momGrowth: 0.3 },
      ],
      centralBank: { size: '€6.57T', changeYtd: '-€380B', changeYtdPct: -5.5, pctOfGdp: 44.7 },
      creditGrowth: [
        { label: 'Total', value: 1.2 },
        { label: 'Household', value: 0.8 },
        { label: 'Corporate', value: 0.6 },
        { label: 'Government', value: 3.4 },
      ],
      multiplier: { multiplier: 3.31, reserveRatio: 8.4, excessReserves: '€3.72T' },
      inflation: { cpi: 2.4, ppi: -0.3, moneyGrowthLag: '12-18 mo' },
      regime: 'neutral',
    },
    {
      code: 'UK', name: 'United Kingdom',
      velocity: { m1Velocity: 1.14, m1Trend: 'falling', m2Velocity: 0.91, m2Trend: 'flat', historicalQuarters: [1.18, 1.17, 1.16, 1.15, 1.15, 1.14, 1.14, 1.14] },
      moneySupply: [
        { label: 'M0', value: '£97.2B', yoyGrowth: -4.1, momGrowth: -0.5 },
        { label: 'M1', value: '£2.18T', yoyGrowth: -3.4, momGrowth: -0.4 },
        { label: 'M2', value: '£3.07T', yoyGrowth: -0.3, momGrowth: 0.1 },
        { label: 'M3', value: '£3.24T', yoyGrowth: 0.4, momGrowth: 0.1 },
      ],
      centralBank: { size: '£843B', changeYtd: '-£62B', changeYtdPct: -6.9, pctOfGdp: 29.4 },
      creditGrowth: [
        { label: 'Total', value: -0.3 },
        { label: 'Household', value: 0.9 },
        { label: 'Corporate', value: -2.1 },
        { label: 'Government', value: 4.7 },
      ],
      multiplier: { multiplier: 3.52, reserveRatio: 12.1, excessReserves: '£762B' },
      inflation: { cpi: 3.1, ppi: 0.8, moneyGrowthLag: '12-18 mo' },
      regime: 'contracting',
    },
    {
      code: 'JP', name: 'Japan',
      velocity: { m1Velocity: 0.54, m1Trend: 'flat', m2Velocity: 0.48, m2Trend: 'flat', historicalQuarters: [0.54, 0.54, 0.53, 0.53, 0.54, 0.54, 0.54, 0.54] },
      moneySupply: [
        { label: 'M0', value: '¥673T', yoyGrowth: -2.1, momGrowth: -0.2 },
        { label: 'M1', value: '¥1,082T', yoyGrowth: 0.4, momGrowth: 0.1 },
        { label: 'M2', value: '¥1,237T', yoyGrowth: 2.1, momGrowth: 0.2 },
        { label: 'M3', value: '¥1,541T', yoyGrowth: 2.5, momGrowth: 0.3 },
      ],
      centralBank: { size: '¥741T', changeYtd: '-¥12T', changeYtdPct: -1.6, pctOfGdp: 127.4 },
      creditGrowth: [
        { label: 'Total', value: 2.8 },
        { label: 'Household', value: 1.4 },
        { label: 'Corporate', value: 3.6 },
        { label: 'Government', value: 4.2 },
      ],
      multiplier: { multiplier: 1.84, reserveRatio: 4.2, excessReserves: '¥531T' },
      inflation: { cpi: 2.6, ppi: 0.7, moneyGrowthLag: '18-24 mo' },
      regime: 'neutral',
    },
    {
      code: 'CN', name: 'China',
      velocity: { m1Velocity: 0.42, m1Trend: 'rising', m2Velocity: 0.38, m2Trend: 'rising', historicalQuarters: [0.38, 0.39, 0.39, 0.40, 0.40, 0.41, 0.41, 0.42] },
      moneySupply: [
        { label: 'M0', value: '¥11.8T', yoyGrowth: 8.2, momGrowth: 0.9 },
        { label: 'M1', value: '¥68.1T', yoyGrowth: 5.3, momGrowth: 0.6 },
        { label: 'M2', value: '¥304.2T', yoyGrowth: 8.7, momGrowth: 0.8 },
        { label: 'M3', value: '¥328.6T', yoyGrowth: 9.2, momGrowth: 0.9 },
      ],
      centralBank: { size: '¥44.7T', changeYtd: '+¥2.1T', changeYtdPct: 4.9, pctOfGdp: 34.8 },
      creditGrowth: [
        { label: 'Total', value: 9.8 },
        { label: 'Household', value: 4.2 },
        { label: 'Corporate', value: 12.4 },
        { label: 'Government', value: 14.7 },
      ],
      multiplier: { multiplier: 7.14, reserveRatio: 7.0, excessReserves: '¥5.8T' },
      inflation: { cpi: 0.4, ppi: -1.8, moneyGrowthLag: '6-12 mo' },
      regime: 'expanding',
    },
    {
      code: 'CA', name: 'Canada',
      velocity: { m1Velocity: 1.08, m1Trend: 'falling', m2Velocity: 0.86, m2Trend: 'flat', historicalQuarters: [1.12, 1.11, 1.10, 1.10, 1.09, 1.09, 1.08, 1.08] },
      moneySupply: [
        { label: 'M0', value: 'C$114B', yoyGrowth: -5.3, momGrowth: -0.6 },
        { label: 'M1', value: 'C$1.42T', yoyGrowth: -1.8, momGrowth: -0.2 },
        { label: 'M2', value: 'C$2.38T', yoyGrowth: 1.5, momGrowth: 0.2 },
        { label: 'M3', value: 'C$2.71T', yoyGrowth: 2.3, momGrowth: 0.3 },
      ],
      centralBank: { size: 'C$276B', changeYtd: '-C$42B', changeYtdPct: -13.2, pctOfGdp: 10.4 },
      creditGrowth: [
        { label: 'Total', value: 1.5 },
        { label: 'Household', value: 3.1 },
        { label: 'Corporate', value: -0.4 },
        { label: 'Government', value: 5.2 },
      ],
      multiplier: { multiplier: 8.71, reserveRatio: 2.1, excessReserves: 'C$128B' },
      inflation: { cpi: 2.9, ppi: 1.2, moneyGrowthLag: '12-18 mo' },
      regime: 'contracting',
    },
  ],
};

// ── Format helpers ──

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function growthColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function trendArrow(trend: 'rising' | 'falling' | 'flat'): { symbol: string; color: string } {
  if (trend === 'rising') return { symbol: '\u2191', color: 'text-green-400' };
  if (trend === 'falling') return { symbol: '\u2193', color: 'text-red-400' };
  return { symbol: '\u2192', color: 'text-amber-400' };
}

function regimeColor(regime: string): string {
  if (regime === 'expanding') return 'text-green-400';
  if (regime === 'contracting') return 'text-red-400';
  return 'text-amber-400';
}

function regimeBg(regime: string): string {
  if (regime === 'expanding') return 'bg-green-500/10 border border-green-500/30';
  if (regime === 'contracting') return 'bg-red-500/10 border border-red-500/30';
  return 'bg-amber-500/10 border border-amber-500/30';
}

function regimeLabel(regime: string): string {
  if (regime === 'expanding') return 'EXPANDING';
  if (regime === 'contracting') return 'CONTRACTING';
  return 'NEUTRAL';
}

// ── Velocity Sparkline (bar grid) ──

function VelocitySparkline({ quarters }: { quarters: number[] }) {
  const min = Math.min(...quarters);
  const max = Math.max(...quarters);
  const range = max - min || 0.01;

  return (
    <div className="flex items-end gap-px h-5">
      {quarters.map((q, i) => {
        const pct = ((q - min) / range) * 100;
        const height = Math.max(pct, 8);
        const isLast = i === quarters.length - 1;
        return (
          <div
            key={i}
            className={`w-2.5 ${isLast ? 'bg-purple-400/70' : 'bg-purple-400/20'}`}
            style={{ height: `${height}%` }}
            title={`Q${i + 1}: ${q.toFixed(2)}`}
          />
        );
      })}
    </div>
  );
}

// ── Credit growth bar ──

function CreditBar({ value, maxAbs }: { value: number; maxAbs: number }) {
  const pct = maxAbs > 0 ? Math.min(Math.abs(value) / maxAbs * 100, 100) : 0;
  const color = value > 0 ? 'bg-purple-400/40' : 'bg-red-400/40';

  return (
    <div className="w-full h-1.5 bg-white/[0.03] overflow-hidden">
      <div
        className={`h-full ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Section: Velocity ──

function VelocitySection({ velocity }: { velocity: VelocityData }) {
  const m1Arrow = trendArrow(velocity.m1Trend);
  const m2Arrow = trendArrow(velocity.m2Trend);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          VELOCITY OF MONEY
        </span>
      </div>

      <div className="px-3 py-1.5 flex items-center gap-4">
        {/* M1 Velocity */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">M1 VELOCITY</span>
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-mono font-black text-white">{velocity.m1Velocity.toFixed(2)}</span>
            <span className={`text-[8px] ${m1Arrow.color}`}>{m1Arrow.symbol}</span>
          </div>
        </div>

        {/* M2 Velocity */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">M2 VELOCITY</span>
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-mono font-black text-white">{velocity.m2Velocity.toFixed(2)}</span>
            <span className={`text-[8px] ${m2Arrow.color}`}>{m2Arrow.symbol}</span>
          </div>
        </div>

        {/* Sparkline */}
        <div className="flex-1 flex flex-col gap-0.5 items-end">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">LAST 8 QUARTERS</span>
          <VelocitySparkline quarters={velocity.historicalQuarters} />
        </div>
      </div>
    </div>
  );
}

// ── Section: Money Supply Table ──

function MoneySupplyTable({ rows }: { rows: MoneySupplyRow[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          MONEY SUPPLY
        </span>
      </div>

      <div className="grid grid-cols-[40px_1fr_60px_60px] gap-px px-2 py-0.5 border-b border-border/10">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">AGG</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider text-right">VALUE</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider text-right">YOY</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider text-right">MOM</span>
      </div>

      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[40px_1fr_60px_60px] gap-px px-2 py-0.5 border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono font-black text-purple-400">{row.label}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{row.value}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${growthColor(row.yoyGrowth)}`}>
            {fmtPct(row.yoyGrowth)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${growthColor(row.momGrowth)}`}>
            {fmtPct(row.momGrowth)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section: Central Bank Balance Sheet ──

function CentralBankSection({ bs }: { bs: CentralBankBS }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          CENTRAL BANK BALANCE SHEET
        </span>
      </div>

      <div className="px-3 py-1.5 grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">SIZE</span>
          <span className="text-[10px] font-mono font-black text-white">{bs.size}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">CHG YTD</span>
          <div className="flex items-center gap-1">
            <span className={`text-[9px] font-mono font-bold ${growthColor(bs.changeYtdPct)}`}>{bs.changeYtd}</span>
            <span className={`text-[7px] font-mono ${growthColor(bs.changeYtdPct)}`}>({fmtPct(bs.changeYtdPct)})</span>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">% OF GDP</span>
          <span className="text-[10px] font-mono font-black text-purple-400">{bs.pctOfGdp.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

// ── Section: Credit Growth ──

function CreditGrowthSection({ rows }: { rows: CreditGrowthRow[] }) {
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.value)), 1);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          CREDIT GROWTH (YOY%)
        </span>
      </div>

      {rows.map((row) => (
        <div
          key={row.label}
          className="px-3 py-0.5 flex items-center gap-2 border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors"
        >
          <span className="text-[7px] font-mono text-neutral-500 uppercase w-16 shrink-0">{row.label}</span>
          <div className="flex-1">
            <CreditBar value={row.value} maxAbs={maxAbs} />
          </div>
          <span className={`text-[8px] font-mono font-bold w-12 text-right shrink-0 ${growthColor(row.value)}`}>
            {fmtPct(row.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section: Money Multiplier ──

function MultiplierSection({ data }: { data: MoneyMultiplier }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          MONEY MULTIPLIER
        </span>
      </div>

      <div className="px-3 py-1.5 grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">MULTIPLIER</span>
          <span className="text-[10px] font-mono font-black text-white">{data.multiplier.toFixed(2)}x</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">RESERVE RATIO</span>
          <span className="text-[10px] font-mono font-bold text-neutral-400">{data.reserveRatio.toFixed(1)}%</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">EXCESS RESERVES</span>
          <span className="text-[9px] font-mono font-bold text-neutral-400">{data.excessReserves}</span>
        </div>
      </div>
    </div>
  );
}

// ── Section: Inflation Link ──

function InflationSection({ data }: { data: InflationLink }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          INFLATION LINK
        </span>
      </div>

      <div className="px-3 py-1.5 grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">CPI YOY</span>
          <span className={`text-[10px] font-mono font-black ${data.cpi > 3 ? 'text-red-400' : data.cpi > 2 ? 'text-amber-400' : 'text-green-400'}`}>
            {data.cpi.toFixed(1)}%
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">PPI YOY</span>
          <span className={`text-[10px] font-mono font-bold ${data.ppi > 3 ? 'text-red-400' : data.ppi > 1 ? 'text-amber-400' : 'text-green-400'}`}>
            {data.ppi.toFixed(1)}%
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">M2-CPI LAG</span>
          <span className="text-[9px] font-mono font-bold text-purple-400">{data.moneyGrowthLag}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function MoneyVelocityPanel() {
  const { data: hookData, isLoading, refetch } = useMoneyVelocity();
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('US');

  const payload: MoneyVelocityPayload = (hookData as MoneyVelocityPayload) ?? MOCK_DATA;
  const country = payload.countries?.find((c) => c.code === selectedCountry)
    ?? payload.countries?.[0];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-purple-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-purple-400">
            MONEY VELOCITY &amp; SUPPLY
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-mono text-neutral-600">GLOBAL LIQ:</span>
          <span className="text-[8px] font-mono font-bold text-white">{payload.globalLiquidity}</span>
          <span className={`text-[7px] font-mono font-bold ${growthColor(payload.globalLiquidityChange)}`}>
            {fmtPct(payload.globalLiquidityChange)}
          </span>
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-purple-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Country Tabs */}
      <div className="flex items-center border-b border-border/20 shrink-0">
        {COUNTRY_TABS.map((tab) => (
          <button
            key={tab.code}
            onClick={() => setSelectedCountry(tab.code)}
            className={`flex-1 py-1 text-[8px] font-black font-mono uppercase tracking-wider transition-colors ${
              selectedCountry === tab.code
                ? 'text-purple-400 border-b border-purple-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading && !hookData ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest animate-pulse">
              Loading...
            </span>
          </div>
        ) : !country ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[9px] font-mono text-neutral-500 uppercase">No data available</span>
          </div>
        ) : (
          <>
            {/* Regime Indicator */}
            <div className="px-3 py-1.5 border-b border-border/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-mono text-neutral-600 uppercase">
                  {country.name}
                </span>
                <span className="text-[7px] font-mono text-neutral-700">MONETARY REGIME</span>
              </div>
              <span className={`text-[7px] font-black font-mono uppercase px-1.5 py-0.5 ${regimeColor(country.regime)} ${regimeBg(country.regime)}`}>
                {regimeLabel(country.regime)}
              </span>
            </div>

            <VelocitySection velocity={country.velocity} />
            <MoneySupplyTable rows={country.moneySupply} />
            <CentralBankSection bs={country.centralBank} />
            <CreditGrowthSection rows={country.creditGrowth} />
            <MultiplierSection data={country.multiplier} />
            <InflationSection data={country.inflation} />

            {/* Footer timestamp */}
            <div className="px-3 py-1.5 border-t border-border/10">
              <span className="text-[7px] font-mono text-neutral-700">
                Last update: {new Date(payload.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
