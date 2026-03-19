import { useState } from 'react';
import { useEconomicForecast } from '../../api/hooks/use-economic-forecast';

// --- Types ---

interface ForecastIndicator {
  name?: string;
  current?: number;
  consensus?: number;
  high?: number;
  low?: number;
  previous?: number;
  revision?: number;
  numEstimates?: number;
  surprise?: number;
}

interface RecessionProbability {
  region?: string;
  probability?: number;
}

interface ConsensusShift {
  date?: string;
  country?: string;
  indicator?: string;
  direction?: string;
  magnitude?: number;
  detail?: string;
}

interface CountryForecast {
  indicators?: ForecastIndicator[];
}

interface GlobalSummary {
  globalGrowth?: number;
  globalInflation?: number;
  recessionProbabilities?: RecessionProbability[];
}

interface ForecastData {
  lastUpdated?: string;
  countries?: Record<string, CountryForecast>;
  globalSummary?: GlobalSummary;
  recentShifts?: ConsensusShift[];
}

// --- Constants ---

const COUNTRY_TABS = [
  { code: 'US', label: 'US' },
  { code: 'EU', label: 'EU' },
  { code: 'UK', label: 'UK' },
  { code: 'JP', label: 'JP' },
  { code: 'CN', label: 'CN' },
  { code: 'IN', label: 'IN' },
  { code: 'BR', label: 'BR' },
  { code: 'CA', label: 'CA' },
  { code: 'AU', label: 'AU' },
  { code: 'KR', label: 'KR' },
] as const;

const INDICATOR_NAMES = [
  'GDP Growth',
  'CPI',
  'Unemployment',
  'Current Account',
  'Govt Debt',
  '10Y Yield',
];

const FORECAST_COLUMNS = [
  { key: 'indicator', label: 'INDICATOR', align: 'left' as const },
  { key: 'current', label: 'CURRENT', align: 'right' as const },
  { key: 'consensus', label: 'CONSNS', align: 'right' as const },
  { key: 'high', label: 'HIGH', align: 'right' as const },
  { key: 'low', label: 'LOW', align: 'right' as const },
  { key: 'previous', label: 'PREV', align: 'right' as const },
  { key: 'revision', label: 'REV', align: 'right' as const },
  { key: 'numEstimates', label: '# EST', align: 'right' as const },
  { key: 'surprise', label: 'SURPR', align: 'right' as const },
];

// --- Color Helpers ---

