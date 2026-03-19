import { useLaborMarket } from '../../api/hooks/use-labor-market';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Types ──

interface EmploymentSummary {
  nfp: number;
  nfpPrevious: number;
  nfpForecast: number;
  unemploymentRate: number;
  unemploymentPrevious: number;
  participationRate: number;
  participationPrevious: number;
  u6Rate: number;
  averageHourlyEarningsYoY: number;
  averageHourlyEarningsMoM: number;
  averageWeeklyHours: number;
  reportDate: string;
}

interface JoblessClaims {
  initialClaims: number;
  initialPrevious: number;
  initialForecast: number;
  continuingClaims: number;
  continuingPrevious: number;
  fourWeekAvg: number;
  fourWeekAvgPrevious: number;
  reportDate: string;
}

interface JoltsData {
  jobOpenings: number;
  jobOpeningsPrevious: number;
  hires: number;
  hiresPrevious: number;
  quits: number;
  quitsPrevious: number;
  layoffs: number;
  layoffsPrevious: number;
  quitRate: number;
  openingsToUnemployed: number;
  reportDate: string;
}

interface SectorEmployment {
  sector: string;
  change: number;
  previous: number;
  threeMonthAvg: number;
}

interface GlobalLabor {
  country: string;
  code: string;
  unemploymentRate: number;
  previous: number;
  trend: 'improving' | 'stable' | 'deteriorating';
  participationRate: number;
}

interface WageTracker {
  metric: string;
  current: number;
  previous: number;
  yoyChange: number;
}

interface LaborMarketData {
  timestamp: string;
  employment: EmploymentSummary;
  claims: JoblessClaims;
  jolts: JoltsData;
  sectorEmployment: SectorEmployment[];
  globalLabor: GlobalLabor[];
  wages: WageTracker[];
}

// ── Fallback Data ──

const FALLBACK_DATA: LaborMarketData = {
  timestamp: '2026-03-19T14:30:00Z',
  employment: {
    nfp: 151,
    nfpPrevious: 125,
    nfpForecast: 160,
    unemploymentRate: 4.1,
    unemploymentPrevious: 4.0,
    participationRate: 62.4,
    participationPrevious: 62.6,
    u6Rate: 7.9,
    averageHourlyEarningsYoY: 4.0,
    averageHourlyEarningsMoM: 0.3,
    averageWeeklyHours: 34.1,
    reportDate: '2026-03-07',
  },
  claims: {
    initialClaims: 221,
    initialPrevious: 242,
    initialForecast: 225,
    continuingClaims: 1897,
    continuingPrevious: 1862,
    fourWeekAvg: 227,
    fourWeekAvgPrevious: 231,
    reportDate: '2026-03-14',
  },
  jolts: {
    jobOpenings: 7740,
    jobOpeningsPrevious: 7508,
    hires: 5388,
    hiresPrevious: 5310,
    quits: 3195,
    quitsPrevious: 3280,
    layoffs: 1799,
    layoffsPrevious: 1765,
    quitRate: 2.1,
    openingsToUnemployed: 1.13,
    reportDate: '2026-02-04',
  },
  sectorEmployment: [
    { sector: 'Health Care', change: 52, previous: 44, threeMonthAvg: 48 },
    { sector: 'Government', change: 11, previous: 32, threeMonthAvg: 22 },
    { sector: 'Financial', change: 21, previous: 15, threeMonthAvg: 18 },
    { sector: 'Construction', change: 19, previous: 10, threeMonthAvg: 14 },
    { sector: 'Leisure & Hospitality', change: 26, previous: 18, threeMonthAvg: 22 },
    { sector: 'Professional & Business', change: -4, previous: 8, threeMonthAvg: 3 },
    { sector: 'Manufacturing', change: -10, previous: -6, threeMonthAvg: -7 },
    { sector: 'Retail Trade', change: -8, previous: 2, threeMonthAvg: -2 },
    { sector: 'Information', change: -5, previous: -3, threeMonthAvg: -4 },
    { sector: 'Transportation', change: 5, previous: -2, threeMonthAvg: 1 },
  ],
  globalLabor: [
    { country: 'United States', code: 'US', unemploymentRate: 4.1, previous: 4.0, trend: 'deteriorating', participationRate: 62.4 },
    { country: 'Eurozone', code: 'EU', unemploymentRate: 6.3, previous: 6.3, trend: 'stable', participationRate: 65.1 },
    { country: 'United Kingdom', code: 'GB', unemploymentRate: 4.4, previous: 4.3, trend: 'deteriorating', participationRate: 62.8 },
    { country: 'Japan', code: 'JP', unemploymentRate: 2.5, previous: 2.4, trend: 'stable', participationRate: 63.4 },
    { country: 'Canada', code: 'CA', unemploymentRate: 6.6, previous: 6.7, trend: 'improving', participationRate: 65.0 },
    { country: 'Germany', code: 'DE', unemploymentRate: 6.2, previous: 6.1, trend: 'deteriorating', participationRate: 64.3 },
    { country: 'Australia', code: 'AU', unemploymentRate: 4.1, previous: 4.0, trend: 'stable', participationRate: 67.0 },
    { country: 'China', code: 'CN', unemploymentRate: 5.2, previous: 5.1, trend: 'stable', participationRate: 68.2 },
  ],
  wages: [
    { metric: 'Avg Hourly Earnings', current: 35.93, previous: 35.82, yoyChange: 4.0 },
    { metric: 'Employment Cost Index', current: 1.1, previous: 0.9, yoyChange: 3.8 },
    { metric: 'Atlanta Fed Wage Tracker', current: 4.6, previous: 4.8, yoyChange: -0.2 },
    { metric: 'Real Wage Growth', current: 1.2, previous: 1.0, yoyChange: 0.2 },
    { metric: 'Unit Labor Cost', current: 2.8, previous: 3.1, yoyChange: -0.3 },
    { metric: 'Productivity (QoQ)', current: 1.5, previous: 2.2, yoyChange: -0.7 },
  ],
};

