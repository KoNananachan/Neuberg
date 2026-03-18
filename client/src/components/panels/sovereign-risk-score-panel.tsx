import { useState, useMemo } from 'react';
import { useSovereignRiskScore } from '../../api/hooks/use-sovereign-risk-score';
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

// ── Local types (no imports from hook) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SovereignRiskData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CountryRisk = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RegionAverage = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WatchlistEntry = any;

// ── Constants ──

const AMBER = '#fbbf24';
const RED = '#f87171';
const GREEN = '#34d399';
const YELLOW = '#facc15';
const CYAN = '#22d3ee';
const WHITE_DIM = 'rgba(255,255,255,0.35)';

const REGION_TABS = ['All', 'G7', 'EU', 'EM Asia', 'EM Latam', 'EM EMEA', 'Frontier'] as const;
type RegionTab = (typeof REGION_TABS)[number];

// ── Formatting helpers ──

function fmtScore(n: number): string {
  return n.toFixed(1);
}

function fmtChange(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function trendArrow(trend: string): { symbol: string; color: string } {
  switch (trend) {
    case 'improving':
      return { symbol: '\u25B2', color: GREEN };
    case 'deteriorating':
      return { symbol: '\u25BC', color: RED };
    case 'stable':
      return { symbol: '\u25C6', color: 'rgba(255,255,255,0.25)' };
    default:
      return { symbol: '\u2013', color: 'rgba(255,255,255,0.15)' };
  }
}

// ── Score color mapping (0-100 scale, lower = riskier) ──

function scoreColor(score: number): string {
  if (score >= 80) return GREEN;
  if (score >= 60) return '#6ee7b7';
  if (score >= 40) return YELLOW;
  if (score >= 20) return '#fb923c';
  return RED;
}

function scoreBg(score: number): string {
  if (score >= 80) return 'rgba(52,211,153,0.15)';
  if (score >= 60) return 'rgba(110,231,183,0.10)';
  if (score >= 40) return 'rgba(250,204,21,0.10)';
  if (score >= 20) return 'rgba(251,146,60,0.12)';
  return 'rgba(248,113,113,0.15)';
}

function ratingColor(rating: string | null | undefined): string {
  if (!rating) return 'rgba(255,255,255,0.15)';
  if (rating.startsWith('AAA') || rating.startsWith('Aaa')) return GREEN;
  if (rating.startsWith('AA') || rating.startsWith('Aa')) return '#6ee7b7';
  if (rating.startsWith('A') && !rating.startsWith('A-')) return CYAN;
  if (rating.startsWith('BBB') || rating.startsWith('Baa')) return YELLOW;
  if (rating.startsWith('BB') || rating.startsWith('Ba')) return '#fb923c';
  if (rating.startsWith('B') && !rating.startsWith('Ba') && !rating.startsWith('BB')) return '#f97316';
  if (rating.startsWith('CCC') || rating.startsWith('Caa') || rating.startsWith('CC') || rating.startsWith('Ca') || rating.startsWith('C') || rating.startsWith('D')) return RED;
  return 'rgba(255,255,255,0.4)';
}

// ── Mini Sparkline ──

function Sparkline({ data, width = 48, height = 12 }: { data: number[]; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x},${y}`;
    })
    .join(' ');

  const lastVal = data[data.length - 1];
  const firstVal = data[0];
  const color = lastVal >= firstVal ? GREEN : RED;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={0.8}
        strokeOpacity={0.7}
      />
      <circle
        cx={(data.length - 1) * stepX}
        cy={height - ((lastVal - min) / range) * (height - 2) - 1}
        r={1.2}
        fill={color}
        fillOpacity={0.9}
      />
    </svg>
  );
}

// ── Composite Score Bar ──

function ScoreBar({ score, width = 40 }: { score: number; width?: number }) {
  const pct = Math.min(Math.max(score, 0), 100);
  const color = scoreColor(score);

  return (
    <div className="flex items-center gap-1">
      <div
        className="h-[5px] relative overflow-hidden"
        style={{
          width,
          backgroundColor: 'rgba(255,255,255,0.04)',
        }}
      >
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            opacity: 0.7,
          }}
        />
      </div>
      <span className="text-[7px] font-mono font-bold" style={{ color, minWidth: 20, textAlign: 'right' }}>
        {fmtScore(score)}
      </span>
    </div>
  );
}

// ── Rating Mismatch Detection ──

function hasRatingMismatch(sp?: string | null, moodys?: string | null, fitch?: string | null): boolean {
  const ratings = [sp, moodys, fitch].filter(Boolean);
  if (ratings.length < 2) return false;
  const unique = new Set(ratings.map(r => (r || '').replace(/[+-]/g, '').substring(0, 2).toUpperCase()));
  return unique.size > 1;
}

// ── Risk Ranking Table ──

function RiskRankingTable({ countries }: { countries: CountryRisk[] }) {
  if (!countries || countries.length === 0) {
    return (
      <div className="px-2 py-3 text-center text-[8px] text-white/20 uppercase">
        No countries match filter
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center px-2 py-0.5 border-b border-border/20 text-[6px] font-mono text-white/20 uppercase tracking-wider">
        <span className="w-4 shrink-0 text-center">#</span>
        <span className="w-[52px] shrink-0">Country</span>
        <span className="w-[68px] shrink-0">Composite</span>
        <span className="w-8 text-right shrink-0">FISC</span>
        <span className="w-8 text-right shrink-0">ECON</span>
        <span className="w-8 text-right shrink-0">PLTC</span>
        <span className="w-8 text-right shrink-0">EXTL</span>
        <span className="w-5 text-center shrink-0">T</span>
        <span className="w-10 text-right shrink-0">3M</span>
        <span className="w-[48px] text-right shrink-0">HIST</span>
      </div>

      {/* Rows */}
      {countries.map((c: CountryRisk, idx: number) => {
        const trend = trendArrow(c?.trend);
        const change3m = c?.change3m ?? 0;

        return (
          <div
            key={c?.country || idx}
            className="flex items-center px-2 py-[2px] border-b border-border/20 hover:bg-amber-400/[0.02] transition-colors"
          >
            <span className="w-4 shrink-0 text-center text-[6px] text-white/15 font-mono">{idx + 1}</span>
            <span className="w-[52px] shrink-0 text-[8px] font-mono font-bold text-white/70 truncate">
              {c?.countryCode || c?.country?.substring(0, 3)?.toUpperCase() || '---'}
            </span>
            <div className="w-[68px] shrink-0">
              <ScoreBar score={c?.compositeScore ?? 0} width={38} />
            </div>
            <span
              className="w-8 text-right text-[7px] font-mono shrink-0"
              style={{ color: scoreColor(c?.fiscalScore ?? 50) }}
            >
              {fmtScore(c?.fiscalScore ?? 0)}
            </span>
            <span
              className="w-8 text-right text-[7px] font-mono shrink-0"
              style={{ color: scoreColor(c?.economicScore ?? 50) }}
            >
              {fmtScore(c?.economicScore ?? 0)}
            </span>
            <span
              className="w-8 text-right text-[7px] font-mono shrink-0"
              style={{ color: scoreColor(c?.politicalScore ?? 50) }}
            >
              {fmtScore(c?.politicalScore ?? 0)}
            </span>
            <span
              className="w-8 text-right text-[7px] font-mono shrink-0"
              style={{ color: scoreColor(c?.externalScore ?? 50) }}
            >
              {fmtScore(c?.externalScore ?? 0)}
            </span>
            <span
              className="w-5 text-center text-[8px] font-mono shrink-0"
              style={{ color: trend.color }}
            >
              {trend.symbol}
            </span>
            <span
              className={`w-10 text-right text-[7px] font-mono font-bold shrink-0 ${
                change3m > 0 ? 'text-green-400' : change3m < 0 ? 'text-red-400' : 'text-white/20'
              }`}
            >
              {fmtChange(change3m)}
            </span>
            <div className="w-[48px] shrink-0 flex justify-end">
              <Sparkline data={c?.history ?? []} width={44} height={10} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Rating Comparison Table ──

function RatingComparison({ countries }: { countries: CountryRisk[] }) {
  if (!countries || countries.length === 0) return null;

  const rated = countries.filter(
    (c: CountryRisk) => c?.ratingsSP || c?.ratingsMoodys || c?.ratingsFitch
  );
  if (rated.length === 0) return null;

  return (
    <div className="border-t border-border/20">
      <div className="px-2 py-1">
        <span className="text-[6px] font-mono uppercase tracking-wider" style={{ color: AMBER }}>
          Rating Comparison
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center px-2 py-0.5 border-b border-border/20 text-[6px] font-mono text-white/20 uppercase tracking-wider">
        <span className="w-[52px] shrink-0">Country</span>
        <span className="w-12 text-center shrink-0">S&P</span>
        <span className="w-12 text-center shrink-0">MOODY</span>
        <span className="w-12 text-center shrink-0">FITCH</span>
        <span className="w-8 text-center shrink-0">MIS</span>
        <span className="w-14 text-right shrink-0">OUTLOOK</span>
      </div>

      {rated.slice(0, 20).map((c: CountryRisk, idx: number) => {
        const mismatch = hasRatingMismatch(c?.ratingsSP, c?.ratingsMoodys, c?.ratingsFitch);

        return (
          <div
            key={c?.country || idx}
            className={`flex items-center px-2 py-[2px] border-b border-border/20 hover:bg-amber-400/[0.02] transition-colors ${
              mismatch ? 'bg-amber-400/[0.03]' : ''
            }`}
          >
            <span className="w-[52px] shrink-0 text-[8px] font-mono font-bold text-white/70 truncate">
              {c?.countryCode || c?.country?.substring(0, 3)?.toUpperCase() || '---'}
            </span>
            <span
              className="w-12 text-center text-[7px] font-mono font-bold shrink-0"
              style={{ color: ratingColor(c?.ratingsSP) }}
            >
              {c?.ratingsSP || '\u2013'}
            </span>
            <span
              className="w-12 text-center text-[7px] font-mono font-bold shrink-0"
              style={{ color: ratingColor(c?.ratingsMoodys) }}
            >
              {c?.ratingsMoodys || '\u2013'}
            </span>
            <span
              className="w-12 text-center text-[7px] font-mono font-bold shrink-0"
              style={{ color: ratingColor(c?.ratingsFitch) }}
            >
              {c?.ratingsFitch || '\u2013'}
            </span>
            <span className="w-8 text-center text-[7px] font-mono shrink-0">
              {mismatch ? (
                <span style={{ color: AMBER }}>{'\u26A0'}</span>
              ) : (
                <span className="text-white/10">{'\u2013'}</span>
              )}
            </span>
            <span
              className={`w-14 text-right text-[6px] font-mono uppercase shrink-0 ${
                c?.outlook === 'negative'
                  ? 'text-red-400'
                  : c?.outlook === 'positive'
                    ? 'text-green-400'
                    : 'text-white/25'
              }`}
            >
              {c?.outlook || 'stable'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Region Risk Heatmap ──

function RegionHeatmap({ regionAverages }: { regionAverages: RegionAverage[] }) {
  if (!regionAverages || regionAverages.length === 0) return null;

  return (
    <div className="border-t border-border/20">
      <div className="px-2 py-1">
        <span className="text-[6px] font-mono uppercase tracking-wider" style={{ color: AMBER }}>
          Region Risk Averages
        </span>
      </div>
      <div className="px-2 pb-1.5 grid grid-cols-4 gap-[2px]">
        {regionAverages.map((r: RegionAverage, idx: number) => {
          const score = r?.avgScore ?? 0;
          const color = scoreColor(score);
          const bg = scoreBg(score);

          return (
            <div
              key={r?.region || idx}
              className="px-1.5 py-1 border border-border/20"
              style={{ backgroundColor: bg }}
            >
              <div className="text-[5px] font-mono uppercase tracking-wider text-white/30 truncate">
                {r?.region || '---'}
              </div>
              <div className="text-[10px] font-mono font-black" style={{ color }}>
                {fmtScore(score)}
              </div>
              <div className="flex items-center gap-0.5">
                <span
                  className={`text-[5px] font-mono ${
                    (r?.change ?? 0) > 0 ? 'text-green-400' : (r?.change ?? 0) < 0 ? 'text-red-400' : 'text-white/15'
                  }`}
                >
                  {fmtChange(r?.change ?? 0)}
                </span>
                <span className="text-[4px] text-white/15">3M</span>
              </div>
              <div className="text-[5px] font-mono text-white/20">
                {r?.countryCount ?? 0} ctry
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Deterioration Watchlist ──

function DeteriorationWatchlist({ watchlist }: { watchlist: WatchlistEntry[] }) {
  if (!watchlist || watchlist.length === 0) return null;

  return (
    <div className="border-t border-border/20">
      <div className="px-2 py-1 flex items-center gap-1.5">
        <span className="text-[6px] font-mono uppercase tracking-wider" style={{ color: RED }}>
          Deterioration Watchlist
        </span>
        <span className="text-[5px] font-mono text-white/15">largest 3m drops</span>
      </div>

      {/* Header */}
      <div className="flex items-center px-2 py-0.5 border-b border-border/20 text-[5px] font-mono text-white/20 uppercase tracking-wider">
        <span className="w-[52px] shrink-0">Country</span>
        <span className="w-10 text-right shrink-0">Score</span>
        <span className="w-10 text-right shrink-0">3M CHG</span>
        <span className="flex-1 text-right shrink-0">Trigger</span>
      </div>

      {watchlist.map((w: WatchlistEntry, idx: number) => (
        <div
          key={w?.country || idx}
          className="flex items-center px-2 py-[2px] border-b border-border/20 bg-red-400/[0.04] hover:bg-red-400/[0.07] transition-colors"
        >
          <span className="w-[52px] shrink-0 text-[8px] font-mono font-bold text-red-300 truncate">
            {w?.countryCode || w?.country?.substring(0, 3)?.toUpperCase() || '---'}
          </span>
          <span
            className="w-10 text-right text-[7px] font-mono font-bold shrink-0"
            style={{ color: scoreColor(w?.compositeScore ?? 0) }}
          >
            {fmtScore(w?.compositeScore ?? 0)}
          </span>
          <span className="w-10 text-right text-[7px] font-mono font-bold text-red-400 shrink-0">
            {fmtChange(w?.change3m ?? 0)}
          </span>
          <span className="flex-1 text-right text-[6px] font-mono text-red-300/60 truncate shrink-0">
            {w?.trigger || '\u2013'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ──

export function SovereignRiskScorePanel() {
  const t = useT();
  const { data, isLoading, error } = useSovereignRiskScore();
  const [activeRegion, setActiveRegion] = useState<RegionTab>('All');

  // Filter countries by selected region tab
  const filteredCountries = useMemo(() => {
    const countries: CountryRisk[] = data?.countries ?? [];
    if (activeRegion === 'All') return countries;
    return countries.filter((c: CountryRisk) => c?.region === activeRegion);
  }, [data?.countries, activeRegion]);

  // Sort by composite score ascending (riskiest first)
  const sortedCountries = useMemo(() => {
    return [...filteredCountries].sort(
      (a: CountryRisk, b: CountryRisk) => (a?.compositeScore ?? 0) - (b?.compositeScore ?? 0)
    );
  }, [filteredCountries]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <rect x="2" y="3" width="12" height="10" fill="none" stroke={AMBER} strokeWidth="0.8" />
            <line x1="2" y1="7" x2="14" y2="7" stroke={AMBER} strokeWidth="0.5" opacity="0.4" />
            <line x1="2" y1="10" x2="14" y2="10" stroke={AMBER} strokeWidth="0.5" opacity="0.4" />
            <line x1="7" y1="3" x2="7" y2="13" stroke={AMBER} strokeWidth="0.5" opacity="0.4" />
            <circle cx="5" cy="5.5" r="1" fill={RED} fillOpacity="0.7" />
            <circle cx="10" cy="5.5" r="1" fill={GREEN} fillOpacity="0.7" />
            <circle cx="5" cy="8.5" r="1" fill={YELLOW} fillOpacity="0.7" />
            <circle cx="10" cy="8.5" r="1" fill={RED} fillOpacity="0.7" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: AMBER }}>
            {tr(t, 'panelSovereignRiskScore', 'Sovereign Risk Score')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {data?.timestamp && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <span className="text-[5px] text-white/10 uppercase">SRSK</span>
        </div>
      </div>

      {/* Region Filter Tabs */}
      <div className="flex items-center px-2 py-1 border-b border-border/20 shrink-0 gap-0 overflow-x-auto">
        {REGION_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveRegion(tab)}
            className={`px-2 py-0.5 text-[6px] font-mono font-bold uppercase tracking-wider border border-border/20 transition-colors shrink-0 ${
              activeRegion === tab
                ? 'bg-amber-400/10 text-amber-400 border-amber-400/30'
                : 'text-white/25 hover:text-white/40 hover:bg-white/[0.02]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : error && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-4">
              <span className="text-[10px] text-red-400/60 uppercase tracking-widest">
                {tr(t, 'error', 'Error loading data')}
              </span>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Risk Ranking Table */}
            <div className="border-b border-border/20">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[6px] font-mono uppercase tracking-wider" style={{ color: AMBER }}>
                  Risk Ranking
                </span>
                <span className="text-[5px] text-white/15">
                  {sortedCountries.length} {activeRegion === 'All' ? 'countries' : activeRegion}
                </span>
              </div>
              <RiskRankingTable countries={sortedCountries} />
            </div>

            {/* Rating Comparison */}
            <RatingComparison countries={sortedCountries} />

            {/* Region Risk Heatmap */}
            <RegionHeatmap regionAverages={data?.regionAverages} />

            {/* Deterioration Watchlist */}
            <DeteriorationWatchlist watchlist={data?.watchlist} />

            {/* Historical Trends Summary */}
            {data?.trendSummary && (
              <div className="border-t border-border/20 px-2 py-1.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[6px] font-mono uppercase tracking-wider" style={{ color: AMBER }}>
                    Trend Summary
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[7px] font-mono">
                  <div className="flex items-center gap-1">
                    <span className="text-white/25">Improving:</span>
                    <span className="text-green-400 font-bold">
                      {data.trendSummary?.improving ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-white/25">Stable:</span>
                    <span className="text-white/40 font-bold">
                      {data.trendSummary?.stable ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-white/25">Deteriorating:</span>
                    <span className="text-red-400 font-bold">
                      {data.trendSummary?.deteriorating ?? 0}
                    </span>
                  </div>
                </div>
                {data.trendSummary?.narrative && (
                  <p className="text-[7px] font-mono mt-1 leading-relaxed" style={{ color: WHITE_DIM }}>
                    {data.trendSummary.narrative}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'noData', 'No data available')}
          </div>
        )}
      </div>
    </div>
  );
}
