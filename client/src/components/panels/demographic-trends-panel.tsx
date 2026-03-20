import { useDemographicTrends } from '../../api/hooks/use-demographic-trends';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Types ──

interface CountryDemographic {
  name: string;
  population: number;
  growthRate: number;
  medianAge: number;
  fertilityRate: number;
  lifeExpectancy: number;
  urbanization: number;
  dependencyRatio: number;
  workingAgePct: number;
}

interface LaborForceEntry {
  country: string;
  laborForce: number;
  participationRate: number;
  unemployment: number;
}

interface ProjectionEntry {
  country: string;
  pop2025: number;
  pop2030: number;
  pop2050: number;
}

interface UrbanizationTrend {
  country: string;
  urbanization: number;
  urbanGrowthRate: number;
}

interface GlobalSummary {
  worldPopulation: number;
  avgGrowthRate: number;
  avgMedianAge: number;
  avgUrbanization: number;
}

interface DemographicTrendsData {
  timestamp: string;
  summary: GlobalSummary;
  countries: CountryDemographic[];
  laborForce: LaborForceEntry[];
  projections: ProjectionEntry[];
  urbanizationTrends: UrbanizationTrend[];
}

// ── Fallback Data ──

const FALLBACK_DATA: DemographicTrendsData = {
  timestamp: '2026-03-19T12:00:00Z',
  summary: {
    worldPopulation: 8.12,
    avgGrowthRate: 0.88,
    avgMedianAge: 30.9,
    avgUrbanization: 57.5,
  },
  countries: [
    { name: 'China', population: 1412, growthRate: -0.02, medianAge: 39.0, fertilityRate: 1.09, lifeExpectancy: 78.2, urbanization: 65.2, dependencyRatio: 44.3, workingAgePct: 69.3 },
    { name: 'India', population: 1428, growthRate: 0.81, medianAge: 28.7, fertilityRate: 2.01, lifeExpectancy: 70.8, urbanization: 36.4, dependencyRatio: 47.5, workingAgePct: 67.8 },
    { name: 'United States', population: 340, growthRate: 0.50, medianAge: 38.5, fertilityRate: 1.64, lifeExpectancy: 77.5, urbanization: 83.3, dependencyRatio: 53.7, workingAgePct: 65.1 },
    { name: 'Indonesia', population: 277, growthRate: 0.82, medianAge: 30.2, fertilityRate: 2.18, lifeExpectancy: 72.3, urbanization: 58.2, dependencyRatio: 47.2, workingAgePct: 67.9 },
    { name: 'Pakistan', population: 236, growthRate: 1.91, medianAge: 20.2, fertilityRate: 3.38, lifeExpectancy: 67.3, urbanization: 37.7, dependencyRatio: 65.2, workingAgePct: 60.6 },
    { name: 'Brazil', population: 216, growthRate: 0.52, medianAge: 34.3, fertilityRate: 1.64, lifeExpectancy: 76.1, urbanization: 87.6, dependencyRatio: 44.7, workingAgePct: 69.1 },
    { name: 'Nigeria', population: 224, growthRate: 2.41, medianAge: 17.2, fertilityRate: 5.13, lifeExpectancy: 55.2, urbanization: 54.3, dependencyRatio: 86.1, workingAgePct: 53.8 },
    { name: 'Bangladesh', population: 173, growthRate: 0.94, medianAge: 27.9, fertilityRate: 1.95, lifeExpectancy: 73.2, urbanization: 40.5, dependencyRatio: 45.3, workingAgePct: 68.8 },
    { name: 'Russia', population: 144, growthRate: -0.19, medianAge: 39.6, fertilityRate: 1.50, lifeExpectancy: 73.2, urbanization: 75.1, dependencyRatio: 51.2, workingAgePct: 66.1 },
    { name: 'Japan', population: 124, growthRate: -0.53, medianAge: 48.6, fertilityRate: 1.20, lifeExpectancy: 84.8, urbanization: 91.9, dependencyRatio: 70.1, workingAgePct: 58.8 },
    { name: 'Germany', population: 84, growthRate: -0.08, medianAge: 45.7, fertilityRate: 1.53, lifeExpectancy: 81.3, urbanization: 77.6, dependencyRatio: 56.2, workingAgePct: 64.1 },
    { name: 'Ethiopia', population: 127, growthRate: 2.55, medianAge: 17.8, fertilityRate: 4.07, lifeExpectancy: 67.8, urbanization: 22.7, dependencyRatio: 76.3, workingAgePct: 56.7 },
    { name: 'Mexico', population: 130, growthRate: 0.75, medianAge: 29.3, fertilityRate: 1.82, lifeExpectancy: 75.1, urbanization: 81.3, dependencyRatio: 49.1, workingAgePct: 67.1 },
    { name: 'Egypt', population: 112, growthRate: 1.68, medianAge: 24.1, fertilityRate: 2.76, lifeExpectancy: 72.4, urbanization: 43.1, dependencyRatio: 60.8, workingAgePct: 62.2 },
    { name: 'South Korea', population: 52, growthRate: -0.04, medianAge: 44.6, fertilityRate: 0.72, lifeExpectancy: 83.7, urbanization: 81.4, dependencyRatio: 41.2, workingAgePct: 70.8 },
  ],
  laborForce: [
    { country: 'China', laborForce: 779, participationRate: 68.2, unemployment: 5.2 },
    { country: 'India', laborForce: 522, participationRate: 49.8, unemployment: 7.8 },
    { country: 'United States', laborForce: 168, participationRate: 62.4, unemployment: 4.1 },
    { country: 'Indonesia', laborForce: 140, participationRate: 69.1, unemployment: 5.3 },
    { country: 'Brazil', laborForce: 107, participationRate: 62.5, unemployment: 7.6 },
    { country: 'Russia', laborForce: 75, participationRate: 62.3, unemployment: 2.4 },
    { country: 'Japan', laborForce: 69, participationRate: 63.4, unemployment: 2.5 },
    { country: 'Germany', laborForce: 46, participationRate: 64.3, unemployment: 6.0 },
    { country: 'Nigeria', laborForce: 70, participationRate: 55.4, unemployment: 33.3 },
    { country: 'Bangladesh', laborForce: 73, participationRate: 58.5, unemployment: 5.4 },
  ],
  projections: [
    { country: 'India', pop2025: 1428, pop2030: 1515, pop2050: 1670 },
    { country: 'China', pop2025: 1412, pop2030: 1394, pop2050: 1313 },
    { country: 'Nigeria', pop2025: 224, pop2030: 263, pop2050: 377 },
    { country: 'United States', pop2025: 340, pop2030: 350, pop2050: 375 },
    { country: 'Pakistan', pop2025: 236, pop2030: 260, pop2050: 338 },
    { country: 'Indonesia', pop2025: 277, pop2030: 290, pop2050: 317 },
    { country: 'Brazil', pop2025: 216, pop2030: 220, pop2050: 229 },
    { country: 'Ethiopia', pop2025: 127, pop2030: 148, pop2050: 213 },
    { country: 'Bangladesh', pop2025: 173, pop2030: 183, pop2050: 204 },
    { country: 'Japan', pop2025: 124, pop2030: 120, pop2050: 104 },
  ],
  urbanizationTrends: [
    { country: 'Nigeria', urbanization: 54.3, urbanGrowthRate: 3.92 },
    { country: 'Ethiopia', urbanization: 22.7, urbanGrowthRate: 4.63 },
    { country: 'Bangladesh', urbanization: 40.5, urbanGrowthRate: 3.17 },
    { country: 'India', urbanization: 36.4, urbanGrowthRate: 2.33 },
    { country: 'Pakistan', urbanization: 37.7, urbanGrowthRate: 2.70 },
    { country: 'Egypt', urbanization: 43.1, urbanGrowthRate: 1.87 },
    { country: 'Indonesia', urbanization: 58.2, urbanGrowthRate: 1.72 },
    { country: 'Mexico', urbanization: 81.3, urbanGrowthRate: 1.28 },
  ],
};