function revisionColor(val: number | undefined): string {
  if (val == null) return 'text-neutral-500';
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function surpriseColor(val: number | undefined): string {
  if (val == null) return 'text-neutral-500';
  if (val > 1) return 'text-emerald-400';
  if (val > 0) return 'text-emerald-400/60';
  if (val < -1) return 'text-red-400';
  if (val < 0) return 'text-red-400/60';
  return 'text-neutral-500';
}

function recessionBarColor(prob: number): string {
  if (prob >= 50) return 'bg-red-500';
  if (prob >= 30) return 'bg-amber-500';
  if (prob >= 15) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

function recessionTextColor(prob: number): string {
  if (prob >= 50) return 'text-red-400';
  if (prob >= 30) return 'text-amber-400';
  if (prob >= 15) return 'text-yellow-400';
  return 'text-emerald-400';
}

function formatNum(val: number | undefined, decimals: number = 1): string {
  if (val == null) return '--';
  return val.toFixed(decimals);
}

function signedNum(val: number | undefined, decimals: number = 2): string {
  if (val == null) return '--';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(decimals)}`;
}

// --- Main Panel ---

export function EconomicForecastPanel() {
  const { data, isLoading } = useEconomicForecast();
  const [selectedCountry, setSelectedCountry] = useState<string>('US');

  const forecastData = data as ForecastData | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 16 16" fill="none">
            <path d="M2 14V6l3-4 3 6 3-3 3 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
            <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-400">
            ECONOMIC FORECAST CONSENSUS
          </span>
        </div>
        <span className="text-[7px] text-neutral-500">
          {forecastData?.lastUpdated ? `UPD ${forecastData.lastUpdated}` : ''}
        </span>
      </div>

      {/* Country Tabs */}
      <div className="flex items-center gap-0 px-2 py-1 border-b border-border/20 bg-black/40 shrink-0 overflow-x-auto no-scrollbar">
        {COUNTRY_TABS.map((c) => (
          <button
            key={c.code}
            onClick={() => setSelectedCountry(c.code)}
            className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider transition-all shrink-0 ${
              selectedCountry === c.code
                ? 'bg-emerald-400/15 text-emerald-400 border-b-2 border-emerald-400'
                : 'text-neutral-500 hover:text-white border-b-2 border-transparent'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <span className="text-emerald-400 uppercase tracking-widest animate-pulse">
              LOADING...
            </span>
          </div>
        )}

        {!isLoading && !forecastData && (
          <div className="flex items-center justify-center py-12">
            <span className="text-neutral-500 uppercase tracking-widest">
              NO DATA AVAILABLE
            </span>
          </div>
        )}

        {!isLoading && forecastData && (
          <>
            {/* Forecast Table */}
            <ForecastTable
              country={selectedCountry}
              indicators={forecastData?.countries?.[selectedCountry]?.indicators}
            />

            {/* Global Summary */}
            <GlobalSummarySection summary={forecastData?.globalSummary} />

            {/* Recent Consensus Shifts */}
            <RecentShiftsSection shifts={forecastData?.recentShifts} />
          </>
        )}
      </div>
    </div>
  );
}

// --- Forecast Table ---

function ForecastTable({
  country,
  indicators,
}: {
  country: string;
  indicators?: ForecastIndicator[];
}) {
  const rows = indicators?.length
    ? indicators
    : INDICATOR_NAMES.map((name) => ({ name } as ForecastIndicator));

  return (
    <div className="border-b border-border/20">
      {/* Section label */}
      <div className="px-3 py-1 bg-white/[0.02] border-b border-border/20">
        <span className="text-[7px] font-black uppercase tracking-[0.15em] text-emerald-400/60">
          {country} FORECAST ESTIMATES
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_52px_52px_44px_44px_52px_40px_36px_44px] px-3 py-1 border-b border-border/10 bg-black/20">
        {FORECAST_COLUMNS.map((col) => (
          <span
            key={col.key}
            className={`text-[7px] font-black uppercase tracking-wider text-neutral-500 ${
              col.align === 'right' ? 'text-right' : 'text-left'
            }`}
          >
            {col.label}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row, idx) => (
        <div
          key={row?.name ?? idx}
          className="grid grid-cols-[1fr_52px_52px_44px_44px_52px_40px_36px_44px] px-3 py-1.5 border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <span className="text-neutral-300 truncate pr-1">
            {row?.name ?? INDICATOR_NAMES[idx] ?? '--'}
          </span>
          <span className="text-right text-white font-bold tabular-nums">
            {formatNum(row?.current)}
          </span>
          <span className="text-right text-emerald-400 font-bold tabular-nums">
            {formatNum(row?.consensus)}
          </span>
          <span className="text-right text-neutral-400 tabular-nums">
            {formatNum(row?.high)}
          </span>
          <span className="text-right text-neutral-400 tabular-nums">
            {formatNum(row?.low)}
          </span>
          <span className="text-right text-neutral-500 tabular-nums">
            {formatNum(row?.previous)}
          </span>
          <span className={`text-right font-bold tabular-nums ${revisionColor(row?.revision)}`}>
            {signedNum(row?.revision)}
          </span>
          <span className="text-right text-neutral-500 tabular-nums">
            {row?.numEstimates != null ? row.numEstimates : '--'}
          </span>
          <span className={`text-right font-bold tabular-nums ${surpriseColor(row?.surprise)}`}>
            {signedNum(row?.surprise)}
          </span>
        </div>
      ))}
    </div>
  );
}

// --- Global Summary ---

function GlobalSummarySection({ summary }: { summary?: GlobalSummary }) {
  const probabilities = summary?.recessionProbabilities ?? [];
  const maxProb = Math.max(
    ...probabilities.map((p) => p?.probability ?? 0),
    1,
  );

  return (
    <div className="border-b border-border/20">
      {/* Section label */}
      <div className="px-3 py-1 bg-white/[0.02] border-b border-border/20">
        <span className="text-[7px] font-black uppercase tracking-[0.15em] text-emerald-400/60">
          GLOBAL OUTLOOK
        </span>
      </div>

      {/* Growth & Inflation summary */}
      <div className="flex gap-6 px-3 py-2 border-b border-border/10">
        <div className="flex flex-col">
          <span className="text-[7px] text-neutral-500 uppercase tracking-wider">
            GLOBAL GROWTH
          </span>
          <span className="text-[16px] font-black text-white tabular-nums">
            {formatNum(summary?.globalGrowth)}
            <span className="text-[8px] text-neutral-500 ml-0.5">%</span>
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[7px] text-neutral-500 uppercase tracking-wider">
            GLOBAL INFLATION
          </span>
          <span className="text-[16px] font-black text-white tabular-nums">
            {formatNum(summary?.globalInflation)}
            <span className="text-[8px] text-neutral-500 ml-0.5">%</span>
          </span>
        </div>
      </div>

      {/* Recession Probability Bars */}
      {probabilities.length > 0 && (
        <div className="px-3 py-2">
          <div className="text-[7px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">
            RECESSION PROBABILITIES (12M)
          </div>
          <div className="flex flex-col gap-1">
            {probabilities.map((p, idx) => {
              const prob = p?.probability ?? 0;
              const barWidth = maxProb > 0 ? (prob / maxProb) * 100 : 0;
              return (
                <div key={p?.region ?? idx} className="flex items-center gap-2">
                  <span className="text-[8px] text-neutral-400 w-8 shrink-0 uppercase font-bold">
                    {p?.region ?? '--'}
                  </span>
                  <div className="flex-1 h-3 bg-white/[0.03] relative">
                    <div
                      className={`h-full ${recessionBarColor(prob)} opacity-70 transition-all`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className={`text-[8px] font-bold tabular-nums w-10 text-right ${recessionTextColor(prob)}`}>
                    {prob.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fallback when no probabilities */}
      {probabilities.length === 0 && (
        <div className="px-3 py-2">
          <div className="text-[7px] font-black uppercase tracking-wider text-neutral-500 mb-1">
            RECESSION PROBABILITIES
          </div>
          <span className="text-[8px] text-neutral-600 uppercase">No data</span>
        </div>
      )}
    </div>
  );
}

// --- Recent Consensus Shifts ---

function RecentShiftsSection({ shifts }: { shifts?: ConsensusShift[] }) {
  const items = shifts ?? [];

  return (
    <div>
      {/* Section label */}
      <div className="px-3 py-1 bg-white/[0.02] border-b border-border/20">
        <span className="text-[7px] font-black uppercase tracking-[0.15em] text-emerald-400/60">
          RECENT CONSENSUS SHIFTS
        </span>
      </div>

      {items.length === 0 && (
        <div className="px-3 py-3 text-center">
          <span className="text-[8px] text-neutral-600 uppercase tracking-wider">
            No recent shifts
          </span>
        </div>
      )}

      {items.length > 0 && (
        <div className="max-h-[160px] overflow-auto no-scrollbar">
          {items.map((shift, idx) => {
            const isUp = shift?.direction === 'up';
            const isDown = shift?.direction === 'down';
            return (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors"
              >
                {/* Direction arrow */}
                <span className={`text-[10px] shrink-0 ${isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-neutral-500'}`}>
                  {isUp ? '\u25B2' : isDown ? '\u25BC' : '\u25CF'}
                </span>

                {/* Country badge */}
                <span className="text-[7px] font-black text-emerald-400/80 bg-emerald-400/10 px-1 py-0.5 shrink-0 uppercase">
                  {shift?.country ?? '--'}
                </span>

                {/* Indicator & detail */}
                <div className="flex-1 min-w-0">
                  <span className="text-neutral-300 truncate">
                    {shift?.indicator ?? '--'}
                  </span>
                  {shift?.detail && (
                    <span className="text-neutral-500 ml-1.5 truncate">
                      {shift.detail}
                    </span>
                  )}
                </div>

                {/* Magnitude */}
                {shift?.magnitude != null && (
                  <span className={`text-[8px] font-bold tabular-nums shrink-0 ${isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-neutral-500'}`}>
                    {shift.magnitude > 0 ? '+' : ''}{shift.magnitude.toFixed(2)}
                  </span>
                )}

                {/* Date */}
                <span className="text-[7px] text-neutral-600 shrink-0">
                  {shift?.date ?? ''}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-border/20">
        <span className="text-[7px] text-neutral-600/50">
          Forecasts sourced from economist consensus surveys. Not investment advice.
        </span>
      </div>
    </div>
  );
}