// ── Formatting Helpers ──

function fmtK(n: number): string {
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'M';
  return n.toFixed(0) + 'K';
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtSignedK(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(0) + 'K';
}

function fmtSigned(n: number, decimals = 1): string {
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(decimals);
}

// ── Color Helpers ──

function nfpColor(actual: number, forecast: number): string {
  if (actual >= forecast) return 'text-green-400';
  if (actual >= forecast * 0.85) return 'text-amber-400';
  return 'text-red-400';
}

function claimsColor(actual: number, previous: number): string {
  if (actual < previous) return 'text-green-400';
  if (actual === previous) return 'text-amber-400';
  return 'text-red-400';
}

function unempColor(current: number, previous: number): string {
  if (current < previous) return 'text-green-400';
  if (current === previous) return 'text-amber-400';
  return 'text-red-400';
}

function sectorColor(change: number): string {
  if (change > 10) return 'text-green-400';
  if (change > 0) return 'text-green-400/70';
  if (change === 0) return 'text-neutral-500';
  if (change > -10) return 'text-red-400/70';
  return 'text-red-400';
}

function trendColor(trend: string): string {
  if (trend === 'improving') return 'text-green-400';
  if (trend === 'stable') return 'text-amber-400';
  return 'text-red-400';
}

function trendBgColor(trend: string): string {
  if (trend === 'improving') return 'bg-green-500/10 border-green-500/20';
  if (trend === 'stable') return 'bg-amber-500/10 border-amber-500/20';
  return 'bg-red-500/10 border-red-500/20';
}

function wageColor(yoy: number): string {
  if (yoy > 0) return 'text-green-400';
  if (yoy < 0) return 'text-red-400';
  return 'text-amber-400';
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/15">
      <div className="w-1 h-1 shrink-0 bg-orange-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-orange-400">
        {title}
      </span>
    </div>
  );
}

// ── Employment Summary Section ──