// ── Formatting Helpers ──

function fmtPop(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(2) + 'B';
  return n.toFixed(0) + 'M';
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtSigned(n: number, decimals = 2): string {
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(decimals) + '%';
}

function fmtLabor(n: number): string {
  return n.toFixed(0) + 'M';
}

// ── Color Helpers ──

function growthRateColor(v: number): string {
  if (v > 0) return 'text-green-400';
  if (v < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function unemploymentColor(v: number): string {
  if (v > 20) return 'text-red-400';
  if (v > 10) return 'text-red-400/80';
  if (v > 6) return 'text-amber-400';
  return 'text-green-400';
}

function unemploymentBg(v: number): string {
  if (v > 20) return 'bg-red-500/20';
  if (v > 10) return 'bg-red-500/12';
  if (v > 6) return 'bg-red-500/8';
  return 'bg-red-500/[0.03]';
}

function projectionGrowthColor(current: number, projected: number): string {
  if (projected > current) return 'text-green-400';
  if (projected < current) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/15">
      <div className="w-1 h-1 shrink-0 bg-indigo-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-indigo-400">
        {title}
      </span>
    </div>
  );
}

// ── Global Summary Bar ──

function GlobalSummaryBar({ summary }: { summary: GlobalSummary }) {
  return (
    <div className="border-b border-border/20">
      <div className="grid grid-cols-4 gap-px bg-border/5">
        <div className="px-2 py-1.5 bg-black">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            WORLD POP
          </div>
          <div className="text-[14px] font-mono font-black tabular-nums text-indigo-400">
            {summary.worldPopulation.toFixed(2)}B
          </div>
        </div>
        <div className="px-2 py-1.5 bg-black">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            AVG GROWTH
          </div>
          <div className={`text-[14px] font-mono font-black tabular-nums ${growthRateColor(summary.avgGrowthRate)}`}>
            {fmtSigned(summary.avgGrowthRate)}
          </div>
        </div>
        <div className="px-2 py-1.5 bg-black">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            AVG MED AGE
          </div>
          <div className="text-[14px] font-mono font-black tabular-nums text-amber-400">
            {summary.avgMedianAge.toFixed(1)}
          </div>
        </div>
        <div className="px-2 py-1.5 bg-black">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            URBANIZATION
          </div>
          <div className="text-[14px] font-mono font-black tabular-nums text-cyan-400">
            {fmtPct(summary.avgUrbanization)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Country Table ──

function CountryTable({ countries, t }: { countries: CountryDemographic[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'demCountryOverview', 'Country Demographics')} />
      <div className="overflow-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-border/15">
              <th className="text-left text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">COUNTRY</th>
              <th className="text-right text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">POP</th>
              <th className="text-right text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">GROWTH</th>
              <th className="text-right text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">MED AGE</th>
              <th className="text-right text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">FERT</th>
              <th className="text-right text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">LIFE EXP</th>
              <th className="text-right text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">URBAN%</th>
              <th className="text-right text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">DEP RATIO</th>
              <th className="text-right text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">WORK AGE%</th>
            </tr>
          </thead>
          <tbody>
            {countries.map((c) => (
              <tr key={c.name} className="border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors">
                <td className="text-[9px] font-mono font-bold text-neutral-200 px-2 py-1 whitespace-nowrap">{c.name}</td>
                <td className="text-right text-[9px] font-mono tabular-nums text-neutral-300 px-2 py-1">{fmtPop(c.population)}</td>
                <td className={`text-right text-[9px] font-mono tabular-nums px-2 py-1 ${growthRateColor(c.growthRate)}`}>{fmtSigned(c.growthRate)}</td>
                <td className="text-right text-[9px] font-mono tabular-nums text-neutral-300 px-2 py-1">{c.medianAge.toFixed(1)}</td>
                <td className="text-right text-[9px] font-mono tabular-nums text-neutral-300 px-2 py-1">{c.fertilityRate.toFixed(2)}</td>
                <td className="text-right text-[9px] font-mono tabular-nums text-neutral-300 px-2 py-1">{c.lifeExpectancy.toFixed(1)}</td>
                <td className="text-right text-[9px] font-mono tabular-nums text-cyan-400/80 px-2 py-1">{fmtPct(c.urbanization)}</td>
                <td className="text-right text-[9px] font-mono tabular-nums text-amber-400/80 px-2 py-1">{c.dependencyRatio.toFixed(1)}</td>
                <td className="text-right text-[9px] font-mono tabular-nums text-neutral-300 px-2 py-1">{fmtPct(c.workingAgePct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Aging Index (Top by Dependency Ratio) ──

function AgingIndexSection({ countries, t }: { countries: CountryDemographic[]; t: ReturnType<typeof useT> }) {
  const sorted = [...countries].sort((a, b) => b.dependencyRatio - a.dependencyRatio).slice(0, 8);
  const maxRatio = Math.max(...sorted.map((c) => c.dependencyRatio));

  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'demAgingIndex', 'Aging Index - Dependency Ratio')} />
      <div className="px-2 py-1.5">
        {sorted.map((c) => {
          const pct = (c.dependencyRatio / maxRatio) * 100;
          return (
            <div key={c.name} className="flex items-center gap-2 py-0.5 hover:bg-indigo-400/[0.02] transition-colors px-1">
              <span className="text-[8px] font-mono text-neutral-400 w-[80px] shrink-0 truncate">{c.name}</span>
              <div className="flex-1 h-2.5 bg-border/5 relative">
                <div
                  className="absolute inset-y-0 left-0 bg-amber-500/40"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[8px] font-mono font-bold tabular-nums text-amber-400 w-[36px] text-right shrink-0">
                {c.dependencyRatio.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Urbanization Trend ──

function UrbanizationTrendSection({ trends, t }: { trends: UrbanizationTrend[]; t: ReturnType<typeof useT> }) {
  const maxRate = Math.max(...trends.map((u) => u.urbanGrowthRate));

  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'demUrbanTrend', 'Fastest Urbanizing Countries')} />
      <div className="px-2 py-1.5">
        {trends.map((u) => {
          const pct = (u.urbanGrowthRate / maxRate) * 100;
          return (
            <div key={u.country} className="flex items-center gap-2 py-0.5 hover:bg-indigo-400/[0.02] transition-colors px-1">
              <span className="text-[8px] font-mono text-neutral-400 w-[80px] shrink-0 truncate">{u.country}</span>
              <div className="flex-1 h-2.5 bg-border/5 relative">
                <div
                  className="absolute inset-y-0 left-0 bg-cyan-500/40"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[8px] font-mono tabular-nums text-cyan-400/70 w-[40px] text-right shrink-0">
                {fmtPct(u.urbanization)}
              </span>
              <span className="text-[8px] font-mono font-bold tabular-nums text-cyan-400 w-[40px] text-right shrink-0">
                +{u.urbanGrowthRate.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Labor Force Section ──

function LaborForceSection({ labor, t }: { labor: LaborForceEntry[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'demLaborForce', 'Labor Force')} />
      <div className="overflow-auto">
        <table className="w-full min-w-[420px]">
          <thead>
            <tr className="border-b border-border/15">
              <th className="text-left text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">COUNTRY</th>
              <th className="text-right text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">LABOR FORCE</th>
              <th className="text-right text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">PARTICIPATION</th>
              <th className="text-right text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">UNEMPLOYMENT</th>
            </tr>
          </thead>
          <tbody>
            {labor.map((l) => (
              <tr key={l.country} className="border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors">
                <td className="text-[9px] font-mono font-bold text-neutral-200 px-2 py-1 whitespace-nowrap">{l.country}</td>
                <td className="text-right text-[9px] font-mono tabular-nums text-neutral-300 px-2 py-1">{fmtLabor(l.laborForce)}</td>
                <td className="text-right text-[9px] font-mono tabular-nums text-neutral-300 px-2 py-1">{fmtPct(l.participationRate)}</td>
                <td className="text-right px-2 py-1">
                  <span className={`text-[9px] font-mono font-bold tabular-nums px-1.5 py-0.5 ${unemploymentColor(l.unemployment)} ${unemploymentBg(l.unemployment)}`}>
                    {fmtPct(l.unemployment)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Population Projections ──

function ProjectionsSection({ projections, t }: { projections: ProjectionEntry[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'demProjections', 'Population Projections')} />
      <div className="overflow-auto">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="border-b border-border/15">
              <th className="text-left text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">COUNTRY</th>
              <th className="text-right text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">2025</th>
              <th className="text-right text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">2030</th>
              <th className="text-right text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">2030 CHG</th>
              <th className="text-right text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">2050</th>
              <th className="text-right text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider px-2 py-1">2050 CHG</th>
            </tr>
          </thead>
          <tbody>
            {projections.map((p) => {
              const chg2030 = ((p.pop2030 - p.pop2025) / p.pop2025) * 100;
              const chg2050 = ((p.pop2050 - p.pop2025) / p.pop2025) * 100;
              return (
                <tr key={p.country} className="border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors">
                  <td className="text-[9px] font-mono font-bold text-neutral-200 px-2 py-1 whitespace-nowrap">{p.country}</td>
                  <td className="text-right text-[9px] font-mono tabular-nums text-neutral-400 px-2 py-1">{fmtPop(p.pop2025)}</td>
                  <td className="text-right text-[9px] font-mono tabular-nums text-neutral-300 px-2 py-1">{fmtPop(p.pop2030)}</td>
                  <td className={`text-right text-[9px] font-mono tabular-nums px-2 py-1 ${projectionGrowthColor(p.pop2025, p.pop2030)}`}>
                    {fmtSigned(chg2030, 1)}
                  </td>
                  <td className="text-right text-[9px] font-mono tabular-nums text-neutral-300 px-2 py-1">{fmtPop(p.pop2050)}</td>
                  <td className={`text-right text-[9px] font-mono tabular-nums px-2 py-1 ${projectionGrowthColor(p.pop2025, p.pop2050)}`}>
                    {fmtSigned(chg2050, 1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function DemographicTrendsPanel() {
  const t = useT();
  const { data: rawData, isLoading, refetch } = useDemographicTrends();

  const data: DemographicTrendsData = rawData ?? FALLBACK_DATA;
  const hasLiveData = !!rawData;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-indigo-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-indigo-400">
            {tr(t, 'panelDemographicTrends', 'Demographic Trends')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!hasLiveData && !isLoading && (
            <span className="text-[7px] font-mono text-neutral-600 uppercase">
              STATIC
            </span>
          )}
          {data.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-indigo-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && !rawData && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-indigo-400 uppercase animate-pulse">
            LOADING DEMOGRAPHIC DATA...
          </span>
        </div>
      )}

      {/* Content */}
      {(!isLoading || rawData) && (
        <div className="flex-1 overflow-auto no-scrollbar">
          <GlobalSummaryBar summary={data.summary} />
          <CountryTable countries={data.countries} t={t} />
          <AgingIndexSection countries={data.countries} t={t} />
          <UrbanizationTrendSection trends={data.urbanizationTrends} t={t} />
          <LaborForceSection labor={data.laborForce} t={t} />
          <ProjectionsSection projections={data.projections} t={t} />

          {/* Footer */}
          <div className="px-3 py-2 border-t border-border/20">
            <p className="text-[7px] font-mono text-neutral-700 leading-relaxed">
              Data sourced from UN World Population Prospects, World Bank, and ILO. Population in millions unless noted. Not investment advice.
            </p>
          </div>

          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
