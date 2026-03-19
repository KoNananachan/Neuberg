import { useState, useMemo } from 'react';
import { useWageGrowth } from '../../api/hooks/use-wage-growth';

// ── Types ──

type CountryCode = 'US' | 'EU' | 'UK' | 'JP' | 'CA' | 'AU';
type TrendLabel = 'ACCELERATING' | 'DECELERATING' | 'STABLE';
type Direction = 'up' | 'down' | 'flat';

interface SectorRow {
  sector: string;
  wageGrowth: number;
  employment: number;
  avgSalary: number;
  qoqChange: number;
}

interface WageMeasure {
  label: string;
  value: number;
  direction: Direction;
  unit: string;
}

interface DemographicSplit {
  label: string;
  value: number;
  change: number;
}

interface CountryData {
  code: CountryCode;
  headlineYoY: number;
  previousYoY: number;
  realWageGrowth: number;
  cpiRate: number;
  trend: TrendLabel;
  sectors: SectorRow[];
  wageMeasures: WageMeasure[];
  demographics: {
    experienceLevel: DemographicSplit[];
    employmentType: DemographicSplit[];
  };
  phillipsCurve: {
    unemployment: number;
    wageGrowth: number;
    naturalRate: number;
  };
}

interface WageGrowthData {
  countries: Record<CountryCode, CountryData>;
  globalSummary: {
    avgGrowth: number;
    highestCountry: CountryCode;
    lowestCountry: CountryCode;
  };
  timestamp: string;
}

// ── Constants ──

const COUNTRY_TABS: CountryCode[] = ['US', 'EU', 'UK', 'JP', 'CA', 'AU'];

const COUNTRY_LABELS: Record<CountryCode, string> = {
  US: 'US',
  EU: 'EU',
  UK: 'UK',
  JP: 'JP',
  CA: 'CA',
  AU: 'AU',
};

// ── Formatting helpers ──

function fmtPct(n: number, decimals = 1): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

