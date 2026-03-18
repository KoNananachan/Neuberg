import { useMemo } from 'react';
import { useGlobalPmiDashboard } from '../../api/hooks/use-global-pmi-dashboard';
import { useT } from '../../i18n';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Types ──

interface PmiCountry {
  name: string;
  isoCode: string;
  region: string;
  manufacturing: number;
  services: number;
  composite: number;
  manufacturingPrev: number;
  servicesPrev: number;
  compositePrev: number;
  manufacturingChange: number;
  servicesChange: number;
  compositeChange: number;
  newOrders: number;
  employment: number;
  outputPrices: number;
  trend: string;
  consecutiveMonths: number;
}

interface GlobalComposite {
  manufacturing: number;
  services: number;
  composite: number;
  change: number;
  trend: string;
}

interface TrendPoint {
  month: string;
  manufacturing: number;
  services: number;
  composite: number;
}

interface PmiSummary {
  globalManufacturing: number;
  globalServices: number;
  countriesExpanding: number;
  countriesContracting: number;
  strongestPMI: string;
  weakestPMI: string;
  avgChange: number;
}

interface GlobalPmiData {
  countries: PmiCountry[];
  globalComposite: GlobalComposite;
  trends: TrendPoint[];
  summary: PmiSummary;
}

// ── Color helpers ──

function pmiColor(value: number): string {
  if (value > 50) return 'text-emerald-400';
  if (value < 50) return 'text-red-400';
  return 'text-neutral-400';
}