function EmploymentSummarySection({
  data,
  t,
}: {
  data: EmploymentSummary;
  t: ReturnType<typeof useT>;
}) {
  const nfpBeat = data.nfp >= data.nfpForecast;
  const nfpDelta = data.nfp - data.nfpForecast;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'lmEmploymentSummary', 'Employment Summary')} />

      {/* NFP Headline */}
      <div className="px-3 py-2 border-b border-border/10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'lmNonfarmPayrolls', 'Nonfarm Payrolls')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600">
            {data.reportDate}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-[20px] font-mono font-black tabular-nums ${nfpColor(data.nfp, data.nfpForecast)}`}>
            {fmtSignedK(data.nfp)}
          </span>
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 border ${
            nfpBeat
              ? 'text-green-400 bg-green-500/10 border-green-500/20'
              : 'text-red-400 bg-red-500/10 border-red-500/20'
          }`}>
            {nfpBeat ? 'BEAT' : 'MISS'} {fmtSigned(nfpDelta, 0)}K
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="text-[7px] font-mono text-neutral-600">
            {tr(t, 'lmForecast', 'FCST')}: <span className="text-neutral-400">{data.nfpForecast}K</span>
          </div>
          <div className="text-[7px] font-mono text-neutral-600">
            {tr(t, 'lmPrevious', 'PREV')}: <span className="text-neutral-400">{data.nfpPrevious}K</span>
          </div>
        </div>
      </div>

      {/* Key Rates Grid */}
      <div className="grid grid-cols-3 gap-px bg-border/5">
        {/* Unemployment Rate */}
        <div className="px-2 py-1.5 bg-black hover:bg-orange-400/[0.02] transition-colors">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'lmUnemployment', 'Unemployment')}
          </div>
          <div className={`text-[14px] font-mono font-black tabular-nums ${unempColor(data.unemploymentRate, data.unemploymentPrevious)}`}>
            {fmtPct(data.unemploymentRate)}
          </div>
          <div className="text-[7px] font-mono text-neutral-600">
            {tr(t, 'lmPrev', 'prev')}: {fmtPct(data.unemploymentPrevious)}
          </div>
        </div>

        {/* Participation Rate */}
        <div className="px-2 py-1.5 bg-black hover:bg-orange-400/[0.02] transition-colors">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'lmParticipation', 'Participation')}
          </div>
          <div className={`text-[14px] font-mono font-black tabular-nums ${
            data.participationRate >= data.participationPrevious ? 'text-green-400' : 'text-red-400'
          }`}>
            {fmtPct(data.participationRate)}
          </div>
          <div className="text-[7px] font-mono text-neutral-600">
            {tr(t, 'lmPrev', 'prev')}: {fmtPct(data.participationPrevious)}
          </div>
        </div>

        {/* U6 Rate */}
        <div className="px-2 py-1.5 bg-black hover:bg-orange-400/[0.02] transition-colors">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'lmU6Rate', 'U-6 Rate')}
          </div>
          <div className="text-[14px] font-mono font-black tabular-nums text-amber-400">
            {fmtPct(data.u6Rate)}
          </div>
          <div className="text-[7px] font-mono text-neutral-600">
            {tr(t, 'lmBroader', 'broader measure')}
          </div>
        </div>
      </div>

      {/* Hourly Earnings / Weekly Hours */}
      <div className="grid grid-cols-3 gap-px bg-border/5 border-t border-border/10">
        <div className="px-2 py-1.5 bg-black hover:bg-orange-400/[0.02] transition-colors">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'lmAheYoY', 'AHE YoY')}
          </div>
          <div className={`text-[11px] font-mono font-bold tabular-nums ${wageColor(data.averageHourlyEarningsYoY)}`}>
            {fmtSigned(data.averageHourlyEarningsYoY)}%
          </div>
        </div>
        <div className="px-2 py-1.5 bg-black hover:bg-orange-400/[0.02] transition-colors">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'lmAheMoM', 'AHE MoM')}
          </div>
          <div className={`text-[11px] font-mono font-bold tabular-nums ${wageColor(data.averageHourlyEarningsMoM)}`}>
            {fmtSigned(data.averageHourlyEarningsMoM)}%
          </div>
        </div>
        <div className="px-2 py-1.5 bg-black hover:bg-orange-400/[0.02] transition-colors">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'lmAvgWeeklyHrs', 'Avg Wkly Hrs')}
          </div>
          <div className="text-[11px] font-mono font-bold tabular-nums text-white">
            {data.averageWeeklyHours.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Jobless Claims Section ──

function JoblessClaimsSection({
  data,
  t,
}: {
  data: JoblessClaims;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'lmJoblessClaims', 'Jobless Claims')} />

      <div className="grid grid-cols-2 gap-px bg-border/5">
        {/* Initial Claims */}
        <div className="px-2 py-1.5 bg-black hover:bg-orange-400/[0.02] transition-colors">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'lmInitialClaims', 'Initial Claims')}
          </div>
          <div className={`text-[14px] font-mono font-black tabular-nums ${claimsColor(data.initialClaims, data.initialPrevious)}`}>
            {fmtK(data.initialClaims)}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[7px] font-mono text-neutral-600">
              {tr(t, 'lmPrev', 'prev')}: {fmtK(data.initialPrevious)}
            </span>
            <span className="text-[7px] font-mono text-neutral-600">
              {tr(t, 'lmFcst', 'fcst')}: {fmtK(data.initialForecast)}
            </span>
          </div>
        </div>

        {/* Continuing Claims */}
        <div className="px-2 py-1.5 bg-black hover:bg-orange-400/[0.02] transition-colors">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'lmContinuingClaims', 'Continuing Claims')}
          </div>
          <div className={`text-[14px] font-mono font-black tabular-nums ${claimsColor(data.continuingClaims, data.continuingPrevious)}`}>
            {fmtK(data.continuingClaims)}
          </div>
          <div className="text-[7px] font-mono text-neutral-600 mt-0.5">
            {tr(t, 'lmPrev', 'prev')}: {fmtK(data.continuingPrevious)}
          </div>
        </div>
      </div>

      {/* 4-Week Moving Average */}
      <div className="px-3 py-1.5 border-t border-border/10 flex items-center justify-between hover:bg-orange-400/[0.02] transition-colors">
        <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
          {tr(t, 'lm4WeekAvg', '4-Week Moving Avg')}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono font-bold tabular-nums ${claimsColor(data.fourWeekAvg, data.fourWeekAvgPrevious)}`}>
            {fmtK(data.fourWeekAvg)}
          </span>
          <span className="text-[7px] font-mono text-neutral-600">
            {tr(t, 'lmPrev', 'prev')}: {fmtK(data.fourWeekAvgPrevious)}
          </span>
        </div>
      </div>

      <div className="px-3 py-0.5 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'lmReportDate', 'Report')}: {data.reportDate}
        </span>
      </div>
    </div>
  );
}

// ── JOLTS Section ──

function JoltsSection({
  data,
  t,
}: {
  data: JoltsData;
  t: ReturnType<typeof useT>;
}) {
  const metrics = [
    {
      label: tr(t, 'lmJobOpenings', 'Job Openings'),
      current: data.jobOpenings,
      previous: data.jobOpeningsPrevious,
      improving: data.jobOpenings > data.jobOpeningsPrevious,
    },
    {
      label: tr(t, 'lmHires', 'Hires'),
      current: data.hires,
      previous: data.hiresPrevious,
      improving: data.hires > data.hiresPrevious,
    },
    {
      label: tr(t, 'lmQuits', 'Quits'),
      current: data.quits,
      previous: data.quitsPrevious,
      improving: data.quits > data.quitsPrevious,
    },
    {
      label: tr(t, 'lmLayoffs', 'Layoffs'),
      current: data.layoffs,
      previous: data.layoffsPrevious,
      improving: data.layoffs < data.layoffsPrevious,
    },
  ];

  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'lmJoltsData', 'JOLTS Data')} />

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_0.6fr_0.6fr_0.4fr] px-3 py-1 border-b border-border/10 text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider">
        <span>{tr(t, 'lmMetric', 'Metric')}</span>
        <span className="text-right">{tr(t, 'lmCurrent', 'Current')}</span>
        <span className="text-right">{tr(t, 'lmPrevious', 'Previous')}</span>
        <span className="text-right">{tr(t, 'lmChg', 'Chg')}</span>
      </div>

      {metrics.map((m) => {
        const delta = m.current - m.previous;
        return (
          <div
            key={m.label}
            className="grid grid-cols-[1fr_0.6fr_0.6fr_0.4fr] px-3 py-1 border-b border-border/10 hover:bg-orange-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">
              {m.label}
            </span>
            <span className="text-[9px] font-mono font-bold text-white text-right tabular-nums">
              {fmtK(m.current)}
            </span>
            <span className="text-[8px] font-mono text-neutral-500 text-right tabular-nums">
              {fmtK(m.previous)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${m.improving ? 'text-green-400' : 'text-red-400'}`}>
              {fmtSigned(delta, 0)}
            </span>
          </div>
        );
      })}

      {/* Quit Rate & Openings/Unemployed */}
      <div className="grid grid-cols-2 gap-px bg-border/5 border-t border-border/10">
        <div className="px-2 py-1.5 bg-black hover:bg-orange-400/[0.02] transition-colors">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'lmQuitRate', 'Quit Rate')}
          </div>
          <div className="text-[11px] font-mono font-bold tabular-nums text-amber-400">
            {data.quitRate.toFixed(1)}%
          </div>
        </div>
        <div className="px-2 py-1.5 bg-black hover:bg-orange-400/[0.02] transition-colors">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'lmOpeningsPerUnemployed', 'Openings / Unemployed')}
          </div>
          <div className={`text-[11px] font-mono font-bold tabular-nums ${data.openingsToUnemployed >= 1.0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.openingsToUnemployed.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="px-3 py-0.5 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'lmReportDate', 'Report')}: {data.reportDate}
        </span>
      </div>
    </div>
  );
}

// ── Sector Employment Section ──

function SectorEmploymentSection({
  sectors,
  t,
}: {
  sectors: SectorEmployment[];
  t: ReturnType<typeof useT>;
}) {
  const sorted = [...sectors].sort((a, b) => b.change - a.change);
  const maxAbs = Math.max(...sorted.map((s) => Math.abs(s.change)), 1);

  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'lmSectorEmployment', 'Sector Employment (K)')} />

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_0.5fr_0.5fr_0.5fr_0.8fr] px-3 py-1 border-b border-border/10 text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider">
        <span>{tr(t, 'lmSector', 'Sector')}</span>
        <span className="text-right">{tr(t, 'lmChange', 'Chg')}</span>
        <span className="text-right">{tr(t, 'lmPrev', 'Prev')}</span>
        <span className="text-right">{tr(t, 'lm3mAvg', '3M Avg')}</span>
        <span className="text-right">{tr(t, 'lmBar', '')}</span>
      </div>

      {sorted.map((s) => {
        const barWidth = Math.abs(s.change) / maxAbs;
        const isPositive = s.change >= 0;

        return (
          <div
            key={s.sector}
            className="grid grid-cols-[1fr_0.5fr_0.5fr_0.5fr_0.8fr] px-3 py-1 border-b border-border/10 hover:bg-orange-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono text-white truncate">{s.sector}</span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${sectorColor(s.change)}`}>
              {fmtSigned(s.change, 0)}
            </span>
            <span className="text-[8px] font-mono text-neutral-500 text-right tabular-nums">
              {fmtSigned(s.previous, 0)}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
              {fmtSigned(s.threeMonthAvg, 0)}
            </span>
            <div className="flex items-center justify-end">
              <div className="w-full h-2 bg-white/[0.03] relative overflow-hidden">
                <div
                  className={`absolute h-full ${isPositive ? 'bg-green-400/50 right-1/2' : 'bg-red-400/50 left-1/2'}`}
                  style={{
                    width: `${barWidth * 50}%`,
                    [isPositive ? 'right' : 'left']: '50%',
                  }}
                />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-neutral-700" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Global Labor Markets Section ──