function fmtSalary(n: number): string {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtEmployment(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

// ── Color helpers ──

function growthColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function trendBadgeStyle(trend: TrendLabel): { text: string; bg: string } {
  switch (trend) {
    case 'ACCELERATING':
      return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
    case 'DECELERATING':
      return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
    case 'STABLE':
      return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
  }
}

function directionArrow(dir: Direction): string {
  switch (dir) {
    case 'up': return '\u25B2';
    case 'down': return '\u25BC';
    case 'flat': return '\u25C6';
  }
}

function directionColor(dir: Direction): string {
  switch (dir) {
    case 'up': return 'text-green-400';
    case 'down': return 'text-red-400';
    case 'flat': return 'text-yellow-400';
  }
}

// ── Main Panel ──

export function WageGrowthPanel() {
  const { data, isLoading } = useWageGrowth() as {
    data: WageGrowthData | undefined;
    isLoading: boolean;
  };
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('US');

  const countryData = data?.countries?.[selectedCountry];

  const sortedSectors = useMemo(() => {
    if (!countryData?.sectors) return [];
    return [...countryData.sectors].sort((a, b) => b.wageGrowth - a.wageGrowth);
  }, [countryData?.sectors]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-lime-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-lime-400">
            WAGE GROWTH TRACKER
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.globalSummary && (
            <span className="text-[7px] text-neutral-500">
              GLOBAL AVG {fmtPct(data.globalSummary.avgGrowth)}
              {' | HI '}
              <span className="text-green-400">{data.globalSummary.highestCountry}</span>
              {' LO '}
              <span className="text-red-400">{data.globalSummary.lowestCountry}</span>
            </span>
          )}
        </div>
      </div>

      {/* Country tabs */}
      <div className="flex items-center border-b border-border/20 shrink-0">
        {COUNTRY_TABS.map((code) => (
          <button
            key={code}
            onClick={() => setSelectedCountry(code)}
            className={`flex-1 py-1 text-[8px] font-black uppercase tracking-wider text-center transition-colors ${
              selectedCountry === code
                ? 'text-lime-400 bg-lime-400/[0.06] border-b border-lime-400'
                : 'text-neutral-600 hover:bg-lime-400/[0.02]'
            }`}
          >
            {COUNTRY_LABELS[code]}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-lime-400/30 border-t-lime-400 animate-spin" />
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
                Loading...
              </span>
            </div>
          </div>
        )}

        {!data && !isLoading && (
          <div className="flex items-center justify-center h-full text-[10px] text-neutral-500 uppercase">
            No data available
          </div>
        )}

        {countryData && (
          <>
            <HeadlineMetrics country={countryData} />
            <SectorBreakdown sectors={sortedSectors} />
            <WageMeasuresSection measures={countryData.wageMeasures} />
            <DemographicsSection demographics={countryData.demographics} />
            <PhillipsCurveIndicator curve={countryData.phillipsCurve} timestamp={data?.timestamp} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Headline Metrics ──

function HeadlineMetrics({ country }: { country: CountryData }) {
  const trendStyle = trendBadgeStyle(country.trend);
  const yoyDiff = country.headlineYoY - country.previousYoY;
  const trendArrow = yoyDiff > 0 ? '\u25B2' : yoyDiff < 0 ? '\u25BC' : '\u25C6';
  const trendArrowColor = yoyDiff > 0 ? 'text-green-400' : yoyDiff < 0 ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className="border-b border-border/20 px-3 py-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[7px] uppercase tracking-wider text-neutral-500">
          HEADLINE WAGE GROWTH
        </span>
        <span className={`text-[7px] font-black uppercase tracking-wider px-1 py-0.5 ${trendStyle.text} ${trendStyle.bg}`}>
          {country.trend}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Headline YoY */}
        <div>
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider mb-0.5">
            NOMINAL YOY
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[18px] font-black text-lime-400 leading-none">
              {country.headlineYoY.toFixed(1)}%
            </span>
            <span className={`text-[10px] font-bold ${trendArrowColor}`}>
              {trendArrow}
            </span>
          </div>
          <div className="text-[7px] text-neutral-600 mt-0.5">
            prev {country.previousYoY.toFixed(1)}%
          </div>
        </div>

        {/* Real wage growth */}
        <div>
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider mb-0.5">
            REAL WAGE GROWTH
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-[14px] font-black leading-none ${growthColor(country.realWageGrowth)}`}>
              {fmtPct(country.realWageGrowth)}
            </span>
          </div>
          <div className="text-[7px] text-neutral-600 mt-0.5">
            CPI {country.cpiRate.toFixed(1)}%
          </div>
        </div>

        {/* Trend */}
        <div>
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider mb-0.5">
            WAGE-CPI SPREAD
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-[14px] font-black leading-none ${growthColor(country.headlineYoY - country.cpiRate)}`}>
              {fmtPct(country.headlineYoY - country.cpiRate)}
            </span>
          </div>
          <div className="text-[7px] text-neutral-600 mt-0.5">
            nominal - CPI
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sector Breakdown Table ──

function SectorBreakdown({ sectors }: { sectors: SectorRow[] }) {
  if (!sectors.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          SECTOR BREAKDOWN
        </span>
      </div>

      {/* Table header */}
      <div className="flex items-center px-3 py-0.5 border-b border-border/10 text-[7px] text-neutral-600 uppercase tracking-wider">
        <span className="flex-1">SECTOR</span>
        <span className="w-16 text-right">WAGE GR.</span>
        <span className="w-16 text-right">EMPLOY.</span>
        <span className="w-16 text-right">AVG SAL.</span>
        <span className="w-14 text-right">QOQ CHG</span>
      </div>

      {/* Table rows */}
      {sectors.map((row) => (
        <div
          key={row.sector}
          className="flex items-center px-3 py-0.5 border-b border-border/[0.05] hover:bg-lime-400/[0.02] transition-colors"
        >
          <span className="flex-1 text-white/70 truncate">{row.sector}</span>
          <span className={`w-16 text-right font-bold ${growthColor(row.wageGrowth)}`}>
            {fmtPct(row.wageGrowth)}
          </span>
          <span className="w-16 text-right text-neutral-500">
            {fmtEmployment(row.employment)}
          </span>
          <span className="w-16 text-right text-neutral-400">
            {fmtSalary(row.avgSalary)}
          </span>
          <span className={`w-14 text-right font-bold ${growthColor(row.qoqChange)}`}>
            {fmtPct(row.qoqChange)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Wage Measures Section ──

function WageMeasuresSection({ measures }: { measures: WageMeasure[] | undefined }) {
  if (!measures?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          WAGE MEASURES
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border/10">
        {measures.map((m) => (
          <div
            key={m.label}
            className="bg-black px-3 py-1.5 hover:bg-lime-400/[0.02] transition-colors"
          >
            <div className="text-[7px] text-neutral-600 uppercase tracking-wider mb-0.5">
              {m.label}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-black text-white leading-none">
                {m.value.toFixed(1)}{m.unit}
              </span>
              <span className={`text-[9px] font-bold ${directionColor(m.direction)}`}>
                {directionArrow(m.direction)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Demographics Section ──

function DemographicsSection({
  demographics,
}: {
  demographics: CountryData['demographics'] | undefined;
}) {
  if (!demographics) return null;

  const { experienceLevel, employmentType } = demographics;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          DEMOGRAPHICS BREAKDOWN
        </span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border/10">
        {/* Experience level */}
        <div className="bg-black px-3 py-1.5">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider mb-1">
            EXPERIENCE LEVEL
          </div>
          {experienceLevel?.map((d) => (
            <DemographicRow key={d.label} item={d} />
          ))}
        </div>

        {/* Employment type */}
        <div className="bg-black px-3 py-1.5">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider mb-1">
            EMPLOYMENT TYPE
          </div>
          {employmentType?.map((d) => (
            <DemographicRow key={d.label} item={d} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DemographicRow({ item }: { item: DemographicSplit }) {
  return (
    <div className="flex items-center justify-between py-0.5 hover:bg-lime-400/[0.02] transition-colors">
      <span className="text-[7px] text-neutral-400">{item.label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[8px] font-bold text-white">{fmtPct(item.value)}</span>
        <span className={`text-[7px] ${growthColor(item.change)}`}>
          {fmtPct(item.change)}
        </span>
      </div>
    </div>
  );
}

// ── Phillips Curve Indicator ──

function PhillipsCurveIndicator({
  curve,
  timestamp,
}: {
  curve: CountryData['phillipsCurve'] | undefined;
  timestamp?: string;
}) {
  if (!curve) return null;

  const W = 200;
  const H = 70;
  const PAD = 16;

  // Scale unemployment from ~2% to ~8% (x-axis)
  const uMin = 2;
  const uMax = 8;
  // Scale wage growth from ~0% to ~6% (y-axis)
  const wMin = 0;
  const wMax = 6;

  const scaleX = (u: number) => PAD + ((u - uMin) / (uMax - uMin)) * (W - PAD * 2);
  const scaleY = (w: number) => H - PAD - ((w - wMin) / (wMax - wMin)) * (H - PAD * 2);

  const cx = scaleX(Math.max(uMin, Math.min(uMax, curve.unemployment)));
  const cy = scaleY(Math.max(wMin, Math.min(wMax, curve.wageGrowth)));
  const natX = scaleX(Math.max(uMin, Math.min(uMax, curve.naturalRate)));

  // Theoretical Phillips curve: w = a + b / (u - c) approximation
  const curvePath = useMemo(() => {
    const points: string[] = [];
    for (let u = uMin; u <= uMax; u += 0.1) {
      const w = Math.max(wMin, Math.min(wMax, 1.5 + 8 / (u + 0.5)));
      const x = scaleX(u);
      const y = scaleY(w);
      points.push(`${points.length === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return points.join(' ');
  }, []);

  const isAboveCurve = curve.wageGrowth > (1.5 + 8 / (curve.unemployment + 0.5));

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          PHILLIPS CURVE
        </span>
        <span className={`text-[7px] font-black uppercase px-1 py-0.5 ${
          isAboveCurve
            ? 'text-red-400 bg-red-500/10 border border-red-500/30'
            : 'text-green-400 bg-green-500/10 border border-green-500/30'
        }`}>
          {isAboveCurve ? 'ABOVE CURVE' : 'ON/BELOW CURVE'}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 70 }}>
        {/* Grid lines */}
        {[2, 4, 6, 8].map((u) => (
          <line
            key={`gu-${u}`}
            x1={scaleX(u)}
            y1={PAD}
            x2={scaleX(u)}
            y2={H - PAD}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="2,3"
          />
        ))}
        {[1, 2, 3, 4, 5].map((w) => (
          <line
            key={`gw-${w}`}
            x1={PAD}
            y1={scaleY(w)}
            x2={W - PAD}
            y2={scaleY(w)}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="2,3"
          />
        ))}

        {/* Natural rate reference line */}
        <line
          x1={natX}
          y1={PAD}
          x2={natX}
          y2={H - PAD}
          stroke="rgba(250,204,21,0.3)"
          strokeWidth={1}
          strokeDasharray="3,2"
        />
        <text
          x={natX}
          y={PAD - 3}
          textAnchor="middle"
          fill="rgba(250,204,21,0.5)"
          fontSize={5}
          fontFamily="monospace"
        >
          NAIRU {curve.naturalRate.toFixed(1)}%
        </text>

        {/* Theoretical Phillips curve */}
        <path
          d={curvePath}
          fill="none"
          stroke="rgba(163,230,53,0.2)"
          strokeWidth={1.5}
        />

        {/* Current position */}
        <circle cx={cx} cy={cy} r={4} fill="rgba(163,230,53,0.15)" stroke="#a3e635" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={1.5} fill="#a3e635" />

        {/* Current position label */}
        <text
          x={cx + 6}
          y={cy - 4}
          fill="#a3e635"
          fontSize={6}
          fontFamily="monospace"
          fontWeight="bold"
        >
          {curve.unemployment.toFixed(1)}% / {curve.wageGrowth.toFixed(1)}%
        </text>

        {/* Axis labels */}
        <text
          x={W / 2}
          y={H - 2}
          textAnchor="middle"
          fill="rgba(255,255,255,0.2)"
          fontSize={5}
          fontFamily="monospace"
        >
          UNEMPLOYMENT RATE %
        </text>
        <text
          x={4}
          y={H / 2}
          textAnchor="middle"
          fill="rgba(255,255,255,0.2)"
          fontSize={5}
          fontFamily="monospace"
          transform={`rotate(-90, 4, ${H / 2})`}
        >
          WAGE GR. %
        </text>
      </svg>

      {/* Summary row */}
      <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/10">
        <div className="flex items-center gap-3">
          <span className="text-[7px] text-neutral-600">
            UNEMP: <span className="text-white font-bold">{curve.unemployment.toFixed(1)}%</span>
          </span>
          <span className="text-[7px] text-neutral-600">
            WAGE GR: <span className="text-lime-400 font-bold">{curve.wageGrowth.toFixed(1)}%</span>
          </span>
          <span className="text-[7px] text-neutral-600">
            NAT. RATE: <span className="text-yellow-400 font-bold">{curve.naturalRate.toFixed(1)}%</span>
          </span>
        </div>
        {timestamp && (
          <span className="text-[6px] text-neutral-700">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