function changeColor(value: number): string {
  if (value > 0) return 'text-emerald-400';
  if (value < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function trendBadge(trend: string): { text: string; bg: string } {
  switch (trend) {
    case 'Expanding':
      return { text: 'text-emerald-400', bg: 'bg-emerald-400/15' };
    case 'Contracting':
      return { text: 'text-red-400', bg: 'bg-red-400/15' };
    case 'Stagnating':
      return { text: 'text-yellow-400', bg: 'bg-yellow-400/15' };
    default:
      return { text: 'text-neutral-500', bg: 'bg-neutral-500/10' };
  }
}

function globalTrendIndicator(trend: string): string {
  switch (trend) {
    case 'Expanding': return '\u25B2';
    case 'Contracting': return '\u25BC';
    default: return '\u25C6';
  }
}

function fmtPmi(value: number): string {
  return value.toFixed(1);
}

function fmtChange(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}`;
}

// ── Trend sparkline ──

function TrendSparkline({ trends }: { trends: TrendPoint[] }) {
  const W = 80;
  const H = 20;
  const PAD = 2;

  if (trends.length < 2) return null;

  const allValues = trends.flatMap((t) => [t.manufacturing, t.services, t.composite]);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const toPoints = (getter: (t: TrendPoint) => number): string =>
    trends
      .map((t, i) => {
        const x = PAD + (i / (trends.length - 1)) * (W - PAD * 2);
        const y = PAD + (1 - (getter(t) - min) / range) * (H - PAD * 2);
        return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
      })
      .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="inline-block" style={{ width: 80, height: 20 }}>
      <line x1={PAD} y1={PAD + (1 - (50 - min) / range) * (H - PAD * 2)} x2={W - PAD} y2={PAD + (1 - (50 - min) / range) * (H - PAD * 2)} stroke="#a3e635" strokeWidth={0.3} opacity={0.3} strokeDasharray="2,2" />
      <path d={toPoints((t) => t.manufacturing)} fill="none" stroke="#38bdf8" strokeWidth={1} opacity={0.6} />
      <path d={toPoints((t) => t.services)} fill="none" stroke="#c084fc" strokeWidth={1} opacity={0.6} />
      <path d={toPoints((t) => t.composite)} fill="none" stroke="#a3e635" strokeWidth={1.2} opacity={0.9} />
    </svg>
  );
}

// ── Main component ──

export function GlobalPmiDashboardPanel() {
  const t = useT();
  const { data, isLoading } = useGlobalPmiDashboard();

  const pmiData = data as GlobalPmiData | undefined;

  const sortedCountries = useMemo(() => {
    if (!pmiData?.countries) return [];
    return [...pmiData.countries]
      .sort((a, b) => b.composite - a.composite)
      .slice(0, 20);
  }, [pmiData?.countries]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="flex items-center px-3 py-1.5 border-b border-lime-400/30">
          <span className="text-[9px] font-mono font-black uppercase tracking-wider text-lime-400">
            {tr(t, 'pmiDashboardTitle', 'GLOBAL PMI DASHBOARD')}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-lime-400/50 animate-pulse">LOADING...</span>
        </div>
      </div>
    );
  }

  const gc = pmiData?.globalComposite;
  const summary = pmiData?.summary;
  const trends = pmiData?.trends ?? [];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-lime-400/30 shrink-0">
        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-lime-400">
          {tr(t, 'pmiDashboardTitle', 'GLOBAL PMI DASHBOARD')}
        </span>
        <span className="text-[7px] font-mono text-lime-400/30 uppercase">
          {tr(t, 'pmiSource', 'S&P GLOBAL / CAIXIN')}
        </span>
      </div>

      {/* Global composite bar */}
      {gc && (
        <div className="flex items-center gap-4 px-3 py-1.5 border-b border-lime-400/10 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-mono text-lime-400/50 uppercase">{tr(t, 'pmiMfg', 'MFG')}</span>
            <span className={`text-[9px] font-mono font-bold ${pmiColor(gc.manufacturing)}`}>
              {fmtPmi(gc.manufacturing)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-mono text-lime-400/50 uppercase">{tr(t, 'pmiSvc', 'SVC')}</span>
            <span className={`text-[9px] font-mono font-bold ${pmiColor(gc.services)}`}>
              {fmtPmi(gc.services)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-mono text-lime-400/50 uppercase">{tr(t, 'pmiComp', 'COMP')}</span>
            <span className={`text-[9px] font-mono font-bold ${pmiColor(gc.composite)}`}>
              {fmtPmi(gc.composite)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-[9px] font-mono ${changeColor(gc.change)}`}>
              {fmtChange(gc.change)}
            </span>
            <span className={`text-[8px] font-mono ${gc.trend === 'Expanding' ? 'text-emerald-400' : gc.trend === 'Contracting' ? 'text-red-400' : 'text-yellow-400'}`}>
              {globalTrendIndicator(gc.trend)}
            </span>
          </div>
          {trends.length >= 2 && (
            <div className="ml-auto">
              <TrendSparkline trends={trends} />
            </div>
          )}
        </div>
      )}

      {/* Summary bar */}
      {summary && (
        <div className="flex items-center gap-4 px-3 py-1 border-b border-lime-400/10 shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-lime-400/40 uppercase">{tr(t, 'pmiExpanding', 'EXPANDING')}</span>
            <span className="text-[9px] font-mono font-bold text-emerald-400">{summary.countriesExpanding}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-lime-400/40 uppercase">{tr(t, 'pmiContracting', 'CONTRACTING')}</span>
            <span className="text-[9px] font-mono font-bold text-red-400">{summary.countriesContracting}</span>
          </div>
          <div className="w-px h-3 bg-lime-400/10" />
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-lime-400/40 uppercase">{tr(t, 'pmiStrongest', 'STRONGEST')}</span>
            <span className="text-[9px] font-mono text-emerald-400">{summary.strongestPMI}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-lime-400/40 uppercase">{tr(t, 'pmiWeakest', 'WEAKEST')}</span>
            <span className="text-[9px] font-mono text-red-400">{summary.weakestPMI}</span>
          </div>
          <div className="w-px h-3 bg-lime-400/10" />
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-lime-400/40 uppercase">{tr(t, 'pmiAvgChg', 'AVG CHG')}</span>
            <span className={`text-[9px] font-mono font-bold ${changeColor(summary.avgChange)}`}>
              {fmtChange(summary.avgChange)}
            </span>
          </div>
        </div>
      )}

      {/* Main table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-black">
            <tr className="border-b border-lime-400/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-lime-400/60 whitespace-nowrap">
                {tr(t, 'pmiColCountry', 'COUNTRY')}
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-lime-400/60 whitespace-nowrap">
                {tr(t, 'pmiColMfg', 'MFG')}
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-lime-400/60 whitespace-nowrap">
                {tr(t, 'pmiColSvc', 'SVC')}
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-lime-400/60 whitespace-nowrap">
                {tr(t, 'pmiColComp', 'COMP')}
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-lime-400/60 whitespace-nowrap">
                {tr(t, 'pmiColMfgChg', 'MFG CHG')}
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-lime-400/60 whitespace-nowrap">
                {tr(t, 'pmiColSvcChg', 'SVC CHG')}
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-lime-400/60 whitespace-nowrap">
                {tr(t, 'pmiColCompChg', 'COMP CHG')}
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-lime-400/60 whitespace-nowrap">
                {tr(t, 'pmiColNewOrders', 'NEW ORD')}
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-lime-400/60 whitespace-nowrap">
                {tr(t, 'pmiColEmployment', 'EMPL')}
              </th>
              <th className="px-1.5 py-1 text-center text-[7px] font-mono font-bold uppercase tracking-wider text-lime-400/60 whitespace-nowrap">
                {tr(t, 'pmiColTrend', 'TREND')}
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-lime-400/60 whitespace-nowrap">
                {tr(t, 'pmiColConsec', 'CONSEC')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCountries.map((c) => {
              const badge = trendBadge(c.trend);
              return (
                <tr
                  key={c.isoCode}
                  className="border-b border-lime-400/[0.05] hover:bg-lime-400/[0.02] transition-colors"
                >
                  <td className="px-1.5 py-0.5 text-[9px] font-mono text-lime-400/80 whitespace-nowrap">
                    <span className="text-[8px] mr-1 text-lime-400/40">{c.isoCode}</span>
                    {c.name}
                  </td>
                  <td className={`px-1.5 py-0.5 text-right text-[9px] font-mono font-bold ${pmiColor(c.manufacturing)}`}>
                    {fmtPmi(c.manufacturing)}
                  </td>
                  <td className={`px-1.5 py-0.5 text-right text-[9px] font-mono font-bold ${pmiColor(c.services)}`}>
                    {fmtPmi(c.services)}
                  </td>
                  <td className={`px-1.5 py-0.5 text-right text-[9px] font-mono font-bold ${pmiColor(c.composite)}`}>
                    {fmtPmi(c.composite)}
                  </td>
                  <td className={`px-1.5 py-0.5 text-right text-[9px] font-mono ${changeColor(c.manufacturingChange)}`}>
                    {fmtChange(c.manufacturingChange)}
                  </td>
                  <td className={`px-1.5 py-0.5 text-right text-[9px] font-mono ${changeColor(c.servicesChange)}`}>
                    {fmtChange(c.servicesChange)}
                  </td>
                  <td className={`px-1.5 py-0.5 text-right text-[9px] font-mono ${changeColor(c.compositeChange)}`}>
                    {fmtChange(c.compositeChange)}
                  </td>
                  <td className={`px-1.5 py-0.5 text-right text-[9px] font-mono ${pmiColor(c.newOrders)}`}>
                    {fmtPmi(c.newOrders)}
                  </td>
                  <td className={`px-1.5 py-0.5 text-right text-[9px] font-mono ${pmiColor(c.employment)}`}>
                    {fmtPmi(c.employment)}
                  </td>
                  <td className="px-1.5 py-0.5 text-center">
                    <span className={`inline-block px-1 py-px text-[7px] font-mono font-bold uppercase ${badge.text} ${badge.bg}`}>
                      {c.trend}
                    </span>
                  </td>
                  <td className="px-1.5 py-0.5 text-right text-[9px] font-mono text-lime-400/60">
                    {c.consecutiveMonths}
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