function GlobalLaborSection({
  data,
  t,
}: {
  data: GlobalLabor[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'lmGlobalLabor', 'Global Labor Markets')} />

      {/* Column headers */}
      <div className="grid grid-cols-[0.4fr_1fr_0.6fr_0.6fr_0.6fr_0.6fr] px-3 py-1 border-b border-border/10 text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider">
        <span>{tr(t, 'lmCode', '')}</span>
        <span>{tr(t, 'lmCountry', 'Country')}</span>
        <span className="text-right">{tr(t, 'lmUnemp', 'Unemp')}</span>
        <span className="text-right">{tr(t, 'lmPrev', 'Prev')}</span>
        <span className="text-right">{tr(t, 'lmPart', 'Part')}</span>
        <span className="text-right">{tr(t, 'lmTrend', 'Trend')}</span>
      </div>

      {data.map((g) => (
        <div
          key={g.code}
          className="grid grid-cols-[0.4fr_1fr_0.6fr_0.6fr_0.6fr_0.6fr] px-3 py-1 border-b border-border/10 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-orange-400/60">{g.code}</span>
          <span className="text-[8px] font-mono text-white truncate">{g.country}</span>
          <span className={`text-[9px] font-mono font-bold text-right tabular-nums ${unempColor(g.unemploymentRate, g.previous)}`}>
            {fmtPct(g.unemploymentRate)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right tabular-nums">
            {fmtPct(g.previous)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
            {fmtPct(g.participationRate)}
          </span>
          <span className="text-right">
            <span className={`text-[7px] font-mono font-bold px-1 py-px border ${trendBgColor(g.trend)} ${trendColor(g.trend)} uppercase`}>
              {g.trend === 'improving'
                ? tr(t, 'lmImproving', 'IMPV')
                : g.trend === 'stable'
                  ? tr(t, 'lmStable', 'STBL')
                  : tr(t, 'lmDeteriorating', 'DETR')}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Wage Tracker Section ──

function WageTrackerSection({
  wages,
  t,
}: {
  wages: WageTracker[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'lmWageTracker', 'Wage Tracker')} />

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_0.5fr_0.5fr_0.5fr] px-3 py-1 border-b border-border/10 text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider">
        <span>{tr(t, 'lmMetric', 'Metric')}</span>
        <span className="text-right">{tr(t, 'lmCurrent', 'Current')}</span>
        <span className="text-right">{tr(t, 'lmPrevious', 'Previous')}</span>
        <span className="text-right">{tr(t, 'lmYoY', 'YoY')}</span>
      </div>

      {wages.map((w) => (
        <div
          key={w.metric}
          className="grid grid-cols-[1fr_0.5fr_0.5fr_0.5fr] px-3 py-1 border-b border-border/10 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono text-white truncate">{w.metric}</span>
          <span className="text-[9px] font-mono font-bold text-white text-right tabular-nums">
            {w.current.toFixed(1)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right tabular-nums">
            {w.previous.toFixed(1)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${wageColor(w.yoyChange)}`}>
            {fmtSigned(w.yoyChange)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ──

export function LaborMarketPanel() {
  const t = useT();
  const { data: rawData, isLoading, refetch } = useLaborMarket();

  const data: LaborMarketData = rawData ?? FALLBACK_DATA;
  const hasLiveData = !!rawData;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-orange-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-orange-400">
            {tr(t, 'lmTitle', 'Labor Market Dashboard')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!hasLiveData && !isLoading && (
            <span className="text-[7px] font-mono text-neutral-600 uppercase">
              {tr(t, 'lmStatic', 'Static')}
            </span>
          )}
          {data.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-orange-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && !rawData && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-amber-400 uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </span>
        </div>
      )}

      {/* Content */}
      {(!isLoading || rawData) && (
        <div className="flex-1 overflow-auto no-scrollbar">
          <EmploymentSummarySection data={data.employment} t={t} />
          <JoblessClaimsSection data={data.claims} t={t} />
          <JoltsSection data={data.jolts} t={t} />
          <SectorEmploymentSection sectors={data.sectorEmployment} t={t} />
          <GlobalLaborSection data={data.globalLabor} t={t} />
          <WageTrackerSection wages={data.wages} t={t} />

          {/* Footer */}
          <div className="px-3 py-2 border-t border-border/20">
            <p className="text-[7px] font-mono text-neutral-700 leading-relaxed">
              {tr(t, 'lmDisclaimer', 'Data sourced from BLS, DOL, and international statistics agencies. Figures in thousands unless noted. Not investment advice.')}
            </p>
          </div>

          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
