import { useCommoditySpreads } from '../../api/hooks/use-commodity-spreads';
import { useT, tr, TFn } from '../../i18n';

// ── Formatting helpers ──

function fmtNum(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function fmtSign(n: number, decimals = 2): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}`;
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function structureLabel(s: string): { label: string; color: string } {
  if (s === 'contango') return { label: 'CONTANGO', color: 'text-red-400' };
  if (s === 'backwardation') return { label: 'BACKWDN', color: 'text-green-400' };
  return { label: 'FLAT', color: 'text-neutral-500' };
}

function percentileColor(p: number): string {
  if (p >= 80) return 'text-red-400';
  if (p >= 60) return 'text-amber-400';
  if (p <= 20) return 'text-green-400';
  if (p <= 40) return 'text-blue-400';
  return 'text-neutral-400';
}

function zScoreColor(z: number): string {
  if (z >= 2) return 'text-red-400';
  if (z >= 1) return 'text-amber-400';
  if (z <= -2) return 'text-green-400';
  if (z <= -1) return 'text-blue-400';
  return 'text-neutral-400';
}

// ── Mock data types / shapes ──

interface CalendarSpread {
  commodity: string;
  front: number;
  secondMonth: number;
  spread: number;
  structure: string;
}

interface CrackSpread {
  type: string;
  value: number;
  change: number;
  avg1m: number;
  percentile: number;
}

interface CrushSpread {
  type: string;
  value: number;
  change: number;
  avg1m: number;
  percentile: number;
}

interface InterCommoditySpread {
  name: string;
  value: number;
  historicalAvg: number;
  zScore: number;
}

// ── Fallback data ──

const CALENDAR_SPREADS: CalendarSpread[] = [
  { commodity: 'WTI CRUDE', front: 78.42, secondMonth: 77.85, spread: 0.57, structure: 'backwardation' },
  { commodity: 'BRENT CRUDE', front: 82.15, secondMonth: 81.72, spread: 0.43, structure: 'backwardation' },
  { commodity: 'NATURAL GAS', front: 2.34, secondMonth: 2.51, spread: -0.17, structure: 'contango' },
  { commodity: 'GOLD', front: 2045.60, secondMonth: 2052.30, spread: -6.70, structure: 'contango' },
  { commodity: 'SILVER', front: 23.18, secondMonth: 23.42, spread: -0.24, structure: 'contango' },
  { commodity: 'COPPER', front: 3.8450, secondMonth: 3.8620, spread: -0.0170, structure: 'contango' },
  { commodity: 'CORN', front: 4.52, secondMonth: 4.61, spread: -0.09, structure: 'contango' },
  { commodity: 'SOYBEANS', front: 12.38, secondMonth: 12.22, spread: 0.16, structure: 'backwardation' },
  { commodity: 'WHEAT', front: 5.89, secondMonth: 6.02, spread: -0.13, structure: 'contango' },
];

const CRACK_SPREADS: CrackSpread[] = [
  { type: '3-2-1 CRACK', value: 28.45, change: 1.23, avg1m: 26.80, percentile: 72 },
  { type: '5-3-2 CRACK', value: 24.12, change: -0.87, avg1m: 25.10, percentile: 45 },
  { type: 'GASOLINE CRACK', value: 32.18, change: 2.05, avg1m: 29.40, percentile: 85 },
  { type: 'HEATING OIL CRACK', value: 22.76, change: -1.42, avg1m: 24.30, percentile: 35 },
  { type: 'RBOB-BRENT', value: 26.33, change: 0.65, avg1m: 25.80, percentile: 58 },
];

const CRUSH_SPREADS: CrushSpread[] = [
  { type: 'SOY CRUSH', value: 1.82, change: 0.04, avg1m: 1.75, percentile: 68 },
  { type: 'CORN CRUSH (ETHANOL)', value: 0.45, change: -0.02, avg1m: 0.48, percentile: 32 },
  { type: 'WHEAT CRUSH (FLOUR)', value: 2.15, change: 0.08, avg1m: 2.05, percentile: 74 },
];

const INTER_COMMODITY_SPREADS: InterCommoditySpread[] = [
  { name: 'GOLD/SILVER RATIO', value: 88.24, historicalAvg: 80.50, zScore: 1.42 },
  { name: 'BRENT-WTI SPREAD', value: 3.73, historicalAvg: 4.20, zScore: -0.85 },
  { name: 'CORN/WHEAT RATIO', value: 0.767, historicalAvg: 0.810, zScore: -0.92 },
  { name: 'PLAT/GOLD SPREAD', value: -1082.40, historicalAvg: -850.00, zScore: -1.68 },
  { name: 'HO-RBOB SPREAD', value: -9.42, historicalAvg: -5.30, zScore: -1.24 },
  { name: 'COPPER/GOLD RATIO', value: 0.00188, historicalAvg: 0.00210, zScore: -1.05 },
];

// ── Main Panel ──

export function CommoditySpreadsPanel() {
  const t = useT();
  const { data, isLoading } = useCommoditySpreads();

  const calendarSpreads: CalendarSpread[] = data?.calendarSpreads ?? CALENDAR_SPREADS;
  const crackSpreads: CrackSpread[] = data?.crackSpreads ?? CRACK_SPREADS;
  const crushSpreads: CrushSpread[] = data?.crushSpreads ?? CRUSH_SPREADS;
  const interCommoditySpreads: InterCommoditySpread[] = data?.interCommoditySpreads ?? INTER_COMMODITY_SPREADS;

  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col bg-black">
        <Header t={t} />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-amber-400 uppercase tracking-wider animate-pulse">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <Header t={t} />

      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Calendar Spreads */}
        <CalendarSpreadsSection spreads={calendarSpreads} t={t} />

        {/* Crack Spreads */}
        <ProcessingSpreadsSection
          title={tr(t, 'csCrackSpreads', 'CRACK SPREADS')}
          spreads={crackSpreads}
        />

        {/* Crush Spreads */}
        <ProcessingSpreadsSection
          title={tr(t, 'csCrushSpreads', 'CRUSH SPREADS')}
          spreads={crushSpreads}
        />

        {/* Inter-Commodity Spreads */}
        <InterCommoditySpreadsSection spreads={interCommoditySpreads} t={t} />
      </div>
    </div>
  );
}

// ── Header ──

function Header({ t }: { t: ReturnType<typeof useT> }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
      <div className="w-0.5 h-3 bg-amber-400" />
      <span className="text-[9px] font-mono font-black uppercase tracking-wider text-amber-400">
        {tr(t, 'csCommoditySpreads', 'COMMODITY SPREADS')}
      </span>
    </div>
  );
}

// ── Calendar Spreads Section ──

function CalendarSpreadsSection({
  spreads,
  t,
}: {
  spreads: CalendarSpread[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'csCalendarSpreads', 'CALENDAR SPREADS')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_64px_64px_56px_72px] gap-0 px-3 py-0.5 border-b border-border/20 bg-[#020202]">
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-600">
          COMMODITY
        </span>
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-600 text-right">
          FRONT
        </span>
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-600 text-right">
          2ND MTH
        </span>
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-600 text-right">
          SPREAD
        </span>
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-600 text-right">
          STRUCTURE
        </span>
      </div>

      {spreads.map((s) => {
        const struc = structureLabel(s.structure);
        return (
          <div
            key={s.commodity}
            className="grid grid-cols-[1fr_64px_64px_56px_72px] gap-0 px-3 py-[3px] border-b border-border/20 hover:bg-amber-400/[0.02] transition-colors items-center"
          >
            <span className="text-[9px] font-mono font-bold text-white truncate">
              {s.commodity}
            </span>
            <span className="text-[9px] font-mono text-white text-right">
              {fmtNum(s.front)}
            </span>
            <span className="text-[9px] font-mono text-white text-right">
              {fmtNum(s.secondMonth)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${changeColor(s.spread)}`}>
              {fmtSign(s.spread)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${struc.color}`}>
              {struc.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Crack / Crush Spreads Section (shared layout) ──

function ProcessingSpreadsSection({
  title,
  spreads,
}: {
  title: string;
  spreads: (CrackSpread | CrushSpread)[];
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-500">
          {title}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_56px_56px_56px_48px] gap-0 px-3 py-0.5 border-b border-border/20 bg-[#020202]">
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-600">
          TYPE
        </span>
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-600 text-right">
          VALUE
        </span>
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-600 text-right">
          CHG
        </span>
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-600 text-right">
          1M AVG
        </span>
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-600 text-right">
          PCTL
        </span>
      </div>

      {spreads.map((s) => (
        <div
          key={s.type}
          className="grid grid-cols-[1fr_56px_56px_56px_48px] gap-0 px-3 py-[3px] border-b border-border/20 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[9px] font-mono font-bold text-white truncate">
            {s.type}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {fmtNum(s.value)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(s.change)}`}>
            {fmtSign(s.change)}
          </span>
          <span className="text-[9px] font-mono text-neutral-500 text-right">
            {fmtNum(s.avg1m)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${percentileColor(s.percentile)}`}>
            {s.percentile}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Inter-Commodity Spreads Section ──

function InterCommoditySpreadsSection({
  spreads,
  t,
}: {
  spreads: InterCommoditySpread[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'csInterCommodity', 'INTER-COMMODITY')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_64px_64px_48px] gap-0 px-3 py-0.5 border-b border-border/20 bg-[#020202]">
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-600">
          RATIO / SPREAD
        </span>
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-600 text-right">
          VALUE
        </span>
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-600 text-right">
          HIST AVG
        </span>
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-600 text-right">
          Z-SCORE
        </span>
      </div>

      {spreads.map((s) => (
        <div
          key={s.name}
          className="grid grid-cols-[1fr_64px_64px_48px] gap-0 px-3 py-[3px] border-b border-border/20 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[9px] font-mono font-bold text-white truncate">
            {s.name}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {fmtNum(s.value, Math.abs(s.value) < 1 ? 5 : 2)}
          </span>
          <span className="text-[9px] font-mono text-neutral-500 text-right">
            {fmtNum(s.historicalAvg, Math.abs(s.historicalAvg) < 1 ? 5 : 2)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${zScoreColor(s.zScore)}`}>
            {fmtSign(s.zScore)}
          </span>
        </div>
      ))}
    </div>
  );
}
